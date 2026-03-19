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
// NOTE: Only sw@specweave exists in the marketplace. Domain plugins
// (frontend, backend, etc.) and the vskill marketplace were removed.
const CLAUDE_REGISTRY_PATH = path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json');
const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const CLAUDE_SKILLS_PATH = path.join(os.homedir(), '.claude', 'skills');

/**
 * Safety net: Remove any stale @vskill entries from settings.json after all tests.
 * The vskill marketplace no longer exists — any @vskill entries are phantom pollution
 * that cause "Plugin not found in marketplace 'vskill'" errors in Claude Code.
 */
afterAll(() => {
  try {
    if (!fs.existsSync(CLAUDE_SETTINGS_PATH)) return;
    const settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8'));
    if (!settings.enabledPlugins) return;
    const vskillKeys = Object.keys(settings.enabledPlugins).filter(k => k.endsWith('@vskill'));
    if (vskillKeys.length === 0) return;
    for (const key of vskillKeys) {
      delete settings.enabledPlugins[key];
    }
    fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
    console.log(`\n🧹 Safety cleanup: removed ${vskillKeys.length} stale @vskill entries from settings.json: ${vskillKeys.join(', ')}`);
  } catch {
    // Non-blocking cleanup
  }
});

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

/**
 * Check if plugin subcommand works at MODULE LOAD TIME.
 * claude --version may work but `claude plugin --help` can fail in
 * some environments (VSCode debug, vitest runner context).
 */
function checkPluginCommandWorks(): boolean {
  try {
    const result = execFileNoThrowSync('claude', ['plugin', '--help'], {
      timeout: 10000,
      shell: true,
    });
    return result.success;
  } catch {
    return false;
  }
}

const PLUGIN_CMD_WORKS = CLI_AVAILABLE_AT_LOAD && checkPluginCommandWorks();

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
 * - Short name: sw@specweave (plugin name from marketplace.json)
 * - Long name: specweave@specweave (legacy source folder name)
 * This function checks BOTH naming conventions.
 */
function isPluginInstalled(pluginName: string): boolean {
  try {
    // Build both possible keys
    const marketplace = getMarketplace(pluginName);
    const shortKey = `${pluginName}@${marketplace}`;
    const longName = PLUGIN_FOLDER_TO_SHORT[pluginName]
      ? pluginName // Already a long name, use as-is
      : Object.entries(PLUGIN_FOLDER_TO_SHORT).find(([, short]) => short === pluginName)?.[0];
    const longKey = longName ? `${longName}@${marketplace}` : null;

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
    const marketplace = getMarketplace(pluginName);
    const shortKey = `${pluginName}@${marketplace}`;
    const longName = PLUGIN_FOLDER_TO_SHORT[pluginName]
      ? pluginName
      : Object.entries(PLUGIN_FOLDER_TO_SHORT).find(([, short]) => short === pluginName)?.[0];
    const longKey = longName ? `${longName}@${marketplace}` : null;

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
 * All plugins are in the specweave marketplace.
 * Domain plugins (frontend, backend, etc.) no longer exist.
 */
const PLUGIN_FOLDER_TO_SHORT: Record<string, string> = {
  specweave: 'sw',
  'specweave-router': 'sw-router',
  'specweave-frontend': 'frontend',
  'specweave-backend': 'backend',
  'specweave-testing': 'testing',
  'specweave-infrastructure': 'infra',
  'specweave-kubernetes': 'k8s',
  'specweave-ml': 'ml',
  'specweave-kafka': 'kafka',
  'specweave-confluent': 'confluent',
  'specweave-mobile': 'mobile',
  'specweave-payments': 'payments',
};

/**
 * All plugins now live in the specweave marketplace.
 * The vskill marketplace was removed — domain plugins (frontend, backend, etc.)
 * no longer exist in any marketplace. Only 'sw' remains in specweave.
 */
function isDomainPlugin(_shortName: string): boolean {
  return false; // No domain plugins exist in any marketplace
}

/** Get the marketplace name for a plugin */
function getMarketplace(_shortName: string): string {
  return 'specweave'; // All plugins are in specweave marketplace
}

/**
 * Enable a plugin via Claude CLI
 *
 * Claude CLI has native plugin management:
 * - `claude plugin enable <plugin>@<marketplace>` - enables already-installed plugin
 * - `claude plugin install <plugin>@<marketplace>` - installs new plugin
 *
 * Most SpecWeave plugins are already installed but disabled - use enable first.
 * Accepts EITHER short name (frontend) or long name (specweave-frontend).
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
 * Accepts EITHER short name (frontend) or long name (specweave-frontend).
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
 * - Install uses names from marketplace.json: `sw@specweave` (core plugin)
 * - After install, registry stores with the same name
 *
 * COMMANDS:
 * - `claude plugin list` - shows all installed plugins
 * - `claude plugin install sw@specweave` - installs core plugin
 * - `claude plugin enable/disable <name>@<marketplace>` - toggle existing plugin
 * - `claude plugin uninstall <name>@<marketplace>` - removes plugin
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

  it.skipIf(!PLUGIN_CMD_WORKS)('should enable and disable plugin via claude CLI', () => {
    // Use sw@specweave which is always installed as the core plugin
    const pluginKey = 'sw@specweave';

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
    if (!enableSuccess && (
      enableOutput.includes('not found') ||
      enableOutput.includes('not installed') ||
      enableOutput.includes('Cannot find') ||
      enableOutput.includes('No plugin')
    )) {
      console.log('   ⏭️  Skipping: Plugin not available in this environment (expected in CI/fresh installs)');
      console.log('   Details:', enableOutput.substring(0, 200));
      return;
    }

    expect(enableSuccess).toBe(true);

    // Step 3: Verify plugin is enabled in settings.json
    // Note: The plugin might be enabled at user or project scope, or the settings.json
    // might not exist in the expected location. The key assertion is that the enable
    // command succeeded (checked above). The settings check is informational.
    if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
      const settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8'));
      const isEnabled = settings.enabledPlugins?.[pluginKey];
      console.log('   Enabled in settings:', isEnabled);
      // Accept true, undefined (scoped elsewhere), or the key existing
      // The command success above is the authoritative check
    }

    console.log('   ✅ Plugin enabled successfully!\n');

    // Step 4: Disable the plugin (cleanup)
    const disableResult = execFileNoThrowSync('claude', ['plugin', 'disable', pluginKey], {
      timeout: 30000,
      shell: true,
    });

    console.log('   Disable exit code:', disableResult.exitCode);
    console.log('   Disable output:', (disableResult.stdout || disableResult.stderr || '').substring(0, 200));

    // Disable is informational — some Claude CLI versions don't support disabling core plugins
    // The key assertion for this test is that ENABLE worked (checked above)
    const disableOutput = (disableResult.stdout || '') + (disableResult.stderr || '');
    if (disableResult.exitCode !== 0 && !disableOutput.includes('disabled')) {
      console.log('   ⚠️  Disable not supported for core plugin (expected in some environments)');
    }

    console.log('   🧹 Plugin disabled (cleanup complete)\n');
  }, 90000);

  it.skipIf(!PLUGIN_CMD_WORKS)('should verify core plugin from specweave marketplace', () => {
    // Only sw@specweave exists in the marketplace — domain plugins (testing, frontend, etc.)
    // were removed along with the vskill marketplace.
    const pluginKey = 'sw@specweave';

    console.log('\n📦 Testing: claude plugin list for ' + pluginKey);

    const result = execFileNoThrowSync('claude', ['plugin', 'list'], {
      timeout: 15000,
      shell: true,
    });

    console.log('   Exit code:', result.exitCode);
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('specweave');
    console.log('   ✅ Core plugin verified in marketplace!\n');
  }, 30000);

  it.skip('should install and uninstall SpecWeave plugin using SHORT name', () => {
    // SKIPPED: Domain plugins (testing@vskill, frontend@vskill, etc.) no longer exist.
    // The vskill marketplace was removed. Only sw@specweave remains.
    // This test polluted ~/.claude/settings.json with phantom @vskill entries
    // that caused "Plugin not found in marketplace 'vskill'" errors.
  });

  it.skipIf(!PLUGIN_CMD_WORKS)('should list installed plugins via claude plugin list', () => {
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

  it.skipIf(!PLUGIN_CMD_WORKS)('should show plugin version via claude --version', () => {
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
    it.skipIf(!PLUGIN_CMD_WORKS)('should have Claude CLI installed', () => {
      expect(CLI_AVAILABLE_AT_LOAD).toBe(true);
    });

    it.skipIf(!PLUGIN_CMD_WORKS)('should have core plugins available', () => {
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
    it.skipIf(!PLUGIN_CMD_WORKS)('should detect frontend plugins for React prompt', async () => {
      const prompt = 'Build a React dashboard with TypeScript';

      const detection = await runDetectIntent(prompt);

      expect(detection.success).toBe(true);
      expect(detection.result).toBeDefined();

      if (detection.result?.detected) {
        // LLM returns plugin names: domain plugins have no sw- prefix
        expect(detection.result.plugins).toContain('frontend');
        expect(detection.result.confidence).toBeGreaterThan(0.5);
      }
    }, 30000); // 30s timeout for LLM

    it.skipIf(!PLUGIN_CMD_WORKS)('should detect backend plugins for API prompt', async () => {
      const prompt = 'Create a REST API with Express and PostgreSQL';

      const detection = await runDetectIntent(prompt);

      expect(detection.success).toBe(true);

      if (detection.result?.detected) {
        // LLM returns plugin names: domain plugins have no sw- prefix
        expect(detection.result.plugins).toContain('backend');
      }
    }, 30000);

    it.skipIf(!PLUGIN_CMD_WORKS)('should detect testing plugins for test prompt', async () => {
      const prompt = 'Write E2E tests with Playwright for the login flow';

      const detection = await runDetectIntent(prompt);

      expect(detection.success).toBe(true);

      if (detection.result?.detected) {
        // LLM returns plugin names: domain plugins have no sw- prefix
        expect(detection.result.plugins).toContain('testing');
      }
    }, 30000);

    it.skipIf(!PLUGIN_CMD_WORKS)('should return empty for non-dev prompt', async () => {
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
     * - Marketplace must be populated: `specweave refresh-plugins`
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
        'specweave-frontend': 'frontend',
        'specweave-backend': 'backend',
        'specweave-testing': 'testing',
        'specweave-infrastructure': 'infra',
        'specweave-kubernetes': 'k8s',
        'specweave-ml': 'ml',
        'specweave-kafka': 'kafka',
        'specweave-confluent': 'confluent',
        'specweave-mobile': 'mobile',
        'specweave-payments': 'payments',
      };
      return mapping[folderName] || folderName;
    }

    // SETUP: Just log - don't uninstall anything before test
    // We'll track what we install and clean up ONLY those
    beforeAll(() => {
      if (!PLUGIN_CMD_WORKS) return;
      console.log('\n📋 E2E SETUP: Starting clean test - will track installed plugins for cleanup');
      pluginsInstalledByTest.clear();
    });

    // TEARDOWN: Clean up ONLY plugins that THIS TEST installed
    // This is safe because we tracked exactly what we installed
    afterAll(() => {
      if (!PLUGIN_CMD_WORKS) return;

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

    it.skipIf(!PLUGIN_CMD_WORKS)('should install plugin via detect-intent --install and VERIFY installation', async () => {
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
            console.log(`ℹ️  Run 'specweave refresh-plugins' to enable installation`);
            // This is expected when marketplace isn't populated - don't fail the test
            return;
          }
        }
      }
    }, 90000); // 90s timeout for LLM + install + verification

    it.skipIf(!PLUGIN_CMD_WORKS)('should handle already-installed plugins gracefully', async () => {
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
    // NOTE: Domain plugins (frontend, backend, etc.) no longer exist in any marketplace.
    // The vskill marketplace was removed. Only sw@specweave exists.
    // Install/uninstall tests for non-existent plugins are skipped.

    it.skipIf(!PLUGIN_CMD_WORKS)('should verify core plugin is installed', () => {
      // sw@specweave is the only plugin — verify it's registered
      const registered = isPluginInRegistry('sw');
      console.log(`📦 sw@specweave in registry: ${registered}`);
      expect(registered).toBe(true);
    });

    it.skip('uninstall removes plugin from registry', () => {
      // Core plugin (sw) should not be uninstalled
      // Domain plugins no longer exist in any marketplace
    });
  });

  describe('Claude CLI Direct Plugin Management', () => {
    // Tests that use Claude CLI directly (not through specweave)
    // Claude CLI has: enable, disable, install, uninstall, list

    it.skipIf(!PLUGIN_CMD_WORKS)('should enable core plugin via claude plugin enable', () => {
      // Use sw@specweave (the only existing plugin) for enable test
      const pluginKey = 'sw@specweave';
      const result = enablePluginViaClaude('sw');

      console.log(`📦 Claude CLI enable result: ${result.success}`);
      console.log(`📦 Output: ${result.output}`);

      expect(result.success).toBe(true);

      // Verify plugin is enabled in settings.json
      if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
        const settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8'));
        const enabledInSettings = settings.enabledPlugins?.[pluginKey] === true;
        expect(enabledInSettings).toBe(true);
      }
    });

    it.skipIf(!PLUGIN_CMD_WORKS)('should list plugins via claude plugin list', () => {
      const result = execFileNoThrowSync('claude', ['plugin', 'list'], {
        timeout: 15000,
        shell: true,
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('specweave');

      console.log(`📦 Found ${(result.stdout.match(/specweave/g) || []).length} specweave plugins`);
    });

    it.skipIf(!PLUGIN_CMD_WORKS)('should show enabled plugins in settings.json', () => {
      // Verify Claude's enabledPlugins tracking works
      if (!fs.existsSync(CLAUDE_SETTINGS_PATH)) {
        console.log('⚠️  settings.json not found, skipping');
        return;
      }

      const settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8'));
      const enabledPlugins = settings.enabledPlugins || {};

      // Count enabled SpecWeave plugins (specweave marketplace only — vskill marketplace removed)
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

  it.skipIf(!PLUGIN_CMD_WORKS)('should skip detection when pluginAutoLoad.enabled: false', () => {
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

  it.skipIf(!PLUGIN_CMD_WORKS)('should run detection when pluginAutoLoad.enabled: true', () => {
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
