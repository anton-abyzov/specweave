// Offline acceptance of the five replacement playback assets; no network or spend.
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {VOICE,VOICE_NAME,MODEL,sha256,validateConfig,requestBody} from './narration.mjs';

const agents=['claude-code','codex','opencode','grok','antigravity'];
const data=JSON.parse(readFileSync('docs-site/src/data/tutorials.json'));
const report=[];let characters=0,cost=0;
const secs=t=>t.split(':').reduce((n,v)=>n*60+Number(v),0);
for(const agent of agents){
 const ep=join('video/tutorials',agent),assets=join(ep,'hyperframes/assets/refresh');
 const cfg=JSON.parse(readFileSync(join(ep,'scripts/vo-lines.json')));validateConfig(cfg);
 for(const line of cfg.lines){
  const r=JSON.parse(readFileSync(join(assets,line.id+'.receipt.json')));
  if(r.voiceId!==VOICE||r.voiceName!==VOICE_NAME||r.modelId!==MODEL||r.httpStatus!==200||!r.requestId||r.inputSha256!==sha256(JSON.stringify(requestBody(cfg,line)))||r.derivedOutputSha256!==sha256(readFileSync(join(assets,line.id+'.wav')))||r.derivation?.speed!==1)throw new Error('Narration proof mismatch: '+agent+'/'+line.id);
  characters+=r.characters;cost+=Number(r.characterCost||0);
 }
 const t=data.tutorials.find(x=>x.slug==='specwithcode-'+agent);
 if(!t||t.testedOn!=='SpecWithCode 1.0.105'||!t.video.captionsBurnedIn)throw new Error('Playback metadata mismatch: '+agent);
 const file='docs-site/static'+t.video.src;
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file]));
 const duration=Number(probe.format.duration),video=probe.streams.find(x=>x.codec_type==='video'),audio=probe.streams.find(x=>x.codec_type==='audio');
 if(video?.width!==1920||video?.height!==1080||audio?.sample_rate!=='48000'||audio?.channels!==2||Math.abs(duration-t.video.durationSeconds)>.15)throw new Error('Media format/duration mismatch: '+agent);
 // Decode every frame/sample. HTTP headers or ffprobe alone do not prove playback.
 execFileSync('ffmpeg',['-v','error','-xerror','-i',file,'-f','null','-'],{stdio:'pipe'});
 const vtt=readFileSync('docs-site/static'+t.video.captionsVtt,'utf8');let end=0,count=0;
 for(const m of vtt.matchAll(/(\d\d:\d\d:\d\d\.\d\d\d) --> (\d\d:\d\d:\d\d\.\d\d\d)\n([^\n]+)/g)){
  const s=secs(m[1]),e=secs(m[2]);if(s<end-.002||e<=s||e>duration||m[3].length>72)throw new Error('Invalid captions: '+agent);end=e;count++;
 }
 if(count<20)throw new Error('Missing caption cues: '+agent);
 for(const p of [t.video.poster,t.video.captionsVtt])if(!existsSync('docs-site/static'+p))throw new Error('Missing playback asset: '+p);
 report.push({agent,file:resolve(file),duration,videoSha256:sha256(readFileSync(file)),captions:count,fullDecode:'pass',voiceId:VOICE,modelId:MODEL});
}
if(characters>10000||characters!==5972)throw new Error('Narration character budget mismatch');
const result={ok:true,episodes:report,requests:40,spokenCharacters:characters,reportedCharacterCost:cost,auditoryReview:'Not established by decode/transcription; requires an audio-capable reviewer'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
