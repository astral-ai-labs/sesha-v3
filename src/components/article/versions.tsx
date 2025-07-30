"use client";

// * ==========================================================================*/
// versions.tsx — Article version history components
/* ==========================================================================*/
// Purpose: Display article version history with cards and navigation to digest
// Sections: Imports, Types, Components, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ---
import React from "react";

// Next.js ---
import Link from "next/link";
import { useRouter } from "next/navigation";

// Lucide Icons ---
import { ChevronsLeft, ChevronsRight } from "lucide-react";

// Shadcn UI ---
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

// Local Modules ---
import { useArticle } from "./article-context";
import { Separator } from "@/components/ui/separator";

/* ==========================================================================*/
// Types and Interfaces
/* ==========================================================================*/

interface VersionCardProps {
  versionDecimal: string; // primary decimal version 
  headline: string | null;
  blobOutline: string;
  createdAt: Date;
  isActive: boolean;
  onClick: () => void;
}

interface VersionsProps {
  isCollapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
  panelSize: number;
}

/* ==========================================================================*/
// Helper Components
/* ==========================================================================*/

interface VersionTooltipProps {
  headline: string | null;
  blobOutline: string;
  children: React.ReactNode;
}

/** Reusable tooltip for version cards displaying headline and blob outline */
function VersionTooltip({ headline, blobOutline, children }: VersionTooltipProps) {
  // Format blob outline into bullet points
  const formatBlobOutline = (outline: string) => {
    if (!outline) return [];

    // Split by common delimiters and filter out empty lines
    const points = outline
      .split(/[•\n\r]+/)
      .map((point) => point.trim())
      .filter((point) => point.length > 0);

    return points;
  };

  const blobPoints = formatBlobOutline(blobOutline);

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="max-w-lg bg-card text-foreground border border-gray-200 shadow-lg py-4 px-8">
        <div className="space-y-2">
          {headline && (
            <div>
              <p className="font-medium mb-1 text-sm">Headline:</p>
              <p className="text-gray-700 text-sm">{headline}</p>
            </div>
          )}

          {blobPoints.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="font-medium mb-2 text-sm">Blob Outline:</p>
                <ul className="space-y-1.5">
                  {blobPoints.map((point, index) => (
                    <li key={index} className="text-gray-700 flex items-start text-sm">
                      <span className="mr-2 mt-2 h-1 w-1 bg-gray-500 rounded-full flex-shrink-0"></span>
                      <span className="whitespace-normal break-words">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/* ==========================================================================*/
// Components
/* ==========================================================================*/

/**
 * VersionCard
 *
 * Displays individual version information with version number, headline, and timestamp.
 * Shows active state for current version and handles click to switch versions.
 */
function VersionCard({ versionDecimal, headline, blobOutline, createdAt, isActive, onClick, showDate = true }: VersionCardProps & { showDate?: boolean }) {
  const formattedDate = createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <VersionTooltip headline={headline} blobOutline={blobOutline}>
      <div className={`group p-4 border rounded-lg bg-card hover:bg-accent cursor-pointer transition-colors duration-200 border-l-4 ${isActive ? "border-l-blue-500 bg-accent" : "border-l-blue-500/20 hover:border-l-blue-500/40"}`} onClick={onClick}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-1 rounded ${isActive ? "text-primary-foreground bg-primary" : "text-primary bg-primary/10"}`}>v{versionDecimal}</span>
            </div>
            {showDate && (
              <div className="text-[10px] text-muted-foreground">{formattedDate}</div>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium leading-relaxed group-hover:text-foreground line-clamp-2">{headline || "No headline"}</p>
          </div>
        </div>
      </div>
    </VersionTooltip>
  );
}

/**
 * Versions
 *
 * Main component displaying article version history with navigation to digest page.
 * Uses article context for version data and switching.
 * Shows arrow controls for collapsing/expanding the panel.
 */
function Versions({ isCollapsed, onCollapse, onExpand, panelSize }: VersionsProps) {
  const router = useRouter();
  const { versionMetadata, currentVersion, setCurrentVersion, currentArticle } = useArticle();

  const sourceType = currentArticle?.sourceType === "multi" ? "aggregator" : "digest";

  // Determine if we should use compact layout based on panel size
  const isCompact = panelSize < 25;
  const horizontalPadding = isCompact ? "px-2" : "px-6";

  // Collapsed view - show expand arrow ---
  if (isCollapsed) {
    return (
      <div className="h-full flex flex-col justify-start pt-[21px]">
        <div className="flex justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={onExpand}
                className="p-1 rounded-md hover:bg-accent transition-colors"
              >
                <ChevronsLeft className="h-4 w-4" strokeWidth={3} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Expand Versions</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    );
  }

  // Full view - show all content with collapse arrow ---
  return (
    <div className="h-full flex flex-col">
      {/* Start of Header Section with Collapse Button --- */}
      <div className={`flex items-center justify-between ${horizontalPadding} pt-5 pb-4`}>
        <Label className="text-sm font-medium">Version History</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={onCollapse}
              className="p-1 rounded-md hover:bg-accent transition-colors"
            >
              <ChevronsRight className="h-4 w-4" strokeWidth={3} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Collapse Panel</p>
          </TooltipContent>
        </Tooltip>
      </div>
      {/* End of Header Section --- */}

      <div className={`flex-1 overflow-y-auto space-y-6 ${horizontalPadding} py-4`}>
        {/* Start of Change Inputs Button --- */}
        <div>
          <Button asChild className="w-full bg-blue-500 hover:bg-blue-600 cursor-pointer text-white">
            <Link href={currentArticle ? `/${sourceType}?slug=${currentArticle.slug}&version=${encodeURIComponent(currentVersion)}` : `/${sourceType}`}>
              <span className="font-medium text-xs">CHANGE INPUTS</span>
            </Link>
          </Button>
        </div>
        {/* End of Change Inputs Button --- */}

        {/* Start of Version Cards --- */}
        <div className="space-y-3">
          {versionMetadata.map((versionData) => (
            <VersionCard
              key={versionData.versionDecimal}
              versionDecimal={versionData.versionDecimal}
              headline={versionData.headline}
              blobOutline={versionData.blobOutline || ""}
              createdAt={versionData.createdAt}
              isActive={versionData.versionDecimal === currentVersion}
              showDate={!isCompact}
              onClick={() => {
                // Only navigate if we're switching to a different version
                if (versionData.versionDecimal !== currentVersion && currentArticle) {
                  // Use enhanced setCurrentVersion for immediate update + loading
                  setCurrentVersion(versionData.versionDecimal);
                  
                  // Update URL for consistency (won't trigger loading since version already matches)
                  router.push(`/article?slug=${encodeURIComponent(currentArticle.slug)}&version=${encodeURIComponent(versionData.versionDecimal)}`);
                }
              }}
            />
          ))}
        </div>
        {/* End of Version Cards ---- */}
      </div>
    </div>
  );
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/

export default Versions;
