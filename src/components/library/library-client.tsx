"use client";

/* ==========================================================================*/
// library-client.tsx — Client component wrapper for library with infinite scroll
/* ==========================================================================*/
// Purpose: Handles infinite scroll logic at page level for the library and
// oversees live status updates for articles in progress.
// Sections: Imports, Constants, Utils, Component, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ---
import React from "react";

// Next.js ---
import { useSearchParams, useRouter } from "next/navigation";

// External Packages ---
import { useInView } from "react-intersection-observer";
import { toast } from "sonner";

// Local Modules ---
import { ArticleDataTable } from "./data-table";
import { ArticleMetadata } from "@/db/dal";
import { loadArticlesAction, checkArticleStatusAction } from "@/actions/article";
import { startPipelineExecution, cleanupLibraryURL } from "@/actions/execute/trigger";

/* ==========================================================================*/
// Constants & Utils
/* ==========================================================================*/

// All active statuses (excludes pending since it's now handled directly)
const ACTIVE_STATUSES = ["pending", "started", "10%", "25%", "50%", "75%", "90%"] as const;

type ActiveStatus = (typeof ACTIVE_STATUSES)[number];

// Type guards
const isActiveStatus = (status: string): status is ActiveStatus => (ACTIVE_STATUSES as readonly string[]).includes(status);

/* ==========================================================================*/
// Component
/* ==========================================================================*/

function LibraryClient() {
  /* -------------------------------- State -------------------------------- */
  const [articles, setArticles] = React.useState<ArticleMetadata[]>([]);
  const [isLoading, setIsLoading] = React.useState(true); // initial load flag
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [isFetchingArticle, setIsFetchingArticle] = React.useState(false);

  /* --------------------------- URL Parameters ---------------------------- */
  const searchParams = useSearchParams();
  const articleId = searchParams.get("id");
  const router = useRouter();

  /* ------------------------- Infinite Scroll Setup ----------------------- */
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0, rootMargin: "100px" });

  /* ---------------------- Derived Active Articles List ------------------- */
  const activeArticles = React.useMemo(() => articles.filter((a) => isActiveStatus(a.status)), [articles]);

  /* --------------------------- Data Loaders ------------------------------ */
  const loadInitialArticles = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await loadArticlesAction(0, 50);
      if (result.success) {
        setArticles(result.articles);
        setHasMore(result.articles.length < result.totalCount);
      } else {
        console.error("Failed to load initial articles:", result.error);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load initial articles:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMoreArticles = React.useCallback(async () => {
    if (isLoadingMore || !hasMore || isLoading) return;
    setIsLoadingMore(true);
    try {
      const offset = articles.length;
      const result = await loadArticlesAction(offset, 50);
      if (result.success && result.articles.length > 0) {
        setArticles((prev) => [...prev, ...result.articles]);
        setHasMore(offset + result.articles.length < result.totalCount);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more articles:", error);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [articles.length, hasMore, isLoading, isLoadingMore]);

  /* ------------------- Live Polling for All Active Articles -------------- */
  const refreshActiveArticles = React.useCallback(async () => {
    console.log("🔍 Refreshing active articles", activeArticles.length);

    try {
      // First, check existing active articles for status changes
      if (activeArticles.length > 0) {
        console.log(
          "🔍 Checking existing active articles:",
          activeArticles.map((a) => ({ slug: a.slug, version: a.version, status: a.status }))
        );

        const checks = await Promise.all(activeArticles.map((a) => checkArticleStatusAction(a.slug, a.version)));

        console.log(
          "🔍 Status check results:",
          checks.map((c) => (c.success ? c.article?.status : "failed"))
        );

        const updated: ArticleMetadata[] = [];
        activeArticles.forEach((article, idx) => {
          const res = checks[idx];
          if (res.success && res.article && res.article.status !== article.status) {
            console.log(`📡 Status changed for ${article.slug}v${article.version}: ${article.status} → ${res.article.status}`);
            updated.push({
              ...article,
              status: res.article.status,
              updatedAt: res.article.updatedAt,
              headline: res.article.headline || article.headline,
            });
          }
        });

        if (updated.length > 0) {
          console.log(`📡 Updating ${updated.length} article(s) with new status`);
          setArticles((prev) => prev.map((a) => updated.find((u) => u.slug === a.slug && u.version === a.version) ?? a));
        }
      }

      // Also check for new articles that might have been created and started
      // This handles the case where a new article was just created with "started" status
      const currentActiveCount = activeArticles.length;
      if (currentActiveCount === 0) {
        console.log("🔍 No active articles - checking for new ones");
        const result = await loadArticlesAction(0, 10); // Only check first 10 articles
        if (result.success) {
          const newActiveArticles = result.articles.filter((a) => isActiveStatus(a.status));
          if (newActiveArticles.length > 0) {
            console.log(`📡 Found ${newActiveArticles.length} new active article(s)`);
            setArticles((prev) => {
              // Add new articles that aren't already in the list
              const existingIds = new Set(prev.map((a) => a.id));
              const newArticles = newActiveArticles.filter((a) => !existingIds.has(a.id));
              if (newArticles.length > 0) {
                return [...newArticles, ...prev];
              }
              return prev;
            });
          }
        }
      }
    } catch (error) {
      console.error("❌ Failed to refresh active articles:", error);
    }
  }, [activeArticles]);

  /* ----------------------- Article Navigation ---------------------------- */
  const handleArticleNavigation = React.useCallback((slug: string, version: string) => {
    setIsFetchingArticle(true);
    router.push(`/article?slug=${encodeURIComponent(slug)}&version=${encodeURIComponent(version)}`);
  }, [router]);

  /* ----------------------- Pipeline Execution ---------------------------- */
  const executeArticlePipeline = React.useCallback(async (id: string) => {
    try {
      console.log(`⚡ Starting pipeline execution for article: ${id}`);

      // Use the new background execution function
      await startPipelineExecution(id);
    } catch (error) {
      console.error("❌ Pipeline execution error:", error);
      toast.error("An error occurred during article generation");
    }

    console.log("✅ Article generation started in background");
    toast.success("Article generation started in background");

    // Clean up URL parameter immediately - the polling will pick up the new article
    await cleanupLibraryURL();
  }, []);

  /* ----------------------------- Effects --------------------------------- */
  // Initial load
  React.useEffect(() => {
    loadInitialArticles();
  }, [loadInitialArticles]);

  // Execute pipeline if article ID is provided in URL
  React.useEffect(() => {
    if (articleId && !isLoading) {
      executeArticlePipeline(articleId);
    }
  }, [articleId, isLoading, executeArticlePipeline]);

  // Infinite scroll trigger
  React.useEffect(() => {
    if (inView && hasMore && !isLoading && !isLoadingMore) {
      loadMoreArticles();
    }
  }, [inView, hasMore, isLoading, isLoadingMore, loadMoreArticles]);

  // Poll all active articles while any are active
  React.useEffect(() => {
    if (isLoading || activeArticles.length === 0) return;

    console.log("📡 Starting live refresh for active articles");

    // Immediate first refresh
    refreshActiveArticles();

    // Set up interval for subsequent refreshes
    const id = setInterval(refreshActiveArticles, 3500);

    return () => {
      console.log("📡 Stopping live refresh");
      clearInterval(id);
    };
  }, [isLoading, activeArticles, refreshActiveArticles]);

  /* ----------------------------- Render ---------------------------------- */
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading articles...</div>
      </div>
    );
  }

  if (isFetchingArticle) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-sm text-muted-foreground">Fetching article...</div>
      </div>
    );
  }

  return (
    <>
      {activeArticles.length > 0 && (
        <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full" />
            Live monitoring {activeArticles.length} article{activeArticles.length !== 1 ? "s" : ""} in progress
          </div>
        </div>
      )}

      <ArticleDataTable articles={articles} isLoading={isLoadingMore} onArticleClick={handleArticleNavigation} onArticlesChanged={loadInitialArticles} />

      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {isLoadingMore ? <div className="text-sm text-muted-foreground">Loading more articles...</div> : <div className="text-sm text-muted-foreground">Scroll to load more</div>}
        </div>
      )}

      {!hasMore && articles.length > 0 && (
        <div className="flex justify-center py-8">
          <div className="text-sm text-muted-foreground">You&apos;ve reached the end of the articles</div>
        </div>
      )}

      {!hasMore && articles.length === 0 && !isLoading && (
        <div className="flex justify-center py-8">
          <div className="text-sm text-muted-foreground">No articles found</div>
        </div>
      )}
    </>
  );
}

/* ==========================================================================*/
// Ex

export { LibraryClient };
