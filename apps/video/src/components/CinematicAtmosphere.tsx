import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

/** Gentle foreground depth shared by every format. Kept deliberately subtle so it supports the
 * narration instead of turning calm videos into a particle demo. */
export const CinematicAtmosphere: React.FC<{ vertical?: boolean }> = ({ vertical = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const glow = interpolate(Math.sin(t * 0.28), [-1, 1], [0.16, 0.28]);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: vertical ? '-55%' : '-18%', top: '-32%', width: vertical ? '150%' : '75%', height: '115%', transform: `rotate(-16deg) translateX(${Math.sin(t * 0.12) * 18}px)`, background: `linear-gradient(90deg, transparent, rgba(255,239,190,${glow}), transparent)`, filter: 'blur(28px)', mixBlendMode: 'screen' }} />
      {[0, 1, 2, 3].map((i) => {
        const y = 74 + i * 9 + Math.sin(t * 0.35 + i) * 2;
        const x = ((i * 31 + t * (1.4 + i * 0.2)) % 125) - 15;
        return <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 90 + i * 24, height: 34 + i * 7, borderRadius: '70% 0 70% 0', border: '2px solid rgba(55,72,45,.16)', background: 'rgba(99,123,72,.09)', transform: `rotate(${-28 + i * 17}deg)`, filter: 'blur(1.5px)' }} />;
      })}
      <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 45%, transparent 48%, rgba(22,28,24,.22) 120%)' }} />
    </AbsoluteFill>
  );
};
