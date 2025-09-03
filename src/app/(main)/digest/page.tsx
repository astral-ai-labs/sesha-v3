/* ==========================================================================*/
// page.tsx — Unified Digest page layout with resizable panels
/* ==========================================================================*/
// Purpose: Show digest builder using unified context and shared components.
//          If ?slug=&version= are provided we pre-fill the context with that
//          article's data; otherwise the builder is blank.
// Sections: Imports ▸ Utility Functions ▸ Data fetch ▸ Component ▸ Exports
/* ==========================================================================*/

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React Server Component -----------------------------------------------------
import React from "react";

// DAL helpers ----------------------------------------------------------------
import { getArticleByOrgSlugVersion, getOrgPresets } from "@/db/dal";
import type { Article } from "@/db/schema";

// Auth helpers ---------------------------------------------------------------
import { getAuthenticatedUserServer } from "@/lib/supabase/server";

// Unified Context ------------------------------------------------------------
import { ArticleHandlerProvider, type ArticleHandlerState } from "@/components/article-handling/shared/article-handler-context";
import { redirect } from "next/navigation";
import DigestPageClient from "./client";

/* ==========================================================================*/
// Utility Functions
/* ==========================================================================*/

/**
 * buildInitialStateFromInputs
 *
 * Converts Article inputs from the database into ArticleHandlerState format
 * for pre-filling the digest form with a single source.
 *
 * @param inputs - The article inputs from the database
 * @param orgId - Organization ID
 * @param currentVersion - The current version of the article
 * @returns Partial ArticleHandlerState for context initialization
 */
function buildInitialStateFromInputs(inputs: Article, orgId: number = 1, currentVersion: number = 1): Partial<ArticleHandlerState> {
  // Build single source from database fields
  const sources = [
    {
      id: `source-1-${Date.now()}`,
      url: inputs.inputSourceUrl1 || "",
      usage: {
        sourceText: inputs.inputSourceText1,
        description: inputs.inputSourceDescription1,
        accredit: inputs.inputSourceAccredit1,
        verbatim: inputs.inputSourceVerbatim1,
        primary: inputs.inputSourcePrimary1,
        base: false, // Not used in single mode
      },
    },
  ];

  return {
    basic: {
      slug: inputs.slug,
      headline: inputs.headline ?? "",
    },
    sources,
    preset: {
      title: inputs.inputPresetTitle ?? "",
      instructions: inputs.inputPresetInstructions,
      blobs: inputs.inputPresetBlobs,
      length: inputs.inputPresetLength,
    },
    metadata: {
      orgId,
      currentVersion,
    },
    mode: "single", // Always single mode for digest
  };
}

/* ==========================================================================*/
// Main Component
/* ==========================================================================*/

/**
 * Digest2Page
 *
 * Unified digest page with resizable left panel for input forms and right panel for presets manager.
 * Uses shared components and unified context. 70/30 split with user-adjustable resize handle.
 */
async function Digest2Page({ searchParams }: { searchParams: Promise<{ slug?: string; version?: string }> }) {
  /* ------------------------- 1. Parse URL params ----------------------- */
  const { slug, version } = await searchParams;
  const user = await getAuthenticatedUserServer();
  if (!user) {
    redirect("/login");
  }
  const ORG_ID = user.orgId;

  /* ------------------------- 2. Fetch presets (always) ------------------ */
  const presets = await getOrgPresets(ORG_ID);

  /* ------------------------- 3. Fetch article (optional) ---------------- */
  let initialState: Partial<ArticleHandlerState> | undefined;

  if (slug) {
    try {
      // Get both article metadata and inputs
      const article = await getArticleByOrgSlugVersion(ORG_ID, slug, version ? version : "1.00");

      if (article) {
        initialState = buildInitialStateFromInputs(article, ORG_ID, version ? Number(version) : 1);
      }
      // If no article found, initialState remains undefined (blank form)
    } catch (error) {
      console.error("Failed to fetch article, leaving blank form:", error);
      // Continue with blank form on error
    }
  }

  console.log("🔍 Digest2Page version:", version ? Number(version) : 1);

  // For new articles, make sure we have the orgId in metadata and set single mode
  if (!initialState) {
    initialState = {
      metadata: {
        orgId: ORG_ID,
        currentVersion: version ? Number(version) : 1,
      },
      mode: "single",
    };
  } else {
    // Ensure mode is set to single even when loading existing article
    initialState.mode = "single";
  }

  console.log("🔍 Digest2Page initialState:", initialState);

  /* ------------------------- 4. Render client tree --------------------- */
  return (
    <ArticleHandlerProvider initialMode="single" initialState={initialState}>
      <DigestPageClient presets={presets} />
    </ArticleHandlerProvider>
  );
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/

export default Digest2Page;
