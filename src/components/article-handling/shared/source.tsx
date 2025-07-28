"use client";

/* ==========================================================================*/
// source.tsx — Unified source component with input and text area
/* ==========================================================================*/
// Purpose: Complete source input and text area component that works with unified context
//          Adapts to both single-source (digest) and multi-source (aggregate) modes
// Sections: Imports, Component, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ----------------------------------------------------------------
import React, { useState } from "react";

// shadcn/ui components ------------------------------------------------------
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// External Packages ---------------------------------------------------------
import { Info, Trash2, Maximize2, Minimize2, GripVertical } from "lucide-react";
import wordCount from "word-count";

// Context -------------------------------------------------------------------
import { useArticleHandler } from "./article-handler-context";

// Local Components ----------------------------------------------------------
import { VerbatimCheckbox } from "./verbatim-checkbox";

/* ==========================================================================*/
// Props Interface
/* ==========================================================================*/

interface SourceInputProps {
  sourceIndex: number;
}

/* ==========================================================================*/
// Main Component
/* ==========================================================================*/

function SourceInput({ sourceIndex }: SourceInputProps) {
  const { sources, mode, setSourceUrl, setSourceUsage, removeSource, reorderSources, canReorderSources } = useArticleHandler();
  
  // Move all hooks to the top before any conditional logic
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textExpanded, setTextExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragEnabled, setIsDragEnabled] = useState(false);
  
  const source = sources[sourceIndex];
  const canRemoveSource = mode === "multi" && sources.length > 1;


  if (!source) return null;

  /* ---------------------------- handlers -------------------------------- */
  const handleGetRawText = async () => {
    if (!source.url.trim()) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/get-source-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: source.url,
          options: {
            formats: ['markdown'],
            onlyMainContent: true,
          }
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch content');
      }

      const content = result.data || 'No content found';
      setSourceUsage(sourceIndex, "sourceText", content);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch raw text';
      setError(errorMessage);
      console.error('Error fetching raw text:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsageField = (field: keyof typeof source.usage, val: string | boolean) => 
    setSourceUsage(sourceIndex, field, val);

  const handleRemoveSource = () => {
    if (canRemoveSource) {
      removeSource(sourceIndex);
    }
  };

  // Text area handlers
  const handleTextChange = (val: string) => setSourceUsage(sourceIndex, "sourceText", val);
  const handleTextExpandToggle = () => setTextExpanded((p) => !p);

  // Drag and drop handlers - modified to only work when hovering over grip icon
  const handleDragStart = (e: React.DragEvent) => {
    if (!canReorderSources || !isDragEnabled) return;
    e.dataTransfer.setData("text/plain", sourceIndex.toString());
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOverIndex(null);
    setIsDragEnabled(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!canReorderSources) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(sourceIndex);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!canReorderSources) return;
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
    const toIndex = sourceIndex;
    
    if (fromIndex !== toIndex) {
      reorderSources(fromIndex, toIndex);
    }
    
    setDragOverIndex(null);
  };

  // Grip icon handlers
  const handleGripMouseEnter = () => {
    if (canReorderSources) {
      setIsDragEnabled(true);
    }
  };

  const handleGripMouseLeave = () => {
    setIsDragEnabled(false);
  };

  /**
   * handlePaste - Clean up pasted text
   */
  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    event.preventDefault();

    const pastedText = event.clipboardData.getData("text");
    const cleanedText = pastedText
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\r\n/g, "\n")
      .trim();

    const textarea = event.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = source.usage.sourceText;
    const newText = currentText.substring(0, start) + cleanedText + currentText.substring(end);

    handleTextChange(newText);

    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + cleanedText.length;
      textarea.focus();
    }, 0);
  };

  /* ------------------------------ helpers ------------------------------ */
  const canSubmitSource = source.url.trim() !== "";
  const wordCountValue = wordCount(source.usage.sourceText);
  const maxWords = 50_000;
  const isFirstSource = sourceIndex === 0;
  const isRequiredSource = mode === 'single' || isFirstSource; // First source always required, all sources required in single mode

  return (
    <div 
      className={`space-y-6 border border-border/50 rounded-md p-6 bg-muted/5 transition-all duration-200 ${
        isDragging ? "opacity-50" : ""
      } ${
        dragOverIndex === sourceIndex ? "ring-2 ring-blue-500 ring-offset-2" : ""
      }`}
      draggable={isDragEnabled && canReorderSources}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header --- */}
      {mode === 'multi' && (
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-foreground">
            {`Source ${sourceIndex + 1}`}
            {isRequiredSource && <span className="text-xs text-red-600 ml-2">required</span>}
          </h3>
          {canReorderSources && (
            <div className="flex items-center gap-2">
              <div 
                className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors"
                title="Drag to reorder sources"
                onMouseEnter={handleGripMouseEnter}
                onMouseLeave={handleGripMouseLeave}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Source Input Section --- */}
      <div className="space-y-4">
        {/* First Row: Source Input and Get Raw Text Button --- */}
        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={`source-input-${sourceIndex}`} className="text-sm font-medium">
                Input Source
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enter text content, file path, or URL link as your source</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input 
              id={`source-input-${sourceIndex}`} 
              placeholder="Text / File / Link" 
              className="w-full" 
              value={source.url} 
              onChange={(e) => setSourceUrl(sourceIndex, e.target.value)} 
            />
          </div>
          <div className="flex items-end">
            <Button 
              className="disabled:opacity-50 disabled:cursor-default bg-blue-500 hover:bg-blue-600" 
              onClick={handleGetRawText} 
              disabled={!canSubmitSource || isLoading}
            >
              {isLoading ? 'Getting Text...' : 'INPUT'}
            </Button>
          </div>
        </div>

        {/* Error display --- */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
            {error}
          </div>
        )}

        {/* Source Details Row --- */}
        <div className="flex gap-4">
          {/* Left: Source Description Textarea --- */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={`source-description-input-${sourceIndex}`} className="text-sm font-medium">
                Source Description <span className="text-xs text-muted-foreground">optional</span>
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Brief description of what this source contains or represents</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Textarea 
              id={`source-description-input-${sourceIndex}`} 
              placeholder="Enter description..." 
              className="w-full resize-none min-h-[150px]" 
              value={source.usage.description} 
              onChange={(e) => handleUsageField("description", e.target.value)} 
            />
          </div>

          {/* Right: Accreditation and Checkboxes --- */}
          <div className="flex-1 space-y-4">
            {/* Accreditation --- */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor={`accreditation-input-${sourceIndex}`} className="text-sm font-medium">
                  Accreditation <span className="text-xs text-muted-foreground">optional</span>
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Credit or attribution for this source (e.g., author, publication)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input 
                id={`accreditation-input-${sourceIndex}`} 
                placeholder="Enter accreditation..." 
                className="w-full" 
                value={source.usage.accredit} 
                onChange={(e) => handleUsageField("accredit", e.target.value)} 
              />
            </div>

            {/* Checkboxes --- */}
            <div className="space-y-4">
              {/* Primary Source Checkbox - Show for ALL sources and ALWAYS active */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  className="cursor-pointer"
                  id={`primary-source-${sourceIndex}`} 
                  checked={source.usage.primary} 
                  onCheckedChange={(checked) => handleUsageField("primary", checked)} 
                />
                <div className="flex items-center gap-2">
                  <Label htmlFor={`primary-source-${sourceIndex}`} className="text-sm font-medium cursor-pointer">
                    Primary Source
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Mark this as a primary source for the {mode === 'single' ? 'digest' : 'aggregator'}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Base Source Checkbox - Only show in multi mode */}
              {mode === 'multi' && (
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    className={`cursor-pointer ${sourceIndex !== 0 ? 'opacity-50' : ''}`}
                    id={`base-source-${sourceIndex}`} 
                    checked={source.usage.base} 
                    onCheckedChange={(checked) => {
                      // Only allow base source for the first source (index 0)
                      if (sourceIndex === 0) {
                        handleUsageField("base", checked);
                      }
                    }}
                    disabled={sourceIndex !== 0}
                  />
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`base-source-${sourceIndex}`} className={`text-sm font-medium cursor-pointer ${sourceIndex !== 0 ? 'opacity-50' : ''}`}>
                      Base Source
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{sourceIndex === 0 ? "Mark this as the base source for the aggregation" : "Only the first source can be marked as base source"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )}

              {/* Verbatim Checkbox - Show for ALL sources but adapt based on mode */}
              <VerbatimCheckbox sourceIndex={sourceIndex} />
            </div>
          </div>
        </div>
      </div>

      {/* Text from Source Section --- */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-md font-semibold">
            Text from Source
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Raw text content extracted or pasted from this source.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Textarea */}
        <div className="relative">
          <Textarea 
            id={`source-text-${sourceIndex}`} 
            value={source.usage.sourceText} 
            onChange={(e) => handleTextChange(e.target.value)} 
            onPaste={handlePaste} 
            placeholder={`Paste or enter source text here...`} 
            className={`w-full resize-none transition-all duration-200 ${
              textExpanded ? "min-h-fit" : "min-h-[200px] max-h-[200px]"
            } ${
              isRequiredSource && !source.usage.sourceText.trim() 
                ? "border-red-500 focus:border-red-500" 
                : ""
            }`} 
            style={textExpanded ? { height: "auto", minHeight: "200px" } : {}} 
          />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleTextExpandToggle} 
            className="absolute top-2 right-2 h-6 w-6 p-0 bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer"
          >
            {textExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
        </div>

        {/* Word Count and Delete Button */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {wordCountValue.toLocaleString()}/{maxWords.toLocaleString()} words
          </span>
          {mode === 'multi' && !isFirstSource && canRemoveSource && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRemoveSource}
              className="text-red-600 hover:text-red-800 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Source
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================*/
// Container Component for All Sources
/* ==========================================================================*/

function SourceInputs() {
  const { sources } = useArticleHandler();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">
        Source Information
      </h2>
      <div className="space-y-4">
        {sources.map((source, index) => (
          <SourceInput key={source.id} sourceIndex={index} />
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/

export { SourceInputs }; 