/**
 * Unit tests for GitHub Profile Manager
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { GitHubProfileManager } from '../../../src/cli/helpers/github/profile-manager';

// Mock fs module
jest.mock('fs');

describe('GitHub Profile Manager', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const testProjectPath = '/test/project';
  const configPath = path.join(testProjectPath, '.specweave', 'config.json');
  let manager: GitHubProfileManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Profile CRUD Operations', () => {
    beforeEach(() => {
      // Mock initial config
      const initialConfig = {
        project: { name: 'test-project', version: '0.1.0' },
        sync: {
          enabled: false,
          activeProfile: '',
          profiles: {}
        }
      };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(initialConfig));
      mockFs.writeFileSync.mockImplementation(() => {});
      mockFs.mkdirSync.mockImplementation(() => '' as any);

      manager = new GitHubProfileManager(testProjectPath);
    });

    it('should add a new profile', () => {
      const profile = {
        id: 'frontend',
        displayName: 'Frontend App',
        config: {
          owner: 'myorg',
          repo: 'frontend-app'
        }
      };

      const result = manager.addProfile(profile);
      expect(result).toBe(true);

      // Verify writeFileSync was called with correct data
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        configPath,
        expect.stringContaining('"frontend"')
      );
    });

    it('should not add duplicate profile ID', () => {
      const profile1 = {
        id: 'frontend',
        displayName: 'Frontend App',
        config: {
          owner: 'myorg',
          repo: 'frontend-app'
        }
      };

      // Add first profile
      manager.addProfile(profile1);

      // Try to add duplicate
      const profile2 = {
        id: 'frontend',  // Same ID
        displayName: 'Different App',
        config: {
          owner: 'otherorg',
          repo: 'other-app'
        }
      };

      const result = manager.addProfile(profile2);
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Profile with ID 'frontend' already exists")
      );
    });

    it('should get all profiles', () => {
      // Mock config with multiple profiles
      const configWithProfiles = {
        sync: {
          enabled: true,
          activeProfile: 'frontend',
          profiles: {
            'frontend': {
              provider: 'github',
              displayName: 'Frontend App',
              config: { owner: 'myorg', repo: 'frontend-app' }
            },
            'backend': {
              provider: 'github',
              displayName: 'Backend API',
              config: { owner: 'myorg', repo: 'backend-api' }
            },
            'jira-default': {
              provider: 'jira',  // Non-GitHub profile
              displayName: 'Jira',
              config: { domain: 'example.atlassian.net' }
            }
          }
        }
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(configWithProfiles));
      manager = new GitHubProfileManager(testProjectPath);

      const profiles = manager.getAllProfiles();
      expect(profiles).toHaveLength(2);  // Only GitHub profiles
      expect(profiles[0].id).toBe('frontend');
      expect(profiles[1].id).toBe('backend');
    });

    it('should get a specific profile by ID', () => {
      const configWithProfiles = {
        sync: {
          enabled: true,
          activeProfile: 'frontend',
          profiles: {
            'frontend': {
              provider: 'github',
              displayName: 'Frontend App',
              config: { owner: 'myorg', repo: 'frontend-app' }
            }
          }
        }
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(configWithProfiles));
      manager = new GitHubProfileManager(testProjectPath);

      const profile = manager.getProfile('frontend');
      expect(profile).not.toBeNull();
      expect(profile?.displayName).toBe('Frontend App');
    });

    it('should return null for non-existent profile', () => {
      manager = new GitHubProfileManager(testProjectPath);
      const profile = manager.getProfile('non-existent');
      expect(profile).toBeNull();
    });

    it('should update an existing profile', () => {
      const configWithProfile = {
        sync: {
          enabled: true,
          activeProfile: 'frontend',
          profiles: {
            'frontend': {
              provider: 'github',
              displayName: 'Frontend App',
              config: { owner: 'myorg', repo: 'frontend-app' }
            }
          }
        }
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(configWithProfile));
      manager = new GitHubProfileManager(testProjectPath);

      const updates = {
        displayName: 'Updated Frontend',
        config: {
          owner: 'neworg',
          repo: 'new-frontend'
        }
      };

      const result = manager.updateProfile('frontend', updates);
      expect(result).toBe(true);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        configPath,
        expect.stringContaining('"Updated Frontend"')
      );
    });

    it('should delete a profile', () => {
      const configWithProfiles = {
        sync: {
          enabled: true,
          activeProfile: 'frontend',
          profiles: {
            'frontend': {
              provider: 'github',
              displayName: 'Frontend App',
              config: { owner: 'myorg', repo: 'frontend-app' }
            },
            'backend': {
              provider: 'github',
              displayName: 'Backend API',
              config: { owner: 'myorg', repo: 'backend-api' }
            }
          }
        }
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(configWithProfiles));
      manager = new GitHubProfileManager(testProjectPath);

      const result = manager.deleteProfile('backend');
      expect(result).toBe(true);

      // Should update active profile when deleting the active one
      const deleteActiveResult = manager.deleteProfile('frontend');
      expect(deleteActiveResult).toBe(true);
    });

    it('should set active profile', () => {
      const configWithProfiles = {
        sync: {
          enabled: true,
          activeProfile: 'frontend',
          profiles: {
            'frontend': {
              provider: 'github',
              displayName: 'Frontend App',
              config: { owner: 'myorg', repo: 'frontend-app' }
            },
            'backend': {
              provider: 'github',
              displayName: 'Backend API',
              config: { owner: 'myorg', repo: 'backend-api' }
            }
          }
        }
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(configWithProfiles));
      manager = new GitHubProfileManager(testProjectPath);

      const result = manager.setActiveProfile('backend');
      expect(result).toBe(true);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        configPath,
        expect.stringContaining('"activeProfile": "backend"')
      );
    });
  });

  describe('Profile Queries', () => {
    beforeEach(() => {
      const configWithProfiles = {
        sync: {
          enabled: true,
          activeProfile: 'frontend',
          profiles: {
            'frontend': {
              provider: 'github',
              displayName: 'Frontend App',
              config: { owner: 'myorg', repo: 'frontend-app' }
            },
            'backend': {
              provider: 'github',
              displayName: 'Backend API',
              config: { owner: 'myorg', repo: 'backend-api' }
            }
          }
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configWithProfiles));
      mockFs.writeFileSync.mockImplementation(() => {});

      manager = new GitHubProfileManager(testProjectPath);
    });

    it('should check if profiles exist', () => {
      expect(manager.hasProfiles()).toBe(true);
    });

    it('should get profile count', () => {
      expect(manager.getProfileCount()).toBe(2);
    });

    it('should get active profile', () => {
      const activeProfile = manager.getActiveProfile();
      expect(activeProfile).not.toBeNull();
      expect(activeProfile?.id).toBe('frontend');
    });

    it('should return first profile when no active profile set', () => {
      const configNoActive = {
        sync: {
          enabled: true,
          activeProfile: '',  // No active profile
          profiles: {
            'backend': {
              provider: 'github',
              displayName: 'Backend API',
              config: { owner: 'myorg', repo: 'backend-api' }
            }
          }
        }
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(configNoActive));
      manager = new GitHubProfileManager(testProjectPath);

      const activeProfile = manager.getActiveProfile();
      expect(activeProfile).not.toBeNull();
      expect(activeProfile?.id).toBe('backend');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing config file gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);
      manager = new GitHubProfileManager(testProjectPath);

      const profiles = manager.getAllProfiles();
      expect(profiles).toHaveLength(0);
    });

    it('should handle corrupted config file', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json {');

      manager = new GitHubProfileManager(testProjectPath);
      const profiles = manager.getAllProfiles();
      expect(profiles).toHaveLength(0);
    });

    it('should handle write errors', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{}');
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      manager = new GitHubProfileManager(testProjectPath);
      const result = manager.addProfile({
        id: 'test',
        displayName: 'Test',
        config: { owner: 'test', repo: 'test' }
      });

      expect(result).toBe(false);
    });
  });
});