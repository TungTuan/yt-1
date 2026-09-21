import type { TtsAdapter } from './types';

/**
 * VOICEVOX Engine adapter (market=jp). Talks to a self-hosted VOICEVOX Engine instance
 * (https://github.com/VOICEVOX/voicevox_engine — run via Docker, e.g.
 * `docker run -p 50021:50021 voicevox/voicevox_engine:cpu-latest`) over its local HTTP API:
 * `POST /audio_query` (returns a query object) then `POST /synthesis` (returns WAV bytes).
 * Requires Node >= 18 for global `fetch`.
 */
export class VoicevoxAdapter implements TtsAdapter {
  constructor(
    private readonly baseUrl: string = process.env.VOICEVOX_URL ?? 'http://localhost:50021',
    // Komachi production voice: No.7 読み聞かせ (speaker 31).
    private readonly speakerId: number = Number(process.env.VOICEVOX_SPEAKER_ID ?? 31),
  ) {}

  async synthesizeSegment(text: string): Promise<Buffer> {
    const queryUrl = new URL('/audio_query', this.baseUrl);
    queryUrl.searchParams.set('text', text);
    queryUrl.searchParams.set('speaker', String(this.speakerId));

    let queryRes: Response;
    try {
      queryRes = await fetch(queryUrl, { method: 'POST' });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`VOICEVOX is unavailable at ${this.baseUrl}. Start the engine before rendering. ${detail}`);
    }
    if (!queryRes.ok) {
      throw new Error(`VOICEVOX /audio_query failed: ${queryRes.status} ${await queryRes.text()}`);
    }
    const audioQuery = await queryRes.json();

    const synthUrl = new URL('/synthesis', this.baseUrl);
    synthUrl.searchParams.set('speaker', String(this.speakerId));

    const synthRes = await fetch(synthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(audioQuery),
    });
    if (!synthRes.ok) {
      throw new Error(`VOICEVOX /synthesis failed: ${synthRes.status} ${await synthRes.text()}`);
    }
    return Buffer.from(await synthRes.arrayBuffer());
  }
}
