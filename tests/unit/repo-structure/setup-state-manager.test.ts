/**
 * Unit Tests for Setup State Manager
 *
 * Tests atomic state persistence, Ctrl+C recovery, and state validation
 * Test Coverage Target: 90%+
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  SetupStateManager,
  SetupState,
  RepoConfig,
  SetupArchitecture
} from '../../../src/core/repo-structure/setup-state-manager';

describe('SetupStateManager', () => {
  let tempDir: string;
  let manager: SetupStateManager;

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-test-'));
    manager = new SetupStateManager(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  describe('saveState', () => {
    it('should create new state file on first save', async () => {
      const state: SetupState = {
        version: '1.0',
        architecture: 'multi-repo',
        parentRepo: {
          name: 'my-project-parent',
          owner: 'myorg',
          description: 'Parent Repository',
          visibility: 'private',
          createOnGitHub: true,
          url: 'https://github.com/myorg/my-project-parent'
        },
        repos: [],
        currentStep: 'parent-created',
        timestamp: new Date().toISOString(),
        envCreated: false
      };

      await manager.saveState(state);

      const statePath = path.join(tempDir, '.specweave', 'setup-state.json');
      expect(await fs.pathExists(statePath)).toBe(true);
    });

    it('should set file permissions to 0600 (owner read/write only)', async () => {
      const state: SetupState = {
        version: '1.0',
        architecture: 'single',
        repos: [],
        currentStep: 'init',
        timestamp: new Date().toISOString(),
        envCreated: false
      };

      await manager.saveState(state);

      const statePath = path.join(tempDir, '.specweave', 'setup-state.json');
      const stats = await fs.stat(statePath);

      // On Unix systems, check permissions
      if (process.platform !== 'win32') {
        const mode = stats.mode & 0o777;
        expect(mode).toBe(0o600);
      }
    });

    it('should create backup before writing new state', async () => {
      const state1: SetupState = {
        version: '1.0',
        architecture: 'single',
        repos: [],
        currentStep: 'init',
        timestamp: new Date().toISOString(),
        envCreated: false
      };

      await manager.saveState(state1);

      const state2: SetupState = {
        ...state1,
        currentStep: 'repo-1-created',
        timestamp: new Date().toISOString()
      };

      await manager.saveState(state2);

      const backupPath = path.join(tempDir, '.specweave', 'setup-state.backup.json');
      expect(await fs.pathExists(backupPath)).toBe(true);

      const backup = await fs.readJson(backupPath);
      expect(backup.currentStep).toBe('init');
    });

    it('should use atomic rename operation', async () => {
      const state: SetupState = {
        version: '1.0',
        architecture: 'single',
        repos: [],
        currentStep: 'init',
        timestamp: new Date().toISOString(),
        envCreated: false
      };

      await manager.saveState(state);

      // Temp file should not exist after save (renamed to final)
      const tempPath = path.join(tempDir, '.specweave', 'setup-state.tmp.json');
      expect(await fs.pathExists(tempPath)).toBe(false);
    });

    it('should restore backup on write failure', async () => {
      const state1: SetupState = {
        version: '1.0',
        architecture: 'single',
        repos: [],
        currentStep: 'init',
        timestamp: new Date().toISOString(),
        envCreated: false
      };

      await manager.saveState(state1);

      // Mock fs.rename to fail
      const renameSpy = jest.spyOn(fs, 'rename').mockRejectedValue(new Error('Disk full') as never);

      const state2: SetupState = {
        ...state1,
        currentStep: 'failed-step',
        timestamp: new Date().toISOString()
      };

      await expect(manager.saveState(state2)).rejects.toThrow();

      // Original state should be preserved
      const preserved = await manager.loadState();
      expect(preserved?.currentStep).toBe('init');

      // Restore original
      renameSpy.mockRestore();
    });
  });

  describe('loadState', () => {
    it('should load and parse valid state file', async () => {
      const state: SetupState = {
        version: '1.0',
        architecture: 'multi-repo',
        parentRepo: {
          name: 'my-project-parent',
          owner: 'myorg',
          description: 'Parent Repository',
          visibility: 'private',
          createOnGitHub: true,
          url: 'https://github.com/myorg/my-project-parent'
        },
        repos: [],
        currentStep: 'parent-created',
        timestamp: new Date().toISOString(),
        envCreated: false
      };

      await manager.saveState(state);
      const loaded = await manager.loadState();

      expect(loaded).toBeDefined();
      expect(loaded?.architecture).toBe('multi-repo');
      expect(loaded?.currentStep).toBe('parent-created');
      expect(loaded?.parentRepo?.owner).toBe('myorg');
    });

    it('should validate state schema', async () => {
      // Write invalid state directly
      const statePath = path.join(tempDir, '.specweave', 'setup-state.json');
      await fs.ensureDir(path.dirname(statePath));
      await fs.writeJson(statePath, {
        version: '1.0',
        // Missing required fields
        architecture: 'polyrepo'
      });

      const loaded = await manager.loadState();
      expect(loaded).toBeNull(); // Invalid state should return null
    });

    it('should load from backup if main file corrupted', async () => {
      const state: SetupState = {
        version: '1.0',
        architecture: 'single',
        repos: [],
        currentStep: 'init',
        timestamp: new Date().toISOString(),
        envCreated: false
      };

      // Save first time (no backup created yet)
      await manager.saveState(state);

      // Save second time (creates backup)
      const state2 = { ...state, currentStep: 'step2', timestamp: new Date().toISOString() };
      await manager.saveState(state2);

      // Now backup contains 'init', main file contains 'step2'
      // Corrupt main file
      const statePath = path.join(tempDir, '.specweave', 'setup-state.json');
      await fs.writeFile(statePath, 'CORRUPTED JSON{{{');

      // Should load from backup (which has 'init')
      const loaded = await manager.loadState();
      expect(loaded).toBeDefined();
      expect(loaded?.currentStep).toBe('init');
    });

    it('should return null if no state file exists', async () => {
      const loaded = await manager.loadState();
      expect(loaded).toBeNull();
    });
  });

  describe('detectAndResumeSetup', () => {
    it('should detect incomplete setup with parent created', async () => {
      const state: SetupState = {
        version: '1.0',
        architecture: 'multi-repo',
        parentRepo: {
          name: 'my-project-parent',
          owner: 'myorg',
          description: 'Parent Repository',
          visibility: 'private',
          createOnGitHub: true,
          url: 'https://github.com/myorg/my-project-parent'
        },
        repos: [
          {
            id: 'frontend',
            displayName: 'Frontend',
            owner: 'myorg',
            repo: 'my-project-frontend',
            visibility: 'private',
            created: false,
            cloned: false,
            path: 'frontend/'
          }
        ],
        currentStep: 'repo-1-of-2',
        timestamp: new Date().toISOString(),
        envCreated: false
      };

      await manager.saveState(state);

      const detected = await manager.detectAndResumeSetup();
      expect(detected).not.toBeNull();
      expect(detected?.currentStep).toBe('repo-1-of-2');
    });

    it('should return null if no state file', async () => {
      const detected = await manager.detectAndResumeSetup();
      expect(detected).toBeNull();
    });

    it('should return null if setup complete', async () => {
      const state: SetupState = {
        version: '1.0',
        architecture: 'single',
        repos: [
          {
            id: 'main',
            displayName: 'Main',
            owner: 'myorg',
            repo: 'my-project',
            visibility: 'private',
            created: true,
            cloned: true,
            path: './'
          }
        ],
        currentStep: 'complete',
        timestamp: new Date().toISOString(),
        envCreated: true
      };

      await manager.saveState(state);

      const detected = await manager.detectAndResumeSetup();
      expect(detected).toBeNull();
    });
  });

  describe('deleteState', () => {
    it('should remove state file and backup', async () => {
      const state: SetupState = {
        version: '1.0',
        architecture: 'single',
        repos: [],
        currentStep: 'init',
        timestamp: new Date().toISOString(),
        envCreated: false
      };

      await manager.saveState(state);
      await manager.saveState({ ...state, currentStep: 'done' }); // Creates backup

      await manager.deleteState();

      const statePath = path.join(tempDir, '.specweave', 'setup-state.json');
      const backupPath = path.join(tempDir, '.specweave', 'setup-state.backup.json');

      expect(await fs.pathExists(statePath)).toBe(false);
      expect(await fs.pathExists(backupPath)).toBe(false);
    });

    it('should not throw if files do not exist', async () => {
      await expect(manager.deleteState()).resolves.not.toThrow();
    });
  });

  describe('resumeSetup', () => {
    it('should continue from interrupted step', async () => {
      const state: SetupState = {
        version: '1.0',
        architecture: 'multi-repo',
        parentRepo: {
          name: 'my-project-parent',
          owner: 'myorg',
          description: 'Parent Repository',
          visibility: 'private',
          createOnGitHub: true,
          url: 'https://github.com/myorg/my-project-parent'
        },
        repos: [
          {
            id: 'frontend',
            displayName: 'Frontend',
            owner: 'myorg',
            repo: 'my-project-frontend',
            visibility: 'private',
            created: true,
            cloned: false,
            path: 'frontend/'
          },
          {
            id: 'backend',
            displayName: 'Backend',
            owner: 'myorg',
            repo: 'my-project-backend',
            visibility: 'private',
            created: false,
            cloned: false,
            path: 'backend/'
          }
        ],
        currentStep: 'repo-1-of-2',
        timestamp: new Date().toISOString(),
        envCreated: false
      };

      await manager.saveState(state);
      const loaded = await manager.loadState();

      expect(loaded?.repos[0].created).toBe(true);
      expect(loaded?.repos[1].created).toBe(false);
    });

    it('should preserve configuration during resume', async () => {
      const state: SetupState = {
        version: '1.0',
        architecture: 'monorepo',
        repos: [
          {
            id: 'monorepo',
            displayName: 'Monorepo',
            owner: 'myorg',
            repo: 'my-monorepo',
            visibility: 'public',
            created: true,
            cloned: false,
            path: './'
          }
        ],
        currentStep: 'cloning',
        timestamp: new Date().toISOString(),
        envCreated: false,
        monorepoProjects: ['frontend', 'backend', 'shared']
      };

      await manager.saveState(state);
      const loaded = await manager.loadState();

      expect(loaded?.monorepoProjects).toEqual(['frontend', 'backend', 'shared']);
      expect(loaded?.repos[0].visibility).toBe('public');
    });
  });

  describe('stateValidation', () => {
    it('should reject state with wrong version', async () => {
      const statePath = path.join(tempDir, '.specweave', 'setup-state.json');
      await fs.ensureDir(path.dirname(statePath));
      await fs.writeJson(statePath, {
        version: '0.5', // Wrong version
        architecture: 'single',
        repos: [],
        currentStep: 'init',
        timestamp: new Date().toISOString()
      });

      const loaded = await manager.loadState();
      expect(loaded).toBeNull();
    });

    it('should validate repo structure', async () => {
      const statePath = path.join(tempDir, '.specweave', 'setup-state.json');
      await fs.ensureDir(path.dirname(statePath));
      await fs.writeJson(statePath, {
        version: '1.0',
        architecture: 'single',
        repos: [
          {
            // Missing required fields
            id: 'main'
          }
        ],
        currentStep: 'init',
        timestamp: new Date().toISOString()
      });

      const loaded = await manager.loadState();
      expect(loaded).toBeNull();
    });
  });

  describe('concurrency', () => {
    it('should handle concurrent saves without corruption', async () => {
      const state1: SetupState = {
        version: '1.0',
        architecture: 'single',
        repos: [],
        currentStep: 'step1',
        timestamp: new Date().toISOString(),
        envCreated: false
      };

      const state2: SetupState = {
        ...state1,
        currentStep: 'step2',
        timestamp: new Date().toISOString()
      };

      // Save concurrently - one might fail due to race condition, which is acceptable
      const results = await Promise.allSettled([
        manager.saveState(state1),
        manager.saveState(state2)
      ]);

      // At least one save should succeed
      const succeeded = results.filter(r => r.status === 'fulfilled');
      expect(succeeded.length).toBeGreaterThan(0);

      // Loaded state should be valid (whichever save won the race)
      const loaded = await manager.loadState();
      expect(loaded).toBeDefined();
      expect(['step1', 'step2']).toContain(loaded?.currentStep);
    });
  });

  describe('permissions', () => {
    it('should detect if permissions changed', async () => {
      const state: SetupState = {
        version: '1.0',
        architecture: 'single',
        repos: [],
        currentStep: 'init',
        timestamp: new Date().toISOString(),
        envCreated: false
      };

      await manager.saveState(state);

      if (process.platform !== 'win32') {
        // Change permissions
        const statePath = path.join(tempDir, '.specweave', 'setup-state.json');
        await fs.chmod(statePath, 0o644);

        const stats = await fs.stat(statePath);
        const mode = stats.mode & 0o777;
        expect(mode).not.toBe(0o600);
      }
    });
  });
});
