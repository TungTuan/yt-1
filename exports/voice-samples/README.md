# Komachi VOICEVOX comparison

All samples use the same Japanese text and synthesis settings (`speedScale=0.93`,
`intonationScale=0.92`) so differences mainly come from the voice/style.

## Recommendation

1. **Kyushu Sora — Normal (speaker 16): recommended channel-wide default.** Warm, softer and
   more mature than the current Kasukabe Tsumugi voice while retaining enough clarity for quiz,
   morning news and long narration. Official credit: `VOICEVOX:九州そら`.
2. **No.7 — Storytelling (speaker 31): best storytelling delivery, conditional license.** Strong
   fit for bedtime stories, but its commercial-use terms require more care than Kyushu Sora.
   Individual streaming/ad revenue is allowed with credit; other commercial use requires prior
   consultation. Official credit: `VOICEVOX:No.7`.
3. **Mochiko — Leisurely (speaker 80): very calm but too slow for one universal voice.** Better as
   a bedtime-only option. Its additional terms need careful review, especially for commercial or
   audio-work-like content. Official credit: `VOICEVOX:もち子(cv 明日葉よもぎ)`.
4. **Shikoku Metan — Whisper (speaker 36): intimate but less clear for older listeners.** Suitable
   only for occasional bedtime passages. Official credit: `VOICEVOX:四国めたん`.
5. **Kasukabe Tsumugi — Normal (speaker 8): current baseline.** Clear and fast, but reads younger
   and brighter than the channel's calm 50–70 audience positioning. Official credit:
   `VOICEVOX:春日部つむぎ`.

Do not change production configuration until the operator listens to the A/B samples. Once a
voice is selected, set `VOICEVOX_SPEAKER_ID` and regenerate all audio before final publishing.

