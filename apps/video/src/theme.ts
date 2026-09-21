import type { TagColor } from './types';

export const TAG_COLORS: Record<TagColor, { bg: string; text: string; soft: string }> = {
  amber: { bg: '#d98c3f', text: '#3a2409', soft: '#f6dcb3' },
  sage: { bg: '#7f9470', text: '#20281a', soft: '#dbe4d1' },
  indigo: { bg: '#4b5a86', text: '#eef0fb', soft: '#c9d0e8' },
};

export const PALETTE = {
  cream: '#faf6ee',
  ink: '#2d2a26',
  panel: 'rgba(45, 42, 38, 0.68)',
  panelText: '#fdfaf3',
};

export const FONT_FAMILY =
  "'Zen Maru Gothic', 'Noto Sans KR', 'Hiragino Maru Gothic Pro', system-ui, sans-serif";
