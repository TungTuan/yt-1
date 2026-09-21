import express from 'express';
import cors from 'cors';
import path from 'path';
import { contentRouter } from './routes/content';
import { errorHandler } from './middleware/errorHandler';
import { CONTENT_SOURCE_MODE } from './config';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  // Serves public/ at root — asset_library.file_path (e.g. /assets/mascot/standing.png) and
  // audio_library.file_path (e.g. /audio/bgm/jp/warm_morning.mp3) are both public/-relative.
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Serves generated audio/video/thumbnails (storage/) — the Remotion render pipeline (EPIC 5)
  // reads these back over HTTP (headless Chrome fetches src URLs, not local file paths).
  app.use('/media', express.static(path.join(__dirname, '..', 'storage')));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, contentSourceMode: CONTENT_SOURCE_MODE });
  });

  app.use('/api/content', contentRouter);

  app.use(errorHandler);

  return app;
}
