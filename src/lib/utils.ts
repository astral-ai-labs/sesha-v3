import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Mustache from "mustache";
import { NextResponse } from "next/server";

// Local Types ----
import type { Article } from "@/db/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ==========================================================================*/
// Route Validation Helpers
/* ==========================================================================*/

/**
 * Validate request body and return error response if invalid
 *
 * @param isValid - Boolean indicating if validation passed
 * @param errorResponse - Object to return if validation fails
 * @returns NextResponse with 400 status if invalid, null if valid
 */
export function validateRequest<T>(
  isValid: boolean,
  errorResponse: T
): NextResponse<T> | null {
  if (!isValid) {
    return NextResponse.json(errorResponse, { status: 400 });
  }
  return null;
}

/* ==========================================================================*/
// Prompt Building Helpers
/* ==========================================================================*/

/**
 * Enum for prompt types
 */
export enum PromptType {
  SYSTEM = "system",
  USER = "user", 
  ASSISTANT = "assistant"
}

/**
 * Format a prompt template with the given variables using Mustache templating (v2)
 *
 * @param promptTemplate - The template string with {{variable}} placeholders
 * @param variables - Object containing variable values
 * @param type - The type of prompt (for logging purposes)
 * @returns Formatted prompt string
 */
export function formatPrompt2(
  promptTemplate: string, 
  variables?: Record<string, unknown>,
  type: PromptType = PromptType.SYSTEM
): string {
  console.log(`🔧 formatPrompt2 [${type}] - STARTING`);

  if (!variables) {
    console.log(`⚠️ formatPrompt2 [${type}] - No variables provided, returning template as-is`);
    return promptTemplate;
  }

  try {
    console.log(`🔄 formatPrompt2 [${type}] - Processing template with Mustache...`);
    
    // Use Mustache to render the template with variables
    const formatted = Mustache.render(promptTemplate, variables);
    
    console.log(`✅ formatPrompt2 [${type}] - COMPLETED`);
    return formatted;
  } catch (error) {
    console.error(`❌ formatPrompt2 [${type}] - ERROR:`, error);
    console.error(`🔍 formatPrompt2 [${type}] - Error details:`, JSON.stringify(error, null, 2));
    console.error(`📊 formatPrompt2 [${type}] - Template at error:`, promptTemplate.substring(0, 500));
    console.error(`📊 formatPrompt2 [${type}] - Variables at error:`, JSON.stringify(variables, null, 2));
    throw error;
  }
}

/**
 * Format a prompt template with the given variables using Mustache templating
 *
 * @param promptTemplate - The template string with {{variable}} placeholders
 * @param variables - Object containing variable values
 * @returns Formatted prompt string
 */
function formatPrompt(promptTemplate: string, variables?: Record<string, unknown>): string {
  console.log("🔧 formatPrompt - STARTING");

  if (!variables) {
    console.log("⚠️ formatPrompt - No variables provided, returning template as-is");
    return promptTemplate;
  }

  try {
    console.log("🔄 formatPrompt - Processing template with Mustache...");
    
    // Use Mustache to render the template with variables
    const formatted = Mustache.render(promptTemplate, variables);
    
    console.log("✅ formatPrompt - COMPLETED");
    return formatted;
  } catch (error) {
    console.error("❌ formatPrompt - ERROR:", error);
    console.error("🔍 formatPrompt - Error details:", JSON.stringify(error, null, 2));
    console.error("📊 formatPrompt - Template at error:", promptTemplate.substring(0, 500));
    console.error("📊 formatPrompt - Variables at error:", JSON.stringify(variables, null, 2));
    throw error;
  }
}

/**
 * Build system and user prompts with the given variables using Mustache templating
 *
 * @param systemPromptTemplate - System prompt template with {{variable}} syntax
 * @param userPromptTemplate - User prompt template with {{variable}} syntax
 * @param systemVariables - Variables for system prompt
 * @param userVariables - Variables for user prompt
 * @param assistantPromptTemplate - Assistant prompt template with {{variable}} syntax
 * @param assistantVariables - Variables for assistant prompt
 * @returns Tuple of [systemPrompt, userPrompt, assistantPrompt]
 */
export function buildPrompts(
  systemPromptTemplate: string, 
  userPromptTemplate: string, 
  systemVariables?: Record<string, unknown>, 
  userVariables?: Record<string, unknown>,
  assistantPromptTemplate?: string,
  assistantVariables?: Record<string, unknown>
): [string, string, string?] {
  console.log("🏗️ buildPrompts - STARTING");
  console.log("📥 buildPrompts - System template length:", systemPromptTemplate.length);
  console.log("📥 buildPrompts - User template length:", userPromptTemplate.length);
  console.log("📥 buildPrompts - Assistant template provided:", !!assistantPromptTemplate);

  try {
    console.log("🔄 buildPrompts - Building system prompt...");
    const systemPrompt = formatPrompt(systemPromptTemplate, systemVariables);

    console.log("🔄 buildPrompts - Building user prompt...");
    const userPrompt = formatPrompt(userPromptTemplate, userVariables);

    let assistantPrompt: string | undefined;
    if (assistantPromptTemplate) {
      console.log("🔄 buildPrompts - Building assistant prompt...");
      assistantPrompt = formatPrompt(assistantPromptTemplate, assistantVariables);
    }

    console.log("✅ buildPrompts - COMPLETED");

    return [systemPrompt, userPrompt, assistantPrompt];
  } catch (error) {
    console.error("❌ buildPrompts - ERROR:", error);
    console.error("🔍 buildPrompts - Error details:", JSON.stringify(error, null, 2));
    console.error("📊 buildPrompts - System template:", systemPromptTemplate.substring(0, 200) + "...");
    console.error("📊 buildPrompts - User template:", userPromptTemplate.substring(0, 200) + "...");
    console.error("📊 buildPrompts - Assistant template:", assistantPromptTemplate?.substring(0, 200) + "...");
    console.error("📊 buildPrompts - System variables:", JSON.stringify(systemVariables, null, 2));
    console.error("📊 buildPrompts - User variables:", JSON.stringify(userVariables, null, 2));
    console.error("📊 buildPrompts - Assistant variables:", JSON.stringify(assistantVariables, null, 2));
    throw error;
  }
}

/* ==========================================================================*/
// Article Helpers
/* ==========================================================================*/

/**
 * Helper function to extract sources from an article into array format
 *
 * @param article - The article to extract sources from
 * @returns Array of source objects with only non-empty sources
 */
export function extractSourcesFromArticle(article: Article): Array<{
  description: string;
  accredit: string;
  sourceText: string;
  url?: string;
  verbatim: boolean;
  primary: boolean;
}> {
  const sources = [];
  
  // Explicit mapping of each source - type-safe and clear
  const sourceMappings = [
    {
      text: article.inputSourceText1,
      url: article.inputSourceUrl1,
      description: article.inputSourceDescription1,
      accredit: article.inputSourceAccredit1,
      verbatim: article.inputSourceVerbatim1,
      primary: article.inputSourcePrimary1,
    },
    {
      text: article.inputSourceText2,
      url: article.inputSourceUrl2,
      description: article.inputSourceDescription2,
      accredit: article.inputSourceAccredit2,
      verbatim: article.inputSourceVerbatim2,
      primary: article.inputSourcePrimary2,
    },
    {
      text: article.inputSourceText3,
      url: article.inputSourceUrl3,
      description: article.inputSourceDescription3,
      accredit: article.inputSourceAccredit3,
      verbatim: article.inputSourceVerbatim3,
      primary: article.inputSourcePrimary3,
    },
    {
      text: article.inputSourceText4,
      url: article.inputSourceUrl4,
      description: article.inputSourceDescription4,
      accredit: article.inputSourceAccredit4,
      verbatim: article.inputSourceVerbatim4,
      primary: article.inputSourcePrimary4,
    },
    {
      text: article.inputSourceText5,
      url: article.inputSourceUrl5,
      description: article.inputSourceDescription5,
      accredit: article.inputSourceAccredit5,
      verbatim: article.inputSourceVerbatim5,
      primary: article.inputSourcePrimary5,
    },
    {
      text: article.inputSourceText6,
      url: article.inputSourceUrl6,
      description: article.inputSourceDescription6,
      accredit: article.inputSourceAccredit6,
      verbatim: article.inputSourceVerbatim6,
      primary: article.inputSourcePrimary6,
    },
  ];
  
  // Only include sources that have content
  for (const mapping of sourceMappings) {
    if (mapping.text) {
      sources.push({
        description: mapping.description || '',
        accredit: mapping.accredit || '',
        sourceText: mapping.text,
        url: mapping.url || '',
        verbatim: mapping.verbatim || false,
        primary: mapping.primary || false,
      });
    }
  }
  
  return sources;
}

/* ==========================================================================*/
// String Helpers
/* ==========================================================================*/

/**
 * cleanSlug
 *
 * Clean and sanitize a slug according to strict requirements.
 * - Converts to lowercase
 * - Removes special characters and dashes
 * - Removes spaces
 * - Only allows letters and numbers
 *
 * @param input - The input string to clean
 * @returns A clean slug string with only lowercase letters and numbers
 *
 * @example
 * cleanSlug("My Article Title!") // => "myarticletitle"
 * cleanSlug("Hello-World_123") // => "helloworld123"
 */
export function cleanSlug(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  return input
    .toLowerCase() // Convert to lowercase
    .trim() // Remove leading/trailing whitespace
    .replace(/[^a-z0-9]/g, "") // Remove everything except lowercase letters and numbers
    .substring(0, 50); // Limit length to 50 characters
}


// ==========================================================================
// Date Helpers
// ==========================================================================

export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}