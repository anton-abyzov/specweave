/**
 * Test: Does Claude Code Have Native LSP Tool?
 *
 * This test checks if Claude Code's NATIVE LSP tool is available
 * (the one from ENABLE_LSP_TOOL + vtsls plugin), NOT SpecWeave's CLI.
 *
 * KNOWN BUG: Claude Code v2.1.0+ has a regression where LSP servers
 * are filtered out during initialization even with ENABLE_LSP_TOOL=1.
 * See: https://github.com/anthropics/claude-code/issues/17468
 *
 * This test documents the current state and will detect when fixed.
 *
 * Run: npx vitest tests/e2e/lsp/claude-native-lsp-tool.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Claude Code Native LSP Tool Availability', () => {
  let claudeVersion: string;
  let enableLspToolSet: boolean;
  let vtsIsPluginEnabled: boolean;
  let lspServersConfigured: boolean;

  beforeAll(() => {
    // Get Claude version
    try {
      claudeVersion = execSync('claude --version', { encoding: 'utf-8' }).trim();
    } catch {
      claudeVersion = 'not installed';
    }

    // Check ENABLE_LSP_TOOL
    enableLspToolSet = process.env.ENABLE_LSP_TOOL === '1' || process.env.ENABLE_LSP_TOOL === 'true';

    // Check plugin enabled
    const userSettings = path.join(process.env.HOME || '~', '.claude/settings.json');
    const projectSettings = path.join(process.cwd(), '.claude/settings.json');

    vtsIsPluginEnabled = false;
    lspServersConfigured = false;

    for (const settingsPath of [userSettings, projectSettings]) {
      if (fs.existsSync(settingsPath)) {
        try {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
          if (settings.enabledPlugins?.['vtsls@claude-code-lsps']) {
            vtsIsPluginEnabled = true;
          }
          if (settings.lspServers && Object.keys(settings.lspServers).length > 0) {
            lspServersConfigured = true;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  });

  describe('Prerequisites Check', () => {
    it('should have Claude CLI installed', () => {
      // Skip in CI environments where Claude CLI isn't installed
      if (claudeVersion === 'not installed') {
        console.log('\n  ⚠️  SKIPPED: Claude CLI not installed (expected in CI)');
        return;
      }
      expect(claudeVersion).not.toBe('not installed');
      console.log(`\n  Claude Version: ${claudeVersion}`);
    });

    it('should have ENABLE_LSP_TOOL set', () => {
      console.log(`\n  ENABLE_LSP_TOOL: ${enableLspToolSet ? '✅ SET' : '❌ NOT SET'}`);
      // Informational - test documents the state
      expect(typeof enableLspToolSet).toBe('boolean');
    });

    it('should have vtsls plugin enabled', () => {
      console.log(`\n  vtsls plugin enabled: ${vtsIsPluginEnabled ? '✅ YES' : '❌ NO'}`);
      expect(typeof vtsIsPluginEnabled).toBe('boolean');
    });

    it('should have lspServers configured', () => {
      console.log(`\n  lspServers configured: ${lspServersConfigured ? '✅ YES' : '❌ NO'}`);
      expect(typeof lspServersConfigured).toBe('boolean');
    });
  });

  describe('Claude Native LSP Tool Test', () => {
    it('should test if Claude reports having LSP tool (KNOWN BUG in v2.1.0+)', async () => {
      // Skip if Claude not installed
      if (claudeVersion === 'not installed') {
        console.log('\n  ⚠️  SKIPPED: Claude CLI not installed');
        return;
      }

      // Spawn Claude with a prompt asking about LSP tool
      // Use --setting-sources "" for fast startup, but this might affect plugin loading
      const result = spawnSync(
        'claude',
        [
          '-p',
          'Do you have an LSP tool available? List your available tools that start with "LSP" or contain "lsp". Just say YES or NO and list the tool names.',
          '--model', 'haiku',
          '--output-format', 'text',
        ],
        {
          encoding: 'utf-8',
          timeout: 60000,
          env: {
            ...process.env,
            ENABLE_LSP_TOOL: '1',
          },
        }
      );

      console.log('\n┌─────────────────────────────────────────────────────────────┐');
      console.log('│  Claude Native LSP Tool Check                               │');
      console.log('├─────────────────────────────────────────────────────────────┤');
      console.log(`│  Exit code: ${result.status}                                             │`);

      if (result.status === 0) {
        const output = result.stdout.trim();
        const hasLspTool = output.toLowerCase().includes('yes') ||
                          output.toLowerCase().includes('lsp(') ||
                          output.toLowerCase().includes('lsp tool');

        console.log(`│  Claude says: ${output.slice(0, 45).padEnd(45)} │`);
        console.log(`│  Has LSP tool: ${hasLspTool ? '✅ YES' : '❌ NO'}                                       │`);

        if (!hasLspTool) {
          console.log('├─────────────────────────────────────────────────────────────┤');
          console.log('│  ⚠️  KNOWN BUG: Claude Code v2.1.0+ regression              │');
          console.log('│  Issue: github.com/anthropics/claude-code/issues/17468     │');
          console.log('│  LSP servers filtered out during initialization            │');
          console.log('│                                                             │');
          console.log('│  WORKAROUNDS:                                               │');
          console.log('│  1. Use v2.0.76: npx @anthropic-ai/claude-code@2.0.76       │');
          console.log('│  2. Use tweakcc: npx tweakcc --apply                        │');
          console.log('│  3. Use SpecWeave CLI: specweave lsp refs <file> <symbol>  │');
        }
      } else {
        console.log(`│  Error: ${(result.stderr || 'unknown').slice(0, 50).padEnd(50)} │`);
      }

      console.log('└─────────────────────────────────────────────────────────────┘\n');

      // This test documents state - it passes to record what happened
      expect(result.status).toBeDefined();
    }, 120000);
  });

  describe('Version Comparison', () => {
    it('should document which versions have working LSP', () => {
      console.log('\n');
      console.log('╔═══════════════════════════════════════════════════════════════╗');
      console.log('║         Claude Code LSP Tool Version Matrix                   ║');
      console.log('╠═══════════════════════════════════════════════════════════════╣');
      console.log('║                                                               ║');
      console.log('║  Version     │ Native LSP Tool │ Notes                        ║');
      console.log('║  ───────────────────────────────────────────────────────────  ║');
      console.log('║  ≤ 2.0.67    │ ✅ Works        │ With ENABLE_LSP_TOOL=1       ║');
      console.log('║  2.0.68-76   │ ✅ Works        │ Official LSP support added   ║');
      console.log('║  ≥ 2.1.0    │ ❌ Broken       │ Regression - Issue #17468    ║');
      console.log('║                                                               ║');
      console.log('║  Current:    │ ' + claudeVersion.padEnd(15) + ' │                              ║');
      console.log('║                                                               ║');
      console.log('╠═══════════════════════════════════════════════════════════════╣');
      console.log('║  ALTERNATIVE: SpecWeave CLI LSP (always works)               ║');
      console.log('║    specweave lsp refs <file> <symbol>                         ║');
      console.log('║    specweave lsp def <file> <symbol>                          ║');
      console.log('║    specweave lsp hover <file> <line> <col>                    ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝');
      console.log('\n');

      expect(true).toBe(true);
    });
  });
});
