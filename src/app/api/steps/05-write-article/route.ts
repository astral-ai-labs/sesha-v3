/* ==========================================================================*/
// route.ts — Step 05: Write Article API Route
/* ==========================================================================*/
// Purpose: Generate the full digest article from outline and source material
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
import { Step05WriteArticleRequest, Step05WriteArticleAIResponse } from "@/types/digest";
import type { LengthRange } from "@/db/schema";

/* ==========================================================================*/
// Configuration
/* ==========================================================================*/

// const model = openai("gpt-4o");
const model = anthropic("claude-sonnet-4-20250514");

// Word target mapping
const WORD_TARGET_MAP: Record<LengthRange, number> = {
  "100-250": 100,
  "400-550": 400,
  "700-850": 1000,
  "1000-1200": 1200,
};

/* ==========================================================================*/
// Prompts
/* ==========================================================================*/

const SYSTEM_PROMPT = `
CONTEXT:
Write an article that is a digest or reporting on a much longer piece of text (source 1). Use the source text, the headline and blobs, and the editor instructions and other notes to write the article based fully on the provided source text.

The given text may be court documents, original reporting, a blog post, or some other longer piece of writing. We are expert journalists editing an article that is a digest of the original text as a news story, ONLY using facts quotes and details from the input source (Source 1). {{source_lean_block}}

SPECIFIC INSTRUCTIONS: Write an expertly reported, thorough article that is {{word_target}} words long. Use the facts and direct quotes from people quoted in the source article (Source 1) to write an extremely thorough, well-structured, detailed news article. Follow the editor instructions and suggestions.

Use each of the interesting direct quotes from people and facts from the source articles. Move logically through the article by introducing the most important and interesting events, details, and direct quotes (inside quotation marks), and then add more and more information and quotes from the source content about each element of the input content until the article is finished.

NOTES, CONTENT, & ARTICLE STRUCTURE:
- IMPORTANT: Use as many direct quotes as possible from people quoted in the source article
- Structure the article so that relevant information is grouped for clarity before moving to the next topic from the sources
- If there is conflict or unpleasant content in the quotes or fact list, use it
- Make sure that this digest article paraphrases the content from the source article to avoid plagiarism, and make sure any direct quotes are placed in quotation marks with appropriate credits
- Focus on quotes and the most dramatic events
- Everything needs to be thoroughly rooted in the facts & source text
- Use the editor notes when crafting the article
- Make sure the article is very detailed
- Let the facts and direct credtied quotes tell the story, do not editorialize
- Use spartan writing that is extremely clear and concise
- You may ONLY reference facts, quotes (with credits), and details provided in Source 1. You may not add any other quotes, analysis, or context.
{{use_editor_instructions_block}}

LENGTH:
The long, detailed article should be {{word_target}} words long with many quotes. Use the full {{word_target}} word length. this is crucial.

Editor notes (IMPORTANT):
{{editor_instructions}}
{{quote_from_source_block}}

IMPORTANT: Since this is a digest of another person's writing (with proper permission) you must either directly quote from the source material or paraphrase the facts and details in your own words. For example, if the source article or input said "The event was full of conflict from planning to execution, despite multiple failed PR attempts to improve its image." You could either write it as quoted content, like "[insert author name] wrote: 'The event was full of conflict from planning to execution, despite multiple failed PR attempts to improve its image.'" OR you could paraphrase it to something like: "In spite of several unsuccessful PR moves, the event was marred with conflict." 


TONE AND STYLE:
The tone is extremely straightforward and spartan. Do not use any adverbs or editorializing. Make sure the core facts and conflict are understandable by simplifying legal jargon and writing clearly and simply
Do not add add annoying phrases like "In a twist" or "Upsettingly," and instead just write the facts as they are. Nevertheless, follow the examples provided for the correct writing style. THIS IS CRITICAL.

IMPORTANT: 
- Make sure to pull the most newsworthy and interesting information
- Capture and report the arguments of the source material as well as the content
- Make sure the article is impeccably written with zero frills. Just state the facts and inlcude direct quotations inside quotation marks where needed 

EXAMPLE ARTICLES
Here are example articles you've written in the past on completely different source content prompts. They are the correct length and writing style, and they move logically through the news story. These are just examples from other inputs.

{{example_articles}}

FORMAT:
Return a JSON object with:
- article: The complete article text as a string
`;

const USER_PROMPT = `
Write an article that is a digest or reporting on a much longer piece of text (source 1). Use the source text, the headline and blobs, and the editor instructions and other notes to write the article based fully on the provided source text. The article should be comprehensive and detailed.

IMPORTANT: You must write the article in a way that is easy for the general public to understand. Please simplify or write about complex concepts (legal, scientific, etc) in zippy everyday language so that anyone could understand it and be hooked by the article. Add a source tag after each line to show that it came from the source material provided in the "source-content" tags 

Length: The article should be around {{word_target}} words, it needs to be extremely thorough and comprehensive.

Headline & Blobs (to help guide article):
{{headline_blobs}}

IMPORTANT: Since this is a digest of another person's writing (with proper permission) you must either directly quote from the source material or paraphrase the facts and details in your own words. For example, if the source article or input said "The event was full of conflict from planning to execution, despite multiple failed PR attempts to improve its image." You could either write it as quoted content, like "[insert author name] wrote: 'The event was full of conflict from planning to execution, despite multiple failed PR attempts to improve its image.'" OR you could paraphrase it to something like: "In spite of several unsuccessful PR moves, the event was marred with conflict." 

{{source_lean_block}}

Here's a summary of the source content:
<summary>
{{summary_text}}
</summary>

###

INSTRUCTIONS: Write a thorough article that is {{word_target}} words long. Use the facts and direct quotes from the provided source text to write an extremely thorough, well-structured, news article. Use a spartan tone with no frills, just state the most important facts, events and quotes. Follow the editor instructions and suggestions and when generating the article from the fact and quote list. 

Move logically through the article by introducing the most important and interesting events, details, and quotes, and then adding more and more information and quotes about each element of the article from the sources until the article is complete and all important elements of the source text have been included following the outline.

Use every relevant detail from the source text to craft the article. Make sure to credit the source material and place any direct quotes inside direct quotation marks.

Because the source input is writing from someone (news, opinion, etc), this digest article will be about their writing (for example "Claudine Gay pushes back against her Harvard ousting in new op-ed in the New York Times."  or "Nume reports a breakdown in the Green Party in new CNN report"). If it's a court decision or scientific paper, the news story should detail what the authors or council etc said in the source content. The lede (the first paragraph) MUST introduce and credit the source content, and the source content or writers must be credited every few paragraphs.

Make sure the article will be easy to understand, even if the source text is complex (like a study or press release).

Add a source tag after each line to show that it came from the source material. 
"(insert sentence). (insert source tag)"

###


EDITOR NOTES:
IMPORTANT: Write each sentence in your words by referencing facts and details provided by the various sources, but keep any and all direct quotes from things other people were QUOTED as saying 100% accurate. You can only use direct quotes that were ALREADY direct quotes INSIDE quotation marks in the source article inputs 
The lede (the first sentence) must be punchy and pithy and based on key point 1
NOTE: You can only put things in direct quotes that were already in direct quotes in the source articles, and make sure to vary the crediting so that it isn't repetive (you don't have to give a speaker's full intro after every direct quote)
When using direct quotes, the speaker tags should be simple (use "said" instead of asserted. for example 'X person said: "[insert quote]"' or '"[insert quote]," wrote X person.')
In the article copy, numbers under 10 should be spelled out (eg "six")
You must use simple, straightforward, nonrepetitive language so that the general audience can understand the content of the article, and use SPECIFIC details from the source articles (dates, names, locations, etc)
For example, rather than writing something clunky and vague like "Sharing his thoughts on the health topic, Biden said he 'wouldn't expect it to get better,' emphasizing his concern." You would write something SPECIFIC, PITHY, and CLEAR like "Biden said he "wouldn't expect it to get better.'" since the quote speaks for itself and there is no need for extra analysis. 

{{user_editor_instructions_block}}

{{quote_from_source_block}}

Convert this outline into a long, comprehensive, well-written article. You must follow this outline: 
<outline>
{{outline_text}}

Note: The lede should be punching and attention-grabbing.
Note: Do not add any background or external information, you may ONLY reference content in the source-content section

Convert the above outline into a long, comprehensive, well-written article. Write an article that is {{word_target}} words long. 

SOURCE CONTENT:
The article must be fully rooted in this source content. You must paraphrase from the source content to avoid plagiarism. If quoting from the source content, you must put it in direct quotes with credits. Add in-sentence credits to the source material every couple of paragraphs throughout the article (for example "... according to X report" or "...according to X interview" or "...X wrote".. etc as needed)

<source-content>
(Source 1) {{source_accredit}}
Description: {{source_description}}
--
{{source_text}}
</source-content>
`;

/* ==========================================================================*/
// Route Handler
/* ==========================================================================*/

export async function POST(request: NextRequest) {
  try {
    const body: Step05WriteArticleRequest = await request.json();

    // Validate required fields
    if (!body.sourceText) {
      return NextResponse.json(
        {
          article: "",
        },
        { status: 400 }
      );
    }

    // Determine target word count from length setting
    const wordTarget = WORD_TARGET_MAP[body.length];

    console.log("the word target is", wordTarget);

    // const hasEditorInstructions = body.instructions && body.instructions.trim() !== "";

    const isPrimarySource = body.isPrimarySource;

    // Blocks dependent on input
    const sourceLeanBlock = isPrimarySource ? "Lean heavily on direct quotes from the source input article with proper attribution. " : "";
    const quoteFromSourceBlock = isPrimarySource
      ? `Lean heavily on direct quotes from the source input article with proper attribution. IMPORTANT: This is a factual digest created from an article from someone else's reporting. As such, for each line you must be sure to quote directly from the source material and attribute each of the quotes, or paraphrase segments fully in your own words.  Also you MUST credit the input source every few paragraphs. For example, you must include text like "according to the CNN report" or "according to Nume's article in The Independent" or whatever the source is. Credit info ${body.sourceAccredit} ${body.sourceDescription}  `
      : "";
    const sourceLeanBlockUserPrompt = isPrimarySource ? "Lean heavily on direct quotes from the input source article but make sure to attribute each direct quote properly." : "";

    let mandatoryEditorInstructionsBlock = "";
    if (body.instructions) {
      mandatoryEditorInstructionsBlock = `<mandatory-editor-instructions>${body.instructions}</mandatory-editor-instructions>`;
    }

    // Build example articles based on word target
    const exampleArticles = getExampleArticles(wordTarget);

    // Build prompts using the helper function
    const [systemPrompt, userPrompt] = buildPrompts(
      SYSTEM_PROMPT,
      USER_PROMPT,
      {
        word_target: wordTarget.toString(),
        source_lean_block: sourceLeanBlock,
        quote_from_source_block: quoteFromSourceBlock,
        editor_instructions: body.instructions || "",
        example_articles: exampleArticles,
      },
      {
        word_target: wordTarget.toString(),
        headline_blobs: body.headlineAndBlobsText || "",
        source_lean_block: sourceLeanBlockUserPrompt,
        summary_text: body.summarizeFactsText || "",
        outline_text: body.articleOutlineText || "",
        quote_from_source_block: quoteFromSourceBlock,
        editor_instructions: mandatoryEditorInstructionsBlock,
        source_accredit: body.sourceAccredit || "",
        source_description: body.sourceDescription || "",
        source_text: body.sourceText || "",
      }
    );

    // Log the formatted prompts if logger is available
    const logger = createPipelineLogger(`route-step05-${Date.now()}`, 'digest');
    logger.logStepPrompts(5, "Write Article", systemPrompt, userPrompt);

    // Generate structured object using AI SDK
    const { text: article, usage } = await generateText({
      model,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
        {
          role: "assistant",
          content: `Here is the ${wordTarget} word article based on the provided source content. Additional notes on the article:
- Every sentence is based directly in facts or credited direct quotes from the source content. Everything is either rewritten in my own words or quoted with appropriate source credits to the source content/author(s)
- The article focuses ONLY on the content, facts, and quotes inside the "source-content" tag and follows the provided outline
- The article is ${wordTarget} words long.
- The article is written in zippy, newsy english so that all jargon science or legal concepts are easy to understand
- There is no repetition in the article and no added background or analysis.
<article>`,
        },
      ],
      temperature: 0.6,
      maxTokens: 3000
    });

    // Build response - only AI data
    const response: Step05WriteArticleAIResponse = {
      article: article,
      usage: [
        {
          inputTokens: usage?.promptTokens ?? 0,
          outputTokens: usage?.completionTokens ?? 0,
          model: model.modelId,
          ...usage
        },
      ],
    };

    logger.logStepResponse(5, "Write Article", response);

    // Close the logger to ensure logs are flushed
    await logger.close();

    return NextResponse.json(response);
  } catch (error) {
    console.error("Step 05 - Write article failed:", error);

    const errorResponse: Step05WriteArticleAIResponse = {
      article: "",
      usage: [],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Helper function to get example articles based on word target
function getExampleArticles(wordTarget: number): string {
  if (wordTarget === 100) {
    return `
Example 1 (this is just an example article):
<example-article>
Mole Valley District Council has revoked the premises license for Rise and Shine supermarket in Dorking after receiving multiple reports of illegal activity, including underage sales, illicit tobacco, and nitrous oxide. (Source 1)

The Council's Licensing Sub-Committee held a hearing on February 9, 2023, attended by representatives from Mole Valley District Council, Surrey Police, Buckingham & Surrey Trading Standards, and County Child Employment Enforcement & Strategy, who all supported revoking the license, according to the hearing report. (Source 1)

The Sub-Committee was convinced there were likely sales of illicit tobacco, nitrous oxide, as well as out of hours and underage sales at the premises, undermining the Licensing Objectives of preventing crime and protecting children from harm. (Source 1)

An anonymous party provided evidence of after hours sales and possible drug sales, which the Sub-Committee gave "considerable weight" to while noting the person wished to remain anonymous "for fear of reprisals," the hearing notes said. (Source 1)

The witness said: "These new owners of the rise and shine, they are nothing but bad news! they are dealing drugs and laughing gas (nitrous oxide cans)". (Source 1)

The sub-committee also heard that, despite undertakings from the owner, staff had a poor grasp of english and failed to carry ID proving their right to work in the UK. (Source 1)

The decision said that the Sub-Committee decided revoking the premises licence was the only step that would remedy the failure to uphold the Licensing Objectives, with a 21-day window to appeal the decision. (Source 1)
</example-article>

Example 2 (this is just an example article):
<example-article>
A study published in the European Heart Journal revealed that women infected with high-risk strains of human papillomavirus (HPV) have a four times greater risk of dying from cardiovascular disease. (Source 1)

This is the first study to demonstrate a connection between high-risk HPV infection and cardiovascular disease mortality, according to the European Heart Journal. (Source 1)

Women with high-risk HPV had a 3.91 times higher risk of blocked arteries, a 3.74 times higher risk of dying from heart disease, and a 5.86 times higher risk of dying from stroke compared to women without high-risk HPV infection. (Source 1)

The risk was even higher in women with both high-risk HPV infection and obesity. (Source 1)

Prof. Hae Suk Cheong suggested that HPV may trigger inflammation in blood vessels, contributing to blocked and damaged arteries and increasing cardiovascular disease risk. (Source 1)

In the Journal, researchers call for further studies to determine if high-risk HPV infection has similar effects on men and if the HPV vaccine can prevent heart disease deaths. (Source 1)

"If these findings are confirmed, they could have substantial implications for public health strategies. Increasing HPV vaccination rates may be an important strategy in reducing long-term cardiovascular risks," Prof. Ryu added. (Source 1)
</example-article>

Example 3 (this is just an example article):
<example-article>
A judge granted a motion on Monday restricting former President Donald Trump's extrajudicial statements for the duration of his upcoming criminal trial in Manhattan. (Source 1)

Trump is charged with 34 counts of falsifying business records related to alleged hush money payments made to adult film actress Stormy Daniels before the 2016 presidential election, according to the order. (Source 1)

The trial is set to begin on April 15, 2024 with Acting Justice Juan M. Merchan presiding. (Source 1)

In his decision, Justice Merchan reviewed Trump's extensive record of "threatening, inflammatory, denigrating" statements targeting officials, court personnel, witnesses, and private citizens including grand jurors involved in the case and other legal proceedings. (Source 1)

Trump's legal team argued that as the "presumptive Republican nominee and leading candidate in the 2024 election" he needs unrestricted speech to respond to political attacks from opponents. (Source 1)

However, the judge found that Trump's statements went well beyond mere self-defense against "attacks" by "public figures." (Source 1)

The judge ruled that the speech restrictions are necessary and narrowly tailored to prevent "actual harm to the proceedings' integrity." (Source 1)

Under the order, Trump must refrain from making public statements about witnesses, lawyers, court and district attorney's staff and their family members, and jurors involved in the case. (Source 1)

Justice Merchan extended a previous protective order on juror anonymity, finding it alone insufficient to prevent intimidation of jurors through targeted extrajudicial speech. (Source 1)

The restrictions come after Trump's statements led to increased security concerns for targeted individuals. (Source 1)

Trump's legal team pointed to his general restraint in commenting on individuals in this specific case, contrasting it with the volume of posts targeting people in other proceedings. (Source 1)
</example-article>
`;
  } else if (wordTarget === 400) {
    return `
Example 1 (this is just an example article):
<example-article>
Researchers at UCLA have discovered a brain circuit in mice that, when activated, causes them to seek out fatty foods even when not hungry. (Source 1)

The study, published in Nature Communications, found that stimulation of specific brain cells called vgat PAG cells causes mice to compulsively forage for high-calorie foods, even enduring foot shocks to reach them. (Source 1)

The finding offers new insights into the neurological underpinnings of compulsive eating behaviors and could lead to new treatment targets for eating disorders in humans. (Source 1)

Corresponding author Avishek Adhikari, a UCLA associate professor of psychology, explains that the periaqueductal gray (PAG) region in the brainstem is functionally similar between humans and mice. (Source 1)

"Although our findings were a surprise, it makes sense that food-seeking would be rooted in such an ancient part of the brain, since foraging is something all animals need to do," added Adhikari. (Source 1)

The researchers discovered that activation of the entire PAG region causes a panic response, but selectively stimulating only the vgat PAG cells did not alter fear and instead caused foraging and feeding. (Source 1)

Humans also possess vgat PAG cells, and an overactive circuit could potentially drive cravings even when not hungry, while an under-stimulated circuit could lead to less interest in eating when hungry. (Source 1)

"We're doing new experiments based on these findings and learning that these cells induce eating of fatty and sugary foods, but not of vegetables in mice, suggesting this circuit may increase eating of junk food," said Fernando Reis, a UCLA postdoctoral researcher who conducted most of the experiments in the study. (Source 1)

Remarkably, the mice were so driven to eat fatty foods that they were willing to endure foot shocks to reach them, suggesting the circuit causes cravings rather than mere hunger. (Source 1)

When the vgat PAG cells were stimulated, the mice went after live crickets and other non-prey food, even after having just eaten a meal. They also chased moving objects that weren't food at all, like ping pong balls. (Source 1)

Adhikari states, "The results suggest the following behavior is related more to wanting than to hunger. Hunger is aversive, meaning that mice usually avoid feeling hungry if they can. But they seek out activation of these cells, suggesting that the circuit is not causing hunger." (Source 1)

On the other hand, inhibiting the activity of the vgat PAG cells using an engineered virus reduced the mice's desire to seek out food, even when they were hungry. (Source 1)

While reasons for overeating and undereating in humans are varied, the author notes this growing area of research could help answer some questions in certain circumstances. (Source 1)

People who eat even when they're not hungry often describe it as "mindless" eating attributed to stress, boredom, or just wanting to taste things. (Source 1)
</example-article>

Example 2 (this is just an example article):
<example-article>
As Israel's devastating war with Gaza drags on, Prime Minister Benjamin Netanyahu's goal of "total victory" is seen as an attempt to prolong the conflict and avoid internal political challenges, according to author Joshua Leifer, in an opinion column for the New York Times. (Source 1)

Leifer, author of the forthcoming book "Tablets Shattered: The End of an American Jewish Century and the Future of Jewish Life," says that the moment the devastating war between Israel and Gaza ends, the internal conflict within Israel over its future will resume - and Prime Minister Benjamin Netanyahu and his right-wing coalition allies know it. (Source 1)

The attack on Gaza, which began nearly six months ago, has virtually paralyzed Israel's divisive political system, with previously fierce debates mostly suspended as the nation appears united behind the war effort, the Times piece argues. (Source 1)

"Even Netanyahu's harshest critics try to avoid being labeled as traitorous at a time when huge banners proclaiming 'Together We Will Win' are draped from skyscrapers," Leifer writes. (Source 1)

To keep the war going and free from real opposition, Netanyahu led Israel into a confrontation with its most important supporter, the U.S., prioritizing his short-term political interests over the nation's long-term well-being, in Leifer's view. (Source 1)

After Hamas's devastating October 7th incursion, which destroyed Netanyahu's legacy as "Mr. Security" and "the protector of Israel," the prime minister's political prospects seemed grim. (Source 1)

Suddenly he seemed responsible for the deadliest single day in Israeli history. (Source 1)

A January poll revealed that only 15% of Israelis wanted him to stay in office after the war. (Source 1)

And in another recent poll by Israel's Channel 13, a majority of Israelis said they did not have confidence in Netanyahu's handling of the war, Liefer wrote. (Source 1)

Support for his right-wing Likud party has also plummeted. (Source 1)

For about 39 weeks prior to the war, hundreds of thousands of Israelis protested every Saturday night in cities nationwide against the Netanyahu government's far-right agenda, especially its plan to essentially eliminate the country's judiciary but became nearly silent after October 7th. (Source 1)

But in recent weeks, demonstrators have started calling for Netanyahu's resignation again, though in smaller numbers, according to Leifer. (Source 1)

With the largest anti-government protests since the incursion occurring this past weekend, the opposition movement may finally have an opportunity to expose the fundamental weaknesses in Netanyahu's coalition, Leifer argues. (Source 1)

The greatest threat to its continuity is the impending crisis over military draft exemptions for Haredi, or ultra-Orthodox religious men, which could split the ruling coalition. (Source 1)

The prime minister also faces threats from far-right figures like Itamar Ben-Gvir, who has been preparing to challenge Netanyahu for being too lenient on Hamas. (Source 1)

The Times piece said that Ben-Gvir has also threatened to withdraw his party from the governing coalition in the event of a more comprehensive agreement, which would likely require releasing hundreds of Palestinian militants from Israeli prisons. (Source 1)

Even within Netanyahu's Likud party, ambitious politicians have started positioning themselves as his successor, adding to Israel's political turmoil, Leifer writes. (Source 1)
</example-article>

Example 3 (this is just an example article):
<example-article>
A supermarket in Dorking selling illegal drugs and tobacco, including to minors, has been stripped of its premises license. (Source 1)

Mole Valley District Council's Licensing Sub-Committee unanimously agreed to revoke the premises license for Rise and Shine in Dorking at a hearing on February 9th, 2023, according to Mole Valley Council Licencing Committee minutes. (Source 1)

Underage sales, out-of-hours sales, and sales of illicit tobacco and nitrous oxide were all cited as reasons for the license revocation. (Source 1)

The Sub-Committee, consisting of Councillors Margaret Cooksey, Tim Hall and David Harper, was satisfied there had been breaches of the premises licence conditions, including failure to maintain CCTV and staff being unable to converse in English, the minutes say. (Source 1)

"Failure to install and maintain a CCTV system monitoring all licensed areas (except toilets), including the entry and exit, with recordings kept for a minimum of 31 days," was one of the breaches noted. (Source 1)

Another breach was found to be staff "responsible for alcohol sales being unable to converse with the public and relevant agencies in English." (Source 1)

The Committee minutes note that evidence was provided about after hours sales and possible drug sales from the premises by a person who wished to remain anonymous for fear of reprisals. (Source 1)

Although the person's name was redacted at their request, the Sub-Committee took into account the evidence provided and gave it considerable weight. (Source 1)

The witness said: "These new owners of the rise and shine, they are nothing but bad news! they are dealing drugs and laughing gas (nitrous oxide cans)". (Source 1)

Another member of the public reported that her 15-year-old daughter was able to buy vapes and vodka from this shop recently and was not asked for any ID. (Source 1)

Alarmingly, drug paraphernalia was also available to purchase, although it is not illegal to sell this kind of product. (Source 1)

Catriona Macbeth of Surrey Police noted that she had been present at the hearing to grant this licence originally and that personal assurances given by the licence holder regarding immigration status and business involvement had not been upheld. (Source 1)

She added that "on every inspection that she had attended, staff did not have any form of ID on them." (Source 1)

According to the minutes, one of the inspectors noted: "I would say that during all of my interactions with males working at the shop, their understanding of English has appeared to be extremely poor". (Source 1)

The Sub-Committee said it had no confidence in the management and control of the premises, noting many of the allegations related to the period after the current owner took over. (Source 1)

Despite the license holder's intention to surrender the premises license claiming he has no involvement in the business, the new owner has not applied to transfer the license or appoint a new supervisor. (Source 1)

The allegations and evidence of illegal activity at Rise and Shine supermarket ultimately led the Licensing Sub-Committee to unanimously revoke the premises license, citing underage sales, out-of-hours sales, illicit tobacco and nitrous oxide sales, and breaches of license conditions. (Source 1)

There is a right to appeal the decision within 21 days of receiving written notice. (Source 1)
</example-article>
`;
  } else if (wordTarget === 1000) {
    return `
<example-article>
Prime Minister Rishi Sunak challenged voters to stick with him in a GB News People's Forum on Monday. (Source 1)

"Do we stick with this plan? Our plan that is starting to deliver the change that you all want and the country deserves? Or do we go back to square one with Keir Starmer and the Labour Party?" Sunak said, contrasting his agenda with what he called Labour's lack of one, according to GBNews. (Source 1)

Sunak highlighted progress on his five key priorities: halving inflation, growing the economy, reducing debt, cutting NHS waiting lists, and reducing illegal migrant boats. (Source 1)

He noted that inflation has been more than halved, the economy is outperforming expectations, debt is on track to fall, the longest NHS waits have been eliminated, and illegal Channel crossings are down by a third. (Source 1)

Responding to a question about whether the Conservatives have delivered anything of substance since their 2019 election win, Sunak pointed to investment and job creation in Teesside, a new Treasury campus in Darlington, and infrastructure improvements as examples of the government's "levelling up" agenda. (Source 1)

On the NHS, Sunak acknowledged the damage and backlogs caused by COVID but outlined investments in more doctors, nurses, and healthcare facilities. (Source 1)

While progress hasn't been fast enough, he said the waiting list reductions at the end of 2022 when there were no strikes give him confidence the plans can work if industrial action is resolved. (Source 1)

"We want to make sure that people whatever their background, are respected and treated with dignity. That's the kind of country that I believe in," Sunak stated regarding LGBT issues. (Source 1)

According to GB News, he said the Conservatives legalized same-sex marriage and want to be sensitive and understanding on transgender issues while also considering biological sex for women's safety and health. (Source 1)

Sunak argued the next election is a straightforward choice between him and Labour leader Keir Starmer for Prime Minister. (Source 1)

In the forum, he criticized Labour for lacking a plan, citing "absolute chaos" over their decarbonization policy and Starmer standing by a candidate accused of anti-Semitism until media pressure forced a reversal. (Source 1)

On housing, Sunak said the government is on track to deliver a million new homes this Parliament, has cut stamp duty for first-time buyers, and tried to change "defective" EU environmental rules blocking 100,000 homes, which Labour opposed in the Lords. (Source 1)

Regarding energy security, Sunak said the government is building new nuclear power, investing in renewables like offshore wind, and continuing to issue North Sea oil and gas licenses, which he said is better than importing it from abroad. (Source 1)

He criticized Labour for opposing the licenses, according to the GB News forum. (Source 1)

Sunak strongly criticized Labour's plan to charge independent schools VAT, saying it would hurt middle-income families who make sacrifices to invest in their children's education. (Source 1)

"You're not really attacking me, you're attacking my parents, and you're attacking everybody like them that works hard to aspire for a better life for them and their family. I think that's wrong. I don't think it's British," he said. (Source 1)

The Prime Minister said Conservative MPs are united in wanting to deliver a country where "your children can look forward to a brighter future," "you have that peace of mind," and "we can have a renewed sense of pride in your country." (Source 1)

He contrasted that vision with Labour's, GB News wrote. (Source 1)

On Scotland, Sunak said Scots earning over  £28,000 now pay higher taxes than in England because of the SNP government's recent budget. (Source 1)

He contrasted that with the Conservatives' approach of controlling inflation and borrowing first, then cutting taxes like national insurance. (Source 1)

"If we stick with it, then there are better times ahead," Sunak argued, saying inflation and mortgage rates are falling while wages are rising. (Source 1)

He claimed Starmer can't say how he'd pay for his policies, meaning "higher taxes" and going "back to square one with the Labour Party." (Source 1)

Keith from Edinburgh asked about radical reform of the chronically underfunded social care system. (Source 1)

Sunak said the government recently announced an extra  £600 million for local councils, with most earmarked for social care. (Source 1)

While not an overnight fix, he said they are working to better integrate social care with hospitals, according to the forum writeup. (Source 1)
</example-article>

Example 2 (this is just an example article):
<example-article>
A judge granted a motion on Monday restricting former President Donald Trump's extrajudicial statements for the duration of his upcoming criminal trial in Manhattan. (Source 1)

Trump is charged with 34 counts of falsifying business records related to alleged hush money payments made to adult film actress Stormy Daniels before the 2016 presidential election, according to the judge's order. (Source 1)

The trial is set to begin on April 15, 2024 with Acting Justice Juan M. Merchan presiding. (Source 1)

In his decision, Justice Merchan reviewed Trump's extensive record of "threatening, inflammatory, denigrating" statements targeting officials, court personnel, witnesses, and private citizens including grand jurors involved in the case and other legal proceedings. (Source 1)

Trump's legal team argued that as the "presumptive Republican nominee and leading candidate in the 2024 election" he needs unrestricted speech to respond to political attacks from opponents. (Source 1)

However, the judge found that Trump's statements went well beyond mere self-defense against "attacks" by "public figures." (Source 1)

"Such inflammatory extrajudicial statements undoubtedly risk impeding the orderly administration of this Court," Justice Merchan wrote. (Source 1)

In the order, the judge ruled that the speech restrictions are necessary and narrowly tailored to prevent "actual harm to the proceedings' integrity," citing Supreme Court precedent obligating courts to take preventative action when trial fairness is threatened. (Source 1)

Under the order, Trump must refrain from making public statements about witnesses, lawyers, court and district attorney's staff and their family members, and jurors involved in the case. (Source 1)

The restrictions align partly with those upheld by the U.S. Court of Appeals for the D.C. Circuit in a separate case, United States v. Trump, last year. (Source 1)

Justice Merchan extended a previous protective order on juror anonymity, finding it alone insufficient to prevent intimidation of jurors through targeted extrajudicial speech. (Source 1)

The uncontested record of Trump's prior statements, documented in exhibits submitted by prosecutors, "establishes sufficient risk to the administration of justice consistent with the Landmark standard, and no less restrictive means exist to prevent such risk," according to the decision. (Source 1)

Trump is specifically ordered to refrain from:

"Making or directing others to make public statements about known or reasonably foreseeable witnesses concerning their potential participation in the investigation or in this criminal proceeding;" (Source 1)

"Making or directing others to make public statements about (1) counsel in the case other than the District Attorney, (2) members of the court's staff and the District Attorney's staff, or (3) the family members of any counsel or staff member, if those statements are made with the intent to materially interfere with, or to cause others to materially interfere with, counsel's or staff's work in this criminal case, or with the knowledge that such interference is likely to result; and" (Source 1)

"Making or directing others to make public statements about any prospective juror or any juror in this criminal proceeding." (Source 1)

The restrictions come after Trump's statements led to increased security concerns for targeted individuals. (Source 1)

His inflammatory rhetoric required investigations into threats and protection for the individuals and their families, the decision notes. (Source 1)

Trump's legal team pointed to his general restraint in commenting on individuals in this specific case, contrasting it with the volume of posts targeting people in other proceedings. (Source 1)

But Justice Merchan found this argument "unpersuasive" given the impending trial date and Trump's demonstrated willingness to make incendiary statements about the court, prosecutors, witnesses and others. (Source 1)

"Although no speech restriction order was initially issued, just an admonition, the nature and impact of statements against the Court, a family member, the DA, an ADA, witnesses, and statements in the D.C. Circuit case resulting in a speech restriction there, plus the impending trial, make the risk of imminent harm now paramount," the judge wrote. (Source 1)

The charges against Trump stem from allegations that he tried to conceal an unlawful scheme to influence the 2016 election by directing his company's attorney to pay Daniels $130,000 shortly before the election to prevent her from publicly disclosing an alleged sexual encounter. (Source 1)

Prosecutors further allege that Trump later reimbursed his attorney for the payment through a series of checks and had business records related to the repayments falsified to obscure his criminal conduct. (Source 1)

Trump has denied wrongdoing and blasted the charges as politically motivated. (Source 1)

His opposition to the speech restrictions argued he needs broad latitude to defend himself publicly as a leading presidential candidate. (Source 1)

But Justice Merchan concluded that even applying the highest level of First Amendment scrutiny, as required when balancing free speech against fair trial interests, the requested restrictions are justified and narrowly drawn. (Source 1)

"Properly applied, the test requires a court to make its own inquiry into the imminence and magnitude of the danger said to flow from the particular utterance and then to balance the character of the evil, as well as the likelihood, against the need for free and unfettered expression." (Source 1)

The order will remain in effect for the duration of the trial, set to begin on April 15 in New York Supreme Court in lower Manhattan. (Source 1)

Trump faces 34 felony counts of falsifying business records related to the hush money payments. (Source 1)

Each count carries a maximum penalty of four years in prison upon conviction. (Source 1)
</example-article>

Example 3 (this is just an example article):
<example-article>
UCLA researchers have discovered a brain circuit in mice that, when stimulated, causes them to seek out fatty foods even when they are not hungry. (Source 1)

The finding, published in Nature Communications, provides new insights into the neurological basis of compulsive eating behaviors. (Source 1)

"This region we're studying is called the periaqueductal gray (PAG), and it is in the brainstem, which is very old in evolutionary history and because of that, it is functionally similar between humans and mice," wrote corresponding author Avishek Adhikari, a UCLA associate professor of psychology. (Source 1)

"Although our findings were a surprise, it makes sense that food-seeking would be rooted in such an ancient part of the brain, since foraging is something all animals need to do," Adhikari added. (Source 1)

The researchers found that stimulating a specific cluster of neurons called vgat PAG cells caused the mice to forage for food and eat compulsively, without altering their fear responses. (Source 1)

"Activation of the entire PAG region causes a dramatic panic response in both mice and humans. But when we selectively stimulated only this specific cluster of PAG neurons called vgat PAG cells, they did not alter fear, and instead caused foraging and feeding," Adhikari explains. (Source 1)

Humans also have vgat PAG cells in the brainstem, and it's possible that an overactive circuit could drive cravings even when a person is not hungry, while an under-stimulated circuit could lead to less interest and enjoyment in eating when hungry, potentially playing a role in eating disorders like anorexia. (Source 1)

"We're doing new experiments based on these findings and learning that these cells induce eating of fatty and sugary foods, but not of vegetables in mice, suggesting this circuit may increase eating of junk food," said Fernando Reis, a UCLA postdoctoral researcher who did most of the experiments in the study and came up with the idea to study compulsive eating. (Source 1)

More research in this area could potentially lead to new treatment targets for eating disorders. (Source 1)

To conduct the study, the researchers used a genetically engineered virus to make the brain cells of mice generate a light-sensitive protein, allowing them to stimulate the cells using a laser and fiber-optic implant. (Source 1)

When the vgat PAG cells were stimulated, the mice went after live crickets and other non-prey food, even after having just eaten a meal. (Source 1)

They also chased moving objects that weren't food at all, like ping pong balls. (Source 1)

Remarkably, the mice were so driven to eat fatty foods that they were willing to endure foot shocks to reach them, suggesting that the circuit causes cravings rather than mere hunger. (Source 1)

"The results suggest the following behavior is related more to wanting than to hunger," wrote Adhikari. (Source 1)

"Hunger is aversive, meaning that mice usually avoid feeling hungry if they can. But they seek out activation of these cells, suggesting that the circuit is not causing hunger. Instead, we think this circuit causes the craving of highly rewarding, high-calorie food. These cells can cause the mouse to eat more high-calorie foods even in the absence of hunger." (Source 1)

On the other hand, inhibiting the activity of the vgat PAG cells reduced the mice's desire to seek out food, even when they were hungry. (Source 1)

When the researchers used a virus engineered to turn down the activity of the vgat PAG cells, the mice were less likely to rummage for food, even if they were hungry. (Source 1)

"Mice show compulsive eating in the presence of aversive direct consequences when this circuit is active, and don't search for food even if they're hungry when it's not active. This circuit can circumvent the normal hunger pressures of how, what and when to eat," said Fernando Reis. (Source 1)
</example-article>
`;
  } else {
    return `
<example-article>
In the season 3 finale of Clarkson's Farm, Jeremy Clarkson and his team at Diddly Squat Farm grappled with a challenging harvest due to unpredictable weather conditions, according to an article by Govind Nume in Deadline. (Source 1)

"Dryest February ever, wettest March for 40 years," Clarkson said. "It didn't rain at all, but was cold in May. Then it went hottest June ever. Since then, it's been...the wettest July and the coldest." (Source 1)

Despite Clarkson's attempts to help, farm manager Kaleb Cooper, 25, largely took charge of bringing in the crops, with Clarkson often hindering more than helping, Nume wrote. (Source 1)

"There's drivers and there's screwdrivers. And you're a screwdriver," Cooper told Clarkson after the TV personality made a mistake while driving a tractor and trailer. (Source 1)

Kaleb Cooper, the farm manager, pointed out that the critical harvesting month was "refusing to play ball," with crops deteriorating the longer they remained unharvested in fields too wet to work. (Source 1)

The Deadline piece said Cooper had to repeatedly test the moisture levels of the fields, waiting for them to drop below 15% so the combine harvester could operate. (Source 1)

"I think I've broken a record of how many times I can moisture test a field," Cooper complained. "Moisture test, moisture test, then moisture test again, then do another moisture test. Get to the end of the day and go, no, it's not going to go today." (Source 1)

When conditions finally allowed, Clarkson and Cooper were able to bring in the oats Cooper had sown. (Source 1)

However, the yields from the oilseed rape proved to be "shockingly bad" at around 300 kg per hectare, Cooper reported. (Source 1)

Examining the meager crop, Clarkson asked, "That's a rape stalk. Where's all the pods gone?" (Source 1)

"And look, if you look this way, look behind you. Can you see it? Where it's a little bit thinner and it's gone out in the wind, it's got so brittle and that storm coming and the rain coming, it's knocking out the rapeseed that we want," Cooper pointed out. (Source 1)

"Honestly. I'm just fed up," he said. "What? You put all that time and effort in and money. I know it's not my money, okay, you know, the old habits of joking out loud but it's still... I still don't want to do badly. You know?" (Source 1)

On a more positive note, tests revealed that Clarkson's experimental durum wheat crop was of high quality, with 15% moisture content and an impressive 15.4% protein level, which land agent Charlie Ireland described as "exceptional."(Source 1)

However, the Hagberg falling number, a measure of the wheat's suitability for pasta-making, was only 133, well below the required 250, Nume wrote in Deadline. (Source 1)

"So we can't make pasta out of it?" Clarkson inquired. "We can't make pasta out of it," Ireland confirmed. "So we just have to feed it to the cows that we don't have." (Source 1)

The 150 tons of durum wheat, which should have fetched £400 per ton as pasta-grade wheat, would instead be sold as feed wheat at £175 per ton, resulting in a £33,750 loss. (Source 1)

Similarly, the spring barley crop failed to meet the standards for malting due to weather damage. "It won't germinate because it's some of it is as it says it's just dead. So it doesn't have the required germination," Ireland explained. (Source 1)

Nume wrote that the 180 tons of barley, which would have earned £235 per ton for malting, would only bring in £160 per ton as animal feed, a loss of £14,000. (Source 1)

Upon hearing the news, Clarkson exclaimed, "Fucking hell. How are we going to make the beer?" (Source 1)

In contrast, Clarkson's pig breeding operation saw significant growth, with 53 new piglets born compared to 28 in the previous litter. (Source 1)

His innovative "pig ring" invention helped slash piglet mortality. (Source 1)

"You know my pig ring? Has it worked? Last time, 28% was squashed by their mothers. This time, 13%," Clarkson reported to his girlfriend Lisa Hogan. (Source 1)

Clarkson also successfully harvested his experimental mustard crop, despite access issues caused by narrow gates not designed for modern machinery, according to the Deadline article. (Source 1)

He turned the modest yield into his own "Jeremy's Hot Seed" mustard, hand-jarring 36 jars to sell at the farm shop for £6 each. (Source 1)

In a heartwarming moment, Clarkson surprised Hogan with a visit to see their cow Pepper, who had been returned to her original owner and had given birth to a calf named Tabitha. (Source 1)

"The world's most famous cow is now a mum," Clarkson proclaimed. (Source 1)

At the final accounting, Clarkson's diversification efforts, including cows, mushrooms, goats, and venison, generated a £27,614 profit. (Source 1)

"That is an awful lot of work for not quite enough money to buy a Mini Countryman," he joked. (Source 1) 

"I could earn more than that by making people cups of coffee on Paddington Station." (Source 1)

Cooper's more traditional arable crops brought in £44,383, for a total farm profit of £72,000. "First year of being farm manager and you've kicked my arse completely," Clarkson congratulated him. (Source 1)

However, Ireland quickly tempered any celebration, pointing out that all the money was earmarked for investment in the following year. (Source 1)

"I need all of that to fund the seed, the fertiliser, and the sprays," he said. "Every single penny." (Source 1)

Clarkson emphasized the ongoing challenges farmers face with cash flow and uncertainty. (Source 1)

"If you're a normal farmer, and this is your full-time and only job, you get two years where you don't make any money. You're screwed," he said. (Source 1)

"Because of the fluctuations we saw in the price of wheat and in the price of fertiliser. You don't know where you are. You can't plan." (Source 1)

Despite the hardships, Cooper expressed optimism for the future. (Source 1)

"I like to think the future of farming is bright and light, and especially young generation coming in. Especially me," he said. (Source 1)

"I'm 25 years old. I've got maybe, potentially, 60 harvests left. How? I don't know. I honestly don't know. How? But I want to stay positive, because I love what I do." (Source 1)

The episode concluded with an emotional gathering in the woods, with the Diddly Squat Farm team reflecting on the tumultuous year. (Source 1)

Gerald Cooper, the dry stone-waller, expressed his gratitude for everyone's support during his recovery from prostate cancer. (Source 1)

In a touching moment, Kaleb Cooper confessed that he had missed Clarkson during his travels, Nume reported. (Source 1) 

"I hate to admit this," Cooper said. "I kind of missed you...I miss him as a person. I don't miss him helping on the farm. But like, you know, our cup of teas and our little chats and our meal out on the weekend and chit chats and farming chats." (Source 1)

Clarkson acknowledged the challenges they had faced throughout the year, from bad weather and disappointments to livestock deaths, but chose to focus on the positive aspects. "I became a grandfather for the first time since we were last here. You became a father again and you, the G-Dog, beat the big C," he said, toasting Gerald Cooper's cancer recovery. (Source 1)

"Thank you, everybody, for helping to make this the best job in the world," Clarkson concluded, encapsulating the spirit of resilience and camaraderie that has become the hallmark of Clarkson's Farm. (Source 1)
</example-article>

Example 2 (this is just an example article):
<example-article>
A judge granted a motion on Monday restricting former President Donald Trump's extrajudicial statements for the duration of his upcoming criminal trial in Manhattan. (Source 1)

Trump is charged with 34 counts of falsifying business records related to alleged hush money payments made to adult film actress Stormy Daniels before the 2016 presidential election, according to the order. (Source 1)

The trial is set to begin on April 15, 2024 with Acting Justice Juan M. Merchan presiding. (Source 1)

In his decision, Justice Merchan reviewed Trump's extensive record of "threatening, inflammatory, denigrating" statements targeting officials, court personnel, witnesses, and private citizens including grand jurors involved in the case and other legal proceedings. (Source 1)

Trump's legal team argued that as the "presumptive Republican nominee and leading candidate in the 2024 election" he needs unrestricted speech to respond to political attacks from opponents. (Source 1)

However, the judge found that Trump's statements went well beyond mere self-defense against "attacks" by "public figures." (Source 1)

"Such inflammatory extrajudicial statements undoubtedly risk impeding the orderly administration of this Court," Justice Merchan wrote. (Source 1)

The judge ruled that the speech restrictions are necessary and narrowly tailored to prevent "actual harm to the proceedings' integrity," citing Supreme Court precedent. (Source 1)

"When trial fairness is threatened, 'reversals are but palliatives; the cure lies in those remedial measures that will prevent the prejudice at its inception,'" the decision states, quoting the 1966 Sheppard v. Maxwell ruling. (Source 1)

Under the order, Trump must refrain from making public statements about witnesses, lawyers, court and district attorney's staff and their family members, and jurors involved in the case. (Source 1)

The restrictions align partly with those upheld by the U.S. Court of Appeals for the D.C. Circuit in a separate case, United States v. Trump, last year. (Source 1)

Justice Merchan extended a previous protective order on juror anonymity, finding it alone insufficient to prevent intimidation of jurors through targeted extrajudicial speech. (Source 1)

"While the protective order on juror anonymity prevents disseminating certain personal information, it is insufficient to prevent extrajudicial speech targeting jurors and exposing them to intimidation," the judge wrote. (Source 1)

The uncontested record of Trump's prior statements, documented in exhibits submitted by prosecutors, "establishes sufficient risk to the administration of justice consistent with the Landmark standard, and no less restrictive means exist to prevent such risk," according to the decision. (Source 1)

Trump is specifically ordered to refrain from: (Source 1)

"Making or directing others to make public statements about known or reasonably foreseeable witnesses concerning their potential participation in the investigation or in this criminal proceeding;" (Source 1)

"Making or directing others to make public statements about (1) counsel in the case other than the District Attorney, (2) members of the court's staff and the District Attorney's staff, or (3) the family members of any counsel or staff member, if those statements are made with the intent to materially interfere with, or to cause others to materially interfere with, counsel's or staff's work in this criminal case, or with the knowledge that such interference is likely to result; and" (Source 1)

"Making or directing others to make public statements about any prospective juror or any juror in this criminal proceeding." (Source 1)

The restrictions come after Trump's statements led to increased security concerns for targeted individuals. (Source 1)

His inflammatory rhetoric required investigations into threats and protection for the individuals and their families, the decision notes. (Source 1)

Trump's legal team pointed to his general restraint in commenting on individuals in this specific case, contrasting it with the volume of posts targeting people in other proceedings. (Source 1)

But Justice Merchan found this argument "unpersuasive" given the impending trial date and Trump's demonstrated willingness to make incendiary statements about the court, prosecutors, witnesses and others. (Source 1)

"Although no speech restriction order was initially issued, just an admonition, the nature and impact of statements against the Court, a family member, the DA, an ADA, witnesses, and statements in the D.C. Circuit case resulting in a speech restriction there, plus the impending trial, make the risk of imminent harm now paramount," the judge wrote. (Source 1)

The charges against Trump stem from allegations that he tried to conceal an unlawful scheme to influence the 2016 election by directing his company's attorney to pay Daniels $130,000 shortly before the election to prevent her from publicly disclosing an alleged sexual encounter. (Source 1)

Prosecutors further allege that Trump later reimbursed his attorney for the payment through a series of checks and had business records related to the repayments falsified to obscure his criminal conduct. (Source 1)

Trump has denied wrongdoing and blasted the charges as politically motivated. (Source 1)

His opposition to the speech restrictions argued he needs broad latitude to defend himself publicly as a leading presidential candidate. (Source 1)

But Justice Merchan concluded that even applying the highest level of First Amendment scrutiny, as required when balancing free speech against fair trial interests, the requested restrictions are justified and narrowly drawn. (Source 1)

"Balancing these interests requires the highest level of scrutiny," the judge wrote, quoting the Landmark Communications, Inc. v. Virginia standard. (Source 1)

"Properly applied, the test requires a court to make its own inquiry into the imminence and magnitude of the danger said to flow from the particular utterance and then to balance the character of the evil, as well as the likelihood, against the need for free and unfettered expression." (Source 1)

With the trial just weeks away, Justice Merchan found that the court must act to stop outside influences, including Trump's inflammatory rhetoric, from undermining the integrity of the proceedings. (Source 1)

The order will remain in effect for the duration of the trial, set to begin on April 15 in New York Supreme Court in lower Manhattan. (Source 1)

Trump faces 34 felony counts of falsifying business records related to the hush money payments. (Source 1)

Each count carries a maximum penalty of four years in prison upon conviction. (Source 1)
</example-article>
`;
  }
}