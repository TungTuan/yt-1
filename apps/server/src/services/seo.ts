import fs from 'fs';
import path from 'path';
import type { Market, SegmentType } from '@komorebi/shared-types';

/** TICKET-004b — target_keyword pool, managed by hand in config/seo-keywords.json. */
const seoKeywordsPath = path.resolve(
  process.env.SEO_KEYWORDS_PATH ?? path.join(__dirname, '..', '..', 'config', 'seo-keywords.json'),
);

type KeywordTable = Record<Market, Partial<Record<SegmentType, string[]>>>;

let keywordTable: KeywordTable = { jp: {}, kr: {} };
try {
  const raw = JSON.parse(fs.readFileSync(seoKeywordsPath, 'utf-8'));
  keywordTable = { jp: raw.jp ?? {}, kr: raw.kr ?? {} };
} catch (err) {
  console.warn(`[seo] Could not load seo-keywords.json from ${seoKeywordsPath}:`, err);
}

/**
 * Picks the target_keyword for a market+segment_type, rotating through the configured options
 * and avoiding an exact repeat of `avoid` (typically yesterday's pick) when more than one choice
 * exists (TICKET-004b AC).
 */
export function pickTargetKeyword(
  market: Market,
  segmentType: SegmentType,
  opts: { avoid?: string; dayIndex?: number } = {},
): string {
  const options = keywordTable[market][segmentType] ?? [];
  if (options.length === 0) return '';
  if (options.length === 1) return options[0];

  const candidates = opts.avoid ? options.filter((k) => k !== opts.avoid) : options;
  const pool = candidates.length > 0 ? candidates : options;
  const dayIndex = opts.dayIndex ?? Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  return pool[dayIndex % pool.length];
}

/**
 * Heuristic check that seo_title contains target_keyword "in the first ~5 words" (TICKET-004b AC).
 * kr has whitespace-delimited words so we check the actual first 5 tokens; jp/kr compounds don't
 * segment reliably without a real tokenizer, so for jp we approximate "first ~5 words" as the
 * first 20 characters of the title — documented simplification, not a linguistic word count.
 */
export function validateSeoTitle(market: Market, seoTitle: string, targetKeyword: string): boolean {
  if (!targetKeyword || !seoTitle) return true;
  if (market === 'kr') {
    const firstFiveWords = seoTitle.trim().split(/\s+/).slice(0, 5).join(' ');
    return firstFiveWords.includes(targetKeyword);
  }
  return seoTitle.slice(0, 20).includes(targetKeyword);
}

export function buildFallbackSeo(input: {
  market: Market;
  segmentType: SegmentType;
  title: string;
  scriptText: string;
  tags: string[];
  targetKeyword?: string;
  dayIndex?: number;
}) {
  const targetKeyword = input.targetKeyword || pickTargetKeyword(input.market, input.segmentType, { dayIndex: input.dayIndex });
  const rawTitle = targetKeyword && !input.title.includes(targetKeyword)
    ? `${targetKeyword}｜${input.title}`
    : input.title;
  const seoTitle = rawTitle.slice(0, 60);
  const summary = input.scriptText.replace(/\[PAUSE\]/g, ' ').replace(/\s+/g, ' ').trim();
  const seoDescription = `${targetKeyword ? `${targetKeyword}。` : ''}${input.title}について、こまちと一緒にゆっくりお届けします。\n\n${summary.slice(0, 260)}`;
  const seoTags = Array.from(new Set([targetKeyword, ...input.tags])).filter(Boolean).slice(0, 8) as string[];
  return { targetKeyword: targetKeyword || null, seoTitle, seoDescription, seoTags };
}

export function appendQuizTimestamps(
  description: string,
  cues: Array<{ text: string; startSeconds: number }>,
): string {
  const markers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const rows = markers
    .map((marker, index) => {
      const cue = cues.find((item) => item.text.includes(`第${marker}問`));
      if (!cue) return null;
      const total = Math.max(0, Math.floor(cue.startSeconds));
      const minutes = Math.floor(total / 60);
      const seconds = String(total % 60).padStart(2, '0');
      return `${minutes}:${seconds} 第${marker}問`;
    })
    .filter((row): row is string => Boolean(row));
  if (rows.length === 0) return description;
  const clean = description.replace(/\n\n【問題タイムスタンプ】[\s\S]*$/, '');
  return `${clean}\n\n【問題タイムスタンプ】\n${rows.join('\n')}`;
}
