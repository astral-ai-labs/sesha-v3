/* ==========================================================================*/
// digest.ts — Content pipeline request/response types
/* ==========================================================================*/
// Purpose: Define TypeScript interfaces for digest pipeline requests and responses
// Sections: Imports, Request Types, Step Types, Response Types
/* ==========================================================================*/

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// Local Types ----
import type { BlobsCount, LengthRange } from "@/db/schema";

/* ==========================================================================*/
// Request Types
/* ==========================================================================*/

/** Metadata for digest pipeline requests */
export interface DigestRequestMetadata {
  userId: string;
  orgId: string;
  currentVersion: number | null; // null if creating new article, number if creating new version
  currentVersionDecimal: string | null; // null if creating new article, string if creating new version
}

/** Complete digest request with all required data */
export interface DigestRequest {
  metadata: DigestRequestMetadata;
  slug: string;
  headline: string;
  source: {
    description: string;
    accredit: string;
    sourceText: string;
    url: string;
    verbatim: boolean;
    primary: boolean;
  };
  instructions: {
    instructions: string;
    blobs: BlobsCount;
    length: LengthRange;
  };
}

/** Base step request interface (can use extended input with accumulated context) */
export interface StepRequest {
  input: DigestRequest;
}

/** Base response interface for all pipeline steps */
export interface BaseStepResponse {
  articleId: string;
  stepNumber: number;
  success: boolean;
}

/* ==========================================================================*/
// Step 1: Extract Fact Quotes
/* ==========================================================================*/

/** Request for step 1 - extract fact quotes */
export interface Step01ExtractFactQuotesRequest {
  sourceAccredit: string;
  sourceDescription: string;
  sourceText: string;
}

/** AI-only response from the route (no article management) */
export interface Step01ExtractFactQuotesAIResponse {
  quotes: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    [key: string]: unknown;
  }[];
}

/** Full response for the pipeline (includes article management) */
export interface Step01ExtractFactQuotesResponse extends BaseStepResponse {
  quotes: string;
  totals: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
  };
}

/* ==========================================================================*/
// Step 2: Summarize Facts
/* ==========================================================================*/

/** Request for step 2 - summarize facts */
export interface Step02SummarizeFactsRequest {
  sourceAccredit: string;
  sourceDescription: string;
  sourceText: string;
  instructions: string;
}

/** AI-only response from the route (no article management) */
export interface Step02SummarizeFactsAIResponse {
  summary: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    [key: string]: unknown;
  }[];
}

/** Full response for the pipeline (includes article management) */
export interface Step02SummarizeFactsResponse extends BaseStepResponse {
  summary: string;
  totals: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
  };
}

/* ==========================================================================*/
// Step 3: Write Headline and Blobs
/* ==========================================================================*/

/** Request for step 3 - write headline and blobs */
export interface Step03WriteHeadlineAndBlobsRequest {
  blobs: number;
  headline?: string;
  instructions: string;
  // Source content - needed for generating headlines and blobs
  sourceAccredit?: string;
  sourceDescription?: string;
  sourceText?: string;
  summarizeFacts: string;
  extractFactQuotes: string;
}

/** AI-only response from the route (no article management) */
export interface Step03WriteHeadlineAndBlobsAIResponse {
  headline: string;
  blobs: string[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    [key: string]: unknown;
  }[];
}

/** Full response for the pipeline (includes article management) */
export interface Step03WriteHeadlineAndBlobsResponse extends BaseStepResponse {
  headline: string;
  blobs: string[];
  totals: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
  };
}

/* ==========================================================================*/
// Step 4: Write Article Outline
/* ==========================================================================*/

/** Request for step 4 - write article outline */
export interface Step04WriteArticleOutlineRequest {
  sourceAccredit: string;
  sourceDescription: string;
  sourceText: string;
  instructions: string;
  
  // Accumulated context from previous steps
  summarizeFactsText: string;
  extractFactQuotesText: string;
  headlineAndBlobsText: string;
}

/** AI-only response from the route (no article management) */
export interface Step04WriteArticleOutlineAIResponse {
  outline: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    [key: string]: unknown;
  }[];
}

/** Full response for the pipeline (includes article management) */
export interface Step04WriteArticleOutlineResponse extends BaseStepResponse {
  outline: string;
  totals: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
  };
}

/* ==========================================================================*/
// Step 5: Write Article
/* ==========================================================================*/

/** Request for step 5 - write article */
export interface Step05WriteArticleRequest {
  length: LengthRange;

  // Source Info
  sourceAccredit: string;
  sourceDescription: string;
  sourceText: string;
  isPrimarySource: boolean;

  // Editor Instructions
  instructions: string;

  // Accumulated context from previous steps
  headlineAndBlobsText: string;
  summarizeFactsText: string;
  articleOutlineText: string;
}

/** AI-only response from the route (no article management) */
export interface Step05WriteArticleAIResponse {
  article: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    [key: string]: unknown;
  }[];
}

/** Full response for the pipeline (includes article management) */
export interface Step05WriteArticleResponse extends BaseStepResponse {
  article: string;
  totals: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
  };
}

/* ==========================================================================*/
// Step 6: Paraphrase Article
/* ==========================================================================*/

/** Request for step 6 - paraphrase article */
export interface Step06ParaphraseArticleRequest {
  sourceAccredit: string;
  sourceDescription: string;
  sourceText: string;

  // Accumulated context from previous steps
  articleText: string;
}

/** AI-only response from the route (no article management) */
export interface Step06ParaphraseArticleAIResponse {
  paraphrasedArticle: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    [key: string]: unknown;
  }[];
}

/** Full response for the pipeline (includes article management) */
export interface Step06ParaphraseArticleResponse extends BaseStepResponse {
  paraphrasedArticle: string;
  totals: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
  };
}

/* ==========================================================================*/
// Step 7: Sentence Per Line Attribution
/* ==========================================================================*/

/** Request for step 7 - sentence per line attribution */
export interface Step07SentencePerLineAttributionRequest {
  paraphrasedArticle: string;
}

// /** AI-only response from the route (no article management) */
export interface Step07SentencePerLineAttributionAIResponse {
  formattedArticle: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    [key: string]: unknown;
  }[];
}

/** Full response for the pipeline (includes article management) */
export interface Step07SentencePerLineAttributionResponse extends BaseStepResponse {  
  formattedArticle: string;
  totals: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
  };
}


// ==========================================================================
// Verbatim Step
// ==========================================================================

export interface StepVerbatimRequest {
  sourceText: string;
}

export interface StepVerbatimResponse extends BaseStepResponse {
  formattedArticle: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    [key: string]: unknown;
  }[];
}

/* ==========================================================================*/
// Pipeline Response
/* ==========================================================================*/

/** Complete pipeline response with all step results */
export interface PipelineResponse {
  success: boolean;
  costUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  step_one_extract_fact_quotes?: Step01ExtractFactQuotesResponse;
  step_two_summarize_facts?: Step02SummarizeFactsResponse;
  step_three_write_headline_and_blobs?: Step03WriteHeadlineAndBlobsResponse;
  step_four_write_article_outline?: Step04WriteArticleOutlineResponse;
  step_five_write_article?: Step05WriteArticleResponse;
  step_six_paraphrase_article?: Step06ParaphraseArticleResponse;
  step_seven_sentence_per_line_attribution?: Step07SentencePerLineAttributionResponse;
  verbatim_step?: StepVerbatimResponse;
}
