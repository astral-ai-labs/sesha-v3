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
}

// ==========================================================================
// Sources Helper
// ==========================================================================

export interface Source {
  number: number;
  accredit: string;
  text: string;
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
}

// ==========================================================================
// Step 1: Facts Bit Splitting
// ==========================================================================

export interface Step01FactsBitSplittingRequest {
  sources: Source[];
}

/** AI-only response from the route (no article management) */
export interface Step01FactsBitSplittingAIResponse {
  sources: Source[];
}

/** Full response for the pipeline (includes article management) */
export interface Step01FactsBitSplittingResponse extends BaseStepResponse {
  sources: Source[];
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
}

/** Full response for the pipeline (includes article management) */
export interface Step03HeadlinesBlobsResponse extends BaseStepResponse {
  headline: string;
  blobs: string[];
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
}

/** Full response for the pipeline (includes article management) */
export interface Step04WriteArticleOutlineResponse extends BaseStepResponse {
  outline: string;
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
}

/** Full response for the pipeline (includes article management) */
export interface Step05WriteArticleResponse extends BaseStepResponse {
  article: string;
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
}

/** Full response for the pipeline (includes article management) */
export interface Step06RewriteArticleResponse extends BaseStepResponse {
  rewrittenArticle: string;
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
}

/** Full response for the pipeline (includes article management) */
export interface Step07RewriteArticle2Response extends BaseStepResponse {
  rewrittenArticle: string;
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
}

/** Full response for the pipeline (includes article management) */
export interface Step08ColorCodeResponse extends BaseStepResponse {
  colorCodedArticle: string;
  richContent: string;
}
