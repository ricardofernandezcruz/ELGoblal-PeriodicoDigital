ALTER TABLE "articles" ADD COLUMN "review" jsonb;--> statement-breakpoint
INSERT INTO "sections" ("slug", "name", "position", "in_menu")
SELECT 'resenas', 'Reseñas', COALESCE(MAX("position"), 0) + 1, true FROM "sections"
WHERE NOT EXISTS (SELECT 1 FROM "sections" WHERE "slug" = 'resenas');
