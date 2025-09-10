// src/app/api/aggregate-steps/09-detect-rips/route.ts
// TODO: Uncomment (and modify if necessary) the below

/* ==========================================================================*/
// route.ts — Step 09: Detect Rips API Route
/* ==========================================================================*/
// Purpose: AI-powered plagiarism detection between generated article and sources
// Sections: Imports, Configuration, Prompts, Route Handler, Helper Functions

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// Next.js Core ---
import { NextRequest, NextResponse } from "next/server";

// AI SDK Core ---
import { generateText } from "ai";

// Local Utilities ---
import { formatPrompt2, PromptType, validateRequest } from "@/lib/utils";
import { createPipelineLogger } from "@/lib/pipeline-logger";

// External Packages ---
import * as cheerio from 'cheerio';

// Local Types ---
// import { Step09DetectRequest, Step09DetectRipsAIResponse } from "@/types/aggregate";
import { anthropic } from "@ai-sdk/anthropic";
import { Step09DetectRipsAIResponse, Step09DetectRipsRequest } from "@/types/aggregate";

/* ==========================================================================*/
// Configuration
/* ==========================================================================*/

const MODEL = anthropic("claude-3-5-sonnet-20240620");
const TEMPERATURE = 0.3;
const MAX_TOKENS = 4000;

/* ==========================================================================*/
// System Prompt
/* ==========================================================================*/

const SYSTEM_PROMPT = `
You are an expert plagiarism detection specialist. Your task is to analyze a generated article against its source materials to identify potential instances of text that is too closely worded to the original sources.

IMPORTANT: Quotes with proper attribution are NOT plagiarism. Only flag actual plagiarism where content is copied without appropriate credit or citation.

Your analysis should focus on:
1. Direct copying without quotation marks or attribution
2. Paraphrasing that is too close to original wording without citation
3. Sentence structures that mirror source material too closely without attribution
4. Mosaic/patchwork plagiarism (mixing phrases from different sources)

EXAMPLES OF PLAGIARISM (FLAG THESE):

1. VERBATIM COPYING WITHOUT ATTRIBUTION:
Source: "Climate change represents the greatest threat to global food security in the 21st century."
Article: "Climate change represents the greatest threat to global food security in the 21st century."
→ PLAGIARISM: Exact copy with no quotation marks or citation

2. INADEQUATE PARAPHRASE:
Source: "The rapid melting of Arctic ice caps is accelerating sea level rise at an unprecedented rate."
Article: "The quick melting of Arctic ice caps is speeding up sea level rise at an unprecedented pace."
→ PLAGIARISM: Only minor word changes while keeping original structure

3. MOSAIC PLAGIARISM:
Source 1: "Economic instability" Source 2: "threatens global markets"
Article: "Economic instability threatens global markets without addressing underlying causes."
→ PLAGIARISM: Combining phrases from multiple sources without attribution

EXAMPLES OF PROPER USAGE (DO NOT FLAG):

1. PROPER QUOTATION WITH ATTRIBUTION:
Article: 'According to the climate report, "Climate change represents the greatest threat to global food security in the 21st century."'
→ NOT PLAGIARISM: Proper quotation marks and attribution

2. PROPER PARAPHRASE WITH CITATION:
Source: "The rapid melting of Arctic ice caps is accelerating sea level rise at an unprecedented rate."
Article: "Scientists have found that Arctic ice loss is contributing significantly to rising ocean levels (Climate Study 2024)."
→ NOT PLAGIARISM: Ideas rephrased in new words with citation

3. COMMON KNOWLEDGE:
Article: "Water boils at 100 degrees Celsius at sea level."
→ NOT PLAGIARISM: Common knowledge doesn't require citation

4. FACTUAL INFORMATION WITH CONTEXT:
Source: "The study found 75% of respondents supported the policy."
Article: "Recent research indicates that three-quarters of those surveyed favored the new policy approach."
→ NOT PLAGIARISM: Facts presented in new context and wording

RESPONSE FORMAT:
You must respond with valid JSON in exactly this format:

{
  "analysis": "Your detailed analysis of the article's originality vs source similarity",
  "overallScore": 0-100,
  "quoteComparisons": [
    {
      "articleQuote": "exact text from article",
      "sourceQuote": "exact text from source", 
      "sourceNumber": 1-6,
      "ripAnalysis": "why this constitutes a rip"
    }
  ]
}

If you find no rips, use an empty array for quoteComparisons.
Score meanings: 0-20 (original), 21-40 (some similarity), 41-60 (moderate concerns), 61-80 (high similarity), 81-100 (major plagiarism).

ANALYSIS REQUIREMENTS:
1. **Be Comprehensive**: Analyze the ENTIRE article systematically, paragraph by paragraph
2. **Check All Sources**: Compare against ALL provided source materials, not just a few
3. **Multiple Instance Detection**: Look for ALL potential plagiarism instances - there may be many throughout the article
4. **Varying Severity**: Flag both obvious copying AND subtle cases of inadequate paraphrasing
5. **Complete Documentation**: Report every problematic passage you find, even if there are 10+ instances

Be thorough and systematic in your assessment. Your goal is to catch ALL plagiarism instances, not just the most obvious ones. Only exclude proper quotations, citations, or legitimate paraphrasing.
`;

/* ==========================================================================*/
// User Prompt
/* ==========================================================================*/

const USER_PROMPT = `
Please analyze the following generated article against its source materials for potential plagiarism or overly similar wording.

ANALYSIS INSTRUCTIONS:
1. Read through the ENTIRE generated article systematically
2. For each paragraph/section, check against ALL source materials
3. Look for verbatim copying, inadequate paraphrasing, and mosaic plagiarism
4. Document EVERY instance you find - do not stop at just 1-2 examples
5. Be especially vigilant for subtle plagiarism that maintains original sentence structure

GENERATED ARTICLE:
{{rewrittenArticle}}

SOURCE MATERIALS:
{{#sources}}
Source {{number}} ({{accredit}}):
{{text}}

{{/sources}}

Perform a comprehensive analysis and report ALL plagiarism instances you discover. Your thoroughness in finding every problematic passage is critical.
`;

/* ==========================================================================*/
// Assistant Prompt
/* ==========================================================================*/

// No assistant prompt needed - let AI respond naturally

/* ==========================================================================*/
// Route Handler
/* ==========================================================================*/

export async function POST(request: NextRequest) {
  try {
    const body: Step09DetectRipsRequest = await request.json();

    // DEBUG: Log what sources we received
    console.log("=== STEP 9 DEBUG ===");
    console.log("Number of sources received:", body.sources?.length || 0);
    console.log("Source numbers:", body.sources?.map(s => s.number) || []);
    console.log("Source accredits:", body.sources?.map(s => s.accredit) || []);
    console.log("==================");

    // Validate required fields ------
    const validationError = validateRequest(
      Boolean(body.articleStepOutputs?.colorCode?.text),
      {
        quoteComparisons: [],
        overallRipScore: 0,
        ripAnalysis: "",
        usage: []
      } as Step09DetectRipsAIResponse
    );
    if (validationError) return validationError;

    // Format System Prompt ------
    const finalSystemPrompt = formatPrompt2(SYSTEM_PROMPT, undefined, PromptType.SYSTEM);

    // Extract text the same way Lexical will display it (matching Step 8 logic)
    const colorCodedText = body.articleStepOutputs?.colorCode?.text || "";
    const cleanText = extractLexicalDisplayText(colorCodedText);

    // Format User Prompt ------
    const finalUserPrompt = formatPrompt2(
      USER_PROMPT,
      {
        rewrittenArticle: cleanText,
        sources: body.sources.map(source => ({
          number: source.number,
          url: source.url,
          text: source.text,
          accredit: source.accredit
        }))
      },
      PromptType.USER
    );

    // No assistant prompt needed

    // Create a route-specific logger for this step
    const logger = createPipelineLogger(`route-step09-${Date.now()}`, "aggregate");
    logger.logStepPrompts(9, "Detect Rips", finalSystemPrompt, finalUserPrompt, "");

    // Generate text
    const { text: ripAnalysis, usage } = await generateText({
      model: MODEL,
      system: finalSystemPrompt,
      messages: [
        {
          role: "user",
          content: finalUserPrompt
        },
        // No assistant prompt - let AI respond naturally
      ],
      temperature: TEMPERATURE,
      maxTokens: MAX_TOKENS
    });

    // Log the raw AI response for debugging
    console.log("=== RAW AI RESPONSE ===");
    console.log(ripAnalysis);
    console.log("=== END AI RESPONSE ===");

    // Parse the AI response to extract structured data
    const parsedResponse = parseRipAnalysisResponse(ripAnalysis);

    // Build response
    const response: Step09DetectRipsAIResponse = {
      quoteComparisons: parsedResponse.quoteComparisons,
      overallRipScore: parsedResponse.overallRipScore,
      ripAnalysis: parsedResponse.ripAnalysis,
      usage: [
        {
          inputTokens: usage?.promptTokens ?? 0,
          outputTokens: usage?.completionTokens ?? 0,
          model: MODEL.modelId,
          ...usage
        }
      ]
    };

    logger.logStepResponse(9, "Detect Rips", response);

    // Close the logger to ensure logs are flushed
    await logger.close();

    return NextResponse.json(response);
  } catch (error) {
    console.error("Step 09 - Detect rips failed: ", error);

    const errorResponse: Step09DetectRipsAIResponse = {
      quoteComparisons: [],
      overallRipScore: 0,
      ripAnalysis: "",
      usage: []
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/* ==========================================================================*/
// Helper Functions
/* ==========================================================================*/

/**
 * extractLexicalDisplayText
 * 
 * Extracts text from color-coded HTML exactly as Lexical will display it.
 * Uses the same cheerio parsing logic as Step 8 to ensure text matching consistency.
 * 
 * @param colorCodedHtml - HTML with color-coded spans from Step 8
 * @returns Clean text string that matches Lexical's text content
 */
function extractLexicalDisplayText(colorCodedHtml: string): string {
  const $ = cheerio.load(colorCodedHtml);
  
  const textParts: string[] = [];
  
  $("p").each((_, p) => {
    const paragraphParts: string[] = [];
    
    $(p).find("span").each((_, span) => {
      const text = $(span).text().trim();
      if (text) {
        paragraphParts.push(text);
      }
    });
    
    if (paragraphParts.length > 0) {
      textParts.push(paragraphParts.join(' '));
    }
  });
  
  return textParts.join('\n').replace(/\s+/g, ' ').trim();
}

/**
 * parseRipAnalysisResponse
 *
 * Parse the AI response as JSON to extract structured rip analysis data.
 * Much simpler than XML parsing - just use JSON.parse().
 *
 * @param aiResponse - Raw AI response text (should be JSON)
 * @returns Parsed rip analysis with quote comparisons and score
 */
function parseRipAnalysisResponse(aiResponse: string): {
  quoteComparisons: Array<{
    articleQuote: string;
    sourceQuote: string;
    sourceNumber: number;
    ripAnalysis: string;
  }>;
  overallRipScore: number;
  ripAnalysis: string;
} {
  try {
    // Simply parse as JSON - much more reliable than regex
    const parsed = JSON.parse(aiResponse);
    
    return {
      quoteComparisons: parsed.quoteComparisons || [],
      overallRipScore: Math.max(0, Math.min(100, parsed.overallScore || 0)),
      ripAnalysis: parsed.analysis || "No analysis provided",
    };
  } catch (error) {
    console.error("Failed to parse rip analysis JSON response:", error);
    console.log("Raw AI response that caused error:", aiResponse);
    
    // Fallback: try to extract any JSON-like content from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log("Successfully parsed JSON from partial match");
        return {
          quoteComparisons: parsed.quoteComparisons || [],
          overallRipScore: Math.max(0, Math.min(100, parsed.overallScore || 0)),
          ripAnalysis: parsed.analysis || "Partial analysis recovered",
        };
      } catch (fallbackError) {
        console.error("Fallback JSON parsing also failed:", fallbackError);
      }
    }
    
    // Final fallback
    return {
      quoteComparisons: [],
      overallRipScore: 0,
      ripAnalysis: "Error parsing AI response - please check logs for full response",
    };
  }
}