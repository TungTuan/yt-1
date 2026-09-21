import React from 'react';
import { Audio, Sequence, useVideoConfig } from 'remotion';
import type { CaptionCue, SfxCue } from '../types';

interface Props {
  voiceSrc: string;
  captionCues: CaptionCue[];
  bgmSrc?: string;
  sfxCues: SfxCue[];
}

const DUCK_VOLUME = 0.18;
const RAISED_VOLUME = 0.45;
const CROSSFADE_SECONDS = 0.3;
// Current generated narration lands around -23 LUFS. +8 dB brings it close to YouTube's
// -14 LUFS reference while retaining roughly 1 dB of true-peak headroom in reviewed renders.
const VOICE_VOLUME = 2.5;

/**
 * TICKET-009 AC: BGM ducks to ~15-20% while the voice is speaking, rises to ~40-50% during
 * [PAUSE] gaps — driven directly by captionCues (each cue IS a voiced segment; the gaps between
 * cues are exactly ttsService's [PAUSE] silences), not hardcoded timestamps.
 */
function bgmVolumeAt(seconds: number, cues: CaptionCue[]): number {
  for (const cue of cues) {
    if (seconds >= cue.startSeconds - CROSSFADE_SECONDS && seconds <= cue.startSeconds) {
      const t = (seconds - (cue.startSeconds - CROSSFADE_SECONDS)) / CROSSFADE_SECONDS;
      return RAISED_VOLUME + (DUCK_VOLUME - RAISED_VOLUME) * t;
    }
    if (seconds >= cue.startSeconds && seconds <= cue.endSeconds) return DUCK_VOLUME;
    if (seconds >= cue.endSeconds && seconds <= cue.endSeconds + CROSSFADE_SECONDS) {
      const t = (seconds - cue.endSeconds) / CROSSFADE_SECONDS;
      return DUCK_VOLUME + (RAISED_VOLUME - DUCK_VOLUME) * t;
    }
  }
  return RAISED_VOLUME;
}

export const AudioLayers: React.FC<Props> = ({ voiceSrc, captionCues, bgmSrc, sfxCues }) => {
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <>
      <Audio src={voiceSrc} volume={VOICE_VOLUME} />
      {bgmSrc && (
        <Audio
          src={bgmSrc}
          loop
          volume={(frame) => bgmVolumeAt(frame / fps, captionCues)}
        />
      )}
      {sfxCues.map((cue, i) => {
        const from = Math.round(cue.timestampSeconds * fps);
        if (from >= durationInFrames) return null;
        return (
          <Sequence key={`${cue.trigger}-${i}`} from={from}>
            <Audio src={cue.src} volume={0.7} />
          </Sequence>
        );
      })}
    </>
  );
};
