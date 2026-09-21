import React from 'react';
import { Sequence, useVideoConfig } from 'remotion';
import type { MascotCue } from '../types';
import { MascotLayer } from './MascotLayer';

export const MascotTimeline: React.FC<{ fallbackSrc: string; cues?: MascotCue[] }> = ({ fallbackSrc, cues }) => {
  const { fps } = useVideoConfig();
  const resolved = cues?.length ? cues : [{ src: fallbackSrc, startSeconds: 0 }];
  return <>{resolved.map((cue, index) => {
    const from = Math.round(cue.startSeconds * fps);
    const next = resolved[index + 1];
    const durationInFrames = next ? Math.round((next.startSeconds - cue.startSeconds) * fps) : undefined;
    return <Sequence key={`${cue.src}-${from}`} from={from} durationInFrames={durationInFrames}><MascotLayer src={cue.src} /></Sequence>;
  })}</>;
};
