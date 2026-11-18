CREATE TABLE "ad_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"advertiser" text DEFAULT '' NOT NULL,
	"url" text NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"paused" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"placements" text[] DEFAULT '{}'::text[] NOT NULL,
	"sections" text[] DEFAULT '{}'::text[] NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"desktop" jsonb,
	"mobile" jsonb,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_stats" (
	"campaign_id" uuid NOT NULL,
	"day" text NOT NULL,
	"placement" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ad_stats_campaign_id_day_placement_pk" PRIMARY KEY("campaign_id","day","placement")
);
--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_stats" ADD CONSTRAINT "ad_stats_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE cascade ON UPDATE no action;