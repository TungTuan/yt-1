import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { TagColor, VisualCue } from '../types';
import { FONT_FAMILY, TAG_COLORS } from '../theme';

export const ContentVisuals: React.FC<{ cues?: VisualCue[]; tagColor: TagColor }> = ({ cues = [], tagColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const active = cues.find((cue) => time >= cue.startSeconds && time < cue.endSeconds);
  if (!active) return null;
  const local = frame - active.startSeconds * fps;
  const age = time - active.startSeconds;
  const remaining = active.endSeconds - time;
  const enter = spring({ frame: local, fps, config: { damping: 18, mass: 0.75 } });
  const opacity = Math.min(interpolate(age, [0, 0.35], [0, 1], { extrapolateRight: 'clamp' }), interpolate(remaining, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }));
  const colors = TAG_COLORS[tagColor];

  return (
    <div style={{ position: 'absolute', right: '5.5%', top: '20%', width: '38%', opacity, transform: `translateY(${(1 - enter) * 28}px) scale(${0.96 + enter * 0.04})`, padding: '24px 30px 26px', borderRadius: 24, background: 'rgba(250,247,238,.84)', border: `2px solid ${colors.bg}`, boxShadow: '0 18px 45px rgba(24,30,24,.18)', backdropFilter: 'blur(12px)', fontFamily: FONT_FAMILY }}>
      <div style={{ color: colors.text, fontSize: 18, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>{active.kind === 'takeaway' ? 'POINT' : active.kind === 'keyword' ? 'KEYWORD' : 'MESSAGE'}</div>
      <div style={{ color: '#35352f', fontSize: 34, fontWeight: 700, lineHeight: 1.42 }}>{active.text}</div>
      <div style={{ marginTop: 18, width: `${35 + enter * 65}%`, height: 3, borderRadius: 4, background: colors.bg }} />
    </div>
  );
};
