import type { SegmentType } from '@komorebi/shared-types';

export interface DurationTarget {
  minSeconds: number;
  maxSeconds: number;
  /** false = provisional guess, not yet confirmed by content ops — still enforced, but flag it as such in messages. */
  confirmed: boolean;
}

/**
 * Target spoken-duration range per segment_type. quiz/nostalgia/bedtime_story/morning_news are
 * confirmed by content ops (2026-09-13 review of the week-1 batch). letter_reading/companionship
 * are provisional — scaled proportionally from the original spec's word-count ranges pending
 * confirmation; gratitude_ritual has no separate target since its script is merged into
 * morning_news's (§4.7 "gộp vào 7:00").
 */
export const DURATION_TARGETS: Partial<Record<SegmentType, DurationTarget>> = {
  morning_news: { minSeconds: 120, maxSeconds: 180, confirmed: true }, // 2-3 min
  quiz: { minSeconds: 240, maxSeconds: 300, confirmed: true }, // 4-5 min
  nostalgia: { minSeconds: 480, maxSeconds: 600, confirmed: true }, // 8-10 min
  bedtime_story: { minSeconds: 1680, maxSeconds: 1920, confirmed: true }, // 28-32 min
  letter_reading: { minSeconds: 180, maxSeconds: 240, confirmed: false }, // provisional: 3-4 min
  companionship: { minSeconds: 300, maxSeconds: 360, confirmed: false }, // provisional: 5-6 min
};

export interface DurationCheckResult {
  ok: boolean;
  target: DurationTarget | null;
  message: string | null;
}

/**
 * Checks a synthesized audio duration against its segment_type's target. Only flags "too short"
 * — running long isn't the failure mode we care about here, and VOICEVOX/Typecast output length
 * is otherwise a direct function of script_text length, which content ops controls.
 */
export function checkDuration(segmentType: SegmentType, durationSeconds: number): DurationCheckResult {
  const target = DURATION_TARGETS[segmentType];
  if (!target) return { ok: true, target: null, message: null };

  if (durationSeconds >= target.minSeconds) {
    return { ok: true, target, message: null };
  }

  const pctOfMin = Math.round((durationSeconds / target.minSeconds) * 100);
  const provisionalNote = target.confirmed ? '' : ' (target tạm thời, chưa xác nhận)';
  return {
    ok: false,
    target,
    message:
      `Audio dài ${durationSeconds.toFixed(1)}s, chỉ đạt ${pctOfMin}% mức tối thiểu ${target.minSeconds}s ` +
      `(${Math.round(target.minSeconds / 60)}-${Math.round(target.maxSeconds / 60)} phút)${provisionalNote} ` +
      `cho segment_type=${segmentType} — script_text cần viết dài/đầy đủ hơn.`,
  };
}
