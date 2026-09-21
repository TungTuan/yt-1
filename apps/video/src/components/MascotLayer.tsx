import React from 'react';
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface Props {
  src: string;
  /** Fraction of frame height the mascot occupies. */
  heightFraction?: number;
  bottomFraction?: number;
  leftFraction?: number;
}

/** The mascot pose, composited bottom-left over the background (per komorebi-library's intended layout). */
export const MascotLayer: React.FC<Props> = ({
  src,
  heightFraction = 0.34,
  bottomFraction = 0.06,
  leftFraction = 0.05,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  const entrance = spring({ frame, fps, config: { damping: 14, mass: 0.6 }, durationInFrames: 18 });
  const bob = interpolate(Math.sin(frame / 18), [-1, 1], [-4, 4]);
  const breathe = interpolate(Math.sin(frame / 34), [-1, 1], [0.992, 1.008]);
  const sway = interpolate(Math.sin(frame / 52), [-1, 1], [-0.6, 0.6]);

  return (
    <Img
      src={src}
      style={{
        position: 'absolute',
        bottom: `${bottomFraction * 100}%`,
        left: `${leftFraction * 100}%`,
        height: height * heightFraction,
        transform: `translateY(${(1 - entrance) * 40 + bob}px) rotate(${sway}deg) scale(${(0.85 + entrance * 0.15) * breathe})`,
        transformOrigin: '50% 85%',
        opacity: entrance,
        filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.25))',
      }}
    />
  );
};
