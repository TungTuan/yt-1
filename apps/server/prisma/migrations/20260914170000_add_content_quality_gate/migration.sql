ALTER TABLE "content_items"
  ADD COLUMN "fact_sources" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "factual_qa_passed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "language_qa_passed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "qa_notes" TEXT,
  ADD COLUMN "qa_reviewed_by" TEXT,
  ADD COLUMN "qa_reviewed_at" TIMESTAMP(3);

