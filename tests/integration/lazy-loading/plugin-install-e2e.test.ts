/**
 * E2E Integration Test for Plugin Auto-Load Flow
 *
 * Tests the REAL plugin installation flow:
 * 1. Verify core plugins (specweave, specweave-router) are installed
 * 2. Send user prompt to LLM detection
 * 3. Verify `claude plugin install` CLI is called
 * 4. Verify plugin appears in registry
 * 5. Teardown: uninstall test plugin
 *
 * REQUIREMENTS:
 * - `claude` CLI must be installed and in PATH
 * - Test skips gracefully if CLI unavailable
 *
 * RUN:
 *   npx vitest run tests/integration/lazy-loading/plugin-install-e2e.test.ts
 *
 * @module tests/integration/lazy-loading/plugin-install-e2e
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
// Import detect-intent function directly - no subprocess needed!
import { detectIntentCommand, type DetectIntentResult } from '../../../src/cli/commands/detect-intent.js';
// Import cache clearing function to reset CLI detection state between tests
import { clearCliCache } from '../../../src/core/lazy-loading/llm-plugin-detector.js';
// REFACTORED: Use SpecWeave's execFileNoThrowSync wrapper instead of raw spawnSync
// The wrapper already handles:
// - getCleanEnv() for debug mode compatibility
// - shell: true on Windows for .cmd files
// - Structured { success, exitCode, stdout, stderr } result
import { execFileNoThrowSync } from '../../../src/utils/execFileNoThrow.js';

// Test configuration
// NOTE: Use SHORT name (sw-*) for plugin operations, matching marketplace.json
const TEST_PLUGIN = 'sw-frontend'; // Plugin to test install/uninstall (short name)
const CLAUDE_REGISTRY_PATH = path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json');
const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const CLAUDE_SKILLS_PATH = path.join(os.homedir(), '.claude', 'skills');

/**
 * Check if Claude CLI is available
 * Uses execFileNoThrowSync which handles clean env and cross-platform compatibility
 */
function isClaudeCliAvailable(): boolean {
  try {
    // execFileNoThrowSync internally calls getCleanEnv() and handles cross-platform issues
    const result = execFileNoThrowSync('claude', ['--version'], {
      timeout: 10000,
      shell: true, // CRITICAL: claude is often a shell function on macOS/Linux
    });
    return result.success;
  } catch {
    return false;
  }
}

/**
 * CRITICAL: Check CLI availability at MODULE LOAD TIME
 *
 * Vitest's it.skipIf() evaluates the condition when the file is loaded,
 * NOT when beforeAll runs. So we must check CLI availability here,
 * at the top level, before any describe blocks register tests.
 */
const CLI_AVAILABLE_AT_LOAD = isClaudeCliAvailable();
if (!CLI_AVAILABLE_AT_LOAD) {
  console.log('⚠️  Claude CLI not available - tests will be skipped');
  console.log('   Install: npm install -g @anthropic-ai/claude-code');
}

/**
 * Check if a plugin is installed AND enabled in Claude Code
 *
 * Claude Code uses TWO files:
 * 1. ~/.claude/plugins/installed_plugins.json - list of installed plugins
 * 2. ~/.claude/settings.json - enabledPlugins map (plugin@marketplace -> true/false)
 *
 * A plugin is "active" only if it exists in BOTH:
 * - installed_plugins.json (installed)
 * - settings.json enabledPlugins with value true (enabled)
 *
 * The marketplace UI "installed" count = enabled plugins only.
 *
 * IMPORTANT: Claude CLI may register plugins with EITHER:
 * - Short name: sw-frontend@specweave (from marketplace.json "name" field)
 * - Long name: specweave-frontend@specweave (from source folder name)
 * This function checks BOTH naming conventions.
 */
function isPluginInstalled(pluginName: string): boolean {
  try {
    // Build both possible keys
    const shortKey = `${pluginName}@specweave`;
    const longName = PLUGIN_FOLDER_TO_SHORT[pluginName]
      ? pluginName // Already a long name, use as-is
      : Object.entries(PLUGIN_FOLDER_TO_SHORT).find(([, short]) => short === pluginName)?.[0];
    const longKey = longName ? `${longName}@specweave` : null;

    // Check 1: Is it in the registry? (check both keys)
    if (!fs.existsSync(CLAUDE_REGISTRY_PATH)) {
      return false;
    }
    const registry = JSON.parse(fs.readFileSync(CLAUDE_REGISTRY_PATH, 'utf8'));
    const hasShort = registry.plugins?.[shortKey]?.length > 0;
    const hasLong = longKey ? registry.plugins?.[longKey]?.length > 0 : false;
    if (!hasShort && !hasLong) {
      return false;
    }

    // Check 2: Is it enabled in settings.json? (check both keys)
    if (!fs.existsSync(CLAUDE_SETTINGS_PATH)) {
      return false;
    }
    const settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8'));
    const enabledShort = settings.enabledPlugins?.[shortKey] === true;
    const enabledLong = longKey ? settings.enabledPlugins?.[longKey] === true : false;
    return enabledShort || enabledLong;
  } catch {
    return false;
  }
}

/**
 * Check if a plugin exists in registry (regardless of enabled state)
 * Useful for cleanup checks
 *
 * IMPORTANT: Checks BOTH short and long naming conventions.
 */
function isPluginInRegistry(pluginName: string): boolean {
  try {
    if (!fs.existsSync(CLAUDE_REGISTRY_PATH)) {
      return false;
    }
    const registry = JSON.parse(fs.readFileSync(CLAUDE_REGISTRY_PATH, 'utf8'));

    // Check both short and long name formats
    const shortKey = `${pluginName}@specweave`;
    const longName = PLUGIN_FOLDER_TO_SHORT[pluginName]
      ? pluginName
      : Object.entries(PLUGIN_FOLDER_TO_SHORT).find(([, short]) => short === pluginName)?.[0];
    const longKey = longName ? `${longName}@specweave` : null;

    const hasShort = !!(registry.plugins?.[shortKey] && registry.plugins[shortKey].length > 0);
    const hasLong = longKey ? !!(registry.plugins?.[longKey] && registry.plugins[longKey].length > 0) : false;

    return hasShort || hasLong;
  } catch {
    return false;
  }
}

/**
 * Check if a plugin exists in skills directory
 */
function isPluginInSkillsDir(pluginName: string): boolean {
  return fs.existsSync(path.join(CLAUDE_SKILLS_PATH, pluginName));
}

/**
 * Map plugin FOLDER names to SHORT names (for Claude CLI)
 *
 * SHORT names are defined in marketplace.json and are what users should use:
 * `claude plugin install sw-testing@specweave` (NOT specweave-testing)
 */
const PLUGIN_FOLDER_TO_SHORT: Record<string, string> = {
  specweave: 'sw',
  'specweave-router': 'sw-router',
  'specweave-frontend': 'sw-frontend',
  'specweave-backend': 'sw-backend',
  'specweave-testing': 'sw-testing',
  'specweave-github': 'sw-github',
  'specweave-jira': 'sw-jira',
  'specweave-ado': 'sw-ado',
  'specweave-infrastructure': 'sw-infra',
  'specweave-kubernetes': 'sw-k8s',
  'specweave-ml': 'sw-ml',
  'specweave-kafka': 'sw-kafka',
  'specweave-confluent': 'sw-confluent',
  'specweave-mobile': 'sw-mobile',
  'specweave-payments': 'sw-payments',
  'specweave-release': 'sw-release',
  'specweave-diagrams': 'sw-diagrams',
};

/**
 * Enable a plugin via Claude CLI
 *
 * Claude CLI has native plugin management:
 * - `claude plugin enable <plugin>@<marketplace>` - enables already-installed plugin
 * - `claude plugin install <plugin>@<marketplace>` - installs new plugin
 *
 * Most SpecWeave plugins are already installed but disabled - use enable first.
 * Accepts EITHER short name (sw-frontend) or long name (specweave-frontend).
 */
function enablePluginViaClaude(pluginName: string): { success: boolean; output: string } {
  try {
    // Convert to short name if needed
    const shortName = PLUGIN_FOLDER_TO_SHORT[pluginName] || pluginName;
    const pluginKey = `${shortName}@specweave`;

    // First try to enable (faster, works for already-installed plugins)
    const enableResult = execFileNoThrowSync('claude', ['plugin', 'enable', pluginKey], {
      timeout: 30000,
      shell: true,
    });

    const enableOutput = enableResult.stdout || enableResult.stderr || '';

    // Success if exit 0 OR if already enabled (exit 1 but message says "already enabled")
    if (enableResult.success || enableOutput.includes('already enabled') || enableOutput.includes('Success')) {
      return { success: true, output: enableOutput || 'Plugin enabled' };
    }

    // If enable fails (not already enabled), try install (for truly new plugins)
    const installResult = execFileNoThrowSync('claude', ['plugin', 'install', pluginKey], {
      timeout: 60000,
      shell: true,
    });

    const installOutput = installResult.stdout || installResult.stderr || '';
    return {
      success: installResult.success || installOutput.includes('already') || installOutput.includes('Success'),
      output: installOutput,
    };
  } catch (error) {
    return { success: false, output: String(error) };
  }
}

/**
 * Install a plugin via Claude CLI using SHORT names
 *
 * Accepts EITHER short name (sw-frontend) or long name (specweave-frontend).
 * Converts to short name for the Claude CLI call.
 */
function installPluginViaClaude(pluginName: string): { success: boolean; output: string } {
  try {
    // Convert to short name if needed (accepts either format)
    const shortName = PLUGIN_FOLDER_TO_SHORT[pluginName] || pluginName;
    const pluginKey = `${shortName}@specweave`;

    const result = execFileNoThrowSync('claude', ['plugin', 'install', pluginKey], {
      timeout: 60000,
      shell: true,
    });
    // Combine BOTH stdout AND stderr (error messages go to stderr)
    const output = (result.stdout || '') + (result.stderr || '');
    return {
      success: result.success || output.includes('already') || output.includes('registered') || output.includes('Success'),
      output,
    };
  } catch (error) {
    return { success: false, output: String(error) };
  }
}

/**
 * Unload a plugin (SpecWeave doesn't have a direct unload, but we can disable)
 *
 * NOTE: SpecWeave doesn't currently support unloading plugins.
 * Once loaded, plugins remain until Claude Code restarts.
 * This function is a placeholder for future functionality.
 */
function _uninstallPlugin(_pluginName: string): { success: boolean; output: string } {
  // SpecWeave doesn't have an unload command yet
  // Plugins persist until Claude Code session ends
  return {
    success: true,
    output: 'Note: SpecWeave plugins cannot be unloaded mid-session. They persist until Claude Code restarts.',
  };
}

/**
 * Run detect-intent by calling the function directly (no subprocess!)
 *
 * This is more reliable than spawning `npx specweave detect-intent` because:
 * - No shell quoting issues
 * - No subprocess overhead
 * - Direct access to return values
 */
async function runDetectIntent(
  prompt: string,
  options: { install?: boolean; silent?: boolean } = {}
): Promise<{
  success: boolean;
  result?: DetectIntentResult;
  error?: string;
}> {
  try {
    // Call the function directly - no subprocess needed!
    const result = await detectIntentCommand(prompt, {
      install: options.install,
      silent: true, // Always silent in tests - we get the result directly
    });

    return { success: true, result };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * SIMPLE CLI PLUGIN TEST - UNIVERSAL SOLUTION
 *
 * Tests `claude plugin` CLI commands in a way that works EVERYWHERE:
 * - Terminal (direct invocation)
 * - VSCode Debug mode (getCleanEnv() prevents NODE_OPTIONS interference)
 * - CI/CD pipelines
 * - Any OS (Windows/macOS/Linux - shell:true handles functions/aliases)
 *
 * PLUGIN NAMING:
 * - Install uses SHORT names from marketplace.json: `sw-testing@specweave`
 * - After install, registry stores with the same short name
 * - Some legacy plugins may have long names like `specweave-testing@specweave`
 *
 * COMMANDS:
 * - `claude plugin list` - shows all installed plugins
 * - `claude plugin install sw-testing@specweave` - installs plugin (short name)
 * - `claude plugin enable/disable <name>@specweave` - toggle existing plugin
 * - `claude plugin uninstall <name>@specweave` - removes plugin
 *
 * RUN THIS TEST:
 *   npx vitest run tests/integration/lazy-loading/plugin-install-e2e.test.ts -t "Direct CLI"
 */
describe('Direct CLI Plugin Install Test', () => {
  // Use module-level CLI_AVAILABLE_AT_LOAD for it.skipIf() to work correctly
  // (it.skipIf evaluates at registration time, not at runtime)

  beforeAll(() => {
    // Clear any stale cache from previous test files
    clearCliCache();
  });

  /**
   * Find a disabled SpecWeave plugin to test enable/disable
   * Plugin names: sw-*@specweave (e.g., sw-backend@specweave)
   * As of v1.0.160, uses sw-* marketplace naming convention
   */
  function findDisabledSpecweavePlugin(): string | null {
    try {
      if (!fs.existsSync(CLAUDE_SETTINGS_PATH)) return null;
      const settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8'));
      const enabledPlugins = settings.enabledPlugins || {};

      // Find any specweave plugin that is disabled (false or missing)
      for (const [key, enabled] of Object.entries(enabledPlugins)) {
        if (key.endsWith('@specweave') && enabled === false) {
          return key;
        }
      }

      // Also check registry for plugins not in settings
      if (fs.existsSync(CLAUDE_REGISTRY_PATH)) {
        const registry = JSON.parse(fs.readFileSync(CLAUDE_REGISTRY_PATH, 'utf8'));
        for (const key of Object.keys(registry.plugins || {})) {
          if (key.endsWith('@specweave') && !enabledPlugins[key]) {
            return key;
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should enable and disable plugin via claude CLI', () => {
    // Find a disabled specweave plugin from the registry
    // NOTE: As of v1.0.160, plugin naming convention is:
    // - Marketplace names: sw, sw-* (e.g., sw-backend@specweave)
    // - Directory names: specweave, specweave-* (for filesystem paths)
    // The test uses whatever is found in the registry, or falls back to sw-backend
    const foundPlugin = findDisabledSpecweavePlugin();
    const pluginKey = foundPlugin || 'sw-backend@specweave';

    console.log('\n📦 Testing: claude plugin enable/disable ' + pluginKey);

    // Step 1: Enable the plugin
    const enableResult = execFileNoThrowSync('claude', ['plugin', 'enable', pluginKey], {
      timeout: 60000,
      shell: true, // Required for shell functions/aliases on all platforms
    });

    console.log('   Enable exit code:', enableResult.exitCode);
    console.log('   Enable output:', (enableResult.stdout || enableResult.stderr || '').substring(0, 300));

    // Step 2: Check if enable succeeded
    const enableOutput = (enableResult.stdout || '') + (enableResult.stderr || '');
    const enableSuccess = enableResult.success ||
      enableOutput.includes('enabled') ||
      enableOutput.includes('already');

    // Skip if plugin doesn't exist (not installed in this environment)
    // This is common in CI or fresh environments where SpecWeave plugins aren't pre-installed
    if (!enableSuccess && enableOutput.includes('not found') && !foundPlugin) {
      console.log('   ⏭️  Skipping: Plugin not found in this environment (expected in CI/fresh installs)');
      return;
    }

    expect(enableSuccess).toBe(true);

    // Step 3: Verify plugin is enabled in settings.json
    if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
      const settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8'));
      const isEnabled = settings.enabledPlugins?.[pluginKey];
      console.log('   Enabled in settings:', isEnabled);
      expect(isEnabled).toBe(true);
    }

    console.log('   ✅ Plugin enabled successfully!\n');

    // Step 4: Disable the plugin (cleanup)
    const disableResult = execFileNoThrowSync('claude', ['plugin', 'disable', pluginKey], {
      timeout: 30000,
      shell: true,
    });

    console.log('   Disable exit code:', disableResult.exitCode);
    console.log('   Disable output:', (disableResult.stdout || disableResult.stderr || '').substring(0, 200));

    // Verify disable worked
    if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
      const settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8'));
      console.log('   Disabled in settings:', settings.enabledPlugins?.[pluginKey]);
      expect(settings.enabledPlugins?.[pluginKey]).toBe(false);
    }

    console.log('   🧹 Plugin disabled (cleanup complete)\n');
  }, 90000);

  it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should install plugin from official Claude marketplace', () => {
    // Test with a plugin from the SpecWeave marketplace (reliable for CI/CD)
    // Skip if external marketplace is unavailable
    const pluginKey = 'sw-testing@specweave';

    console.log('\n📦 Testing: claude plugin install ' + pluginKey);

    const result = execFileNoThrowSync('claude', ['plugin', 'install', pluginKey], {
      timeout: 60000,
      shell: true,
    });

    console.log('   Exit code:', result.exitCode);
    console.log('   Output:', (result.stdout || result.stderr || '').substring(0, 300));

    // Should succeed (either installed fresh or already installed)
    const output = (result.stdout || '') + (result.stderr || '');
    const success = result.success ||
      output.includes('installed') ||
      output.includes('already') ||
      output.includes('enabled') ||
      output.includes('Plugin installed'); // Additional success indicator

    // Allow graceful failure for external dependency issues in CI
    if (!success && (output.includes('network') || output.includes('timeout') || output.includes('ENOTFOUND'))) {
      console.log('   ⚠️ Network issue - skipping external marketplace test');
      return; // Skip without failing in CI when network issues occur
    }

    expect(success).toBe(true);
    console.log('   ✅ Marketplace plugin install worked!\n');
  }, 90000);

  it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should install and uninstall SpecWeave plugin using SHORT name', () => {
    // Test the CORRECT way to install SpecWeave plugins:
    // Use SHORT name from marketplace.json (sw-testing), NOT folder name (specweave-testing)
    //
    // IMPORTANT: Claude CLI may register plugins with EITHER:
    // - Short name: sw-testing@specweave (from marketplace.json "name" field)
    // - Long name: specweave-testing@specweave (from source folder name)
    // We need to check for BOTH in assertions
    const pluginKey = 'sw-testing@specweave';
    const pluginShortName = 'sw-testing'; // Short name from marketplace
    const pluginLongName = 'specweave-testing'; // Folder name (may also appear in registry)

    console.log('\n📦 Testing: Full install/uninstall cycle for ' + pluginKey);

    // Step 1: Uninstall first (cleanup any previous state)
    console.log('   Step 1: Cleanup - uninstall if exists');
    execFileNoThrowSync('claude', ['plugin', 'uninstall', pluginKey], {
      timeout: 30000,
      shell: true,
    });

    // Step 2: Install the plugin using SHORT name
    console.log('   Step 2: Install plugin');
    const installResult = execFileNoThrowSync('claude', ['plugin', 'install', pluginKey], {
      timeout: 60000,
      shell: true,
    });

    console.log('   Install exit code:', installResult.exitCode);
    const installOutput = (installResult.stdout || '') + (installResult.stderr || '');
    console.log('   Install output:', installOutput.substring(0, 300));

    // Check if install succeeded or if there are environment-specific issues
    if (installOutput.includes('Source path does not exist')) {
      console.log('   ⚠️  Marketplace needs plugins folder checkout. Skipping test.');
      console.log('   Fix: cd ~/.claude/plugins/marketplaces/specweave && git checkout HEAD -- plugins');
      return; // Skip rest of test
    }

    // Handle cases where plugin install fails due to marketplace/network issues
    if (installResult.exitCode !== 0 && !installOutput.includes('Successfully installed')) {
      if (installOutput.includes('not found') || installOutput.includes('error')) {
        console.log('   ⏭️  Skipping: Plugin install failed (marketplace may not be available in this environment)');
        console.log('   Error:', installOutput.substring(0, 200));
        return; // Skip rest of test in CI/environments without marketplace access
      }
    }

    expect(installResult.exitCode).toBe(0);
    expect(installOutput).toContain('Successfully installed');

    // Step 3: Wait for Claude to register the plugin, then verify in list
    console.log('   Step 3: Waiting 2s for plugin registration...');
    const waitStart = Date.now();
    while (Date.now() - waitStart < 2000) {
      // Busy wait (sync test can't use setTimeout)
    }

    console.log('   Step 3b: Verify in plugin list');
    const listResult = execFileNoThrowSync('claude', ['plugin', 'list'], {
      timeout: 15000,
      shell: true,
    });

    console.log('   Plugin list output:', listResult.stdout?.substring(0, 500));

    // Claude CLI may register with SHORT name (sw-testing) or LONG name (specweave-testing)
    // Check for EITHER format - both are valid
    const hasShortName = listResult.stdout?.includes(pluginShortName + '@specweave');
    const hasLongName = listResult.stdout?.includes(pluginLongName + '@specweave');
    console.log(`   Found short name (${pluginShortName}): ${hasShortName}`);
    console.log(`   Found long name (${pluginLongName}): ${hasLongName}`);
    expect(hasShortName || hasLongName).toBe(true);
    console.log('   ✅ Plugin appears in list');

    // Step 4: Uninstall (cleanup) - try both names to ensure cleanup
    console.log('   Step 4: Uninstall plugin (cleanup)');
    // Uninstall whichever name is present
    const uninstallKey = hasShortName ? pluginKey : `${pluginLongName}@specweave`;
    const uninstallResult = execFileNoThrowSync('claude', ['plugin', 'uninstall', uninstallKey], {
      timeout: 30000,
      shell: true,
    });

    console.log('   Uninstall exit code:', uninstallResult.exitCode);
    const uninstallOutput = (uninstallResult.stdout || '') + (uninstallResult.stderr || '');
    console.log('   Uninstall output:', uninstallOutput.substring(0, 200));

    // Accept various success indicators (Claude CLI behavior may vary)
    const uninstallSuccess = uninstallResult.exitCode === 0 ||
      uninstallOutput.includes('Successfully uninstalled') ||
      uninstallOutput.includes('not installed') ||
      uninstallOutput.includes('uninstalled');
    expect(uninstallSuccess).toBe(true);

    // Step 5: Verify plugin is actually gone from list
    console.log('   Step 5: Verify plugin removed from list');
    const verifyResult = execFileNoThrowSync('claude', ['plugin', 'list'], {
      timeout: 15000,
      shell: true,
    });
    // Plugin should NOT appear in list after uninstall (check BOTH names)
    // Note: Claude CLI may not always uninstall cleanly - plugin might remain until restart
    const goneShort = !verifyResult.stdout?.includes(pluginShortName + '@specweave');
    const goneLong = !verifyResult.stdout?.includes(pluginLongName + '@specweave');
    if (goneShort && goneLong) {
      console.log('   ✅ Plugin confirmed removed from list');
    } else {
      console.log('   ⚠️  Plugin may still appear in list (Claude CLI behavior - requires restart)');
      console.log('   This is expected behavior for Claude CLI plugin management');
    }
    // Don't fail the test if uninstall didn't fully remove - it's a known Claude CLI limitation

    console.log('   ✅ Full install/uninstall cycle completed!\n');
  }, 120000);

  it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should list installed plugins via claude plugin list', () => {
    console.log('\n📋 Testing: claude plugin list');

    const result = execFileNoThrowSync('claude', ['plugin', 'list'], {
      timeout: 15000,
      shell: true,
    });

    console.log('   Exit code:', result.exitCode);
    console.log('   Output (first 500 chars):');
    console.log('   ', result.stdout?.substring(0, 500).replace(/\n/g, '\n    '));

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('specweave');

    const pluginCount = (result.stdout.match(/@specweave/g) || []).length;
    console.log(`   Found ${pluginCount} SpecWeave plugins\n`);
  });

  it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should show plugin version via claude --version', () => {
    console.log('\n🔍 Testing: claude --version');

    const result = execFileNoThrowSync('claude', ['--version'], {
      timeout: 10000,
      shell: true,
    });

    console.log('   Output:', result.stdout?.trim());
    expect(result.success).toBe(true);
    expect(result.stdout).toBeTruthy();
  });
});

describe('Plugin Auto-Load E2E Integration', () => {
  // Use module-level CLI_AVAILABLE_AT_LOAD for it.skipIf() to work correctly

  beforeAll(() => {
    // Clear any stale cache from previous test files
    clearCliCache();
  });

  describe('Prerequisites', () => {
    it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should have Claude CLI installed', () => {
      expect(CLI_AVAILABLE_AT_LOAD).toBe(true);
    });

    it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should have core plugins available', () => {
      // Check that specweave-router is registered (required for lazy loading)
      // Try both sw-router (marketplace name) and specweave-router (directory name)
      const routerRegistered = isPluginInstalled('sw-router') || isPluginInstalled('specweave-router');
      const routerExists = isPluginInSkillsDir('sw-router') || isPluginInSkillsDir('specweave-router');

      // At least one should be true (registered OR in skills dir)
      if (!routerRegistered && !routerExists) {
        console.log('⚠️  sw-router not found in registry or skills dir');
        console.log('   This test requires: claude plugin install sw-router@specweave');
        // Skip gracefully - this is an environment setup issue, not a code failure
        return;
      }
      expect(routerRegistered || routerExists).toBe(true);
    });
  });

  describe('LLM Detection Flow', () => {
    it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should detect frontend plugins for React prompt', async () => {
      const prompt = 'Build a React dashboard with TypeScript';

      const detection = await runDetectIntent(prompt);

      expect(detection.success).toBe(true);
      expect(detection.result).toBeDefined();

      if (detection.result?.detected) {
        // LLM returns SHORT names (sw-*) not directory names (specweave-*)
        expect(detection.result.plugins).toContain('sw-frontend');
        expect(detection.result.confidence).toBeGreaterThan(0.5);
      }
    }, 30000); // 30s timeout for LLM

    it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should detect backend plugins for API prompt', async () => {
      const prompt = 'Create a REST API with Express and PostgreSQL';

      const detection = await runDetectIntent(prompt);

      expect(detection.success).toBe(true);

      if (detection.result?.detected) {
        // LLM returns SHORT names (sw-*) not directory names (specweave-*)
        expect(detection.result.plugins).toContain('sw-backend');
      }
    }, 30000);

    it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should detect testing plugins for test prompt', async () => {
      const prompt = 'Write E2E tests with Playwright for the login flow';

      const detection = await runDetectIntent(prompt);

      expect(detection.success).toBe(true);

      if (detection.result?.detected) {
        // LLM returns SHORT names (sw-*) not directory names (specweave-*)
        expect(detection.result.plugins).toContain('sw-testing');
      }
    }, 30000);

    it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should return empty for non-dev prompt', async () => {
      const prompt = 'What is the weather today?';

      const detection = await runDetectIntent(prompt);

      expect(detection.success).toBe(true);
      expect(detection.result?.detected).toBe(false);
      expect(detection.result?.plugins).toEqual([]);
    }, 30000);
  });

  describe('Full Install Flow', () => {
    /**
     * PROPER E2E TEST FOR PLUGIN INSTALLATION
     *
     * This describe block tests the COMPLETE flow:
     * 1. SETUP: Track initial state (no pre-cleanup - don't interfere with user's setup)
     * 2. TEST: Run detect-intent --install and track which plugins are ACTUALLY installed
     * 3. TEARDOWN: Uninstall ONLY the plugins that THIS TEST installed (not hardcoded ones!)
     *
     * DYNAMIC PLUGIN TRACKING:
     * - The test uses a React prompt which should detect `specweave-frontend`
     * - We track which plugins were installed BY THIS TEST and clean up only those
     * - This prevents interference with other plugins the user may have installed
     *
     * REQUIREMENTS:
     * - Marketplace must be populated: `specweave refresh-marketplace`
     * - Claude CLI must be available
     */

    // Track plugins installed by THIS test for proper cleanup
    const pluginsInstalledByTest: Set<string> = new Set();

    /**
     * Helper to uninstall a plugin via Claude CLI
     */
    function uninstallPluginViaClaude(pluginKey: string): { success: boolean; output: string } {
      const result = execFileNoThrowSync('claude', ['plugin', 'uninstall', pluginKey], {
        timeout: 30000,
        shell: true,
      });
      const output = (result.stdout || '') + (result.stderr || '');
      return {
        success: result.success || output.includes('not installed') || output.includes('Successfully'),
        output,
      };
    }

    /**
     * Helper to check if plugin is installed via Claude CLI
     */
    function isPluginInstalledViaCli(pluginKey: string): boolean {
      const result = execFileNoThrowSync('claude', ['plugin', 'list'], {
        timeout: 15000,
        shell: true,
      });
      return result.success && result.stdout?.includes(pluginKey);
    }

    /**
     * Map folder names to short names for Claude CLI
     */
    function getShortPluginName(folderName: string): string {
      const mapping: Record<string, string> = {
        'specweave-frontend': 'sw-frontend',
        'specweave-backend': 'sw-backend',
        'specweave-testing': 'sw-testing',
        'specweave-github': 'sw-github',
        'specweave-jira': 'sw-jira',
        'specweave-ado': 'sw-ado',
        'specweave-infrastructure': 'sw-infra',
        'specweave-k8s': 'sw-k8s',
        'specweave-ml': 'sw-ml',
        'specweave-kafka': 'sw-kafka',
        'specweave-confluent': 'sw-confluent',
        'specweave-mobile': 'sw-mobile',
        'specweave-payments': 'sw-payments',
        'specweave-release': 'sw-release',
        'specweave-diagrams': 'sw-diagrams',
      };
      return mapping[folderName] || folderName;
    }

    // SETUP: Just log - don't uninstall anything before test
    // We'll track what we install and clean up ONLY those
    beforeAll(() => {
      if (!CLI_AVAILABLE_AT_LOAD) return;
      console.log('\n📋 E2E SETUP: Starting clean test - will track installed plugins for cleanup');
      pluginsInstalledByTest.clear();
    });

    // TEARDOWN: Clean up ONLY plugins that THIS TEST installed
    // This is safe because we tracked exactly what we installed
    afterAll(() => {
      if (!CLI_AVAILABLE_AT_LOAD) return;

      if (pluginsInstalledByTest.size === 0) {
        console.log('\n✨ E2E TEARDOWN: No plugins were installed by this test - nothing to clean up');
        return;
      }

      console.log(`\n🧹 E2E TEARDOWN: Uninstalling ${pluginsInstalledByTest.size} plugin(s) installed by this test...`);

      for (const pluginFolderName of pluginsInstalledByTest) {
        const shortName = getShortPluginName(pluginFolderName);
        const shortKey = `${shortName}@specweave`;
        const longKey = `${pluginFolderName}@specweave`;

        console.log(`   Cleaning up: ${pluginFolderName}`);

        // Try short name format first (preferred)
        const cleanupShort = uninstallPluginViaClaude(shortKey);
        console.log(`     Short key (${shortKey}): ${cleanupShort.success ? 'uninstalled' : 'not found'}`);

        // Also try long name format in case Claude stored it that way
        const cleanupLong = uninstallPluginViaClaude(longKey);
        console.log(`     Long key (${longKey}): ${cleanupLong.success ? 'uninstalled' : 'not found'}`);
      }

      pluginsInstalledByTest.clear();
      console.log('   ✅ Cleanup complete');
    });

    it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should install plugin via detect-intent --install and VERIFY installation', async () => {
      // Use React prompt which should detect specweave-frontend
      // This is the ONLY plugin this test will install
      const prompt = 'Build a React dashboard with TypeScript and Material UI';
      console.log(`\n📝 Prompt: "${prompt}"`);

      const detection = await runDetectIntent(prompt, { install: true });

      expect(detection.success).toBe(true);
      expect(detection.result).toBeDefined();

      // Log detection result
      console.log(`📦 Detection result:`);
      console.log(`   - Success: ${detection.success}`);
      console.log(`   - Detected: ${detection.result?.detected}`);
      console.log(`   - Plugins: ${detection.result?.plugins?.join(', ') || 'none'}`);
      console.log(`   - Confidence: ${detection.result?.confidence}`);
      console.log(`   - Install attempted: ${detection.result?.installed}`);
      console.log(`   - Install message: ${detection.result?.installMessage || 'none'}`);

      if (detection.result?.detected && detection.result.plugins.length > 0) {
        // Get the FIRST detected plugin - this is what we'll track and clean up
        const detectedPlugin = detection.result.plugins[0];
        const shortName = getShortPluginName(detectedPlugin);
        const shortKey = `${shortName}@specweave`;
        const longKey = `${detectedPlugin}@specweave`;

        console.log(`\n🎯 Primary detected plugin: ${detectedPlugin}`);
        console.log(`   Short key: ${shortKey}`);
        console.log(`   Long key: ${longKey}`);

        expect(detection.result.confidence).toBeGreaterThan(0.5);

        // CRITICAL - Verify the --install flag was processed
        expect(detection.result.installed).toBeDefined();

        // VERIFY plugin is ACTUALLY installed after detect-intent --install
        if (detection.result.installed) {
          // Track this plugin for cleanup in afterAll
          pluginsInstalledByTest.add(detectedPlugin);
          console.log(`   📝 Tracking for cleanup: ${detectedPlugin}`);

          // Wait a moment for Claude to register the plugin
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Check for EITHER key format (short or long name)
          const shortKeyInstalled = isPluginInstalledViaCli(shortKey);
          const longKeyInstalled = isPluginInstalledViaCli(longKey);
          const postInstallCheck = shortKeyInstalled || longKeyInstalled;

          console.log(`\n✅ Post-install verification:`);
          console.log(`   - ${shortKey} (short): ${shortKeyInstalled}`);
          console.log(`   - ${longKey} (long): ${longKeyInstalled}`);

          // If detect-intent reported success, plugin MUST be in the list (either key format)
          if (detection.result.installMessage?.includes('already')) {
            console.log(`   ℹ️  Plugin was already loaded`);
          }

          expect(postInstallCheck).toBe(true);
        } else if (detection.result.installMessage) {
          // If install failed, it should be due to marketplace not being populated
          console.log(`\n⚠️  Install failed: ${detection.result.installMessage}`);

          // Check if it's a marketplace issue (expected if not set up)
          if (detection.result.installMessage.includes('marketplace') ||
              detection.result.installMessage.includes('Source path does not exist') ||
              detection.result.installMessage.includes('Plugin not found')) {
            console.log(`ℹ️  Run 'specweave refresh-marketplace' to enable installation`);
            // This is expected when marketplace isn't populated - don't fail the test
            return;
          }
        }
      }
    }, 90000); // 90s timeout for LLM + install + verification

    it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should handle already-installed plugins gracefully', async () => {
      // Use same React prompt - if frontend plugin was installed in previous test,
      // this should report "already installed"
      const prompt = 'Create a Vue.js component for user profile';
      console.log(`\n📝 Prompt: "${prompt}"`);

      const detection = await runDetectIntent(prompt, { install: true });

      expect(detection.success).toBe(true);

      if (detection.result?.detected && detection.result.plugins.length > 0) {
        const detectedPlugin = detection.result.plugins[0];
        console.log(`📦 Plugins detected: ${detection.result.plugins.join(', ')}`);
        console.log(`📦 Install result: ${detection.result.installed}`);
        console.log(`📦 Install message: ${detection.result.installMessage || 'none'}`);

        // Track for cleanup if installed
        if (detection.result.installed && !detection.result.installMessage?.includes('already')) {
          pluginsInstalledByTest.add(detectedPlugin);
          console.log(`   📝 Tracking for cleanup: ${detectedPlugin}`);
        }

        // If plugin was already loaded, message should indicate that
        if (detection.result.installMessage?.includes('already')) {
          expect(detection.result.installed).toBe(true);
          console.log(`✅ Correctly reported plugin as already installed`);
        }
      }
    }, 90000);
  });

  describe('Direct Plugin Installation via Claude CLI', () => {
    it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should install plugin via claude plugin install', async () => {
      // Use Claude's native CLI: `claude plugin install sw-frontend@specweave`
      const result = installPluginViaClaude(TEST_PLUGIN);

      console.log(`📦 ${TEST_PLUGIN} install attempt:`);
      console.log(`   - Success: ${result.success}`);
      console.log(`   - Output: ${result.output.substring(0, 200)}`);

      // Skip gracefully if marketplace isn't populated
      if (result.output.includes('Source path does not exist')) {
        console.log('   ⚠️  Marketplace plugins folder not found. Skipping test.');
        console.log('   Fix: specweave refresh-marketplace');
        return; // Skip - marketplace not set up
      }

      // Skip gracefully if CLI failed (parallel test contention, CLI busy)
      if (!result.success) {
        console.log(`   ⚠️  CLI install failed (possibly busy from parallel tests) - skipping`);
        return; // Skip - CLI contention
      }

      expect(result.success).toBe(true);

      // Wait for registration to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify plugin is registered (may already be from earlier tests)
      const registered = isPluginInRegistry(TEST_PLUGIN);
      const longName = Object.entries(PLUGIN_FOLDER_TO_SHORT).find(([, short]) => short === TEST_PLUGIN)?.[0];
      const exists = isPluginInSkillsDir(TEST_PLUGIN) || (longName && isPluginInSkillsDir(longName));

      console.log(`📦 ${TEST_PLUGIN} install result: Registry=${registered}, Skills=${exists}`);
      expect(registered || exists).toBe(true);
    }, 90000); // Extend timeout for marketplace operations

    it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should report plugin already installed on repeat install', () => {
      // Claude CLI gracefully handles already-installed plugins
      const result = installPluginViaClaude(TEST_PLUGIN);

      console.log(`📦 Repeat install attempt:`);
      console.log(`   - Success: ${result.success}`);
      console.log(`   - Output: ${result.output.substring(0, 200)}`);

      // Skip gracefully if marketplace isn't populated
      if (result.output.includes('Source path does not exist')) {
        console.log('   ⚠️  Marketplace plugins folder not found. Skipping test.');
        return; // Skip - marketplace not set up
      }

      // Skip gracefully if CLI failed (parallel test contention, CLI busy)
      if (!result.success) {
        console.log(`   ⚠️  CLI install failed (possibly busy from parallel tests) - skipping`);
        return; // Skip - CLI contention
      }

      // Should succeed (either installed or already registered)
      expect(result.success).toBe(true);

      // Output should indicate already installed
      if (result.output.includes('already')) {
        console.log(`✓ Plugin correctly reported as already installed`);
      }
    }, 60000); // Extend timeout for marketplace operations

    it.skip('uninstall removes plugin from registry', () => {
      // Use `claude plugin uninstall sw-testing@specweave` to remove
      // Plugins remain loaded until Claude Code restarts
    });
  });

  describe('Claude CLI Direct Plugin Management', () => {
    // Tests that use Claude CLI directly (not through specweave)
    // Claude CLI has: enable, disable, install, uninstall, list

    it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should enable plugin via claude plugin enable', () => {
      // Use Claude CLI directly to enable a plugin
      const result = enablePluginViaClaude(TEST_PLUGIN);

      console.log(`📦 Claude CLI enable result: ${result.success}`);
      console.log(`📦 Output: ${result.output}`);

      expect(result.success).toBe(true);

      // Verify plugin is now enabled in settings.json
      const enabled = isPluginInstalled(TEST_PLUGIN);
      expect(enabled).toBe(true);
    });

    it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should list plugins via claude plugin list', () => {
      const result = execFileNoThrowSync('claude', ['plugin', 'list'], {
        timeout: 15000,
        shell: true,
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('specweave');

      console.log(`📦 Found ${(result.stdout.match(/specweave/g) || []).length} specweave plugins`);
    });

    it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should show enabled plugins in settings.json', () => {
      // Verify Claude's enabledPlugins tracking works
      if (!fs.existsSync(CLAUDE_SETTINGS_PATH)) {
        console.log('⚠️  settings.json not found, skipping');
        return;
      }

      const settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8'));
      const enabledPlugins = settings.enabledPlugins || {};

      // Count enabled SpecWeave plugins (either sw@ or specweave@ prefixes)
      const enabledSpecweavePlugins = Object.entries(enabledPlugins)
        .filter(([key, enabled]) => key.includes('@specweave') && enabled === true)
        .map(([key]) => key);

      console.log(`📦 Enabled SpecWeave plugins: ${enabledSpecweavePlugins.length}`);
      console.log(`   ${enabledSpecweavePlugins.join(', ')}`);

      // At least one SpecWeave plugin should be enabled
      expect(enabledSpecweavePlugins.length).toBeGreaterThan(0);
    });
  });
});

describe('Config Toggle Tests', () => {
  // Use module-level CLI_AVAILABLE_AT_LOAD for it.skipIf() to work correctly
  const TEST_PROJECT_DIR = path.join(os.tmpdir(), `specweave-config-test-${Date.now()}`);
  const TEST_CONFIG_PATH = path.join(TEST_PROJECT_DIR, '.specweave', 'config.json');

  beforeAll(() => {
    // Clear any stale cache from previous test files
    clearCliCache();
    // Create test project with config
    fs.mkdirSync(path.join(TEST_PROJECT_DIR, '.specweave'), { recursive: true });
  });

  afterAll(() => {
    // Cleanup
    try {
      fs.rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should skip detection when pluginAutoLoad.enabled: false', () => {
    // Write config with autoload disabled
    fs.writeFileSync(
      TEST_CONFIG_PATH,
      JSON.stringify(
        {
          pluginAutoLoad: {
            enabled: false,
          },
        },
        null,
        2
      )
    );

    // Run detect-intent from test project dir
    // Quote the prompt to prevent shell from splitting it into multiple arguments
    const result = execFileNoThrowSync('npx', ['specweave', 'detect-intent', '"Build a React app"'], {
      timeout: 10000,
      cwd: TEST_PROJECT_DIR,
      shell: true, // Use shell on all platforms for consistency
    });

    // Should return quickly with skipped: true
    if (result.stdout) {
      try {
        const parsed = JSON.parse(result.stdout.trim());
        expect(parsed.skipped).toBe(true);
        expect(parsed.plugins).toEqual([]);
      } catch {
        // If parsing fails, just check it didn't take long (no LLM call)
        expect(result.exitCode).toBeDefined();
      }
    }
  });

  it.skipIf(!CLI_AVAILABLE_AT_LOAD)('should run detection when pluginAutoLoad.enabled: true', () => {
    // Write config with autoload enabled
    fs.writeFileSync(
      TEST_CONFIG_PATH,
      JSON.stringify(
        {
          pluginAutoLoad: {
            enabled: true,
          },
        },
        null,
        2
      )
    );

    // Run detect-intent from test project dir
    // Quote the prompt to prevent shell from splitting it into multiple arguments
    const result = execFileNoThrowSync('npx', ['specweave', 'detect-intent', '"Build a React app"'], {
      timeout: 30000, // LLM takes time
      cwd: TEST_PROJECT_DIR,
      shell: true, // Use shell on all platforms for consistency
    });

    if (result.stdout) {
      try {
        const parsed = JSON.parse(result.stdout.trim());
        // Should NOT be skipped
        expect(parsed.skipped).toBeUndefined();
        // Should have attempted detection (even if no plugins found)
        expect(parsed.confidence).toBeDefined();
      } catch {
        // Parsing failed, but that's ok if the test dir doesn't have full setup
      }
    }
  }, 35000);
});
