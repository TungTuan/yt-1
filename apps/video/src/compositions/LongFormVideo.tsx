import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { LongFormVideoProps } from '../types';
import { SceneBackgrounds } from '../components/SceneBackgrounds';
import { MascotTimeline } from '../components/MascotTimeline';
import { CinematicAtmosphere } from '../components/CinematicAtmosphere';
import { ContentVisuals } from '../components/ContentVisuals';
import { Subtitles } from '../components/Subtitles';
import { TitleCard } from '../components/TitleCard';
import { QuizOverlay } from '../components/QuizOverlay';
import { AudioLayers } from '../components/AudioLayers';
import { OpeningFade } from '../components/OpeningFade';
import { BrandWatermark } from '../components/BrandWatermark';
import { OutroCard } from '../components/OutroCard';

/**
 * TICKET-009: the 16:9 long-form composition, one parameterized template for all 7 segment
 * types. Layer order per spec AC: background -> mascot_pose -> overlay_card (quiz only) ->
 * subtitles -> title.
 */
export const LongFormVideo: React.FC<LongFormVideoProps> = ({
  title,
  channelName,
  tagColor,
  audioSrc,
  captionCues,
  backgroundSrc,
  backgroundScenes,
  mascotPoseSrc,
  mascotCues,
  visualCues,
  overlay,
  ambientMotion,
  bgmSrc,
  sfxCues,
}) => {
  return (
    <AbsoluteFill>
      <SceneBackgrounds fallbackSrc={backgroundSrc} scenes={backgroundScenes} fallbackAmbient={ambientMotion} />
      <CinematicAtmosphere />
      <MascotTimeline fallbackSrc={mascotPoseSrc} cues={mascotCues} />
      {!overlay && <ContentVisuals cues={visualCues} tagColor={tagColor} />}
      {overlay && <QuizOverlay overlay={overlay} />}
      <Subtitles cues={captionCues} />
      <TitleCard title={title} channelName={channelName} tagColor={tagColor} />
      <BrandWatermark channelName={channelName} />
      <AudioLayers voiceSrc={audioSrc} captionCues={captionCues} bgmSrc={bgmSrc} sfxCues={sfxCues} />
      <OpeningFade />
      <OutroCard channelName={channelName} mascotSrc={mascotPoseSrc} audioDurationSeconds={captionCues.at(-1)?.endSeconds ?? 0} />
    </AbsoluteFill>
  );
};
