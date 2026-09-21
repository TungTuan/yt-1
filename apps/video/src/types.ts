import { z } from 'zod';
import { SEGMENT_TAG_COLOR, type TagColor } from '@komorebi/shared-types';

export type { TagColor };
export { SEGMENT_TAG_COLOR };
const tagColorSchema = z.enum(['amber', 'sage', 'indigo']);

const captionCueSchema = z.object({
  text: z.string(),
  startSeconds: z.number(),
  endSeconds: z.number(),
});
export type CaptionCue = z.infer<typeof captionCueSchema>;

const sfxCueSchema = z.object({
  trigger: z.string(),
  src: z.string(),
  timestampSeconds: z.number(),
});
export type SfxCue = z.infer<typeof sfxCueSchema>;

const quizOverlayCueSchema = z.object({
  questionText: z.string(),
  choices: z.array(z.string()),
  answer: z.string(),
  funFact: z.string().optional(),
  questionIndex: z.number(),
  questionTotal: z.number(),
  startSeconds: z.number(),
  answerStartSeconds: z.number(),
  endSeconds: z.number(),
});
export type QuizOverlayCue = z.infer<typeof quizOverlayCueSchema>;

const quizOverlaySchema = z.object({
  cardSrc: z.string(),
  badgeSrc: z.string(),
  // One timed cue per question so the on-screen card advances in step with the narration, instead
  // of freezing on question 1 for the whole video (found 2026-09-14: audio narrated all 5 Q&A but
  // the card never moved past Q1/5).
  cues: z.array(quizOverlayCueSchema),
});
export type QuizOverlayProps = z.infer<typeof quizOverlaySchema>;

// Drives AmbientMotion.tsx — layered procedural motion (dust motes always; seasonal leaves/petals/
// snow drifting in for outdoor_porch scenes) so a static background doesn't feel frozen even
// between Ken Burns cycles (user request 2026-09-14: "background ảnh động sẽ cải thiện nhiều").
// Deliberately code-only (no new art assets): derived server-side from the asset_library row
// actually picked for this render (settingTag/seasonTag), not guessed from the video component.
const anchorPointSchema = z.object({ x: z.number(), y: z.number() }); // % of frame
// % of frame; kind picks rain streaks vs drifting snow within the same region shape.
const precipitationRegionSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  kind: z.enum(['rain', 'snow']),
});
// Object-anchored effects (steam off a painted teacup, a lit lamp's flicker, rain/snow confined to
// a visible window/garden region) — only present when the actually-selected background has that
// hotspot recorded in asset_library.motionAnchors (user requests 2026-09-14: "cốc trà bốc khói,
// đèn lập lờ", then "thêm khói, mưa rơi ... dựa vào background"). Absent key = skip that effect
// rather than guess a position and render it somewhere wrong.
const motionAnchorsSchema = z.object({
  steam: anchorPointSchema.optional(),
  lampFlicker: anchorPointSchema.optional(),
  precipitation: precipitationRegionSchema.optional(),
});
export type AnchorPoint = z.infer<typeof anchorPointSchema>;
export type PrecipitationRegion = z.infer<typeof precipitationRegionSchema>;

const ambientMotionSchema = z.object({
  setting: z.enum(['outdoor_porch', 'indoor']),
  season: z.enum(['spring', 'summer', 'autumn', 'winter', 'any']),
  anchors: motionAnchorsSchema.optional(),
});
export type AmbientMotionProps = z.infer<typeof ambientMotionSchema>;

const visualCueSchema = z.object({
  text: z.string(),
  startSeconds: z.number(),
  endSeconds: z.number(),
  kind: z.enum(['quote', 'keyword', 'takeaway']),
});
export type VisualCue = z.infer<typeof visualCueSchema>;

const mascotCueSchema = z.object({
  src: z.string(),
  startSeconds: z.number(),
});
export type MascotCue = z.infer<typeof mascotCueSchema>;

const backgroundSceneSchema = z.object({
  src: z.string(),
  startSeconds: z.number(),
  ambientMotion: ambientMotionSchema.optional(),
});

const segmentTypeSchema = z.enum([
  'morning_news',
  'nostalgia',
  'letter_reading',
  'quiz',
  'bedtime_story',
  'companionship',
  'gratitude_ritual',
]);

export const longFormVideoSchema = z.object({
  title: z.string(),
  channelName: z.string(),
  segmentType: segmentTypeSchema,
  tagColor: tagColorSchema,
  audioSrc: z.string(),
  captionCues: z.array(captionCueSchema),
  backgroundSrc: z.string(),
  backgroundScenes: z.array(backgroundSceneSchema).optional(),
  mascotPoseSrc: z.string(),
  mascotCues: z.array(mascotCueSchema).optional(),
  visualCues: z.array(visualCueSchema).optional(),
  overlay: quizOverlaySchema.optional(),
  ambientMotion: ambientMotionSchema,
  bgmSrc: z.string().optional(),
  sfxCues: z.array(sfxCueSchema),
  durationInSeconds: z.number(),
});
export type LongFormVideoProps = z.infer<typeof longFormVideoSchema>;

export const shortsVideoSchema = z.object({
  title: z.string(),
  channelName: z.string(),
  tagColor: tagColorSchema,
  audioSrc: z.string(),
  captionCues: z.array(captionCueSchema),
  backgroundSrc: z.string(),
  mascotPoseSrc: z.string(),
  ambientMotion: ambientMotionSchema,
  bgmSrc: z.string().optional(),
  sfxCues: z.array(sfxCueSchema),
  durationInSeconds: z.number(),
});
export type ShortsVideoProps = z.infer<typeof shortsVideoSchema>;

export const thumbnailStillSchema = z.object({
  backgroundSrc: z.string(),
  mascotPoseSrc: z.string(),
  hookText: z.string(),
  keywordText: z.string().optional(),
  benefitText: z.string().optional(),
  tagColor: tagColorSchema,
  variant: z.enum(['a', 'b', 'c']).optional(),
});
export type ThumbnailStillProps = z.infer<typeof thumbnailStillSchema>;

export const FPS = 30;
/** Keep a short branded close without leaving viewers in a long silent tail. */
export const LONG_FORM_END_PADDING_SECONDS = 3;
/** Shorts only need a brief branded closing beat and must remain under 30 seconds where possible. */
export const SHORTS_END_PADDING_SECONDS = 2;
