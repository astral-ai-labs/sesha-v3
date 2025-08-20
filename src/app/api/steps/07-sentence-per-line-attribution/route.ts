/* ==========================================================================*/
// route.ts — Step 07: Sentence Per Line Attribution API Route
/* ==========================================================================*/
// Purpose: Split the final article into one sentence per line, preserving inline quotes
// Sections: Imports, Configuration, Prompts, Route Handler, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// Next.js Core ---
import { NextRequest, NextResponse } from "next/server";

// AI SDK Core ---
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

// Local Utilities ---
import { buildPrompts } from "@/lib/utils";
import { createPipelineLogger } from "@/lib/pipeline-logger";

// Local Types ----
import { Step07SentencePerLineAttributionAIResponse, Step07SentencePerLineAttributionRequest } from "@/types/digest";

/* ==========================================================================*/
// Configuration
/* ==========================================================================*/

const model = anthropic("claude-sonnet-4-20250514");

/* ==========================================================================*/
// Schema
/* ==========================================================================*/

/* ==========================================================================*/
// Prompts
/* ==========================================================================*/

const SYSTEM_PROMPT = `
Reprint it with each sentence on a new line (unless the sentence is INSIDE a direct quote). Remove the source tag but make sure to leave all instances of inline credits. 

###

Example output format:
<output article>
Sentence.

Sentence.

Sentence.

Sentence with a quote, "like this. Even if it has multiple sentences in it, quotes remain on the same line."

[...]
</output article>

<example>
Example input:
<article>
Nume announced his return to the world of beatboxing in a video posted to Youtube on Thursday. (Source 1)

"I'm back, baby," Nume said after a long-winded speech. (Source 1)

"This is a new era for me. I hope it's a newer, better era... and I want to beatbox like never before." (Source 1)

Nume holds several titles, including the 2019 American Championship title in looping, according to the video. (Source 1)

This is his second retirement in two years. (Source 1)

"I know I've said this before," Nume said. "But I mean it this time. I really do." (Source 1)

"But I mean it this time. I really do." (Source 1)

Nume turns 30 in November, according to CNN. (Source 1)
</article>

Example output:
<output>
Nume announced his return to the world of beatboxing in a video posted to Youtube on Thursday.

"I'm back, baby," Nume said after a long-winded speech.

"This is a new era for me. I hope it's a newer, better era... and I want to beatbox like never before."

Nume holds several titles, including the 2019 American Championship title in looping, according to the video.

This is his second retirement in two years.

"I know I've said this before," Nume said. "But I mean it this time. I really do."

"But I mean it this time. I really do."

Nume turns 30 in November, according to CNN.
</output>
</example>
`;

const USER_PROMPT = `
<article>
{{draft_text}}
</article>
`;

/* ==========================================================================*/
// Route Handler
/* ==========================================================================*/

export async function POST(request: NextRequest) {
  try {
    const body: Step07SentencePerLineAttributionRequest = await request.json();

    // Validate required fields
    if (!body.paraphrasedArticle) {
      return NextResponse.json(
        {
          formattedArticle: "",
        },
        { status: 400 }
      );
    }

    // Build prompts using the helper function
    const [systemPrompt, userPrompt] = buildPrompts(
      SYSTEM_PROMPT,
      USER_PROMPT,
      undefined, // No system variables needed
      {
        draft_text: body.paraphrasedArticle,
      }
    );

    // Create a route-specific logger for this step
    const logger = createPipelineLogger(`route-step07-${Date.now()}`, 'digest');
    logger.logStepPrompts(7, "Sentence Per Line Attribution", systemPrompt, userPrompt);

    // Generate structured object using AI SDK
    const { text, usage } = await generateText({
      model,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
        {
          role: "assistant",
          content: "<output>",
        },
      ],
      temperature: 0.2,
      maxTokens: 3700
    });

    // Clean up the response by removing any <o></o> tags and trimming whitespace
    const cleanedText = text
      .replace(/<\/?output[^>]*>/g, '') // Remove any <o> or </o> tags
      .trim(); // Remove leading and trailing whitespace

    // Build response - only AI data
    const response: Step07SentencePerLineAttributionAIResponse = {
      formattedArticle: cleanedText,
      usage: [
        {
          inputTokens: usage?.promptTokens ?? 0,
          outputTokens: usage?.completionTokens ?? 0,
          model: model.modelId,
          ...usage
        },
      ],
    };

    logger.logStepResponse(7, "Sentence Per Line Attribution", response);

    // Close the logger to ensure logs are flushed
    await logger.close();

    return NextResponse.json(response);
  } catch (error) {
    console.error("Step 07 - Sentence per line attribution failed:", error);

    const errorResponse: Step07SentencePerLineAttributionAIResponse = {
      formattedArticle: "",
      usage: [],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}