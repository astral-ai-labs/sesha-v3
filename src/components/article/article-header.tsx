"use client";

/* ==========================================================================*/
// header.tsx — Article header with slug, version selector, and actions
/* ==========================================================================*/
// Purpose: Display article header with slug, version dropdown, save button, export popover, headline and metadata
// Sections: Imports, Component, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ---
import React, { useTransition, useState } from "react";
import Link from "next/link";

// Next.js ---
import { useRouter } from "next/navigation";

// Shadcn UI ---
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
// Lucide Icons ---
import { FileText, Download, Mail, Loader2, ArrowLeft } from "lucide-react";

// Local Modules ---
import { useArticle } from "./article-context";
import { createNewVersionAction } from "@/actions/article";
import { handleExportAction, ExportType } from "@/actions/export";
import { set } from "zod";

/* ==========================================================================*/
// Version Dropdown
/* ==========================================================================*/

function VersionSelect() {
  const router = useRouter();
  const { versionMetadata, currentVersion, setCurrentVersion, currentArticle } = useArticle();
  
  const handleVersionChange = (value: string) => {
    const newVersion = Number(value);
    if (newVersion !== currentVersion && currentArticle) {
      setCurrentVersion(newVersion);
      router.push(`/article?slug=${encodeURIComponent(currentArticle.slug)}&version=${newVersion}`);
    }
  }

  return (
    <Select 
      value={currentVersion.toString()} 
      onValueChange={handleVersionChange}
    >
      <SelectTrigger className="w-fit cursor-pointer">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {versionMetadata.map((version) => (
          <SelectItem className="cursor-pointer" key={version.version} value={version.version.toString()}>
            Version {version.version}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ==========================================================================*/
// Component
/* ==========================================================================*/

/**
 * Header
 *
 * Article header component with slug display, version selector, save button, export options, headline and metadata.
 * Uses article context for data access and server actions for saving.
 */
function ArticleHeader() {
  const { slug, headline, lastModified, createdByName, currentArticle, setCurrentVersion, hasChanges } = useArticle();
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  
  const formattedDate = lastModified?.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric", 
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }) || 'Unknown';

  /* ==========================================================================*/
  // Event Handlers
  /* ==========================================================================*/

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
          richContent: currentArticle.richContent ?? "",
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

  const handleExport = async (exportType: ExportType) => {
    if (!currentArticle) {
      toast.error("No article to export");
      return;
    }

    setIsExporting(true);

    try {
      console.log(`📤 Exporting as ${exportType}`);

      if (currentArticle.headline && currentArticle.richContent && (exportType === "docx" || exportType === "pdf")) {
        // Call server action for docx/pdf
        const result = await handleExportAction({
          headline: currentArticle.headline,
          richContent: currentArticle.richContent,
          slug: currentArticle.slug,
          version: currentArticle.version.toString(),
          createdByName: currentArticle.createdByName,
          type: exportType
        });

        if (result.success && result.data && result.filename) {
          // Create blob and download
          const blob = new Blob([result.data], {
            type: exportType === "docx"
              ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              : "application/pdf"
          });

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = result.filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          toast.success(`Article exported as ${exportType.toUpperCase()} successfully`);
        } else {
          toast.error(result.error || `Failed to export as ${exportType}`);
        }
      } else if (exportType === "email") {
        // Handle email export separately or show a message
        toast.info("Email export is not supported yet.");
      }
    } catch (error) {
      console.error("❌ Export error:", error);
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Start of Header Section --- */}
      <div className="flex items-center justify-between">
        {/* Start of Left Section --- */}
        <div className="flex items-center">
          <Link href="/library" className="flex items-center mr-4 text-sm text-muted-foreground hover:underline hover:text-primary">
            <ArrowLeft className="mr-1 h-4 w-4" />
          </Link>
          <span className="text-sm space-x-2 text-muted-foreground">
            <span className="font-medium text-foreground">Slug:</span> <span className="font-mono text-foreground underline">{slug}</span>
          </span>
        </div>
        {/* End of Left Section ---- */}

        {/* Start of Right Section --- */}
        <div className="flex items-center space-x-3">
          <VersionSelect />
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="cursor-pointer" disabled={isExporting}>
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  "Export"
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              {/* To be implemented later... */}
              {/* <DropdownMenuItem 
                className="cursor-pointer" 
                onClick={() => handleExport("docx")}
                disabled={isExporting}
              >
                <FileText className="mr-2 h-4 w-4" />
                Export as DocX
              </DropdownMenuItem> */}
              <DropdownMenuItem 
                className="cursor-pointer" 
                onClick={() => handleExport("pdf")}
                disabled={isExporting}
              >
                <Download className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              {/* To be implemented later... */}
              {/* <DropdownMenuItem 
                className="cursor-pointer" 
                onClick={() => console.log("Email export not implemented yet")}
              >
                <Mail className="mr-2 h-4 w-4" />
                Export as Email
              </DropdownMenuItem> */}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* End of Right Section ---- */}
      </div>
      {/* End of Header Section ---- */}

      {/* Start of Article Info Section --- */}
      <div className="space-y-2 pt-3">
        {/* Start of Headline Row --- */}
        <h1 className="text-[24px] line-clamp-2 font-semibold leading-wide">
          {headline}
        </h1>
        {/* End of Headline Row ---- */}

        {/* Start of Metadata Row --- */}
        <div className="text-base text-muted-foreground">
          Last modified {formattedDate} by {createdByName}
        </div>
        {/* End of Metadata Row ---- */}
      </div>
      {/* End of Article Info Section ---- */}
    </div>
  );
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/

export default ArticleHeader;
