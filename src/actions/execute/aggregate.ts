"use server";

/* ==========================================================================*/
// aggregate.ts — Aggregate Content Generation Pipeline
/* ==========================================================================*/
// Purpose: Handle aggregate request by creating article/inputs then running 8 LLM steps
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
  AggregateRequest,
  PipelineResponse,
  Step01FactsBitSplittingRequest,
  Step01FactsBitSplittingResponse,
  Step01FactsBitSplittingAIResponse,
  FactsBitSplitting2Request,
  FactsBitSplitting2Response,
  FactsBitSplitting2AIResponse,
  Step03HeadlinesBlobsRequest,
  Step03HeadlinesBlobsResponse,
  Step03HeadlinesBlobsAIResponse,
  Step04WriteArticleOutlineRequest,
  Step04WriteArticleOutlineResponse,
  Step04WriteArticleOutlineAIResponse,
  Step05WriteArticleRequest,
  Step05WriteArticleResponse,
  Step05WriteArticleAIResponse,
  Step06RewriteArticleRequest,
  Step06RewriteArticleResponse,
  Step06RewriteArticleAIResponse,
  Step07RewriteArticle2Request,
  Step07RewriteArticle2Response,
  Step07RewriteArticle2AIResponse,
  Step08ColorCodeRequest,
  Step08ColorCodeResponse,
  Step08ColorCodeAIResponse,
  ArticleStepOutputs,
  AggregateSource,
} from "@/types/aggregate";

/* ==========================================================================*/
// Configuration
/* ==========================================================================*/

const baseUrl = process.env.NEXT_PUBLIC_URL;

// Validate API URL
if (!baseUrl) {
  console.error("⚠️ Missing NEXT_PUBLIC_URL environment variable. Steps will not work correctly.");
}

/**
 * MODEL_PRICING
 *
 * Maps AI model names to their input/output token prices (per 1M tokens, USD).
 * Update this map if Anthropic/OpenAI pricing or model names change.
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Claude 3.5/3.7 Sonnet
  "claude-3-5-sonnet-20240620": { input: 3, output: 15 },
  "claude-3-5-sonnet": { input: 3, output: 15 },
  "claude-3-7-sonnet": { input: 3, output: 15 },
  // Claude 4 Sonnet
  "claude-sonnet-4-20250514": { input: 3, output: 15 },
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
async function handleStepFailure(stepNumber: number, articleId: string, userId: string, logger: ReturnType<typeof createPipelineLogger>): Promise<PipelineResponse> {
  console.error(`❌ Step ${stepNumber} failed, stopping pipeline for article: ${articleId}`);
  await updateArticleStatus(articleId, userId, "failed");
  logger.logError(`STEP_${stepNumber}_FAILED`, `Step ${stepNumber} failed, pipeline stopped`);
  await closeGlobalLogger();
  return { success: false, costUsd: 0, totalInputTokens: 0, totalOutputTokens: 0 };
}

/**
 * validatePipelineSuccess
 *
 * Validate if the pipeline was truly successful based on all step results.
 * Checks that all steps completed and final content is meaningful.
 *
 * @param step1Result - Facts bit splitting result
 * @param step2Result - Facts bit splitting 2 result
 * @param step3Result - Headlines blobs result
 * @param step4Result - Write article outline result
 * @param step5Result - Write article result
 * @param step6Result - Rewrite article result
 * @param step7Result - Rewrite article 2 result
 * @param step8Result - Color code result
 * @returns True if all steps successful and content is valid
 */
function validatePipelineSuccess(step1Result: Step01FactsBitSplittingResponse, step2Result: FactsBitSplitting2Response, step3Result: Step03HeadlinesBlobsResponse, step4Result: Step04WriteArticleOutlineResponse, step5Result: Step05WriteArticleResponse, step6Result: Step06RewriteArticleResponse, step7Result: Step07RewriteArticle2Response, step8Result: Step08ColorCodeResponse): boolean {
  // Check if all steps are successful
  const allStepsSuccessful = [step1Result, step2Result, step3Result, step4Result, step5Result, step6Result, step7Result, step8Result].every((result) => result && result.success === true);

  // Check if step8 has meaningful content (color coded article)
  const finalArticle = Boolean(step8Result.colorCodedArticle) && step8Result.colorCodedArticle.length > 100;

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
 * calculateTotalTokensAndCostFromSources
 *
 * Computes total input tokens, output tokens, and cost for an array of AggregateSource.
 * @param sources - Array of AggregateSource (with usage/model)
 * @returns Object with totalInputTokens, totalOutputTokens, totalCost
 */
function calculateTotalTokensAndCostFromSources(sources: AggregateSource[]) {
  return sources.reduce(
    (acc, source) => {
      const usageArray = source.usage;

      if (usageArray && Array.isArray(usageArray)) {
        // Sum up tokens from all usage objects in the array
        usageArray.forEach((usage) => {
          const model = usage.model;
          if (model && MODEL_PRICING[model]) {
            const pricing = MODEL_PRICING[model];
            acc.totalInputTokens += usage.inputTokens || 0;
            acc.totalOutputTokens += usage.outputTokens || 0;
            const inputCost = ((usage.inputTokens || 0) / 1_000_000) * pricing.input;
            const outputCost = ((usage.outputTokens || 0) / 1_000_000) * pricing.output;
            acc.totalCost += inputCost + outputCost;
          }
        });
      }

      return acc;
    },
    { totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0 }
  );
}

/**
 * calculateTotalTokensAndCostFromUsageArray
 *
 * Computes total input tokens, output tokens, and cost for an array of usage objects.
 * @param usageArray - Array of usage objects with token info and model
 * @returns Object with totalInputTokens, totalOutputTokens, totalCost
 */
function calculateTotalTokensAndCostFromUsageArray(usageArray: UsageWithModel[]) {
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
 * step01FactsBitSplitting
 *
 * Split source content into fact-based chunks for processing.
 *
 * @param articleId - Article ID for tracking
 * @param request - Aggregate request with source data
 * @param logger - Pipeline logger for logging
 * @returns Response with processed sources
 */
async function step01FactsBitSplitting(articleId: string, request: AggregateRequest, logger: ReturnType<typeof createPipelineLogger> | null): Promise<Step01FactsBitSplittingResponse> {
  console.log("🚀 Step 1: Facts Bit Splitting");

  try {
    // Prepare the request for the API
    const step01Request: Step01FactsBitSplittingRequest = {
      sources: request.sources,
    };

    // Log the step request
    if (logger) {
      logger.logStepRequest(1, "Facts Bit Splitting", step01Request);
    }

    // Call the API endpoint
    const response = await fetch(`${baseUrl}/api/aggregate-steps/01-facts-bit-splitting`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(step01Request),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const aiResult: Step01FactsBitSplittingAIResponse = await response.json();

    // Calculate token usage (input and output) and cost
    const totals = calculateTotalTokensAndCostFromSources(aiResult.sources);

    // Log the totals for debugging/analysis
    console.log(`Step 01 total input tokens: ${totals.totalInputTokens}`);
    console.log(`Step 01 total output tokens: ${totals.totalOutputTokens}`);
    console.log(`Step 01 total cost (USD): $${totals.totalCost.toFixed(6)}`);

    // Log the API response
    if (logger) {
      logger.logStepResponse(1, "Facts Bit Splitting", aiResult);
    }

    // Wrap AI response with article management
    const result: Step01FactsBitSplittingResponse = {
      articleId,
      stepNumber: 1,
      success: true,
      sources: aiResult.sources,
      totals,
    };

    // Log step completion
    if (logger) {
      logger.logStepComplete(1, "Facts Bit Splitting", result);
    }

    return result;
  } catch (error) {
    console.error("Step 1 - Facts bit splitting failed:", error);

    // Log the error
    if (logger) {
      logger.logError("STEP_1_ERROR", error);
    }

    return {
      articleId,
      stepNumber: 1,
      success: false,
      sources: [],
      totals: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
      },
    };
  }
}

/**
 * step02FactsBitSplitting2
 *
 * Second pass of fact splitting for additional processing.
 *
 * @param articleId - Article ID for tracking
 * @param step1Result - Results from step 1
 * @param logger - Pipeline logger for logging
 * @returns Response with further processed sources
 */
async function step02FactsBitSplitting2(articleId: string, step1Result: Step01FactsBitSplittingResponse, logger: ReturnType<typeof createPipelineLogger> | null): Promise<FactsBitSplitting2Response> {
  console.log("🚀 Step 2: Facts Bit Splitting 2");

  try {
    // Check if any source is a primary source
    const hasPrimarySource = step1Result.sources.some((source) => source.isPrimarySource);

    if (hasPrimarySource) {
      // Call the API route if there's a primary source
      const step02Request: FactsBitSplitting2Request = {
        sources: step1Result.sources,
      };

      // Log the step request
      if (logger) {
        logger.logStepRequest(2, "Facts Bit Splitting 2", step02Request);
      }

      // Call the API endpoint
      const response = await fetch(`${baseUrl}/api/aggregate-steps/02-facts-bit-splitting-2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(step02Request),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const aiResult: FactsBitSplitting2AIResponse = await response.json();

      // Calculate token usage (input and output) and cost
      const totals = calculateTotalTokensAndCostFromSources(aiResult.sources);

      // Log the totals for debugging/analysis
      console.log(`Step 02 total input tokens: ${totals.totalInputTokens}`);
      console.log(`Step 1 total output tokens: ${totals.totalOutputTokens}`);
      console.log(`Step 1 total cost (USD): $${totals.totalCost.toFixed(6)}`);

      // Log the API response
      if (logger) {
        logger.logStepResponse(2, "Facts Bit Splitting 2", aiResult);
      }

      // Wrap AI response with article management
      const result: FactsBitSplitting2Response = {
        articleId,
        stepNumber: 2,
        success: true,
        sources: aiResult.sources,
        totals,
      };

      // Log step completion
      if (logger) {
        logger.logStepComplete(2, "Facts Bit Splitting 2", result);
      }

      return result;
    } else {
      // No primary source - manually populate factsBitSplitting2 field
      console.log("📝 No primary source found, manually populating factsBitSplitting2");

      const processedSources = step1Result.sources.map((source) => ({
        ...source,
        factsBitSplitting2: "--", // Default value for non-primary sources
      }));

      // Log the manual processing
      if (logger) {
        logger.logStepRequest(2, "Facts Bit Splitting 2", {
          sources: step1Result.sources,
          note: "Skipped API call - no primary sources",
        });
        logger.logStepResponse(2, "Facts Bit Splitting 2", {
          sources: processedSources,
          note: "Manual processing - no primary sources",
        });
      }

      // Build response
      const result: FactsBitSplitting2Response = {
        articleId,
        stepNumber: 2,
        success: true,
        sources: processedSources,
        totals: {
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalCost: 0,
        },
      };

      // Log step completion
      if (logger) {
        logger.logStepComplete(2, "Facts Bit Splitting 2", result);
      }

      return result;
    }
  } catch (error) {
    console.error("Step 2 - Facts bit splitting 2 failed:", error);

    // Log the error
    if (logger) {
      logger.logError("STEP_2_ERROR", error);
    }

    return {
      articleId,
      stepNumber: 2,
      success: false,
      sources: [],
      totals: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
      },
    };
  }
}

/**
 * step03HeadlinesBlobs
 *
 * Generate headline and content blobs for the article.
 *
 * @param articleId - Article ID for tracking
 * @param request - Aggregate request with instructions
 * @param step2Result - Results from step 2
 * @param logger - Pipeline logger for logging
 * @returns Response with headline and blobs
 */
async function step03HeadlinesBlobs(articleId: string, request: AggregateRequest, step2Result: FactsBitSplitting2Response, logger: ReturnType<typeof createPipelineLogger> | null): Promise<Step03HeadlinesBlobsResponse> {
  console.log("🚀 Step 3: Headlines Blobs");

  try {
    // Prepare the request for the API
    const step03Request: Step03HeadlinesBlobsRequest = {
      noOfBlobs: parseInt(request.instructions.blobs),
      headlineSuggestion: request.headline,
      instructions: request.instructions.instructions,
      sources: step2Result.sources,
    };

    // Log the step request
    if (logger) {
      logger.logStepRequest(3, "Headlines Blobs", step03Request);
    }

    // Call the API endpoint
    const response = await fetch(`${baseUrl}/api/aggregate-steps/03-headlines-blobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(step03Request),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const aiResult: Step03HeadlinesBlobsAIResponse = await response.json();

    // Calculate token usage (input and output) and cost
    const totals = calculateTotalTokensAndCostFromUsageArray(aiResult.usage);

    // Log the totals for debugging/analysis
    console.log(`Step 03 total input tokens: ${totals.totalInputTokens}`);
    console.log(`Step 03 total output tokens: ${totals.totalOutputTokens}`);
    console.log(`Step 03 total cost (USD): $${totals.totalCost.toFixed(6)}`);

    // Log the API response
    if (logger) {
      logger.logStepResponse(3, "Headlines Blobs", aiResult);
    }

    // Wrap AI response with article management
    const result: Step03HeadlinesBlobsResponse = {
      articleId,
      stepNumber: 3,
      success: true,
      headline: aiResult.headline,
      blobs: aiResult.blobs,
      totals,
    };

    // Log step completion
    if (logger) {
      logger.logStepComplete(3, "Headlines Blobs", result);
    }

    return result;
  } catch (error) {
    console.error("Step 3 - Headlines blobs failed:", error);

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
 * @param request - Aggregate request with instructions
 * @param step2Result - Results from step 2
 * @param articleStepOutputs - Accumulated outputs from previous steps
 * @param logger - Pipeline logger for logging
 * @returns Response with article outline
 */
async function step04WriteArticleOutline(articleId: string, request: AggregateRequest, step2Result: FactsBitSplitting2Response, articleStepOutputs: ArticleStepOutputs, logger: ReturnType<typeof createPipelineLogger> | null): Promise<Step04WriteArticleOutlineResponse> {
  console.log("🚀 Step 4: Write Article Outline");

  try {
    // Prepare the request for the API
    const step04Request: Step04WriteArticleOutlineRequest = {
      instructions: request.instructions.instructions,
      sources: step2Result.sources,
      articleStepOutputs: articleStepOutputs,
    };

    // Log the step request
    if (logger) {
      logger.logStepRequest(4, "Write Article Outline", step04Request);
    }

    // Call the API endpoint
    const response = await fetch(`${baseUrl}/api/aggregate-steps/04-write-article-outline`, {
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
    const totals = calculateTotalTokensAndCostFromUsageArray(aiResult.usage);

    // Log the totals for debugging/analysis
    console.log(`Step 04 total input tokens: ${totals.totalInputTokens}`);
    console.log(`Step 04 total output tokens: ${totals.totalOutputTokens}`);
    console.log(`Step 04 total cost (USD): $${totals.totalCost.toFixed(6)}`);

    // Log the API response
    if (logger) {
      logger.logStepResponse(4, "Write Article Outline", aiResult);
    }

    // Wrap AI response with article management
    const result: Step04WriteArticleOutlineResponse = {
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
 * @param request - Aggregate request with length requirements
 * @param step2Result - Results from step 2
 * @param articleStepOutputs - Accumulated outputs from previous steps
 * @param logger - Pipeline logger for logging
 * @returns Response with full article content
 */
async function step05WriteArticle(articleId: string, request: AggregateRequest, step2Result: FactsBitSplitting2Response, articleStepOutputs: ArticleStepOutputs, logger: ReturnType<typeof createPipelineLogger> | null): Promise<Step05WriteArticleResponse> {
  console.log("🚀 Step 5: Write Article");

  try {
    // Prepare the request for the API
    const step05Request: Step05WriteArticleRequest = {
      length: request.instructions.length,
      instructions: request.instructions.instructions,
      sources: step2Result.sources,
      articleStepOutputs: articleStepOutputs,
    };

    // Log the step request
    if (logger) {
      logger.logStepRequest(5, "Write Article", step05Request);
    }

    // Call the API endpoint
    const response = await fetch(`${baseUrl}/api/aggregate-steps/05-write-article`, {
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
    const totals = calculateTotalTokensAndCostFromUsageArray(aiResult.usage);

    // Log the totals for debugging/analysis
    console.log(`Step 05 total input tokens: ${totals.totalInputTokens}`);
    console.log(`Step 05 total output tokens: ${totals.totalOutputTokens}`);
    console.log(`Step 05 total cost (USD): $${totals.totalCost.toFixed(6)}`);

    // Log the API response
    if (logger) {
      logger.logStepResponse(5, "Write Article", aiResult);
    }

    // Wrap AI response with article management
    const result: Step05WriteArticleResponse = {
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
 * step06RewriteArticle
 *
 * Rewrite the article for style and tone improvements.
 *
 * @param articleId - Article ID for tracking
 * @param step2Result - Results from step 2
 * @param articleStepOutputs - Accumulated outputs from previous steps
 * @param logger - Pipeline logger for logging
 * @returns Response with rewritten article
 */
async function step06RewriteArticle(articleId: string, step2Result: FactsBitSplitting2Response, articleStepOutputs: ArticleStepOutputs, logger: ReturnType<typeof createPipelineLogger> | null): Promise<Step06RewriteArticleResponse> {
  console.log("🚀 Step 6: Rewrite Article");

  try {
    // Prepare the request for the API
    const step06Request: Step06RewriteArticleRequest = {
      sources: step2Result.sources,
      articleStepOutputs: articleStepOutputs,
    };

    // Log the step request
    if (logger) {
      logger.logStepRequest(6, "Rewrite Article", step06Request);
    }

    // Call the API endpoint
    const response = await fetch(`${baseUrl}/api/aggregate-steps/06-rewrite-article`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(step06Request),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const aiResult: Step06RewriteArticleAIResponse = await response.json();

    // Calculate token usage (input and output) and cost
    const totals = calculateTotalTokensAndCostFromUsageArray(aiResult.usage);

    // Log the totals for debugging/analysis
    console.log(`Step 06 total input tokens: ${totals.totalInputTokens}`);
    console.log(`Step 06 total output tokens: ${totals.totalOutputTokens}`);
    console.log(`Step 06 total cost (USD): $${totals.totalCost.toFixed(6)}`);

    // Log the API response
    if (logger) {
      logger.logStepResponse(6, "Rewrite Article", aiResult);
    }

    // Wrap AI response with article management
    const result: Step06RewriteArticleResponse = {
      articleId,
      stepNumber: 6,
      success: true,
      rewrittenArticle: aiResult.rewrittenArticle,
      totals,
    };

    // Log step completion
    if (logger) {
      logger.logStepComplete(6, "Rewrite Article", result);
    }

    return result;
  } catch (error) {
    console.error("Step 6 - Rewrite article failed:", error);

    // Log the error
    if (logger) {
      logger.logError("STEP_6_ERROR", error);
    }

    return {
      articleId,
      stepNumber: 6,
      success: false,
      rewrittenArticle: "",
      totals: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
      },
    };
  }
}

/**
 * step07RewriteArticle2
 *
 * Second rewrite pass for additional improvements.
 *
 * @param articleId - Article ID for tracking
 * @param step2Result - Results from step 2
 * @param articleStepOutputs - Accumulated outputs from previous steps
 * @param logger - Pipeline logger for logging
 * @returns Response with second rewritten article
 */
async function step07RewriteArticle2(articleId: string, step2Result: FactsBitSplitting2Response, articleStepOutputs: ArticleStepOutputs, logger: ReturnType<typeof createPipelineLogger> | null): Promise<Step07RewriteArticle2Response> {
  console.log("🚀 Step 7: Rewrite Article 2");

  try {
    // Prepare the request for the API
    const step07Request: Step07RewriteArticle2Request = {
      sources: step2Result.sources,
      articleStepOutputs: articleStepOutputs,
    };

    // Log the step request
    if (logger) {
      logger.logStepRequest(7, "Rewrite Article 2", step07Request);
    }

    // Call the API endpoint
    const response = await fetch(`${baseUrl}/api/aggregate-steps/07-rewrite-article-2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(step07Request),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const aiResult: Step07RewriteArticle2AIResponse = await response.json();

    // Calculate token usage (input and output) and cost
    const totals = calculateTotalTokensAndCostFromUsageArray(aiResult.usage);

    // Log the totals for debugging/analysis
    console.log(`Step 07 total input tokens: ${totals.totalInputTokens}`);
    console.log(`Step 07 total output tokens: ${totals.totalOutputTokens}`);
    console.log(`Step 07 total cost (USD): $${totals.totalCost.toFixed(6)}`);

    // Log the API response
    if (logger) {
      logger.logStepResponse(7, "Rewrite Article 2", aiResult);
    }

    // Wrap AI response with article management
    const result: Step07RewriteArticle2Response = {
      articleId,
      stepNumber: 7,
      success: true,
      rewrittenArticle: aiResult.rewrittenArticle,
      totals,
    };

    // Log step completion
    if (logger) {
      logger.logStepComplete(7, "Rewrite Article 2", result);
    }

    return result;
  } catch (error) {
    console.error("Step 7 - Rewrite article 2 failed:", error);

    // Log the error
    if (logger) {
      logger.logError("STEP_7_ERROR", error);
    }

    return {
      articleId,
      stepNumber: 7,
      success: false,
      rewrittenArticle: "",
      totals: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
      },
    };
  }
}

/**
 * step08ColorCode
 *
 * Add color coding for source attribution and final formatting.
 *
 * @param articleId - Article ID for tracking
 * @param articleStepOutputs - Accumulated outputs from previous steps
 * @param logger - Pipeline logger for logging
 * @returns Response with color coded article
 */
async function step08ColorCode(articleId: string, step2Result: FactsBitSplitting2Response, articleStepOutputs: ArticleStepOutputs, logger: ReturnType<typeof createPipelineLogger> | null): Promise<Step08ColorCodeResponse> {
  console.log("🚀 Step 8: Color Code");

  try {
    // Prepare the request for the API
    const step08Request: Step08ColorCodeRequest = {
      sources: step2Result.sources,
      articleStepOutputs: articleStepOutputs,
    };

    // Log the step request
    if (logger) {
      logger.logStepRequest(8, "Color Code", step08Request);
    }

    // Call the API endpoint
    const response = await fetch(`${baseUrl}/api/aggregate-steps/08-color-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(step08Request),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const aiResult: Step08ColorCodeAIResponse = await response.json();

    // Calculate token usage (input and output) and cost
    const totals = calculateTotalTokensAndCostFromUsageArray(aiResult.usage);

    // Log the totals for debugging/analysis
    console.log(`Step 08 total input tokens: ${totals.totalInputTokens}`);
    console.log(`Step 08 total output tokens: ${totals.totalOutputTokens}`);
    console.log(`Step 08 total cost (USD): $${totals.totalCost.toFixed(6)}`);

    // Log the API response
    if (logger) {
      logger.logStepResponse(8, "Color Code", aiResult);
    }

    // Wrap AI response with article management
    const result: Step08ColorCodeResponse = {
      articleId,
      stepNumber: 8,
      success: true,
      colorCodedArticle: aiResult.colorCodedArticle,
      richContent: aiResult.richContent,
      totals,
    };

    // Log step completion
    if (logger) {
      logger.logStepComplete(8, "Color Code", result);
    }

    return result;
  } catch (error) {
    console.error("Step 8 - Color code failed:", error);

    // Log the error
    if (logger) {
      logger.logError("STEP_8_ERROR", error);
    }

    return {
      articleId,
      stepNumber: 8,
      success: false,
      colorCodedArticle: "",
      richContent: "",
      totals: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
      },
    };
  }
}

/* ==========================================================================*/
// Main Pipeline Handler
/* ==========================================================================*/

/**
 * runAggregatePipeline
 *
 * Execute all 8 pipeline steps for an existing article.
 * Article must already exist in the database.
 * Exits early if any step fails.
 *
 * @param articleId - The existing article ID to process
 * @param request - The original aggregate request
 * @returns Pipeline response with all step results
 */
async function runAggregatePipeline(articleId: string, request: AggregateRequest): Promise<PipelineResponse> {
  console.log(`🚀 Starting aggregate pipeline execution for article: ${articleId}`);

  // Initialize pipeline logger
  const logger = createPipelineLogger(`${request.metadata.userId}-${request.slug}`, "aggregate");

  // Also set as global logger for route handlers to use
  initializeGlobalLogger(`${request.metadata.userId}-${request.slug}`, "aggregate");

  try {
    // Log initial request with complete data
    logger.logInitialRequest({
      requestType: "AggregateRequest",
      slug: request.slug,
      headline: request.headline,
      sources: request.sources,
      sourcesCount: request.sources.length,
      instructions: request.instructions,
      metadata: request.metadata,
      fullRequest: request, // Include complete request object
    });

    // Initialize cumulative totals
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;

    // Step 1: Facts Bit Splitting
    const step1Result = await step01FactsBitSplitting(articleId, request, logger);

    if (!step1Result.success) {
      return await handleStepFailure(1, articleId, request.metadata.userId, logger);
    }

    // Update status to 10% after step 1
    await updateArticleStatus(articleId, request.metadata.userId, "10%");

    // Accumulate totals from step 1
    totalInputTokens += step1Result.totals.totalInputTokens;
    totalOutputTokens += step1Result.totals.totalOutputTokens;
    totalCost += step1Result.totals.totalCost;

    // Step 2: Facts Bit Splitting 2
    const step2Result = await step02FactsBitSplitting2(articleId, step1Result, logger);

    if (!step2Result.success) {
      return await handleStepFailure(2, articleId, request.metadata.userId, logger);
    }

    // Update status to 25% after step 2
    await updateArticleStatus(articleId, request.metadata.userId, "25%");

    // Accumulate totals from step 2
    totalInputTokens += step2Result.totals.totalInputTokens;
    totalOutputTokens += step2Result.totals.totalOutputTokens;
    totalCost += step2Result.totals.totalCost;

    // Step 3: Headlines Blobs
    const step3Result = await step03HeadlinesBlobs(articleId, request, step2Result, logger);

    if (!step3Result.success) {
      return await handleStepFailure(3, articleId, request.metadata.userId, logger);
    }

    // Update status to 25% after step 3
    await updateArticleStatus(articleId, request.metadata.userId, "25%");

    // Accumulate totals from step 3
    totalInputTokens += step3Result.totals.totalInputTokens;
    totalOutputTokens += step3Result.totals.totalOutputTokens;
    totalCost += step3Result.totals.totalCost;

    // Build articleStepOutputs for remaining steps
    const articleStepOutputs: ArticleStepOutputs = {
      headlinesBlobs: {
        headline: step3Result.headline,
        blobs: step3Result.blobs,
      },
      paraphrasingFacts: {
        text: "", // This would come from a paraphrasing step if it exists
      },
    };

    // Step 4: Write Article Outline
    const step4Result = await step04WriteArticleOutline(articleId, request, step2Result, articleStepOutputs, logger);

    if (!step4Result.success) {
      return await handleStepFailure(4, articleId, request.metadata.userId, logger);
    }

    // Update status to 50% after step 4
    await updateArticleStatus(articleId, request.metadata.userId, "50%");

    // Accumulate totals from step 4
    totalInputTokens += step4Result.totals.totalInputTokens;
    totalOutputTokens += step4Result.totals.totalOutputTokens;
    totalCost += step4Result.totals.totalCost;

    // Update articleStepOutputs with step 4 results
    articleStepOutputs.writeArticleOutline = {
      text: step4Result.outline,
    };

    // Step 5: Write Article
    const step5Result = await step05WriteArticle(articleId, request, step2Result, articleStepOutputs, logger);

    if (!step5Result.success) {
      return await handleStepFailure(5, articleId, request.metadata.userId, logger);
    }

    // Update status to 50% after step 5
    await updateArticleStatus(articleId, request.metadata.userId, "50%");

    // Accumulate totals from step 5
    totalInputTokens += step5Result.totals.totalInputTokens;
    totalOutputTokens += step5Result.totals.totalOutputTokens;
    totalCost += step5Result.totals.totalCost;

    // Update articleStepOutputs with step 5 results
    articleStepOutputs.writeArticle = {
      text: step5Result.article,
    };

    // Step 6: Rewrite Article
    const step6Result = await step06RewriteArticle(articleId, step2Result, articleStepOutputs, logger);

    if (!step6Result.success) {
      return await handleStepFailure(6, articleId, request.metadata.userId, logger);
    }

    // Update status to 75% after step 6
    await updateArticleStatus(articleId, request.metadata.userId, "75%");

    // Accumulate totals from step 6
    totalInputTokens += step6Result.totals.totalInputTokens;
    totalOutputTokens += step6Result.totals.totalOutputTokens;
    totalCost += step6Result.totals.totalCost;

    // Update articleStepOutputs with step 6 results
    articleStepOutputs.rewriteArticle = {
      text: step6Result.rewrittenArticle,
    };

    // Update status to 75% after step 6
    await updateArticleStatus(articleId, request.metadata.userId, "75%");

    // Step 7: Rewrite Article 2
    const step7Result = await step07RewriteArticle2(articleId, step2Result, articleStepOutputs, logger);

    if (!step7Result.success) {
      return await handleStepFailure(7, articleId, request.metadata.userId, logger);
    }

    // Update status to 90% after step 7
    await updateArticleStatus(articleId, request.metadata.userId, "90%");

    // Accumulate totals from step 7
    totalInputTokens += step7Result.totals.totalInputTokens;
    totalOutputTokens += step7Result.totals.totalOutputTokens;
    totalCost += step7Result.totals.totalCost;

    // Update articleStepOutputs with step 7 results
    articleStepOutputs.rewriteArticle2 = {
      text: step7Result.rewrittenArticle,
    };

    // Update status to 90% after step 7
    await updateArticleStatus(articleId, request.metadata.userId, "90%");

    // Step 8: Color Code
    const step8Result = await step08ColorCode(articleId, step2Result, articleStepOutputs, logger);

    if (!step8Result.success) {
      return await handleStepFailure(8, articleId, request.metadata.userId, logger);
    }

    // Accumulate totals from step 8
    totalInputTokens += step8Result.totals.totalInputTokens;
    totalOutputTokens += step8Result.totals.totalOutputTokens;
    totalCost += step8Result.totals.totalCost;

    // Validate pipeline success
    const isSuccessful = validatePipelineSuccess(step1Result, step2Result, step3Result, step4Result, step5Result, step6Result, step7Result, step8Result);

    // Update article with results
    await updateArticleWithResults(articleId, request.metadata.userId, isSuccessful, step3Result.headline, step3Result.blobs, step8Result.colorCodedArticle, step8Result.richContent);

    // Build response
    const response: PipelineResponse = {
      success: isSuccessful,
      costUsd: totalCost,
      totalInputTokens: totalInputTokens,
      totalOutputTokens: totalOutputTokens,
    };

    // Log pipeline completion
    logger.logPipelineComplete(isSuccessful, response);

    // Close logger and save logs
    console.log(`📁 Pipeline logs saved to: ${logger.getLogFilePath()}`);
    await closeGlobalLogger();

    console.log("🎉 Aggregate pipeline completed successfully");

    // Send completion email
    await sendCompletionEmail(request.slug, request.metadata.currentVersion);

    return response;
  } catch (error) {
    console.error("💥 Aggregate pipeline failed:", error);

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
      costUsd: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
    };
  }
}

/* ==========================================================================*/
// Public API Exports
/* ==========================================================================*/

export { runAggregatePipeline };
