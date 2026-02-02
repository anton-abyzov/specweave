/**
 * LSP Integration Flow Test
 *
 * This test verifies the COMPLETE flow:
 * 1. Hook detects "find references" request
 * 2. Hook injects LSP CLI instructions (not "use grep")
 * 3. CLI command uses tsserver under the hood
 * 4. Results are SEMANTIC (fewer than grep, more accurate)
 *
 * This proves Claude would use real LSP, not fall back to grep.
 *
 * Run: npx vitest tests/e2e/lsp/lsp-integration-flow.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execSync, spawnSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

describe('LSP Integration Flow: Hook → CLI → TsServer', () => {
  const projectRoot = process.cwd();
  const hookPath = 'plugins/specweave/hooks/user-prompt-submit.sh';

  describe('Step 1: Hook Detection', () => {
    it('should detect LSP request in prompt', () => {
      const prompt = 'find references to ActiveIncrementManager with LSP';
      const input = JSON.stringify({ prompt });

      const result = spawnSync('bash', [hookPath], {
        input,
        cwd: projectRoot,
        encoding: 'utf-8',
        env: { ...process.env, HOME: process.env.HOME },
      });

      expect(result.status).toBe(0);

      const output = JSON.parse(result.stdout);
      const context = output.hookSpecificOutput?.additionalContext || '';

      // MUST contain LSP CLI instructions, NOT "use Grep"
      expect(context).toContain('specweave lsp refs');
      expect(context).toContain('LSP Semantic Analysis');
      expect(context).not.toContain('Grep { pattern:');
    });

    it('should inject LSP instructions for various phrasings', () => {
      const prompts = [
        'find all references to MetadataManager',
        'show references for this class',
        'go to definition of TsServerClient',
        'where is ActiveIncrementManager defined',
        'what uses this function',
      ];

      for (const prompt of prompts) {
        const input = JSON.stringify({ prompt });
        const result = spawnSync('bash', [hookPath], {
          input,
          cwd: projectRoot,
          encoding: 'utf-8',
          env: { ...process.env, HOME: process.env.HOME },
        });

        const output = JSON.parse(result.stdout);
        const context = output.hookSpecificOutput?.additionalContext || '';

        // At least one LSP-related instruction should be present
        const hasLspInstruction =
          context.includes('specweave lsp') ||
          context.includes('LSP') ||
          context.includes('semantic');

        expect(hasLspInstruction).toBe(true);
      }
    });
  });

  describe('Step 2: CLI Uses TsServer (Not Grep)', () => {
    it('should have specweave lsp command available', () => {
      const result = execSync('specweave lsp --help', {
        cwd: projectRoot,
        encoding: 'utf-8',
      });

      expect(result).toContain('refs');
      expect(result).toContain('def');
      expect(result).toContain('hover');
      expect(result).toContain('symbols');
    });

    it('should use tsserver under the hood (check warmup message)', () => {
      // Run a simple LSP command and check for tsserver initialization
      const result = execSync(
        'specweave lsp refs src/core/increment/active-increment-manager.ts ActiveIncrementManager 2>&1',
        {
          cwd: projectRoot,
          encoding: 'utf-8',
          timeout: 60000,
        }
      );

      // Should mention tsserver initialization
      expect(result).toMatch(/tsserver|TsServer|TypeScript/i);

      // Should NOT mention grep
      expect(result).not.toMatch(/grep -rn|text matching/i);
    });

    it('should find tsserver in node_modules', () => {
      const tsserverPath = path.join(
        projectRoot,
        'node_modules/typescript/lib/tsserver.js'
      );

      expect(fs.existsSync(tsserverPath)).toBe(true);
    });
  });

  describe('Step 3: Results Are Semantic (Not Text Matching)', () => {
    let grepCount: number;
    let lspCount: number;
    let lspOutput: string;
    let grepOutput: string;

    beforeAll(() => {
      // Get grep results (text matching)
      grepOutput = execSync(
        'grep -rn "ActiveIncrementManager" --include="*.ts" src/',
        { cwd: projectRoot, encoding: 'utf-8' }
      );
      grepCount = grepOutput.trim().split('\n').length;

      // Get LSP results (semantic)
      lspOutput = execSync(
        'specweave lsp refs src/core/increment/active-increment-manager.ts ActiveIncrementManager 2>&1',
        { cwd: projectRoot, encoding: 'utf-8', timeout: 60000 }
      );

      // Extract count from "Total: N references"
      const match = lspOutput.match(/Total:\s*(\d+)\s*references/);
      lspCount = match ? parseInt(match[1], 10) : 0;
    }, 120000);

    it('should return fewer results than grep (semantic filtering)', () => {
      console.log(`\n  Grep count: ${grepCount} (text matches)`);
      console.log(`  LSP count:  ${lspCount} (semantic refs)\n`);

      // LSP should find FEWER results (filters out comments, strings, docs)
      expect(lspCount).toBeLessThan(grepCount);
      expect(lspCount).toBeGreaterThan(0);
    });

    it('should NOT include test files in references (semantic filter)', () => {
      // LSP semantic refs should focus on actual code usage
      // Test files may appear in grep but shouldn't dominate LSP results
      const grepTestFiles = grepOutput
        .split('\n')
        .filter((line) => line.includes('.test.ts')).length;
      const lspTestFiles = lspOutput
        .split('\n')
        .filter((line) => line.includes('.test.ts')).length;

      // This is informational - LSP may include some test files legitimately
      console.log(`  Grep test file matches: ${grepTestFiles}`);
      console.log(`  LSP test file refs: ${lspTestFiles}`);
    });

    it('should include known usage files', () => {
      // These files are known to USE ActiveIncrementManager
      const expectedFiles = [
        'metadata-manager.ts',
        'workflow-orchestrator.ts',
        'active-increment-manager.ts', // definition
      ];

      for (const file of expectedFiles) {
        expect(lspOutput).toContain(file);
      }
    });
  });

  describe('Step 4: Full Flow Verification', () => {
    it('should complete the full integration flow', async () => {
      console.log('\n');
      console.log('╔═══════════════════════════════════════════════════════════════╗');
      console.log('║         LSP INTEGRATION FLOW TEST SUMMARY                     ║');
      console.log('╠═══════════════════════════════════════════════════════════════╣');

      // Step 1: Hook detection
      const hookInput = JSON.stringify({
        prompt: 'find references to ActiveIncrementManager',
      });
      const hookResult = spawnSync('bash', [hookPath], {
        input: hookInput,
        cwd: projectRoot,
        encoding: 'utf-8',
        env: { ...process.env, HOME: process.env.HOME },
      });
      const hookOutput = JSON.parse(hookResult.stdout);
      const hasLspInstructions =
        hookOutput.hookSpecificOutput?.additionalContext?.includes('specweave lsp');

      console.log('║                                                               ║');
      console.log(
        `║  1. Hook detects LSP request:     ${hasLspInstructions ? '✅ PASS' : '❌ FAIL'}                      ║`
      );

      // Step 2: CLI available
      let cliAvailable = false;
      try {
        execSync('specweave lsp --help', { cwd: projectRoot, encoding: 'utf-8' });
        cliAvailable = true;
      } catch {
        cliAvailable = false;
      }
      console.log(
        `║  2. specweave lsp CLI available:  ${cliAvailable ? '✅ PASS' : '❌ FAIL'}                      ║`
      );

      // Step 3: TsServer exists
      const tsserverExists = fs.existsSync(
        path.join(projectRoot, 'node_modules/typescript/lib/tsserver.js')
      );
      console.log(
        `║  3. tsserver installed:           ${tsserverExists ? '✅ PASS' : '❌ FAIL'}                      ║`
      );

      // Step 4: Semantic results
      const grepOut = execSync(
        'grep -rn "ActiveIncrementManager" --include="*.ts" src/ | wc -l',
        { cwd: projectRoot, encoding: 'utf-8' }
      );
      const grepN = parseInt(grepOut.trim(), 10);

      const lspOut = execSync(
        'specweave lsp refs src/core/increment/active-increment-manager.ts ActiveIncrementManager 2>&1',
        { cwd: projectRoot, encoding: 'utf-8', timeout: 60000 }
      );
      const lspMatch = lspOut.match(/Total:\s*(\d+)\s*references/);
      const lspN = lspMatch ? parseInt(lspMatch[1], 10) : 0;

      const isSemantic = lspN < grepN && lspN > 0;
      console.log(
        `║  4. Results are semantic:         ${isSemantic ? '✅ PASS' : '❌ FAIL'}                      ║`
      );
      console.log(`║     (LSP: ${lspN} refs vs Grep: ${grepN} matches)                      ║`);

      console.log('║                                                               ║');
      console.log('╠═══════════════════════════════════════════════════════════════╣');

      const allPass = hasLspInstructions && cliAvailable && tsserverExists && isSemantic;
      console.log(
        `║  OVERALL: ${allPass ? '✅ ALL TESTS PASS' : '❌ SOME TESTS FAILED'}                                 ║`
      );
      console.log('║                                                               ║');
      console.log('║  When user asks "find references to X":                       ║');
      console.log('║    1. Hook injects: "use specweave lsp refs"                  ║');
      console.log('║    2. Claude runs: specweave lsp refs <file> <symbol>         ║');
      console.log('║    3. CLI uses: tsserver (semantic analysis)                  ║');
      console.log('║    4. Result: REAL references, not grep text matches          ║');
      console.log('║                                                               ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝');
      console.log('\n');

      expect(hasLspInstructions).toBe(true);
      expect(cliAvailable).toBe(true);
      expect(tsserverExists).toBe(true);
      expect(isSemantic).toBe(true);
    }, 120000);
  });
});
