import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { CaptionCue } from '../types';
import { PALETTE, FONT_FAMILY } from '../theme';

interface Props {
  cues: CaptionCue[];
  /** Bottom offset as a fraction of frame height — Shorts needs it higher to clear UI chrome. */
  bottomFraction?: number;
  fontSize?: number;
}

const FADE_SECONDS = 0.25;
const MAX_CHARS_PER_PAGE = 52;

function splitReadablePages(text: string): string[] {
  const sentences = text.match(/[^。！？!?]+[。！？!?]?/g) ?? [text];
  const pages: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > MAX_CHARS_PER_PAGE) {
      pages.push(current.trim());
      current = '';
    }
    if (sentence.length <= MAX_CHARS_PER_PAGE) {
      current += sentence;
      continue;
    }
    if (current) pages.push(current.trim());
    for (let i = 0; i < sentence.length; i += MAX_CHARS_PER_PAGE) {
      pages.push(sentence.slice(i, i + MAX_CHARS_PER_PAGE).trim());
    }
    current = '';
  }
  if (current.trim()) pages.push(current.trim());
  return pages.filter(Boolean);
}

/** Bottom caption panel, one [PAUSE]-delimited segment active at a time (TICKET-009 AC). */
export const Subtitles: React.FC<Props> = ({ cues, bottomFraction = 0.1, fontSize = 40 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const active = cues.find((c) => t >= c.startSeconds && t <= c.endSeconds);
  if (!active) return null;

  const pages = splitReadablePages(active.text);
  const cueProgress = Math.max(0, Math.min(0.999, (t - active.startSeconds) / Math.max(0.01, active.endSeconds - active.startSeconds)));
  const page = pages[Math.min(pages.length - 1, Math.floor(cueProgress * pages.length))] ?? active.text;

  const fadeIn = interpolate(t, [active.startSeconds, active.startSeconds + FADE_SECONDS], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(t, [active.endSeconds - FADE_SECONDS, active.endSeconds], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <div
      style={{
        position: 'absolute',
        left: '6%',
        right: '6%',
        bottom: `${bottomFraction * 100}%`,
        display: 'flex',
        justifyContent: 'center',
        opacity,
      }}
    >
      <div
        style={{
          background: PALETTE.panel,
          color: PALETTE.panelText,
          fontFamily: FONT_FAMILY,
          fontSize,
          lineHeight: 1.4,
          padding: '18px 32px',
          borderRadius: 20,
          textAlign: 'center',
          maxWidth: '82%',
          minWidth: '34%',
          boxShadow: '0 8px 26px rgba(0,0,0,0.18)',
        }}
      >
        {page}
      </div>
    </div>
  );
};
