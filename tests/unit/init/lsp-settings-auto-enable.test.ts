/**
 * Unit Tests for LSP Opt-In Feature (v1.0.210+)
 *
 * Tests that LSP is NOT automatically configured during `specweave init`.
 * LSP is now opt-in only - users must run `specweave lsp enable` to enable it.
 *
 * This change was made because:
 * - LSP requires external dependencies (typescript-language-server, pyright, etc.)
 * - Auto-enabling caused issues when dependencies weren't installed
 * - Users should explicitly choose to enable LSP support
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('LSP Opt-In Feature (v1.0.210+)', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-lsp-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('ensureClaudeSettingsWithLsp (opt-in manual call)', () => {
    it('should create .claude/settings.json with lspServers when explicitly called', async () => {
      // Import the function we're testing
      const { ensureClaudeSettingsWithLsp } = await import(
        '../../../src/cli/helpers/init/claude-settings-lsp.js'
      );

      // Execute (this is now a manual opt-in call)
      await ensureClaudeSettingsWithLsp(tempDir);

      // Verify settings.json has lspServers
      const settingsPath = path.join(tempDir, '.claude', 'settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      expect(settings.lspServers).toBeDefined();
      expect(settings.lspServers.vtsls).toBeDefined();

      // Also verify plugin was created
      const pluginPath = path.join(tempDir, '.claude', 'plugins', 'specweave-lsp', '.lsp.json');
      expect(fs.existsSync(pluginPath)).toBe(true);
    });

    it('should preserve existing settings when adding lspServers', async () => {
      const { ensureClaudeSettingsWithLsp } = await import(
        '../../../src/cli/helpers/init/claude-settings-lsp.js'
      );

      // Create existing settings
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(
        path.join(claudeDir, 'settings.json'),
        JSON.stringify({
          permissions: {
            allow: ['Write(//**)'],
            defaultMode: 'bypassPermissions'
          },
          customSetting: 'preserve-me'
        }, null, 2)
      );

      // Execute
      await ensureClaudeSettingsWithLsp(tempDir);

      // Verify
      const settings = JSON.parse(
        fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf-8')
      );

      // Should preserve existing settings
      expect(settings.permissions).toBeDefined();
      expect(settings.permissions.defaultMode).toBe('bypassPermissions');
      expect(settings.customSetting).toBe('preserve-me');

      // Should add lspServers
      expect(settings.lspServers).toBeDefined();

      // Should enable plugin
      expect(settings.enabledPlugins).toBeDefined();
      expect(settings.enabledPlugins['./plugins/specweave-lsp']).toBe(true);
    });

    it('should not overwrite existing lspServers configuration', async () => {
      const { ensureClaudeSettingsWithLsp } = await import(
        '../../../src/cli/helpers/init/claude-settings-lsp.js'
      );

      // Create existing settings with custom LSP config
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(
        path.join(claudeDir, 'settings.json'),
        JSON.stringify({
          lspServers: {
            customServer: {
              command: 'my-custom-lsp',
              args: ['--stdio']
            }
          }
        }, null, 2)
      );

      // Execute
      await ensureClaudeSettingsWithLsp(tempDir);

      // Verify - should preserve custom config
      const settings = JSON.parse(
        fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf-8')
      );

      expect(settings.lspServers.customServer).toBeDefined();
      expect(settings.lspServers.customServer.command).toBe('my-custom-lsp');
    });
  });

  describe('LSP NOT auto-enabled during init (v1.0.210+)', () => {
    it('should NOT call ensureClaudeSettingsWithLsp during specweave init', async () => {
      // This test verifies that LSP is NOT auto-enabled during init
      // Users must explicitly run `specweave lsp enable`

      const { copyTemplates } = await import(
        '../../../src/cli/helpers/init/directory-structure.js'
      );

      // Create necessary structure
      const templatesDir = path.join(tempDir, 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });

      // Create minimal template files
      fs.writeFileSync(
        path.join(templatesDir, 'CLAUDE.md.template'),
        '# Test\n<!-- SW:META template="claude" version="1.0.0" -->'
      );
      fs.writeFileSync(
        path.join(templatesDir, 'AGENTS.md.template'),
        '# Agents\n<!-- SW:META template="agents" version="1.0.0" -->'
      );

      // Execute copyTemplates
      await copyTemplates(templatesDir, tempDir, 'test-project', 'en');

      // Verify LSP was NOT auto-configured (opt-in behavior)
      const lspPluginPath = path.join(tempDir, '.claude', 'plugins', 'specweave-lsp');
      expect(fs.existsSync(lspPluginPath)).toBe(false);

      // settings.json should exist but without lspServers
      const settingsPath = path.join(tempDir, '.claude', 'settings.json');
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        expect(settings.lspServers).toBeUndefined();
      }
    });

    it('should provide opt-in documentation comment instead of auto-enable', async () => {
      // Verify the code has the opt-in comment explaining how to enable LSP
      const directoryStructurePath = path.join(
        process.cwd(),
        'src/cli/helpers/init/directory-structure.ts'
      );

      const content = fs.readFileSync(directoryStructurePath, 'utf-8');

      // Should have opt-in comment
      expect(content).toContain('LSP is OPT-IN only');
      expect(content).toContain('specweave lsp enable');
    });
  });

  describe('LSP server configuration', () => {
    it('should include correct TypeScript LSP configuration', async () => {
      const { getLspServerConfig } = await import(
        '../../../src/cli/helpers/init/claude-settings-lsp.js'
      );

      const config = getLspServerConfig('typescript');

      expect(config.command).toBe('typescript-language-server');
      expect(config.args).toContain('--stdio');
      expect(config.extensionToLanguage['.ts']).toBe('typescript');
      expect(config.extensionToLanguage['.tsx']).toBe('typescriptreact');
    });

    it('should include correct Python LSP configuration', async () => {
      const { getLspServerConfig } = await import(
        '../../../src/cli/helpers/init/claude-settings-lsp.js'
      );

      const config = getLspServerConfig('python');

      expect(config.command).toBe('pyright-langserver');
      expect(config.args).toContain('--stdio');
      expect(config.extensionToLanguage['.py']).toBe('python');
    });
  });
});
