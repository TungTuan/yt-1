import type { SegmentType } from '@komorebi/shared-types';
import type { PromptModule } from '../types';
import { morningNewsKr } from './morningNews';
import { nostalgiaKr } from './nostalgia';
import { letterReadingKr } from './letterReading';
import { quizKr } from './quiz';
import { bedtimeStoryKr } from './bedtimeStory';
import { companionshipKr } from './companionship';
import { gratitudeRitualKr } from './gratitudeRitual';

export const krPrompts: Record<SegmentType, PromptModule> = {
  morning_news: morningNewsKr,
  nostalgia: nostalgiaKr,
  letter_reading: letterReadingKr,
  quiz: quizKr,
  bedtime_story: bedtimeStoryKr,
  companionship: companionshipKr,
  gratitude_ritual: gratitudeRitualKr,
};
