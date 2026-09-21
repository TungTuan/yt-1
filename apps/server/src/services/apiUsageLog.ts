import { prisma } from '../db';
import type { Market, SegmentType } from '@komorebi/shared-types';

export interface ApiUsageEntry {
  market: Market;
  segmentType: SegmentType;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}

/** TICKET-003 AC: log token usage per call, tracked separately per market for cost comparison. */
export async function logApiUsage(entry: ApiUsageEntry): Promise<void> {
  console.log(
    `[claude] market=${entry.market} segment=${entry.segmentType} model=${entry.model} ` +
      `in=${entry.inputTokens} out=${entry.outputTokens} cache_read=${entry.cacheReadTokens ?? 0} ` +
      `cache_write=${entry.cacheCreationTokens ?? 0}`,
  );
  try {
    await prisma.apiUsageLog.create({
      data: {
        market: entry.market,
        segmentType: entry.segmentType,
        model: entry.model,
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        cacheReadTokens: entry.cacheReadTokens ?? 0,
        cacheCreationTokens: entry.cacheCreationTokens ?? 0,
      },
    });
  } catch (err) {
    // Never let usage logging break content generation.
    console.warn('[claude] failed to persist api_usage_logs row:', err);
  }
}
