import Anthropic from '@anthropic-ai/sdk';
import { ZodError } from 'zod';
import { REVIEW_REQUIRED_SEGMENT_TYPES, type Market, type SegmentType } from '@komorebi/shared-types';
import { getPromptModule, type PromptContext } from '../prompts';
import { pickTargetKeyword, validateSeoTitle } from './seo';
import { logApiUsage } from './apiUsageLog';

// Model IDs per environment — Sonnet 5 for emotionally-deep formats, Haiku 4.5 for quiz/gratitude
// (spec "Ghi chú triển khai chung": Haiku cho quiz/gratitude_ritual, Sonnet cho các định dạng còn lại).
const MODEL_IDS = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-5',
} as const;

// Segment types that must always ship seo_title/description/tags with strict validation (TICKET-004b).
const STRICT_SEO_SEGMENTS: SegmentType[] = [
  'nostalgia',
  'letter_reading',
  'quiz',
  'bedtime_story',
  'companionship',
];

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. Only used when CONTENT_SOURCE_MODE=api (TICKET-003).',
      );
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export interface GenerateContentOptions extends PromptContext {
  /** Yesterday's target_keyword for this market+segment_type, so we don't repeat it (TICKET-004b). */
  avoidKeyword?: string;
}

export interface GenerateContentResult<T = unknown> {
  data: T;
  /** Non-fatal problems worth a human's attention (e.g. seo_title failed the keyword-position check). */
  warnings: string[];
}

/**
 * Turns Claude's raw text output into a validated, schema-typed result. Pulled out of
 * generateContent() so the fail-safe override below is unit-testable without mocking the
 * network client — see prompts.review-safety.test.ts.
 */
export function parseAndValidateResponse(
  market: Market,
  segmentType: SegmentType,
  rawText: string,
  targetKeyword: string | undefined,
  strictSeo: boolean,
): GenerateContentResult {
  const promptModule = getPromptModule(market, segmentType);
  const rawParsed = JSON.parse(rawText) as Record<string, unknown>;

  // Fail-safe: force needs_review = true for these segment types no matter what the model
  // returned — same rule as the Excel-import path (excelImport.ts), so there is no path (model
  // mistake or otherwise) that lets this bypass human review (TICKET-004 AC). This runs on the
  // raw object BEFORE zod parsing, so it can't be skipped by the schema accepting/rejecting.
  if (REVIEW_REQUIRED_SEGMENT_TYPES.includes(segmentType)) {
    rawParsed.needs_review = true;
  }

  const data = promptModule.schema.parse(rawParsed);

  const warnings: string[] = [];
  if (strictSeo && targetKeyword) {
    const seoTitle = (data as { seo_title?: string }).seo_title;
    if (seoTitle && !validateSeoTitle(market, seoTitle, targetKeyword)) {
      warnings.push(
        `seo_title không chứa target_keyword ("${targetKeyword}") gần đầu câu — cần người duyệt chỉnh lại.`,
      );
    }
  }

  return { data, warnings };
}

/**
 * TICKET-003: calls Claude for one piece of content. Retries on rate-limit/5xx/transient parse
 * failures, uses prompt caching on the (large, repeated) system prompt, and logs token usage
 * per market (TICKET-003 AC). Also implements TICKET-004b's target_keyword injection.
 */
export async function generateContent(
  market: Market,
  segmentType: SegmentType,
  options: GenerateContentOptions,
): Promise<GenerateContentResult> {
  const promptModule = getPromptModule(market, segmentType);
  const model = MODEL_IDS[promptModule.model];
  const strictSeo = STRICT_SEO_SEGMENTS.includes(segmentType);
  const targetKeyword = strictSeo
    ? pickTargetKeyword(market, segmentType, { avoid: options.avoidKeyword })
    : undefined;

  const context: PromptContext = { ...options, targetKeyword };
  const userPrompt = promptModule.buildUserPrompt(context);

  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await getClient().messages.create({
        model,
        // bedtime_story targets 28-32 minutes (~6.5k-8.5k JP/KR characters), plus JSON/SEO overhead.
        // Keep enough output headroom so the model does not truncate a complete episode.
        max_tokens: segmentType === 'bedtime_story' ? 16000 : 8000,
        system: [
          {
            type: 'text',
            text: promptModule.systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userPrompt }],
      });

      const usage = response.usage as {
        input_tokens: number;
        output_tokens: number;
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number;
      };
      await logApiUsage({
        market,
        segmentType,
        model,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
      });

      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text',
      );
      if (!textBlock) throw new Error('Claude response contained no text block');

      return parseAndValidateResponse(market, segmentType, textBlock.text, targetKeyword, strictSeo);
    } catch (err) {
      lastError = err;
      // The SDK itself already retries 429/5xx/connection errors a couple of times internally;
      // this outer loop adds longer backoff for a still-throttled call, and covers the one case
      // the SDK can't: Claude returning text that isn't valid JSON (SyntaxError below).
      const isRetryable =
        err instanceof Anthropic.RateLimitError ||
        err instanceof Anthropic.APIConnectionError ||
        (err instanceof Anthropic.APIError && typeof err.status === 'number' && err.status >= 500) ||
        err instanceof SyntaxError ||
        err instanceof ZodError;
      if (attempt < maxAttempts && isRetryable) {
        const backoffMs = 2 ** attempt * 1000;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError;
}
