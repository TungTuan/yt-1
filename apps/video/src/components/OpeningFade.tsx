import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';

const FADE_FRAMES = 24; // 0.8s @ 30fps

/** A soft fade-up from black at the very start of the video — the first thing a viewer sees
 * (user request 2026-09-14: "hình ảnh thật lãng mạn và chill khi người dùng mở video"). A hard
 * cut straight into a full-brightness scene reads as abrupt; easing in from black is the same
 * cheap trick a lot of cozy/ambient videos use to make the opening feel considered rather than
 * just "the file started playing". */
export const OpeningFade: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, FADE_FRAMES], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  if (opacity <= 0) return null;
  return <AbsoluteFill style={{ backgroundColor: '#0a0806', opacity, pointerEvents: 'none' }} />;
};
