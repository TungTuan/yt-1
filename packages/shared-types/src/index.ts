/**
 * Shared types for the こもれび便り × 햇살 편지 content pipeline.
 * Mirrors the `content_items` / `asset_library` / `audio_library` schema
 * defined in komorebi-app-spec.md (EPIC 1, TICKET-002).
 */

export type Market = 'jp' | 'kr';

/** asset_library / audio_library also allow 'shared' (used by both channels). */
export type AssetMarket = Market | 'shared';

export type SegmentType =
  | 'morning_news'
  | 'nostalgia'
  | 'letter_reading'
  | 'quiz'
  | 'bedtime_story'
  | 'companionship'
  | 'gratitude_ritual';

/** '10:00' and '15:00' are reserved for auto-derived Shorts (TICKET-014); never entered by hand. */
export type TimeSlot = '07:00' | '10:00' | '12:00' | '15:00' | '19:00' | '21:00';

/** Time slots a human (or Excel import) may schedule a long_form item into. */
export const IMPORTABLE_TIME_SLOTS: TimeSlot[] = ['07:00', '12:00', '19:00', '21:00'];

export type ContentFormat = 'long_form' | 'shorts';

export type ContentSource = 'claude_api' | 'excel_import' | 'claude_code_headless';

export type ContentStatus =
  | 'queued'
  | 'scripted'
  | 'needs_review'
  | 'approved'
  | 'voiced'
  | 'rendered'
  | 'uploaded'
  | 'published'
  | 'failed';

export type AssetType = 'background' | 'mascot_pose' | 'overlay_card';

export type TimeOfDayTag = 'morning' | 'afternoon' | 'evening' | 'night' | 'any';

export type SeasonTag = 'spring' | 'summer' | 'autumn' | 'winter' | 'any';

/** 'outdoor_porch' covers both jp engawa and kr toenmaru background sets. */
export type SettingTag = 'outdoor_porch' | 'indoor';

export type AudioType = 'bgm' | 'sfx';

export type TagColor = 'amber' | 'sage' | 'indigo';

/**
 * Segment -> tag color, used by Remotion compositions (TICKET-009). The spec says "amber/sage/
 * indigo theo loại nội dung" but doesn't hand down the exact mapping — this groups by tone: amber
 * for bright/daytime formats, sage for reflective/nature-toned formats, indigo for the one
 * night-time format. Reasonable default, adjust freely.
 */
export const SEGMENT_TAG_COLOR: Record<SegmentType, TagColor> = {
  morning_news: 'amber',
  quiz: 'amber',
  gratitude_ritual: 'amber',
  nostalgia: 'sage',
  letter_reading: 'sage',
  companionship: 'sage',
  bedtime_story: 'indigo',
};

/** Segment types that must always be flagged for human review, no matter the source. */
export const REVIEW_REQUIRED_SEGMENT_TYPES: SegmentType[] = ['letter_reading', 'companionship'];

export interface QuizQuestion {
  question: string;
  choices?: string[];
  answer: string;
  fun_fact?: string;
}

export interface ScriptMetadata {
  tags?: string[];
  mood?: string;
  continuity_ref?: string;
  shorts_snippet?: string;
  questions?: QuizQuestion[];
  /** Set when a crisis-safeguard keyword was detected (TICKET-005). */
  crisis_flagged?: boolean;
  priority?: 'normal' | 'high';
  rejection_reason?: string;
  [key: string]: unknown;
}

export interface ContentItem {
  id: string;
  market: Market;
  segmentType: SegmentType;
  scheduledDate: string; // ISO date
  timeSlot: TimeSlot;
  format: ContentFormat;
  parentContentId: string | null;
  source: ContentSource;
  status: ContentStatus;
  title: string | null;
  scriptText: string | null;
  targetKeyword: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoTags: string[];
  factSources: string[];
  factualQaPassed: boolean;
  languageQaPassed: boolean;
  qaNotes: string | null;
  qaReviewedBy: string | null;
  qaReviewedAt: string | null;
  scriptMetadata: ScriptMetadata;
  audioPath: string | null;
  videoPath: string | null;
  thumbnailPath: string | null;
  /** Playable http(s) URLs derived server-side from the *Path filesystem fields above (served at
   * /media/...) — present only when the corresponding file actually exists on disk. Absent for
   * items with no rendered output yet, or if the file was deleted after rendering. */
  audioUrl?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  /** All generated A/B/C thumbnail candidates, in variant order. */
  thumbnailUrls?: string[];
  youtubeVideoId: string | null;
  youtubePublishAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetLibraryItem {
  id: string;
  market: AssetMarket;
  assetType: AssetType;
  filePath: string;
  timeOfDayTag: TimeOfDayTag | null;
  seasonTag: SeasonTag | null;
  settingTag: SettingTag | null;
  poseName: string | null;
  overlayRole: string | null;
  moodTag: string | null;
  aspectSafeCrop: boolean;
  createdAt: string;
}

export interface AudioLibraryItem {
  id: string;
  market: AssetMarket;
  audioType: AudioType;
  filePath: string;
  moodTag: string | null;
  segmentTypeTags: string[];
  sfxTrigger: string | null;
  durationSeconds: number;
  loopSafe: boolean;
  licenseSource: string;
  createdAt: string;
}

// --- Excel import (TICKET-003b) ---

export interface ExcelImportRowError {
  row: number;
  message: string;
}

export interface ExcelImportResult {
  successCount: number;
  errorCount: number;
  errors: ExcelImportRowError[];
  createdIds: string[];
}

// --- Review queue (TICKET-005) ---

export interface ReviewDecisionRequest {
  approved: boolean;
  edited_script?: string;
  reviewed_by?: string;
  rejection_reason?: string;
}

export interface QualityReviewRequest {
  factual_qa_passed: boolean;
  language_qa_passed: boolean;
  fact_sources: string[];
  qa_notes?: string;
  reviewed_by?: string;
}
