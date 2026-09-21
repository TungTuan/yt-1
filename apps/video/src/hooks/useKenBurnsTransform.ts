import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

// Shared with KenBurnsBackground.tsx AND any object-anchored effect (Steam, LampFlicker in
// AmbientMotion.tsx) that must track a specific painted point in the background image. Anchored
// effects used to sit in an untransformed sibling layer with a fixed % position, so as the
// background panned/zoomed under them they visibly drifted off the teacup/lamp they were meant to
// sit on (found 2026-09-14: "khói đang bị lệch"). Both must derive scale/translateX from the exact
// same math, not just similar-looking constants, or they'll still drift apart frame to frame.
export const KEN_BURNS_CYCLE_SECONDS = 14;
export const KEN_BURNS_MAX_SCALE = 1.12;
export const KEN_BURNS_MAX_TRANSLATE_PX = 28;

export function useKenBurnsTransform(direction: 1 | -1 = 1) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cycleFrames = KEN_BURNS_CYCLE_SECONDS * fps;
  const t = frame % (cycleFrames * 2);

  const scale = interpolate(t, [0, cycleFrames, cycleFrames * 2], [1.0, KEN_BURNS_MAX_SCALE, 1.0]);
  const translateX = interpolate(
    t,
    [0, cycleFrames, cycleFrames * 2],
    [0, direction * -KEN_BURNS_MAX_TRANSLATE_PX, 0],
  );

  return { scale, translateX };
}
