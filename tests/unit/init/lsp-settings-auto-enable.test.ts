/**
 * Unit Tests for LSP Auto-Enable Feature
 *
 * Tests that LSP configuration is automatically set up via a local plugin
 * during `specweave init` and `specweave update`.
 *
 * The correct approach is to create a plugin at .claude/plugins/specweave-lsp/
 * with .lsp.json, NOT to put lspServers directly in settings.json.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('LSP Auto-Enable Feature', () => {
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

  describe('ensureClaudeSettingsWithLsp', () => {
    it('should create .claude/settings.json with lspServers if not exists', async () => {
      // Import the function we're testing
      const { ensureClaudeSettingsWithLsp } = await import(
        '../../../src/cli/helpers/init/claude-settings-lsp.js'
      );

      // Execute
      await ensureClaudeSettingsWithLsp(tempDir);

      // Verify settings.json has lspServers (for backwards compat)
      const settingsPath = path.join(tempDir, '.claude', 'settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      expect(settings.lspServers).toBeDefined();
      expect(settings.lspServers.vtsls).toBeDefined();

      // Also verify plugin was created (the correct approach)
      const pluginPath = path.join(tempDir, '.claude', 'plugins', 'specweave-lsp', '.lsp.json');
      expect(fs.existsSync(pluginPath)).toBe(true);
    });

    it('should add lspServers to existing .claude/settings.json without overwriting permissions', async () => {
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

    it('should detect TypeScript project and include vtsls', async () => {
      const { ensureClaudeSettingsWithLsp } = await import(
        '../../../src/cli/helpers/init/claude-settings-lsp.js'
      );

      // Create TypeScript project indicators
      fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
        devDependencies: { typescript: '^5.0.0' }
      }));

      // Execute
      await ensureClaudeSettingsWithLsp(tempDir);

      // Verify in plugin .lsp.json
      const lspJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, '.claude', 'plugins', 'specweave-lsp', '.lsp.json'), 'utf-8')
      );

      expect(lspJson.vtsls).toBeDefined();
      expect(lspJson.vtsls.extensionToLanguage['.ts']).toBe('typescript');
    });

    it('should detect Python project and include pyright', async () => {
      const { ensureClaudeSettingsWithLsp } = await import(
        '../../../src/cli/helpers/init/claude-settings-lsp.js'
      );

      // Create Python project indicators
      fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'flask==2.0.0');
      fs.writeFileSync(path.join(tempDir, 'main.py'), 'print("hello")');

      // Execute
      await ensureClaudeSettingsWithLsp(tempDir);

      // Verify in plugin .lsp.json
      const lspJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, '.claude', 'plugins', 'specweave-lsp', '.lsp.json'), 'utf-8')
      );

      expect(lspJson.pyright).toBeDefined();
      expect(lspJson.pyright.extensionToLanguage['.py']).toBe('python');
    });
  });

  describe('Integration with init command', () => {
    it('should call ensureClaudeSettingsWithLsp during specweave init', async () => {
      // This test verifies the integration point
      // The actual init flow should include LSP setup

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

      // Execute copyTemplates (which should now include LSP setup)
      await copyTemplates(templatesDir, tempDir, 'test-project', 'en');

      // Verify LSP settings were created
      const settingsPath = path.join(tempDir, '.claude', 'settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      expect(settings.lspServers).toBeDefined();
    });
  });

  describe('Integration with update command', () => {
    it('should add lspServers during specweave update if missing', async () => {
      const { ensureLspSettingsOnUpdate } = await import(
        '../../../src/cli/helpers/init/claude-settings-lsp.js'
      );

      // Create existing .claude/settings.json WITHOUT lspServers
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(
        path.join(claudeDir, 'settings.json'),
        JSON.stringify({ permissions: { allow: ['Bash'] } }, null, 2)
      );

      // Execute update logic
      await ensureLspSettingsOnUpdate(tempDir);

      // Verify lspServers was added
      const settings = JSON.parse(
        fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf-8')
      );

      expect(settings.lspServers).toBeDefined();
      expect(settings.permissions.allow).toContain('Bash'); // preserved
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
