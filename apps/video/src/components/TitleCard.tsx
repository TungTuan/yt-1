import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { TagColor } from '../types';
import { TAG_COLORS, FONT_FAMILY } from '../theme';

interface Props {
  title: string;
  channelName: string;
  tagColor: TagColor;
  fontSize?: number;
}

const REVEAL_FRAMES = 20;
// A title chyron is meant to be a brief intro beat, not a permanent overlay — it used to have no
// exit at all and sat on screen for the full video (found 2026-09-14 reviewing real renders: still
// visible at 6:40 into a 7:55 bedtime_story). Hold it long enough to read, then fade it out.
const HOLD_SECONDS = 4;
const FADE_OUT_SECONDS = 0.6;

export const TitleCard: React.FC<Props> = ({ title, channelName, tagColor, fontSize = 44 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = TAG_COLORS[tagColor];

  const fadeOutStart = Math.round(HOLD_SECONDS * fps);
  const fadeOutEnd = Math.round((HOLD_SECONDS + FADE_OUT_SECONDS) * fps);

  if (frame > fadeOutEnd) return null;

  const opacityIn = interpolate(frame, [0, REVEAL_FRAMES], [0, 1], { extrapolateRight: 'clamp' });
  const opacityOut = interpolate(frame, [fadeOutStart, fadeOutEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = Math.min(opacityIn, opacityOut);
  const slide = interpolate(frame, [0, REVEAL_FRAMES], [-24, 0], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        top: '6%',
        left: '6%',
        opacity,
        transform: `translateX(${slide}px)`,
      }}
    >
      <div
        style={{
          background: colors.bg,
          color: colors.text,
          fontFamily: FONT_FAMILY,
          fontSize,
          fontWeight: 700,
          padding: '14px 28px',
          borderRadius: 16,
          boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
          maxWidth: '70vw',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: '0.08em', marginBottom: 5, opacity: 0.82 }}>
          {channelName}
        </div>
        {title}
      </div>
    </div>
  );
};
