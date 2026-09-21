import fs from 'fs';
import path from 'path';
import { SERVER_PORT } from '../../config';

const PUBLIC_ROOT = path.resolve(__dirname, '..', '..', '..', 'public');
const STORAGE_ROOT = path.resolve(__dirname, '..', '..', '..', 'storage');

const RENDER_BASE_URL = (process.env.RENDER_BASE_URL ?? `http://localhost:${SERVER_PORT}`).replace(/\/$/, '');
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL ?? '').replace(/\/$/, '');

/** asset_library.filePath values look like "/assets/backgrounds/jp/...png" -> absolute URL. */
export function assetUrl(filePath: string): string {
  return `${RENDER_BASE_URL}${filePath}`;
}

/** ttsService audio_path is an absolute filesystem path under storage/ -> served at /media/... */
export function storageUrl(absoluteFilePath: string): string {
  const rel = path.relative(STORAGE_ROOT, absoluteFilePath);
  return `${RENDER_BASE_URL}/media/${rel.split(path.sep).join('/')}`;
}

/**
 * audio_library.filePath (e.g. "/audio/bgm/jp/warm_morning.mp3") is a *planned* location — real
 * files aren't delivered yet (TICKET-006b, still manual/pending). Returns a URL only when the
 * file actually exists on disk, so a render never fails over a still-missing BGM/SFX asset; it
 * just proceeds without it.
 */
export function optionalAssetUrl(filePath: string): string | undefined {
  const onDisk = path.join(PUBLIC_ROOT, filePath.replace(/^\//, ''));
  return fs.existsSync(onDisk) ? assetUrl(filePath) : undefined;
}

/**
 * Converts a content_item's *Path field (audioPath/videoPath/thumbnailPath — absolute filesystem
 * paths under storage/, e.g. what pipeline.ts writes) into a playable /media/... URL for the
 * dashboard, or null when there's nothing to show yet (field unset) or the file went missing
 * since the DB row was written. Never throws — a dashboard preview shouldn't 500 the whole list
 * over one stale row.
 */
export function toMediaUrl(absoluteFilePath: string | null): string | null {
  if (!absoluteFilePath) return null;
  try {
    if (!fs.existsSync(absoluteFilePath)) return null;
    const rel = path.relative(STORAGE_ROOT, absoluteFilePath).split(path.sep).join('/');
    return `${PUBLIC_BASE_URL}/media/${rel}`;
  } catch {
    return null;
  }
}
