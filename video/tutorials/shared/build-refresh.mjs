// Build the five current setup walkthroughs from inspected UI captures and receipted speech.
// Usage: node video/tutorials/shared/build-refresh.mjs <scratch-directory>
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {validateConfig,validateCache,sha256} from './narration.mjs';

const scratch=resolve(process.argv[2]||'');
if(!process.argv[2])throw new Error('An explicit reviewed scratch directory is required');
const agents={'claude-code':'Claude Code',codex:'Codex',opencode:'OpenCode',grok:'Grok',antigravity:'Antigravity + Gemini'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const stamp=t=>new Date(Math.round(t*1000)).toISOString().slice(11,23);
const ffprobe=f=>Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',f]).toString());
const round=t=>Math.round(t*30)/30;
const titles=['Start small','Connect the agent','Open the project','Choose deliberately','Write one bounded task','Review before execution','Read the evidence','Keep the result reviewable'];
const css=`@font-face{font-family:Plex;src:url(assets/fonts/ibm-plex-sans-latin.woff2)}
*{box-sizing:border-box}body{margin:0;background:#f5f4f0;color:#222923;font-family:Plex,sans-serif}
#root{position:relative;inset:0;width:100%;height:100%;overflow:hidden;background:#f5f4f0}.clip{position:absolute}
.scene{inset:0}.inner{position:absolute;inset:106px 172px 224px}.kicker{font-size:28px;letter-spacing:.12em;text-transform:uppercase;color:#526556}
h1{font-size:92px;line-height:1.05;letter-spacing:-3px;max-width:1450px;margin:102px 0 36px;font-weight:600}h2{font-size:64px;line-height:1.08;margin:28px 0 40px;letter-spacing:-1.5px}
.lead{font-size:34px;line-height:1.4;color:#526556;max-width:1300px}.capture{display:block;border:1px solid #d5d9d0;border-radius:16px;box-shadow:0 22px 60px #17231912;width:1482px;margin-top:34px}
.project{width:1482px}.task{width:1482px;margin-top:60px}.label{font-size:28px;color:#526556;margin-top:22px}.big{font-size:86px;line-height:1.18;margin-top:70px;letter-spacing:-2px}.mono{font-family:monospace}.flow{font-size:58px;line-height:1.6;margin-top:90px}.arrow{color:#56785a;padding:0 22px}.accent{color:#365d3d}.rule{height:4px;background:#466b4c;width:135px;margin-top:40px}
.detail{font-size:35px;line-height:1.5;margin-top:30px;color:#526556}.caps{left:192px;right:192px;bottom:78px;text-align:center;z-index:8;font-size:38px;line-height:1.3}.cap{display:inline-block;max-width:1450px;padding:12px 26px;border-radius:10px;color:#222923;background:#ffffff;border:1px solid #d5d9d0}.provenance{position:absolute;left:172px;bottom:25px;color:#647367;font-size:28px}.step{position:absolute;right:172px;top:64px;color:#526556;font-size:28px}.instruction{font-size:28px;color:#647367;margin-top:26px}.review{font-size:54px;line-height:1.65;margin-top:56px}.evidence{font-size:34px;border-left:5px solid #466b4c;padding-left:28px;margin-top:30px;line-height:1.5}`;

const manifest={schemaVersion:1,appVersion:'1.0.105',capturedAt:'2026-10-28',voice:'Anton Abyzov best voice',scope:'Current setup walkthrough; no provider task is submitted or portrayed as completed',episodes:[]};
let totalChars=0;
for(const [agent,name] of Object.entries(agents)){
 const ep=join('video/tutorials',agent),source=join(scratch,agent),cfg=JSON.parse(readFileSync(join(source,'vo-lines.draft.json')));
 validateConfig(cfg);totalChars+=cfg.lines.reduce((s,l)=>s+l.spoken.length,0);
 const project=join(ep,'hyperframes'),assets=join(project,'assets'),out=join(scratch,agent,'render-new');
 mkdirSync(join(project,'compositions'),{recursive:true});mkdirSync(join(assets,'refresh'),{recursive:true});mkdirSync(out,{recursive:true});
 copyFileSync(join(scratch,'gsap.min.js'),join(assets,'refresh/gsap.min.js'));
 for(const f of ['project-current.png','task-current.png'])copyFileSync(join(scratch,f),join(assets,'refresh',f));
 copyFileSync(join(source,'provider-current.png'),join(assets,'refresh/provider-current.png'));
 copyFileSync(join(source,'vo-lines.draft.json'),join(ep,'scripts/vo-lines.json'));
 let start=0;const beats=[],cues=[];
 for(const [i,line] of cfg.lines.entries()){
  const raw=join(source,'vo-new',line.id+'.raw.mp3'),receipt=join(source,'vo-new',line.id+'.receipt.json');
  if(!validateCache(raw,receipt,cfg,line))throw new Error('Missing narrated beat: '+line.id);
  const wav=join(source,'vo-new',line.id+'.wav');
  const proof=JSON.parse(readFileSync(receipt));
  if(proof.derivedOutputSha256!==sha256(readFileSync(wav))||proof.derivation?.speed!==1)throw new Error('Derived WAV provenance mismatch: '+line.id);
  const speech=ffprobe(wav),duration=round(speech+.5);
  copyFileSync(wav,join(assets,'refresh',line.id+'.wav'));copyFileSync(receipt,join(assets,'refresh',line.id+'.receipt.json'));
  const tr=JSON.parse(readFileSync(join(source,'words-new',line.id+'.json'))),words=tr.segments.flatMap(s=>s.words);
  if(!words.length)throw new Error('Missing word timing');
  // Use actual transcribed words, grouped at <= 70 characters and <= 5 seconds.
  let group=[];const flush=()=>{if(!group.length)return;const first=group[0],last=group.at(-1);cues.push({start:start+.15+first.start,end:Math.min(start+.15+last.end,start+duration-.05),text:group.map(w=>w.word.trim()).join(' ')});group=[];};
  for(const w of words){if(group.length&&(group.map(x=>x.word).join(' ').length+w.word.length>70||w.end-group[0].start>5))flush();group.push(w);}flush();
  let content='';
  if(i===0)content=`<h1>Your first task<br>with <span class="accent">${esc(name)}</span></h1><p class="lead">One bounded change. A deliberate review.</p><div class="rule"></div><p class="instruction">Setup walkthrough · no provider task submitted</p>`;
  if(i===1)content=`<h2>Connect ${esc(name)}</h2><img class="capture" src="assets/refresh/provider-current.png" alt="Actual provider selector in SpecWithCode 1.0.105"><p class="label">Settings → Providers → Add provider</p><p class="instruction">Complete the agent’s own sign-in. Account access determines models.</p>`;
  if(i===2)content=`<h2>Start in the project</h2><img class="capture project" src="assets/refresh/project-current.png" alt="Actual greet-app project coordinator"><p class="flow">Repository <span class="arrow">→</span> Coordinator <span class="arrow">→</span> ${esc(name)}</p><p class="instruction">Workflow diagram · check the execution computer before starting.</p>`;
  if(i===3)content=`<h2>Choose deliberately</h2><div class="review">The agent and an available model<br>The execution computer<br><span class="accent">The approval mode you intend to use</span></div><p class="detail">Full access is not required for this walkthrough.</p><p class="instruction">Instructional checklist · sign in first to discover available models.</p>`;
  if(i===4)content=`<h2>One task. Clear boundaries.</h2><div class="big mono">greet() <span class="arrow">→</span> greet(name)</div><img class="capture task" src="assets/refresh/task-current.png" alt="Actual unsubmitted example task in the coordinator composer"><p class="label">Draft only · preserve existing behavior · test both cases</p>`;
  if(i===5)content=`<h2>Review before execution</h2><div class="flow">Describe <span class="arrow">→</span> Review <span class="arrow">→</span> Implement</div><p class="detail">Approve only the intended commands.</p><p class="instruction">Workflow diagram · this walkthrough does not submit an agent run.</p>`;
  if(i===6)content=`<h2>A reply is not test evidence.</h2><div class="review">Inspect the diff.<br>Read the actual test output.<br><span class="accent">Keep failed or missing checks visible.</span></div><p class="instruction">Review guidance · no fabricated diff, test result or completed provider run.</p>`;
  if(i===7)content=`<h2>Keep the result reviewable.</h2><div class="big">Change.<br>Diff.<br><span class="accent">Evidence.</span></div><p class="detail">SpecWeave increments are optional for this first task.</p>`;
  const id='scene-'+line.id;
  writeFileSync(join(project,'compositions',id+'.html'),`<template><style>${css}</style><div id="root" data-composition-id="${id}" data-width="1920" data-height="1080"><div class="inner" data-hold>${content}</div></div><script>const tl=gsap.timeline({paused:true});tl.fromTo('[id="${id}"] .inner',{y:18,opacity:0},{y:0,opacity:1,duration:.45,ease:'power2.out'},0);window.__timelines['${id}']=tl;</script></template>`);
  beats.push({id,lineId:line.id,start,duration,speech,title:titles[i]});start=round(start+duration);
 }
 const hosts=beats.map((b,i)=>`<section id="${b.id}" class="clip scene" data-composition-id="${b.id}" data-composition-src="compositions/${b.id}.html" data-start="${b.start}" data-duration="${b.duration}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></section><audio id="vo-${b.id}" class="clip" data-start="${b.start+.15}" data-duration="${b.speech}" data-track-index="2" src="assets/refresh/${b.lineId}.wav"></audio><div id="step-${b.id}" class="clip step" data-start="${b.start}" data-duration="${b.duration}">${i+1} / 8 · ${esc(b.title)}</div>`).join('\n');
 const captions=cues.map((c,i)=>`<div id="caption-${i}" class="clip caps" data-start="${c.start}" data-duration="${c.end-c.start}" data-track-index="3" data-track-kind="captions"><span class="cap">${esc(c.text)}</span></div>`).join('\n');
 writeFileSync(join(project,'index.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(name)} first task</title><script src="assets/refresh/gsap.min.js"></script><style>${css}</style></head><body><div id="root" data-composition-id="main" data-width="1920" data-height="1080" data-start="0" data-duration="${start}">${hosts}${captions}<div class="provenance" data-hold>SpecWithCode 1.0.105 · actual UI crops + labeled workflow diagrams · Anton’s verified AI voice</div></div><script>window.__timelines=window.__timelines||{};window.__timelines.main=gsap.timeline({paused:true});</script></body></html>`);
 writeFileSync(join(out,agent+'.en.vtt'),'WEBVTT\n\n'+cues.map(c=>`${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join('\n'));
 writeFileSync(join(out,agent+'.chapters.vtt'),'WEBVTT\n\n'+beats.map(b=>`${stamp(b.start)} --> ${stamp(b.start+b.duration)}\n${b.title}\n`).join('\n'));
 writeFileSync(join(ep,'SCRIPT.md'),`# First task with ${name}\n\nCurrent setup walkthrough captured from SpecWithCode 1.0.105 on October 28, 2026. The task remains an unsubmitted draft; instructional diagrams do not claim a completed provider run.\n\n`+cfg.lines.map((l,i)=>`## ${i+1}. ${titles[i]}\n\n${l.spoken}\n`).join('\n'));
 manifest.episodes.push({agent,name,durationSeconds:start,beats,voiceCharacters:cfg.lines.reduce((s,l)=>s+l.spoken.length,0),captions:cues.length,sourceConfigSha256:sha256(JSON.stringify(cfg)),composition:join(project,'index.html')});
}
if(totalChars>10000)throw new Error('Combined narration exceeds approved bound');
writeFileSync(join(scratch,'build-manifest.json'),JSON.stringify({...manifest,totalSpokenCharacters:totalChars},null,2));
console.log(JSON.stringify({episodes:manifest.episodes.map(x=>({agent:x.agent,duration:x.durationSeconds,captions:x.captions})),totalChars}));
