// app/api/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generatePDFBuffer } from "@/lib/pdf";
import { generateDocx } from "@/lib/docx";
import { convertRichContentToHTML } from "@/lib/lexicalToHtml";

/**
 * API route to export article content as PDF or DOCX.
 * Accepts JSON with headline, richContent, slug, version, createdByName, and type.
 * Returns the file as a downloadable response.
 */
export async function POST(req: NextRequest) {
  try {
    const { headline, richContent, slug, version, createdByName, type } = await req.json();
    if (!headline || !richContent || !slug || !version || !createdByName || !type) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    let buffer: Uint8Array;
    let mime: string;
    let ext: string;

    if (type === "pdf") {
      const date = new Date().toLocaleString();
      const html = convertRichContentToHTML(richContent, {
        slug, version, createdByName, date, headline
      });
      buffer = await generatePDFBuffer(html);

      mime = "application/pdf";
      ext = "pdf";
    } else if (type === "docx") {
      buffer = await generateDocx({ headline, richContent, slug, version, createdByName });
      
      mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      ext = "docx";
    } else {
      return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
    }

    const filename = `${headline.replace(/\s+/g, "-").toLowerCase()}.${ext}`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Export API error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}