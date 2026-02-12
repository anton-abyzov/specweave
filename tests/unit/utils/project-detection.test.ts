/**
 * Unit tests for project-detection utilities
 *
 * Pure functions (parseRepoName, formatProjectName, validateProjectId) tested directly.
 * Filesystem-backed functions tested with real temp dirs and fake configs.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  parseRepoName,
  detectDefaultProfileId,
  detectProjectIdFromGit,
  detectProjectIdFromSync,
  autoDetectProjectIdSync,
  formatProjectName,
  validateProjectId,
  getProjectContext,
} from '../../../src/utils/project-detection.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sw-projdet-'));
}

function writeGitConfig(root: string, remoteUrl: string): void {
  const gitDir = path.join(root, '.git');
  fs.mkdirSync(gitDir, { recursive: true });
  fs.writeFileSync(
    path.join(gitDir, 'config'),
    `[core]\n\trepositoryformatversion = 0\n[remote "origin"]\n\turl = ${remoteUrl}\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n`,
  );
}

function writeSpecweaveConfig(root: string, config: Record<string, unknown>): void {
  const swDir = path.join(root, '.specweave');
  fs.mkdirSync(swDir, { recursive: true });
  fs.writeFileSync(path.join(swDir, 'config.json'), JSON.stringify(config, null, 2));
}

// ---------------------------------------------------------------------------
// parseRepoName
// ---------------------------------------------------------------------------

describe('parseRepoName', () => {
  describe('prefix extraction', () => {
    it('should extract a 2-char prefix', () => {
      const result = parseRepoName('sw-qr-menu-be');
      expect(result.prefix).toBe('sw');
    });

    it('should extract a 3-char prefix', () => {
      const result = parseRepoName('abc-dashboard');
      expect(result.prefix).toBe('abc');
    });

    it('should not treat a 4-char first part as prefix', () => {
      const result = parseRepoName('acme-dashboard');
      expect(result.prefix).toBeNull();
      expect(result.product).toBe('acme-dashboard');
    });

    it('should not extract prefix from single-word name', () => {
      const result = parseRepoName('specweave');
      expect(result.prefix).toBeNull();
      expect(result.product).toBe('specweave');
    });

    it('should not extract prefix when only two parts and last is component', () => {
      // "my-be" -> prefix "my" (3 chars), product left is empty? Let's see what happens.
      // parts = ['my', 'be']; component = 'be'; productParts = ['my']; prefix check: 'my'.length=2 <= 3
      // productParts.length = 1, so only 1 part left, prefix not extracted (need >1)
      const result = parseRepoName('my-be');
      expect(result.prefix).toBeNull();
      expect(result.component).toBe('be');
      expect(result.product).toBe('my');
    });
  });

  describe('component detection', () => {
    it('should detect "be" as component', () => {
      const result = parseRepoName('sw-qr-menu-be');
      expect(result.component).toBe('be');
    });

    it('should detect "fe" as component', () => {
      const result = parseRepoName('sw-qr-menu-fe');
      expect(result.component).toBe('fe');
    });

    it('should detect "frontend" as component', () => {
      const result = parseRepoName('my-app-frontend');
      expect(result.component).toBe('frontend');
    });

    it('should detect "backend" as component', () => {
      const result = parseRepoName('my-app-backend');
      expect(result.component).toBe('backend');
    });

    it('should detect "api" as component', () => {
      const result = parseRepoName('ecommerce-api');
      expect(result.component).toBe('api');
    });

    it('should detect "web" as component', () => {
      const result = parseRepoName('dashboard-web');
      expect(result.component).toBe('web');
    });

    it('should detect "mobile" as component', () => {
      const result = parseRepoName('banking-mobile');
      expect(result.component).toBe('mobile');
    });

    it('should detect "shared" as component', () => {
      const result = parseRepoName('platform-shared');
      expect(result.component).toBe('shared');
    });

    it('should detect "common" as component', () => {
      const result = parseRepoName('utils-common');
      expect(result.component).toBe('common');
    });

    it('should detect "core" as component', () => {
      const result = parseRepoName('framework-core');
      expect(result.component).toBe('core');
    });

    it('should detect "lib" as component', () => {
      const result = parseRepoName('my-lib');
      expect(result.component).toBe('lib');
    });

    it('should detect "ui" as component', () => {
      const result = parseRepoName('design-ui');
      expect(result.component).toBe('ui');
    });

    it('should detect "app" as component', () => {
      const result = parseRepoName('fitness-app');
      expect(result.component).toBe('app');
    });

    it('should detect "service" as component', () => {
      const result = parseRepoName('auth-service');
      expect(result.component).toBe('service');
    });

    it('should detect "services" as component', () => {
      const result = parseRepoName('micro-services');
      expect(result.component).toBe('services');
    });

    it('should return null component for names without known suffixes', () => {
      const result = parseRepoName('simple-name');
      expect(result.component).toBeNull();
    });
  });

  describe('product extraction', () => {
    it('should extract multi-part product with prefix and component', () => {
      const result = parseRepoName('sw-qr-menu-be');
      expect(result.product).toBe('qr-menu');
    });

    it('should extract product with component and short prefix', () => {
      // 'my-app-frontend' -> parts ['my','app','frontend']
      // component = 'frontend', productParts = ['my','app']
      // 'my' is 2 chars -> extracted as prefix, product = 'app'
      const result = parseRepoName('my-app-frontend');
      expect(result.prefix).toBe('my');
      expect(result.product).toBe('app');
    });

    it('should extract product with no prefix and no component', () => {
      const result = parseRepoName('simple-name');
      expect(result.product).toBe('simple-name');
    });

    it('should extract product from single-word name', () => {
      const result = parseRepoName('specweave');
      expect(result.product).toBe('specweave');
    });

    it('should extract product from component-only suffix', () => {
      const result = parseRepoName('ecommerce-api');
      expect(result.product).toBe('ecommerce');
    });
  });

  describe('full name', () => {
    it('should preserve full name lowercased', () => {
      const result = parseRepoName('SW-QR-Menu-BE');
      expect(result.full).toBe('sw-qr-menu-be');
    });

    it('should trim whitespace', () => {
      const result = parseRepoName('  my-app  ');
      expect(result.full).toBe('my-app');
    });
  });

  describe('underscore support', () => {
    it('should split on underscores', () => {
      const result = parseRepoName('sw_qr_menu_be');
      expect(result.prefix).toBe('sw');
      expect(result.product).toBe('qr-menu');
      expect(result.component).toBe('be');
    });

    it('should handle mixed delimiters', () => {
      // 'my_app-frontend' -> split on [-_]+ -> ['my','app','frontend']
      // component = 'frontend', productParts = ['my','app']
      // 'my' is 2 chars -> prefix, product = 'app'
      const result = parseRepoName('my_app-frontend');
      expect(result.component).toBe('frontend');
      expect(result.prefix).toBe('my');
      expect(result.product).toBe('app');
    });
  });

  describe('domain detection', () => {
    it('should detect hospitality/restaurant for qr-menu', () => {
      const result = parseRepoName('sw-qr-menu-be');
      expect(result.domain).toBe('hospitality/restaurant');
    });

    it('should detect hospitality/restaurant for restaurant keyword', () => {
      const result = parseRepoName('restaurant-finder-api');
      expect(result.domain).toBe('hospitality/restaurant');
    });

    it('should detect hospitality/restaurant for food keyword', () => {
      const result = parseRepoName('food-delivery-app');
      expect(result.domain).toBe('hospitality/restaurant');
    });

    it('should detect retail/ecommerce for ecommerce keyword', () => {
      const result = parseRepoName('ecommerce-api');
      expect(result.domain).toBe('retail/ecommerce');
    });

    it('should detect retail/ecommerce for shop keyword', () => {
      const result = parseRepoName('online-shop-fe');
      expect(result.domain).toBe('retail/ecommerce');
    });

    it('should detect retail/ecommerce for cart keyword', () => {
      const result = parseRepoName('shopping-cart-service');
      expect(result.domain).toBe('retail/ecommerce');
    });

    it('should detect healthcare for health keyword', () => {
      const result = parseRepoName('health-tracker-app');
      expect(result.domain).toBe('healthcare');
    });

    it('should detect healthcare for patient keyword', () => {
      const result = parseRepoName('patient-portal-web');
      expect(result.domain).toBe('healthcare');
    });

    it('should detect fintech for finance keyword', () => {
      const result = parseRepoName('finance-dashboard');
      expect(result.domain).toBe('fintech');
    });

    it('should detect fintech for payment keyword', () => {
      const result = parseRepoName('payment-gateway-api');
      expect(result.domain).toBe('fintech');
    });

    it('should detect fintech for wallet keyword', () => {
      const result = parseRepoName('crypto-wallet-mobile');
      expect(result.domain).toBe('fintech');
    });

    it('should detect education for learn keyword', () => {
      const result = parseRepoName('learn-platform-fe');
      expect(result.domain).toBe('education');
    });

    it('should detect social for chat keyword', () => {
      const result = parseRepoName('chat-messenger-app');
      expect(result.domain).toBe('social');
    });

    it('should detect iot for sensor keyword', () => {
      const result = parseRepoName('sensor-dashboard-web');
      expect(result.domain).toBe('iot');
    });

    it('should detect iot for smart-home keyword', () => {
      const result = parseRepoName('smart-home-api');
      expect(result.domain).toBe('iot');
    });

    it('should detect ai/ml for ml keyword', () => {
      const result = parseRepoName('ml-pipeline-service');
      expect(result.domain).toBe('ai/ml');
    });

    it('should detect gaming for game keyword', () => {
      const result = parseRepoName('game-engine-core');
      expect(result.domain).toBe('gaming');
    });

    it('should detect travel for booking keyword', () => {
      const result = parseRepoName('booking-platform-api');
      expect(result.domain).toBe('travel');
    });

    it('should detect travel for hotel keyword', () => {
      const result = parseRepoName('hotel-finder-app');
      expect(result.domain).toBe('travel');
    });

    it('should return null domain for unrecognized names', () => {
      const result = parseRepoName('specweave');
      expect(result.domain).toBeNull();
    });

    it('should return null domain for generic names', () => {
      const result = parseRepoName('project-alpha');
      expect(result.domain).toBeNull();
    });
  });

  describe('complete parsing scenarios', () => {
    it('should parse sw-qr-menu-be fully', () => {
      expect(parseRepoName('sw-qr-menu-be')).toEqual({
        prefix: 'sw',
        product: 'qr-menu',
        component: 'be',
        full: 'sw-qr-menu-be',
        domain: 'hospitality/restaurant',
      });
    });

    it('should parse my-app-frontend fully', () => {
      // 'my' is 2 chars -> extracted as prefix
      expect(parseRepoName('my-app-frontend')).toEqual({
        prefix: 'my',
        product: 'app',
        component: 'frontend',
        full: 'my-app-frontend',
        domain: null,
      });
    });

    it('should parse ecommerce-api fully', () => {
      expect(parseRepoName('ecommerce-api')).toEqual({
        prefix: null,
        product: 'ecommerce',
        component: 'api',
        full: 'ecommerce-api',
        domain: 'retail/ecommerce',
      });
    });

    it('should parse single-word name fully', () => {
      expect(parseRepoName('specweave')).toEqual({
        prefix: null,
        product: 'specweave',
        component: null,
        full: 'specweave',
        domain: null,
      });
    });
  });
});

// ---------------------------------------------------------------------------
// formatProjectName
// ---------------------------------------------------------------------------

describe('formatProjectName', () => {
  it('should return "SpecWeave" for specweave', () => {
    expect(formatProjectName('specweave')).toBe('SpecWeave');
  });

  it('should be case-insensitive for specweave', () => {
    expect(formatProjectName('SPECWEAVE')).toBe('SpecWeave');
    expect(formatProjectName('SpecWeave')).toBe('SpecWeave');
  });

  it('should return "WebApp" for webapp', () => {
    expect(formatProjectName('webapp')).toBe('WebApp');
  });

  it('should return "Default Project" for default', () => {
    expect(formatProjectName('default')).toBe('Default Project');
  });

  it('should convert kebab-case to Title Case', () => {
    expect(formatProjectName('web-app')).toBe('Web App');
  });

  it('should convert snake_case to Title Case', () => {
    expect(formatProjectName('mobile_app')).toBe('Mobile App');
  });

  it('should handle multi-word kebab-case', () => {
    expect(formatProjectName('my-cool-project')).toBe('My Cool Project');
  });

  it('should capitalize each word', () => {
    expect(formatProjectName('api-gateway-service')).toBe('Api Gateway Service');
  });

  it('should handle single word (non-special-case)', () => {
    expect(formatProjectName('dashboard')).toBe('Dashboard');
  });

  it('should handle uppercase input', () => {
    expect(formatProjectName('MY-PROJECT')).toBe('My Project');
  });

  it('should handle mixed-case input with kebab', () => {
    expect(formatProjectName('Web-App')).toBe('Web App');
  });
});

// ---------------------------------------------------------------------------
// validateProjectId
// ---------------------------------------------------------------------------

describe('validateProjectId', () => {
  describe('valid project IDs', () => {
    it('should accept a simple lowercase name', () => {
      expect(validateProjectId('webapp')).toBe(true);
    });

    it('should accept a kebab-case name', () => {
      expect(validateProjectId('web-app')).toBe(true);
    });

    it('should accept an underscore name', () => {
      expect(validateProjectId('web_app')).toBe(true);
    });

    it('should accept numbers', () => {
      expect(validateProjectId('project42')).toBe(true);
    });

    it('should accept a 2-char name (minimum)', () => {
      expect(validateProjectId('ab')).toBe(true);
    });

    it('should accept a 64-char name (maximum)', () => {
      const id = 'a'.repeat(64);
      expect(validateProjectId(id)).toBe(true);
    });

    it('should accept mixed hyphens, underscores, numbers', () => {
      expect(validateProjectId('my-app_v2')).toBe(true);
    });
  });

  describe('invalid project IDs', () => {
    it('should reject empty string', () => {
      expect(validateProjectId('')).toBe('Project ID is required');
    });

    it('should reject a single character', () => {
      expect(validateProjectId('a')).toBe('Project ID must be at least 2 characters');
    });

    it('should reject uppercase letters', () => {
      expect(validateProjectId('MyApp')).toBe(
        'Project ID must be lowercase, alphanumeric, with hyphens or underscores',
      );
    });

    it('should reject spaces', () => {
      expect(validateProjectId('my app')).toBe(
        'Project ID must be lowercase, alphanumeric, with hyphens or underscores',
      );
    });

    it('should reject dots', () => {
      expect(validateProjectId('my.app')).toBe(
        'Project ID must be lowercase, alphanumeric, with hyphens or underscores',
      );
    });

    it('should reject slashes', () => {
      expect(validateProjectId('org/repo')).toBe(
        'Project ID must be lowercase, alphanumeric, with hyphens or underscores',
      );
    });

    it('should reject special characters', () => {
      expect(validateProjectId('my@app')).toBe(
        'Project ID must be lowercase, alphanumeric, with hyphens or underscores',
      );
    });

    it('should reject a 65-char name (over maximum)', () => {
      const id = 'a'.repeat(65);
      expect(validateProjectId(id)).toBe('Project ID must be at most 64 characters');
    });
  });
});

// ---------------------------------------------------------------------------
// detectProjectIdFromGit
// ---------------------------------------------------------------------------

describe('detectProjectIdFromGit', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should detect repo name from HTTPS URL', () => {
    writeGitConfig(tmpDir, 'https://github.com/owner/my-project.git');
    expect(detectProjectIdFromGit(tmpDir)).toBe('my-project');
  });

  it('should detect repo name from HTTPS URL without .git suffix', () => {
    writeGitConfig(tmpDir, 'https://github.com/owner/web-app');
    expect(detectProjectIdFromGit(tmpDir)).toBe('web-app');
  });

  it('should detect repo name from SSH URL', () => {
    writeGitConfig(tmpDir, 'git@github.com:owner/specweave.git');
    expect(detectProjectIdFromGit(tmpDir)).toBe('specweave');
  });

  it('should detect repo name from SSH URL without .git suffix', () => {
    writeGitConfig(tmpDir, 'git@github.com:owner/mobile-app');
    expect(detectProjectIdFromGit(tmpDir)).toBe('mobile-app');
  });

  it('should lowercase the repo name', () => {
    writeGitConfig(tmpDir, 'https://github.com/owner/My-Project.git');
    expect(detectProjectIdFromGit(tmpDir)).toBe('my-project');
  });

  it('should return null when .git/config does not exist', () => {
    expect(detectProjectIdFromGit(tmpDir)).toBeNull();
  });

  it('should return null for malformed git config', () => {
    const gitDir = path.join(tmpDir, '.git');
    fs.mkdirSync(gitDir, { recursive: true });
    fs.writeFileSync(path.join(gitDir, 'config'), 'not a valid git config');
    expect(detectProjectIdFromGit(tmpDir)).toBeNull();
  });

  it('should return null for git config without remote', () => {
    const gitDir = path.join(tmpDir, '.git');
    fs.mkdirSync(gitDir, { recursive: true });
    fs.writeFileSync(
      path.join(gitDir, 'config'),
      '[core]\n\trepositoryformatversion = 0\n',
    );
    expect(detectProjectIdFromGit(tmpDir)).toBeNull();
  });

  it('should handle GitLab HTTPS URL', () => {
    writeGitConfig(tmpDir, 'https://gitlab.com/org/my-repo.git');
    expect(detectProjectIdFromGit(tmpDir)).toBe('my-repo');
  });

  it('should handle GitLab SSH URL', () => {
    writeGitConfig(tmpDir, 'git@gitlab.com:org/my-repo.git');
    expect(detectProjectIdFromGit(tmpDir)).toBe('my-repo');
  });

  it('should handle Bitbucket HTTPS URL', () => {
    writeGitConfig(tmpDir, 'https://bitbucket.org/team/cool-project.git');
    expect(detectProjectIdFromGit(tmpDir)).toBe('cool-project');
  });

  it('should handle underscore in repo name', () => {
    writeGitConfig(tmpDir, 'https://github.com/owner/my_project.git');
    expect(detectProjectIdFromGit(tmpDir)).toBe('my_project');
  });

  it('should return null for non-existent directory', () => {
    expect(detectProjectIdFromGit('/nonexistent/path/12345')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// detectDefaultProfileId
// ---------------------------------------------------------------------------

describe('detectDefaultProfileId', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return repo name from GitHub profile', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        defaultProfile: 'main',
        profiles: {
          main: {
            provider: 'github',
            displayName: 'Main',
            config: { owner: 'acme', repo: 'Web-App' },
            timeRange: { default: '1M', max: '6M' },
          },
        },
      },
    });
    expect(detectDefaultProfileId(tmpDir)).toBe('web-app');
  });

  it('should return project name from ADO profile', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        defaultProfile: 'ado-proj',
        profiles: {
          'ado-proj': {
            provider: 'ado',
            displayName: 'ADO',
            config: { organization: 'myorg', project: 'My Project' },
            timeRange: { default: '1M', max: '6M' },
          },
        },
      },
    });
    // provider-prefixed profile id, so should not fall through to legacy umbrella check
    // ado provider with project -> project name lowercased, spaces to hyphens
    expect(detectDefaultProfileId(tmpDir)).toBe('my-project');
  });

  it('should return project key from JIRA profile', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        defaultProfile: 'jira-web',
        profiles: {
          'jira-web': {
            provider: 'jira',
            displayName: 'JIRA Web',
            config: { domain: 'acme.atlassian.net', projectKey: 'WEBAPP' },
            timeRange: { default: '1M', max: '6M' },
          },
        },
      },
    });
    expect(detectDefaultProfileId(tmpDir)).toBe('webapp');
  });

  it('should return null for generic "main" profile without config.repo', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        defaultProfile: 'main',
        profiles: {
          main: {
            provider: 'github',
            displayName: 'Main',
            config: { owner: 'acme' },
            timeRange: { default: '1M', max: '6M' },
          },
        },
      },
    });
    // GitHub profile but no repo in config -> falls through to legacy check
    // "main" is generic profile id -> returns null
    expect(detectDefaultProfileId(tmpDir)).toBeNull();
  });

  it('should return null for "default" profile without config', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        defaultProfile: 'default',
        profiles: {
          default: {
            provider: 'github',
            displayName: 'Default',
            config: { owner: 'acme' },
            timeRange: { default: '1M', max: '6M' },
          },
        },
      },
    });
    expect(detectDefaultProfileId(tmpDir)).toBeNull();
  });

  it('should return profile id for non-generic, non-provider-prefixed profile', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        defaultProfile: 'be',
        profiles: {
          be: {
            provider: 'github',
            displayName: 'Backend',
            config: { owner: 'acme' },
            timeRange: { default: '1M', max: '6M' },
          },
        },
      },
    });
    // "be" is not generic, not provider-prefixed, and profile exists
    // GitHub profile with no repo -> falls through
    // Legacy check: "be" not generic, not provider-prefixed -> return "be"
    expect(detectDefaultProfileId(tmpDir)).toBe('be');
  });

  it('should return null for provider-prefixed profile without config.repo', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        defaultProfile: 'github-main',
        profiles: {
          'github-main': {
            provider: 'github',
            displayName: 'GitHub Main',
            config: { owner: 'acme' },
            timeRange: { default: '1M', max: '6M' },
          },
        },
      },
    });
    expect(detectDefaultProfileId(tmpDir)).toBeNull();
  });

  it('should return null when no config exists', () => {
    expect(detectDefaultProfileId(tmpDir)).toBeNull();
  });

  it('should return null when sync is not configured', () => {
    writeSpecweaveConfig(tmpDir, {});
    expect(detectDefaultProfileId(tmpDir)).toBeNull();
  });

  it('should return null when defaultProfile is not set', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        profiles: {
          main: {
            provider: 'github',
            displayName: 'Main',
            config: { owner: 'acme', repo: 'web-app' },
            timeRange: { default: '1M', max: '6M' },
          },
        },
      },
    });
    expect(detectDefaultProfileId(tmpDir)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// detectProjectIdFromSync
// ---------------------------------------------------------------------------

describe('detectProjectIdFromSync', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should detect GitHub repo from sync profiles', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        profiles: {
          main: {
            provider: 'github',
            displayName: 'Main',
            config: { owner: 'acme', repo: 'WebApp' },
            timeRange: { default: '1M', max: '6M' },
          },
        },
      },
    });
    expect(detectProjectIdFromSync(tmpDir)).toBe('webapp');
  });

  it('should detect JIRA project key from sync profiles', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        profiles: {
          jira: {
            provider: 'jira',
            displayName: 'JIRA',
            config: { domain: 'acme.atlassian.net', projectKey: 'MYPROJ' },
            timeRange: { default: '1M', max: '6M' },
          },
        },
      },
    });
    expect(detectProjectIdFromSync(tmpDir)).toBe('myproj');
  });

  it('should detect ADO project from sync profiles', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        profiles: {
          ado: {
            provider: 'ado',
            displayName: 'ADO',
            config: { organization: 'myorg', project: 'Web Platform' },
            timeRange: { default: '1M', max: '6M' },
          },
        },
      },
    });
    expect(detectProjectIdFromSync(tmpDir)).toBe('web-platform');
  });

  it('should detect from legacy sync.jira format', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        jira: { projectKey: 'LEGACY' },
      },
    });
    expect(detectProjectIdFromSync(tmpDir)).toBe('legacy');
  });

  it('should detect from legacy sync.ado format', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        ado: { project: 'Legacy ADO' },
      },
    });
    expect(detectProjectIdFromSync(tmpDir)).toBe('legacy-ado');
  });

  it('should detect from legacy sync.github format', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        github: { repo: 'LegacyRepo' },
      },
    });
    expect(detectProjectIdFromSync(tmpDir)).toBe('legacyrepo');
  });

  it('should prefer profiles over legacy format', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        profiles: {
          main: {
            provider: 'github',
            displayName: 'Main',
            config: { owner: 'acme', repo: 'from-profile' },
            timeRange: { default: '1M', max: '6M' },
          },
        },
        github: { repo: 'from-legacy' },
      },
    });
    expect(detectProjectIdFromSync(tmpDir)).toBe('from-profile');
  });

  it('should return null when no config exists', () => {
    expect(detectProjectIdFromSync(tmpDir)).toBeNull();
  });

  it('should return null when sync has no profiles or legacy config', () => {
    writeSpecweaveConfig(tmpDir, { sync: {} });
    expect(detectProjectIdFromSync(tmpDir)).toBeNull();
  });

  it('should return null for profiles without recognized providers', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        profiles: {
          custom: {
            provider: 'unknown',
            displayName: 'Custom',
            config: {},
            timeRange: { default: '1M', max: '6M' },
          },
        },
      },
    });
    expect(detectProjectIdFromSync(tmpDir)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// autoDetectProjectIdSync
// ---------------------------------------------------------------------------

describe('autoDetectProjectIdSync', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return "default" when nothing is configured', () => {
    expect(autoDetectProjectIdSync(tmpDir, { silent: true })).toBe('default');
  });

  it('should prioritize default profile over git', () => {
    // Set up both git and specweave config
    writeGitConfig(tmpDir, 'https://github.com/owner/from-git.git');
    writeSpecweaveConfig(tmpDir, {
      sync: {
        defaultProfile: 'be',
        profiles: {
          be: {
            provider: 'github',
            displayName: 'Backend',
            config: { owner: 'acme', repo: 'from-profile' },
            timeRange: { default: '1M', max: '6M' },
          },
        },
      },
    });
    expect(autoDetectProjectIdSync(tmpDir, { silent: true })).toBe('from-profile');
  });

  it('should fall back to git when no default profile', () => {
    writeGitConfig(tmpDir, 'https://github.com/owner/my-repo.git');
    expect(autoDetectProjectIdSync(tmpDir, { silent: true })).toBe('my-repo');
  });

  it('should fall back to sync config when no git', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        profiles: {
          main: {
            provider: 'jira',
            displayName: 'JIRA',
            config: { domain: 'acme.atlassian.net', projectKey: 'SYNC' },
            timeRange: { default: '1M', max: '6M' },
          },
        },
      },
    });
    expect(autoDetectProjectIdSync(tmpDir, { silent: true })).toBe('sync');
  });

  it('should prioritize git over sync config', () => {
    writeGitConfig(tmpDir, 'https://github.com/owner/from-git.git');
    writeSpecweaveConfig(tmpDir, {
      sync: {
        profiles: {
          main: {
            provider: 'jira',
            displayName: 'JIRA',
            config: { domain: 'acme.atlassian.net', projectKey: 'FROM-SYNC' },
            timeRange: { default: '1M', max: '6M' },
          },
        },
      },
    });
    expect(autoDetectProjectIdSync(tmpDir, { silent: true })).toBe('from-git');
  });

  it('should log detection message when not silent', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    writeGitConfig(tmpDir, 'https://github.com/owner/my-repo.git');
    autoDetectProjectIdSync(tmpDir);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('my-repo'));
    consoleSpy.mockRestore();
  });

  it('should not log when silent', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    writeGitConfig(tmpDir, 'https://github.com/owner/my-repo.git');
    autoDetectProjectIdSync(tmpDir, { silent: true });
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// getProjectContext
// ---------------------------------------------------------------------------

describe('getProjectContext', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return fallback context when nothing configured', () => {
    const ctx = getProjectContext(tmpDir);
    expect(ctx.projectId).toBe('default');
    expect(ctx.detectedFrom).toBe('fallback');
    expect(ctx.repoInfo).toBeNull();
    expect(ctx.availableProfiles).toEqual([]);
    expect(ctx.defaultProfile).toBeNull();
  });

  it('should detect from default profile', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        defaultProfile: 'be',
        profiles: {
          be: {
            provider: 'github',
            displayName: 'Backend',
            config: { owner: 'acme', repo: 'sw-qr-menu-be' },
            timeRange: { default: '1M', max: '6M' },
          },
          fe: {
            provider: 'github',
            displayName: 'Frontend',
            config: { owner: 'acme', repo: 'sw-qr-menu-fe' },
            timeRange: { default: '1M', max: '6M' },
          },
        },
      },
    });

    const ctx = getProjectContext(tmpDir);
    expect(ctx.projectId).toBe('be');
    expect(ctx.detectedFrom).toBe('defaultProfile');
    expect(ctx.availableProfiles).toEqual(['be', 'fe']);
    expect(ctx.defaultProfile).toEqual({
      id: 'be',
      displayName: 'Backend',
      provider: 'github',
      repo: 'sw-qr-menu-be',
    });
    expect(ctx.repoInfo).not.toBeNull();
    expect(ctx.repoInfo!.domain).toBe('hospitality/restaurant');
    expect(ctx.repoInfo!.component).toBe('be');
  });

  it('should detect from git when no default profile', () => {
    writeGitConfig(tmpDir, 'https://github.com/owner/ecommerce-api.git');
    const ctx = getProjectContext(tmpDir);
    expect(ctx.projectId).toBe('ecommerce-api');
    expect(ctx.detectedFrom).toBe('gitRemote');
    expect(ctx.repoInfo).not.toBeNull();
    expect(ctx.repoInfo!.domain).toBe('retail/ecommerce');
    expect(ctx.repoInfo!.component).toBe('api');
  });

  it('should detect from sync config when no git', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        profiles: {
          main: {
            provider: 'jira',
            displayName: 'JIRA',
            config: { domain: 'acme.atlassian.net', projectKey: 'WEBAPP' },
            timeRange: { default: '1M', max: '6M' },
          },
        },
      },
    });
    const ctx = getProjectContext(tmpDir);
    expect(ctx.projectId).toBe('webapp');
    expect(ctx.detectedFrom).toBe('syncConfig');
    expect(ctx.repoInfo).not.toBeNull();
    expect(ctx.repoInfo!.full).toBe('webapp');
  });

  it('should include available profiles even when git detects', () => {
    writeGitConfig(tmpDir, 'https://github.com/owner/my-repo.git');
    writeSpecweaveConfig(tmpDir, {
      sync: {
        profiles: {
          alpha: {
            provider: 'github',
            displayName: 'Alpha',
            config: { owner: 'acme', repo: 'alpha' },
            timeRange: { default: '1M', max: '6M' },
          },
          beta: {
            provider: 'github',
            displayName: 'Beta',
            config: { owner: 'acme', repo: 'beta' },
            timeRange: { default: '1M', max: '6M' },
          },
        },
      },
    });
    const ctx = getProjectContext(tmpDir);
    // No defaultProfile set, so detection falls through to git
    expect(ctx.detectedFrom).toBe('gitRemote');
    expect(ctx.projectId).toBe('my-repo');
    expect(ctx.availableProfiles).toEqual(['alpha', 'beta']);
  });

  it('should return repoInfo with parsed domain from git', () => {
    writeGitConfig(tmpDir, 'https://github.com/owner/food-delivery-app.git');
    const ctx = getProjectContext(tmpDir);
    expect(ctx.repoInfo!.domain).toBe('hospitality/restaurant');
    expect(ctx.repoInfo!.component).toBe('app');
  });

  it('should return defaultProfile metadata when detected from profile', () => {
    writeSpecweaveConfig(tmpDir, {
      sync: {
        defaultProfile: 'prod',
        profiles: {
          prod: {
            provider: 'ado',
            displayName: 'Production ADO',
            config: { organization: 'myorg', project: 'Platform' },
            timeRange: { default: '1M', max: '6M' },
          },
        },
      },
    });
    const ctx = getProjectContext(tmpDir);
    expect(ctx.defaultProfile).not.toBeNull();
    expect(ctx.defaultProfile!.id).toBe('prod');
    expect(ctx.defaultProfile!.displayName).toBe('Production ADO');
    expect(ctx.defaultProfile!.provider).toBe('ado');
  });
});
