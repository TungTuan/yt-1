import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_FAMILY, TAG_COLORS } from '../theme';
import type { TagColor } from '../types';

export const ShortsHook: React.FC<{ title: string; tagColor: TagColor }> = ({ title, tagColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 8, fps * 2.3, fps * 2.8], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (frame > fps * 2.8) return null;
  const colors = TAG_COLORS[tagColor];
  return (
    <div style={{ position: 'absolute', top: '12%', left: '7%', right: '7%', textAlign: 'center', opacity }}>
      <div style={{ display: 'inline-block', background: colors.bg, color: colors.text, borderRadius: 24, padding: '18px 28px', fontFamily: FONT_FAMILY, fontSize: 42, fontWeight: 700, lineHeight: 1.3, boxShadow: '0 10px 30px rgba(0,0,0,0.24)' }}>
        {title.replace(/（ショート版）$/, '')}
      </div>
    </div>
  );
};
