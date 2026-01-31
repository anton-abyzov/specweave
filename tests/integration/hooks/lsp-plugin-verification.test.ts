/**
 * Integration tests for LSP plugin verification in lsp-check.sh
 *
 * Tests that lsp-check.sh verifies both:
 * 1. Language server BINARY is installed (existing behavior)
 * 2. Claude CODE PLUGIN is installed (new behavior)
 *
 * Gap identified: Binary present + Plugin missing = LSP won't work
 *
 * @increment 0177-lsp-integration-fixes
 * @task T-009 [RED]
 * @satisfies AC-US4-01, AC-US4-02, AC-US4-03
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('LSP plugin verification (AC-US4-01, AC-US4-02, AC-US4-03)', () => {
  const lspCheckScript = path.join(
    process.cwd(),
    'plugins/specweave/scripts/lsp-check.sh'
  );

  describe('Plugin installation verification (AC-US4-01)', () => {
    it('should check for installed_plugins.json in Claude home directory', () => {
      const scriptContent = fs.readFileSync(lspCheckScript, 'utf-8');

      // The script should read Claude's installed plugins file
      // Expected: ~/.claude/plugins/installed_plugins.json
      expect(scriptContent).toMatch(/\.claude\/plugins\/installed_plugins\.json/);
    });

    it('should have function to check if plugin is registered', () => {
      const scriptContent = fs.readFileSync(lspCheckScript, 'utf-8');

      // Should have a function like has_plugin() or is_plugin_installed()
      expect(scriptContent).toMatch(/has_plugin|is_plugin_installed|check_plugin/i);
    });

    it('should map language servers to their corresponding plugins', () => {
      const scriptContent = fs.readFileSync(lspCheckScript, 'utf-8');

      // Should have mapping from language to plugin name
      // e.g., TypeScript -> typescript-lsp, C# -> csharp-lsp
      expect(scriptContent).toMatch(/typescript-lsp|csharp-lsp|python-lsp/i);
    });
  });

  describe('Binary + Plugin gap detection (AC-US4-02)', () => {
    it('should warn when binary exists but plugin is not installed', () => {
      const scriptContent = fs.readFileSync(lspCheckScript, 'utf-8');

      // Should have logic to detect: binary present AND plugin missing
      // Expected pattern: check binary exists, then check plugin exists
      expect(scriptContent).toMatch(/binary.*plugin|plugin.*binary/is);
    });

    it('should output different status for missing binary vs missing plugin', () => {
      const scriptContent = fs.readFileSync(lspCheckScript, 'utf-8');

      // Should distinguish between:
      // - "missing_binary": Language server not installed
      // - "missing_plugin": Binary installed but Claude plugin not registered
      expect(scriptContent).toMatch(/missing_binary|missing_plugin/i);
    });
  });

  describe('Plugin install command in warnings (AC-US4-03)', () => {
    it('should include exact plugin install command in output', () => {
      const scriptContent = fs.readFileSync(lspCheckScript, 'utf-8');

      // Warning should include: claude plugin install X@claude-plugins-official
      expect(scriptContent).toContain('claude plugin install');
      expect(scriptContent).toContain('@claude-plugins-official');
    });

    it('should include plugin name for each language', () => {
      const scriptContent = fs.readFileSync(lspCheckScript, 'utf-8');

      // Should have plugin names in config mapping
      // Uses boostvolt/claude-code-lsps marketplace (official plugins are broken)
      // Plugin names: vtsls (TypeScript), pyright (Python), csharp-lsp (C#)
      expect(scriptContent).toContain('vtsls');        // TypeScript (boostvolt marketplace)
      expect(scriptContent).toContain('pyright');      // Python
      expect(scriptContent).toContain('csharp-lsp');   // C#
      // Verify the template for constructing plugin commands
      // Note: Marketplace may be claude-plugins-official or boostvolt's
      expect(scriptContent).toMatch(/PLUGIN_NAME|claude.*plugin.*install/);
    });
  });
});
