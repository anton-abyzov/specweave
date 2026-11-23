import React from 'react';
import {Composition} from 'remotion';
import {SpecWeaveHero} from './SpecWeaveHero';
import {CONFIG} from './lib/theme';
import {YouTubeCompositions} from './youtube/YouTubeRoot';
import {StudioTutorial, STUDIO_TUTORIAL_FRAMES} from './studio-tutorial/StudioTutorial';
import {JoinMachineTutorial, JoinThumbnail, JOIN_TUTORIAL_FRAMES} from './join-tutorial/JoinMachineTutorial';
import {
  ConnectDevicesTutorial,
  ConnectDevicesPoster,
  CONNECT_DEVICES_FRAMES,
  MachinePermissionsTutorial,
  MachinePermissionsPoster,
  MACHINE_PERMISSIONS_FRAMES,
  ConnectTroubleshootingTutorial,
  ConnectTroubleshootingPoster,
  CONNECT_TROUBLESHOOTING_FRAMES,
} from './connect-tutorials/ConnectTutorials';

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
      <Composition
        id="JoinMachineTutorial"
        component={JoinMachineTutorial}
        durationInFrames={JOIN_TUTORIAL_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="JoinThumbnail"
        component={JoinThumbnail}
        durationInFrames={1}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="ConnectDevicesTutorial"
        component={ConnectDevicesTutorial}
        durationInFrames={CONNECT_DEVICES_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ConnectDevicesPoster"
        component={ConnectDevicesPoster}
        durationInFrames={1}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="MachinePermissionsTutorial"
        component={MachinePermissionsTutorial}
        durationInFrames={MACHINE_PERMISSIONS_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="MachinePermissionsPoster"
        component={MachinePermissionsPoster}
        durationInFrames={1}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="ConnectTroubleshootingTutorial"
        component={ConnectTroubleshootingTutorial}
        durationInFrames={CONNECT_TROUBLESHOOTING_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ConnectTroubleshootingPoster"
        component={ConnectTroubleshootingPoster}
        durationInFrames={1}
        fps={30}
        width={1280}
        height={720}
      />
      <YouTubeCompositions />
    </>
  );
};
