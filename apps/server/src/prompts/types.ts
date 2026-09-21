import type { z } from 'zod';
import type { Market, SegmentType } from '@komorebi/shared-types';

/** Variables a caller may supply; each prompt module only reads the ones its template uses. */
export interface PromptContext {
  date: string;
  dayOfWeek?: string;
  season?: string;
  specialOccasion?: string;
  seasonalWeatherNote?: string;
  recentErasUsed?: string;
  rotationHint?: string;
  submittedLetterText?: string;
  quizCategory?: string;
  recentQuestionsSummary?: string;
  previousEpisodeSummary?: string;
  episodeNumber?: number;
  storyGenre?: string;
  weeklyTheme?: string;
  /** Injected by contentGenerator.ts from seo-keywords.json before building the prompt (TICKET-004b). */
  targetKeyword?: string;
  [key: string]: unknown;
}

export interface PromptModule<TOutput = unknown> {
  market: Market;
  segmentType: SegmentType;
  model: 'haiku' | 'sonnet';
  systemPrompt: string;
  buildUserPrompt: (ctx: PromptContext) => string;
  schema: z.ZodType<TOutput>;
}
