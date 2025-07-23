"use server";

/* ==========================================================================*/
// orchestrate.ts — Pipeline orchestration and routing
/* ==========================================================================*/
// Purpose: Route article pipeline execution based on source type
// Sections: Imports, Types, Helper Functions, Pipeline Router, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// Core Modules ---
import "server-only";

// Local Database ----
import { getArticleById, updateArticleStatus, createRun, updateRun } from "@/db/dal";

// Local Pipeline Functions ----
import { runDigestPipeline } from "./digest";
import { runAggregatePipeline } from "./aggregate";

// Local Types ----
import type { DigestRequest } from "@/types/digest";
import type { AggregateRequest } from "@/types/aggregate";
import type { Article } from "@/db/schema";

/* ==========================================================================*/
// Types
/* ==========================================================================*/

interface PipelineExecutionResult {
  success: boolean;
  error?: string;
  articleId?: string;
}

/* ==========================================================================*/
// Helper Functions
/* ==========================================================================*/

/**
 * buildDigestRequestFromArticle
 *
 * Build a DigestRequest from an article record for single-source processing.
 *
 * @param article - Complete article record from database
 * @returns DigestRequest for pipeline execution
 */
function buildDigestRequestFromArticle(article: Article): DigestRequest {
  return {
    metadata: {
      userId: article.createdBy || "",
      orgId: article.orgId.toString(),
      currentVersion: article.version,
      currentVersionDecimal: article.versionDecimal,
    },
    slug: article.slug,
    headline: article.headline || "",
    source: {
      description: article.inputSourceDescription1 || "",
      url: article.inputSourceUrl1 || "",
      accredit: article.inputSourceAccredit1 || "",
      sourceText: article.inputSourceText1,
      verbatim: article.inputSourceVerbatim1,
      primary: article.inputSourcePrimary1,
    },
    instructions: {
      instructions: article.inputPresetInstructions,
      blobs: article.inputPresetBlobs,
      length: article.inputPresetLength,
    },
  };
}

/**
 * buildAggregateRequestFromArticle
 *
 * Build an AggregateRequest from an article record for multi-source processing.
 *
 * @param article - Complete article record from database
 * @returns AggregateRequest for pipeline execution
 */
function buildAggregateRequestFromArticle(article: Article): AggregateRequest {
  // Collect all non-null sources and map to Source interface
  const sources = [];
  let sourceNumber = 1;

  // Source 1 (always present)
  if (article.inputSourceText1) {
    sources.push({
      number: sourceNumber,
      url: article.inputSourceUrl1 || "",
      accredit: article.inputSourceAccredit1 || "",
      text: article.inputSourceText1,
      useVerbatim: article.inputSourceVerbatim1 || false,
      isPrimarySource: article.inputSourcePrimary1 || false,
      isBaseSource: article.inputSourceBase1 || false,
    });
    sourceNumber++;
  }

  // Source 2
  if (article.inputSourceText2) {
    sources.push({
      number: sourceNumber,
      url: article.inputSourceUrl2 || "",
      accredit: article.inputSourceAccredit2 || "",
      text: article.inputSourceText2,
      useVerbatim: article.inputSourceVerbatim2 || false,
      isPrimarySource: article.inputSourcePrimary2 || false,
      isBaseSource: article.inputSourceBase2 || false,
    });
    sourceNumber++;
  }

  // Source 3
  if (article.inputSourceText3) {
    sources.push({
      number: sourceNumber,
      url: article.inputSourceUrl3 || "",
      accredit: article.inputSourceAccredit3 || "",
      text: article.inputSourceText3,
      useVerbatim: article.inputSourceVerbatim3 || false,
      isPrimarySource: article.inputSourcePrimary3 || false,
      isBaseSource: article.inputSourceBase3 || false,
    });
    sourceNumber++;
  }

  // Source 4
  if (article.inputSourceText4) {
    sources.push({
      number: sourceNumber,
      url: article.inputSourceUrl4 || "",
      accredit: article.inputSourceAccredit4 || "",
      text: article.inputSourceText4,
      useVerbatim: article.inputSourceVerbatim4 || false,
      isPrimarySource: article.inputSourcePrimary4 || false,
      isBaseSource: article.inputSourceBase4 || false,
    });
    sourceNumber++;
  }

  // Source 5
  if (article.inputSourceText5) {
    sources.push({
      number: sourceNumber,
      url: article.inputSourceUrl5 || "",
      accredit: article.inputSourceAccredit5 || "",
      text: article.inputSourceText5,
      useVerbatim: article.inputSourceVerbatim5 || false,
      isPrimarySource: article.inputSourcePrimary5 || false,
      isBaseSource: article.inputSourceBase5 || false,
    });
    sourceNumber++;
  }

  // Source 6
  if (article.inputSourceText6) {
    sources.push({
      number: sourceNumber,
      url: article.inputSourceUrl6 || "",
      accredit: article.inputSourceAccredit6 || "",
      text: article.inputSourceText6,
      useVerbatim: article.inputSourceVerbatim6 || false,
      isPrimarySource: article.inputSourcePrimary6 || false,
      isBaseSource: article.inputSourceBase6 || false,
    });
    sourceNumber++;
  }

  return {
    metadata: {
      userId: article.createdBy || "",
      orgId: article.orgId.toString(),
      currentVersion: article.version,
      currentVersionDecimal: article.versionDecimal,
    },
    slug: article.slug,
    headline: article.headline || "",
    sources: sources,
    instructions: {
      instructions: article.inputPresetInstructions,
      blobs: article.inputPresetBlobs,
      length: article.inputPresetLength,
    },
  };
}

/* ==========================================================================*/
// Pipeline Router
/* ==========================================================================*/

/**
 * executePipelineByArticleId
 *
 * Execute the appropriate pipeline for an article based on its source type.
 * Fetches the article from the database and routes to digest or aggregate pipeline.
 *
 * @param articleId - The article ID to process
 * @returns Pipeline execution result
 */
async function executePipelineByArticleId(articleId: string): Promise<PipelineExecutionResult> {
  console.log(`🎯 Starting pipeline execution for article: ${articleId}`);

  try {
    // Fetch article from database
    const article = await getArticleById(articleId);

    if (!article) {
      console.error(`❌ Article not found: ${articleId}`);
      return {
        success: false,
        error: "Article not found",
      };
    }

    console.log(`📄 Article found: ${article.slug} (sourceType: ${article.sourceType})`);

    await updateArticleStatus(articleId, article.createdBy || "", "started");

    // Route to appropriate pipeline based on source type
    if (article.sourceType === "single") {
      console.log("🔄 Routing to digest pipeline (single source)");

      // Build digest request from article data
      const digestRequest = buildDigestRequestFromArticle(article);

      // Record the run
      const run = await createRun({
        articleId: articleId,
        userId: article.createdBy || "",
        sourceType: article.sourceType,
        length: article.inputPresetLength,
        costUsd: "0",
        inputTokensUsed: 0,
        outputTokensUsed: 0,
      });

      // Execute digest pipeline
      const result = await runDigestPipeline(articleId, digestRequest);

      // Update the run with the cost and tokens used
      await updateRun(run.id, result.costUsd, result.totalInputTokens, result.totalOutputTokens);

      return {
        success: result.success,
        articleId: articleId,
      };
    } else if (article.sourceType === "multi") {
      console.log("🔄 Routing to aggregate pipeline (multi source)");

      // Build aggregate request from article data
      const aggregateRequest = buildAggregateRequestFromArticle(article);

      // Record the run
      const run = await createRun({
        articleId: articleId,
        userId: article.createdBy || "",
        sourceType: article.sourceType,
        length: article.inputPresetLength,
        costUsd: "0",
        inputTokensUsed: 0,
        outputTokensUsed: 0,
      });

      // Execute aggregate pipeline
      const result = await runAggregatePipeline(articleId, aggregateRequest);

      // Update the run with the cost and tokens used
      await updateRun(run.id, result.costUsd, result.totalInputTokens, result.totalOutputTokens);

      return {
        success: result.success,
        articleId: articleId,
      };
    } else {
      console.error(`❌ Unknown source type: ${article.sourceType}`);
      return {
        success: false,
        error: `Unknown source type: ${article.sourceType}`,
      };
    }
  } catch (error) {
    console.error(`💥 Pipeline execution failed for article ${articleId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/* ==========================================================================*/
// Public API Exports
/* ==========================================================================*/

export { executePipelineByArticleId };
