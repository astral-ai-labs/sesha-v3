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
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import Versions from "@/components/article/versions";
import ArticleContentPanel from "@/components/article/article-content-panel";
import { ArticleProvider } from "@/components/article/article-context";

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
 * Uses 70/30 split with user-adjustable resize handle.
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

      <div className="h-[calc(100vh-4rem)] group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100vh-3rem)] transition-[height] ease-linear">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Start of Left Panel --- */}
          <ResizablePanel defaultSize={70} minSize={65} maxSize={75} className="">
            <ArticleContentPanel />
          </ResizablePanel>
          {/* End of Left Panel ---- */}

          <ResizableHandle />

          {/* Start of Right Panel --- */}
          <ResizablePanel defaultSize={30} minSize={25} maxSize={35} className="max-h-full bg-secondary/30">
            <Versions />
          </ResizablePanel>
          {/* End of Right Panel ---- */}
        </ResizablePanelGroup>
      </div>
    </ArticleProvider>
  );
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/

export default ArticlePage;
