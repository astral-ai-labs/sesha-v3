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
import { useEffect, useCallback } from "react";

// Lexical core ---
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { 
  $getRoot, 
  $createTextNode,
  TextNode,
  $isTextNode,
  ElementNode
} from "lexical";

// Types ---
import type { QuoteComparison } from "@/types/aggregate";

// Define interface for storing data on text nodes
interface TextNodeWithRipData {
  __data?: {
    'rip-source'?: string;
    'rip-analysis'?: string;
    'source-quote'?: string;
  };
}

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
  isEnabled
}: RipHighlightPluginProps) {
  const [editor] = useLexicalComposerContext();

  const splitAndHighlightNode = useCallback((
    node: TextNode,
    startIndex: number,
    endIndex: number,
    ripData: { sourceQuote: string; sourceNumber: number; ripAnalysis: string }
  ) => {
    const text = node.getTextContent();
    const beforeText = text.substring(0, startIndex);
    const highlightText = text.substring(startIndex, endIndex);
    const afterText = text.substring(endIndex);
    
    // Create new nodes
    const nodes: TextNode[] = [];
    
    if (beforeText) {
      const beforeNode = $createTextNode(beforeText);
      beforeNode.setStyle(node.getStyle());
      nodes.push(beforeNode);
    }
    
    if (highlightText) {
      const highlightNode = $createTextNode(highlightText);
      const originalStyle = node.getStyle();
      highlightNode.setStyle(`${originalStyle}background-color: rgba(255, 255, 0, 0.3);`);
      
      // Store rip data for tooltip
      const writableNode = highlightNode.getWritable() as TextNode & TextNodeWithRipData;
      writableNode.__data = writableNode.__data || {};
      writableNode.__data['rip-source'] = ripData.sourceNumber.toString();
      writableNode.__data['rip-analysis'] = ripData.ripAnalysis;
      writableNode.__data['source-quote'] = ripData.sourceQuote;
      
      nodes.push(highlightNode);
    }
    
    if (afterText) {
      const afterNode = $createTextNode(afterText);
      afterNode.setStyle(node.getStyle());
      nodes.push(afterNode);
    }
    
    // Replace the original node with the split nodes
    if (nodes.length > 0) {
      nodes.forEach((newNode, index) => {
        if (index === 0) {
          node.replace(newNode);
        } else {
          nodes[index - 1].insertAfter(newNode);
        }
      });
    }
  }, []);

  const highlightTextRange = useCallback((
    textNodes: Array<{ node: TextNode; text: string; startOffset: number }>,
    startPos: number,
    endPos: number,
    ripData: { sourceQuote: string; sourceNumber: number; ripAnalysis: string }
  ) => {
    let currentPos = 0;
    
    for (const { node, text } of textNodes) {
      const nodeStart = currentPos;
      const nodeEnd = currentPos + text.length;
      
      // Check if this node contains part of our target range
      if (nodeEnd > startPos && nodeStart < endPos) {
        // This node needs highlighting
        const highlightStart = Math.max(0, startPos - nodeStart);
        const highlightEnd = Math.min(text.length, endPos - nodeStart);
        
        if (highlightStart < highlightEnd) {
          // Split the node if necessary and apply highlighting
          if (highlightStart === 0 && highlightEnd === text.length) {
            // Highlight entire node
            node.setStyle(`background-color: rgba(255, 255, 0, 0.3);`);
            
            // Store rip data for tooltip
            const writableNode = node.getWritable() as TextNode & TextNodeWithRipData;
            writableNode.__data = writableNode.__data || {};
            writableNode.__data['rip-source'] = ripData.sourceNumber.toString();
            writableNode.__data['rip-analysis'] = ripData.ripAnalysis;
            writableNode.__data['source-quote'] = ripData.sourceQuote;
          } else {
            // Need to split the node
            splitAndHighlightNode(node, highlightStart, highlightEnd, ripData);
          }
        }
      }
      
      currentPos = nodeEnd + 1; // +1 for space between nodes
    }
  }, [splitAndHighlightNode]);

  const highlightExactTextMatch = useCallback((
    root: ReturnType<typeof $getRoot>,
    targetText: string,
    ripData: { sourceQuote: string; sourceNumber: number; ripAnalysis: string }
  ) => {
    const allTextNodes: Array<{ node: TextNode; text: string; startOffset: number }> = [];
    let globalOffset = 0;
    
    // First pass: collect all text nodes with their global positions
    root.getChildren().forEach((paragraph) => {
      if (paragraph instanceof ElementNode) {
        paragraph.getChildren().forEach((child) => {
          if ($isTextNode(child)) {
            const text = child.getTextContent();
            allTextNodes.push({
              node: child,
              text: text,
              startOffset: globalOffset
            });
            globalOffset += text.length + 1; // +1 for paragraph breaks
          }
        });
      }
    });
    
    // Create the full text content
    const fullText = allTextNodes.map(item => item.text).join(' ');
    const normalizedFullText = fullText.replace(/\s+/g, ' ').trim();
    
    // Find the exact position of our target text
    const matchIndex = normalizedFullText.indexOf(targetText);
    if (matchIndex === -1) {
      // Try fuzzy matching - look for substantial overlap
      const words = targetText.split(' ').filter(w => w.length > 2);
      if (words.length >= 3) {
        // Look for the longest sequence of consecutive words
        for (let len = words.length; len >= 3; len--) {
          for (let start = 0; start <= words.length - len; start++) {
            const sequence = words.slice(start, start + len).join(' ');
            const sequenceIndex = normalizedFullText.indexOf(sequence);
            if (sequenceIndex !== -1) {
              highlightTextRange(allTextNodes, sequenceIndex, sequenceIndex + sequence.length, ripData);
              return;
            }
          }
        }
      }
      return;
    }
    
    // Highlight the exact match
    highlightTextRange(allTextNodes, matchIndex, matchIndex + targetText.length, ripData);
  }, [highlightTextRange]);

  useEffect(() => {
    if (!isEnabled || ripComparisons.length === 0) {
      // Remove all rip highlights
      editor.update(() => {
        const root = $getRoot();
        
        // Find all nodes with rip highlighting and remove it
        root.getChildren().forEach((paragraph) => {
          if (paragraph instanceof ElementNode) {
            paragraph.getChildren().forEach((child) => {
              if ($isTextNode(child)) {
                const style = child.getStyle();
                if (style.includes('background-color: rgba(255, 255, 0, 0.3)')) {
                  // Remove the highlighting style
                  const newStyle = style.replace(/background-color:\s*rgba\(255,\s*255,\s*0,\s*0\.3\);?/g, '');
                  child.setStyle(newStyle);
                  
                  // Remove data attributes related to rip detection
                  const writableChild = child.getWritable() as TextNode & TextNodeWithRipData;
                  writableChild.__data = writableChild.__data || {};
                  delete writableChild.__data['rip-source'];
                  delete writableChild.__data['rip-analysis'];
                  delete writableChild.__data['source-quote'];
                }
              }
            });
          }
        });
      });
      return;
    }

    // Apply precise highlighting to detected rip text spans
    editor.update(() => {
      const root = $getRoot();
      
      ripComparisons.forEach((comparison) => {
        const { articleQuote, sourceQuote, sourceNumber, ripAnalysis } = comparison;
        
        // Normalize the quote text (same way as step 9 AI analysis)
        const normalizedQuote = articleQuote.replace(/\s+/g, ' ').trim();
        
        // Find exact matches for this quote in the editor
        highlightExactTextMatch(root, normalizedQuote, {
          sourceQuote,
          sourceNumber,
          ripAnalysis
        });
      });
    });
  }, [editor, isEnabled, ripComparisons, highlightExactTextMatch]);

  // This plugin doesn't render any UI - it just modifies the editor content
  return null;
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/

export default RipHighlightPlugin;
