import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests: ProfileManager
 *
 * Tests for multi-project sync profile management.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { ProfileManager } from '../../../src/core/sync/profile-manager.js';
import { SyncProfile } from '../../../src/core/types/sync-profile.js';

describe('ProfileManager', () => {
  let tempDir: string;
  let profileManager: ProfileManager;

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = path.join(os.tmpdir(), `specweave-test-${Date.now()}`);
    await fs.ensureDir(path.join(tempDir, '.specweave'));

    profileManager = new ProfileManager(tempDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
  });

  describe('createProfile', () => {
    it('should create a valid GitHub profile', async () => {
      const profile: SyncProfile = {
        provider: 'github',
        displayName: 'Test Repo',
        config: {
          owner: 'testorg',
          repo: 'testrepo',
        },
        timeRange: {
          default: '1M',
          max: '6M',
        },
      };

      await profileManager.createProfile('test-profile', profile);

      const retrieved = await profileManager.getProfile('test-profile');
      expect(retrieved).toBeDefined();
      expect(retrieved?.provider).toBe('github');
      expect(retrieved?.displayName).toBe('Test Repo');
    });

    it('should create a valid JIRA profile', async () => {
      const profile: SyncProfile = {
        provider: 'jira',
        displayName: 'JIRA Project',
        config: {
          domain: 'test.atlassian.net',
          projectKey: 'TEST',
          issueType: 'Epic',
        },
        timeRange: {
          default: '2W',
          max: '3M',
        },
      };

      await profileManager.createProfile('jira-profile', profile);

      const retrieved = await profileManager.getProfile('jira-profile');
      expect(retrieved).toBeDefined();
      expect(retrieved?.provider).toBe('jira');
    });

    it('should create a valid ADO profile', async () => {
      const profile: SyncProfile = {
        provider: 'ado',
        displayName: 'ADO Project',
        config: {
          organization: 'testorg',
          project: 'TestProject',
          workItemType: 'Epic',
        },
        timeRange: {
          default: '1M',
          max: '12M',
        },
      };

      await profileManager.createProfile('ado-profile', profile);

      const retrieved = await profileManager.getProfile('ado-profile');
      expect(retrieved).toBeDefined();
      expect(retrieved?.provider).toBe('ado');
    });

    it('should reject profile with invalid ID format', async () => {
      const profile: SyncProfile = {
        provider: 'github',
        displayName: 'Test',
        config: { owner: 'test', repo: 'test' },
        timeRange: { default: '1M', max: '6M' },
      };

      await expect(
        profileManager.createProfile('Invalid_ID', profile)
      ).rejects.toThrow('only lowercase letters');
    });

    it('should reject duplicate profile IDs', async () => {
      const profile: SyncProfile = {
        provider: 'github',
        displayName: 'Test',
        config: { owner: 'test', repo: 'test' },
        timeRange: { default: '1M', max: '6M' },
      };

      await profileManager.createProfile('duplicate', profile);

      await expect(
        profileManager.createProfile('duplicate', profile)
      ).rejects.toThrow('already exists');
    });

    it('should set first profile as active', async () => {
      const profile: SyncProfile = {
        provider: 'github',
        displayName: 'First Profile',
        config: { owner: 'test', repo: 'test' },
        timeRange: { default: '1M', max: '6M' },
      };

      await profileManager.createProfile('first', profile);

      const active = await profileManager.getActiveProfile();
      expect(active).toBeDefined();
      expect(active?.id).toBe('first');
    });
  });

  describe('getProfile', () => {
    it('should return null for non-existent profile', async () => {
      const profile = await profileManager.getProfile('nonexistent');
      expect(profile).toBeNull();
    });

    it('should retrieve existing profile', async () => {
      const created: SyncProfile = {
        provider: 'github',
        displayName: 'Test',
        config: { owner: 'test', repo: 'test' },
        timeRange: { default: '1M', max: '6M' },
      };

      await profileManager.createProfile('test', created);

      const retrieved = await profileManager.getProfile('test');
      expect(retrieved).toEqual(created);
    });
  });

  describe('getAllProfiles', () => {
    it('should return empty object when no profiles exist', async () => {
      const profiles = await profileManager.getAllProfiles();
      expect(profiles).toEqual({});
    });

    it('should return all created profiles', async () => {
      const profile1: SyncProfile = {
        provider: 'github',
        displayName: 'Profile 1',
        config: { owner: 'test1', repo: 'test1' },
        timeRange: { default: '1M', max: '6M' },
      };

      const profile2: SyncProfile = {
        provider: 'jira',
        displayName: 'Profile 2',
        config: { domain: 'test.atlassian.net', projectKey: 'TEST' },
        timeRange: { default: '2W', max: '3M' },
      };

      await profileManager.createProfile('profile1', profile1);
      await profileManager.createProfile('profile2', profile2);

      const all = await profileManager.getAllProfiles();
      expect(Object.keys(all)).toHaveLength(2);
      expect(all['profile1']).toBeDefined();
      expect(all['profile2']).toBeDefined();
    });
  });

  describe('updateProfile', () => {
    it('should update existing profile', async () => {
      const original: SyncProfile = {
        provider: 'github',
        displayName: 'Original Name',
        config: { owner: 'test', repo: 'test' },
        timeRange: { default: '1M', max: '6M' },
      };

      await profileManager.createProfile('test', original);

      await profileManager.updateProfile('test', {
        displayName: 'Updated Name',
      });

      const updated = await profileManager.getProfile('test');
      expect(updated?.displayName).toBe('Updated Name');
      expect(updated?.provider).toBe('github'); // Unchanged
    });

    it('should reject update to non-existent profile', async () => {
      await expect(
        profileManager.updateProfile('nonexistent', { displayName: 'Test' })
      ).rejects.toThrow('does not exist');
    });
  });

  describe('deleteProfile', () => {
    it('should delete existing profile', async () => {
      const profile: SyncProfile = {
        provider: 'github',
        displayName: 'Test',
        config: { owner: 'test', repo: 'test' },
        timeRange: { default: '1M', max: '6M' },
      };

      await profileManager.createProfile('test', profile);
      await profileManager.deleteProfile('test');

      const retrieved = await profileManager.getProfile('test');
      expect(retrieved).toBeNull();
    });

    it('should update active profile when deleting active', async () => {
      const profile1: SyncProfile = {
        provider: 'github',
        displayName: 'Profile 1',
        config: { owner: 'test1', repo: 'test1' },
        timeRange: { default: '1M', max: '6M' },
      };

      const profile2: SyncProfile = {
        provider: 'github',
        displayName: 'Profile 2',
        config: { owner: 'test2', repo: 'test2' },
        timeRange: { default: '1M', max: '6M' },
      };

      await profileManager.createProfile('profile1', profile1);
      await profileManager.createProfile('profile2', profile2);

      // profile1 is active (first created)
      await profileManager.deleteProfile('profile1');

      const active = await profileManager.getActiveProfile();
      expect(active?.id).toBe('profile2'); // Switched to next available
    });

    it('should reject delete of non-existent profile', async () => {
      await expect(
        profileManager.deleteProfile('nonexistent')
      ).rejects.toThrow('does not exist');
    });
  });

  describe('getProfilesByProvider', () => {
    it('should return only profiles for specified provider', async () => {
      const github1: SyncProfile = {
        provider: 'github',
        displayName: 'GitHub 1',
        config: { owner: 'test1', repo: 'test1' },
        timeRange: { default: '1M', max: '6M' },
      };

      const github2: SyncProfile = {
        provider: 'github',
        displayName: 'GitHub 2',
        config: { owner: 'test2', repo: 'test2' },
        timeRange: { default: '1M', max: '6M' },
      };

      const jira: SyncProfile = {
        provider: 'jira',
        displayName: 'JIRA',
        config: { domain: 'test.atlassian.net', projectKey: 'TEST' },
        timeRange: { default: '2W', max: '3M' },
      };

      await profileManager.createProfile('github1', github1);
      await profileManager.createProfile('github2', github2);
      await profileManager.createProfile('jira', jira);

      const githubProfiles = await profileManager.getProfilesByProvider('github');
      expect(Object.keys(githubProfiles)).toHaveLength(2);
      expect(githubProfiles['github1']).toBeDefined();
      expect(githubProfiles['github2']).toBeDefined();
    });
  });

  describe('validateProfile', () => {
    it('should validate GitHub profile successfully', () => {
      const profile: SyncProfile = {
        provider: 'github',
        displayName: 'Test',
        config: { owner: 'test', repo: 'test' },
        timeRange: { default: '1M', max: '6M' },
      };

      const result = profileManager.validateProfile(profile);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing provider', () => {
      const profile: any = {
        displayName: 'Test',
        config: { owner: 'test', repo: 'test' },
        timeRange: { default: '1M', max: '6M' },
      };

      const result = profileManager.validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Provider is required');
    });

    it('should detect invalid provider', () => {
      const profile: any = {
        provider: 'invalid',
        displayName: 'Test',
        config: {},
        timeRange: { default: '1M', max: '6M' },
      };

      const result = profileManager.validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid provider'))).toBe(true);
    });

    it('should detect missing displayName', () => {
      const profile: any = {
        provider: 'github',
        config: { owner: 'test', repo: 'test' },
        timeRange: { default: '1M', max: '6M' },
      };

      const result = profileManager.validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Display name is required');
    });

    it('should detect missing GitHub config fields', () => {
      const profile: any = {
        provider: 'github',
        displayName: 'Test',
        config: { owner: 'test' }, // Missing repo
        timeRange: { default: '1M', max: '6M' },
      };

      const result = profileManager.validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('GitHub repo is required');
    });

    it('should detect missing JIRA config fields', () => {
      const profile: any = {
        provider: 'jira',
        displayName: 'Test',
        config: { domain: 'test.atlassian.net' }, // Missing projectKey
        timeRange: { default: '1M', max: '6M' },
      };

      const result = profileManager.validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('JIRA project key is required');
    });

    it('should warn when default exceeds max time range', () => {
      const profile: SyncProfile = {
        provider: 'github',
        displayName: 'Test',
        config: { owner: 'test', repo: 'test' },
        timeRange: { default: '6M', max: '1M' }, // Invalid: default > max
      };

      const result = profileManager.validateProfile(profile);
      expect(result.warnings?.length).toBeGreaterThan(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const github1: SyncProfile = {
        provider: 'github',
        displayName: 'GitHub 1',
        config: { owner: 'test1', repo: 'test1' },
        timeRange: { default: '1M', max: '6M' },
      };

      const github2: SyncProfile = {
        provider: 'github',
        displayName: 'GitHub 2',
        config: { owner: 'test2', repo: 'test2' },
        timeRange: { default: '1M', max: '6M' },
      };

      const jira: SyncProfile = {
        provider: 'jira',
        displayName: 'JIRA',
        config: { domain: 'test.atlassian.net', projectKey: 'TEST' },
        timeRange: { default: '2W', max: '3M' },
      };

      const ado: SyncProfile = {
        provider: 'ado',
        displayName: 'ADO',
        config: { organization: 'test', project: 'Test' },
        timeRange: { default: '1M', max: '12M' },
      };

      await profileManager.createProfile('github1', github1);
      await profileManager.createProfile('github2', github2);
      await profileManager.createProfile('jira', jira);
      await profileManager.createProfile('ado', ado);

      const stats = await profileManager.getStats();

      expect(stats.totalProfiles).toBe(4);
      expect(stats.byProvider.github).toBe(2);
      expect(stats.byProvider.jira).toBe(1);
      expect(stats.byProvider.ado).toBe(1);
      expect(stats.activeProfile).toBe('github1'); // First created
    });
  });

  describe('setActiveProfile', () => {
    it('should set active profile', async () => {
      const profile1: SyncProfile = {
        provider: 'github',
        displayName: 'Profile 1',
        config: { owner: 'test1', repo: 'test1' },
        timeRange: { default: '1M', max: '6M' },
      };

      const profile2: SyncProfile = {
        provider: 'github',
        displayName: 'Profile 2',
        config: { owner: 'test2', repo: 'test2' },
        timeRange: { default: '1M', max: '6M' },
      };

      await profileManager.createProfile('profile1', profile1);
      await profileManager.createProfile('profile2', profile2);

      await profileManager.setActiveProfile('profile2');

      const active = await profileManager.getActiveProfile();
      expect(active?.id).toBe('profile2');
    });

    it('should reject setting non-existent profile as active', async () => {
      await expect(
        profileManager.setActiveProfile('nonexistent')
      ).rejects.toThrow('does not exist');
    });
  });
});
