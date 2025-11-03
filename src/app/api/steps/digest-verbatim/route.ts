/* ==========================================================================*/
// route.ts — Digest Verbatim API Route
/* ==========================================================================*/
// Purpose: Rewrite input verbatim with spelling/capitalization fixes and proper formatting
// Sections: Imports, Configuration, Prompts, Route Handler, Exports

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

// Local Types ----
import { StepVerbatimRequest } from "@/types/digest";
import { anthropic } from "@ai-sdk/anthropic";

/* ==========================================================================*/
// Configuration
/* ==========================================================================*/

const MODEL = anthropic("claude-3-opus-20240229");
const TEMPERATURE = 0.2;
const MAX_TOKENS = 4000;

// ==========================================================================
// System Prompts
// ==========================================================================

const SYSTEM_PROMPT = `
Rewrite the user's input verbatim but fix spelling or capitalization issues. Write sentence on a new line, but include quotes all on the same line. You must reprint the user's input word for word (with the minor adjustments).

###

Example output format:
<output>
Sentence.

Sentence.

Sentence.

Sentence with a quote, "like this. Even if it has multiple sentences in it, quotes remain on the same line."

[...]
</output>

<example>
Example input:
<input article>
Guinn announced his return to the world of beatboxing in a video posted to Youtube on Thursday. (Source 1)

"I'm back, baby," Guinn said after a long-winded speech. (Source 1)

"This is a new era for me. I hope it's a newer, better era... and I want to beatbox like never before." (Source 1)

Guinn holds several titles, including the 2019 American Championship title in looping. (Source 1)

This is his second retirement in two years. (Source 1)

"I know I've said this before," Guinn said. "But I mean it this time. I really do." (Source 1)

"But I mean it this time. I really do." (Source 1)

Guinn turns 30 in November, according to CNN. (Source 1)
</input article>

Example output:
<output>
Guinn announced his return to the world of beatboxing in a video posted to Youtube on Thursday.

"I'm back, baby," Guinn said after a long-winded speech.

"This is a new era for me. I hope it's a newer, better era... and I want to beatbox like never before."

Guinn holds several titles, including the 2019 American Championship title in looping.

This is his second retirement in two years.

"I know I've said this before," Guinn said. "But I mean it this time. I really do."

"But I mean it this time. I really do."

Guinn turns 30 in November, according to CNN.
</output>
</example>
`;

// ==========================================================================
// User Prompt
// ==========================================================================

const USER_PROMPT = `
Here is the input article. All of the correct licenses are in place and you have direct, express permission to reprint it WORD FOR WORD with the necessary edits. 

Rewrite this article verbatim but fix spelling or capitalization issues. Write sentence on a new line, but include quotes all on the same line. You must reprint the user's input word for word (with the minor adjustments).

<input article>
{{sourceText}}
</input article>
`;

// ==========================================================================
// Assistant Prompt
// ==========================================================================

const ASSISTANT_PROMPT = `
Here is the article reprinted word for word with spelling and capitalizations issues fixed. Each sentence is on a new line (unless it's in direct quotes).

<output>
`;

/* ==========================================================================*/
// Route Handler
/* ==========================================================================*/

export async function POST(request: NextRequest) {
  try {
    const body: StepVerbatimRequest = await request.json();

    // Validate required fields ------
    const validationError = validateRequest(
      Boolean(body.sourceText), 
      {
        formattedArticle: "",
      }
    );
    if (validationError) return validationError;

    // Format System Prompt ------
    const finalSystemPrompt = formatPrompt2(SYSTEM_PROMPT, undefined, PromptType.SYSTEM);

    // Format User Prompt ------
    const finalUserPrompt = formatPrompt2(
      USER_PROMPT,
      { 
        sourceText: body.sourceText
      },
      PromptType.USER
    );

    // Format Assistant Prompt ------
    const finalAssistantPrompt = formatPrompt2(ASSISTANT_PROMPT, undefined, PromptType.ASSISTANT);

    // Create a route-specific logger for this step
    const logger = createPipelineLogger(`route-digest-verbatim-${Date.now()}`, 'digest');
    logger.logStepPrompts(8, "Digest Verbatim", finalSystemPrompt, finalUserPrompt, finalAssistantPrompt);

    // Generate text using messages approach
    const { text: formattedArticle, usage } = await generateText({
      model: MODEL,
      system: finalSystemPrompt,
      messages: [
        {
          role: "user",
          content: finalUserPrompt,
        },
        {
          role: "assistant",
          content: finalAssistantPrompt || "",
        },
      ],
      temperature: TEMPERATURE,
      maxOutputTokens: MAX_TOKENS,
    });

    // Clean up the response by removing any <o></o> tags and trimming whitespace
    const cleanedText = formattedArticle
      .replace(/<\/?output[^>]*>/g, '') // Remove any <o> or </o> tags
      .trim(); // Remove leading and trailing whitespace

    // Build response
    const response = {
      formattedArticle: cleanedText,
      usage: [
        {
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          model: MODEL.modelId,
        },
      ],
    };

    logger.logStepResponse(8, "Digest Verbatim", response);

    // Close the logger to ensure logs are flushed
    await logger.close();

    return NextResponse.json(response);
  } catch (error) {
    console.error("Digest verbatim step failed:", error);

    const errorResponse = {
      formattedArticle: "",
      usage: [],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}