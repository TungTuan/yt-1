import type { SegmentType } from '@komorebi/shared-types';
import type { PromptModule } from '../types';
import { morningNewsJp } from './morningNews';
import { nostalgiaJp } from './nostalgia';
import { letterReadingJp } from './letterReading';
import { quizJp } from './quiz';
import { bedtimeStoryJp } from './bedtimeStory';
import { companionshipJp } from './companionship';
import { gratitudeRitualJp } from './gratitudeRitual';

export const jpPrompts: Record<SegmentType, PromptModule> = {
  morning_news: morningNewsJp,
  nostalgia: nostalgiaJp,
  letter_reading: letterReadingJp,
  quiz: quizJp,
  bedtime_story: bedtimeStoryJp,
  companionship: companionshipJp,
  gratitude_ritual: gratitudeRitualJp,
};
