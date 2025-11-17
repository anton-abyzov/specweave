import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests for migrate-to-profiles Command
 *
 * CRITICAL: This command poses data loss risk if migration fails
 * These tests ensure configuration migration works correctly
 */

import { describe, it, expect, jest, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  migrateToProfiles,
  detectOldConfiguration,
  backupConfiguration,
  createGitHubProfile,
  createJiraProfile,
  createAdoProfile,
  cleanupOldConfiguration,
  MigrationOptions,
  MigrationResult,
  OldConfiguration
} from '../../../src/cli/commands/migrate-to-profiles.js';
import { ProfileManager } from '../../../src/core/sync/profile-manager.js';
import { ProjectContextManager } from '../../../src/core/sync/project-context.js';

vi.mock('../../../src/core/sync/profile-manager');
vi.mock('../../../src/core/sync/project-context');

describe('migrate-to-profiles', () => {
  let testDir: string;
  let mockProfileManager: anyed<ProfileManager>;
  let mockProjectManager: anyed<ProjectContextManager>;

  beforeEach(async () => {
    // Create temp directory for tests
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-migrate-test-'));
    await fs.mkdir(path.join(testDir, '.specweave'), { recursive: true });

    // Reset all mocks
    vi.clearAllMocks();

    // Setup mocks
    mockProfileManager = new ProfileManager(testDir) as anyed<ProfileManager>;
    mockProjectManager = new ProjectContextManager(testDir) as anyed<ProjectContextManager>;

    (ProfileManager as anyedClass<typeof ProfileManager>).mockImplementation(() => mockProfileManager);
    (ProjectContextManager as anyedClass<typeof ProjectContextManager>).mockImplementation(() => mockProjectManager);

    mockProfileManager.load.mockResolvedValue();
    mockProjectManager.load.mockResolvedValue();
    mockProfileManager.createProfile.mockResolvedValue();
    mockProjectManager.createProject.mockResolvedValue();
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(testDir);
  });

  describe('detectOldConfiguration', () => {
    it('should detect GitHub configuration from .env', async () => {
      // Create old .env file with GitHub config
      await fs.writeFile(
        path.join(testDir, '.env'),
        'GITHUB_TOKEN=ghp_test123\n'
      );

      const config = await detectOldConfiguration(testDir);

      expect(config.detected).toBe(true);
      expect(config.github).toEqual({
        owner: expect.any(String),
        repo: expect.any(String)
      });
    });

    it('should detect JIRA configuration from .env', async () => {
      // Create old .env file with JIRA config
      await fs.writeFile(
        path.join(testDir, '.env'),
        `JIRA_API_TOKEN=test_token
JIRA_EMAIL=user@example.com
JIRA_DOMAIN=example.atlassian.net
JIRA_PROJECT_KEY=TEST`
      );

      const config = await detectOldConfiguration(testDir);

      expect(config.detected).toBe(true);
      expect(config.jira).toEqual({
        domain: 'example.atlassian.net',
        projectKey: 'TEST',
        email: 'user@example.com'
      });
    });

    it('should detect Azure DevOps configuration from .env', async () => {
      // Create old .env file with ADO config
      await fs.writeFile(
        path.join(testDir, '.env'),
        `AZURE_DEVOPS_PAT=test_pat
AZURE_DEVOPS_ORG=myorg
AZURE_DEVOPS_PROJECT=myproject`
      );

      const config = await detectOldConfiguration(testDir);

      expect(config.detected).toBe(true);
      expect(config.ado).toEqual({
        organization: 'myorg',
        project: 'myproject'
      });
    });

    it('should handle missing .env gracefully', async () => {
      const config = await detectOldConfiguration(testDir);

      expect(config.detected).toBe(false);
      expect(config.github).toBeUndefined();
      expect(config.jira).toBeUndefined();
      expect(config.ado).toBeUndefined();
    });

    it('should detect from old config.json format', async () => {
      // Create old config.json with legacy format
      await fs.writeJSON(
        path.join(testDir, '.specweave/config.json'),
        {
          sync: {
            github: {
              owner: 'testowner',
              repo: 'testrepo'
            }
          }
        }
      );

      const config = await detectOldConfiguration(testDir);

      expect(config.detected).toBe(true);
      expect(config.github).toEqual({
        owner: 'testowner',
        repo: 'testrepo'
      });
    });
  });

  describe('backupConfiguration', () => {
    it('should backup existing config.json', async () => {
      // Create existing config
      const originalConfig = { test: 'data' };
      await fs.writeJSON(
        path.join(testDir, '.specweave/config.json'),
        originalConfig
      );

      await backupConfiguration(testDir);

      // Check backup exists
      const backupPath = path.join(testDir, '.specweave/config.json.backup');
      expect(await fs.pathExists(backupPath)).toBe(true);

      // Check backup content
      const backupContent = await fs.readJSON(backupPath);
      expect(backupContent).toEqual(originalConfig);
    });

    it('should handle missing config gracefully', async () => {
      // No config exists
      await expect(backupConfiguration(testDir)).resolves.not.toThrow();

      // Backup should not be created
      const backupPath = path.join(testDir, '.specweave/config.json.backup');
      expect(await fs.pathExists(backupPath)).toBe(false);
    });

    it('should overwrite existing backup with timestamp', async () => {
      // Create existing backup
      await fs.writeJSON(
        path.join(testDir, '.specweave/config.json.backup'),
        { old: 'backup' }
      );

      // Create new config
      await fs.writeJSON(
        path.join(testDir, '.specweave/config.json'),
        { new: 'config' }
      );

      await backupConfiguration(testDir);

      // Check timestamped backup exists
      const backupDir = path.join(testDir, '.specweave');
      const files = await fs.readdir(backupDir);
      const timestampedBackup = files.find(f => f.match(/config\.json\.backup\.\d+/));
      expect(timestampedBackup).toBeDefined();
    });
  });

  describe('createGitHubProfile', () => {
    it('should create GitHub profile from old config', () => {
      const oldConfig = {
        owner: 'myorg',
        repo: 'myrepo'
      };

      const profile = createGitHubProfile(oldConfig);

      expect(profile.provider).toBe('github');
      expect(profile.displayName).toBe('GitHub - myorg/myrepo');
      expect(profile.config).toEqual({
        owner: 'myorg',
        repo: 'myrepo'
      });
      expect(profile.settings).toEqual({
        autoCreateIssue: true,
        syncDirection: 'bidirectional',
        syncOnTaskComplete: true
      });
    });
  });

  describe('createJiraProfile', () => {
    it('should create JIRA profile from old config', () => {
      const oldConfig = {
        domain: 'example.atlassian.net',
        projectKey: 'PROJ',
        email: 'user@example.com'
      };

      const profile = createJiraProfile(oldConfig);

      expect(profile.provider).toBe('jira');
      expect(profile.displayName).toBe('JIRA - PROJ');
      expect(profile.config).toEqual({
        domain: 'example.atlassian.net',
        projectKey: 'PROJ',
        email: 'user@example.com'
      });
    });
  });

  describe('createAdoProfile', () => {
    it('should create Azure DevOps profile from old config', () => {
      const oldConfig = {
        organization: 'myorg',
        project: 'myproject'
      };

      const profile = createAdoProfile(oldConfig);

      expect(profile.provider).toBe('ado');
      expect(profile.displayName).toBe('Azure DevOps - myorg/myproject');
      expect(profile.config).toEqual({
        organization: 'myorg',
        project: 'myproject'
      });
    });
  });

  describe('migrateToProfiles (main function)', () => {
    it('should migrate GitHub configuration successfully', async () => {
      // Setup old GitHub config
      await fs.writeFile(
        path.join(testDir, '.env'),
        'GITHUB_TOKEN=ghp_test123\n'
      );

      // Mock git detection
      vi.spyOn(fs, 'pathExists').mockImplementation(async (p) => {
        if (p === path.join(testDir, '.git')) return true;
        return fs.pathExists(p as string);
      });

      const result = await migrateToProfiles(testDir);

      expect(result.success).toBe(true);
      expect(result.profilesCreated).toContain('default-github');
      expect(result.errors).toHaveLength(0);
      expect(mockProfileManager.createProfile).toHaveBeenCalledWith(
        'default-github',
        expect.objectContaining({
          provider: 'github'
        })
      );
    });

    it('should handle dry run without making changes', async () => {
      // Setup old config
      await fs.writeFile(
        path.join(testDir, '.env'),
        'GITHUB_TOKEN=ghp_test123\n'
      );

      const result = await migrateToProfiles(testDir, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.profilesCreated).toContain('default-github');
      expect(mockProfileManager.createProfile).not.toHaveBeenCalled();
      expect(mockProjectManager.createProject).not.toHaveBeenCalled();
    });

    it('should handle multiple providers', async () => {
      // Setup multiple old configs
      await fs.writeFile(
        path.join(testDir, '.env'),
        `GITHUB_TOKEN=ghp_test123
JIRA_API_TOKEN=test_token
JIRA_EMAIL=user@example.com
JIRA_DOMAIN=example.atlassian.net
JIRA_PROJECT_KEY=TEST
AZURE_DEVOPS_PAT=test_pat
AZURE_DEVOPS_ORG=myorg
AZURE_DEVOPS_PROJECT=myproject`
      );

      const result = await migrateToProfiles(testDir);

      expect(result.success).toBe(true);
      expect(result.profilesCreated).toContain('default-github');
      expect(result.profilesCreated).toContain('default-jira');
      expect(result.profilesCreated).toContain('default-ado');
      expect(result.errors).toHaveLength(0);
    });

    it('should skip if already using profiles', async () => {
      // No old configuration exists
      const result = await migrateToProfiles(testDir);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('No old configuration detected. Already using profiles?');
      expect(result.profilesCreated).toHaveLength(0);
      expect(mockProfileManager.createProfile).not.toHaveBeenCalled();
    });

    it('should handle profile creation errors gracefully', async () => {
      // Setup old config
      await fs.writeFile(
        path.join(testDir, '.env'),
        'GITHUB_TOKEN=ghp_test123\n'
      );

      // Mock profile creation failure
      mockProfileManager.createProfile.mockRejectedValueOnce(
        new Error('Profile already exists')
      );

      const result = await migrateToProfiles(testDir);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('GitHub migration failed: Profile already exists');
    });

    it('should create project context', async () => {
      // Setup old config
      await fs.writeFile(
        path.join(testDir, '.env'),
        'GITHUB_TOKEN=ghp_test123\n'
      );

      const result = await migrateToProfiles(testDir);

      expect(result.success).toBe(true);
      expect(result.projectsCreated).toHaveLength(1);
      expect(mockProjectManager.createProject).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          name: expect.any(String),
          description: expect.any(String)
        })
      );
    });

    it('should backup configuration before migration', async () => {
      // Create existing config
      await fs.writeJSON(
        path.join(testDir, '.specweave/config.json'),
        { existing: 'config' }
      );

      // Setup old .env
      await fs.writeFile(
        path.join(testDir, '.env'),
        'GITHUB_TOKEN=ghp_test123\n'
      );

      await migrateToProfiles(testDir, { backupOldConfig: true });

      // Check backup was created
      const backupPath = path.join(testDir, '.specweave/config.json.backup');
      expect(await fs.pathExists(backupPath)).toBe(true);
    });

    it('should clean up old configuration after successful migration', async () => {
      // Create old config files
      await fs.writeFile(
        path.join(testDir, '.env'),
        'GITHUB_TOKEN=ghp_test123\n'
      );
      await fs.writeJSON(
        path.join(testDir, '.specweave/config.json'),
        {
          sync: {
            github: { owner: 'old', repo: 'config' }
          }
        }
      );

      const result = await migrateToProfiles(testDir, { cleanupOld: true });

      expect(result.success).toBe(true);

      // Check old config was cleaned
      const config = await fs.readJSON(path.join(testDir, '.specweave/config.json'));
      expect(config.sync?.github).toBeUndefined();
    });

    it('should handle verbose output', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      await fs.writeFile(
        path.join(testDir, '.env'),
        'GITHUB_TOKEN=ghp_test123\n'
      );

      await migrateToProfiles(testDir, { verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Detected old configuration'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Created GitHub profile'));

      consoleSpy.mockRestore();
    });
  });

  describe('cleanupOldConfiguration', () => {
    it('should remove old sync config from config.json', async () => {
      // Create config with old sync format
      await fs.writeJSON(
        path.join(testDir, '.specweave/config.json'),
        {
          sync: {
            github: { owner: 'old', repo: 'config' },
            enabled: true
          },
          otherConfig: 'keepThis'
        }
      );

      await cleanupOldConfiguration(testDir);

      // Check sync was removed but other config kept
      const config = await fs.readJSON(path.join(testDir, '.specweave/config.json'));
      expect(config.sync?.github).toBeUndefined();
      expect(config.sync?.enabled).toBeUndefined();
      expect(config.otherConfig).toBe('keepThis');
    });

    it('should handle missing config gracefully', async () => {
      await expect(cleanupOldConfiguration(testDir)).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle partial JIRA configuration', async () => {
      // JIRA config missing email
      await fs.writeFile(
        path.join(testDir, '.env'),
        `JIRA_API_TOKEN=test_token
JIRA_DOMAIN=example.atlassian.net
JIRA_PROJECT_KEY=TEST`
      );

      const config = await detectOldConfiguration(testDir);

      expect(config.detected).toBe(true);
      expect(config.jira).toEqual({
        domain: 'example.atlassian.net',
        projectKey: 'TEST',
        email: undefined
      });
    });

    it('should handle empty .env file', async () => {
      await fs.writeFile(path.join(testDir, '.env'), '');

      const config = await detectOldConfiguration(testDir);

      expect(config.detected).toBe(false);
    });

    it('should handle malformed .env file', async () => {
      await fs.writeFile(
        path.join(testDir, '.env'),
        'INVALID LINE WITHOUT EQUALS\nGITHUB_TOKEN=valid'
      );

      const config = await detectOldConfiguration(testDir);

      expect(config.detected).toBe(true);
      expect(config.github).toBeDefined();
    });

    it('should handle concurrent migrations safely', async () => {
      await fs.writeFile(
        path.join(testDir, '.env'),
        'GITHUB_TOKEN=ghp_test123\n'
      );

      // Run multiple migrations concurrently
      const results = await Promise.all([
        migrateToProfiles(testDir),
        migrateToProfiles(testDir),
        migrateToProfiles(testDir)
      ]);

      // At least one should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // Others should fail gracefully or detect already migrated
      const warnings = results.flatMap(r => r.warnings);
      expect(warnings.some(w => w.includes('Already using profiles'))).toBe(true);
    });

    it('should preserve .env variables not related to sync', async () => {
      // Create .env with mixed content
      await fs.writeFile(
        path.join(testDir, '.env'),
        `GITHUB_TOKEN=ghp_test123
OTHER_VAR=keep_this
NODE_ENV=production`
      );

      await migrateToProfiles(testDir, { cleanupOld: true });

      // Check .env still has non-sync variables
      const envContent = await fs.readFile(path.join(testDir, '.env'), 'utf-8');
      expect(envContent).toContain('OTHER_VAR=keep_this');
      expect(envContent).toContain('NODE_ENV=production');
      expect(envContent).toContain('GITHUB_TOKEN'); // Token should remain
    });
  });
});