import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createIncrementTemplates } from '../../../src/core/increment/template-creator.js';
import { MetadataManager } from '../../../src/core/increment/metadata-manager.js';
import { IncrementStatus } from '../../../src/core/types/increment-metadata.js';
import { taskCommand } from '../../../src/cli/commands/task.js';
import { runVerify } from '../../../src/core/tasks/verify-runner.js';
import { completeIncrement } from '../../../src/core/increment/status-commands.js';
import { buildWorkHandoff } from '../../../src/core/session/work-handoff.js';
import { listPendingHandoffs } from '../../../src/core/session/handoff-list.js';

const roots: string[]=[];
afterEach(()=>{vi.restoreAllMocks();for(const root of roots.splice(0))fs.rmSync(root,{recursive:true,force:true});});
function setup() {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'sw-identity-workflow-'));roots.push(root);
  fs.mkdirSync(path.join(root,'.specweave/increments/_archive/9999-old'),{recursive:true});
  fs.writeFileSync(path.join(root,'.specweave/config.json'),JSON.stringify({version:'3.0',project:{name:'identity-test'},testing:{verifyCommands:['true']}}));
  return root;
}

describe('increment lifecycle beyond9999',()=>{
  it('creates, claims, hands off, verifies and completes without changing its UUID',async()=>{
    const root=setup();vi.spyOn(process,'cwd').mockReturnValue(root);
    vi.spyOn(process.stdout,'write').mockImplementation(()=>true);vi.spyOn(process.stderr,'write').mockImplementation(()=>true);
    const result=await createIncrementTemplates({incrementId:'',autoId:true,name:'workflow',title:'Workflow',description:'Proof',projectId:'test',projectRoot:root});
    expect(result.success).toBe(true);const id=path.basename(result.incrementPath);expect(id).toBe('10000-workflow');
    const metaFile=path.join(result.incrementPath,'metadata.json');const uuid=JSON.parse(fs.readFileSync(metaFile,'utf8')).uuid;
    const spec='# Workflow\n\n## Acceptance Criteria\n- [ ] AC-01: Works\n\n## Tasks\n### T-01 Implement\n- AC: AC-01 | Files: proof.txt | Test: true\n';
    fs.writeFileSync(path.join(result.incrementPath,'spec.md'),spec);
    expect(await taskCommand('claim','T-01','10000',{cwd:root,agent:'test'})).toBe(0);
    const handoff=await buildWorkHandoff(root,{incrementId:'10000',reason:'test',push:false,keepClaims:true});
    expect(handoff.incrementId).toBe(id);
    expect(listPendingHandoffs(root,{home:root}).find(h=>h.incrementId===id)?.id).toBe('10000');
    expect(await taskCommand('done','T-01','10000',{cwd:root,agent:'test',run:'true'})).toBe(0);
    const verified=await runVerify(root,id,result.incrementPath,{commands:['true']});expect(verified.report.ok).toBe(true);
    expect(await completeIncrement({incrementId:'10000',silent:true})).toBe(true);
    const final=JSON.parse(fs.readFileSync(metaFile,'utf8'));expect(final.status).toBe('completed');expect(final.uuid).toBe(uuid);
    expect(fs.readFileSync(path.join(result.incrementPath,'spec.md'),'utf8')).toBe(spec);
  });
  it('preserves UUID when a legacy-shaped writer omits it and rejects replacement',async()=>{
    const root=setup();const result=await createIncrementTemplates({incrementId:'10000-immutable',title:'Immutable',description:'Test',projectId:'test',projectRoot:root});
    const metaFile=path.join(result.incrementPath,'metadata.json');const before=JSON.parse(fs.readFileSync(metaFile,'utf8'));
    const metadata=MetadataManager.read('10000-immutable',root);const {uuid,...legacyShape}=metadata;
    MetadataManager.write('10000-immutable',{...legacyShape,status:IncrementStatus.PAUSED},root);
    expect(JSON.parse(fs.readFileSync(metaFile,'utf8')).uuid).toBe(before.uuid);
    expect(()=>MetadataManager.write('10000-immutable',{...metadata,uuid:'replacement'},root)).toThrow(/immutable/);
  });
  it('reads historical three-digit IDs without assigning an identity or renaming files',()=>{
    const root=setup(),id='001G-old';const dir=path.join(root,'.specweave/increments',id);fs.mkdirSync(dir);
    const metadata={id,status:'completed',type:'feature',created:new Date().toISOString(),lastActivity:new Date().toISOString()};
    const file=path.join(dir,'metadata.json');fs.writeFileSync(file,JSON.stringify(metadata));
    expect(MetadataManager.read(id,root).id).toBe(id);
    expect(JSON.parse(fs.readFileSync(file,'utf8')).uuid).toBeUndefined();
    expect(fs.existsSync(dir)).toBe(true);
  });
});
