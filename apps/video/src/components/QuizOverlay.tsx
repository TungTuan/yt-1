import React from 'react';
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { QuizOverlayProps } from '../types';
import { FPS } from '../types';
import { FONT_FAMILY, PALETTE } from '../theme';

const REVEAL_FRAMES = 20;
const QUESTION_ACCENTS = ['#c98b45', '#6f8d68', '#6676a3', '#a56f69', '#8d7a55'];

/** Quiz card + question-mark badge, with the question text rendered dynamically onto the card
 * (TICKET-009 AC: "render kanji/số động vào khung thẻ trống"). Advances through `overlay.cues`
 * as playback crosses each cue's startSeconds, so the on-screen question tracks the narration
 * instead of showing only question 1 for the whole video. */
export const QuizOverlay: React.FC<{ overlay: QuizOverlayProps }> = ({ overlay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowSeconds = frame / FPS;

  let activeCue = overlay.cues.find((c) => nowSeconds >= c.startSeconds && nowSeconds < c.endSeconds);
  // Past the last cue's nominal end (e.g. the trailing outro line, or END_PADDING after audio
  // ends), keep showing the final question rather than popping the card away.
  if (!activeCue && overlay.cues.length > 0 && nowSeconds >= overlay.cues[overlay.cues.length - 1].startSeconds) {
    activeCue = overlay.cues[overlay.cues.length - 1];
  }
  // Before the first question is actually posed (intro chatter), don't show a card at all.
  if (!activeCue) return null;

  const localFrame = frame - Math.round(activeCue.startSeconds * FPS);
  const opacity = interpolate(localFrame, [0, REVEAL_FRAMES], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(localFrame, [0, REVEAL_FRAMES], [0.9, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // A tiny continuous float keeps the otherwise static quiz layout alive without making the
  // text harder to read. Resetting per question also complements the existing reveal animation.
  const floatY = Math.sin(localFrame / 28) * 3;
  const showAnswer = nowSeconds >= activeCue.answerStartSeconds;
  const answerFrame = frame - Math.round(activeCue.answerStartSeconds * FPS);
  const answerPop = spring({
    frame: Math.max(0, answerFrame),
    fps,
    config: { damping: 13, stiffness: 170, mass: 0.65 },
    durationInFrames: 22,
  });
  const cueDuration = Math.max(0.01, activeCue.endSeconds - activeCue.startSeconds);
  const cueProgress = Math.max(0, Math.min(1, (nowSeconds - activeCue.startSeconds) / cueDuration));
  const accent = QUESTION_ACCENTS[(activeCue.questionIndex - 1) % QUESTION_ACCENTS.length];

  return (
    <div
      style={{
        position: 'absolute',
        top: '11%',
        right: '5.5%',
        width: '43%',
        opacity,
        transform: `translateY(${floatY}px) scale(${scale})`,
      }}
    >
      <div
        style={{
          position: 'relative',
          filter: `drop-shadow(0 14px 25px ${accent}38)`,
        }}
      >
        <Img src={overlay.cardSrc} style={{ width: '100%', display: 'block' }} />
        <div
          style={{
            position: 'absolute',
            // The PNG includes transparent space above the clip and the paper itself is tilted.
            // Fit copy to the actual writable paper area rather than the full image canvas.
            top: '30%',
            right: '11%',
            bottom: '17%',
            left: '13%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            fontFamily: FONT_FAMILY,
            fontSize: 28,
            fontWeight: 600,
            color: PALETTE.ink,
            flexDirection: 'column',
            gap: 12,
            transform: 'rotate(-4.2deg)',
          }}
        >
          <div>{activeCue.questionText}</div>
          {!showAnswer && activeCue.choices.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 18px', width: '100%', fontSize: 22, fontWeight: 500 }}>
              {activeCue.choices.map((choice, i) => (
                <div key={choice} style={{ background: 'rgba(255,255,255,0.64)', borderRadius: 10, padding: '6px 9px' }}>
                  {i + 1}. {choice}
                </div>
              ))}
            </div>
          )}
          {showAnswer && (
            <div style={{ transform: `scale(${0.82 + answerPop * 0.18})`, opacity: answerPop }}>
              <div style={{ color: '#355d43', fontSize: 31, fontWeight: 800 }}>
                正解：{activeCue.answer}
              </div>
              {activeCue.funFact && (
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 9,
                    borderTop: `2px solid ${accent}55`,
                    color: PALETTE.ink,
                    fontSize: 18,
                    fontWeight: 500,
                    lineHeight: 1.35,
                  }}
                >
                  {activeCue.funFact}
                </div>
              )}
            </div>
          )}
        </div>
        <Img
          src={overlay.badgeSrc}
          style={{ position: 'absolute', top: '0%', left: '-6%', width: '24%' }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '12%',
            right: '11%',
            fontFamily: FONT_FAMILY,
            fontSize: 20,
            color: PALETTE.ink,
            background: 'rgba(255,255,255,0.85)',
            padding: '4px 14px',
            borderRadius: 999,
          }}
        >
          Q{activeCue.questionIndex} / {activeCue.questionTotal}
        </div>
        <div
          style={{
            position: 'absolute',
            left: '16%',
            right: '14%',
            bottom: '15%',
            height: 6,
            borderRadius: 999,
            overflow: 'hidden',
            background: 'rgba(45,42,38,0.12)',
          }}
        >
          <div
            style={{
              width: `${cueProgress * 100}%`,
              height: '100%',
              borderRadius: 999,
              background: showAnswer ? '#557d62' : accent,
            }}
          />
        </div>
      </div>
    </div>
  );
};
