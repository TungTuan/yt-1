import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { FONT_FAMILY } from '../theme';

export const BrandWatermark: React.FC<{ channelName: string; vertical?: boolean }> = ({
  channelName,
  vertical = false,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [24, 45], [0, 0.56], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        top: vertical ? '4.5%' : '4%',
        right: vertical ? '5%' : '3.5%',
        opacity,
        color: '#fffaf0',
        fontFamily: FONT_FAMILY,
        fontSize: vertical ? 25 : 22,
        letterSpacing: '0.08em',
        textShadow: '0 2px 8px rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
      }}
    >
      <span style={{ fontSize: vertical ? 22 : 20 }}>◌</span>
      {channelName}
    </div>
  );
};
