"use client";

/* ==========================================================================*/
// use-submission.ts — Custom hook for pipeline submission (digest & aggregate)
/* ==========================================================================*/
// Purpose: Consolidate pipeline submission logic and prevent code duplication
// Sections: Imports, Types, Helper Functions, Hooks, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ---
import { useState } from "react";

// External Packages ---
import { toast } from "sonner";

// Local Files ---
import { getAuthenticatedUserClient } from "@/lib/supabase/client";
import { createArticleFromRequest } from "@/actions/execute/trigger";

// Types ---
import type { DigestRequest } from "@/types/digest";
import type { AggregateRequest } from "@/types/aggregate";
import type { BlobsCount, LengthRange } from "@/db/schema";

/* ==========================================================================*/
// Types
/* ==========================================================================*/

interface PipelineSubmissionParams {
  slug: string;
  headline?: string;
  headlineSource?: 'ai' | 'manual';
  sources: {
    description: string;
    accredit: string;
    sourceText: string;
    url: string;
    verbatim: boolean;
    primary: boolean;
    base: boolean;
  }[];
  instructions: {
    instructions: string;
  };
  preset: {
    title: string;
    blobs: BlobsCount;
    length: LengthRange;
  };
  metadata: {
    currentVersion?: number | null;
    currentVersionDecimal?: string | null;
    orgId: number;
  };
}

/* ==========================================================================*/
// Helper Functions
/* ==========================================================================*/

/**
 * buildPipelineRequest
 *
 * Build a DigestRequest or AggregateRequest from pipeline context data and user metadata.
 *
 * @param params - Object containing all pipeline form data
 * @param sourceType - Type of source handling ('single' | 'multi')
 * @returns Complete DigestRequest or AggregateRequest for pipeline processing
 */
async function buildPipelineRequest(params: PipelineSubmissionParams, sourceType: "single" | "multi"): Promise<DigestRequest | AggregateRequest> {
  // Get authenticated user info
  const authUser = await getAuthenticatedUserClient();

  if (!authUser) {
    throw new Error("User not authenticated");
  }

  const baseRequest = {
    metadata: {
      userId: authUser.userId,
      orgId: params.metadata.orgId.toString(),
      currentVersion: params.metadata.currentVersion || null,
      currentVersionDecimal: params.metadata.currentVersionDecimal || null,
    },
    slug: params.slug,
    headline: params.headline || "",
    headlineSource: params.headlineSource || 'ai',
    instructions: {
      instructions: params.instructions.instructions,
      blobs: params.preset.blobs as BlobsCount,
      length: params.preset.length as LengthRange,
    },
  };

  if (sourceType === "single") {
    console.log("🚀 buildPipelineRequest - single source mode");
    return {
      ...baseRequest,
      source: params.sources[0], // Use first source for single-source (digest)
    };
  } else {
    console.log("🚀 buildPipelineRequest - multi source mode");
    return {
      ...baseRequest,
      sources: params.sources.map((source, index) => ({
        number: index + 1,
        accredit: source.accredit,
        text: source.sourceText,
        url: source.url,
        useVerbatim: source.verbatim,
        isPrimarySource: source.primary,
        isBaseSource: source.base, // First source is base source
      })), // Use all sources for multi-source (aggregate)
    };
  }
}

/* ==========================================================================*/
// Pipeline Triggering Hook
/* ==========================================================================*/

/**
 * usePipelineSubmission
 *
 * Custom hook that manages pipeline triggering (article creation) with loading state.
 * Works with both single-source (digest) and multi-source (aggregate) pipelines.
 *
 * @returns Object with triggerPipeline function and loading state
 */
export function usePipelineSubmission() {
  const [isLoading, setIsLoading] = useState(false);

  const triggerPipeline = async (params: PipelineSubmissionParams, sourceType: "single" | "multi") => {
    if (isLoading) return;

    console.log("🚀 usePipelineSubmission - triggerPipeline called with sourceType:", sourceType);
    console.log("🚀 usePipelineSubmission - params.sources.length:", params.sources.length);

    setIsLoading(true);

    let request: DigestRequest | AggregateRequest;

    try {
      console.log(`🚀 Triggering ${sourceType} pipeline...`);

      // Build request based on source type
      request = await buildPipelineRequest(params, sourceType);

    } catch (error) {
      console.error("❌ Pipeline trigger error:", error);
      toast.error("An error occurred during pipeline triggering");
      setIsLoading(false);
      return;
    }

    // Create article using the unified function - this will redirect on success
    // Don't wrap in try-catch because redirect throws a special Next.js error
    await createArticleFromRequest(request, sourceType);

    // This code will not execute due to redirect, but leaving for completeness
    console.log("✅ Article processing started");
    toast.success("Article processing started!");
    setIsLoading(false);
  };

  return {
    triggerPipeline,
    isLoading,
  };
}

/* ==========================================================================*/
// Public Hook Exports
/* ==========================================================================*/

export type { PipelineSubmissionParams };
