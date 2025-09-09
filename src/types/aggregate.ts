/* ==========================================================================*/
// aggregate.ts — Content pipeline request/response types
/* ==========================================================================*/
// Purpose: Define TypeScript interfaces for aggregate pipeline requests and responses
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

/** Metadata for aggregate pipeline requests */
export interface AggregateRequestMetadata {
  userId: string;
  orgId: string;
  currentVersion: number | null; // null if creating new article, number if creating new version
  currentVersionDecimal: string | null; // null if creating new article, string if creating new version
}

/** Complete aggregate request with all required data */
export interface AggregateRequest {
  metadata: AggregateRequestMetadata;
  slug: string;
  headline: string;
  sources: Source[];
  instructions: {
    instructions: string;
    blobs: BlobsCount;
    length: LengthRange;
  };
}

/** Base response interface for all pipeline steps */
export interface BaseStepResponse {
  articleId: string;
  stepNumber: number;
  success: boolean;
}

export interface PipelineResponse {
  success: boolean;
  costUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

// ==========================================================================
// Sources Helper
// ==========================================================================

export interface Source {
  number: number;
  accredit: string;
  text: string;
  url: string;
  useVerbatim: boolean;
  isPrimarySource: boolean;
  isBaseSource: boolean;
  factsBitSplitting1?: string;
  factsBitSplitting2?: string;
}

// ==========================================================================
// Article-wide Step Outputs
// ==========================================================================

/** Article-wide step outputs */
export interface ArticleStepOutputs {
  headlinesBlobs?: {
    headline: string;
    blobs: string[];
  };
  paraphrasingFacts?: {
    text: string;
  };
  writeArticleOutline?: {
    text: string;
  };
  writeArticle?: {
    text: string;
  };
  rewriteArticle?: {
    text: string;
  };
  rewriteArticle2?: {
    text: string;
  };
  colorCode?: {
    text: string;
  };
  // TODO: Uncomment (and modify if necessary) the below

  detectRips?: {
    quoteComparisons: QuoteComparison[];
    overallRipScore: number;
    ripAnalysis: string;
  };
}

// ==========================================================================
// Step 1: Facts Bit Splitting
// ==========================================================================

export interface Step01FactsBitSplittingRequest {
  sources: Source[];
}

/** AI-only response from the route (no article management) */
export interface Step01FactsBitSplittingAIResponse {
  sources: AggregateSource[];
}

/** Full response for the pipeline (includes article management) */
export interface Step01FactsBitSplittingResponse extends BaseStepResponse {
  sources: AggregateSource[];
  totals: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
  };
}

// ==========================================================================
// Step 2: Facts Bit Splitting 2
// ==========================================================================

export interface FactsBitSplitting2Request {
  sources: Source[]; // Sources with factsBitSplitting populated from step 1
}

/** AI-only response from the route (no article management) */
export interface FactsBitSplitting2AIResponse {
  sources: Source[];
}

/** Full response for the pipeline (includes article management) */
export interface FactsBitSplitting2Response extends BaseStepResponse {
  sources: Source[];
  totals: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
  };
}

// ==========================================================================
// Step 3: Headlines Blobs
// ==========================================================================

export interface Step03HeadlinesBlobsRequest {
  noOfBlobs: number;
  headlineSuggestion?: string;
  instructions: string;
  sources: Source[]; // Sources with factsBitSplitting and factsBitSplitting2 populated
}

/** AI-only response from the route (no article management) */
export interface Step03HeadlinesBlobsAIResponse {
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
export interface Step03HeadlinesBlobsResponse extends BaseStepResponse {
  headline: string;
  blobs: string[];
  totals: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
  };
}

// ==========================================================================
// Step 4: Write Article Outline
// ==========================================================================

export interface Step04WriteArticleOutlineRequest {
  instructions: string;
  sources: Source[]; // Sources with accumulated processing results
  articleStepOutputs: ArticleStepOutputs;
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

// ==========================================================================
// Step 5: Write Article
// ==========================================================================

export interface Step05WriteArticleRequest {
  length: LengthRange;
  instructions: string;
  sources: Source[]; // Sources with accumulated processing results
  articleStepOutputs: ArticleStepOutputs;
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

// ==========================================================================
// Step 6: Rewrite Article
// ==========================================================================

export interface Step06RewriteArticleRequest {
  sources: Source[]; // Sources with accumulated processing results
  articleStepOutputs: ArticleStepOutputs;
}

/** AI-only response from the route (no article management) */
export interface Step06RewriteArticleAIResponse {
  rewrittenArticle: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    [key: string]: unknown;
  }[];
}

/** Full response for the pipeline (includes article management) */
export interface Step06RewriteArticleResponse extends BaseStepResponse {
  rewrittenArticle: string;
  totals: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
  };
}

// ==========================================================================
// Step 7: Rewrite Article 2
// ==========================================================================

export interface Step07RewriteArticle2Request {
  sources: Source[]; // Sources with accumulated processing results
  articleStepOutputs: ArticleStepOutputs;
}

/** AI-only response from the route (no article management) */
export interface Step07RewriteArticle2AIResponse {
  rewrittenArticle: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    [key: string]: unknown;
  }[];
}

/** Full response for the pipeline (includes article management) */
export interface Step07RewriteArticle2Response extends BaseStepResponse {
  rewrittenArticle: string;
  totals: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
  };
}

// ==========================================================================
// Step 8: Color Code
// ==========================================================================

export interface Step08ColorCodeRequest {
  sources: Source[]; // Sources with accumulated processing results
  articleStepOutputs: ArticleStepOutputs;
}

/** AI-only response from the route (no article management) */
export interface Step08ColorCodeAIResponse {
  colorCodedArticle: string;
  richContent: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    [key: string]: unknown;
  }[];
}

/** Full response for the pipeline (includes article management) */
export interface Step08ColorCodeResponse extends BaseStepResponse {
  colorCodedArticle: string;
  richContent: string;
  totals: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
  };
}

// ==========================================================================
// Step 9: Rip Analysis
// ==========================================================================

// TODO: Uncomment (and modify if necessary) the below

export interface Step09DetectRipsRequest {
  sources: Source[];
  articleStepOutputs: ArticleStepOutputs;
}

export interface Step09DetectRipsAIResponse {
  quoteComparisons: QuoteComparison[];
  overallRipScore: number;  // 0 - 100 scale?
  ripAnalysis: string;  // Overall rip summary analysis
  usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    [key: string]: unknown;
  }[];
}

export interface Step09DetectRipsResponse extends BaseStepResponse {
  quoteComparisons: QuoteComparison[];
  overallRipScore: number;  // 0 - 100 scale?
  ripAnalysis: string;  // Overall rip summary analysis
  totals: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
  }
}

// ==========================================================================
// Rip Helpers (Step 9 - Detect Rips)
// ==========================================================================

// TODO: Uncomment (and modify if necessary) the below

export interface QuoteComparison {
  articleQuote: string;
  sourceQuote: string;
  sourceNumber: number;
  ripAnalysis: string;
}

export interface SourceComparisonDialogProps {
  quoteTuples: QuoteComparison[];
}

// ==========================================================================
// Aggregate Source (with usage/model for cost tracking)
// ==========================================================================

/**
 * AggregateSource
 *
 * Extends Source with optional usage/model fields for token/cost tracking.
 */
export interface AggregateSource extends Source {
  usage?: Array<{
    inputTokens: number;
    outputTokens: number;
    model: string;
    [key: string]: unknown;
  }>;
}
