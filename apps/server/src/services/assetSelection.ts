import { prisma } from '../db';
// Prisma's own generated types (Date fields, not the wire-format ISO-string shape in
// @komorebi/shared-types) — this service runs entirely server-side against Prisma results.
import type { AssetLibraryItem, AudioLibraryItem } from '@prisma/client';
import type { ContentFormat, Market, SeasonTag, SegmentType, TimeOfDayTag, TimeSlot } from '@komorebi/shared-types';

/**
 * Fixed segment_type -> mascot pose mapping (TICKET-008 AC: "mapping cố định theo segment_type").
 * The spec lists the 8 available poses but doesn't hand down this exact table — this is a
 * reasonable default pending real creative direction from TICKET-007. `wing_flap` is deliberately
 * excluded here: TICKET-009b reserves it for the Shorts opening frame specifically, not a
 * long-form segment's mascot.
 */
const SEGMENT_TO_POSE: Record<SegmentType, string> = {
  morning_news: 'standing',
  nostalgia: 'looking_down',
  letter_reading: 'looking_down',
  quiz: 'tilt_head',
  bedtime_story: 'sleeping',
  companionship: 'puffed_up',
  gratitude_ritual: 'preening',
};

/**
 * Soft preference for indoor vs. porch-view backgrounds, applied only when both are available
 * among the time/season-matched candidates — an intimate segment reading better indoors, an
 * outward-looking one reading better on the porch. Not a spec AC; added after reviewing the real
 * TICKET-007 delivery, which mixes indoor and outdoor_porch shots with equal time/season tags.
 */
const SEGMENT_SETTING_PREFERENCE: Partial<Record<SegmentType, 'indoor' | 'outdoor_porch'>> = {
  bedtime_story: 'indoor',
  letter_reading: 'indoor',
  companionship: 'indoor',
};

const TIME_SLOT_TO_TIME_OF_DAY: Record<TimeSlot, TimeOfDayTag> = {
  '07:00': 'morning',
  '10:00': 'morning',
  '12:00': 'afternoon',
  '15:00': 'afternoon',
  '19:00': 'evening',
  '21:00': 'night',
};

export function seasonForDate(date: Date): SeasonTag {
  const month = date.getUTCMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export interface SelectAssetsInput {
  market: Market;
  segmentType: SegmentType;
  format: ContentFormat;
  scheduledDate: Date;
  timeSlot: TimeSlot;
  /** Background asset id used the previous day for this market+segment — avoid repeating it. */
  avoidBackgroundId?: string;
}

export interface SelectedAssets {
  background: AssetLibraryItem | null;
  mascotPose: AssetLibraryItem | null;
  overlayCard: { card: AssetLibraryItem; badge: AssetLibraryItem } | null;
  bgm: AudioLibraryItem | null;
  sfx: AudioLibraryItem[];
}

/**
 * TICKET-008: picks background/mascot_pose/overlay_card + BGM/SFX for one content_item.
 * All AC filters (market: shared-or-own; Shorts must use aspect_safe_crop backgrounds; BGM is
 * always market-specific while SFX/mascot/overlay are always shared) are enforced here.
 */
export async function selectAssets(input: SelectAssetsInput): Promise<SelectedAssets> {
  const { market, segmentType, format, scheduledDate, timeSlot } = input;
  const timeOfDay = TIME_SLOT_TO_TIME_OF_DAY[timeSlot];
  const season = seasonForDate(scheduledDate);

  let backgroundCandidates = await prisma.assetLibraryItem.findMany({
    where: {
      assetType: 'background',
      market: { in: [market, 'shared'] },
      OR: [{ timeOfDayTag: timeOfDay }, { timeOfDayTag: 'any' }],
      AND: [{ OR: [{ seasonTag: season }, { seasonTag: 'any' }] }],
      ...(format === 'shorts' ? { aspectSafeCrop: true } : {}),
    },
  });
  // Some market libraries intentionally ship one representative image per time of day rather
  // than every time × season combination. Keep the intended time-of-day mood before falling back
  // to a season-only or any available market background, so thumbnail/video generation never
  // fails merely because that exact matrix cell is absent.
  if (backgroundCandidates.length === 0) {
    backgroundCandidates = await prisma.assetLibraryItem.findMany({
      where: {
        assetType: 'background',
        market: { in: [market, 'shared'] },
        OR: [{ timeOfDayTag: timeOfDay }, { timeOfDayTag: 'any' }],
        ...(format === 'shorts' ? { aspectSafeCrop: true } : {}),
      },
    });
  }
  if (backgroundCandidates.length === 0) {
    backgroundCandidates = await prisma.assetLibraryItem.findMany({
      where: {
        assetType: 'background',
        market: { in: [market, 'shared'] },
        OR: [{ seasonTag: season }, { seasonTag: 'any' }],
        ...(format === 'shorts' ? { aspectSafeCrop: true } : {}),
      },
    });
  }
  if (backgroundCandidates.length === 0) {
    backgroundCandidates = await prisma.assetLibraryItem.findMany({
      where: {
        assetType: 'background',
        market: { in: [market, 'shared'] },
        ...(format === 'shorts' ? { aspectSafeCrop: true } : {}),
      },
    });
  }
  const preferredSetting = SEGMENT_SETTING_PREFERENCE[segmentType];
  const preferredCandidates = preferredSetting
    ? backgroundCandidates.filter((c) => c.settingTag === preferredSetting)
    : [];
  const background = pickRoundRobin(
    preferredCandidates.length > 0 ? preferredCandidates : backgroundCandidates,
    input.avoidBackgroundId,
    scheduledDate,
  );

  const poseName = SEGMENT_TO_POSE[segmentType];
  const mascotPose =
    (await prisma.assetLibraryItem.findFirst({
      where: { assetType: 'mascot_pose', market, poseName },
    })) ??
    (await prisma.assetLibraryItem.findFirst({
      where: { assetType: 'mascot_pose', market: 'shared', poseName },
    }));

  let overlayCard: SelectedAssets['overlayCard'] = null;
  if (segmentType === 'quiz') {
    const [card, badge] = await Promise.all([
      prisma.assetLibraryItem.findFirst({
        where: { assetType: 'overlay_card', market: 'shared', overlayRole: 'quiz_card' },
      }),
      prisma.assetLibraryItem.findFirst({
        where: { assetType: 'overlay_card', market: 'shared', overlayRole: 'qmark_badge' },
      }),
    ]);
    if (card && badge) overlayCard = { card, badge };
  }

  const taggedBgm = await prisma.audioLibraryItem.findMany({
    where: { audioType: 'bgm', market, segmentTypeTags: { has: segmentType } },
  });
  const anyBgm = taggedBgm.length > 0 ? taggedBgm : await prisma.audioLibraryItem.findMany({ where: { audioType: 'bgm', market } });
  const bgm = pickRoundRobin(anyBgm, undefined, scheduledDate);

  // TICKET-009 AC: every long-form item always gets bird_chirp_intro (t=0) + chime_transition
  // (on title reveal); bedtime_story additionally gets page_turn. Exact on-screen timestamps are
  // a Remotion composition concern (TICKET-009), not this service's.
  const sfxTriggers = ['bird_chirp_intro', 'chime_transition', ...(segmentType === 'bedtime_story' ? ['page_turn'] : [])];
  const sfx = await prisma.audioLibraryItem.findMany({
    where: { audioType: 'sfx', market: 'shared', sfxTrigger: { in: sfxTriggers } },
  });

  return { background, mascotPose, overlayCard, bgm, sfx };
}

/** Deterministic day-indexed rotation, skipping `avoidId` when more than one candidate exists. */
function pickRoundRobin<T extends { id: string }>(candidates: T[], avoidId: string | undefined, date: Date): T | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const pool = avoidId ? candidates.filter((c) => c.id !== avoidId) : candidates;
  const usable = pool.length > 0 ? pool : candidates;
  const dayIndex = Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
  return usable[dayIndex % usable.length];
}
