/**
 * migrate-to-umbrella CLI Command Tests
 *
 * Tests the --consolidate flag dispatch and dry-run behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock consolidation-engine
const mockScanForOrphans = vi.hoisted(() => vi.fn());
const mockExecuteConsolidation = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/core/migration/consolidation-engine.js', () => ({
  scanForOrphans: mockScanForOrphans,
  executeConsolidation: mockExecuteConsolidation,
}));

// Mock umbrella-migrator to prevent actual migration logic
const mockDetectSingleRepoProject = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/core/migration/umbrella-migrator.js', () => ({
  detectSingleRepoProject: mockDetectSingleRepoProject,
  generateMigrationPlan: vi.fn(),
  executeMigration: vi.fn(),
  guardUncommittedChanges: vi.fn(),
  rollbackMigration: vi.fn(),
  addRepoToUmbrella: vi.fn(),
  classifyExistingUmbrella: vi.fn(),
}));

// Mock spec-project-mapper
vi.mock('../../../../src/core/migration/spec-project-mapper.js', () => ({
  buildFeatureProjectMap: vi.fn(),
  generateReorganizationPlan: vi.fn(),
  reorganizeSpecs: vi.fn(),
}));

// Mock chalk to avoid color escape codes in assertions
vi.mock('chalk', () => {
  const identity = (s: string) => s;
  const chalk: any = new Proxy(identity, {
    get: () => identity,
  });
  return { default: chalk };
});

// Mock inquirer prompts
vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
  input: vi.fn(),
  select: vi.fn(),
}));

import { migrateToUmbrellaCommand } from '../../../../src/cli/commands/migrate-to-umbrella.js';
import type { ConsolidationPlan } from '../../../../src/core/migration/consolidation-engine.js';

describe('migrate-to-umbrella --consolidate', () => {
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy.mockClear();
  });

  it('dispatches to handleConsolidate when consolidate option is set', async () => {
    const plan: ConsolidationPlan = {
      moves: [{ from: '/repos/a/.specweave/increments/0010-foo', to: '/umb/.specweave/increments/0010-foo', type: 'increment' }],
      deletions: [],
    };
    mockScanForOrphans.mockResolvedValue(plan);

    await migrateToUmbrellaCommand({ consolidate: true });

    expect(mockScanForOrphans).toHaveBeenCalled();
    // In dry-run mode (no --execute), executeConsolidation should NOT be called
    expect(mockExecuteConsolidation).not.toHaveBeenCalled();
  });

  it('prints dry-run plan without executing when --execute is absent', async () => {
    const plan: ConsolidationPlan = {
      moves: [
        { from: '/repos/a/.specweave/increments/0010-foo', to: '/umb/.specweave/increments/0010-foo', type: 'increment' },
        { from: '/repos/a/.specweave/docs/specs/proj', to: '/umb/.specweave/docs/specs/proj', type: 'living-doc' },
      ],
      deletions: [
        { path: '/repos/b/.specweave/increments/0020-bar', reason: 'duplicate' },
      ],
    };
    mockScanForOrphans.mockResolvedValue(plan);

    await migrateToUmbrellaCommand({ consolidate: true });

    expect(mockExecuteConsolidation).not.toHaveBeenCalled();
    // Verify plan details were printed
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('0010-foo');
    expect(output).toContain('0020-bar');
    expect(output).toContain('Dry-run');
  });

  it('executes consolidation when both --consolidate and --execute are set', async () => {
    const plan: ConsolidationPlan = {
      moves: [{ from: '/repos/a/.specweave/increments/0010-foo', to: '/umb/.specweave/increments/0010-foo', type: 'increment' }],
      deletions: [],
    };
    mockScanForOrphans.mockResolvedValue(plan);
    mockExecuteConsolidation.mockResolvedValue(undefined);

    await migrateToUmbrellaCommand({ consolidate: true, execute: true });

    expect(mockScanForOrphans).toHaveBeenCalled();
    expect(mockExecuteConsolidation).toHaveBeenCalledWith(plan, expect.any(String));
  });

  it('reports empty plan when no orphans found', async () => {
    mockScanForOrphans.mockResolvedValue({ moves: [], deletions: [] });

    await migrateToUmbrellaCommand({ consolidate: true });

    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('No orphaned');
  });

  it('does not trigger main migration flow when consolidate is set', async () => {
    mockScanForOrphans.mockResolvedValue({ moves: [], deletions: [] });

    await migrateToUmbrellaCommand({ consolidate: true });

    // detectSingleRepoProject is part of the main migration flow — should NOT be called
    expect(mockDetectSingleRepoProject).not.toHaveBeenCalled();
  });
});
