import { createApp } from './app';
import { SERVER_PORT } from './config';
import { startYouTubeUploadScheduler } from './services/youtube/scheduler';

const app = createApp();

app.listen(SERVER_PORT, () => {
  console.log(`[server] listening on http://localhost:${SERVER_PORT}`);
  startYouTubeUploadScheduler();
});
