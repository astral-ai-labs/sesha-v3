/* ==========================================================================*/
// route.ts — Step 03: Write Headline and Blobs API Route
/* ==========================================================================*/
// Purpose: Generate punchy headline and short blobs for the story
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
import { buildPrompts } from "@/lib/utils";
import { createPipelineLogger } from "@/lib/pipeline-logger";

// Local Types ----
import { Step03WriteHeadlineAndBlobsRequest, Step03WriteHeadlineAndBlobsAIResponse } from "@/types/digest";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

/* ==========================================================================*/
// Configuration
/* ==========================================================================*/

const structuredModel = openai("gpt-4o");
const model = anthropic("claude-3-5-sonnet-20240620");
// const model = openai("gpt-4.1");

/* ==========================================================================*/
// Schema
/* ==========================================================================*/

const HeadlineAndBlobsSchema = z.object({
  headline: z.string().describe("A punchy, attention-grabbing headline that captures the most newsworthy development"),
  blobs: z.array(z.string()).describe("Array of short, punchy sentences covering core highlights of the story"),
});

/* ==========================================================================*/
// Prompts
/* ==========================================================================*/

const SYSTEM_PROMPT = `
We are expert journalists in the process of writing an article that is a digest of a much longer text. Write a headline and set of additional sentences (called blobs) based on these instructions and the source content. 

INSTRUCTIONS FOR THE HEADLINE AND BLOBS: The headline and blobs should encompass the most interesting and most timely elements or developments in the article. The headline and blobs should be short, engaging and magnetic. Blobs can include direct quotes when mentioning striking/notable things people have said but must be short and punchy. The blobs should cover each element in the story so that we understand the core highlights across the various events of the article. The headline must capture the most important or newsworthy/recent development in the story. It should be clear, factual, and interesting. It should be specific and attention grabbing. Think tabloid, with the most juicy or dramatic and TIMELY SPECIFIC DETAILS detail in the headline. 

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

The goal of each of the headline and blobs is to HOOK the reader and give them a quick sense of the most attention-worthy elements of the story, and make sure to follow the editor instructions if the editor suggests content for the blobs.

Here some examples of well-written headlines and blobs:

Headline: New York state Christian university fires two employees for using pronouns in their emails
Blob: Dorm directors AREN’T transgender but wanted to use pronouns because they have confusing names
Blob:  700 alumni protest in latest round of America’s culture wars
Blob: University insists refusal to remove pronouns was in ‘breach of institutional policy’
Blob:  'As Christians, we’ve forgotten how to care for people,' says worker

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

Headline: China escalates tech war with US by banning products from America’s biggest chipmaker for 'serious network security' risks
Blob: Move against Micron Inc seen as retaliation for tech restrictions imposed by West on China
Blob: Block comes day after G7 leaders roasted Beijing for human rights abuses, economic policies and saber-rattling over Taiwan
Blob: But China still can’t make its own chips and will likely to turn to South Korea for replacements

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


const USER_PROMPT = `
Number of Blobs: {{num_blobs}}

IMPORTANT EDITOR NOTES:  
{{editor_notes}}

Additional editor instructions:
Each blob MUST start with a different word.
Dial up the tabloid and voyeuristic nature of the writing, but use casual, easy to understand information. Avoid slang.
The blobs must be short, punchy, and written in a newsy style (not dry)
Make sure to include the author or context of the source article in the first blob. (Eg, "... in a piece by X author in Y publication")
Even if the input is hard science, a dry court ruling, or another dense text, the headline and blobs MUST be written in pithy, easy‑to‑understand english. For example, instead of "In a groundbreaking judgement addressing the multifaceted elements of electric vehicles, a Michigan court declared that..." just write "A Michigan court ruled X" 
It is VITAL that the blobs are very short (10-20 words) and highly engaging/punchy even when using quotes as color

Source Content:

Source: {{source_accredit}}
{{source_description}}
--
Facts and summary of the source content to use as reference:
<summary>
{{summarize_facts}}
Quotes that may be used as additional reference:
<quote-list>
{{extract_fact_quotes}}
`;

/* ==========================================================================*/
// Route Handler
/* ==========================================================================*/

export async function POST(request: NextRequest) {
  try {
    const body: Step03WriteHeadlineAndBlobsRequest = await request.json();

    // Validate required fields - allow empty strings but not undefined/null
    if (body.instructions === undefined || body.instructions === null) {
      return NextResponse.json(
        {
          headline: "",
          blobs: [],
        },
        { status: 400 }
      );
    }

    // Resolve dynamic pieces for the user prompt

    // Build prompts using the helper function
    const [systemPrompt, userPrompt] = buildPrompts(
      SYSTEM_PROMPT,
      USER_PROMPT,
      undefined, // No system variables needed
      {
        num_blobs: body.blobs.toString(),
        editor_notes: body.instructions,
        source_accredit: body.sourceAccredit || "",
        source_description: body.sourceDescription || "",
        source_text: body.sourceText || "",
        summarize_facts: body.summarizeFacts || "",
        extract_fact_quotes: body.extractFactQuotes || "",
      }
    );

    // Create a route-specific logger for this step
    const logger = createPipelineLogger(`route-step03-${Date.now()}`, 'digest');
    logger.logStepPrompts(3, "Write Headline and Blobs", systemPrompt, userPrompt);

    // Generate text using AI SDK
    const { text: rawHeadlineAndBlobs, usage: anthropicUsage } = await generateText({
      model,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
        {
          role: "assistant",
          content: `Here is the attention-grabbing headline and the ${body.blobs} requested blobs based on the input and editor instructions. These magnetic blobs are only 10-20 words long and are written in zippy plain-english.`
        }
      ],
      temperature: 0.5,
      maxTokens: 500,
    });

    console.log("generated raw headline and blobs", rawHeadlineAndBlobs);
    console.log("which one is the winner", body.headline ? body.headline : rawHeadlineAndBlobs);

    // Strucure with OpenAI
    const { object: structuredHeadlineAndBlobs, usage: openaiUsage } = await generateObject({
      model: structuredModel,
      system: "Do not change any word in the output. Just return the headline and blobs in the specified format. Do not add any other text or commentary. Verbatim.",
      prompt: "Output the headline and blobs in the specified format. Here is the raw output from the AI: " + rawHeadlineAndBlobs,
      schema: HeadlineAndBlobsSchema,
    });

    console.log("structured headline and blobs", structuredHeadlineAndBlobs);

    logger.logStepResponse(3, "Write Headline and Blobs", structuredHeadlineAndBlobs);

    // process.exit(0);

    // Build response - only AI data
    const response: Step03WriteHeadlineAndBlobsAIResponse = {
      headline: body.headline ? body.headline : structuredHeadlineAndBlobs.headline,
      blobs: structuredHeadlineAndBlobs.blobs,
      headlineSource: body.headlineSource || 'ai',
      usage: [
        {
          inputTokens: anthropicUsage?.promptTokens ?? 0,
          outputTokens: anthropicUsage?.completionTokens ?? 0,
          model: model.modelId,
          ...anthropicUsage
        },
        {
          inputTokens: openaiUsage?.promptTokens ?? 0,
          outputTokens: openaiUsage?.completionTokens ?? 0,
          model: structuredModel.modelId,
          ...openaiUsage
        },
      ],
    };

    // Close the logger to ensure logs are flushed
    await logger.close();

    return NextResponse.json(response);
  } catch (error) {
    console.error("Step 03 - Write headline and blobs failed:", error);

    const errorResponse: Step03WriteHeadlineAndBlobsAIResponse = {
      headline: "",
      blobs: [],
      usage: [],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}