CREATE TABLE "article_sections" (
	"article_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	CONSTRAINT "article_sections_article_id_section_id_pk" PRIMARY KEY("article_id","section_id")
);
--> statement-breakpoint
ALTER TABLE "article_sections" ADD CONSTRAINT "article_sections_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_sections" ADD CONSTRAINT "article_sections_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_sections_section_idx" ON "article_sections" USING btree ("section_id");