/**
 * Issue #1925: LifecycleHookDispatcher.updateDocsLinks must follow the
 * per-US project paths that LivingDocsSync actually wrote to, not the
 * umbrella-level project id returned by getProjectId().
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const mocks = vi.hoisted(() => ({
  mockConfigRead: vi.fn(),
  mockSyncIncrement: vi.fn(),
  mockGetProjectId: vi.fn(),
}));

vi.mock('../../../../src/core/config/config-manager.js', () => ({
  ConfigManager: class {
    read = mocks.mockConfigRead;
  },
}));

vi.mock('../../../../src/core/living-docs/living-docs-sync.js', () => ({
  LivingDocsSync: class {
    syncIncrement = mocks.mockSyncIncrement;
    getProjectId = mocks.mockGetProjectId;
  },
}));

vi.mock('../../../../src/core/increment/metadata-manager.js', () => ({
  MetadataManager: { read: () => ({}) },
}));

vi.mock('../../../../src/cli/commands/sync-retry.js', () => ({
  drainRetryQueueForIncrement: async () => ({ attempted: 0, succeeded: 0 }),
}));

vi.mock('../../../../src/core/skill-gen/signal-collector.js', () => ({
  SignalCollector: class { collect = async () => undefined; },
}));
vi.mock('../../../../src/core/skill-gen/suggestion-engine.js', () => ({
  SuggestionEngine: class { evaluate = async () => undefined; },
}));

import { LifecycleHookDispatcher } from '../../../../src/core/hooks/LifecycleHookDispatcher.js';

const incrementId = '0292-cross-project';
const featureId = 'FS-292';
const bypass = { _bypassTestGuard: true, directSync: true } as const;

function seedProject(root: string, projectId: string, withFeature = true): string {
  const specsDir = path.join(root, '.specweave', 'docs', 'internal', 'specs', projectId);
  fs.mkdirSync(path.join(specsDir, featureId), { recursive: true });
  if (withFeature) {
    fs.writeFileSync(path.join(specsDir, featureId, 'FEATURE.md'), `# Cross project feature (${featureId})\n`);
  }
  fs.writeFileSync(path.join(specsDir, 'README.md'), '# Specs\n\n## Active Features\n\n---\nfooter\n');
  return path.join(specsDir, 'README.md');
}

describe('LifecycleHookDispatcher — cross-project docs links (#1925)', () => {
  let projectRoot: string;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-1925-'));
    fs.mkdirSync(path.join(projectRoot, '.specweave', 'state'), { recursive: true });
    mocks.mockConfigRead.mockResolvedValue({
      livingDocs: 'onDone',
      hooks: { post_increment_done: {} },
      skillGen: { detection: 'off' },
    });
    // Umbrella-level id — must NOT be used when projectIds is populated
    mocks.mockGetProjectId.mockReturnValue('umbrella-repo');
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('links the feature in every per-US project README, never the umbrella id', async () => {
    const readmeA = seedProject(projectRoot, 'ec-standings-api');
    const readmeB = seedProject(projectRoot, 'ec-console-ui');
    mocks.mockSyncIncrement.mockResolvedValue({
      success: true,
      featureId,
      incrementId,
      filesCreated: [],
      filesUpdated: [],
      errors: [],
      projectIds: ['ec-standings-api', 'ec-console-ui'],
    });

    const result = await LifecycleHookDispatcher.onIncrementDone(projectRoot, incrementId, bypass);

    expect(result.syncErrors).toEqual([]);
    expect(result.syncSuccess).toContain('Docs links updated');
    expect(fs.readFileSync(readmeA, 'utf-8')).toContain(`${featureId}/FEATURE.md`);
    expect(fs.readFileSync(readmeB, 'utf-8')).toContain(`${featureId}/FEATURE.md`);
    const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderr).not.toContain('Feature spec missing');
    expect(stderr).not.toContain('umbrella-repo');
  });

  it('supports project/board target paths (2-level structure)', async () => {
    const readme = seedProject(projectRoot, path.join('acme', 'backend'));
    mocks.mockSyncIncrement.mockResolvedValue({
      success: true,
      featureId,
      incrementId,
      filesCreated: [],
      filesUpdated: [],
      errors: [],
      projectIds: ['acme/backend'],
    });

    await LifecycleHookDispatcher.onIncrementDone(projectRoot, incrementId, bypass);

    expect(fs.readFileSync(readme, 'utf-8')).toContain(`${featureId}/FEATURE.md`);
  });

  it('falls back to getProjectId() when projectIds is absent (legacy result shape)', async () => {
    const readme = seedProject(projectRoot, 'umbrella-repo');
    mocks.mockSyncIncrement.mockResolvedValue({
      success: true,
      featureId,
      incrementId,
      filesCreated: [],
      filesUpdated: [],
      errors: [],
    });

    await LifecycleHookDispatcher.onIncrementDone(projectRoot, incrementId, bypass);

    expect(mocks.mockGetProjectId).toHaveBeenCalled();
    expect(fs.readFileSync(readme, 'utf-8')).toContain(`${featureId}/FEATURE.md`);
  });
});
