import fs from 'fs';
import path from 'path';
import type { Market } from '@komorebi/shared-types';

const EXPORT_ROOT = process.env.EXPORT_ROOT
  ? path.resolve(process.env.EXPORT_ROOT)
  : path.resolve(__dirname, '..', '..', '..', '..', '..', 'exports');

/** Copies a completed render to a host-visible, date-organized export directory. */
export function exportRenderedVideo(
  sourcePath: string,
  scheduledDate: Date,
  market: Market,
): string {
  const date = scheduledDate.toISOString().slice(0, 10);
  const destinationDir = path.join(EXPORT_ROOT, date, market, 'videos');
  const destinationPath = path.join(destinationDir, path.basename(sourcePath));
  fs.mkdirSync(destinationDir, { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);
  return destinationPath;
}

/** Copies generated thumbnail files beside the host-visible video export. */
export function exportRenderedThumbnails(
  sourcePaths: string[],
  scheduledDate: Date,
  market: Market,
): string[] {
  const date = scheduledDate.toISOString().slice(0, 10);
  const destinationDir = path.join(EXPORT_ROOT, date, market, 'thumbnails');
  fs.mkdirSync(destinationDir, { recursive: true });
  return sourcePaths.map((sourcePath) => {
    const destinationPath = path.join(destinationDir, path.basename(sourcePath));
    fs.copyFileSync(sourcePath, destinationPath);
    return destinationPath;
  });
}
