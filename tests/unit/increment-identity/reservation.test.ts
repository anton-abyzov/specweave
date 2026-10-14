import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { buildSync } from 'esbuild';
import { reservationScope, reserveIncrement } from '../../../src/core/increment/number-reservation.js';

const roots: string[] = [];
let workerDir: string, worker: string;
function scratch() { const root = fs.mkdtempSync(path.join(os.tmpdir(),'sw-reservation-')); roots.push(root); return root; }
function git(root: string, ...args: string[]) { return execFileSync('git', ['-C',root,...args], { encoding:'utf8', stdio:['ignore','pipe','pipe'] }); }
function inc(root: string, name: string) { fs.mkdirSync(path.join(root,'.specweave/increments',name), { recursive:true }); }
function run(root: string, name: string, explicit = false): Promise<{success: boolean; incrementPath: string; error?: string}> {
  return new Promise((resolve,reject) => {
    const child = spawn(process.execPath, [worker,root,name,explicit?'explicit':'auto'], { stdio:['ignore','pipe','pipe'] });
    let stdout='',stderr=''; child.stdout.on('data',s=>stdout+=s); child.stderr.on('data',s=>stderr+=s);
    child.on('error',reject); child.on('exit',code => { if(code!==0) reject(new Error(stderr)); else { try { resolve(JSON.parse(stdout.trim().split('\n').at(-1)!)); } catch(e) { reject(e); } } });
  });
}
beforeAll(() => {
  workerDir = fs.mkdtempSync(path.join(os.tmpdir(),'sw-reservation-worker-')); worker=path.join(workerDir,'worker.cjs');
  buildSync({ stdin:{ contents:`import { createIncrementTemplates } from './src/core/increment/template-creator.ts';
const [root,name,mode]=process.argv.slice(2);
createIncrementTemplates({ projectRoot:root,projectId:'test',title:name,description:name,incrementId:mode==='explicit'?name:'',autoId:mode!=='explicit',name }).then(result=>console.log(JSON.stringify(result)));`, resolveDir:process.cwd(), loader:'ts' },bundle:true,platform:'node',format:'cjs',outfile:worker,logLevel:'silent' });
});
afterAll(()=>fs.rmSync(workerDir,{recursive:true,force:true}));
afterEach(()=>{ vi.restoreAllMocks();vi.unstubAllEnvs();for(const root of roots.splice(0))fs.rmSync(root,{recursive:true,force:true}); });

describe('durable numeric reservations with real processes',()=>{
  it('allocates distinct IDs and UUIDs for different slugs in one checkout',async()=>{
    const root=scratch(); inc(root,'9999-last');
    const results=await Promise.all(Array.from({length:12},(_,i)=>run(root,`parallel-${i}`)));
    expect(results.every(r=>r.success)).toBe(true);
    const ids=results.map(r=>Number.parseInt(path.basename(r.incrementPath)));
    expect(new Set(ids).size).toBe(12); expect(Math.min(...ids)).toBe(10000); expect(Math.max(...ids)).toBe(10011);
    const uuids=results.map(r=>JSON.parse(fs.readFileSync(path.join(r.incrementPath,'metadata.json'),'utf8')).uuid);
    expect(new Set(uuids).size).toBe(12); expect(uuids.every(id=>/^[0-9a-f-]{36}$/.test(id))).toBe(true);
  },30000);
  it('only one explicit request wins the same numeric ID even with different suffixes/slugs',async()=>{
    const root=scratch();
    const results=await Promise.all(Array.from({length:8},(_,i)=>run(root,`10000${i%2?'J':''}-explicit-${i}`,true)));
    expect(results.filter(r=>r.success)).toHaveLength(1);
    expect(results.filter(r=>!r.success).every(r=>/DUPLICATE/.test(r.error!))).toBe(true);
  },30000);
  it('coordinates linked worktrees and scans legacy increments before tickets existed',async()=>{
    const base=scratch(),root=path.join(base,'main'),other=path.join(base,'linked');fs.mkdirSync(root);
    git(root,'init','-b','main'); git(root,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','--allow-empty','-m','initial');
    git(root,'worktree','add','-b','other',other);
    inc(root,'_archive/9999G-old'); inc(other,'_paused/10009J-legacy');
    expect(reservationScope(root).directory).toBe(reservationScope(other).directory);
    const results=await Promise.all(Array.from({length:10},(_,i)=>run(i%2?other:root,`worktree-${i}`)));
    expect(results.every(r=>r.success)).toBe(true);
    const ids=results.map(r=>Number.parseInt(path.basename(r.incrementPath)));
    expect(new Set(ids).size).toBe(10); expect(Math.min(...ids)).toBe(10010);
    expect((await run(root,'10009-collision',true)).success).toBe(false);
    const explicit = await Promise.all([run(root,'10020-explicit-main',true),run(other,'10020G-explicit-linked',true)]);
    expect(explicit.filter(r=>r.success)).toHaveLength(1);
    expect((await run(other,'after-explicit')).incrementPath).toContain('10021-after-explicit');
  },30000);
  it('recovers after a killed process and from an empty ticket without reusing its number',async()=>{
    const root=scratch();const reservation=reserveIncrement(root,{name:'interrupted'});
    // Stop an actual child after reserving but before it can create a folder.
    const killer=path.join(workerDir,'interrupted.cjs');
    buildSync({stdin:{contents:`import { reserveIncrement } from './src/core/increment/number-reservation.ts'; console.log(JSON.stringify(reserveIncrement(process.argv[2],{name:'killed'}))); setInterval(()=>{},1000);`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',outfile:killer,logLevel:'silent'});
    const child=spawn(process.execPath,[killer,root],{stdio:['ignore','pipe','pipe']});
    await new Promise<void>((resolve,reject)=>{child.once('error',reject);child.stdout.once('data',()=>{child.kill('SIGKILL');});child.once('exit',()=>resolve());});
    const scope=reservationScope(root);fs.writeFileSync(path.join(scope.directory,'0003.json'),'');
    const result=await run(root,'after-crash');
    expect(path.basename(result.incrementPath)).toBe('0004-after-crash');
    expect(fs.existsSync(reservation.path)).toBe(true);
    expect((await run(root,'0002-reuse',true)).success).toBe(false);
  },30000);
  it('does not reuse reservations after deleting or archiving an increment',()=>{
    const root=scratch(); const first=reserveIncrement(root,{name:'first'});
    expect(first.id).toBe('0001-first');
    expect(reserveIncrement(root,{name:'next'}).id).toBe('0002-next');
    expect(()=>reserveIncrement(root,{id:'0001-other'})).toThrow(/DUPLICATE/);
  });
  it('fails closed when Git is broken instead of starting an independent local allocator',()=>{
    const root=scratch();fs.writeFileSync(path.join(root,'.git'),'gitdir: /missing/worktree-metadata');
    expect(()=>reservationScope(root)).toThrow();
    expect(fs.existsSync(path.join(root,'.specweave/state/increment-reservations'))).toBe(false);
  });
  it('uses the requested checkout despite inherited Git hook variables',()=>{
    const root=scratch(),foreign=scratch();git(root,'init','-b','main');git(foreign,'init','-b','main');
    const expected=reservationScope(root).directory;
    vi.stubEnv('GIT_DIR',path.join(foreign,'.git'));vi.stubEnv('GIT_WORK_TREE',foreign);
    expect(reservationScope(root).directory).toBe(expected);
    expect(reserveIncrement(root,{name:'correct-root'}).path.startsWith(expected)).toBe(true);
  });
  it('rejects malformed IDs and unsafe integer overflow without creating increments',()=>{
    const root=scratch();
    expect(()=>reserveIncrement(root,{id:'../../escape'})).toThrow(/Invalid/);
    expect(()=>reserveIncrement(root,{name:'../escape'})).toThrow(/Invalid/);
    expect(()=>reserveIncrement(root,{})).toThrow(/either/);
    inc(root,`${Number.MAX_SAFE_INTEGER}-last`);
    expect(()=>reserveIncrement(root,{name:'overflow'})).toThrow(/safe integer/);
  });
  it('retries a reservation won after the scan, and never retries an explicit ID',()=>{
    const root=scratch(); const open=fs.openSync;
    let inject=true;
    vi.spyOn(fs,'openSync').mockImplementation(((file: fs.PathLike,flags: fs.OpenMode,mode?: fs.Mode)=>{
      if(inject && flags==='wx') { inject=false;const fd=open(file,'wx');fs.closeSync(fd); }
      return open(file,flags,mode);
    }) as typeof fs.openSync);
    expect(reserveIncrement(root,{name:'race'}).id).toBe('0002-race');
    inject=true;
    expect(()=>reserveIncrement(root,{id:'0003-explicit'})).toThrow(/DUPLICATE/);
  });
  it('propagates ticket storage failures instead of claiming success',()=>{
    const root=scratch();
    vi.spyOn(fs,'openSync').mockImplementation(()=>{throw Object.assign(new Error('denied'),{code:'EACCES'});});
    expect(()=>reserveIncrement(root,{name:'blocked'})).toThrow(/denied/);
  });
  it('does not claim global allocation across independent clones',()=>{
    const a=scratch(),b=scratch();
    const x=reserveIncrement(a,{name:'offline-a'}),y=reserveIncrement(b,{name:'offline-b'});
    expect(x.id.split('-')[0]).toBe(y.id.split('-')[0]);expect(x.uuid).not.toBe(y.uuid);
  });
});
