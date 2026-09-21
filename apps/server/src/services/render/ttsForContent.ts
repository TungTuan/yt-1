import type { ContentItem } from '@prisma/client';
import { prisma } from '../../db';
import { synthesize } from '../tts';
import { storageUrl } from './mediaUrls';

export interface CaptionCue {
  text: string;
  startSeconds: number;
  endSeconds: number;
}

export interface VoicedResult {
  audioUrl: string;
  durationSeconds: number;
  captionCues: CaptionCue[];
}

/**
 * Runs TTS (TICKET-006) for a content_item if it hasn't been voiced yet, persisting the result
 * (audio_path, status: voiced, caption cues in script_metadata) so a re-render doesn't re-call
 * the TTS engine. Idempotent: returns the cached result if already voiced.
 */
export async function ensureVoiced(item: ContentItem): Promise<VoicedResult> {
  const metadata = (item.scriptMetadata as Record<string, unknown>) ?? {};
  const cachedCues = metadata.captionCues as CaptionCue[] | undefined;
  const cachedDuration = metadata.audioDurationSeconds as number | undefined;

  if (item.audioPath && cachedCues && cachedDuration !== undefined) {
    return { audioUrl: storageUrl(item.audioPath), durationSeconds: cachedDuration, captionCues: cachedCues };
  }

  if (!item.scriptText) {
    throw new Error(`content_item ${item.id} has no script_text to synthesize`);
  }

  const result = await synthesize(item.market, item.id, item.scriptText);
  const captionCues: CaptionCue[] = result.timingData.map((t) => ({
    text: t.text,
    startSeconds: t.startSeconds,
    endSeconds: t.endSeconds,
  }));

  await prisma.contentItem.update({
    where: { id: item.id },
    data: {
      audioPath: result.audioPath,
      status: 'voiced',
      scriptMetadata: { ...metadata, captionCues, audioDurationSeconds: result.durationSeconds } as any,
    },
  });

  return { audioUrl: storageUrl(result.audioPath), durationSeconds: result.durationSeconds, captionCues };
}
