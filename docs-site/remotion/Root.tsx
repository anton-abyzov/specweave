import React from 'react';
import {Composition} from 'remotion';
import {SpecWeaveHero} from './SpecWeaveHero';
import {CONFIG} from './lib/theme';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="SpecWeaveHero"
      component={SpecWeaveHero}
      durationInFrames={CONFIG.durationInFrames}
      fps={CONFIG.fps}
      width={CONFIG.width}
      height={CONFIG.height}
    />
  );
};
