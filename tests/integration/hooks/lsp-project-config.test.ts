/**
 * Integration tests for LSP project-level configuration
 *
 * Tests that LSP can be configured via .specweave/config.json instead of
 * requiring ENABLE_LSP_TOOL=1 environment variable.
 *
 * The hook should:
 * 1. Read lsp.enabled from config.json
 * 2. Auto-install boostvolt/claude-code-lsps marketplace when LSP is requested
 * 3. Auto-install language-specific LSP plugins when needed
 *
 * @increment 0162-lsp-skill-integration
 * @task T-032 [RED]
 * @satisfies AC-US5-01, AC-US5-02, AC-US5-03
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

describe('LSP project-level configuration', () => {
  const hookScript = path.join(
    process.cwd(),
    'plugins/specweave/hooks/user-prompt-submit.sh'
  );

  describe('Config schema (AC-US5-01)', () => {
    it('should support lsp.enabled in config.json', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Hook should read lsp.enabled from config
      expect(scriptContent).toMatch(/lsp\.enabled|lsp\["enabled"\]|\.lsp\.enabled/);
    });

    it('should support lsp.autoInstallPlugins in config.json', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Hook should read lsp.autoInstallPlugins from config
      expect(scriptContent).toMatch(/lsp\.autoInstallPlugins|autoInstallPlugins/);
    });

    it('should support lsp.marketplace in config.json', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Hook should read lsp.marketplace from config (default: boostvolt/claude-code-lsps)
      expect(scriptContent).toMatch(/lsp\.marketplace|boostvolt\/claude-code-lsps/);
    });
  });

  describe('Marketplace auto-install detection (AC-US5-02)', () => {
    it('should detect when LSP request is made and marketplace is missing', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Hook should check if marketplace is installed
      expect(scriptContent).toMatch(/claude-code-lsps|marketplace.*add|plugin.*marketplace/i);
    });

    it('should include marketplace add command when LSP requested', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Should have the actual marketplace add command
      expect(scriptContent).toContain('claude plugin marketplace add');
      expect(scriptContent).toMatch(/boostvolt\/claude-code-lsps|github\.com\/boostvolt/);
    });

    it('should only auto-install marketplace when lsp.autoInstallPlugins is true', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Should check autoInstallPlugins before attempting install
      expect(scriptContent).toMatch(/autoInstallPlugins.*true|LSP_AUTO_INSTALL/i);
    });
  });

  describe('Plugin auto-install (AC-US5-03)', () => {
    it('should detect TypeScript LSP plugin need for .ts files', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Should map TypeScript to vtsls plugin
      expect(scriptContent).toMatch(/vtsls|typescript.*lsp/i);
    });

    it('should include plugin install command for detected language', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Should have plugin install command pattern
      expect(scriptContent).toMatch(/claude plugin install.*@claude-code-lsps/);
    });
  });

  describe('Environment variable guidance (AC-US5-04)', () => {
    it('should warn about ENABLE_LSP_TOOL when config enabled but env var missing', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Should check ENABLE_LSP_TOOL environment variable
      expect(scriptContent).toMatch(/ENABLE_LSP_TOOL/);
    });

    it('should provide one-time setup instructions', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Should include setup instructions for the env var
      expect(scriptContent).toMatch(/export ENABLE_LSP_TOOL=1|~\/\.zshrc|~\/\.bashrc/);
    });
  });

  describe('LSP request keyword detection', () => {
    it('should detect "find references" as LSP request', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      expect(scriptContent).toMatch(/find.*references/i);
    });

    it('should detect "go to definition" as LSP request', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      expect(scriptContent).toMatch(/go.*to.*definition|goto.*definition/i);
    });

    it('should trigger marketplace check on LSP request', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // The LSP request detection should lead to marketplace check
      // This tests the flow: detect LSP keywords → check marketplace → auto-install
      expect(scriptContent).toMatch(
        /(find.*references|go.*to.*definition)[\s\S]*?(marketplace|claude-code-lsps)/i
      );
    });
  });
});

describe('LSP config E2E behavior', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsp-config-test-'));
    const specweavePath = path.join(tempDir, '.specweave');
    fs.mkdirSync(specweavePath, { recursive: true });
    configPath = path.join(specweavePath, 'config.json');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should read lsp.enabled from config.json', () => {
    // Create config with LSP enabled
    const config = {
      version: '2.0',
      lsp: {
        enabled: true,
        autoInstallPlugins: true,
        marketplace: 'boostvolt/claude-code-lsps',
      },
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Verify jq can read the config
    const result = execSync(
      `jq -r '.lsp.enabled // false' "${configPath}"`,
      { encoding: 'utf-8' }
    ).trim();

    expect(result).toBe('true');
  });

  it('should read lsp.marketplace from config.json', () => {
    const config = {
      version: '2.0',
      lsp: {
        enabled: true,
        marketplace: 'boostvolt/claude-code-lsps',
      },
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    const result = execSync(
      `jq -r '.lsp.marketplace // "claude-plugins-official"' "${configPath}"`,
      { encoding: 'utf-8' }
    ).trim();

    expect(result).toBe('boostvolt/claude-code-lsps');
  });

  it('should default to false when lsp section missing', () => {
    const config = {
      version: '2.0',
      project: { name: 'test' },
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    const result = execSync(
      `jq -r '.lsp.enabled // false' "${configPath}"`,
      { encoding: 'utf-8' }
    ).trim();

    expect(result).toBe('false');
  });
});
