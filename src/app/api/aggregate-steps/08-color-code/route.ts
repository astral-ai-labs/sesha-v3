/* ==========================================================================*/
// route.ts — Step 08: Color Code API Route
/* ==========================================================================*/
// Purpose: Color code article sentences based on source attribution
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
import { Step08ColorCodeRequest, Step08ColorCodeAIResponse } from "@/types/aggregate";
import { anthropic } from "@ai-sdk/anthropic";

// External Packages ---
import * as cheerio from 'cheerio';

/* ==========================================================================*/
// Configuration
/* ==========================================================================*/

const MODEL = anthropic("claude-sonnet-4-5-20250929");
const TEMPERATURE = 0.7;
const MAX_TOKENS = 3000;

// ==========================================================================
// System Prompts
// ==========================================================================

// Original color coding system prompt (commented out)

const SYSTEM_PROMPT = `
<instructions>
Take the given article and reprint it word for word, but color coded. Reprint it with each sentence on a new line (unless the sentence is INSIDE a direct quote). Each line in the input should be appropriately color coded based on the corresponding source article from the source list. The purpose is just to color code the existing article based on the source article tags with no other changes.

Wrap each sentence (or quote) with a color tag based on the source key. Replace the source article tags with the color coding as outlined below:
Source 1 = <p><span style="color: black;"></span></p>
Source 2 = <p><span style="color: darkblue;"></span></p>
Source 3 = <p><span style="color: darkred;"></span></p>
Source 4 = <p><span style="color: green;"></span></p>
Source 5 = <p><span style="color: purple;"></span></p>
Source 6 = <p><span style="color: orange;"></span></p>

NOTE: If a line has credit IN THE TEXT (eg "according to NumeNews") that is probably the source that should determine color coding.
Or, if a line has multiple source tags, just use the FIRST source in the tag to determine the color coding. Do not edit the in-sentence attribution

###
OUTPUT FORMAT:
<p><span style="color: (insert color);">Insert sentence.</span></p>
<p><span style="color: (insert color);">Insert sentence "with quote"</span></p>
<p><span style="color: (insert color);">Insert sentence.</span></p>
</instructions>

EXAMPLE INPUT:
Source 1 AP  = <p><span style="color: black;"></span></p>
Source 2 CNN = <p><span style="color: darkblue;"></span></p>
Source 3 Forbes = <p><span style="color: darkred;"></span></p>
Source 4 = <p><span style="color: green;"></span></p>
Source 5  = <p><span style="color: purple;"></span></p>
Source 6  = <p><span style="color: orange;"></span></p>

<rewrite>
Here is your article:
Nume announced his return to the world of beatboxing in a video posted to Youtube on Thursday. (Source 1 AP) 
"I'm back, baby," Nume said after a long-winded speech. "This is a new era for me. I hope it's a newer, better era... and I want to beatbox like never before." (Source 1 AP) (Source 2 CNN)
Nume holds several titles, including the 2019 American Championship title in looping. (Source 2 CNN)
This is his second retirement in two years. (Source 1 AP) 
"I know I've said this before," Nume said, "But I mean it this time. I really do." (Source 4 & Source 6)
Nume turns 30 in November, according to CNN. (Source 1 AP) (Source 2 CNN)
</rewrite>

EXAMPLE OUTPUT WITH EVERY SENTENCE OF THE ARTICLE COLOR CODED AND ON A NEW LINE:
<final-draft>
<p><span style="color: black;">Nume announced his return to the world of beatboxing in a video posted to Youtube on Thursday.</span></p>
<p><span style="color: black;">"I'm back, baby," Nume said after a long-winded speech.</span></p>
<p><span style="color: black;">"This is a new era for me. I hope it's a newer, better era... and I want to beatbox like never before."</span></p>
<p><span style="color: darkblue;">Nume holds several titles, including the 2019 American Championship title in looping.</span></p>
<p><span style="color: black;">This is his second retirement in two years.</span></p>
<p><span style="color: green;">"I know I've said this before," Nume said.</span></p>
<p><span style="color: green;">"But I mean it this time. I really do."</span></p>
<p><span style="color: darkblue;">Nume turns 30 in November, according to CNN.</span></p>
</final-draft>

NOTE: Wrap each sentence in the corresponding paragraph tags, but keep items within a direct quote together as indicated by the example.
`;


// New system prompt without color coding
/*
const SYSTEM_PROMPT = `
<instructions>
Take the given article and reprint it word for word. Reprint it with each sentence on a new line (unless the sentence is INSIDE a direct quote). The purpose is to format the existing article while removing all source article tags and preserving content with no other changes.

Remove all source tags (like "(Source 1)", "(Source 2)", etc.) from the text completely.

NOTE: If a line has credit IN THE TEXT (eg "according to NumeNews") preserve that attribution exactly as written, but remove the source tags.
If a line has multiple source tags, remove them all. Do not edit the in-sentence attribution but remove all source tags.

###
OUTPUT FORMAT:
Insert sentence.
Insert sentence "with quote"
Insert sentence.
</instructions>

EXAMPLE INPUT:
<rewrite>
Here is your article:
Nume announced his return to the world of beatboxing in a video posted to Youtube on Thursday. (Source 1 AP) 
"I'm back, baby," Nume said after a long-winded speech. "This is a new era for me. I hope it's a newer, better era... and I want to beatbox like never before." (Source 1 AP) (Source 2 CNN)
Nume holds several titles, including the 2019 American Championship title in looping. (Source 2 CNN)
This is his second retirement in two years. (Source 1 AP) 
"I know I've said this before," Nume said, "But I mean it this time. I really do." (Source 4 & Source 6)
Nume turns 30 in November, according to CNN. (Source 1 AP) (Source 2 CNN)
</rewrite>

EXAMPLE OUTPUT WITH EVERY SENTENCE ON NEW LINES AND SOURCE TAGS REMOVED:
<final-draft>
Nume announced his return to the world of beatboxing in a video posted to Youtube on Thursday.
"I'm back, baby," Nume said after a long-winded speech.
"This is a new era for me. I hope it's a newer, better era... and I want to beatbox like never before."
Nume holds several titles, including the 2019 American Championship title in looping.
This is his second retirement in two years.
"I know I've said this before," Nume said.
"But I mean it this time. I really do."
Nume turns 30 in November, according to CNN.
</final-draft>

NOTE: Keep items within a direct quote together as indicated by the example, but remove all source tags.
`;
*/

// ==========================================================================
// User Prompt
// ==========================================================================

// Original color coding user prompt (commented out)

const USER_PROMPT = `
<instructions>
Take the given article and reprint it word for word, but color coded. Reprint it with each sentence on a new line (unless the sentence is INSIDE a direct quote). Each line in the input should be appropriately color coded based on the source list. Each line should be wrapped in the  "<p>" and "<span> tags with no extra spacing. 
</instructions>

<rewrite>
{{#sources.0.useVerbatim}}{{sources.0.factsBitSplitting1}}{{/sources.0.useVerbatim}}
{{rewrittenArticle}}
</rewrite>
`;


// New user prompt without color coding
/*
const USER_PROMPT = `
<instructions>
Take the given article and reprint it word for word. Reprint it with each sentence on a new line (unless the sentence is INSIDE a direct quote). Remove all source tags like "(Source 1)", "(Source 2)", etc. from the text completely. Preserve all other attributions exactly as they appear.
</instructions>

<rewrite>
{{#sources.0.useVerbatim}}{{sources.0.factsBitSplitting1}}{{/sources.0.useVerbatim}}
{{rewrittenArticle}}
</rewrite>
`;
*/

// ==========================================================================
// Assistant Prompt
// ==========================================================================

const ASSISTANT_PROMPT = `
<final-draft>
`;

/* ==========================================================================*/
// Helper Function
/* ==========================================================================*/
function convertHtmlToLexicalJSON(html: string): string {
  // Clean up the HTML by removing extra whitespace between tags
  const cleanHtml = html.replace(/>\s+</g, '><').trim();
  
  const $ = cheerio.load(cleanHtml);

  const paragraphs = $("p").map((_, p) => {
    const spans = $(p).find("span").map((_, span) => {
      const styleAttr = $(span).attr("style") || "";
      const match = styleAttr.match(/color:\s*([^;]+)/i);
      const color = match ? match[1].trim() : "";

      const text = $(span).text().trim();
      
      // Skip empty text nodes
      if (!text) return null;

      return {
        detail: 0,
        format: 0,
        mode: "normal",
        style: color ? `color:${color}`: "",
        text: text,
        type: "text",
        version: 1
      };
    }).get().filter(Boolean); // Remove null entries

    // Skip empty paragraphs
    if (spans.length === 0) return null;

    return {
      children: spans,
      direction: "ltr",
      format: "",
      indent: 0,
      type: "paragraph",
      version: 1
    };
  }).get().filter(Boolean); // Remove null entries

  return JSON.stringify({
    root: {
      children: paragraphs,
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1
    }
  });
}

/* ==========================================================================*/
// Route Handler
/* ==========================================================================*/

export async function POST(request: NextRequest) {
  try {
    const body: Step08ColorCodeRequest = await request.json();

    // Validate required fields ------
    const validationError = validateRequest(Boolean(body.articleStepOutputs?.rewriteArticle2?.text), {
      colorCodedArticle: "",
    } as Step08ColorCodeAIResponse);
    if (validationError) return validationError;

    // Format System Prompt ------
    const finalSystemPrompt = formatPrompt2(SYSTEM_PROMPT, undefined, PromptType.SYSTEM);

    // Format User Prompt ------
    const finalUserPrompt = formatPrompt2(
      USER_PROMPT,
      {
        rewrittenArticle: body.articleStepOutputs.rewriteArticle2?.text || "",
        sources: body.sources,
      },
      PromptType.USER
    );

    // Format Assistant Prompt ------
    const finalAssistantPrompt = formatPrompt2(ASSISTANT_PROMPT, undefined, PromptType.ASSISTANT);

    // Create a route-specific logger for this step
    const logger = createPipelineLogger(`route-step08-${Date.now()}`, "aggregate");
    logger.logStepPrompts(8, "Color Code", finalSystemPrompt, finalUserPrompt, finalAssistantPrompt);

    // Generate text using messages approach
    const { text: colorCodedArticle, usage } = await generateText({
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

    // Clean up the response by removing any <final-draft></final-draft> tags and trimming whitespace
    const cleanedText = colorCodedArticle
      .replace(/<\/?final-draft[^>]*>/g, "") // Remove any <final-draft> or </final-draft> tags
      .trim(); // Remove leading and trailing whitespace

    // Convert HTML to Lexical JSON
    const richContentJson = convertHtmlToLexicalJSON(cleanedText);

    // Build response
    const response: Step08ColorCodeAIResponse & { richContent: string }= {
      colorCodedArticle: cleanedText,
      richContent: richContentJson,
      usage: [
        {
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          model: MODEL.modelId,
        },
      ],
    };

    logger.logStepResponse(8, "Color Code", response);

    // Close the logger to ensure logs are flushed
    await logger.close();

    // Return both to client
    return NextResponse.json(response);
  } catch (error) {
    console.error("Step 08 - Color code failed:", error);

    const errorResponse: Step08ColorCodeAIResponse = {
      colorCodedArticle: "",
      richContent: "",
      usage: [],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}