/**
 * YouTube B-Roll Compositions
 *
 * Each composition is a standalone clip for video editing.
 * Render individually: remotion render remotion/index.ts broll-ColdOpen out/cold-open.mp4
 */
import React from 'react';
import {Composition} from 'remotion';
import {VIDEO} from './constants';

import {ColdOpenTypewriter, COLD_OPEN_DURATION} from './scenes/ColdOpenTypewriter';
import {CommitTimelapse, COMMIT_TIMELAPSE_DURATION} from './scenes/CommitTimelapse';
import {StatsCounter, STATS_COUNTER_DURATION} from './scenes/StatsCounter';
import {AppShowcaseGrid, APP_SHOWCASE_DURATION} from './scenes/AppShowcaseGrid';
import {SocialGrowthChart, SOCIAL_GROWTH_DURATION} from './scenes/SocialGrowthChart';
import {LayerDiagram, LAYER_DIAGRAM_DURATION} from './scenes/LayerDiagram';
import {IncrementFlow, INCREMENT_FLOW_DURATION} from './scenes/IncrementFlow';
import {AutoModeCycle, AUTO_MODE_DURATION} from './scenes/AutoModeCycle';
import {QualityGates, QUALITY_GATES_DURATION} from './scenes/QualityGates';
import {AgentSwarm, AGENT_SWARM_DURATION} from './scenes/AgentSwarm';
import {CTASteps, CTA_STEPS_DURATION} from './scenes/CTASteps';

export const YouTubeCompositions: React.FC = () => {
  return (
    <>
      {/* Cold Open Section (0:00 – 1:30) */}
      <Composition
        id="broll-ColdOpen"
        component={ColdOpenTypewriter}
        durationInFrames={COLD_OPEN_DURATION}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />

      <Composition
        id="broll-CommitTimelapse"
        component={CommitTimelapse}
        durationInFrames={COMMIT_TIMELAPSE_DURATION}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />

      {/* The Proof Section (1:30 – 4:00) */}
      <Composition
        id="broll-StatsCounter"
        component={StatsCounter}
        durationInFrames={STATS_COUNTER_DURATION}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />

      <Composition
        id="broll-SocialGrowth"
        component={SocialGrowthChart}
        durationInFrames={SOCIAL_GROWTH_DURATION}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />

      {/* Portfolio Section (4:00 – 14:00) */}
      <Composition
        id="broll-AppGrid"
        component={AppShowcaseGrid}
        durationInFrames={APP_SHOWCASE_DURATION}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />

      {/* What Is SpecWeave (14:00 – 18:00) */}
      <Composition
        id="broll-LayerDiagram"
        component={LayerDiagram}
        durationInFrames={LAYER_DIAGRAM_DURATION}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />

      {/* Core Workflow (26:00 – 38:00) */}
      <Composition
        id="broll-IncrementFlow"
        component={IncrementFlow}
        durationInFrames={INCREMENT_FLOW_DURATION}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />

      <Composition
        id="broll-AutoMode"
        component={AutoModeCycle}
        durationInFrames={AUTO_MODE_DURATION}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />

      <Composition
        id="broll-QualityGates"
        component={QualityGates}
        durationInFrames={QUALITY_GATES_DURATION}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />

      {/* Agent Swarms (56:00 – 62:00) */}
      <Composition
        id="broll-AgentSwarm"
        component={AgentSwarm}
        durationInFrames={AGENT_SWARM_DURATION}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />

      {/* Closing (68:00 – 72:00) */}
      <Composition
        id="broll-CTASteps"
        component={CTASteps}
        durationInFrames={CTA_STEPS_DURATION}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
    </>
  );
};
