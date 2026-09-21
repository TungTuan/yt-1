import { spawn } from 'child_process';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import ffmpegPath from 'ffmpeg-static';
import type { TtsAdapter } from './types';

const SAMPLE_RATE = 24000;

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

/** Decodes an mp3 buffer to 16-bit mono PCM WAV via the bundled ffmpeg-static binary. */
function mp3ToWav(mp3: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath as string, [
      '-hide_banner', '-loglevel', 'error',
      '-i', 'pipe:0',
      '-f', 'wav', '-acodec', 'pcm_s16le', '-ar', String(SAMPLE_RATE), '-ac', '1',
      'pipe:1',
    ]);
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    proc.stdout.on('data', (d) => out.push(d));
    proc.stderr.on('data', (d) => err.push(d));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(out));
      else reject(new Error(`ffmpeg mp3->wav failed (${code}): ${Buffer.concat(err).toString('utf-8')}`));
    });
    proc.stdin.end(mp3);
  });
}

/**
 * TEMPORARY stand-in for market=kr TTS while TYPECAST_API_KEY / TYPECAST_VOICE_ID are unavailable
 * (see typecastAdapter.ts). Uses Microsoft Edge's free "Read Aloud" text-to-speech (via the
 * unofficial `msedge-tts` client — no API key, no account) and transcodes its mp3 output to PCM
 * WAV so it fits concatWavSegments' RIFF/WAVE requirement. Swap `tts/index.ts`'s `kr` adapter
 * back to TypecastAdapter once real Typecast credentials + a chosen voice_id are in place.
 */
export class EdgeTtsAdapter implements TtsAdapter {
  constructor(private readonly voiceName: string = process.env.EDGE_TTS_KR_VOICE ?? 'ko-KR-SunHiNeural') {}

  async synthesizeSegment(text: string): Promise<Buffer> {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(this.voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);
    const mp3 = await streamToBuffer(audioStream);
    tts.close();
    return mp3ToWav(mp3);
  }
}
