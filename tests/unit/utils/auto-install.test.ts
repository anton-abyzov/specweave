import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Unit Tests for auto-install.ts
 *
 * Tests: COMPONENT_MAPPING, analyzeUserIntent, autoInstallComponents,
 * getAvailableComponents
 */

// Mock fs-native
const {
  mockExistsSync,
  mockEnsureDir,
  mockCopy,
  mockReaddirSync,
  mockStatSync,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockEnsureDir: vi.fn(),
  mockCopy: vi.fn(),
  mockReaddirSync: vi.fn(),
  mockStatSync: vi.fn(),
}));

vi.mock('../../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  ensureDir: mockEnsureDir,
  copy: mockCopy,
  readdirSync: mockReaddirSync,
  statSync: mockStatSync,
}));

// Mock esm-helpers
vi.mock('../../../src/utils/esm-helpers.js', () => ({
  getDirname: vi.fn().mockReturnValue('/mock/dist/utils'),
}));

import {
  COMPONENT_MAPPING,
  analyzeUserIntent,
  autoInstallComponents,
  getAvailableComponents,
} from '../../../src/utils/auto-install.js';

describe('auto-install', () => {
  const originalCwd = process.cwd;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.cwd = vi.fn().mockReturnValue('/test/project');
    // Ensure auto-install is not disabled
    delete process.env.SPECWEAVE_AUTO_INSTALL;
  });

  afterEach(() => {
    process.cwd = originalCwd;
    process.env = { ...originalEnv };
  });

  // ========== COMPONENT_MAPPING ==========

  describe('COMPONENT_MAPPING', () => {
    it('should contain framework mappings', () => {
      expect(COMPONENT_MAPPING['react']).toBeDefined();
      expect(COMPONENT_MAPPING['react'].skills).toEqual([]);

      expect(COMPONENT_MAPPING['next.js']).toBeDefined();
      expect(COMPONENT_MAPPING['next.js'].skills).toContain('nextjs');

      expect(COMPONENT_MAPPING['django']).toBeDefined();
      expect(COMPONENT_MAPPING['django'].skills).toContain('python-backend');
    });

    it('should contain feature mappings', () => {
      expect(COMPONENT_MAPPING['authentication']).toBeDefined();
      expect(COMPONENT_MAPPING['authentication'].agents).toContain('security');

      expect(COMPONENT_MAPPING['payment']).toBeDefined();
      expect(COMPONENT_MAPPING['payment'].skills).toContain('stripe-integrator');
    });

    it('should contain infrastructure mappings', () => {
      expect(COMPONENT_MAPPING['deploy']).toBeDefined();
      expect(COMPONENT_MAPPING['deploy'].agents).toContain('devops');

      expect(COMPONENT_MAPPING['docker']).toBeDefined();
      expect(COMPONENT_MAPPING['docker'].agents).toContain('devops');
    });

    it('should contain testing mappings', () => {
      expect(COMPONENT_MAPPING['e2e']).toBeDefined();
      expect(COMPONENT_MAPPING['e2e'].skills).toContain('e2e-playwright');
      expect(COMPONENT_MAPPING['e2e'].agents).toContain('qa-engineer');
    });

    it('should contain integration mappings', () => {
      expect(COMPONENT_MAPPING['jira']).toBeDefined();
      expect(COMPONENT_MAPPING['jira'].skills).toContain('jira-sync');

      expect(COMPONENT_MAPPING['github']).toBeDefined();
      expect(COMPONENT_MAPPING['github'].skills).toContain('github-sync');
    });
  });

  // ========== analyzeUserIntent ==========

  describe('analyzeUserIntent', () => {
    it('should detect React framework keyword', () => {
      const result = analyzeUserIntent('Build a Django dashboard');

      expect(result.skills).toContain('python-backend');
    });

    it('should detect multiple keywords', () => {
      const result = analyzeUserIntent('Create a Next.js app with Stripe payment');

      expect(result.skills).toContain('nextjs');
      expect(result.skills).toContain('nodejs-backend');
      expect(result.skills).toContain('stripe-integrator');
      expect(result.agents).toContain('security');
    });

    it('should be case-insensitive', () => {
      const result = analyzeUserIntent('Build a DJANGO application with DOCKER');

      expect(result.skills).toContain('python-backend');
      expect(result.agents).toContain('devops');
    });

    it('should add strategic agents for create/build/implement prompts', () => {
      const resultCreate = analyzeUserIntent('Create a todo app');
      expect(resultCreate.agents).toContain('pm');
      expect(resultCreate.agents).toContain('architect');

      const resultBuild = analyzeUserIntent('Build a dashboard');
      expect(resultBuild.agents).toContain('pm');
      expect(resultBuild.agents).toContain('architect');

      const resultImplement = analyzeUserIntent('Implement user auth');
      expect(resultImplement.agents).toContain('pm');
      expect(resultImplement.agents).toContain('architect');
    });

    it('should not add strategic agents for non-creation prompts', () => {
      const result = analyzeUserIntent('Fix the Django bug');

      expect(result.skills).toContain('python-backend');
      expect(result.agents).not.toContain('pm');
      expect(result.agents).not.toContain('architect');
    });

    it('should return empty arrays for unrecognized prompts', () => {
      const result = analyzeUserIntent('Hello world');

      expect(result.skills).toEqual([]);
      expect(result.agents).toEqual([]);
    });

    it('should deduplicate skills and agents', () => {
      // 'nextjs' maps to both 'nextjs' and 'nodejs-backend' skills
      // 'express' also maps to 'nodejs-backend'
      const result = analyzeUserIntent('Build a Next.js app with Express API');

      const nodejsCount = result.skills.filter(s => s === 'nodejs-backend').length;
      expect(nodejsCount).toBe(1);
    });

    it('should detect design-related keywords', () => {
      const result = analyzeUserIntent('Implement a design system for the app');

      expect(result.skills).toContain('design-system-architect');
    });

    it('should detect Figma keyword', () => {
      const result = analyzeUserIntent('Convert Figma designs to code');

      expect(result.skills).toContain('figma');
    });

    it('should detect testing keywords', () => {
      const result = analyzeUserIntent('Write e2e tests with Playwright');

      expect(result.skills).toContain('e2e-playwright');
      expect(result.agents).toContain('qa-engineer');
    });

    it('should detect .NET / ASP.NET keywords', () => {
      const result = analyzeUserIntent('Build an ASP.NET Core API');

      expect(result.skills).toContain('dotnet-backend');
    });

    it('should detect Azure DevOps keyword', () => {
      const result = analyzeUserIntent('Sync with Azure DevOps boards');

      expect(result.skills).toContain('ado-sync');
    });
  });

  // ========== autoInstallComponents ==========

  describe('autoInstallComponents', () => {
    it('should return empty when auto-install is disabled', async () => {
      process.env.SPECWEAVE_AUTO_INSTALL = 'false';

      const result = await autoInstallComponents('Build a React app');

      expect(result.installed.skills).toEqual([]);
      expect(result.installed.agents).toEqual([]);
      expect(result.skipped.skills).toEqual([]);
      expect(result.skipped.agents).toEqual([]);
    });

    it('should return empty when no keywords detected', async () => {
      const result = await autoInstallComponents('Hello world');

      expect(result.installed.skills).toEqual([]);
      expect(result.installed.agents).toEqual([]);
    });

    it('should install missing skills', async () => {
      // findNpmPackagePath: first check for node_modules/specweave/src
      mockExistsSync
        .mockReturnValueOnce(true)   // node_modules/specweave/src exists
        .mockReturnValueOnce(false)  // isComponentInstalled('skills', 'python-backend') -> not installed
        .mockReturnValueOnce(true)   // installComponent: sourcePath exists
        .mockReturnValueOnce(false)  // isComponentInstalled('agents', 'pm') -> not installed
        .mockReturnValueOnce(true)   // installComponent: sourcePath exists
        .mockReturnValueOnce(false)  // isComponentInstalled('agents', 'architect') -> not installed
        .mockReturnValueOnce(true);  // installComponent: sourcePath exists

      mockEnsureDir.mockResolvedValue(undefined);
      mockCopy.mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await autoInstallComponents('Create a Django app', { verbose: false });

      expect(result.installed.skills).toContain('python-backend');
      expect(result.installed.agents).toContain('pm');
      expect(result.installed.agents).toContain('architect');

      consoleSpy.mockRestore();
    });

    it('should skip already installed components', async () => {
      // findNpmPackagePath
      mockExistsSync
        .mockReturnValueOnce(true)   // node_modules/specweave/src exists
        .mockReturnValueOnce(true)   // isComponentInstalled('skills', 'python-backend') -> already installed
        .mockReturnValueOnce(true)   // isComponentInstalled('agents', 'pm') -> already installed
        .mockReturnValueOnce(true);  // isComponentInstalled('agents', 'architect') -> already installed

      const result = await autoInstallComponents('Create a Django app', { verbose: false });

      expect(result.skipped.skills).toContain('python-backend');
      expect(result.skipped.agents).toContain('pm');
      expect(result.skipped.agents).toContain('architect');
      expect(result.installed.skills).toEqual([]);
      expect(result.installed.agents).toEqual([]);
    });

    it('should throw when npm package not found', async () => {
      // All possible paths return false for src check
      mockExistsSync.mockReturnValue(false);

      await expect(
        autoInstallComponents('Create a Django app', { verbose: false })
      ).rejects.toThrow('SpecWeave package not found');
    });

    it('should throw when component source not found', async () => {
      mockExistsSync
        .mockReturnValueOnce(true)   // npm package found
        .mockReturnValueOnce(false)  // skill not installed
        .mockReturnValueOnce(false); // source path doesn't exist

      await expect(
        autoInstallComponents('Create a React app', { verbose: false })
      ).rejects.toThrow('Component not found');
    });

    it('should log output when verbose is true', async () => {
      mockExistsSync
        .mockReturnValueOnce(true)   // npm package found
        .mockReturnValueOnce(false)  // skill not installed
        .mockReturnValueOnce(true);  // source exists

      mockEnsureDir.mockResolvedValue(undefined);
      mockCopy.mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Use a prompt that only triggers one skill and no agents (no create/build/implement)
      await autoInstallComponents('Fix the Django bug', { verbose: true });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ========== getAvailableComponents ==========

  describe('getAvailableComponents', () => {
    it('should list available skills and agents', () => {
      // findNpmPackagePath: src exists
      mockExistsSync
        .mockReturnValueOnce(true)   // node_modules/specweave/src
        .mockReturnValueOnce(true)   // skillsPath exists
        .mockReturnValueOnce(true);  // agentsPath exists

      mockReaddirSync
        .mockReturnValueOnce(['frontend', 'backend', 'file.txt'])
        .mockReturnValueOnce(['pm', 'architect', 'readme.md']);

      mockStatSync
        .mockReturnValueOnce({ isDirectory: () => true })   // frontend
        .mockReturnValueOnce({ isDirectory: () => true })   // backend
        .mockReturnValueOnce({ isDirectory: () => false })  // file.txt
        .mockReturnValueOnce({ isDirectory: () => true })   // pm
        .mockReturnValueOnce({ isDirectory: () => true })   // architect
        .mockReturnValueOnce({ isDirectory: () => false }); // readme.md

      const result = getAvailableComponents();

      expect(result.skills).toEqual(['frontend', 'backend']);
      expect(result.agents).toEqual(['pm', 'architect']);
    });

    it('should return empty arrays when directories do not exist', () => {
      // findNpmPackagePath: src exists
      mockExistsSync
        .mockReturnValueOnce(true)    // node_modules/specweave/src
        .mockReturnValueOnce(false)   // skillsPath doesn't exist
        .mockReturnValueOnce(false);  // agentsPath doesn't exist

      const result = getAvailableComponents();

      expect(result.skills).toEqual([]);
      expect(result.agents).toEqual([]);
    });

    it('should return empty arrays when npm package not found', () => {
      mockExistsSync.mockReturnValue(false);

      const result = getAvailableComponents();

      expect(result.skills).toEqual([]);
      expect(result.agents).toEqual([]);
    });

    it('should filter out non-directory entries', () => {
      mockExistsSync
        .mockReturnValueOnce(true)   // npm package found
        .mockReturnValueOnce(true)   // skillsPath exists
        .mockReturnValueOnce(true);  // agentsPath exists

      mockReaddirSync
        .mockReturnValueOnce(['skill-a', 'README.md'])
        .mockReturnValueOnce(['agent-a']);

      mockStatSync
        .mockReturnValueOnce({ isDirectory: () => true })   // skill-a
        .mockReturnValueOnce({ isDirectory: () => false })  // README.md
        .mockReturnValueOnce({ isDirectory: () => true });  // agent-a

      const result = getAvailableComponents();

      expect(result.skills).toEqual(['skill-a']);
      expect(result.agents).toEqual(['agent-a']);
    });
  });

  // ========== COMPONENT_MAPPING - mobile keywords ==========

  describe('COMPONENT_MAPPING - mobile keywords', () => {
    it('should map "react native" to empty skills', () => {
      expect(COMPONENT_MAPPING['react native']).toBeDefined();
      expect(COMPONENT_MAPPING['react native'].skills).toEqual([]);
    });

    it('should map "react-native" to empty skills', () => {
      expect(COMPONENT_MAPPING['react-native']).toBeDefined();
      expect(COMPONENT_MAPPING['react-native'].skills).toEqual([]);
    });

    it('should map "expo" to empty skills', () => {
      expect(COMPONENT_MAPPING['expo']).toBeDefined();
      expect(COMPONENT_MAPPING['expo'].skills).toEqual([]);
    });

    it('should map "ios" to empty arrays', () => {
      expect(COMPONENT_MAPPING['ios']).toBeDefined();
      expect(COMPONENT_MAPPING['ios'].skills).toEqual([]);
      expect(COMPONENT_MAPPING['ios'].agents).toEqual([]);
    });

    it('should map "android" to empty arrays', () => {
      expect(COMPONENT_MAPPING['android']).toBeDefined();
      expect(COMPONENT_MAPPING['android'].skills).toEqual([]);
      expect(COMPONENT_MAPPING['android'].agents).toEqual([]);
    });

    it('should map "mobile" to empty arrays', () => {
      expect(COMPONENT_MAPPING['mobile']).toBeDefined();
      expect(COMPONENT_MAPPING['mobile'].skills).toEqual([]);
      expect(COMPONENT_MAPPING['mobile'].agents).toEqual([]);
    });

    it('should map "app store" to empty arrays', () => {
      expect(COMPONENT_MAPPING['app store']).toBeDefined();
      expect(COMPONENT_MAPPING['app store'].skills).toEqual([]);
      expect(COMPONENT_MAPPING['app store'].agents).toEqual([]);
    });

    it('should map "play store" to empty arrays', () => {
      expect(COMPONENT_MAPPING['play store']).toBeDefined();
      expect(COMPONENT_MAPPING['play store'].skills).toEqual([]);
      expect(COMPONENT_MAPPING['play store'].agents).toEqual([]);
    });

    it('should not include frontend skill for combined "react native ios" prompt', () => {
      const result = analyzeUserIntent('Create a react native ios app');
      expect(result.skills).toEqual([]);
      // Strategic agents still added from 'create'
      expect(result.agents).toContain('pm');
    });

    it('should have no phantom mobile plugin in any mobile COMPONENT_MAPPING entry', () => {
      const mobileKeys = ['react native', 'react-native', 'expo', 'ios', 'android', 'mobile', 'app store', 'play store'];
      for (const key of mobileKeys) {
        const entry = COMPONENT_MAPPING[key];
        expect(entry, `entry for "${key}" should exist`).toBeDefined();
        expect(entry.skills).not.toContain('mobile');
        expect(entry.agents).not.toContain('mobile');
      }
    });
  });
});
