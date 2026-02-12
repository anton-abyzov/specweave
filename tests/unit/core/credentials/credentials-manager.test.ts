/**
 * CredentialsManager Unit Tests
 *
 * Tests for singleton credential loading, validation, masking, and file operations.
 * Target: 90%+ coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mock functions so vi.mock factory can reference them
const {
  mockExistsSync,
  mockReadFileSync,
  mockWriteFileSync,
  mockAppendFileSync,
  mockCopyFileSync,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockAppendFileSync: vi.fn(),
  mockCopyFileSync: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  appendFileSync: mockAppendFileSync,
  copyFileSync: mockCopyFileSync,
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    appendFileSync: mockAppendFileSync,
    copyFileSync: mockCopyFileSync,
  },
}));

import { CredentialsManager } from '../../../../src/core/credentials/credentials-manager.js';
import type { CredentialsConfig } from '../../../../src/core/credentials/credentials-manager.js';

// Env vars that the manager reads
const ALL_ENV_KEYS = [
  'AZURE_DEVOPS_PAT', 'AZURE_DEVOPS_ORG', 'AZURE_DEVOPS_PROJECT',
  'AZURE_DEVOPS_TEAM', 'AZURE_DEVOPS_TEAMS',
  'JIRA_API_TOKEN', 'JIRA_EMAIL', 'JIRA_DOMAIN',
  'JIRA_STRATEGY', 'JIRA_PROJECT', 'JIRA_PROJECTS',
  'JIRA_COMPONENTS', 'JIRA_BOARDS',
  'GH_TOKEN', 'GITHUB_TOKEN', 'GITHUB_STRATEGY',
  'GITHUB_OWNER', 'GITHUB_REPO', 'GITHUB_REPOS',
  'GITHUB_TEAMS', 'GITHUB_TEAM_REPO_MAPPING',
];

describe('CredentialsManager', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    // Save all relevant env vars
    for (const key of ALL_ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }

    // Reset singleton
    (CredentialsManager as any)['instance'] = undefined;

    // Reset all mocks
    vi.clearAllMocks();

    // Default: no .env file on disk
    mockExistsSync.mockReturnValue(false);
  });

  afterEach(() => {
    // Restore env vars
    for (const key of ALL_ENV_KEYS) {
      if (savedEnv[key] !== undefined) {
        process.env[key] = savedEnv[key];
      } else {
        delete process.env[key];
      }
    }

    // Reset singleton
    (CredentialsManager as any)['instance'] = undefined;
  });

  // ---------------------------------------------------------------------------
  // Singleton behavior
  // ---------------------------------------------------------------------------

  describe('getInstance()', () => {
    it('should return the same instance on subsequent calls', () => {
      const a = CredentialsManager.getInstance();
      const b = CredentialsManager.getInstance();
      expect(a).toBe(b);
    });

    it('should return a new instance after singleton reset', () => {
      const a = CredentialsManager.getInstance();
      (CredentialsManager as any)['instance'] = undefined;
      const b = CredentialsManager.getInstance();
      expect(a).not.toBe(b);
    });
  });

  // ---------------------------------------------------------------------------
  // parseCommaSeparated (tested via loadFromEnv behavior)
  // ---------------------------------------------------------------------------

  describe('parseCommaSeparated (via env loading)', () => {
    it('should handle empty/undefined values', () => {
      process.env.AZURE_DEVOPS_PAT = 'x'.repeat(52);
      process.env.AZURE_DEVOPS_ORG = 'my-org';
      process.env.AZURE_DEVOPS_PROJECT = 'proj';
      // AZURE_DEVOPS_TEAMS is undefined

      const mgr = CredentialsManager.getInstance();
      const creds = mgr.getAdoCredentials();
      expect(creds.teams).toBeUndefined();
    });

    it('should parse a single comma-separated value', () => {
      process.env.AZURE_DEVOPS_PAT = 'x'.repeat(52);
      process.env.AZURE_DEVOPS_ORG = 'my-org';
      process.env.AZURE_DEVOPS_PROJECT = 'proj';
      process.env.AZURE_DEVOPS_TEAMS = 'Alpha';

      const mgr = CredentialsManager.getInstance();
      const creds = mgr.getAdoCredentials();
      // Single team goes to team field; teams array is undefined (not > 1)
      expect(creds).toHaveProperty('team', 'Alpha');
      expect(creds.teams).toBeUndefined();
    });

    it('should parse multiple comma-separated values', () => {
      process.env.AZURE_DEVOPS_PAT = 'x'.repeat(52);
      process.env.AZURE_DEVOPS_ORG = 'my-org';
      process.env.AZURE_DEVOPS_PROJECT = 'proj';
      process.env.AZURE_DEVOPS_TEAMS = 'Frontend, Backend, Mobile';

      const mgr = CredentialsManager.getInstance();
      const creds = mgr.getAdoCredentials();
      expect(creds.teams).toEqual(['Frontend', 'Backend', 'Mobile']);
    });
  });

  // ---------------------------------------------------------------------------
  // parseEnvFile (tested via loadFromEnv with .env file)
  // ---------------------------------------------------------------------------

  describe('parseEnvFile (via .env file loading)', () => {
    it('should skip comments and empty lines', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        '# This is a comment\n\n  \nAZURE_DEVOPS_PAT=' + 'a'.repeat(52) + '\nAZURE_DEVOPS_ORG=my-org\nAZURE_DEVOPS_PROJECT=proj\n'
      );

      const mgr = CredentialsManager.getInstance();
      expect(mgr.hasAdoCredentials()).toBe(true);
    });

    it('should strip double quotes from values', () => {
      const pat = 'b'.repeat(52);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        `AZURE_DEVOPS_PAT="${pat}"\nAZURE_DEVOPS_ORG="my-org"\nAZURE_DEVOPS_PROJECT="proj"\n`
      );

      const mgr = CredentialsManager.getInstance();
      const creds = mgr.getAdoCredentials();
      expect(creds).toHaveProperty('pat', pat);
      expect(creds).toHaveProperty('organization', 'my-org');
    });

    it('should strip single quotes from values', () => {
      const pat = 'c'.repeat(52);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        `AZURE_DEVOPS_PAT='${pat}'\nAZURE_DEVOPS_ORG='my-org'\nAZURE_DEVOPS_PROJECT='proj'\n`
      );

      const mgr = CredentialsManager.getInstance();
      const creds = mgr.getAdoCredentials();
      expect(creds).toHaveProperty('pat', pat);
    });

    it('should handle KEY=VALUE with spaces around key and value', () => {
      const pat = 'd'.repeat(52);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        `  AZURE_DEVOPS_PAT = ${pat}  \nAZURE_DEVOPS_ORG = my-org\nAZURE_DEVOPS_PROJECT = proj\n`
      );

      const mgr = CredentialsManager.getInstance();
      const creds = mgr.getAdoCredentials();
      expect(creds).toHaveProperty('pat', pat);
    });

    it('should give process.env precedence over .env file', () => {
      const filePat = 'e'.repeat(52);
      const envPat = 'f'.repeat(52);

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        `AZURE_DEVOPS_PAT=${filePat}\nAZURE_DEVOPS_ORG=file-org\nAZURE_DEVOPS_PROJECT=file-proj\n`
      );

      // process.env is set before getInstance
      process.env.AZURE_DEVOPS_PAT = envPat;
      process.env.AZURE_DEVOPS_ORG = 'env-org';
      process.env.AZURE_DEVOPS_PROJECT = 'env-proj';

      const mgr = CredentialsManager.getInstance();
      const creds = mgr.getAdoCredentials();
      expect(creds).toHaveProperty('pat', envPat);
      expect(creds).toHaveProperty('organization', 'env-org');
    });
  });

  // ---------------------------------------------------------------------------
  // Loading ADO credentials from env vars
  // ---------------------------------------------------------------------------

  describe('ADO credentials loading', () => {
    it('should load ADO credentials from env vars', () => {
      const pat = 'g'.repeat(52);
      process.env.AZURE_DEVOPS_PAT = pat;
      process.env.AZURE_DEVOPS_ORG = 'contoso';
      process.env.AZURE_DEVOPS_PROJECT = 'MyProject';

      const mgr = CredentialsManager.getInstance();
      const creds = mgr.getAdoCredentials();
      expect(creds).toHaveProperty('pat', pat);
      expect(creds).toHaveProperty('organization', 'contoso');
      expect(creds).toHaveProperty('project', 'MyProject');
    });

    it('should load single team via AZURE_DEVOPS_TEAM', () => {
      process.env.AZURE_DEVOPS_PAT = 'h'.repeat(52);
      process.env.AZURE_DEVOPS_ORG = 'org';
      process.env.AZURE_DEVOPS_PROJECT = 'proj';
      process.env.AZURE_DEVOPS_TEAM = 'AlphaTeam';

      const mgr = CredentialsManager.getInstance();
      const creds = mgr.getAdoCredentials();
      expect(creds).toHaveProperty('team', 'AlphaTeam');
    });

    it('should prefer AZURE_DEVOPS_TEAMS over AZURE_DEVOPS_TEAM when multiple', () => {
      process.env.AZURE_DEVOPS_PAT = 'i'.repeat(52);
      process.env.AZURE_DEVOPS_ORG = 'org';
      process.env.AZURE_DEVOPS_PROJECT = 'proj';
      process.env.AZURE_DEVOPS_TEAM = 'OldSingle';
      process.env.AZURE_DEVOPS_TEAMS = 'TeamA, TeamB';

      const mgr = CredentialsManager.getInstance();
      const creds = mgr.getAdoCredentials();
      expect(creds.teams).toEqual(['TeamA', 'TeamB']);
    });
  });

  // ---------------------------------------------------------------------------
  // Loading Jira credentials
  // ---------------------------------------------------------------------------

  describe('Jira credentials loading', () => {
    it('should load Jira credentials from env vars', () => {
      process.env.JIRA_API_TOKEN = 'jira-secret-token-123';
      process.env.JIRA_EMAIL = 'dev@company.com';
      process.env.JIRA_DOMAIN = 'company.atlassian.net';

      const mgr = CredentialsManager.getInstance();
      const creds = mgr.getJiraCredentials();
      expect(creds).toHaveProperty('apiToken', 'jira-secret-token-123');
      expect(creds).toHaveProperty('email', 'dev@company.com');
      expect(creds).toHaveProperty('domain', 'company.atlassian.net');
    });

    it('should load Jira projects as comma-separated', () => {
      process.env.JIRA_API_TOKEN = 'tok';
      process.env.JIRA_EMAIL = 'a@b.com';
      process.env.JIRA_DOMAIN = 'x.atlassian.net';
      process.env.JIRA_PROJECTS = 'PROJ1, PROJ2, PROJ3';

      const mgr = CredentialsManager.getInstance();
      const creds = mgr.getJiraCredentials();
      expect(creds.projects).toEqual(['PROJ1', 'PROJ2', 'PROJ3']);
    });

    it('should load Jira components and boards', () => {
      process.env.JIRA_API_TOKEN = 'tok';
      process.env.JIRA_EMAIL = 'a@b.com';
      process.env.JIRA_DOMAIN = 'x.atlassian.net';
      process.env.JIRA_COMPONENTS = 'Frontend, Backend';
      process.env.JIRA_BOARDS = '100, 200';

      const mgr = CredentialsManager.getInstance();
      const creds = mgr.getJiraCredentials();
      expect(creds.components).toEqual(['Frontend', 'Backend']);
      expect(creds.boards).toEqual(['100', '200']);
    });

    it('should load Jira strategy', () => {
      process.env.JIRA_API_TOKEN = 'tok';
      process.env.JIRA_EMAIL = 'a@b.com';
      process.env.JIRA_DOMAIN = 'x.atlassian.net';
      process.env.JIRA_STRATEGY = 'component-based';

      const mgr = CredentialsManager.getInstance();
      const creds = mgr.getJiraCredentials();
      expect(creds).toHaveProperty('strategy', 'component-based');
    });
  });

  // ---------------------------------------------------------------------------
  // Loading GitHub credentials
  // ---------------------------------------------------------------------------

  describe('GitHub credentials loading', () => {
    it('should prefer GH_TOKEN over GITHUB_TOKEN', () => {
      process.env.GH_TOKEN = 'ghp_preferred';
      process.env.GITHUB_TOKEN = 'ghp_fallback';

      const mgr = CredentialsManager.getInstance();
      // Access through internal credentials since getGitHubCredentials doesn't exist as a public method
      const creds = (mgr as any).credentials.github;
      expect(creds).toHaveProperty('token', 'ghp_preferred');
    });

    it('should fall back to GITHUB_TOKEN when GH_TOKEN is not set', () => {
      process.env.GITHUB_TOKEN = 'ghp_fallback';

      const mgr = CredentialsManager.getInstance();
      const creds = (mgr as any).credentials.github;
      expect(creds).toHaveProperty('token', 'ghp_fallback');
    });

    it('should load GitHub repos and teams', () => {
      process.env.GH_TOKEN = 'ghp_test';
      process.env.GITHUB_REPOS = 'repo-a, repo-b';
      process.env.GITHUB_TEAMS = 'team-x, team-y';
      process.env.GITHUB_OWNER = 'my-org';

      const mgr = CredentialsManager.getInstance();
      const creds = (mgr as any).credentials.github;
      expect(creds.repos).toEqual(['repo-a', 'repo-b']);
      expect(creds.teams).toEqual(['team-x', 'team-y']);
      expect(creds).toHaveProperty('owner', 'my-org');
    });

    it('should parse GITHUB_TEAM_REPO_MAPPING as JSON', () => {
      process.env.GH_TOKEN = 'ghp_test';
      const mapping = { frontend: ['ui-repo'], backend: ['api-repo', 'db-repo'] };
      process.env.GITHUB_TEAM_REPO_MAPPING = JSON.stringify(mapping);

      const mgr = CredentialsManager.getInstance();
      const creds = (mgr as any).credentials.github;
      expect(creds.teamRepoMapping).toEqual(mapping);
    });

    it('should handle invalid GITHUB_TEAM_REPO_MAPPING JSON gracefully', () => {
      process.env.GH_TOKEN = 'ghp_test';
      process.env.GITHUB_TEAM_REPO_MAPPING = 'not-json{';

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mgr = CredentialsManager.getInstance();
      const creds = (mgr as any).credentials.github;
      expect(creds.teamRepoMapping).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to parse GITHUB_TEAM_REPO_MAPPING:',
        expect.any(SyntaxError),
      );
      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // Loading from .env file when env vars are missing
  // ---------------------------------------------------------------------------

  describe('loading from .env file', () => {
    it('should load credentials from .env when process.env is empty', () => {
      const pat = 'j'.repeat(52);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        `AZURE_DEVOPS_PAT=${pat}\nAZURE_DEVOPS_ORG=file-org\nAZURE_DEVOPS_PROJECT=file-proj\n`
      );

      const mgr = CredentialsManager.getInstance();
      const creds = mgr.getAdoCredentials();
      expect(creds).toHaveProperty('pat', pat);
      expect(creds).toHaveProperty('organization', 'file-org');
    });
  });

  // ---------------------------------------------------------------------------
  // getAdoCredentials throws
  // ---------------------------------------------------------------------------

  describe('getAdoCredentials()', () => {
    it('should throw when ADO credentials are not set', () => {
      const mgr = CredentialsManager.getInstance();
      expect(() => mgr.getAdoCredentials()).toThrow('Azure DevOps credentials not found');
    });
  });

  // ---------------------------------------------------------------------------
  // getJiraCredentials throws
  // ---------------------------------------------------------------------------

  describe('getJiraCredentials()', () => {
    it('should throw when Jira credentials are not set', () => {
      const mgr = CredentialsManager.getInstance();
      expect(() => mgr.getJiraCredentials()).toThrow('Jira credentials not found');
    });
  });

  // ---------------------------------------------------------------------------
  // hasAdoCredentials / hasJiraCredentials
  // ---------------------------------------------------------------------------

  describe('hasAdoCredentials()', () => {
    it('should return false when no ADO credentials', () => {
      const mgr = CredentialsManager.getInstance();
      expect(mgr.hasAdoCredentials()).toBe(false);
    });

    it('should return true when ADO PAT is set', () => {
      process.env.AZURE_DEVOPS_PAT = 'k'.repeat(52);
      const mgr = CredentialsManager.getInstance();
      expect(mgr.hasAdoCredentials()).toBe(true);
    });
  });

  describe('hasJiraCredentials()', () => {
    it('should return false when no Jira credentials', () => {
      const mgr = CredentialsManager.getInstance();
      expect(mgr.hasJiraCredentials()).toBe(false);
    });

    it('should return true when Jira API token is set', () => {
      process.env.JIRA_API_TOKEN = 'some-token';
      const mgr = CredentialsManager.getInstance();
      expect(mgr.hasJiraCredentials()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // ADO validation
  // ---------------------------------------------------------------------------

  describe('ADO validation', () => {
    it('should warn when PAT length is not 52', () => {
      process.env.AZURE_DEVOPS_PAT = 'short-pat';
      process.env.AZURE_DEVOPS_ORG = 'valid-org';
      process.env.AZURE_DEVOPS_PROJECT = 'proj';

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mgr = CredentialsManager.getInstance();
      mgr.getAdoCredentials();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('PAT length unexpected'));
      warnSpy.mockRestore();
    });

    it('should throw when organization contains invalid characters', () => {
      process.env.AZURE_DEVOPS_PAT = 'l'.repeat(52);
      process.env.AZURE_DEVOPS_ORG = 'invalid org!';
      process.env.AZURE_DEVOPS_PROJECT = 'proj';

      const mgr = CredentialsManager.getInstance();
      expect(() => mgr.getAdoCredentials()).toThrow('Invalid Azure DevOps organization');
    });

    it('should throw when organization is empty', () => {
      process.env.AZURE_DEVOPS_PAT = 'm'.repeat(52);
      process.env.AZURE_DEVOPS_ORG = '';
      process.env.AZURE_DEVOPS_PROJECT = 'proj';

      const mgr = CredentialsManager.getInstance();
      expect(() => mgr.getAdoCredentials()).toThrow('Invalid Azure DevOps organization');
    });

    it('should throw when project is empty', () => {
      process.env.AZURE_DEVOPS_PAT = 'n'.repeat(52);
      process.env.AZURE_DEVOPS_ORG = 'valid-org';
      process.env.AZURE_DEVOPS_PROJECT = '';

      const mgr = CredentialsManager.getInstance();
      expect(() => mgr.getAdoCredentials()).toThrow('project name is required');
    });
  });

  // ---------------------------------------------------------------------------
  // Jira validation
  // ---------------------------------------------------------------------------

  describe('Jira validation', () => {
    it('should throw when email is invalid', () => {
      process.env.JIRA_API_TOKEN = 'tok';
      process.env.JIRA_EMAIL = 'not-an-email';
      process.env.JIRA_DOMAIN = 'x.atlassian.net';

      const mgr = CredentialsManager.getInstance();
      expect(() => mgr.getJiraCredentials()).toThrow('Invalid Jira email');
    });

    it('should warn when domain does not contain .atlassian.net or protocol', () => {
      process.env.JIRA_API_TOKEN = 'tok';
      process.env.JIRA_EMAIL = 'user@company.com';
      process.env.JIRA_DOMAIN = 'bare-domain';

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mgr = CredentialsManager.getInstance();
      mgr.getJiraCredentials();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('domain format unexpected'));
      warnSpy.mockRestore();
    });

    it('should accept a custom domain with protocol', () => {
      process.env.JIRA_API_TOKEN = 'tok';
      process.env.JIRA_EMAIL = 'user@company.com';
      process.env.JIRA_DOMAIN = 'https://jira.custom.com';

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mgr = CredentialsManager.getInstance();
      expect(() => mgr.getJiraCredentials()).not.toThrow();
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should throw when apiToken is empty', () => {
      process.env.JIRA_API_TOKEN = '';
      process.env.JIRA_EMAIL = 'user@company.com';
      process.env.JIRA_DOMAIN = 'x.atlassian.net';

      // Empty string is falsy, so jira creds won't be loaded at all
      const mgr = CredentialsManager.getInstance();
      expect(() => mgr.getJiraCredentials()).toThrow('Jira credentials not found');
    });
  });

  // ---------------------------------------------------------------------------
  // getMaskedAdoInfo / getMaskedJiraInfo
  // ---------------------------------------------------------------------------

  describe('getMaskedAdoInfo()', () => {
    it('should return "Not configured" when no ADO credentials', () => {
      const mgr = CredentialsManager.getInstance();
      expect(mgr.getMaskedAdoInfo()).toBe('ADO credentials: Not configured');
    });

    it('should return masked info with single team', () => {
      process.env.AZURE_DEVOPS_PAT = 'o'.repeat(52);
      process.env.AZURE_DEVOPS_ORG = 'contoso';
      process.env.AZURE_DEVOPS_PROJECT = 'MyProj';
      process.env.AZURE_DEVOPS_TEAM = 'TeamA';

      const mgr = CredentialsManager.getInstance();
      const info = mgr.getMaskedAdoInfo();
      expect(info).toContain('ADO credentials:');
      expect(info).toContain('PAT:');
      expect(info).toContain('Organization: contoso');
      expect(info).toContain('Project: MyProj');
      expect(info).toContain('Team: TeamA');
      // PAT should be masked
      expect(info).not.toContain('o'.repeat(52));
    });

    it('should show team count for multiple teams', () => {
      process.env.AZURE_DEVOPS_PAT = 'p'.repeat(52);
      process.env.AZURE_DEVOPS_ORG = 'org';
      process.env.AZURE_DEVOPS_PROJECT = 'proj';
      process.env.AZURE_DEVOPS_TEAMS = 'Alpha, Beta, Gamma';

      const mgr = CredentialsManager.getInstance();
      const info = mgr.getMaskedAdoInfo();
      expect(info).toContain('Teams (3):');
      expect(info).toContain('Alpha');
      expect(info).toContain('Beta');
      expect(info).toContain('Gamma');
    });
  });

  describe('getMaskedJiraInfo()', () => {
    it('should return "Not configured" when no Jira credentials', () => {
      const mgr = CredentialsManager.getInstance();
      expect(mgr.getMaskedJiraInfo()).toBe('Jira credentials: Not configured');
    });

    it('should return masked info with single project', () => {
      process.env.JIRA_API_TOKEN = 'jira-long-secret-token';
      process.env.JIRA_EMAIL = 'dev@example.com';
      process.env.JIRA_DOMAIN = 'example.atlassian.net';
      process.env.JIRA_PROJECT = 'MYPROJ';

      const mgr = CredentialsManager.getInstance();
      const info = mgr.getMaskedJiraInfo();
      expect(info).toContain('Jira credentials:');
      expect(info).toContain('API Token:');
      expect(info).toContain('Email: dev@example.com');
      expect(info).toContain('Domain: example.atlassian.net');
      expect(info).toContain('Project: MYPROJ');
      // Token should be masked
      expect(info).not.toContain('jira-long-secret-token');
    });

    it('should show project count for multiple projects', () => {
      process.env.JIRA_API_TOKEN = 'tok';
      process.env.JIRA_EMAIL = 'dev@example.com';
      process.env.JIRA_DOMAIN = 'example.atlassian.net';
      process.env.JIRA_PROJECTS = 'P1, P2';

      const mgr = CredentialsManager.getInstance();
      const info = mgr.getMaskedJiraInfo();
      expect(info).toContain('Projects (2):');
      expect(info).toContain('P1');
      expect(info).toContain('P2');
    });
  });

  // ---------------------------------------------------------------------------
  // maskSecret (tested via masked info methods)
  // ---------------------------------------------------------------------------

  describe('maskSecret (via masked info)', () => {
    it('should show [EMPTY] for empty secret', () => {
      // Force ADO creds with empty PAT
      const mgr = CredentialsManager.getInstance();
      (mgr as any).credentials.ado = {
        pat: '',
        organization: 'org',
        project: 'proj',
      };
      const info = mgr.getMaskedAdoInfo();
      expect(info).toContain('[EMPTY]');
    });

    it('should show **** for short secret (8 chars or fewer)', () => {
      const mgr = CredentialsManager.getInstance();
      (mgr as any).credentials.ado = {
        pat: 'abcd1234',
        organization: 'org',
        project: 'proj',
      };
      const info = mgr.getMaskedAdoInfo();
      expect(info).toContain('****');
    });

    it('should show partial secret with char count for normal secret', () => {
      const mgr = CredentialsManager.getInstance();
      const secret = 'abcdefghijklmnop';
      (mgr as any).credentials.ado = {
        pat: secret,
        organization: 'org',
        project: 'proj',
      };
      const info = mgr.getMaskedAdoInfo();
      // Should show first 4 and last 4 chars with length
      expect(info).toContain('abcd...mnop');
      expect(info).toContain(`(${secret.length} chars)`);
    });
  });

  // ---------------------------------------------------------------------------
  // saveToEnvFile
  // ---------------------------------------------------------------------------

  describe('saveToEnvFile()', () => {
    it('should write ADO credentials to .env file', () => {
      const mgr = CredentialsManager.getInstance();

      // Suppress console output
      vi.spyOn(console, 'log').mockImplementation(() => {});

      // Mock: no existing .env, no .gitignore
      mockExistsSync.mockReturnValue(false);

      const config: Partial<CredentialsConfig> = {
        ado: {
          pat: 'q'.repeat(52),
          organization: 'test-org',
          project: 'test-proj',
        },
      };

      mgr.saveToEnvFile(config);

      expect(mockWriteFileSync).toHaveBeenCalled();
      const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(writtenContent).toContain('AZURE_DEVOPS_PAT=' + 'q'.repeat(52));
      expect(writtenContent).toContain('AZURE_DEVOPS_ORG=test-org');
      expect(writtenContent).toContain('AZURE_DEVOPS_PROJECT=test-proj');
    });

    it('should create backup when .env already exists', () => {
      const mgr = CredentialsManager.getInstance();
      vi.spyOn(console, 'log').mockImplementation(() => {});

      // .env exists
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('EXISTING_KEY=value\n');

      const config: Partial<CredentialsConfig> = {
        ado: {
          pat: 'r'.repeat(52),
          organization: 'org',
          project: 'proj',
        },
      };

      mgr.saveToEnvFile(config);

      // Should have called copyFileSync for backup
      expect(mockCopyFileSync).toHaveBeenCalled();
      const backupPath = mockCopyFileSync.mock.calls[0][1] as string;
      expect(backupPath).toContain('.env.backup.');
    });

    it('should preserve existing vars when adding new ones', () => {
      const mgr = CredentialsManager.getInstance();
      vi.spyOn(console, 'log').mockImplementation(() => {});

      // .env exists with pre-existing content
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('CUSTOM_VAR=myvalue\n');

      const config: Partial<CredentialsConfig> = {
        jira: {
          apiToken: 'jira-tok',
          email: 'e@x.com',
          domain: 'x.atlassian.net',
        },
      };

      mgr.saveToEnvFile(config);

      const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(writtenContent).toContain('CUSTOM_VAR=myvalue');
      expect(writtenContent).toContain('JIRA_API_TOKEN=jira-tok');
    });

    it('should write multiple teams as comma-separated', () => {
      const mgr = CredentialsManager.getInstance();
      vi.spyOn(console, 'log').mockImplementation(() => {});
      mockExistsSync.mockReturnValue(false);

      const config: Partial<CredentialsConfig> = {
        ado: {
          pat: 's'.repeat(52),
          organization: 'org',
          project: 'proj',
          teams: ['Alpha', 'Beta'],
        },
      };

      mgr.saveToEnvFile(config);

      const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(writtenContent).toContain('AZURE_DEVOPS_TEAMS=Alpha,Beta');
      expect(writtenContent).not.toContain('AZURE_DEVOPS_TEAM=');
    });

    it('should write GitHub credentials with team-multi-repo mapping', () => {
      const mgr = CredentialsManager.getInstance();
      vi.spyOn(console, 'log').mockImplementation(() => {});
      mockExistsSync.mockReturnValue(false);

      const mapping = { fe: ['ui'], be: ['api'] };
      const config: Partial<CredentialsConfig> = {
        github: {
          token: 'ghp_abc',
          strategy: 'team-multi-repo',
          teamRepoMapping: mapping,
        },
      };

      mgr.saveToEnvFile(config);

      const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(writtenContent).toContain('GH_TOKEN=ghp_abc');
      expect(writtenContent).toContain('GITHUB_TEAM_REPO_MAPPING=' + JSON.stringify(mapping));
    });

    it('should call ensureGitignore after writing', () => {
      const mgr = CredentialsManager.getInstance();
      vi.spyOn(console, 'log').mockImplementation(() => {});

      // No .env, no .gitignore
      mockExistsSync.mockReturnValue(false);

      mgr.saveToEnvFile({ ado: { pat: 't'.repeat(52), organization: 'org', project: 'proj' } });

      // ensureGitignore should have been called - it checks .gitignore existence
      // Since existsSync returns false, it appends to .gitignore
      expect(mockAppendFileSync).toHaveBeenCalled();
      const appendedContent = mockAppendFileSync.mock.calls[0][1] as string;
      expect(appendedContent).toContain('.env');
    });
  });

  // ---------------------------------------------------------------------------
  // createEnvExample
  // ---------------------------------------------------------------------------

  describe('createEnvExample()', () => {
    it('should write .env.example file', () => {
      const mgr = CredentialsManager.getInstance();
      vi.spyOn(console, 'log').mockImplementation(() => {});

      mgr.createEnvExample();

      expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
      const writePath = mockWriteFileSync.mock.calls[0][0] as string;
      expect(writePath).toContain('.env.example');

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('AZURE_DEVOPS_PAT');
      expect(content).toContain('JIRA_API_TOKEN');
      expect(content).toContain('JIRA_EMAIL');
      expect(content).toContain('AZURE_DEVOPS_ORG');
    });
  });

  // ---------------------------------------------------------------------------
  // ensureGitignore
  // ---------------------------------------------------------------------------

  describe('ensureGitignore (via saveToEnvFile)', () => {
    it('should add .env to .gitignore when not present', () => {
      const mgr = CredentialsManager.getInstance();
      vi.spyOn(console, 'log').mockImplementation(() => {});

      // existsSync: false for .env (no backup), false for .gitignore
      mockExistsSync.mockReturnValue(false);

      mgr.saveToEnvFile({ ado: { pat: 'u'.repeat(52), organization: 'org', project: 'proj' } });

      expect(mockAppendFileSync).toHaveBeenCalled();
      const appended = mockAppendFileSync.mock.calls[0][1] as string;
      expect(appended).toContain('.env');
      expect(appended).toContain('.env.*.backup');
    });

    it('should not append when .gitignore already contains .env', () => {
      const mgr = CredentialsManager.getInstance();
      vi.spyOn(console, 'log').mockImplementation(() => {});

      // First call: .env for backup check
      // Second call: .env for reading existing content
      // Third call: .gitignore exists
      let callCount = 0;
      mockExistsSync.mockImplementation(() => {
        callCount++;
        // Return true for the .gitignore check (ensureGitignore)
        return callCount >= 3;
      });
      mockReadFileSync.mockImplementation((filePath: string) => {
        if (typeof filePath === 'string' && filePath.includes('.gitignore')) {
          return 'node_modules/\n.env\n';
        }
        return '';
      });

      mgr.saveToEnvFile({ ado: { pat: 'v'.repeat(52), organization: 'org', project: 'proj' } });

      expect(mockAppendFileSync).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Jira strategies in saveToEnvFile
  // ---------------------------------------------------------------------------

  describe('saveToEnvFile Jira strategies', () => {
    beforeEach(() => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      mockExistsSync.mockReturnValue(false);
    });

    it('should write project-per-team strategy', () => {
      const mgr = CredentialsManager.getInstance();
      mgr.saveToEnvFile({
        jira: {
          apiToken: 'tok',
          email: 'a@b.com',
          domain: 'd.atlassian.net',
          strategy: 'project-per-team',
          projects: ['P1', 'P2'],
        },
      });

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('JIRA_STRATEGY=project-per-team');
      expect(content).toContain('JIRA_PROJECTS=P1,P2');
      expect(content).not.toContain('JIRA_COMPONENTS=');
    });

    it('should write component-based strategy', () => {
      const mgr = CredentialsManager.getInstance();
      mgr.saveToEnvFile({
        jira: {
          apiToken: 'tok',
          email: 'a@b.com',
          domain: 'd.atlassian.net',
          strategy: 'component-based',
          project: 'MAIN',
          components: ['FE', 'BE'],
        },
      });

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('JIRA_STRATEGY=component-based');
      expect(content).toContain('JIRA_PROJECT=MAIN');
      expect(content).toContain('JIRA_COMPONENTS=FE,BE');
    });

    it('should write board-based strategy', () => {
      const mgr = CredentialsManager.getInstance();
      mgr.saveToEnvFile({
        jira: {
          apiToken: 'tok',
          email: 'a@b.com',
          domain: 'd.atlassian.net',
          strategy: 'board-based',
          project: 'MAIN',
          boards: ['100', '200'],
        },
      });

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('JIRA_STRATEGY=board-based');
      expect(content).toContain('JIRA_BOARDS=100,200');
    });
  });

  // ---------------------------------------------------------------------------
  // GitHub strategies in saveToEnvFile
  // ---------------------------------------------------------------------------

  describe('saveToEnvFile GitHub strategies', () => {
    beforeEach(() => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      mockExistsSync.mockReturnValue(false);
    });

    it('should write repository-per-team strategy', () => {
      const mgr = CredentialsManager.getInstance();
      mgr.saveToEnvFile({
        github: {
          token: 'ghp_x',
          strategy: 'repository-per-team',
          owner: 'org',
          repos: ['repo-a', 'repo-b'],
        },
      });

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('GITHUB_STRATEGY=repository-per-team');
      expect(content).toContain('GITHUB_REPOS=repo-a,repo-b');
      expect(content).not.toContain('GITHUB_TEAMS=');
    });

    it('should write team-based strategy', () => {
      const mgr = CredentialsManager.getInstance();
      mgr.saveToEnvFile({
        github: {
          token: 'ghp_x',
          strategy: 'team-based',
          repo: 'monorepo',
          teams: ['frontend', 'backend'],
        },
      });

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('GITHUB_STRATEGY=team-based');
      expect(content).toContain('GITHUB_REPO=monorepo');
      expect(content).toContain('GITHUB_TEAMS=frontend,backend');
    });
  });
});
