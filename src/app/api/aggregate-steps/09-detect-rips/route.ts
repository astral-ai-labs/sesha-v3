// // src/app/api/aggregate-steps/09-detect-rips/route.ts
// // TODO: Uncomment (and modify if necessary) the below

// /* ==========================================================================*/
// // route.ts — Step 09: Detect Rips API Route
// /* ==========================================================================*/
// // Purpose: AI-powered plagiarism detection between generated article and sources
// // Sections: Imports, Configuration, Prompts, Route Handler, Helper Functions

// /* ==========================================================================*/
// // Imports
// /* ==========================================================================*/

// // Next.js Core ---
// import { NextRequest, NextResponse } from "next/server";

// // AI SDK Core ---
// import { generateText } from "ai";

// // Local Utilities ---
// import { formatPrompt2, PromptType, validateRequest } from "@/lib/utils";
// import { createPipelineLogger } from "@/lib/pipeline-logger";

// // Local Types ---
// // import { Step09DetectRequest, Step09DetectRipsAIResponse } from "@/types/aggregate";
// import { anthropic } from "@ai-sdk/anthropic";

// /* ==========================================================================*/
// // Configuration
// /* ==========================================================================*/

// const MODEL = anthropic("claude-3-5-sonnet-20240620");
// const TEMPERATURE = 0.3;
// const MAX_TOKENS = 4000;

// /* ==========================================================================*/
// // System Prompt
// /* ==========================================================================*/

// const SYSTEM_PROMPT = `
// You are an expert plagiarism detection specialist. Your task is to analyze a generated article against its source materials to identify potential instances of text that is too closely worded to the original sources.

// Your analysis should focus on:
// 1. Direct quotes that are too similar to source text
// 2. Paraphrasing that is too close to original wording
// 3. Sentence structures that mirror source material too closely
// 4. Overall similarity assessment

// For each potential rip, provide:
// - The specific text from the generated article
// - The corresponding text from the source
// - A brief analysis of why this constitutes a rip

// Output a rip score from 0-100 where:
// - 0-20: Original content with minimal similarity
// - 21-40: Some similarity but generally original
// - 41-60: Moderate similarity, some concerns
// - 61-80: High similarity, significant concerns
// - 81-100: Very high similarity, major plagiarism concerns

// Be thorough but fair in your assessment.
// `;

// /* ==========================================================================*/
// // User Prompt
// /* ==========================================================================*/

// const USER_PROMPT = `
// Please analyze the following generated article against its source materials for potential plagiarism or overly similar wording.

// GENERATED ARTICLE:
// {rewrittenArticle}

// SOURCE MATERIALS:
// {sources}

// Analyze each potential rip and provide your assessment.
// `;

// /* ==========================================================================*/
// // Assistant Prompt
// /* ==========================================================================*/

// const ASSISTANT_PROMPT = `
// I'll analyze the generated article against the source materials for potential plagiarism. Let me examine the text carefully and provide a detailed assessment.

// <analysis>
// {ripAnalysis}
// </analysis>

// <quote-comparisons>
// {quoteComparisons}
// </quote-comparisons>

// <overall-score>
// {overallRipScore}
// </overall-score>
// `;

// /* ==========================================================================*/
// // Route Handler
// /* ==========================================================================*/

// export async function POST(request: NextRequest) {
//   try {
//     const body: Step09DetectRipsRequest = await request.json();

//     // Validate required fields ------
//     const validationError = validateRequest(
//       Boolean(body.articleStepOutputs?.rewriteArticle2?.text),
//       {
//         quoteComparisons: [],
//         overallRipScore: 0,
//         ripAnalysis: ""
//       } as Step09DetectRipsAIResponse
//     );
//     if (validationError) return validationError;

//     // Format System Prompt ------
//     const finalSystemPrompt = formatPrompt2(SYSTEM_PROMPT, undefined, PromptType.SYSTEM);

//     // Format User Prompt ------
//     const finalUserPrompt = formatPrompt2(
//       USER_PROMPT,
//       {
//         rewrittenArticle: body.articleStepOutputs?.rewriteArticle2?.text || "",
//         sources: body.sources.map(source => ({
//           number: source.number,
//           url: source.url,
//           text: source.text,
//           accredit: source.accredit
//         }))
//       },
//       PromptType.USER
//     );

//     // Format Assistant Prompt ------
//     const finalAssistantPrompt = formatPrompt2(ASSISTANT_PROMPT, undefined, PromptType.ASSISTANT);

//     // Create a route-specific logger for this step
//     const logger = createPipelineLogger(`route-step09-${Date.now()}`, "aggregate");
//     logger.logStepPrompts(9, "Detect Rips", finalSystemPrompt, finalUserPrompt, finalAssistantPrompt);

//     // Generate text
//     const { text: ripAnalysis, usage } = await generateText({
//       model: MODEL,
//       system: finalSystemPrompt,
//       messages: [
//         {
//           role: "user",
//           content: finalUserPrompt
//         },
//         {
//           role: "assistant",
//           content: finalAssistantPrompt || "",
//         }
//       ],
//       temperature: TEMPERATURE,
//       maxTokens: MAX_TOKENS
//     });

//     // Parse the AI response to extract structured data
//     const parsedResponse = parseRipAnalysisResponse(ripAnalysis);

//     // Build response
//     const response: Step09DetectRipsAIResponse = {
//       quoteComparisons: parsedResponse.quoteComparisons,
//       overallRipScore: parsedResponse.overallRipScore,
//       ripAnalysis: parsedResponse.ripAnalysis,
//       usage: [
//         {
//           inputTokens: usage?.promptTokens ?? 0,
//           outputTokens: usage?.completionTokens ?? 0,
//           model: MODEL.modelId,
//           ...usage
//         }
//       ]
//     };

//     logger.logStepResponse(9, "Detect Rips", response);

//     // Close the logger to ensure logs are flushed
//     await logger.close();

//     return NextResponse.json(response);
//   } catch (error) {
//     console.error("Step 09 - Detect rips failed: ", error);

//     const errorResponse: Step09DetectRipsAIResponse = {
//       quoteComparisons: [],
//       overallRipScore: 0,
//       ripAnalysis: "",
//       usage: []
//     };

//     return NextResponse.json(errorResponse, { status: 500 });
//   }
// }

// /* ==========================================================================*/
// // Helper Functions
// /* ==========================================================================*/

// /**
//  * parseRipAnalysisResponse
//  *
//  * Parse the AI response to extract structured rip analysis data.
//  * Handles various response formats and provides fallbacks.
//  *
//  * @param aiResponse - Raw AI response text
//  * @returns Parsed rip analysis with quote comparisons and score
//  */
// function parseRipAnalysisResponse(aiResponse: string): {
//   quoteComparisons: Array<{
//     articleQuote: string;
//     sourceQuote: string;
//     ripAnalysis: string;
//   }>;
//   overallRipScore: number;
//   ripAnalysis: string;
// } {
//   try {
//     // Extract rip analysis summary
//     const analysisMatch = aiResponse.match(/<analysis>([\s\S]*?)<\/analysis>/);
//     const ripAnalysis = analysisMatch ? analysisMatch[1].trim() : aiResponse.substring(0, 500);

//     // Extract overall score
//     const scoreMatch = aiResponse.match(/<overall-score>(\d+)<\/overall-score>/);
//     const overallRipScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 50; // Default to 50 if parsing fails

//     // Extract quote comparisons
//     const quoteComparisons: Array<{
//       articleQuote: string;
//       sourceQuote: string;
//       ripAnalysis: string;
//     }> = [];

//     // Look for quote comparison patterns in the response
//     const quotePattern = /article quote[:\s]+[""]([^""]+)[""][\s\S]*?source quote[:\s]+[""]([^""]+)[""][\s\S]*?analysis[:\s]+([^""]+)/gi;
//     let match;
    
//     while ((match = quotePattern.exec(aiResponse)) !== null) {
//       quoteComparisons.push({
//         articleQuote: match[1].trim(),
//         sourceQuote: match[2].trim(),
//         ripAnalysis: match[3].trim(),
//       });
//     }

//     // If no structured quotes found, create a generic analysis
//     if (quoteComparisons.length === 0) {
//       quoteComparisons.push({
//         articleQuote: "Analysis completed",
//         sourceQuote: "Source materials reviewed",
//         ripAnalysis: "AI analysis completed - review full response for details",
//       });
//     }

//     return {
//       quoteComparisons,
//       overallRipScore: Math.max(0, Math.min(100, overallRipScore)), // Ensure score is 0-100
//       ripAnalysis,
//     };
//   } catch (error) {
//     console.error("Failed to parse rip analysis response:", error);
    
//     // Return fallback response
//     return {
//       quoteComparisons: [{
//         articleQuote: "Parsing failed",
//         sourceQuote: "Error in response parsing",
//         ripAnalysis: "Failed to parse AI response - manual review required",
//       }],
//       overallRipScore: 50,
//       ripAnalysis: "Error parsing AI response. Original response: " + aiResponse.substring(0, 200),
//     };
//   }
// }