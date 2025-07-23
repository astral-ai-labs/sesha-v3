ALTER TABLE "runs" RENAME COLUMN "tokens_used" TO "input_tokens_used";--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "output_tokens_used" integer;