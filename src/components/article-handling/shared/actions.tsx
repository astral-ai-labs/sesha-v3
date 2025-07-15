"use client";

/* ==========================================================================*/
// actions.tsx — Unified actions component for article workflows
/* ==========================================================================*/
// Purpose: Action buttons for article workflows (Add Source in multi mode, Go button)
// Sections: Imports, Component, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ---
import React from "react";

// shadcn/ui components ---
import { Button } from "@/components/ui/button";

// External Packages -----
import { Loader2, Plus } from "lucide-react";

// Local Files ---------------------------------------------------------------
import { useArticleHandler } from "./article-handler-context";
import { usePipelineSubmission } from "@/hooks/use-submission";

/* ==========================================================================*/
// Main Component
/* ==========================================================================*/

function ArticleActions() {
  // Import the Article Handler Context ----
  const { 
    basic, 
    preset, 
    sources, 
    metadata, 
    mode,
    canSubmit, 
    addSource, 
    canAddSource 
  } = useArticleHandler();
  
  // Use the unified pipeline submission hook ----
  const { triggerPipeline, isLoading } = usePipelineSubmission();

  const handleGoClick = async () => {
    // Debug logging to see what mode is being used
    console.log("🚀 handleGoClick - current mode:", mode);
    console.log("🚀 handleGoClick - sources count:", sources.length);
    
    // Build request data compatible with both modes
    const requestData = {
      slug: basic.slug,
      headline: basic.headline,
      sources: sources.map(source => ({
        description: source.usage.description,
        accredit: source.usage.accredit,
        sourceText: source.usage.sourceText,
        verbatim: source.usage.verbatim,
        primary: source.usage.primary,
        base: source.usage.base,
      })),
      instructions: {
        instructions: preset.instructions,
      },
      preset: {
        title: preset.title,
        blobs: preset.blobs,
        length: preset.length,
      },
      metadata: {
        currentVersion: metadata.currentVersion,
        orgId: metadata.orgId,
      },
    };

    console.log("🚀 handleGoClick - about to call triggerPipeline with mode:", mode);

    // Submit using the unified hook
    await triggerPipeline(requestData, mode);
  };

  const handleAddSource = () => {
    if (canAddSource) {
      addSource();
    }
  };

  // Render the component ----
  return (
    <div className="flex justify-between items-center pb-6">
      {/* Add Source Button - Only show in multi mode */}
      {mode === 'multi' && (
        <Button 
          onClick={handleAddSource} 
          disabled={!canAddSource} 
          variant="outline"
          className="disabled:opacity-50 disabled:cursor-default"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Source ({sources.length}/6)
        </Button>
      )}
      
      {/* Spacer for single mode to push Go button to the right */}
      {mode === 'single' && <div />}
      
      {/* Main Action Button */}
      <Button 
        onClick={handleGoClick} 
        disabled={!canSubmit || isLoading} 
        className="bg-blue-500 hover:bg-blue-600"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Go"
        )}
      </Button>
    </div>
  );
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/

export { ArticleActions }; 