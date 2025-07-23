/* ==========================================================================*/
// route.ts — Step 03: Headlines Blobs API Route
/* ==========================================================================*/
// Purpose: Generate punchy headline and short blobs from all source content
// Sections: Imports, Configuration, Prompts, Route Handler, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// Next.js Core ---
import { NextRequest, NextResponse } from "next/server";

// AI SDK Core ---
import { generateObject, generateText } from "ai";
import { z } from "zod";

// Local Utilities ---
import { formatPrompt2, PromptType, validateRequest } from "@/lib/utils";
import { createPipelineLogger } from "@/lib/pipeline-logger";

// Local Types ----
import { Step03HeadlinesBlobsRequest, Step03HeadlinesBlobsAIResponse } from "@/types/aggregate";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

/* ==========================================================================*/
// Configuration
/* ==========================================================================*/

const structuredModel = openai("gpt-4o");
const MODEL = anthropic("claude-3-5-sonnet-20240620");
const TEMPERATURE = 0.4;
const TEMPERATURE_STRUCTURED = 0.1;
const MAX_TOKENS = 500;

/* ==========================================================================*/
// Schema
/* ==========================================================================*/

const HeadlineAndBlobsSchema = z.object({
  headline: z.string().describe("A punchy, attention-grabbing headline that captures the most newsworthy development"),
  blobs: z.array(z.string()).describe("Array of short, punchy sentences covering core highlights of the story"),
});

// ==========================================================================
// System Prompt
// ==========================================================================

const SYSTEM_PROMPT = `
We are expert journalists in the process of writing an article that is a digest of a much longer text. Write a headline and set of additional sentences (called blobs) based on these instructions and the source article content. 

INSTRUCTIONS FOR THE HEADLINE AND BLOBS: The headline and blobs should encompass the most interesting and most timely elements or developments in the article. Unless told otherwise, it should be the lede or angle for Source Article 1. The headline and blobs should be short, engaging and magnetic. Blobs can include direct quotes when mentioning striking/notable things people have said but must be short and punchy. The blobs should cover each element in the story so that we understand the core highlights across the various events of the article. The headline must capture the most important or newsworthy/recent development in the story. It should be clear, factual, and interesting. It should be specific and attention grabbing. Think tabloid, with the most juicy or dramatic and TIMELY SPECIFIC DETAILS detail in the headline. 

RESPONSE FORMAT: Send the headline and the blobs in this format: 
Headline: [insert headline] 
Blob: [insert blob] 
... 
Blob: [insert blob]

The user will specify the number of blobs to write and may give editor instructions that say the content or focus of the blobs.

In general, the tone and structure of the headline and blobs should be something like this:
Headline: (insert punchy, attention-grabbing headline)
Blob: (insert key detail or quote one)
Blob: (insert another attention-grabbing detail or quote)
...
Blob: (insert another attention-grabbing detail or quote)

The goal of each of the headline and blobs is to HOOK the reader and give them a quick sense of the most attention-worthy elements of the story, and make sure to follow the editor instructions if the editor suggests content for the blobs. Note: Unless told otherwise, the headline should match the lede/angle of source article 1 which is typically the most recent or important angle to focus on

Here some examples of well-written headlines and blobs:

Headline: New York state Christian university fires two employees for using pronouns in their emails
Blob: Dorm directors AREN'T transgender but wanted to use pronouns because they have confusing names
Blob:  700 alumni protest in latest round of America's culture wars
Blob: University insists refusal to remove pronouns was in 'breach of institutional policy'
Blob:  'As Christians, we've forgotten how to care for people,' says worker

Headline: 'It looked like the sky was on fire': Popocatepetl volcano eruption ash-fall closes two Mexico City airports
Blob: US Embassy warns travelers not to go within 7.5miles of mountain
Blob: Mexican authorities review evacuation plans but say there is no immediate danger
Blob: Mount Etna eruption in Italy closes two Sicilian airports

Headline: 'You're a f**** idiot': Nikki Haley lashes out in chaotic podcast interview
Blob: The former presidential hopeful claims the Republican party has 'lost it's mind'

Headline: Paris Hilton mourns death of 23-year-old 'iconic' chihuahua, Harajuku Bitch, with Instagram outpouring 
Blob: 'Thank you for blessing my life', wrote the reality TV heiress
Blob: Dog lived twice as long as most of its breed
Blob: Another of her handbag dogs is still missing despite nine-month hunt

Headline: China escalates tech war with US by banning products from America's biggest chipmaker for 'serious network security' risks
Blob: Move against Micron Inc seen as retaliation for tech restrictions imposed by West on China
Blob: Block comes day after G7 leaders roasted Beijing for human rights abuses, economic policies and saber-rattling over Taiwan
Blob: But China still can't make its own chips and will likely to turn to South Korea for replacements

Headline: Jimmy Fallon's Bad Days: Staffers blow whistle on chat show star's erratic behavior, backstage chaos and drinking issues
Blob: Rolling Stone exposé reveals 'The Tonight Show' host Jimmy Fallon's alleged alcohol use and toxic workplace culture despite repeated HR complaints
Blob: Staff regularly joked about wanting to kill themselves and they used dressing rooms as 'crying rooms'

Headline: 'Five-alarm fire': Survey shows 63% of American Jews feel less secure than ever as antisemitism surges post-Israel Hamas war
Blob: 25% report being targeted by antisemitism in the past year
Blob: 46% say they have changed their behaviour

Headline: Is the pen ACTUALLY mightier than the sword? Novelist Govind Nume pens NYT op-ed suggesting artists join the army if they want to contribute to society
Blob: The three-time National Book Award winner describes his journey from artist to army hero
Blob: Nume decries what he describes as a "general trend toward complacency" in Gen Z
Blob: "There's a time for art, and then there's a time for action," Nume writes

Headline: Short men have HIGHER performance in tech companies according to new research
Blob: Men shorter than five foot seven earned 30% more than their taller counterparts throughout the Harvard Business Review study
Blob: An "inverse height-to-earnings" ratio held true across races, though was most promiment in Caucasian and African-American workers
Blob: The study reviewed the heights, salaries, and job titles across 30,000 tech workers who identify as men

See how these blobs and headlines are factual AND interesting? Make sure the most interesting, dramatic, or unexpected and newsworthy facts and quotes are turned into short, engaging headlines and blobs. If headlines or blobs are suggested, they must be used. IMPORTANT: Even if the input is hard science, a dry court ruling, or another dense text, the headline and blobs MUST be written in pithy, easy-to-understand english.

Generate however many blobs the user requested.

RESPONSE FORMAT:
All quotes must be SINGLE quotation marks. Send the headline and blobs in this format:

Headline: [insert headline]
Blob: [insert blob]
...
Blob: [insert blob]
`;

// ==========================================================================
// User Prompt
// ==========================================================================

const USER_PROMPT = `
Number of Blobs: {{input.noOfBlobs}}

IMPORTANT EDITOR NOTES:  
{{input.instructions}}

Additional editor instructions:
Each blob MUST start with a different word
The blobs must be short, punchy, and written in a newsy style (not dry)
Even if the input is hard science, a dry court ruling, or another dense text, the headline and blobs MUST be written in pithy, easy-to-understand english. For example, instead of "In a groundbreaking judgement addressing the multifaceted elements of electric vehicles, a Michigan court declared that..." just write "A Michigan court ruled X" 
It is VITAL that the blobs are very short (10-20 words) and highly engaging/punchy even when using quotes as color
NOTE: You can only put things in direct quotes that were already in direct quotes in the source article inputs
NOTE: Unless told otherwise, the headline should be based on the lede or angle for Source Article 1.

Source Content:
Source 1 (important){{#sources.0.isBaseSource}}
This is the base source that should define the core story{{/sources.0.isBaseSource}}:
{{#sources.0.factsBitSplitting1}}
{{sources.0.factsBitSplitting1}}{{sources.0.factsBitSplitting2}}{{/sources.0.factsBitSplitting1}}

{{#sources.1.factsBitSplitting1}}Source 2:{{sources.1.factsBitSplitting1}}{{sources.1.factsBitSplitting2}}{{/sources.1.factsBitSplitting1}}

{{#sources.2.factsBitSplitting1}}Source 3:{{sources.2.factsBitSplitting1}}{{sources.2.factsBitSplitting2}}{{/sources.2.factsBitSplitting1}}

{{#sources.3.factsBitSplitting1}}Source 4:{{sources.3.factsBitSplitting1}}{{sources.3.factsBitSplitting2}}{{/sources.3.factsBitSplitting1}}

{{#sources.4.factsBitSplitting1}}Source 5:{{sources.4.factsBitSplitting1}}{{sources.4.factsBitSplitting2}}{{/sources.4.factsBitSplitting1}}

{{#sources.5.factsBitSplitting1}}Source 6:{{sources.5.factsBitSplitting1}}{{sources.5.factsBitSplitting2}}{{/sources.5.factsBitSplitting1}}
`;

// ==========================================================================
// Assistant Prompt
// ==========================================================================

const ASSISTANT_PROMPT = `Here is the attention-grabbing headline and the {{input.noOfBlobs}} requested blobs based on the input and editor instructions. These magnetic blobs are only 10-20 words long and are written in zippy plain-english.`;

/* ==========================================================================*/
// Route Handler
/* ==========================================================================*/

export async function POST(request: NextRequest) {
  try {
    const body: Step03HeadlinesBlobsRequest = await request.json();

    // Validate required fields ------
    const validationError = validateRequest(Boolean(body.noOfBlobs) && body.noOfBlobs >= 1, {
      headline: "",
      blobs: [],
      usage: [],
    } as Step03HeadlinesBlobsAIResponse);
    if (validationError) return validationError;

    // Format System Prompt ------
    const finalSystemPrompt = formatPrompt2(SYSTEM_PROMPT, undefined, PromptType.SYSTEM);

    // Format User Prompt ------
    const finalUserPrompt = formatPrompt2(USER_PROMPT, { input: body, sources: body.sources }, PromptType.USER);

    // Format Assistant Prompt ------
    const finalAssistantPrompt = formatPrompt2(ASSISTANT_PROMPT, { input: body }, PromptType.ASSISTANT);

    // Create a route-specific logger for this step
    const logger = createPipelineLogger(`route-step03-${Date.now()}`, 'aggregate');
    logger.logStepPrompts(3, "Headlines Blobs", finalSystemPrompt, finalUserPrompt, finalAssistantPrompt);

    // Generate text using messages approach
    const { text: rawHeadlineAndBlobs, usage: anthropicUsage } = await generateText({
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

    console.log("generated raw headline and blobs", rawHeadlineAndBlobs);
    console.log("which one is the winner", body.headlineSuggestion ? body.headlineSuggestion : rawHeadlineAndBlobs);

    // Structure with OpenAI
    const { object: structuredHeadlineAndBlobs, usage: openaiUsage } = await generateObject({
      model: structuredModel,
      system: "Do not change any word in the output. Just return the headline and blobs in the specified format. Do not add any other text or commentary. Verbatim.",
      prompt: "Output the headline and blobs in the specified format. Here is the raw output from the AI: " + rawHeadlineAndBlobs,
      schema: HeadlineAndBlobsSchema,
      temperature: TEMPERATURE_STRUCTURED,
    });

    console.log("structured headline and blobs", structuredHeadlineAndBlobs);

    const outputHeadline = body.headlineSuggestion ? body.headlineSuggestion : structuredHeadlineAndBlobs.headline;

    // Build response - only AI data
    const response: Step03HeadlinesBlobsAIResponse = {
      headline: outputHeadline,
      blobs: structuredHeadlineAndBlobs.blobs,
      usage: [
        {
          inputTokens: anthropicUsage?.promptTokens ?? 0,
          outputTokens: anthropicUsage?.completionTokens ?? 0,
          model: MODEL.modelId,
          ...anthropicUsage
        },
        {
          inputTokens: openaiUsage?.promptTokens ?? 0,
          outputTokens: openaiUsage?.completionTokens ?? 0,
          model: structuredModel.modelId,
          ...openaiUsage
        },
      ]
    };

    logger.logStepResponse(3, "Headlines Blobs", response);

    // Close the logger to ensure logs are flushed
    await logger.close();

    return NextResponse.json(response);
  } catch (error) {
    console.error("Step 03 - Headlines blobs failed:", error);

    const errorResponse: Step03HeadlinesBlobsAIResponse = {
      headline: "",
      blobs: [],
      usage: [],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
