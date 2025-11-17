import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Tests for Sync Profile Validator
 *
 * Covers ADO multi-team and Jira multi-project/component validation
 */

import { describe, it, expect } from 'vitest';
import {
  validateJiraConfig,
  validateAdoConfig,
  validateGitHubConfig,
  validateSyncProfile,
} from '../../../src/core/sync/profile-validator.js';
import {
  JiraConfig,
  AdoConfig,
  GitHubConfig,
  SyncProfile,
} from '../../../src/core/types/sync-profile.js';

describe('Jira Profile Validator', () => {
  describe('Strategy 1: Project per Team', () => {
    it('should validate valid project-per-team config', () => {
      const config: JiraConfig = {
        domain: 'mycompany.atlassian.net',
        strategy: 'project-per-team',
        projects: ['FRONTEND', 'BACKEND', 'QA'],
      };

      const result = validateJiraConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing projects array', () => {
      const config: JiraConfig = {
        domain: 'mycompany.atlassian.net',
        strategy: 'project-per-team',
        // Missing projects
      };

      const result = validateJiraConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('projects[] is required for project-per-team strategy');
    });

    it('should reject invalid project keys (lowercase)', () => {
      const config: JiraConfig = {
        domain: 'mycompany.atlassian.net',
        strategy: 'project-per-team',
        projects: ['frontend', 'BACKEND'],  // 'frontend' is invalid
      };

      const result = validateJiraConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid Jira project keys'))).toBe(true);
    });

    it('should reject projectKey with project-per-team strategy', () => {
      const config: JiraConfig = {
        domain: 'mycompany.atlassian.net',
        strategy: 'project-per-team',
        projects: ['FRONTEND', 'BACKEND'],
        projectKey: 'PRODUCT',  // Not allowed
      };

      const result = validateJiraConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('projectKey is not allowed'))).toBe(true);
    });

    it('should reject components with project-per-team strategy', () => {
      const config: JiraConfig = {
        domain: 'mycompany.atlassian.net',
        strategy: 'project-per-team',
        projects: ['FRONTEND', 'BACKEND'],
        components: ['Comp A'],  // Not allowed
      };

      const result = validateJiraConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('components[] is not allowed'))).toBe(true);
    });
  });

  describe('Strategy 2: Shared Project with Components', () => {
    it('should validate valid shared-project-with-components config', () => {
      const config: JiraConfig = {
        domain: 'mycompany.atlassian.net',
        strategy: 'shared-project-with-components',
        projectKey: 'PRODUCT',
        components: ['Frontend', 'Backend', 'QA'],
      };

      const result = validateJiraConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing projectKey', () => {
      const config: JiraConfig = {
        domain: 'mycompany.atlassian.net',
        strategy: 'shared-project-with-components',
        components: ['Frontend', 'Backend'],
        // Missing projectKey
      };

      const result = validateJiraConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('projectKey is required for shared-project-with-components strategy');
    });

    it('should reject missing components array', () => {
      const config: JiraConfig = {
        domain: 'mycompany.atlassian.net',
        strategy: 'shared-project-with-components',
        projectKey: 'PRODUCT',
        // Missing components
      };

      const result = validateJiraConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('components[] is required for shared-project-with-components strategy');
    });

    it('should reject projects with shared-project-with-components strategy', () => {
      const config: JiraConfig = {
        domain: 'mycompany.atlassian.net',
        strategy: 'shared-project-with-components',
        projectKey: 'PRODUCT',
        components: ['Frontend'],
        projects: ['FRONTEND'],  // Not allowed
      };

      const result = validateJiraConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('projects[] is not allowed'))).toBe(true);
    });

    it('should reject empty component names', () => {
      const config: JiraConfig = {
        domain: 'mycompany.atlassian.net',
        strategy: 'shared-project-with-components',
        projectKey: 'PRODUCT',
        components: ['Frontend', '', 'Backend'],  // Empty string
      };

      const result = validateJiraConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Component names cannot be empty');
    });
  });

  describe('Common Validation', () => {
    it('should reject missing domain', () => {
      const config: JiraConfig = {
        domain: '',
        strategy: 'project-per-team',
        projects: ['FRONTEND'],
      };

      const result = validateJiraConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Jira domain is required');
    });

    it('should reject missing strategy', () => {
      const config: any = {
        domain: 'mycompany.atlassian.net',
        // Missing strategy
      };

      const result = validateJiraConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('strategy is required'))).toBe(true);
    });
  });
});

describe('ADO Profile Validator', () => {
  describe('Multi-Team Config', () => {
    it('should validate valid multi-team config', () => {
      const config: AdoConfig = {
        organization: 'easychamp',
        project: 'League Scheduler',
        teams: ['League Scheduler Team', 'Platform Engineering Team', 'QA Team'],
      };

      const result = validateAdoConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate single-team config (no teams array)', () => {
      const config: AdoConfig = {
        organization: 'easychamp',
        project: 'League Scheduler',
        // No teams array = single project mode
      };

      const result = validateAdoConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty team names', () => {
      const config: AdoConfig = {
        organization: 'easychamp',
        project: 'League Scheduler',
        teams: ['Team A', '', 'Team B'],  // Empty string
      };

      const result = validateAdoConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Team names cannot be empty');
    });

    it('should reject duplicate team names', () => {
      const config: AdoConfig = {
        organization: 'easychamp',
        project: 'League Scheduler',
        teams: ['Team A', 'Team B', 'Team A'],  // Duplicate
      };

      const result = validateAdoConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate team names detected');
    });

    it('should warn for large number of teams', () => {
      const teams = Array.from({ length: 25 }, (_, i) => `Team ${i + 1}`);
      const config: AdoConfig = {
        organization: 'easychamp',
        project: 'League Scheduler',
        teams,
      };

      const result = validateAdoConfig(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some(w => w.includes('Large number of teams'))).toBe(true);
    });
  });

  describe('Area Paths Validation', () => {
    it('should warn if team missing area path', () => {
      const config: AdoConfig = {
        organization: 'easychamp',
        project: 'League Scheduler',
        teams: ['Team A', 'Team B'],
        areaPaths: {
          'team-a': 'League Scheduler\\Team A',
          // Missing team-b
        },
      };

      const result = validateAdoConfig(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some(w => w.includes('Missing Area Path for team folder "team-b"'))).toBe(true);
    });

    it('should warn for extra area paths not matching teams', () => {
      const config: AdoConfig = {
        organization: 'easychamp',
        project: 'League Scheduler',
        teams: ['Team A'],
        areaPaths: {
          'team-a': 'League Scheduler\\Team A',
          'team-b': 'League Scheduler\\Team B',  // No matching team
        },
      };

      const result = validateAdoConfig(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some(w => w.includes('does not match any team'))).toBe(true);
    });
  });

  describe('Required Fields', () => {
    it('should reject missing organization', () => {
      const config: AdoConfig = {
        organization: '',
        project: 'League Scheduler',
      };

      const result = validateAdoConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ADO organization is required');
    });

    it('should reject missing project', () => {
      const config: AdoConfig = {
        organization: 'easychamp',
        project: '',
      };

      const result = validateAdoConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ADO project is required');
    });
  });
});

describe('GitHub Profile Validator', () => {
  it('should validate valid GitHub config', () => {
    const config: GitHubConfig = {
      owner: 'anton-abyzov',
      repo: 'specweave',
    };

    const result = validateGitHubConfig(config);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject missing owner', () => {
    const config: GitHubConfig = {
      owner: '',
      repo: 'specweave',
    };

    const result = validateGitHubConfig(config);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('GitHub owner is required');
  });

  it('should reject missing repo', () => {
    const config: GitHubConfig = {
      owner: 'anton-abyzov',
      repo: '',
    };

    const result = validateGitHubConfig(config);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('GitHub repo is required');
  });
});

describe('Full Profile Validator', () => {
  it('should validate ADO profile with teams', () => {
    const profile: SyncProfile = {
      provider: 'ado',
      displayName: 'League Scheduler Development',
      config: {
        organization: 'easychamp',
        project: 'League Scheduler',
        teams: ['Platform Engineering Team', 'QA Team'],
      },
      timeRange: {
        default: '1M',
        max: '6M',
      },
    };

    const result = validateSyncProfile(profile);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate Jira profile with project-per-team', () => {
    const profile: SyncProfile = {
      provider: 'jira',
      displayName: 'Multi-Team Jira',
      config: {
        domain: 'mycompany.atlassian.net',
        strategy: 'project-per-team',
        projects: ['FRONTEND', 'BACKEND', 'QA'],
      },
      timeRange: {
        default: '2W',
        max: '3M',
      },
    };

    const result = validateSyncProfile(profile);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate Jira profile with shared-project-with-components', () => {
    const profile: SyncProfile = {
      provider: 'jira',
      displayName: 'Product Development',
      config: {
        domain: 'mycompany.atlassian.net',
        strategy: 'shared-project-with-components',
        projectKey: 'PRODUCT',
        components: ['Frontend', 'Backend', 'Infrastructure'],
      },
      timeRange: {
        default: '1M',
        max: '6M',
      },
    };

    const result = validateSyncProfile(profile);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject profile with missing displayName', () => {
    const profile: any = {
      provider: 'github',
      config: {
        owner: 'anton-abyzov',
        repo: 'specweave',
      },
      timeRange: {
        default: '1M',
        max: '6M',
      },
    };

    const result = validateSyncProfile(profile);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Profile displayName is required');
  });

  it('should reject unknown provider', () => {
    const profile: any = {
      provider: 'gitlab',  // Not supported
      displayName: 'GitLab Repo',
      config: {},
      timeRange: { default: '1M', max: '6M' },
    };

    const result = validateSyncProfile(profile);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Unknown provider'))).toBe(true);
  });
});
