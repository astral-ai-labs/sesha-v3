"use client";

/* ==========================================================================*/
// rip-highlight-plugin.tsx — Rip detection highlighting plugin for Lexical editor
/* ==========================================================================*/
// Purpose: Apply yellow highlighting to detected plagiarism text spans with tooltip data
// Sections: Imports, Types, Component, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ---
import React, { useEffect } from "react";

// Lexical core ---
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { 
  $getRoot, 
  $getSelection, 
  $isRangeSelection,
  $createTextNode,
  TextNode,
  $isTextNode,
  $setSelection,
  $createRangeSelection
} from "lexical";

// Types ---
import type { QuoteComparison } from "@/types/aggregate";

/* ==========================================================================*/
// Types
/* ==========================================================================*/

interface RipHighlightPluginProps {
  ripComparisons: QuoteComparison[];
  isEnabled: boolean;
  sourceNames: Record<number, string>; // Map source numbers to names
}

/* ==========================================================================*/
// Component
/* ==========================================================================*/

/**
 * RipHighlightPlugin
 *
 * Lexical plugin that applies yellow highlighting to text spans identified as potential rips.
 * Only highlights when enabled and rip data is available.
 */
export function RipHighlightPlugin({
  ripComparisons,
  isEnabled,
  sourceNames
}: RipHighlightPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!isEnabled || ripComparisons.length === 0) {
      // Remove all rip highlights
      editor.update(() => {
        const root = $getRoot();
        
        // Find all nodes with rip highlighting and remove it
        root.getChildren().forEach((paragraph) => {
          paragraph.getChildren().forEach((child) => {
            if ($isTextNode(child)) {
              const style = child.getStyle();
              if (style.includes('background-color: rgba(255, 255, 0, 0.3)')) {
                // Remove the highlighting style
                const newStyle = style.replace(/background-color:\s*rgba\(255,\s*255,\s*0,\s*0\.3\);?/g, '');
                child.setStyle(newStyle);
                
                // Remove data attributes related to rip detection
                child.getWritable().__data = child.getWritable().__data || {};
                delete child.getWritable().__data['rip-source'];
                delete child.getWritable().__data['rip-analysis'];
                delete child.getWritable().__data['source-quote'];
              }
            }
          });
        });
      });
      return;
    }

    // Apply highlighting to detected rip text spans
    editor.update(() => {
      const root = $getRoot();
      const textContent = root.getTextContent();

      ripComparisons.forEach((comparison) => {
        const { articleQuote, sourceQuote, sourceNumber, ripAnalysis } = comparison;
        
        // Normalize both texts the same way the AI analysis did
        const normalizedContent = textContent.replace(/\s+/g, ' ').trim();
        const normalizedQuote = articleQuote.replace(/\s+/g, ' ').trim();
        
        // Break the quote into words and look for word sequences
        const quoteWords = normalizedQuote.split(' ').filter(word => word.length > 2);
        
        // Apply highlighting to text nodes that contain parts of the rip text
        root.getChildren().forEach((paragraph) => {
          paragraph.getChildren().forEach((child) => {
            if ($isTextNode(child)) {
              const nodeText = child.getTextContent();
              const normalizedNodeText = nodeText.replace(/\s+/g, ' ').trim();
              
              // Check if this node contains a sequence of words from our quote
              let shouldHighlight = false;
              
              // Try to find at least 3 consecutive words from the quote in this node
              for (let i = 0; i <= quoteWords.length - 3; i++) {
                const wordSequence = quoteWords.slice(i, i + 3).join(' ');
                if (normalizedNodeText.includes(wordSequence)) {
                  shouldHighlight = true;
                  break;
                }
              }
              
              if (shouldHighlight) {
                // Apply highlighting to this entire node
                child.setStyle(`background-color: rgba(255, 255, 0, 0.3);`);
              }
            }
          });
        });
      });
    });
  }, [editor, isEnabled, ripComparisons.length]);


  // This plugin doesn't render any UI - it just modifies the editor content
  return null;
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/

export default RipHighlightPlugin;
