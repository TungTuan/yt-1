import React from 'react';
import { Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

interface Props {
  src: string;
}

const HOLD_FRAMES = 18;
const SETTLE_FRAMES = 45;

/**
 * TICKET-009b AC: "Có 1 khung hình mở đầu dùng pose wing_flap để tạo cảm giác 'bắt đầu' ngay
 * giây đầu" — large centered wing_flap for the first ~0.6s, settling into the normal
 * bottom-left position by ~1.5s.
 */
export const ShortsMascotIntro: React.FC<Props> = ({ src }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const settle = interpolate(frame, [HOLD_FRAMES, SETTLE_FRAMES], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const targetHeight = height * 0.3;
  const introHeight = height * 0.5;
  const currentHeight = introHeight + (targetHeight - introHeight) * settle;

  const introLeft = width / 2 - introHeight / 2;
  const targetLeft = width * 0.04;
  const currentLeft = introLeft + (targetLeft - introLeft) * settle;

  const introBottom = height / 2 - introHeight / 2;
  const targetBottom = height * 0.14;
  const currentBottom = introBottom + (targetBottom - introBottom) * settle;

  const popIn = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <Img
      src={src}
      style={{
        position: 'absolute',
        left: currentLeft,
        bottom: currentBottom,
        height: currentHeight,
        opacity: popIn,
        filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.3))',
      }}
    />
  );
};
