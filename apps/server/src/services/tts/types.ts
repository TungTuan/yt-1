/** One [PAUSE]-delimited segment of the script, with its position in the final audio file. */
export interface TimingSegment {
  text: string;
  startSeconds: number;
  endSeconds: number;
}

export interface TtsResult {
  audioPath: string;
  durationSeconds: number;
  timingData: TimingSegment[];
}

/** One market's TTS engine adapter — returns raw WAV bytes for a single (no-[PAUSE]) segment. */
export interface TtsAdapter {
  synthesizeSegment(text: string): Promise<Buffer>;
}
