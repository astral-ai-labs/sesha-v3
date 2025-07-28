/* ==========================================================================*/
// page.tsx — Article page layout with resizable panels
/* ==========================================================================*/
// Purpose: Main article page with left panel for inputs and right panel for presets
// Sections: Imports, Component, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ---
import React from "react";

// Next.js core ---
import { redirect } from "next/navigation";

// Local Modules ---
import { ArticleProvider } from "@/components/article/article-context";
import ArticlePageClient from "./client";

// Authentication ---
import { getAuthenticatedUserServer } from "@/lib/supabase/server";

// Database ---
import { getArticlesByOrgSlug } from "@/db/dal";

/* ==========================================================================*/
// Main Component
/* ==========================================================================*/

/**
 * ArticlePage
 *
 * Main article page with resizable left panel for output information and right panel for versions.
 * Uses 79/21 split with user-adjustable resize handle on desktop.
 * Uses drawer for versions on mobile/tablet.
 * Provides article context to child components for version management.
 */
async function ArticlePage({ searchParams }: { searchParams: Promise<{ slug?: string; version?: string }> }) {
  // Authentication ---
  const user = await getAuthenticatedUserServer();
  if (!user) {
    redirect("/login");
  }

  // Parse search parameters ---
  const { slug, version } = await searchParams;

  if (!slug) {
    redirect("/library");
  }

  // Fetch all articles with this slug ---
  const articles = await getArticlesByOrgSlug(user.orgId, slug);

  if (!articles || articles.length === 0) {
    redirect("/library");
  }

  return (
    <ArticleProvider articles={articles} initialVersionDecimal={version ? version : undefined} key={`${slug}-${version || "latest"}`}>
      <ArticlePageClient />
    </ArticleProvider>
  );
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/

export default ArticlePage;
