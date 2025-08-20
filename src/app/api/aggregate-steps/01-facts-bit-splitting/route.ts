/* ==========================================================================*/
// route.ts — Step 01: Facts Bit Splitting API Route
/* ==========================================================================*/
// Purpose: Split the facts into 2-3 bits, each with 1-2 facts
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
import { Step01FactsBitSplittingRequest, Step01FactsBitSplittingAIResponse, Source } from "@/types/aggregate";
import { anthropic } from "@ai-sdk/anthropic";

/* ==========================================================================*/
// Configuration
/* ==========================================================================*/

// const model = openai("gpt-4o");
// const model = anthropic("claude-sonnet-4-20250514-20250514");
const MODEL = anthropic("claude-sonnet-4-20250514");

const TEMPERATURE = 0.8;

const MAX_TOKENS = 4000;

// ==========================================================================
// System Prompts
// ==========================================================================

const SYSTEM_PROMPT = `
{{^source.useVerbatim}}
{{^source.isPrimarySource}}
<role>
You are an expert editor ingesting an article to split it up into a list of facts (in your own words) and direct quotes from people.
</role>
<instructions>
Fully rewrite the article into a list of facts with zero plagiarism and direct quotes. You must take care to include all direct quotes from people verbatim, and remember to preserve all key facts in the new list. Add the given source tag to the end of each line of your new list.

Rules:
- YOU ABSOLUTELY MUST KEEP ALL DIRECT QUOTES FROM PEOPLE QUOTED IN THE SOURCE ARTICLE
-All recognizable groups of words must be changed (except inside direct quotes)
-Rewrite holistically, don't just rephrase line by line — synthesize information that was across different sections and split up sentences into their component facts
-Keep all relevant details so that no information is lost
-All direct quotes (inside quotation marks) must be included verbatim so that they aren't altered, but rewrite the credits or structure of how direct quotes are presented
-There can be no plagiarism in the rewritten version
-Today's date is {{date}} (use this if needed)
-Do not change any dates or mentions of time like "last year," or "earlier this year," keep them as written to avoid confusion
</instructions>


Example with user input and assistant output:
Input example:
Source 3 Reuters
ARTICLE:
Tech stabber arrested in San Francisco 
Advertisment
April 13 (Reuters) - The man accused of stabbing and killing Cash App founder Bob Lee will stand trial. A judge found Tuesday there is enough evidence for Nima Momeni to face a murder charge.
"He stabbed him. The fact that he stabbed him multiple times it is disgusting," said Krista Lee, Bob Lee's ex-wife.
After two days of witness testimony during a preliminary hearing, a judge found there was enough evidence for Nima Momeni to stand trial on a murder charge for stabbing and killing tech executive Bob Lee.
RELATED: New surveillance images released from night of Bay Area tech exec Bob Lee's stabbing death
IMAGE: New surveillance images released from night of Cash App founder Bob Lee's stabbing death in San Francisco.
Momeni's defense team attempted to convince the judge that the two were friends and that no malice existed. At one point, they asked the judge to consider a finding on manslaughter instead of murder. The judge ultimately turning down that request. Still, Momeni's defense says the outcome was as they expected.
00:00
02:24
Read More
"We used this hearing as a mechanism to learn things and to educate people. We didn't put on our case," said Momeni's defense attorney Saam Zangeneh.
The District Attorney's Office said it was focused on facts, that Momeni was the last person seen with Lee and that Momeni drove Lee to a location where Lee's blood was later found. Also that Momeni's DNA was on the handle of the murder weapon and Lee's DNA was on the blade. The knife, the same brand of a knife discovered in Momeni's sister's apartment, who refused to be interviewed by SFPD.
RELATED: Lawyers for Nima Momeni say he had no reason to kill Cash App founder
Momeni's defense team attempted to poke holes in those arguments suggesting the brand of knife was fairly common and that the murder weapon and knife found in Momeni's sister's apartment had different amounts of wear to them. Also that when Lee called 911, he said someone stabbed him, but never named Nima Momeni as that person. Momeni's atttorneys say all of those arguments were only part of their preliminary hearing strategy.
"I'll tell you, what you don't know is our defense strategy. You won't know that until trial," said Zangeneh.
Momeni will be back in court on Aug. 15 for another arraignment where his attorney says he'll again enter a not guilty plea. His attorney says he plans to file a motion for a new detention hearing subsequently. For now, Momeni is being held in custody.
Saam Zangeneh, one of Momeni's four defense lawyers, argued unsuccessfully in court Tuesday that there might be enough evidence for a manslaughter charge, but not murder. Zangeneh said they made the argument just for purposes of the preliminary hearing.


Output example:
<source-content>
Nima Momeni will be tried in court for the stabbing murder of Bob Lee. (Source 3 Reuters)
Bob Lee is the 43 year old founder of Cash App. (Source 3 Reuters)
Following a preliminary hearing, on Tuesday a judge said that the evidence supports trial for murder. (Source 3 Reuters)
The hearing included two days of testimony from witnesses. (Source 3 Reuters)
The victim's ex-wife, Krista Lee, testified. (Source 3 Reuters)
She said: "He stabbed him. The fact that he stabbed him multiple times it is disgusting," referring to Momeni. (Source 3 Reuters)
The defense's argued that Lee and Momeni were actually friends who harbored no ill-will against one each other. (Source 3 Reuters)
The judge refused the defense's request for a manslaughter charge rather than a murder charge. (Source 3 Reuters)
Saam Zangeneh is Momeni's defense lawyer. (Source 3 Reuters) 
Zangeneh said that they "used this hearing as a mechanism to learn things and to educate people" and that the murder charge was expected. (Source 3 Reuters)
"We didn't put on our case," he added. (Source 3 Reuters)
According to the District Attorney's office, Momeni's DNA was found on the handle of the knife that was used to kill Lee. (Source 3 Reuters)
The blade itself also had DNA from Lee. (Source 3 Reuters)
A separate blade had been found in the apartment of Momeni's sister that was the exact same brand as the knife used to kill Lee. (Source 3 Reuters)
Momeni's sister declined to speak to San Fransisco Police. (Source 3 Reuters)
However, the defense argued that this was a common brand and the knives had different wear patterns. (Source 3 Reuters)
The DA also focused on the fact that Momeni drove Lee to a place at which SFPD then found blood from Lee.
They also pointed out that Momeni was the last person seen with him. (Source 3 Reuters)
The defense noted that Lee did not mention Momeni by name when he called 911 to say that he was stabbed. (Source 3 Reuters)
Zangeneh said: "I'll tell you, what you don't know is our defense strategy. You won't know that until trial." (Source 3 Reuters)
He claimed that the defense's arguments, which ultimately fell short, were only part of the strategy for the preliminary hearing, not the full defense strategy. (Source 3 Reuters)
Zangeneh said that Momeni will plead not guilty on August 15th at the next arraignment. (Source 3 Reuters)
Momeni is currently being held in custody. (Source 3 Reuters)
His attorney has also said he will put forth a motion for another detention hearing. (Source 3 Reuters)
</source-content>
{{/source.isPrimarySource}}
{{#source.isPrimarySource}}
Instructions:
Reprint the article content and add source tags after each sentence along with credits to the author. Remove extraneous content like "click here" and "for more, follow newsweek" etc. from the provided text. Only complete the FIRST HALF of the article.

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
"Govind said 'I can't wait!' at a press conference on Friday about his upcoming 29th birthday in November," Maison added. (Source 1 CNN)
"Last month, Govind published a blog post about his takeaways from life so far," wrote Maison. (Source 1 CNN)

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
{{/source.isPrimarySource}}
{{/source.useVerbatim}}
{{#source.useVerbatim}}
Instructions:
Reprint the editor-written opening word for word and add source tags after each sentence along with credits to the source. 

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
Govind Nume is 28 years old. Govind will turn 29 in November. (Source 1 CNN)
Govind said "I can't wait!" at a press conference on Friday about his upcoming 29th birthday in November. (Source 1 CNN)
Last month, Govind published a blog post about his takeaways from life so far. (Source 1 CNN)

###

Example with user input and assistant output:

Input example:
Source 1
A tech executive was arrested on Thursday for the stabbing murder of Cash App founder Bob Lee in San Francisco, police said, stressing that the suspect knew the victim but declining to discuss a possible motive for the crime. Lee was found stumbling through the streets of San Francisco at around 2:30 a.m. Pacific Time on April 4 bleeding from a stab wound.
A witness said, "He was bleeding like crazy all over the place." Lee, 43, later died of his wounds at a hospital.
Nima Momeni, the 38-year-old founder of software company Expand IT, was arrested on suspicion of murder in the Bay Area city of Emeryvile, where his company has offices, San Francisco. Police Chief William Scott told a Monday afternoon news conference.
"We are still investigating," said Scott, "but we are confident that we have the right suspect in custody."

Output example:
A tech executive was arrested on Thursday for the stabbing murder of Cash App founder Bob Lee in San Francisco, police said, stressing that the suspect knew the victim but declining to discuss a possible motive for the crime. (Source 1)
Lee was found stumbling through the streets of San Francisco at around 2:30 a.m. Pacific Time on April 4 bleeding from a stab wound. (Source 1)
A witness said, "He was bleeding like crazy all over the place." (Source 1)
Lee, 43, later died of his wounds at a hospital. (Source 1)
Nima Momeni, the 38-year-old founder of software company Expand IT, was arrested on suspicion of murder in the Bay Area city of Emeryvile, where his company has offices, San Francisco. (Source 1)
Police Chief William Scott told a Monday afternoon news conference. (Source 1)
"We are still investigating," said Scott, "but we are confident that we have the right suspect in custody." (Source 1)
{{/source.useVerbatim}}
`;

// ==========================================================================
// User Prompts
// ==========================================================================

const USER_PROMPT = `
{{^source.useVerbatim}}
{{^source.isPrimarySource}}
<role>
You are an expert editor ingesting an article to split it up into a list of facts (in your own words) and direct quotes from people.
</role>
<instructions>
Fully rewrite the article into a list of facts with zero plagiarism and direct quotes. You must take care to include all direct quotes from people verbatim, and remember to preserve all key facts in the new list. Add the given source tag to the end of each line of your new list.

Rules:
- YOU ABSOLUTELY MUST KEEP ALL DIRECT QUOTES FROM PEOPLE QUOTED IN THE SOURCE ARTICLE
-All recognizable groups of words must be changed (except inside direct quotes)
-Rewrite holistically, don't just rephrase line by line — synthesize information that was across different sections and split up sentences into their component facts
-Keep all relevant details so that no information is lost
-All direct quotes (inside quotation marks) must be included verbatim so that they aren't altered, but rewrite the credits or structure of how direct quotes are presented
-There can be no plagiarism in the rewritten version
-Today's date is {{date}} (use this if needed)
-Do not change any dates or mentions of time like "last year," or "earlier this year," keep them as written to avoid confusion
- IMPORTANT: Use simple language like "said" instead of "stated" or "asserted" and "dogs" instead of "canines" etc.
</instructions>

Note: Today's date is {{date}} (but don't rephrase any dates or relational timeframes like "last year") 

<source-{{source.number}}-input>
Source {{source.number}} {{source.accredit}}
The source tag should be "(Source {{source.number}})"

{{source.text}}
</source-{{source.number}}-input>
{{/source.isPrimarySource}}
{{#source.isPrimarySource}}
Reprint the article content and add source tags after each sentence along with credits to the author.  Do the first half of this input article:

<source-{{source.number}}-input>
Source {{source.number}} {{source.accredit}}

{{source.text}}
</source-{{source.number}}-input>
{{/source.isPrimarySource}}
{{/source.useVerbatim}}
{{#source.useVerbatim}}
Reprint the editor-written opening word for word and add source tags after each sentence along with credits to the source. 

<source-{{source.number}}-input>
Source {{source.number}} {{source.accredit}}
The source tag should be "(Source {{source.number}})"

{{source.text}}
</source-{{source.number}}-input>
{{/source.useVerbatim}}
`;

// ==========================================================================
// Assistant Prompts
// ==========================================================================

const ASSISTANT_PROMPT = `{{^source.useVerbatim}}{{^source.isPrimarySource}}Here is the list of fully rewritten and paraphrased facts. I have kept each of the direct quotes from people in the source material and have made sure each of the direct quotes is still 100% verbatim:{{/source.isPrimarySource}}{{/source.useVerbatim}}<source-{{source.number}}-content>`;

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

    // Format System Prompt ------
    const finalSystemPrompt = formatPrompt2(SYSTEM_PROMPT, { date: currentDate }, PromptType.SYSTEM);

    // Format User Prompt ------
    const finalUserPrompt = formatPrompt2(USER_PROMPT, { source, date: currentDate }, PromptType.USER);

    // Format Assistant Prompt ------
    const finalAssistantPrompt = formatPrompt2(ASSISTANT_PROMPT, { source }, PromptType.ASSISTANT);

    // Log example prompts for first source
    if (index === 0 && logger) {
      logger.logStepPrompts(1, "Facts Bit Splitting", finalSystemPrompt, finalUserPrompt, finalAssistantPrompt);
    }

    // Generate text for this source using messages approach
    const { text: content, usage } = await generateText({
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
      factsBitSplitting1: content,
      usage: [
        {
          inputTokens: usage?.promptTokens ?? 0,
          outputTokens: usage?.completionTokens ?? 0,
          model: MODEL.modelId,
          ...usage,
        },
      ],
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
    const body: Step01FactsBitSplittingRequest = await request.json();

    // Validate required fields - simple validation for sources length
    if (!body.sources || body.sources.length === 0) {
      return NextResponse.json(
        {
          sources: [],
        } as Step01FactsBitSplittingAIResponse,
        { status: 400 }
      );
    }

    // Create a route-specific logger for this step
    const logger = createPipelineLogger(`route-step01-${Date.now()}`, "aggregate");

    // Process all sources in parallel
    const processedSources = await processSourcesInParallel(body.sources, logger);

    // Build response
    const response: Step01FactsBitSplittingAIResponse = {
      sources: processedSources,
    };

    logger.logStepResponse(1, "Facts Bit Splitting", response);

    // Close the logger to ensure logs are flushed
    await logger.close();

    return NextResponse.json(response);
  } catch (error) {
    console.error("Step 01 - Facts bit splitting failed:", error);

    const errorResponse: Step01FactsBitSplittingAIResponse = {
      sources: [],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
