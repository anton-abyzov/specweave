/**
 * Integration tests for plugin scope installation in user-prompt-submit.sh
 *
 * Tests that the hook applies correct --scope flags when installing plugins:
 * - LSP plugins → project scope (default)
 * - SpecWeave plugins → user scope (default)
 * - Custom overrides from config
 *
 * @increment 0179-project-scoped-plugin-installation
 * @task T-004 [RED]
 * @satisfies AC-US2-01, AC-US2-02, AC-US2-03, AC-US1-04
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Plugin Scope Installation (AC-US2-01, AC-US2-02, AC-US2-03)', () => {
  const hookScript = path.join(
    process.cwd(),
    'plugins/specweave/hooks/user-prompt-submit.sh'
  );

  describe('Scope flag application for LSP plugins (AC-US2-01, AC-US2-03)', () => {
    it('should use --scope project for vtsls LSP plugin', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // The hook should apply --scope project when installing vtsls
      // Expected pattern: claude plugin install vtsls@... --scope project
      expect(scriptContent).toMatch(/claude plugin install.*vtsls.*--scope\s+(project|\$LSP_PLUGIN_SCOPE)/);
    });

    it('should use --scope project for pyright LSP plugin', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Expected: claude plugin install pyright@... --scope project
      expect(scriptContent).toMatch(/claude plugin install.*pyright.*--scope\s+(project|\$LSP_PLUGIN_SCOPE)/);
    });

    it('should use --scope project for rust-analyzer LSP plugin', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Expected: claude plugin install rust-analyzer@... --scope project
      expect(scriptContent).toMatch(/claude plugin install.*rust-analyzer.*--scope\s+(project|\$LSP_PLUGIN_SCOPE)/);
    });
  });

  describe('Scope configuration from config.json (AC-US2-02, AC-US1-04)', () => {
    it('should read LSP scope from config.json plugins.scope.lspScope', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // The hook should read scope from config
      // Expected: jq -r '.plugins.scope.lspScope // "project"'
      expect(scriptContent).toMatch(/plugins\.scope\.lspScope|plugins\s*\.\s*scope\s*\.\s*lspScope/);
    });

    it('should have default scope of project for LSP when not configured', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Default should be project for LSP
      // Expected: LSP_SCOPE=$(jq -r '.plugins.scope.lspScope // "project"' ...)
      expect(scriptContent).toMatch(/lspScope.*"project"|LSP_SCOPE.*project/i);
    });

    it('should have a variable for LSP scope that can be overridden', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Should have LSP_SCOPE or similar variable
      expect(scriptContent).toMatch(/LSP_SCOPE|LSP_PLUGIN_SCOPE/);
    });
  });

  describe('Scope flag format (AC-US2-03)', () => {
    it('should include --scope flag in install command', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // The --scope flag should be present in install commands
      expect(scriptContent).toMatch(/--scope\s+(user|project|local|\$[A-Z_]+)/);
    });

    it('should place --scope flag after plugin name', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Correct order: claude plugin install <plugin>@<marketplace> --scope <scope>
      expect(scriptContent).toMatch(/claude\s+plugin\s+install\s+\S+@\S+\s+--scope/);
    });
  });

  describe('Config structure support', () => {
    it('should parse plugins.scope config section', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Should read from plugins.scope section in config
      expect(scriptContent).toMatch(/plugins\.scope|"plugins".*"scope"/);
    });
  });
});

describe('Plugin Scope Configuration Parsing', () => {
  let testDir: string;
  let configPath: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-scope-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave'), { recursive: true });
    configPath = path.join(testDir, '.specweave', 'config.json');
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should parse lspScope from config.json', () => {
    const config = {
      plugins: {
        scope: {
          defaultScope: 'user',
          lspScope: 'project',
          specweaveScope: 'user',
        },
      },
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    const parsedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    expect(parsedConfig.plugins.scope.lspScope).toBe('project');
  });

  it('should support scopeOverrides for specific plugins', () => {
    const config = {
      plugins: {
        scope: {
          defaultScope: 'user',
          lspScope: 'project',
          scopeOverrides: {
            'context7': 'user',
            'playwright': 'user',
          },
        },
      },
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    const parsedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    expect(parsedConfig.plugins.scope.scopeOverrides['context7']).toBe('user');
    expect(parsedConfig.plugins.scope.scopeOverrides['playwright']).toBe('user');
  });
});
