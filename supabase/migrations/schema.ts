import { pgTable, uniqueIndex, foreignKey, unique, uuid, varchar, boolean, integer, timestamp, index, text, serial, numeric, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const articleStatus = pgEnum("article_status", ['pending', 'started', '10%', '25%', '50%', '75%', '90%', 'failed', 'completed', 'archived'])
export const blobs = pgEnum("blobs", ['1', '2', '3', '4', '5', '6'])
export const length = pgEnum("length", ['100-250', '400-550', '700-850', '1000-1200'])
export const sourceType = pgEnum("source_type", ['single', 'multi'])
export const userRole = pgEnum("user_role", ['admin', 'member'])


export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	isVerified: boolean("is_verified").default(false).notNull(),
	firstName: varchar("first_name", { length: 255 }),
	lastName: varchar("last_name", { length: 255 }),
	role: userRole().default('member').notNull(),
	orgId: integer("org_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("users_one_admin_per_org").using("btree", table.orgId.asc().nullsLast().op("int4_ops")).where(sql`(role = 'admin'::user_role)`),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "users_org_id_organizations_id_fk"
		}),
	unique("users_email_unique").on(table.email),
]);

export const presets = pgTable("presets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	instructions: text().notNull(),
	blobs: blobs().notNull(),
	length: length().notNull(),
	orgId: integer("org_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("presets_org_idx").using("btree", table.orgId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "presets_org_id_organizations_id_fk"
		}),
	unique("presets_name_unique").on(table.name),
]);

export const organizations = pgTable("organizations", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("organizations_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	unique("organizations_name_unique").on(table.name),
]);

export const runs = pgTable("runs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	articleId: uuid("article_id"),
	userId: uuid("user_id"),
	sourceType: sourceType("source_type").notNull(),
	length: length().notNull(),
	costUsd: numeric("cost_usd", { precision: 12, scale:  6 }).notNull(),
	inputTokensUsed: integer("input_tokens_used"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	outputTokensUsed: integer("output_tokens_used"),
}, (table) => [
	index("runs_article_idx").using("btree", table.articleId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.articleId],
			foreignColumns: [articles.id],
			name: "runs_article_id_articles_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "runs_user_id_users_id_fk"
		}),
]);

export const articles = pgTable("articles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: integer("org_id").notNull(),
	slug: varchar({ length: 255 }).notNull(),
	version: integer().default(1).notNull(),
	headline: varchar({ length: 500 }),
	blob: text(),
	content: text(),
	inputSourceText1: text("input_source_text_1").notNull(),
	inputSourceDescription1: text("input_source_description_1").default('').notNull(),
	inputSourceAccredit1: text("input_source_accredit_1").default('').notNull(),
	inputSourceVerbatim1: boolean("input_source_verbatim_1").default(false).notNull(),
	inputSourcePrimary1: boolean("input_source_primary_1").default(false).notNull(),
	inputPresetInstructions: text("input_preset_instructions").default('').notNull(),
	inputPresetBlobs: blobs("input_preset_blobs").default('1').notNull(),
	inputPresetLength: length("input_preset_length").default('700-850').notNull(),
	status: articleStatus().default('10%').notNull(),
	createdBy: uuid("created_by"),
	updatedBy: uuid("updated_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	inputSourceText2: text("input_source_text_2"),
	inputSourceDescription2: text("input_source_description_2").default(''),
	inputSourceAccredit2: text("input_source_accredit_2").default(''),
	inputSourceVerbatim2: boolean("input_source_verbatim_2").default(false),
	inputSourcePrimary2: boolean("input_source_primary_2").default(false),
	inputSourceText3: text("input_source_text_3"),
	inputSourceDescription3: text("input_source_description_3").default(''),
	inputSourceAccredit3: text("input_source_accredit_3").default(''),
	inputSourceVerbatim3: boolean("input_source_verbatim_3").default(false),
	inputSourcePrimary3: boolean("input_source_primary_3").default(false),
	inputSourceText4: text("input_source_text_4"),
	inputSourceDescription4: text("input_source_description_4").default(''),
	inputSourceAccredit4: text("input_source_accredit_4").default(''),
	inputSourceVerbatim4: boolean("input_source_verbatim_4").default(false),
	inputSourcePrimary4: boolean("input_source_primary_4").default(false),
	inputSourceText5: text("input_source_text_5"),
	inputSourceDescription5: text("input_source_description_5").default(''),
	inputSourceAccredit5: text("input_source_accredit_5").default(''),
	inputSourceVerbatim5: boolean("input_source_verbatim_5").default(false),
	inputSourcePrimary5: boolean("input_source_primary_5").default(false),
	inputSourceText6: text("input_source_text_6"),
	inputSourceDescription6: text("input_source_description_6").default(''),
	inputSourceAccredit6: text("input_source_accredit_6").default(''),
	inputSourceVerbatim6: boolean("input_source_verbatim_6").default(false),
	inputSourcePrimary6: boolean("input_source_primary_6").default(false),
	sourceType: sourceType("source_type").default('single').notNull(),
	inputPresetTitle: varchar("input_preset_title", { length: 255 }).default(''),
	inputSourceBase1: boolean("input_source_base_1").default(false),
	inputSourceBase2: boolean("input_source_base_2").default(false),
	inputSourceBase3: boolean("input_source_base_3").default(false),
	inputSourceBase4: boolean("input_source_base_4").default(false),
	inputSourceBase5: boolean("input_source_base_5").default(false),
	inputSourceBase6: boolean("input_source_base_6").default(false),
	richContent: text("rich_content"),
	versionDecimal: numeric("version_decimal", { precision: 4, scale:  2 }).default('1.00').notNull(),
	inputSourceUrl1: text("input_source_url_1").default(''),
	inputSourceUrl2: text("input_source_url_2").default(''),
	inputSourceUrl3: text("input_source_url_3").default(''),
	inputSourceUrl4: text("input_source_url_4").default(''),
	inputSourceUrl5: text("input_source_url_5").default(''),
	inputSourceUrl6: text("input_source_url_6").default(''),
	ripScore: integer("rip_score"),
	ripAnalysis: text("rip_analysis"),
	ripComparisons: text("rip_comparisons"),
}, (table) => [
	index("articles_org_slug_idx").using("btree", table.orgId.asc().nullsLast().op("int4_ops"), table.slug.asc().nullsLast().op("int4_ops")),
	index("articles_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "articles_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "articles_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "articles_updated_by_users_id_fk"
		}),
]);
