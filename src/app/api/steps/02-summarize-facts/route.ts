/* ==========================================================================*/
// route.ts — Step 02: Summarize Facts API Route
/* ==========================================================================*/
// Purpose: Create detailed and comprehensive 200-word summary of key facts
// Sections: Imports, Configuration, Prompts, Route Handler, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// Next.js Core ---
import { NextRequest, NextResponse } from "next/server";

// AI SDK Core ---
import { generateText } from "ai";

// Local Utilities ---
import { buildPrompts } from "@/lib/utils";
import { createPipelineLogger } from "@/lib/pipeline-logger";

// Local Types ----
import { Step02SummarizeFactsRequest, Step02SummarizeFactsAIResponse } from "@/types/digest";
import { anthropic } from "@ai-sdk/anthropic";

/* ==========================================================================*/
// Configuration
/* ==========================================================================*/

// const model = openai("gpt-4o");
// const model = anthropic("claude-4-sonnet-20250514");
const model = anthropic("claude-sonnet-4-5-20250929");

/* ==========================================================================*/
// Schema
/* ==========================================================================*/

/* ==========================================================================*/
// Prompts
/* ==========================================================================*/

const SYSTEM_PROMPT = `
<role> You are an expert senior news editor in the process of writing an article that is a digest of a much longer text.</role>
<instructions>
Write a detailed and comprehensive 200-word summary of the key facts, events, and content in the provided source material.

Here are some editor notes that may be useful in writing the summary:
{{instructions}}

Make sure that you report the facts as they are, don't add analysis. The digest is of longer source content which may be an opinion piece, a legal brief, a scientific paper, etc. If the piece is opinion or writing from someone, this digest article will be about their writing (for example "Claudine Gay pushes back against her Harvard ousting in new op-ed in the New York Times." or another example "Trump's latest Tweet could land him in prison, legal expert claims").

The summary should include a reference to what the source material is and what format it is. (For example, "In a supreme court ruling, justices X Y Z write..." or "In an interview with Nume on DMG News, Michael Gunn stated..." etc).

Explain in detail who each person is, the timeline of events (key dates, etc), and the key conflict/events of the source content. Also include any relevant or important facts and figures and hard numbers/data.
</instructions>

FORMAT:
<summary>
(insert 200-word summary of the content (what was the press release, what did the study find, what was the court decision, what is the content... , etc))
</summary>

Here's an example from a past summary:
<example>
In a Court of Appeal ruling, Lord Justice Holroyde and two other judges quashed the conviction of Kathleen Crane, a former Post Office employee who had pleaded guilty to fraud in 2010. Crane had been prosecuted by the Post Office after an audit showed an apparent shortfall of £18,721.52 in the accounts of the sub-Post Office run by her husband. Despite paying back the full amount and explaining that she had falsified accounts to roll over into the next accounting period due to unexplained shortfalls, Crane was convicted and sentenced to a community order with 200 hours of unpaid work. The Court of Appeal found that Crane's prosecution was an abuse of process, as it relied on unreliable data from the Post Office's Horizon accounting system. The Post Office had failed to investigate or disclose known problems with Horizon, preventing Crane from challenging the reliability of the data in her case. The ruling is the first to result from a proactive review by the Post Office's current legal representatives, identifying potential miscarriages of justice in cases involving Horizon data. 
</example>

<example>
In an exclusive, wide-ranging interview with The Telegraph's Camilla Tominey, Nigel Farage discussed the state of British politics, the future of the Conservative party, and his own potential political plans. During the "Lunch Hour" interview for the Telegraph's Politics Newsletter, Farage argued that the Conservatives have betrayed their voters on issues like Brexit and immigration, and predicted they will suffer heavy losses in the upcoming local and general elections. He believes the Reform party, which he currently serves as honorary president, has an opportunity to reshape the center-right of British politics and could potentially win more votes than the Conservatives in the next general election. Tominey pressed Farage on whether he would stand as a candidate for Reform in the next general election, but he remained eluse. He said he is considering three options: continuing his media work, moving to the US to work with Donald Trump, or returning to active politics with Reform. He emphasized the difficulty of this decision at age 60. On other issues, Farage called for scrapping widespread postal voting, arguing it enables fraud, and advocated for a more proportional electoral system and an elected House of Lords. He expressed hope in winning over younger "Gen Z" voters and criticized the government's failure to help small businesses post-Brexit. When asked about foreign policy, Farage predicted Trump will win in 2024 and said Trump would pursue negotiations between Russia and Ukraine. He believes the West needs to consider its endgame in the war.
</example>

<example>
A new study published in Nature explores the evolution of menopause whales and suggests that the patterns may help explain the evolution of menopause in humans and other species. The study, by Sam Ellis et al found that menopause evolved independently at least four times in toothed whales. By analyzing data on lifespan, reproductive lifespan, and demography across 32 toothed whale species, the researchers determined that menopause evolved in whales as an extension of their overall lifespan without extending their reproductive window. This "live long" pathway mirrors how menopause is thought to have evolved in humans. The findings suggest that in species with menopause, older females are able to help care with their grandoffspring without competing with their daughters reproductively. This allows them to provide intergenerational help while minimizing intergenerational harm. The repeated evolution of menopause in whales proves a unique window into the potential evolutionary pathway of menopause in humans. 
</example>
`;

const USER_PROMPT = `
Note: Make sure that the details and facts are understandable to the average reader. Write the summary in past tense.

Source content:
<source-1-content>
Source: {{accredit}}
Description: {{description}}
--
{{text}}
</source-1-content>
`;

/* ==========================================================================*/
// Route Handler
/* ==========================================================================*/

export async function POST(request: NextRequest) {
  try {
    const body: Step02SummarizeFactsRequest = await request.json();

    // Validate required fields
    if (!body.sourceText) {
      return NextResponse.json(
        {
          summary: "",
        },
        { status: 400 }
      );
    }

    // Build prompts using the helper function
    const [systemPrompt, userPrompt] = buildPrompts(
      SYSTEM_PROMPT,
      USER_PROMPT,
      {
        instructions: body.instructions || "",
      },
      {
        accredit: body.sourceAccredit,
        description: body.sourceDescription,
        text: body.sourceText,
      }
    );

    // Create a route-specific logger for this step
    const logger = createPipelineLogger(`route-step02-${Date.now()}`, 'digest');
    logger.logStepPrompts(2, "Summarize Facts", systemPrompt, userPrompt);

    // Generate structured object using AI SDK
    const { text: summary, usage } = await generateText({
      model,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
        {
          role: "assistant",
          content: "Here is a detailed and comprehensive 200-word summary of the key facts, events, and content in the provided source material. I have used newly-authored sentences to avoid plagiarism, but everything is based fully on the provided source-1-content: <summary>",
        },
      ],
      maxOutputTokens: 3000,
      temperature: 0.3,
    });

    // Build response - only AI data
    const response: Step02SummarizeFactsAIResponse = {
      summary: summary,
      usage: [
        {
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          model: model.modelId,
        },
      ],
    };

    logger.logStepResponse(2, "Summarize Facts", response);

    // Close the logger to ensure logs are flushed
    await logger.close();

    return NextResponse.json(response);
  } catch (error) {
    console.error("Step 02 - Summarize facts failed:", error);

    const errorResponse: Step02SummarizeFactsAIResponse = {
      summary: "",
      usage: [],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}