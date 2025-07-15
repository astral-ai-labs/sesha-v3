/* ==========================================================================*/
// route.ts — Step 04: Write Article Outline API Route
/* ==========================================================================*/
// Purpose: Create structural outline for the article with 10+ key points
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
import { Step04WriteArticleOutlineRequest, Step04WriteArticleOutlineAIResponse } from "@/types/digest";

/* ==========================================================================*/
// Configuration
/* ==========================================================================*/

// const model = openai('gpt-4o')
// const model = anthropic("claude-4-sonnet-20250514");
const model = anthropic("claude-3-5-sonnet-20240620");

/* ==========================================================================*/
// Schema
/* ==========================================================================*/

/* ==========================================================================*/
// Prompts
/* ==========================================================================*/

const SYSTEM_PROMPT = `
<instructions>
We are in the process of writing an article that is a digest/report on a much longer text. The digest is of longer source content which may be an opinion piece, a legal brief, a scientific paper, a longer article, etc. If the piece is opinion or an article from someone, this digest article will be about their writing and credit the ideas and analysis to them (for example "Claudine Gay pushes back against her Harvard ousting in new op-ed in the New York Times."  or "Nume reports a breakdown in the Green Party in new CNN report") Use the source content, the headline and blobs, and the editor instructions and other notes to craft the article outline based on the sources.

Order the key points so that the article starts with the most recent/important information or development for the new article (dictated by the headline) and then moves logically through the story by covering each topic/angle/development in full before moving on. The article outline must be impeccably accurate. 

Do not repeat content across key facts (NO REPETITION)

IMPORTANT: Each key point must be a 100% factually accurate amalgamation of multiple facts and direct quotes from people across the whole of the source article input. 

There may be many facts and quotes in the source articles, but when writing a key point it must be facutally accurate. For example, a source article may speak of an event (like a bad interview), and another may have a quote about a different interview. When combining sources, you must provide context so that it's clear when, where, how, and what happened. In that example, you couldn't combine that quote with that key point since the quote was about a DIFFERENT event. Everything must be impeccably reported with 100% factual and contextual accuracy.

Here is the format:

FORMAT:
<outline>
KEY POINTS IN ORDER:
1: Cover/inlcude (insert key point (this must be the same angle as the headline)) (insert source tag)
2: Cover/inlcude (insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
3: Cover/inlcude (insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
4: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
5: Cover/inlcude (insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
6: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
7: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
8: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
9: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
10: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
...
N: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
</outline>

(do not write a conclusion)

RULES:
- KEY POINT 1 must be the same angle as the headline
- KEY POINT 1 is NOT a summary, it's just the most relevant and important first fact of the article as determined by the headline
- You must paraphrase the source content to avoid plagiarism
- You must write at least 10 key points
- After all of the key points, you must write "NOTE: Do not write a conclusion/summary"
</instructions>

###

Here are examples of well structured outlines you've written in the past:


EXAMPLE 1:
<outline>
KEY POINTS IN ORDER:
1. Cover Navalnaya's call for a polling day protest in a memo circulated on Thursday (Source 1)
2. Include Navalnaya's voting instructions and social media support on the X platform. (Source 1)
3. Cover Alexei Navalny's proposed protest actions before his death (Source 1)
4. Cover Kremlin's cause of death claim and supporters' blame on Putin (Source 1)
5. Include Ukraine's first lady declining to sit next to Navalnaya at State of the Union (Source 1)
6. Cover Navalny's anti-corruption icon status and clouded legacy in Ukraine (Source 1)
7. Include White House's reason for Zelenska's decision (Source 1)
8. Include Navalnaya's reason for not attending Biden's address (Source 1)
9. Cover Macron urging allies to support Ukraine and discuss sending troops (Source 1)
10. Include controversy and clarification of Macron's troop comments (Source 1)
11. Cover criticism from Putin's foreign intelligence chief on Macron's remarks (Source 1)
12. Include context on Russian invasion leading to crisis and nuclear war warning (Source 1)
</outline>

EXAMPLE 2: 
<outline>
KEY POINTS IN ORDER:
1. Cover MSNBC anchors mocking GOP primary voters in Virginia over immigration concerns (Source 1)
2. Include Rachel Maddow's criticism of her network for airing Trump's Super Tuesday victory speech (Source 1)
3. Cover Gallup survey results on Americans citing immigration as the most important issue (Source 1)
4. Include MSNBC cutting Trump's speech to fact-check claims on economy and immigration (Source 1)
5. Cover Joy Reid's criticism of White working-class Republican voters on race and immigration (Source 1)
6. Include Rachel Maddow and Stephanie Ruhle fact-checking Trump's Super Tuesday speech (Source 1)
7. Cover MSNBC host praising Biden administration on wages and criticizing Trump's pandemic economy (Source 1)
8. Include critics accusing MSNBC of being disconnected from voters' immigration concerns (Source 1)
9. Cover backlash against MSNBC from conservatives and anti-Trump figures for mocking segment (Source 1)
10. Include Trump's pledge in victory speech to tackle illegal border crossings (Source 1)
11. Cover Trump's pledge to close the border and deport people (Source 1)
12. Include crowd chants of "USA, USA, USA" during Trump's speech (Source 1)
13. Cover Republicans busing migrants to locations like New York and Martha's Vineyard (Source 1)
14. Include Van Jones's claim that Democrats can win on immigration with a mainstream position (Source 1)
15. Cover Trump's primary victories in Virginia with immigration as a top priority for voters (Source 1)
</outline>

EXAMPLE 3:
<outline>
KEY POINTS IN ORDER:
1. Cover Nikki Haley's announcement to exit the Republican presidential race, clearing the path for Donald Trump (Source 1)
2. Cover Biden campaign labeling Trump as "wounded, dangerous, and unpopular" despite his Super Tuesday dominance (Source 1)
3. Cover Biden campaign's plan to target moderate and Haley voters disillusioned with Trump (Source 1)
4. Include Republican voter hesitation to support the GOP candidate in November despite Trump's Super Tuesday success (Source 1)
5. Cover Haley's unexpected victory in Vermont and strong performances in other states (Source 1)
6. Include Biden campaign's declaration of a "clear path to victory" despite Trump's significant wins on Super Tuesday (Source 1)
7. Cover Biden campaign memo criticizing Trump as "wounded, dangerous, and unpopular" despite his Super Tuesday victories (Source 1)
8. Include Biden campaign downplaying concerning poll numbers and focusing on undecided voters (Source 1)
9. Cover Mitch Landrieu's criticism of Trump's "low energy" and falsehood-filled victory speech(Source 1)
10. Cover Democrats beginning to panic as Trump's campaign fails to implode (Source 1)
11. Include Biden trailing Trump in polls, highlighting concerns about his message with swing voters (Source 1)
12. Cover Supreme Court's unanimous decision in Trump's favor in a 14th Amendment case (Source 1)
13. Include Ukraine's First Lady declining State of the Union invitation due to Navalny's support for Russia's territorial claims (Source 1)
14. Cover Biden preparing for State of the Union address amid a politically divided Congress, highlighting achievements (Source 1)
15. Include that it will be the latest ever State of the Union address (Source 1)
</outline>

Example 4:
<outline>
KEY POINTS IN ORDER:
1. Cover Gary Goldsmith revealing on Celebrity Big Brother that Kate Middleton is recovering well from her surgery and receiving "the best care in the world" (Source 1)
2. Include Goldsmith dismissing conspiracy theories and assuring viewers Kate will return to her public duties (Source 1)
3. Cover Goldsmith's statement on Prince Harry and Meghan Markle's royal titles, suggesting they should be removed (Source 1)
4. Include Goldsmith's defense of Kate against being called common, highlighting her parents' multimillionaire status (Source 1)
5. Cover viewer backlash to Goldsmith's comments on Harry and Meghan, including threats to "switch off" the show (Source 1)
6. Include housemate reactions to Goldsmith's remarks on the Sussexes, leading to his nomination for eviction by Sharon Osbourne (Source 1)
7. Cover Goldsmith's repeated statement that the Sussexes should lose their royal titles (Source 1)
8. Include the auction of Prince Harry's underwear, sold for nearly £200,000 to a San Diego strip club owner (Source 1)
9. Cover the buyer's plans to use the underwear as part of a shrine to Prince Harry, describing them as historical from his "playboy days" (Source 1)
10. Include OnlyFans banning the seller, Carrie Royale, for threatening to share non-consensual intimate images of Prince Harry (Source 1)
</outline>

Use this summary to determine the angle of how to report on the source content:
{{summarize_facts}}
`;

const USER_PROMPT = `
We are in the process of writing an article that is a digest/report on a much longer text. The digest is a news article that reports on longer source content which may be an opinion piece, a legal brief, another article, a scientific paper, etc.

Credit the ideas and conclusions in the source article to the author or authoring body (for example "In analysis in the Independent, Nume argues XYZ") If it's a court decision or scientific paper, the news story should detail what the authors or council etc said or discovered in the source content. 

Use the source article and description, the headline and blobs, and the editor instructions and other source material to craft the article outline based on the source content. You must write at least 10 key points.

Order the key points so that the article starts with the most recent/important information or development for the new article (dictated by the headline) and then moves logically through the story by covering each topic/angle/development in full before moving on. The article outline must be impeccably accurate. 

Do not repeat content across key facts (NO REPETITION)

IMPORTANT: Each key point must be a 100% factually accurate amalgamation of multiple facts and direct quotes from people across the whole of the source article input. 

There may be many facts and quotes in the source articles, but when writing a key point it must be facutally accurate. For example, a source article may speak of an event (like a bad interview), and another may have a quote about a different interview. When combining sources, you must provide context so that it's clear when, where, how, and what happened. In that example, you couldn't combine that quote with that key point since the quote was about a DIFFERENT event. Everything must be impeccably reported with 100% factual and contextual accuracy.

Here is the format:

FORMAT:
<outline>
KEY POINTS IN ORDER:
1: Cover/inlcude (insert key point (this must be the same angle as the headline)) (insert source tag)
2: Cover/inlcude (insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
3: Cover/inlcude (insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
4: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
5: Cover/inlcude (insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
6: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
7: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
8: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
9: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
10: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
...
N: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tag)
</outline>

(do not write a conclusion)

RULES:
- KEY POINT 1 must be the same angle as the headline
- KEY POINT 1 is NOT a summary, it's just the most relevant and important first fact of the article as determined by the headline
- You must paraphrase the source content to avoid plagiarism
- You must write at least 10 key points
- After all of the key points, you must write "NOTE: Do not write a conclusion/summary"


###

Headline & Blobs (to help guide article):
{{headlines_and_blobs}}

{{editor_instructions}}

Make sure to include the author or context of the source in key point one (was it an opinion piece by x author? was it a study published by x group? etc)

Make sure the article will be easy to understand, even if the source text is complex (like a study or press release).
Make sure that the outline and article is extremely long and comprehensive, and that complex concepts or phrases are explained (using the source content)

###

Here are source articles that should be used for reference:

Source 1: {{source_accredit}}
Description: {{source_description}}
--
{{source_text}}

###
Summary and facts to use as reference:
<summary>
{{summarize_facts}}

Quotes to use as additional reference:
{{extract_fact_quotes}}
`;

/* ==========================================================================*/
// Route Handler
/* ==========================================================================*/

export async function POST(request: NextRequest) {
  try {
    const body: Step04WriteArticleOutlineRequest = await request.json();

    // Validate required fields
    if (!body.sourceText) {
      return NextResponse.json(
        {
          outline: "",
        },
        { status: 400 }
      );
    }

    // Prepare editor instructions block
    let editorInstructionsBlock = "";
    if (body.instructions) {
      editorInstructionsBlock = `Editor Notes (IMPORTANT): 
You must follow these important mandatory editor instructions: 
<mandatory-editor-instructions>${body.instructions}</mandatory-editor-instructions>
`;
    }

    // Build prompts using the helper function
    const [systemPrompt, userPrompt] = buildPrompts(
      SYSTEM_PROMPT,
      USER_PROMPT,
      {
        summarize_facts: body.summarizeFactsText || "",
      },
      {
        headlines_and_blobs: body.headlineAndBlobsText || "",
        editor_instructions: editorInstructionsBlock,
        source_accredit: body.sourceAccredit || "",
        source_description: body.sourceDescription || "",
        source_text: body.sourceText || "",
        summarize_facts: body.summarizeFactsText || "",
        extract_fact_quotes: body.extractFactQuotesText || "",
      }
    );

    // Create a route-specific logger for this step
    const logger = createPipelineLogger(`route-step04-${Date.now()}`, 'digest');
    logger.logStepPrompts(4, "Write Article Outline", systemPrompt, userPrompt);

    // Generate structured object using AI SDK
    const { text: outline } = await generateText({
      model,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
        {
          role: "assistant",
          content: "Here is the outline that intersperses/weaves together the facts and details and direct quotes from the source article input to craft the story in a clear, logical order. The lede is the same angle as the headline. All of the facts and quotes are thoroughly rooted in the source material and 100% accurate. <outline>",
        },
      ],
      temperature: 0.6,
      maxTokens: 3000,
    });

    // Build response - only AI data
    const response: Step04WriteArticleOutlineAIResponse = {
      outline: outline,
    };

    logger.logStepResponse(4, "Write Article Outline", response);

    // Close the logger to ensure logs are flushed
    await logger.close();

    return NextResponse.json(response);
  } catch (error) {
    console.error("Step 04 - Write article outline failed:", error);

    const errorResponse: Step04WriteArticleOutlineAIResponse = {
      outline: "",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
