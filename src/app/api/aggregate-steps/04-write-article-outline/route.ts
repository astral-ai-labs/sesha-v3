/* ==========================================================================*/
// route.ts — Step 04: Write Article Outline API Route
/* ==========================================================================*/
// Purpose: Generate article outline by weaving together source content
// Sections: Imports, Configuration, Prompts, Route Handler, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// Next.js Core ---
import { NextRequest, NextResponse } from "next/server";

// AI SDK Core ---
import { generateText } from "ai";

// Local Utilities ---
import { formatPrompt2, PromptType } from "@/lib/utils";
import { createPipelineLogger } from "@/lib/pipeline-logger";

// Local Types ----
import { Step04WriteArticleOutlineRequest, Step04WriteArticleOutlineAIResponse } from "@/types/aggregate";
import { anthropic } from "@ai-sdk/anthropic";

/* ==========================================================================*/
// Configuration
/* ==========================================================================*/

const MODEL = anthropic("claude-3-5-sonnet-20240620");
const TEMPERATURE = 0.6;
const MAX_TOKENS = 3000;

// ==========================================================================
// System Prompts
// ==========================================================================

const SYSTEM_PROMPT_DEFAULT = `
<instructions>
You are an expert senior news editor in the process of writing an article that is an aggregation of multiple source articles. 

For this step, the user will provide a list of source article inputs. From the source list, you will write the top key points (in order) for the aggregated news article.

The first key point should be the same angle provided by the headline. For example, if the headline is "Nume responds to criticism following his music championship title," Nume's response should be the first key point.

Order the key points so that the article starts with the most recent/important information or development for the new article (dictated by the headline) and then moves logically through the story by covering each topic/angle/development in full before moving on. The article outline MUST weave together the sources rather than plodding through source by source, and must be impeccably accurate. Eack key point should be a combination of sources, but the sources are listed in order of importance.

You MUST include at least one key point from each of the provided sources. Make sure the key points from the sources build on the story and add context and details. Do not repeat key facts across articles (NO REPETITION)

IMPORTANT: Each key point must be a 100% factually accurate amalgamation of multiple facts and direct quotes across the whole of the source article inputs. 

There may be many facts and quotes in the source articles, but when writing a key point it must be facutally accurate. For example, a source article may speak of an event (like a bad interview), and another may have a quote about a different interview. When combining sources, you must provide context so that it's clear when, where, how, and what happened. In that example, you couldn't combine that quote with that key point since the quote was about a DIFFERENT event. Everything must be impeccably reported with 100% factual and contextual accuracy.

Here is the format:

FORMAT:
<outline>
KEY POINTS IN ORDER:
1: Cover/inlcude (insert key point (this must be the same angle as the headline)) (insert source tags)
2: Cover/inlcude (insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
3: Cover/inlcude (insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
4: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
5: Cover/inlcude (insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
6: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
7: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
8: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
9: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
10: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
...
N: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
</outline>

(do not write a conclusion)

RULES:
- KEY POINT 1 must be the same angle as the headline and should be based on source 1 (the latest or most important development)
- KEY POINT 1 is NOT a summary, it's just the most relevant and important first fact of the article as determined by the headline
- In the outline, you MUST reference every one of the source articles (generally move through them by doing a few key points about each source)
- Do not author your own opinions or analysis, stick to the facts and quotes in the source inputs and weave them together into a cohesive article outline

The sources are provided in order of importance. Pull as much as possible from Source 1.
</instructions>

###

Here are examples of well structured outlines you've written in the past:

{{example_outlines}}
`;

const SYSTEM_PROMPT_VERBATIM = `
<instructions>
You are an expert senior news editor in the process of writing an article that is an aggregation of multiple source articles. 

For this step, the user will provide a list of source article inputs. From the source list, you will write the top key points (in order) for the aggregated news article.

The first key point should be the same angle provided by the headline. For example, if the headline is "Nume responds to criticism following his music championship title," Nume's response should be the first key point.

Order the key points so that the article starts with the most recent/important information or development for the new article (dictated by the headline) and then moves logically through the story by covering each topic/angle/development in full before moving on. The article outline MUST weave together the sources rather than plodding through source by source, and must be impeccably accurate. Eack key point should be a combination of sources, but the sources are listed in order of importance.

You MUST include at least one key point from each of the provided sources. Make sure the key points from the sources build on the story and add context and details. Do not repeat key facts across articles (NO REPETITION)

IMPORTANT: Each key point must be a 100% factually accurate amalgamation of multiple facts and direct quotes across the whole of the source article inputs. 

There may be many facts and quotes in the source articles, but when writing a key point it must be facutally accurate. For example, a source article may speak of an event (like a bad interview), and another may have a quote about a different interview. When combining sources, you must provide context so that it's clear when, where, how, and what happened. In that example, you couldn't combine that quote with that key point since the quote was about a DIFFERENT event. Everything must be impeccably reported with 100% factual and contextual accuracy.

Here is the format:

FORMAT:
<outline>
KEY POINTS IN ORDER:
1: Cover/inlcude (insert key point (this must be the same angle as the headline)) (insert source tags)
2: Cover/inlcude (insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
3: Cover/inlcude (insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
4: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
5: Cover/inlcude (insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
6: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
7: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
8: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
9: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
10: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
...
N: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
</outline>

(do not write a conclusion)

RULES:
- KEY POINT 1 and the first few points should indicate that the article should use the editor provided opening word for word, The next point(s) must flow seamlessly from the editor-provided opening into the rest of the article
- In the outline, you MUST reference every one of the source articles (generally move through them by doing a few key points about each source)
- Do not author your own opinions or analysis, stick to the facts and quotes in the source inputs and weave them together into a cohesive article outline

You must use this exact text of the opening of the article, so indicate as much in the outline (and flow well into the next points): {{sources.0.text}}
</instructions>

###

Here are examples of well structured outlines you've written in the past:

{{example_outlines}}
`;

// ==========================================================================
// User Prompt
// ==========================================================================

const USER_PROMPT = `
<instructions>
{{headline}}
{{blobs}}
You must weave together the sources and write each key point in your own words by combining multiple sources for each key point

Editor Notes:
{{instructions}}
Source 1 {{#sources.0.accredit}}{{sources.0.accredit}}{{/sources.0.accredit}} is most important and should determine the angle of the story
Key point 1 MUST be the same angle as the headline

Pull from each one of the source inputs and weave them together: {{keyPointInstructions}}
Pull the most key points from Sources 1 and 2. Each key point must be an amalgamation of multiple facts and direct quotes across the whole of the source article inputs
NOTE: You can only put things in direct quotes that were already in direct quotes in the source articles
NOTE: Make sure to synthesize details and paraphrase the source material in this outline to avoid plagiarism

IMPORTANT: Each key point must be a 100% factually accurate amalgamation of multiple facts and direct quotes across the whole of the source article inputs. 

There may be many facts and quotes in the source articles, but when writing a key point it must be facutally accurate. For example, a source article may speak of an event (like a bad interview), and another may have a quote about a different interview. When combining sources, you must provide context so that it's clear when, where, how, and what happened. In that example, you couldn't combine that quote with that key point since the quote was about a DIFFERENT event. Everything must be impeccably reported with 100% factual and contextual accuracy.

FORMAT:
<outline>
KEY POINTS IN ORDER:
1: Cover/inlcude (insert key point (this must be the same angle as the headline)) (insert source tags)
2: Cover/inlcude (insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
3: Cover/inlcude (insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
4: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
5: Cover/inlcude (insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
6: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
7: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
8: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
9: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
10: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
...
N: Cover/inlcude(insert next key point about the main story by weaving together the information from the source articles) (insert source tags)
</outline>

{{#sources.0.useVerbatim}}For the first few key points, indicate that the user must use the editor-provided opening verbatim. The next point must flow seamlessly from the editor-provided opening into the rest of the article{{/sources.0.useVerbatim}}
</instructions>

Source Article Input List (craft the aggregated news article from these inputs):

NOTE: Some of these articles may include different stories or events, so make sure that the key points are clear and accurate so that no stories are incorrectly "mixed up"

<input source article 1>
{{^sources.0.useVerbatim}}
Source 1 (aim for about 5 key points about Source 1):
<source-1-content>
{{sources.0.factsBitSplitting1}}{{sources.0.factsBitSplitting2}}
</source-1-content>
{{/sources.0.useVerbatim}}
{{#sources.0.useVerbatim}}
Source 1 (this exact text will be the opening of the article, so the first few key points should indicate that this exact text is the opening):
{{sources.0.factsBitSplitting1}}{{/sources.0.useVerbatim}}
</input source article 1>

{{#sources.1.factsBitSplitting1}}
<input source article 2>
Source 2 (pull about 4 key points about Source 2):
<source-2-content>
{{sources.1.factsBitSplitting1}}{{sources.1.factsBitSplitting2}}
</source-2-content>
</input source article 2>
{{/sources.1.factsBitSplitting1}}

{{#sources.2.factsBitSplitting1}}
<input source article 3>
<source-3-content>
Source 3 (pull about 3 key points about Source 3):
{{sources.2.factsBitSplitting1}}{{sources.2.factsBitSplitting2}}
</source-3-content>
</input source article 3>
{{/sources.2.factsBitSplitting1}}

{{#sources.3.factsBitSplitting1}}
<input source article 4>
Source 4 (pull about 2 key points about Source 4):
<source-4-content>
{{sources.3.factsBitSplitting1}}{{sources.3.factsBitSplitting2}}
</source-4-content>
</input source article 4>
{{/sources.3.factsBitSplitting1}}

{{#sources.4.factsBitSplitting1}}
<input source article 5>
Source 5 (pull about 2 key points about Source 5):
<source-5-content>
{{sources.4.factsBitSplitting1}}{{sources.4.factsBitSplitting2}}
</source-5-content>
</input source article 5>
{{/sources.4.factsBitSplitting1}}

{{#sources.5.factsBitSplitting1}}
<input source article 6>
Source 6 (pull about 1-2 key points about Source 6):
<source-6-content>
{{sources.5.factsBitSplitting1}}{{sources.5.factsBitSplitting2}}
</source-6-content>
</input source article 6>
{{/sources.5.factsBitSplitting1}}
`;

// ==========================================================================
// Assistant Prompt
// ==========================================================================

const ASSISTANT_PROMPT = `Here is the article outline organized by key points that weave together the source content:

<outline>
KEY POINTS IN ORDER:`;

/* ==========================================================================*/
// Helper Functions
/* ==========================================================================*/

/**
 * Generate hardcoded instructions based on number of sources
 *
 * @param sourceCount - Number of sources provided
 * @returns String with specific instructions for the number of key points to pull
 */
function getKeyPointInstructions(sourceCount: number): string {
  if (sourceCount >= 1 && sourceCount <= 3) {
    return "Pull 12 key points for the outline.";
  } else if (sourceCount === 4) {
    return "Pull 14 key points for the outline.";
  } else if (sourceCount === 5) {
    return "Pull 16 key points for the outline.";
  } else if (sourceCount >= 6) {
    return "Pull at least 17 key points for the outline.";
  } else {
    // Fallback for edge case
    return "Pull 12 key points for the outline.";
  }
}

/**
 * Get example outlines based on verbatim flag
 *
 * @param isVerbatim - Whether to show verbatim examples or default examples
 * @returns String containing the appropriate examples
 */
function getExampleOutlines(isVerbatim: boolean): string {
  const defaultExamples = `
EXAMPLE 1:
<outline>
KEY POINTS IN ORDER:
1. Cover Navalnaya's call for a polling day protest in a memo circulated on Thursday (Source 1 BBCNews, Source 2 WashPo, Source 4 Reuters)
2. Include Navalnaya's voting instructions and social media support on the X platform. (Source 1 BBCNews, Source 2 WashPo, Source 4 Reuters)
3. Cover Alexei Navalny's proposed protest actions before his death (Source 1 BBCNews, Source 4 Reuters)
4. Cover Kremlin's cause of death claim and supporters' blame on Putin (Source 1 BBCNews, Source 3 The Telegraph)
5. Include Ukraine's first lady declining to sit next to Navalnaya at State of the Union (Source 1 BBCNews, Source 4 Reuters)
6. Cover Navalny's anti-corruption icon status and clouded legacy in Ukraine (Source 2 WashPo)
7. Include White House's reason for Zelenska's decision (Source 2 WashPo, Source 3 The Telegraph)
8. Include Navalnaya's reason for not attending Biden's address (Source 2 WashPo, Source 3 The Telegraph)
9. Cover Macron urging allies to support Ukraine and discuss sending troops (Source 3 The Telegraph)
10. Include controversy and clarification of Macron's troop comments (Source 2 WashPo, Source 1 BBCNews)
11. Cover criticism from Putin's foreign intelligence chief on Macron's remarks (Source 2 WashPo, Source 4 Reuters)
12. Include context on Russian invasion leading to crisis and nuclear war warning (Source 4 Reuters)
</outline>

EXAMPLE 2: 
<outline>
KEY POINTS IN ORDER:
1. Cover MSNBC anchors mocking GOP primary voters in Virginia over immigration concerns (Source 1, Source 2 FoxNews, Source 4 Mediate)
2. Include Rachel Maddow's criticism of her network for airing Trump's Super Tuesday victory speech (Source 2 FoxNews, Source 4 Mediate)
3. Cover Gallup survey results on Americans citing immigration as the most important issue (Source 1, Source 2 FoxNews)
4. Include MSNBC cutting Trump's speech to fact-check claims on economy and immigration (Source 3 The Raw Story, Source 6 The Telegraph)
5. Cover Joy Reid's criticism of White working-class Republican voters on race and immigration (Source 1)
6. Include Rachel Maddow and Stephanie Ruhle fact-checking Trump's Super Tuesday speech (Source 1, Source 4 Mediate)
7. Cover MSNBC host praising Biden administration on wages and criticizing Trump's pandemic economy (Source 1, Source 3 The Raw Story, Source 5 Breitbart News)
8. Include critics accusing MSNBC of being disconnected from voters' immigration concerns (Source 1, Source 2 FoxNews)
9. Cover backlash against MSNBC from conservatives and anti-Trump figures for mocking segment (Source 2 FoxNews, Source 3 The Raw Story, Source 4 Mediate)
10. Include Trump's pledge in victory speech to tackle illegal border crossings (Source 1)
11. Cover Trump's pledge to close the border and deport people (Source 1, Source 2 FoxNews)
12. Include crowd chants of "USA, USA, USA" during Trump's speech (Source 6 The Telegraph)
13. Cover Republicans busing migrants to locations like New York and Martha's Vineyard (Source 2 FoxNews, Source 5 Breitbart News)
14. Include Van Jones's claim that Democrats can win on immigration with a mainstream position (Source 3 The Raw Story, Source 5 Breitbart News)
15. Cover Trump's primary victories in Virginia with immigration as a top priority for voters (Source 2 FoxNews, Source 5 Breitbart News)
</outline>

EXAMPLE 3:
<outline>
KEY POINTS IN ORDER:
1. Cover Nikki Haley's announcement to exit the Republican presidential race, clearing the path for Donald Trump (Source 1 CNN, Source 2 The Hill, Source 3 Newsweek)
2. Cover Biden campaign labeling Trump as "wounded, dangerous, and unpopular" despite his Super Tuesday dominance (Source 1 CNN)
3. Cover Biden campaign's plan to target moderate and Haley voters disillusioned with Trump (Source 1 CNN, Source 2 The Hill)
4. Include Republican voter hesitation to support the GOP candidate in November despite Trump's Super Tuesday success (Source 3 Newsweek, Source 4 The Raw Story)
5. Cover Haley's unexpected victory in Vermont and strong performances in other states (Source 2 The Hill, Source 3 Newsweek)
6. Include Biden campaign's declaration of a "clear path to victory" despite Trump's significant wins on Super Tuesday (Source 1 CNN, Source 3 Newsweek)
7. Cover Biden campaign memo criticizing Trump as "wounded, dangerous, and unpopular" despite his Super Tuesday victories (Source 1 CNN, Source 2 The Hill)
8. Include Biden campaign downplaying concerning poll numbers and focusing on undecided voters (Source 1 CNN)
9. Cover Mitch Landrieu's criticism of Trump's "low energy" and falsehood-filled victory speech (Source 4 The Raw Story, Source 5 WashPo)
10. Cover Democrats beginning to panic as Trump's campaign fails to implode (Source 1 CNN, Source 3 Newsweek)
11. Include Biden trailing Trump in polls, highlighting concerns about his message with swing voters (Source 2 The Hill)
12. Cover Supreme Court's unanimous decision in Trump's favor in a 14th Amendment case (Source 2 The Hill, Source 4 The Raw Story)
13. Include Ukraine's First Lady declining State of the Union invitation due to Navalny's support for Russia's territorial claims (Source 2 The Hill, Source 5 WashPo)
14. Cover Biden preparing for State of the Union address amid a politically divided Congress, highlighting achievements (Source 5 WashPo, Source 6 FoxNews)
15. Include that it will be the latest ever State of the Union address (Source 1 CNN, Source 4 The Raw Story)
</outline>

Example 4:
<outline>
KEY POINTS IN ORDER:
1. Cover Gary Goldsmith revealing on Celebrity Big Brother that Kate Middleton is recovering well from her surgery and receiving "the best care in the world" (Source 1 The Sun, Source 2, Source 3 Sun2)
2. Include Goldsmith dismissing conspiracy theories and assuring viewers Kate will return to her public duties (Source 1 The Sun, Source 2)
3. Cover Goldsmith's statement on Prince Harry and Meghan Markle's royal titles, suggesting they should be removed (Source 1 The Sun, Source 2)
4. Include Goldsmith's defense of Kate against being called common, highlighting her parents' multimillionaire status (Source 1 The Sun, Source 2, Source 3 Sun2)
5. Cover viewer backlash to Goldsmith's comments on Harry and Meghan, including threats to "switch off" the show (Source 2 GBNews, Source 3 Sun2)
6. Include housemate reactions to Goldsmith's remarks on the Sussexes, leading to his nomination for eviction by Sharon Osbourne (Source 2)
7. Cover Goldsmith's repeated statement that the Sussexes should lose their royal titles (Source 2, Source 3 Sun2)
8. Include the auction of Prince Harry's underwear, sold for nearly £200,000 to a San Diego strip club owner (Source 1 The Sun, Source 3 Sun2)
9. Cover the buyer's plans to use the underwear as part of a shrine to Prince Harry, describing them as historical from his "playboy days" (Source 3 Sun2)
10. Include OnlyFans banning the seller, Carrie Royale, for threatening to share non-consensual intimate images of Prince Harry (Source 1 The Sun, Source 3 Sun2)
</outline>
`;

  const verbatimExamples = `
EXAMPLE 1:
<outline>
KEY POINTS IN ORDER:
1-3. Include the editor-provided opening that starts with "Navalnaya's call for a polling day protest is a continuation of her husband's political work following his sudden death at a Russian penal colony on 16 February." (Source 1)
4. Cover Kremlin's cause of death claim and supporters' blame on Putin (Source 2 BBCNews, Source 4 The Telegraph)
5. Cover Ukraine's first lady declining to sit next to Navalnaya at State of the Union (Source 2 BBCNews, Source 5 Reuters)
6. Cover Navalny's anti-corruption icon status and clouded legacy in Ukraine (Source 3 WashPo)
7. Include White House's reason for Zelenska's decision (Source 3 WashPo, Source 4 The Telegraph)
8. Include Navalnaya's reason for not attending Biden's address (Source 3 WashPo, Source 4 The Telegraph)
9. Cover Macron urging allies to support Ukraine and discuss sending troops (Source 4 The Telegraph)
10. Include controversy and clarification of Macron's troop comments (Source 3 WashPo, Source 2 BBCNews)
11. Cover criticism from Putin's foreign intelligence chief on Macron's remarks (Source 3 WashPo, Source 5 Reuters)
12. Include context on Russian invasion leading to crisis and nuclear war warning (Source 5 Reuters)
</outline>

EXAMPLE 2: 
<outline>
KEY POINTS IN ORDER:
1-2. Use the editor-provided opening that starts with "MSNBC anchors Jen Psaki, Joy Reid, and Rachel Maddow mocked GOP primary voters in Virginia live on air for considering immigration their top concern." (Source 1)
3. Cover Gallup survey results on Americans citing immigration as the most important issue (Source 2, Source 3 FoxNews)
4. Include MSNBC cutting Trump's speech to fact-check claims on economy and immigration (Source 4 The Raw Story, Source 7 The Telegraph)
5. Cover Joy Reid's criticism of White working-class Republican voters on race and immigration (Source 2)
6. Include Rachel Maddow and Stephanie Ruhle fact-checking Trump's Super Tuesday speech (Source 2, Source 5 Mediate)
7. Cover MSNBC host praising Biden administration on wages and criticizing Trump's pandemic economy (Source 2, Source 4 The Raw Story, Source 6 Breitbart News)
8. Include critics accusing MSNBC of being disconnected from voters' immigration concerns (Source 2, Source 3 FoxNews)
9. Cover backlash against MSNBC from conservatives and anti-Trump figures for mocking segment (Source 3 FoxNews, Source 4 The Raw Story, Source 5 Mediate)
10. Include Trump's pledge in victory speech to tackle illegal border crossings (Source 2)
11. Cover Trump's pledge to close the border and deport people (Source 2, Source 3 FoxNews)
12. Include crowd chants of "USA, USA, USA" during Trump's speech (Source 7 The Telegraph)
13. Cover Republicans busing migrants to locations like New York and Martha's Vineyard (Source 3 FoxNews, Source 6 Breitbart News)
14. Include Van Jones's claim that Democrats can win on immigration with a mainstream position (Source 4 The Raw Story, Source 6 Breitbart News)
15. Cover Trump's primary victories in Virginia with immigration as a top priority for voters (Source 3 FoxNews, Source 6 Breitbart News)
</outline>

EXAMPLE 3:
<outline>
KEY POINTS IN ORDER:
1-3. Use editor-provided opening starting with "Nikki Haley will announce her exit from the Republican presidential race, clearing the path for Donald Trump." (Source 1)
4. Cover Republican voter hesitation to support the GOP candidate in November despite Trump's Super Tuesday success (Source 4 Newsweek, Source 5 The Raw Story)
5. Cover Haley's unexpected victory in Vermont and strong performances in other states (Source 3 The Hill, Source 4 Newsweek)
6. Include Biden campaign's declaration of a "clear path to victory" despite Trump's significant wins on Super Tuesday (Source 2 CNN, Source 4 Newsweek)
7. Cover Biden campaign memo criticizing Trump as "wounded, dangerous, and unpopular" despite his Super Tuesday victories (Source 2 CNN, Source 3 The Hill)
8. Include Biden campaign downplaying concerning poll numbers and focusing on undecided voters (Source 2 CNN)
9. Cover Mitch Landrieu's criticism of Trump's "low energy" and falsehood-filled victory speech (Source 5 The Raw Story, Source 6 WashPo)
10. Cover Democrats beginning to panic as Trump's campaign fails to implode (Source 2 CNN, Source 4 Newsweek)
11. Include Biden trailing Trump in polls, highlighting concerns about his message with swing voters (Source 3 The Hill)
12. Cover Supreme Court's unanimous decision in Trump's favor in a 14th Amendment case (Source 3 The Hill, Source 5 The Raw Story)
13. Include Ukraine's First Lady declining State of the Union invitation due to Navalny's support for Russia's territorial claims (Source 3 The Hill, Source 6 WashPo)
14. Cover Biden preparing for State of the Union address amid a politically divided Congress, highlighting achievements (Source 6 WashPo, Source 7 FoxNews)
15. Include that it will be the latest ever State of the Union address (Source 2 CNN, Source 5 The Raw Story)
</outline>

Example 4:
<outline>
KEY POINTS IN ORDER:
1-3. Use the editor-provided opening that starts with "Gary Goldsmith reveals on Celebrity Big Brother that Kate Middleton is recovering well from her surgery, receiving 'the best care in the world.'" (Source 1)
4. Include Goldsmith's defense of Kate against being called common, highlighting her parents' multimillionaire status (Source 2 The Sun, Source 3, Source 4 Sun2)
5. Cover viewer backlash to Goldsmith's comments on Harry and Meghan, including threats to "switch off" the show (Source 3 GBNews, Source 4 Sun2)
6. Include housemate reactions to Goldsmith's remarks on the Sussexes, leading to his nomination for eviction by Sharon Osbourne (Source 3)
7. Cover Goldsmith's repeated statement that the Sussexes should lose their royal titles (Source 3, Source 4 Sun2)
8. Include the auction of Prince Harry's underwear, sold for nearly £200,000 to a San Diego strip club owner (Source 2 The Sun, Source 4 Sun2)
9. Cover the buyer's plans to use the underwear as part of a shrine to Prince Harry, describing them as historical from his "playboy days" (Source 4 Sun2)
10. Include OnlyFans banning the seller, Carrie Royale, for threatening to share non-consensual intimate images of Prince Harry (Source 2 The Sun, Source 4 Sun2)
</outline>
`;

  return isVerbatim ? verbatimExamples : defaultExamples;
}

/* ==========================================================================*/
// Route Handler
/* ==========================================================================*/

export async function POST(request: NextRequest) {
  try {
    const body: Step04WriteArticleOutlineRequest = await request.json();

    // // Validate required fields ------
    // const validationError = validateRequest(Boolean(body.sources) && Boolean(body.articleStepOutputs), {
    //   outline: "",
    // } as Step04WriteArticleOutlineAIResponse);
    // if (validationError) return validationError;

    // Determine which system prompt to use based on verbatim flag
    const isVerbatim = body.sources[0]?.useVerbatim || false;
    const systemPromptTemplate = isVerbatim ? SYSTEM_PROMPT_VERBATIM : SYSTEM_PROMPT_DEFAULT;

    // Get appropriate examples based on verbatim flag
    const exampleOutlines = getExampleOutlines(isVerbatim);

    // Generate key point instructions based on source count
    const keyPointInstructions = getKeyPointInstructions(body.sources.length);


    // Format headline and blobs
    const headline = body.articleStepOutputs.headlinesBlobs?.headline || "";
    const blobs = body.articleStepOutputs.headlinesBlobs?.blobs.join("\n") || "";

    // Format System Prompt ------
    const finalSystemPrompt = formatPrompt2(
      systemPromptTemplate,
      {
        example_outlines: exampleOutlines,
        headline: headline,
        blobs: blobs,
      },
      PromptType.SYSTEM
    );

    // Format User Prompt ------
    const finalUserPrompt = formatPrompt2(
      USER_PROMPT,
      {
        instructions: body.instructions,
        headline: headline,
        blobs: blobs,
        sources: body.sources,
        keyPointInstructions: keyPointInstructions,
      },
      PromptType.USER
    );

    // Format Assistant Prompt ------
    const finalAssistantPrompt = formatPrompt2(ASSISTANT_PROMPT, undefined, PromptType.ASSISTANT);

    // Create a route-specific logger for this step
    const logger = createPipelineLogger(`route-step04-${Date.now()}`, 'aggregate');
    logger.logStepPrompts(4, "Write Article Outline", finalSystemPrompt, finalUserPrompt, finalAssistantPrompt);

    // Generate text using messages approach
    const { text: outline } = await generateText({
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

    // Build response
    const response: Step04WriteArticleOutlineAIResponse = {
      outline,
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
