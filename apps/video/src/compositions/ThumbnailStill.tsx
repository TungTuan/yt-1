import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import type { ThumbnailStillProps } from '../types';
import { TAG_COLORS, FONT_FAMILY } from '../theme';

/**
 * TICKET-010b: still thumbnail from the original background_image + mascot_pose (not a frame
 * cut from the rendered/compressed video) plus a short hook text. `variant` (a/b/c) gives the
 * 2-3 A/B-test candidates the AC asks for — different hook placement/emphasis, same assets.
 */
// The hook text box is a fixed-width area (maxWidth 54% of a 1280px canvas ≈ 690px, ~625px after
// padding) but hookText length varies a lot (deriveHookText allows up to 20 chars + "…"). A fixed
// 76px font only fits ~8 CJK characters per line before wrapping — found 2026-09-14 reviewing a
// real render: a 9-character hook wrapped into "8 chars" + a single orphaned character on its own
// line. Scale the font down as the hook gets longer instead of wrapping at a fixed size.
function hookFontSize(hookText: string): number {
  // Optimized for YouTube's small mobile feed cards: never let a valid hook become fine print.
  // Hooks are capped at 14 CJK characters by the server, so 52px still fits in 2–3 balanced lines.
  return Math.max(52, Math.min(88, Math.round(760 / Math.max(hookText.length, 6))));
}

export const ThumbnailStill: React.FC<ThumbnailStillProps> = ({
  backgroundSrc,
  mascotPoseSrc,
  hookText,
  keywordText,
  benefitText,
  tagColor,
  variant = 'a',
}) => {
  const colors = TAG_COLORS[tagColor];
  const fontSize = hookFontSize(hookText);

  return (
    <AbsoluteFill>
      <Img src={backgroundSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <Img
        src={mascotPoseSrc}
        style={{
          position: 'absolute',
          bottom: '4%',
          left: variant === 'b' ? '52%' : '4%',
          height: '52%',
          filter: 'drop-shadow(0 14px 20px rgba(0,0,0,0.35))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          ...(variant === 'c'
            ? { bottom: '6%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }
            : { top: '6%', left: variant === 'b' ? '4%' : '42%', textAlign: 'left' }),
          maxWidth: '58%',
        }}
      >
        {keywordText && (
          <div style={{
            display: 'inline-block', marginBottom: 14, background: 'rgba(20, 20, 20, 0.82)',
            color: '#fff', fontFamily: FONT_FAMILY, fontSize: 30, fontWeight: 700,
            padding: '8px 18px', borderRadius: 999,
          }}>
            {keywordText}
          </div>
        )}
        <div
          style={{
            display: 'inline-block',
            background: colors.bg,
            color: colors.text,
            fontFamily: FONT_FAMILY,
            fontSize,
            fontWeight: 800,
            lineHeight: 1.15,
            padding: '20px 32px',
            borderRadius: 24,
            boxShadow: '0 10px 24px rgba(0,0,0,0.3)',
            textWrap: 'balance',
          }}
        >
          {hookText}
        </div>
        {benefitText && (
          <div style={{
            display: 'table', marginTop: 14, marginLeft: variant === 'c' ? 'auto' : 0,
            marginRight: variant === 'c' ? 'auto' : 0, background: '#fff', color: '#2d2a26',
            fontFamily: FONT_FAMILY, fontSize: 32, fontWeight: 800, padding: '9px 18px',
            borderRadius: 14, boxShadow: '0 8px 18px rgba(0,0,0,0.28)',
          }}>
            {benefitText}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
