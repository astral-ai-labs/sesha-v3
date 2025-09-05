"use server";

/* ==========================================================================*/
// trigger-pipeline.ts — Article creation and pipeline triggering
/* ==========================================================================*/
// Purpose: Handle article creation from digest requests and trigger pipeline execution
// Sections: Imports, Types, Article Creation, Pipeline Triggering, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// Core Modules ---
import "server-only";

// Next.js ---
import { revalidatePath } from "next/cache";
import { redirect, permanentRedirect } from "next/navigation";
import { after } from "next/server";

// Local Database ----
import { createAiArticleRecord, updateArticleStatus, getArticleById } from "@/db/dal";

// Local Pipeline ----
import { executePipelineByArticleId } from "./orchestrate";

// Local Utils ----
import { cleanSlug } from "@/lib/utils";

// Local Types ----
import type { DigestRequest } from "@/types/digest";
import type { AggregateRequest } from "@/types/aggregate";
import type { Article } from "@/db/schema";

// Authentication ---
import { getAuthenticatedUserServer } from "@/lib/supabase/server";

/* ==========================================================================*/
// Types
/* ==========================================================================*/

/* ==========================================================================*/
// Article Creation
/* ==========================================================================*/

/**
 * createArticleFromRequest
 *
 * Create an article record from a digest or aggregate request with cleaned slug.
 * Handles both single source (digest) and multi-source (aggregate) requests.
 * Redirects to library page upon successful creation.
 *
 * @param request - Complete digest or aggregate request
 */
export async function createArticleFromRequest(request: DigestRequest | AggregateRequest, sourceType: "single" | "multi"): Promise<void> {
  console.log("📝 Creating article record from request");

  let article: Article;

  try {

    const user = await getAuthenticatedUserServer();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Clean the slug before processing
    const originalSlug = request.slug;
    const cleanedSlug = cleanSlug(request.slug);

    console.log(`🧹 Slug cleaned: "${originalSlug}" -> "${cleanedSlug}"`);

    // Convert sources to the format expected by createArticleRecord
    let sources: { description: string; accredit: string; sourceText: string; url: string; verbatim: boolean; primary: boolean }[];

    if (sourceType === "single") {
      console.log("🚀 createArticleFromRequest - single source mode");
      request = request as DigestRequest;
      // DigestRequest - single source
      sources = [
        {
          description: request.source.description,
          accredit: request.source.accredit,
          sourceText: request.source.sourceText,
          url: request.source.url, // Add URL field
          verbatim: request.source.verbatim,
          primary: request.source.primary,
        },
      ];
    } else {
      console.log("🚀 createArticleFromRequest - multi source mode");
      request = request as AggregateRequest;
      // AggregateRequest - multiple sources
      sources = request.sources.map((source) => ({
        description: "", // Source interface doesn't have description, so use empty string
        accredit: source.accredit,
        sourceText: source.text,
        url: source.url, // Add URL field
        verbatim: source.useVerbatim,
        primary: source.isPrimarySource,
      }));
      sourceType = "multi";
    }

    // Build unified request for createArticleRecord
    const cleanedRequest = {
      metadata: {
        userId: user.id,
        orgId: user.orgId.toString(),
        currentVersion: request.metadata.currentVersion,
        currentVersionDecimal: request.metadata.currentVersionDecimal,
      },
      slug: cleanedSlug,
      headline: request.headline,
      headlineSource: request.headlineSource || 'ai',
      sources: sources,
      instructions: request.instructions,
      sourceType: sourceType,
    };

    console.log("The source type is: ", cleanedRequest.sourceType);
    // Create article record
    article = await createAiArticleRecord(cleanedRequest);

    console.log(`✅ Article created with source type: ${sourceType} and ID: ${article.id}`);
  } catch (error) {
    console.error("❌ Failed to create article:", error);
    throw error; // Re-throw to be handled by caller
  }

  // Revalidate and redirect after successful creation
  revalidatePath("/library");
  redirect(`/library?id=${article.id}`);
}

/**
 * cleanupLibraryURL
 *
 * Server action to clean up the library URL by removing query parameters
 * and redirecting to the clean library page using permanentRedirect.
 */
export async function cleanupLibraryURL(): Promise<void> {
  revalidatePath("/library");
  permanentRedirect("/library");
}

/**
 * startPipelineExecution
 *
 * Immediately set article status to "started" and trigger background pipeline execution.
 * This ensures the article is immediately available for polling while the pipeline runs.
 *
 * @param articleId - The article ID to process
 */
export async function startPipelineExecution(articleId: string): Promise<void> {
  console.log(`⚡ Starting pipeline execution for article: ${articleId}`);

  try {
    // Get authenticated user
    const user = await getAuthenticatedUserServer();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get article to verify it exists
    const article = await getArticleById(articleId);
    if (!article) {
      throw new Error("Article not found");
    }

    // Immediately set status to "started" so article appears in polling
    await updateArticleStatus(articleId, user.id, "started");
    console.log(`✅ Article status set to "started" for article: ${articleId}`);

    // Execute pipeline in background after response is sent
    after(async () => {
      try {
        console.log(`🚀 Starting background pipeline for article: ${articleId}`);
        const result = await executePipelineByArticleId(articleId);

        if (result.success) {
          console.log(`✅ Background pipeline completed successfully for article: ${articleId}`);
        } else {
          console.error(`❌ Background pipeline failed for article: ${articleId}`, result.error);
        }
      } catch (error) {
        console.error(`💥 Background pipeline error for article: ${articleId}`, error);
      }
    });

    console.log(`🎯 Pipeline scheduled for background execution: ${articleId}`);
  } catch (error) {
    console.error(`❌ Failed to start pipeline execution for article: ${articleId}`, error);
    throw error;
  }
}
