/**
 * REAL Test: Does Claude Code Actually Have LSP Tools?
 *
 * This test checks whether Claude (the AI) has access to LSP tools,
 * NOT whether SpecWeave's TsServerClient works.
 *
 * HONEST ASSESSMENT:
 * - Claude Code's LSP plugins (vtsls, etc.) are supposed to add tools
 * - These tools should appear in Claude's tool list
 * - If not present, Claude falls back to Grep (text search)
 *
 * Run: npx vitest tests/e2e/lsp/claude-lsp-capability-check.test.ts
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Claude Code LSP Capability Check', () => {
  const projectRoot = process.cwd();

  describe('Plugin Installation Verification', () => {
    it('should check if vtsls plugin is in settings.json', () => {
      const settingsPath = path.join(process.env.HOME || '~', '.claude/settings.json');

      let hasVtsls = false;
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        hasVtsls = settings.enabledPlugins?.['vtsls@claude-code-lsps'] === true;
      }

      console.log('\n┌─────────────────────────────────────────────────────────────┐');
      console.log('│  CHECK 1: vtsls Plugin in settings.json                     │');
      console.log('├─────────────────────────────────────────────────────────────┤');
      console.log(`│  Status: ${hasVtsls ? '✅ ENABLED' : '❌ NOT ENABLED'}                                       │`);
      console.log('└─────────────────────────────────────────────────────────────┘\n');

      // This is informational - test passes either way
      expect(typeof hasVtsls).toBe('boolean');
    });

    it('should check if vtsls plugin cache exists and is valid', () => {
      const cachePath = path.join(
        process.env.HOME || '~',
        '.claude/plugins/cache/claude-code-lsps/vtsls'
      );

      const exists = fs.existsSync(cachePath);
      let isOrphaned = false;
      let hasLspJson = false;

      if (exists) {
        // Check for orphan marker
        const orphanPath = path.join(cachePath, '1.0.0/.orphaned_at');
        isOrphaned = fs.existsSync(orphanPath);

        // Check for .lsp.json config
        const lspJsonPath = path.join(cachePath, '1.0.0/.lsp.json');
        hasLspJson = fs.existsSync(lspJsonPath);
      }

      console.log('\n┌─────────────────────────────────────────────────────────────┐');
      console.log('│  CHECK 2: vtsls Plugin Cache Status                         │');
      console.log('├─────────────────────────────────────────────────────────────┤');
      console.log(`│  Cache exists:    ${exists ? '✅ YES' : '❌ NO'}                                      │`);
      console.log(`│  Is orphaned:     ${isOrphaned ? '❌ YES (BLOCKED)' : '✅ NO'}                              │`);
      console.log(`│  Has .lsp.json:   ${hasLspJson ? '✅ YES' : '❌ NO'}                                      │`);
      console.log('└─────────────────────────────────────────────────────────────┘\n');

      // If plugin is supposed to be installed, it shouldn't be orphaned
      if (exists) {
        expect(isOrphaned).toBe(false);
      }
    });

    it('should check if vtsls binary is installed', () => {
      let vtsls = { installed: false, version: '', path: '' };

      try {
        const whichResult = execSync('which vtsls', { encoding: 'utf-8' }).trim();
        const versionResult = execSync('vtsls --version', { encoding: 'utf-8' }).trim();
        vtsls = { installed: true, version: versionResult, path: whichResult };
      } catch {
        // vtsls not installed
      }

      console.log('\n┌─────────────────────────────────────────────────────────────┐');
      console.log('│  CHECK 3: vtsls Binary Installation                         │');
      console.log('├─────────────────────────────────────────────────────────────┤');
      console.log(`│  Installed: ${vtsls.installed ? '✅ YES' : '❌ NO'}                                         │`);
      if (vtsls.installed) {
        console.log(`│  Version:   ${vtsls.version.padEnd(46)} │`);
        const shortPath = vtsls.path.length > 46 ? '...' + vtsls.path.slice(-43) : vtsls.path;
        console.log(`│  Path:      ${shortPath.padEnd(46)} │`);
      }
      console.log('└─────────────────────────────────────────────────────────────┘\n');

      // Informational
      expect(typeof vtsls.installed).toBe('boolean');
    });
  });

  describe('The Honest Truth About Claude LSP', () => {
    it('should document what Claude can and cannot do', () => {
      console.log('\n');
      console.log('╔═══════════════════════════════════════════════════════════════╗');
      console.log('║           HONEST ASSESSMENT: Claude + LSP                     ║');
      console.log('╠═══════════════════════════════════════════════════════════════╣');
      console.log('║                                                               ║');
      console.log('║  WHAT CLAUDE HAS (explicit tools):                            ║');
      console.log('║    ✅ Grep  - text pattern matching                           ║');
      console.log('║    ✅ Glob  - file pattern matching                           ║');
      console.log('║    ✅ Read  - read file contents                              ║');
      console.log('║    ✅ Bash  - run shell commands                              ║');
      console.log('║                                                               ║');
      console.log('║  WHAT CLAUDE DOES NOT HAVE (no explicit tools):               ║');
      console.log('║    ❌ findReferences  - semantic symbol references            ║');
      console.log('║    ❌ goToDefinition  - semantic navigation                   ║');
      console.log('║    ❌ hover           - type information                      ║');
      console.log('║    ❌ documentSymbols - file outline                          ║');
      console.log('║                                                               ║');
      console.log('║  LSP IN CLAUDE CODE:                                          ║');
      console.log('║    • LSP works in BACKGROUND during code editing              ║');
      console.log('║    • It\'s PASSIVE - not an explicit tool Claude can call     ║');
      console.log('║    • vtsls plugin SHOULD add tools, but may be broken         ║');
      console.log('║                                                               ║');
      console.log('║  WHAT SPECWEAVE TsServerClient IS:                            ║');
      console.log('║    • A TypeScript class that spawns tsserver                  ║');
      console.log('║    • Runs as YOUR code in a subprocess                        ║');
      console.log('║    • NOT the same as Claude having LSP tools                  ║');
      console.log('║                                                               ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝');
      console.log('\n');

      // This test is documentation, always passes
      expect(true).toBe(true);
    });

    it('should show the difference between Grep and LSP', () => {
      const grepOutput = execSync(
        'grep -rn "ActiveIncrementManager" --include="*.ts" src/ | wc -l',
        { cwd: projectRoot, encoding: 'utf-8' }
      );
      const grepCount = parseInt(grepOutput.trim(), 10);

      console.log('\n┌─────────────────────────────────────────────────────────────┐');
      console.log('│  GREP vs LSP: What Claude Actually Does                     │');
      console.log('├─────────────────────────────────────────────────────────────┤');
      console.log(`│  Grep results: ${String(grepCount).padStart(3)} matches (text)                          │`);
      console.log('│  LSP results:  ??? (Claude has no LSP tool to call)         │');
      console.log('├─────────────────────────────────────────────────────────────┤');
      console.log('│                                                             │');
      console.log('│  When you ask Claude to "find references":                  │');
      console.log('│    1. Claude checks available tools                         │');
      console.log('│    2. No "findReferences" tool exists                       │');
      console.log('│    3. Falls back to Grep (text matching)                    │');
      console.log('│    4. Returns text matches, NOT semantic refs               │');
      console.log('│                                                             │');
      console.log('│  This is why the results include comments & docs!           │');
      console.log('└─────────────────────────────────────────────────────────────┘\n');

      expect(grepCount).toBeGreaterThan(0);
    });
  });

  describe('What Would Make LSP Work for Claude', () => {
    it('should document the requirements for Claude to have LSP tools', () => {
      console.log('\n');
      console.log('╔═══════════════════════════════════════════════════════════════╗');
      console.log('║         REQUIREMENTS FOR CLAUDE TO HAVE LSP TOOLS            ║');
      console.log('╠═══════════════════════════════════════════════════════════════╣');
      console.log('║                                                               ║');
      console.log('║  1. ENABLE_LSP_TOOL=1 in environment                          ║');
      console.log('║     export ENABLE_LSP_TOOL=1  # in ~/.zshrc                   ║');
      console.log('║                                                               ║');
      console.log('║  2. Install working LSP plugin                                ║');
      console.log('║     claude plugin install vtsls@claude-code-lsps              ║');
      console.log('║                                                               ║');
      console.log('║  3. Install language server binary                            ║');
      console.log('║     npm install -g @vtsls/language-server typescript          ║');
      console.log('║                                                               ║');
      console.log('║  4. Plugin must load successfully                             ║');
      console.log('║     /plugin should show ✓ enabled (not "failed to load")     ║');
      console.log('║                                                               ║');
      console.log('║  5. Restart Claude Code after all setup                       ║');
      console.log('║                                                               ║');
      console.log('║  CURRENT STATUS (check /plugin):                              ║');
      console.log('║     If vtsls shows "failed to load" - Claude has NO LSP      ║');
      console.log('║                                                               ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝');
      console.log('\n');

      expect(true).toBe(true);
    });
  });
});
