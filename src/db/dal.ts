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

import { users, articles, organizations, presets } from "./schema";

import type { NewUser, User, Preset, Article, ArticleStatus, RunType, Organization, NewPreset, BlobsCount, LengthRange } from "./schema";

import { eq, and, sql, desc } from "drizzle-orm";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/** Shape returned by `getArticleMetadata()` — a trimmed-down view. */
export interface ArticleMetadata {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  createdByName: string;
  slug: string;
  headline: string | null;
  sourceType: string;
  status: ArticleStatus;
}

/** Sidebar list item for an article version. */
export interface ArticleVersionMetadata {
  version: number;
  slug: string | null;
  headline: string | null;
  createdAt: Date;
  blobOutline: string | null;
}

/** Raw run row shape returned by `getOrgRuns()` */
export interface RunRow {
  id: string;
  articleId: string | null;
  userId: string | null;
  runType: RunType;
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
      slug: articles.slug,
      headline: articles.headline,
      createdAt: articles.createdAt,
      blobOutline: articles.blob,
    })
    .from(articles)
    .where(eq(articles.id, articleId))
    .orderBy(articles.version);
}

/* -------------------------------------------------------------------------- */
/*  Fetch article by (orgId, slug, version)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Fetch an article (with version content) given its org, slug, and version.
 * If `version` is omitted it resolves to the article's currentVersion.
 */
export async function getArticleByOrgSlugVersion(orgId: number, slug: string, version?: number): Promise<Article | null> {
  // 1) Find the article row first
  const [article] = await db
    .select()
    .from(articles)
    .where(and(eq(articles.orgId, orgId), eq(articles.slug, slug), eq(articles.version, version ?? 1)))
    .limit(1);

  if (!article) return null;

  return article;
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
      headline: articles.headline,
      blob: articles.blob,
      content: articles.content,
      richContent: articles.richContent,
      sourceType: articles.sourceType,

      // 1st source
      inputSourceText1: articles.inputSourceText1,
      inputSourceDescription1: articles.inputSourceDescription1,
      inputSourceAccredit1: articles.inputSourceAccredit1,
      inputSourceVerbatim1: articles.inputSourceVerbatim1,
      inputSourcePrimary1: articles.inputSourcePrimary1,
      inputSourceBase1: articles.inputSourceBase1,
      // 2nd source
      inputSourceText2: articles.inputSourceText2,
      inputSourceDescription2: articles.inputSourceDescription2,
      inputSourceAccredit2: articles.inputSourceAccredit2,
      inputSourceVerbatim2: articles.inputSourceVerbatim2,
      inputSourcePrimary2: articles.inputSourcePrimary2,
      inputSourceBase2: articles.inputSourceBase2,
      // 3rd source
      inputSourceText3: articles.inputSourceText3,
      inputSourceDescription3: articles.inputSourceDescription3,
      inputSourceAccredit3: articles.inputSourceAccredit3,
      inputSourceVerbatim3: articles.inputSourceVerbatim3,
      inputSourcePrimary3: articles.inputSourcePrimary3,
      inputSourceBase3: articles.inputSourceBase3,
      // 4th source
      inputSourceText4: articles.inputSourceText4,
      inputSourceDescription4: articles.inputSourceDescription4,
      inputSourceAccredit4: articles.inputSourceAccredit4,
      inputSourceVerbatim4: articles.inputSourceVerbatim4,
      inputSourcePrimary4: articles.inputSourcePrimary4,
      inputSourceBase4: articles.inputSourceBase4,
      // 5th source
      inputSourceText5: articles.inputSourceText5,
      inputSourceDescription5: articles.inputSourceDescription5,
      inputSourceAccredit5: articles.inputSourceAccredit5,
      inputSourceVerbatim5: articles.inputSourceVerbatim5,
      inputSourcePrimary5: articles.inputSourcePrimary5,
      inputSourceBase5: articles.inputSourceBase5,
      // 6th source
      inputSourceText6: articles.inputSourceText6,
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
    .orderBy(desc(articles.version));
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
 * Create a new article record with all input and output fields.
 * Always creates a new row - no complex transaction logic needed.
 * Handles version conflicts by automatically incrementing version on duplicate key violations.
 *
 * @param payload - Article creation payload with all data
 * @returns The article ID for use in subsequent pipeline steps
 */
export async function createArticleRecord(payload: {
  metadata: {
    userId: string;
    orgId: string;
    currentVersion: number | null;
  };
  sourceType: "single" | "multi";
  slug: string;
  headline: string;
  sources: Array<{
    description: string;
    accredit: string;
    sourceText: string;
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
      .select({ version: articles.version })
      .from(articles)
      .where(and(eq(articles.orgId, orgId), eq(articles.slug, payload.slug)))
      .orderBy(desc(articles.version))
      .limit(1)
      .for("update"); // This locks the row(s) until transaction commits

    const nextVersion = (currentHighest?.version || 0) + 1;

    // Prepare source data for all 6 possible sources
    const sourceData = {
      // Source 1 (required)
      inputSourceText1: payload.sources[0].sourceText,
      inputSourceDescription1: payload.sources[0].description,
      inputSourceAccredit1: payload.sources[0].accredit,
      inputSourceVerbatim1: payload.sources[0].verbatim,
      inputSourcePrimary1: payload.sources[0].primary,

      // Source 2 (optional)
      inputSourceText2: payload.sources[1]?.sourceText || null,
      inputSourceDescription2: payload.sources[1]?.description || "",
      inputSourceAccredit2: payload.sources[1]?.accredit || "",
      inputSourceVerbatim2: payload.sources[1]?.verbatim || false,
      inputSourcePrimary2: payload.sources[1]?.primary || false,

      // Source 3 (optional)
      inputSourceText3: payload.sources[2]?.sourceText || null,
      inputSourceDescription3: payload.sources[2]?.description || "",
      inputSourceAccredit3: payload.sources[2]?.accredit || "",
      inputSourceVerbatim3: payload.sources[2]?.verbatim || false,
      inputSourcePrimary3: payload.sources[2]?.primary || false,

      // Source 4 (optional)
      inputSourceText4: payload.sources[3]?.sourceText || null,
      inputSourceDescription4: payload.sources[3]?.description || "",
      inputSourceAccredit4: payload.sources[3]?.accredit || "",
      inputSourceVerbatim4: payload.sources[3]?.verbatim || false,
      inputSourcePrimary4: payload.sources[3]?.primary || false,

      // Source 5 (optional)
      inputSourceText5: payload.sources[4]?.sourceText || null,
      inputSourceDescription5: payload.sources[4]?.description || "",
      inputSourceAccredit5: payload.sources[4]?.accredit || "",
      inputSourceVerbatim5: payload.sources[4]?.verbatim || false,
      inputSourcePrimary5: payload.sources[4]?.primary || false,

      // Source 6 (optional)
      inputSourceText6: payload.sources[5]?.sourceText || null,
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
        headline: payload.headline,
        status: "pending",
        sourceType: sourceType,

        // Input snapshot fields - all sources
        ...sourceData,

        inputPresetInstructions: payload.instructions.instructions,
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
 * @param formattedArticle - Final formatted article from step 7
 */
export async function updateArticleWithResults(articleId: string, userId: string, isSuccessful: boolean, headline: string, blobs: string[], formattedArticle: string, richContent?: string): Promise<void> {
  await db
    .update(articles)
    .set({
      status: isSuccessful ? "completed" : "failed",
      headline: isSuccessful ? headline : null,
      blob: isSuccessful ? blobs.join("\n") : null,
      content: isSuccessful ? formattedArticle : null,
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(eq(articles.id, articleId));
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