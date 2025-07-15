"use client";

/* ==========================================================================*/
// article-content.tsx — Article content display and editing component
/* ==========================================================================*/
// Purpose: Display and edit the main article content with expand/minimize
//          functionality, word counter, and save capabilities.
// Sections: Imports, Helper Functions, Component, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ----------------------------------------------------------------
import React, { useState, useTransition } from "react";

// shadcn/ui components ------------------------------------------------------
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

// Icons ---------------------------------------------------------------------
import { Info, Loader2 } from "lucide-react";

// External Packages ---------------------------------------------------------
import wordCount from "word-count";

// Types ---------------------------------------------------------------------
import { SerializedEditorState } from "lexical";

// Context -------------------------------------------------------------------
import { useArticle } from "./article-context";

// Local Modules -------------------------------------------------------------
import { createNewVersionAction } from "@/actions/article";
import TextEditor from "../text-editor/TextEditor";

/* ==========================================================================*/
// Helper Functions
/* ==========================================================================*/

// None needed - keeping it simple!

/* ==========================================================================*/
// Main Component
/* ==========================================================================*/

/**
 * ArticleContent
 *
 * Simple component that displays article content in a textarea.
 */
function ArticleContent() {
  const { currentArticle, setCurrentVersion, hasChanges, updateCurrentArticle } = useArticle();
  // const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Get content directly from the content field
  const content = currentArticle?.content || '';
  const richContent = currentArticle?.richContent;
  
  const wordCountValue = wordCount(content);
  const maxWords = 50_000;

  // const handleExpandToggle = () => setExpanded((p) => !p);

  const handleContentChange = (newContent: string) => {
    if (currentArticle) {
      updateCurrentArticle({ content: newContent });
    }
  };

  const handleRichTextChange = (editorState: SerializedEditorState) => {
    if (currentArticle) {
      updateCurrentArticle({ 
        richContent: JSON.stringify(editorState)
      });
    }
  };

  const handleSave = () => {
    if (!currentArticle) {
      toast.error("No article to save");
      return;
    }

    if (!hasChanges) {
      toast.error("No changes to save");
      return;
    }

    console.log("💾 Save button clicked with:", {
      articleId: currentArticle.id,
      headline: currentArticle.headline,
      blob: currentArticle.blob,
      hasChanges
    });

    startTransition(async () => {
      try {
        const updateData = {
          headline: currentArticle.headline,
          blob: currentArticle.blob,
          content: currentArticle.content,
          richContent: currentArticle.richContent,
          status: "completed" as const
        };
        
        console.log("📤 Calling createNewVersionAction with:", {
          currentArticle,
          updateData
        });
        
        const result = await createNewVersionAction(currentArticle, updateData);

        console.log("📥 Server action result:", result);

        if (result.success) {
          setCurrentVersion(result.article?.version ?? currentArticle.version + 1);
          toast.success("New version created successfully");
          // No need to handle success further since the action redirects
        } else {
          console.log(result.error);
          toast.error("Failed to create new version");
        }
      } catch (error) {
        console.error("❌ Client error:", error);
        toast.error("An unexpected error occurred");
      }
    });
  };

  const parsedRichContent = richContent ? JSON.parse(richContent) : undefined;

  /* -------------------------------- UI --------------------------------- */
  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-lg font-semibold">Article Content</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Article content from the pipeline.</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Content Display */}
      <div className="relative">
        <TextEditor
          initialContent={parsedRichContent}
          content={!parsedRichContent ? content : undefined}
          onChange={(newContent) => handleContentChange(newContent)}
          onRichTextChange={handleRichTextChange}
          placeholder="No content available."
        />
        {/* <Textarea
          id="article-content"
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="No content available."
          className={`w-full resize-none transition-all duration-200 ${
            expanded ? "min-h-fit" : "min-h-[400px] max-h-[400px]"
          }`}
          style={expanded ? { height: 'auto', minHeight: '400px' } : {}}
        /> */}
        {/* <Button
          variant="ghost"
          size="sm"
          onClick={handleExpandToggle}
          className="absolute top-2 right-2 h-6 w-6 p-0 bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer"
        >
          {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </Button> */}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <span className="text-sm text-muted-foreground flex items-center">
          {wordCountValue.toLocaleString()}/{maxWords.toLocaleString()} words
        </span>
        <Button 
          className="bg-blue-500 hover:bg-blue-600 cursor-pointer text-white"
          onClick={handleSave}
          disabled={isPending || !hasChanges}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </div>
  );
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/

export default ArticleContent; 