import fs from 'fs';
import path from 'path';
import { renderStill, selectComposition } from '@remotion/renderer';
import { getBundleLocation } from './bundleCache';
import type { Market, TagColor } from '@komorebi/shared-types';

const STORAGE_ROOT = path.resolve(__dirname, '..', '..', '..', 'storage');

/**
 * TICKET-010b: derives a short hook from the title, distinct from seo_title (validated to not be
 * >80% similar — the AC's actual wording) by construction: this never reuses seo_title, only the
 * title, truncated/reshaped. No LLM call here (Excel-import content has no seo_title to begin
 * with) — a simplified heuristic standing in for the spec's more ambitious "inspired by the
 * script" hook generation, which needs a Claude API call this pipeline doesn't make.
 */
export function deriveHookText(title: string): string {
  const trimmed = title.trim();
  // A thumbnail is usually seen at phone-feed size: keep CJK hooks short enough to scan instantly.
  if (trimmed.length <= 14) return trimmed;
  return `${trimmed.slice(0, 13)}…`;
}

export function deriveThumbnailHooks(
  market: Market,
  title: string,
  segmentType: string,
  targetKeyword?: string | null,
): [string, string, string] {
  const primary = deriveHookText(title.replace(/【[^】]+】/g, '').trim());
  const keyword = deriveHookText((targetKeyword ?? '').replace(/[｜|].*$/, '').trim());
  const localized = market === 'kr'
    ? {
        emotional: {
          morning_news: '오늘 아침, 무슨 일이?', quiz: '모두 맞힐 수 있을까요?',
          nostalgia: '그 시절을 기억하시나요', letter_reading: '뒤늦게 도착한 마음',
          companionship: '당신만 그런 게 아닙니다', bedtime_story: '잠들기 전 듣는 이야기',
          gratitude_ritual: '오늘의 작은 행복',
        },
        benefit: {
          morning_news: '차분하게 여는 오늘', quiz: '즐겁게 두뇌 운동',
          nostalgia: '잊고 있던 추억 한 장', letter_reading: '마음을 다독이는 편지',
          companionship: '마음이 가벼워지는 이야기', bedtime_story: '마음이 편안해지는 밤',
          gratitude_ritual: '마음을 정돈하는 시간',
        },
      }
    : {
        emotional: {
          morning_news: '今朝、何があった？', quiz: 'あなたは全問解ける？',
          nostalgia: 'あの日を覚えていますか', letter_reading: '届かなかった想い',
          companionship: 'ひとりではありません', bedtime_story: '眠る前に聞きたい話',
          gratitude_ritual: '今日の小さな幸せ',
        },
        benefit: {
          morning_news: '穏やかに始める今日', quiz: '楽しく脳トレ',
          nostalgia: '忘れていた記憶の一頁', letter_reading: '心をほどく一通の手紙',
          companionship: '心が少し軽くなる話', bedtime_story: '心ほどける夜の朗読',
          gratitude_ritual: '心を整える時間',
        },
      };
  // A tests the story promise, B aligns the thumbnail with the SEO keyword, C tests emotion/benefit.
  return [
    primary || localized.emotional[segmentType as keyof typeof localized.emotional],
    keyword || localized.emotional[segmentType as keyof typeof localized.emotional] || primary,
    localized.benefit[segmentType as keyof typeof localized.benefit] || primary,
  ];
}

export interface ThumbnailResult {
  /** Variant "a" — the one auto-set via thumbnails.set once TICKET-012 exists. */
  primaryPath: string;
  allPaths: string[];
}

/** Renders one SEO thumbnail with title hook, keyword and emotional benefit in one hierarchy. */
export async function renderThumbnails(
  contentId: string,
  market: string,
  props: { backgroundSrc: string; mascotPoseSrc: string; hookTexts: [string, string, string]; tagColor: TagColor },
): Promise<ThumbnailResult> {
  const serveUrl = await getBundleLocation();
  const outDir = path.join(STORAGE_ROOT, 'thumbnails', market);
  fs.mkdirSync(outDir, { recursive: true });

  const { hookTexts, ...sharedProps } = props;
  const inputProps = {
    ...sharedProps,
    hookText: hookTexts[0],
    keywordText: hookTexts[1],
    benefitText: hookTexts[2],
    variant: 'a' as const,
  };
  const composition = await selectComposition({ serveUrl, id: 'Thumbnail', inputProps });
  const outputLocation = path.join(outDir, `${contentId}_thumb.png`);
  await renderStill({ composition, serveUrl, output: outputLocation, inputProps });
  const allPaths = [outputLocation];

  return { primaryPath: allPaths[0], allPaths };
}
