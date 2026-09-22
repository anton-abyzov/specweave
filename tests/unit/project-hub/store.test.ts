import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ProjectHubStore, HUB_PATH } from '../../../src/core/project-hub/store.js';
import { projectBrief } from '../../../src/core/project-hub/brief.js';

let root: string;
let store: ProjectHubStore;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-hub-'));
  fs.mkdirSync(path.join(root, '.specweave'));
  fs.writeFileSync(path.join(root, '.specweave/config.json'), '{"project":{"name":"Existing"}}');
  store = new ProjectHubStore(root);
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));
const profile = { revision: 0, name: 'Content studio', goal: 'Publish useful research', context: 'Cite primary sources.' };

describe('project hub persistence', () => {
  it('reads an absent hub without writing and initializes without Git or config replacement', () => {
    expect(store.read().revision).toBe(0);
    expect(fs.existsSync(path.join(root, HUB_PATH))).toBe(false);
    expect(store.saveProfile(profile).revision).toBe(1);
    expect(new ProjectHubStore(root).read().goal).toBe(profile.goal);
    expect(JSON.parse(fs.readFileSync(path.join(root, '.specweave/config.json'), 'utf8')).project.name).toBe('Existing');
    expect(fs.existsSync(path.join(root, '.git'))).toBe(false);
  });
  it('rejects writes outside initialized projects', () => {
    fs.unlinkSync(path.join(root, '.specweave/config.json'));
    expect(() => store.saveProfile(profile)).toThrow('Initialize');
  });
  it('rejects stale revisions across independent writers without losing data', () => {
    const second = new ProjectHubStore(root);
    const stale = second.read();
    store.saveProfile(profile);
    expect(() => second.saveProfile({ ...profile, revision: stale.revision, goal: 'Lost update' })).toThrow('Refresh');
    expect(store.read().goal).toBe(profile.goal);
    expect(fs.existsSync(path.join(root, HUB_PATH + '.lock'))).toBe(false);
  });
  it('rejects an existing writer lock, retaining it', () => {
    store.saveProfile(profile);
    fs.writeFileSync(path.join(root, HUB_PATH + '.lock'), 'other process');
    expect(() => store.saveProfile({ ...profile, revision: 1 })).toThrow('being edited');
    expect(fs.readFileSync(path.join(root, HUB_PATH + '.lock'), 'utf8')).toBe('other process');
  });
  it.each(['garbage', '{}', JSON.stringify({ version: 3 }), 'x'.repeat(513 * 1024)])('fails visibly for corrupt data %#', raw => {
    fs.mkdirSync(path.dirname(path.join(root, HUB_PATH)), { recursive: true });
    fs.writeFileSync(path.join(root, HUB_PATH), raw);
    expect(() => store.read()).toThrow('corrupt');
    expect(() => store.saveProfile(profile)).toThrow('corrupt');
    expect(fs.readFileSync(path.join(root, HUB_PATH), 'utf8')).toBe(raw);
  });
  it('rejects symlinked storage without writing outside the project', () => {
    fs.symlinkSync(os.tmpdir(), path.join(root, '.specweave/project'));
    expect(() => store.read()).toThrow('symlink');
    expect(() => store.saveProfile(profile)).toThrow('symlink');
  });
  it.each([{ name: '' }, { goal: '' }, { context: 'a'.repeat(16001) }, { name: 42 }])('validates profile fields %j', patch => {
    expect(() => store.saveProfile({ ...profile, ...patch })).toThrow();
    expect(store.read().revision).toBe(0);
  });
});

describe('artifact library and routines', () => {
  it('links real files and HTTPS artifacts to existing work without moving files', () => {
    fs.writeFileSync(path.join(root, 'draft.md'), 'Draft');
    let hub = store.addArtifact({ revision: 0, title: 'Draft', location: 'draft.md', intentId: 'work-1' }, ['work-1']);
    expect(hub.artifacts[0]).toMatchObject({ kind: 'file', location: 'draft.md', intentId: 'work-1' });
    hub = store.addArtifact({ revision: 1, title: 'Design', location: 'https://example.com/design' }, []);
    expect(hub.artifacts[1].kind).toBe('link');
    expect(fs.readFileSync(path.join(root, 'draft.md'), 'utf8')).toBe('Draft');
    hub = store.remove('artifact', hub.artifacts[0].id, 2);
    expect(hub.artifacts).toHaveLength(1);
    expect(fs.existsSync(path.join(root, 'draft.md'))).toBe(true);
  });
  it.each(['../outside', '/etc/passwd', 'missing.pdf', 'http://example.com', 'javascript:alert(1)', 'https://u:p@example.com', 'https:'])('rejects unsafe or missing location %s', location => {
    expect(() => store.addArtifact({ revision: 0, title: 'Bad', location }, [])).toThrow();
  });
  it('rejects file symlink escapes and directories', () => {
    fs.symlinkSync('/etc/hosts', path.join(root, 'escape'));
    expect(() => store.validateLocation('escape')).toThrow('inside');
    expect(() => store.validateLocation('.specweave')).toThrow('file');
  });
  it('rejects nonexistent work references', () => {
    expect(() => store.addArtifact({ revision: 0, title: 'X', location: 'https://example.com', intentId: 'missing' }, [])).toThrow('does not exist');
  });
  it('persists reusable routine definitions, never launches a process', () => {
    let hub = store.addRoutine({ revision: 0, title: 'Weekly research', cadence: 'Mondays, 9am America/New_York', instructions: 'Review fresh sources.' });
    const brief = projectBrief(hub, { routineId: hub.routines[0].id });
    expect(brief).toContain('not an active schedule');
    expect(brief).toContain('Mondays, 9am America/New_York');
    hub = store.remove('routine', hub.routines[0].id, hub.revision);
    expect(hub.routines).toEqual([]);
    expect(() => store.remove('routine', 'missing', hub.revision)).toThrow('not found');
    expect(() => store.addRoutine({ revision: hub.revision, title: '', cadence: 'daily', instructions: 'x' })).toThrow('required');
  });
});

describe('portable briefs', () => {
  const intent = { id: 'work-1', title: 'Research', summary: 'Compare sources', state: 'active' as const, incrementId: '0881-portable-project-hub', updatedAt: new Date().toISOString(), revision: 1, executions: [] };
  it.each(['codex', 'claude', 'generic'])('exports fresh shared context and assignment for %s', harness => {
    let hub = store.saveProfile(profile);
    hub = store.addArtifact({ revision: hub.revision, title: 'Shared', location: 'https://example.com/shared' }, []);
    hub = store.addArtifact({ revision: hub.revision, title: 'Other', location: 'https://example.com/other', intentId: 'other' }, ['other']);
    const brief = projectBrief(hub, { harness, intent });
    expect(brief).toContain('Cite primary sources.');
    expect(brief).toContain('Work ID: work-1');
    expect(brief).toContain('0881-portable-project-hub');
    expect(brief).toContain('/shared');
    expect(brief).not.toContain('/other');
    expect(brief).toContain('does not start an agent');
  });
  it('scrubs secrets in exported context and rejects unsupported selection', () => {
    const secret = 'ghp_' + 'a'.repeat(36);
    const hub = store.saveProfile({ ...profile, context: `Token ${secret}` });
    expect(projectBrief(hub)).not.toContain(secret);
    expect(() => projectBrief(hub, { harness: 'unknown' })).toThrow('Harness');
    expect(() => projectBrief(hub, { routineId: 'missing' })).toThrow('Routine');
  });
  it('bounds huge briefs and distinguishes routine from work', () => {
    let hub = store.saveProfile({ ...profile, context: 'a'.repeat(16000) });
    hub = store.addRoutine({ revision: hub.revision, title: 'R', cadence: 'daily', instructions: 'Do work' });
    expect(() => projectBrief(hub, { intent, routineId: hub.routines[0].id })).toThrow('Choose one');
    hub.artifacts = Array.from({ length: 35 }, (_, i) => ({ id: `${i}`, title: 'x'.repeat(180), location: 'https://example.com/' + 'x'.repeat(1800), kind: 'link' as const, intentId: null, createdAt: new Date().toISOString() }));
    expect(projectBrief(hub).length).toBeLessThanOrEqual(30000);
    expect(projectBrief(hub)).toContain('truncated');
  });
});
