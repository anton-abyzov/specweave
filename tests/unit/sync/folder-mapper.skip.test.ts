import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Tests for Folder Mapper
 *
 * Covers ADO multi-team and Jira multi-project/component folder mapping
 */

import { describe, it, expect } from 'vitest';
import {
  getSpecsFoldersForProfile,
  getAreaPathForTeam,
  generateAreaPaths,
  getFolderNameFromAreaPath,
  getTeamFromFolder,
} from '../../../src/core/sync/folder-mapper.js';
import { SyncProfile } from '../../../src/core/types/sync-profile.js';

describe('Folder Mapper - ADO', () => {
  describe('Multi-Team Folders', () => {
    it('should generate folders for multiple teams', () => {
      const profile: SyncProfile = {
        provider: 'ado',
        displayName: 'League Scheduler',
        config: {
          organization: 'easychamp',
          project: 'League Scheduler',
          teams: ['League Scheduler Team', 'Platform Engineering Team', 'QA Team'],
        },
        timeRange: { default: '1M', max: '6M' },
      };

      const folders = getSpecsFoldersForProfile(profile);

      expect(folders).toEqual([
        '.specweave/docs/internal/specs/league-scheduler-team',
        '.specweave/docs/internal/specs/platform-engineering-team',
        '.specweave/docs/internal/specs/qa-team',
      ]);
    });

    it('should generate single folder for project without teams', () => {
      const profile: SyncProfile = {
        provider: 'ado',
        displayName: 'Single Project',
        config: {
          organization: 'easychamp',
          project: 'League Scheduler',
          // No teams array
        },
        timeRange: { default: '1M', max: '6M' },
      };

      const folders = getSpecsFoldersForProfile(profile);

      expect(folders).toEqual([
        '.specweave/docs/internal/specs/league-scheduler',
      ]);
    });
  });

  describe('Area Path Generation', () => {
    it('should generate area path for regular team', () => {
      const areaPath = getAreaPathForTeam('League Scheduler', 'Platform Engineering Team');

      expect(areaPath).toBe('League Scheduler\\Platform Engineering Team');
    });

    it('should use project name for default team', () => {
      const areaPath = getAreaPathForTeam('League Scheduler', 'League Scheduler Team');

      expect(areaPath).toBe('League Scheduler');
    });

    it('should generate area paths map for multiple teams', () => {
      const areaPaths = generateAreaPaths('League Scheduler', [
        'League Scheduler Team',
        'Platform Engineering Team',
        'QA Team',
      ]);

      expect(areaPaths).toEqual({
        'league-scheduler-team': 'League Scheduler',
        'platform-engineering-team': 'League Scheduler\\Platform Engineering Team',
        'qa-team': 'League Scheduler\\QA Team',
      });
    });
  });

  describe('Area Path Reverse Mapping', () => {
    it('should extract folder name from area path', () => {
      const folderName = getFolderNameFromAreaPath('League Scheduler\\Platform Engineering Team');

      expect(folderName).toBe('platform-engineering-team');
    });

    it('should handle project-only area path', () => {
      const folderName = getFolderNameFromAreaPath('League Scheduler');

      expect(folderName).toBe('league-scheduler');
    });
  });

  describe('Team Lookup', () => {
    it('should find team from folder name', () => {
      const profile: SyncProfile = {
        provider: 'ado',
        displayName: 'League Scheduler',
        config: {
          organization: 'easychamp',
          project: 'League Scheduler',
          teams: ['Platform Engineering Team', 'QA Team'],
        },
        timeRange: { default: '1M', max: '6M' },
      };

      const team = getTeamFromFolder(profile, 'platform-engineering-team');

      expect(team).toBe('Platform Engineering Team');
    });

    it('should return null for unknown folder', () => {
      const profile: SyncProfile = {
        provider: 'ado',
        displayName: 'League Scheduler',
        config: {
          organization: 'easychamp',
          project: 'League Scheduler',
          teams: ['Platform Engineering Team'],
        },
        timeRange: { default: '1M', max: '6M' },
      };

      const team = getTeamFromFolder(profile, 'unknown-team');

      expect(team).toBeNull();
    });
  });
});

describe('Folder Mapper - Jira', () => {
  describe('Strategy 1: Project per Team', () => {
    it('should generate folders for multiple projects', () => {
      const profile: SyncProfile = {
        provider: 'jira',
        displayName: 'Multi-Team Jira',
        config: {
          domain: 'mycompany.atlassian.net',
          strategy: 'project-per-team',
          projects: ['FRONTEND', 'BACKEND', 'QA'],
        },
        timeRange: { default: '2W', max: '3M' },
      };

      const folders = getSpecsFoldersForProfile(profile);

      expect(folders).toEqual([
        '.specweave/docs/internal/specs/frontend',
        '.specweave/docs/internal/specs/backend',
        '.specweave/docs/internal/specs/qa',
      ]);
    });

    it('should find project from folder name', () => {
      const profile: SyncProfile = {
        provider: 'jira',
        displayName: 'Multi-Team Jira',
        config: {
          domain: 'mycompany.atlassian.net',
          strategy: 'project-per-team',
          projects: ['FRONTEND', 'BACKEND', 'QA'],
        },
        timeRange: { default: '2W', max: '3M' },
      };

      const project = getTeamFromFolder(profile, 'frontend');

      expect(project).toBe('FRONTEND');
    });
  });

  describe('Strategy 2: Shared Project with Components', () => {
    it('should generate folders for multiple components', () => {
      const profile: SyncProfile = {
        provider: 'jira',
        displayName: 'Product Development',
        config: {
          domain: 'mycompany.atlassian.net',
          strategy: 'shared-project-with-components',
          projectKey: 'PRODUCT',
          components: ['Frontend', 'Backend', 'Infrastructure'],
        },
        timeRange: { default: '1M', max: '6M' },
      };

      const folders = getSpecsFoldersForProfile(profile);

      expect(folders).toEqual([
        '.specweave/docs/internal/specs/frontend',
        '.specweave/docs/internal/specs/backend',
        '.specweave/docs/internal/specs/infrastructure',
      ]);
    });

    it('should find component from folder name', () => {
      const profile: SyncProfile = {
        provider: 'jira',
        displayName: 'Product Development',
        config: {
          domain: 'mycompany.atlassian.net',
          strategy: 'shared-project-with-components',
          projectKey: 'PRODUCT',
          components: ['Frontend', 'Backend'],
        },
        timeRange: { default: '1M', max: '6M' },
      };

      const component = getTeamFromFolder(profile, 'frontend');

      expect(component).toBe('Frontend');
    });

    it('should return null for unknown component', () => {
      const profile: SyncProfile = {
        provider: 'jira',
        displayName: 'Product Development',
        config: {
          domain: 'mycompany.atlassian.net',
          strategy: 'shared-project-with-components',
          projectKey: 'PRODUCT',
          components: ['Frontend'],
        },
        timeRange: { default: '1M', max: '6M' },
      };

      const component = getTeamFromFolder(profile, 'backend');

      expect(component).toBeNull();
    });
  });

  describe('Fallback (no strategy)', () => {
    it('should generate single folder for single project', () => {
      const profile: SyncProfile = {
        provider: 'jira',
        displayName: 'Simple Jira',
        config: {
          domain: 'mycompany.atlassian.net',
          strategy: 'project-per-team',  // But no projects array
          projectKey: 'PRODUCT',
        } as any,
        timeRange: { default: '1M', max: '6M' },
      };

      const folders = getSpecsFoldersForProfile(profile);

      expect(folders).toEqual([
        '.specweave/docs/internal/specs/product',
      ]);
    });
  });
});

describe('Folder Mapper - GitHub', () => {
  it('should generate folder from repo name', () => {
    const profile: SyncProfile = {
      provider: 'github',
      displayName: 'SpecWeave Development',
      config: {
        owner: 'anton-abyzov',
        repo: 'specweave',
      },
      timeRange: { default: '1M', max: '6M' },
    };

    const folders = getSpecsFoldersForProfile(profile);

    expect(folders).toEqual([
      '.specweave/docs/internal/specs/specweave',
    ]);
  });

  it('should handle repo names with special characters', () => {
    const profile: SyncProfile = {
      provider: 'github',
      displayName: 'My React App',
      config: {
        owner: 'myorg',
        repo: 'my-react-app.js',
      },
      timeRange: { default: '1M', max: '6M' },
    };

    const folders = getSpecsFoldersForProfile(profile);

    expect(folders).toEqual([
      '.specweave/docs/internal/specs/my-react-appjs',
    ]);
  });
});

describe('Folder Mapper - Edge Cases', () => {
  it('should handle team names with special characters', () => {
    const profile: SyncProfile = {
      provider: 'ado',
      displayName: 'Special Teams',
      config: {
        organization: 'myorg',
        project: 'MyProject',
        teams: ['Team (Alpha)', 'Team_Beta', 'Team-Gamma'],
      },
      timeRange: { default: '1M', max: '6M' },
    };

    const folders = getSpecsFoldersForProfile(profile);

    expect(folders).toEqual([
      '.specweave/docs/internal/specs/team-alpha',
      '.specweave/docs/internal/specs/team_beta',
      '.specweave/docs/internal/specs/team-gamma',
    ]);
  });

  it('should handle component names with spaces', () => {
    const profile: SyncProfile = {
      provider: 'jira',
      displayName: 'Product',
      config: {
        domain: 'mycompany.atlassian.net',
        strategy: 'shared-project-with-components',
        projectKey: 'PRODUCT',
        components: ['Frontend Web', 'Backend API', 'Mobile App'],
      },
      timeRange: { default: '1M', max: '6M' },
    };

    const folders = getSpecsFoldersForProfile(profile);

    expect(folders).toEqual([
      '.specweave/docs/internal/specs/frontend-web',
      '.specweave/docs/internal/specs/backend-api',
      '.specweave/docs/internal/specs/mobile-app',
    ]);
  });

  it('should handle empty teams array gracefully', () => {
    const profile: SyncProfile = {
      provider: 'ado',
      displayName: 'Empty Teams',
      config: {
        organization: 'myorg',
        project: 'MyProject',
        teams: [],  // Empty array
      },
      timeRange: { default: '1M', max: '6M' },
    };

    const folders = getSpecsFoldersForProfile(profile);

    // Should fall back to single project folder
    expect(folders).toEqual([
      '.specweave/docs/internal/specs/myproject',
    ]);
  });
});
