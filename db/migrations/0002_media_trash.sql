ALTER TABLE "media" ADD COLUMN "credit" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "deleted_at" timestamp with time zone;