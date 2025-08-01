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

  // Return only the UL - let CSS handle the hanging indent on li elements
  return `<ul style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; margin: 0;">
  ${blobItems.map((blob) => `<li><strong>${blob}</strong></li>`).join("")}
  </ul>`;
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
          margin: 62pt 72pt 62pt 72pt;
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
          font-size: 12pt;
        }
        

        
        .title {
          font-size: 18pt;
          font-weight: bold;
          text-align: center;
          /* Increase space above title, decrease space below title */
          margin: 24pt 0;
          page-break-after: avoid;
        }

        .content {
          margin-top: 18pt;
        }
        
        .content p {
          margin: 8pt 0;
        }
        
        .content div {
          margin-bottom: 6pt;
        }
        
        ul {
          /* Add horizontal margins to make blobs tighter/more indented */
          margin: 6pt 0;
          padding-left: 20pt;
          list-style-position: outside;
        }

        /* Standard CSS for list items with hanging indent */
        li {
          margin: 6pt 0;
          padding-left: 2pt;
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
        
        h1 { font-size: 16px; }
        h2 { font-size: 15px; }
        h3 { font-size: 14px; }
        h4 { font-size: 13px; }
        h5 { font-size: 12px; }
        h6 { font-size: 11px; }
        
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
      <p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt; margin-bottom: 0pt;"><u><strong>Slug:</strong> ${data.articleSlug} <strong>Version:</strong> ${data.versionDecimal} <strong>Export by:</strong> sesha systems <strong>on:</strong> ${currentDate}</u></p>
      
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
    const articleHtml = body.articleHtml || "";
    console.log("📄 Article HTML length:", articleHtml.length);

    // Generate formatted HTML for PDF
    console.log("📄 Generating HTML content for PDF...");
    const htmlContent = generatePdfHtml(body, articleHtml);
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
      margin: {
        top: "20px",
        bottom: "30px",
        left: "20px",
        right: "20px",
      },
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
