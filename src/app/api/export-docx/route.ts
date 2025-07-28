import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType, Footer, SimpleField } from "docx";

/* ==========================================================================*/
// Types
/* ==========================================================================*/

// Lexical node types
interface LexicalTextNode {
  type: 'text';
  text: string;
  format?: number;
  style?: string;
}

interface LexicalParagraphNode {
  type: 'paragraph';
  children?: LexicalNode[];
}

interface LexicalHeadingNode {
  type: 'heading';
  tag?: string;
  children?: LexicalNode[];
}

interface LexicalQuoteNode {
  type: 'quote';
  children?: LexicalNode[];
}

interface LexicalListNode {
  type: 'list';
  listType?: 'bullet' | 'number' | 'check';
  children?: LexicalNode[];
}

interface LexicalListItemNode {
  type: 'listitem';
  checked?: boolean;
  children?: LexicalNode[];
}

type LexicalNode = LexicalTextNode | LexicalParagraphNode | LexicalHeadingNode | LexicalQuoteNode | LexicalListNode | LexicalListItemNode;

interface LexicalRoot {
  root: {
    children?: LexicalNode[];
  };
}

interface ExportDocxRequest {
  richContent: string; // Lexical JSON content - always required
  articleHeadline: string;
  articleSlug: string;
  versionDecimal: string;
  blobs?: string;
}

/* ==========================================================================*/
// Helper Functions
/* ==========================================================================*/

/**
 * formatBlobsAsParagraphs
 * 
 * Converts blob text to docx Paragraph objects
 */
function formatBlobsAsParagraphs(blobText: string): Paragraph[] {
  if (!blobText) return [];
  
  const blobItems = blobText
    .split('\n')
    .map(blob => blob.trim())
    .filter(blob => blob.length > 0);

  if (blobItems.length === 0) return [];

  return blobItems.map(blob => 
    new Paragraph({
      children: [
        new TextRun({
          text: `• ${blob}`,
          font: "Times New Roman",
          size: 24, // 12pt
        })
      ],
      spacing: {
        before: 120, // 6pt
        after: 120, // 6pt
      },
      indent: {
        left: 720, // 0.5 inch
      }
    })
  );
}

/**
 * convertColorToHex
 * 
 * Converts the 6 specific colors used by the AI to hex values
 * Only supports: black, darkblue, darkred, green, purple, orange
 */
function convertColorToHex(color: string): string {
  const colorMap: { [key: string]: string } = {
    'black': '000000',
    'darkblue': '00008B', 
    'darkred': '8B0000',
    'green': '008000',
    'purple': '800080',
    'orange': 'FFA500'
  };

  // Clean the color string
  const cleanColor = color.trim().toLowerCase();

  // If it's already a hex value, return it (without # prefix)
  if (cleanColor.startsWith('#')) {
    const hexValue = cleanColor.substring(1);
    if (/^[0-9A-Fa-f]{6}$/.test(hexValue)) {
      return hexValue.toUpperCase();
    }
  }

  // If it's a 6-character hex without #, validate and return
  if (/^[0-9A-Fa-f]{6}$/.test(cleanColor)) {
    return cleanColor.toUpperCase();
  }

  // If it's one of our supported colors, convert it
  const hexValue = colorMap[cleanColor];
  if (hexValue) {
    return hexValue;
  }

  // Default to black if we can't convert
  console.warn(`⚠️ Unknown color: ${color}, defaulting to black`);
  return '000000';
}

/**
 * generateDocxDocument
 * 
 * Creates a docx Document with proper styling
 */
function generateDocxDocument(data: ExportDocxRequest): Document {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short", 
    day: "numeric",
    year: "numeric"
  });

  const blobsParagraphs = data.blobs ? formatBlobsAsParagraphs(data.blobs) : [];
  
  // Always use Lexical JSON parsing
  const contentParagraphs = parseLexicalJsonToParagraphs(data.richContent);

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 24, // 12pt
            color: "000000", // Black text by default
          },
        },
      },
    },
    background: {
      color: "FFFFFF", // Explicitly set document background to white
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 12240, // Letter width in twips
              height: 15840, // Letter height in twips
            },
            margin: {
              top: 1440, // 1 inch
              right: 1800, // 1.25 inches
              bottom: 1440, // 1 inch
              left: 1800, // 1.25 inches
            },
          },
        },
        headers: {
          default: undefined, // No header
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new SimpleField("PAGE"),
                ],
                alignment: AlignmentType.LEFT, // Left align the page number
                spacing: {
                  before: 0,
                  after: 0,
                },
              }),
            ],
          }),
        },
        children: [
          // Metadata paragraph
          new Paragraph({
            children: [
              new TextRun({
                text: "Slug: ",
                font: "Arial",
                size: 18, // 9pt
                color: "000000", // Explicitly black
                bold: true,
                underline: {
                  type: UnderlineType.SINGLE,
                },
              }),
              new TextRun({
                text: `${data.articleSlug} `,
                font: "Arial",
                size: 18, // 9pt
                color: "000000", // Explicitly black
                underline: {
                  type: UnderlineType.SINGLE,
                },
              }),
              new TextRun({
                text: "Version: ",
                font: "Arial",
                size: 18, // 9pt
                color: "000000", // Explicitly black
                bold: true,
                underline: {
                  type: UnderlineType.SINGLE,
                },
              }),
              new TextRun({
                text: `${data.versionDecimal} `,
                font: "Arial",
                size: 18, // 9pt
                color: "000000", // Explicitly black
                underline: {
                  type: UnderlineType.SINGLE,
                },
              }),
              new TextRun({
                text: "Export by: ",
                font: "Arial",
                size: 18, // 9pt
                color: "000000", // Explicitly black
                bold: true,
                underline: {
                  type: UnderlineType.SINGLE,
                },
              }),
              new TextRun({
                text: "sesha systems ",
                font: "Arial",
                size: 18, // 9pt
                color: "000000", // Explicitly black
                underline: {
                  type: UnderlineType.SINGLE,
                },
              }),
              new TextRun({
                text: "on: ",
                font: "Arial",
                size: 18, // 9pt
                color: "000000", // Explicitly black
                bold: true,
                underline: {
                  type: UnderlineType.SINGLE,
                },
              }),
              new TextRun({
                text: currentDate,
                font: "Arial",
                size: 18, // 9pt
                color: "000000", // Explicitly black
                underline: {
                  type: UnderlineType.SINGLE,
                },
              }),
            ],
            spacing: {
              before: 0,
              after: 480, // 24pt
            },
          }),

          // Main headline
          new Paragraph({
            children: [
              new TextRun({
                text: data.articleHeadline,
                font: "Times New Roman",
                size: 44, // 22pt
                bold: true,
                color: "000000", // Explicitly black
              })
            ],
            spacing: {
              before: 240, // 12pt
              after: 240, // 12pt
              line: 264, // 1.2 line height
            },
            alignment: AlignmentType.CENTER,
          }),

          // Blob paragraphs
          ...blobsParagraphs,

          // Spacer after blobs
          new Paragraph({
            children: [
              new TextRun({
                text: "",
              })
            ],
            spacing: {
              before: 0,
              after: 360, // 18pt extra space after blobs
            },
          }),

          // Content paragraphs
          ...contentParagraphs,
        ],
      },
    ],
  });
}

/**
 * parseLexicalJsonToParagraphs
 * 
 * Converts Lexical JSON content directly to docx Paragraph objects
 * This preserves user formatting (bold, italic, underline, strikethrough) and color styling
 */
function parseLexicalJsonToParagraphs(richContentJson: string): Paragraph[] {
  if (!richContentJson) return [];

  try {
    const lexicalData = JSON.parse(richContentJson) as LexicalRoot;
    const paragraphs: Paragraph[] = [];

    // Process each node in the root
    lexicalData.root?.children?.forEach((node: LexicalNode) => {
      switch (node.type) {
        case 'paragraph':
          paragraphs.push(...processParagraphNode(node));
          break;
        case 'heading':
          paragraphs.push(...processHeadingNode(node));
          break;
        case 'quote':
          paragraphs.push(...processQuoteNode(node));
          break;
        case 'list':
          paragraphs.push(...processListNode(node));
          break;
        case 'listitem':
          paragraphs.push(...processListItemNode(node));
          break;
        default:
          // For unknown node types, skip them
          break;
      }
    });

    return paragraphs;
  } catch (error) {
    console.error("❌ Error parsing Lexical JSON:", error);
    return [];
  }
}

/**
 * processParagraphNode
 * 
 * Processes a paragraph node and returns DocX paragraphs
 */
function processParagraphNode(paragraphNode: LexicalParagraphNode): Paragraph[] {
  const textRuns: TextRun[] = [];

  // Process each text node in the paragraph
  paragraphNode.children?.forEach((textNode: LexicalNode) => {
    if (textNode.type === 'text') {
      const textNodeTyped = textNode as LexicalTextNode;
      // Extract formatting from Lexical format field
      const format = textNodeTyped.format || 0;
      const isBold = (format & 1) !== 0;      // Bold
      const isItalic = (format & 2) !== 0;    // Italic  
      const isUnderline = (format & 8) !== 0; // Underline (bit 8)
      const isStrikethrough = (format & 4) !== 0; // Strikethrough (bit 4)

      // Extract color from style attribute
      let color = "000000"; // Default black
      if (textNodeTyped.style) {
        const colorMatch = textNodeTyped.style.match(/color:\s*([^;]+)/i);
        if (colorMatch) {
          const colorValue = colorMatch[1].trim();
          color = convertColorToHex(colorValue);
        }
      }

      // Create TextRun with all formatting
      const textRun = new TextRun({
        text: textNodeTyped.text || "",
        font: "Times New Roman",
        size: 24,
        color: color,
        bold: isBold,
        italics: isItalic,
        underline: isUnderline ? { type: UnderlineType.SINGLE } : undefined,
        strike: isStrikethrough,
      });

      textRuns.push(textRun);
    }
  });

  // Create paragraph with all text runs
  if (textRuns.length > 0) {
    const paragraph = new Paragraph({
      children: textRuns,
      spacing: {
        before: 120, // 6pt
        after: 120,  // 6pt
        line: 264,   // 1.2 line height
      },
    });
    return [paragraph];
  }

  return [];
}

/**
 * processHeadingNode
 * 
 * Processes a heading node and returns DocX paragraphs
 */
function processHeadingNode(headingNode: LexicalHeadingNode): Paragraph[] {
  const textRuns: TextRun[] = [];
  const level = headingNode.tag || 'h1'; // Default to h1 if no tag specified

  // Process each text node in the heading
  headingNode.children?.forEach((textNode: LexicalNode) => {
    if (textNode.type === 'text') {
      const textNodeTyped = textNode as LexicalTextNode;
      // Extract formatting and color (same as paragraph)
      const format = textNodeTyped.format || 0;
      const isBold = (format & 1) !== 0;
      const isItalic = (format & 2) !== 0;
      const isUnderline = (format & 8) !== 0; // Underline (bit 8)
      const isStrikethrough = (format & 4) !== 0; // Strikethrough (bit 4)

      let color = "000000";
      if (textNodeTyped.style) {
        const colorMatch = textNodeTyped.style.match(/color:\s*([^;]+)/i);
        if (colorMatch) {
          const colorValue = colorMatch[1].trim();
          color = convertColorToHex(colorValue);
        }
      }

      // Determine font size based on heading level
      let fontSize = 44; // Default h1 size
      switch (level) {
        case 'h1': fontSize = 44; break; // 22pt
        case 'h2': fontSize = 36; break; // 18pt
        case 'h3': fontSize = 32; break; // 16pt
        case 'h4': fontSize = 28; break; // 14pt
        case 'h5': fontSize = 24; break; // 12pt
        case 'h6': fontSize = 20; break; // 10pt
      }

      const textRun = new TextRun({
        text: textNodeTyped.text || "",
        font: "Times New Roman",
        size: fontSize,
        color: color,
        bold: isBold || true, // Headings are typically bold
        italics: isItalic,
        underline: isUnderline ? { type: UnderlineType.SINGLE } : undefined,
        strike: isStrikethrough,
      });

      textRuns.push(textRun);
    }
  });

  if (textRuns.length > 0) {
    const paragraph = new Paragraph({
      children: textRuns,
      spacing: {
        before: 240, // 12pt
        after: 120,  // 6pt
        line: 264,   // 1.2 line height
      },
    });
    return [paragraph];
  }

  return [];
}

/**
 * processQuoteNode
 * 
 * Processes a quote node and returns DocX paragraphs
 */
function processQuoteNode(quoteNode: LexicalQuoteNode): Paragraph[] {
  const textRuns: TextRun[] = [];

  // Process each text node in the quote
  quoteNode.children?.forEach((textNode: LexicalNode) => {
    if (textNode.type === 'text') {
      const textNodeTyped = textNode as LexicalTextNode;
      // Extract formatting and color (same as paragraph)
      const format = textNodeTyped.format || 0;
      const isBold = (format & 1) !== 0;
      const isItalic = (format & 2) !== 0;
      const isUnderline = (format & 8) !== 0; // Underline (bit 8)
      const isStrikethrough = (format & 4) !== 0; // Strikethrough (bit 4)

      let color = "000000";
      if (textNodeTyped.style) {
        const colorMatch = textNodeTyped.style.match(/color:\s*([^;]+)/i);
        if (colorMatch) {
          const colorValue = colorMatch[1].trim();
          color = convertColorToHex(colorValue);
        }
      }

      const textRun = new TextRun({
        text: textNodeTyped.text || "",
        font: "Times New Roman",
        size: 24,
        color: color,
        bold: isBold,
        italics: isItalic || true, // Quotes are typically italic
        underline: isUnderline ? { type: UnderlineType.SINGLE } : undefined,
        strike: isStrikethrough,
      });

      textRuns.push(textRun);
    }
  });

  if (textRuns.length > 0) {
    const paragraph = new Paragraph({
      children: textRuns,
      spacing: {
        before: 120,
        after: 120,
        line: 264,
      },
      indent: {
        left: 720, // 0.5 inch left indent for quotes
        right: 720, // 0.5 inch right indent for quotes
      },
    });
    return [paragraph];
  }

  return [];
}

/**
 * processListNode
 * 
 * Processes a list node and returns DocX paragraphs
 */
function processListNode(listNode: LexicalListNode): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const listType = listNode.listType || 'bullet'; // bullet, number, check

  // Process each list item
  listNode.children?.forEach((listItemNode: LexicalNode, index: number) => {
    if (listItemNode.type === 'listitem') {
      const listItemParagraphs = processListItemNode(listItemNode, listType, index + 1);
      paragraphs.push(...listItemParagraphs);
    }
  });

  return paragraphs;
}

/**
 * processListItemNode
 * 
 * Processes a list item node and returns DocX paragraphs
 */
function processListItemNode(listItemNode: LexicalListItemNode, listType: string = 'bullet', itemNumber: number = 1): Paragraph[] {
  const textRuns: TextRun[] = [];

  // Process each text node in the list item
  listItemNode.children?.forEach((textNode: LexicalNode) => {
    if (textNode.type === 'text') {
      const textNodeTyped = textNode as LexicalTextNode;
      // Extract formatting and color (same as paragraph)
      const format = textNodeTyped.format || 0;
      const isBold = (format & 1) !== 0;
      const isItalic = (format & 2) !== 0;
      const isUnderline = (format & 8) !== 0; // Underline (bit 8)
      const isStrikethrough = (format & 4) !== 0; // Strikethrough (bit 4)

      let color = "000000";
      if (textNodeTyped.style) {
        const colorMatch = textNodeTyped.style.match(/color:\s*([^;]+)/i);
        if (colorMatch) {
          const colorValue = colorMatch[1].trim();
          color = convertColorToHex(colorValue);
        }
      }

      const textRun = new TextRun({
        text: textNodeTyped.text || "",
        font: "Times New Roman",
        size: 24,
        color: color,
        bold: isBold,
        italics: isItalic,
        underline: isUnderline ? { type: UnderlineType.SINGLE } : undefined,
        strike: isStrikethrough,
      });

      textRuns.push(textRun);
    }
  });

  if (textRuns.length > 0) {
    // Create bullet point or numbered list item
    let bulletText = "•";
    if (listType === 'number') {
      bulletText = `${itemNumber}.`;
    } else if (listType === 'check') {
      bulletText = listItemNode.checked ? "☑" : "☐";
    }

    const bulletRun = new TextRun({
      text: bulletText + " ",
      font: "Times New Roman",
      size: 24,
      color: "000000",
    });

    const paragraph = new Paragraph({
      children: [bulletRun, ...textRuns],
      spacing: {
        before: 60,  // 3pt
        after: 60,   // 3pt
        line: 264,   // 1.2 line height
      },
      indent: {
        left: 360,   // 0.25 inch left indent for list items
        hanging: 240, // 0.15 inch hanging indent
      },
    });

    return [paragraph];
  }

  return [];
}

/* ==========================================================================*/
// Route Handler
/* ==========================================================================*/

export async function POST(request: NextRequest) {
  try {
    const data: ExportDocxRequest = await request.json();
    
    // Validate that we have richContent
    if (!data.richContent) {
      return NextResponse.json({ error: "richContent must be provided" }, { status: 400 });
    }

    console.log("🚀 Starting DOCX export");

    // Generate the DOCX document
    const doc = generateDocxDocument(data);
    
    // Pack the document into a buffer
    const buffer = await Packer.toBuffer(doc);
    
    console.log("✅ DOCX export completed successfully");
    
    // Return the DOCX file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${data.articleSlug}-v${data.versionDecimal}.docx"`,
      },
    });
  } catch (error) {
    console.error("❌ DOCX export error:", error);
    return NextResponse.json({ error: "Failed to generate DOCX" }, { status: 500 });
  }
} 