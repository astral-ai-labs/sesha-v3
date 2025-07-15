// lib/docx.ts
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  BorderStyle,
  HeadingLevel,
  ShadingType,
  AlignmentType,
} from "docx";

export interface ExportOptions {
  headline: string;
  richContent: string;
  slug: string;
  version: string;
  author: string;
}

export async function generateDocx({
  headline,
  richContent,
  slug,
  version,
  author,
}: ExportOptions): Promise<Uint8Array> {
  // Parse Lexical JSON
  const parsed = JSON.parse(richContent);

  // Helper: convert text node to TextRun
  function runsForText(node: any): TextRun {
    const opts: any = { text: node.text || "" };
    if (node.format & 1) opts.bold = true;
    if (node.format & 2) opts.italics = true;
    if (node.format & 4) opts.strike = true;
    if (node.format & 8) opts.underline = true;
    if (node.format & 16) {
      opts.font = "Courier New";
      opts.shading = { type: ShadingType.CLEAR, fill: "F3F4F6" };
    }
    const style: string = node.style || "";
    const colorMatch = /color:\s*#([0-9A-Fa-f]{6})/.exec(style);
    if (colorMatch) opts.color = colorMatch[1];
    const bgMatch = /background-color:\s*#([0-9A-Fa-f]{6})/.exec(style);
    if (bgMatch) opts.shading = { type: ShadingType.CLEAR, fill: bgMatch[1] };
    return new TextRun(opts);
  }

  // Build paragraphs
  function buildParagraphs(nodes: any[]): Paragraph[] {
    const paras: Paragraph[] = [];
    for (const node of nodes) {
      let runs = [];
      switch (node.type) {
        case "heading": {
          runs = (node.children || []).map(runsForText);
          paras.push(
            new Paragraph({
              children: runs,
              heading: node.tag === 'h1' ? HeadingLevel.HEADING_1 : node.tag === 'h3' ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 120 },
            })
          );
          break;
        }
        case "paragraph": {
          runs = (node.children || []).map(runsForText);
          paras.push(
            new Paragraph({
              children: runs,
              spacing: { before: 120, after: 120 },
            })
          );
          break;
        }
        case "quote": {
          runs = (node.children || []).map(runsForText);
          paras.push(
            new Paragraph({
              children: runs,
              border: { left: { style: BorderStyle.SINGLE, size: 2, color: "BFBFBF" } },
              spacing: { before: 120, after: 120 },
              indent: { left: 720 },
            })
          );
          break;
        }
        case "list": {
          const items = node.children || [];
          if (node.listType === "check") {
            for (const item of items) {
              runs = (item.children || []).map(runsForText);
              paras.push(
                new Paragraph({
                  children: [new TextRun({ text: item.checked ? "☑ " : "☐ " }), ...runs],
                  spacing: { before: 100, after: 100 },
                  indent: { left: 720 },
                })
              );
            }
          } else if (node.listType === "number") {
            for (const item of items) {
              runs = (item.children || []).map(runsForText);
              paras.push(
                new Paragraph({
                  children: [new TextRun({ text: `${item.value ?? 1}. ` }), ...runs],
                  spacing: { before: 100, after: 100 },
                  indent: { left: 720 },
                })
              );
            }
          } else {
            for (const item of items) {
              runs = (item.children || []).map(runsForText);
              paras.push(
                new Paragraph({
                  children: runs,
                  bullet: { level: 0 },
                  spacing: { before: 100, after: 100 },
                  indent: { left: 720 },
                })
              );
            }
          }
          break;
        }
      }
    }
    return paras;
  }

  // Metadata, HR, Title
  const now = new Date().toLocaleString();
  const metaText = `Slug: ${slug}  Version: ${version}  Export by: ${author} on ${now}`;
  const metaParagraph = new Paragraph({
    children: [new TextRun({ text: metaText, italics: true })],
    spacing: { after: 200 },
  });
  const hrParagraph = new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "auto" } },
    spacing: { before: 100, after: 100 },
  });
  const titleParagraph = new Paragraph({
    text: headline,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 240 },
  });

  // Body
  const bodyParagraphs = buildParagraphs(parsed.root.children || []);

  // Assemble
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [metaParagraph, hrParagraph, titleParagraph, ...bodyParagraphs],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}
