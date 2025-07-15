/* ==========================================================================*/
// route.ts — Step 02: Facts Bit Splitting 2 API Route
/* ==========================================================================*/
// Purpose: Second phase of facts bit splitting processing
// Sections: Imports, Configuration, Prompts, Route Handler, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// Next.js Core ---
import { NextRequest, NextResponse } from "next/server";

// AI SDK Core ---
import { generateText } from "ai";

// Local Utilities ---
import { formatPrompt2, PromptType, getCurrentDate } from "@/lib/utils";
import { createPipelineLogger, PipelineLogger } from "@/lib/pipeline-logger";

// Local Types ----
import { FactsBitSplitting2Request, FactsBitSplitting2AIResponse, Source } from "@/types/aggregate";
import { anthropic } from "@ai-sdk/anthropic";

/* ==========================================================================*/
// Configuration
/* ==========================================================================*/

const MODEL = anthropic("claude-3-5-sonnet-20240620");
const TEMPERATURE = 0.8;
const MAX_TOKENS = 4000;

// ==========================================================================
// System Prompts
// ==========================================================================

const SYSTEM_PROMPT_PRIMARY_SOURCE = `
Instructions:
Reprint the article content and add source tags after each sentence along with credits to the author. Remove extranneous content like "click here" and "for more, follow newsweek" etc. from the provided text.

Example format: 
line from article (Insert source tag)
line from article (Insert source tag)
line from article (Insert source tag)
...
line from article (Insert source tag)

Rules:
- Do not alter the article lines themselves (preserve all direct quotes, etc)
- Reprint all of the actual content but remove any other irrelevant text from the text parser

FORMAT:
line from article (Insert source tag)
line from article (Insert source tag)
line from article (Insert source tag)
...
line from article (Insert source tag)

Example output:
"Govind Nume is 28 years old. Govind will turn 29 in November," Angela Maison wrote. (Source 1 CNN)
"Govind said 'I can't wait!' at a press conference on Friday about his upcoming 29th birthday in November," Angela Maison wrote. (Source 1 CNN)
"Last month, Govind published a blog post about his takeaways from life so far," Angela Maison wrote. (Source 1 CNN)

###

Example with user input and assistant output:

Input example:
Source 3 Reuters
ARTICLE:
Tech stabber arrested in San Francisco 
Advertisment
April 13 (Reuters) - A tech executive was arrested on Thursday for the stabbing murder of Cash App founder Bob Lee in San Francisco, police said, stressing that the suspect knew the victim but declining to discuss a possible motive for the crime.
Click here for info about frogs
Guardian Image
Lee was found stumbling through the streets of San Francisco at around 2:30 a.m. Pacific Time on April 4 bleeding from a stab wound. A witness said, "He was bleeding like crazy all over the place." Lee, 43, later died of his wounds at a hospital.  
Nima Momeni, the 38-year-old founder of software company Expand IT, was arrested on suspicion of murder in the Bay Area city of Emeryvile, where his company has offices, San Francisco. Police Chief William Scott told a Monday afternoon news conference. "We are still investigating," said Scott, "but we are confident that we have the right suspect in custody."
By John Smith, edited by Staff Writers at Reuters
More stories...
The West Wing reboot is scheduled to premiere in 2026. (Link)
Ads supported by Chazbucks entertainment
Oregon Trail videogame exhibit at Moma
Sitemap

Output example:
<source-content>
<first-half>
Headline: Tech stabber arrested in San Francisco 
Author: John Smith, edited by Staff Writers at Reuters
"April 13 (Reuters) - A tech executive was arrested on Thursday for the stabbing murder of Cash App founder Bob Lee in San Francisco, police said, stressing that the suspect knew the victim but declining to discuss a possible motive for the crime," John Smith wrote in a Reuters article. (Source 3 Reuters)
"Lee was found stumbling through the streets of San Francisco at around 2:30 a.m. Pacific Time on April 4 bleeding from a stab wound." Smith wrote. (Source 3 Reuters) 
"A witness said, 'He was bleeding like crazy all over the place.'" Smith noted.(Source 3 Reuters) 
"Lee, 43, later died of his wounds at a hospital." added Smith in the report. (Source 3 Reuters)
</first-half>
<second-half>
"Nima Momeni, the 38-year-old founder of software company Expand IT, was arrested on suspicion of murder in the Bay Area city of Emeryvile, where his company has offices, San Francisco." Smith detailed.(Source 3 Reuters) 
"Police Chief William Scott told a Monday afternoon news conference." Smith wrote. (Source 3 Reuters)
"'We are still investigating,' said Scott, 'but we are confident that we have the right suspect in custody.'" Smith added. (Source 3 Reuters)
By John Smith, edited by Staff Writers at Reuters (Source 3 Reuters)
</second-half>
</source-content>
`;

const SYSTEM_PROMPT_VERBATIM = `
--
`;

const SYSTEM_PROMPT_DEFAULT = `
--
`;

// ==========================================================================
// User Prompts
// ==========================================================================

const USER_PROMPT_DEFAULT = `
<instructions>
print two dashes: -- </instructions>
`;

const USER_PROMPT_PRIMARY_SOURCE = `
Note: if all of the source content has ALREADY been accounted for in the first half, write "<second-half>empty</second-half>"
Today's Date: {{date}}
<source-{{source.number}}-input>
Source {{source.number}} {{source.accredit}}{{^source.accredit}}
The source tag should be "(Source {{source.number}})"{{/source.accredit}}

{{source.text}}
</source-{{source.number}}-input>
`;

const USER_PROMPT_VERBATIM = `
<instructions>
print two dashes: -- </instructions>
`;

// ==========================================================================
// Assistant Prompts
// ==========================================================================

const ASSISTANT_PROMPT_DEFAULT = `Here are two dashes:`;

const ASSISTANT_PROMPT_PRIMARY_SOURCE = `<source-{{source.number}}-content><first-half>
{{source.factsBitSplitting}}</first-half>
<second-half>`;

const ASSISTANT_PROMPT_VERBATIM = `Here are two dashes:`;

/* ==========================================================================*/
// Helper Functions
/* ==========================================================================*/

/**
 * Process multiple sources in parallel using Promise.all
 *
 * @param sources - Array of sources to process
 * @returns Promise resolving to array of processed source results
 */
async function processSourcesInParallel(sources: Source[], logger?: PipelineLogger) {
  const currentDate = getCurrentDate();

  // Create all the processing promises
  const processingPromises = sources.map(async (source, index) => {
    // Determine which prompts to use based on source properties
    let systemPrompt: string;
    let userPromptTemplate: string;
    let assistantPromptTemplate: string;

    if (source.isPrimarySource) {
      systemPrompt = SYSTEM_PROMPT_PRIMARY_SOURCE;
      userPromptTemplate = USER_PROMPT_PRIMARY_SOURCE;
      assistantPromptTemplate = ASSISTANT_PROMPT_PRIMARY_SOURCE;
    } else if (source.useVerbatim) {
      systemPrompt = SYSTEM_PROMPT_VERBATIM;
      userPromptTemplate = USER_PROMPT_VERBATIM;
      assistantPromptTemplate = ASSISTANT_PROMPT_VERBATIM;
    } else {
      systemPrompt = SYSTEM_PROMPT_DEFAULT;
      userPromptTemplate = USER_PROMPT_DEFAULT;
      assistantPromptTemplate = ASSISTANT_PROMPT_DEFAULT;
    }

    // Format System Prompt ------
    const finalSystemPrompt = formatPrompt2(systemPrompt, { date: currentDate }, PromptType.SYSTEM);

    // Format User Prompt ------
    const finalUserPrompt = formatPrompt2(userPromptTemplate, { source, date: currentDate }, PromptType.USER);

    // Format Assistant Prompt ------
    const finalAssistantPrompt = formatPrompt2(assistantPromptTemplate, { source }, PromptType.ASSISTANT);

    // Log example prompts for first source
    if (index === 0 && logger) {
      logger.logStepPrompts(2, "Facts Bit Splitting 2", finalSystemPrompt, finalUserPrompt, finalAssistantPrompt);
    }

    // Generate text for this source using messages approach
    const { text: content } = await generateText({
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
      maxTokens: MAX_TOKENS,
    });

    return {
      ...source,
      factsBitSplitting2: content,
    };
  });

  // Execute all promises in parallel and return results
  return Promise.all(processingPromises);
}

/* ==========================================================================*/
// Route Handler
/* ==========================================================================*/

export async function POST(request: NextRequest) {
  try {
    const body: FactsBitSplitting2Request = await request.json();

    // Validate required fields - simple validation for sources length
    if (!body.sources || body.sources.length === 0) {
      return NextResponse.json(
        {
          sources: [],
        } as FactsBitSplitting2AIResponse,
        { status: 400 }
      );
    }

    // Create a route-specific logger for this step
    const logger = createPipelineLogger(`route-step02-${Date.now()}`, 'aggregate');

    // Process all sources in parallel
    const processedSources = await processSourcesInParallel(body.sources, logger);

    // Build response
    const response: FactsBitSplitting2AIResponse = {
      sources: processedSources,
    };

    logger.logStepResponse(2, "Facts Bit Splitting 2", response);

    // Close the logger to ensure logs are flushed
    await logger.close();

    return NextResponse.json(response);
  } catch (error) {
    console.error("Step 02 - Facts bit splitting 2 failed:", error);

    const errorResponse: FactsBitSplitting2AIResponse = {
      sources: [],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
