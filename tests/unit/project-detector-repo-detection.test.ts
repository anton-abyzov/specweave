import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests for ProjectDetector Repo Name Detection
 *
 * Critical functionality: Auto-detect repo name from git remote instead of "default"
 */

import { ProjectDetector } from '../../src/core/living-docs/project-detector.js';
import { execSync } from 'child_process';

// Mock execSync
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('ProjectDetector - Repo Name Detection', () => {
  const mockExecSync = execSync as unknown as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('detectRepoName()', () => {
    it('should extract repo name from HTTPS URL with .git', () => {
      // Mock git remote URL
      mockExecSync.mockReturnValue('https://github.com/anton-abyzov/specweave.git\n');

      const detector = new ProjectDetector({ configPath: '/tmp/nonexistent.json' });
      const projects = detector.getProjects();

      expect(projects[0].id).toBe('specweave');
      // Name may be formatted like "Default Project" or "specweave Project"
      // Just verify the project ID is correct
    });

    it('should extract repo name from HTTPS URL without .git', () => {
      mockExecSync.mockReturnValue('https://github.com/anton-abyzov/specweave\n');

      const detector = new ProjectDetector({ configPath: '/tmp/nonexistent.json' });
      const projects = detector.getProjects();

      expect(projects[0].id).toBe('specweave');
    });

    it('should extract repo name from SSH URL (git@github.com)', () => {
      mockExecSync.mockReturnValue('git@github.com:anton-abyzov/specweave.git\n');

      const detector = new ProjectDetector({ configPath: '/tmp/nonexistent.json' });
      const projects = detector.getProjects();

      expect(projects[0].id).toBe('specweave');
    });

    it('should extract repo name from SSH URL without .git', () => {
      mockExecSync.mockReturnValue('git@github.com:anton-abyzov/specweave\n');

      const detector = new ProjectDetector({ configPath: '/tmp/nonexistent.json' });
      const projects = detector.getProjects();

      expect(projects[0].id).toBe('specweave');
    });

    it('should handle multi-repo setup (backend)', () => {
      mockExecSync.mockReturnValue('https://github.com/mycompany/backend-api.git\n');

      const detector = new ProjectDetector({ configPath: '/tmp/nonexistent.json' });
      const projects = detector.getProjects();

      expect(projects[0].id).toBe('backend-api');
    });

    it('should handle multi-repo setup (frontend)', () => {
      mockExecSync.mockReturnValue('git@github.com:mycompany/frontend-app.git\n');

      const detector = new ProjectDetector({ configPath: '/tmp/nonexistent.json' });
      const projects = detector.getProjects();

      expect(projects[0].id).toBe('frontend-app');
    });

    it('should fall back to "default" if not a git repository', () => {
      // Simulate git command failure (not a git repo)
      mockExecSync.mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });

      const detector = new ProjectDetector({ configPath: '/tmp/nonexistent.json' });
      const projects = detector.getProjects();

      expect(projects[0].id).toBe('default');
    });

    it('should fall back to "default" if git remote has no URL', () => {
      mockExecSync.mockReturnValue(''); // Empty response

      const detector = new ProjectDetector({ configPath: '/tmp/nonexistent.json' });
      const projects = detector.getProjects();

      expect(projects[0].id).toBe('default');
    });

    it('should use explicit fallbackProject if provided', () => {
      mockExecSync.mockReturnValue('https://github.com/anton-abyzov/specweave.git\n');

      const detector = new ProjectDetector({
        configPath: '/tmp/nonexistent.json',
        fallbackProject: 'custom-project', // Explicit override
      });
      const projects = detector.getProjects();

      // Should use explicit fallback, not detected repo name
      expect(projects[0].id).toBe('custom-project');
    });

    it('should handle GitLab URLs', () => {
      mockExecSync.mockReturnValue('https://gitlab.com/myteam/awesome-project.git\n');

      const detector = new ProjectDetector({ configPath: '/tmp/nonexistent.json' });
      const projects = detector.getProjects();

      expect(projects[0].id).toBe('awesome-project');
    });

    it('should handle Bitbucket URLs', () => {
      mockExecSync.mockReturnValue('git@bitbucket.org:mycompany/cool-app.git\n');

      const detector = new ProjectDetector({ configPath: '/tmp/nonexistent.json' });
      const projects = detector.getProjects();

      expect(projects[0].id).toBe('cool-app');
    });

    it('should handle URLs with dashes and underscores', () => {
      mockExecSync.mockReturnValue('https://github.com/my-org/my_awesome_project-v2.git\n');

      const detector = new ProjectDetector({ configPath: '/tmp/nonexistent.json' });
      const projects = detector.getProjects();

      expect(projects[0].id).toBe('my_awesome_project-v2');
    });

    it('should handle URLs with numbers', () => {
      mockExecSync.mockReturnValue('git@github.com:company/app-v3.git\n');

      const detector = new ProjectDetector({ configPath: '/tmp/nonexistent.json' });
      const projects = detector.getProjects();

      expect(projects[0].id).toBe('app-v3');
    });
  });

  describe('Integration with getSpecsFolder()', () => {
    it('should return specs folder with detected repo name', () => {
      mockExecSync.mockReturnValue('https://github.com/anton-abyzov/specweave.git\n');

      const detector = new ProjectDetector({ configPath: '/tmp/nonexistent.json' });
      const specsFolder = detector.getSpecsFolder('specweave');

      expect(specsFolder).toContain('.specweave/docs/internal/specs/specweave');
    });

    it('should return default specs folder when repo detection fails', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });

      const detector = new ProjectDetector({ configPath: '/tmp/nonexistent.json' });
      const specsFolder = detector.getSpecsFolder('default');

      expect(specsFolder).toContain('.specweave/docs/internal/specs/default');
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed git URLs gracefully', () => {
      mockExecSync.mockReturnValue('some-invalid-url\n');

      const detector = new ProjectDetector({ configPath: '/tmp/nonexistent.json' });
      const projects = detector.getProjects();

      // Should fall back to "default" when regex doesn't match
      expect(projects[0].id).toBe('default');
    });

    it('should handle empty git remote output', () => {
      mockExecSync.mockReturnValue('   \n'); // Whitespace only

      const detector = new ProjectDetector({ configPath: '/tmp/nonexistent.json' });
      const projects = detector.getProjects();

      expect(projects[0].id).toBe('default');
    });

    it('should suppress stderr from git command', () => {
      // This test verifies that the stdio option is set correctly
      mockExecSync.mockImplementation((cmd, options) => {
        // Check that stderr is suppressed
        expect(options).toHaveProperty('stdio');
        expect((options as any).stdio).toEqual(['pipe', 'pipe', 'ignore']);
        throw new Error('Command failed');
      });

      const detector = new ProjectDetector({ configPath: '/tmp/nonexistent.json' });
      const projects = detector.getProjects();

      expect(projects[0].id).toBe('default');
    });
  });
});
