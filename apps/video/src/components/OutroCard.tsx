import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_FAMILY } from '../theme';

export const OutroCard: React.FC<{
  channelName: string;
  mascotSrc: string;
  audioDurationSeconds: number;
  vertical?: boolean;
}> = ({ channelName, mascotSrc, audioDurationSeconds, vertical = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = Math.round(audioDurationSeconds * fps);
  if (frame < start) return null;
  const local = frame - start;
  const opacity = interpolate(local, [0, 18], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        opacity,
        background: 'linear-gradient(135deg, rgba(250,246,238,0.96), rgba(219,228,209,0.96))',
        fontFamily: FONT_FAMILY,
        color: '#2d2a26',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <Img src={mascotSrc} style={{ height: vertical ? '26%' : '31%', marginBottom: vertical ? 34 : 20 }} />
      <div style={{ fontSize: vertical ? 44 : 48, fontWeight: 700 }}>{channelName}</div>
      <div style={{ fontSize: vertical ? 30 : 29, marginTop: 16, lineHeight: 1.5 }}>
        {vertical ? '続きは本編で、ゆっくりと。' : '最後までご一緒いただき、ありがとうございました。'}
      </div>
      <div style={{ fontSize: vertical ? 24 : 23, marginTop: 13, opacity: 0.74 }}>
        チャンネル登録して、また次のお便りでお会いしましょう
      </div>
      {!vertical && (
        <div style={{ display: 'flex', gap: 34, marginTop: 34 }}>
          <div style={{ width: 330, height: 116, border: '2px solid rgba(45,42,38,0.2)', borderRadius: 18 }} />
          <div style={{ width: 330, height: 116, border: '2px solid rgba(45,42,38,0.2)', borderRadius: 18 }} />
        </div>
      )}
    </AbsoluteFill>
  );
};
