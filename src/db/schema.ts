/* ==========================================================================*/
/* schema.ts — Simplified database schema (Drizzle ORM + PostgreSQL)          */
/*   - Single table for article versions                                     */
/*   - Article inputs inlined on articles                                    */
/*   - Preset ↔ article relation removed                                     */
/*   - "sources" and "article_inputs" tables removed                        */
/* ==========================================================================*/

/* ==========================================================================*/
/* Imports                                                                    */
/* ==========================================================================*/

import { pgTable, pgEnum, uuid, varchar, text, boolean, timestamp, integer, index, uniqueIndex, serial, numeric } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ==========================================================================*/
/* Enums                                                                      */
/* ==========================================================================*/

// Generic
export const userRoleEnum = pgEnum("user_role", ["admin", "member"]);
export const articleStatusEnum = pgEnum("article_status", ["pending", "started", "10%", "25%", "50%", "75%", "90%", "failed", "completed", "archived"]);

// Re-used enumerations
export const blobsEnum = pgEnum("blobs", ["1", "2", "3", "4", "5", "6"]);
export const lengthEnum = pgEnum("length", ["100-250", "400-550", "700-850", "1000-1200"]);
export const runTypeEnum = pgEnum("run_type", ["digest"]);

// Source type
export const sourceTypeEnum = pgEnum("source_type", ["single", "multi"]);

/* ==========================================================================*/
/* Core Tables                                                                */
/* ==========================================================================*/

/* -- 1. Organizations ------------------------------------------------------*/
export const organizations = pgTable(
  "organizations",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("organizations_name_idx").on(table.name)]
);

/* -- 2. Users --------------------------------------------------------------*/
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    isVerified: boolean("is_verified").default(false).notNull(),
    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    role: userRoleEnum("role").default("member").notNull(),
    orgId: integer("org_id")
      .references(() => organizations.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // Guarantee **one** admin per organization
    uniqueIndex("users_one_admin_per_org")
      .on(table.orgId)
      .where(sql`${table.role} = 'admin'`),
  ]
);

/* -- 3. Presets ------------------------------------------------------------*/
export const presets = pgTable(
  "presets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    instructions: text("instructions").notNull(),
    blobs: blobsEnum("blobs").notNull(),
    length: lengthEnum("length").notNull(),
    orgId: integer("org_id")
      .references(() => organizations.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("presets_org_idx").on(table.orgId)]
);

/* -- 4. Articles (one row per version) -------------------------------------*/
export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // ─────────────── Identity ───────────────
    orgId: integer("org_id")
      .references(() => organizations.id)
      .notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    version: integer("version").default(1).notNull(), // starts at 1, increments

    // ─────────────── Output snapshot ────────
    headline: varchar("headline", { length: 500 }),
    blob: text("blob"),
    content: text("content"),
    richContent: text("rich_content"),

    // ─────────────── Input snapshot ────────

    // Input (Source Material) - up to 6 sources
    inputSourceText1: text("input_source_text_1").notNull(),
    inputSourceDescription1: text("input_source_description_1").default("").notNull(),
    inputSourceAccredit1: text("input_source_accredit_1").default("").notNull(),
    inputSourceVerbatim1: boolean("input_source_verbatim_1").default(false).notNull(),
    inputSourcePrimary1: boolean("input_source_primary_1").default(false).notNull(),
    inputSourceBase1: boolean("input_source_base_1").default(false),

    inputSourceText2: text("input_source_text_2"),
    inputSourceDescription2: text("input_source_description_2").default(""),
    inputSourceAccredit2: text("input_source_accredit_2").default(""),
    inputSourceVerbatim2: boolean("input_source_verbatim_2").default(false),
    inputSourcePrimary2: boolean("input_source_primary_2").default(false),
    inputSourceBase2: boolean("input_source_base_2").default(false),

    inputSourceText3: text("input_source_text_3"),
    inputSourceDescription3: text("input_source_description_3").default(""),
    inputSourceAccredit3: text("input_source_accredit_3").default(""),
    inputSourceVerbatim3: boolean("input_source_verbatim_3").default(false),
    inputSourcePrimary3: boolean("input_source_primary_3").default(false),
    inputSourceBase3: boolean("input_source_base_3").default(false),


    inputSourceText4: text("input_source_text_4"),
    inputSourceDescription4: text("input_source_description_4").default(""),
    inputSourceAccredit4: text("input_source_accredit_4").default(""),
    inputSourceVerbatim4: boolean("input_source_verbatim_4").default(false),
    inputSourcePrimary4: boolean("input_source_primary_4").default(false),
    inputSourceBase4: boolean("input_source_base_4").default(false),

    inputSourceText5: text("input_source_text_5"),
    inputSourceDescription5: text("input_source_description_5").default(""),
    inputSourceAccredit5: text("input_source_accredit_5").default(""),
    inputSourceVerbatim5: boolean("input_source_verbatim_5").default(false),
    inputSourcePrimary5: boolean("input_source_primary_5").default(false),
    inputSourceBase5: boolean("input_source_base_5").default(false),

    inputSourceText6: text("input_source_text_6"),
    inputSourceDescription6: text("input_source_description_6").default(""),
    inputSourceAccredit6: text("input_source_accredit_6").default(""),
    inputSourceVerbatim6: boolean("input_source_verbatim_6").default(false),
    inputSourcePrimary6: boolean("input_source_primary_6").default(false),
    inputSourceBase6: boolean("input_source_base_6").default(false),
    // Input (Non-source)
    inputPresetTitle: varchar("input_preset_title", { length: 255 }).default(""),
    inputPresetInstructions: text("input_preset_instructions").default("").notNull(),
    inputPresetBlobs: blobsEnum("input_preset_blobs").default("1").notNull(),
    inputPresetLength: lengthEnum("input_preset_length").default("700-850").notNull(),

    // ─────────────── Status  ────────────────
    status: articleStatusEnum("status").default("10%").notNull(),
    sourceType: sourceTypeEnum("source_type").default("single").notNull(),

    // ─────────────── Audit   ────────────────
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("articles_org_slug_version_idx").on(table.orgId, table.slug, table.version), index("articles_org_slug_idx").on(table.orgId, table.slug), index("articles_status_idx").on(table.status)]
);

/* -- 5. Runs (spend & usage events) ---------------------------------------*/
export const runs = pgTable(
  "runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // FK links to article version and user who triggered the run
    articleId: uuid("article_id").references(() => articles.id),
    userId: uuid("user_id").references(() => users.id),

    // What kind of run generated this cost?
    runType: runTypeEnum("run_type").notNull(),

    // Snapshot fields for grouping
    length: lengthEnum("length").notNull(),

    // Financial / usage metrics
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }).notNull(),
    tokensUsed: integer("tokens_used"),

    // Timestamp for date-range filtering
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("runs_article_idx").on(table.articleId)]
);

/* ==========================================================================*/
/* Relations                                                                 */
/* ==========================================================================*/

export const organizationRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  presets: many(presets),
  articles: many(articles),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.orgId],
    references: [organizations.id],
  }),
  createdArticles: many(articles, { relationName: "createdByArticles" }),
  runs: many(runs),
}));

export const presetRelations = relations(presets, ({ one }) => ({
  organization: one(organizations, {
    fields: [presets.orgId],
    references: [organizations.id],
  }),
}));

export const articleRelations = relations(articles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [articles.orgId],
    references: [organizations.id],
  }),
  runs: many(runs),
}));

export const runRelations = relations(runs, ({ one }) => ({
  article: one(articles, {
    fields: [runs.articleId],
    references: [articles.id],
  }),
  user: one(users, {
    fields: [runs.userId],
    references: [users.id],
  }),
}));

/* ==========================================================================*/
/* Inferred Types                                                            */
/* ==========================================================================*/

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Preset = typeof presets.$inferSelect;
export type NewPreset = typeof presets.$inferInsert;

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;

/* Enum helper types */
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type ArticleStatus = (typeof articleStatusEnum.enumValues)[number];
export type BlobsCount = (typeof blobsEnum.enumValues)[number];
export type LengthRange = (typeof lengthEnum.enumValues)[number];
export type RunType = (typeof runTypeEnum.enumValues)[number];
export type SourceType = (typeof sourceTypeEnum.enumValues)[number];