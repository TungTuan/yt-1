import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { AmbientMotionProps } from '../types';
import { useKenBurnsTransform } from '../hooks/useKenBurnsTransform';

/**
 * Procedural motion layered over the static background:
 *  - dust motes: always, independent of the painting (floats in "air" in front of the scene, not
 *    attached to anything painted — deliberately NOT transformed with Ken Burns, which actually
 *    reads as a nice bit of parallax depth)
 *  - seasonal leaves/petals/snow: outdoor_porch scenes only, also independent
 *  - steam / lamp flicker / rain: anchored to a specific painted point or region (from
 *    asset_library.motionAnchors) — these MUST apply the exact same Ken Burns transform as
 *    KenBurnsBackground.tsx, or they visibly drift off the object as the background pans/zooms
 *    (found 2026-09-14: "khói đang bị lệch" — steam sat in an untransformed sibling layer while
 *    the teacup under it moved every 18s cycle).
 * Pure CSS positions driven by sine/cosine of elapsed seconds, seeded per-particle by index —
 * deterministic across frames (no Math.random() in render: Remotion re-evaluates the whole tree
 * fresh every frame, so a real random call would jitter instead of drift).
 */
const DUST_COUNT = 16;
const DUST_SEEDS = Array.from({ length: DUST_COUNT }, (_, i) => ({
  x: (i * 61 + 5) % 100,
  yStart: (i * 37 + 11) % 100,
  phase: (i * 0.9) % (Math.PI * 2),
  speed: 0.5 + (i % 5) * 0.09,
  size: 5 + (i % 4) * 3,
}));

const DRIFT_COUNT = 7;
const DRIFT_SEEDS = Array.from({ length: DRIFT_COUNT }, (_, i) => ({
  xStart: (i * 43 + 9) % 100,
  delaySeconds: (i * 2.3) % 14,
  durationSeconds: 11 + (i % 4) * 2,
  sway: 3 + (i % 3) * 2,
  size: 13 + (i % 3) * 5,
  spin: i % 2 === 0 ? 1 : -1,
}));

const SEASON_COLOR: Record<'spring' | 'summer' | 'autumn' | 'winter', string> = {
  spring: '#f3b6c9', // sakura petal pink
  summer: '#8fae5e', // fresh leaf green
  autumn: '#c9702f', // fallen leaf orange
  winter: '#ffffff', // snowflake
};

// Steam off a painted teacup — soft round puffs that WIDEN and blur out as they rise (real steam
// diffuses outward, it doesn't stay a thin column). The first version used a tall-narrow ellipse
// (width 10-26px, height 26-46px) that stayed a fixed thin shape all the way up — at normal watch
// size it read as a single wavy squiggle/thread, not steam (user feedback 2026-09-14, screenshot:
// "khói thật sự tệ"). Each puff is now a widening circle with growing blur, several staggered and
// slightly offset sideways so they overlap into a soft plume instead of tracing one thin line.
const STEAM_PUFF_COUNT = 5;
const STEAM_PUFFS = Array.from({ length: STEAM_PUFF_COUNT }, (_, i) => ({
  delaySeconds: i * 0.62,
  swayPhase: i * 1.4,
  xOffsetPx: ((i % 3) - 1) * 5,
}));
const STEAM_CYCLE_SECONDS = 3.1;
const STEAM_RISE_PX = 80;

function Steam({ x, y, t }: { x: number; y: number; t: number }) {
  return (
    <>
      {STEAM_PUFFS.map((p, i) => {
        const local = ((t - p.delaySeconds) % STEAM_CYCLE_SECONDS + STEAM_CYCLE_SECONDS) % STEAM_CYCLE_SECONDS;
        const progress = local / STEAM_CYCLE_SECONDS; // 0 (at the cup) -> 1 (dissipated)
        const riseY = -progress * STEAM_RISE_PX;
        const sway = Math.sin(progress * Math.PI * 1.6 + p.swayPhase) * 12 * progress + p.xOffsetPx;
        const size = 14 + progress * 46; // a small puff at the cup, a soft wide cloud by the top
        const opacity = Math.sin(Math.min(progress, 1) * Math.PI) * 0.32;
        return (
          <div
            key={`steam-${i}`}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              marginLeft: -size / 2,
              marginTop: -size,
              transform: `translate(${sway}px, ${riseY}px)`,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 45%, rgba(255,255,255,0) 75%)',
              opacity,
              filter: `blur(${3 + progress * 5}px)`,
            }}
          />
        );
      })}
    </>
  );
}

// A lit lamp/lantern's flicker — a soft warm glow whose brightness/size breathes on a slow base
// wave plus a faster small jitter layered on top, so it reads as candle-like rather than a clean
// mechanical pulse.
function LampFlicker({ x, y, t }: { x: number; y: number; t: number }) {
  const base = 0.55 + 0.15 * Math.sin(t * 1.1);
  const jitter = 0.08 * Math.sin(t * 5.3) * Math.sin(t * 2.1 + 1.4);
  const intensity = Math.max(0.3, Math.min(1, base + jitter));
  const size = 130 + intensity * 40;
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(255,214,140,${0.5 * intensity}) 0%, rgba(255,214,140,0) 70%)`,
        mixBlendMode: 'screen',
      }}
    />
  );
}

// Rain/snow confined to a region (the visible window/garden opening in the painting) — a plain
// full-frame overlay would fall "inside the room" too, which reads as wrong (found while
// reviewing jp_17_indoor_rain.png: the rain in the art is only visible through the open door).
// Clipped by the region div's own overflow:hidden, sized in % of the region so it scales
// correctly for both 16:9 long-form and 9:16 Shorts crops without any hardcoded pixel math.
const PRECIP_COUNT = 22;
const PRECIP_SEEDS = Array.from({ length: PRECIP_COUNT }, (_, i) => ({
  xStart: (i * 17 + 3) % 100,
  delaySeconds: (i * 0.19) % 1.1,
  fallSeconds: 0.55 + (i % 4) * 0.09,
  swayPhase: i * 0.8,
}));

function Precipitation({
  region,
  t,
}: {
  region: { x: number; y: number; width: number; height: number; kind: 'rain' | 'snow' };
  t: number;
}) {
  const isSnow = region.kind === 'snow';
  // Snow falls much slower and sways side to side instead of a fixed diagonal streak.
  const speedScale = isSnow ? 3.2 : 1;
  return (
    <div
      style={{
        position: 'absolute',
        left: `${region.x}%`,
        top: `${region.y}%`,
        width: `${region.width}%`,
        height: `${region.height}%`,
        overflow: 'hidden',
      }}
    >
      {PRECIP_SEEDS.map((p, i) => {
        const fallSeconds = p.fallSeconds * speedScale;
        const local = ((t - p.delaySeconds) % fallSeconds + fallSeconds) % fallSeconds;
        const progress = local / fallSeconds; // 0 (above region) -> 1 (below region)
        const top = progress * 130 - 15;
        const left = isSnow
          ? p.xStart + Math.sin(progress * Math.PI * 3 + p.swayPhase) * 6
          : p.xStart + progress * 5; // rain: gentle wind drift matching the streak's own tilt
        const opacity = Math.sin(Math.min(progress, 1) * Math.PI) * (isSnow ? 0.7 : 0.5);
        return isSnow ? (
          <div
            key={`snow-${i}`}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: `${top}%`,
              width: 4 + (i % 3) * 2,
              height: 4 + (i % 3) * 2,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.95)',
              boxShadow: '0 0 3px rgba(255,255,255,0.6)',
              opacity,
            }}
          />
        ) : (
          <div
            key={`rain-${i}`}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: `${top}%`,
              width: 2,
              height: '10%',
              background: 'linear-gradient(to bottom, rgba(220,235,255,0) 0%, rgba(220,235,255,0.85) 100%)',
              transform: 'rotate(11deg)',
              opacity,
            }}
          />
        );
      })}
    </div>
  );
}

export const AmbientMotion: React.FC<AmbientMotionProps & { direction?: 1 | -1 }> = ({ setting, season, anchors, direction = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  // Track the exact pan direction of the current scene so object-anchored effects stay attached.
  const { scale, translateX } = useKenBurnsTransform(direction);

  const showSeasonalDrift = setting === 'outdoor_porch' && season !== 'any';
  const hasAnchoredEffects = anchors?.steam || anchors?.lampFlicker || anchors?.precipitation;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {DUST_SEEDS.map((d, i) => {
        const x = d.x + Math.sin(t * 0.12 * d.speed + d.phase) * 2.5;
        const y = (d.yStart - t * 0.9 * d.speed) % 100;
        const wrappedY = y < 0 ? y + 100 : y;
        const opacity = 0.38 + 0.24 * Math.sin(t * 0.35 + d.phase);
        return (
          <div
            key={`dust-${i}`}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${wrappedY}%`,
              width: d.size,
              height: d.size,
              borderRadius: '50%',
              background: 'rgba(255, 248, 222, 0.95)',
              boxShadow: `0 0 ${d.size * 2}px rgba(255, 240, 200, 0.55)`,
              opacity: Math.max(0.08, opacity),
              filter: 'blur(0.5px)',
            }}
          />
        );
      })}

      {showSeasonalDrift &&
        DRIFT_SEEDS.map((d, i) => {
          const local = ((t - d.delaySeconds) % d.durationSeconds + d.durationSeconds) % d.durationSeconds;
          const progress = local / d.durationSeconds; // 0 (just above frame) -> 1 (below frame)
          const y = progress * 112 - 6;
          const x = d.xStart + Math.sin(progress * Math.PI * 3) * d.sway;
          const rotation = progress * 300 * d.spin;
          const edgeFade = Math.min(progress / 0.06, (1 - progress) / 0.08, 1);
          const opacity = Math.max(0, edgeFade) * 0.85;
          const color = SEASON_COLOR[season as 'spring' | 'summer' | 'autumn' | 'winter'];
          return (
            <div
              key={`drift-${i}`}
              style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                width: d.size,
                height: d.size,
                opacity,
                transform: `rotate(${rotation}deg)`,
                background: color,
                borderRadius: season === 'winter' ? '50%' : '70% 0% 70% 0%',
                boxShadow:
                  season === 'winter'
                    ? '0 0 6px rgba(255,255,255,0.8)'
                    : '0 2px 4px rgba(0,0,0,0.25)',
              }}
            />
          );
        })}

      {hasAnchoredEffects && (
        <AbsoluteFill
          style={{
            transform: `scale(${scale}) translateX(${translateX}px)`,
            transformOrigin: 'center center',
          }}
        >
          {anchors?.steam && <Steam x={anchors.steam.x} y={anchors.steam.y} t={t} />}
          {anchors?.lampFlicker && <LampFlicker x={anchors.lampFlicker.x} y={anchors.lampFlicker.y} t={t} />}
          {anchors?.precipitation && <Precipitation region={anchors.precipitation} t={t} />}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
