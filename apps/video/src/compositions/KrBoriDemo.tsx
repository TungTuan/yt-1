import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const captions = [
  { start: 0.1, end: 4.84, text: '안녕하세요. 햇살 편지의 보리예요.' },
  { start: 4.84, end: 11.18, text: '한국에서는 까치가 반가운 소식을 전해 주는 새로\n오래 사랑받아 왔어요.' },
  { start: 11.18, end: 15.99, text: '오늘 제가 가져온 소식은\n아주 작고 따뜻합니다.' },
  { start: 15.99, end: 21.24, text: '잠시 어깨의 힘을 빼고,\n창밖의 빛을 바라보세요.' },
  { start: 21.24, end: 27.5, text: '천천히 숨을 들이쉬고 내쉬면서\n오늘 잘해 낸 일 하나를 떠올려 보세요.' },
  { start: 27.5, end: 33.45, text: '따뜻한 차 한 잔, 반가운 인사 한마디도\n충분히 소중합니다.' },
  { start: 33.45, end: 37.97, text: '오늘도 당신 곁에\n좋은 소식이 머물기를 바라요.' },
  { start: 37.97, end: 41.6, text: '보리와 함께 편안한 하루 보내세요.' },
];

export const KrBoriDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const entrance = spring({ frame, fps, config: { damping: 15, mass: 0.7 }, durationInFrames: 24 });
  const mascotBob = Math.sin(frame / 15) * 7;
  const mascotSway = Math.sin(frame / 32) * 1.4;
  const breath = 1 + Math.sin(frame / 28) * 0.008;
  const bgScale = interpolate(frame, [0, fps * 45], [1.03, 1.1], { extrapolateRight: 'clamp' });
  const active = captions.find((cue) => t >= cue.start && t < cue.end);
  const captionFade = active
    ? Math.min(
        interpolate(t, [active.start, active.start + 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        interpolate(t, [active.end - 0.3, active.end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      )
    : 0;
  const outro = interpolate(t, [41.7, 44.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#1b2630', fontFamily: 'Arial, sans-serif', overflow: 'hidden' }}>
      <Img
        src={staticFile('demo/kr-sunset.png')}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${bgScale})` }}
      />
      <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(24,31,36,.18), rgba(24,31,36,0) 50%, rgba(24,31,36,.36))' }} />

      {Array.from({ length: 16 }).map((_, i) => {
        const x = ((i * 71) % 100) + Math.sin((frame + i * 13) / 50) * 3;
        const y = ((i * 43 + frame * (0.08 + (i % 3) * 0.025)) % 115) - 8;
        const opacity = 0.18 + ((i * 17) % 20) / 100;
        return <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 5 + (i % 3) * 3, height: 5 + (i % 3) * 3, borderRadius: '50%', background: '#fff2b8', opacity, filter: 'blur(1px)' }} />;
      })}

      <div
        style={{
          position: 'absolute', left: 105, bottom: 85, width: 720, height: 810,
          transform: `translateY(${(1 - entrance) * 70 + mascotBob}px) rotate(${mascotSway}deg) scale(${(0.88 + entrance * 0.12) * breath})`,
          transformOrigin: '50% 88%', opacity: entrance,
        }}
      >
        <Img src={staticFile('demo/bori-greeting.png')} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 20px 24px rgba(0,0,0,.28))' }} />
        {[0, 1, 2].map((i) => {
          const wave = interpolate(Math.sin((frame - i * 5) / 8), [-1, 1], [0.25, 1]);
          return <div key={i} style={{ position: 'absolute', left: 55 - i * 18, top: 145 + i * 42, width: 54 + i * 10, height: 7, borderRadius: 20, background: '#FFE274', opacity: wave * 0.8, transform: `rotate(${-35 - i * 8}deg) scaleX(${wave})`, transformOrigin: 'right center' }} />;
        })}
      </div>

      <div style={{ position: 'absolute', top: 72, right: 92, color: '#FFF7D6', textAlign: 'right', textShadow: '0 3px 12px rgba(0,0,0,.45)' }}>
        <div style={{ fontSize: 34, letterSpacing: 5, fontWeight: 600 }}>햇살 편지</div>
        <div style={{ marginTop: 8, fontSize: 22, opacity: 0.9 }}>보리의 따뜻한 인사</div>
      </div>

      {active && (
        <div style={{ position: 'absolute', left: 720, right: 110, bottom: 135, padding: '28px 40px', borderRadius: 28, background: 'rgba(25,38,43,.78)', border: '1px solid rgba(255,237,167,.55)', color: '#FFFDF2', fontSize: 43, fontWeight: 600, lineHeight: 1.42, textAlign: 'center', whiteSpace: 'pre-line', opacity: captionFade, transform: `translateY(${(1 - captionFade) * 16}px)`, boxShadow: '0 14px 38px rgba(0,0,0,.28)' }}>
          {active.text}
        </div>
      )}

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: `rgba(30,47,53,${outro * 0.86})`, opacity: outro }}>
        <div style={{ color: '#FFF7D6', fontSize: 70, fontWeight: 700, letterSpacing: 4 }}>오늘도 좋은 소식과 함께</div>
        <div style={{ marginTop: 24, color: '#FFE274', fontSize: 38 }}>햇살 편지 · 보리</div>
      </AbsoluteFill>

      <Audio src={staticFile('demo/bori-demo-neural.mp3')} volume={1} />
    </AbsoluteFill>
  );
};
