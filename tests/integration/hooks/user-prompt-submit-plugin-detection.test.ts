/**
 * User Prompt Submit Hook - Plugin Detection Accuracy Tests (v1.0.175)
 *
 * Tests the fix for false restart warnings caused by unreliable `claude plugin list` output.
 *
 * ROOT CAUSE:
 * - `claude plugin list` output can be incomplete/delayed due to timing/buffering
 * - Hook checked this output, didn't find plugin, ran `claude plugin install`
 * - Install succeeded (idempotent), hook marked as "newly installed"
 * - False restart warning triggered
 *
 * FIX (v1.0.175):
 * - Read ~/.claude/plugins/installed_plugins.json directly (SOURCE OF TRUTH)
 * - Use `check_plugin_installed_from_json()` bash helper with jq
 * - Fallback to `claude plugin list` only if jq unavailable
 * - Post-install verification: re-check registry after install
 * - Increased timeouts: 5s → 10s for CLI operations
 *
 * @see plugins/specweave/hooks/user-prompt-submit.sh
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFileSync } from 'child_process';

describe('User Prompt Submit Hook - Plugin Detection Accuracy (v1.0.175)', () => {
  const hookPath = path.join(
    process.cwd(),
    'plugins/specweave/hooks/user-prompt-submit.sh'
  );

  let tempDir: string;
  let mockRegistryPath: string;

  beforeEach(() => {
    // Create temp directory for mock registry
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-detection-test-'));
    mockRegistryPath = path.join(tempDir, 'installed_plugins.json');
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Helper Function: check_plugin_installed_from_json', () => {
    it('should define the helper function for JSON registry checking', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have the helper function
      expect(hookContent).toContain('check_plugin_installed_from_json()');
      expect(hookContent).toContain('SOURCE OF TRUTH');
    });

    it('should check installed_plugins.json file path', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should reference the registry file
      expect(hookContent).toContain('~/.claude/plugins/installed_plugins.json');
      expect(hookContent).toContain('.claude/plugins/installed_plugins.json');
    });

    it('should use jq to parse JSON registry', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should use jq for parsing
      expect(hookContent).toMatch(/jq.*\.plugins/);
    });

    it('should handle plugin@marketplace format correctly', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should construct full plugin name: plugin@marketplace
      expect(hookContent).toMatch(/\$\{plugin\}@\$\{marketplace\}/);
    });
  });

  describe('Primary Detection: JSON Registry (v1.0.175)', () => {
    it('should check JSON registry BEFORE claude plugin list', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Find the plugin detection section
      const detectionSection = hookContent.substring(
        hookContent.indexOf('# v1.0.175: Check if plugin is ALREADY installed')
      );

      // Should have JSON check as primary method
      expect(detectionSection).toContain('check_plugin_installed_from_json');
      expect(detectionSection).toContain('# Try JSON registry first');
      // CLI check is in the else block (fallback)
      expect(detectionSection).toContain('# Fallback to CLI check');
    });

    it('should use increased timeout (10s instead of 5s)', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have 10s timeout for plugin operations
      expect(hookContent).toContain('timeout 10 claude plugin install');
      expect(hookContent).toContain('timeout 10 claude plugin list');
    });

    it('should have post-install verification logic', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // After install, should re-check registry
      expect(hookContent).toMatch(/sleep 0\.5/); // Brief delay for registry update
      expect(hookContent).toContain('Double-check: verify it actually got installed');
      expect(hookContent).toMatch(/Re-check the registry to confirm/);
    });
  });

  describe('False Positive Prevention', () => {
    it('should guard against false restart warnings', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have logic to treat install-success-but-not-in-registry as already installed
      expect(hookContent).toContain('Install claimed success but plugin not in registry');
      expect(hookContent).toContain('treat as already installed');
    });

    it('should verify plugin exists in registry after successful install', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // After install reports success, should re-check the registry
      const installSection = hookContent.substring(
        hookContent.indexOf('claude plugin install')
      );

      expect(installSection).toContain('check_plugin_installed_from_json');
    });
  });

  describe('Fallback to CLI Detection', () => {
    it('should fallback to claude plugin list if jq unavailable', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have fallback logic
      expect(hookContent).toContain('Fallback to CLI check');
      expect(hookContent).toContain('if jq not available');
    });

    it('should still work if installed_plugins.json is missing', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Helper function should return 1 (not installed) if file missing
      expect(hookContent).toContain('# File must exist');
      expect(hookContent).toContain('[[ ! -f "$registry_path" ]]');
    });
  });

  describe('Version Documentation', () => {
    it('should document v1.0.175 fix in header', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should have updated version header
      expect(hookContent).toContain('v1.0.175');
      expect(hookContent).toMatch(/CRITICAL FIX.*installed_plugins\.json.*SOURCE OF TRUTH/i);
    });

    it('should document the timing issue root cause', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should explain why CLI is unreliable
      expect(hookContent).toMatch(/claude plugin list.*timing.*buffering/i);
    });

    it('should mark v1.0.167 as deprecated with issue noted', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Should note the issue with the previous approach
      expect(hookContent).toMatch(/v1\.0\.167.*DEPRECATED.*timing issues/i);
    });
  });

  describe('Integration: Realistic Scenario', () => {
    it('should correctly identify sw-frontend@specweave as installed when in registry', () => {
      // Create a mock installed_plugins.json
      const mockRegistry = {
        version: 2,
        plugins: {
          'sw-frontend@specweave': [
            {
              scope: 'user',
              installPath: '/Users/test/.claude/plugins/cache/specweave/sw-frontend/1.0.0',
              version: '1.0.0',
              installedAt: '2026-01-27T05:00:00.000Z',
              lastUpdated: '2026-01-27T05:00:00.000Z',
              gitCommitSha: 'abc123',
            },
          ],
          'context7@claude-plugins-official': [
            {
              scope: 'user',
              installPath: '/Users/test/.claude/plugins/cache/claude-plugins-official/context7/e30768372b41',
              version: 'e30768372b41',
              installedAt: '2026-01-27T05:00:00.000Z',
              lastUpdated: '2026-01-27T05:00:00.000Z',
              gitCommitSha: 'e30768372b41',
            },
          ],
        },
      };

      fs.writeFileSync(mockRegistryPath, JSON.stringify(mockRegistry, null, 2), 'utf-8');

      // Test that jq can correctly identify the plugin
      const checkCmd = `jq -r --arg key "sw-frontend@specweave" '.plugins[$key] // null' "${mockRegistryPath}"`;
      const result = execFileSync('bash', ['-c', checkCmd], { encoding: 'utf-8' });

      expect(result.trim()).not.toBe('null');
      expect(result).toContain('installPath');
    });

    it('should return null for plugin not in registry', () => {
      // Create a mock installed_plugins.json WITHOUT sw-testing
      const mockRegistry = {
        version: 2,
        plugins: {
          'sw-frontend@specweave': [
            {
              scope: 'user',
              installPath: '/Users/test/.claude/plugins/cache/specweave/sw-frontend/1.0.0',
              version: '1.0.0',
              installedAt: '2026-01-27T05:00:00.000Z',
              lastUpdated: '2026-01-27T05:00:00.000Z',
            },
          ],
        },
      };

      fs.writeFileSync(mockRegistryPath, JSON.stringify(mockRegistry, null, 2), 'utf-8');

      // Test that jq correctly identifies plugin is NOT installed
      const checkCmd = `jq -r --arg key "sw-testing@specweave" '.plugins[$key] // null' "${mockRegistryPath}"`;
      const result = execFileSync('bash', ['-c', checkCmd], { encoding: 'utf-8' });

      expect(result.trim()).toBe('null');
    });
  });

  describe('Performance: Timeout Adjustments', () => {
    it('should have NO timeout less than 10s for plugin operations', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      // Find all timeout commands in the plugin detection section
      const pluginSection = hookContent.substring(
        hookContent.indexOf('# PLUGIN INSTALLATION/SUGGESTION')
      );

      // Check for old 5s timeouts - should be upgraded to 10s
      const old5sTimeouts = pluginSection.match(/timeout 5 claude plugin/g);
      expect(old5sTimeouts).toBeNull(); // Should have no 5s timeouts

      // Should have 10s timeouts
      expect(pluginSection).toContain('timeout 10 claude plugin install');
      expect(pluginSection).toContain('timeout 10 claude plugin list');
    });
  });
});
