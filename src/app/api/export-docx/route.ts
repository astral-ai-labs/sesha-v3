import { NextRequest, NextResponse } from 'next/server';

// @ts-expect-error - HTMLtoDOCX is not typed
import HTMLtoDOCX from 'html-to-docx';

/* ==========================================================================*/
// export-docx/route.ts — DOCX export endpoint using HTMLtoDOCX
/* ==========================================================================*/
// Purpose: Convert article HTML content to DOCX format using HTMLtoDOCX
// Replicates exact styling from docx library implementation

/* ==========================================================================*/
// Types
/* ==========================================================================*/

interface ExportDocxRequest {
  richContent: string; // Lexical JSON content - always required
  articleHeadline: string;
  articleSlug: string;
  versionDecimal: string;
  articleHtml?: string; // Pre-converted HTML content
  blobs?: string;
}

/* ==========================================================================*/
// Helper Functions
/* ==========================================================================*/

/**
 * formatBlobsAsHtml
 * 
 * Converts blob text to HTML bullet points with exact styling match
 */
function formatBlobsAsHtml(blobText: string): string {
  if (!blobText) return '';
  
  const blobItems = blobText
    .split('\n')
    .map(blob => blob.trim())
    .filter(blob => blob.length > 0);

  if (blobItems.length === 0) return '';

  return `<div style="margin-top: 0pt; margin-bottom: 18pt;">
<ul style="font-family: Times New Roman; font-size: 12pt; margin: 0; padding-left: 0; list-style-position: inside;">
${blobItems.map(blob => `<li style="margin: 3pt 0;"><strong>${blob}</strong></li>`).join('')}
</ul>
</div>`;
}

/**
 * generateDocxHtml
 * 
 * Creates HTML that exactly matches current docx library styling
 */
function generateDocxHtml(data: ExportDocxRequest, articleHtml: string): string {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short", 
    day: "numeric",
    year: "numeric"
  });

  const blobsHtml = data.blobs ? formatBlobsAsHtml(data.blobs) : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body { 
  font-family: Times New Roman, serif; 
  font-size: 12pt;
  line-height: 1.2;
  margin: 72pt 90pt 72pt 90pt;
  color: black;
}
.metadata { 
  font-family: Times New Roman, serif;
  font-size: 11pt; 
  margin-bottom: 24pt;
  text-decoration: underline;
}
.title { 
  font-size: 18pt; 
  font-weight: bold; 
  text-align: center;
  margin: 12pt 0;
}
.content {
  margin-top: 18pt;
}
/* Spacer paragraph styles in CSS */
.content p {
  margin: 8pt 0;
}
strong, b { font-weight: bold; }
em, i { font-style: italic; }
u { text-decoration: underline; }
ul { margin: 6pt 0; padding-left: 0; list-style-position: inside; }
li { margin: 3pt 0; }
</style>
</head>
<body>
<p style="font-family: Times New Roman, serif; font-size: 11pt; margin-bottom: 0pt;"><u><strong>Slug:</strong> ${data.articleSlug} <strong>Version:</strong> ${data.versionDecimal} <strong>Export by:</strong> sesha systems <strong>on:</strong> ${currentDate}</u></p>
  
  <h1 style="font-size: 18pt; font-weight: bold; text-align: center; margin: 12pt 0 0 0;">${data.articleHeadline}</h1>
  
  <p style="font-size:1pt; line-height:1pt; margin:0 0 24pt 0;">&nbsp;</p>
  <p style="font-size:1pt; line-height:1pt; margin:0 0 24pt 0;">&nbsp;</p>
  
  ${blobsHtml}
  
  <p style="font-size:1pt; line-height:1pt; margin:0 0 24pt 0;">&nbsp;</p>
  <p style="font-size:1pt; line-height:1pt; margin:0 0 24pt 0;">&nbsp;</p>
  
  <div class="content">
${articleHtml}
</div>
</body>
</html>`;
}

/* ==========================================================================*/
// Route Handler
/* ==========================================================================*/

export async function POST(request: NextRequest) {
  try {
    const data: ExportDocxRequest = await request.json();
    
    console.log("📄 DOCX request data:", {
      hasRichContent: !!data.richContent,
      hasArticleHtml: !!data.articleHtml,
      headline: data.articleHeadline,
      slug: data.articleSlug,
      version: data.versionDecimal,
      hasBlobs: !!data.blobs
    });
    
    // Validate required fields
    if (!data.articleHeadline || !data.articleSlug || !data.versionDecimal) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log("🚀 Starting DOCX export with HTMLtoDOCX");

    // Use the pre-converted HTML from export-utils.ts
    const articleHtml = data.articleHtml || '';

    // Generate formatted HTML for DOCX
    const htmlContent = generateDocxHtml(data, articleHtml);
    console.log("📄 Generated HTML content length:", htmlContent.length);
    console.log("📄 HTML preview:", htmlContent.substring(0, 500) + "...");

    // Convert HTML to DOCX with simplified settings
    console.log("📄 Converting HTML to DOCX...");
    const docxBuffer = await HTMLtoDOCX(htmlContent, null, {
      footer: true,
      pageNumber: true,
      orientation: 'portrait'
    });
    
    console.log("✅ DOCX export completed successfully, buffer size:", docxBuffer.length);
    
    // Validate buffer
    if (!docxBuffer || docxBuffer.length === 0) {
      throw new Error("Generated DOCX buffer is empty");
    }
    
    // Return the DOCX file
    return new NextResponse(docxBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${data.articleSlug}-v${data.versionDecimal}.docx"`,
        'Content-Length': docxBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("❌ DOCX export error:", error);
    console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: "Failed to generate DOCX",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 