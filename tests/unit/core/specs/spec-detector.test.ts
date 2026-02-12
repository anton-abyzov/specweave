/**
 * Unit tests for spec-detector.ts
 *
 * Tests the multi-spec detection system:
 * - detectSpecsInIncrement: main detection from increment path
 * - getFeatureIdFromIncrement: extract feature_id from metadata/frontmatter
 * - detectSpecsByFeatureId: scan specs folder for matching user stories
 * - parseUserStorySpec: parse individual spec files
 * - extractTitle: markdown title extraction
 * - detectProjectFromIncrement: simple project detection
 * - detectProjectFromIncrementWithConfidence: confidence-scored project detection
 * - shouldSyncSpec: sync eligibility check
 *
 * Mocks: fs-native, gray-matter, spec-identifier-detector
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const {
  mockExistsSync,
  mockReadFileSync,
  mockReaddirSync,
  mockStatSync,
  mockMatter,
  mockDetectSpecIdentifier,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockReaddirSync: vi.fn(),
  mockStatSync: vi.fn(),
  mockMatter: vi.fn(),
  mockDetectSpecIdentifier: vi.fn(),
}));

vi.mock('../../../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  readdirSync: mockReaddirSync,
  statSync: mockStatSync,
}));

vi.mock('gray-matter', () => ({
  default: mockMatter,
}));

vi.mock('../../../../src/core/specs/spec-identifier-detector.js', () => ({
  detectSpecIdentifier: mockDetectSpecIdentifier,
}));

// Import after mocks
import {
  detectSpecsInIncrement,
  detectProjectFromIncrement,
  detectProjectFromIncrementWithConfidence,
  shouldSyncSpec,
  type DetectedSpec,
  type MultiSpecDetectionResult,
} from '../../../../src/core/specs/spec-detector.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeIdentifier(project: string, display: string) {
  return {
    full: `${project}/${display}`,
    display,
    source: 'title-slug' as const,
    project,
    stable: true,
    compact: `${project.toUpperCase().substring(0, 2)}-${display}`,
  };
}

function makeDetectedSpec(overrides: Partial<DetectedSpec> = {}): DetectedSpec {
  return {
    identifier: makeIdentifier('backend', 'user-auth'),
    project: 'backend',
    path: '/specs/backend/feat-auth/us-001.md',
    syncEnabled: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

let originalCwd: string;

beforeEach(() => {
  vi.clearAllMocks();
  originalCwd = process.cwd();
});

afterEach(() => {
  // Restore process.cwd if it was changed
  if (process.cwd() !== originalCwd) {
    process.chdir(originalCwd);
  }
});

// ---------------------------------------------------------------------------
// detectSpecsInIncrement
// ---------------------------------------------------------------------------
describe('detectSpecsInIncrement', () => {
  describe('feature_id extraction', () => {
    it('returns empty result when neither metadata.json nor spec.md exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await detectSpecsInIncrement('/inc/0001-feat');

      expect(result).toEqual({ specs: [], isMultiSpec: false, projects: [] });
    });

    it('extracts feature_id from metadata.json', async () => {
      // metadata.json exists
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        // specs folder does not exist => early return
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({ feature_id: 'feat-auth' }));

      const result = await detectSpecsInIncrement('/inc/0001-feat');

      expect(result).toEqual({ specs: [], isMultiSpec: false, projects: [] });
      // Verified that readFileSync was called for metadata.json
      expect(mockReadFileSync).toHaveBeenCalledWith(
        path.join('/inc/0001-feat', 'metadata.json'),
        'utf-8'
      );
    });

    it('falls back to spec.md frontmatter when metadata.json is missing', async () => {
      const callSequence: string[] = [];

      mockExistsSync.mockImplementation((p: string) => {
        callSequence.push(p);
        if (p.endsWith('metadata.json')) return false;
        if (p.endsWith('spec.md')) return true;
        // specs folder does not exist
        return false;
      });

      mockReadFileSync.mockReturnValue('---\nfeature_id: feat-login\n---\n# Login');
      mockMatter.mockReturnValue({
        data: { feature_id: 'feat-login' },
        content: '# Login',
      });

      const result = await detectSpecsInIncrement('/inc/0002-login');

      expect(result).toEqual({ specs: [], isMultiSpec: false, projects: [] });
      expect(mockMatter).toHaveBeenCalled();
    });

    it('returns empty result when metadata.json exists but has no feature_id', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({ name: 'some-increment' }));

      const result = await detectSpecsInIncrement('/inc/0003-noid');

      expect(result).toEqual({ specs: [], isMultiSpec: false, projects: [] });
    });

    it('returns empty result when spec.md frontmatter has no feature_id', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return false;
        if (p.endsWith('spec.md')) return true;
        return false;
      });

      mockReadFileSync.mockReturnValue('---\ntitle: No Feature ID\n---\n# Content');
      mockMatter.mockReturnValue({
        data: { title: 'No Feature ID' },
        content: '# Content',
      });

      const result = await detectSpecsInIncrement('/inc/0004-nofeat');

      expect(result).toEqual({ specs: [], isMultiSpec: false, projects: [] });
    });
  });

  describe('spec scanning', () => {
    function setupSpecsFolder(options: {
      featureId: string;
      projectFolders: string[];
      featureFoldersExist?: Record<string, boolean>;
      specFiles?: Record<string, string[]>;
      specContents?: Record<string, { frontmatter: Record<string, any>; content: string }>;
    }) {
      const { featureId, projectFolders, featureFoldersExist = {}, specFiles = {}, specContents = {} } = options;
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        // Feature folder existence
        for (const proj of projectFolders) {
          const featurePath = path.join(specsFolder, proj, featureId);
          if (p === featurePath) return featureFoldersExist[proj] !== false;
        }
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) {
          return JSON.stringify({ feature_id: featureId });
        }
        // Spec file content
        for (const [key, content] of Object.entries(specContents)) {
          if (p.endsWith(key)) {
            return `---\nfeature: ${featureId}\ntitle: ${content.frontmatter.title || 'Test'}\n---\n${content.content}`;
          }
        }
        return '';
      });

      mockReaddirSync.mockImplementation((p: string) => {
        // Project folders listing
        if (p === specsFolder) return projectFolders;
        // Spec files listing per project/feature
        for (const proj of projectFolders) {
          const featurePath = path.join(specsFolder, proj, featureId);
          if (p === featurePath) return specFiles[proj] || [];
        }
        return [];
      });

      mockStatSync.mockImplementation((p: string) => {
        // All project folders are directories
        for (const proj of projectFolders) {
          if (p === path.join(specsFolder, proj)) {
            return { isDirectory: () => true };
          }
          // Feature folders are directories
          const featurePath = path.join(specsFolder, proj, featureId);
          if (p === featurePath) {
            return { isDirectory: () => true };
          }
        }
        return { isDirectory: () => false };
      });
    }

    it('returns empty result when specs folder does not exist', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({ feature_id: 'feat-x' }));

      const result = await detectSpecsInIncrement('/inc/0001-feat');

      expect(result).toEqual({ specs: [], isMultiSpec: false, projects: [] });
    });

    it('skips folders starting with underscore', async () => {
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({ feature_id: 'feat-x' }));
      mockReaddirSync.mockReturnValue(['_parent', '_internal', 'backend']);
      mockStatSync.mockImplementation((p: string) => {
        if (p.endsWith('backend')) return { isDirectory: () => true };
        if (p.endsWith('_parent')) return { isDirectory: () => true };
        if (p.endsWith('_internal')) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });

      const result = await detectSpecsInIncrement('/inc/0001-feat');

      // _parent and _internal should be skipped
      // backend should be processed but no feature folder => no specs
      expect(result.specs).toEqual([]);
    });

    it('skips non-directory entries in specs folder', async () => {
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({ feature_id: 'feat-x' }));
      mockReaddirSync.mockReturnValue(['readme.md', 'backend']);
      mockStatSync.mockImplementation((p: string) => {
        if (p.endsWith('readme.md')) return { isDirectory: () => false };
        if (p.endsWith('backend')) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });

      const result = await detectSpecsInIncrement('/inc/0001-feat');

      expect(result.specs).toEqual([]);
    });

    it('detects single-spec increment with one user story', async () => {
      const featureId = 'feat-auth';
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');
      const featurePath = path.join(specsFolder, 'backend', featureId);

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        if (p === featurePath) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) {
          return JSON.stringify({ feature_id: featureId });
        }
        return '---\nfeature: feat-auth\ntitle: User Auth\n---\n# User Auth Story';
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (p === specsFolder) return ['backend'];
        if (p === featurePath) return ['us-001.md'];
        return [];
      });

      mockStatSync.mockImplementation((p: string) => {
        if (p === path.join(specsFolder, 'backend')) return { isDirectory: () => true };
        if (p === featurePath) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });

      mockMatter.mockReturnValue({
        data: { feature: featureId, title: 'User Auth' },
        content: '# User Auth Story',
      });

      const identifier = makeIdentifier('backend', 'user-auth');
      mockDetectSpecIdentifier.mockReturnValue(identifier);

      const result = await detectSpecsInIncrement('/inc/0001-auth');

      expect(result.specs).toHaveLength(1);
      expect(result.isMultiSpec).toBe(false);
      expect(result.projects).toEqual(['backend']);
      expect(result.primary).toBeDefined();
      expect(result.primary!.project).toBe('backend');
      expect(result.primary!.identifier).toEqual(identifier);
      expect(result.primary!.syncEnabled).toBe(true);
    });

    it('detects multi-spec increment across multiple projects', async () => {
      const featureId = 'feat-dashboard';
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');
      const backendFeaturePath = path.join(specsFolder, 'backend', featureId);
      const frontendFeaturePath = path.join(specsFolder, 'frontend', featureId);

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        if (p === backendFeaturePath) return true;
        if (p === frontendFeaturePath) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) {
          return JSON.stringify({ feature_id: featureId });
        }
        return '---\nfeature: feat-dashboard\ntitle: Dashboard\n---\n# Dashboard';
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (p === specsFolder) return ['backend', 'frontend'];
        if (p === backendFeaturePath) return ['us-001.md', 'us-002.md'];
        if (p === frontendFeaturePath) return ['us-003.md'];
        return [];
      });

      mockStatSync.mockImplementation((p: string) => {
        if (p === path.join(specsFolder, 'backend')) return { isDirectory: () => true };
        if (p === path.join(specsFolder, 'frontend')) return { isDirectory: () => true };
        if (p === backendFeaturePath) return { isDirectory: () => true };
        if (p === frontendFeaturePath) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });

      mockMatter.mockReturnValue({
        data: { feature: featureId, title: 'Dashboard' },
        content: '# Dashboard',
      });

      let callCount = 0;
      mockDetectSpecIdentifier.mockImplementation(() => {
        callCount++;
        const names = ['api-endpoints', 'data-models', 'dashboard-ui'];
        const projects = ['backend', 'backend', 'frontend'];
        return makeIdentifier(projects[callCount - 1], names[callCount - 1]);
      });

      const result = await detectSpecsInIncrement('/inc/0005-dashboard');

      expect(result.specs).toHaveLength(3);
      expect(result.isMultiSpec).toBe(true);
      expect(result.projects).toContain('backend');
      expect(result.projects).toContain('frontend');
      expect(result.projects).toHaveLength(2);
    });

    it('only includes .md files starting with us-', async () => {
      const featureId = 'feat-x';
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');
      const featurePath = path.join(specsFolder, 'backend', featureId);

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        if (p === featurePath) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) {
          return JSON.stringify({ feature_id: featureId });
        }
        return '---\nfeature: feat-x\ntitle: X\n---\n# X';
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (p === specsFolder) return ['backend'];
        if (p === featurePath) return ['us-001.md', 'readme.md', 'notes.txt', 'feature.md', 'us-002.md'];
        return [];
      });

      mockStatSync.mockImplementation((p: string) => {
        if (p === path.join(specsFolder, 'backend')) return { isDirectory: () => true };
        if (p === featurePath) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });

      mockMatter.mockReturnValue({
        data: { feature: featureId, title: 'X' },
        content: '# X',
      });

      mockDetectSpecIdentifier.mockReturnValue(makeIdentifier('backend', 'x'));

      const result = await detectSpecsInIncrement('/inc/0001-x');

      // Only us-001.md and us-002.md should be processed
      expect(result.specs).toHaveLength(2);
    });

    it('skips spec files where frontmatter.feature does not match featureId', async () => {
      const featureId = 'feat-auth';
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');
      const featurePath = path.join(specsFolder, 'backend', featureId);
      const specFilePath = path.join(featurePath, 'us-001.md');

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        if (p === featurePath) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) {
          return JSON.stringify({ feature_id: featureId });
        }
        return '---\nfeature: different-feature\ntitle: Wrong\n---\n# Wrong';
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (p === specsFolder) return ['backend'];
        if (p === featurePath) return ['us-001.md'];
        return [];
      });

      mockStatSync.mockImplementation((p: string) => {
        if (p === path.join(specsFolder, 'backend')) return { isDirectory: () => true };
        if (p === featurePath) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });

      // Frontmatter feature does NOT match
      mockMatter.mockReturnValue({
        data: { feature: 'different-feature', title: 'Wrong' },
        content: '# Wrong',
      });

      const result = await detectSpecsInIncrement('/inc/0001-auth');

      expect(result.specs).toHaveLength(0);
    });

    it('skips project folder when feature folder does not exist', async () => {
      const featureId = 'feat-missing';
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        // Feature folder does NOT exist for any project
        return false;
      });

      mockReadFileSync.mockReturnValue(JSON.stringify({ feature_id: featureId }));
      mockReaddirSync.mockImplementation((p: string) => {
        if (p === specsFolder) return ['backend', 'frontend'];
        return [];
      });
      mockStatSync.mockReturnValue({ isDirectory: () => true });

      const result = await detectSpecsInIncrement('/inc/0001-missing');

      expect(result.specs).toEqual([]);
    });

    it('skips project folder when feature path is not a directory', async () => {
      const featureId = 'feat-file';
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');
      const featurePath = path.join(specsFolder, 'backend', featureId);

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        if (p === featurePath) return true;
        return false;
      });

      mockReadFileSync.mockReturnValue(JSON.stringify({ feature_id: featureId }));
      mockReaddirSync.mockImplementation((p: string) => {
        if (p === specsFolder) return ['backend'];
        return [];
      });

      mockStatSync.mockImplementation((p: string) => {
        if (p === path.join(specsFolder, 'backend')) return { isDirectory: () => true };
        // Feature path is a file, not a directory
        if (p === featurePath) return { isDirectory: () => false };
        return { isDirectory: () => false };
      });

      const result = await detectSpecsInIncrement('/inc/0001-file');

      expect(result.specs).toEqual([]);
    });
  });

  describe('primary spec selection', () => {
    it('selects first non-_parent spec as primary', async () => {
      const featureId = 'feat-multi';
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');

      // We need a setup where we get specs from multiple projects
      // but we cannot include _parent since it is filtered by the startsWith('_') check.
      // Let's test with two regular projects
      const backendPath = path.join(specsFolder, 'backend', featureId);
      const frontendPath = path.join(specsFolder, 'frontend', featureId);

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        if (p === backendPath) return true;
        if (p === frontendPath) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return JSON.stringify({ feature_id: featureId });
        return '---\nfeature: feat-multi\ntitle: Multi\n---\n# Multi';
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (p === specsFolder) return ['backend', 'frontend'];
        if (p === backendPath) return ['us-001.md'];
        if (p === frontendPath) return ['us-002.md'];
        return [];
      });

      mockStatSync.mockImplementation((p: string) => {
        const dir = { isDirectory: () => true };
        const file = { isDirectory: () => false };
        if (p === path.join(specsFolder, 'backend')) return dir;
        if (p === path.join(specsFolder, 'frontend')) return dir;
        if (p === backendPath) return dir;
        if (p === frontendPath) return dir;
        return file;
      });

      mockMatter.mockReturnValue({
        data: { feature: featureId, title: 'Multi' },
        content: '# Multi',
      });

      let callCount = 0;
      mockDetectSpecIdentifier.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeIdentifier('backend', 'be-story');
        return makeIdentifier('frontend', 'fe-story');
      });

      const result = await detectSpecsInIncrement('/inc/0001-multi');

      expect(result.primary).toBeDefined();
      expect(result.primary!.project).toBe('backend');
    });

    it('sets primary to first spec when only one exists', async () => {
      const featureId = 'feat-single';
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');
      const featurePath = path.join(specsFolder, 'frontend', featureId);

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        if (p === featurePath) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return JSON.stringify({ feature_id: featureId });
        return '---\nfeature: feat-single\ntitle: Single\n---\n# Single';
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (p === specsFolder) return ['frontend'];
        if (p === featurePath) return ['us-001.md'];
        return [];
      });

      mockStatSync.mockImplementation((p: string) => {
        if (p === path.join(specsFolder, 'frontend')) return { isDirectory: () => true };
        if (p === featurePath) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });

      mockMatter.mockReturnValue({
        data: { feature: featureId, title: 'Single' },
        content: '# Single',
      });

      mockDetectSpecIdentifier.mockReturnValue(makeIdentifier('frontend', 'single-feature'));

      const result = await detectSpecsInIncrement('/inc/0001-single');

      expect(result.primary).toBeDefined();
      expect(result.primary!.project).toBe('frontend');
    });

    it('primary is undefined when no specs found', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({ feature_id: 'feat-empty' }));

      const result = await detectSpecsInIncrement('/inc/0001-empty');

      expect(result.primary).toBeUndefined();
    });
  });

  describe('syncEnabled detection', () => {
    it('defaults to syncEnabled=true when no project config', async () => {
      const featureId = 'feat-sync';
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');
      const featurePath = path.join(specsFolder, 'backend', featureId);

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        if (p === featurePath) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return JSON.stringify({ feature_id: featureId });
        return '---\nfeature: feat-sync\ntitle: Sync\n---\n# Sync';
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (p === specsFolder) return ['backend'];
        if (p === featurePath) return ['us-001.md'];
        return [];
      });

      mockStatSync.mockImplementation((p: string) => {
        if (p === path.join(specsFolder, 'backend')) return { isDirectory: () => true };
        if (p === featurePath) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });

      mockMatter.mockReturnValue({
        data: { feature: featureId, title: 'Sync' },
        content: '# Sync',
      });

      mockDetectSpecIdentifier.mockReturnValue(makeIdentifier('backend', 'sync-test'));

      const result = await detectSpecsInIncrement('/inc/0001-sync', {});

      expect(result.specs[0].syncEnabled).toBe(true);
    });

    it('respects syncEnabled=false in project config', async () => {
      const featureId = 'feat-nosync';
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');
      const featurePath = path.join(specsFolder, 'backend', featureId);

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        if (p === featurePath) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return JSON.stringify({ feature_id: featureId });
        return '---\nfeature: feat-nosync\ntitle: NoSync\n---\n# NoSync';
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (p === specsFolder) return ['backend'];
        if (p === featurePath) return ['us-001.md'];
        return [];
      });

      mockStatSync.mockImplementation((p: string) => {
        if (p === path.join(specsFolder, 'backend')) return { isDirectory: () => true };
        if (p === featurePath) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });

      mockMatter.mockReturnValue({
        data: { feature: featureId, title: 'NoSync' },
        content: '# NoSync',
      });

      mockDetectSpecIdentifier.mockReturnValue(makeIdentifier('backend', 'nosync'));

      const config = {
        specs: {
          projects: {
            backend: { syncEnabled: false },
          },
        },
      };

      const result = await detectSpecsInIncrement('/inc/0001-nosync', config);

      expect(result.specs[0].syncEnabled).toBe(false);
    });
  });

  describe('spec identifier detection options', () => {
    it('passes preferTitleSlug and minSlugLength from config', async () => {
      const featureId = 'feat-opts';
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');
      const featurePath = path.join(specsFolder, 'backend', featureId);

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        if (p === featurePath) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return JSON.stringify({ feature_id: featureId });
        return '---\nfeature: feat-opts\ntitle: Options\n---\n# Options';
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (p === specsFolder) return ['backend'];
        if (p === featurePath) return ['us-001.md'];
        return [];
      });

      mockStatSync.mockImplementation((p: string) => {
        if (p === path.join(specsFolder, 'backend')) return { isDirectory: () => true };
        if (p === featurePath) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });

      mockMatter.mockReturnValue({
        data: { feature: featureId, title: 'Options' },
        content: '# Options',
      });

      mockDetectSpecIdentifier.mockReturnValue(makeIdentifier('backend', 'options'));

      const config = {
        specs: {
          preferTitleSlug: false,
          minSlugLength: 10,
        },
      };

      await detectSpecsInIncrement('/inc/0001-opts', config);

      expect(mockDetectSpecIdentifier).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Options',
          project: 'backend',
        }),
        expect.objectContaining({
          existingSpecs: [],
          preferTitleSlug: false,
          minSlugLength: 10,
        })
      );
    });

    it('uses default preferTitleSlug=true and minSlugLength=5 when config is empty', async () => {
      const featureId = 'feat-defaults';
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');
      const featurePath = path.join(specsFolder, 'backend', featureId);

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        if (p === featurePath) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return JSON.stringify({ feature_id: featureId });
        return '---\nfeature: feat-defaults\ntitle: Defaults\n---\n# Defaults';
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (p === specsFolder) return ['backend'];
        if (p === featurePath) return ['us-001.md'];
        return [];
      });

      mockStatSync.mockImplementation((p: string) => {
        if (p === path.join(specsFolder, 'backend')) return { isDirectory: () => true };
        if (p === featurePath) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });

      mockMatter.mockReturnValue({
        data: { feature: featureId, title: 'Defaults' },
        content: '# Defaults',
      });

      mockDetectSpecIdentifier.mockReturnValue(makeIdentifier('backend', 'defaults'));

      await detectSpecsInIncrement('/inc/0001-defaults', {});

      expect(mockDetectSpecIdentifier).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          preferTitleSlug: true,
          minSlugLength: 5,
        })
      );
    });

    it('accumulates existingSpecs across multiple parsed specs', async () => {
      const featureId = 'feat-accum';
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');
      const featurePath = path.join(specsFolder, 'backend', featureId);

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        if (p === featurePath) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return JSON.stringify({ feature_id: featureId });
        return '---\nfeature: feat-accum\ntitle: Accum\n---\n# Accum';
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (p === specsFolder) return ['backend'];
        if (p === featurePath) return ['us-001.md', 'us-002.md', 'us-003.md'];
        return [];
      });

      mockStatSync.mockImplementation((p: string) => {
        if (p === path.join(specsFolder, 'backend')) return { isDirectory: () => true };
        if (p === featurePath) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });

      mockMatter.mockReturnValue({
        data: { feature: featureId, title: 'Accum' },
        content: '# Accum',
      });

      let callCount = 0;
      mockDetectSpecIdentifier.mockImplementation(() => {
        callCount++;
        return makeIdentifier('backend', `spec-${callCount}`);
      });

      await detectSpecsInIncrement('/inc/0001-accum', {});

      // First call: existingSpecs = []
      expect(mockDetectSpecIdentifier.mock.calls[0][1].existingSpecs).toEqual([]);
      // Second call: existingSpecs = ['backend/spec-1']
      expect(mockDetectSpecIdentifier.mock.calls[1][1].existingSpecs).toEqual(['backend/spec-1']);
      // Third call: existingSpecs = ['backend/spec-1', 'backend/spec-2']
      expect(mockDetectSpecIdentifier.mock.calls[2][1].existingSpecs).toEqual([
        'backend/spec-1',
        'backend/spec-2',
      ]);
    });
  });

  describe('title extraction from content', () => {
    it('uses frontmatter title when available', async () => {
      const featureId = 'feat-title';
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');
      const featurePath = path.join(specsFolder, 'backend', featureId);

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        if (p === featurePath) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return JSON.stringify({ feature_id: featureId });
        return '---\nfeature: feat-title\ntitle: Frontmatter Title\n---\n# Heading Title';
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (p === specsFolder) return ['backend'];
        if (p === featurePath) return ['us-001.md'];
        return [];
      });

      mockStatSync.mockImplementation((p: string) => {
        if (p === path.join(specsFolder, 'backend')) return { isDirectory: () => true };
        if (p === featurePath) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });

      mockMatter.mockReturnValue({
        data: { feature: featureId, title: 'Frontmatter Title' },
        content: '# Heading Title',
      });

      mockDetectSpecIdentifier.mockReturnValue(makeIdentifier('backend', 'title-test'));

      await detectSpecsInIncrement('/inc/0001-title', {});

      expect(mockDetectSpecIdentifier).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Frontmatter Title',
        }),
        expect.anything()
      );
    });

    it('falls back to markdown heading when frontmatter title is missing', async () => {
      const featureId = 'feat-heading';
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');
      const featurePath = path.join(specsFolder, 'backend', featureId);

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        if (p === featurePath) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return JSON.stringify({ feature_id: featureId });
        return '---\nfeature: feat-heading\n---\n# My Heading Title';
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (p === specsFolder) return ['backend'];
        if (p === featurePath) return ['us-001.md'];
        return [];
      });

      mockStatSync.mockImplementation((p: string) => {
        if (p === path.join(specsFolder, 'backend')) return { isDirectory: () => true };
        if (p === featurePath) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });

      // No title in frontmatter
      mockMatter.mockReturnValue({
        data: { feature: featureId },
        content: '# My Heading Title',
      });

      mockDetectSpecIdentifier.mockReturnValue(makeIdentifier('backend', 'heading'));

      await detectSpecsInIncrement('/inc/0001-heading', {});

      expect(mockDetectSpecIdentifier).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My Heading Title',
        }),
        expect.anything()
      );
    });

    it('uses "Untitled" when neither frontmatter title nor heading exists', async () => {
      const featureId = 'feat-notitle';
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');
      const featurePath = path.join(specsFolder, 'backend', featureId);

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        if (p === featurePath) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return JSON.stringify({ feature_id: featureId });
        return '---\nfeature: feat-notitle\n---\nJust plain text with no heading';
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (p === specsFolder) return ['backend'];
        if (p === featurePath) return ['us-001.md'];
        return [];
      });

      mockStatSync.mockImplementation((p: string) => {
        if (p === path.join(specsFolder, 'backend')) return { isDirectory: () => true };
        if (p === featurePath) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });

      mockMatter.mockReturnValue({
        data: { feature: featureId },
        content: 'Just plain text with no heading',
      });

      mockDetectSpecIdentifier.mockReturnValue(makeIdentifier('backend', 'untitled'));

      await detectSpecsInIncrement('/inc/0001-notitle', {});

      expect(mockDetectSpecIdentifier).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Untitled',
        }),
        expect.anything()
      );
    });
  });

  describe('deduplication of projects list', () => {
    it('returns unique projects even when multiple specs share a project', async () => {
      const featureId = 'feat-dedup';
      const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');
      const featurePath = path.join(specsFolder, 'backend', featureId);

      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return true;
        if (p === specsFolder) return true;
        if (p === featurePath) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('metadata.json')) return JSON.stringify({ feature_id: featureId });
        return '---\nfeature: feat-dedup\ntitle: Dedup\n---\n# Dedup';
      });

      mockReaddirSync.mockImplementation((p: string) => {
        if (p === specsFolder) return ['backend'];
        if (p === featurePath) return ['us-001.md', 'us-002.md', 'us-003.md'];
        return [];
      });

      mockStatSync.mockImplementation((p: string) => {
        if (p === path.join(specsFolder, 'backend')) return { isDirectory: () => true };
        if (p === featurePath) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });

      mockMatter.mockReturnValue({
        data: { feature: featureId, title: 'Dedup' },
        content: '# Dedup',
      });

      let count = 0;
      mockDetectSpecIdentifier.mockImplementation(() => {
        count++;
        return makeIdentifier('backend', `story-${count}`);
      });

      const result = await detectSpecsInIncrement('/inc/0001-dedup', {});

      expect(result.specs).toHaveLength(3);
      expect(result.projects).toEqual(['backend']);
    });
  });
});

// ---------------------------------------------------------------------------
// detectProjectFromIncrementWithConfidence
// ---------------------------------------------------------------------------
describe('detectProjectFromIncrementWithConfidence', () => {
  describe('fallback pattern matching', () => {
    it('detects backend from increment name', () => {
      const result = detectProjectFromIncrementWithConfidence('backend-api-auth', '');
      expect(result.project).toBe('backend');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.matchedKeywords).toContain('backend');
    });

    it('detects frontend from description', () => {
      const result = detectProjectFromIncrementWithConfidence('login-page', 'Build the frontend UI for login');
      expect(result.project).toBe('frontend');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.matchedKeywords).toContain('frontend');
    });

    it('detects mobile from keywords', () => {
      const result = detectProjectFromIncrementWithConfidence('mobile-app-auth', 'iOS and Android login flow');
      expect(result.project).toBe('mobile');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.matchedKeywords.length).toBeGreaterThan(0);
    });

    it('detects infra from devops keywords', () => {
      const result = detectProjectFromIncrementWithConfidence('deploy-setup', 'Configure kubernetes cluster');
      expect(result.project).toBe('infra');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.matchedKeywords).toContain('kubernetes');
    });

    it('returns default when no patterns match', () => {
      const result = detectProjectFromIncrementWithConfidence('something-random', 'no relevant keywords here');
      expect(result.project).toBe('default');
      expect(result.confidence).toBe(0);
      expect(result.matchedKeywords).toEqual([]);
    });

    it('detects "api" as backend pattern', () => {
      const result = detectProjectFromIncrementWithConfidence('user-api-endpoints', '');
      expect(result.project).toBe('backend');
      expect(result.matchedKeywords).toContain('api');
    });

    it('detects "react" as frontend pattern', () => {
      const result = detectProjectFromIncrementWithConfidence('dashboard', 'Build react components');
      expect(result.project).toBe('frontend');
      expect(result.matchedKeywords).toContain('react');
    });

    it('detects "vue" as frontend pattern', () => {
      const result = detectProjectFromIncrementWithConfidence('widget', 'Create vue application');
      expect(result.project).toBe('frontend');
      expect(result.matchedKeywords).toContain('vue');
    });

    it('detects "angular" as frontend pattern', () => {
      const result = detectProjectFromIncrementWithConfidence('portal', 'angular module for admin');
      expect(result.project).toBe('frontend');
      expect(result.matchedKeywords).toContain('angular');
    });

    it('detects "docker" as infra pattern', () => {
      const result = detectProjectFromIncrementWithConfidence('containerize', 'Set up docker compose');
      expect(result.project).toBe('infra');
      expect(result.matchedKeywords).toContain('docker');
    });

    it('detects "terraform" as infra pattern', () => {
      const result = detectProjectFromIncrementWithConfidence('iac', 'terraform modules for AWS');
      expect(result.project).toBe('infra');
      expect(result.matchedKeywords).toContain('terraform');
    });

    it('detects "flutter" as mobile pattern', () => {
      const result = detectProjectFromIncrementWithConfidence('cross-platform', 'flutter app for both platforms');
      expect(result.project).toBe('mobile');
      expect(result.matchedKeywords).toContain('flutter');
    });

    it('detects "react-native" as mobile pattern when no competing frontend keywords', () => {
      // Note: "react-native" contains "react" which also matches frontend.
      // With only "react-native" + "mobile" keywords, mobile wins due to 2 matches (0.4) vs 1 (0.2).
      const result = detectProjectFromIncrementWithConfidence('mobile-app', 'react-native implementation');
      expect(result.project).toBe('mobile');
      expect(result.matchedKeywords).toContain('react-native');
      expect(result.matchedKeywords).toContain('mobile');
    });

    it('"react-native" text also triggers "react" match for frontend', () => {
      // "react-native" contains substring "react", triggering the frontend pattern too.
      // With equal scores (0.2 each), frontend wins because it is processed before mobile
      // in the fallback patterns array, and the "best" comparison uses strict > (not >=).
      const result = detectProjectFromIncrementWithConfidence('rn-app', 'react-native implementation');
      expect(result.project).toBe('frontend');
      expect(result.matchedKeywords).toContain('react');
    });
  });

  describe('confidence scoring', () => {
    it('higher confidence with more matching keywords', () => {
      const low = detectProjectFromIncrementWithConfidence('setup', 'server work');
      const high = detectProjectFromIncrementWithConfidence('backend-api', 'server database integration');

      expect(high.confidence).toBeGreaterThan(low.confidence);
    });

    it('confidence is capped at 1.0', () => {
      const result = detectProjectFromIncrementWithConfidence(
        'backend api server database',
        'backend api server database backend api server database'
      );
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it('returns zero confidence when nothing matches', () => {
      const result = detectProjectFromIncrementWithConfidence('abc', 'xyz');
      expect(result.confidence).toBe(0);
    });
  });

  describe('configured project keywords', () => {
    it('uses project keywords from config with higher weight (0.3 per keyword)', () => {
      const config = {
        specs: {
          projects: {
            payments: { keywords: ['stripe', 'billing', 'subscription'] },
          },
        },
      };

      const result = detectProjectFromIncrementWithConfidence('billing-module', 'integrate stripe subscription', config);
      expect(result.project).toBe('payments');
      expect(result.matchedKeywords).toContain('stripe');
      expect(result.matchedKeywords).toContain('billing');
      expect(result.matchedKeywords).toContain('subscription');
    });

    it('configured keywords override fallback patterns', () => {
      const config = {
        specs: {
          projects: {
            'custom-be': { keywords: ['api', 'server', 'backend', 'database'] },
          },
        },
      };

      // "api" matches both config and fallback, but config weight is 0.3 vs 0.2
      const result = detectProjectFromIncrementWithConfidence('api-service', 'backend server database', config);
      expect(result.project).toBe('custom-be');
    });

    it('combines config and fallback scores for same project name', () => {
      const config = {
        specs: {
          projects: {
            backend: { keywords: ['custom-backend-keyword'] },
          },
        },
      };

      const result = detectProjectFromIncrementWithConfidence(
        'custom-backend-keyword api server',
        ''
      , config);

      // Should get points from both config (0.3) and fallback (0.2 * 2 for api + server)
      expect(result.project).toBe('backend');
      expect(result.matchedKeywords).toContain('custom-backend-keyword');
    });

    it('handles empty project keywords array', () => {
      const config = {
        specs: {
          projects: {
            empty: { keywords: [] },
          },
        },
      };

      const result = detectProjectFromIncrementWithConfidence('backend api', '', config);
      expect(result.project).toBe('backend');
    });

    it('handles config with no projects', () => {
      const config = { specs: {} };
      const result = detectProjectFromIncrementWithConfidence('backend api', '', config);
      expect(result.project).toBe('backend');
    });
  });

  describe('case insensitivity', () => {
    it('matches regardless of case in increment name', () => {
      const result = detectProjectFromIncrementWithConfidence('BACKEND-API', '');
      expect(result.project).toBe('backend');
    });

    it('matches regardless of case in description', () => {
      const result = detectProjectFromIncrementWithConfidence('module', 'REACT Components');
      expect(result.project).toBe('frontend');
    });

    it('matches config keywords case-insensitively', () => {
      const config = {
        specs: {
          projects: {
            payments: { keywords: ['STRIPE'] },
          },
        },
      };

      const result = detectProjectFromIncrementWithConfidence('stripe-integration', '', config);
      expect(result.project).toBe('payments');
    });
  });

  describe('text concatenation', () => {
    it('combines increment name and description for matching', () => {
      // "backend" in name, "database" in description => both should match
      const result = detectProjectFromIncrementWithConfidence('backend-service', 'with database support');
      expect(result.matchedKeywords).toContain('backend');
      expect(result.matchedKeywords).toContain('database');
    });

    it('matches when keyword spans name and description', () => {
      // "server" only in description but project detected from name
      const result = detectProjectFromIncrementWithConfidence('my-feature', 'api server work');
      expect(result.project).toBe('backend');
    });
  });
});

// ---------------------------------------------------------------------------
// detectProjectFromIncrement (simple version)
// ---------------------------------------------------------------------------
describe('detectProjectFromIncrement', () => {
  it('returns project string from confidence-based detection', () => {
    const result = detectProjectFromIncrement('backend-api', 'server work');
    expect(result).toBe('backend');
  });

  it('returns "default" when nothing matches', () => {
    const result = detectProjectFromIncrement('random-stuff', 'nothing relevant');
    expect(result).toBe('default');
  });

  it('passes config through to confidence-based detection', () => {
    const config = {
      specs: {
        projects: {
          payments: { keywords: ['stripe'] },
        },
      },
    };

    const result = detectProjectFromIncrement('stripe-setup', '', config);
    expect(result).toBe('payments');
  });

  it('uses default empty string for description when not provided', () => {
    const result = detectProjectFromIncrement('frontend-widget');
    expect(result).toBe('frontend');
  });

  it('uses empty config when not provided', () => {
    const result = detectProjectFromIncrement('api-gateway');
    expect(result).toBe('backend');
  });
});

// ---------------------------------------------------------------------------
// shouldSyncSpec
// ---------------------------------------------------------------------------
describe('shouldSyncSpec', () => {
  it('returns false when global sync is disabled', () => {
    const spec = makeDetectedSpec();
    const config = { sync: { enabled: false } };

    expect(shouldSyncSpec(spec, config)).toBe(false);
  });

  it('returns false when spec syncEnabled is false', () => {
    const spec = makeDetectedSpec({ syncEnabled: false });
    const config = {};

    expect(shouldSyncSpec(spec, config)).toBe(false);
  });

  it('returns false for _parent project', () => {
    const spec = makeDetectedSpec({ project: '_parent' });
    const config = {
      specs: {
        projects: {
          _parent: { github: { owner: 'org', repo: 'repo' } },
        },
      },
    };

    expect(shouldSyncSpec(spec, config)).toBe(false);
  });

  it('returns false when project has no github config', () => {
    const spec = makeDetectedSpec({ project: 'backend' });
    const config = {
      specs: {
        projects: {
          backend: {},
        },
      },
    };

    expect(shouldSyncSpec(spec, config)).toBe(false);
  });

  it('returns true when all conditions are met', () => {
    const spec = makeDetectedSpec({ project: 'backend', syncEnabled: true });
    const config = {
      specs: {
        projects: {
          backend: { github: { owner: 'org', repo: 'repo' } },
        },
      },
    };

    expect(shouldSyncSpec(spec, config)).toBe(true);
  });

  it('returns false with empty config', () => {
    const spec = makeDetectedSpec();
    expect(shouldSyncSpec(spec, {})).toBe(false);
  });

  it('returns false with no config argument', () => {
    const spec = makeDetectedSpec();
    expect(shouldSyncSpec(spec)).toBe(false);
  });

  it('returns false when specs.projects is missing from config', () => {
    const spec = makeDetectedSpec();
    const config = { specs: {} };

    expect(shouldSyncSpec(spec, config)).toBe(false);
  });

  it('returns false when project is not in specs.projects', () => {
    const spec = makeDetectedSpec({ project: 'backend' });
    const config = {
      specs: {
        projects: {
          frontend: { github: { owner: 'org', repo: 'repo' } },
        },
      },
    };

    expect(shouldSyncSpec(spec, config)).toBe(false);
  });

  it('returns true with sync enabled globally and project has github', () => {
    const spec = makeDetectedSpec({ project: 'frontend', syncEnabled: true });
    const config = {
      sync: { enabled: true },
      specs: {
        projects: {
          frontend: { github: { owner: 'acme', repo: 'web' } },
        },
      },
    };

    expect(shouldSyncSpec(spec, config)).toBe(true);
  });

  it('handles github config with null value as falsy', () => {
    const spec = makeDetectedSpec({ project: 'backend', syncEnabled: true });
    const config = {
      specs: {
        projects: {
          backend: { github: null },
        },
      },
    };

    expect(shouldSyncSpec(spec, config)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Type exports validation
// ---------------------------------------------------------------------------
describe('type exports', () => {
  it('DetectedSpec interface has required fields', () => {
    const spec: DetectedSpec = {
      identifier: makeIdentifier('backend', 'test'),
      project: 'backend',
      path: '/some/path.md',
      syncEnabled: true,
    };

    expect(spec.identifier).toBeDefined();
    expect(spec.project).toBe('backend');
    expect(spec.path).toBe('/some/path.md');
    expect(spec.syncEnabled).toBe(true);
  });

  it('MultiSpecDetectionResult interface has required fields', () => {
    const result: MultiSpecDetectionResult = {
      specs: [],
      isMultiSpec: false,
      projects: [],
    };

    expect(result.specs).toEqual([]);
    expect(result.isMultiSpec).toBe(false);
    expect(result.projects).toEqual([]);
    expect(result.primary).toBeUndefined();
  });

  it('MultiSpecDetectionResult can include primary', () => {
    const primary = makeDetectedSpec();
    const result: MultiSpecDetectionResult = {
      specs: [primary],
      primary,
      isMultiSpec: false,
      projects: ['backend'],
    };

    expect(result.primary).toBeDefined();
    expect(result.primary!.project).toBe('backend');
  });
});
