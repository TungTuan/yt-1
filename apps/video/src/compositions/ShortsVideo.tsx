import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { ShortsVideoProps } from '../types';
import { KenBurnsBackground } from '../components/KenBurnsBackground';
import { AmbientMotion } from '../components/AmbientMotion';
import { ShortsMascotIntro } from '../components/ShortsMascotIntro';
import { Subtitles } from '../components/Subtitles';
import { AudioLayers } from '../components/AudioLayers';
import { BrandWatermark } from '../components/BrandWatermark';
import { OutroCard } from '../components/OutroCard';
import { ShortsHook } from '../components/ShortsHook';
import { CinematicAtmosphere } from '../components/CinematicAtmosphere';

/**
 * TICKET-009b: 9:16 Shorts composition. Background is the same component as long-form — its
 * objectFit:cover naturally center-crops a 16:9 source to fill a 9:16 canvas (the mechanism the
 * AC specifies), as long as the source is aspect_safe_crop (enforced at asset-selection time,
 * not here).
 */
export const ShortsVideo: React.FC<ShortsVideoProps> = ({
  title,
  channelName,
  tagColor,
  audioSrc,
  captionCues,
  backgroundSrc,
  mascotPoseSrc,
  ambientMotion,
  bgmSrc,
  sfxCues,
}) => {
  return (
    <AbsoluteFill>
      <KenBurnsBackground src={backgroundSrc} />
      <AmbientMotion {...ambientMotion} />
      <CinematicAtmosphere vertical />
      <ShortsMascotIntro src={mascotPoseSrc} />
      <Subtitles cues={captionCues} bottomFraction={0.16} fontSize={40} />
      <ShortsHook title={title} tagColor={tagColor} />
      <BrandWatermark channelName={channelName} vertical />
      <AudioLayers voiceSrc={audioSrc} captionCues={captionCues} bgmSrc={bgmSrc} sfxCues={sfxCues} />
      <OutroCard channelName={channelName} mascotSrc={mascotPoseSrc} audioDurationSeconds={captionCues.at(-1)?.endSeconds ?? 0} vertical />
    </AbsoluteFill>
  );
};
