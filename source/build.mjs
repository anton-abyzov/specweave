import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const project=path.dirname(fileURLToPath(import.meta.url));
const duration=44.5, switchAt=33.35, switchEnd=switchAt+9.56;
const beats=[
 {start:0,end:6.15,text:'Ask for the result. Recorded run · 7 October 2026.'},
 {start:6.15,end:12.26,text:'One file changed. Its exact contents verified.'},
 {start:12.26,end:21,text:'Expand the agent’s recorded tool execution.'},
 {start:21,end:26.56,text:'Inspect successful output from the original run.'},
 {start:26.56,end:33.625,text:'Open the file diff and verify the recorded change.'},
 {start:33.625,end:40.9,text:'Changing providers: portable chat context, separate cache and runtime.'},
 {start:40.9,end:duration,text:'Switching UI demonstration · no provider turn.'},
];
const callouts=[
 {id:'request',start:0,end:6.15,step:'01 / REQUEST',title:['Let the','agent work.'],body:'Start with the result you want.'},
 {id:'complete',start:6.15,end:12.26,step:'02 / RESULT',title:['The work.','The evidence.'],body:'A completed task you can inspect.'},
 {id:'tools',start:12.26,end:21,step:'03 / TOOL EXECUTION',title:['See what','happened.'],body:'Expand the actual recorded command.'},
 {id:'output',start:21,end:26.56,step:'04 / VERIFIED OUTPUT',title:['Check the','result.'],body:'Successful tool output stays with the task.'},
 {id:'diff',start:26.56,end:33.625,step:'05 / FILE CHANGE',title:['Inspect','the change.'],body:'Review the recorded file diff.'},
 {id:'switch',start:33.625,end:41.65,step:'06 / MODEL SWITCH',title:['Switch with','context.'],body:'Review the cache and runtime warning.'},
 {id:'ending',start:41.65,end:duration,step:'SPECWEAVE STUDIO',title:['Ask. Inspect.','Verify.'],body:'Follow the work in your browser.'},
];
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const calloutHtml=callouts.map(c=>`<div id="callout-${c.id}" class="clip callout" data-start="${c.start}" data-duration="${c.end-c.start}" data-track-index="2"><div id="copy-${c.id}" class="copy"><div class="step">${escape(c.step)}</div><div class="headline">${c.title.map(t=>`<span class="line" data-layout-allow-overlap>${escape(t)}</span>`).join('')}</div><p>${escape(c.body)}</p></div></div>`).join('\n');
const captionHtml=beats.map((b,i)=>`<div id="caption-${i}" class="clip caption" data-start="${b.start}" data-duration="${b.end-b.start}" data-track-index="3"><span>${escape(b.text)}</span></div>`).join('\n');
const automation=escape(JSON.stringify({version:1,lanes:[{target:'volume',points:[{t:0,v:0},{t:.35,v:1},{t:42.5,v:1},{t:44.5,v:0}]}]}));
const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>SpecWeave Studio · follow the work</title>
<style>
@font-face{font-family:StudioSans;src:url('assets/inter-400.woff2') format('woff2');font-weight:400;font-display:block}
@font-face{font-family:StudioSans;src:url('assets/inter-700.woff2') format('woff2');font-weight:700;font-display:block}
@font-face{font-family:StudioSans;src:url('assets/inter-800.woff2') format('woff2');font-weight:800;font-display:block}
*{box-sizing:border-box}body{margin:0;overflow:hidden;background:#100f0e;font-family:StudioSans,system-ui,sans-serif;color:#f7f2e9}#root{position:relative;width:100%;height:100%;overflow:hidden;background:#100f0e}.atmosphere{position:absolute;inset:0;overflow:hidden}.glow{position:absolute;width:1100px;height:1100px;border-radius:50%;background:radial-gradient(circle,rgba(216,91,41,.25),rgba(216,91,41,0) 66%);left:-460px;top:-480px}.glow2{left:1320px;top:550px;background:radial-gradient(circle,rgba(216,91,41,.17),rgba(216,91,41,0) 68%)}.edge{position:absolute;left:72px;right:72px;top:89px;height:2px;background:#42352e}.header{position:absolute;left:72px;right:72px;top:30px;height:50px;z-index:50}.brand{font-size:30px;font-weight:700;letter-spacing:-.04em}.provenance{position:absolute;right:0;top:0;height:48px;border:1px solid #615047;border-radius:24px;padding:11px 22px;background:#221b17;font-size:21px;font-weight:700;letter-spacing:.015em;color:#ffd9b5}.depth-stage{position:absolute;left:240px;top:110px;width:1440px;height:900px;perspective:1800px;transform-style:preserve-3d}.surface{position:absolute;inset:0;border:2px solid #6b574b;border-radius:26px;box-shadow:0 36px 100px rgba(0,0,0,.48);overflow:hidden;transform-style:preserve-3d;background:#f8fafc}.viewport{position:absolute;inset:0;overflow:hidden}.strip{position:absolute;inset:0;filter:url('#whip-motion-blur');will-change:transform,filter}.panel{position:absolute;inset:0;width:1440px;height:900px;overflow:hidden;background:#f8fafc}.after{left:1440px}.camera{position:absolute;inset:0;width:1440px;height:900px;transform-origin:0 0;will-change:transform}.camera video,.camera img{position:absolute;inset:0;width:1440px;height:900px;object-fit:contain}.seam{position:absolute;left:1437px;top:0;bottom:0;width:6px;background:#e87745;pointer-events:none}.output-ring{position:absolute;left:477px;top:517px;width:648px;height:30px;border:2px solid #e87745;border-radius:7px;pointer-events:none;opacity:0}.callout{position:absolute;left:64px;top:366px;width:490px;z-index:30}.copy{opacity:0;position:relative;padding:28px 30px 32px;background:#191511;box-shadow:0 14px 40px rgba(0,0,0,.3);border:1px solid #5b4738;border-radius:24px}.step{font-size:21px;letter-spacing:.07em;color:#f3a171;font-weight:700;margin-bottom:23px}.headline{font-size:66px;line-height:1.03;font-weight:800;letter-spacing:-.05em}.line{opacity:0;display:block;white-space:nowrap}.copy p{font-size:25px;line-height:1.4;color:#e4d6c9;max-width:365px;margin:24px 0 0}.caption{position:absolute;left:74px;right:74px;bottom:22px;font-size:24px;line-height:1.3;color:#f4e7dc;z-index:50}.caption span{display:block}.progress{position:absolute;left:74px;right:74px;bottom:66px;height:3px;background:#48372c;z-index:45}.progress-fill{height:3px;background:#e87745;transform-origin:0 50%}.credit{position:absolute;right:74px;bottom:73px;font-size:17px;color:#cbb6a4;z-index:50;letter-spacing:.02em}
</style><script src="assets/gsap.min.js"></script></head><body>
<div id="root" data-composition-id="studio-motion-v2" data-width="1920" data-height="1080" data-duration="${duration}">
<div class="atmosphere"><div id="ambient-glow" class="glow" data-layout-allow-overflow></div><div id="ambient-glow-secondary" class="glow glow2" data-layout-allow-overflow></div><div class="edge"></div></div>
<div class="header"><span class="brand">SpecWeave Studio</span><div id="recorded-date" class="clip provenance" data-start="0" data-duration="33.625" data-track-index="4">RECORDED RUN · 7 OCTOBER 2026</div><div id="switching-scope" class="clip provenance" data-start="33.625" data-duration="${duration-33.625}" data-track-index="4">SWITCHING UI DEMONSTRATION · NO PROVIDER TURN</div></div>
<div class="depth-stage"><div id="browser-surface" class="surface"><div class="viewport"><svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs><filter id="whip-motion-blur" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur id="whip-blur-node" in="SourceGraphic" stdDeviation="0 0"/></filter></defs></svg><div id="shared-strip" class="strip" data-layout-allow-overflow>
<div class="panel before" data-layout-allow-overflow><div id="native-camera" class="camera" data-layout-allow-overflow><video id="native-footage" class="clip" src="assets/recorded-run.mp4" muted playsinline data-start="0" data-duration="34.112241459" data-media-start="2.607758541" data-track-index="0"></video><div id="native-output-ring" class="output-ring"></div></div></div>
<div class="panel after" data-layout-allow-overflow><div id="switch-camera" class="camera" data-layout-allow-overflow><video id="switch-footage" class="clip" src="assets/model-switch-confirmation.mp4" muted playsinline data-start="${switchAt}" data-duration="9.56" data-track-index="0"></video><img id="switch-tail-hold" class="clip" src="assets/switch-final-hold.png" data-start="${switchEnd}" data-duration="${duration-switchEnd}" data-track-index="0"></div></div>
<div id="transition-seam" class="seam"></div></div></div></div></div>
${calloutHtml}
${captionHtml}
<div class="progress"><div id="progress-fill" class="progress-fill"></div></div><div class="credit">Music: Make Funk · HoliznaCC0 · CC0</div>
<audio id="music-bed" class="clip" src="assets/music-normalized-44_5.wav" data-start="0" data-duration="${duration}" data-volume="1" data-timeline-role="music" data-track-index="5" data-automation="${automation}"></audio>
</div>
<script>
window.__timelines = window.__timelines || {};
const tl=gsap.timeline({paused:true});
// One dimensional browser card; all focus changes preserve the same actual footage.
tl.fromTo('#browser-surface',{x:360,y:90,z:-210,rotationY:-13,rotationX:7,rotation:-4,scale:.82,opacity:.15},{x:0,y:0,z:0,rotationY:0,rotationX:0,rotation:0,scale:1,opacity:1,duration:1.8,ease:'power3.out'},0);
tl.fromTo('#ambient-glow',{x:0,y:0,scale:1},{x:110,y:65,scale:1.15,duration:44.5,ease:'sine.inOut'},0);
tl.fromTo('#ambient-glow-secondary',{x:0,y:0,scale:1},{x:-130,y:-80,scale:1.2,duration:44.5,ease:'sine.inOut'},0);
tl.fromTo('#progress-fill',{scaleX:0},{scaleX:1,duration:44.5,ease:'none'},0);
tl.set('#native-camera',{x:0,y:0,scale:1},0);
tl.addLabel('request-focus',2.5).to('#native-camera',{x:-600,y:140,scale:1.6,duration:1.1,ease:'power3.inOut'},2.5);
tl.addLabel('completion-focus',6.15).to('#native-camera',{x:-575,y:20,scale:1.7,duration:.8,ease:'power2.inOut'},6.15);
tl.addLabel('tool-focus',12.26).to('#native-camera',{x:-500,y:-200,scale:1.75,duration:1.1,ease:'power3.inOut'},12.26);
tl.addLabel('output-focus',21).to('#native-camera',{x:-630,y:-300,scale:1.85,duration:1,ease:'power2.inOut'},21);
tl.fromTo('#native-output-ring',{opacity:0,scaleX:.6},{opacity:1,scaleX:1,duration:.5,ease:'power3.out',immediateRender:false},22.15);
tl.addLabel('diff-reframe',26.56).to('#native-camera',{x:0,y:0,scale:1,duration:.8,ease:'power3.inOut'},26.56);
tl.to('#native-output-ring',{opacity:0,duration:.2},26.56);
tl.addLabel('diff-focus',29.0).to('#native-camera',{x:-1110,y:240,scale:1.7,duration:1.1,ease:'power3.inOut'},29.0);
tl.fromTo('#browser-surface',{rotationY:0,rotationX:0,z:0},{rotationY:-3,rotationX:2,z:55,duration:.6,ease:'power2.inOut',immediateRender:false},26.7);
tl.to('#browser-surface',{rotationY:0,rotationX:0,z:0,duration:.8,ease:'power2.inOut'},28.5);
// Registry whip-pan-cut primitive: both actual scenes ride one strip with matched seam velocity.
tl.set('#switch-camera',{x:-285,y:-300,scale:1.65},0);
tl.set('#transition-seam',{opacity:0},0);
tl.addLabel('provider-handoff',33.35).fromTo('#shared-strip',{x:0},{x:-1440,duration:.55,ease:'power3.inOut'},33.35);
tl.to('#whip-blur-node',{attr:{stdDeviation:'16 0'},duration:.275,ease:'power3.in'},33.35);
tl.to('#whip-blur-node',{attr:{stdDeviation:'0 0'},duration:.275,ease:'power3.out'},33.625);
tl.fromTo('#transition-seam',{opacity:0},{opacity:1,duration:.08,ease:'power1.out',immediateRender:false},33.35);
tl.to('#transition-seam',{opacity:0,duration:.15},33.75);
tl.to('#browser-surface',{scale:.96,duration:.25,ease:'power2.inOut'},33.35);
tl.to('#browser-surface',{scale:1,duration:.65,ease:'power3.out'},33.6);
tl.addLabel('warning-focus',34.15).to('#switch-camera',{x:-360,y:-360,scale:1.8,duration:1,ease:'power2.inOut'},34.15);
tl.addLabel('ending-reframe',40.9).to('#switch-camera',{x:-72,y:-45,scale:1.1,duration:1.1,ease:'power3.inOut'},40.9);
${callouts.map(c=>`tl.fromTo('#copy-${c.id}',{x:-70,y:25,rotation:-2,opacity:1},{x:0,y:0,rotation:0,opacity:1,duration:.65,ease:'power3.out',immediateRender:false},${c.start===0?.4:c.start+.06});\ntl.fromTo('#copy-${c.id} .line',{y:28,opacity:0},{y:0,opacity:1,duration:.5,stagger:.08,ease:'power2.out',immediateRender:false},${c.start===0?.55:c.start+.16});`).join('\n')}
window.__timelines['studio-motion-v2']=tl;
</script></body></html>`;
fs.writeFileSync(path.join(project,'index.html'),html);
const time=n=>{const ms=Math.round(n*1000),s=Math.floor(ms/1000);return String(Math.floor(s/3600)).padStart(2,'0')+':'+String(Math.floor(s/60)%60).padStart(2,'0')+':'+String(s%60).padStart(2,'0')+'.'+String(ms%1000).padStart(3,'0');};
fs.writeFileSync(path.join(project,'agent-driven-demo.vtt'),'WEBVTT\n\n'+beats.map((b,i)=>`${i+1}\n${time(b.start)} --> ${time(b.end)}\n${b.text}\n`).join('\n'));
fs.writeFileSync(path.join(project,'motion-plan.json'),JSON.stringify({schemaVersion:1,durationSeconds:duration,sourceClockUnchanged:true,sourceNativeMediaStartSeconds:2.607758541,sourceNativeDurationSeconds:34.112241459,switchingStartSeconds:switchAt,switchingDurationSeconds:9.56,finalSourceHold:{startSeconds:switchEnd,sourceFrameSeconds:9.526,durationSeconds:duration-switchEnd},provenanceLabelSwitchSeconds:33.625,transition:{registry:'whip-pan-cut',start:33.35,end:33.9,midpoint:33.625,sharedStripTravelPx:-1440,blurPeakPx:16},audio:{music:'Make Funk',artist:'HoliznaCC0',license:'CC0 1.0 Universal',source:'assets/make-funk-holiznacc0.mp3',renderedBed:'assets/music-normalized-44_5.wav',targetIntegratedLufs:-19.5,fadeIn:{start:0,end:.35},fadeOut:{start:42.5,end:44.5},noSpeechTrack:true},beats,callouts,motionProofTimes:[0,.5,1,1.8,3.6,7,13.5,22.5,27.3,30.2,33.35,33.4875,33.625,33.7625,33.9,35.2,41.8,43.5,44.5]},null,2)+'\n');
console.log(JSON.stringify({duration,beats:beats.length,transition:33.35}));
