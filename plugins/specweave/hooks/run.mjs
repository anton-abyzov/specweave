#!/usr/bin/env node
// SpecWeave hook supervisor: parent deadline remains live while the worker blocks in Git.
import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const event = process.argv[2];
const worker = path.join(path.dirname(fileURLToPath(import.meta.url)), 'run-worker.mjs');
const budget = event === 'stop' ? 25000 : 7500;
let child, finished = false, input = '', output = '', size = 0;
const started = Date.now();
function record(reason) {
  try {
    const dir = path.join(homedir(), '.specweave', 'logs');
    mkdirSync(dir, {recursive:true, mode:0o700});
    appendFileSync(path.join(dir, 'hook-health.jsonl'), JSON.stringify({at:new Date().toISOString(),event,reason,elapsedMs:Date.now()-started})+'\n', {mode:0o600});
  } catch {}
}
function killWorker() {
  if (!child?.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {timeout:1000, windowsHide:true, stdio:'ignore'});
  } else {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { try {child.kill('SIGKILL');} catch {} }
  }
}
function finish(result = {}, reason) {
  if (finished) return;
  finished = true;
  clearTimeout(deadline);
  killWorker();
  if (reason) record(reason);
  process.stdout.write(JSON.stringify(result)+'\n',()=>process.exit(0));
}
const deadline = setTimeout(()=>finish({},'deadline_exceeded'),budget);
process.on('SIGTERM',()=>finish({},'terminated'));
process.on('SIGINT',()=>finish({},'interrupted'));
process.on('uncaughtException',()=>finish({},'adapter_error'));
process.stdin.setEncoding('utf8');
process.stdin.on('data',chunk=>{
  size += Buffer.byteLength(chunk, 'utf8');
  if(size>1024*1024) return finish({},'input_limit');
  input+=chunk;
});
process.stdin.on('error',()=>finish({},'stdin_error'));
process.stdin.on('end',()=>{
  let data;
  try {data=JSON.parse(input);if(!data || typeof data!=='object'||Array.isArray(data))throw Error();}
  catch {return finish({},'invalid_input');}
  if(!['session-start','pre-tool-use','pre-compact','stop'].includes(event))return finish({});
  const env={...process.env};
  child=spawn(process.execPath,[worker,event],{env,detached:process.platform !== 'win32',stdio:['pipe','pipe','pipe']});
  child.stdout.setEncoding('utf8');
  child.stdout.on('data',chunk=>{
    output+=chunk;
    if(output.length>1024*1024)finish({},'output_limit');
  });
  child.stderr.resume();
  child.stdin.on('error',()=>{});
  child.on('error',()=>finish({},'worker_spawn_failed'));
  child.on('close',code=>{
    if(finished)return;
    if(code!==0)return finish({},'worker_failed');
    try {
      const result=JSON.parse(output);
      if(!result||typeof result!=='object'||Array.isArray(result))throw Error();
      finish(result);
    } catch {finish({},'invalid_worker_output');}
  });
  child.stdin.end(input);
});
