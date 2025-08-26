/* ==========================================================================*/
// route.ts — Step 06: Rewrite Article API Route
/* ==========================================================================*/
// Purpose: Rewrite article with simplified language and remove waffle
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
import { Step06RewriteArticleRequest, Step06RewriteArticleAIResponse } from "@/types/aggregate";
import { anthropic } from "@ai-sdk/anthropic";

/* ==========================================================================*/
// Configuration
/* ==========================================================================*/

const MODEL = anthropic("claude-3-7-sonnet-20250219");
const TEMPERATURE = 0.5;
const MAX_TOKENS = 3700;

// ==========================================================================
// System Prompts
// ==========================================================================

const SYSTEM_PROMPT = `
INSTRUCTIONS: Rewrite the article word for word, but with three small edits: 

1. In quote attribution, replace annoying and overly complex words like "stated" or "asserted" or "proclaimed" with simpler words like "said" or "wrote" depending on the context.
For example, you would rewrite the sentence: "In the interview, Nume stated: 'I love sushi.' (Source 2 CNN) " as "In the interview, Nume said: 'I love sushi.' (Source 2 CNN)"

2. Remove specific phrases like "in a significant development" or "adding to the controversy" or "as the world watches" and replace with either nothing or a more simple, pithy transition.

Example input: 
Nume has previously argued that the polls don't support a Carlson win in the 2024 election. (Source 1 ONews)
In a significant development, in an interview last month, he claimed Carlson is "a lock in." (Source 1 ONews, Source 4 Telegraph)

Example rewrite:
Nume has previously argued that the polls don't support a Carlson win in the 2024 election. (Source 1 ONews)
But in an interview last month, he claimed Carlson is "a lock in." (Source 1 ONews, Source 4 Telegraph)

3. Remove the very last paragraph or sentence if it is "waffle" and pure opinion or summary. For example:

Example input: 
{ imagine a whole article here and then...}...
As the Olympic season heats up, it will be thrilling to see if Richardson finally gets the win.

Example rewrite:
{ imagine a whole article here and then the last sentence was removed since it was just waffle/summary}

But don't remove it if it wasn't summary/waffle.

NOTE: DON'T CHANGE ANYTHING ELSE IN THE ARTICLE, AND MAKE SURE TO LEAVE THE SOURCE CREDITS
NOTE: We own the rights and permissions to reprint this text.
`;

// ==========================================================================
// User Prompt
// ==========================================================================

const USER_PROMPT = `
INSTRUCTIONS: Rewrite the article word for word, but with three small edits: 

1. In quote attribution, replace annoying and overly complex words like "stated"/"stating or "asserted" or "asserting" or "proclaimed" with simpler words like "said" or "saying" or "wrote" depending on the context, and remove repetitious or overly clunky language.
For example, you would rewrite the sentence: "In the interview, Nume stated: 'I love sushi.' (Source 2 CNN) " as "In the interview, Nume said: 'I love sushi.' (Source 2 CNN)"
As another example, you would rewrite a passage like "'It was a bit of a mess, to say the least,' Nume said. (Source 1) Nume also joked about the gravity of the situation saying, 'this is a heavier situation than Einstein could've predicted,' referring to the great scientific mind of the 20th century. (Source 1, Source 2 ABC)" to a simpler, better version like this: "'It was a bit of a mess, to say the least,' Nume said. (Source 1) 'This is a heavier situation than Einstein could've predicted,' he added. (Source 1, Source 2 ABC)" 
In that example, the quotes are tagged to a speaker but the quotes speak for themselves without extraneous repetitious content.

2. Remove specific phrases like "in a significant development" or "adding to the controversy" or "as the world watches" and replace with either nothing or a more simple, pithy transition.

Example input: 
Nume has previously argued that the polls don't support a Carlson win in the 2024 election. (Source 1 ONews)
In a significant development, in an interview last month, he claimed Carlson is "a lock in." (Source 1 ONews, Source 4 Telegraph)

Example rewrite:
Nume has previously argued that the polls don't support a Carlson win in the 2024 election. (Source 1 ONews)
But in an interview last month, he claimed Carlson is "a lock in." (Source 1 ONews, Source 4 Telegraph)

3. Remove the very last paragraph or sentence if it is "waffle" and pure opinion or summary. For example:

Example input: 
{ imagine a whole article here and then...}...
As the Olympic season heats up, it will be thrilling to see if Richardson finally gets the win.

Example rewrite:
{ imagine a whole article here and then the last sentence was removed since it was just waffle/summary}

But don't remove it if it wasn't summary/waffle.

NOTE: DON'T CHANGE ANYTHING ELSE IN THE ARTICLE, AND MAKE SURE TO LEAVE THE SOURCE CREDITS
NOTE: We own the rights and permissions to reprint this text.

####

{{#sources.0.useVerbatim}}You MUST begin the article with this exact FULL text with (Source 1 {{sources.0.accredit}}) written after each line: 
<article-opening>
{{sources.0.factsBitSplitting1}}
</article-opening>
Note: make sure the sentences after flow seamlessly from the editor-written opening.{{/sources.0.useVerbatim}}

Reprint this article with the requested minor changes: 
{{#sources.0.useVerbatim}}{{sources.0.factsBitSplitting1}}{{/sources.0.useVerbatim}}
{{article}}
`;

// ==========================================================================
// Assistant Prompt
// ==========================================================================

const ASSISTANT_PROMPT = `
Here is the article reprinted with the three edits:

<article>
`;

/* ==========================================================================*/
// Route Handler
/* ==========================================================================*/

export async function POST(request: NextRequest) {
  try {
    const body: Step06RewriteArticleRequest = await request.json();

    // Validate required fields ------
    const validationError = validateRequest(Boolean(body.articleStepOutputs?.writeArticle?.text), {
      rewrittenArticle: "",
    } as Step06RewriteArticleAIResponse);
    if (validationError) return validationError;

    // Extract article text from step outputs
    const article = body.articleStepOutputs.writeArticle?.text || "";

    // Format System Prompt ------
    const finalSystemPrompt = formatPrompt2(SYSTEM_PROMPT, undefined, PromptType.SYSTEM);

    // Format User Prompt ------
    const finalUserPrompt = formatPrompt2(
      USER_PROMPT,
      {
        sources: body.sources,
        article: article,
      },
      PromptType.USER
    );

    // Format Assistant Prompt ------
    const finalAssistantPrompt = formatPrompt2(ASSISTANT_PROMPT, undefined, PromptType.ASSISTANT);

    // Create a route-specific logger for this step
    const logger = createPipelineLogger(`route-step06-${Date.now()}`, 'aggregate');
    logger.logStepPrompts(6, "Rewrite Article", finalSystemPrompt, finalUserPrompt, finalAssistantPrompt);

    // Generate text using messages approach
    const { text: rewrittenArticle, usage } = await generateText({
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
    const response: Step06RewriteArticleAIResponse = {
      rewrittenArticle,
      usage: [
        {
          inputTokens: usage?.promptTokens ?? 0,
          outputTokens: usage?.completionTokens ?? 0,
          model: MODEL.modelId,
          ...usage
        },
      ],
    };

    logger.logStepResponse(6, "Rewrite Article", response);

    // Close the logger to ensure logs are flushed
    await logger.close();

    return NextResponse.json(response);
  } catch (error) {
    console.error("Step 06 - Rewrite article failed:", error);

    const errorResponse: Step06RewriteArticleAIResponse = {
      rewrittenArticle: "",
      usage: [],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}