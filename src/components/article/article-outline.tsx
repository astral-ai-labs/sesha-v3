"use client";

/* ==========================================================================*/
// article-outline.tsx — Article outline form component
/* ==========================================================================*/
// Purpose: Form inputs for article outline (manual headline and blob output)
// Sections: Imports, Component, Exports

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
import { Info, Maximize2, Minimize2 } from "lucide-react";

// Local Modules ---
import { useArticle } from "./article-context";

/* ==========================================================================*/
// Component
/* ==========================================================================*/

/**
 * ArticleOutline
 *
 * Article outline component with manual headline input and expandable blob output textarea.
 * Uses article context for data access and updates the context when changes are made.
 */
function ArticleOutline() {
  const { headline, blobOutline, updateCurrentArticle } = useArticle();
  
  const [manualHeadline, setManualHeadline] = useState(headline);
  const [blobOutput, setBlobOutput] = useState(blobOutline);
  const [isExpanded, setIsExpanded] = useState(false);

  /* ==========================================================================*/
  // Event Handlers
  /* ==========================================================================*/

  const handleExpandToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleHeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeadline = e.target.value;
    setManualHeadline(newHeadline);
    
    // Update the context to track changes and mark as manual
    updateCurrentArticle({ 
      headline: newHeadline,
      headlineSource: 'manual' // Mark as manual when user edits
    });
  };

  const handleBlobChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newBlobOutput = e.target.value;
    setBlobOutput(newBlobOutput);
    
    // Convert bullet list back to newline-separated format for storage
    const blobForStorage = newBlobOutput
      .split('\n')
      .map(line => line.replace(/^•\s*/, ''))
      .filter(line => line.trim() !== '')
      .join('\n');
    
    // Update the context to track changes
    updateCurrentArticle({ blob: blobForStorage });
  };

  // Update local state when context changes (version switching)
  React.useEffect(() => {
    setManualHeadline(headline);
    setBlobOutput(blobOutline);
  }, [headline, blobOutline]);

  return (
    <div className="space-y-4">
      {/* Header --- */}
      <h2 className="text-lg font-semibold text-foreground">Article Outline</h2>

      {/* Manual Headline Input --- */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="manual-headline-input" className="text-sm font-medium">
            Manual Headline
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Override the generated headline with a custom one</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Input
          id="manual-headline-input"
          value={manualHeadline}
          onChange={handleHeadlineChange}
          placeholder="Enter manual headline..."
          className="w-full !text-base font-bold"
        />
      </div>

      {/* Blob Output Text Area --- */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="blob-output" className="text-sm font-medium">
            Blob Output
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Generated article content and structure output</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="relative">
          <Textarea
            id="blob-output"
            value={blobOutput}
            onChange={handleBlobChange}
            placeholder="Generated blob output will appear here..."
            className={`w-full resize-none transition-all duration-200 !text-base font-bold ${
              isExpanded ? "min-h-[200px]" : "min-h-[100px]"
            }`}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExpandToggle}
            className="absolute top-2 right-2 h-6 w-6 p-0 bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/

export default ArticleOutline;