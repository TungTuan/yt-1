ALTER TABLE "content_items"
  ADD COLUMN "target_keyword" TEXT,
  ADD COLUMN "seo_title" TEXT,
  ADD COLUMN "seo_description" TEXT,
  ADD COLUMN "seo_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

