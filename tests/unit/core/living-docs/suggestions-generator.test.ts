/**
 * Suggestions Generator Tests
 *
 * Tests for the living docs suggestions generator that produces
 * actionable SUGGESTIONS.md with priority zones, immediate actions,
 * gap analysis, and umbrella-specific suggestions.
 *
 * All internal helper functions are tested indirectly via the
 * exported `generateSuggestions` and `formatSuggestionsMarkdown`.
 * The `saveSuggestionsReport` function is tested with fs mocks.
 *
 * @see src/core/living-docs/suggestions-generator.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted + vi.mock)
// ---------------------------------------------------------------------------

const { mockEnsureDirSync, mockWriteFileSync } = vi.hoisted(() => ({
  mockEnsureDirSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
}));

vi.mock('../../../../src/utils/fs-native.js', () => ({
  ensureDirSync: mockEnsureDirSync,
  writeFileSync: mockWriteFileSync,
}));

import {
  generateSuggestions,
  formatSuggestionsMarkdown,
  saveSuggestionsReport,
} from '../../../../src/core/living-docs/suggestions-generator.js';
import type {
  SuggestionsReport,
  ModuleDocStatus,
  PriorityZone,
  ImmediateAction,
  UnmatchedItemSuggestion,
} from '../../../../src/core/living-docs/suggestions-generator.js';
import type { DiscoveryResult, ModuleInfo } from '../../../../src/core/living-docs/discovery.js';
import type { ModuleAnalysis } from '../../../../src/core/living-docs/module-analyzer.js';
import type {
  WorkItemMatchResult,
  PriorityQueueEntry,
  ModuleWorkItemMapping,
  WorkItem,
} from '../../../../src/core/living-docs/workitem-matcher.js';
import type { LivingDocsUserInputs } from '../../../../src/core/background/types.js';

// ---------------------------------------------------------------------------
// Frozen time
// ---------------------------------------------------------------------------

const FROZEN_DATE = '2026-02-11T00:00:00.000Z';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(FROZEN_DATE).getTime());
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeModule(overrides?: Partial<ModuleInfo>): ModuleInfo {
  return {
    name: 'auth-service',
    path: 'src/auth',
    fileCount: 10,
    estimatedLOC: 500,
    hasTests: false,
    hasReadme: false,
    entryPoints: ['index.ts'],
    extensions: { '.ts': 10 },
    ...overrides,
  };
}

function makeAnalysis(overrides?: Partial<ModuleAnalysis>): ModuleAnalysis {
  return {
    moduleName: 'auth-service',
    modulePath: 'src/auth',
    analyzedAt: '2026-02-10T00:00:00.000Z',
    filesAnalyzed: [],
    filesSkipped: 0,
    totalExports: 5,
    externalDeps: [],
    internalDeps: [],
    relatedWorkItems: [],
    summary: 'Auth service module',
    docStatus: 'generated',
    ...overrides,
  };
}

function makeMapping(overrides?: Partial<ModuleWorkItemMapping>): ModuleWorkItemMapping {
  return {
    moduleName: 'auth-service',
    modulePath: 'src/auth',
    matches: [],
    workItemCount: 3,
    priority: 'high',
    docStatus: 'partial',
    ...overrides,
  };
}

function makePriorityEntry(overrides?: Partial<PriorityQueueEntry>): PriorityQueueEntry {
  return {
    moduleName: 'auth-service',
    modulePath: 'src/auth',
    workItemCount: 5,
    priority: 'high',
    topWorkItems: ['US-001', 'US-002', 'US-003'],
    ...overrides,
  };
}

function makeWorkItem(overrides?: Partial<WorkItem>): WorkItem {
  return {
    id: 'US-001',
    featureId: 'FS-001',
    title: 'Implement login',
    filePath: '.specweave/docs/internal/specs/us-001.md',
    keywords: ['auth', 'login', 'security'],
    ...overrides,
  };
}

function makeMatchResult(overrides?: Partial<WorkItemMatchResult>): WorkItemMatchResult {
  return {
    moduleMap: new Map(),
    priorityQueue: [],
    unmatchedItems: [],
    stats: {
      totalWorkItems: 10,
      matchedWorkItems: 7,
      unmatchedWorkItems: 3,
      modulesWithWorkItems: 4,
    },
    ...overrides,
  };
}

function makeDiscovery(overrides?: Partial<DiscoveryResult>): DiscoveryResult {
  return {
    codebaseStats: {
      totalFiles: 100,
      totalDirs: 20,
      byExtension: { '.ts': 80, '.json': 20 },
      byType: { code: 70, tests: 15, docs: 5, config: 8, assets: 2 },
      estimatedLOC: 10000,
    },
    techStack: {
      languages: ['TypeScript'],
      frameworks: ['Node.js'],
      buildTools: ['esbuild'],
      testFrameworks: ['vitest'],
      detectedFrom: ['package.json'],
    },
    existingDocs: {
      readme: 'README.md',
      contributing: null,
      docsFolder: null,
      wikiFolder: null,
      mdFiles: [],
    },
    entryPoints: { main: ['src/index.ts'], index: [], exports: [] },
    modules: [],
    tier: 'small',
    samplingConfig: {
      tier: 'small',
      filesPerDir: 'all',
      priorityPatterns: [],
      skipPatterns: [],
    },
    discoveredAt: '2026-02-10T00:00:00.000Z',
    ...overrides,
  };
}

function makeUserInputs(overrides?: Partial<LivingDocsUserInputs>): LivingDocsUserInputs {
  return {
    additionalSources: [],
    priorityAreas: [],
    knownPainPoints: [],
    analysisDepth: 'standard',
    ...overrides,
  };
}

function makeReport(overrides?: Partial<SuggestionsReport>): SuggestionsReport {
  return {
    generatedAt: FROZEN_DATE,
    summary: {
      totalModules: 3,
      modulesDocumented: 1,
      modulesPartial: 1,
      modulesUndocumented: 1,
      totalWorkItems: 10,
      matchedWorkItems: 7,
      coveragePercent: 53,
    },
    priorityZones: [],
    immediateActions: [],
    moduleStatuses: [],
    additionalSources: [],
    notAnalyzed: [],
    painPointsAddressed: [],
    ...overrides,
  };
}

// ===========================================================================
// generateSuggestions (main orchestrator)
// ===========================================================================

describe('generateSuggestions', () => {
  it('should return a valid SuggestionsReport with all required fields', async () => {
    const discovery = makeDiscovery({ modules: [makeModule()] });
    const analyses = new Map([['auth-service', makeAnalysis()]]);
    const matchResult = makeMatchResult({
      moduleMap: new Map([['auth-service', makeMapping()]]),
    });

    const result = await generateSuggestions(
      '/project',
      discovery,
      analyses,
      matchResult,
      makeUserInputs(),
    );

    expect(result).toHaveProperty('generatedAt');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('priorityZones');
    expect(result).toHaveProperty('immediateActions');
    expect(result).toHaveProperty('moduleStatuses');
    expect(result).toHaveProperty('additionalSources');
    expect(result).toHaveProperty('notAnalyzed');
    expect(result).toHaveProperty('painPointsAddressed');
  });

  it('should set generatedAt to current ISO timestamp', async () => {
    const result = await generateSuggestions(
      '/project',
      makeDiscovery(),
      new Map(),
      makeMatchResult(),
      makeUserInputs(),
    );

    expect(result.generatedAt).toBe(FROZEN_DATE);
  });

  it('should pass through additionalSources from user inputs', async () => {
    const result = await generateSuggestions(
      '/project',
      makeDiscovery(),
      new Map(),
      makeMatchResult(),
      makeUserInputs({ additionalSources: ['docs/wiki', 'docs/api'] }),
    );

    expect(result.additionalSources).toEqual(['docs/wiki', 'docs/api']);
  });

  // --- Module status building ---

  describe('module status building', () => {
    it('should compute coverage=0 for module with no readme, no analysis, no tests', async () => {
      const mod = makeModule({ hasReadme: false, hasTests: false });
      const discovery = makeDiscovery({ modules: [mod] });
      // No analysis in the map

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        makeMatchResult(),
        makeUserInputs(),
      );

      expect(result.moduleStatuses[0].coverage).toBe(0);
      expect(result.moduleStatuses[0].status).toBe('none');
    });

    it('should give 40 coverage for module with readme only', async () => {
      const mod = makeModule({ hasReadme: true, hasTests: false });
      const discovery = makeDiscovery({ modules: [mod] });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        makeMatchResult(),
        makeUserInputs(),
      );

      expect(result.moduleStatuses[0].coverage).toBe(40);
      expect(result.moduleStatuses[0].status).toBe('partial');
    });

    it('should give 40 coverage for module with analysis only', async () => {
      const mod = makeModule({ hasReadme: false, hasTests: false });
      const discovery = makeDiscovery({ modules: [mod] });
      const analyses = new Map([['auth-service', makeAnalysis({ docStatus: 'generated' })]]);

      const result = await generateSuggestions(
        '/project',
        discovery,
        analyses,
        makeMatchResult(),
        makeUserInputs(),
      );

      expect(result.moduleStatuses[0].coverage).toBe(40);
      expect(result.moduleStatuses[0].status).toBe('partial');
    });

    it('should give 20 coverage for module with tests only', async () => {
      const mod = makeModule({ hasReadme: false, hasTests: true });
      const discovery = makeDiscovery({ modules: [mod] });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        makeMatchResult(),
        makeUserInputs(),
      );

      expect(result.moduleStatuses[0].coverage).toBe(20);
      expect(result.moduleStatuses[0].status).toBe('partial');
    });

    it('should give 80 coverage for module with readme + analysis (status=complete)', async () => {
      const mod = makeModule({ hasReadme: true, hasTests: false });
      const discovery = makeDiscovery({ modules: [mod] });
      const analyses = new Map([['auth-service', makeAnalysis({ docStatus: 'generated' })]]);

      const result = await generateSuggestions(
        '/project',
        discovery,
        analyses,
        makeMatchResult(),
        makeUserInputs(),
      );

      expect(result.moduleStatuses[0].coverage).toBe(80);
      expect(result.moduleStatuses[0].status).toBe('complete');
    });

    it('should give 100 coverage for module with readme + analysis + tests', async () => {
      const mod = makeModule({ hasReadme: true, hasTests: true });
      const discovery = makeDiscovery({ modules: [mod] });
      const analyses = new Map([['auth-service', makeAnalysis({ docStatus: 'generated' })]]);

      const result = await generateSuggestions(
        '/project',
        discovery,
        analyses,
        makeMatchResult(),
        makeUserInputs(),
      );

      expect(result.moduleStatuses[0].coverage).toBe(100);
      expect(result.moduleStatuses[0].status).toBe('complete');
    });

    it('should not count analysis with docStatus=partial as generated', async () => {
      const mod = makeModule({ hasReadme: false, hasTests: false });
      const discovery = makeDiscovery({ modules: [mod] });
      const analyses = new Map([['auth-service', makeAnalysis({ docStatus: 'partial' })]]);

      const result = await generateSuggestions(
        '/project',
        discovery,
        analyses,
        makeMatchResult(),
        makeUserInputs(),
      );

      // docStatus 'partial' does not count as hasAnalysis
      expect(result.moduleStatuses[0].hasAnalysis).toBe(false);
      expect(result.moduleStatuses[0].coverage).toBe(0);
    });

    it('should use work item count from module map', async () => {
      const mod = makeModule({ name: 'payments' });
      const discovery = makeDiscovery({ modules: [mod] });
      const matchResult = makeMatchResult({
        moduleMap: new Map([['payments', makeMapping({ moduleName: 'payments', workItemCount: 12 })]]),
      });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        matchResult,
        makeUserInputs(),
      );

      expect(result.moduleStatuses[0].workItemCount).toBe(12);
    });

    it('should default work item count to 0 when no mapping exists', async () => {
      const mod = makeModule({ name: 'utils' });
      const discovery = makeDiscovery({ modules: [mod] });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        makeMatchResult(),
        makeUserInputs(),
      );

      expect(result.moduleStatuses[0].workItemCount).toBe(0);
    });

    it('should use priority from mapping, default to low', async () => {
      const mod1 = makeModule({ name: 'critical-mod' });
      const mod2 = makeModule({ name: 'unmapped-mod' });
      const discovery = makeDiscovery({ modules: [mod1, mod2] });
      const matchResult = makeMatchResult({
        moduleMap: new Map([
          ['critical-mod', makeMapping({ moduleName: 'critical-mod', priority: 'critical' })],
        ]),
      });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        matchResult,
        makeUserInputs(),
      );

      expect(result.moduleStatuses[0].priority).toBe('critical');
      expect(result.moduleStatuses[1].priority).toBe('low');
    });
  });

  // --- Summary calculation ---

  describe('summary calculation', () => {
    it('should count documented, partial, and undocumented modules', async () => {
      const modules = [
        makeModule({ name: 'mod-a', hasReadme: true, hasTests: false }),
        makeModule({ name: 'mod-b', hasReadme: false, hasTests: true }),
        makeModule({ name: 'mod-c', hasReadme: false, hasTests: false }),
      ];
      const discovery = makeDiscovery({ modules });
      const analyses = new Map([
        ['mod-a', makeAnalysis({ moduleName: 'mod-a', docStatus: 'generated' })],
      ]);

      const result = await generateSuggestions(
        '/project',
        discovery,
        analyses,
        makeMatchResult(),
        makeUserInputs(),
      );

      // mod-a: readme(40) + analysis(40) = 80 => complete
      // mod-b: tests(20) => partial
      // mod-c: 0 => none
      expect(result.summary.modulesDocumented).toBe(1);
      expect(result.summary.modulesPartial).toBe(1);
      expect(result.summary.modulesUndocumented).toBe(1);
      expect(result.summary.totalModules).toBe(3);
    });

    it('should calculate average coverage across all modules', async () => {
      const modules = [
        makeModule({ name: 'a', hasReadme: true, hasTests: false }),  // 40
        makeModule({ name: 'b', hasReadme: false, hasTests: true }),  // 20
        makeModule({ name: 'c', hasReadme: false, hasTests: false }), // 0
      ];
      const discovery = makeDiscovery({ modules });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        makeMatchResult(),
        makeUserInputs(),
      );

      // Average: (40 + 20 + 0) / 3 = 20
      expect(result.summary.coveragePercent).toBe(20);
    });

    it('should return 0 coverage when there are no modules', async () => {
      const result = await generateSuggestions(
        '/project',
        makeDiscovery(),
        new Map(),
        makeMatchResult(),
        makeUserInputs(),
      );

      expect(result.summary.coveragePercent).toBe(0);
      expect(result.summary.totalModules).toBe(0);
    });

    it('should include work item stats from match result', async () => {
      const matchResult = makeMatchResult({
        stats: {
          totalWorkItems: 25,
          matchedWorkItems: 18,
          unmatchedWorkItems: 7,
          modulesWithWorkItems: 6,
        },
      });

      const result = await generateSuggestions(
        '/project',
        makeDiscovery(),
        new Map(),
        matchResult,
        makeUserInputs(),
      );

      expect(result.summary.totalWorkItems).toBe(25);
      expect(result.summary.matchedWorkItems).toBe(18);
    });
  });

  // --- Priority zones ---

  describe('priority zones', () => {
    it('should build zones from priority queue entries with matching statuses', async () => {
      const mod = makeModule({ name: 'payments', path: 'src/payments', hasReadme: false, hasTests: false });
      const discovery = makeDiscovery({ modules: [mod] });
      const matchResult = makeMatchResult({
        moduleMap: new Map([['payments', makeMapping({ moduleName: 'payments', workItemCount: 8 })]]),
        priorityQueue: [
          makePriorityEntry({ moduleName: 'payments', modulePath: 'src/payments', workItemCount: 8 }),
        ],
      });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        matchResult,
        makeUserInputs(),
      );

      expect(result.priorityZones).toHaveLength(1);
      expect(result.priorityZones[0].name).toBe('payments');
      expect(result.priorityZones[0].workItems).toBe(8);
      expect(result.priorityZones[0].docStatus).toBe('none');
      expect(result.priorityZones[0].action).toContain('START HERE');
    });

    it('should skip priority queue entries with zero work items', async () => {
      const mod = makeModule({ name: 'utils' });
      const discovery = makeDiscovery({ modules: [mod] });
      const matchResult = makeMatchResult({
        priorityQueue: [
          makePriorityEntry({ moduleName: 'utils', workItemCount: 0 }),
        ],
      });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        matchResult,
        makeUserInputs(),
      );

      expect(result.priorityZones).toHaveLength(0);
    });

    it('should limit priority zones to top 10', async () => {
      const modules = Array.from({ length: 15 }, (_, i) =>
        makeModule({ name: `mod-${i}`, path: `src/mod-${i}` }),
      );
      const discovery = makeDiscovery({ modules });
      const queue = modules.map((m, i) =>
        makePriorityEntry({ moduleName: m.name, modulePath: m.path, workItemCount: 15 - i }),
      );
      const matchResult = makeMatchResult({ priorityQueue: queue });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        matchResult,
        makeUserInputs(),
      );

      expect(result.priorityZones.length).toBeLessThanOrEqual(10);
    });

    it('should set action based on doc status: partial => ENHANCE', async () => {
      const mod = makeModule({ name: 'api', path: 'src/api', hasReadme: true });
      const discovery = makeDiscovery({ modules: [mod] });
      const matchResult = makeMatchResult({
        moduleMap: new Map([['api', makeMapping({ moduleName: 'api', workItemCount: 3 })]]),
        priorityQueue: [makePriorityEntry({ moduleName: 'api', workItemCount: 3 })],
      });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        matchResult,
        makeUserInputs(),
      );

      // hasReadme=true, no analysis => coverage=40 => partial
      expect(result.priorityZones[0].action).toContain('ENHANCE');
    });

    it('should set action based on doc status: complete => REVIEW', async () => {
      const mod = makeModule({ name: 'core', path: 'src/core', hasReadme: true });
      const discovery = makeDiscovery({ modules: [mod] });
      const analyses = new Map([['core', makeAnalysis({ moduleName: 'core', docStatus: 'generated' })]]);
      const matchResult = makeMatchResult({
        moduleMap: new Map([['core', makeMapping({ moduleName: 'core', workItemCount: 2 })]]),
        priorityQueue: [makePriorityEntry({ moduleName: 'core', workItemCount: 2 })],
      });

      const result = await generateSuggestions(
        '/project',
        discovery,
        analyses,
        matchResult,
        makeUserInputs(),
      );

      expect(result.priorityZones[0].action).toContain('REVIEW');
    });

    it('should include top 3 work items as focusFiles', async () => {
      const mod = makeModule({ name: 'db', path: 'src/db' });
      const discovery = makeDiscovery({ modules: [mod] });
      const matchResult = makeMatchResult({
        moduleMap: new Map([['db', makeMapping({ moduleName: 'db', workItemCount: 5 })]]),
        priorityQueue: [
          makePriorityEntry({
            moduleName: 'db',
            workItemCount: 5,
            topWorkItems: ['US-001', 'US-002', 'US-003', 'US-004', 'US-005'],
          }),
        ],
      });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        matchResult,
        makeUserInputs(),
      );

      expect(result.priorityZones[0].focusFiles).toEqual(['US-001', 'US-002', 'US-003']);
    });
  });

  // --- Immediate actions ---

  describe('immediate actions', () => {
    it('should generate actions for undocumented critical modules', async () => {
      const mod = makeModule({ name: 'auth', path: 'src/auth', hasReadme: false, hasTests: false });
      const discovery = makeDiscovery({ modules: [mod] });
      const matchResult = makeMatchResult({
        moduleMap: new Map([
          ['auth', makeMapping({ moduleName: 'auth', priority: 'critical', workItemCount: 5 })],
        ]),
      });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        matchResult,
        makeUserInputs(),
      );

      const criticalAction = result.immediateActions.find(a => a.module === 'auth');
      expect(criticalAction).toBeDefined();
      expect(criticalAction!.action).toContain('Create README.md');
      expect(criticalAction!.files).toContain('src/auth/README.md');
      expect(criticalAction!.reason).toContain('5 work items');
    });

    it('should generate actions for user priority areas', async () => {
      const mod = makeModule({ name: 'payments', path: 'src/payments', hasReadme: false, hasTests: true });
      const discovery = makeDiscovery({ modules: [mod] });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        makeMatchResult(),
        makeUserInputs({ priorityAreas: ['payments'] }),
      );

      const paymentAction = result.immediateActions.find(a => a.module === 'payments');
      expect(paymentAction).toBeDefined();
      expect(paymentAction!.action).toContain('Document payments');
      expect(paymentAction!.reason).toContain('priority area');
    });

    it('should not duplicate actions for completed modules in priority areas', async () => {
      const mod = makeModule({ name: 'auth', path: 'src/auth', hasReadme: true });
      const discovery = makeDiscovery({ modules: [mod] });
      const analyses = new Map([['auth', makeAnalysis({ moduleName: 'auth', docStatus: 'generated' })]]);

      const result = await generateSuggestions(
        '/project',
        discovery,
        analyses,
        makeMatchResult(),
        makeUserInputs({ priorityAreas: ['auth'] }),
      );

      // auth is fully documented (coverage=80), so no priority area action
      const authAction = result.immediateActions.find(
        a => a.module === 'auth' && a.action.includes('priority area'),
      );
      expect(authAction).toBeUndefined();
    });

    it('should generate actions for modules with tests but no docs', async () => {
      const mod = makeModule({ name: 'utils', path: 'src/utils', hasReadme: false, hasTests: true });
      const discovery = makeDiscovery({ modules: [mod] });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        makeMatchResult(),
        makeUserInputs(),
      );

      const testedAction = result.immediateActions.find(a => a.module === 'utils');
      expect(testedAction).toBeDefined();
      expect(testedAction!.action).toContain('Add README based on existing test cases');
    });

    it('should limit immediate actions to 10', async () => {
      // Create many undocumented critical modules
      const modules = Array.from({ length: 15 }, (_, i) =>
        makeModule({ name: `mod-${i}`, path: `src/mod-${i}`, hasReadme: false, hasTests: false }),
      );
      const discovery = makeDiscovery({ modules });
      const moduleMap = new Map(
        modules.map(m => [
          m.name,
          makeMapping({ moduleName: m.name, priority: 'critical', workItemCount: 5 }),
        ]),
      );
      const matchResult = makeMatchResult({ moduleMap });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        matchResult,
        makeUserInputs({ priorityAreas: ['mod-0', 'mod-1', 'mod-2'] }),
      );

      expect(result.immediateActions.length).toBeLessThanOrEqual(10);
    });

    it('should assign incrementing priority numbers to actions', async () => {
      const modules = [
        makeModule({ name: 'a', path: 'src/a', hasReadme: false, hasTests: false }),
        makeModule({ name: 'b', path: 'src/b', hasReadme: false, hasTests: false }),
      ];
      const discovery = makeDiscovery({ modules });
      const moduleMap = new Map([
        ['a', makeMapping({ moduleName: 'a', priority: 'critical', workItemCount: 3 })],
        ['b', makeMapping({ moduleName: 'b', priority: 'high', workItemCount: 2 })],
      ]);

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        makeMatchResult({ moduleMap }),
        makeUserInputs(),
      );

      const priorities = result.immediateActions.map(a => a.priority);
      for (let i = 1; i < priorities.length; i++) {
        expect(priorities[i]).toBeGreaterThan(priorities[i - 1]);
      }
    });
  });

  // --- Not analyzed tracking ---

  describe('not analyzed tracking', () => {
    it('should track modules with no analysis', async () => {
      const mod = makeModule({ name: 'legacy', path: 'src/legacy', fileCount: 50 });
      const discovery = makeDiscovery({ modules: [mod] });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(), // no analysis for 'legacy'
        makeMatchResult(),
        makeUserInputs(),
      );

      expect(result.notAnalyzed).toHaveLength(1);
      expect(result.notAnalyzed[0].path).toBe('src/legacy');
      expect(result.notAnalyzed[0].reason).toBe('Analysis skipped');
      expect(result.notAnalyzed[0].filesSkipped).toBe(50);
    });

    it('should track modules with skipped files', async () => {
      const mod = makeModule({ name: 'big-mod', path: 'src/big' });
      const discovery = makeDiscovery({ modules: [mod], tier: 'large' });
      const analyses = new Map([
        ['big-mod', makeAnalysis({ moduleName: 'big-mod', filesSkipped: 25 })],
      ]);

      const result = await generateSuggestions(
        '/project',
        discovery,
        analyses,
        makeMatchResult(),
        makeUserInputs(),
      );

      expect(result.notAnalyzed).toHaveLength(1);
      expect(result.notAnalyzed[0].reason).toContain('Sampled');
      expect(result.notAnalyzed[0].reason).toContain('large');
      expect(result.notAnalyzed[0].filesSkipped).toBe(25);
    });

    it('should not track fully analyzed modules', async () => {
      const mod = makeModule({ name: 'complete', path: 'src/complete' });
      const discovery = makeDiscovery({ modules: [mod] });
      const analyses = new Map([
        ['complete', makeAnalysis({ moduleName: 'complete', filesSkipped: 0 })],
      ]);

      const result = await generateSuggestions(
        '/project',
        discovery,
        analyses,
        makeMatchResult(),
        makeUserInputs(),
      );

      expect(result.notAnalyzed).toHaveLength(0);
    });
  });

  // --- Pain points matching ---

  describe('pain points matching', () => {
    it('should match pain points to modules by name', async () => {
      const mod = makeModule({ name: 'authentication', path: 'src/auth' });
      const discovery = makeDiscovery({ modules: [mod] });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        makeMatchResult(),
        makeUserInputs({ knownPainPoints: ['authentication'] }),
      );

      expect(result.painPointsAddressed).toHaveLength(1);
      expect(result.painPointsAddressed[0]).toContain('authentication');
      expect(result.painPointsAddressed[0]).toContain('Documented in authentication');
    });

    it('should match pain points to modules by path (case-insensitive)', async () => {
      const mod = makeModule({ name: 'auth-svc', path: 'src/Auth' });
      const discovery = makeDiscovery({ modules: [mod] });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        makeMatchResult(),
        makeUserInputs({ knownPainPoints: ['auth'] }),
      );

      expect(result.painPointsAddressed).toHaveLength(1);
    });

    it('should return empty when no pain points match', async () => {
      const mod = makeModule({ name: 'database' });
      const discovery = makeDiscovery({ modules: [mod] });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        makeMatchResult(),
        makeUserInputs({ knownPainPoints: ['notifications'] }),
      );

      expect(result.painPointsAddressed).toHaveLength(0);
    });

    it('should handle empty pain points list', async () => {
      const result = await generateSuggestions(
        '/project',
        makeDiscovery(),
        new Map(),
        makeMatchResult(),
        makeUserInputs({ knownPainPoints: [] }),
      );

      expect(result.painPointsAddressed).toEqual([]);
    });
  });

  // --- Umbrella-specific processing ---

  describe('umbrella project handling', () => {
    it('should set isUmbrella=false when not an umbrella project', async () => {
      const result = await generateSuggestions(
        '/project',
        makeDiscovery(),
        new Map(),
        makeMatchResult(),
        makeUserInputs(),
      );

      expect(result.isUmbrella).toBe(false);
      expect(result.unmatchedSuggestions).toBeUndefined();
      expect(result.orphanedModules).toBeUndefined();
      expect(result.teamSummary).toBeUndefined();
    });

    it('should set isUmbrella=true when discovery indicates umbrella', async () => {
      const discovery = makeDiscovery({
        umbrella: { isUmbrella: true, source: 'config', childRepoCount: 5 },
      });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        makeMatchResult(),
        makeUserInputs(),
      );

      expect(result.isUmbrella).toBe(true);
    });

    it('should generate unmatched suggestions for umbrella projects', async () => {
      const modules = [
        makeModule({ name: 'auth-fe', path: 'repos/auth-fe' }),
        makeModule({ name: 'auth-be', path: 'repos/auth-be' }),
      ];
      const discovery = makeDiscovery({
        modules,
        umbrella: { isUmbrella: true, source: 'config', childRepoCount: 2 },
      });
      const unmatchedItems = [
        makeWorkItem({
          id: 'US-100',
          title: 'Fix auth login flow',
          keywords: ['auth', 'login'],
          featureId: 'FS-010',
        }),
      ];
      const matchResult = makeMatchResult({ unmatchedItems });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        matchResult,
        makeUserInputs(),
      );

      expect(result.unmatchedSuggestions).toBeDefined();
      expect(result.unmatchedSuggestions!.length).toBeGreaterThan(0);
      expect(result.unmatchedSuggestions![0].id).toBe('US-100');
    });

    it('should find orphaned modules (zero work items) in umbrella projects', async () => {
      const modules = [
        makeModule({ name: 'orphan-lib', path: 'repos/orphan-lib' }),
      ];
      const discovery = makeDiscovery({
        modules,
        umbrella: { isUmbrella: true, source: 'config', childRepoCount: 1 },
      });
      // No work items mapped to orphan-lib

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        makeMatchResult(),
        makeUserInputs(),
      );

      expect(result.orphanedModules).toBeDefined();
      expect(result.orphanedModules!).toHaveLength(1);
      expect(result.orphanedModules![0].name).toBe('orphan-lib');
    });

    it('should build team summary for umbrella projects', async () => {
      const modules = [
        makeModule({ name: 'producthub-fe', path: 'repos/producthub-fe', hasReadme: true }),
        makeModule({ name: 'producthub-be', path: 'repos/producthub-be' }),
        makeModule({ name: 'inventory-api', path: 'repos/inventory-api' }),
      ];
      const discovery = makeDiscovery({
        modules,
        umbrella: { isUmbrella: true, source: 'config', childRepoCount: 3 },
      });
      const moduleMap = new Map([
        ['producthub-fe', makeMapping({ moduleName: 'producthub-fe', workItemCount: 5 })],
        ['producthub-be', makeMapping({ moduleName: 'producthub-be', workItemCount: 3 })],
        ['inventory-api', makeMapping({ moduleName: 'inventory-api', workItemCount: 7 })],
      ]);
      const matchResult = makeMatchResult({ moduleMap });

      const result = await generateSuggestions(
        '/project',
        discovery,
        new Map(),
        matchResult,
        makeUserInputs(),
      );

      expect(result.teamSummary).toBeDefined();
      const producthub = result.teamSummary!.get('producthub');
      expect(producthub).toBeDefined();
      expect(producthub!.modules).toBe(2);
      expect(producthub!.workItems).toBe(8);

      const inventory = result.teamSummary!.get('inventory');
      expect(inventory).toBeDefined();
      expect(inventory!.modules).toBe(1);
      expect(inventory!.workItems).toBe(7);
    });
  });
});

// ===========================================================================
// Unmatched suggestions generation (tested via generateSuggestions)
// ===========================================================================

describe('unmatched suggestions generation', () => {
  const umbrellaDiscovery = (modules: ModuleInfo[]) =>
    makeDiscovery({
      modules,
      umbrella: { isUmbrella: true, source: 'config', childRepoCount: modules.length },
    });

  it('should match unmatched items to modules by keyword', async () => {
    const modules = [makeModule({ name: 'payment-service', path: 'repos/payment-service' })];
    const unmatchedItems = [
      makeWorkItem({ id: 'US-50', keywords: ['payment', 'billing'], featureId: 'FS-005' }),
    ];
    const matchResult = makeMatchResult({ unmatchedItems });

    const result = await generateSuggestions(
      '/project',
      umbrellaDiscovery(modules),
      new Map(),
      matchResult,
      makeUserInputs(),
    );

    const suggestion = result.unmatchedSuggestions!.find(s => s.id === 'US-50');
    expect(suggestion).toBeDefined();
    expect(suggestion!.suggestedModules.length).toBeGreaterThan(0);
    expect(suggestion!.suggestedModules[0].name).toBe('payment-service');
    expect(suggestion!.suggestedModules[0].confidence).toBe('medium');
  });

  it('should match unmatched items to modules by team', async () => {
    const modules = [makeModule({ name: 'sales-dashboard', path: 'repos/sales-dashboard' })];
    const unmatchedItems = [
      makeWorkItem({ id: 'US-60', keywords: [], team: 'sales', featureId: 'FS-006' }),
    ];
    const matchResult = makeMatchResult({ unmatchedItems });

    const result = await generateSuggestions(
      '/project',
      umbrellaDiscovery(modules),
      new Map(),
      matchResult,
      makeUserInputs(),
    );

    const suggestion = result.unmatchedSuggestions!.find(s => s.id === 'US-60');
    expect(suggestion).toBeDefined();
    expect(suggestion!.suggestedModules.some(m => m.confidence === 'high')).toBe(true);
    expect(suggestion!.suggestedModules.some(m => m.reason.includes('Team'))).toBe(true);
  });

  it('should match unmatched items to modules by area path', async () => {
    const modules = [makeModule({ name: 'inventory-api', path: 'repos/inventory-api' })];
    const unmatchedItems = [
      makeWorkItem({
        id: 'US-70',
        keywords: [],
        areaPath: 'Acme\\Inventory\\Backend',
        featureId: 'FS-007',
      }),
    ];
    const matchResult = makeMatchResult({ unmatchedItems });

    const result = await generateSuggestions(
      '/project',
      umbrellaDiscovery(modules),
      new Map(),
      matchResult,
      makeUserInputs(),
    );

    const suggestion = result.unmatchedSuggestions!.find(s => s.id === 'US-70');
    expect(suggestion).toBeDefined();
    expect(suggestion!.suggestedModules.some(m => m.reason.includes('Area path'))).toBe(true);
  });

  it('should deduplicate suggested modules', async () => {
    const modules = [makeModule({ name: 'auth-service', path: 'repos/auth-service' })];
    const unmatchedItems = [
      makeWorkItem({
        id: 'US-80',
        keywords: ['auth', 'authentication'],
        team: 'auth',
        featureId: 'FS-008',
      }),
    ];
    const matchResult = makeMatchResult({ unmatchedItems });

    const result = await generateSuggestions(
      '/project',
      umbrellaDiscovery(modules),
      new Map(),
      matchResult,
      makeUserInputs(),
    );

    const suggestion = result.unmatchedSuggestions!.find(s => s.id === 'US-80');
    const names = suggestion!.suggestedModules.map(m => m.name);
    const uniqueNames = [...new Set(names)];
    expect(names).toEqual(uniqueNames);
  });

  it('should limit unmatched items to first 50', async () => {
    const modules = [makeModule({ name: 'core' })];
    const unmatchedItems = Array.from({ length: 60 }, (_, i) =>
      makeWorkItem({ id: `US-${i}`, featureId: `FS-${i}`, keywords: [] }),
    );
    const matchResult = makeMatchResult({ unmatchedItems });

    const result = await generateSuggestions(
      '/project',
      umbrellaDiscovery(modules),
      new Map(),
      matchResult,
      makeUserInputs(),
    );

    expect(result.unmatchedSuggestions!.length).toBe(50);
  });

  it('should limit suggested modules per item to 5', async () => {
    const modules = Array.from({ length: 10 }, (_, i) =>
      makeModule({ name: `auth-mod-${i}`, path: `repos/auth-mod-${i}` }),
    );
    const unmatchedItems = [
      makeWorkItem({
        id: 'US-90',
        keywords: ['auth'],
        team: 'auth',
        areaPath: 'Org\\Auth\\Service',
        featureId: 'FS-009',
      }),
    ];
    const matchResult = makeMatchResult({ unmatchedItems });

    const result = await generateSuggestions(
      '/project',
      umbrellaDiscovery(modules),
      new Map(),
      matchResult,
      makeUserInputs(),
    );

    expect(result.unmatchedSuggestions![0].suggestedModules.length).toBeLessThanOrEqual(5);
  });

  it('should return empty suggestedModules when no match found', async () => {
    const modules = [makeModule({ name: 'totally-unrelated' })];
    const unmatchedItems = [
      makeWorkItem({ id: 'US-99', keywords: ['exotic', 'niche'], featureId: 'FS-099' }),
    ];
    const matchResult = makeMatchResult({ unmatchedItems });

    const result = await generateSuggestions(
      '/project',
      umbrellaDiscovery(modules),
      new Map(),
      matchResult,
      makeUserInputs(),
    );

    expect(result.unmatchedSuggestions![0].suggestedModules).toEqual([]);
  });
});

// ===========================================================================
// Orphaned modules detection
// ===========================================================================

describe('orphaned modules detection', () => {
  const umbrellaDiscovery = (modules: ModuleInfo[]) =>
    makeDiscovery({
      modules,
      umbrella: { isUmbrella: true, source: 'config', childRepoCount: modules.length },
    });

  it('should mark undocumented zero-work-item module as potential tech debt', async () => {
    const mod = makeModule({ name: 'dead-code', hasReadme: false, hasTests: false });
    const discovery = umbrellaDiscovery([mod]);

    const result = await generateSuggestions(
      '/project',
      discovery,
      new Map(),
      makeMatchResult(),
      makeUserInputs(),
    );

    const orphan = result.orphanedModules!.find(o => o.name === 'dead-code');
    expect(orphan).toBeDefined();
    expect(orphan!.reason).toContain('tech debt');
  });

  it('should mark tested-but-undocumented zero-work-item module appropriately', async () => {
    const mod = makeModule({ name: 'test-only', hasReadme: false, hasTests: true });
    const discovery = umbrellaDiscovery([mod]);

    const result = await generateSuggestions(
      '/project',
      discovery,
      new Map(),
      makeMatchResult(),
      makeUserInputs(),
    );

    const orphan = result.orphanedModules!.find(o => o.name === 'test-only');
    expect(orphan).toBeDefined();
    expect(orphan!.reason).toContain('Has tests but no README');
  });

  it('should mark documented zero-work-item module as infrastructure/utility', async () => {
    const mod = makeModule({ name: 'shared-utils', hasReadme: true });
    const discovery = umbrellaDiscovery([mod]);

    const result = await generateSuggestions(
      '/project',
      discovery,
      new Map(),
      makeMatchResult(),
      makeUserInputs(),
    );

    const orphan = result.orphanedModules!.find(o => o.name === 'shared-utils');
    expect(orphan).toBeDefined();
    expect(orphan!.reason).toContain('infrastructure or utility');
  });

  it('should not include modules with work items as orphaned', async () => {
    const mod = makeModule({ name: 'active-mod' });
    const discovery = umbrellaDiscovery([mod]);
    const matchResult = makeMatchResult({
      moduleMap: new Map([
        ['active-mod', makeMapping({ moduleName: 'active-mod', workItemCount: 3 })],
      ]),
    });

    const result = await generateSuggestions(
      '/project',
      discovery,
      new Map(),
      matchResult,
      makeUserInputs(),
    );

    expect(result.orphanedModules!.find(o => o.name === 'active-mod')).toBeUndefined();
  });
});

// ===========================================================================
// Team summary building
// ===========================================================================

describe('team summary building', () => {
  const umbrellaDiscovery = (modules: ModuleInfo[]) =>
    makeDiscovery({
      modules,
      umbrella: { isUmbrella: true, source: 'config', childRepoCount: modules.length },
    });

  it('should extract team from module name prefix', async () => {
    const modules = [
      makeModule({ name: 'sales-fe', path: 'repos/sales-fe' }),
      makeModule({ name: 'sales-be', path: 'repos/sales-be' }),
    ];
    const discovery = umbrellaDiscovery(modules);

    const result = await generateSuggestions(
      '/project',
      discovery,
      new Map(),
      makeMatchResult(),
      makeUserInputs(),
    );

    const sales = result.teamSummary!.get('sales');
    expect(sales).toBeDefined();
    expect(sales!.modules).toBe(2);
  });

  it('should use "other" for modules without hyphenated prefix', async () => {
    const modules = [makeModule({ name: 'standalone', path: 'repos/standalone' })];
    const discovery = umbrellaDiscovery(modules);

    const result = await generateSuggestions(
      '/project',
      discovery,
      new Map(),
      makeMatchResult(),
      makeUserInputs(),
    );

    const other = result.teamSummary!.get('other');
    expect(other).toBeDefined();
    expect(other!.modules).toBe(1);
  });

  it('should aggregate work items across modules in the same team', async () => {
    const modules = [
      makeModule({ name: 'api-gateway', path: 'repos/api-gateway' }),
      makeModule({ name: 'api-service', path: 'repos/api-service' }),
    ];
    const discovery = umbrellaDiscovery(modules);
    const moduleMap = new Map([
      ['api-gateway', makeMapping({ moduleName: 'api-gateway', workItemCount: 4 })],
      ['api-service', makeMapping({ moduleName: 'api-service', workItemCount: 6 })],
    ]);

    const result = await generateSuggestions(
      '/project',
      discovery,
      new Map(),
      makeMatchResult({ moduleMap }),
      makeUserInputs(),
    );

    const api = result.teamSummary!.get('api');
    expect(api).toBeDefined();
    expect(api!.workItems).toBe(10);
  });

  it('should calculate average coverage per team', async () => {
    const modules = [
      makeModule({ name: 'team-fe', path: 'repos/team-fe', hasReadme: true }),  // 40
      makeModule({ name: 'team-be', path: 'repos/team-be', hasReadme: false }), // 0
    ];
    const discovery = umbrellaDiscovery(modules);

    const result = await generateSuggestions(
      '/project',
      discovery,
      new Map(),
      makeMatchResult(),
      makeUserInputs(),
    );

    const team = result.teamSummary!.get('team');
    expect(team).toBeDefined();
    // (40 + 0) / 2 = 20
    expect(team!.coverage).toBe(20);
  });
});

// ===========================================================================
// formatSuggestionsMarkdown
// ===========================================================================

describe('formatSuggestionsMarkdown', () => {
  it('should include title and generation timestamp', () => {
    const md = formatSuggestionsMarkdown(makeReport());
    expect(md).toContain('# Living Docs Suggestions');
    expect(md).toContain('*Generated:');
  });

  it('should include summary table with all metrics', () => {
    const report = makeReport({
      summary: {
        totalModules: 10,
        modulesDocumented: 3,
        modulesPartial: 4,
        modulesUndocumented: 3,
        totalWorkItems: 50,
        matchedWorkItems: 35,
        coveragePercent: 67,
      },
    });
    const md = formatSuggestionsMarkdown(report);

    expect(md).toContain('| Total Modules | 10 |');
    expect(md).toContain('| Fully Documented | 3 |');
    expect(md).toContain('| Partially Documented | 4 |');
    expect(md).toContain('| Undocumented | 3 |');
    expect(md).toContain('| Documentation Coverage | 67% |');
    expect(md).toContain('| Work Items Matched | 35/50 |');
  });

  // --- Priority zones ---

  it('should render priority zones table when zones exist', () => {
    const report = makeReport({
      priorityZones: [
        {
          name: 'payments',
          path: 'src/payments',
          workItems: 12,
          docStatus: 'none',
          action: 'START HERE',
          focusFiles: ['US-001'],
        },
      ],
    });
    const md = formatSuggestionsMarkdown(report);

    expect(md).toContain('## Priority Zones');
    expect(md).toContain('| payments |');
    expect(md).toContain('| 12 |');
  });

  it('should show correct status icons in priority zones', () => {
    const zones: PriorityZone[] = [
      { name: 'a', path: 'a', workItems: 1, docStatus: 'complete', action: 'review', focusFiles: [] },
      { name: 'b', path: 'b', workItems: 1, docStatus: 'partial', action: 'enhance', focusFiles: [] },
      { name: 'c', path: 'c', workItems: 1, docStatus: 'none', action: 'start', focusFiles: [] },
    ];
    const md = formatSuggestionsMarkdown(makeReport({ priorityZones: zones }));

    // Each row should have the correct status icon
    const lines = md.split('\n');
    const aLine = lines.find(l => l.includes('| a |'));
    const bLine = lines.find(l => l.includes('| b |'));
    const cLine = lines.find(l => l.includes('| c |'));

    expect(aLine).toContain('\u2705');    // checkmark
    expect(bLine).toContain('\u26A0\uFE0F'); // warning
    expect(cLine).toContain('\u274C');    // cross
  });

  it('should omit priority zones section when empty', () => {
    const md = formatSuggestionsMarkdown(makeReport({ priorityZones: [] }));
    expect(md).not.toContain('## Priority Zones');
  });

  // --- Immediate actions ---

  it('should render immediate actions with priority numbers', () => {
    const actions: ImmediateAction[] = [
      {
        priority: 1,
        module: 'auth',
        action: 'Create README',
        files: ['src/auth/README.md'],
        reason: '5 work items',
      },
    ];
    const md = formatSuggestionsMarkdown(makeReport({ immediateActions: actions }));

    expect(md).toContain('## Immediate Actions');
    expect(md).toContain('### 1. auth');
    expect(md).toContain('**Action**: Create README');
    expect(md).toContain('**Reason**: 5 work items');
    expect(md).toContain('- `src/auth/README.md`');
  });

  it('should omit immediate actions section when empty', () => {
    const md = formatSuggestionsMarkdown(makeReport({ immediateActions: [] }));
    expect(md).not.toContain('## Immediate Actions');
  });

  // --- Additional sources ---

  it('should render additional sources when present', () => {
    const md = formatSuggestionsMarkdown(
      makeReport({ additionalSources: ['docs/wiki', 'docs/api'] }),
    );

    expect(md).toContain('## Additional Sources Processed');
    expect(md).toContain('- `docs/wiki`');
    expect(md).toContain('- `docs/api`');
  });

  it('should omit additional sources section when empty', () => {
    const md = formatSuggestionsMarkdown(makeReport({ additionalSources: [] }));
    expect(md).not.toContain('## Additional Sources Processed');
  });

  // --- Pain points ---

  it('should render pain points when present', () => {
    const md = formatSuggestionsMarkdown(
      makeReport({ painPointsAddressed: ['"auth" -> Documented in auth-service (partial)'] }),
    );

    expect(md).toContain('## Known Pain Points Addressed');
    expect(md).toContain('- "auth" -> Documented in auth-service (partial)');
  });

  it('should omit pain points section when empty', () => {
    const md = formatSuggestionsMarkdown(makeReport({ painPointsAddressed: [] }));
    expect(md).not.toContain('## Known Pain Points Addressed');
  });

  // --- Not analyzed ---

  it('should render not-analyzed table when items exist', () => {
    const md = formatSuggestionsMarkdown(
      makeReport({
        notAnalyzed: [{ path: 'src/legacy', reason: 'Analysis skipped', filesSkipped: 50 }],
      }),
    );

    expect(md).toContain('## Directories Not Fully Analyzed');
    expect(md).toContain('| `src/legacy` | Analysis skipped | 50 |');
  });

  it('should truncate not-analyzed to 20 items and show count', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      path: `src/mod-${i}`,
      reason: 'Sampled',
      filesSkipped: 10,
    }));
    const md = formatSuggestionsMarkdown(makeReport({ notAnalyzed: items }));

    const tableRows = md.split('\n').filter(l => l.startsWith('| `src/mod-'));
    expect(tableRows.length).toBe(20);
    expect(md).toContain('5 more');
  });

  it('should omit not-analyzed section when empty', () => {
    const md = formatSuggestionsMarkdown(makeReport({ notAnalyzed: [] }));
    expect(md).not.toContain('## Directories Not Fully Analyzed');
  });

  // --- Module status table ---

  it('should always include module documentation status table', () => {
    const statuses: ModuleDocStatus[] = [
      {
        moduleName: 'core',
        modulePath: 'src/core',
        hasReadme: true,
        hasAnalysis: true,
        coverage: 80,
        workItemCount: 5,
        priority: 'high',
        status: 'complete',
      },
    ];
    const md = formatSuggestionsMarkdown(makeReport({ moduleStatuses: statuses }));

    expect(md).toContain('## Module Documentation Status');
    expect(md).toContain('<details>');
    expect(md).toContain('| core |');
    expect(md).toContain('| 80% |');
    expect(md).toContain('</details>');
  });

  it('should show correct icons for readme and analysis in status table', () => {
    const statuses: ModuleDocStatus[] = [
      {
        moduleName: 'has-both',
        modulePath: 'a',
        hasReadme: true,
        hasAnalysis: true,
        coverage: 80,
        workItemCount: 0,
        priority: 'low',
        status: 'complete',
      },
      {
        moduleName: 'has-none',
        modulePath: 'b',
        hasReadme: false,
        hasAnalysis: false,
        coverage: 0,
        workItemCount: 0,
        priority: 'low',
        status: 'none',
      },
    ];
    const md = formatSuggestionsMarkdown(makeReport({ moduleStatuses: statuses }));

    const lines = md.split('\n');
    const hasBothLine = lines.find(l => l.includes('has-both'));
    const hasNoneLine = lines.find(l => l.includes('has-none'));

    // has-both should have two checkmarks
    expect(hasBothLine!.match(/\u2705/g)?.length).toBe(2);
    // has-none should have two crosses
    expect(hasNoneLine!.match(/\u274C/g)?.length).toBe(2);
  });

  // --- Footer ---

  it('should include footer with generator attribution', () => {
    const md = formatSuggestionsMarkdown(makeReport());
    expect(md).toContain('*Generated by SpecWeave Living Docs Builder*');
    expect(md).toContain('/sw:jobs');
  });

  // --- Umbrella sections ---

  describe('umbrella-specific markdown sections', () => {
    it('should render team summary table for umbrella projects', () => {
      const teamSummary = new Map([
        ['producthub', { modules: 3, workItems: 15, coverage: 60 }],
        ['inventory', { modules: 2, workItems: 8, coverage: 90 }],
      ]);
      const md = formatSuggestionsMarkdown(
        makeReport({ isUmbrella: true, teamSummary }),
      );

      expect(md).toContain('## Team Summary');
      expect(md).toContain('| producthub | 3 | 15 |');
      expect(md).toContain('| inventory | 2 | 8 |');
    });

    it('should show correct coverage icons in team summary', () => {
      const teamSummary = new Map([
        ['high', { modules: 1, workItems: 1, coverage: 80 }],
        ['mid', { modules: 1, workItems: 1, coverage: 50 }],
        ['low', { modules: 1, workItems: 1, coverage: 20 }],
      ]);
      const md = formatSuggestionsMarkdown(
        makeReport({ isUmbrella: true, teamSummary }),
      );

      const lines = md.split('\n');
      const highLine = lines.find(l => l.includes('| high |'));
      const midLine = lines.find(l => l.includes('| mid |'));
      const lowLine = lines.find(l => l.includes('| low |'));

      expect(highLine).toContain('\u2705');
      expect(midLine).toContain('\u26A0\uFE0F');
      expect(lowLine).toContain('\u274C');
    });

    it('should not render team summary for non-umbrella projects', () => {
      const teamSummary = new Map([
        ['team', { modules: 1, workItems: 1, coverage: 50 }],
      ]);
      const md = formatSuggestionsMarkdown(
        makeReport({ isUmbrella: false, teamSummary }),
      );
      expect(md).not.toContain('## Team Summary');
    });

    it('should not render team summary when empty', () => {
      const md = formatSuggestionsMarkdown(
        makeReport({ isUmbrella: true, teamSummary: new Map() }),
      );
      expect(md).not.toContain('## Team Summary');
    });

    it('should render unmatched work items section for umbrella projects', () => {
      const unmatchedSuggestions: UnmatchedItemSuggestion[] = [
        {
          id: 'US-100',
          title: 'Fix the login bug that causes redirect loops',
          featureId: 'FS-010',
          areaPath: 'Acme\\Auth',
          team: 'auth',
          suggestedModules: [
            { name: 'auth-fe', reason: 'Team matches', confidence: 'high' },
          ],
        },
      ];
      const md = formatSuggestionsMarkdown(
        makeReport({ isUmbrella: true, unmatchedSuggestions }),
      );

      expect(md).toContain('## Unmatched Work Items');
      expect(md).toContain('1 work items could not be matched');
      expect(md).toContain('### US-100: Fix the login bug that causes redirect loops');
      expect(md).toContain('**Area Path**: `Acme\\Auth`');
      expect(md).toContain('**Team**: auth');
      expect(md).toContain('`auth-fe`');
    });

    it('should truncate long unmatched item titles to 60 chars', () => {
      const longTitle = 'A'.repeat(80);
      const unmatchedSuggestions: UnmatchedItemSuggestion[] = [
        {
          id: 'US-200',
          title: longTitle,
          featureId: 'FS-020',
          suggestedModules: [],
        },
      ];
      const md = formatSuggestionsMarkdown(
        makeReport({ isUmbrella: true, unmatchedSuggestions }),
      );

      expect(md).toContain('A'.repeat(60) + '...');
    });

    it('should show "None" when unmatched item has no suggested modules', () => {
      const unmatchedSuggestions: UnmatchedItemSuggestion[] = [
        {
          id: 'US-300',
          title: 'Orphan work item',
          featureId: 'FS-030',
          suggestedModules: [],
        },
      ];
      const md = formatSuggestionsMarkdown(
        makeReport({ isUmbrella: true, unmatchedSuggestions }),
      );

      expect(md).toContain('None (consider creating new module)');
    });

    it('should limit unmatched items display to 20 and show overflow count', () => {
      const unmatchedSuggestions = Array.from({ length: 25 }, (_, i) => ({
        id: `US-${i}`,
        title: `Item ${i}`,
        featureId: `FS-${i}`,
        suggestedModules: [],
      }));
      const md = formatSuggestionsMarkdown(
        makeReport({ isUmbrella: true, unmatchedSuggestions }),
      );

      expect(md).toContain('5 more unmatched items');
    });

    it('should not render unmatched section for non-umbrella projects', () => {
      const md = formatSuggestionsMarkdown(
        makeReport({
          isUmbrella: false,
          unmatchedSuggestions: [
            { id: 'US-1', title: 'X', featureId: 'FS-1', suggestedModules: [] },
          ],
        }),
      );
      expect(md).not.toContain('## Unmatched Work Items');
    });

    it('should render orphaned modules table for umbrella projects', () => {
      const orphanedModules = [
        { name: 'dead-lib', path: 'repos/dead-lib', reason: 'No documentation and no work items' },
      ];
      const md = formatSuggestionsMarkdown(
        makeReport({ isUmbrella: true, orphanedModules }),
      );

      expect(md).toContain('## Orphaned Modules');
      expect(md).toContain('| dead-lib |');
    });

    it('should truncate orphaned modules to 30 and show overflow count', () => {
      const orphanedModules = Array.from({ length: 35 }, (_, i) => ({
        name: `mod-${i}`,
        path: `repos/mod-${i}`,
        reason: 'orphaned',
      }));
      const md = formatSuggestionsMarkdown(
        makeReport({ isUmbrella: true, orphanedModules }),
      );

      const tableRows = md.split('\n').filter(l => l.startsWith('| mod-'));
      expect(tableRows.length).toBe(30);
      expect(md).toContain('5 more');
    });

    it('should not render orphaned section for non-umbrella projects', () => {
      const md = formatSuggestionsMarkdown(
        makeReport({
          isUmbrella: false,
          orphanedModules: [{ name: 'x', path: 'x', reason: 'x' }],
        }),
      );
      expect(md).not.toContain('## Orphaned Modules');
    });
  });
});

// ===========================================================================
// saveSuggestionsReport
// ===========================================================================

describe('saveSuggestionsReport', () => {
  it('should create output directory under .specweave/docs', async () => {
    const report = makeReport();
    await saveSuggestionsReport('/project', report);

    expect(mockEnsureDirSync).toHaveBeenCalledWith('/project/.specweave/docs');
  });

  it('should write markdown to SUGGESTIONS.md', async () => {
    const report = makeReport();
    await saveSuggestionsReport('/project', report);

    const mdCall = mockWriteFileSync.mock.calls.find(
      (c: [string, string]) => c[0] === '/project/.specweave/docs/SUGGESTIONS.md',
    );
    expect(mdCall).toBeDefined();
    expect(mdCall![1]).toContain('# Living Docs Suggestions');
  });

  it('should write JSON to suggestions.json', async () => {
    const report = makeReport();
    await saveSuggestionsReport('/project', report);

    const jsonCall = mockWriteFileSync.mock.calls.find(
      (c: [string, string]) => c[0] === '/project/.specweave/docs/suggestions.json',
    );
    expect(jsonCall).toBeDefined();
    const parsed = JSON.parse(jsonCall![1]);
    expect(parsed.generatedAt).toBe(FROZEN_DATE);
  });

  it('should return the path to the markdown file', async () => {
    const result = await saveSuggestionsReport('/project', makeReport());
    expect(result).toBe('/project/.specweave/docs/SUGGESTIONS.md');
  });
});

// ===========================================================================
// Edge cases
// ===========================================================================

describe('edge cases', () => {
  it('should handle empty discovery (no modules)', async () => {
    const result = await generateSuggestions(
      '/project',
      makeDiscovery({ modules: [] }),
      new Map(),
      makeMatchResult(),
      makeUserInputs(),
    );

    expect(result.moduleStatuses).toEqual([]);
    expect(result.summary.totalModules).toBe(0);
    expect(result.summary.coveragePercent).toBe(0);
    expect(result.priorityZones).toEqual([]);
    expect(result.immediateActions).toEqual([]);
  });

  it('should handle empty match result', async () => {
    const modules = [makeModule()];
    const discovery = makeDiscovery({ modules });

    const result = await generateSuggestions(
      '/project',
      discovery,
      new Map(),
      makeMatchResult({
        moduleMap: new Map(),
        priorityQueue: [],
        unmatchedItems: [],
        stats: { totalWorkItems: 0, matchedWorkItems: 0, unmatchedWorkItems: 0, modulesWithWorkItems: 0 },
      }),
      makeUserInputs(),
    );

    expect(result.summary.totalWorkItems).toBe(0);
    expect(result.summary.matchedWorkItems).toBe(0);
  });

  it('should handle priority queue entries referencing non-existent modules', async () => {
    const discovery = makeDiscovery({ modules: [makeModule({ name: 'real-mod' })] });
    const matchResult = makeMatchResult({
      priorityQueue: [
        makePriorityEntry({ moduleName: 'ghost-mod', workItemCount: 5 }),
      ],
    });

    const result = await generateSuggestions(
      '/project',
      discovery,
      new Map(),
      matchResult,
      makeUserInputs(),
    );

    // ghost-mod should be silently skipped
    expect(result.priorityZones).toHaveLength(0);
  });

  it('should handle user inputs with all empty arrays', async () => {
    const result = await generateSuggestions(
      '/project',
      makeDiscovery(),
      new Map(),
      makeMatchResult(),
      makeUserInputs({
        additionalSources: [],
        priorityAreas: [],
        knownPainPoints: [],
      }),
    );

    expect(result.additionalSources).toEqual([]);
    expect(result.painPointsAddressed).toEqual([]);
  });

  it('should format empty report without errors', () => {
    const md = formatSuggestionsMarkdown(makeReport());
    expect(md).toContain('# Living Docs Suggestions');
    expect(md).toContain('## Summary');
    expect(md).toContain('## Module Documentation Status');
  });

  it('should handle umbrella with empty umbrella field', async () => {
    const discovery = makeDiscovery({
      umbrella: { isUmbrella: false, source: 'none', childRepoCount: 0 },
    });

    const result = await generateSuggestions(
      '/project',
      discovery,
      new Map(),
      makeMatchResult(),
      makeUserInputs(),
    );

    expect(result.isUmbrella).toBe(false);
  });

  it('should handle work items with empty keywords for unmatched suggestions', async () => {
    const modules = [makeModule({ name: 'some-mod' })];
    const discovery = makeDiscovery({
      modules,
      umbrella: { isUmbrella: true, source: 'config', childRepoCount: 1 },
    });
    const unmatchedItems = [
      makeWorkItem({ id: 'US-empty', keywords: [], featureId: 'FS-empty' }),
    ];

    const result = await generateSuggestions(
      '/project',
      discovery,
      new Map(),
      makeMatchResult({ unmatchedItems }),
      makeUserInputs(),
    );

    expect(result.unmatchedSuggestions).toBeDefined();
    expect(result.unmatchedSuggestions![0].suggestedModules).toEqual([]);
  });

  it('should handle area path with double-escaped backslashes', async () => {
    const modules = [makeModule({ name: 'inventory-api' })];
    const discovery = makeDiscovery({
      modules,
      umbrella: { isUmbrella: true, source: 'config', childRepoCount: 1 },
    });
    const unmatchedItems = [
      makeWorkItem({
        id: 'US-esc',
        keywords: [],
        areaPath: 'Acme\\\\Inventory\\\\Backend',
        featureId: 'FS-esc',
      }),
    ];

    const result = await generateSuggestions(
      '/project',
      discovery,
      new Map(),
      makeMatchResult({ unmatchedItems }),
      makeUserInputs(),
    );

    // The area path handler replaces \\\\ with \ then splits on \
    // After replacement: 'Acme\Inventory\Backend', segments[1] = 'Inventory'
    const suggestion = result.unmatchedSuggestions!.find(s => s.id === 'US-esc');
    expect(suggestion).toBeDefined();
    expect(suggestion!.suggestedModules.some(m => m.name === 'inventory-api')).toBe(true);
  });
});
