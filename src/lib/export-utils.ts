/* ==========================================================================*/
// export-utils.ts — Export utilities for articles (email, DOCX, PDF)
/* ==========================================================================*/
// Purpose: Centralized utilities for exporting articles in various formats
// Sections: Imports, Types, Lexical Utils, Export Functions, Public API

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// Lexical Core ---
import { $generateHtmlFromNodes } from "@lexical/html";
import { createEditor } from "lexical";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { TableNode, TableRowNode, TableCellNode } from "@lexical/table";
import * as cheerio from "cheerio";

/* ==========================================================================*/
// Types and Interfaces
/* ==========================================================================*/

export interface ArticleData {
  headline: string;
  slug: string;
  version: number;
  versionDecimal: string;
  richContent?: string | null;
  content?: string | null;
  blob?: string | null;
  createdByName: string;
}

export interface EmailExportData {
  to: string[];
  subject: string;
  href: string;
  name: string;
  slug: string;
  version: number;
  versionDecimal: string;
  content?: string;
  articleHtml?: string;
  blobs?: string;
  emailType?: 'completion' | 'export';
}

export interface DocxExportData {
  articleHeadline: string;
  articleSlug: string;
  versionDecimal: string;
  articleHtml?: string;
  blobs?: string;
  createdByName: string;
  richContent?: string | null; // Added richContent to DocxExportData
}

export interface PdfExportData {
  articleHeadline: string;
  articleSlug: string;
  versionDecimal: string;
  articleHtml?: string;
  blobs?: string;
  createdByName: string;
}

/* ==========================================================================*/
// Lexical Utilities
/* ==========================================================================*/

/**
 * convertRichContentToHtml
 *
 * Converts Lexical richContent JSON to HTML string using Lexical's serialization.
 * Handles all rich text node types and provides fallback on errors.
 *
 * @param richContentJson - Serialized Lexical editor state as JSON string
 * @param fallbackContent - Fallback content if conversion fails
 * @returns HTML string representation of the rich content
 *
 * @example
 * const html = convertRichContentToHtml(article.richContent, article.content);
 */
function convertRichContentToHtml(richContentJson: string, fallbackContent?: string): string {
  try {
    // Create a temporary editor with all necessary nodes
    const editor = createEditor({
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, CodeHighlightNode, LinkNode, TableNode, TableRowNode, TableCellNode],
    });

    // Parse and set the editor state first
    const importedState = editor.parseEditorState(richContentJson);
    editor.setEditorState(importedState);

    // Now read the HTML from the editor state
    const html = editor.read(() => {
      return $generateHtmlFromNodes(editor, null);
    });
    
    console.log("🔍 Generated HTML from Lexical:");
    console.log("HTML length:", html.length);
    console.log("HTML preview:", html.substring(0, 1000));
    
    // Check for specific styling elements
    const $ = cheerio.load(html);
    console.log("📊 HTML Analysis:");
    console.log("- Strong tags:", $('strong').length);
    console.log("- Bold tags:", $('b').length);
    console.log("- Italic tags:", $('em, i').length);
    console.log("- Underline tags:", $('u').length);
    console.log("- Span tags:", $('span').length);
    console.log("- Spans with style:", $('span[style]').length);
    
    // Show sample spans with styling
    $('span[style]').slice(0, 3).each((index, element) => {
      const $el = $(element);
      console.log(`  Sample span ${index + 1}:`, {
        text: $el.text().substring(0, 50),
        style: $el.attr('style')
      });
    });
    
    return html;
  } catch (error) {
    console.error("Error converting richContent to HTML:", error);
    return fallbackContent || "";
  }
}

/**
 * prepareArticleHtml
 *
 * Prepares article HTML from rich content or plain content with fallback.
 *
 * @param article - Article data containing rich content and plain content
 * @returns HTML string ready for export
 */
function prepareArticleHtml(article: ArticleData): string {
  if (article.richContent) {
    return convertRichContentToHtml(article.richContent, article.content || undefined);
  } else if (article.content) {
    // Fallback to plain content with basic HTML formatting
    return `<div>${article.content.replace(/\n/g, "<br>")}</div>`;
  }
  return "";
}

/* ==========================================================================*/
// Download Utilities
/* ==========================================================================*/

/**
 * downloadFile
 *
 * Triggers file download in the browser.
 *
 * @param blob - File blob to download
 * @param filename - Name for the downloaded file
 */
function downloadFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/* ==========================================================================*/
// Email Export Functions
/* ==========================================================================*/

/**
 * sendArticleEmail
 *
 * Sends article via email using the /api/send endpoint.
 *
 * @param article - Article data
 * @param recipients - Array of email addresses
 * @param customContent - Optional custom message from sender
 * @returns Promise that resolves when email is sent
 */
async function sendArticleEmail(article: ArticleData, recipients: string[], customContent?: string): Promise<void> {
  const articleHtml = prepareArticleHtml(article);

  const emailData: EmailExportData = {
    to: recipients,
    subject: article.headline || `Article: ${article.slug}`,
    href: `${window.location.origin}/article?slug=${encodeURIComponent(article.slug)}&version=${encodeURIComponent(article.versionDecimal)}`,
    name: article.createdByName,
    slug: article.slug,
    version: article.version,
    versionDecimal: article.versionDecimal,
    content: customContent?.trim(),
    articleHtml: articleHtml,
    blobs: article.blob || undefined,
    emailType: 'export',
  };

  const response = await fetch("/api/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to send email");
  }
}

/* ==========================================================================*/
// DOCX Export Functions
/* ==========================================================================*/

/**
 * exportArticleAsDocx
 *
 * Exports article as DOCX file using the /api/export-docx endpoint.
 *
 * @param article - Article data to export
 * @returns Promise that resolves when file is downloaded
 */
async function exportArticleAsDocx(article: ArticleData): Promise<void> {
  const articleHtml = prepareArticleHtml(article);
  
  const docxData: DocxExportData = {
    articleHeadline: article.headline,
    articleSlug: article.slug,
    versionDecimal: article.versionDecimal,
    richContent: article.richContent || '', // Send Lexical JSON directly
    articleHtml: articleHtml, // Send converted HTML for HTMLtoDOCX
    blobs: article.blob || undefined,
    createdByName: article.createdByName,
  };

  const response = await fetch("/api/export-docx", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(docxData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to generate DOCX");
  }

  // Get the DOCX blob from response
  const docxBlob = await response.blob();

  // Extract filename from Content-Disposition header or create one
  const contentDisposition = response.headers.get("Content-Disposition");
  let filename = `${article.slug}_v${article.versionDecimal}.docx`;
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }
  }

  // Download the file
  downloadFile(docxBlob, filename);
}

/* ==========================================================================*/
// PDF Export Functions
/* ==========================================================================*/

/**
 * exportArticleAsPdf
 *
 * Exports article as PDF using the /api/export-pdf endpoint.
 *
 * @param article - Article data to export
 * @returns Promise that resolves when file is downloaded
 */
async function exportArticleAsPdf(article: ArticleData): Promise<void> {
  const articleHtml = prepareArticleHtml(article);

  const pdfData = {
    articleHeadline: article.headline,
    articleSlug: article.slug,
    versionDecimal: article.versionDecimal,
    articleHtml: articleHtml,
    blobs: article.blob || undefined,
    createdByName: article.createdByName,
  };

  console.log("📤 Sending PDF export request:", pdfData);

  const response = await fetch("/api/export-pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pdfData),
  });

  console.log("📥 PDF export response status:", response.status);

  if (!response.ok) {
    let errorMessage = "Failed to generate PDF";
    try {
      const errorData = await response.json();
      console.error("❌ PDF export error details:", errorData);
      errorMessage = errorData.details ? `${errorData.error}: ${errorData.details}` : errorData.error || errorMessage;
    } catch (parseError) {
      console.error("❌ Failed to parse error response:", parseError);
      errorMessage = `Failed to generate PDF (HTTP ${response.status})`;
    }
    throw new Error(errorMessage);
  }

  // Get the PDF blob from response
  const pdfBlob = await response.blob();

  // Extract filename from Content-Disposition header or create one
  const contentDisposition = response.headers.get("Content-Disposition");
  let filename = `${article.slug}_v${article.versionDecimal}.pdf`;
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }
  }

  // Download the file
  downloadFile(pdfBlob, filename);
}

/* ==========================================================================*/
// Public API Exports
/* ==========================================================================*/

export { sendArticleEmail, exportArticleAsDocx, exportArticleAsPdf, prepareArticleHtml, convertRichContentToHtml };