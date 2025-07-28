"use client";

/* ==========================================================================*/
// article-content-panel.tsx — Left panel with loading state for version switching
/* ==========================================================================*/
// Purpose: Wrapper component that shows loading skeletons during version switching
// Sections: Imports, Component, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ---
import React from "react";

// Local Modules ---
import ArticleHeader from "./article-header";
import ArticleOutline from "./article-outline";
import ArticleContent from "./article-content";
import { useArticle } from "./article-context";
import { Skeleton } from "@/components/ui/skeleton";

/* ==========================================================================*/
// Main Component
/* ==========================================================================*/

/**
 * ArticleContentPanel
 *
 * Left panel content that shows loading state during version switching.
 * Displays skeleton loaders while content is updating between versions.
 */
function ArticleContentPanel() {
  const { isVersionSwitching } = useArticle();

  if (isVersionSwitching) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto px-6 pt-6 space-y-8">
          {/* Header Skeleton */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-48" />
              <div className="flex items-center space-x-3">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          
          {/* Outline Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          
          {/* Content Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-64 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-16" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-6 space-y-8">
        <ArticleHeader />
        <ArticleOutline />
        <ArticleContent />
      </div>
    </div>
  );
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/

export default ArticleContentPanel; 