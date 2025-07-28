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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
// Lucide Icons ---
import { FileText, Download, Mail, Loader2, ArrowLeft } from "lucide-react";

// Local Modules ---
import { useArticle } from "./article-context";
import { createHumanEditedVersionAction } from "@/actions/article";
import { 
  sendArticleEmail, 
  exportArticleAsDocx, 
  exportArticleAsPdf,
  type ArticleData 
} from "@/lib/export-utils";
import { ExportType } from "@/actions/export";

/* ==========================================================================*/
// Version Dropdown
/* ==========================================================================*/

function VersionSelect() {
  const router = useRouter();
  const { versionMetadata, currentVersion, setCurrentVersion, currentArticle } = useArticle();

  const handleVersionChange = (value: string) => {
    if (value !== currentVersion && currentArticle) {
      setCurrentVersion(value);
      router.push(`/article?slug=${encodeURIComponent(currentArticle.slug)}&version=${encodeURIComponent(value)}`);
    }
  };

  return (
    <Select value={currentVersion} onValueChange={handleVersionChange}>
      <SelectTrigger className="w-fit cursor-pointer">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {versionMetadata.map((version) => (
          <SelectItem className="cursor-pointer" key={version.versionDecimal} value={version.versionDecimal}>
            Version {version.versionDecimal}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ==========================================================================*/
// Email Export Dialog
/* ==========================================================================*/

function EmailExportDialog() {
  const { currentArticle } = useArticle();
  const [isOpen, setIsOpen] = useState(false);
  const [recipients, setRecipients] = useState("");
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendEmail = async () => {
    if (!currentArticle) {
      toast.error("No article to send");
      return;
    }

    if (!recipients.trim()) {
      toast.error("Please enter at least one recipient email address");
      return;
    }

    // Parse recipient emails (comma-separated)
    const emailList = recipients
      .split(",")
      .map(email => email.trim())
      .filter(email => email.length > 0);

    if (emailList.length === 0) {
      toast.error("Please enter valid email addresses");
      return;
    }

    setIsSending(true);

    try {
      // Convert article data to the format expected by export utils
      const articleData: ArticleData = {
        headline: currentArticle.headline || "",
        slug: currentArticle.slug,
        version: currentArticle.version,
        versionDecimal: currentArticle.versionDecimal,
        richContent: currentArticle.richContent,
        content: currentArticle.content,
        blob: currentArticle.blob,
        createdByName: currentArticle.createdByName,
      };

      console.log("📧 Sending email...");

      await sendArticleEmail(articleData, emailList, content.trim());

      console.log("📧 Email sent successfully");

      toast.success("Email sent successfully!");
      setIsOpen(false);
      setRecipients("");
      setContent("");
    } catch (error) {
      console.error("❌ Email sending error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem 
          className="cursor-pointer" 
          onSelect={(e) => {
            e.preventDefault();
            setIsOpen(true);
          }}
        >
          <Mail className="mr-2 h-4 w-4" />
          Send as Email
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send article as email</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipients">Recipient(s) email address:</Label>
            <Input
              id="recipients"
              placeholder="Recipient(s) Email Address *"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              disabled={isSending}
            />
            <p className="text-sm text-muted-foreground">Separate multiple emails with a comma</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Your Content:</Label>
            <Textarea
              id="content"
              placeholder="This will be added in the email before the article"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSending}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSendEmail}
            disabled={isSending}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);

  const formattedDate =
    lastModified?.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }) || "Unknown";

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
      hasChanges,
    });

    startTransition(async () => {
      try {
        const updateData = {
          headline: currentArticle.headline,
          blob: currentArticle.blob,
          content: currentArticle.content,
          richContent: currentArticle.richContent ?? "",
          status: "completed" as const,
        };

        console.log("📤 Calling createHumanEditedVersionAction with:", {
          currentArticle,
          updateData,
        });

        const result = await createHumanEditedVersionAction(currentArticle, updateData);

        console.log("📥 Server action result:", result);

        if (result.success) {
          const newVersion = result.article?.versionDecimal ?? currentArticle.versionDecimal;
          setCurrentVersion(newVersion);
          toast.success("New version saved successfully");
          // Navigate to the new version URL
          router.push(`/article?slug=${encodeURIComponent(currentArticle.slug)}&version=${encodeURIComponent(newVersion)}`);
        } else {
          console.log(result.error);
          toast.error("Failed to save edited version");
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

      // Convert article data to the format expected by export utils
      const articleData: ArticleData = {
        headline: currentArticle.headline || "",
        slug: currentArticle.slug,
        version: currentArticle.version,
        versionDecimal: currentArticle.versionDecimal,
        richContent: currentArticle.richContent,
        content: currentArticle.content,
        blob: currentArticle.blob,
        createdByName: currentArticle.createdByName,
      };

      if (exportType === "docx") {
        await exportArticleAsDocx(articleData);
        toast.success("Article exported as DOCX successfully");

      } else if (exportType === "pdf") {
        await exportArticleAsPdf(articleData);
        toast.success("Article exported as PDF successfully");
      }
    } catch (error) {
      console.error("❌ Export error:", error);
      toast.error(error instanceof Error ? error.message : "Export failed");
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
          <Button className="bg-blue-500 hover:bg-blue-600 cursor-pointer text-white" onClick={handleSave} disabled={isPending || !hasChanges}>
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
              <DropdownMenuItem className="cursor-pointer" onClick={() => handleExport("docx")} disabled={isExporting}>
                <FileText className="mr-2 h-4 w-4" />
                Export as DocX
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => handleExport("pdf")} disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <EmailExportDialog />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* End of Right Section ---- */}
      </div>
      {/* End of Header Section ---- */}

      {/* Start of Article Info Section --- */}
      <div className="space-y-2 pt-3">
        {/* Start of Headline Row --- */}
        <h1 className="text-[24px] line-clamp-2 font-semibold leading-wide">{headline}</h1>
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
