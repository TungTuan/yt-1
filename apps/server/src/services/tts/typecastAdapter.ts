import type { TtsAdapter } from './types';

/**
 * Typecast adapter (market=kr). ⚠️ UNVERIFIED — unlike VoicevoxAdapter (a well-documented, stable
 * local API), Typecast is a hosted commercial service and I do not have verified, current
 * documentation or a live account to confirm this request/response shape against. The endpoint,
 * auth header, and field names below are a best-effort placeholder — check them against
 * https://typecast.ai/en/api-console or your account's API docs before relying on this adapter,
 * and update this file (the TtsAdapter interface / TtsService using it does not need to change).
 *
 * Also per TICKET-006 AC: Typecast's free tier is rate/length-limited and requires attribution
 * for non-commercial use; a paid plan is needed for commercial use (unlike VOICEVOX, which is
 * free either way) — factor that into the kr channel's budget.
 */
export class TypecastAdapter implements TtsAdapter {
  constructor(
    private readonly apiKey: string | undefined = process.env.TYPECAST_API_KEY,
    private readonly baseUrl: string = process.env.TYPECAST_BASE_URL ?? 'https://api.typecast.ai/v1',
    // TODO: replace with the actual voice/actor id picked for 보리 (Bori).
    private readonly voiceId: string = process.env.TYPECAST_VOICE_ID ?? 'REPLACE_ME',
  ) {}

  async synthesizeSegment(text: string): Promise<Buffer> {
    if (!this.apiKey) {
      throw new Error(
        'TYPECAST_API_KEY is not set. Required for market=kr TTS (TICKET-006) — get one from https://typecast.ai/en/api-console.',
      );
    }

    const res = await fetch(new URL('/text-to-speech', this.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO(verify): confirm the auth header name/scheme against current Typecast API docs.
        'X-API-KEY': this.apiKey,
      },
      body: JSON.stringify({
        text,
        voice_id: this.voiceId,
        output_format: 'wav',
      }),
    });

    if (!res.ok) {
      throw new Error(
        `Typecast TTS request failed: ${res.status} ${await res.text()} — this adapter is unverified, check the request shape against current Typecast docs`,
      );
    }
    return Buffer.from(await res.arrayBuffer());
  }
}
