/* ==========================================================================*/
// route.ts — API endpoint for scraping URLs using FireCrawl
/* ==========================================================================*/
// Purpose: Handle POST requests to scrape web content from provided URLs
// Sections: Imports, Types, Helpers, Route Handlers

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// Next.js core ---
import { NextRequest, NextResponse } from "next/server";

// AI SDK Core ---
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";  

// Local modules ---
import { scrapeUrl } from "@/lib/firecrawl2";
import type { ScrapeOptions } from "@/lib/firecrawl2";

/* ==========================================================================*/
// Configuration
/* ==========================================================================*/

const MODEL = openai("gpt-4o-mini");
const TEMPERATURE = 0.1;
const MAX_TOKENS = 4000;

/* ==========================================================================*/
// Types and Interfaces
/* ==========================================================================*/

interface ScrapeRequestBody {
  /** The URL to scrape */
  url: string;
  /** Optional scraping configuration */
  options?: ScrapeOptions;
}

interface ScrapeResponse {
  /** Whether the scraping was successful */
  success: boolean;
  /** The scraped content data */
  data?: unknown;
  /** Error message if scraping failed */
  error?: string;
}

interface FireCrawlResponse {
  success: boolean;
  markdown?: string;
}

/* ==========================================================================*/
// System Prompts
/* ==========================================================================*/

const CONTENT_EXTRACTION_PROMPT = `
You are a content extraction specialist. Your task is to extract ONLY the main article content from the provided text, keeping it WORD FOR WORD with NO CHANGES whatsoever.

INSTRUCTIONS:
- Extract the title if clearly present at the beginning of the article
- Extract the author/byline if clearly present (usually near the title or beginning)
- Extract only the main article content body
- Keep every word exactly as written - do not change, paraphrase, or summarize anything
- Remove navigation menus, ads, sidebars, related articles, comments, headers, footers
- Remove any content that is not part of the main article body
- If you encounter multiple articles, only include the first/main article
- Stop immediately if the content transitions to another article
- Preserve the original formatting and paragraph structure
- Do not add any introductory or concluding text
- DO NOT make up or infer any title or author information - only include if explicitly present
- Output only the extracted content, nothing else

FORMAT:
If title and/or author are found, include them at the beginning:
[Title if found]
[Author/byline if found]

[Main article content]

do not include the [] brackets in your response!

If there is no clear main article content, respond with empty string ("").
`;

/* ==========================================================================*/
// Helpers
/* ==========================================================================*/

/**
 * validateUrl
 *
 * Validate that a string is a proper URL.
 *
 * @param url - String to validate as URL
 * @returns Whether the string is a valid URL
 */
function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * extractRawText
 *
 * Removes all Markdown formatting and returns plain text.
 *
 * @param markdown - Markdown string
 * @returns Plain text string
 */
import removeMarkdown from "remove-markdown";

function extractRawText(markdown: string): string {
  return removeMarkdown(markdown || "");
}

/**
 * extractMainContent
 *
 * Uses AI to extract only the main article content word-for-word.
 *
 * @param plainText - Raw plain text from webpage
 * @returns Main article content only
 */
async function extractMainContent(plainText: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: MODEL,
      system: CONTENT_EXTRACTION_PROMPT,
      prompt: plainText,
      temperature: TEMPERATURE,
      maxTokens: MAX_TOKENS,
    });

    return text.trim();
  } catch (error) {
    console.error("AI content extraction failed:", error);
    // Fallback to original text if AI fails
    return plainText;
  }
}

/* ==========================================================================*/
// Route Handlers
/* ==========================================================================*/

/**
 * POST
 *
 * Scrape content from a provided URL using FireCrawl and extract main content.
 *
 * @param request - NextRequest containing URL and options in body
 * @returns JSON response with main article content or error
 *
 * @example
 * POST /api/get-source-text
 * Body: { "url": "https://example.com", "options": { "formats": ["markdown"] } }
 */
export async function POST(request: NextRequest): Promise<NextResponse<ScrapeResponse>> {
  try {
    // Parse request body
    const body: ScrapeRequestBody = await request.json();

    // Validate required fields
    if (!body.url) {
      return NextResponse.json(
        {
          success: false,
          error: "URL is required",
        },
        { status: 400 }
      );
    }

    // Validate URL format
    if (!validateUrl(body.url)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid URL format",
        },
        { status: 400 }
      );
    }

    // Scrape the URL
    const scrapedData = (await scrapeUrl(body.url, body.options || {})) as FireCrawlResponse;

    // Validate FireCrawl response success
    if (!scrapedData.success) {
      throw new Error("FireCrawl scraping failed");
    }

    // Extract plain text from the scraped markdown content
    const markdownContent = scrapedData.markdown || "";
    console.log("markdownContent", markdownContent);
    const plainText = extractRawText(markdownContent);

    // Use AI to extract only the main article content
    const mainContent = await extractMainContent(plainText);

    console.log("The raw content was", plainText);
    console.log("The main content now is", mainContent);

    return NextResponse.json({
      success: true,
      data: mainContent,
    });
  } catch (error) {
    console.error("Scraping error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to scrape URL",
      },
      { status: 500 }
    );
  }
}

/* ==========================================================================*/
// Public API Exports
/* ==========================================================================*/

export type { ScrapeRequestBody, ScrapeResponse };
