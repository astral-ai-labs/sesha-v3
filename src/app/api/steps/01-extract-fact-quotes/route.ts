/* ==========================================================================*/
// route.ts — Step 01: Extract Fact Quotes API Route
/* ==========================================================================*/
// Purpose: Extract top twenty direct quotes from provided source text
// Sections: Imports, Configuration, Prompts, Route Handler, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// Next.js Core ---
import { NextRequest, NextResponse } from "next/server";


// Local Utilities ---
import { buildPrompts } from "@/lib/utils";
import { createPipelineLogger } from "@/lib/pipeline-logger";

// Local Types ----
import { Step01ExtractFactQuotesRequest, Step01ExtractFactQuotesAIResponse } from "@/types/digest";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

/* ==========================================================================*/
// Configuration
/* ==========================================================================*/

// const model = openai('gpt-4o-mini')
// const model = anthropic("claude-4-sonnet-20250514");
const model = anthropic("claude-sonnet-4-5-20250929");

/* ==========================================================================*/
// Prompts
/* ==========================================================================*/

const SYSTEM_PROMPT = `
List the top twenty direct quotes from the provided source text. Include some context and attribution. Ignore extraneous text or quotes not related to the story that may have been caught in the web scrape. If the source text is a study or a hearing, you can quote directly from the text.

Format:
<quote-list>
[quote] [context/attribution]
[quote] [context/attribution]
[quote] [context/attribution]
...
[quote] [context/attribution]
</quote-list>

Examples:
<quote-list>
"Jeffrey said, 'Great, we'll call up Trump and we'll go to'—I don't recall the name of the casino, but—'we'll go to the casino,'" - Johanna Sjoberg's testimony/deposition in a civil lawsuit against Ghislaine Maxwell.
"While there was no significant change in price last year, the results indicate an increase in of over 400% over the last quarter," - text from the study describing the price increase in Oranges.
"The current levels of population change across Europe are already the most dramatic since the collapse of the Roman Empire in the West. Doubling or tripling them is surely unsustainable. In the end, voters simply won't support it, and if current politicians won't stop it, as they should, then they will vote for ones who will. " Lord Frost in the op-ed.
"I would absolutely consider that," Nume's response when asked about the potential of returning to the ring.
...
"It does look like a terrorist attack. The type of thing we've seen ISIS do in the past. And as far as we're aware, that's … our going assumption at the moment." - A senior U.S. official on Wednesday's bombing in Iran.
</quote-list>
`;

const USER_PROMPT = `Source: {{source.accredit}}

{{source.description}}
--
{{source.text}}`;

/* ==========================================================================*/
// Route Handler
/* ==========================================================================*/

export async function POST(request: NextRequest) {
  try {
    const body: Step01ExtractFactQuotesRequest = await request.json();

    // Validate required fields
    if (!body.sourceText) {
      return NextResponse.json(
        {
          quotes: "",
        },
        { status: 400 }
      );
    }

    // Build prompts using the helper function
    const [systemPrompt, userPrompt] = buildPrompts(
      SYSTEM_PROMPT,
      USER_PROMPT,
      undefined, // No system variables needed
      {
        source: {
          accredit: body.sourceAccredit,
          text: body.sourceText,
          description: body.sourceDescription,
        },
      }
    );

    // Create a route-specific logger for this step
    const logger = createPipelineLogger(`route-step01-${Date.now()}`, 'digest');
    logger.logStepPrompts(1, "Extract Fact Quotes", systemPrompt, userPrompt);

    // Generate structured object using AI SDK
    const { text: quotes, usage } = await generateText({
      model,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
        {
          role: "assistant",
          content: "<quote-list>",
        },
      ],
      temperature: 0.3,
      maxOutputTokens: 2500,
    });

    // Build response - only AI data
    const response: Step01ExtractFactQuotesAIResponse = {
      quotes,
      usage: [
        {
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          model: model.modelId,
        },
      ],
    };

    logger.logStepResponse(1, "Extract Fact Quotes", response);

    // Close the logger to ensure logs are flushed
    await logger.close();

    return NextResponse.json(response);
  } catch (error) {
    console.error("Step 01 - Extract fact quotes failed:", error);

    const errorResponse: Step01ExtractFactQuotesAIResponse = {
      quotes: "",
      usage: [],
    };

    return NextResponse.json(errorResponse, { status: 500 }); 
  }
}