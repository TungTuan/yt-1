-- CreateEnum
CREATE TYPE "Market" AS ENUM ('jp', 'kr');

-- CreateEnum
CREATE TYPE "AssetMarket" AS ENUM ('jp', 'kr', 'shared');

-- CreateEnum
CREATE TYPE "SegmentType" AS ENUM ('morning_news', 'nostalgia', 'letter_reading', 'quiz', 'bedtime_story', 'companionship', 'gratitude_ritual');

-- CreateEnum
CREATE TYPE "TimeSlot" AS ENUM ('07:00', '10:00', '12:00', '15:00', '19:00', '21:00');

-- CreateEnum
CREATE TYPE "ContentFormat" AS ENUM ('long_form', 'shorts');

-- CreateEnum
CREATE TYPE "ContentSource" AS ENUM ('claude_api', 'excel_import', 'claude_code_headless');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('queued', 'scripted', 'needs_review', 'approved', 'voiced', 'rendered', 'uploaded', 'published', 'failed');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('background', 'mascot_pose', 'overlay_card');

-- CreateEnum
CREATE TYPE "TimeOfDayTag" AS ENUM ('morning', 'afternoon', 'evening', 'night', 'any');

-- CreateEnum
CREATE TYPE "SeasonTag" AS ENUM ('spring', 'summer', 'autumn', 'winter', 'any');

-- CreateEnum
CREATE TYPE "SettingTag" AS ENUM ('outdoor_porch', 'indoor');

-- CreateEnum
CREATE TYPE "AudioType" AS ENUM ('bgm', 'sfx');

-- CreateTable
CREATE TABLE "content_items" (
    "id" TEXT NOT NULL,
    "market" "Market" NOT NULL,
    "segment_type" "SegmentType" NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "time_slot" "TimeSlot" NOT NULL,
    "format" "ContentFormat" NOT NULL DEFAULT 'long_form',
    "parent_content_id" TEXT,
    "source" "ContentSource" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'queued',
    "title" TEXT,
    "script_text" TEXT,
    "script_metadata" JSONB NOT NULL DEFAULT '{}',
    "audio_path" TEXT,
    "video_path" TEXT,
    "thumbnail_path" TEXT,
    "youtube_video_id" TEXT,
    "youtube_publish_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_library" (
    "id" TEXT NOT NULL,
    "market" "AssetMarket" NOT NULL,
    "asset_type" "AssetType" NOT NULL,
    "file_path" TEXT NOT NULL,
    "time_of_day_tag" "TimeOfDayTag",
    "season_tag" "SeasonTag",
    "setting_tag" "SettingTag",
    "pose_name" TEXT,
    "overlay_role" TEXT,
    "mood_tag" TEXT,
    "aspect_safe_crop" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_library" (
    "id" TEXT NOT NULL,
    "market" "AssetMarket" NOT NULL,
    "audio_type" "AudioType" NOT NULL,
    "file_path" TEXT NOT NULL,
    "mood_tag" TEXT,
    "segment_type_tags" TEXT[],
    "sfx_trigger" TEXT,
    "duration_seconds" DOUBLE PRECISION NOT NULL,
    "loop_safe" BOOLEAN NOT NULL DEFAULT false,
    "license_source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_usage_logs" (
    "id" TEXT NOT NULL,
    "market" "Market" NOT NULL,
    "segment_type" "SegmentType" NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "cache_read_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_creation_tokens" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_items_market_idx" ON "content_items"("market");

-- CreateIndex
CREATE INDEX "content_items_status_idx" ON "content_items"("status");

-- CreateIndex
CREATE INDEX "content_items_scheduled_date_idx" ON "content_items"("scheduled_date");

-- CreateIndex
CREATE INDEX "content_items_parent_content_id_idx" ON "content_items"("parent_content_id");

-- CreateIndex
CREATE INDEX "asset_library_market_idx" ON "asset_library"("market");

-- CreateIndex
CREATE INDEX "asset_library_asset_type_idx" ON "asset_library"("asset_type");

-- CreateIndex
CREATE INDEX "audio_library_market_idx" ON "audio_library"("market");

-- CreateIndex
CREATE INDEX "audio_library_audio_type_idx" ON "audio_library"("audio_type");

-- CreateIndex
CREATE INDEX "api_usage_logs_market_idx" ON "api_usage_logs"("market");

-- CreateIndex
CREATE INDEX "api_usage_logs_created_at_idx" ON "api_usage_logs"("created_at");

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_parent_content_id_fkey" FOREIGN KEY ("parent_content_id") REFERENCES "content_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
