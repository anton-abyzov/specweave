import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runProjectCommand } from '../../../../src/cli/commands/project.js';

let root: string;
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-project-cli-')); });
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));
const run = (action: string, options: Record<string, unknown> = {}) => runProjectCommand(action, { ...options, root }) as any;
const init = () => run('init', { name: 'Research', goal: 'Sourced decisions' });

describe('project commands', () => {
  it('initializes non-code folders with native skill and idempotent instructions', () => {
    fs.writeFileSync(path.join(root, 'AGENTS.md'), '# My rules\nPreserve these.\n');
    init();
    run('init', { name: 'Other name', goal: 'Other goal' });
    const result = run('show');
    expect(result.hub.name).toBe('Research');
    const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('Preserve these.');
    expect(agents.match(/<!-- specweave:project-hub -->/g)).toHaveLength(1);
    expect(fs.readFileSync(path.join(root, '.agents/skills/sw-project/SKILL.md'), 'utf8')).toContain('name: sw-project');
    expect(fs.existsSync(path.join(root, '.git'))).toBe(false);
  });
  it('preserves existing config and skills', () => {
    fs.mkdirSync(path.join(root, '.specweave'));
    fs.writeFileSync(path.join(root, '.specweave/config.json'), '{"custom":true}');
    fs.mkdirSync(path.join(root, '.agents/skills/sw-project'), { recursive: true });
    fs.writeFileSync(path.join(root, '.agents/skills/sw-project/SKILL.md'), 'Custom skill');
    init();
    expect(fs.readFileSync(path.join(root, '.specweave/config.json'), 'utf8')).toBe('{"custom":true}');
    expect(fs.readFileSync(path.join(root, '.agents/skills/sw-project/SKILL.md'), 'utf8')).toBe('Custom skill');
  });
  it('validates initialization before creating state', () => {
    expect(() => run('init', { name: 'X' })).toThrow('requires');
    expect(fs.existsSync(path.join(root, '.specweave'))).toBe(false);
    expect(() => run('show')).toThrow('No project');
  });
  it('uses current revision for explicit changes and prepares a work assignment', () => {
    init();
    const context = path.join(root, 'context.md');fs.writeFileSync(context, 'New decisions');
    run('set', { revision: 1, contextFile: context });
    const work = run('work-add', { title: 'Report', summary: 'Compare primary sources' });
    run('work-update', { intent: work.id, revision: work.revision, state: 'active' });
    expect(() => run('work-update', { intent: work.id, revision: 1, state: 'done' })).toThrow('changed');
    const updated = run('work-record', { intent: work.id, revision: 2, harness: 'codex', session: 'real-session' });
    expect(updated.executions[0]).toMatchObject({ harness: 'codex', sessionId: 'real-session', model: null });
    expect(run('brief', { intent: work.id, harness: 'codex' })).toContain('New decisions');
    expect(run('show').work.items).toHaveLength(1);
    expect(() => run('set', { revision: 1, goal: 'stale' })).toThrow('Refresh');
  });
  it('guards shared intent writes with a cross-process lock', () => {
    init();
    const work = run('work-add', { title: 'Draft' });
    const lock = path.join(root, '.specweave/intents/board.jsonl.lock');fs.writeFileSync(lock, 'owner');
    expect(() => run('work-update', { intent: work.id, revision: 1, state: 'done' })).toThrow('being edited');
    expect(run('show').work.items[0].state).toBe('backlog');
    fs.unlinkSync(lock);
    expect(run('work-update', { intent: work.id, revision: 1, state: 'active' }).state).toBe('active');
  });
  it('registers artifacts and routine briefs without claiming a schedule', () => {
    init();
    fs.writeFileSync(path.join(root, 'report.md'), 'Report');
    let hub = run('artifact-add', { revision: 1, title: 'Report', location: 'report.md' });
    hub = run('artifact-remove', { revision: 2, location: hub.artifacts[0].id });
    expect(hub.artifacts).toHaveLength(0);
    const instructionFile = path.join(root, 'routine.md');fs.writeFileSync(instructionFile, 'Review sources');
    hub = run('routine-add', { revision: 3, title: 'Review', cadence: 'Weekly', instructionsFile: instructionFile });
    expect(run('brief', { routine: hub.routines[0].id })).toContain('not an active schedule');
    expect(run('routine-remove', { revision: 4, routine: hub.routines[0].id }).routines).toHaveLength(0);
  });
  it('resolves an umbrella from a nested repository without a second project', () => {
    init();
    const child = path.join(root, 'repositories/org/app');fs.mkdirSync(child, { recursive: true });
    const result = runProjectCommand('show', {}, child) as any;
    expect(result.root).toBe(root);
    expect(fs.existsSync(path.join(child, '.specweave'))).toBe(false);
  });
  it('rejects unknown actions and missing assignments', () => {
    init();
    expect(() => run('launch')).toThrow('Unknown');
    expect(() => run('brief', { intent: 'missing' })).toThrow('not found');
    expect(() => run('work-update')).toThrow('--intent');
    expect(() => run('work-record')).toThrow('--intent');
  });
});
