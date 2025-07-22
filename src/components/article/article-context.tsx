"use client";

/* ==========================================================================*/
// article-context.tsx — React context for Article display and version management
/* ==========================================================================*/
// Purpose: Centralised store + helpers (useArticle) for coordinating article
//          display with version switching and article data management.
// Sections: Imports, Types, Context, Provider, Hook, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Article } from "@/db/schema";
import { ArticleVersionMetadata } from "@/db/dal";

/* ==========================================================================*/
// Types
/* ==========================================================================*/

// Extended article type with user information
type ArticleWithCreator = Article & { createdByName: string };

interface ArticleContextValue {
  // All article versions (full data with creator info)
  articles: ArticleWithCreator[];
  currentArticle: ArticleWithCreator | null;
  currentVersion: string; // Changed to string to support decimal versions like "3.01"
  
  // Version metadata for sidebar (computed from articles)
  versionMetadata: ArticleVersionMetadata[];
  
  // Actions
  setCurrentVersion: (version: string) => void; // Changed to string
  updateCurrentArticle: (updates: Partial<Article>) => void;
  
  // Computed values
  slug: string;
  headline: string;
  lastModified: Date | null;
  createdByName: string;
  blobOutline: string;
  
  // Change tracking
  hasChanges: boolean;
  originalArticle: ArticleWithCreator | null;
  
  // Loading state
  isVersionSwitching: boolean;
  
  // Full current article for creating new versions
  getCurrentArticleForNewVersion: () => ArticleWithCreator | null;
}

/* ==========================================================================*/
// Context
/* ==========================================================================*/

const ArticleContext = createContext<ArticleContextValue | undefined>(undefined);

/* ==========================================================================*/
// Provider
/* ==========================================================================*/

interface ArticleProviderProps {
  children: ReactNode;
  articles: ArticleWithCreator[]; // Updated to use extended type
  initialVersionDecimal?: string; // Primary decimal version (e.g., "3.01")
}

/**
 * ArticleProvider
 *
 * Provides article data and version management state to child components.
 * Handles version switching and computed values like blob outline formatting.
 * Tracks changes to enable/disable save functionality.
 * Stores full Article objects for creating new versions.
 */
function ArticleProvider({ children, articles, initialVersionDecimal }: ArticleProviderProps) {
  // Debug logging
  console.log("🔍 ArticleProvider received articles:", articles.map(a => ({
    id: a.id,
    version: a.version,
    versionDecimal: a.versionDecimal,
    content: a.content,
    richContent: a.richContent,
    contentLength: a.content?.length,
    contentType: typeof a.content
  })));

  // Get the initial decimal version (default to highest decimal version if not specified)
  const defaultVersionDecimal = initialVersionDecimal || (articles.length > 0 ? 
    articles.sort((a, b) => parseFloat(b.versionDecimal) - parseFloat(a.versionDecimal))[0].versionDecimal : 
    "1.00"
  );
  
  console.log("🎯 ArticleProvider initialVersionDecimal:", initialVersionDecimal, "defaultVersionDecimal:", defaultVersionDecimal);
  
  const [currentVersion, setCurrentVersion] = useState(defaultVersionDecimal);
  
  // Loading state for version switching
  const [isVersionSwitching, setIsVersionSwitching] = useState(false);
  
  // Get the original article based on current version (this updates when version changes)
  const originalArticle = React.useMemo(() => {
    const article = articles.find(article => article.versionDecimal === currentVersion) || articles[0] || null;
    console.log("🔄 originalArticle updated for version:", currentVersion, "found:", article?.id);
    return article;
  }, [currentVersion, articles]);
  
  // Track the current working copy - initialize with original article
  const [currentArticle, setCurrentArticle] = useState<ArticleWithCreator | null>(originalArticle);
  
  // Update current article when version changes OR when initialVersionDecimal changes
  React.useEffect(() => {
    console.log("🔄 Version change effect - currentVersion:", currentVersion, "initialVersionDecimal:", initialVersionDecimal);
    
    const newArticle = articles.find(article => article.versionDecimal === currentVersion) || articles[0] || null;
    console.log("🔄 Setting new article:", newArticle?.id, "versionDecimal:", newArticle?.versionDecimal);
    setCurrentArticle(newArticle);
    
    // Clear loading state when content has actually updated
    if (isVersionSwitching && newArticle) {
      const timer = setTimeout(() => {
        setIsVersionSwitching(false);
      }, 500); // Longer delay to ensure TextEditor and all content renders
      
      return () => clearTimeout(timer);
    }
  }, [currentVersion, articles, isVersionSwitching, initialVersionDecimal]);
  
  // Update currentVersion when initialVersionDecimal changes (URL navigation)
  React.useEffect(() => {
    if (initialVersionDecimal && initialVersionDecimal !== currentVersion) {
      console.log("🌐 URL version change detected:", initialVersionDecimal, "current:", currentVersion);
      // Only update version, don't set loading since this is URL sync
      setCurrentVersion(initialVersionDecimal);
    }
  }, [initialVersionDecimal, currentVersion]);
  
  // Enhanced setCurrentVersion function to include loading state
  const handleSetCurrentVersion = (version: string) => {
    if (version !== currentVersion) {
      // Immediately update version for UI responsiveness
      setCurrentVersion(version);
      
      // Then set loading state
      setIsVersionSwitching(true);
    }
  };
  
  // Generate version metadata for the sidebar from full articles
  const versionMetadata: ArticleVersionMetadata[] = articles.map(article => ({
    version: article.version,
    versionDecimal: article.versionDecimal,
    slug: article.slug,
    headline: article.headline,
    createdAt: article.createdAt,
    blobOutline: article.blob,
  }));
  
  // Update current article with changes
  const updateCurrentArticle = (updates: Partial<Article>) => {
    console.log("🔄 updateCurrentArticle called with:", {
      headline: updates.headline,
      blob: updates.blob,
      content: updates.content ? `${updates.content.substring(0, 50)}...`: undefined,
      richContent: updates.richContent ? "Has rich content" : undefined,
      status: updates.status
    });
    if (currentArticle) {
      const newArticle = { ...currentArticle, ...updates };
      console.log("📝 Setting new article:", {
        old: { 
          headline: currentArticle.headline, 
          blob: currentArticle.blob,
          contentLength: currentArticle.content?.length,
          richContentLength: currentArticle.richContent?.length 
        },
        new: { 
          headline: newArticle.headline, 
          blob: newArticle.blob,
          contentLength: newArticle.content?.length,
          richContentLength: newArticle.richContent?.length
        }
      });
      setCurrentArticle(newArticle);
    }
  };
  
  // Get current article with all data for creating new versions
  const getCurrentArticleForNewVersion = (): ArticleWithCreator | null => {
    return currentArticle;
  };
  
  // Computed values
  const slug = currentArticle?.slug || '';
  const headline = currentArticle?.headline || '';
  const lastModified = currentArticle?.updatedAt || null;
  const createdByName = currentArticle?.createdByName || 'Unknown';
  
  // Format blob outline as bullet list
  const blobOutline = currentArticle?.blob 
    ? currentArticle.blob.split('\n').map(blob => `• ${blob}`).join('\n\n')
    : '';
  
  // Check if there are changes from the original
  const hasChanges = originalArticle && currentArticle ? (
    originalArticle.headline !== currentArticle.headline ||
    originalArticle.blob !== currentArticle.blob ||
    originalArticle.content !== currentArticle.content ||
    originalArticle.richContent !== currentArticle.richContent ||
    originalArticle.status !== currentArticle.status
  ) : false;
  
  console.log("🔍 Change detection:", {
    hasChanges,
    original: originalArticle ? { 
      headline: originalArticle.headline, 
      blob: originalArticle.blob,
      content: originalArticle.content?.substring(0, 50),
      richContent: originalArticle.richContent ? "Has rich content" : "No rich content",
      status: originalArticle.status
    } : null,
    current: currentArticle ? { 
      headline: currentArticle.headline, 
      blob: currentArticle.blob,
      content: currentArticle.content?.substring(0, 50),
      richContent: currentArticle.richContent ? "Has rich content" : "No rich content",
      status: currentArticle.status
    } : null,
    fieldChanges: originalArticle && currentArticle ?{
      headlineChanged: originalArticle.headline !== currentArticle.headline,
      blobChanged: originalArticle.blob !== currentArticle.blob,
      contentChanged: originalArticle.content !== currentArticle.content,
      richContentChanged: originalArticle.richContent !== currentArticle.richContent,
      statusChanged: originalArticle.status !== currentArticle.status
    } : null
  });
  
  const value: ArticleContextValue = {
    articles,
    currentArticle,
    currentVersion,
    versionMetadata,
    setCurrentVersion: handleSetCurrentVersion,
    updateCurrentArticle,
    slug,
    headline,
    lastModified,
    createdByName,
    blobOutline,
    hasChanges,
    originalArticle,
    getCurrentArticleForNewVersion,
    isVersionSwitching,
  };
  
  return (
    <ArticleContext.Provider value={value}>
      {children}
    </ArticleContext.Provider>
  );
}

/* ==========================================================================*/
// Hook
/* ==========================================================================*/

/**
 * useArticle
 *
 * Hook to access article context data and actions.
 * Must be used within an ArticleProvider.
 */
function useArticle(): ArticleContextValue {
  const context = useContext(ArticleContext);
  if (!context) {
    throw new Error('useArticle must be used within an ArticleProvider');
  }
  return context;
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/

export { ArticleProvider, useArticle };
export type { ArticleContextValue }; 