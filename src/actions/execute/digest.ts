"use server";

/* ==========================================================================*/
// pipeline2.ts — Simplified Content Generation Pipeline
/* ==========================================================================*/
// Purpose: Handle digest request by creating article/inputs then running 7 LLM steps
// Sections: Imports, Configuration, Database Operations, LLM Steps, Pipeline Handler, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// Core Modules ---
import "server-only";

// Local Database ----
import { updateArticleWithResults, updateArticleStatus } from "@/db/dal";

// Local Utils ----
import { createPipelineLogger, initializeGlobalLogger, closeGlobalLogger } from "@/lib/pipeline-logger";
import { sendCompletionEmail } from "./email";

// Local Types ----
import type {
  DigestRequest,
  PipelineResponse,
  Step01ExtractFactQuotesResponse,
  Step01ExtractFactQuotesAIResponse,
  Step02SummarizeFactsResponse,
  Step02SummarizeFactsAIResponse,
  Step03WriteHeadlineAndBlobsResponse,
  Step03WriteHeadlineAndBlobsAIResponse,
  Step04WriteArticleOutlineResponse,
  Step04WriteArticleOutlineAIResponse,
  Step05WriteArticleResponse,
  Step05WriteArticleAIResponse,
  Step06ParaphraseArticleResponse,
  Step06ParaphraseArticleAIResponse,
  Step07SentencePerLineAttributionResponse,
  Step07SentencePerLineAttributionAIResponse,
  Step01ExtractFactQuotesRequest,
  Step02SummarizeFactsRequest,
  Step03WriteHeadlineAndBlobsRequest,
  Step04WriteArticleOutlineRequest,
  Step05WriteArticleRequest,
  Step06ParaphraseArticleRequest,
  Step07SentencePerLineAttributionRequest,
  StepVerbatimRequest,
  StepVerbatimResponse,
} from "@/types/digest";

/* ==========================================================================*/
// Configuration
/* ==========================================================================*/

const baseUrl = process.env.NEXT_PUBLIC_URL;

// Validate API URL
if (!baseUrl) {
  console.error("⚠️ Missing NEXT_PUBLIC_URL environment variable. Steps will not work correctly.");
}

/* ==========================================================================*/
// AI Model Pricing Map
/* ==========================================================================*/

/**
 * MODEL_PRICING
 *
 * Maps AI model names to their input/output token prices (per 1M tokens, USD).
 * Update this map if Anthropic/OpenAI pricing or model names change.
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Claude 3.5/3.7 Sonnet
  "claude-sonnet-4-5-20250929": { input: 3, output: 15 },
  "claude-3-5-sonnet": { input: 3, output: 15 },
  "claude-3-7-sonnet": { input: 3, output: 15 },
  // Claude 4 Sonnet
  "claude-4-sonnet": { input: 3, output: 15 },
  // Claude 4 Opus
  "claude-4-opus": { input: 15, output: 75 },
  // Claude 3 Opus
  "claude-3-opus": { input: 15, output: 75 },
  // Claude 3.5 Haiku
  "claude-3-5-haiku": { input: 0.8, output: 4 },
  // Claude 3 Haiku
  "claude-3-haiku": { input: 0.25, output: 1.25 },
  // OpenAI GPT-4o
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
};

/* ==========================================================================*/
// Helper Functions
/* ==========================================================================*/

/**
 * handleStepFailure
 *
 * Helper function to handle step failures consistently.
 * Updates article status to "failed", logs the error, closes logger, and returns failure response.
 *
 * @param stepNumber - The step number that failed
 * @param articleId - Article ID to update
 * @param userId - User ID for status update
 * @param logger - Pipeline logger instance
 * @returns Failed pipeline response
 */
async function handleStepFailure(
  stepNumber: number, 
  articleId: string, 
  userId: string, 
  logger: ReturnType<typeof createPipelineLogger>
): Promise<PipelineResponse> {
  console.error(`❌ Step ${stepNumber} failed, stopping pipeline for article: ${articleId}`);
  await updateArticleStatus(articleId, userId, "failed");
  logger.logError(`STEP_${stepNumber}_FAILED`, `Step ${stepNumber} failed, pipeline stopped`);
  await closeGlobalLogger();
  return { 
    success: false, 
    costUsd: 0, 
    totalInputTokens: 0, 
    totalOutputTokens: 0 
  };
}

/**
 * validatePipelineSuccess
 *
 * Validate if the pipeline was truly successful based on all step results.
 * Checks that all steps completed and final content is meaningful.
 *
 * @param step1Result - Extract fact quotes result
 * @param step2Result - Summarize facts result
 * @param step3Result - Write headline and blobs result
 * @param step4Result - Write article outline result
 * @param step5Result - Write article result
 * @param step6Result - Paraphrase article result
 * @param step7Result - Sentence per line attribution result
 * @returns True if all steps successful and content is valid
 */
function validatePipelineSuccess(step1Result: Step01ExtractFactQuotesResponse, step2Result: Step02SummarizeFactsResponse, step3Result: Step03WriteHeadlineAndBlobsResponse, step4Result: Step04WriteArticleOutlineResponse, step5Result: Step05WriteArticleResponse, step6Result: Step06ParaphraseArticleResponse, step7Result: Step07SentencePerLineAttributionResponse): boolean {
  // Check if all steps are successful (ensure the first 5 are truthy)
  const allStepsSuccessful = [step1Result, step2Result, step3Result, step4Result, step5Result, step6Result, step7Result].every((result) => result && result.success === true);

  // Check if step7 has meaningful content (> 100 chars)
  const finalArticle = Boolean(step7Result.formattedArticle);

  // Check if step3 has both headline and blobs
  const finalHeadlineAndBlobs = Boolean(step3Result.headline) && step3Result.headline.length > 0 && Boolean(step3Result.blobs) && step3Result.blobs.length > 0;

  return allStepsSuccessful && finalArticle && finalHeadlineAndBlobs;
}

/**
 * UsageWithModel
 *
 * Interface for usage objects that contain token info and model name.
 */
interface UsageWithModel {
  inputTokens: number;
  outputTokens: number;
  model: string;
  [key: string]: unknown;
}

/**
 * calculateTotalTokensAndCost
 *
 * Computes total input tokens, output tokens, and cost for an array of usage objects.
 * @param usageArray - Array of usage objects with token info and model
 * @returns Object with totalInputTokens, totalOutputTokens, totalCost
 */
function calculateTotalTokensAndCost(usageArray: UsageWithModel[]) {
  return usageArray.reduce(
    (acc, usage) => {
      const model = usage.model;
      if (model && MODEL_PRICING[model]) {
        const pricing = MODEL_PRICING[model];
        acc.totalInputTokens += usage.inputTokens || 0;
        acc.totalOutputTokens += usage.outputTokens || 0;
        const inputCost = ((usage.inputTokens || 0) / 1_000_000) * pricing.input;
        const outputCost = ((usage.outputTokens || 0) / 1_000_000) * pricing.output;
        acc.totalCost += inputCost + outputCost;
      }
      return acc;
    },
    { totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0 }
  );
}

/* ==========================================================================*/
// LLM Step Functions
/* ==========================================================================*/

/**
 * step01ExtractFactQuotes
 *
 * Extract key fact quotes from the source text.
 *
 * @param articleId - Article ID for tracking
 * @param request - Digest request with source data
 * @param logger - Pipeline logger for logging
 * @returns Response with extracted quotes
 */
async function step01ExtractFactQuotes(articleId: string, request: DigestRequest, logger: ReturnType<typeof createPipelineLogger> | null): Promise<Step01ExtractFactQuotesResponse> {
  console.log("🚀 Step 1: Extract Fact Quotes");
  console.log("redeploying");

  try {
    // Prepare the request for the API
    const step01Request: Step01ExtractFactQuotesRequest = {
      sourceAccredit: request.source.accredit,
      sourceDescription: request.source.description,
      sourceText: request.source.sourceText,
    };

    // Log the step request
    if (logger) {
      logger.logStepRequest(1, "Extract Fact Quotes", step01Request);
    }

    // Call the API endpoint
    const response = await fetch(`${baseUrl}/api/steps/01-extract-fact-quotes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(step01Request),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const aiResult: Step01ExtractFactQuotesAIResponse = await response.json();

        // Calculate token usage (input and output) and cost
    const totals = calculateTotalTokensAndCost(aiResult.usage);

    // Log the totals for debugging/analysis
    console.log(`Step 01 total input tokens: ${totals.totalInputTokens}`);
    console.log(`Step 01 total output tokens: ${totals.totalOutputTokens}`);
    console.log(`Step 01 total cost (USD): $${totals.totalCost.toFixed(6)}`);


    // Log the API response
    if (logger) {
      logger.logStepResponse(1, "Extract Fact Quotes", aiResult);
    }

    // Wrap AI response with article management
    const result = {
      articleId,
      stepNumber: 1,
      success: true,
      quotes: aiResult.quotes,
      totals,
    };

    // Log step completion
    if (logger) {
      logger.logStepComplete(1, "Extract Fact Quotes", result);
    }

    return result;
  } catch (error) {
    console.error("Step 1 - Extract fact quotes failed:", error);

    // Log the error
    if (logger) {
      logger.logError("STEP_1_ERROR", error);
    }

    return {
      articleId,
      stepNumber: 1,
      success: false,
      quotes: "",
      totals: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
      },
    };
  }
}

/**
 * step02SummarizeFacts
 *
 * Summarize the key facts from the source material.
 *
 * @param articleId - Article ID for tracking
 * @param request - Digest request with source data
 * @param logger - Pipeline logger for logging
 * @returns Response with summarized facts
 */
async function step02SummarizeFacts(articleId: string, request: DigestRequest, logger: ReturnType<typeof createPipelineLogger> | null): Promise<Step02SummarizeFactsResponse> {
  console.log("🚀 Step 2: Summarize Facts");

  try {
    // Prepare the request for the API
    const step02Request: Step02SummarizeFactsRequest = {
      sourceAccredit: request.source.accredit,
      sourceDescription: request.source.description,
      sourceText: request.source.sourceText,
      instructions: request.instructions.instructions,
    };

    // Log the step request
    if (logger) {
      logger.logStepRequest(2, "Summarize Facts", step02Request);
    }

    // Call the API endpoint
    const response = await fetch(`${baseUrl}/api/steps/02-summarize-facts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(step02Request),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const aiResult: Step02SummarizeFactsAIResponse = await response.json();

    // Calculate token usage (input and output) and cost
    const totals = calculateTotalTokensAndCost(aiResult.usage);

    // Log the API response
    if (logger) {
      logger.logStepResponse(2, "Summarize Facts", aiResult);
    }

    // Wrap AI response with article management
    const result = {
      articleId,
      stepNumber: 2,
      success: true,
      summary: aiResult.summary,
      totals,
    };

    // Log step completion
    if (logger) {
      logger.logStepComplete(2, "Summarize Facts", result);
    }

    return result;
  } catch (error) {
    console.error("Step 2 - Summarize facts failed:", error);

    // Log the error
    if (logger) {
      logger.logError("STEP_2_ERROR", error);
    }

    return {
      articleId,
      stepNumber: 2,
      success: false,
      summary: "",
      totals: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
      },
    };
  }
}

/**
 * step03WriteHeadlineAndBlobs
 *
 * Generate headline and content blobs for the article.
 *
 * @param articleId - Article ID for tracking
 * @param request - Digest request with instructions
 * @param step1Result - Previous step results for context
 * @param step2Result - Previous step results for context
 * @param logger - Pipeline logger for logging
 * @returns Response with headline and blobs
 */
async function step03WriteHeadlineAndBlobs(articleId: string, request: DigestRequest, step1Result: Step01ExtractFactQuotesResponse, step2Result: Step02SummarizeFactsResponse, logger: ReturnType<typeof createPipelineLogger> | null): Promise<Step03WriteHeadlineAndBlobsResponse> {
  console.log("🚀 Step 3: Write Headline and Blobs");

  // console.log("the request in step 3 is", request);
  // console.log("the step 1 result is", step1Result);
  // console.log("the step 2 result is", step2Result);
  // process.exit(0);

  try {
    // Prepare the request for the API
    const step03Request: Step03WriteHeadlineAndBlobsRequest = {
      blobs: parseInt(request.instructions.blobs),
      headline: request.headline, // Use the provided headline as manual headline
      instructions: request.instructions.instructions,
      // Add source content for AI to work with
      sourceAccredit: request.source.accredit,
      sourceDescription: request.source.description,
      sourceText: request.source.sourceText,
      summarizeFacts: step2Result.summary,
      extractFactQuotes: step1Result.quotes,
    };

    // Log the step request
    if (logger) {
      logger.logStepRequest(3, "Write Headline and Blobs", step03Request);
    }

    // Call the API endpoint
    const response = await fetch(`${baseUrl}/api/steps/03-write-headline-and-blobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(step03Request),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const aiResult: Step03WriteHeadlineAndBlobsAIResponse = await response.json();

    // Calculate token usage (input and output) and cost
    const totals = calculateTotalTokensAndCost(aiResult.usage);

    // Log the API response
    if (logger) {
      logger.logStepResponse(3, "Write Headline and Blobs", aiResult);
    }

    // Wrap AI response with article management
    const result = {
      articleId,
      stepNumber: 3,
      success: true,
      headline: aiResult.headline,
      blobs: aiResult.blobs,
      totals,
    };

    // Log step completion
    if (logger) {
      logger.logStepComplete(3, "Write Headline and Blobs", result);
    }

    return result;
  } catch (error) {
    console.error("Step 3 - Write headline and blobs failed:", error);

    // Log the error
    if (logger) {
      logger.logError("STEP_3_ERROR", error);
    }

    return {
      articleId,
      stepNumber: 3,
      success: false,
      headline: "",
      blobs: [],
      totals: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
      },
    };
  }
}

/**
 * step04WriteArticleOutline
 *
 * Create the structural outline for the article.
 *
 * @param articleId - Article ID for tracking
 * @param request - Digest request with source data
 * @param step1Result - Previous step results for context
 * @param step2Result - Previous step results for context
 * @param step3Result - Previous step results for context
 * @param logger - Pipeline logger for logging
 * @returns Response with article outline
 */
async function step04WriteArticleOutline(articleId: string, request: DigestRequest, step1Result: Step01ExtractFactQuotesResponse, step2Result: Step02SummarizeFactsResponse, step3Result: Step03WriteHeadlineAndBlobsResponse, logger: ReturnType<typeof createPipelineLogger> | null): Promise<Step04WriteArticleOutlineResponse> {
  console.log("🚀 Step 4: Write Article Outline");

  try {
    // Prepare the request for the API with accumulated context
    const step04Request: Step04WriteArticleOutlineRequest = {
      sourceAccredit: request.source.accredit,
      sourceDescription: request.source.description,
      sourceText: request.source.sourceText,
      instructions: request.instructions.instructions,
      // Accumulated context from previous steps
      summarizeFactsText: step2Result.summary,
      extractFactQuotesText: JSON.stringify(step1Result.quotes), // Convert quotes array to string
      headlineAndBlobsText: `Headline: ${step3Result.headline}\nBlobs: ${step3Result.blobs.join("\n")}`,
    };

    // Log the step request
    if (logger) {
      logger.logStepRequest(4, "Write Article Outline", step04Request);
    }

    // Call the API endpoint
    const response = await fetch(`${baseUrl}/api/steps/04-write-article-outline`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(step04Request),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const aiResult: Step04WriteArticleOutlineAIResponse = await response.json();

    // Calculate token usage (input and output) and cost
    const totals = calculateTotalTokensAndCost(aiResult.usage);

    // Log the API response
    if (logger) {
      logger.logStepResponse(4, "Write Article Outline", aiResult);
    }

    // Wrap AI response with article management
    const result = {
      articleId,
      stepNumber: 4,
      success: true,
      outline: aiResult.outline,
      totals,
    };

    // Log step completion
    if (logger) {
      logger.logStepComplete(4, "Write Article Outline", result);
    }

    return result;
  } catch (error) {
    console.error("Step 4 - Write article outline failed:", error);

    // Log the error
    if (logger) {
      logger.logError("STEP_4_ERROR", error);
    }

    return {
      articleId,
      stepNumber: 4,
      success: false,
      outline: "",
      totals: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
      },
    };
  }
}

/**
 * step05WriteArticle
 *
 * Generate the full article content based on outline and previous steps.
 *
 * @param articleId - Article ID for tracking
 * @param request - Digest request with length requirements
 * @param step2Result - Summary from step 2
 * @param step3Result - Headlines and blobs from step 3
 * @param step4Result - Outline from step 4
 * @param logger - Pipeline logger for logging
 * @returns Response with full article content
 */
async function step05WriteArticle(articleId: string, request: DigestRequest, step2Result: Step02SummarizeFactsResponse, step3Result: Step03WriteHeadlineAndBlobsResponse, step4Result: Step04WriteArticleOutlineResponse, logger: ReturnType<typeof createPipelineLogger> | null): Promise<Step05WriteArticleResponse> {
  console.log("🚀 Step 5: Write Article");

  try {
    // Prepare the request for the API with accumulated context
    const step05Request: Step05WriteArticleRequest = {
      length: request.instructions.length,
      sourceAccredit: request.source.accredit,
      sourceDescription: request.source.description,
      sourceText: request.source.sourceText,
      isPrimarySource: request.source.primary,
      instructions: request.instructions.instructions,
      // Accumulated context from previous steps
      headlineAndBlobsText: `Headline: ${step3Result.headline}\nBlobs: ${step3Result.blobs.join("\n")}`,
      summarizeFactsText: step2Result.summary,
      articleOutlineText: step4Result.outline,
    };

    // Log the step request
    if (logger) {
      logger.logStepRequest(5, "Write Article", step05Request);
    }

    // Call the API endpoint
    const response = await fetch(`${baseUrl}/api/steps/05-write-article`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(step05Request),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const aiResult: Step05WriteArticleAIResponse = await response.json();

    // Calculate token usage (input and output) and cost
    const totals = calculateTotalTokensAndCost(aiResult.usage);

    // Log the API response
    if (logger) {
      logger.logStepResponse(5, "Write Article", aiResult);
    }

    // Wrap AI response with article management
    const result = {
      articleId,
      stepNumber: 5,
      success: true,
      article: aiResult.article,
      totals,
    };

    // Log step completion
    if (logger) {
      logger.logStepComplete(5, "Write Article", result);
    }

    return result;
  } catch (error) {
    console.error("Step 5 - Write article failed:", error);

    // Log the error
    if (logger) {
      logger.logError("STEP_5_ERROR", error);
    }

    return {
      articleId,
      stepNumber: 5,
      success: false,
      article: "",
      totals: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
      },
    };
  }
}

/**
 * step06ParaphraseArticle
 *
 * Paraphrase the article for style and tone improvements.
 *
 * @param articleId - Article ID for tracking
 * @param request - Digest request with source context
 * @param step5Result - Article from step 5
 * @param logger - Pipeline logger for logging
 * @returns Response with paraphrased article
 */
async function step06ParaphraseArticle(articleId: string, request: DigestRequest, step5Result: Step05WriteArticleResponse, logger: ReturnType<typeof createPipelineLogger> | null): Promise<Step06ParaphraseArticleResponse> {
  console.log("🚀 Step 6: Paraphrase Article");

  try {
    // Prepare the request for the API
    const step06Request: Step06ParaphraseArticleRequest = {
      sourceAccredit: request.source.accredit,
      sourceDescription: request.source.description,
      sourceText: request.source.sourceText,
      // Article from previous step
      articleText: step5Result.article,
    };

    // Log the step request
    if (logger) {
      logger.logStepRequest(6, "Paraphrase Article", step06Request);
    }

    // Call the API endpoint
    const response = await fetch(`${baseUrl}/api/steps/06-paraphrase-article`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(step06Request),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const aiResult: Step06ParaphraseArticleAIResponse = await response.json();

    // Calculate token usage (input and output) and cost
    const totals = calculateTotalTokensAndCost(aiResult.usage);

    // Log the API response
    if (logger) {
      logger.logStepResponse(6, "Paraphrase Article", aiResult);
    }

    // Wrap AI response with article management
    const result = {
      articleId,
      stepNumber: 6,
      success: true,
      paraphrasedArticle: aiResult.paraphrasedArticle,
      totals,
    };

    // Log step completion
    if (logger) {
      logger.logStepComplete(6, "Paraphrase Article", result);
    }

    return result;
  } catch (error) {
    console.error("Step 6 - Paraphrase article failed:", error);

    // Log the error
    if (logger) {
      logger.logError("STEP_6_ERROR", error);
    }

    return {
      articleId,
      stepNumber: 6,
      success: false,
      paraphrasedArticle: "",
      totals: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
      },
    };
  }
}

/**
 * step07SentencePerLineAttribution
 *
 * Add line-by-line attribution and source tracking.
 *
 * @param articleId - Article ID for tracking
 * @param request - Digest request (unused but kept for consistency)
 * @param step5Result - Article from step 5
 * @param logger - Pipeline logger for logging
 * @returns Response with formatted article
 */
async function step07SentencePerLineAttribution(articleId: string, request: DigestRequest, step6Result: Step06ParaphraseArticleResponse, logger: ReturnType<typeof createPipelineLogger> | null): Promise<Step07SentencePerLineAttributionResponse> {
  console.log("🚀 Step 7: Sentence Per Line Attribution");

  try {
    // Prepare the request for the API
    const step07Request: Step07SentencePerLineAttributionRequest = {
      paraphrasedArticle: step6Result.paraphrasedArticle,
    };

    // Log the step request
    if (logger) {
      logger.logStepRequest(7, "Sentence Per Line Attribution", step07Request);
    }

    // Call the API endpoint
    const response = await fetch(`${baseUrl}/api/steps/07-sentence-per-line-attribution`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(step07Request),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const aiResult: Step07SentencePerLineAttributionAIResponse = await response.json();

    // Calculate token usage (input and output) and cost
    const totals = calculateTotalTokensAndCost(aiResult.usage);

    // Log the API response
    if (logger) {
      logger.logStepResponse(7, "Sentence Per Line Attribution", aiResult);
    }

    // Wrap AI response with article management
    const result = {
      articleId,
      stepNumber: 7,
      success: true,
      formattedArticle: aiResult.formattedArticle,
      totals,
    };

    // Log step completion
    if (logger) {
      logger.logStepComplete(7, "Sentence Per Line Attribution", result);
    }

    return result;
  } catch (error) {
    console.error("Step 7 - Sentence per line attribution failed:", error);

    // Log the error
    if (logger) {
      logger.logError("STEP_7_ERROR", error);
    }

    return {
      articleId,
      stepNumber: 7,
      success: false,
      formattedArticle: "",
      totals: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
      },
    };
  }
}

/**
 * stepVerbatim
 *
 * Process article using verbatim mode after steps 1-3.
 *
 * @param articleId - Article ID for tracking
 * @param request - Digest request with source data
 * @param logger - Pipeline logger for logging
 * @returns Response with verbatim article
 */
async function stepVerbatim(
  articleId: string, 
  request: DigestRequest, 
  logger: ReturnType<typeof createPipelineLogger> | null
): Promise<StepVerbatimResponse> {
  console.log("🚀 Verbatim Step: Processing article in verbatim mode");

  try {
    // Prepare the request for the verbatim API
    const verbatimRequest: StepVerbatimRequest = {
      sourceText: request.source.sourceText,
    };

    // Log the step request
    if (logger) {
      logger.logStepRequest(8, "Verbatim Processing", verbatimRequest);
    }

    // Call the verbatim API endpoint
    const response = await fetch(`${baseUrl}/api/steps/digest-verbatim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(verbatimRequest),
    });

    if (!response.ok) {
      throw new Error(`Verbatim API request failed: ${response.statusText}`);
    }

    const aiResult = await response.json();

    // Log the API response
    if (logger) {
      logger.logStepResponse(8, "Verbatim Processing", aiResult);
    }

    // Wrap AI response with article management
    const result: StepVerbatimResponse = {
      articleId,
      stepNumber: 8,
      success: true,
      formattedArticle: aiResult.formattedArticle || "",
      usage: aiResult.usage,
    };

    // Log step completion
    if (logger) {
      logger.logStepComplete(8, "Verbatim Processing", result);
    }

    return result;
  } catch (error) {
    console.error("Verbatim step failed:", error);

    // Log the error
    if (logger) {
      logger.logError("VERBATIM_STEP_ERROR", error);
    }

    return {
      articleId,
      stepNumber: 8,
      success: false,
      formattedArticle: "",
      usage: [],
    };
  }
}

/* ==========================================================================*/
// Main Pipeline Handler
/* ==========================================================================*/

/**
 * runDigestPipeline
 *
 * Execute all 7 pipeline steps for an existing article.
 * Article must already exist in the database.
 * Exits early if any step fails.
 *
 * @param articleId - The existing article ID to process
 * @param request - The original digest request
 * @returns Pipeline response with all step results
 */
async function runDigestPipeline(articleId: string, request: DigestRequest): Promise<PipelineResponse> {
  console.log(`🚀 Starting pipeline step execution for article: ${articleId}`);

  // Check if verbatim mode is enabled
  const isVerbatim = request.source.verbatim;
  if (isVerbatim) {
    console.log("📝 VERBATIM MODE ENABLED - Using verbatim processing flow");
  }

  // Initialize pipeline logger
  const logger = createPipelineLogger(`${request.metadata.userId}-${request.slug}`, 'digest');

  // Also set as global logger for route handlers to use
  initializeGlobalLogger(`${request.metadata.userId}-${request.slug}`, 'digest');

  // Initialize cumulative tracking variables
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;

  try {
    // Log initial request with complete data
    logger.logInitialRequest({
      requestType: 'DigestRequest',
      slug: request.slug,
      headline: request.headline,
      source: request.source,
      instructions: request.instructions,
      metadata: request.metadata,
      isVerbatim: request.source.verbatim,
      fullRequest: request // Include complete request object
    });

    // Step 1: Extract Fact Quotes
    const step1Result = await step01ExtractFactQuotes(articleId, request, logger);
    
    if (!step1Result.success) {
      return await handleStepFailure(1, articleId, request.metadata.userId, logger);
    }

    // Accumulate totals from step 1
    totalInputTokens += step1Result.totals.totalInputTokens;
    totalOutputTokens += step1Result.totals.totalOutputTokens;
    totalCost += step1Result.totals.totalCost;

    // Update status to 10% after step 1
    await updateArticleStatus(articleId, request.metadata.userId, "10%");

    // Step 2: Summarize Facts
    const step2Result = await step02SummarizeFacts(articleId, request, logger);
    
    if (!step2Result.success) {
      return await handleStepFailure(2, articleId, request.metadata.userId, logger);
    }

    // Accumulate totals from step 2
    totalInputTokens += step2Result.totals.totalInputTokens;
    totalOutputTokens += step2Result.totals.totalOutputTokens;
    totalCost += step2Result.totals.totalCost;

    // Step 3: Write Headline and Blobs
    const step3Result = await step03WriteHeadlineAndBlobs(articleId, request, step1Result, step2Result, logger);
    
    if (!step3Result.success) {
      return await handleStepFailure(3, articleId, request.metadata.userId, logger);
    }

    // Accumulate totals from step 3
    totalInputTokens += step3Result.totals.totalInputTokens;
    totalOutputTokens += step3Result.totals.totalOutputTokens;
    totalCost += step3Result.totals.totalCost;

    // Update status to 25% after step 3
    await updateArticleStatus(articleId, request.metadata.userId, "25%");

    if (isVerbatim) {
      // VERBATIM FLOW: Run verbatim step instead of steps 4-7
      console.log("🔄 Executing verbatim processing step");
      
      const verbatimResult = await stepVerbatim(articleId, request, logger);
      
      if (!verbatimResult.success) {
        return await handleStepFailure(8, articleId, request.metadata.userId, logger);
      }

      // Calculate verbatim totals
      const verbatimTotals = calculateTotalTokensAndCost(verbatimResult.usage);
      totalInputTokens += verbatimTotals.totalInputTokens;
      totalOutputTokens += verbatimTotals.totalOutputTokens;
      totalCost += verbatimTotals.totalCost;

      await updateArticleStatus(articleId, request.metadata.userId, "90%");

      // Validate verbatim pipeline success
      const isSuccessful = Boolean(verbatimResult.formattedArticle) && verbatimResult.formattedArticle.length > 100;

      // Update article with verbatim results
      await updateArticleWithResults(articleId, request.metadata.userId, isSuccessful, step3Result.headline, step3Result.blobs, verbatimResult.formattedArticle);

      // Build verbatim response
      const response: PipelineResponse = {
        success: isSuccessful,
        costUsd: totalCost,
        totalInputTokens,
        totalOutputTokens,
        step_one_extract_fact_quotes: step1Result,
        step_two_summarize_facts: step2Result,
        step_three_write_headline_and_blobs: step3Result,
        verbatim_step: verbatimResult,
      };

      // Log pipeline completion
      logger.logPipelineComplete(isSuccessful, response);

      // Close logger and save logs
      console.log(`📁 Verbatim pipeline logs saved to: ${logger.getLogFilePath()}`);
      await closeGlobalLogger();

      console.log("🎉 Verbatim pipeline completed successfully");

      // Send completion email
      await sendCompletionEmail(request.slug, request.metadata.currentVersion);

      return response;

    } else {
      // NORMAL FLOW: Continue with steps 4-7
      console.log("🔄 Executing normal processing flow (steps 4-7)");

      // Step 4: Write Article Outline
      const step4Result = await step04WriteArticleOutline(articleId, request, step1Result, step2Result, step3Result, logger);
      
      if (!step4Result.success) {
        return await handleStepFailure(4, articleId, request.metadata.userId, logger);
      }

      // Accumulate totals from step 4
      totalInputTokens += step4Result.totals.totalInputTokens;
      totalOutputTokens += step4Result.totals.totalOutputTokens;
      totalCost += step4Result.totals.totalCost;

      // Step 5: Write Article
      const step5Result = await step05WriteArticle(articleId, request, step2Result, step3Result, step4Result, logger);
      
      if (!step5Result.success) {
        return await handleStepFailure(5, articleId, request.metadata.userId, logger);
      }

      // Accumulate totals from step 5
      totalInputTokens += step5Result.totals.totalInputTokens;
      totalOutputTokens += step5Result.totals.totalOutputTokens;
      totalCost += step5Result.totals.totalCost;

      // Update status to 50% after step 5
      await updateArticleStatus(articleId, request.metadata.userId, "50%");

      // Step 6: Paraphrase Article
      const step6Result = await step06ParaphraseArticle(articleId, request, step5Result, logger);
      
      if (!step6Result.success) {
        return await handleStepFailure(6, articleId, request.metadata.userId, logger);
      }

      // Accumulate totals from step 6
      totalInputTokens += step6Result.totals.totalInputTokens;
      totalOutputTokens += step6Result.totals.totalOutputTokens;
      totalCost += step6Result.totals.totalCost;

      // Update status to 75% after step 6
      await updateArticleStatus(articleId, request.metadata.userId, "75%");

      // Step 7: Sentence Per Line Attribution
      const step7Result = await step07SentencePerLineAttribution(articleId, request, step6Result, logger);
      
      if (!step7Result.success) {
        return await handleStepFailure(7, articleId, request.metadata.userId, logger);
      }

      // Accumulate totals from step 7
      totalInputTokens += step7Result.totals.totalInputTokens;
      totalOutputTokens += step7Result.totals.totalOutputTokens;
      totalCost += step7Result.totals.totalCost;

      await updateArticleStatus(articleId, request.metadata.userId, "90%");

      // Validate pipeline success
      const isSuccessful = validatePipelineSuccess(step1Result, step2Result, step3Result, step4Result, step5Result, step6Result, step7Result);

      // Update article with results
      await updateArticleWithResults(articleId, request.metadata.userId, isSuccessful, step3Result.headline, step3Result.blobs, step7Result.formattedArticle);

      // Build response
      const response: PipelineResponse = {
        success: isSuccessful,
        costUsd: totalCost,
        totalInputTokens,
        totalOutputTokens,
        step_one_extract_fact_quotes: step1Result,
        step_two_summarize_facts: step2Result,
        step_three_write_headline_and_blobs: step3Result,
        step_four_write_article_outline: step4Result,
        step_five_write_article: step5Result,
        step_seven_sentence_per_line_attribution: step7Result,
      };

      // Log pipeline completion
      logger.logPipelineComplete(isSuccessful, response);

      // Close logger and save logs
      console.log(`📁 Pipeline logs saved to: ${logger.getLogFilePath()}`);
      await closeGlobalLogger();

      console.log("🎉 Pipeline steps completed successfully");

      // Send completion email
      await sendCompletionEmail(request.slug, request.metadata.currentVersion);

      return response;
    }
  } catch (error) {
    console.error("💥 Pipeline steps failed:", error);

    // Log the error
    logger.logError("PIPELINE_ERROR", error);

    // Update article status to failed
    try {
      await updateArticleStatus(articleId, request.metadata.userId, "failed");
    } catch (statusError) {
      console.error("Failed to update article status to failed:", statusError);
    }

    // Close logger even on failure
    try {
      console.log(`📁 Pipeline error logs saved to: ${logger.getLogFilePath()}`);
      await closeGlobalLogger();
    } catch (saveError) {
      console.error("Failed to close logger:", saveError);
    }

    return {
      success: false,
      costUsd: totalCost,
      totalInputTokens,
      totalOutputTokens,
    };
  }
}

/* ==========================================================================*/
// Public API Exports
/* ==========================================================================*/

export { runDigestPipeline };