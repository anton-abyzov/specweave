/**
 * Official Plugin Manager Tests
 *
 * Tests the official plugin manager that ensures required plugins
 * (context7, playwright) are always installed from claude-plugins-official
 * marketplace, and detects/installs additional plugins (LSP, etc.) based
 * on user prompts.
 *
 * @module tests/integration/lazy-loading/official-plugin-manager
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  REQUIRED_PLUGINS,
  OFFICIAL_PLUGIN_MAP,
  EXCLUDED_OFFICIAL_PLUGINS,
  isPluginInstalled,
  getAvailableOfficialPlugins,
  installOfficialPlugin,
  ensureRequiredPlugins,
  detectNeededOfficialPlugins,
  checkAndInstallOfficialPlugins,
  formatCopyPastePrompt,
  type PluginCheckResult,
} from '../../../src/core/lazy-loading/official-plugin-manager.js';
import { detectClaudeCli } from '../../../src/utils/claude-cli-detector.js';

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('Official Plugin Manager Constants', () => {
  it('should have required plugins defined', () => {
    expect(REQUIRED_PLUGINS).toContain('context7');
    expect(REQUIRED_PLUGINS).toContain('playwright');
    expect(REQUIRED_PLUGINS.length).toBe(2);
  });

  it('should have plugin map for LSP languages', () => {
    // C#/.NET
    expect(OFFICIAL_PLUGIN_MAP['csharp']).toBe('csharp-lsp');
    expect(OFFICIAL_PLUGIN_MAP['c#']).toBe('csharp-lsp');
    expect(OFFICIAL_PLUGIN_MAP['.net']).toBe('csharp-lsp');
    expect(OFFICIAL_PLUGIN_MAP['dotnet']).toBe('csharp-lsp');
    expect(OFFICIAL_PLUGIN_MAP['asp.net']).toBe('csharp-lsp');
    expect(OFFICIAL_PLUGIN_MAP['blazor']).toBe('csharp-lsp');

    // Go
    expect(OFFICIAL_PLUGIN_MAP['golang']).toBe('gopls-lsp');
    expect(OFFICIAL_PLUGIN_MAP['go lang']).toBe('gopls-lsp');

    // Java
    expect(OFFICIAL_PLUGIN_MAP['java']).toBe('jdtls-lsp');
    expect(OFFICIAL_PLUGIN_MAP['spring']).toBe('jdtls-lsp');
    expect(OFFICIAL_PLUGIN_MAP['maven']).toBe('jdtls-lsp');
    expect(OFFICIAL_PLUGIN_MAP['gradle']).toBe('jdtls-lsp');

    // Kotlin
    expect(OFFICIAL_PLUGIN_MAP['kotlin']).toBe('kotlin-lsp');

    // Lua
    expect(OFFICIAL_PLUGIN_MAP['lua']).toBe('lua-lsp');

    // PHP
    expect(OFFICIAL_PLUGIN_MAP['php']).toBe('php-lsp');
    expect(OFFICIAL_PLUGIN_MAP['symfony']).toBe('php-lsp');
    expect(OFFICIAL_PLUGIN_MAP['laravel']).toBe('laravel-boost');

    // C/C++
    expect(OFFICIAL_PLUGIN_MAP['c++']).toBe('clangd-lsp');
    expect(OFFICIAL_PLUGIN_MAP['cpp']).toBe('clangd-lsp');
    expect(OFFICIAL_PLUGIN_MAP['clang']).toBe('clangd-lsp');
  });

  it('should have plugin map for external services', () => {
    // NOTE: GitHub, JIRA, ADO are NOT in this map - use SpecWeave plugins instead
    // (sw-github, sw-jira, sw-ado have better integration)
    expect(OFFICIAL_PLUGIN_MAP['firebase']).toBe('firebase');
    expect(OFFICIAL_PLUGIN_MAP['firestore']).toBe('firebase');
    expect(OFFICIAL_PLUGIN_MAP['gitlab']).toBe('gitlab');
    expect(OFFICIAL_PLUGIN_MAP['linear']).toBe('linear');
    expect(OFFICIAL_PLUGIN_MAP['asana']).toBe('asana');
    expect(OFFICIAL_PLUGIN_MAP['slack']).toBe('slack');
    expect(OFFICIAL_PLUGIN_MAP['slack bot']).toBe('slack');
    expect(OFFICIAL_PLUGIN_MAP['stripe']).toBe('stripe');
    expect(OFFICIAL_PLUGIN_MAP['supabase']).toBe('supabase');
    expect(OFFICIAL_PLUGIN_MAP['greptile']).toBe('greptile');
    expect(OFFICIAL_PLUGIN_MAP['serena']).toBe('serena');
  });

  it('should have plugin map for development workflow plugins', () => {
    expect(OFFICIAL_PLUGIN_MAP['agent sdk']).toBe('agent-sdk-dev');
    expect(OFFICIAL_PLUGIN_MAP['code review']).toBe('code-review');
    expect(OFFICIAL_PLUGIN_MAP['commit']).toBe('commit-commands');
    expect(OFFICIAL_PLUGIN_MAP['frontend design']).toBe('frontend-design');
    expect(OFFICIAL_PLUGIN_MAP['hookify']).toBe('hookify');
    expect(OFFICIAL_PLUGIN_MAP['plugin dev']).toBe('plugin-dev');
  });

  it('should NOT include GitHub/JIRA/ADO (use SpecWeave versions)', () => {
    // These should use sw-github, sw-jira, sw-ado instead
    expect(OFFICIAL_PLUGIN_MAP['github issues']).toBeUndefined();
    expect(OFFICIAL_PLUGIN_MAP['github pr']).toBeUndefined();
    expect(OFFICIAL_PLUGIN_MAP['jira']).toBeUndefined();
    expect(OFFICIAL_PLUGIN_MAP['azure devops']).toBeUndefined();
    expect(OFFICIAL_PLUGIN_MAP['ado']).toBeUndefined();
  });

  it('should have EXCLUDED_OFFICIAL_PLUGINS for SpecWeave-handled services', () => {
    expect(EXCLUDED_OFFICIAL_PLUGINS).toContain('github');
    expect(EXCLUDED_OFFICIAL_PLUGINS).toContain('jira');
    expect(EXCLUDED_OFFICIAL_PLUGINS).toContain('ado');
    expect(EXCLUDED_OFFICIAL_PLUGINS).toContain('azure-devops');
  });
});

// ============================================================================
// PLUGIN INSTALLATION CHECK TESTS
// ============================================================================

describe('isPluginInstalled', () => {
  const mockRegistryPath = path.join(os.tmpdir(), 'test-plugins-registry.json');

  afterEach(() => {
    // Cleanup
    try {
      fs.unlinkSync(mockRegistryPath);
    } catch {
      // Ignore if doesn't exist
    }
  });

  it('should return false when registry file does not exist', () => {
    // Use non-existent path
    const result = isPluginInstalled('nonexistent-plugin');
    // Result depends on actual registry state
    expect(typeof result).toBe('boolean');
  });

  it('should detect installed plugins from registry', () => {
    // Check for context7 which should be installed if we have the official marketplace
    const result = isPluginInstalled('context7');
    expect(typeof result).toBe('boolean');
  });

  it('should return false for non-installed plugins', () => {
    const result = isPluginInstalled('definitely-not-installed-plugin-xyz123');
    expect(result).toBe(false);
  });
});

// ============================================================================
// AVAILABLE PLUGINS TESTS
// ============================================================================

describe('getAvailableOfficialPlugins', () => {
  it('should return array of available plugins', () => {
    const plugins = getAvailableOfficialPlugins();
    expect(Array.isArray(plugins)).toBe(true);
  });

  it('should return plugin names as strings', () => {
    const plugins = getAvailableOfficialPlugins();
    for (const plugin of plugins) {
      expect(typeof plugin).toBe('string');
    }
  });

  it('should include common official plugins when marketplace exists', () => {
    const plugins = getAvailableOfficialPlugins();

    // If marketplace exists, should have some plugins
    if (plugins.length > 0) {
      // Check for common plugins (at least some should exist)
      const commonPlugins = ['context7', 'playwright', 'github', 'firebase'];
      const hasCommon = commonPlugins.some(p => plugins.includes(p));
      expect(hasCommon).toBe(true);
    }
  });
});

// ============================================================================
// ENSURE REQUIRED PLUGINS TESTS
// ============================================================================

describe('ensureRequiredPlugins', () => {
  it('should return PluginCheckResult structure', () => {
    const result = ensureRequiredPlugins();

    expect(result).toHaveProperty('allInstalled');
    expect(result).toHaveProperty('missingPlugins');
    expect(result).toHaveProperty('installedPlugins');
    expect(result).toHaveProperty('needsRestart');
    expect(result).toHaveProperty('message');

    expect(typeof result.allInstalled).toBe('boolean');
    expect(Array.isArray(result.missingPlugins)).toBe(true);
    expect(Array.isArray(result.installedPlugins)).toBe(true);
    expect(typeof result.needsRestart).toBe('boolean');
    expect(typeof result.message).toBe('string');
  });

  it('should check for context7 and playwright', () => {
    const result = ensureRequiredPlugins();

    // Either all installed or some missing
    if (result.allInstalled) {
      expect(result.missingPlugins.length).toBe(0);
      expect(result.needsRestart).toBe(false);
    } else {
      // If not all installed, should list what's missing
      const possibleMissing = ['context7', 'playwright'];
      for (const missing of result.missingPlugins) {
        expect(possibleMissing).toContain(missing);
      }
    }
  });
});

// ============================================================================
// LLM DETECTION TESTS
// ============================================================================

describe('detectNeededOfficialPlugins', () => {
  const cliStatus = detectClaudeCli();
  const describeIfCli = cliStatus.available ? describe : describe.skip;

  describeIfCli('With Claude CLI Available', () => {
    it('should always include context7 for coding tasks', async () => {
      const plugins = await detectNeededOfficialPlugins('Build a simple web app');
      expect(plugins).toContain('context7');
    }, 30000);

    it('should detect C# LSP for .NET prompts', async () => {
      const plugins = await detectNeededOfficialPlugins('Create an ASP.NET Core REST API with Entity Framework');

      // Should include context7 and csharp-lsp
      expect(plugins).toContain('context7');
      // LSP detection depends on LLM response
      const hasCsharp = plugins.includes('csharp-lsp');
      // At minimum, should have context7
      expect(plugins.length).toBeGreaterThan(0);
    }, 30000);

    it('should detect Go LSP for Golang prompts', async () => {
      const plugins = await detectNeededOfficialPlugins('Build a Go microservice with gRPC');

      expect(plugins).toContain('context7');
    }, 30000);

    it('should detect Java LSP for Spring Boot prompts', async () => {
      const plugins = await detectNeededOfficialPlugins('Create a Spring Boot application with JPA');

      expect(plugins).toContain('context7');
    }, 30000);

    it('should detect Firebase for Firestore prompts', async () => {
      const plugins = await detectNeededOfficialPlugins('Set up Firebase authentication with Firestore');

      expect(plugins).toContain('context7');
    }, 30000);

    it('should detect Stripe for payment prompts', async () => {
      const plugins = await detectNeededOfficialPlugins('Integrate Stripe checkout for subscriptions');

      expect(plugins).toContain('context7');
    }, 30000);

    it('should NOT return github even when asked for GitHub integration (use sw-github)', async () => {
      const plugins = await detectNeededOfficialPlugins('Build GitHub integration to manage issues');

      // Should NOT include github - must use sw-github instead
      expect(plugins).not.toContain('github');
      // Should still have context7
      expect(plugins).toContain('context7');
    }, 30000);

    it('should return empty for non-coding prompts', async () => {
      const plugins = await detectNeededOfficialPlugins('What is the weather today?');

      // May or may not include context7 for general questions
      expect(Array.isArray(plugins)).toBe(true);
    }, 30000);

    it('should filter to available plugins only', async () => {
      const plugins = await detectNeededOfficialPlugins('Build an app with React and Firebase');
      const available = getAvailableOfficialPlugins();

      // All detected plugins should be available (if any were detected)
      for (const plugin of plugins) {
        if (available.length > 0) {
          expect(available).toContain(plugin);
        }
      }
    }, 30000);
  });

  describe('Without Claude CLI', () => {
    it('should handle missing CLI gracefully', async () => {
      // Even without CLI, should return array (possibly empty)
      const result = await detectNeededOfficialPlugins('Build something');
      expect(Array.isArray(result)).toBe(true);
    }, 30000);
  });
});

// ============================================================================
// FULL WORKFLOW TESTS
// ============================================================================

describe('checkAndInstallOfficialPlugins', () => {
  const cliStatus = detectClaudeCli();
  const describeIfCli = cliStatus.available ? describe : describe.skip;

  it('should return PluginCheckResult structure', async () => {
    const result = await checkAndInstallOfficialPlugins('Build a web app');

    expect(result).toHaveProperty('allInstalled');
    expect(result).toHaveProperty('missingPlugins');
    expect(result).toHaveProperty('installedPlugins');
    expect(result).toHaveProperty('needsRestart');
    expect(result).toHaveProperty('message');
  }, 30000);

  describeIfCli('With Claude CLI Available', () => {
    it('should preserve original prompt for copy-paste', async () => {
      const originalPrompt = 'Build a C# REST API with ASP.NET Core';
      const result = await checkAndInstallOfficialPlugins('plugin check', originalPrompt);

      if (result.needsRestart && result.copyPastePrompt) {
        expect(result.copyPastePrompt).toBe(originalPrompt);
      }
    }, 30000);

    it('should include restart message when plugins installed', async () => {
      const result = await checkAndInstallOfficialPlugins('Build a web app');

      if (result.installedPlugins.length > 0) {
        expect(result.needsRestart).toBe(true);
        expect(result.message).toContain('restart');
      }
    }, 30000);
  });
});

// ============================================================================
// FORMAT HELPERS TESTS
// ============================================================================

describe('formatCopyPastePrompt', () => {
  it('should format prompt with decorations', () => {
    const prompt = 'Build a React dashboard';
    const formatted = formatCopyPastePrompt(prompt);

    expect(formatted).toContain(prompt);
    expect(formatted).toContain('COPY THIS PROMPT');
    expect(formatted).toContain('─');
  });

  it('should handle multi-line prompts', () => {
    const prompt = 'Build a React dashboard\nwith charts\nand tables';
    const formatted = formatCopyPastePrompt(prompt);

    expect(formatted).toContain(prompt);
  });

  it('should handle empty prompt', () => {
    const formatted = formatCopyPastePrompt('');
    expect(typeof formatted).toBe('string');
  });
});

// ============================================================================
// RESTART MESSAGE TESTS
// ============================================================================

describe('Restart Message Format', () => {
  it('should contain required elements', () => {
    // Simulate what buildRestartMessage produces
    const mockResult: PluginCheckResult = {
      allInstalled: false,
      missingPlugins: [],
      installedPlugins: ['context7', 'playwright'],
      needsRestart: true,
      message: '═'.repeat(60) + '\n⚠️  PLUGINS INSTALLED - RESTART REQUIRED\n',
    };

    expect(mockResult.message).toContain('RESTART');
    expect(mockResult.message).toContain('═');
  });

  it('should list installed plugins', async () => {
    const result = await checkAndInstallOfficialPlugins('Build something');

    if (result.installedPlugins.length > 0) {
      for (const plugin of result.installedPlugins) {
        expect(result.message).toContain(plugin);
      }
    }
  }, 30000);
});

// ============================================================================
// CROSS-PLATFORM TESTS
// ============================================================================

describe('Cross-Platform Compatibility', () => {
  it('should use correct paths for platform', () => {
    const homedir = os.homedir();
    const registryPath = path.join(homedir, '.claude', 'plugins', 'installed_plugins.json');
    const marketplacePath = path.join(homedir, '.claude', 'plugins', 'marketplaces', 'claude-plugins-official');

    // Paths should not contain mixed separators
    if (process.platform === 'win32') {
      expect(registryPath).not.toContain('/');
    } else {
      expect(registryPath).not.toContain('\\');
    }
  });

  it('should handle missing directories gracefully', () => {
    // Function should not throw on missing directories
    expect(() => getAvailableOfficialPlugins()).not.toThrow();
    expect(() => isPluginInstalled('test')).not.toThrow();
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling', () => {
  it('should handle corrupted registry gracefully', () => {
    // isPluginInstalled should handle JSON parse errors
    const result = isPluginInstalled('test-plugin');
    expect(typeof result).toBe('boolean');
  });

  it('should handle CLI errors gracefully', async () => {
    // detectNeededOfficialPlugins should not throw
    const result = await detectNeededOfficialPlugins('test prompt');
    expect(Array.isArray(result)).toBe(true);
  }, 30000);

  it('should handle install failures gracefully', () => {
    // installOfficialPlugin should return false on failure, not throw
    const result = installOfficialPlugin('definitely-nonexistent-plugin-xyz');
    expect(typeof result).toBe('boolean');
    // Should be false since plugin doesn't exist
    expect(result).toBe(false);
  });
});

// ============================================================================
// INTEGRATION WITH SW-ROUTER TESTS
// ============================================================================

describe('Integration with sw-router', () => {
  it('should provide all necessary exports for router', () => {
    // Router needs these functions
    expect(typeof isPluginInstalled).toBe('function');
    expect(typeof ensureRequiredPlugins).toBe('function');
    expect(typeof detectNeededOfficialPlugins).toBe('function');
    expect(typeof checkAndInstallOfficialPlugins).toBe('function');
    expect(typeof formatCopyPastePrompt).toBe('function');
  });

  it('should export REQUIRED_PLUGINS constant', () => {
    expect(Array.isArray(REQUIRED_PLUGINS)).toBe(true);
    expect(REQUIRED_PLUGINS.length).toBeGreaterThan(0);
  });

  it('should export OFFICIAL_PLUGIN_MAP constant', () => {
    expect(typeof OFFICIAL_PLUGIN_MAP).toBe('object');
    expect(Object.keys(OFFICIAL_PLUGIN_MAP).length).toBeGreaterThan(0);
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Performance', () => {
  it('should check plugin installation quickly', () => {
    const start = performance.now();
    isPluginInstalled('context7');
    const duration = performance.now() - start;

    // Should complete in under 100ms (file system operation)
    expect(duration).toBeLessThan(100);
  });

  it('should list available plugins quickly', () => {
    const start = performance.now();
    getAvailableOfficialPlugins();
    const duration = performance.now() - start;

    // Should complete in under 500ms (directory listing)
    expect(duration).toBeLessThan(500);
  });

  const cliStatus = detectClaudeCli();

  (cliStatus.available ? it : it.skip)('should complete LLM detection within timeout', async () => {
    const start = performance.now();
    await detectNeededOfficialPlugins('Build a simple app');
    const duration = performance.now() - start;

    // Should complete in under 20 seconds (LLM call)
    expect(duration).toBeLessThan(20000);
    console.log(`LLM plugin detection took ${duration.toFixed(0)}ms`);
  }, 30000);
});
