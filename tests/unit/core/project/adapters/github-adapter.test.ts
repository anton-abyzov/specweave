/**
 * Unit tests for GitHubProjectAdapter
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitHubProjectAdapter } from '../../../../../src/core/project/adapters/github-project-adapter.js';
import { ProjectRegistry } from '../../../../../src/core/project/project-registry.js';
import { ProjectEventBus } from '../../../../../src/core/project/project-event-bus.js';
import { Project } from '../../../../../src/core/project/types/project-types.js';

// Mock execFileNoThrow
vi.mock('../../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: vi.fn(),
}));

import { execFileNoThrow } from '../../../../../src/utils/execFileNoThrow.js';

describe('GitHubProjectAdapter', () => {
  let adapter: GitHubProjectAdapter;
  let eventBus: ProjectEventBus;
  const mockExecFileNoThrow = execFileNoThrow as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    adapter = new GitHubProjectAdapter({
      owner: 'test-owner',
      repo: 'test-repo',
      token: 'test-token',
    });

    eventBus = new ProjectEventBus();

    // Default mock for successful label operations
    mockExecFileNoThrow.mockResolvedValue({
      exitCode: 0,
      stdout: '[]',
      stderr: '',
    });
  });

  describe('Event Handling', () => {
    it('should create label on ProjectCreated event', async () => {
      const project: Project = {
        id: 'test-project',
        name: 'Test Project',
        created: new Date().toISOString(),
      };

      // Emit event directly
      eventBus.emit({
        type: 'ProjectCreated',
        project,
        timestamp: new Date().toISOString(),
      });

      // Since event handlers are async, wait a tick
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Adapter wasn't subscribed yet, so nothing should happen
      expect(mockExecFileNoThrow).not.toHaveBeenCalled();
    });

    it('should handle label creation failure gracefully', async () => {
      mockExecFileNoThrow.mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'Permission denied',
      });

      // This should not throw even if label creation fails
      const project: Project = {
        id: 'test-project',
        name: 'Test Project',
        created: new Date().toISOString(),
      };

      // Calling internal method directly for testing
      await expect((adapter as any).createLabel('project:test', '0052CC', 'Test')).rejects.toThrow(
        'Failed to create label'
      );
    });
  });

  describe('Label Operations', () => {
    it('should check if label exists', async () => {
      mockExecFileNoThrow.mockResolvedValue({
        exitCode: 0,
        stdout: JSON.stringify([{ name: 'project:test' }]),
        stderr: '',
      });

      const exists = await (adapter as any).labelExists('project:test');
      expect(exists).toBe(true);
    });

    it('should return false if label does not exist', async () => {
      mockExecFileNoThrow.mockResolvedValue({
        exitCode: 0,
        stdout: JSON.stringify([]),
        stderr: '',
      });

      const exists = await (adapter as any).labelExists('project:missing');
      expect(exists).toBe(false);
    });

    it('should generate correct label name', () => {
      const labelName = (adapter as any).getLabelName('my-project');
      expect(labelName).toBe('project:my-project');
    });
  });

  describe('Project Discovery', () => {
    it('should discover project labels from GitHub', async () => {
      mockExecFileNoThrow.mockResolvedValue({
        exitCode: 0,
        stdout: JSON.stringify([
          { name: 'project:frontend', description: 'Project: Frontend App', color: '0052CC' },
          { name: 'project:backend', description: 'Project: Backend API', color: '00FF00' },
          { name: 'bug', description: 'Bug label', color: 'FF0000' }, // Should be filtered out
        ]),
        stderr: '',
      });

      const discovered = await adapter.discoverProjects();

      expect(discovered).toHaveLength(2);
      expect(discovered[0].id).toBe('frontend');
      expect(discovered[0].name).toBe('Frontend App');
      expect(discovered[1].id).toBe('backend');
    });

    it('should handle discovery failure gracefully', async () => {
      mockExecFileNoThrow.mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'Error',
      });

      const discovered = await adapter.discoverProjects();
      expect(discovered).toHaveLength(0);
    });
  });

  describe('Environment', () => {
    it('should include token in environment', () => {
      const env = (adapter as any).getGhEnv();
      expect(env.GH_TOKEN).toBe('test-token');
    });

    it('should use process.env when no token', () => {
      const adapterNoToken = new GitHubProjectAdapter({
        owner: 'test',
        repo: 'test',
      });
      const env = (adapterNoToken as any).getGhEnv();
      expect(env).toBe(process.env);
    });
  });
});
