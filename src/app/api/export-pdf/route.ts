import { NextRequest, NextResponse } from "next/server";

/* ==========================================================================*/
// export-pdf/route.ts — PDF export endpoint for serverless environments
/* ==========================================================================*/
// Purpose: Convert article HTML content to PDF format using Puppeteer + Chromium
// Uses @sparticuz/chromium for Vercel serverless compatibility

/* ==========================================================================*/
// Types
/* ==========================================================================*/

interface ExportPdfRequest {
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
  if (!blobText) return "";

  const blobItems = blobText
    .split("\n")
    .map((blob) => blob.trim())
    .filter((blob) => blob.length > 0);

  if (blobItems.length === 0) return "";

  // Return formatted blobs with reduced spacing
  return `<div style="margin-top: 0px; margin-bottom: 12px;">
<ul style="font-family: 'Times New Roman', Times, serif; font-size: 16px; margin: 8px 0; padding-left: 20px; list-style-position: outside;">
${blobItems.map((blob) => `<li style="margin: 8px 0; padding-left: 2px;"><strong>${blob}</strong></li>`).join("")}
</ul>
</div>`;
}

/**
 * addParagraphSpacing
 *
 * Adds appropriate spacing after major sections for PDF layout
 */
function addParagraphSpacing(htmlContent: string): string {
  if (!htmlContent) return htmlContent;
  
  // For PDF, we rely on CSS margins instead of <br/> tags for cleaner spacing
  // Only add breaks after major sections, not every paragraph
  return htmlContent
    .replace(/<\/ul>/g, '</ul><br/>')
    .replace(/<\/ol>/g, '</ol><br/>')
    .replace(/<\/blockquote>/g, '</blockquote><br/>');
}


/**
 * generatePdfHtml
 *
 * Creates properly formatted HTML for PDF conversion
 */
function generatePdfHtml(data: ExportPdfRequest, articleHtml: string): string {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const blobsHtml = data.blobs ? formatBlobsAsHtml(data.blobs) : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${data.articleHeadline} - ${data.articleSlug}</title>
      <style>
        @page {
          size: A4;
          margin: 96px 120px 96px 120px;
          @bottom-left {
            content: counter(page);
            font-family: "Times New Roman", Times, serif;
            font-size: 14px;
            color: #000;
            margin-bottom: 10px;
          }
        }
        
        body { 
          font-family: "Times New Roman", Times, serif; 
          line-height: 1.2; 
          margin: 0;
          color: black;
          font-size: 14px;
        }
          
        
        .title {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          margin: 32px 0;
          page-break-after: avoid;
        }

        .content {
          margin-top: 24px;
        }
        
        .content p {
          margin: 11px 0;
        }
        
        .content div {
          margin-bottom: 11px;
        }
        
        ul {
          margin: 8px 0;
          padding-left: 0px;
          list-style-position: inside;
        }

        li {
          margin: 4px 0;
          padding-left: 2px;
        }

        strong, b { font-weight: bold; }
        em, i { font-style: italic; }
        u { text-decoration: underline; }
        
        h1, h2, h3, h4, h5, h6 {
          margin-bottom: 8px;
          margin-top: 12px;
          page-break-after: avoid;
          page-break-inside: avoid;
        }
        
        h1 { font-size: 21px; }
        h2 { font-size: 20px; }
        h3 { font-size: 19px; }
        h4 { font-size: 18px; }
        h5 { font-size: 17px; }
        h6 { font-size: 16px; }
        
        blockquote {
          border-left: 3px solid #ccc;
          margin: 2px 0;
          padding-left: 15px;
          font-style: italic;
        }
        
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 10px 0;
          page-break-inside: avoid;
        }
        
        td, th {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }

        
        body {
          counter-reset: page;
        }
      </style>
    </head>
    <body>
      <p style="font-family: 'Times New Roman', Times, serif; font-size: 14px; margin-bottom: 0px;"><u><strong>Slug:</strong> ${data.articleSlug} <strong>Version:</strong> ${data.versionDecimal} <strong>Export by:</strong> sesha systems <strong>on:</strong> ${currentDate}</u></p>
      
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
    console.log("📄 PDF Export request received");
    const body: ExportPdfRequest = await request.json();

    console.log("📄 PDF Export parsed body:", {
      headline: body.articleHeadline,
      slug: body.articleSlug,
      version: body.versionDecimal,
      hasArticleHtml: !!body.articleHtml,
      hasBlobs: !!body.blobs,
      createdByName: body.createdByName,
    });

    // Validate required fields
    if (!body.articleHeadline || !body.articleSlug || !body.versionDecimal) {
      console.error("❌ Missing required fields:", {
        hasHeadline: !!body.articleHeadline,
        hasSlug: !!body.articleSlug,
        hasVersion: !!body.versionDecimal,
      });
      return NextResponse.json({ error: "Missing required fields: articleHeadline, articleSlug, and versionDecimal are required" }, { status: 400 });
    }

    console.log("✅ Validation passed");

    // Use the pre-converted HTML from client
    const articleHtml = body.articleHtml || '';
    console.log("📄 Article HTML length:", articleHtml.length);

    // Add spacing between paragraphs
    const spacedArticleHtml = addParagraphSpacing(articleHtml);
    console.log("📄 Added paragraph spacing, new length:", spacedArticleHtml.length);

    // Generate formatted HTML for PDF
    console.log("📄 Generating HTML content for PDF...");
    const htmlContent = generatePdfHtml(body, spacedArticleHtml);
    console.log("📄 Generated HTML content length:", htmlContent.length);

    // Configure browser for environment
    console.log("📄 Configuring browser for environment...");
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === "production";

    let browser;
    if (!isServerless) {
      // Development/Local: Use regular puppeteer with built-in Chrome
      console.log("📄 Using local puppeteer for development");
      const puppeteerLocal = await import("puppeteer");
      browser = await puppeteerLocal.default.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    } else {
      // Serverless/Production: Use puppeteer-core with serverless Chrome
      console.log("📄 Using puppeteer-core with serverless Chrome");
      const puppeteerCore = await import("puppeteer-core");
      const chromium = await import("@sparticuz/chromium");

      browser = await puppeteerCore.default.launch({
        args: chromium.default.args,
        executablePath: await chromium.default.executablePath(),
        headless: true,
      });
    }

    console.log("📄 Browser launched, creating PDF...");

    const page = await browser.newPage();

    // Set content and wait for it to load
    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Generate PDF with proper options
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    await browser.close();
    console.log("✅ PDF generated successfully, size:", pdfBuffer.length);

    // Generate filename
    const sanitizedSlug = body.articleSlug.replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = `${sanitizedSlug}_v${body.versionDecimal}.pdf`;

    console.log("✅ PDF export completed:", filename);

    // Return the PDF file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("❌ Error in PDF export route:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
