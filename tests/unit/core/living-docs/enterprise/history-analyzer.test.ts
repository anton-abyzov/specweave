/**
 * HistoryAnalyzer Tests
 *
 * Tests for the history analyzer that builds project timelines from
 * git commits, increment metadata, feature specs, and releases.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const {
  mockExistsSync,
  mockReadFileSync,
  mockReaddirSync,
  mockExecSync,
  mockGlob,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockReaddirSync: vi.fn(),
  mockExecSync: vi.fn(),
  mockGlob: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  readdirSync: mockReaddirSync,
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    readdirSync: mockReaddirSync,
  },
}));

vi.mock('child_process', () => ({
  execSync: mockExecSync,
}));

vi.mock('glob', () => ({
  glob: mockGlob,
}));

vi.mock('../../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ── Import SUT ─────────────────────────────────────────────────────────────

import {
  HistoryAnalyzer,
  type ProjectTimeline,
  type TimelineEvent,
} from '../../../../../src/core/living-docs/enterprise/history-analyzer.js';
import type { SpecsCatalog, EnhancedFeatureSpec } from '../../../../../src/core/living-docs/enterprise/spec-loader.js';

// ── Test Helpers ───────────────────────────────────────────────────────────

const silentLogger = {
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

function makeFeature(overrides: Partial<EnhancedFeatureSpec> = {}): EnhancedFeatureSpec {
  return {
    featureId: 'FS-001',
    featureName: 'Test Feature',
    description: 'A test feature',
    userStories: [],
    status: 'active',
    createdAt: '2025-01-01',
    externalRefs: [],
    relatedIncrements: [],
    folderPath: '/test',
    totalACs: 5,
    completedACs: 0,
    completionPercentage: 0,
    ...overrides,
  };
}

function makeCatalog(features: EnhancedFeatureSpec[] = []): SpecsCatalog {
  return {
    features,
    totalFeatures: features.length,
    activeFeatures: features.filter(f => f.status === 'active').length,
    completedFeatures: features.filter(f => f.status === 'completed').length,
    archivedFeatures: features.filter(f => f.status === 'archived').length,
    totalUserStories: 0,
    totalACs: 0,
    completedACs: 0,
    overallCompletion: 0,
    byProject: new Map(),
    byStatus: new Map(),
    loadedAt: new Date().toISOString(),
  };
}

function makeDirent(name: string, isDir = true) {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
    parentPath: '',
    path: '',
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('HistoryAnalyzer', () => {
  let analyzer: HistoryAnalyzer;

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new HistoryAnalyzer({
      projectPath: '/project',
      logger: silentLogger,
    });

    // Default: no increments dir, no config, no package.json, no git
    mockExistsSync.mockReturnValue(false);
    mockExecSync.mockImplementation(() => { throw new Error('no git'); });
  });

  // ─── Constructor ──────────────────────────────────────────────

  describe('constructor', () => {
    it('should use consoleLogger when no logger is provided', () => {
      const a = new HistoryAnalyzer({ projectPath: '/test' });
      expect(a).toBeDefined();
    });

    it('should accept custom logger', () => {
      const a = new HistoryAnalyzer({ projectPath: '/test', logger: silentLogger });
      expect(a).toBeDefined();
    });
  });

  // ─── analyze() ────────────────────────────────────────────────

  describe('analyze', () => {
    it('should return empty timeline when no data exists', async () => {
      const result = await analyzer.analyze(makeCatalog());

      expect(result).toMatchObject({
        projectName: 'project', // basename of /project
        events: [],
        milestones: [],
        releases: [],
      });
    });

    it('should sort events by date', async () => {
      // Setup features with dates to produce events
      const features = [
        makeFeature({ featureId: 'FS-002', featureName: 'Late', createdAt: '2025-06-01' }),
        makeFeature({ featureId: 'FS-001', featureName: 'Early', createdAt: '2025-01-01' }),
      ];
      const catalog = makeCatalog(features);

      const result = await analyzer.analyze(catalog);

      const featureEvents = result.events.filter(e => e.type === 'feature_started');
      expect(featureEvents.length).toBe(2);
      expect(featureEvents[0].title).toContain('Early');
      expect(featureEvents[1].title).toContain('Late');
    });

    it('should include feature events from catalog', async () => {
      const features = [
        makeFeature({
          featureId: 'FS-001',
          featureName: 'Auth',
          createdAt: '2025-01-15',
          status: 'completed',
          completedAt: '2025-02-10',
          totalACs: 10,
        }),
      ];
      const catalog = makeCatalog(features);

      const result = await analyzer.analyze(catalog);

      expect(result.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'feature_started', title: 'Feature: Auth' }),
          expect.objectContaining({ type: 'feature_completed', title: 'Completed: Auth' }),
        ])
      );
    });

    it('should include release events from git tags', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git tag -l')) {
          return 'v1.0.0|2025-01-20T10:00:00+00:00\n';
        }
        if (cmd.includes('git describe')) {
          return '';
        }
        if (cmd.includes('git log') && cmd.includes('--oneline')) {
          return 'abc1234 initial commit\ndef5678 second commit\n';
        }
        throw new Error('unexpected cmd');
      });

      const result = await analyzer.analyze(makeCatalog());

      expect(result.releases.length).toBe(1);
      expect(result.releases[0]).toMatchObject({
        version: 'v1.0.0',
        date: '2025-01-20',
      });

      const releaseEvents = result.events.filter(e => e.type === 'release');
      expect(releaseEvents.length).toBe(1);
      expect(releaseEvents[0].title).toBe('Release v1.0.0');
    });

    it('should get project name from config.json', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('config.json')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({ project: { name: 'MyApp' } }));

      const result = await analyzer.analyze(makeCatalog());
      expect(result.projectName).toBe('MyApp');
    });

    it('should fallback to config.name when project.name missing', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('config.json')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({ name: 'FallbackName' }));

      const result = await analyzer.analyze(makeCatalog());
      expect(result.projectName).toBe('FallbackName');
    });

    it('should fallback to basename when config parsing fails', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('config.json')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation(() => { throw new Error('bad json'); });

      const result = await analyzer.analyze(makeCatalog());
      expect(result.projectName).toBe('project');
    });

    it('should get currentVersion from package.json', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('package.json')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({ version: '2.5.0' }));

      const result = await analyzer.analyze(makeCatalog());
      expect(result.currentVersion).toBe('2.5.0');
    });

    it('should fallback currentVersion to git tag when no package.json', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git describe --tags --abbrev=0') && !cmd.includes('^')) {
          return 'v3.0.0\n';
        }
        if (cmd.includes('git tag -l')) return '';
        if (cmd.includes('git log --follow')) return '';
        if (cmd.includes('git log --reverse')) return '';
        throw new Error('no git');
      });

      const result = await analyzer.analyze(makeCatalog());
      expect(result.currentVersion).toBe('v3.0.0');
    });

    it('should return "unknown" when no version info available', async () => {
      const result = await analyzer.analyze(makeCatalog());
      expect(result.currentVersion).toBe('unknown');
    });
  });

  // ─── analyzeIncrements (via analyze) ──────────────────────────

  describe('increment analysis', () => {
    it('should create started events from increment metadata', async () => {
      // Setup increments directory
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('.specweave/increments') && !p.includes('_')) return true;
        if (p.includes('metadata.json')) return true;
        return false;
      });

      mockReaddirSync.mockReturnValue([
        makeDirent('0001-auth'),
      ]);

      mockReadFileSync.mockReturnValue(JSON.stringify({
        createdAt: '2025-01-10',
        title: 'Authentication',
        status: 'in_progress',
        feature_id: 'FS-001',
      }));

      const result = await analyzer.analyze(makeCatalog());

      const startEvents = result.events.filter(e => e.type === 'increment_started');
      expect(startEvents.length).toBe(1);
      expect(startEvents[0]).toMatchObject({
        date: '2025-01-10',
        title: 'Started: 0001-auth',
        description: 'Authentication',
      });
      expect(startEvents[0].relatedEntities).toContain('0001-auth');
      expect(startEvents[0].relatedEntities).toContain('FS-001');
    });

    it('should create completed events for completed increments', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('.specweave/increments') && !p.includes('_')) return true;
        if (p.includes('metadata.json')) return true;
        return false;
      });

      mockReaddirSync.mockReturnValue([
        makeDirent('0001-auth'),
      ]);

      mockReadFileSync.mockReturnValue(JSON.stringify({
        createdAt: '2025-01-10',
        completedAt: '2025-01-15',
        title: 'Authentication',
        status: 'completed',
        feature_id: 'FS-001',
      }));

      const result = await analyzer.analyze(makeCatalog());

      const completedEvents = result.events.filter(e => e.type === 'increment_completed');
      expect(completedEvents.length).toBe(1);
      expect(completedEvents[0]).toMatchObject({
        date: '2025-01-15',
        title: 'Completed: 0001-auth',
      });
    });

    it('should create abandoned events for abandoned increments', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('.specweave/increments') && !p.includes('_')) return true;
        if (p.includes('metadata.json')) return true;
        return false;
      });

      mockReaddirSync.mockReturnValue([
        makeDirent('0002-old-feature'),
      ]);

      mockReadFileSync.mockReturnValue(JSON.stringify({
        createdAt: '2025-01-05',
        abandonedAt: '2025-01-20',
        title: 'Old Feature',
        status: 'abandoned',
        abandonReason: 'Scope changed',
      }));

      const result = await analyzer.analyze(makeCatalog());

      const abandonedEvents = result.events.filter(e => e.type === 'increment_abandoned');
      expect(abandonedEvents.length).toBe(1);
      expect(abandonedEvents[0]).toMatchObject({
        date: '2025-01-20',
        title: 'Abandoned: 0002-old-feature',
        description: 'Scope changed',
      });
    });

    it('should use "No reason provided" for abandoned without reason', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('.specweave/increments') && !p.includes('_')) return true;
        if (p.includes('metadata.json')) return true;
        return false;
      });

      mockReaddirSync.mockReturnValue([makeDirent('0003-dead')]);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        createdAt: '2025-01-05',
        abandonedAt: '2025-01-20',
        status: 'abandoned',
      }));

      const result = await analyzer.analyze(makeCatalog());
      const abandonedEvents = result.events.filter(e => e.type === 'increment_abandoned');
      expect(abandonedEvents[0].description).toBe('No reason provided');
    });

    it('should skip non-directory entries', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('.specweave/increments') && !p.includes('_')) return true;
        return false;
      });

      mockReaddirSync.mockReturnValue([
        makeDirent('README.md', false),
      ]);

      const result = await analyzer.analyze(makeCatalog());
      expect(result.events.filter(e => e.type.startsWith('increment_'))).toHaveLength(0);
    });

    it('should skip directories starting with underscore', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('.specweave/increments') && !p.includes('_archive') && !p.includes('_paused') && !p.includes('_abandoned')) return true;
        return false;
      });

      mockReaddirSync.mockReturnValue([
        makeDirent('_archive'),
      ]);

      const result = await analyzer.analyze(makeCatalog());
      expect(result.events.filter(e => e.type.startsWith('increment_'))).toHaveLength(0);
    });

    it('should handle malformed metadata JSON gracefully', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('.specweave/increments') && !p.includes('_')) return true;
        if (p.includes('metadata.json')) return true;
        return false;
      });

      mockReaddirSync.mockReturnValue([makeDirent('0001-bad')]);
      mockReadFileSync.mockReturnValue('not valid json{');

      const result = await analyzer.analyze(makeCatalog());
      expect(result.events.filter(e => e.type.startsWith('increment_'))).toHaveLength(0);
      expect(silentLogger.debug).toHaveBeenCalled();
    });

    it('should check archive, paused, and abandoned subdirectories', async () => {
      const existingPaths = new Set<string>();

      // Main increments dir exists
      existingPaths.add('/project/.specweave/increments');
      // Archive subdir exists
      existingPaths.add('/project/.specweave/increments/_archive');
      // Metadata in archive
      existingPaths.add('/project/.specweave/increments/_archive/0001-old/metadata.json');

      mockExistsSync.mockImplementation((p: string) => existingPaths.has(p));

      mockReaddirSync.mockImplementation((dir: string) => {
        if (dir === '/project/.specweave/increments') return [];
        if (dir === '/project/.specweave/increments/_archive') {
          return [makeDirent('0001-old')];
        }
        return [];
      });

      mockReadFileSync.mockReturnValue(JSON.stringify({
        createdAt: '2025-01-01',
        completedAt: '2025-01-10',
        title: 'Archived Feature',
        status: 'completed',
      }));

      const result = await analyzer.analyze(makeCatalog());

      const startEvents = result.events.filter(e => e.type === 'increment_started');
      expect(startEvents.length).toBe(1);
    });
  });

  // ─── analyzeFeatureHistory ────────────────────────────────────

  describe('feature history analysis', () => {
    it('should create feature_started event for features with createdAt', async () => {
      const features = [
        makeFeature({
          featureId: 'FS-010',
          featureName: 'Payment System',
          createdAt: '2025-03-01',
          userStories: [
            { id: 'US-001', title: 'Pay', description: '', acceptanceCriteria: [], priority: 'P0', status: 'completed', filePath: '' },
            { id: 'US-002', title: 'Refund', description: '', acceptanceCriteria: [], priority: 'P1', status: 'draft', filePath: '' },
          ],
        }),
      ];

      const result = await analyzer.analyze(makeCatalog(features));

      const started = result.events.find(e => e.type === 'feature_started');
      expect(started).toBeDefined();
      expect(started!.description).toContain('FS-010');
      expect(started!.description).toContain('2 user stories');
      expect(started!.relatedEntities).toContain('FS-010');
      expect(started!.relatedEntities).toContain('US-001');
      expect(started!.relatedEntities).toContain('US-002');
    });

    it('should create feature_completed event for completed features', async () => {
      const features = [
        makeFeature({
          featureId: 'FS-020',
          featureName: 'Search',
          createdAt: '2025-02-01',
          status: 'completed',
          completedAt: '2025-03-15',
          totalACs: 8,
        }),
      ];

      const result = await analyzer.analyze(makeCatalog(features));

      const completed = result.events.find(e => e.type === 'feature_completed');
      expect(completed).toBeDefined();
      expect(completed!.description).toContain('all 8 acceptance criteria met');
    });

    it('should skip feature_completed for non-completed features', async () => {
      const features = [
        makeFeature({ status: 'active', createdAt: '2025-01-01' }),
      ];

      const result = await analyzer.analyze(makeCatalog(features));

      const completed = result.events.filter(e => e.type === 'feature_completed');
      expect(completed).toHaveLength(0);
    });

    it('should skip features without createdAt', async () => {
      const features = [
        makeFeature({ createdAt: '' }),
      ];

      const result = await analyzer.analyze(makeCatalog(features));

      const started = result.events.filter(e => e.type === 'feature_started');
      expect(started).toHaveLength(0);
    });
  });

  // ─── analyzeGitReleases ──────────────────────────────────────

  describe('git release analysis', () => {
    it('should parse multiple tags', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git tag -l')) {
          return 'v1.0.0|2025-01-10T00:00:00+00:00\nv2.0.0|2025-06-15T00:00:00+00:00\n';
        }
        if (cmd.includes('git describe')) return '';
        if (cmd.includes('git log') && cmd.includes('--oneline')) return '';
        if (cmd.includes('git log --reverse')) return '';
        if (cmd.includes('git log --follow')) return '';
        throw new Error('unexpected');
      });

      const result = await analyzer.analyze(makeCatalog());
      expect(result.releases.length).toBe(2);
      // Releases sorted newest first
      expect(result.releases[0].version).toBe('v2.0.0');
      expect(result.releases[1].version).toBe('v1.0.0');
    });

    it('should handle empty git tag output', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git tag -l')) return '';
        if (cmd.includes('git log --reverse')) return '';
        if (cmd.includes('git log --follow')) return '';
        throw new Error('no git');
      });

      const result = await analyzer.analyze(makeCatalog());
      expect(result.releases).toHaveLength(0);
    });

    it('should handle git not available', async () => {
      mockExecSync.mockImplementation(() => { throw new Error('git not found'); });

      const result = await analyzer.analyze(makeCatalog());
      expect(result.releases).toHaveLength(0);
    });

    it('should truncate release changelog to first 3 items in event description', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git tag -l')) {
          return 'v1.0.0|2025-01-10T00:00:00+00:00\n';
        }
        if (cmd.includes('git describe')) return 'v0.9.0\n';
        if (cmd.includes('git log') && cmd.includes('--oneline')) {
          return 'a1 first commit\na2 second commit\na3 third commit\na4 fourth commit\n';
        }
        if (cmd.includes('git log --reverse')) return '';
        if (cmd.includes('git log --follow')) return '';
        throw new Error('unexpected');
      });

      const result = await analyzer.analyze(makeCatalog());

      const releaseEvent = result.events.find(e => e.type === 'release');
      expect(releaseEvent).toBeDefined();
      // Description should contain first 3 changelog entries joined by '; '
      const parts = releaseEvent!.description.split('; ');
      expect(parts.length).toBeLessThanOrEqual(3);
    });

    it('should skip tags with missing version or date', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git tag -l')) {
          return 'v1.0.0|\n|2025-01-10\n';
        }
        if (cmd.includes('git log --reverse')) return '';
        if (cmd.includes('git log --follow')) return '';
        throw new Error('unexpected');
      });

      const result = await analyzer.analyze(makeCatalog());
      expect(result.releases).toHaveLength(0);
    });
  });

  // ─── analyzeConfigHistory ─────────────────────────────────────

  describe('config history analysis', () => {
    it('should detect config changes from git log', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git log --follow')) {
          return 'abc1234|2025-02-15 10:00:00 +0000|update config for multi-project\n';
        }
        if (cmd.includes('git tag -l')) return '';
        if (cmd.includes('git log --reverse')) return '';
        throw new Error('no git');
      });

      const result = await analyzer.analyze(makeCatalog());

      const configEvents = result.events.filter(e => e.type === 'config_change');
      expect(configEvents.length).toBe(1);
      expect(configEvents[0].description).toContain('config');
    });

    it('should skip non-significant config changes', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git log --follow')) {
          return 'abc1234|2025-02-15 10:00:00 +0000|bump version number\n';
        }
        if (cmd.includes('git tag -l')) return '';
        if (cmd.includes('git log --reverse')) return '';
        throw new Error('no git');
      });

      const result = await analyzer.analyze(makeCatalog());

      const configEvents = result.events.filter(e => e.type === 'config_change');
      expect(configEvents.length).toBe(0);
    });

    it('should handle git log failure for config history', async () => {
      mockExecSync.mockImplementation(() => { throw new Error('git error'); });

      const result = await analyzer.analyze(makeCatalog());

      const configEvents = result.events.filter(e => e.type === 'config_change');
      expect(configEvents).toHaveLength(0);
    });
  });

  // ─── deriveMilestones ─────────────────────────────────────────

  describe('milestone derivation', () => {
    it('should create milestone for every 10 completed features', async () => {
      const features: EnhancedFeatureSpec[] = [];
      for (let i = 1; i <= 10; i++) {
        features.push(
          makeFeature({
            featureId: `FS-${String(i).padStart(3, '0')}`,
            featureName: `Feature ${i}`,
            status: 'completed',
            completedAt: `2025-01-${String(i).padStart(2, '0')}`,
            createdAt: `2025-01-${String(i).padStart(2, '0')}`,
          })
        );
      }

      const result = await analyzer.analyze(makeCatalog(features));

      const featureMilestones = result.milestones.filter(m => m.name.includes('Features Completed'));
      expect(featureMilestones.length).toBe(1);
      expect(featureMilestones[0].name).toBe('10 Features Completed');
      expect(featureMilestones[0].features.length).toBe(10);
    });

    it('should not create milestone for fewer than 10 features', async () => {
      const features: EnhancedFeatureSpec[] = [];
      for (let i = 1; i <= 5; i++) {
        features.push(
          makeFeature({
            featureId: `FS-${String(i).padStart(3, '0')}`,
            status: 'completed',
            completedAt: `2025-01-${String(i).padStart(2, '0')}`,
            createdAt: `2025-01-${String(i).padStart(2, '0')}`,
          })
        );
      }

      const result = await analyzer.analyze(makeCatalog(features));

      const featureMilestones = result.milestones.filter(m => m.name.includes('Features Completed'));
      expect(featureMilestones).toHaveLength(0);
    });

    it('should create version milestones for major releases', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git tag -l')) {
          return 'v1.0.0|2025-01-01T00:00:00+00:00\nv1.1.0|2025-02-01T00:00:00+00:00\nv2.0.0|2025-06-01T00:00:00+00:00\n';
        }
        if (cmd.includes('git describe')) return '';
        if (cmd.includes('git log') && cmd.includes('--oneline')) return '';
        if (cmd.includes('git log --reverse')) return '';
        if (cmd.includes('git log --follow')) return '';
        throw new Error('unexpected');
      });

      const result = await analyzer.analyze(makeCatalog());

      const versionMilestones = result.milestones.filter(m => m.description === 'Major version release');
      expect(versionMilestones.length).toBe(2); // v1.0.0 and v2.0.0
    });
  });

  // ─── getProjectStartDate ──────────────────────────────────────

  describe('project start date', () => {
    it('should use earliest event date when events exist', async () => {
      const features = [
        makeFeature({ createdAt: '2025-03-10' }),
      ];

      const result = await analyzer.analyze(makeCatalog(features));
      expect(result.startDate).toBe('2025-03-10');
    });

    it('should fallback to git first commit when no events', async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git log --reverse')) return '2024-06-15 12:00:00 +0000\n';
        if (cmd.includes('git tag -l')) return '';
        if (cmd.includes('git log --follow')) return '';
        throw new Error('no git');
      });

      const result = await analyzer.analyze(makeCatalog());
      expect(result.startDate).toBe('2024-06-15');
    });

    it('should fallback to current date when no git and no events', async () => {
      const result = await analyzer.analyze(makeCatalog());
      const today = new Date().toISOString().substring(0, 10);
      expect(result.startDate).toBe(today);
    });
  });
});
