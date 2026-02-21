import React from 'react';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {Scene1Problem} from './scenes/Scene1Problem';
import {Scene2Scanner} from './scenes/Scene2Scanner';
import {Scene3ThreeTiers} from './scenes/Scene3ThreeTiers';
import {Scene4InstallFlow} from './scenes/Scene4InstallFlow';
import {Scene5ShipSafely} from './scenes/Scene5ShipSafely';

/**
 * SpecWeave Hero Video: "From Chaos to Trust"
 *
 * Scene layout with 30-frame crossfade overlaps:
 *   Scene 1 (270f) → Scene 2 (300f) → Scene 3 (300f) → Scene 4 (330f) → Scene 5 (270f)
 *   Total = 1470 - 4×30 = 1350 frames (45s @ 30fps)
 */
const FADE_DURATION = 30;

export const SpecWeaveHero: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={270}>
        <Scene1Problem />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({durationInFrames: FADE_DURATION})}
      />

      <TransitionSeries.Sequence durationInFrames={300}>
        <Scene2Scanner />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({durationInFrames: FADE_DURATION})}
      />

      <TransitionSeries.Sequence durationInFrames={300}>
        <Scene3ThreeTiers />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({durationInFrames: FADE_DURATION})}
      />

      <TransitionSeries.Sequence durationInFrames={330}>
        <Scene4InstallFlow />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({durationInFrames: FADE_DURATION})}
      />

      <TransitionSeries.Sequence durationInFrames={270}>
        <Scene5ShipSafely />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
