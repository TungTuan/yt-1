# Video quality review — 2026-09-14

Reviewed against `komorebi-app-spec.md` using the six rendered JP videos for 2026-09-21.

## Implemented in this pass

- Long-form intro now identifies the channel above the episode title.
- Captions paginate into short readable phrases instead of showing an entire long narration block.
- A subtle persistent channel watermark is present on long-form and Shorts.
- Long-form reserves an 8-second branded end-screen window; Shorts use a 2-second closing card.
- Shorts show a clear title hook in the first 2.8 seconds.
- Quiz cards display all choices and reveal the correct answer in sync with the narration.
- Existing calm Ken Burns, mascot bob, dust/seasonal particles, steam, lamp and weather effects remain.

## Content findings

- `morning_news`: strong structure and warm tone. Historical facts must be source-checked before upload.
- `quiz`: five questions exist and are timed correctly. The current narration asks each question and gives
  a hint/answer, but does not read all four choices aloud. The visual now supplies the choices; future scripts
  should explicitly narrate them if the content brief requires fully audio-only accessibility.
- `nostalgia`: sensory detail and comment prompt are strong. Some sections drift away from the title into
  broad school memories; future episodes should keep at least 70% of the runtime tightly connected to the
  promised thumbnail/title topic.
- `bedtime_story`: calm and coherent, with a clear serialized ending. Keep conflict low and avoid a loud CTA;
  the visual outro appears only after narration has finished.

## Still blocked by real assets or external setup

- Licensed BGM and the three signature SFX files are not present. The composition already supports automatic
  voice ducking and cue timing, but intentionally skips missing files rather than inventing unlicensed audio.
- YouTube upload, end-screen placement, channel customization and thumbnail A/B testing require YouTube Studio
  or OAuth credentials and are not performed by this local render pass.
- The JP VOICEVOX speaker remains a placeholder until the final Komachi voice is selected.

