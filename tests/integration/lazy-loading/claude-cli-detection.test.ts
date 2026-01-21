/**
 * Claude CLI Detection Isolated Test
 *
 * Tests the exact code path used by isClaudeCliAvailable()
 * to diagnose why it returns available: false even when
 * the claude binary is working.
 *
 * RUN:
 *   npx vitest run tests/integration/lazy-loading/claude-cli-detection.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { execFileNoThrowSync } from '../../../src/utils/execFileNoThrow.js';
import { detectClaudeCli } from '../../../src/utils/claude-cli-detector.js';
import { clearCliCache, isClaudeCliAvailable } from '../../../src/core/lazy-loading/llm-plugin-detector.js';

/**
 * CRITICAL: Get clean environment for spawning child processes.
 *
 * Removes debugger and instrumentation env vars that can cause
 * child processes to fail across different environments:
 *
 * - VSCode Debug: NODE_OPTIONS contains --inspect-brk flags
 * - WebStorm/IntelliJ: NODE_OPTIONS or IDEA-specific vars
 * - CI/CD (GitHub Actions, etc.): May set NODE_OPTIONS for coverage
 * - Jest/Vitest: May set NODE_OPTIONS for debugging
 *
 * This function is safe to use in ALL environments:
 * - Windows, macOS, Linux
 * - Local development, CI/CD pipelines
 * - Debug mode, run mode, production
 *
 * If NODE_OPTIONS is not set, delete is a no-op (safe).
 *
 * This is the same fix used in claude-cli-detector.ts
 */
function getCleanEnv(): NodeJS.ProcessEnv {
  const cleanEnv = { ...process.env };

  // Remove Node.js debugger/inspector flags (VSCode, WebStorm, etc.)
  delete cleanEnv.NODE_OPTIONS;
  delete cleanEnv.NODE_INSPECT;
  delete cleanEnv.NODE_INSPECT_RESUME_ON_START;

  // Remove coverage instrumentation that can interfere with spawned processes
  delete cleanEnv.NODE_V8_COVERAGE;

  // Remove test runner debug vars
  delete cleanEnv.VSCODE_INSPECTOR_OPTIONS;

  return cleanEnv;
}

describe('Claude CLI Detection (Isolated)', () => {
  beforeEach(() => {
    // Clear cache before each test to ensure fresh detection
    clearCliCache();
  });

  describe('Environment Diagnostic', () => {
    it('should diagnose PATH and environment', () => {
      console.log('\n========== ENVIRONMENT DIAGNOSTIC ==========');
      console.log('HOME:', os.homedir());
      console.log('PATH entries:');
      const pathEntries = (process.env.PATH || '').split(':');
      const localBinPath = path.join(os.homedir(), '.local', 'bin');
      pathEntries.forEach((p, i) => {
        const isLocalBin = p === localBinPath;
        console.log(`  ${i + 1}. ${p}${isLocalBin ? ' <<<< ~/.local/bin' : ''}`);
      });
      console.log(`\n~/.local/bin in PATH: ${pathEntries.includes(localBinPath) ? 'YES' : 'NO'}`);

      // Check if claude binary exists
      const claudePath = path.join(localBinPath, 'claude');
      console.log(`Claude binary exists at ${claudePath}: ${fs.existsSync(claudePath) ? 'YES' : 'NO'}`);
      console.log('============================================\n');

      expect(true).toBe(true);
    });
  });

  describe('Raw Command Execution', () => {
    it('should find claude via which', () => {
      const result = execFileNoThrowSync('which', ['claude']);
      console.log('which claude:', result);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('claude');
    });

    it('should get claude version via execFileNoThrowSync', () => {
      const result = execFileNoThrowSync('claude', ['--version'], { timeout: 10000 });
      console.log('claude --version (execFileNoThrowSync):', result);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Claude Code');
    });

    it('should get claude version via spawnSync with shell', () => {
      const result = spawnSync('claude', ['--version'], {
        encoding: 'utf8',
        timeout: 10000,
        shell: true,
      });
      console.log('claude --version (spawnSync shell:true):', {
        status: result.status,
        stdout: result.stdout,
        stderr: result.stderr,
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Claude Code');
    });

    it('should run claude plugin --help via execFileNoThrowSync', () => {
      const result = execFileNoThrowSync('claude', ['plugin', '--help'], { timeout: 10000 });
      console.log('claude plugin --help (execFileNoThrowSync):', result);
      // This is the key test - if this fails, we found the problem
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('plugin');
    });

    it('should run claude plugin --help via spawnSync with shell', () => {
      const result = spawnSync('claude', ['plugin', '--help'], {
        encoding: 'utf8',
        timeout: 10000,
        shell: true,
      });
      console.log('claude plugin --help (spawnSync shell:true):', {
        status: result.status,
        stdout: result.stdout?.substring(0, 200),
        stderr: result.stderr?.substring(0, 200),
      });
      expect(result.status).toBe(0);
    });
  });

  describe('Plugin Check Methods (Mimics tryPluginCheck)', () => {
    const claudePath = path.join(os.homedir(), '.local', 'bin', 'claude');

    it('Method 1: execFileNoThrowSync direct binary', () => {
      console.log(`\n[Method 1] execFileNoThrowSync('${claudePath}', ['plugin', '--help'])`);
      const result = execFileNoThrowSync(claudePath, ['plugin', '--help'], { timeout: 10000 });
      console.log('Result:', {
        success: result.success,
        exitCode: result.exitCode,
        stdout: result.stdout?.substring(0, 100),
        stderr: result.stderr?.substring(0, 200),
      });
      expect(result.success).toBe(true);
    });

    it('Method 2: spawnSync with explicit env', () => {
      console.log(`\n[Method 2] spawnSync('${claudePath}', ['plugin', '--help'], {env})`);
      // CRITICAL: Use cleanEnv to strip NODE_OPTIONS (debugger flags)
      const result = spawnSync(claudePath, ['plugin', '--help'], {
        encoding: 'utf8',
        timeout: 10000,
        maxBuffer: 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...getCleanEnv(), TERM: 'dumb', NO_COLOR: '1' },
      });
      console.log('Result:', {
        status: result.status,
        stdout: result.stdout?.substring(0, 100),
        stderr: result.stderr?.substring(0, 200),
        error: result.error?.message,
      });
      expect(result.status).toBe(0);
    });

    it('Method 3: spawnSync with shell: true', () => {
      console.log(`\n[Method 3] spawnSync('${claudePath}', ['plugin', '--help'], {shell: true})`);
      // CRITICAL: Use cleanEnv to strip NODE_OPTIONS (debugger flags)
      const result = spawnSync(claudePath, ['plugin', '--help'], {
        encoding: 'utf8',
        timeout: 10000,
        maxBuffer: 1024 * 1024,
        shell: true,
        env: { ...getCleanEnv(), TERM: 'dumb', NO_COLOR: '1' },
      });
      console.log('Result:', {
        status: result.status,
        stdout: result.stdout?.substring(0, 100),
        stderr: result.stderr?.substring(0, 200),
        error: result.error?.message,
      });
      expect(result.status).toBe(0);
    });

    it('Method 4: Interactive shell', () => {
      console.log(`\n[Method 4] spawnSync('zsh', ['-ic', 'claude plugin --help'])`);
      // CRITICAL: Use cleanEnv to strip NODE_OPTIONS (debugger flags)
      const result = spawnSync('zsh', ['-ic', 'claude plugin --help'], {
        encoding: 'utf8',
        timeout: 15000,
        env: getCleanEnv(),
      });
      console.log('Result:', {
        status: result.status,
        stdout: result.stdout?.substring(0, 100),
        stderr: result.stderr?.substring(0, 200),
        error: result.error?.message,
      });
      // This test is informational - interactive shell may not work in CI/VSCode
      expect(result.status === 0 || result.status === null).toBe(true);
    });
  });

  describe('Canonical Detection Functions', () => {
    it('should detect Claude CLI via detectClaudeCli()', () => {
      // Enable debug mode for verbose output
      process.env.SPECWEAVE_DEBUG = 'true';

      const status = detectClaudeCli();
      console.log('detectClaudeCli() result:', JSON.stringify(status, null, 2));

      // Clean up
      delete process.env.SPECWEAVE_DEBUG;

      expect(status.commandExists).toBe(true);
      expect(status.version).toContain('Claude Code');
      expect(status.pluginCommandsWork).toBe(true);
      expect(status.available).toBe(true);
    });

    it('should return available via isClaudeCliAvailable()', () => {
      const status = isClaudeCliAvailable();
      console.log('isClaudeCliAvailable() result:', JSON.stringify(status, null, 2));

      expect(status.available).toBe(true);
      expect(status.version).toContain('Claude Code');
    });
  });

  describe('LLM Execution (2+2=4 test)', () => {
    it('should execute simple math via Claude LLM', async () => {
      // DEBUG: Log which code version is running
      console.log('=== CLI DETECTION DEBUG ===');
      console.log('Process CWD:', process.cwd());
      console.log('Node version:', process.version);

      // Clear cache to force fresh detection
      clearCliCache();
      console.log('Cache cleared, running fresh detection...');

      // First verify CLI is available - THROW if not (don't silently skip!)
      const cliStatus = isClaudeCliAvailable();

      // DEBUG: Log full status
      console.log('CLI Status:', JSON.stringify(cliStatus, null, 2));

      if (!cliStatus.available) {
        // DEBUG: Run raw commands to compare
        console.log('=== RAW COMMAND DEBUG ===');
        try {
          const whichResult = execFileSync('which', ['claude'], { encoding: 'utf8' });
          console.log('which claude:', whichResult.trim());
        } catch (e: any) {
          console.log('which claude FAILED:', e.message);
        }

        try {
          const versionResult = spawnSync('claude', ['--version'], { encoding: 'utf8', shell: true });
          console.log('claude --version (shell:true):', versionResult.status, versionResult.stdout?.trim());
        } catch (e: any) {
          console.log('claude --version FAILED:', e.message);
        }

        try {
          const pluginResult = spawnSync('claude', ['plugin', '--help'], { encoding: 'utf8', shell: true });
          console.log('claude plugin --help (shell:true):', pluginResult.status);
        } catch (e: any) {
          console.log('claude plugin --help FAILED:', e.message);
        }

        throw new Error(
          `Claude CLI not available - this test REQUIRES a working Claude CLI!\n` +
          `Status: ${JSON.stringify(cliStatus, null, 2)}\n` +
          `Fix: Ensure 'claude plugin --help' works in your terminal`
        );
      }

      // Use claude -p to run a simple prompt
      // IMPORTANT: When shell:true, we need to quote the prompt properly
      // CRITICAL: Use cleanEnv to strip NODE_OPTIONS (debugger flags) - without this,
      // the spawned claude process inherits --inspect-brk and fails with exit code 1
      const prompt = 'What is 2+2? Reply with ONLY the number, nothing else.';
      const quotedPrompt = `"${prompt.replace(/"/g, '\\"')}"`;
      const result = spawnSync(
        'claude',
        ['-p', quotedPrompt, '--model', 'haiku'],
        {
          encoding: 'utf8',
          timeout: 30000,
          shell: true,
          env: getCleanEnv(),
        }
      );

      console.log('Claude LLM 2+2 result:', {
        status: result.status,
        stdout: result.stdout?.trim(),
        stderr: result.stderr?.substring(0, 200),
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('4');
    }, 60000);
  });
});
