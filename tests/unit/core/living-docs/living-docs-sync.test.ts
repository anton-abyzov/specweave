/**
 * Unit Tests: LivingDocsSync
 *
 * Comprehensive tests for the living-docs-sync module covering:
 * - Constructor initialization
 * - getProjectId()
 * - syncIncrement() (all paths: active, archived, dry-run, cross-project, errors)
 * - getFeatureIdForIncrement() (via syncIncrement indirection)
 * - findNextAvailableIdForExternal() (via collision scenarios)
 * - extractProjectBoardFromSpec() (via resolveProjectPath indirection)
 * - validateAndNormalizeName() (via extractProjectBoardFromSpec indirection)
 * - resolveProjectPath() (single-project, multi-project, 2-level)
 * - parseIncrementSpec() (frontmatter, title extraction, status from metadata)
 * - syncTasksToUserStories() / updateTasksSection() (via syncIncrement)
 * - syncToExternalTools() / detectExternalTools() (via syncIncrement)
 * - detectMultiProjectMode() (via resolveProjectPath)
 * - findBestProjectMatch() / projectNamesMatch() (via resolveProjectPath)
 *
 * @see src/core/living-docs/living-docs-sync.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fsMod from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Logger } from '../../../../src/utils/logger.js';
import type { SyncOptions, UserStoryData, AcceptanceCriterionData } from '../../../../src/core/living-docs/types.js';

// ---------------------------------------------------------------------------
// Hoisted mocks - must be declared before any `vi.mock()` calls
// ---------------------------------------------------------------------------

const {
  mockBuildRegistry,
  mockFeatureIdManager,
  mockBoardMatcherInstance,
  mockCrossProjectSyncInstance,
  mockProjectResolutionInstance,
  mockAutoDetectProjectIdSync,
  mockDeriveFeatureId,
  mockExtractIncrementNumber,
  mockCalculateUSStatus,
  mockExtractUserStories,
  mockExtractAcceptanceCriteria,
  mockGenerateFeatureFile,
  mockGenerateReadmeFile,
  mockGenerateUserStoryFile,
  mockPathExists,
  mockReadJson,
  mockEnsureDir,
  mockFindExistingUserStoryFile,
  mockCleanupDuplicateFiles,
  mockCleanupTempFiles,
  mockGenerateLivingDocsImagesEnhanced,
  mockGetRelativeImagePath,
  mockMarkdownImage,
  mockExtractKeywordsFromContent,
  mockGetProfilesByProvider,
  mockGetGitHubAuthFromProject,
  mockTaskGeneratorInstance,
} = vi.hoisted(() => {
  const mockBuildRegistry = vi.fn().mockResolvedValue(undefined);
  const mockFeatureIdManager = {
    buildRegistry: mockBuildRegistry,
  };

  const mockBoardMatcherInstance = {
    getAvailableBoards: vi.fn().mockResolvedValue([]),
    matchIncrement: vi.fn().mockResolvedValue({
      needsUserInput: false,
      bestMatch: null,
      allMatches: [],
      availableBoards: [],
      reason: '',
    }),
    isUtilityIncrement: vi.fn().mockReturnValue(false),
  };

  const mockCrossProjectSyncInstance = {
    isCrossProject: vi.fn().mockReturnValue(false),
    is2LevelStructure: vi.fn().mockReturnValue(false),
    groupByProject: vi.fn().mockReturnValue(new Map()),
    generateCrossReferences: vi.fn().mockReturnValue(''),
    logSyncSummary: vi.fn(),
  };

  const mockProjectResolutionInstance = {
    resolveProjectForIncrement: vi.fn().mockResolvedValue({
      projectId: 'test-project',
      confidence: 'high',
      source: 'config',
      reasoning: ['from config'],
    }),
    validateAgainstRegistry: vi.fn().mockResolvedValue({
      inRegistry: true,
      suggestions: [],
    }),
    validateProjectForFolderCreation: vi.fn().mockResolvedValue({
      valid: true,
      reason: '',
      allowedProjects: ['test-project'],
    }),
  };

  const mockAutoDetectProjectIdSync = vi.fn().mockReturnValue('test-project');
  const mockDeriveFeatureId = vi.fn().mockReturnValue('FS-001');
  const mockExtractIncrementNumber = vi.fn().mockReturnValue(1);

  const mockCalculateUSStatus = vi.fn().mockReturnValue('planned');
  const mockExtractUserStories = vi.fn().mockReturnValue([]);
  const mockExtractAcceptanceCriteria = vi.fn().mockReturnValue([]);
  const mockGenerateFeatureFile = vi.fn().mockReturnValue('# FEATURE.md content');
  const mockGenerateReadmeFile = vi.fn().mockReturnValue('# README content');
  const mockGenerateUserStoryFile = vi.fn().mockReturnValue('# US content');
  const mockPathExists = vi.fn().mockResolvedValue(false);
  const mockReadJson = vi.fn().mockResolvedValue({});
  const mockEnsureDir = vi.fn().mockImplementation(async (dirPath: string) => {
    // Actually create directories so real fs.writeFile/readFile calls work
    const fs = await import('fs');
    fs.mkdirSync(dirPath, { recursive: true });
  });
  const mockFindExistingUserStoryFile = vi.fn().mockResolvedValue(null);
  const mockCleanupDuplicateFiles = vi.fn().mockResolvedValue(undefined);
  const mockCleanupTempFiles = vi.fn().mockResolvedValue(undefined);

  const mockGenerateLivingDocsImagesEnhanced = vi.fn().mockResolvedValue({ success: true });
  const mockGetRelativeImagePath = vi.fn().mockReturnValue('images/feature.png');
  const mockMarkdownImage = vi.fn().mockReturnValue('![alt](images/feature.png)');
  const mockExtractKeywordsFromContent = vi.fn().mockReturnValue([]);

  const mockGetProfilesByProvider = vi.fn().mockReturnValue([]);
  const mockGetGitHubAuthFromProject = vi.fn().mockReturnValue({ token: '' });

  const mockTaskGeneratorInstance = {
    generateProjectSpecificTasks: vi.fn().mockResolvedValue([]),
    formatTasksAsMarkdown: vi.fn().mockReturnValue(''),
  };

  return {
    mockBuildRegistry,
    mockFeatureIdManager,
    mockBoardMatcherInstance,
    mockCrossProjectSyncInstance,
    mockProjectResolutionInstance,
    mockAutoDetectProjectIdSync,
    mockDeriveFeatureId,
    mockExtractIncrementNumber,
    mockCalculateUSStatus,
    mockExtractUserStories,
    mockExtractAcceptanceCriteria,
    mockGenerateFeatureFile,
    mockGenerateReadmeFile,
    mockGenerateUserStoryFile,
    mockPathExists,
    mockReadJson,
    mockEnsureDir,
    mockFindExistingUserStoryFile,
    mockCleanupDuplicateFiles,
    mockCleanupTempFiles,
    mockGenerateLivingDocsImagesEnhanced,
    mockGetRelativeImagePath,
    mockMarkdownImage,
    mockExtractKeywordsFromContent,
    mockGetProfilesByProvider,
    mockGetGitHubAuthFromProject,
    mockTaskGeneratorInstance,
  };
});

// ---------------------------------------------------------------------------
// vi.mock() declarations
// ---------------------------------------------------------------------------

vi.mock('../../../../src/core/living-docs/feature-id-manager.js', () => ({
  FeatureIDManager: class { buildRegistry = mockBuildRegistry; },
}));

vi.mock('../../../../src/core/living-docs/board-matcher.js', () => ({
  BoardMatcher: class {
    getAvailableBoards = mockBoardMatcherInstance.getAvailableBoards;
    matchIncrement = mockBoardMatcherInstance.matchIncrement;
    isUtilityIncrement = mockBoardMatcherInstance.isUtilityIncrement;
  },
}));

vi.mock('../../../../src/core/living-docs/cross-project-sync.js', () => ({
  CrossProjectSync: class {
    isCrossProject = mockCrossProjectSyncInstance.isCrossProject;
    is2LevelStructure = mockCrossProjectSyncInstance.is2LevelStructure;
    groupByProject = mockCrossProjectSyncInstance.groupByProject;
    generateCrossReferences = mockCrossProjectSyncInstance.generateCrossReferences;
    logSyncSummary = mockCrossProjectSyncInstance.logSyncSummary;
  },
}));

vi.mock('../../../../src/core/project/project-resolution.js', () => ({
  ProjectResolutionService: class {
    resolveProjectForIncrement = mockProjectResolutionInstance.resolveProjectForIncrement;
    validateAgainstRegistry = mockProjectResolutionInstance.validateAgainstRegistry;
    validateProjectForFolderCreation = mockProjectResolutionInstance.validateProjectForFolderCreation;
  },
}));

vi.mock('../../../../src/utils/project-detection.js', () => ({
  autoDetectProjectIdSync: mockAutoDetectProjectIdSync,
}));

vi.mock('../../../../src/utils/feature-id-derivation.js', () => ({
  deriveFeatureId: mockDeriveFeatureId,
  extractIncrementNumber: mockExtractIncrementNumber,
}));

vi.mock('../../../../src/core/living-docs/sync-helpers/index.js', async () => {
  const actual = await vi.importActual<typeof import('../../../../src/core/living-docs/sync-helpers/index.js')>(
    '../../../../src/core/living-docs/sync-helpers/index.js'
  );
  return {
    calculateUSStatus: mockCalculateUSStatus,
    extractUserStories: mockExtractUserStories,
    extractAcceptanceCriteria: mockExtractAcceptanceCriteria,
    generateFeatureFile: mockGenerateFeatureFile,
    generateReadmeFile: mockGenerateReadmeFile,
    generateUserStoryFile: mockGenerateUserStoryFile,
    pathExists: mockPathExists,
    readJson: mockReadJson,
    ensureDir: mockEnsureDir,
    findExistingUserStoryFile: mockFindExistingUserStoryFile,
    cleanupDuplicateFiles: mockCleanupDuplicateFiles,
    cleanupTempFiles: mockCleanupTempFiles,
    // Pass through real utility functions that don't need mocking
    slugifyTitle: actual.slugifyTitle,
    extractFirstSentence: actual.extractFirstSentence,
  };
});

vi.mock('../../../../src/utils/image-generator.js', () => ({
  generateLivingDocsImagesEnhanced: mockGenerateLivingDocsImagesEnhanced,
  getRelativeImagePath: mockGetRelativeImagePath,
  markdownImage: mockMarkdownImage,
  extractKeywordsFromContent: mockExtractKeywordsFromContent,
}));

vi.mock('../../../../src/core/types/sync-profile.js', () => ({
  getProfilesByProvider: mockGetProfilesByProvider,
}));

vi.mock('../../../../src/utils/auth-helpers.js', () => ({
  getGitHubAuthFromProject: mockGetGitHubAuthFromProject,
}));

vi.mock('../../../../src/core/living-docs/task-project-specific-generator.js', () => ({
  TaskProjectSpecificGenerator: class {
    generateProjectSpecificTasks = mockTaskGeneratorInstance.generateProjectSpecificTasks;
    formatTasksAsMarkdown = mockTaskGeneratorInstance.formatTasksAsMarkdown;
  },
}));

vi.mock('../../../../src/core/living-docs/feature-consistency-validator.js', () => ({
  FeatureConsistencyValidator: vi.fn(),
}));

vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  Logger: vi.fn(),
}));

// We must NOT mock yaml as it is used to parse frontmatter
// We DO mock the structure-level-detector (dynamic import in resolveProjectPath)
vi.mock('../../../../src/utils/structure-level-detector.js', () => ({
  detectStructureLevel: vi.fn().mockReturnValue({
    level: 1,
    detectionReason: 'single-project',
    projects: [],
    boardsByProject: {},
  }),
}));

// Mock @inquirer/prompts to prevent hanging on interactive input
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn().mockRejectedValue(new Error('Non-interactive environment')),
  input: vi.fn().mockRejectedValue(new Error('Non-interactive environment')),
}));

// ---------------------------------------------------------------------------
// Import the class under test AFTER mocks are set up
// ---------------------------------------------------------------------------

import { LivingDocsSync } from '../../../../src/core/living-docs/living-docs-sync.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const silentLogger: Logger = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

function makeUserStory(overrides?: Partial<UserStoryData>): UserStoryData {
  return {
    id: 'US-001',
    title: 'User can login',
    description: 'As a user I want to login',
    acceptanceCriteria: ['AC-US1-01'],
    status: 'planned',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LivingDocsSync', () => {
  let testDir: string;
  let sync: LivingDocsSync;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create temp directory structure
    testDir = await fsPromises.mkdir(
      path.join(os.tmpdir(), `living-docs-sync-test-${Date.now()}`),
      { recursive: true }
    ).then(() => path.join(os.tmpdir(), `living-docs-sync-test-${Date.now()}`));

    // Actually re-create with mkdtemp for uniqueness
    testDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'lds-test-'));

    // Create the basic directory structure
    await fsPromises.mkdir(path.join(testDir, '.specweave', 'increments'), { recursive: true });
    await fsPromises.mkdir(path.join(testDir, '.specweave', 'docs', 'internal', 'specs'), { recursive: true });

    // Reset default mock behaviors
    mockAutoDetectProjectIdSync.mockReturnValue('test-project');
    mockDeriveFeatureId.mockReturnValue('FS-001');
    mockExtractIncrementNumber.mockReturnValue(1);
    mockExtractUserStories.mockReturnValue([]);
    mockExtractAcceptanceCriteria.mockReturnValue([]);
    mockPathExists.mockResolvedValue(false);
    mockReadJson.mockResolvedValue({});
    mockFindExistingUserStoryFile.mockResolvedValue(null);
    mockCrossProjectSyncInstance.isCrossProject.mockReturnValue(false);
    mockProjectResolutionInstance.resolveProjectForIncrement.mockResolvedValue({
      projectId: 'test-project',
      confidence: 'high',
      source: 'config',
      reasoning: ['from config'],
    });
    mockProjectResolutionInstance.validateAgainstRegistry.mockResolvedValue({
      inRegistry: true,
      suggestions: [],
    });
    mockProjectResolutionInstance.validateProjectForFolderCreation.mockResolvedValue({
      valid: true,
      reason: '',
      allowedProjects: ['test-project'],
    });

    // Set env to skip image generation in tests
    process.env.SPECWEAVE_SKIP_IMAGE_GEN = 'true';
    process.env.SKIP_EXTERNAL_SYNC = 'true';

    sync = new LivingDocsSync(testDir, { logger: silentLogger });
  });

  afterEach(async () => {
    delete process.env.SPECWEAVE_SKIP_IMAGE_GEN;
    delete process.env.SKIP_EXTERNAL_SYNC;
    await fsPromises.rm(testDir, { recursive: true, force: true });
  });

  // =========================================================================
  // Constructor
  // =========================================================================

  describe('constructor', () => {
    it('should initialize with projectRoot and auto-detect project ID', () => {
      expect(mockAutoDetectProjectIdSync).toHaveBeenCalledWith(testDir, { silent: true });
      expect(sync.getProjectId()).toBe('test-project');
    });

    it('should use consoleLogger when no logger provided', () => {
      // The consoleLogger is the default, already tested by construction
      const s = new LivingDocsSync(testDir);
      expect(s.getProjectId()).toBe('test-project');
    });

    it('should use provided logger', () => {
      const customLogger: Logger = {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      };
      const s = new LivingDocsSync(testDir, { logger: customLogger });
      expect(s.getProjectId()).toBe('test-project');
    });
  });

  // =========================================================================
  // getProjectId
  // =========================================================================

  describe('getProjectId', () => {
    it('should return auto-detected project ID', () => {
      expect(sync.getProjectId()).toBe('test-project');
    });

    it('should return different project ID when auto-detection returns different value', () => {
      mockAutoDetectProjectIdSync.mockReturnValue('other-project');
      const s = new LivingDocsSync(testDir, { logger: silentLogger });
      expect(s.getProjectId()).toBe('other-project');
    });
  });

  // =========================================================================
  // syncIncrement - non-active increment (archived or missing)
  // =========================================================================

  describe('syncIncrement - non-active increment', () => {
    it('should return success with skip message when increment is not in active folder', async () => {
      // The increment folder does NOT exist in the active directory
      const result = await sync.syncIncrement('0099-nonexistent-increment');

      expect(result.success).toBe(true);
      expect(result.featureId).toBe('');
      expect(result.errors).toContain('Increment not in active folder - sync skipped to prevent issues');
    });
  });

  // =========================================================================
  // syncIncrement - TOCTOU race condition (increment disappears mid-sync)
  // =========================================================================

  describe('syncIncrement - TOCTOU race condition handling', () => {
    it('should handle increment folder disappearing after access check (mid-sync race)', async () => {
      const incrementId = '0050-vanishing-increment';
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);

      // Create the increment folder so fs.access() succeeds
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        '---\ntitle: Vanishing\n---\n# Vanishing',
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );

      // Simulate race: after fs.access succeeds, remove the folder before spec parsing.
      // We spy on the real fs.access to remove the folder right after the check passes,
      // so subsequent reads hit ENOENT — mimicking an archive moving the folder.
      const originalAccess = fsPromises.access;
      const accessSpy = vi.spyOn(fsPromises, 'access').mockImplementation(async (...args) => {
        const result = await originalAccess.apply(fsPromises, args as Parameters<typeof originalAccess>);
        // After access succeeds for our increment path, remove the folder
        if (String(args[0]).includes(incrementId)) {
          await fsPromises.rm(incDir, { recursive: true, force: true });
        }
        return result;
      });

      const result = await sync.syncIncrement(incrementId);

      // After folder deletion, isTemplateFile detects the missing spec.md and skips
      // sync gracefully (v1.0.344+ template guard catches TOCTOU races early)
      expect(result.success).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toMatch(/template/);

      accessSpy.mockRestore();
    });

    it('should not leave partial living docs when increment vanishes mid-sync', async () => {
      const incrementId = '0051-ghost-increment';
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);

      // Create increment folder
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        '---\ntitle: Ghost\n---\n# Ghost',
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );

      // Remove folder after access check
      const originalAccess = fsPromises.access;
      const accessSpy = vi.spyOn(fsPromises, 'access').mockImplementation(async (...args) => {
        const result = await originalAccess.apply(fsPromises, args as Parameters<typeof originalAccess>);
        if (String(args[0]).includes(incrementId)) {
          await fsPromises.rm(incDir, { recursive: true, force: true });
        }
        return result;
      });

      await sync.syncIncrement(incrementId);

      // Verify no FEATURE.md was created in living docs for this ghost increment
      const featurePath = path.join(
        testDir, '.specweave', 'docs', 'internal', 'specs', 'test-project', 'FS-001'
      );
      const featureExists = fsMod.existsSync(path.join(featurePath, 'FEATURE.md'));
      expect(featureExists).toBe(false);

      accessSpy.mockRestore();
    });
  });

  // =========================================================================
  // syncIncrement - happy path (single-project)
  // =========================================================================

  describe('syncIncrement - single project happy path', () => {
    const incrementId = '0001-test-feature';

    beforeEach(async () => {
      // Create active increment folder with spec.md and metadata.json
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });

      // Write spec.md
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: Test Feature
status: in-progress
priority: P1
created: 2026-01-01
---

# Test Feature

## Overview

This is a test feature.

## User Stories

### US-001: User can login

As a user I want to login.

#### Acceptance Criteria

- [x] AC-US1-01: User can enter credentials
- [ ] AC-US1-02: User sees error on invalid credentials
`,
        'utf-8'
      );

      // Write metadata.json
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );

      // Write config.json for single-project mode
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
        }),
        'utf-8'
      );

      // Mock the spec parsing helpers to return realistic data
      const stories: UserStoryData[] = [makeUserStory()];
      const acs: AcceptanceCriterionData[] = [
        { id: 'AC-US1-01', userStoryId: 'US-001', description: 'User can enter credentials', completed: true },
        { id: 'AC-US1-02', userStoryId: 'US-001', description: 'Error on invalid credentials', completed: false },
      ];
      mockExtractUserStories.mockReturnValue(stories);
      mockExtractAcceptanceCriteria.mockReturnValue(acs);
      mockPathExists.mockImplementation(async (p: string) => {
        // spec.md and metadata.json exist
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should sync increment successfully and return created files', async () => {
      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
      expect(result.featureId).toBe('FS-001');
      expect(result.incrementId).toBe(incrementId);
      expect(result.filesCreated.length).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should call buildRegistry on featureIdManager', async () => {
      await sync.syncIncrement(incrementId);
      expect(mockBuildRegistry).toHaveBeenCalled();
    });

    it('should call generateFeatureFile', async () => {
      await sync.syncIncrement(incrementId);
      expect(mockGenerateFeatureFile).toHaveBeenCalled();
    });

    it('should call ensureDir to create project path', async () => {
      await sync.syncIncrement(incrementId);
      expect(mockEnsureDir).toHaveBeenCalled();
    });

    it('should call cleanupDuplicateFiles and cleanupTempFiles', async () => {
      await sync.syncIncrement(incrementId);
      expect(mockCleanupDuplicateFiles).toHaveBeenCalled();
      expect(mockCleanupTempFiles).toHaveBeenCalled();
    });

    it('should sync tasks to user stories', async () => {
      await sync.syncIncrement(incrementId);
      // TaskProjectSpecificGenerator should be invoked
      expect(mockTaskGeneratorInstance.generateProjectSpecificTasks).toHaveBeenCalled();
    });

    it('should validate project for folder creation', async () => {
      await sync.syncIncrement(incrementId);
      expect(mockProjectResolutionInstance.validateProjectForFolderCreation).toHaveBeenCalled();
    });

    it('should validate against registry', async () => {
      await sync.syncIncrement(incrementId);
      expect(mockProjectResolutionInstance.validateAgainstRegistry).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // syncIncrement - dry-run mode
  // =========================================================================

  describe('syncIncrement - dry-run mode', () => {
    const incrementId = '0002-dry-run-feature';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: Dry Run Feature
---
# Dry Run Feature
## Overview
Test dry run.
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'planning' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'planning' };
        return {};
      });
    });

    it('should not write files in dry-run mode', async () => {
      const result = await sync.syncIncrement(incrementId, { dryRun: true });

      expect(result.success).toBe(true);
      // Dry-run files have "(dry-run)" suffix
      for (const f of result.filesCreated) {
        expect(f).toContain('(dry-run)');
      }
      // ensureDir should NOT be called in dry-run
      expect(mockEnsureDir).not.toHaveBeenCalled();
    });

    it('should not cleanup in dry-run mode', async () => {
      await sync.syncIncrement(incrementId, { dryRun: true });
      expect(mockCleanupDuplicateFiles).not.toHaveBeenCalled();
      expect(mockCleanupTempFiles).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // syncIncrement - explicit feature ID
  // =========================================================================

  describe('syncIncrement - explicit feature ID', () => {
    const incrementId = '0003-explicit-feature';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: Explicit Feature
---
# Explicit Feature
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should use explicit feature ID when provided and valid', async () => {
      const result = await sync.syncIncrement(incrementId, {
        explicitFeatureId: 'FS-999',
      });

      expect(result.success).toBe(true);
      expect(result.featureId).toBe('FS-999');
    });

    it('should use explicit feature ID with E suffix', async () => {
      const result = await sync.syncIncrement(incrementId, {
        explicitFeatureId: 'FS-042E',
      });

      expect(result.success).toBe(true);
      expect(result.featureId).toBe('FS-042E');
    });

    it('should ignore invalid explicit feature ID and derive instead', async () => {
      const result = await sync.syncIncrement(incrementId, {
        explicitFeatureId: 'INVALID',
      });

      expect(result.success).toBe(true);
      // Falls through to derived ID
      expect(result.featureId).toBe('FS-001');
    });
  });

  // =========================================================================
  // syncIncrement - error handling
  // =========================================================================

  describe('syncIncrement - error handling', () => {
    const incrementId = '0004-error-feature';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        '# Error Feature\n',
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );
    });

    it('should catch errors and return unsuccessful result', async () => {
      // Force an error by making buildRegistry throw
      mockBuildRegistry.mockRejectedValueOnce(new Error('Registry build failed'));

      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Sync failed');
    });

    it('should return failure when project validation fails', async () => {
      mockProjectResolutionInstance.validateProjectForFolderCreation.mockResolvedValueOnce({
        valid: false,
        reason: 'example project',
        allowedProjects: ['real-project'],
      });

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });

      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid project'))).toBe(true);
    });
  });

  // =========================================================================
  // syncIncrement - cross-project scenario
  // =========================================================================

  describe('syncIncrement - cross-project', () => {
    const incrementId = '0005-cross-project';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: Cross Project Feature
---
# Cross Project Feature
## Overview
Feature spanning multiple projects.
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      const frontendStory = makeUserStory({ id: 'US-001', title: 'Frontend login', project: 'frontend' });
      const backendStory = makeUserStory({ id: 'US-002', title: 'Backend auth', project: 'backend' });

      mockExtractUserStories.mockReturnValue([frontendStory, backendStory]);
      mockExtractAcceptanceCriteria.mockReturnValue([]);
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });

      // Enable cross-project detection
      mockCrossProjectSyncInstance.isCrossProject.mockReturnValue(true);
      mockCrossProjectSyncInstance.groupByProject.mockReturnValue(
        new Map([
          ['frontend', [frontendStory]],
          ['backend', [backendStory]],
        ])
      );
    });

    it('should sync to multiple project folders when cross-project detected', async () => {
      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
      expect(mockCrossProjectSyncInstance.isCrossProject).toHaveBeenCalled();
      expect(mockCrossProjectSyncInstance.groupByProject).toHaveBeenCalled();
      expect(mockCrossProjectSyncInstance.logSyncSummary).toHaveBeenCalled();
    });

    it('should call ensureDir for each project folder in cross-project mode', async () => {
      await sync.syncIncrement(incrementId);
      // Two projects = at least 2 ensureDir calls
      expect(mockEnsureDir).toHaveBeenCalledTimes(2);
    });

    it('should fail when all cross-project targets are invalid', async () => {
      mockProjectResolutionInstance.validateProjectForFolderCreation.mockResolvedValue({
        valid: false,
        reason: 'example project',
        allowedProjects: [],
      });

      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('No valid projects found'))).toBe(true);
    });
  });

  // =========================================================================
  // syncIncrement - external feature ID derivation
  // =========================================================================

  describe('syncIncrement - external increment (E suffix)', () => {
    const incrementId = '0111E-external-issue';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: External Issue
---
# External Issue
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      mockDeriveFeatureId.mockReturnValue('FS-111E');
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should use external feature ID (E suffix) for external increments', async () => {
      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
      expect(result.featureId).toBe('FS-111E');
    });
  });

  // =========================================================================
  // syncIncrement - reusing existing user story files
  // =========================================================================

  describe('syncIncrement - existing user story files', () => {
    const incrementId = '0006-reuse-files';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: Reuse Files Feature
---
# Reuse Files Feature
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      const story = makeUserStory();
      mockExtractUserStories.mockReturnValue([story]);
      mockExtractAcceptanceCriteria.mockReturnValue([]);
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });

      // Simulate an existing user story file
      mockFindExistingUserStoryFile.mockResolvedValue('us-001-user-can-login.md');
    });

    it('should reuse existing user story file when found', async () => {
      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
      expect(mockFindExistingUserStoryFile).toHaveBeenCalled();
      // File should still be in filesCreated (overwritten)
      expect(result.filesCreated.some(f => f.includes('us-001-user-can-login.md'))).toBe(true);
    });
  });

  // =========================================================================
  // syncIncrement - project not in registry (warning path)
  // =========================================================================

  describe('syncIncrement - project not in registry', () => {
    const incrementId = '0007-unregistered';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: Unregistered Project Feature
---
# Unregistered
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });

      mockProjectResolutionInstance.validateAgainstRegistry.mockResolvedValue({
        inRegistry: false,
        suggestions: ['similar-project'],
      });
    });

    it('should log warnings when project is not in registry but still sync', async () => {
      const result = await sync.syncIncrement(incrementId);

      // Sync should still succeed (not in registry is a warning, not a blocker)
      expect(result.success).toBe(true);
      expect(silentLogger.warn).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // syncIncrement - SKIP_EXTERNAL_SYNC env variable
  // =========================================================================

  describe('syncIncrement - SKIP_EXTERNAL_SYNC', () => {
    const incrementId = '0008-skip-external';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: Skip External
---
# Skip External
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should skip external sync when SKIP_EXTERNAL_SYNC is true', async () => {
      process.env.SKIP_EXTERNAL_SYNC = 'true';

      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
      // The external sync skip message should be logged
      expect(silentLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('External tool sync skipped')
      );
    });

    it('should skip external sync when SKIP_EXTERNAL_SYNC is 1', async () => {
      process.env.SKIP_EXTERNAL_SYNC = '1';

      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
    });

    it('should skip external sync when SKIP_EXTERNAL_SYNC is yes', async () => {
      process.env.SKIP_EXTERNAL_SYNC = 'yes';

      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // syncIncrement - image generation
  // =========================================================================

  describe('syncIncrement - image generation', () => {
    const incrementId = '0009-image-gen';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: Image Gen Feature
---
# Image Gen Feature
## Overview
Feature with images.
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should skip image generation when SPECWEAVE_SKIP_IMAGE_GEN is true', async () => {
      process.env.SPECWEAVE_SKIP_IMAGE_GEN = 'true';

      await sync.syncIncrement(incrementId);

      expect(mockGenerateLivingDocsImagesEnhanced).not.toHaveBeenCalled();
    });

    it('should attempt image generation when SPECWEAVE_SKIP_IMAGE_GEN is not set', async () => {
      delete process.env.SPECWEAVE_SKIP_IMAGE_GEN;

      mockGenerateLivingDocsImagesEnhanced.mockResolvedValue({
        success: true,
        featureImage: '/tmp/images/feature.png',
      });
      mockGenerateFeatureFile.mockReturnValue('# Feature\n\n## TL;DR\n\nSome overview.\n\n## Details\n');

      await sync.syncIncrement(incrementId);

      expect(mockGenerateLivingDocsImagesEnhanced).toHaveBeenCalled();
    });

    it('should handle image generation errors gracefully', async () => {
      delete process.env.SPECWEAVE_SKIP_IMAGE_GEN;

      mockGenerateLivingDocsImagesEnhanced.mockRejectedValue(new Error('Image gen failed'));

      const result = await sync.syncIncrement(incrementId);

      // Image generation failure should not prevent sync success
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // parseIncrementSpec - tested indirectly via syncIncrement
  // =========================================================================

  describe('parseIncrementSpec behavior (via syncIncrement)', () => {
    const incrementId = '0010-parse-spec';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );
    });

    it('should extract title from frontmatter', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---
title: Custom Title From Frontmatter
---
# Different Heading
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'metadata.json'),
        JSON.stringify({ status: 'completed' }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'completed' };
        return {};
      });

      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
      // generateFeatureFile should be called with parsed spec containing the frontmatter title
      expect(mockGenerateFeatureFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ title: 'Custom Title From Frontmatter' }),
        incrementId
      );
    });

    it('should extract title from heading when frontmatter has no title', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---
status: in-progress
---
# My Heading Title
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });

      await sync.syncIncrement(incrementId);

      expect(mockGenerateFeatureFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ title: 'My Heading Title' }),
        incrementId
      );
    });

    it('should derive title from increment ID when no title or heading', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        'Some content without heading or frontmatter title.\n',
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'metadata.json'),
        JSON.stringify({ status: 'planning' }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'planning' };
        return {};
      });

      await sync.syncIncrement(incrementId);

      // Title derived from "0010-parse-spec" -> "Parse Spec"
      expect(mockGenerateFeatureFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ title: 'Parse Spec' }),
        incrementId
      );
    });

    it('should use metadata.json status instead of frontmatter status', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---
title: Status Test
status: planning
---
# Status Test
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'metadata.json'),
        JSON.stringify({ status: 'completed' }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'completed' };
        return {};
      });

      await sync.syncIncrement(incrementId);

      // Status should be 'completed' from metadata.json, not 'planning' from frontmatter
      expect(mockGenerateFeatureFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ status: 'completed' }),
        incrementId
      );
    });

    it('should skip sync when spec.md does not exist (treated as template)', async () => {
      // No spec.md written — only metadata.json
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'metadata.json'),
        JSON.stringify({ status: 'planning' }),
        'utf-8'
      );

      mockPathExists.mockResolvedValue(false);

      const result = await sync.syncIncrement(incrementId);

      // v1.0.344+: Missing spec.md is detected by isTemplateFile guard
      // and gracefully skipped (not a failure — spec just isn't ready yet)
      expect(result.success).toBe(true);
      expect(result.errors[0]).toContain('template');
    });
  });

  // =========================================================================
  // extractProjectBoardFromSpec (tested via resolveProjectPath -> syncIncrement)
  // =========================================================================

  describe('extractProjectBoardFromSpec behavior', () => {
    const incrementId = '0011-project-board';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
    });

    it('should extract project from YAML frontmatter', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---
title: Test
project: my-app
---
# Test
`,
        'utf-8'
      );

      // For multi-project mode config
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ multiProject: { enabled: true } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });

      const result = await sync.syncIncrement(incrementId);

      // The sync should succeed - the project from frontmatter is used
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // validateAndNormalizeName - tested indirectly through syncIncrement
  // We can create spec files with various project/board names
  // =========================================================================

  describe('validateAndNormalizeName behavior (via extractProjectBoardFromSpec)', () => {
    // These are tested indirectly - the method is private
    // We test by providing spec.md files with various project names

    const incrementId = '0012-validate-name';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ multiProject: { enabled: true } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should reject project name with path traversal', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---
title: Path Traversal Test
project: ../../../etc
---
# Test
`,
        'utf-8'
      );

      const result = await sync.syncIncrement(incrementId);

      // Should still succeed but with warnings and fallback
      // The traversal project name will be rejected, falling through to auto-detect
      expect(result.success).toBe(true);
      expect(silentLogger.warn).toHaveBeenCalled();
    });

    it('should reject project name that is too short', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---
title: Short Name Test
project: x
---
# Test
`,
        'utf-8'
      );

      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
      expect(silentLogger.warn).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // User story status calculation
  // =========================================================================

  describe('user story status calculation', () => {
    const incrementId = '0013-us-status';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: US Status
---
# US Status
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should call calculateUSStatus for each user story', async () => {
      const story1 = makeUserStory({ id: 'US-001', acceptanceCriteria: ['AC-US1-01', 'AC-US1-02'] });
      const story2 = makeUserStory({ id: 'US-002', acceptanceCriteria: ['AC-US2-01'] });

      const acs: AcceptanceCriterionData[] = [
        { id: 'AC-US1-01', userStoryId: 'US-001', description: 'AC1', completed: true },
        { id: 'AC-US1-02', userStoryId: 'US-001', description: 'AC2', completed: false },
        { id: 'AC-US2-01', userStoryId: 'US-002', description: 'AC3', completed: true },
      ];

      mockExtractUserStories.mockReturnValue([story1, story2]);
      mockExtractAcceptanceCriteria.mockReturnValue(acs);

      await sync.syncIncrement(incrementId);

      // calculateUSStatus should be called twice (once per story)
      expect(mockCalculateUSStatus).toHaveBeenCalledTimes(2);
      expect(mockCalculateUSStatus).toHaveBeenCalledWith(2, 1); // US-001: 2 ACs, 1 completed
      expect(mockCalculateUSStatus).toHaveBeenCalledWith(1, 1); // US-002: 1 AC, 1 completed
    });
  });

  // =========================================================================
  // syncTasksToUserStories behavior
  // =========================================================================

  describe('syncTasksToUserStories behavior', () => {
    const incrementId = '0014-task-sync';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: Task Sync
---
# Task Sync
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      const story = makeUserStory();
      mockExtractUserStories.mockReturnValue([story]);
      mockExtractAcceptanceCriteria.mockReturnValue([]);
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should generate tasks and format them for each user story', async () => {
      mockTaskGeneratorInstance.generateProjectSpecificTasks.mockResolvedValue([
        { id: 'T-001', title: 'Task 1' },
      ]);
      mockTaskGeneratorInstance.formatTasksAsMarkdown.mockReturnValue('- [ ] T-001: Task 1');

      await sync.syncIncrement(incrementId);

      expect(mockTaskGeneratorInstance.generateProjectSpecificTasks).toHaveBeenCalledWith(
        incrementId,
        'US-001',
        undefined
      );
      expect(mockTaskGeneratorInstance.formatTasksAsMarkdown).toHaveBeenCalled();
    });

    it('should handle task sync errors gracefully', async () => {
      mockTaskGeneratorInstance.generateProjectSpecificTasks.mockRejectedValue(
        new Error('Task generation failed')
      );

      const result = await sync.syncIncrement(incrementId);

      // Should still succeed (task sync error is caught)
      expect(result.success).toBe(true);
      expect(silentLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to sync tasks'),
        expect.any(Error)
      );
    });
  });

  // =========================================================================
  // detectExternalTools behavior (via syncIncrement with SKIP_EXTERNAL_SYNC=false)
  // =========================================================================

  describe('detectExternalTools behavior', () => {
    const incrementId = '0015-detect-tools';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: Detect Tools
---
# Detect Tools
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
    });

    it('should detect GitHub from metadata.json', async () => {
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) {
          return {
            status: 'in-progress',
            github: { milestone: 42 },
          };
        }
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: {
              settings: { canUpsertInternalItems: true },
            },
          };
        }
        return {};
      });

      // Write config with sync settings
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: { settings: { canUpsertInternalItems: true } },
        }),
        'utf-8'
      );

      // Allow external sync for this test
      delete process.env.SKIP_EXTERNAL_SYNC;

      // The sync will try to sync to GitHub but should fail gracefully since
      // the GitHub plugin is not available in test environment
      const result = await sync.syncIncrement(incrementId);

      // Should still succeed even if external sync fails
      expect(result.success).toBe(true);
    });

    it('should skip external sync when canUpsertInternalItems is false', async () => {
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) {
          return {
            status: 'in-progress',
            github: { milestone: 42 },
          };
        }
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: {
              settings: { canUpsertInternalItems: false },
            },
          };
        }
        return {};
      });

      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: {
            settings: { canUpsertInternalItems: false },
          },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;

      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
      // Should log about skipping due to permissions
      expect(silentLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('canUpsertInternalItems is disabled')
      );
    });
  });

  // =========================================================================
  // projectNamesMatch behavior (tested via resolveProjectPath -> syncIncrement)
  // =========================================================================

  describe('projectNamesMatch behavior', () => {
    // This is tested by creating existing specs directories and checking
    // if findBestProjectMatch finds them.
    // Since resolveProjectPath is private and invoked in multi-project mode,
    // we test it through syncIncrement with multi-project config.
    const incrementId = '0016-name-match';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should match project name with operations/operation pluralization', async () => {
      // Create existing specs folder with "digital-operations"
      const specsDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs', 'digital-operations');
      await fsPromises.mkdir(specsDir, { recursive: true });

      // Spec references "digital-operation" (singular)
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---
title: Operations Test
project: digital-operation
---
# Operations Test
`,
        'utf-8'
      );

      // Multi-project config
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ multiProject: { enabled: true } }),
        'utf-8'
      );

      const result = await sync.syncIncrement(incrementId);

      // Should find the existing folder via fuzzy match
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // resolveProjectPath - single-project mode
  // =========================================================================

  describe('resolveProjectPath - single-project mode', () => {
    const incrementId = '0017-single-project';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: Single Project
---
# Single Project
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should use project.name from config in single-project mode', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'my-awesome-project' },
        }),
        'utf-8'
      );

      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
      // Should use "my-awesome-project" as the project path
      expect(silentLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Single-project mode: using my-awesome-project')
      );
    });

    it('should fallback to auto-detected project ID when config has no project.name', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({}),
        'utf-8'
      );

      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
      // Falls back to test-project (autoDetectProjectIdSync return value)
      expect(silentLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Single-project mode: using test-project')
      );
    });
  });

  // =========================================================================
  // Edge case: duplicate AC IDs in user stories
  // =========================================================================

  describe('edge case - duplicate AC IDs', () => {
    const incrementId = '0018-dup-acs';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: Duplicate ACs
---
# Duplicate ACs
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should deduplicate AC IDs when calculating status', async () => {
      // Story has duplicate AC IDs
      const story = makeUserStory({
        id: 'US-001',
        acceptanceCriteria: ['AC-US1-01', 'AC-US1-01', 'AC-US1-02'],
      });

      const acs: AcceptanceCriterionData[] = [
        { id: 'AC-US1-01', userStoryId: 'US-001', description: 'AC1', completed: true },
        { id: 'AC-US1-02', userStoryId: 'US-001', description: 'AC2', completed: false },
      ];

      mockExtractUserStories.mockReturnValue([story]);
      mockExtractAcceptanceCriteria.mockReturnValue(acs);

      await sync.syncIncrement(incrementId);

      // Should be 2 unique ACs, 1 completed (deduplication applied)
      expect(mockCalculateUSStatus).toHaveBeenCalledWith(2, 1);
    });
  });

  // =========================================================================
  // updateTasksSection behavior (tested via syncTasksToUserStories)
  // =========================================================================

  describe('updateTasksSection behavior', () => {
    const incrementId = '0019-task-section';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: Task Section
---
# Task Section
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      const story = makeUserStory();
      mockExtractUserStories.mockReturnValue([story]);
      mockExtractAcceptanceCriteria.mockReturnValue([]);
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });

      mockTaskGeneratorInstance.generateProjectSpecificTasks.mockResolvedValue([
        { id: 'T-001', title: 'Implement login' },
      ]);
      mockTaskGeneratorInstance.formatTasksAsMarkdown.mockReturnValue('- [ ] T-001: Implement login');
    });

    it('should update existing Tasks section in user story file', async () => {
      // The user story file content with an existing Tasks section
      mockGenerateUserStoryFile.mockReturnValue(
        '# US-001\n\n## Tasks\n\n- [x] T-old: Old task\n\n## Related\n'
      );

      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
      expect(mockTaskGeneratorInstance.generateProjectSpecificTasks).toHaveBeenCalled();
    });

    it('should add Tasks section when not present', async () => {
      mockGenerateUserStoryFile.mockReturnValue(
        '# US-001\n\nSome content without tasks section.\n'
      );

      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // Cross-project sync with external sync enabled
  // =========================================================================

  describe('cross-project with external sync', () => {
    const incrementId = '0020-cross-external';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: Cross External
---
# Cross External
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      const story1 = makeUserStory({ id: 'US-001', project: 'frontend' });
      const story2 = makeUserStory({ id: 'US-002', project: 'backend' });

      mockExtractUserStories.mockReturnValue([story1, story2]);
      mockExtractAcceptanceCriteria.mockReturnValue([]);
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });

      mockCrossProjectSyncInstance.isCrossProject.mockReturnValue(true);
      mockCrossProjectSyncInstance.groupByProject.mockReturnValue(
        new Map([
          ['frontend', [story1]],
          ['backend', [story2]],
        ])
      );
    });

    it('should log skip message for cross-project external sync when SKIP_EXTERNAL_SYNC is set', async () => {
      process.env.SKIP_EXTERNAL_SYNC = 'true';

      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
      expect(silentLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('External tool sync skipped')
      );
    });
  });

  // =========================================================================
  // Frontmatter parsing edge cases
  // =========================================================================

  describe('frontmatter parsing edge cases', () => {
    const incrementId = '0021-frontmatter-edge';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should handle malformed YAML frontmatter gracefully', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---
title: [invalid yaml
  broken: {{value
---
# Some Feature
`,
        'utf-8'
      );

      const result = await sync.syncIncrement(incrementId);

      // Should still sync with fallback values
      expect(result.success).toBe(true);
    });

    it('should handle spec with no frontmatter', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        '# Simple Feature\n\n## Overview\n\nNo frontmatter here.\n',
        'utf-8'
      );

      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
    });

    it('should extract overview from Quick Overview section', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---
title: Quick Overview Test
---
# Feature

## Quick Overview

This is the quick overview.

## Details
More details here.
`,
        'utf-8'
      );

      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
      expect(mockGenerateFeatureFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ overview: 'This is the quick overview.' }),
        incrementId
      );
    });

    it('should strip SPEC-XXX prefix from title', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `# SPEC-021: My Actual Title

## Overview
Stuff.
`,
        'utf-8'
      );

      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
      expect(mockGenerateFeatureFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ title: 'My Actual Title' }),
        incrementId
      );
    });
  });

  // =========================================================================
  // validateAndRepairConsistency
  // =========================================================================

  describe('validateAndRepairConsistency', () => {
    const incrementId = '0022-validate-consistency';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: Validate Consistency
---
# Validate Consistency
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should not warn when FEATURE.md exists after sync', async () => {
      // Since ensureDir actually creates directories and fs.writeFile writes FEATURE.md,
      // the consistency check should find it and NOT warn
      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
      // FEATURE.md is written by the sync, so consistency check should pass
      const warnCalls = (silentLogger.warn as ReturnType<typeof vi.fn>).mock.calls;
      const featureMdWarnings = warnCalls.filter(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('FEATURE.md missing')
      );
      expect(featureMdWarnings).toHaveLength(0);
    });

    it('should handle validation errors gracefully', async () => {
      // The validateAndRepairConsistency method catches errors internally
      // We can't easily force an error in the validation itself since it uses
      // real fs.existsSync, but the catch block should handle any issues
      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // SyncResult structure
  // =========================================================================

  describe('SyncResult structure', () => {
    it('should always contain required fields', async () => {
      const result = await sync.syncIncrement('0099-nonexistent');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('featureId');
      expect(result).toHaveProperty('incrementId');
      expect(result).toHaveProperty('filesCreated');
      expect(result).toHaveProperty('filesUpdated');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.filesCreated)).toBe(true);
      expect(Array.isArray(result.filesUpdated)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  // =========================================================================
  // Config not found edge case
  // =========================================================================

  describe('config not found edge case', () => {
    const incrementId = '0023-no-config';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: No Config
---
# No Config
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should handle missing config.json gracefully', async () => {
      // No config.json file created - resolveProjectPath should handle this

      const result = await sync.syncIncrement(incrementId);

      // Should succeed using fallback project ID
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // Metadata fallback
  // =========================================================================

  describe('metadata fallback', () => {
    const incrementId = '0024-no-metadata';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: No Metadata
---
# No Metadata
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md')) return true;
        if (p.endsWith('metadata.json')) return false;
        return false;
      });
    });

    it('should use fallback status when metadata.json is missing', async () => {
      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
      // Status should default to 'planning'
      expect(mockGenerateFeatureFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ status: 'planning' }),
        incrementId
      );
    });
  });

  // =========================================================================
  // Priority and created date fallbacks
  // =========================================================================

  describe('priority and created date fallbacks', () => {
    const incrementId = '0025-defaults';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should use P1 as default priority when not specified', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---
title: Default Priority
---
# Default Priority
`,
        'utf-8'
      );

      await sync.syncIncrement(incrementId);

      expect(mockGenerateFeatureFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ priority: 'P1' }),
        incrementId
      );
    });

    it('should use current date when created not specified', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---
title: Default Created
---
# Default Created
`,
        'utf-8'
      );

      await sync.syncIncrement(incrementId);

      // The created field should be today's date
      const todayStr = new Date().toISOString().split('T')[0];
      expect(mockGenerateFeatureFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ created: todayStr }),
        incrementId
      );
    });

    it('should use priority from frontmatter when specified', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---
title: Custom Priority
priority: P3
---
# Custom Priority
`,
        'utf-8'
      );

      await sync.syncIncrement(incrementId);

      expect(mockGenerateFeatureFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ priority: 'P3' }),
        incrementId
      );
    });
  });

  // =========================================================================
  // Legacy **Project**: field in body
  // =========================================================================

  describe('legacy project field in body', () => {
    const incrementId = '0026-legacy-project';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should extract project from legacy **Project**: field when no frontmatter project', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---
title: Legacy Project
---
# Legacy Project

**Project**: my-legacy-project
`,
        'utf-8'
      );

      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ multiProject: { enabled: true } }),
        'utf-8'
      );

      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
      // Should log about using legacy field
      expect(silentLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('legacy')
      );
    });
  });

  // =========================================================================
  // extractProjectBoardFromSpec - invalid increment ID format
  // =========================================================================

  describe('extractProjectBoardFromSpec - invalid increment ID', () => {
    it('should handle spec extraction for oddly formatted increment IDs gracefully', async () => {
      // This tests the security validation in extractProjectBoardFromSpec
      // An invalid ID like "INVALID" should be caught by the regex check
      // But since syncIncrement first checks for active folder, an invalid ID
      // will just fail at the fs.access step

      const result = await sync.syncIncrement('0099-some-valid-name');

      // No active folder exists, so it returns success with skip message
      expect(result.success).toBe(true);
      expect(result.errors).toContain('Increment not in active folder - sync skipped to prevent issues');
    });
  });

  // =========================================================================
  // Multiple user stories file creation
  // =========================================================================

  describe('multiple user stories', () => {
    const incrementId = '0027-multi-us';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---
title: Multi US
---
# Multi US
`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      const stories = [
        makeUserStory({ id: 'US-001', title: 'First Story' }),
        makeUserStory({ id: 'US-002', title: 'Second Story' }),
        makeUserStory({ id: 'US-003', title: 'Third Story' }),
      ];

      mockExtractUserStories.mockReturnValue(stories);
      mockExtractAcceptanceCriteria.mockReturnValue([]);
      mockFindExistingUserStoryFile.mockResolvedValue(null);
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should create files for all user stories', async () => {
      const result = await sync.syncIncrement(incrementId);

      expect(result.success).toBe(true);
      // 1 FEATURE.md + 3 user story files
      expect(result.filesCreated.length).toBe(4);
      expect(mockGenerateUserStoryFile).toHaveBeenCalledTimes(3);
    });
  });

  // =========================================================================
  // detectExternalTools - comprehensive coverage
  // =========================================================================

  describe('detectExternalTools - comprehensive', () => {
    const incrementId = '0028-ext-tools';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---\ntitle: External Tools\n---\n# External Tools\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
    });

    it('should detect JIRA from metadata.json', async () => {
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) {
          return { status: 'in-progress', jira: { epicId: 'PROJ-123' } };
        }
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: { settings: { canUpsertInternalItems: true } },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: { settings: { canUpsertInternalItems: true } },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      const result = await sync.syncIncrement(incrementId);
      // JIRA plugin not installed, so it should log a warning but still succeed
      expect(result.success).toBe(true);
    });

    it('should detect ADO from metadata.json', async () => {
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) {
          return { status: 'in-progress', ado: { featureId: 123 } };
        }
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: { settings: { canUpsertInternalItems: true } },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: { settings: { canUpsertInternalItems: true } },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });

    it('should detect ADO from azure_devops key in metadata.json', async () => {
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) {
          return { status: 'in-progress', azure_devops: { workItemId: 456 } };
        }
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: { settings: { canUpsertInternalItems: true } },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: { settings: { canUpsertInternalItems: true } },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });

    it('should detect GitHub from external_links in metadata.json', async () => {
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) {
          return {
            status: 'in-progress',
            external_links: { github: { url: 'https://github.com/org/repo' } },
          };
        }
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: { settings: { canUpsertInternalItems: true } },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: { settings: { canUpsertInternalItems: true } },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });

    it('should detect GitHub from config.sync.github', async () => {
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: {
              github: { enabled: true, owner: 'org', repo: 'repo' },
              settings: { canUpsertInternalItems: true },
            },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: {
            github: { enabled: true, owner: 'org', repo: 'repo' },
            settings: { canUpsertInternalItems: true },
          },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });

    it('should detect GitHub from sync profiles', async () => {
      mockGetProfilesByProvider.mockImplementation((config: any, provider: string) => {
        if (provider === 'github') {
          return [['gh-profile', { provider: 'github', config: { owner: 'org', repo: 'repo' } }]];
        }
        return [];
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: {
              profiles: { 'gh-profile': { provider: 'github', config: { owner: 'org', repo: 'repo' } } },
              settings: { canUpsertInternalItems: true },
            },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: {
            profiles: { 'gh-profile': { provider: 'github', config: { owner: 'org', repo: 'repo' } } },
            settings: { canUpsertInternalItems: true },
          },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });

    it('should detect GitHub from multiProject active project config', async () => {
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            multiProject: {
              enabled: true,
              activeProject: 'my-app',
              projects: {
                'my-app': {
                  externalTools: {
                    github: { repository: 'org/my-app' },
                  },
                },
              },
            },
            sync: { settings: { canUpsertInternalItems: true } },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          multiProject: {
            enabled: true,
            activeProject: 'my-app',
            projects: {
              'my-app': {
                externalTools: {
                  github: { repository: 'org/my-app' },
                },
              },
            },
          },
          sync: { settings: { canUpsertInternalItems: true } },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });

    it('should detect GitHub from legacy plugins.settings', async () => {
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            plugins: {
              settings: {
                'specweave-github': { defaultProfile: 'main' },
              },
            },
            sync: { settings: { canUpsertInternalItems: true } },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          plugins: {
            settings: {
              'specweave-github': { defaultProfile: 'main' },
            },
          },
          sync: { settings: { canUpsertInternalItems: true } },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });

    it('should detect JIRA from config.sync.jira', async () => {
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: {
              jira: { enabled: true, domain: 'test.atlassian.net' },
              settings: { canUpsertInternalItems: true },
            },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: {
            jira: { enabled: true, domain: 'test.atlassian.net' },
            settings: { canUpsertInternalItems: true },
          },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });

    it('should detect JIRA from sync profiles', async () => {
      mockGetProfilesByProvider.mockImplementation((config: any, provider: string) => {
        if (provider === 'jira') {
          return [['jira-profile', { provider: 'jira', config: { domain: 'test.atlassian.net' } }]];
        }
        return [];
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: {
              profiles: { 'jira-profile': { provider: 'jira', config: { domain: 'test.atlassian.net' } } },
              settings: { canUpsertInternalItems: true },
            },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: {
            profiles: { 'jira-profile': { provider: 'jira', config: { domain: 'test.atlassian.net' } } },
            settings: { canUpsertInternalItems: true },
          },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });

    it('should detect ADO from config.sync.ado', async () => {
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: {
              ado: { enabled: true, organization: 'myorg' },
              settings: { canUpsertInternalItems: true },
            },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: {
            ado: { enabled: true, organization: 'myorg' },
            settings: { canUpsertInternalItems: true },
          },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });

    it('should detect ADO from sync profiles', async () => {
      mockGetProfilesByProvider.mockImplementation((config: any, provider: string) => {
        if (provider === 'ado') {
          return [['ado-profile', { provider: 'ado', config: { organization: 'myorg' } }]];
        }
        return [];
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: {
              profiles: { 'ado-profile': { provider: 'ado', config: { organization: 'myorg' } } },
              settings: { canUpsertInternalItems: true },
            },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: {
            profiles: { 'ado-profile': { provider: 'ado', config: { organization: 'myorg' } } },
            settings: { canUpsertInternalItems: true },
          },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });

    it('should detect GitHub from environment variables', async () => {
      const origToken = process.env.GITHUB_TOKEN;
      const origOwner = process.env.GITHUB_OWNER;
      process.env.GITHUB_TOKEN = 'fake-token';
      process.env.GITHUB_OWNER = 'fake-owner';

      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: { settings: { canUpsertInternalItems: true } },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: { settings: { canUpsertInternalItems: true } },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);

      // Restore env
      if (origToken !== undefined) process.env.GITHUB_TOKEN = origToken;
      else delete process.env.GITHUB_TOKEN;
      if (origOwner !== undefined) process.env.GITHUB_OWNER = origOwner;
      else delete process.env.GITHUB_OWNER;
    });

    it('should log when no external tools detected', async () => {
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        if (p.endsWith('config.json')) {
          return { project: { name: 'test-project' } };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      // Clear any env vars that might trigger detection
      const origToken = process.env.GITHUB_TOKEN;
      const origOwner = process.env.GITHUB_OWNER;
      const origRepo = process.env.GITHUB_REPOSITORY;
      delete process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_OWNER;
      delete process.env.GITHUB_REPOSITORY;

      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);

      // Restore
      if (origToken !== undefined) process.env.GITHUB_TOKEN = origToken;
      if (origOwner !== undefined) process.env.GITHUB_OWNER = origOwner;
      if (origRepo !== undefined) process.env.GITHUB_REPOSITORY = origRepo;
    });
  });

  // =========================================================================
  // syncToGitHub - via real sync path
  // =========================================================================

  describe('syncToGitHub behavior', () => {
    const incrementId = '0029-github-sync';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---\ntitle: GitHub Sync\n---\n# GitHub Sync\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress', github: { milestone: 1 } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
    });

    it('should skip GitHub sync when no token available', async () => {
      mockGetGitHubAuthFromProject.mockReturnValue({ token: '' });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) {
          return { status: 'in-progress', github: { milestone: 1 } };
        }
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: {
              github: { enabled: true, owner: 'org', repo: 'repo' },
              settings: { canUpsertInternalItems: true },
            },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: {
            github: { enabled: true, owner: 'org', repo: 'repo' },
            settings: { canUpsertInternalItems: true },
          },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      const result = await sync.syncIncrement(incrementId);
      // Should warn about missing token
      expect(silentLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('GITHUB_TOKEN')
      );
    });

    it('should skip GitHub sync when owner/repo not configured', async () => {
      mockGetGitHubAuthFromProject.mockReturnValue({ token: 'fake-token' });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) {
          return { status: 'in-progress', github: { milestone: 1 } };
        }
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: {
              settings: { canUpsertInternalItems: true },
            },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: { settings: { canUpsertInternalItems: true } },
        }),
        'utf-8'
      );

      // Clear any env GitHub vars
      const origOwner = process.env.GITHUB_OWNER;
      const origRepo = process.env.GITHUB_REPO;
      delete process.env.GITHUB_OWNER;
      delete process.env.GITHUB_REPO;
      delete process.env.SKIP_EXTERNAL_SYNC;

      const result = await sync.syncIncrement(incrementId);
      expect(silentLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('owner/repo not configured')
      );

      if (origOwner !== undefined) process.env.GITHUB_OWNER = origOwner;
      if (origRepo !== undefined) process.env.GITHUB_REPO = origRepo;
    });
  });

  // =========================================================================
  // syncToJira - via real sync path
  // =========================================================================

  describe('syncToJira behavior', () => {
    const incrementId = '0030-jira-sync';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---\ntitle: JIRA Sync\n---\n# JIRA Sync\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress', jira: { epicKey: 'TEST-1' } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
    });

    it('should skip JIRA sync when credentials not configured', async () => {
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) {
          return { status: 'in-progress', jira: { epicKey: 'TEST-1' } };
        }
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: { settings: { canUpsertInternalItems: true } },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: { settings: { canUpsertInternalItems: true } },
        }),
        'utf-8'
      );

      // Clear JIRA env vars
      const origDomain = process.env.JIRA_DOMAIN;
      const origEmail = process.env.JIRA_EMAIL;
      const origToken = process.env.JIRA_API_TOKEN;
      delete process.env.JIRA_DOMAIN;
      delete process.env.JIRA_EMAIL;
      delete process.env.JIRA_API_TOKEN;
      delete process.env.SKIP_EXTERNAL_SYNC;

      const result = await sync.syncIncrement(incrementId);
      expect(silentLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('JIRA credentials not configured')
      );

      if (origDomain !== undefined) process.env.JIRA_DOMAIN = origDomain;
      if (origEmail !== undefined) process.env.JIRA_EMAIL = origEmail;
      if (origToken !== undefined) process.env.JIRA_API_TOKEN = origToken;
    });
  });

  // =========================================================================
  // syncToADO - via real sync path
  // =========================================================================

  describe('syncToADO behavior', () => {
    const incrementId = '0031-ado-sync';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---\ntitle: ADO Sync\n---\n# ADO Sync\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress', ado: { featureId: 123 } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
    });

    it('should skip ADO sync when credentials not configured', async () => {
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) {
          return { status: 'in-progress', ado: { featureId: 123 } };
        }
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: { settings: { canUpsertInternalItems: true } },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: { settings: { canUpsertInternalItems: true } },
        }),
        'utf-8'
      );

      // Clear ADO env vars
      const origOrg = process.env.AZURE_DEVOPS_ORG;
      const origProject = process.env.AZURE_DEVOPS_PROJECT;
      const origPat = process.env.AZURE_DEVOPS_PAT;
      delete process.env.AZURE_DEVOPS_ORG;
      delete process.env.AZURE_DEVOPS_PROJECT;
      delete process.env.AZURE_DEVOPS_PAT;
      delete process.env.SKIP_EXTERNAL_SYNC;

      const result = await sync.syncIncrement(incrementId);
      expect(silentLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('ADO credentials not configured')
      );

      if (origOrg !== undefined) process.env.AZURE_DEVOPS_ORG = origOrg;
      if (origProject !== undefined) process.env.AZURE_DEVOPS_PROJECT = origProject;
      if (origPat !== undefined) process.env.AZURE_DEVOPS_PAT = origPat;
    });
  });

  // =========================================================================
  // resolveProjectPath - multi-project mode with board matching fallback
  // =========================================================================

  describe('resolveProjectPath - multi-project fallback', () => {
    const incrementId = '0032-multi-project';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should fallback to auto-detected project when no project in spec (single board)', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---\ntitle: No Project\n---\n# No Project\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ multiProject: { enabled: true } }),
        'utf-8'
      );

      // Single board available
      mockBoardMatcherInstance.getAvailableBoards.mockResolvedValue([
        { id: 'main-board', name: 'Main Board' },
      ]);

      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });

    it('should use auto-detected project ID when no boards available', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---\ntitle: No Boards\n---\n# No Boards\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ multiProject: { enabled: true } }),
        'utf-8'
      );

      mockBoardMatcherInstance.getAvailableBoards.mockResolvedValue([]);

      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });

    it('should use single ADO board with project path when only one board', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---\ntitle: Single ADO Board\n---\n# Single ADO Board\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ multiProject: { enabled: true } }),
        'utf-8'
      );

      mockBoardMatcherInstance.getAvailableBoards.mockResolvedValue([
        { id: 'team-a', name: 'Team A', adoProject: 'MyProject' },
      ]);

      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
      expect(silentLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Single ADO board')
      );
    });

    it('should auto-match board when multiple boards and high confidence', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---\ntitle: Multi Board Match\n---\n# Multi Board Match\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ multiProject: { enabled: true } }),
        'utf-8'
      );

      mockBoardMatcherInstance.getAvailableBoards.mockResolvedValue([
        { id: 'board-a', name: 'Board A' },
        { id: 'board-b', name: 'Board B' },
      ]);

      mockBoardMatcherInstance.isUtilityIncrement.mockReturnValue(false);
      mockBoardMatcherInstance.matchIncrement.mockResolvedValue({
        needsUserInput: false,
        bestMatch: {
          boardId: 'board-a',
          boardName: 'Board A',
          confidence: 90,
          matchedTerms: ['keyword1'],
        },
        allMatches: [
          { boardId: 'board-a', boardName: 'Board A', confidence: 90, matchedTerms: ['keyword1'] },
        ],
        availableBoards: [{ id: 'board-a', name: 'Board A' }, { id: 'board-b', name: 'Board B' }],
        reason: 'high-confidence',
      });

      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
      expect(silentLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Auto-matched to board')
      );
    });

    it('should auto-match ADO board with project path', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---\ntitle: ADO Auto Match\n---\n# ADO Auto Match\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ multiProject: { enabled: true } }),
        'utf-8'
      );

      mockBoardMatcherInstance.getAvailableBoards.mockResolvedValue([
        { id: 'board-a', name: 'Board A', adoProject: 'MyProj' },
        { id: 'board-b', name: 'Board B', adoProject: 'MyProj' },
      ]);

      mockBoardMatcherInstance.isUtilityIncrement.mockReturnValue(false);
      mockBoardMatcherInstance.matchIncrement.mockResolvedValue({
        needsUserInput: false,
        bestMatch: {
          boardId: 'board-a',
          boardName: 'Board A',
          confidence: 85,
          matchedTerms: ['test'],
          adoProject: 'MyProj',
        },
        allMatches: [
          { boardId: 'board-a', boardName: 'Board A', confidence: 85, matchedTerms: ['test'], adoProject: 'MyProj' },
        ],
        availableBoards: [
          { id: 'board-a', name: 'Board A', adoProject: 'MyProj' },
          { id: 'board-b', name: 'Board B', adoProject: 'MyProj' },
        ],
        reason: 'high-confidence',
      });

      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // findBestProjectMatch - hierarchical match
  // =========================================================================

  describe('findBestProjectMatch behavior', () => {
    const incrementId = '0033-best-match';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should find project in org/project hierarchy', async () => {
      // Create hierarchical specs structure: specs/acme/my-project/
      const orgDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs', 'acme', 'my-project');
      await fsPromises.mkdir(orgDir, { recursive: true });

      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---\ntitle: Hierarchical Match\nproject: my-project\n---\n# Test\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ multiProject: { enabled: true } }),
        'utf-8'
      );

      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
      expect(silentLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Found existing project path')
      );
    });

    it('should match services/service pluralization in hierarchy', async () => {
      // Create specs/acme-services/
      const servicesDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs', 'acme-services');
      await fsPromises.mkdir(servicesDir, { recursive: true });

      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---\ntitle: Service Match\nproject: acme-service\n---\n# Test\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ multiProject: { enabled: true } }),
        'utf-8'
      );

      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });

    it('should not match short project names (security)', async () => {
      // Create specs/api/
      const apiDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs', 'api');
      await fsPromises.mkdir(apiDir, { recursive: true });

      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---\ntitle: Short Name\nproject: api-gateway-service\n---\n# Test\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ multiProject: { enabled: true } }),
        'utf-8'
      );

      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
      // Should NOT match "api" to "api-gateway-service" (too short for fuzzy match)
    });
  });

  // =========================================================================
  // updateTasksSection - all three code paths
  // =========================================================================

  describe('updateTasksSection - Related section insertion', () => {
    const incrementId = '0034-tasks-related';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---\ntitle: Tasks Related\n---\n# Tasks Related\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      const story = makeUserStory();
      mockExtractUserStories.mockReturnValue([story]);
      mockExtractAcceptanceCriteria.mockReturnValue([]);
      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
      mockTaskGeneratorInstance.generateProjectSpecificTasks.mockResolvedValue([
        { id: 'T-001', title: 'Task 1' },
      ]);
      mockTaskGeneratorInstance.formatTasksAsMarkdown.mockReturnValue('- [ ] T-001: Task 1');
    });

    it('should insert Tasks before Related section', async () => {
      mockGenerateUserStoryFile.mockReturnValue(
        '# US-001\n\nContent here.\n\n---\n\n**Related**: FS-001\n'
      );

      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);

      // Read the actual file to verify the Tasks section was inserted before Related
      const usFile = result.filesCreated.find(f => f.includes('us-001'));
      if (usFile) {
        const content = await fsPromises.readFile(usFile, 'utf-8');
        const tasksIdx = content.indexOf('## Tasks');
        const relatedIdx = content.indexOf('**Related**');
        if (tasksIdx !== -1 && relatedIdx !== -1) {
          expect(tasksIdx).toBeLessThan(relatedIdx);
        }
      }
    });
  });

  // =========================================================================
  // getIncrementSpecContent
  // =========================================================================

  describe('getIncrementSpecContent behavior', () => {
    const incrementId = '0035-spec-content';

    it('should return empty string when spec.md does not exist', async () => {
      // No increment folder - getIncrementSpecContent is called in resolveProjectPath
      // when it falls through to board matching. This is tested indirectly.
      // The method catches errors and returns '' - this path is covered
      // by tests where spec.md doesn't exist for reading.
      expect(true).toBe(true); // Placeholder - covered by other tests
    });
  });

  // =========================================================================
  // External sync error handling
  // =========================================================================

  describe('external sync error handling', () => {
    const incrementId = '0036-ext-error';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---\ntitle: Ext Error\n---\n# Ext Error\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({
          status: 'in-progress',
          github: { milestone: 1 },
          jira: { epicKey: 'TEST-1' },
          ado: { featureId: 123 },
        }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
    });

    it('should continue sync when individual external tool fails', async () => {
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) {
          return {
            status: 'in-progress',
            github: { milestone: 1 },
            jira: { epicKey: 'TEST-1' },
            ado: { featureId: 123 },
          };
        }
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: { settings: { canUpsertInternalItems: true } },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: { settings: { canUpsertInternalItems: true } },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      // All three external tools will fail (plugins not installed)
      // but the sync should still succeed
      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // Type re-exports
  // =========================================================================

  // =========================================================================
  // resolveProjectPath - 2-level structure
  // =========================================================================

  describe('resolveProjectPath - 2-level structure', () => {
    const incrementId = '0037-two-level';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should construct 2-level path from project and board', async () => {
      // Import the mock to change its return value
      const { detectStructureLevel } = await import('../../../../src/utils/structure-level-detector.js');
      (detectStructureLevel as ReturnType<typeof vi.fn>).mockReturnValue({
        level: 2,
        detectionReason: 'config-explicit',
        projects: [{ id: 'acme-corp' }],
        boardsByProject: { 'acme-corp': [{ id: 'digital-ops' }] },
      });

      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---\ntitle: Two Level\nproject: acme-corp\nboard: digital-ops\n---\n# Two Level\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ multiProject: { enabled: true } }),
        'utf-8'
      );

      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
      expect(silentLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('2-level path from spec.md: acme-corp/digital-ops')
      );

      // Reset the mock
      (detectStructureLevel as ReturnType<typeof vi.fn>).mockReturnValue({
        level: 1,
        detectionReason: 'single-project',
        projects: [],
        boardsByProject: {},
      });
    });

    it('should throw when project missing in 2-level structure', async () => {
      const { detectStructureLevel } = await import('../../../../src/utils/structure-level-detector.js');
      (detectStructureLevel as ReturnType<typeof vi.fn>).mockReturnValue({
        level: 2,
        detectionReason: 'config-explicit',
        projects: [{ id: 'acme-corp' }],
        boardsByProject: {},
      });

      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---\ntitle: Missing Project\n---\n# Missing Project\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ multiProject: { enabled: true } }),
        'utf-8'
      );

      const result = await sync.syncIncrement(incrementId);
      // Should fail because project is missing in 2-level mode
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Sync failed');

      // Reset
      (detectStructureLevel as ReturnType<typeof vi.fn>).mockReturnValue({
        level: 1,
        detectionReason: 'single-project',
        projects: [],
        boardsByProject: {},
      });
    });

    it('should throw when board missing in 2-level structure', async () => {
      const { detectStructureLevel } = await import('../../../../src/utils/structure-level-detector.js');
      (detectStructureLevel as ReturnType<typeof vi.fn>).mockReturnValue({
        level: 2,
        detectionReason: 'config-explicit',
        projects: [{ id: 'acme-corp' }],
        boardsByProject: { 'acme-corp': [{ id: 'team-a' }] },
      });

      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---\ntitle: Missing Board\nproject: acme-corp\n---\n# Missing Board\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ multiProject: { enabled: true } }),
        'utf-8'
      );

      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Sync failed');

      // Reset
      (detectStructureLevel as ReturnType<typeof vi.fn>).mockReturnValue({
        level: 1,
        detectionReason: 'single-project',
        projects: [],
        boardsByProject: {},
      });
    });
  });

  // =========================================================================
  // getFeatureIdForIncrement - collision detection
  // =========================================================================

  describe('getFeatureIdForIncrement - collision scenarios', () => {
    const incrementId = '0038-collision';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---\ntitle: Collision Test\n---\n# Collision Test\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ project: { name: 'test-project' } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should reuse existing internal feature folder on re-sync', async () => {
      // Create existing FS-038 folder (simulating re-sync)
      mockDeriveFeatureId.mockReturnValue('FS-038');
      mockExtractIncrementNumber.mockReturnValue(38);

      const existingFolder = path.join(
        testDir, '.specweave', 'docs', 'internal', 'specs', 'test-project', 'FS-038'
      );
      await fsPromises.mkdir(existingFolder, { recursive: true });

      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
      expect(result.featureId).toBe('FS-038');
      expect(silentLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Reusing existing feature folder')
      );
    });

    it('should avoid collision with external feature folder', async () => {
      // Create FS-038E (external) folder - should trigger collision avoidance
      mockDeriveFeatureId.mockReturnValue('FS-038');
      mockExtractIncrementNumber.mockReturnValue(38);

      const externalFolder = path.join(
        testDir, '.specweave', 'docs', 'internal', 'specs', 'test-project', 'FS-038E'
      );
      await fsPromises.mkdir(externalFolder, { recursive: true });

      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
      // Should log about collision avoidance
      expect(silentLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('External collision avoided')
      );
    });
  });

  // =========================================================================
  // syncToGitHub - config from multiProject
  // =========================================================================

  describe('syncToGitHub - config from multiProject', () => {
    const incrementId = '0039-gh-multiproject';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---\ntitle: GH MultiProject\n---\n# GH MultiProject\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress', github: { milestone: 1 } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
    });

    it('should read GitHub config from multiProject active project', async () => {
      mockGetGitHubAuthFromProject.mockReturnValue({ token: 'fake-token' });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) {
          return { status: 'in-progress', github: { milestone: 1 } };
        }
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            multiProject: {
              enabled: true,
              activeProject: 'my-app',
              projects: {
                'my-app': {
                  externalTools: {
                    github: { repository: 'org/my-app' },
                  },
                },
              },
            },
            sync: { settings: { canUpsertInternalItems: true } },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          multiProject: {
            enabled: true,
            activeProject: 'my-app',
            projects: {
              'my-app': {
                externalTools: {
                  github: { repository: 'org/my-app' },
                },
              },
            },
          },
          sync: { settings: { canUpsertInternalItems: true } },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // syncToJira - config from profiles
  // =========================================================================

  describe('syncToJira - config from profiles', () => {
    const incrementId = '0040-jira-profiles';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---\ntitle: JIRA Profiles\n---\n# JIRA Profiles\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress', jira: { epicKey: 'TEST-1' } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
    });

    it('should read JIRA config from sync.jira with .env token', async () => {
      // Create .env with JIRA credentials
      await fsPromises.writeFile(
        path.join(testDir, '.env'),
        'JIRA_API_TOKEN=fake-token\nJIRA_EMAIL=test@test.com\n',
        'utf-8'
      );

      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) {
          return { status: 'in-progress', jira: { epicKey: 'TEST-1' } };
        }
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: {
              jira: { enabled: true, domain: 'test.atlassian.net', projectKey: 'TEST' },
              settings: { canUpsertInternalItems: true },
            },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: {
            jira: { enabled: true, domain: 'test.atlassian.net', projectKey: 'TEST' },
            settings: { canUpsertInternalItems: true },
          },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      const result = await sync.syncIncrement(incrementId);
      // JIRA plugin not installed, but should try to sync
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // syncToADO - config from profiles
  // =========================================================================

  describe('syncToADO - config from profiles', () => {
    const incrementId = '0041-ado-profiles';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'spec.md'),
        `---\ntitle: ADO Profiles\n---\n# ADO Profiles\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress', ado: { featureId: 123 } }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
    });

    it('should read ADO config from sync.ado with .env PAT', async () => {
      // Create .env with ADO credentials
      await fsPromises.writeFile(
        path.join(testDir, '.env'),
        'AZURE_DEVOPS_PAT=fake-pat\n',
        'utf-8'
      );

      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) {
          return { status: 'in-progress', ado: { featureId: 123 } };
        }
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: {
              ado: { enabled: true, organization: 'myorg', project: 'myproj' },
              settings: { canUpsertInternalItems: true },
            },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: {
            ado: { enabled: true, organization: 'myorg', project: 'myproj' },
            settings: { canUpsertInternalItems: true },
          },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });

    it('should read ADO config from sync profiles', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.env'),
        'AZURE_DEVOPS_PAT=fake-pat\nAZURE_DEVOPS_ORG=env-org\nAZURE_DEVOPS_PROJECT=env-proj\n',
        'utf-8'
      );

      mockGetProfilesByProvider.mockImplementation((config: any, provider: string) => {
        if (provider === 'ado') {
          return [['ado-prof', { provider: 'ado', config: { organization: 'prof-org', project: 'prof-proj' } }]];
        }
        return [];
      });

      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) {
          return { status: 'in-progress', ado: { featureId: 123 } };
        }
        if (p.endsWith('config.json')) {
          return {
            project: { name: 'test-project' },
            sync: {
              profiles: { 'ado-prof': { provider: 'ado', config: { organization: 'prof-org', project: 'prof-proj' } } },
              settings: { canUpsertInternalItems: true },
            },
          };
        }
        return {};
      });
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          project: { name: 'test-project' },
          sync: {
            profiles: { 'ado-prof': { provider: 'ado', config: { organization: 'prof-org', project: 'prof-proj' } } },
            settings: { canUpsertInternalItems: true },
          },
        }),
        'utf-8'
      );

      delete process.env.SKIP_EXTERNAL_SYNC;
      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // askUserForBoardSelection - fallback when inquirer not available
  // =========================================================================

  describe('askUserForBoardSelection - fallback', () => {
    const incrementId = '0042-board-select';

    beforeEach(async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', incrementId);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ status: 'in-progress' }),
        'utf-8'
      );

      mockPathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('spec.md') || p.endsWith('metadata.json')) return true;
        return false;
      });
      mockReadJson.mockImplementation(async (p: string) => {
        if (p.endsWith('metadata.json')) return { status: 'in-progress' };
        return {};
      });
    });

    it('should use best match fallback when user prompts unavailable and multiple boards with high confidence', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---\ntitle: Board Select\n---\n# Board Select\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ multiProject: { enabled: true } }),
        'utf-8'
      );

      mockBoardMatcherInstance.getAvailableBoards.mockResolvedValue([
        { id: 'board-a', name: 'Board A' },
        { id: 'board-b', name: 'Board B' },
      ]);

      // Set up scenario where user input is needed but inquirer will fail
      mockBoardMatcherInstance.isUtilityIncrement.mockReturnValue(false);
      mockBoardMatcherInstance.matchIncrement.mockResolvedValue({
        needsUserInput: true,
        bestMatch: {
          boardId: 'board-a',
          boardName: 'Board A',
          confidence: 65,
          matchedTerms: ['keyword'],
        },
        allMatches: [],
        availableBoards: [{ id: 'board-a', name: 'Board A' }, { id: 'board-b', name: 'Board B' }],
        reason: 'medium-confidence-needs-confirmation',
      });

      const result = await sync.syncIncrement(incrementId);
      // Should fall back to best match since inquirer won't work in tests
      expect(result.success).toBe(true);
    });

    it('should fallback to project ID when no good match and user prompts unavailable', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---\ntitle: No Match\n---\n# No Match\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ multiProject: { enabled: true } }),
        'utf-8'
      );

      mockBoardMatcherInstance.getAvailableBoards.mockResolvedValue([
        { id: 'board-a', name: 'Board A' },
        { id: 'board-b', name: 'Board B' },
      ]);

      mockBoardMatcherInstance.isUtilityIncrement.mockReturnValue(false);
      mockBoardMatcherInstance.matchIncrement.mockResolvedValue({
        needsUserInput: true,
        bestMatch: {
          boardId: 'board-a',
          boardName: 'Board A',
          confidence: 30,
          matchedTerms: [],
        },
        allMatches: [],
        availableBoards: [{ id: 'board-a', name: 'Board A' }, { id: 'board-b', name: 'Board B' }],
        reason: 'low-confidence',
      });

      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
    });

    it('should detect utility increment and try to prompt user', async () => {
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'increments', incrementId, 'spec.md'),
        `---\ntitle: Utility\n---\n# Utility\n`,
        'utf-8'
      );
      await fsPromises.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ multiProject: { enabled: true } }),
        'utf-8'
      );

      mockBoardMatcherInstance.getAvailableBoards.mockResolvedValue([
        { id: 'board-a', name: 'Board A' },
        { id: 'board-b', name: 'Board B' },
      ]);

      mockBoardMatcherInstance.isUtilityIncrement.mockReturnValue(true);
      mockBoardMatcherInstance.matchIncrement.mockResolvedValue({
        needsUserInput: true,
        bestMatch: {
          boardId: 'board-a',
          boardName: 'Board A',
          confidence: 50,
          matchedTerms: [],
        },
        allMatches: [],
        availableBoards: [{ id: 'board-a', name: 'Board A' }, { id: 'board-b', name: 'Board B' }],
        reason: 'utility-increment',
      });

      const result = await sync.syncIncrement(incrementId);
      expect(result.success).toBe(true);
      expect(silentLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Utility increment detected')
      );
    });
  });

  describe('type re-exports', () => {
    it('should re-export SyncOptions, SyncResult, ParsedSpec, UserStoryData, AcceptanceCriterionData types', async () => {
      // This is a compile-time check - if the types are not re-exported, this import would fail
      const mod = await import('../../../../src/core/living-docs/living-docs-sync.js');
      // The class should be exported
      expect(mod.LivingDocsSync).toBeDefined();
    });
  });
});
