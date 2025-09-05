// dal.ts — Minimal data-access layer built on Drizzle ORM
// -----------------------------------------------------------------------------
// This file exposes small, typed helper functions so the rest of the codebase
// never needs to write SQL. Each helper wraps a single Drizzle query.
// -----------------------------------------------------------------------------
// Requirements covered:
// • CRUD operations for users
// • Create / update for sources
// • Fetch article metadata
// • Fetch article-version metadata list
// • Fetch full article by (orgId, slug, version)
// -----------------------------------------------------------------------------

import { db } from "./index";

import { users, articles, organizations, presets, runs } from "./schema";

import type { NewUser, User, Preset, Article, ArticleStatus, Organization, NewPreset, BlobsCount, LengthRange, SourceType, Run, NewRun } from "./schema";

import { eq, and, sql, desc, gte } from "drizzle-orm";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/** Shape returned by `getArticleMetadata()` — a trimmed-down view. */
export interface ArticleMetadata {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  versionDecimal: string;
  createdByName: string;
  slug: string;
  headline: string | null;
  sourceType: string;
  status: ArticleStatus;
}

/** Sidebar list item for an article version. */
export interface ArticleVersionMetadata {
  version: number; // legacy integer version for backward compatibility
  versionDecimal: string; // new decimal version (3.00, 3.01, etc.)
  slug: string | null;
  headline: string | null;
  headlineSource?: 'ai' | 'manual';
  createdAt: Date;
  blobOutline: string | null;
}

/** Raw run row shape returned by `getOrgRuns()` */
export interface RunRow {
  id: string;
  articleId: string | null;
  userId: string | null;
  sourceType: SourceType;
  length: string;
  costUsd: number;
  tokensUsed: number | null;
  createdAt: Date;
}

export interface SpendSummary {
  totalRuns: number;
  totalCostUsd: number;
  avgCostPerRun: number;
}

/* -------------------------------------------------------------------------- */
/*  User helpers                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Insert a new user.
 * @param payload Partial user record. `id`, `createdAt`, `updatedAt` are auto-filled.
 * @returns Inserted row.
 */
export async function createUser(payload: Omit<NewUser, "id" | "createdAt" | "updatedAt">): Promise<User> {
  const [row] = await db.insert(users).values(payload).returning();
  return row;
}

/**
 * Insert a new user with a specific ID (for Supabase Auth integration).
 * @param payload Partial user record including `id`. `createdAt`, `updatedAt` are auto-filled.
 * @returns Inserted row.
 */
export async function createUserWithId(payload: Omit<NewUser, "createdAt" | "updatedAt">): Promise<User> {
  const [row] = await db.insert(users).values(payload).returning();
  return row;
}

/**
 * Fetch a single user by UUID.
 */
export async function getUser(id: string): Promise<User | undefined> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}

/**
 * Update an existing user.
 * @param id The user UUID.
 * @param updates Partial user fields to patch.
 * @returns Updated row.
 */
export async function updateUser(id: string, updates: Partial<Omit<NewUser, "id" | "createdAt" | "updatedAt">>): Promise<User | undefined> {
  const [row] = await db
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return row;
}

/**
 * Delete a user (hard delete).
 * @returns Number of rows removed (0 | 1).
 */
export async function deleteUser(id: string): Promise<number> {
  const result = await db.delete(users).where(eq(users.id, id)).returning();
  return result.length;
}

/* -------------------------------------------------------------------------- */
/*  Article metadata                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Fetch top-level metadata for a single article.
 */
export async function getArticleMetadata(articleId: string): Promise<ArticleMetadata | undefined> {
  const [row] = await db
    .select({
      id: articles.id,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      version: articles.version,
      versionDecimal: articles.versionDecimal,
      createdByName: sql<string>`
        CASE 
          WHEN ${users.firstName} IS NOT NULL AND ${users.lastName} IS NOT NULL 
          THEN CONCAT(${users.firstName}, ' ', ${users.lastName})
          ELSE ${users.email}
        END
      `.as("createdByName"),
      slug: articles.slug,
      headline: articles.headline,
      sourceType: articles.sourceType,
      status: articles.status,
    })
    .from(articles)
    .leftJoin(users, eq(articles.createdBy, users.id))
    .where(eq(articles.id, articleId))
    .limit(1);

  return row;
}

/* -------------------------------------------------------------------------- */
/*  Article metadata pagination                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Paginated list of article metadata for a given organisation.
 * Pass `offset` and `limit` for infinite‑scroll style pagination.
 */
export async function getOrgArticlesMetadataPaginated(orgId: number, limit = 50, offset = 0): Promise<ArticleMetadata[]> {
  return db
    .select({
      id: articles.id,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      version: articles.version,
      versionDecimal: articles.versionDecimal,
      createdByName: sql<string>`
        CASE 
          WHEN ${users.firstName} IS NOT NULL AND ${users.lastName} IS NOT NULL 
          THEN CONCAT(${users.firstName}, ' ', ${users.lastName})
          ELSE ${users.email}
        END
      `.as("createdByName"),
      slug: articles.slug,
      headline: articles.headline,
      sourceType: articles.sourceType,
      status: articles.status,
    })
    .from(articles)
    .leftJoin(users, eq(articles.createdBy, users.id))
    .where(eq(articles.orgId, orgId))
    .orderBy(desc(articles.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Total count of articles for an organisation — handy for pagination UIs.
 */
export async function getOrgArticlesCount(orgId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(eq(articles.orgId, orgId));
  return row?.count ?? 0;
}

/* -------------------------------------------------------------------------- */
/*  Article-version list                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Return a list of all version metadata for an article (for a sidebar list).
 */
export async function getArticleVersionsMetadata(articleId: string): Promise<ArticleVersionMetadata[]> {
  return db
    .select({
      version: articles.version,
      versionDecimal: articles.versionDecimal,
      slug: articles.slug,
      headline: articles.headline,
      createdAt: articles.createdAt,
      blobOutline: articles.blob,
    })
    .from(articles)
    .where(eq(articles.id, articleId))
    .orderBy(articles.versionDecimal);
}

/* -------------------------------------------------------------------------- */
/*  Fetch article by (orgId, slug, version)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Fetch an article (with version content) given its org, slug, and version.
 * If `version` is omitted it resolves to the latest version.
 * Supports both integer version (legacy) and decimal version lookup.
 */
export async function getArticleByOrgSlugVersion(
  orgId: number, 
  slug: string, 
  versionDecimal?: string
): Promise<Article | null> {
  const whereConditions = [eq(articles.orgId, orgId), eq(articles.slug, slug)];
  
  if (versionDecimal) {
    // Search by decimal version if provided
    whereConditions.push(eq(articles.versionDecimal, versionDecimal));
  } else {
    // If no version specified, get the latest version
    const [latestArticle] = await db
      .select()
      .from(articles)
             .where(and(eq(articles.orgId, orgId), eq(articles.slug, slug)))
       .orderBy(desc(articles.versionDecimal))
      .limit(1);
    
    return latestArticle || null;
  }

  const [article] = await db
    .select()
    .from(articles)
    .where(and(...whereConditions))
    .limit(1);

  return article || null;
}

/**
 * Fetch all articles with the same slug across all versions for an organization.
 * Returns articles ordered by version descending (newest first) with creator information.
 */
export async function getArticlesByOrgSlug(orgId: number, slug: string): Promise<(Article & { createdByName: string })[]> {
  return db
    .select({
      // All article fields
      id: articles.id,
      orgId: articles.orgId,
      slug: articles.slug,
      version: articles.version,
      versionDecimal: articles.versionDecimal,
      headline: articles.headline,
      blob: articles.blob,
      content: articles.content,
      richContent: articles.richContent,
      sourceType: articles.sourceType,

      // 1st source
      inputSourceText1: articles.inputSourceText1,
      inputSourceUrl1: articles.inputSourceUrl1,
      inputSourceDescription1: articles.inputSourceDescription1,
      inputSourceAccredit1: articles.inputSourceAccredit1,
      inputSourceVerbatim1: articles.inputSourceVerbatim1,
      inputSourcePrimary1: articles.inputSourcePrimary1,
      inputSourceBase1: articles.inputSourceBase1,
      // 2nd source
      inputSourceText2: articles.inputSourceText2,
      inputSourceUrl2: articles.inputSourceUrl2,
      inputSourceDescription2: articles.inputSourceDescription2,
      inputSourceAccredit2: articles.inputSourceAccredit2,
      inputSourceVerbatim2: articles.inputSourceVerbatim2,
      inputSourcePrimary2: articles.inputSourcePrimary2,
      inputSourceBase2: articles.inputSourceBase2,
      // 3rd source
      inputSourceText3: articles.inputSourceText3,
      inputSourceUrl3: articles.inputSourceUrl3,
      inputSourceDescription3: articles.inputSourceDescription3,
      inputSourceAccredit3: articles.inputSourceAccredit3,
      inputSourceVerbatim3: articles.inputSourceVerbatim3,
      inputSourcePrimary3: articles.inputSourcePrimary3,
      inputSourceBase3: articles.inputSourceBase3,
      // 4th source
      inputSourceText4: articles.inputSourceText4,
      inputSourceUrl4: articles.inputSourceUrl4,
      inputSourceDescription4: articles.inputSourceDescription4,
      inputSourceAccredit4: articles.inputSourceAccredit4,
      inputSourceVerbatim4: articles.inputSourceVerbatim4,
      inputSourcePrimary4: articles.inputSourcePrimary4,
      inputSourceBase4: articles.inputSourceBase4,
      // 5th source
      inputSourceText5: articles.inputSourceText5,
      inputSourceUrl5: articles.inputSourceUrl5,
      inputSourceDescription5: articles.inputSourceDescription5,
      inputSourceAccredit5: articles.inputSourceAccredit5,
      inputSourceVerbatim5: articles.inputSourceVerbatim5,
      inputSourcePrimary5: articles.inputSourcePrimary5,
      inputSourceBase5: articles.inputSourceBase5,
      // 6th source
      inputSourceText6: articles.inputSourceText6,
      inputSourceUrl6: articles.inputSourceUrl6,
      inputSourceDescription6: articles.inputSourceDescription6,
      inputSourceAccredit6: articles.inputSourceAccredit6,
      inputSourceVerbatim6: articles.inputSourceVerbatim6,
      inputSourcePrimary6: articles.inputSourcePrimary6,
      inputSourceBase6: articles.inputSourceBase6,  
      inputPresetTitle: articles.inputPresetTitle,
      inputPresetInstructions: articles.inputPresetInstructions,
      inputPresetBlobs: articles.inputPresetBlobs,
      inputPresetLength: articles.inputPresetLength,
      status: articles.status,
      createdBy: articles.createdBy,
      updatedBy: articles.updatedBy,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      // Computed user display name
      createdByName: sql<string>`
        CASE 
          WHEN ${users.firstName} IS NOT NULL AND ${users.lastName} IS NOT NULL 
          THEN CONCAT(${users.firstName}, ' ', ${users.lastName})
          ELSE ${users.email}
        END
      `.as("createdByName"),
    })
    .from(articles)
    .leftJoin(users, eq(articles.createdBy, users.id))
    .where(and(eq(articles.orgId, orgId), eq(articles.slug, slug)))
    .orderBy(desc(articles.versionDecimal));
}

/**
 * Fetch a complete article record by its ID.
 * Returns the full article with all source data for pipeline processing.
 * 
 * @param articleId - The article UUID
 * @returns Article record or null if not found
 */
export async function getArticleById(articleId: string): Promise<Article | null> {
  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  return article || null;
}

/* -------------------------------------------------------------------------- */
/*  Organization helpers                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Fetch a single organization by ID.
 */
export async function getOrganization(id: number): Promise<Organization | undefined> {
  const [row] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return row;
}

/* -------------------------------------------------------------------------- */
/*  Preset helpers                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Create a new preset for an organisation.
 */
export async function createPreset(payload: Omit<NewPreset, "id" | "createdAt" | "updatedAt">): Promise<Preset> {
  const [row] = await db.insert(presets).values(payload).returning();
  return row;
}

/**
 * Update an existing preset.
 */
export async function updatePreset(id: string, updates: Partial<Omit<NewPreset, "id" | "createdAt" | "updatedAt">>): Promise<Preset | undefined> {
  const [row] = await db
    .update(presets)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(presets.id, id))
    .returning();
  return row;
}

/**
 * Get All Presets for an organisation.
 */
export async function getOrgPresets(orgId: number): Promise<Preset[]> {
  return db.select().from(presets).where(eq(presets.orgId, orgId));
}



/* -------------------------------------------------------------------------- */
/*  Pipeline Database Operations                                              */
/* -------------------------------------------------------------------------- */

/**
 * Create a new AI-generated article record with all input and output fields.
 * Creates AI versions with .00 decimal format (e.g., 1.00, 2.00, 3.00).
 * Always creates a new row - no complex transaction logic needed.
 * Handles version conflicts by automatically incrementing version on duplicate key violations.
 *
 * @param payload - Article creation payload with all data
 * @returns The article ID for use in subsequent pipeline steps
 */
export async function createAiArticleRecord(payload: {
  metadata: {
    userId: string;
    orgId: string;
    currentVersion: number | null;
    currentVersionDecimal: string | null;
  };
  sourceType: "single" | "multi";
  slug: string;
  headline: string;
  headlineSource?: 'ai' | 'manual';
  sources: Array<{
    description: string;
    accredit: string;
    sourceText: string;
    url?: string; // Add URL field
    verbatim: boolean;
    primary: boolean;
  }>;
  instructions: {
    instructions: string;
    blobs: BlobsCount;
    length: LengthRange;
  };
}): Promise<Article> {
  const orgId = parseInt(payload.metadata.orgId);

  const sourceType = payload.sourceType;

  // Validate that we have at least one source
  if (!payload.sources || payload.sources.length === 0) {
    throw new Error("At least one source is required");
  }

  // Validate that we don't have more than 6 sources
  if (payload.sources.length > 6) {
    throw new Error("Maximum of 6 sources allowed");
  }

  return await db.transaction(async (tx) => {
    // Lock and get the current highest version for this slug
    const [currentHighest] = await tx
      .select({ version: articles.version, versionDecimal: articles.versionDecimal })
      .from(articles)
      .where(and(eq(articles.orgId, orgId), eq(articles.slug, payload.slug)))
      .orderBy(desc(articles.versionDecimal))
      .limit(1)
      .for("update"); // This locks the row(s) until transaction commits

    const nextVersion = (currentHighest?.version || 0) + 1;
    const nextVersionDecimal = `${nextVersion}.00`; // AI versions always end in .00

    // Prepare source data for all 6 possible sources
    const sourceData = {
      // Source 1 (required)
      inputSourceText1: payload.sources[0].sourceText,
      inputSourceUrl1: payload.sources[0].url || "",
      inputSourceDescription1: payload.sources[0].description,
      inputSourceAccredit1: payload.sources[0].accredit,
      inputSourceVerbatim1: payload.sources[0].verbatim,
      inputSourcePrimary1: payload.sources[0].primary,

      // Source 2 (optional)
      inputSourceText2: payload.sources[1]?.sourceText || null,
      inputSourceUrl2: payload.sources[1]?.url || "",
      inputSourceDescription2: payload.sources[1]?.description || "",
      inputSourceAccredit2: payload.sources[1]?.accredit || "",
      inputSourceVerbatim2: payload.sources[1]?.verbatim || false,
      inputSourcePrimary2: payload.sources[1]?.primary || false,

      // Source 3 (optional)
      inputSourceText3: payload.sources[2]?.sourceText || null,
      inputSourceUrl3: payload.sources[2]?.url || "",
      inputSourceDescription3: payload.sources[2]?.description || "",
      inputSourceAccredit3: payload.sources[2]?.accredit || "",
      inputSourceVerbatim3: payload.sources[2]?.verbatim || false,
      inputSourcePrimary3: payload.sources[2]?.primary || false,

      // Source 4 (optional)
      inputSourceText4: payload.sources[3]?.sourceText || null,
      inputSourceUrl4: payload.sources[3]?.url || "",
      inputSourceDescription4: payload.sources[3]?.description || "",
      inputSourceAccredit4: payload.sources[3]?.accredit || "",
      inputSourceVerbatim4: payload.sources[3]?.verbatim || false,
      inputSourcePrimary4: payload.sources[3]?.primary || false,

      // Source 5 (optional)
      inputSourceText5: payload.sources[4]?.sourceText || null,
      inputSourceUrl5: payload.sources[4]?.url || "",
      inputSourceDescription5: payload.sources[4]?.description || "",
      inputSourceAccredit5: payload.sources[4]?.accredit || "",
      inputSourceVerbatim5: payload.sources[4]?.verbatim || false,
      inputSourcePrimary5: payload.sources[4]?.primary || false,

      // Source 6 (optional)
      inputSourceText6: payload.sources[5]?.sourceText || null,
      inputSourceUrl6: payload.sources[5]?.url || "",
      inputSourceDescription6: payload.sources[5]?.description || "",
      inputSourceAccredit6: payload.sources[5]?.accredit || "",
      inputSourceVerbatim6: payload.sources[5]?.verbatim || false,
      inputSourcePrimary6: payload.sources[5]?.primary || false,
    };

    // Now create the new article with the calculated version
    const [article] = await tx
      .insert(articles)
      .values({
        orgId,
        slug: payload.slug,
        version: nextVersion,
        versionDecimal: nextVersionDecimal,
        headline: payload.headline,
        status: "pending",
        sourceType: sourceType,

        // Input snapshot fields - all sources
        ...sourceData,

        inputPresetInstructions: JSON.stringify({
          originalInstructions: payload.instructions.instructions,
          headlineSource: payload.headlineSource || 'ai'
        }),
        inputPresetBlobs: payload.instructions.blobs,
        inputPresetLength: payload.instructions.length,

        // Audit fields
        createdBy: payload.metadata.userId,
        updatedBy: payload.metadata.userId,
      })
      .returning();

    if (!article) {
      throw new Error("Failed to create article");
    }

    return article;
  });
}

/**
 * Update article with final pipeline results.
 * Simply sets the status and stores the generated content.
 *
 * @param articleId - The article ID to update
 * @param userId - User ID for audit trail
 * @param isSuccessful - Whether the pipeline completed successfully
 * @param headline - Generated headline from step 3
 * @param blobs - Generated blobs from step 3
 * @param formattedArticle - Final formatted article from step 8
 * @param richContent - Rich content JSON from step 8 (optional)
 */
export async function updateArticleWithResults(articleId: string, userId: string, isSuccessful: boolean, headline: string, blobs: string[], formattedArticle: string, richContent?: string): Promise<void> {
  await db
    .update(articles)
    .set({
      status: isSuccessful ? "completed" : "failed",
      headline: isSuccessful ? headline : null,
      blob: isSuccessful ? blobs.join("\n") : null,
      content: isSuccessful ? formattedArticle : null,
      richContent: isSuccessful && richContent ? richContent : null,
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(eq(articles.id, articleId));
}

/**
 * Create a new human-edited version of an article.
 * Increments the decimal part of the version (e.g., 3.00 → 3.01, 3.01 → 3.02).
 *
 * @param baseArticle - The current article to create a new version from
 * @param userId - User ID for audit trail
 * @param updates - Fields to update in the new version
 * @returns New article version
 */
export async function createHumanEditedVersion(
  baseArticle: Article,
  userId: string,
  updates: Partial<Pick<Article, "headline" | "blob" | "content" | "richContent" | "status">>,
  headlineSource?: 'ai' | 'manual'
): Promise<Article> {
  return await db.transaction(async (tx) => {
    // Get the major version from the base article
    const majorVersion = baseArticle.version;
    
    // Find the highest decimal version for this major version
    const [currentHighest] = await tx
      .select({ versionDecimal: articles.versionDecimal })
      .from(articles)
      .where(and(
        eq(articles.orgId, baseArticle.orgId),
        eq(articles.slug, baseArticle.slug),
        eq(articles.version, majorVersion) // Same major version
      ))
      .orderBy(desc(articles.versionDecimal))
      .limit(1)
      .for("update"); // Lock to prevent race conditions

    // Calculate next decimal version
    let nextVersionDecimal: string;
    if (currentHighest) {
      const currentDecimal = parseFloat(currentHighest.versionDecimal);
      const currentMajor = Math.floor(currentDecimal);
      const currentMinor = Math.round((currentDecimal - currentMajor) * 100);
      nextVersionDecimal = `${currentMajor}.${String(currentMinor + 1).padStart(2, '0')}`;
    } else {
      // Fallback if no existing versions found (shouldn't happen)
      nextVersionDecimal = `${majorVersion}.01`;
    }

    // Create new article record with incremented decimal version
    const [newArticle] = await tx
      .insert(articles)
      .values({
        // Copy all fields from base article
        orgId: baseArticle.orgId,
        slug: baseArticle.slug,
        version: baseArticle.version, // Keep same integer version
        versionDecimal: nextVersionDecimal, // Increment decimal version
        sourceType: baseArticle.sourceType,

        // Copy all source data
        inputSourceText1: baseArticle.inputSourceText1,
        inputSourceUrl1: baseArticle.inputSourceUrl1,
        inputSourceDescription1: baseArticle.inputSourceDescription1,
        inputSourceAccredit1: baseArticle.inputSourceAccredit1,
        inputSourceVerbatim1: baseArticle.inputSourceVerbatim1,
        inputSourcePrimary1: baseArticle.inputSourcePrimary1,
        inputSourceBase1: baseArticle.inputSourceBase1,

        inputSourceText2: baseArticle.inputSourceText2,
        inputSourceUrl2: baseArticle.inputSourceUrl2,
        inputSourceDescription2: baseArticle.inputSourceDescription2,
        inputSourceAccredit2: baseArticle.inputSourceAccredit2,
        inputSourceVerbatim2: baseArticle.inputSourceVerbatim2,
        inputSourcePrimary2: baseArticle.inputSourcePrimary2,
        inputSourceBase2: baseArticle.inputSourceBase2,

        inputSourceText3: baseArticle.inputSourceText3,
        inputSourceUrl3: baseArticle.inputSourceUrl3,
        inputSourceDescription3: baseArticle.inputSourceDescription3,
        inputSourceAccredit3: baseArticle.inputSourceAccredit3,
        inputSourceVerbatim3: baseArticle.inputSourceVerbatim3,
        inputSourcePrimary3: baseArticle.inputSourcePrimary3,
        inputSourceBase3: baseArticle.inputSourceBase3,

        inputSourceText4: baseArticle.inputSourceText4,
        inputSourceUrl4: baseArticle.inputSourceUrl4,
        inputSourceDescription4: baseArticle.inputSourceDescription4,
        inputSourceAccredit4: baseArticle.inputSourceAccredit4,
        inputSourceVerbatim4: baseArticle.inputSourceVerbatim4,
        inputSourcePrimary4: baseArticle.inputSourcePrimary4,
        inputSourceBase4: baseArticle.inputSourceBase4,

        inputSourceText5: baseArticle.inputSourceText5,
        inputSourceUrl5: baseArticle.inputSourceUrl5,
        inputSourceDescription5: baseArticle.inputSourceDescription5,
        inputSourceAccredit5: baseArticle.inputSourceAccredit5,
        inputSourceVerbatim5: baseArticle.inputSourceVerbatim5,
        inputSourcePrimary5: baseArticle.inputSourcePrimary5,
        inputSourceBase5: baseArticle.inputSourceBase5,

        inputSourceText6: baseArticle.inputSourceText6,
        inputSourceUrl6: baseArticle.inputSourceUrl6,
        inputSourceDescription6: baseArticle.inputSourceDescription6,
        inputSourceAccredit6: baseArticle.inputSourceAccredit6,
        inputSourceVerbatim6: baseArticle.inputSourceVerbatim6,
        inputSourcePrimary6: baseArticle.inputSourcePrimary6,
        inputSourceBase6: baseArticle.inputSourceBase6,

        // Copy preset data
        inputPresetTitle: baseArticle.inputPresetTitle,
        inputPresetInstructions: (() => {
          // Check if headline is being updated OR if we need to update headlineSource
          console.log("🔍 Checking headline update:", {
            hasHeadlineUpdate: updates.headline !== undefined,
            headlineUpdate: updates.headline,
            baseHeadline: baseArticle.headline,
            headlinesEqual: updates.headline === baseArticle.headline,
            headlineChanged: updates.headline !== undefined && updates.headline !== baseArticle.headline
          });
          
          // Parse current instructions to check headlineSource
          let currentHeadlineSource = 'ai';
          try {
            const parsed = JSON.parse(baseArticle.inputPresetInstructions);
            currentHeadlineSource = parsed.headlineSource || 'ai';
          } catch (error) {
            console.log("❌ Failed to parse current instructions:", error);
          }
          
          // Update headlineSource to 'manual' if:
          // 1. Headline is being updated AND it's different, OR
          // 2. Headline is being updated AND current headlineSource is 'ai' (force update), OR
          // 3. A specific headlineSource was passed and it's 'manual'
          const shouldUpdateHeadlineSource = updates.headline !== undefined && (
            updates.headline !== baseArticle.headline || 
            currentHeadlineSource === 'ai' ||
            headlineSource === 'manual'
          );
          
          if (shouldUpdateHeadlineSource) {
            console.log("🔄 Updating headlineSource to 'manual' for headline update:", {
              oldHeadline: baseArticle.headline,
              newHeadline: updates.headline,
              currentHeadlineSource,
              originalInstructions: baseArticle.inputPresetInstructions
            });
            try {
              const parsed = JSON.parse(baseArticle.inputPresetInstructions);
              const newInstructions = JSON.stringify({
                ...parsed,
                headlineSource: 'manual'
              });
              console.log("✅ Updated instructions with manual headlineSource:", newInstructions);
              return newInstructions;
            } catch (error) {
              console.log("❌ Failed to parse original instructions, creating new structure:", error);
              // If parsing fails, create new structure
              const newInstructions = JSON.stringify({
                originalInstructions: baseArticle.inputPresetInstructions,
                headlineSource: 'manual'
              });
              console.log("✅ Created new instructions structure:", newInstructions);
              return newInstructions;
            }
          }
          console.log("ℹ️ No headline source update needed, keeping original instructions");
          return baseArticle.inputPresetInstructions;
        })(),
        inputPresetBlobs: baseArticle.inputPresetBlobs,
        inputPresetLength: baseArticle.inputPresetLength,

        // Apply updates (headline, blob, content, richContent, status)
        headline: updates.headline ?? baseArticle.headline,
        blob: updates.blob ?? baseArticle.blob,
        content: updates.content ?? baseArticle.content,
        richContent: updates.richContent ?? baseArticle.richContent,
        status: updates.status ?? baseArticle.status,

        // Audit fields
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    if (!newArticle) {
      throw new Error("Failed to create human-edited version");
    }

    return newArticle;
  });
}

/**
 * Update an existing article with partial data.
 *
 * @param articleId - The article ID to update
 * @param userId - User ID for audit trail
 * @param updates - Partial article fields to update
 * @returns Updated article or null if not found
 */
export async function updateArticle(articleId: string, userId: string, updates: Partial<Pick<Article, "headline" | "blob" | "content" | "richContent" | "status">>): Promise<Article | null> {
  console.log("🗄️ updateArticle called with:", { articleId, userId, updates });

  try {
    const updateData = {
      ...updates,
      updatedBy: userId,
      updatedAt: new Date(),
    };

    console.log("📝 Executing database update with:", updateData);

    const [updatedArticle] = await db.update(articles).set(updateData).where(eq(articles.id, articleId)).returning();

    console.log("📊 Database update result:", updatedArticle ? "Article updated" : "No article found");

    if (updatedArticle) {
      console.log("✅ Updated article:", {
        id: updatedArticle.id,
        headline: updatedArticle.headline,
        blob: updatedArticle.blob ? `${updatedArticle.blob.substring(0, 50)}...` : null,
        richContent: updatedArticle.richContent ? "Has rich content" : "No rich content",
        updatedAt: updatedArticle.updatedAt,
      });
    }

    return updatedArticle || null;
  } catch (error) {
    console.error("❌ Database update failed:", error);
    throw error;
  }
}

/**
 * Update article status with progress tracking.
 * Simple function to update only the article status and audit fields.
 *
 * @param articleId - The article ID to update
 * @param userId - User ID for audit trail
 * @param status - New article status from the enum
 * @returns Updated article or null if not found
 */
export async function updateArticleStatus(articleId: string, userId: string, status: ArticleStatus): Promise<Article | null> {
  console.log(`📊 Updating article status to: ${status}`);

  try {
    const [updatedArticle] = await db
      .update(articles)
      .set({
        status,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, articleId))
      .returning();

    if (updatedArticle) {
      console.log(`✅ Article ${articleId} status updated to: ${status}`);
    } else {
      console.log(`❌ Article ${articleId} not found for status update`);
    }

    return updatedArticle || null;
  } catch (error) {
    console.error("❌ Article status update failed:", error);
    throw error;
  }
}

/**
 * Archive an article by setting its status to 'archived'.
 *
 * @param articleId - The article ID to archive
 * @param userId - User ID for audit trail
 * @returns Updated article or null if not found
 */
export async function archiveArticle(articleId: string, userId: string): Promise<Article | null> {
  const [updatedArticle] = await db
    .update(articles)
    .set({
      status: "archived",
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(eq(articles.id, articleId))
    .returning();

  return updatedArticle || null;
}

/**
 * Unarchive an article by setting its status to 'completed'.
 *
 * @param articleId - The article ID to unarchive
 * @param userId - User ID for audit trail
 * @returns Updated article or null if not found
 */
export async function unarchiveArticle(articleId: string, userId: string): Promise<Article | null> {
  const [updatedArticle] = await db
    .update(articles)
    .set({
      status: "completed",
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(eq(articles.id, articleId))
    .returning();

  return updatedArticle || null;
}


/* -------------------------------------------------------------------------- */
/*  Run helpers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Create a new run (spend & usage event).
 *
 * @param payload - Partial run record. `id` and `createdAt` are auto-filled.
 * @returns Inserted run row.
 */
export async function createRun(payload: Omit<NewRun, "id" | "createdAt">): Promise<Run> {
  const [row] = await db.insert(runs).values(payload).returning();
  return row;
}

/**
 * Update cost and tokens used for a run by run ID.
 * @param runId - The run's UUID
 * @param costUsd - The cost in USD
 * @param inputTokensUsed - The number of input tokens used
 * @param outputTokensUsed - The number of output tokens used
 * @returns The updated run row or null if not found
 */
export async function updateRun(runId: string, costUsd: number, inputTokensUsed: number, outputTokensUsed: number): Promise<Run | null> {
  const [row] = await db
    .update(runs)
    .set({ 
      costUsd: costUsd.toString(), 
      inputTokensUsed, 
      outputTokensUsed 
    })
    .where(eq(runs.id, runId))
    .returning();
  return row || null;
}

/**
 * getOrgRunsWithUserAndOrgData
 *
 * Fetches runs for the given org, joined with user info, filtered by the provided filters.
 *
 * @param orgId - Organization ID
 * @param filters - Filter parameters (time range, user, length, type)
 * @returns Array of runs with user info
 */
export async function getOrgRunsWithUserAndOrgData(orgId: number, filters: {
  timeRange?: "today" | "week" | "month" | "year" | "all";
  userId?: string;
  length?: string;
  sourceType?: "single" | "multi";
}) {
  // Build filter conditions
  const conditions = [eq(users.orgId, orgId)];
  if (filters.userId) conditions.push(eq(runs.userId, filters.userId));
  if (filters.length) {
    // Ensure the value is a valid LengthRange
    const validLengths: LengthRange[] = ["100-250", "400-550", "700-850", "1000-1200"];
    if (validLengths.includes(filters.length as LengthRange)) {
      conditions.push(eq(runs.length, filters.length as LengthRange));
    }
  }
  if (filters.sourceType) conditions.push(eq(runs.sourceType, filters.sourceType));
  // Time range filter
  if (filters.timeRange && filters.timeRange !== "all") {
    const now = new Date();
    let fromDate: Date | undefined;
    if (filters.timeRange === "today") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (filters.timeRange === "week") {
      const day = now.getDay();
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    } else if (filters.timeRange === "month") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (filters.timeRange === "year") {
      fromDate = new Date(now.getFullYear(), 0, 1);
    }
    if (fromDate) conditions.push(gte(runs.createdAt, fromDate));
  }
  // Query runs joined with users
  return await db
    .select({
      id: runs.id,
      articleId: runs.articleId,
      userId: runs.userId,
      userName: users.firstName,
      userEmail: users.email,
      sourceType: runs.sourceType,
      length: runs.length,
      costUsd: runs.costUsd,
      inputTokensUsed: runs.inputTokensUsed,
      outputTokensUsed: runs.outputTokensUsed,
      createdAt: runs.createdAt,
    })
    .from(runs)
    .innerJoin(users, eq(runs.userId, users.id))
    .where(and(...conditions))
    .orderBy(runs.createdAt);
}

/**
 * getOrgRunsSummary
 *
 * Calculates summary statistics (total runs, total cost, avg cost per run) for the given org and filters.
 *
 * @param orgId - Organization ID
 * @param filters - Filter parameters
 * @returns Summary statistics object
 */
export async function getOrgRunsSummary(orgId: number, filters: {
  timeRange?: "today" | "week" | "month" | "year" | "all";
  userId?: string;
  length?: string;
  sourceType?: "single" | "multi";
}) {
  // Reuse the same filter logic as getOrgRunsWithUserAndOrgData
  const runs = await getOrgRunsWithUserAndOrgData(orgId, filters);
  const totalRuns = runs.length;
  const totalCostUsd = runs.reduce((sum, r) => sum + (typeof r.costUsd === "string" ? parseFloat(r.costUsd) : (r.costUsd || 0)), 0);
  const avgCostPerRun = totalRuns > 0 ? totalCostUsd / totalRuns : 0;
  return { totalRuns, totalCostUsd, avgCostPerRun };
}

/**
 * getOrgUsers
 *
 * Fetches all users for the given org.
 *
 * @param orgId - Organization ID
 * @returns Array of users (id, name, email)
 */
export async function getOrgUsers(orgId?: number) {
  if (!orgId) {
    // Return all users
    return await db.select({
      id: users.id,
      name: users.firstName,
      email: users.email,
    }).from(users);
  }
  // Return users for a specific org
  return await db
    .select({
      id: users.id,
      name: users.firstName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.orgId, orgId));
}

/**
 * getOrgSummariesWithFilters
 *
 * Returns an array of summary objects, one per org, matching the filters (time range, user, length, type).
 * Each summary includes org name, org id, total runs, total cost, avg cost per run.
 *
 * @param filters - Filter parameters (time range, user, length, type)
 * @returns Array of org summary objects
 */
export async function getOrgSummariesWithFilters(filters: {
  timeRange?: "today" | "week" | "month" | "year" | "all";
  userId?: string;
  length?: string;
  sourceType?: "single" | "multi";
  orgId?: number;
}) {
  // Build filter conditions
  const conditions = [];
  if (filters.orgId) {
    conditions.push(eq(organizations.id, filters.orgId));
  }
  if (filters.userId) conditions.push(eq(runs.userId, filters.userId));
  if (filters.length) {
    const validLengths: LengthRange[] = ["100-250", "400-550", "700-850", "1000-1200"];
    if (validLengths.includes(filters.length as LengthRange)) {
      conditions.push(eq(runs.length, filters.length as LengthRange));
    }
  }
  if (filters.sourceType) conditions.push(eq(runs.sourceType, filters.sourceType));
  // Time range filter
  if (filters.timeRange && filters.timeRange !== "all") {
    const now = new Date();
    let fromDate: Date | undefined;
    if (filters.timeRange === "today") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (filters.timeRange === "week") {
      const day = now.getDay();
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    } else if (filters.timeRange === "month") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (filters.timeRange === "year") {
      fromDate = new Date(now.getFullYear(), 0, 1);
    }
    if (fromDate) conditions.push(gte(runs.createdAt, fromDate));
  }
  // Query runs joined with organizations, group by org
  const results = await db
    .select({
      orgId: organizations.id,
      organizationName: organizations.name,
      totalRuns: sql<number>`count(${runs.id})`,
      totalCostUsd: sql<number>`coalesce(sum(${runs.costUsd}), 0)`,
      avgCostPerRun: sql<number>`coalesce(avg(${runs.costUsd}), 0)`
    })
    .from(runs)
    .innerJoin(articles, eq(runs.articleId, articles.id))
    .innerJoin(organizations, eq(articles.orgId, organizations.id))
    .where(and(...conditions))
    .groupBy(organizations.id, organizations.name);
  // Parse numeric fields to numbers if needed
  return results.map(row => ({
    ...row,
    totalCostUsd: typeof row.totalCostUsd === 'string' ? parseFloat(row.totalCostUsd) : row.totalCostUsd,
    avgCostPerRun: typeof row.avgCostPerRun === 'string' ? parseFloat(row.avgCostPerRun) : row.avgCostPerRun,
  }));
}