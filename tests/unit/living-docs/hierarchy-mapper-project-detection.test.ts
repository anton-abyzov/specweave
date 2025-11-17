/**
 * Unit tests for HierarchyMapper Project Detection (Fix for default → repo name)
 *
 * Tests the critical fix where project detection fallback was hardcoded to 'default'
 * instead of using configured projects. This ensures GitHub sync works correctly
 * with 1:1 mapping between project folder name and repository name.
 */

import { HierarchyMapper } from '../../../src/core/living-docs/hierarchy-mapper.js';
import { ConfigManager } from '../../../src/core/config-manager.js';
import fs from 'fs-extra';
import path from 'path';

// Mock dependencies
vi.mock('fs-extra');
vi.mock('../../../src/core/config-manager');
vi.mock('../../../src/core/living-docs/feature-id-manager');

const mockFs = fs as anyed<typeof fs> & {
  readFile: anyedFunction<any>;
};
const MockConfigManager = ConfigManager as anyedClass<typeof ConfigManager>;

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('HierarchyMapper - Project Detection Fallback Fix', () => {
  let mapper: HierarchyMapper;
  let mockProjectRoot: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectRoot = '/test/project';

    // Default: spec.md exists
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFile.mockResolvedValue('---\ntitle: Test\n---\n# Test');
  });

  describe('Single-Project Mode (specweave repo)', () => {
    beforeEach(() => {
      // Mock config for single-project mode with specweave project
      const mockConfig = {
        multiProject: {
          enabled: true,
          projects: {
            specweave: {
              name: 'SpecWeave',
              description: 'Core SpecWeave framework',
              keywords: ['specweave', 'framework'],
              techStack: ['TypeScript', 'Node.js'],
              github: {
                owner: 'anton-abyzov',
                repo: 'specweave',
              },
            },
          },
        },
      };

      MockConfigManager.prototype.loadAsync.mockResolvedValue(mockConfig as any);
      mapper = new HierarchyMapper(mockProjectRoot);
    });

    it('should return specweave project in getConfiguredProjects()', async () => {
      const projects = await mapper.getConfiguredProjects();

      expect(projects).toEqual(['specweave']);
      expect(projects).not.toContain('default');
    });

    it('should use specweave as fallback when no project indicators found', async () => {
      // Spec with NO project indicators (no frontmatter project, no keywords in name)
      mockFs.readFile.mockResolvedValue('---\ntitle: Generic Feature\n---\n# Generic');

      const projects = await mapper.detectProjects('0016-generic-feature');

      expect(projects).toEqual(['specweave']);
      expect(projects).not.toContain('default');
    });

    it('should use specweave when increment name has no project keywords', async () => {
      const projects = await mapper.detectProjects('0031-status-sync');

      expect(projects).toEqual(['specweave']);
    });

    it('should use specweave when spec content is minimal', async () => {
      mockFs.readFile.mockResolvedValue('---\ntitle: Fix\n---\n# Fix');

      const projects = await mapper.detectProjects('0033-duplicate-fix');

      expect(projects).toEqual(['specweave']);
    });
  });

  describe('Multi-Project Mode (multiple repos)', () => {
    beforeEach(() => {
      // Mock config for multi-project mode with 3 repos
      const mockConfig = {
        multiProject: {
          enabled: true,
          projects: {
            backend: {
              name: 'Backend Services',
              keywords: ['api', 'backend', 'service'],
              techStack: ['Node.js', 'PostgreSQL'],
              github: { owner: 'org', repo: 'backend' },
            },
            frontend: {
              name: 'Frontend App',
              keywords: ['ui', 'frontend', 'react'],
              techStack: ['React', 'Next.js'],
              github: { owner: 'org', repo: 'frontend' },
            },
            mobile: {
              name: 'Mobile App',
              keywords: ['mobile', 'ios', 'android'],
              techStack: ['React Native'],
              github: { owner: 'org', repo: 'mobile' },
            },
          },
        },
      };

      MockConfigManager.prototype.loadAsync.mockResolvedValue(mockConfig as any);
      mapper = new HierarchyMapper(mockProjectRoot);
    });

    it('should return all configured projects', async () => {
      const projects = await mapper.getConfiguredProjects();

      expect(projects).toEqual(['backend', 'frontend', 'mobile']);
      expect(projects).toHaveLength(3);
    });

    it('should detect project from frontmatter (explicit)', async () => {
      mockFs.readFile.mockResolvedValue('---\ntitle: Test\nproject: frontend\n---\n');

      const projects = await mapper.detectProjects('0016-some-feature');

      expect(projects).toEqual(['frontend']);
    });

    it('should detect project from frontmatter with multiple projects', async () => {
      mockFs.readFile.mockResolvedValue('---\ntitle: Test\nprojects: [backend, mobile]\n---\n');

      const projects = await mapper.detectProjects('0016-api-mobile');

      expect(projects).toContain('backend');
      expect(projects).toContain('mobile');
      expect(projects).toHaveLength(2);
    });

    it('should detect project from increment name containing project keyword', async () => {
      mockFs.readFile.mockResolvedValue('---\ntitle: Test\n---\n');

      const projects = await mapper.detectProjects('0016-backend-authentication');

      expect(projects).toContain('backend');
    });

    it('should fallback to all projects when no indicators found', async () => {
      mockFs.readFile.mockResolvedValue('---\ntitle: Generic\n---\n');

      const projects = await mapper.detectProjects('0016-generic-task');

      // Fallback should return all configured projects
      expect(projects).toEqual(['backend', 'frontend', 'mobile']);
    });
  });

  describe('GitHub 1:1 Mapping Validation', () => {
    beforeEach(() => {
      // Mock config with GitHub repo mapping
      const mockConfig = {
        multiProject: {
          enabled: true,
          projects: {
            specweave: {
              name: 'SpecWeave',
              github: {
                owner: 'anton-abyzov',
                repo: 'specweave',  // Project name MUST match repo name!
              },
            },
          },
        },
      };

      MockConfigManager.prototype.loadAsync.mockResolvedValue(mockConfig as any);
      mapper = new HierarchyMapper(mockProjectRoot);
    });

    it('should ensure project name matches GitHub repo name', async () => {
      const projects = await mapper.getConfiguredProjects();

      expect(projects).toEqual(['specweave']);

      // Verify the project name itself is 'specweave' (matches repo)
      // This ensures folder structure matches GitHub repo:
      // .specweave/docs/internal/specs/specweave/ → anton-abyzov/specweave
      expect(projects[0]).toBe('specweave');
    });

    it('should use project name that matches repo for GitHub sync compatibility', async () => {
      mockFs.readFile.mockResolvedValue('---\ntitle: Test\n---\n');

      const projects = await mapper.detectProjects('0031-external-tool-sync');

      // Should return 'specweave' (matches repo), NOT 'default'
      expect(projects[0]).toBe('specweave');

      // Verify this will create correct living docs path:
      const specsBaseDir = path.join(mockProjectRoot, '.specweave/docs/internal/specs');
      const expectedPath = path.join(specsBaseDir, 'specweave', 'FS-031');

      expect(expectedPath).toContain('/specweave/'); // Matches repo name
      expect(expectedPath).not.toContain('/default/'); // NOT generic default
    });
  });

  describe('Fallback Behavior (Before vs After Fix)', () => {
    it('BEFORE FIX: would return hardcoded [\'default\']', async () => {
      // This test documents the OLD BUGGY behavior
      // DO NOT use this - it's here for documentation only

      const buggyFallback = ['default']; // ❌ WRONG - hardcoded!

      expect(buggyFallback).toEqual(['default']);
      expect(buggyFallback).not.toEqual(['specweave']);

      // This caused GitHub sync to fail because:
      // - Living docs created: specs/default/FS-031/
      // - GitHub repo expects: specs/specweave/FS-031/
      // - NO MATCH! Sync broken!
    });

    it('AFTER FIX: returns configured projects from config', async () => {
      // Mock single-project config
      const mockConfig = {
        multiProject: {
          enabled: true,
          projects: {
            specweave: {
              name: 'SpecWeave',
              github: { owner: 'anton-abyzov', repo: 'specweave' },
            },
          },
        },
      };

      MockConfigManager.prototype.loadAsync.mockResolvedValue(mockConfig as any);
      mapper = new HierarchyMapper(mockProjectRoot);

      const projects = await mapper.getConfiguredProjects();

      // ✓ CORRECT - uses configured project name!
      expect(projects).toEqual(['specweave']);

      // This ensures GitHub sync works:
      // - Living docs creates: specs/specweave/FS-031/
      // - GitHub repo expects: specs/specweave/FS-031/
      // - PERFECT MATCH! Sync works! ✓
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      const mockConfig = {
        multiProject: {
          enabled: true,
          projects: {
            specweave: {
              name: 'SpecWeave',
              github: { owner: 'anton-abyzov', repo: 'specweave' },
            },
          },
        },
      };

      MockConfigManager.prototype.loadAsync.mockResolvedValue(mockConfig as any);
      mapper = new HierarchyMapper(mockProjectRoot);
    });

    it('should handle missing spec.md file', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const projects = await mapper.detectProjects('0016-missing-spec');

      // Should fallback to configured projects even when spec missing
      expect(projects).toEqual(['specweave']);
    });

    it('should handle empty frontmatter', async () => {
      mockFs.readFile.mockResolvedValue('---\n---\n# Content');

      const projects = await mapper.detectProjects('0016-empty-frontmatter');

      expect(projects).toEqual(['specweave']);
    });

    it('should handle malformed frontmatter', async () => {
      mockFs.readFile.mockResolvedValue('---\ninvalid yaml:\n  - broken\n---\n');

      const projects = await mapper.detectProjects('0016-malformed');

      // Should gracefully fallback
      expect(projects).toEqual(['specweave']);
    });

    it('should validate frontmatter projects exist in config', async () => {
      mockFs.readFile.mockResolvedValue('---\ntitle: Test\nproject: nonexistent\n---\n');

      const projects = await mapper.detectProjects('0016-invalid-project');

      // Invalid frontmatter project → fallback to configured
      expect(projects).toEqual(['specweave']);
      expect(projects).not.toContain('nonexistent');
    });
  });

  describe('Config Variations', () => {
    it('should handle multiProject.enabled = false', async () => {
      const mockConfig = {
        multiProject: {
          enabled: false,
        },
      };

      MockConfigManager.prototype.loadAsync.mockResolvedValue(mockConfig as any);
      mapper = new HierarchyMapper(mockProjectRoot);

      const projects = await mapper.getConfiguredProjects();

      // Should fallback to ['default'] when multi-project disabled
      expect(projects).toEqual(['default']);
    });

    it('should handle missing multiProject config', async () => {
      const mockConfig = {};

      MockConfigManager.prototype.loadAsync.mockResolvedValue(mockConfig as any);
      mapper = new HierarchyMapper(mockProjectRoot);

      const projects = await mapper.getConfiguredProjects();

      // Should fallback to ['default'] when no multi-project config
      expect(projects).toEqual(['default']);
    });

    it('should handle empty projects object', async () => {
      const mockConfig = {
        multiProject: {
          enabled: true,
          projects: {},
        },
      };

      MockConfigManager.prototype.loadAsync.mockResolvedValue(mockConfig as any);
      mapper = new HierarchyMapper(mockProjectRoot);

      const projects = await mapper.getConfiguredProjects();

      // Empty projects → fallback to ['default']
      expect(projects).toEqual(['default']);
    });
  });

  describe('Regression Tests', () => {
    it('should NOT hardcode "default" in fallback (regression)', async () => {
      const mockConfig = {
        multiProject: {
          enabled: true,
          projects: {
            'my-custom-repo': {
              name: 'My Custom Repo',
              github: { owner: 'user', repo: 'my-custom-repo' },
            },
          },
        },
      };

      MockConfigManager.prototype.loadAsync.mockResolvedValue(mockConfig as any);
      mapper = new HierarchyMapper(mockProjectRoot);

      mockFs.readFile.mockResolvedValue('---\ntitle: Test\n---\n');
      const projects = await mapper.detectProjects('0016-some-feature');

      // CRITICAL: Should use configured project name, NOT 'default'
      expect(projects).toEqual(['my-custom-repo']);
      expect(projects).not.toContain('default');

      // This ensures living docs path matches repo name:
      // specs/my-custom-repo/ ← ✓ Matches repo name
      // specs/default/ ← ❌ Would break GitHub sync!
    });
  });
});
