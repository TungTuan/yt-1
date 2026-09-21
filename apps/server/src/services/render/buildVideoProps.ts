import type { AssetLibraryItem, ContentItem } from '@prisma/client';
import { SEGMENT_TAG_COLOR, type ScriptMetadata, type TimeSlot } from '@komorebi/shared-types';
import { prisma } from '../../db';
import { selectAssets } from '../assetSelection';
import { assetUrl, optionalAssetUrl } from './mediaUrls';
import type { VoicedResult } from './ttsForContent';

// Prisma's TimeSlot enum members (SLOT_0700 ...) map to shared-types' plain '07:00' strings via
// @map() in schema.prisma — the reverse of excelImport.ts's toTimeSlotEnum().
const PRISMA_TIME_SLOT_TO_PLAIN: Record<string, TimeSlot> = {
  SLOT_0700: '07:00',
  SLOT_1000: '10:00',
  SLOT_1200: '12:00',
  SLOT_1500: '15:00',
  SLOT_1900: '19:00',
  SLOT_2100: '21:00',
};

// TICKET-009 AC: bird_chirp_intro always at t=0, chime_transition "khi tiêu đề xuất hiện" (title
// reveal, ~0.5s into TitleCard's own entrance). page_turn (bedtime_story only) placed shortly
// after, evoking a book opening — the spec doesn't pin an exact moment for it.
const CHIME_AT_SECONDS = 0.5;
const PAGE_TURN_AT_SECONDS = 2.5;
const CHANNEL_NAME = { jp: 'こもれび便り', kr: '햇살 편지' } as const;
const SCENE_SECONDS = 42;
const VISUAL_CARD_SECONDS = 6;

// Quiz scripts are written from a fixed template that always announces each question with a
// kanji ordinal — "第一問です" ... "第五問、最後の問題です" (verified across all 7 authored week-1
// scripts, 2026-09-14). Used to time the on-screen quiz card to each question's actual narration
// instead of it freezing on question 1 (see QuizOverlay.tsx).
const QUIZ_ORDINAL_KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

function findQuestionStartSeconds(
  index: number,
  captionCues: { text: string; startSeconds: number }[],
): number | null {
  const marker = `第${QUIZ_ORDINAL_KANJI[index] ?? index + 1}問`;
  const cue = captionCues.find((c) => c.text.includes(marker));
  return cue ? cue.startSeconds : null;
}

// Drives AmbientMotion.tsx (2026-09-14, "background ảnh động"): derived from whatever background
// row selectAssets actually picked, so the drift/dust motion matches the real scene instead of
// the video component having to guess. settingTag/seasonTag are technically nullable in the
// schema (only meaningful for assetType=background, per its own doc comment) — default to the
// safest no-op values ('indoor' shows dust only, no seasonal drift; 'any' also suppresses it)
// rather than throwing, since a still-plausible background shouldn't fail a render over this.
interface AnchorPoint {
  x: number;
  y: number;
}
interface PrecipitationRegion extends AnchorPoint {
  width: number;
  height: number;
  kind: 'rain' | 'snow';
}

function readAnchorPoint(value: unknown): AnchorPoint | undefined {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as Record<string, unknown>).x === 'number' &&
    typeof (value as Record<string, unknown>).y === 'number'
  ) {
    return { x: (value as { x: number }).x, y: (value as { y: number }).y };
  }
  return undefined;
}

function readPrecipitationRegion(value: unknown): PrecipitationRegion | undefined {
  const point = readAnchorPoint(value);
  if (!point) return undefined;
  const rec = value as Record<string, unknown>;
  if (typeof rec.width !== 'number' || typeof rec.height !== 'number') return undefined;
  if (rec.kind !== 'rain' && rec.kind !== 'snow') return undefined;
  return { ...point, width: rec.width, height: rec.height, kind: rec.kind };
}

function buildAmbientMotion(background: AssetLibraryItem): {
  setting: 'outdoor_porch' | 'indoor';
  season: 'spring' | 'summer' | 'autumn' | 'winter' | 'any';
  anchors?: { steam?: AnchorPoint; lampFlicker?: AnchorPoint; precipitation?: PrecipitationRegion };
} {
  const raw = background.motionAnchors as Record<string, unknown> | null;
  const steam = raw ? readAnchorPoint(raw.steam) : undefined;
  const lampFlicker = raw ? readAnchorPoint(raw.lampFlicker) : undefined;
  const precipitation = raw ? readPrecipitationRegion(raw.precipitation) : undefined;
  return {
    setting: background.settingTag ?? 'indoor',
    season: background.seasonTag ?? 'any',
    ...((steam || lampFlicker || precipitation) && { anchors: { steam, lampFlicker, precipitation } }),
  };
}

function buildVisualCues(captionCues: VoicedResult['captionCues'], durationSeconds: number) {
  const candidates = captionCues.filter((cue) => cue.text.trim().length >= 8);
  const interval = durationSeconds < 90 ? 18 : 24;
  const cues: { text: string; startSeconds: number; endSeconds: number; kind: 'quote' | 'keyword' | 'takeaway' }[] = [];
  for (let target = 8, index = 0; target < durationSeconds - 5; target += interval, index += 1) {
    const cue = candidates.find((candidate) => candidate.startSeconds >= target) ?? candidates.at(-1);
    if (!cue || cues.some((existing) => existing.text === cue.text)) continue;
    const text = cue.text.replace(/\s+/g, ' ').trim();
    cues.push({
      text: text.length > 58 ? `${text.slice(0, 57)}…` : text,
      startSeconds: cue.startSeconds,
      endSeconds: Math.min(cue.startSeconds + VISUAL_CARD_SECONDS, cue.endSeconds + 3, durationSeconds),
      kind: index % 3 === 2 ? 'takeaway' : index % 3 === 1 ? 'keyword' : 'quote',
    });
  }
  return cues;
}

interface SfxAsset {
  sfxTrigger: string | null;
  filePath: string;
}

/** Only returns a cue when the file actually exists on disk — real SFX audio isn't delivered yet
 * (TICKET-006b, still manual/pending), so a render must not fail over a missing placeholder row. */
function buildSfxCue(sfxByTrigger: Map<string | null, SfxAsset>, trigger: string, timestampSeconds: number) {
  const asset = sfxByTrigger.get(trigger);
  if (!asset) return undefined;
  const src = optionalAssetUrl(asset.filePath);
  if (!src) return undefined;
  return { trigger, src, timestampSeconds };
}

export async function buildLongFormProps(item: ContentItem, voiced: VoicedResult) {
  const assets = await selectAssets({
    market: item.market,
    segmentType: item.segmentType,
    format: 'long_form',
    scheduledDate: item.scheduledDate,
    timeSlot: PRISMA_TIME_SLOT_TO_PLAIN[item.timeSlot],
  });

  if (!assets.background) throw new Error(`No background asset available for content_item ${item.id}`);
  if (!assets.mascotPose) throw new Error(`No mascot_pose asset available for content_item ${item.id}`);

  const metadata = (item.scriptMetadata as ScriptMetadata) ?? {};
  const sfxByTrigger = new Map(assets.sfx.map((s) => [s.sfxTrigger, s]));

  // Long calm formats get a supporting scene roughly every 42 seconds. Reuse only matching
  // market/time/season assets and dissolve between them; short formats keep one stable scene.
  const sceneCount = ['nostalgia', 'bedtime_story', 'letter_reading', 'companionship'].includes(item.segmentType)
    ? Math.min(6, Math.max(1, Math.ceil(voiced.durationSeconds / SCENE_SECONDS)))
    : 1;
  const sceneCandidates = await prisma.assetLibraryItem.findMany({
    where: {
      assetType: 'background',
      market: { in: [item.market, 'shared'] },
      OR: [{ timeOfDayTag: assets.background.timeOfDayTag }, { timeOfDayTag: 'any' }],
      AND: [{ OR: [{ seasonTag: assets.background.seasonTag }, { seasonTag: 'any' }] }],
    },
    orderBy: { id: 'asc' },
    take: sceneCount,
  });
  const orderedScenes = [assets.background, ...sceneCandidates.filter((candidate) => candidate.id !== assets.background!.id)]
    .slice(0, sceneCount)
    .map((background, index) => ({
      src: assetUrl(background.filePath),
      startSeconds: index * SCENE_SECONDS,
      ambientMotion: buildAmbientMotion(background),
    }));

  const mascotCandidates = await prisma.assetLibraryItem.findMany({
    where: { assetType: 'mascot_pose', market: { in: [item.market, 'shared'] } },
    orderBy: { poseName: 'asc' },
  });
  const uniqueMascots = [...new Map(mascotCandidates.map((pose) => [pose.poseName, pose])).values()];
  const mascotCues = Array.from({ length: Math.max(1, Math.ceil(voiced.durationSeconds / SCENE_SECONDS)) }, (_, index) => ({
    src: assetUrl((uniqueMascots[index % uniqueMascots.length] ?? assets.mascotPose!).filePath),
    startSeconds: index * SCENE_SECONDS,
  }));

  const sfxCues = [
    buildSfxCue(sfxByTrigger, 'bird_chirp_intro', 0),
    buildSfxCue(sfxByTrigger, 'chime_transition', CHIME_AT_SECONDS),
    item.segmentType === 'bedtime_story' ? buildSfxCue(sfxByTrigger, 'page_turn', PAGE_TURN_AT_SECONDS) : undefined,
  ].filter((c): c is { trigger: string; src: string; timestampSeconds: number } => Boolean(c));

  let overlay;
  if (item.segmentType === 'quiz' && assets.overlayCard && metadata.questions && metadata.questions.length > 0) {
    const questions = metadata.questions;
    const starts = questions.map((_, i) => findQuestionStartSeconds(i, voiced.captionCues));
    // Fallback for any question whose "第N問" marker wasn't found in a caption cue (script
    // deviated from the template): spread the remaining duration evenly rather than losing the
    // per-question timing feature entirely for the rest of the video.
    const resolvedStarts = starts.map(
      (s, i) => s ?? (voiced.durationSeconds * i) / questions.length,
    );
    const cues = questions.map((q, i) => {
      const endSeconds = i + 1 < questions.length ? resolvedStarts[i + 1] : voiced.durationSeconds;
      const answerCue = voiced.captionCues.find(
        (cue) => cue.startSeconds >= resolvedStarts[i] && cue.startSeconds < endSeconds && cue.text.includes('正解は'),
      );
      return {
        questionText: q.question,
        choices: q.choices,
        answer: q.answer,
        funFact: q.fun_fact,
        questionIndex: i + 1,
        questionTotal: questions.length,
        startSeconds: resolvedStarts[i],
        answerStartSeconds: answerCue?.startSeconds ?? resolvedStarts[i] + (endSeconds - resolvedStarts[i]) * 0.35,
        endSeconds,
      };
    });
    overlay = {
      cardSrc: assetUrl(assets.overlayCard.card.filePath),
      badgeSrc: assetUrl(assets.overlayCard.badge.filePath),
      cues,
    };
  }

  return {
    title: item.title ?? '',
    channelName: CHANNEL_NAME[item.market],
    segmentType: item.segmentType,
    tagColor: SEGMENT_TAG_COLOR[item.segmentType],
    audioSrc: voiced.audioUrl,
    captionCues: voiced.captionCues,
    backgroundSrc: assetUrl(assets.background.filePath),
    backgroundScenes: orderedScenes,
    mascotPoseSrc: assetUrl(assets.mascotPose.filePath),
    mascotCues,
    visualCues: buildVisualCues(voiced.captionCues, voiced.durationSeconds),
    overlay,
    ambientMotion: buildAmbientMotion(assets.background),
    bgmSrc: assets.bgm ? optionalAssetUrl(assets.bgm.filePath) : undefined,
    sfxCues,
    durationInSeconds: voiced.durationSeconds,
  };
}

export async function buildShortsProps(parent: ContentItem, shorts: ContentItem, voiced: VoicedResult) {
  const assets = await selectAssets({
    market: shorts.market,
    segmentType: shorts.segmentType,
    format: 'shorts',
    scheduledDate: shorts.scheduledDate,
    timeSlot: PRISMA_TIME_SLOT_TO_PLAIN[shorts.timeSlot],
  });

  if (!assets.background) throw new Error(`No aspect-safe background available for Shorts ${shorts.id}`);

  // TICKET-009b AC: opening frame always uses wing_flap, regardless of segment_type — a dedicated
  // lookup rather than assetSelection's per-segment SEGMENT_TO_POSE mapping.
  const wingFlapPose =
    (await prisma.assetLibraryItem.findFirst({
      where: { assetType: 'mascot_pose', market: shorts.market, poseName: 'wing_flap' },
    })) ??
    (await prisma.assetLibraryItem.findFirst({
      where: { assetType: 'mascot_pose', market: 'shared', poseName: 'wing_flap' },
    }));
  if (!wingFlapPose) throw new Error('No wing_flap mascot_pose asset found for Shorts opening frame');

  const sfxByTrigger = new Map(assets.sfx.map((s) => [s.sfxTrigger, s]));

  return {
    title: parent.title ?? '',
    channelName: CHANNEL_NAME[shorts.market],
    tagColor: SEGMENT_TAG_COLOR[shorts.segmentType],
    audioSrc: voiced.audioUrl,
    captionCues: voiced.captionCues,
    backgroundSrc: assetUrl(assets.background.filePath),
    mascotPoseSrc: assetUrl(wingFlapPose.filePath),
    ambientMotion: buildAmbientMotion(assets.background),
    bgmSrc: assets.bgm ? optionalAssetUrl(assets.bgm.filePath) : undefined,
    sfxCues: [buildSfxCue(sfxByTrigger, 'bird_chirp_intro', 0)].filter(
      (c): c is { trigger: string; src: string; timestampSeconds: number } => Boolean(c),
    ),
    durationInSeconds: voiced.durationSeconds,
  };
}
