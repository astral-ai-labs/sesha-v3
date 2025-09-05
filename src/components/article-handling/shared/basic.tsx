"use client";

/* ==========================================================================*/
// basic.tsx — Unified basic article form component
/* ==========================================================================*/
// Purpose: Form inputs for basic article information (slug, headline, instructions)
//          Works for both single-source (digest) and multi-source (aggregate) modes
// Sections: Imports, Props, Component, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ---
import React, { useState } from "react";

// shadcn/ui components ---
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// External Packages -----
import { Info, Loader2, Maximize2, Minimize2 } from "lucide-react";

// Local Files ---------------------------------------------------------------
import { useArticleHandler } from "./article-handler-context";
import { usePipelineSubmission } from "@/hooks/use-submission";

/* ==========================================================================*/
// Main Component
/* ==========================================================================*/

function BasicArticleInputs() {
  // Import the Article Handler Context ----
  const { basic, setBasic, preset, setPreset, sources, metadata, mode, canSubmit } = useArticleHandler();

  // Use the unified pipeline submission hook ----
  const { triggerPipeline, isLoading } = usePipelineSubmission();

  // Local state for expandable textarea
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);

  const handleInstructionsExpandToggle = () => setInstructionsExpanded((p) => !p);

  const handleHeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeadline = e.target.value;
    setBasic("headline", newHeadline);
    
    // Mark as manual when user types
    if (newHeadline.trim()) {
      setBasic("headlineSource", "manual");
    } else {
      setBasic("headlineSource", "ai");
    }
  };

  const handleSubmit = async () => {

    // Debug logging to see what mode is being used
    console.log("🚀 handleGoClick - current mode:", mode);
    console.log("🚀 handleGoClick - sources count:", sources.length);
    
        // Build request data compatible with both modes
    const requestData = {
      slug: basic.slug,
      headline: basic.headline,
      headlineSource: basic.headlineSource || 'ai',
      sources: sources.map((source) => ({
        description: source.usage.description,
        accredit: source.usage.accredit,
        sourceText: source.usage.sourceText,
        url: source.url, // Add URL field
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

    // Submit using the unified hook
    await triggerPipeline(requestData, mode);

  };

  // Render the component ----
  return (
    <div className="space-y-6 px-2">
      {/* Header --- */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">
          {mode === "single" ? "Digest Basic Info" : "Aggregator Basic Info"}
        </h2>
        <Button onClick={handleSubmit} disabled={!canSubmit || isLoading} className="bg-blue-500 hover:bg-blue-600">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Article...
            </>
          ) : (
            "Go"
          )}
        </Button>
      </div>

      {/* Slug Input --- */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="slug-input" className="text-sm font-medium">
            Slug <span className="text-xs text-red-600">required</span>
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
            </TooltipTrigger>
            <TooltipContent>
              <div>
                <p>
                  A unique, URL-friendly identifier for this {mode === "single" ? "digest" : "aggregator"}
                  (e.g., &quot;weekly-tech-news&quot;).
                </p>
                <p>Spaces become hyphens, all letters are lowercase, and only letters, numbers, and hyphens are allowed.</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
        <Input id="slug-input" value={basic.slug} onChange={(e) => setBasic("slug", e.target.value)} placeholder="Enter slug..." className={`w-full ${!basic.slug.trim() ? "border-red-500 focus:border-red-500" : ""}`} />
      </div>

      {/* Headline Input --- */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="headline-input" className="text-sm font-medium">
            Headline <span className="text-xs text-muted-foreground">optional</span>
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
            </TooltipTrigger>
            <TooltipContent>
              <p>The main title that will appear at the top of your {mode === "single" ? "digest" : "aggregated"} content</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Input id="headline-input" value={basic.headline} onChange={handleHeadlineChange} placeholder="Add a headline..." className="w-full" />
      </div>

      {/* Editor Instructions --- */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="editor-instructions" className="text-sm font-medium">
            Editor Instructions <span className="text-xs text-muted-foreground">optional</span>
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Instructions for the AI to follow when creating the article. This will save with other preset settings when you save a preset.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="relative">
          <Textarea id="editor-instructions" value={preset.instructions} onChange={(e) => setPreset("instructions", e.target.value)} placeholder="Enter editor instructions..." className={`w-full resize-none transition-all duration-200 ${instructionsExpanded ? "min-h-fit" : "min-h-[120px] max-h-[120px]"}`} style={instructionsExpanded ? { height: "auto", minHeight: "120px" } : {}} />
          <Button variant="ghost" size="sm" onClick={handleInstructionsExpandToggle} className="absolute top-2 right-2 h-6 w-6 p-0 bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer">
            {instructionsExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/

export { BasicArticleInputs };
