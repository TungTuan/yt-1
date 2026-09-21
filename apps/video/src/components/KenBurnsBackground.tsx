import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { useKenBurnsTransform } from '../hooks/useKenBurnsTransform';

interface Props {
  src: string;
  /** Slight variation so consecutive clips using the same still don't all pan identically. */
  direction?: 1 | -1;
}

/** Slow pan/zoom over a static background image (TICKET-009 AC: "Hiệu ứng Ken Burns"). Object-
 * anchored effects (Steam/LampFlicker in AmbientMotion.tsx) apply this exact same transform to
 * stay attached to the painted point they're meant to sit on — see useKenBurnsTransform.ts. */
export const KenBurnsBackground: React.FC<Props> = ({ src, direction = 1 }) => {
  const { scale, translateX } = useKenBurnsTransform(direction);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#e9e2d0' }}>
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translateX(${translateX}px)`,
          transformOrigin: 'center center',
        }}
      />
    </AbsoluteFill>
  );
};
