import path from 'path';
import { bundle } from '@remotion/bundler';

// Entry point of the sibling @komorebi/video Remotion project — a filesystem path, not an
// installed package (no build step; @remotion/bundler webpack-bundles the TSX directly).
const VIDEO_ENTRY = path.resolve(__dirname, '..', '..', '..', '..', 'video', 'src', 'index.ts');

let bundleLocationPromise: Promise<string> | null = null;

/** Bundles apps/video once per server process and reuses the result for every render. */
export function getBundleLocation(): Promise<string> {
  if (!bundleLocationPromise) {
    bundleLocationPromise = bundle({ entryPoint: VIDEO_ENTRY }).catch((err) => {
      bundleLocationPromise = null; // allow retry on next call instead of caching a failure
      throw err;
    });
  }
  return bundleLocationPromise;
}
