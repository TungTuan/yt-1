import React from 'react';
import { Composition, Still } from 'remotion';
import { LongFormVideo } from './compositions/LongFormVideo';
import { ShortsVideo } from './compositions/ShortsVideo';
import { ThumbnailStill } from './compositions/ThumbnailStill';
import { KrBoriDemo } from './compositions/KrBoriDemo';
import {
  FPS,
  LONG_FORM_END_PADDING_SECONDS,
  SHORTS_END_PADDING_SECONDS,
  longFormVideoSchema,
  shortsVideoSchema,
  thumbnailStillSchema,
  type LongFormVideoProps,
  type ShortsVideoProps,
  type ThumbnailStillProps,
} from './types';

const EMPTY_LONG_FORM: LongFormVideoProps = {
  title: '',
  channelName: 'こもれび便り',
  segmentType: 'morning_news',
  tagColor: 'amber',
  audioSrc: '',
  captionCues: [],
  backgroundSrc: '',
  mascotPoseSrc: '',
  ambientMotion: { setting: 'indoor', season: 'any' },
  bgmSrc: undefined,
  sfxCues: [],
  durationInSeconds: 10,
};

const EMPTY_SHORTS: ShortsVideoProps = {
  title: '',
  channelName: 'こもれび便り',
  tagColor: 'amber',
  audioSrc: '',
  captionCues: [],
  backgroundSrc: '',
  mascotPoseSrc: '',
  ambientMotion: { setting: 'indoor', season: 'any' },
  bgmSrc: undefined,
  sfxCues: [],
  durationInSeconds: 20,
};

const EMPTY_THUMB: ThumbnailStillProps = {
  backgroundSrc: '',
  mascotPoseSrc: '',
  hookText: '',
  tagColor: 'amber',
};

function durationInFrames(seconds: number, paddingSeconds: number): number {
  return Math.max(1, Math.round((seconds + paddingSeconds) * FPS));
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LongForm"
        component={LongFormVideo}
        schema={longFormVideoSchema}
        durationInFrames={durationInFrames(EMPTY_LONG_FORM.durationInSeconds, LONG_FORM_END_PADDING_SECONDS)}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={EMPTY_LONG_FORM}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: durationInFrames(props.durationInSeconds, LONG_FORM_END_PADDING_SECONDS),
        })}
      />
      <Composition
        id="Shorts"
        component={ShortsVideo}
        schema={shortsVideoSchema}
        durationInFrames={durationInFrames(EMPTY_SHORTS.durationInSeconds, SHORTS_END_PADDING_SECONDS)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={EMPTY_SHORTS}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: durationInFrames(props.durationInSeconds, SHORTS_END_PADDING_SECONDS),
        })}
      />
      <Still
        id="Thumbnail"
        component={ThumbnailStill}
        schema={thumbnailStillSchema}
        width={1280}
        height={720}
        defaultProps={EMPTY_THUMB}
      />
      <Composition
        id="KrBoriDemo"
        component={KrBoriDemo}
        durationInFrames={45 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
