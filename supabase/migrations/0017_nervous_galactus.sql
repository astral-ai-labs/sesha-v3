-- Rename the column from run_type to source_type
ALTER TABLE "runs" RENAME COLUMN "run_type" TO "source_type";--> statement-breakpoint

-- Change the column type to use the existing source_type enum
ALTER TABLE "runs" ALTER COLUMN "source_type" TYPE "public"."source_type" USING "source_type"::text::"public"."source_type";--> statement-breakpoint

-- Rename tokens_used to input_tokens_used
ALTER TABLE "runs" RENAME COLUMN "tokens_used" TO "input_tokens_used";--> statement-breakpoint

-- Add the new output_tokens_used column
ALTER TABLE "runs" ADD COLUMN "output_tokens_used" integer;--> statement-breakpoint

-- Drop the old run_type enum
DROP TYPE "public"."run_type";