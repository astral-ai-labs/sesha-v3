import { relations } from "drizzle-orm/relations";
import { organizations, users, presets, articles, runs } from "./schema";

export const usersRelations = relations(users, ({one, many}) => ({
	organization: one(organizations, {
		fields: [users.orgId],
		references: [organizations.id]
	}),
	runs: many(runs),
	articles_createdBy: many(articles, {
		relationName: "articles_createdBy_users_id"
	}),
	articles_updatedBy: many(articles, {
		relationName: "articles_updatedBy_users_id"
	}),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	users: many(users),
	presets: many(presets),
	articles: many(articles),
}));

export const presetsRelations = relations(presets, ({one}) => ({
	organization: one(organizations, {
		fields: [presets.orgId],
		references: [organizations.id]
	}),
}));

export const runsRelations = relations(runs, ({one}) => ({
	article: one(articles, {
		fields: [runs.articleId],
		references: [articles.id]
	}),
	user: one(users, {
		fields: [runs.userId],
		references: [users.id]
	}),
}));

export const articlesRelations = relations(articles, ({one, many}) => ({
	runs: many(runs),
	user_createdBy: one(users, {
		fields: [articles.createdBy],
		references: [users.id],
		relationName: "articles_createdBy_users_id"
	}),
	organization: one(organizations, {
		fields: [articles.orgId],
		references: [organizations.id]
	}),
	user_updatedBy: one(users, {
		fields: [articles.updatedBy],
		references: [users.id],
		relationName: "articles_updatedBy_users_id"
	}),
}));