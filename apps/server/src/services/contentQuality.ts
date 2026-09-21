import type { Market } from '@komorebi/shared-types';

const RISKY_CLAIM_PATTERNS: Record<Market, RegExp[]> = {
  jp: [
    /(?:認知症|病気|うつ|不眠)(?:を|が).{0,12}(?:予防|治療|治る|改善します|防ぎます)/,
    /必ず.{0,16}(?:効く|治る|改善)/,
    /医師に相談(?:せず|しなくても)/,
  ],
  kr: [
    /(?:치매|질병|우울증|불면증).{0,12}(?:예방|치료|낫습니다|개선합니다)/,
    /반드시.{0,16}(?:효과|낫|개선)/,
    /의사와 상담하지 않아도/,
  ],
};

/** Returns a review warning for deterministic medical/health claims; null for ordinary copy. */
export function findRiskyClaim(market: Market, text: string): string | null {
  const matched = RISKY_CLAIM_PATTERNS[market].find((pattern) => pattern.test(text));
  if (!matched) return null;
  return 'Potential medical/health claim detected. Verify a reliable source and rewrite as non-guaranteed general information before approval.';
}
