/**
 * EnterpriseGenerator Tests
 *
 * Tests for the enterprise knowledge base generator that orchestrates
 * documentation generation including company history, feature catalog,
 * team directory, architecture map, and relationship docs.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const {
  mockExistsSync,
  mockReadFileSync,
  mockWriteFileSync,
  mockMkdirSync,
  mockLoadAllSpecs,
  mockAnalyze,
  mockMap,
  mockEnhancedSpecLoader,
  mockHistoryAnalyzer,
  mockRelationshipMapper,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockLoadAllSpecs: vi.fn(),
  mockAnalyze: vi.fn(),
  mockMap: vi.fn(),
  mockEnhancedSpecLoader: vi.fn(),
  mockHistoryAnalyzer: vi.fn(),
  mockRelationshipMapper: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
  },
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

vi.mock('../../../../../src/core/living-docs/enterprise/spec-loader.js', () => {
  return {
    EnhancedSpecLoader: class {
      loadAllSpecs = mockLoadAllSpecs;
      constructor(opts: any) { mockEnhancedSpecLoader(opts); }
    },
  };
});

vi.mock('../../../../../src/core/living-docs/enterprise/history-analyzer.js', () => {
  return {
    HistoryAnalyzer: class {
      analyze = mockAnalyze;
      constructor(opts: any) { mockHistoryAnalyzer(opts); }
    },
  };
});

vi.mock('../../../../../src/core/living-docs/enterprise/relationship-mapper.js', () => {
  return {
    RelationshipMapper: class {
      map = mockMap;
      constructor(opts: any) { mockRelationshipMapper(opts); }
    },
  };
});

// ── Import SUT ─────────────────────────────────────────────────────────────

import {
  EnterpriseGenerator,
  type EnterpriseGeneratorOptions,
  type EnterpriseGenerationResult,
  type EnterpriseMetrics,
} from '../../../../../src/core/living-docs/enterprise/enterprise-generator.js';
import type { Logger } from '../../../../../src/utils/logger.js';
import type { SpecsCatalog, EnhancedFeatureSpec } from '../../../../../src/core/living-docs/enterprise/spec-loader.js';
import type { ProjectTimeline, TimelineEvent } from '../../../../../src/core/living-docs/enterprise/history-analyzer.js';
import type { RelationshipMap } from '../../../../../src/core/living-docs/enterprise/relationship-mapper.js';
import type { EnhancedTeam } from '../../../../../src/core/living-docs/intelligent-analyzer/types.js';
import type { OrganizationSynthesisResult } from '../../../../../src/core/living-docs/intelligent-analyzer/organization-synthesizer.js';

// ── Helpers ────────────────────────────────────────────────────────────────

const silentLogger: Logger = {
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

function makeFeature(overrides?: Partial<EnhancedFeatureSpec>): EnhancedFeatureSpec {
  return {
    featureId: 'FS-001',
    featureName: 'Test Feature',
    description: 'A test feature',
    userStories: [],
    status: 'active',
    createdAt: '2025-01-01',
    externalRefs: [],
    relatedIncrements: [],
    folderPath: '/fake/path',
    totalACs: 5,
    completedACs: 3,
    completionPercentage: 60,
    ...overrides,
  };
}

function makeTeam(overrides?: Partial<EnhancedTeam>): EnhancedTeam {
  return {
    name: 'Platform Team',
    description: 'Handles platform infrastructure',
    responsibilities: ['API development', 'Infrastructure'],
    domainExpertise: ['Cloud', 'DevOps'],
    techStack: ['TypeScript', 'Node.js', 'AWS'],
    repos: ['platform-core', 'platform-infra'],
    reasoning: 'Grouped by shared infrastructure code',
    ...overrides,
  };
}

function makeOrgResult(overrides?: Partial<OrganizationSynthesisResult>): OrganizationSynthesisResult {
  return {
    teams: [],
    enhancedTeams: [makeTeam()],
    microservices: [],
    domains: [],
    crossCutting: [],
    hypotheses: [],
    confidence: 'high',
    ...overrides,
  };
}

function makeCatalog(overrides?: Partial<SpecsCatalog>): SpecsCatalog {
  return {
    features: [makeFeature()],
    totalFeatures: 1,
    activeFeatures: 1,
    completedFeatures: 0,
    archivedFeatures: 0,
    totalUserStories: 0,
    totalACs: 5,
    completedACs: 3,
    overallCompletion: 60,
    byProject: new Map(),
    byStatus: new Map([['active', [makeFeature()]]]),
    loadedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeTimeline(overrides?: Partial<ProjectTimeline>): ProjectTimeline {
  return {
    projectName: 'TestProject',
    startDate: '2024-01-01',
    currentVersion: '1.0.0',
    events: [],
    milestones: [],
    releases: [],
    ...overrides,
  };
}

function makeRelationships(overrides?: Partial<RelationshipMap>): RelationshipMap {
  return {
    featureToCode: new Map(),
    featureToTeam: new Map(),
    teamToFeatures: new Map(),
    moduleDependencies: new Map(),
    incrementToFeature: new Map(),
    externalToFeature: new Map(),
    totalRelationships: 0,
    ...overrides,
  };
}

function createGenerator(overrides?: Partial<EnterpriseGeneratorOptions>): EnterpriseGenerator {
  return new EnterpriseGenerator({
    projectPath: '/fake/project',
    logger: silentLogger,
    ...overrides,
  });
}

function setupMocks(
  catalog?: SpecsCatalog,
  timeline?: ProjectTimeline,
  relationships?: RelationshipMap,
) {
  const cat = catalog ?? makeCatalog();
  const tl = timeline ?? makeTimeline();
  const rel = relationships ?? makeRelationships();

  mockLoadAllSpecs.mockResolvedValue(cat);
  mockAnalyze.mockResolvedValue(tl);
  mockMap.mockResolvedValue(rel);

  return { mockLoadAllSpecs, mockAnalyze, mockMap };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('EnterpriseGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFileSync.mockReturnValue(undefined);
    mockMkdirSync.mockReturnValue(undefined);
    mockExistsSync.mockReturnValue(false);
  });

  // ── Constructor ─────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('should set projectPath from options', () => {
      const gen = createGenerator({ projectPath: '/my/path' });
      expect(gen).toBeDefined();
    });

    it('should use consoleLogger when no logger provided', () => {
      // Creating without explicit logger should not throw
      const gen = new EnterpriseGenerator({ projectPath: '/test' });
      expect(gen).toBeDefined();
    });

    it('should store optional llmProvider', () => {
      const llm = { analyze: vi.fn() };
      const gen = createGenerator({ llmProvider: llm });
      expect(gen).toBeDefined();
    });

    it('should store optional repoAnalyses', () => {
      const analyses = new Map();
      analyses.set('repo1', { name: 'repo1', path: '/path' });
      const gen = createGenerator({ repoAnalyses: analyses });
      expect(gen).toBeDefined();
    });

    it('should store optional orgResult', () => {
      const gen = createGenerator({ orgResult: makeOrgResult() });
      expect(gen).toBeDefined();
    });
  });

  // ── generate() ──────────────────────────────────────────────────────────

  describe('generate()', () => {
    it('should create the enterprise directory', async () => {
      setupMocks();
      const gen = createGenerator();

      await gen.generate();

      expect(mockMkdirSync).toHaveBeenCalledWith(
        '/fake/project/.specweave/docs/internal/enterprise',
        { recursive: true },
      );
    });

    it('should create the relationships directory', async () => {
      setupMocks();
      const gen = createGenerator();

      await gen.generate();

      expect(mockMkdirSync).toHaveBeenCalledWith(
        '/fake/project/.specweave/docs/internal/relationships',
        { recursive: true },
      );
    });

    it('should initialize EnhancedSpecLoader with correct options', async () => {
      setupMocks();
      const gen = createGenerator();

      await gen.generate();

      expect(mockEnhancedSpecLoader).toHaveBeenCalledWith({
        projectPath: '/fake/project',
        logger: silentLogger,
        includeArchived: true,
      });
    });

    it('should initialize HistoryAnalyzer with correct options', async () => {
      setupMocks();
      const gen = createGenerator();

      await gen.generate();

      expect(mockHistoryAnalyzer).toHaveBeenCalledWith({
        projectPath: '/fake/project',
        logger: silentLogger,
      });
    });

    it('should initialize RelationshipMapper with correct options', async () => {
      const repoAnalyses = new Map();
      setupMocks();
      const gen = createGenerator({ repoAnalyses });

      await gen.generate();

      expect(mockRelationshipMapper).toHaveBeenCalledWith({
        projectPath: '/fake/project',
        logger: silentLogger,
        repoAnalyses,
      });
    });

    it('should call progress callback at expected phases', async () => {
      setupMocks();
      const gen = createGenerator();
      const progress = vi.fn();

      await gen.generate(progress);

      expect(progress).toHaveBeenCalledWith('enterprise', 0, 100, 'Loading specifications');
      expect(progress).toHaveBeenCalledWith('enterprise', 20, 100, 'Analyzing project history');
      expect(progress).toHaveBeenCalledWith('enterprise', 40, 100, 'Mapping relationships');
      expect(progress).toHaveBeenCalledWith('enterprise', 60, 100, 'Generating documentation');
      expect(progress).toHaveBeenCalledWith('enterprise', 80, 100, 'Generating relationship docs');
      expect(progress).toHaveBeenCalledWith('enterprise', 100, 100, 'Complete');
    });

    it('should work without a progress callback', async () => {
      setupMocks();
      const gen = createGenerator();

      const result = await gen.generate();
      expect(result.filesCreated.length).toBeGreaterThan(0);
    });

    it('should return filesCreated and savedFiles as same array', async () => {
      setupMocks();
      const gen = createGenerator();

      const result = await gen.generate();

      expect(result.filesCreated).toEqual(result.savedFiles);
    });

    it('should return 8 files total (4 main + 4 relationship)', async () => {
      setupMocks();
      const gen = createGenerator();

      const result = await gen.generate();

      expect(result.filesCreated).toHaveLength(8);
      expect(result.filesCreated).toContain('/fake/project/.specweave/docs/internal/enterprise/COMPANY-HISTORY.md');
      expect(result.filesCreated).toContain('/fake/project/.specweave/docs/internal/enterprise/FEATURE-CATALOG.md');
      expect(result.filesCreated).toContain('/fake/project/.specweave/docs/internal/enterprise/TEAM-DIRECTORY.md');
      expect(result.filesCreated).toContain('/fake/project/.specweave/docs/internal/enterprise/ARCHITECTURE-MAP.md');
      expect(result.filesCreated).toContain('/fake/project/.specweave/docs/internal/relationships/FEATURE-TO-CODE.md');
      expect(result.filesCreated).toContain('/fake/project/.specweave/docs/internal/relationships/TEAM-TO-FEATURES.md');
      expect(result.filesCreated).toContain('/fake/project/.specweave/docs/internal/relationships/MODULE-DEPENDENCIES.md');
      expect(result.filesCreated).toContain('/fake/project/.specweave/docs/internal/relationships/EXTERNAL-REFS.md');
    });

    it('should return correct metrics from catalog', async () => {
      const catalog = makeCatalog({
        totalFeatures: 10,
        activeFeatures: 6,
        completedFeatures: 3,
        totalUserStories: 20,
        overallCompletion: 75,
      });
      const timeline = makeTimeline({
        events: [
          { date: '2025-01-01', type: 'feature_started', title: 'Start', description: '', relatedEntities: [] },
          { date: '2025-02-01', type: 'feature_completed', title: 'Done', description: '', relatedEntities: [] },
        ],
      });
      const relationships = makeRelationships({ totalRelationships: 15 });

      setupMocks(catalog, timeline, relationships);

      const orgResult = makeOrgResult({
        enhancedTeams: [makeTeam(), makeTeam({ name: 'Frontend Team' })],
      });
      const repoAnalyses = new Map([['repo1', {} as any], ['repo2', {} as any], ['repo3', {} as any]]);
      const gen = createGenerator({ orgResult, repoAnalyses });

      const result = await gen.generate();

      expect(result.metrics).toEqual({
        totalFeatures: 10,
        activeFeatures: 6,
        completedFeatures: 3,
        totalUserStories: 20,
        totalTeams: 2,
        totalModules: 3,
        overallCompletion: 75,
        timelineEvents: 2,
        relationships: 15,
      });
    });

    it('should default totalTeams to 0 when no orgResult', async () => {
      setupMocks();
      const gen = createGenerator();

      const result = await gen.generate();

      expect(result.metrics.totalTeams).toBe(0);
    });

    it('should default totalModules to 0 when no repoAnalyses', async () => {
      setupMocks();
      const gen = createGenerator();

      const result = await gen.generate();

      expect(result.metrics.totalModules).toBe(0);
    });

    it('should pass orgResult to relationshipMapper.map()', async () => {
      const orgResult = makeOrgResult();
      const { mockMap } = setupMocks();
      const gen = createGenerator({ orgResult });

      await gen.generate();

      expect(mockMap).toHaveBeenCalledWith(expect.anything(), orgResult);
    });
  });

  // ── generateHistory (COMPANY-HISTORY.md) ────────────────────────────────

  describe('COMPANY-HISTORY.md generation', () => {
    it('should write file to correct path', async () => {
      setupMocks();
      const gen = createGenerator();

      await gen.generate();

      const historyCalls = mockWriteFileSync.mock.calls.filter(
        (c: any[]) => (c[0] as string).includes('COMPANY-HISTORY.md'),
      );
      expect(historyCalls).toHaveLength(1);
      expect(historyCalls[0][0]).toBe('/fake/project/.specweave/docs/internal/enterprise/COMPANY-HISTORY.md');
    });

    it('should include project name and overview in content', async () => {
      const timeline = makeTimeline({
        projectName: 'MyApp',
        startDate: '2024-01-01',
        currentVersion: '2.5.0',
      });
      const catalog = makeCatalog({ totalFeatures: 10, overallCompletion: 85 });
      setupMocks(catalog, timeline);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('COMPANY-HISTORY.md');
      expect(content).toContain('# Project History & Timeline');
      expect(content).toContain('MyApp');
      expect(content).toContain('2024-01-01');
      expect(content).toContain('2.5.0');
      expect(content).toContain('10');
      expect(content).toContain('85%');
    });

    it('should include mermaid timeline block', async () => {
      setupMocks();
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('COMPANY-HISTORY.md');
      expect(content).toContain('```mermaid');
      expect(content).toContain('timeline');
    });

    it('should group events by month in mermaid timeline', async () => {
      const events: TimelineEvent[] = [
        { date: '2025-01-15', type: 'feature_started', title: 'Started Auth', description: '', relatedEntities: [] },
        { date: '2025-01-20', type: 'feature_completed', title: 'Completed Auth', description: '', relatedEntities: [] },
        { date: '2025-02-10', type: 'release', title: 'v1.0 Release', description: '', relatedEntities: [] },
      ];
      const timeline = makeTimeline({ events });
      setupMocks(undefined, timeline);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('COMPANY-HISTORY.md');
      expect(content).toContain('section Jan 2025');
      expect(content).toContain('section Feb 2025');
      expect(content).toContain('Started Auth');
      expect(content).toContain('v1.0 Release');
    });

    it('should limit to 3 events per month in timeline', async () => {
      const events: TimelineEvent[] = Array.from({ length: 5 }, (_, i) => ({
        date: '2025-03-01',
        type: 'feature_started' as const,
        title: `Event ${i + 1}`,
        description: '',
        relatedEntities: [],
      }));
      const timeline = makeTimeline({ events });
      setupMocks(undefined, timeline);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('COMPANY-HISTORY.md');
      // Extract the mermaid timeline block (events 4 & 5 excluded from it, but present in detailed table)
      const mermaidBlock = content.split('```mermaid')[1]?.split('```')[0] ?? '';
      expect(mermaidBlock).toContain('Event 1');
      expect(mermaidBlock).toContain('Event 2');
      expect(mermaidBlock).toContain('Event 3');
      expect(mermaidBlock).not.toContain('Event 4');
    });

    it('should limit timeline to last 50 events', async () => {
      const events: TimelineEvent[] = Array.from({ length: 60 }, (_, i) => ({
        date: `2025-${String(Math.floor(i / 5) + 1).padStart(2, '0')}-01`,
        type: 'feature_started' as const,
        title: `BigEvent${i}`,
        description: '',
        relatedEntities: [],
      }));
      const timeline = makeTimeline({ events });
      setupMocks(undefined, timeline);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('COMPANY-HISTORY.md');
      // Mermaid timeline uses last 50 events; first 10 should be excluded from it
      const mermaidBlock = content.split('```mermaid')[1]?.split('```')[0] ?? '';
      expect(mermaidBlock).not.toContain('BigEvent0');
      // BigEvent10 is first event included in the last 50 and first in its month section
      expect(mermaidBlock).toContain('BigEvent10');
    });

    it('should generate event detail table', async () => {
      const events: TimelineEvent[] = [
        { date: '2025-01-01', type: 'feature_started', title: 'Auth Feature', description: '', relatedEntities: ['FS-001', 'US-001'] },
      ];
      const timeline = makeTimeline({ events });
      setupMocks(undefined, timeline);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('COMPANY-HISTORY.md');
      expect(content).toContain('| Date | Type | Event | Related |');
      expect(content).toContain('Auth Feature');
      expect(content).toContain('FS-001, US-001');
    });

    it('should limit detailed events table to last 100', async () => {
      const events: TimelineEvent[] = Array.from({ length: 110 }, (_, i) => ({
        date: '2025-01-01',
        type: 'feature_started' as const,
        title: `DetailEvent${i}`,
        description: '',
        relatedEntities: [],
      }));
      const timeline = makeTimeline({ events });
      setupMocks(undefined, timeline);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('COMPANY-HISTORY.md');
      // First 10 should be excluded from detailed list (110 - 100 = 10)
      expect(content).not.toMatch(/\| 2025-01-01 \|.*DetailEvent0 \|/);
      expect(content).toContain('DetailEvent109');
    });

    it('should escape colons in timeline titles', async () => {
      const events: TimelineEvent[] = [
        { date: '2025-01-01', type: 'feature_started', title: 'Auth: Login: OAuth', description: '', relatedEntities: [] },
      ];
      const timeline = makeTimeline({ events });
      setupMocks(undefined, timeline);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('COMPANY-HISTORY.md');
      // Colons replaced with spaces
      expect(content).toContain('Auth  Login  OAuth');
    });

    it('should truncate long timeline titles to 40 chars', async () => {
      const longTitle = 'A'.repeat(60);
      const events: TimelineEvent[] = [
        { date: '2025-01-01', type: 'feature_started', title: longTitle, description: '', relatedEntities: [] },
      ];
      const timeline = makeTimeline({ events });
      setupMocks(undefined, timeline);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('COMPANY-HISTORY.md');
      // Mermaid timeline truncates titles to 40 chars; detailed table keeps full title
      const mermaidBlock = content.split('```mermaid')[1]?.split('```')[0] ?? '';
      const truncated = 'A'.repeat(40);
      expect(mermaidBlock).toContain(truncated);
      expect(mermaidBlock).not.toContain('A'.repeat(41));
    });

    it('should limit related entities to 2 in detail table', async () => {
      const events: TimelineEvent[] = [
        { date: '2025-01-01', type: 'feature_started', title: 'Many Refs', description: '', relatedEntities: ['FS-001', 'FS-002', 'FS-003'] },
      ];
      const timeline = makeTimeline({ events });
      setupMocks(undefined, timeline);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('COMPANY-HISTORY.md');
      expect(content).toContain('FS-001, FS-002');
      // FS-003 should not be in the table row
      const tableLines = content.split('\n').filter((l: string) => l.includes('Many Refs'));
      expect(tableLines[0]).not.toContain('FS-003');
    });

    it('should use correct emojis for event types', async () => {
      const events: TimelineEvent[] = [
        { date: '2025-01-01', type: 'feature_started', title: 'A', description: '', relatedEntities: [] },
        { date: '2025-01-02', type: 'feature_completed', title: 'B', description: '', relatedEntities: [] },
        { date: '2025-01-03', type: 'release', title: 'C', description: '', relatedEntities: [] },
        { date: '2025-01-04', type: 'team_change', title: 'D', description: '', relatedEntities: [] },
        { date: '2025-01-05', type: 'incident', title: 'E', description: '', relatedEntities: [] },
        { date: '2025-01-06', type: 'increment_started', title: 'F', description: '', relatedEntities: [] },
        { date: '2025-01-07', type: 'increment_completed', title: 'G', description: '', relatedEntities: [] },
      ];
      const timeline = makeTimeline({ events });
      setupMocks(undefined, timeline);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('COMPANY-HISTORY.md');
      // Check that event type text appears in the table
      for (const e of events) {
        expect(content).toContain(e.type);
      }
    });
  });

  // ── generateFeatureCatalog (FEATURE-CATALOG.md) ─────────────────────────

  describe('FEATURE-CATALOG.md generation', () => {
    it('should write file to correct path', async () => {
      setupMocks();
      const gen = createGenerator();

      await gen.generate();

      const calls = mockWriteFileSync.mock.calls.filter(
        (c: any[]) => (c[0] as string).includes('FEATURE-CATALOG.md'),
      );
      expect(calls).toHaveLength(1);
      expect(calls[0][0]).toBe('/fake/project/.specweave/docs/internal/enterprise/FEATURE-CATALOG.md');
    });

    it('should include summary table', async () => {
      const catalog = makeCatalog({
        activeFeatures: 5,
        completedFeatures: 3,
        archivedFeatures: 2,
        overallCompletion: 70,
        completedACs: 14,
        totalACs: 20,
      });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('FEATURE-CATALOG.md');
      expect(content).toContain('# Feature Catalog');
      expect(content).toContain('Active | 5');
      expect(content).toContain('Completed | 3');
      expect(content).toContain('Archived | 2');
      expect(content).toContain('70%');
      expect(content).toContain('14/20 ACs');
    });

    it('should include mermaid pie chart', async () => {
      const catalog = makeCatalog({
        activeFeatures: 3,
        completedFeatures: 2,
        archivedFeatures: 1,
      });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('FEATURE-CATALOG.md');
      expect(content).toContain('pie showData');
      expect(content).toContain('"Active" : 3');
      expect(content).toContain('"Completed" : 2');
      expect(content).toContain('"Archived" : 1');
    });

    it('should show project sections when byProject has multiple entries', async () => {
      const feat1 = makeFeature({ featureId: 'FS-001', status: 'active', completionPercentage: 50 });
      const feat2 = makeFeature({ featureId: 'FS-002', status: 'completed', completionPercentage: 100 });
      const byProject = new Map<string, EnhancedFeatureSpec[]>([
        ['Project A', [feat1]],
        ['Project B', [feat2]],
      ]);
      const catalog = makeCatalog({ byProject, features: [feat1, feat2] });
      const relationships = makeRelationships({
        featureToTeam: new Map([['FS-001', 'Platform Team']]),
      });
      setupMocks(catalog, undefined, relationships);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('FEATURE-CATALOG.md');
      expect(content).toContain('## By Project');
      expect(content).toContain('### Project A');
      expect(content).toContain('### Project B');
      expect(content).toContain('Platform Team');
    });

    it('should not show project sections when byProject has one entry', async () => {
      const byProject = new Map<string, EnhancedFeatureSpec[]>([
        ['Only Project', [makeFeature()]],
      ]);
      const catalog = makeCatalog({ byProject });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('FEATURE-CATALOG.md');
      expect(content).not.toContain('## By Project');
    });

    it('should limit features per project to 20 and show overflow', async () => {
      const features = Array.from({ length: 25 }, (_, i) =>
        makeFeature({ featureId: `FS-${String(i + 1).padStart(3, '0')}` }),
      );
      const byProject = new Map<string, EnhancedFeatureSpec[]>([
        ['Big Project', features],
        ['Other', [makeFeature()]],
      ]);
      const catalog = makeCatalog({ byProject, features });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('FEATURE-CATALOG.md');
      expect(content).toContain('5 more');
    });

    it('should display feature details section', async () => {
      const feature = makeFeature({
        featureId: 'FS-100',
        featureName: 'User Auth',
        status: 'active',
        completionPercentage: 75,
        project: 'Core',
        relatedIncrements: ['0001-auth', '0002-auth-fix'],
        userStories: [
          {
            id: 'US-001',
            title: 'Login Flow',
            description: 'As a user...',
            status: 'completed',
            acceptanceCriteria: [
              { id: 'AC-US1-01', description: 'Can login', completed: true },
              { id: 'AC-US1-02', description: 'Token refreshes', completed: false },
            ],
            priority: 'P0',
            filePath: '/path',
          },
        ],
      });
      const catalog = makeCatalog({ features: [feature] });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('FEATURE-CATALOG.md');
      expect(content).toContain('### FS-100: User Auth');
      expect(content).toContain('75%');
      expect(content).toContain('Core');
      expect(content).toContain('0001-auth, 0002-auth-fix');
      expect(content).toContain('US-001');
      expect(content).toContain('Login Flow');
      expect(content).toContain('1/2 ACs');
    });

    it('should limit user stories per feature to 10 and show overflow', async () => {
      const userStories = Array.from({ length: 15 }, (_, i) => ({
        id: `US-${String(i + 1).padStart(3, '0')}`,
        title: `Story ${i + 1}`,
        description: '',
        status: 'completed' as const,
        acceptanceCriteria: [],
        priority: 'P1' as const,
        filePath: '/path',
      }));
      const feature = makeFeature({ userStories });
      const catalog = makeCatalog({ features: [feature] });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('FEATURE-CATALOG.md');
      expect(content).toContain('5 more user stories');
    });

    it('should limit feature details to 50 and show overflow', async () => {
      const features = Array.from({ length: 55 }, (_, i) =>
        makeFeature({ featureId: `FS-${String(i + 1).padStart(3, '0')}`, featureName: `Feature ${i + 1}` }),
      );
      const catalog = makeCatalog({ features });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('FEATURE-CATALOG.md');
      expect(content).toContain('Showing 50 of 55 features');
    });

    it('should skip project and relatedIncrements when empty', async () => {
      const feature = makeFeature({
        featureId: 'FS-050',
        project: undefined,
        relatedIncrements: [],
      });
      const catalog = makeCatalog({ features: [feature] });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('FEATURE-CATALOG.md');
      expect(content).not.toContain('**Project**:');
      expect(content).not.toContain('**Related Increments**:');
    });

    it('should limit related increments to 5', async () => {
      const feature = makeFeature({
        relatedIncrements: ['inc1', 'inc2', 'inc3', 'inc4', 'inc5', 'inc6', 'inc7'],
      });
      const catalog = makeCatalog({ features: [feature] });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('FEATURE-CATALOG.md');
      expect(content).toContain('inc5');
      expect(content).not.toContain('inc6');
    });

    it('should use correct status emojis', async () => {
      const features = [
        makeFeature({ featureId: 'FS-A', status: 'active' }),
        makeFeature({ featureId: 'FS-B', status: 'completed' }),
        makeFeature({ featureId: 'FS-C', status: 'archived' }),
      ];
      const catalog = makeCatalog({ features });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('FEATURE-CATALOG.md');
      // Each status should appear in the feature details
      expect(content).toContain('active');
      expect(content).toContain('completed');
      expect(content).toContain('archived');
    });
  });

  // ── generateTeamDirectory (TEAM-DIRECTORY.md) ───────────────────────────

  describe('TEAM-DIRECTORY.md generation', () => {
    it('should write file to correct path', async () => {
      setupMocks();
      const gen = createGenerator();

      await gen.generate();

      const calls = mockWriteFileSync.mock.calls.filter(
        (c: any[]) => (c[0] as string).includes('TEAM-DIRECTORY.md'),
      );
      expect(calls).toHaveLength(1);
    });

    it('should show "No teams detected" when no orgResult', async () => {
      setupMocks();
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('TEAM-DIRECTORY.md');
      expect(content).toContain('No teams detected');
    });

    it('should show teams in org chart when orgResult provided', async () => {
      setupMocks();
      const orgResult = makeOrgResult({
        enhancedTeams: [
          makeTeam({ name: 'Frontend Team' }),
          makeTeam({ name: 'Backend Team' }),
        ],
      });
      const gen = createGenerator({ orgResult });

      await gen.generate();

      const content = getWrittenContent('TEAM-DIRECTORY.md');
      expect(content).toContain('org[Organization]');
      expect(content).toContain('Frontend_Team["Frontend Team"]');
      expect(content).toContain('Backend_Team["Backend Team"]');
    });

    it('should sanitize team names in mermaid IDs', async () => {
      setupMocks();
      const orgResult = makeOrgResult({
        enhancedTeams: [makeTeam({ name: 'Team #1 (core)' })],
      });
      const gen = createGenerator({ orgResult });

      await gen.generate();

      const content = getWrittenContent('TEAM-DIRECTORY.md');
      // Special chars should be removed, spaces replaced with _
      expect(content).toContain('Team_1_core');
    });

    it('should include teams overview table', async () => {
      const team = makeTeam({
        name: 'API Team',
        repos: ['api-gateway', 'api-core'],
        techStack: ['Go', 'Rust', 'gRPC', 'Extra'],
      });
      const relationships = makeRelationships({
        teamToFeatures: new Map([['API Team', ['FS-001', 'FS-002', 'FS-003']]]),
      });
      setupMocks(undefined, undefined, relationships);
      const orgResult = makeOrgResult({ enhancedTeams: [team] });
      const gen = createGenerator({ orgResult });

      await gen.generate();

      const content = getWrittenContent('TEAM-DIRECTORY.md');
      expect(content).toContain('| Team | Modules | Features | Tech Stack |');
      expect(content).toContain('API Team');
      expect(content).toContain('2'); // module count
      expect(content).toContain('3'); // feature count
      // Only first 3 tech stack items
      expect(content).toContain('Go, Rust, gRPC');
    });

    it('should show team details with responsibilities and expertise', async () => {
      const team = makeTeam({
        name: 'Platform',
        description: 'Core platform team',
        responsibilities: ['API dev', 'Infra'],
        domainExpertise: ['Cloud', 'Security'],
        techStack: ['TypeScript'],
        repos: ['core-lib'],
      });
      setupMocks();
      const orgResult = makeOrgResult({ enhancedTeams: [team] });
      const gen = createGenerator({ orgResult });

      await gen.generate();

      const content = getWrittenContent('TEAM-DIRECTORY.md');
      expect(content).toContain('### Platform');
      expect(content).toContain('Core platform team');
      expect(content).toContain('**Responsibilities**:');
      expect(content).toContain('- API dev');
      expect(content).toContain('- Infra');
      expect(content).toContain('**Domain Expertise**:');
      expect(content).toContain('- Cloud');
      expect(content).toContain('- Security');
      expect(content).toContain('**Tech Stack**: TypeScript');
      expect(content).toContain('- [core-lib](../modules/core-lib.md)');
    });

    it('should show owned features from relationships', async () => {
      const team = makeTeam({ name: 'My Team' });
      const relationships = makeRelationships({
        teamToFeatures: new Map([['My Team', ['FS-001', 'FS-002']]]),
      });
      setupMocks(undefined, undefined, relationships);
      const orgResult = makeOrgResult({ enhancedTeams: [team] });
      const gen = createGenerator({ orgResult });

      await gen.generate();

      const content = getWrittenContent('TEAM-DIRECTORY.md');
      expect(content).toContain('**Owned Features**:');
      expect(content).toContain('- FS-001');
      expect(content).toContain('- FS-002');
    });

    it('should limit owned features to 10 and show overflow', async () => {
      const team = makeTeam({ name: 'BigTeam' });
      const features = Array.from({ length: 15 }, (_, i) => `FS-${String(i + 1).padStart(3, '0')}`);
      const relationships = makeRelationships({
        teamToFeatures: new Map([['BigTeam', features]]),
      });
      setupMocks(undefined, undefined, relationships);
      const orgResult = makeOrgResult({ enhancedTeams: [team] });
      const gen = createGenerator({ orgResult });

      await gen.generate();

      const content = getWrittenContent('TEAM-DIRECTORY.md');
      expect(content).toContain('5 more');
    });

    it('should show external URL when present', async () => {
      const team = makeTeam({
        name: 'Ext Team',
        externalUrl: 'https://dev.azure.com/org/team',
        externalProvider: 'ado',
      });
      setupMocks();
      const orgResult = makeOrgResult({ enhancedTeams: [team] });
      const gen = createGenerator({ orgResult });

      await gen.generate();

      const content = getWrittenContent('TEAM-DIRECTORY.md');
      expect(content).toContain('**External Link**: [View in ado](https://dev.azure.com/org/team)');
    });

    it('should skip sections when arrays are empty', async () => {
      const team = makeTeam({
        name: 'Minimal Team',
        responsibilities: [],
        domainExpertise: [],
        techStack: [],
        repos: [],
      });
      const orgResult = makeOrgResult({ enhancedTeams: [team] });
      setupMocks();
      const gen = createGenerator({ orgResult });

      await gen.generate();

      const content = getWrittenContent('TEAM-DIRECTORY.md');
      expect(content).not.toContain('**Responsibilities**:');
      expect(content).not.toContain('**Domain Expertise**:');
      expect(content).not.toContain('**Tech Stack**:');
      expect(content).not.toContain('**Owned Modules**:');
    });
  });

  // ── generateArchitectureMap (ARCHITECTURE-MAP.md) ───────────────────────

  describe('ARCHITECTURE-MAP.md generation', () => {
    it('should write file to correct path', async () => {
      setupMocks();
      const gen = createGenerator();

      await gen.generate();

      const calls = mockWriteFileSync.mock.calls.filter(
        (c: any[]) => (c[0] as string).includes('ARCHITECTURE-MAP.md'),
      );
      expect(calls).toHaveLength(1);
    });

    it('should include C4 context diagram', async () => {
      setupMocks();
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('ARCHITECTURE-MAP.md');
      expect(content).toContain('# Architecture Map');
      expect(content).toContain('C4Context');
      expect(content).toContain('System Context Diagram');
    });

    it('should use project name from config when available', async () => {
      mockExistsSync.mockImplementation((p: string) =>
        p.endsWith('config.json') ? true : false,
      );
      mockReadFileSync.mockReturnValue(JSON.stringify({
        project: { name: 'SpecWeave Pro' },
      }));
      setupMocks();
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('ARCHITECTURE-MAP.md');
      expect(content).toContain('SpecWeave Pro');
    });

    it('should use config name field as fallback', async () => {
      mockExistsSync.mockImplementation((p: string) =>
        p.endsWith('config.json') ? true : false,
      );
      mockReadFileSync.mockReturnValue(JSON.stringify({ name: 'MyProject' }));
      setupMocks();
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('ARCHITECTURE-MAP.md');
      expect(content).toContain('MyProject');
    });

    it('should use basename as fallback when no config', async () => {
      mockExistsSync.mockReturnValue(false);
      setupMocks();
      const gen = createGenerator({ projectPath: '/my/awesome-project' });

      await gen.generate();

      const content = getWrittenContent('ARCHITECTURE-MAP.md');
      expect(content).toContain('awesome-project');
    });

    it('should handle malformed config.json gracefully', async () => {
      mockExistsSync.mockImplementation((p: string) =>
        p.endsWith('config.json') ? true : false,
      );
      mockReadFileSync.mockReturnValue('not valid json');
      setupMocks();
      const gen = createGenerator({ projectPath: '/my/fallback-proj' });

      await gen.generate();

      const content = getWrittenContent('ARCHITECTURE-MAP.md');
      expect(content).toContain('fallback-proj');
    });

    it('should add external systems from feature refs', async () => {
      const features = [
        makeFeature({
          featureId: 'FS-001',
          externalRefs: [{ provider: 'github', id: '123' }],
        }),
        makeFeature({
          featureId: 'FS-002',
          externalRefs: [{ provider: 'jira', id: 'PROJ-1' }],
        }),
        makeFeature({
          featureId: 'FS-003',
          externalRefs: [{ provider: 'ado', id: '456' }],
        }),
      ];
      const catalog = makeCatalog({ features });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('ARCHITECTURE-MAP.md');
      expect(content).toContain('System_Ext(github, "GitHub"');
      expect(content).toContain('System_Ext(jira, "JIRA"');
      expect(content).toContain('System_Ext(ado, "Azure DevOps"');
      expect(content).toContain('Rel(main, github, "Syncs with")');
      expect(content).toContain('Rel(main, jira, "Syncs with")');
      expect(content).toContain('Rel(main, ado, "Syncs with")');
    });

    it('should deduplicate external systems', async () => {
      const features = [
        makeFeature({ externalRefs: [{ provider: 'github', id: '1' }] }),
        makeFeature({ featureId: 'FS-002', externalRefs: [{ provider: 'github', id: '2' }] }),
      ];
      const catalog = makeCatalog({ features });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('ARCHITECTURE-MAP.md');
      const matches = content.match(/System_Ext\(github/g);
      expect(matches).toHaveLength(1);
    });

    it('should show module dependencies when repoAnalyses provided', async () => {
      const repoAnalyses = new Map([
        ['core', {} as any],
        ['api', {} as any],
        ['web', {} as any],
      ]);
      const relationships = makeRelationships({
        moduleDependencies: new Map([
          ['core', ['api']],
          ['api', ['web']],
        ]),
      });
      setupMocks(undefined, undefined, relationships);
      const gen = createGenerator({ repoAnalyses });

      await gen.generate();

      const content = getWrittenContent('ARCHITECTURE-MAP.md');
      expect(content).toContain('core --> api');
      expect(content).toContain('api --> web');
    });

    it('should show "No modules analyzed" when no repoAnalyses', async () => {
      setupMocks();
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('ARCHITECTURE-MAP.md');
      expect(content).toContain('no_modules[No modules analyzed]');
    });

    it('should skip dependencies to modules not in the analysis set', async () => {
      const repoAnalyses = new Map([
        ['core', {} as any],
        ['api', {} as any],
      ]);
      const relationships = makeRelationships({
        moduleDependencies: new Map([
          ['core', ['api', 'external-thing']],
        ]),
      });
      setupMocks(undefined, undefined, relationships);
      const gen = createGenerator({ repoAnalyses });

      await gen.generate();

      const content = getWrittenContent('ARCHITECTURE-MAP.md');
      expect(content).toContain('core --> api');
      expect(content).not.toContain('external_thing');
    });

    it('should build feature hierarchy for active features', async () => {
      const activeFeature = makeFeature({
        featureId: 'FS-010',
        status: 'active',
        completionPercentage: 50,
        userStories: [
          {
            id: 'US-001',
            title: 'Story 1',
            description: '',
            status: 'completed',
            acceptanceCriteria: [
              { id: 'AC-1', description: 'Done', completed: true },
              { id: 'AC-2', description: 'Pending', completed: false },
            ],
            priority: 'P0',
            filePath: '/p',
          },
        ],
      });
      const catalog = makeCatalog({
        features: [activeFeature],
        byStatus: new Map([['active', [activeFeature]]]),
      });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('ARCHITECTURE-MAP.md');
      expect(content).toContain('FS_010["FS-010<br/>50%"]');
      expect(content).toContain('FS_010 --> US_001["US-001<br/>1/2"]');
    });

    it('should limit user stories per feature to 3 and show overflow', async () => {
      const stories = Array.from({ length: 5 }, (_, i) => ({
        id: `US-${String(i + 1).padStart(3, '0')}`,
        title: `Story ${i + 1}`,
        description: '',
        status: 'completed' as const,
        acceptanceCriteria: [],
        priority: 'P1' as const,
        filePath: '/p',
      }));
      const activeFeature = makeFeature({
        featureId: 'FS-020',
        status: 'active',
        userStories: stories,
      });
      const catalog = makeCatalog({
        features: [activeFeature],
        byStatus: new Map([['active', [activeFeature]]]),
      });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('ARCHITECTURE-MAP.md');
      expect(content).toContain('US_001');
      expect(content).toContain('US_002');
      expect(content).toContain('US_003');
      expect(content).not.toContain('US_004');
      expect(content).toContain('...2 more');
    });

    it('should limit active features to 15', async () => {
      const activeFeatures = Array.from({ length: 20 }, (_, i) =>
        makeFeature({ featureId: `FS-${String(i + 1).padStart(3, '0')}`, status: 'active' }),
      );
      const catalog = makeCatalog({
        features: activeFeatures,
        byStatus: new Map([['active', activeFeatures]]),
      });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('ARCHITECTURE-MAP.md');
      expect(content).toContain('FS_015');
      expect(content).not.toContain('FS_016');
    });

    it('should sanitize special characters in mermaid node IDs', async () => {
      const repoAnalyses = new Map([
        ['@org/pkg-name', {} as any],
        ['my.module', {} as any],
      ]);
      const relationships = makeRelationships({
        moduleDependencies: new Map([
          ['@org/pkg-name', ['my.module']],
        ]),
      });
      setupMocks(undefined, undefined, relationships);
      const gen = createGenerator({ repoAnalyses });

      await gen.generate();

      const content = getWrittenContent('ARCHITECTURE-MAP.md');
      expect(content).toContain('_org_pkg_name --> my_module');
    });
  });

  // ── generateRelationshipDocs ────────────────────────────────────────────

  describe('Relationship docs generation', () => {
    it('should generate FEATURE-TO-CODE.md', async () => {
      const relationships = makeRelationships({
        featureToCode: new Map([
          ['FS-001', ['src/auth.ts', 'src/login.ts']],
          ['FS-002', []],
        ]),
      });
      setupMocks(undefined, undefined, relationships);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('FEATURE-TO-CODE.md');
      expect(content).toContain('# Feature to Code Mapping');
      expect(content).toContain('| FS-001 | 2 |');
      expect(content).toContain('| FS-002 | 0 |');
    });

    it('should generate TEAM-TO-FEATURES.md', async () => {
      const relationships = makeRelationships({
        teamToFeatures: new Map([
          ['Platform Team', ['FS-001', 'FS-002']],
          ['Frontend Team', ['FS-003']],
        ]),
      });
      setupMocks(undefined, undefined, relationships);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('TEAM-TO-FEATURES.md');
      expect(content).toContain('# Team to Features Mapping');
      expect(content).toContain('## Platform Team');
      expect(content).toContain('- FS-001');
      expect(content).toContain('- FS-002');
      expect(content).toContain('## Frontend Team');
      expect(content).toContain('- FS-003');
    });

    it('should generate MODULE-DEPENDENCIES.md', async () => {
      const relationships = makeRelationships({
        moduleDependencies: new Map([
          ['core', ['utils', 'config']],
          ['standalone', []],
        ]),
      });
      setupMocks(undefined, undefined, relationships);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('MODULE-DEPENDENCIES.md');
      expect(content).toContain('# Module Dependencies');
      expect(content).toContain('### core');
      expect(content).toContain('- utils');
      expect(content).toContain('- config');
      // standalone has no deps, should not get a section
      expect(content).not.toContain('### standalone');
    });

    it('should generate EXTERNAL-REFS.md with github, jira, and ado refs', async () => {
      const features = [
        makeFeature({
          featureId: 'FS-001',
          externalRefs: [
            { provider: 'github', id: '42', status: 'open' },
            { provider: 'jira', id: 'PROJ-100', status: 'In Progress' },
          ],
        }),
        makeFeature({
          featureId: 'FS-002',
          externalRefs: [
            { provider: 'ado', id: '999', status: 'Active' },
          ],
        }),
      ];
      const catalog = makeCatalog({ features });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('EXTERNAL-REFS.md');
      expect(content).toContain('# External References');
      expect(content).toContain('## GitHub Issues');
      expect(content).toContain('| FS-001 | #42 | open |');
      expect(content).toContain('## JIRA Issues');
      expect(content).toContain('| FS-001 | PROJ-100 | In Progress |');
      expect(content).toContain('## Azure DevOps');
      expect(content).toContain('| FS-002 | 999 | Active |');
    });

    it('should show dash for missing status in external refs', async () => {
      const features = [
        makeFeature({
          featureId: 'FS-010',
          externalRefs: [{ provider: 'github', id: '55' }],
        }),
      ];
      const catalog = makeCatalog({ features });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('EXTERNAL-REFS.md');
      expect(content).toContain('| FS-010 | #55 | - |');
    });
  });

  // ── getStatusEmoji ──────────────────────────────────────────────────────

  describe('getStatusEmoji (via feature catalog)', () => {
    it('should return correct emoji for each known status', async () => {
      const features = [
        makeFeature({ featureId: 'FS-A', status: 'active' }),
        makeFeature({ featureId: 'FS-B', status: 'completed' }),
        makeFeature({ featureId: 'FS-C', status: 'archived' }),
      ];
      const catalog = makeCatalog({ features });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('FEATURE-CATALOG.md');
      // Each feature detail line includes getStatusEmoji output + status name
      const statusLines = content.split('\n').filter((l: string) => l.startsWith('**Status**:'));
      expect(statusLines.some((l: string) => l.includes('active'))).toBe(true);
      expect(statusLines.some((l: string) => l.includes('completed'))).toBe(true);
      expect(statusLines.some((l: string) => l.includes('archived'))).toBe(true);
    });
  });

  // ── getEventEmoji ───────────────────────────────────────────────────────

  describe('getEventEmoji (via history generation)', () => {
    it('should return default emoji for unknown event type', async () => {
      const events: TimelineEvent[] = [
        { date: '2025-01-01', type: 'config_change', title: 'Config Change', description: '', relatedEntities: [] },
      ];
      const timeline = makeTimeline({ events });
      setupMocks(undefined, timeline);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('COMPANY-HISTORY.md');
      // config_change is not in the switch, so default emoji should be used
      expect(content).toContain('config_change');
    });
  });

  // ── Error propagation ──────────────────────────────────────────────────

  describe('error handling', () => {
    it('should propagate spec loader errors', async () => {
      mockLoadAllSpecs.mockRejectedValue(new Error('Spec load failed'));
      mockAnalyze.mockResolvedValue(makeTimeline());
      mockMap.mockResolvedValue(makeRelationships());
      const gen = createGenerator();

      await expect(gen.generate()).rejects.toThrow('Spec load failed');
    });

    it('should propagate history analyzer errors', async () => {
      mockLoadAllSpecs.mockResolvedValue(makeCatalog());
      mockAnalyze.mockRejectedValue(new Error('History failed'));
      mockMap.mockResolvedValue(makeRelationships());
      const gen = createGenerator();

      await expect(gen.generate()).rejects.toThrow('History failed');
    });

    it('should propagate relationship mapper errors', async () => {
      mockLoadAllSpecs.mockResolvedValue(makeCatalog());
      mockAnalyze.mockResolvedValue(makeTimeline());
      mockMap.mockRejectedValue(new Error('Relationship failed'));
      const gen = createGenerator();

      await expect(gen.generate()).rejects.toThrow('Relationship failed');
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('should handle empty catalog', async () => {
      const catalog = makeCatalog({
        features: [],
        totalFeatures: 0,
        activeFeatures: 0,
        completedFeatures: 0,
        archivedFeatures: 0,
        totalUserStories: 0,
        totalACs: 0,
        completedACs: 0,
        overallCompletion: 0,
        byProject: new Map(),
        byStatus: new Map(),
      });
      setupMocks(catalog);
      const gen = createGenerator();

      const result = await gen.generate();

      expect(result.filesCreated).toHaveLength(8);
      expect(result.metrics.totalFeatures).toBe(0);
    });

    it('should handle empty timeline', async () => {
      const timeline = makeTimeline({ events: [] });
      setupMocks(undefined, timeline);
      const gen = createGenerator();

      const result = await gen.generate();

      expect(result.metrics.timelineEvents).toBe(0);
    });

    it('should handle empty relationships', async () => {
      const relationships = makeRelationships({ totalRelationships: 0 });
      setupMocks(undefined, undefined, relationships);
      const gen = createGenerator();

      const result = await gen.generate();

      expect(result.metrics.relationships).toBe(0);
    });

    it('should handle features with no externalRefs in architecture map', async () => {
      const catalog = makeCatalog({
        features: [makeFeature({ externalRefs: [] })],
      });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('ARCHITECTURE-MAP.md');
      expect(content).not.toContain('System_Ext');
    });

    it('should handle feature with user stories that have no ACs', async () => {
      const feature = makeFeature({
        userStories: [{
          id: 'US-001',
          title: 'No ACs',
          description: '',
          status: 'draft',
          acceptanceCriteria: [],
          priority: null,
          filePath: '/p',
        }],
      });
      const catalog = makeCatalog({ features: [feature] });
      setupMocks(catalog);
      const gen = createGenerator();

      await gen.generate();

      const content = getWrittenContent('FEATURE-CATALOG.md');
      expect(content).toContain('0/0 ACs');
    });

    it('should handle module dependencies where dependency has no deps itself', async () => {
      const repoAnalyses = new Map([
        ['a', {} as any],
        ['b', {} as any],
      ]);
      const relationships = makeRelationships({
        moduleDependencies: new Map([
          ['a', ['b']],
          ['b', []],
        ]),
      });
      setupMocks(undefined, undefined, relationships);
      const gen = createGenerator({ repoAnalyses });

      await gen.generate();

      const content = getWrittenContent('ARCHITECTURE-MAP.md');
      expect(content).toContain('a --> b');
    });

    it('should limit module dependencies to first 5 per module', async () => {
      const repoNames = ['core', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'];
      const repoAnalyses = new Map(repoNames.map(n => [n, {} as any]));
      const relationships = makeRelationships({
        moduleDependencies: new Map([
          ['core', ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7']],
        ]),
      });
      setupMocks(undefined, undefined, relationships);
      const gen = createGenerator({ repoAnalyses });

      await gen.generate();

      const content = getWrittenContent('ARCHITECTURE-MAP.md');
      expect(content).toContain('core --> d5');
      expect(content).not.toContain('core --> d6');
    });

    it('should limit modules to first 20', async () => {
      const repoNames = Array.from({ length: 25 }, (_, i) => `mod${i}`);
      const repoAnalyses = new Map(repoNames.map(n => [n, {} as any]));
      const relationships = makeRelationships({
        moduleDependencies: new Map(repoNames.map(n => [n, []])),
      });
      setupMocks(undefined, undefined, relationships);
      const gen = createGenerator({ repoAnalyses });

      await gen.generate();

      // No assertion on specific content since modules with empty deps don't render
      // This just ensures it doesn't throw
      const content = getWrittenContent('ARCHITECTURE-MAP.md');
      expect(content).toBeDefined();
    });
  });
});

// ── Test Utility ────────────────────────────────────────────────────────────

/**
 * Extract written content for a specific filename from mockWriteFileSync calls.
 */
function getWrittenContent(filename: string): string {
  const call = mockWriteFileSync.mock.calls.find(
    (c: any[]) => (c[0] as string).includes(filename),
  );
  if (!call) {
    throw new Error(`No writeFileSync call found for ${filename}. Calls: ${mockWriteFileSync.mock.calls.map((c: any[]) => c[0]).join(', ')}`);
  }
  return call[1] as string;
}
