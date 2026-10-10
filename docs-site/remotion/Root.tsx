import React from 'react';
import {Composition} from 'remotion';
import {SpecWeaveHero} from './SpecWeaveHero';
import {CONFIG} from './lib/theme';
import {YouTubeCompositions} from './youtube/YouTubeRoot';
import {StudioTutorial, STUDIO_TUTORIAL_FRAMES} from './studio-tutorial/StudioTutorial';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SpecWeaveHero"
        component={SpecWeaveHero}
        durationInFrames={CONFIG.durationInFrames}
        fps={CONFIG.fps}
        width={CONFIG.width}
        height={CONFIG.height}
      />
      <Composition
        id="StudioTutorial"
        component={StudioTutorial}
        durationInFrames={STUDIO_TUTORIAL_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <YouTubeCompositions />
    </>
  );
};
