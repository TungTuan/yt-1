import fs from 'fs';
import path from 'path';
import type { Market } from '@komorebi/shared-types';

/**
 * 'excel' = content_items are created only via Excel import (TICKET-003b);
 * the orchestrator (TICKET-014) never calls Claude API to create content.
 * 'api'   = orchestrator calls Claude API directly (TICKET-003/004) — not implemented yet in this MVP.
 */
export type ContentSourceMode = 'excel' | 'api';

export const CONTENT_SOURCE_MODE: ContentSourceMode =
  (process.env.CONTENT_SOURCE_MODE as ContentSourceMode) ?? 'excel';

export const SERVER_PORT = Number(process.env.SERVER_PORT ?? 4000);

const crisisKeywordsPath = path.resolve(
  process.env.CRISIS_KEYWORDS_PATH ?? path.join(__dirname, '..', 'config', 'crisis-keywords.json'),
);

let crisisKeywordsByMarket: Record<Market, string[]> = { jp: [], kr: [] };

try {
  const raw = JSON.parse(fs.readFileSync(crisisKeywordsPath, 'utf-8'));
  crisisKeywordsByMarket = { jp: raw.jp ?? [], kr: raw.kr ?? [] };
} catch (err) {
  console.warn(`[config] Could not load crisis-keywords.json from ${crisisKeywordsPath}:`, err);
}

/** TICKET-005 safeguard: does this script contain a configured crisis-warning keyword? */
export function containsCrisisKeyword(market: Market, text: string | null | undefined): boolean {
  if (!text) return false;
  return crisisKeywordsByMarket[market].some((keyword) => text.includes(keyword));
}
