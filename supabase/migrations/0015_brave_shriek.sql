ALTER TABLE "articles" ADD COLUMN "version_decimal" numeric(4, 2) DEFAULT '1.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "input_source_url_1" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "input_source_url_2" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "input_source_url_3" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "input_source_url_4" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "input_source_url_5" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "input_source_url_6" text DEFAULT '';