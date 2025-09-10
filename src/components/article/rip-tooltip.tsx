"use client";

/* ==========================================================================*/
// rip-tooltip.tsx — Tooltip component for rip detection highlights
/* ==========================================================================*/
// Purpose: Display source information when hovering over highlighted rip text
// Sections: Imports, Types, Component, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ---
import React, { useEffect, useState } from "react";

// UI Components ---
import { TooltipProvider } from "@/components/ui/tooltip";

/* ==========================================================================*/
// Types
/* ==========================================================================*/

interface RipTooltipData {
  sourceNumber: string;
  sourceName: string;
  sourceQuote: string;
  ripAnalysis: string;
}

interface RipTooltipManagerProps {
  isEnabled: boolean;
  ripComparisons: Array<{
    articleQuote: string;
    sourceQuote: string;
    sourceNumber: number;
    ripAnalysis: string;
  }>;
}

/* ==========================================================================*/
// Component
/* ==========================================================================*/

/**
 * RipTooltipManager
 *
 * Manages tooltip functionality for rip detection highlights.
 * Attaches event listeners to highlighted text and shows tooltips on hover.
 */
export function RipTooltipManager({ isEnabled, ripComparisons }: RipTooltipManagerProps) {
  const [tooltipData, setTooltipData] = useState<RipTooltipData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (!isEnabled) {
      setShowTooltip(false);
      return;
    }

    const handleMouseEnter = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if the target has the highlighting background color
      const isHighlighted = target.style?.backgroundColor === 'rgba(255, 255, 0, 0.3)';
      
      if (isHighlighted && ripComparisons.length > 0) {
        // Try to match the hovered text to the correct rip comparison
        const hoveredText = target.textContent || '';
        const normalizedHoveredText = hoveredText.replace(/\s+/g, ' ').trim();
        
        // Find the rip comparison that best matches this text
        let matchingRip = ripComparisons[0]; // fallback to first
        
        for (const rip of ripComparisons) {
          const normalizedArticleQuote = rip.articleQuote.replace(/\s+/g, ' ').trim();
          
          // Check if the hovered text contains part of this rip's article quote
          if (normalizedHoveredText.length > 10 && normalizedArticleQuote.includes(normalizedHoveredText)) {
            matchingRip = rip;
            break;
          }
          
          // Or if this rip's quote contains the hovered text
          if (normalizedArticleQuote.length > 10 && normalizedHoveredText.includes(normalizedArticleQuote)) {
            matchingRip = rip;
            break;
          }
        }
        
        setTooltipData({
          sourceNumber: matchingRip.sourceNumber.toString(),
          sourceName: `Source ${matchingRip.sourceNumber}`,
          sourceQuote: matchingRip.sourceQuote,
          ripAnalysis: matchingRip.ripAnalysis
        });
        
        // Position tooltip near the mouse
        const rect = target.getBoundingClientRect();
        setTooltipPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });
        
        setShowTooltip(true);
      }
    };

    const handleMouseLeave = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Hide tooltip when leaving highlighted element
      const isHighlighted = target.style?.backgroundColor === 'rgba(255, 255, 0, 0.3)';
      if (isHighlighted) {
        setShowTooltip(false);
        setTooltipData(null);
      }
    };

    // Add event listeners to the document
    document.addEventListener('mouseenter', handleMouseEnter, true);
    document.addEventListener('mouseleave', handleMouseLeave, true);

    return () => {
      document.removeEventListener('mouseenter', handleMouseEnter, true);
      document.removeEventListener('mouseleave', handleMouseLeave, true);
      setShowTooltip(false);
      setTooltipData(null);
    };
  }, [isEnabled, ripComparisons]);

  if (!showTooltip || !tooltipData) {
    return null;
  }

  return (
    <TooltipProvider>
      <div
        style={{
          position: 'fixed',
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          transform: 'translate(-50%, -100%)',
          zIndex: 9999,
          pointerEvents: 'none'
        }}
      >
        <div className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-xs max-w-sm shadow-lg">
          <div className="font-semibold mb-1">
            Source {tooltipData.sourceNumber}
          </div>
          <div className="mb-2 italic">
            &ldquo;{tooltipData.sourceQuote}&rdquo;
          </div>
          <div className="text-xs opacity-90">
            {tooltipData.ripAnalysis}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

/**
 * RipTooltipContent
 *
 * Reusable tooltip content component for rip detection data.
 */
export function RipTooltipContent({
  sourceNumber,
  sourceQuote,
  ripAnalysis
}: RipTooltipData) {
  return (
    <div className="max-w-sm">
      <div className="font-semibold mb-1">
        Source {sourceNumber}
      </div>
      <div className="mb-2 italic text-xs">
        &ldquo;{sourceQuote}&rdquo;
      </div>
      <div className="text-xs opacity-90">
        {ripAnalysis}
      </div>
    </div>
  );
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/

export default RipTooltipManager;
