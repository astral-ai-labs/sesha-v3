import { NextRequest, NextResponse } from 'next/server';

// @ts-expect-error - HTMLtoDOCX is not typed
import HTMLtoDOCX from 'html-to-docx';

/* ==========================================================================*/
// export-docx/route.ts — DOCX export endpoint
/* ==========================================================================*/
// Purpose: Convert article HTML content to DOCX format
// Uses html-docx-js for serverless-friendly conversion

/* ==========================================================================*/
// Types
/* ==========================================================================*/

interface ExportDocxRequest {
  articleHeadline: string;
  articleSlug: string;
  versionDecimal: string;
  articleHtml?: string;
  blobs?: string;
  createdByName: string;
}

/* ==========================================================================*/
// Helper Functions
/* ==========================================================================*/

/**
 * formatBlobsAsHtml
 * 
 * Converts blob text to HTML bullet points
 */
function formatBlobsAsHtml(blobText: string): string {
  if (!blobText) return '';
  
  const blobItems = blobText
    .split('\n')
    .map(blob => blob.trim())
    .filter(blob => blob.length > 0);

  if (blobItems.length === 0) return '';

  return `
    <ul style="margin: 20px 0; padding-left: 20px;">
      ${blobItems.map(blob => `<li style="margin: 8px 0; font-weight: bold;">${blob}</li>`).join('')}
    </ul>
    <br/>
  `;
}

/**
 * addParagraphSpacing
 * 
 * Adds spacing between paragraphs by inserting breaks
 */
function addParagraphSpacing(htmlContent: string): string {
  if (!htmlContent) return htmlContent;
  
  // Add spacing after paragraphs, divs, headings, and lists
  return htmlContent
    .replace(/<\/p>/g, '</p><br/>')
    .replace(/<\/div>/g, '</div><br/>')
    .replace(/<\/h[1-6]>/g, '$&<br/>')
    .replace(/<\/ul>/g, '</ul><br/>')
    .replace(/<\/ol>/g, '</ol><br/>')
    .replace(/<\/blockquote>/g, '</blockquote><br/>');
}

/**
 * generateDocxHtml
 * 
 * Creates properly formatted HTML for DOCX conversion
 */
function generateDocxHtml(data: ExportDocxRequest, articleHtml: string): string {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short", 
    day: "numeric",
    year: "numeric"
  });

  const blobsHtml = data.blobs ? formatBlobsAsHtml(data.blobs) : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          margin: 40px;
          color: #000;
        }
        .metadata { 
          font-size: 14px; 
          margin-bottom: 30px;
          color: #333;
        }
        .title { 
          font-size: 20px; 
          font-weight: bold; 
          margin: 30px 0 20px 0;
          color: #000;
        }
        .content {
          font-size: 16px;
          line-height: 1.6;
          margin-top: 20px;
        }
        .content p {
          margin-bottom: 16px;
        }
        .content div {
          margin-bottom: 12px;
        }
        ul {
          padding-left: 20px;
          margin-bottom: 16px;
        }
        ol {
          padding-left: 20px;
          margin-bottom: 16px;
        }
        li {
          margin: 8px 0;
        }
        h1, h2, h3, h4, h5, h6 {
          margin-bottom: 12px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="metadata">
        <p><strong>Slug:</strong> ${data.articleSlug}</p>
        <p><strong>Version:</strong> ${data.versionDecimal}</p>
        <p><strong>Export by:</strong> sesha systems <strong>on:</strong> ${currentDate}</p>
      </div>
      
      <h1 class="title">${data.articleHeadline}</h1>
      
      ${blobsHtml}
      
      <div class="content">
        ${articleHtml}
      </div>
    </body>
    </html>
  `;
}

/* ==========================================================================*/
// Route Handler
/* ==========================================================================*/

export async function POST(request: NextRequest) {
  try {
    console.log("📄 DOCX Export request received");
    const body: ExportDocxRequest = await request.json();

    console.log("📄 DOCX Export parsed body:", {
      headline: body.articleHeadline,
      slug: body.articleSlug,
      version: body.versionDecimal,
      hasArticleHtml: !!body.articleHtml,
      hasBlobs: !!body.blobs,
      createdByName: body.createdByName
    });

    // Validate required fields
    if (!body.articleHeadline || !body.articleSlug || !body.versionDecimal) {
      console.error("❌ Missing required fields:", { 
        hasHeadline: !!body.articleHeadline, 
        hasSlug: !!body.articleSlug, 
        hasVersion: !!body.versionDecimal 
      });
      return NextResponse.json(
        { error: 'Missing required fields: articleHeadline, articleSlug, and versionDecimal are required' }, 
        { status: 400 }
      );
    }

    console.log("✅ Validation passed");

    // Use the pre-converted HTML from client
    const articleHtml = body.articleHtml || '';
    console.log("📄 Article HTML length:", articleHtml.length);

    // Add spacing between paragraphs
    const spacedArticleHtml = addParagraphSpacing(articleHtml);
    console.log("📄 Added paragraph spacing, new length:", spacedArticleHtml.length);

    // Generate formatted HTML for DOCX
    console.log("📄 Generating HTML content for DOCX...");
    const htmlContent = generateDocxHtml(body, spacedArticleHtml);
    console.log("📄 Generated HTML content length:", htmlContent.length);

    // Convert HTML to DOCX
    console.log("📄 Converting HTML to DOCX...");
    let docxBuffer;
    try {
      docxBuffer = await HTMLtoDOCX(htmlContent, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
      });
      console.log("✅ DOCX conversion successful, buffer type:", typeof docxBuffer);
    } catch (conversionError) {
      console.error("❌ DOCX conversion failed:", conversionError);
      throw new Error(`DOCX conversion failed: ${conversionError instanceof Error ? conversionError.message : 'Unknown conversion error'}`);
    }

    // Generate filename
    const sanitizedSlug = body.articleSlug.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${sanitizedSlug}_v${body.versionDecimal}.docx`;

    console.log("✅ DOCX generated successfully:", filename);

    // Return the DOCX file
    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': docxBuffer.byteLength ? docxBuffer.byteLength.toString() : docxBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Error in DOCX export route:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate DOCX file',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 