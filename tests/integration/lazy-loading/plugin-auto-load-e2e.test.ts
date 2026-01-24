/**
 * Integration Tests for Plugin Auto-Loading
 *
 * Tests the end-to-end flow of plugin auto-detection and installation
 * when user prompts contain domain keywords like React, NextJS, UI, etc.
 *
 * This test suite validates:
 * 1. Keyword detection correctly identifies React/NextJS/UI prompts
 * 2. Plugin suggestions are correct for detected domains
 * 3. The flow from prompt → detection → install request works
 *
 * NOTE: All plugin operations now go through Claude CLI.
 * Tests use CLI unavailable mock for predictable behavior.
 *
 * @module tests/integration/lazy-loading/plugin-auto-load-e2e
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock Claude CLI detection - CLI unavailable in tests
const { mockDetectClaudeCli, mockIsClaudeCliAvailable, mockClearCliCache } = vi.hoisted(() => ({
  mockDetectClaudeCli: vi.fn().mockReturnValue({ available: false }),
  mockIsClaudeCliAvailable: vi.fn().mockReturnValue(false),
  mockClearCliCache: vi.fn(),
}));

vi.mock('../../../src/utils/claude-cli-detector.js', () => ({
  detectClaudeCli: mockDetectClaudeCli,
  isClaudeCliAvailable: mockIsClaudeCliAvailable,
  clearCliCache: mockClearCliCache,
}));

import {
  detectSpecWeaveIntent,
  determinePlugins,
  DEVELOPMENT_KEYWORDS,
} from '../../../src/core/lazy-loading/keyword-detector.js';
import {
  PluginCacheManager,
  directoryToMarketplaceName,
} from '../../../src/core/lazy-loading/cache-manager.js';
import { detectProjectType } from '../../../src/core/lazy-loading/project-detector.js';

/**
 * Test fixtures for realistic prompts
 */
const REACT_PROMPTS = [
  'Build a React dashboard with user authentication',
  'Create a NextJS app with API routes and PostgreSQL',
  'Implement a React component for displaying GitHub stats',
  'Build a UI for tracking repository metrics',
  'Create a responsive dashboard using React and Tailwind',
  'Implement user login with NextJS authentication',
  '/sw:do 0001 - implement the React frontend',
  'Let me build a React app with TypeScript backend',
];

const BACKEND_PROMPTS = [
  'Create an Express API for GitHub stats',
  'Build a REST API with PostgreSQL database',
  'Implement authentication with JWT tokens',
  'Create a NestJS backend service',
  'Build a GraphQL API for the dashboard',
  'Set up a backend API with TypeScript and Express',
];

const FULL_STACK_PROMPTS = [
  'Build a React frontend with Express backend for GitHub statistics',
  'Create a NextJS app with API routes and database integration',
  'Implement a dashboard UI with REST API backend',
  'Build a full-stack TypeScript application with React and Express',
];

describe('Plugin Auto-Loading E2E Tests', () => {
  describe('Keyword Detection - React/NextJS/UI Prompts', () => {
    describe('should detect frontend keywords in React prompts', () => {
      it.each(REACT_PROMPTS)('prompt: "%s"', (prompt) => {
        const result = detectSpecWeaveIntent(prompt);

        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.7);
        expect(result.suggestedPlugins).toContain('sw-frontend');
      });
    });

    describe('should detect backend keywords in API prompts', () => {
      it.each(BACKEND_PROMPTS)('prompt: "%s"', (prompt) => {
        const result = detectSpecWeaveIntent(prompt);

        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.7);
        expect(result.suggestedPlugins).toContain('sw-backend');
      });
    });

    describe('should detect both frontend and backend in full-stack prompts', () => {
      it.each(FULL_STACK_PROMPTS)('prompt: "%s"', (prompt) => {
        const result = detectSpecWeaveIntent(prompt);

        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.7);
        expect(result.suggestedPlugins).toContain('sw-frontend');
        expect(result.suggestedPlugins).toContain('sw-backend');
      });
    });

    it('should have high confidence for multi-keyword prompts', () => {
      const prompt = 'Build a React dashboard with NextJS, TypeScript, and Tailwind CSS';
      const result = detectSpecWeaveIntent(prompt);

      expect(result.detected).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.matchedKeywords.length).toBeGreaterThanOrEqual(3);
    });

    it('should detect UI-related keywords', () => {
      const prompts = [
        'Create a user interface for the app',
        'Build a dashboard component',
        'Design a responsive landing page',
        'Implement the UI layout',
      ];

      for (const prompt of prompts) {
        const result = detectSpecWeaveIntent(prompt);
        expect(result.detected).toBe(true);
        expect(result.suggestedPlugins).toContain('sw-frontend');
      }
    });
  });

  describe('Plugin Suggestion Logic', () => {
    it('should suggest frontend plugin for React keywords', () => {
      const plugins = determinePlugins(['react'], 'build a react component');
      expect(plugins).toContain('sw-frontend');
    });

    it('should suggest frontend plugin for NextJS keywords', () => {
      const plugins = determinePlugins(['nextjs'], 'create a next.js app');
      expect(plugins).toContain('sw-frontend');
    });

    it('should suggest backend plugin for API keywords', () => {
      const plugins = determinePlugins(['api'], 'create an api endpoint');
      expect(plugins).toContain('sw-backend');
    });

    it('should suggest multiple plugins for complex prompts', () => {
      const plugins = determinePlugins(
        ['react', 'api', 'database'],
        'build a react app with api and database'
      );
      expect(plugins).toContain('sw-frontend');
      expect(plugins).toContain('sw-backend');
    });

    it('should suggest testing plugin for test keywords', () => {
      const plugins = determinePlugins(['playwright', 'e2e'], 'write e2e tests');
      expect(plugins).toContain('sw-testing');
    });

    it('should always include core specweave plugin', () => {
      const plugins = determinePlugins([], 'any prompt');
      expect(plugins).toContain('sw');
    });
  });

  describe('Development Keywords Coverage', () => {
    it('should have frontend keywords defined', () => {
      expect(DEVELOPMENT_KEYWORDS.frontend).toContain('react');
      expect(DEVELOPMENT_KEYWORDS.frontend).toContain('nextjs');
      expect(DEVELOPMENT_KEYWORDS.frontend).toContain('next.js');
      expect(DEVELOPMENT_KEYWORDS.frontend).toContain('vue');
      expect(DEVELOPMENT_KEYWORDS.frontend).toContain('angular');
      expect(DEVELOPMENT_KEYWORDS.frontend).toContain('component');
      expect(DEVELOPMENT_KEYWORDS.frontend).toContain('ui');
      expect(DEVELOPMENT_KEYWORDS.frontend).toContain('dashboard');
      expect(DEVELOPMENT_KEYWORDS.frontend).toContain('tailwind');
    });

    it('should have backend keywords defined', () => {
      expect(DEVELOPMENT_KEYWORDS.backend).toContain('api');
      expect(DEVELOPMENT_KEYWORDS.backend).toContain('express');
      expect(DEVELOPMENT_KEYWORDS.backend).toContain('database');
      expect(DEVELOPMENT_KEYWORDS.backend).toContain('postgresql');
      expect(DEVELOPMENT_KEYWORDS.backend).toContain('nestjs');
      expect(DEVELOPMENT_KEYWORDS.backend).toContain('graphql');
    });

    it('should have testing keywords defined', () => {
      expect(DEVELOPMENT_KEYWORDS.testing).toContain('test');
      expect(DEVELOPMENT_KEYWORDS.testing).toContain('playwright');
      expect(DEVELOPMENT_KEYWORDS.testing).toContain('vitest');
      expect(DEVELOPMENT_KEYWORDS.testing).toContain('e2e');
    });
  });
});

describe('Plugin Installation E2E Tests', () => {
  let testMarketplaceDir: string;
  let testStateDir: string;
  let cacheManager: PluginCacheManager;

  beforeEach(() => {
    const testBase = path.join(os.tmpdir(), `specweave-test-${Date.now()}`);
    testMarketplaceDir = path.join(testBase, 'marketplace');
    testStateDir = path.join(testBase, 'state');

    fs.mkdirSync(testMarketplaceDir, { recursive: true });
    fs.mkdirSync(testStateDir, { recursive: true });

    // Create test plugin fixtures in marketplace
    createTestPlugin(testMarketplaceDir, 'specweave-frontend');
    createTestPlugin(testMarketplaceDir, 'specweave-backend');
    createTestPlugin(testMarketplaceDir, 'specweave-testing');
    createTestPlugin(testMarketplaceDir, 'specweave');

    // Create empty registry for isolated testing
    const testRegistryPath = path.join(testStateDir, 'installed_plugins.json');
    fs.writeFileSync(testRegistryPath, JSON.stringify({ version: 2, plugins: {} }));

    cacheManager = new PluginCacheManager({
      marketplacePath: testMarketplaceDir,
      statePath: path.join(testStateDir, 'plugins-loaded.json'),
      registryPath: testRegistryPath,
    });
  });

  afterEach(() => {
    if (testMarketplaceDir && fs.existsSync(path.dirname(testMarketplaceDir))) {
      fs.rmSync(path.dirname(testMarketplaceDir), { recursive: true, force: true });
    }
  });

  it('should return success for install request (CLI unavailable)', async () => {
    const result = await cacheManager.installPlugins({
      plugins: ['sw-frontend'],
    });

    expect(result.success).toBe(true);
    // CLI unavailable so no actual installation
    expect(result.pluginsAffected).toBe(0);
  });

  it('should handle multiple plugins request', async () => {
    const result = await cacheManager.installPlugins({
      plugins: ['sw-frontend', 'sw-backend'],
    });

    expect(result.success).toBe(true);
  });

  it('should skip already registered plugins', async () => {
    // Pre-register plugin
    const testRegistryPath = path.join(testStateDir, 'installed_plugins.json');
    const registry = {
      version: 2,
      plugins: {
        'sw-frontend@specweave': [{
          scope: 'user',
          installPath: '/test/path',
          version: '1.0.0',
        }],
      },
    };
    fs.writeFileSync(testRegistryPath, JSON.stringify(registry, null, 2));

    // Recreate manager with updated registry
    cacheManager = new PluginCacheManager({
      marketplacePath: testMarketplaceDir,
      statePath: path.join(testStateDir, 'plugins-loaded.json'),
      registryPath: testRegistryPath,
    });

    const result = await cacheManager.installPlugins({
      plugins: ['sw-frontend'],
    });

    expect(result.success).toBe(true);
    expect(result.pluginsAffected).toBe(0); // Already registered
  });

  it('should check plugin availability in marketplace', () => {
    const marketplacePlugins = cacheManager.getMarketplacePlugins();
    expect(marketplacePlugins).toContain('sw-frontend');
    expect(marketplacePlugins).not.toContain('non-existent-plugin');
  });
});

describe('Project File Detection Integration Tests', () => {
  let testProjectDir: string;

  beforeEach(() => {
    testProjectDir = path.join(os.tmpdir(), `specweave-project-test-${Date.now()}`);
    fs.mkdirSync(testProjectDir, { recursive: true });
  });

  afterEach(() => {
    if (testProjectDir && fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true, force: true });
    }
  });

  it('should detect React project from package.json', () => {
    fs.writeFileSync(
      path.join(testProjectDir, 'package.json'),
      JSON.stringify({
        name: 'test-react-app',
        dependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0',
        },
      })
    );

    const result = detectProjectType(testProjectDir);
    expect(result.types).toContain('react');
    expect(result.plugins).toContain('frontend');
  });

  it('should detect NextJS project from package.json', () => {
    fs.writeFileSync(
      path.join(testProjectDir, 'package.json'),
      JSON.stringify({
        name: 'test-nextjs-app',
        dependencies: {
          next: '^14.0.0',
          react: '^18.0.0',
        },
      })
    );

    const result = detectProjectType(testProjectDir);
    expect(result.types).toContain('nextjs');
    expect(result.plugins).toContain('frontend');
    expect(result.plugins).toContain('backend');
  });

  it('should detect NextJS project from config file', () => {
    fs.writeFileSync(
      path.join(testProjectDir, 'next.config.js'),
      'module.exports = { reactStrictMode: true };'
    );

    const result = detectProjectType(testProjectDir);
    expect(result.types).toContain('nextjs');
    expect(result.plugins).toContain('frontend');
  });

  it('should detect Express backend from package.json', () => {
    fs.writeFileSync(
      path.join(testProjectDir, 'package.json'),
      JSON.stringify({
        name: 'test-express-api',
        dependencies: {
          express: '^4.18.0',
        },
      })
    );

    const result = detectProjectType(testProjectDir);
    expect(result.types).toContain('express');
    expect(result.plugins).toContain('backend');
  });

  it('should detect testing framework from config', () => {
    fs.writeFileSync(
      path.join(testProjectDir, 'playwright.config.ts'),
      'export default { testDir: "./tests" };'
    );

    const result = detectProjectType(testProjectDir);
    expect(result.types).toContain('playwright');
    expect(result.plugins).toContain('testing');
  });

  it('should detect multiple types in a full-stack project', () => {
    fs.writeFileSync(
      path.join(testProjectDir, 'package.json'),
      JSON.stringify({
        name: 'test-fullstack',
        dependencies: {
          next: '^14.0.0',
          react: '^18.0.0',
          express: '^4.18.0',
        },
        devDependencies: {
          '@playwright/test': '^1.40.0',
        },
      })
    );
    fs.writeFileSync(
      path.join(testProjectDir, 'playwright.config.ts'),
      'export default {};'
    );
    fs.mkdirSync(path.join(testProjectDir, '.github'), { recursive: true });

    const result = detectProjectType(testProjectDir);
    expect(result.types).toContain('nextjs');
    expect(result.types).toContain('playwright');
    expect(result.types).toContain('github');
    expect(result.plugins).toContain('frontend');
    expect(result.plugins).toContain('backend');
    expect(result.plugins).toContain('testing');
    expect(result.plugins).toContain('github');
  });
});

describe('End-to-End Plugin Auto-Load Simulation', () => {
  let testMarketplaceDir: string;
  let testStateDir: string;
  let cacheManager: PluginCacheManager;

  beforeEach(() => {
    const testBase = path.join(os.tmpdir(), `specweave-e2e-${Date.now()}`);
    testMarketplaceDir = path.join(testBase, 'marketplace');
    testStateDir = path.join(testBase, 'state');

    fs.mkdirSync(testMarketplaceDir, { recursive: true });
    fs.mkdirSync(testStateDir, { recursive: true });

    // Create test plugins
    createTestPlugin(testMarketplaceDir, 'specweave');
    createTestPlugin(testMarketplaceDir, 'specweave-frontend');
    createTestPlugin(testMarketplaceDir, 'specweave-backend');
    createTestPlugin(testMarketplaceDir, 'specweave-testing');
    createTestPlugin(testMarketplaceDir, 'specweave-github');

    // Initialize empty registry
    const testRegistryPath = path.join(testStateDir, 'installed_plugins.json');
    fs.writeFileSync(testRegistryPath, JSON.stringify({ version: 2, plugins: {} }));

    cacheManager = new PluginCacheManager({
      marketplacePath: testMarketplaceDir,
      statePath: path.join(testStateDir, 'plugins-loaded.json'),
      registryPath: testRegistryPath,
    });
  });

  afterEach(() => {
    if (testMarketplaceDir && fs.existsSync(path.dirname(testMarketplaceDir))) {
      fs.rmSync(path.dirname(testMarketplaceDir), { recursive: true, force: true });
    }
  });

  it('should detect and request plugins for React prompt', async () => {
    const userPrompt = 'Build a React dashboard with user authentication';

    const detection = detectSpecWeaveIntent(userPrompt);
    expect(detection.detected).toBe(true);
    expect(detection.suggestedPlugins).toContain('sw-frontend');

    const result = await cacheManager.installPlugins({
      plugins: detection.suggestedPlugins,
    });
    expect(result.success).toBe(true);
  });

  it('should detect and request plugins for NextJS + API prompt', async () => {
    const userPrompt = 'Create a NextJS app with API routes and PostgreSQL database';

    const detection = detectSpecWeaveIntent(userPrompt);
    expect(detection.detected).toBe(true);
    expect(detection.suggestedPlugins).toContain('sw-frontend');
    expect(detection.suggestedPlugins).toContain('sw-backend');

    const result = await cacheManager.installPlugins({
      plugins: detection.suggestedPlugins,
    });
    expect(result.success).toBe(true);
  });

  it('should detect and request plugins for testing prompt', async () => {
    const userPrompt = 'Write E2E tests with Playwright for the dashboard';

    const detection = detectSpecWeaveIntent(userPrompt);
    expect(detection.detected).toBe(true);
    expect(detection.suggestedPlugins).toContain('sw-testing');

    const result = await cacheManager.installPlugins({
      plugins: detection.suggestedPlugins,
    });
    expect(result.success).toBe(true);
  });

  it('should detect and request plugins for full-stack prompt', async () => {
    const userPrompt =
      'Build a React frontend with Express backend, PostgreSQL database, and Playwright E2E tests';

    const detection = detectSpecWeaveIntent(userPrompt);
    expect(detection.detected).toBe(true);
    expect(detection.confidence).toBeGreaterThanOrEqual(0.8);

    expect(detection.suggestedPlugins).toContain('sw');
    expect(detection.suggestedPlugins).toContain('sw-frontend');
    expect(detection.suggestedPlugins).toContain('sw-backend');
    expect(detection.suggestedPlugins).toContain('sw-testing');

    const result = await cacheManager.installPlugins({
      plugins: detection.suggestedPlugins,
    });
    expect(result.success).toBe(true);
  });

  it('should track analytics after install request', async () => {
    const userPrompt = 'Build a React app with Express API';

    const detection = detectSpecWeaveIntent(userPrompt);
    await cacheManager.installPlugins({
      plugins: detection.suggestedPlugins,
    });

    const analytics = cacheManager.getAnalyticsSummary();
    expect(analytics.totalLoads).toBeGreaterThan(0);
    expect(analytics.availablePlugins).toBeGreaterThan(0);
  });
});

describe('Plugin Registry Verification (CI-Safe)', () => {
  let testDir: string;
  let testMarketplaceDir: string;
  let testStateDir: string;
  let cacheManager: PluginCacheManager;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `specweave-registry-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    testMarketplaceDir = path.join(testDir, 'marketplace');
    testStateDir = path.join(testDir, 'state');

    fs.mkdirSync(testMarketplaceDir, { recursive: true });
    fs.mkdirSync(testStateDir, { recursive: true });

    // Create test plugins
    createTestPlugin(testMarketplaceDir, 'test-frontend');
    createTestPlugin(testMarketplaceDir, 'test-backend');

    // Initialize empty registry
    const testRegistryPath = path.join(testStateDir, 'installed_plugins.json');
    fs.writeFileSync(testRegistryPath, JSON.stringify({ version: 2, plugins: {} }));

    cacheManager = new PluginCacheManager({
      marketplacePath: testMarketplaceDir,
      statePath: path.join(testStateDir, 'plugins-loaded.json'),
      registryPath: testRegistryPath,
    });
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should use cross-platform paths', () => {
    const registryPath = path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json');
    expect(registryPath).toBeTruthy();
    expect(os.homedir()).toBeTruthy();
  });

  it('should handle missing marketplace gracefully', async () => {
    const badManager = new PluginCacheManager({
      marketplacePath: path.join(testDir, 'nonexistent'),
      statePath: path.join(testStateDir, 'plugins.json'),
    });

    const result = await badManager.installPlugins({
      plugins: ['test-frontend'],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Marketplace not found');
  });

  it('should be idempotent - skip already registered', async () => {
    // First install request
    const result1 = await cacheManager.installPlugins({
      plugins: ['test-frontend'],
    });
    expect(result1.success).toBe(true);

    // Second install request
    const result2 = await cacheManager.installPlugins({
      plugins: ['test-frontend'],
    });
    expect(result2.success).toBe(true);
    // Both return 0 because CLI is unavailable
    expect(result2.pluginsAffected).toBe(0);
  });
});

describe('CRITICAL: React Prompt → sw-frontend Installation (Full E2E)', () => {
  let testDir: string;
  let testMarketplaceDir: string;
  let testStateDir: string;
  let cacheManager: PluginCacheManager;

  beforeEach(() => {
    testDir = path.join(
      os.tmpdir(),
      `specweave-react-frontend-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    testMarketplaceDir = path.join(testDir, 'marketplace');
    testStateDir = path.join(testDir, 'state');

    fs.mkdirSync(testMarketplaceDir, { recursive: true });
    fs.mkdirSync(testStateDir, { recursive: true });

    // Create essential test plugins
    createTestPlugin(testMarketplaceDir, 'specweave');
    createTestPlugin(testMarketplaceDir, 'specweave-frontend');
    createTestPlugin(testMarketplaceDir, 'specweave-backend');
    createTestPlugin(testMarketplaceDir, 'specweave-testing');

    // Initialize empty registry
    const testRegistryPath = path.join(testStateDir, 'installed_plugins.json');
    fs.writeFileSync(testRegistryPath, JSON.stringify({ version: 2, plugins: {} }));

    cacheManager = new PluginCacheManager({
      marketplacePath: testMarketplaceDir,
      statePath: path.join(testStateDir, 'plugins-loaded.json'),
      registryPath: testRegistryPath,
    });
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Step 1: Keyword Detection', () => {
    it('should detect "react" keyword in user prompt', () => {
      const prompt = 'Build a React dashboard with TypeScript';
      const result = detectSpecWeaveIntent(prompt);

      expect(result.detected).toBe(true);
      expect(result.matchedKeywords).toContain('react');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect "React" case-insensitively', () => {
      const prompts = [
        'build a REACT app',
        'Create a react component',
        'Use ReactJS for the frontend',
      ];

      for (const prompt of prompts) {
        const result = detectSpecWeaveIntent(prompt);
        expect(result.detected).toBe(true);
        expect(result.matchedKeywords).toContain('react');
      }
    });

    it('should detect multiple frontend keywords for higher confidence', () => {
      const prompt = 'Build a React dashboard with NextJS and TypeScript components';
      const result = detectSpecWeaveIntent(prompt);

      expect(result.detected).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.matchedKeywords.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Step 2: Plugin Suggestion', () => {
    it('should suggest sw-frontend for "react" keyword', () => {
      const prompt = 'Build a React dashboard';
      const result = detectSpecWeaveIntent(prompt);

      expect(result.suggestedPlugins).toContain('sw-frontend');
    });

    it('should suggest sw-frontend for various frontend frameworks', () => {
      const frameworkPrompts = [
        { prompt: 'Build a React app', expected: 'sw-frontend' },
        { prompt: 'Create a Vue component', expected: 'sw-frontend' },
        { prompt: 'Use NextJS for the app', expected: 'sw-frontend' },
        { prompt: 'Build Angular dashboard', expected: 'sw-frontend' },
        { prompt: 'Create UI components', expected: 'sw-frontend' },
      ];

      for (const { prompt, expected } of frameworkPrompts) {
        const result = detectSpecWeaveIntent(prompt);
        expect(result.suggestedPlugins).toContain(expected);
      }
    });

    it('should always include sw (core) in suggestions', () => {
      const prompt = 'Build a React dashboard';
      const result = detectSpecWeaveIntent(prompt);

      expect(result.suggestedPlugins).toContain('sw');
    });
  });

  describe('Step 3: Plugin Install Request', () => {
    it('should request sw-frontend plugin installation', async () => {
      const installResult = await cacheManager.installPlugins({
        plugins: ['sw-frontend'],
      });

      expect(installResult.success).toBe(true);
      // CLI unavailable so 0 affected
      expect(installResult.pluginsAffected).toBe(0);
    });
  });

  describe('Step 4: Full Flow Integration', () => {
    it('CRITICAL: React prompt should request sw-frontend installation', async () => {
      // Step 1: User prompt
      const userPrompt = 'Build a React dashboard with user authentication and Material UI';

      // Step 2: Detect intent
      const detection = detectSpecWeaveIntent(userPrompt);
      expect(detection.detected).toBe(true);
      expect(detection.suggestedPlugins).toContain('sw-frontend');

      // Step 3: Request installation
      const installResult = await cacheManager.installPlugins({
        plugins: detection.suggestedPlugins,
      });
      expect(installResult.success).toBe(true);

      // Step 4: Verify state was updated
      const state = cacheManager.readState();
      expect(state.totalLoads).toBeGreaterThanOrEqual(1);
    });

    it('CRITICAL: Full-stack prompt should request both frontend and backend', async () => {
      const userPrompt = 'Build a React frontend with Express API backend and PostgreSQL database';

      const detection = detectSpecWeaveIntent(userPrompt);
      expect(detection.suggestedPlugins).toContain('sw-frontend');
      expect(detection.suggestedPlugins).toContain('sw-backend');

      const result = await cacheManager.installPlugins({
        plugins: detection.suggestedPlugins,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Step 5: Error Handling', () => {
    it('should handle missing marketplace gracefully', async () => {
      const badManager = new PluginCacheManager({
        marketplacePath: path.join(testDir, 'nonexistent-marketplace'),
        statePath: path.join(testStateDir, 'plugins.json'),
      });

      const result = await badManager.installPlugins({
        plugins: ['sw-frontend'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Marketplace not found');
    });

    it('should handle non-existent plugin gracefully', async () => {
      const result = await cacheManager.installPlugins({
        plugins: ['nonexistent-plugin'],
      });

      // Returns success with 0 affected (plugin not in marketplace)
      expect(result.success).toBe(true);
      expect(result.pluginsAffected).toBe(0);
    });
  });

  describe('Step 6: Analytics Tracking', () => {
    it('should track install request in analytics', async () => {
      await cacheManager.installPlugins({
        plugins: ['sw-frontend'],
      });

      const analytics = cacheManager.getAnalyticsSummary();
      expect(analytics.totalLoads).toBeGreaterThan(0);
    });
  });
});

describe('Keyword → Plugin Mapping Regression Tests', () => {
  const KEYWORD_PLUGIN_MATRIX = [
    // Frontend keywords → sw-frontend
    { keyword: 'react', expectedPlugin: 'sw-frontend' },
    { keyword: 'vue', expectedPlugin: 'sw-frontend' },
    { keyword: 'angular', expectedPlugin: 'sw-frontend' },
    { keyword: 'nextjs', expectedPlugin: 'sw-frontend' },
    { keyword: 'next.js', expectedPlugin: 'sw-frontend' },
    { keyword: 'component', expectedPlugin: 'sw-frontend' },
    { keyword: 'ui', expectedPlugin: 'sw-frontend' },
    { keyword: 'dashboard', expectedPlugin: 'sw-frontend' },
    { keyword: 'tailwind', expectedPlugin: 'sw-frontend' },

    // Backend keywords → sw-backend
    { keyword: 'api', expectedPlugin: 'sw-backend' },
    { keyword: 'express', expectedPlugin: 'sw-backend' },
    { keyword: 'database', expectedPlugin: 'sw-backend' },
    { keyword: 'postgresql', expectedPlugin: 'sw-backend' },
    { keyword: 'nestjs', expectedPlugin: 'sw-backend' },
    { keyword: 'graphql', expectedPlugin: 'sw-backend' },

    // Testing keywords → sw-testing
    { keyword: 'playwright', expectedPlugin: 'sw-testing' },
    { keyword: 'vitest', expectedPlugin: 'sw-testing' },
    { keyword: 'e2e', expectedPlugin: 'sw-testing' },

    // Infrastructure keywords → sw-k8s or sw-infra
    { keyword: 'kubernetes', expectedPlugin: 'sw-k8s' },
    { keyword: 'k8s', expectedPlugin: 'sw-k8s' },
    { keyword: 'terraform', expectedPlugin: 'sw-infra' },
    { keyword: 'docker', expectedPlugin: 'sw-infra' },

    // External sync keywords
    { keyword: 'github sync', expectedPlugin: 'sw-github' },
    { keyword: 'jira', expectedPlugin: 'sw-jira' },
  ];

  it.each(KEYWORD_PLUGIN_MATRIX)(
    'keyword "$keyword" should suggest plugin "$expectedPlugin"',
    ({ keyword, expectedPlugin }) => {
      const prompt = `I need help with ${keyword} for this project`;
      const result = detectSpecWeaveIntent(prompt);

      expect(result.detected).toBe(true);
      expect(result.suggestedPlugins).toContain(expectedPlugin);
    }
  );
});

/**
 * Creates a minimal test plugin in the specified directory
 */
function createTestPlugin(marketplaceDir: string, pluginName: string): void {
  const pluginDir = path.join(marketplaceDir, pluginName);
  fs.mkdirSync(pluginDir, { recursive: true });

  // Create marketplace.json with sw-* name
  fs.writeFileSync(
    path.join(pluginDir, 'marketplace.json'),
    JSON.stringify({
      name: directoryToMarketplaceName(pluginName),
      version: '1.0.0',
      description: `Test plugin: ${pluginName}`,
    })
  );

  // Create skills directory with a test skill
  const skillsDir = path.join(pluginDir, 'skills', 'test-skill');
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillsDir, 'SKILL.md'),
    `---
name: test-skill
description: Test skill for ${pluginName}
---

# Test Skill

This is a test skill for ${pluginName}.
`
  );
}
