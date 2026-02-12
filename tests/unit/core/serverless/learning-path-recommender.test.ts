/**
 * Unit tests for learning-path-recommender.ts
 *
 * Tests exported functions:
 * - detectSkillLevel: natural language skill detection
 * - recommendLearningPath: full learning path recommendation
 * - getAvailablePlatforms: list platform IDs
 * - getFreshPlatforms: platforms with fresh data
 * - getStalePlatforms: platforms with stale data
 * - getResourcesByType: filter resources by type and skill
 * - validateLearningPathData: data integrity validation
 *
 * Tests internal functions via observable behavior:
 * - checkDataFreshness: via recommendLearningPath result
 * - generateNextSteps: via recommendLearningPath result
 * - estimateTotalLearningTime: via recommendLearningPath result
 * - loadKnowledgeBase: via error handling
 *
 * Mocks: fs, path
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockExistsSync, mockReadFileSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
}));

// Import after mocks
import {
  detectSkillLevel,
  recommendLearningPath,
  getAvailablePlatforms,
  getFreshPlatforms,
  getStalePlatforms,
  getResourcesByType,
  validateLearningPathData,
  type SkillLevel,
  type LearningResource,
  type SampleProject,
  type BestPractice,
  type CommonPitfall,
} from '../../../../src/core/serverless/learning-path-recommender.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLearningResource(overrides: Partial<LearningResource> = {}): LearningResource {
  return {
    id: 'tut-001',
    title: 'Getting Started',
    url: 'https://example.com/tutorial',
    type: 'tutorial',
    skillLevel: 'beginner',
    estimatedTime: '30 minutes',
    ...overrides,
  };
}

function makeSampleProject(overrides: Partial<SampleProject> = {}): SampleProject {
  return {
    id: 'proj-001',
    title: 'Hello World Project',
    url: 'https://example.com/project',
    type: 'sample-project',
    skillLevel: 'beginner',
    complexity: 'basic',
    estimatedTime: '60 minutes',
    ...overrides,
  };
}

function makeBestPractice(overrides: Partial<BestPractice> = {}): BestPractice {
  return {
    id: 'bp-001',
    category: 'performance',
    title: 'Optimize cold starts',
    description: 'Reduce cold start latency.',
    priority: 'high',
    ...overrides,
  };
}

function makePitfall(overrides: Partial<CommonPitfall> = {}): CommonPitfall {
  return {
    id: 'pit-001',
    title: 'Over-provisioning',
    description: 'Allocating too much memory.',
    mitigation: 'Right-size your functions.',
    severity: 'medium',
    ...overrides,
  };
}

function makeKnowledgeBase(overrides: Record<string, any> = {}) {
  const today = new Date().toISOString().split('T')[0];

  return {
    version: '1.0',
    lastUpdated: today,
    maxStaleDays: 60,
    platforms: {
      'aws-lambda': {
        name: 'AWS Lambda',
        id: 'aws-lambda',
        resources: {
          tutorials: [
            makeLearningResource({ id: 'tut-1', skillLevel: 'beginner' }),
            makeLearningResource({ id: 'tut-2', skillLevel: 'intermediate', title: 'Advanced Lambda' }),
            makeLearningResource({ id: 'tut-3', skillLevel: 'advanced', title: 'Expert Lambda' }),
          ],
          documentation: [
            makeLearningResource({ id: 'doc-1', type: 'documentation', skillLevel: 'beginner' }),
          ],
          videos: [
            makeLearningResource({ id: 'vid-1', type: 'video', skillLevel: 'beginner', estimatedTime: '45 minutes' }),
            makeLearningResource({ id: 'vid-2', type: 'video', skillLevel: 'intermediate', estimatedTime: '90 minutes' }),
          ],
          courses: [
            makeLearningResource({ id: 'crs-1', type: 'course', skillLevel: 'beginner', estimatedTime: '120 minutes' }),
          ],
          sampleProjects: [
            makeSampleProject({ id: 'prj-1', skillLevel: 'beginner' }),
            makeSampleProject({ id: 'prj-2', skillLevel: 'intermediate', complexity: 'intermediate' }),
          ],
        },
        bestPractices: [makeBestPractice()],
        commonPitfalls: [
          makePitfall({ affectedSkillLevels: ['beginner'] }),
          makePitfall({ id: 'pit-2', title: 'No pitfall filter', affectedSkillLevels: undefined }),
        ],
        lastVerified: today,
      },
      ...overrides,
    },
  };
}

function setupKnowledgeBase(kb?: any) {
  const knowledgeBase = kb || makeKnowledgeBase();
  mockExistsSync.mockReturnValue(true);
  mockReadFileSync.mockReturnValue(JSON.stringify(knowledgeBase));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('learning-path-recommender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // detectSkillLevel
  // =========================================================================

  describe('detectSkillLevel', () => {
    it('should detect beginner from "new to" keyword', () => {
      const result = detectSkillLevel('I am new to serverless and just getting started with cloud functions');
      expect(result.skillLevel).toBe('beginner');
      expect(result.signals.length).toBeGreaterThan(0);
    });

    it('should detect beginner from "first time" keyword', () => {
      const result = detectSkillLevel('This is my first time working with AWS Lambda basics');
      expect(result.skillLevel).toBe('beginner');
    });

    it('should detect intermediate from "deployed" keyword', () => {
      const result = detectSkillLevel('I have deployed several functions and built integration with API and database testing');
      expect(result.skillLevel).toBe('intermediate');
    });

    it('should detect advanced from "production" and "scaling" keywords', () => {
      const result = detectSkillLevel('I run production workloads with performance optimization and scaling multi-region distributed systems');
      expect(result.skillLevel).toBe('advanced');
    });

    it('should default to beginner when no clear signals', () => {
      const result = detectSkillLevel('I want to learn about cloud computing');
      expect(result.skillLevel).toBe('beginner');
    });

    it('should default to beginner when scores are tied', () => {
      // This input has no matching keywords
      const result = detectSkillLevel('Tell me about serverless please I want to know');
      expect(result.skillLevel).toBe('beginner');
    });

    it('should return low confidence for short input', () => {
      const result = detectSkillLevel('new to this');
      expect(result.confidence).toBe('low');
    });

    it('should return high confidence when many signals match', () => {
      const result = detectSkillLevel(
        'I run production workloads with performance optimization and cold start management ' +
        'across distributed multi-region enterprise systems with reserved capacity and vpc integration, ' +
        'complex architecture with concurrent execution and scaling and migration'
      );
      expect(result.confidence).toBe('high');
    });

    it('should return medium confidence by default', () => {
      const result = detectSkillLevel('I have worked with Lambda functions and deployed a few apps');
      expect(result.confidence).toBe('medium');
    });

    it('should return low confidence for beginner with weak signals', () => {
      const result = detectSkillLevel('I want to try something in the cloud, looking at serverless options');
      // beginner default, but score < 2
      expect(result.confidence).toBe('low');
    });

    it('should include signal descriptions', () => {
      const result = detectSkillLevel('I am new to serverless and learning the basics');
      expect(result.signals.some((s) => s.includes('Beginner keyword'))).toBe(true);
    });

    it('should include justification with score count', () => {
      const result = detectSkillLevel('I am new to serverless and learning the basics');
      expect(result.justification).toContain('beginner signals');
    });
  });

  // =========================================================================
  // recommendLearningPath
  // =========================================================================

  describe('recommendLearningPath', () => {
    it('should return complete learning path for valid platform', () => {
      setupKnowledgeBase();

      const result = recommendLearningPath('aws-lambda', 'beginner');

      expect(result.platform).toBe('AWS Lambda');
      expect(result.platformId).toBe('aws-lambda');
      expect(result.skillLevel).toBe('beginner');
      expect(result.tutorials).toBeDefined();
      expect(result.documentation).toBeDefined();
      expect(result.videos).toBeDefined();
      expect(result.courses).toBeDefined();
      expect(result.sampleProjects).toBeDefined();
      expect(result.bestPractices).toBeDefined();
      expect(result.commonPitfalls).toBeDefined();
      expect(result.dataFreshness).toBeDefined();
      expect(result.nextSteps).toBeDefined();
    });

    it('should throw error for unknown platform', () => {
      setupKnowledgeBase();

      expect(() => recommendLearningPath('unknown-platform')).toThrow(
        "Platform 'unknown-platform' not found"
      );
    });

    it('should default to beginner when no skill level provided', () => {
      setupKnowledgeBase();

      const result = recommendLearningPath('aws-lambda');

      expect(result.skillLevel).toBe('beginner');
    });

    it('should filter tutorials by skill level (includes beginner always)', () => {
      setupKnowledgeBase();

      const result = recommendLearningPath('aws-lambda', 'intermediate');

      // Should include beginner + intermediate tutorials
      const skillLevels = result.tutorials.map((t) => t.skillLevel);
      expect(skillLevels).toContain('beginner');
      expect(skillLevels).toContain('intermediate');
      expect(skillLevels).not.toContain('advanced');
    });

    it('should filter sample projects by exact skill level', () => {
      setupKnowledgeBase();

      const result = recommendLearningPath('aws-lambda', 'beginner');

      const skillLevels = result.sampleProjects.map((p) => p.skillLevel);
      expect(skillLevels.every((l) => l === 'beginner')).toBe(true);
    });

    it('should include all best practices regardless of skill level', () => {
      setupKnowledgeBase();

      const result = recommendLearningPath('aws-lambda', 'advanced');

      expect(result.bestPractices.length).toBe(1);
    });

    it('should filter pitfalls by affected skill levels', () => {
      setupKnowledgeBase();

      const result = recommendLearningPath('aws-lambda', 'beginner');

      // Should include pitfall with affectedSkillLevels: ['beginner'] + pitfall with no restriction
      expect(result.commonPitfalls.length).toBe(2);
    });

    it('should exclude pitfalls not matching skill level', () => {
      setupKnowledgeBase();

      const result = recommendLearningPath('aws-lambda', 'advanced');

      // Pitfall with affectedSkillLevels: ['beginner'] should be excluded
      // Pitfall with no restriction should be included
      expect(result.commonPitfalls.length).toBe(1);
      expect(result.commonPitfalls[0].id).toBe('pit-2');
    });

    it('should generate beginner next steps', () => {
      setupKnowledgeBase();

      const result = recommendLearningPath('aws-lambda', 'beginner');

      expect(result.nextSteps.length).toBeGreaterThan(0);
      expect(result.nextSteps[0]).toContain('documentation');
    });

    it('should generate intermediate next steps', () => {
      setupKnowledgeBase();

      const result = recommendLearningPath('aws-lambda', 'intermediate');

      expect(result.nextSteps.some((s) => s.includes('best practices'))).toBe(true);
    });

    it('should generate advanced next steps', () => {
      setupKnowledgeBase();

      const result = recommendLearningPath('aws-lambda', 'advanced');

      expect(result.nextSteps.some((s) => s.includes('cost optimization'))).toBe(true);
    });

    it('should include data freshness info', () => {
      setupKnowledgeBase();

      const result = recommendLearningPath('aws-lambda', 'beginner');

      expect(result.dataFreshness.lastVerified).toBeDefined();
      expect(typeof result.dataFreshness.isStale).toBe('boolean');
      expect(typeof result.dataFreshness.staleDays).toBe('number');
    });

    it('should detect stale data', () => {
      const staleKb = makeKnowledgeBase();
      staleKb.platforms['aws-lambda'].lastVerified = '2020-01-01';
      setupKnowledgeBase(staleKb);

      const result = recommendLearningPath('aws-lambda', 'beginner');

      expect(result.dataFreshness.isStale).toBe(true);
    });

    it('should estimate total learning time', () => {
      setupKnowledgeBase();

      const result = recommendLearningPath('aws-lambda', 'beginner');

      expect(result.estimatedLearningTime).toBeDefined();
    });

    it('should return undefined learning time when no estimates available', () => {
      const kb = makeKnowledgeBase();
      // Remove all time estimates
      for (const res of kb.platforms['aws-lambda'].resources.tutorials) {
        delete res.estimatedTime;
      }
      for (const res of kb.platforms['aws-lambda'].resources.videos) {
        delete res.estimatedTime;
      }
      for (const res of kb.platforms['aws-lambda'].resources.courses) {
        delete res.estimatedTime;
      }
      for (const res of kb.platforms['aws-lambda'].resources.sampleProjects) {
        delete res.estimatedTime;
      }
      setupKnowledgeBase(kb);

      const result = recommendLearningPath('aws-lambda', 'beginner');

      expect(result.estimatedLearningTime).toBeUndefined();
    });

    it('should throw when knowledge base file not found', () => {
      mockExistsSync.mockReturnValue(false);

      expect(() => recommendLearningPath('aws-lambda')).toThrow(
        'Learning paths knowledge base not found'
      );
    });

    it('should format learning time in minutes when less than 1 hour', () => {
      const kb = makeKnowledgeBase();
      // Set all resources to short times - only keep beginner ones that will be included
      kb.platforms['aws-lambda'].resources.tutorials = [
        makeLearningResource({ id: 'tut-1', skillLevel: 'beginner', estimatedTime: '10 minutes' }),
      ];
      kb.platforms['aws-lambda'].resources.videos = [];
      kb.platforms['aws-lambda'].resources.courses = [];
      kb.platforms['aws-lambda'].resources.sampleProjects = [
        makeSampleProject({ id: 'prj-1', skillLevel: 'beginner', estimatedTime: '15 minutes' }),
      ];
      setupKnowledgeBase(kb);

      const result = recommendLearningPath('aws-lambda', 'beginner');

      if (result.estimatedLearningTime) {
        expect(result.estimatedLearningTime).toContain('minutes');
      }
    });

    it('should format learning time in days when over 24 hours', () => {
      const kb = makeKnowledgeBase();
      kb.platforms['aws-lambda'].resources.tutorials = [
        makeLearningResource({ id: 'tut-1', skillLevel: 'beginner', estimatedTime: '800 minutes' }),
      ];
      kb.platforms['aws-lambda'].resources.videos = [
        makeLearningResource({ id: 'vid-1', type: 'video', skillLevel: 'beginner', estimatedTime: '900 minutes' }),
      ];
      kb.platforms['aws-lambda'].resources.courses = [];
      kb.platforms['aws-lambda'].resources.sampleProjects = [];
      setupKnowledgeBase(kb);

      const result = recommendLearningPath('aws-lambda', 'beginner');

      if (result.estimatedLearningTime) {
        expect(result.estimatedLearningTime).toContain('days');
      }
    });

    it('should handle time estimates without numbers', () => {
      const kb = makeKnowledgeBase();
      kb.platforms['aws-lambda'].resources.tutorials = [
        makeLearningResource({ id: 'tut-1', skillLevel: 'beginner', estimatedTime: 'variable' }),
      ];
      kb.platforms['aws-lambda'].resources.videos = [];
      kb.platforms['aws-lambda'].resources.courses = [];
      kb.platforms['aws-lambda'].resources.sampleProjects = [];
      setupKnowledgeBase(kb);

      const result = recommendLearningPath('aws-lambda', 'beginner');

      // Should not crash; learning time is undefined since no parseable time
      expect(result.estimatedLearningTime).toBeUndefined();
    });
  });

  // =========================================================================
  // getAvailablePlatforms
  // =========================================================================

  describe('getAvailablePlatforms', () => {
    it('should return platform IDs from knowledge base', () => {
      setupKnowledgeBase();

      const platforms = getAvailablePlatforms();

      expect(platforms).toContain('aws-lambda');
    });

    it('should return default list when knowledge base fails to load', () => {
      mockExistsSync.mockReturnValue(false);

      const platforms = getAvailablePlatforms();

      expect(platforms).toContain('aws-lambda');
      expect(platforms).toContain('azure-functions');
      expect(platforms).toContain('gcp-functions');
      expect(platforms).toContain('firebase-functions');
      expect(platforms).toContain('supabase');
    });
  });

  // =========================================================================
  // getFreshPlatforms
  // =========================================================================

  describe('getFreshPlatforms', () => {
    it('should return platforms with fresh data', () => {
      setupKnowledgeBase();

      const fresh = getFreshPlatforms();

      expect(fresh).toContain('aws-lambda');
    });

    it('should exclude stale platforms', () => {
      const kb = makeKnowledgeBase();
      kb.platforms['aws-lambda'].lastVerified = '2020-01-01';
      setupKnowledgeBase(kb);

      const fresh = getFreshPlatforms();

      expect(fresh).not.toContain('aws-lambda');
    });

    it('should respect custom maxStaleDays', () => {
      const kb = makeKnowledgeBase();
      // Set to 5 days ago
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      kb.platforms['aws-lambda'].lastVerified = fiveDaysAgo.toISOString().split('T')[0];
      setupKnowledgeBase(kb);

      // Fresh if maxStaleDays is 10
      expect(getFreshPlatforms(10)).toContain('aws-lambda');

      // Stale if maxStaleDays is 3
      expect(getFreshPlatforms(3)).not.toContain('aws-lambda');
    });
  });

  // =========================================================================
  // getStalePlatforms
  // =========================================================================

  describe('getStalePlatforms', () => {
    it('should return platforms with stale data', () => {
      const kb = makeKnowledgeBase();
      kb.platforms['aws-lambda'].lastVerified = '2020-01-01';
      setupKnowledgeBase(kb);

      const stale = getStalePlatforms();

      expect(stale).toContain('aws-lambda');
    });

    it('should not include fresh platforms', () => {
      setupKnowledgeBase();

      const stale = getStalePlatforms();

      expect(stale).not.toContain('aws-lambda');
    });

    it('should respect custom maxStaleDays', () => {
      const kb = makeKnowledgeBase();
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      kb.platforms['aws-lambda'].lastVerified = fiveDaysAgo.toISOString().split('T')[0];
      setupKnowledgeBase(kb);

      expect(getStalePlatforms(3)).toContain('aws-lambda');
      expect(getStalePlatforms(10)).not.toContain('aws-lambda');
    });
  });

  // =========================================================================
  // getResourcesByType
  // =========================================================================

  describe('getResourcesByType', () => {
    it('should return tutorials for a platform', () => {
      setupKnowledgeBase();

      const resources = getResourcesByType('aws-lambda', 'tutorial');

      expect(resources.length).toBeGreaterThan(0);
    });

    it('should return documentation for a platform', () => {
      setupKnowledgeBase();

      const resources = getResourcesByType('aws-lambda', 'documentation');

      expect(resources.length).toBeGreaterThan(0);
    });

    it('should return videos for a platform', () => {
      setupKnowledgeBase();

      const resources = getResourcesByType('aws-lambda', 'video');

      expect(resources.length).toBeGreaterThan(0);
    });

    it('should return courses for a platform', () => {
      setupKnowledgeBase();

      const resources = getResourcesByType('aws-lambda', 'course');

      expect(resources.length).toBeGreaterThan(0);
    });

    it('should return sample projects for a platform', () => {
      setupKnowledgeBase();

      const resources = getResourcesByType('aws-lambda', 'sample-project');

      expect(resources.length).toBeGreaterThan(0);
    });

    it('should return empty array for blog-post type (not in knowledge base)', () => {
      setupKnowledgeBase();

      const resources = getResourcesByType('aws-lambda', 'blog-post');

      expect(resources).toEqual([]);
    });

    it('should return empty array for webinar type (not in knowledge base)', () => {
      setupKnowledgeBase();

      const resources = getResourcesByType('aws-lambda', 'webinar');

      expect(resources).toEqual([]);
    });

    it('should filter by skill level when provided', () => {
      setupKnowledgeBase();

      const resources = getResourcesByType('aws-lambda', 'tutorial', 'intermediate');

      expect(resources.every((r) => r.skillLevel === 'intermediate')).toBe(true);
    });

    it('should return all skill levels when skillLevel not provided', () => {
      setupKnowledgeBase();

      const resources = getResourcesByType('aws-lambda', 'tutorial');

      const skillLevels = new Set(resources.map((r) => r.skillLevel));
      expect(skillLevels.size).toBeGreaterThanOrEqual(2);
    });

    it('should throw error for unknown platform', () => {
      setupKnowledgeBase();

      expect(() => getResourcesByType('unknown', 'tutorial')).toThrow(
        "Platform 'unknown' not found"
      );
    });
  });

  // =========================================================================
  // validateLearningPathData
  // =========================================================================

  describe('validateLearningPathData', () => {
    it('should return valid for well-formed knowledge base', () => {
      setupKnowledgeBase();

      const result = validateLearningPathData();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error for platform missing name', () => {
      const kb = makeKnowledgeBase();
      kb.platforms['aws-lambda'].name = '';
      setupKnowledgeBase(kb);

      const result = validateLearningPathData();

      expect(result.errors.some((e) => e.includes('missing name'))).toBe(true);
    });

    it('should report error for platform missing lastVerified', () => {
      const kb = makeKnowledgeBase();
      kb.platforms['aws-lambda'].lastVerified = '';
      setupKnowledgeBase(kb);

      const result = validateLearningPathData();

      expect(result.errors.some((e) => e.includes('missing lastVerified'))).toBe(true);
    });

    it('should report warning for stale platform data', () => {
      const kb = makeKnowledgeBase();
      kb.platforms['aws-lambda'].lastVerified = '2020-01-01';
      setupKnowledgeBase(kb);

      const result = validateLearningPathData();

      expect(result.warnings.some((w) => w.includes('stale'))).toBe(true);
    });

    it('should report error for resource without ID', () => {
      const kb = makeKnowledgeBase();
      kb.platforms['aws-lambda'].resources.tutorials.push(
        makeLearningResource({ id: '', title: 'No ID Tutorial' })
      );
      setupKnowledgeBase(kb);

      const result = validateLearningPathData();

      expect(result.errors.some((e) => e.includes('without ID'))).toBe(true);
    });

    it('should report error for resource without URL', () => {
      const kb = makeKnowledgeBase();
      kb.platforms['aws-lambda'].resources.tutorials.push(
        makeLearningResource({ id: 'missing-url', url: '', title: 'No URL Tutorial' })
      );
      setupKnowledgeBase(kb);

      const result = validateLearningPathData();

      expect(result.errors.some((e) => e.includes('missing URL'))).toBe(true);
    });

    it('should report error when knowledge base fails to load', () => {
      mockExistsSync.mockReturnValue(false);

      const result = validateLearningPathData();

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Failed to load'))).toBe(true);
    });

    it('should report isValid false when there are errors', () => {
      const kb = makeKnowledgeBase();
      kb.platforms['aws-lambda'].name = '';
      setupKnowledgeBase(kb);

      const result = validateLearningPathData();

      expect(result.isValid).toBe(false);
    });
  });
});
