-- Safely rename the column from run_type to source_type (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='runs' AND column_name='run_type') THEN
    ALTER TABLE "runs" RENAME COLUMN "run_type" TO "source_type";
  END IF;
END $$;--> statement-breakpoint

-- Change the column type to use the existing source_type enum (if column exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='runs' AND column_name='source_type') THEN
    ALTER TABLE "runs" ALTER COLUMN "source_type" TYPE "public"."source_type" USING "source_type"::text::"public"."source_type";
  END IF;
END $$;--> statement-breakpoint

-- Safely rename tokens_used to input_tokens_used (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='runs' AND column_name='tokens_used') THEN
    ALTER TABLE "runs" RENAME COLUMN "tokens_used" TO "input_tokens_used";
  END IF;
END $$;--> statement-breakpoint

-- Add the new output_tokens_used column (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='runs' AND column_name='output_tokens_used') THEN
    ALTER TABLE "runs" ADD COLUMN "output_tokens_used" integer;
  END IF;
END $$;--> statement-breakpoint

-- Drop the old run_type enum (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname='run_type') THEN
    DROP TYPE "public"."run_type";
  END IF;
END $$;