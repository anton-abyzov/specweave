import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PLUGIN_KEYWORDS } from '../../src/utils/plugin-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

/**
 * Validation Tests: Plugin Keywords vs Marketplace
 *
 * Ensures that all plugins referenced in PLUGIN_KEYWORDS actually exist
 * in the marketplace.json. This prevents the bug where validate-plugins
 * tries to install non-existent plugins.
 *
 * Bug Context (2025-11-22):
 * - PLUGIN_KEYWORDS had: specweave-backend-nodejs, specweave-backend-python,
 *   specweave-backend-dotnet, specweave-e2e-testing (4 non-existent plugins)
 * - Actual marketplace has: specweave-backend, specweave-testing (2 plugins)
 * - This caused "Plugin not found in marketplace" errors on client projects
 */
describe('PLUGIN_KEYWORDS Validation', () => {
  let marketplacePlugins: string[];

  beforeAll(() => {
    // Read marketplace.json to get actual plugin names
    const marketplacePath = join(projectRoot, '.claude-plugin', 'marketplace.json');
    const marketplaceContent = readFileSync(marketplacePath, 'utf-8');
    const marketplace = JSON.parse(marketplaceContent);

    marketplacePlugins = marketplace.plugins.map((p: any) => p.name);
  });

  it('should only reference plugins that exist in marketplace.json', () => {
    const keywordPlugins = Object.keys(PLUGIN_KEYWORDS);
    const invalidPlugins = keywordPlugins.filter(
      (plugin) => !marketplacePlugins.includes(plugin)
    );

    if (invalidPlugins.length > 0) {
      throw new Error(
        `PLUGIN_KEYWORDS contains non-existent plugins:\n` +
          `  - ${invalidPlugins.join('\n  - ')}\n\n` +
          `Available plugins in marketplace.json:\n` +
          `  - ${marketplacePlugins.join('\n  - ')}\n\n` +
          `Fix: Remove non-existent plugins from PLUGIN_KEYWORDS in src/utils/plugin-validator.ts`
      );
    }

    expect(invalidPlugins).toEqual([]);
  });

  it('should have keywords for all major marketplace plugins', () => {
    // Core plugins that SHOULD have keyword mappings
    const corePlugins = [
      'specweave-github',
      'specweave-jira',
      'specweave-ado',
      'specweave-backend',
      'specweave-frontend',
      'specweave-testing',
      'specweave-kubernetes',
      'specweave-payments',
      'specweave-diagrams',
    ];

    const missingKeywords = corePlugins.filter(
      (plugin) => !Object.keys(PLUGIN_KEYWORDS).includes(plugin)
    );

    if (missingKeywords.length > 0) {
      console.warn(
        `⚠️  Warning: Core plugins missing keyword mappings:\n` +
          `  - ${missingKeywords.join('\n  - ')}`
      );
    }

    // This is a warning, not a hard failure (some plugins might not need keywords)
    expect(missingKeywords.length).toBeLessThan(3);
  });

  it('should have valid keyword arrays for each plugin', () => {
    Object.entries(PLUGIN_KEYWORDS).forEach(([plugin, keywords]) => {
      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBeGreaterThan(0);
      expect(plugin).toMatch(/^specweave-/);

      // Each keyword should be a non-empty string
      keywords.forEach((keyword) => {
        expect(typeof keyword).toBe('string');
        expect(keyword.trim().length).toBeGreaterThan(0);
      });
    });
  });

  it('should detect backend plugin with multi-stack keywords', () => {
    // Test that specweave-backend covers all backend stacks
    const backendKeywords = PLUGIN_KEYWORDS['specweave-backend'];

    expect(backendKeywords).toBeDefined();
    expect(backendKeywords).toContain('nodejs');
    expect(backendKeywords).toContain('python');
    expect(backendKeywords).toContain('dotnet');
  });

  it('should detect testing plugin with E2E keywords', () => {
    // Test that specweave-testing covers E2E testing
    const testingKeywords = PLUGIN_KEYWORDS['specweave-testing'];

    expect(testingKeywords).toBeDefined();
    expect(testingKeywords).toContain('playwright');
    expect(testingKeywords).toContain('e2e');
  });
});
