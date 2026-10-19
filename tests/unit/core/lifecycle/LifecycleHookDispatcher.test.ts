/**
 * 0933: living docs never gate the external closure, and a spec without user
 * stories skips living docs with one line.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const mocks = vi.hoisted(() => ({
  configRead: vi.fn(),
  syncIncrement: vi.fn(),
  closure: vi.fn(),
}));

vi.mock('../../../../src/core/config/config-manager.js', () => ({
  ConfigManager: class { read = mocks.configRead; },
}));
vi.mock('../../../../src/core/living-docs/living-docs-sync.js', () => ({
  LivingDocsSync: class {
    syncIncrement = mocks.syncIncrement;
    getProjectId = () => 'p';
  },
}));
vi.mock('../../../../src/sync/sync-coordinator.js', () => ({
  SyncCoordinator: class { syncIncrementClosure = mocks.closure; },
}));
vi.mock('../../../../src/core/increment/metadata-manager.js', () => ({
  MetadataManager: class { static read = vi.fn().mockReturnValue({}); },
}));
vi.mock('../../../../src/cli/commands/sync-retry.js', () => ({
  drainRetryQueueForIncrement: vi.fn().mockResolvedValue({ attempted: 0, succeeded: 0 }),
}));
vi.mock('../../../../src/core/skill-gen/signal-collector.js', () => ({
  SignalCollector: class { collect = vi.fn(); },
}));
vi.mock('../../../../src/core/skill-gen/suggestion-engine.js', () => ({
  SuggestionEngine: class { evaluate = vi.fn(); },
}));

import { LifecycleHookDispatcher } from '../../../../src/core/hooks/LifecycleHookDispatcher.js';

const ID = '0001-demo';
let root: string;
let stdout: string[];
const bypass = { _bypassTestGuard: true } as const;

function writeSpec(content: string) {
  const dir = path.join(root, '.specweave', 'increments', ID);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'spec.md'), content);
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-lhd-'));
  fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{"skillGen":{"detection":"off"}}');
  vi.clearAllMocks();
  stdout = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((s: any) => { stdout.push(String(s)); return true; });
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  mocks.configRead.mockResolvedValue({
    livingDocs: 'onDone',
    hooks: { post_increment_done: { close_external_issue: true } },
    sync: { settings: { autoSyncOnCompletion: true } },
  });
  mocks.syncIncrement.mockResolvedValue({ success: true });
  mocks.closure.mockResolvedValue({ success: true, errors: [] });
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
});

describe('onIncrementDone (0933)', () => {
  it('skips living docs with one log line when the spec has no user stories, and still closes', async () => {
    writeSpec('# Demo\n\n## Acceptance Criteria\n\n- [ ] AC-01: x\n');
    const result = await LifecycleHookDispatcher.onIncrementDone(root, ID, bypass);
    expect(mocks.syncIncrement).not.toHaveBeenCalled();
    expect(mocks.closure).toHaveBeenCalledTimes(1);
    expect(result.syncSuccess).toContain('Living docs skipped: spec.md has no user stories');
    expect(stdout.filter((l) => l.includes('Living docs skipped'))).toHaveLength(1);
  });

  it('runs living docs for a spec with user stories', async () => {
    writeSpec('# Demo\n\n## User Stories\n\n### US-001: Sign in\n');
    await LifecycleHookDispatcher.onIncrementDone(root, ID, bypass);
    expect(mocks.syncIncrement).toHaveBeenCalledTimes(1);
    expect(mocks.closure).toHaveBeenCalledTimes(1);
  });

  it('runs the closure when living docs sync fails', async () => {
    writeSpec('# Demo\n\n## User Stories\n\n### US-001: Sign in\n');
    mocks.syncIncrement.mockRejectedValue(new Error('living docs exploded'));
    const result = await LifecycleHookDispatcher.onIncrementDone(root, ID, bypass);
    expect(mocks.closure).toHaveBeenCalledTimes(1);
    expect(result.syncErrors.join('\n')).toContain('living docs exploded');
  });

  it('runs the closure when living docs are off', async () => {
    writeSpec('# Demo\n');
    mocks.configRead.mockResolvedValue({ hooks: { post_increment_done: { close_external_issue: true } } });
    await LifecycleHookDispatcher.onIncrementDone(root, ID, bypass);
    expect(mocks.syncIncrement).not.toHaveBeenCalled();
    expect(mocks.closure).toHaveBeenCalledTimes(1);
  });

  it('specHasUserStories is undefined without a spec', () => {
    expect(LifecycleHookDispatcher.specHasUserStories(root, 'missing')).toBeUndefined();
  });
});
