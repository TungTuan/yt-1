import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { KenBurnsBackground } from './KenBurnsBackground';
import { AmbientMotion } from './AmbientMotion';
import type { AmbientMotionProps } from '../types';

interface Scene { src: string; startSeconds: number; ambientMotion?: AmbientMotionProps }

/** Calm scene rotation with a two-second dissolve instead of attention-grabbing hard cuts. */
export const SceneBackgrounds: React.FC<{ fallbackSrc: string; scenes?: Scene[]; fallbackAmbient: AmbientMotionProps }> = ({ fallbackSrc, scenes, fallbackAmbient }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const resolved = scenes?.length ? scenes : [{ src: fallbackSrc, startSeconds: 0 }];
  return (
    <AbsoluteFill>
      {resolved.map((scene, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        const start = scene.startSeconds * fps;
        const next = resolved[index + 1]?.startSeconds;
        const opacity = interpolate(frame, [start, start + 2 * fps], [0, 1], { extrapolateLeft: index === 0 ? 'clamp' : 'clamp', extrapolateRight: 'clamp' });
        if (next !== undefined && frame >= (next + 2) * fps) return null;
        if (frame < start) return null;
        return <AbsoluteFill key={`${scene.src}-${index}`} style={{ opacity }}><KenBurnsBackground src={scene.src} direction={direction} /><AmbientMotion {...(scene.ambientMotion ?? fallbackAmbient)} direction={direction} /></AbsoluteFill>;
      })}
    </AbsoluteFill>
  );
};
