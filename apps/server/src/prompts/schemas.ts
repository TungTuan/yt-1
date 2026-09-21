import { z } from 'zod';

/** Strict SEO fields (TICKET-004b) — required for every segment type except morning_news/gratitude_ritual. */
export const seoFieldsSchema = z.object({
  target_keyword: z.string().min(1),
  seo_title: z.string().min(1).max(60),
  seo_description: z.string().min(1),
  seo_tags: z.array(z.string()).min(1).max(8),
});

/** Loose SEO fields — present but not validated strictly (TICKET-004b AC for morning_news/gratitude_ritual). */
export const looseSeoFieldsSchema = z.object({
  target_keyword: z.string().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  seo_tags: z.array(z.string()).optional(),
});

export const tagsSchema = z.array(z.string()).default([]);

export const morningNewsSchema = z
  .object({
    title: z.string().max(40),
    script_text: z.string(),
    tags: tagsSchema,
    needs_review: z.literal(false),
  })
  .merge(looseSeoFieldsSchema);
export type MorningNewsOutput = z.infer<typeof morningNewsSchema>;

export const gratitudeRitualSchema = z
  .object({
    script_text: z.string(),
    comment_prompt: z.string(),
    tags: tagsSchema,
    needs_review: z.literal(false),
  })
  .merge(looseSeoFieldsSchema);
export type GratitudeRitualOutput = z.infer<typeof gratitudeRitualSchema>;

export const nostalgiaSchema = z
  .object({
    title: z.string(),
    script_text: z.string(),
    tags: tagsSchema,
    era_reference: z.string(),
    shorts_snippet: z.string(),
    needs_review: z.literal(false),
  })
  .merge(seoFieldsSchema);
export type NostalgiaOutput = z.infer<typeof nostalgiaSchema>;

export const quizQuestionSchema = z
  .object({
    question: z.string(),
    choices: z.array(z.string()).min(3).max(4).optional(),
    answer: z.string(),
    fun_fact: z.string().optional(),
  })
  .superRefine((question, ctx) => {
    if (question.choices && !question.choices.includes(question.answer)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answer'],
        message: 'answer must exactly match one of choices',
      });
    }
  });

export const quizSchema = z
  .object({
    title: z.string(),
    script_text: z.string(),
    questions: z.array(quizQuestionSchema).min(3).max(5),
    tags: tagsSchema,
    shorts_snippet: z.string(),
    needs_review: z.literal(false),
  })
  .merge(seoFieldsSchema);
export type QuizOutput = z.infer<typeof quizSchema>;

export const bedtimeStorySchema = z
  .object({
    title: z.string(),
    episode_number: z.number().int().positive(),
    script_text: z.string(),
    cliffhanger_summary: z.string(),
    tags: tagsSchema,
    needs_review: z.literal(false),
  })
  .merge(seoFieldsSchema);
export type BedtimeStoryOutput = z.infer<typeof bedtimeStorySchema>;

/**
 * letter_reading: EITHER a full response (title + script_text) OR, when the model detects a
 * serious crisis signal in the submitted letter, only `flagged_for_human` with no script
 * (TICKET-004 §4.3 AC — the model must not attempt to write a script in that case).
 * needs_review is always true either way — there is no schema path that allows false.
 */
export const letterReadingSchema = z
  .object({
    title: z.string().optional(),
    script_text: z.string().optional(),
    tags: tagsSchema.optional(),
    needs_review: z.literal(true),
    flagged_for_human: z.string().optional(),
  })
  .merge(seoFieldsSchema.partial())
  .refine((data) => Boolean(data.flagged_for_human) || Boolean(data.script_text), {
    message: 'letter_reading output must include either flagged_for_human or script_text',
  });
export type LetterReadingOutput = z.infer<typeof letterReadingSchema>;

export const companionshipSchema = z
  .object({
    title: z.string(),
    script_text: z.string(),
    tags: tagsSchema,
    needs_review: z.literal(true),
  })
  .merge(seoFieldsSchema);
export type CompanionshipOutput = z.infer<typeof companionshipSchema>;
