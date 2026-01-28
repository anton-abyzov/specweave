/**
 * Integration tests for SessionStart hook LSP check feature
 *
 * Tests that session-start dispatcher properly spawns lsp-check.sh
 * to detect missing language server binaries.
 *
 * @increment 0176-lsp-plugin-dependency-auto-install
 * @task T-001 [RED]
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SessionStart hook LSP check spawn', () => {
  let testDir: string;
  let specweaveDir: string;
  let stateDir: string;
  let logsDir: string;
  let hookScript: string;

  beforeEach(() => {
    // Create temp directory for tests
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-lsp-test-'));
    specweaveDir = path.join(testDir, '.specweave');
    stateDir = path.join(specweaveDir, 'state');
    logsDir = path.join(specweaveDir, 'logs');

    fs.mkdirSync(specweaveDir, { recursive: true });
    fs.mkdirSync(stateDir, { recursive: true });
    fs.mkdirSync(logsDir, { recursive: true });

    // Path to the session-start dispatcher we're testing
    hookScript = path.join(
      process.cwd(),
      'plugins/specweave/hooks/v2/dispatchers/session-start.sh'
    );
  });

  afterEach(() => {
    // Cleanup
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('lsp-check.sh spawn', () => {
    it('should contain lsp-check.sh spawn code in session-start dispatcher', () => {
      // Read the dispatcher script
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // The dispatcher should contain code to spawn lsp-check.sh
      expect(scriptContent).toContain('lsp-check.sh');
      // Pattern: nohup bash "$LSP_CHECK_SCRIPT" (variable contains lsp-check.sh path)
      expect(scriptContent).toMatch(/nohup\s+bash.*LSP_CHECK_SCRIPT/);
    });

    it('should spawn lsp-check.sh with PROJECT_ROOT argument', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // The spawn should pass PROJECT_ROOT as argument
      // Pattern: nohup bash "$LSP_CHECK_SCRIPT" "$PROJECT_ROOT"
      // Note: May span multiple lines with line continuation
      expect(scriptContent).toMatch(/LSP_CHECK_SCRIPT.*PROJECT_ROOT/s);
    });

    it('should redirect lsp-check output to log file', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Should redirect to lsp-check.log
      expect(scriptContent).toMatch(/lsp-check\.log/);
    });

    it('should run lsp-check.sh in background (non-blocking)', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Should use & for background execution with lsp-check
      // Pattern: nohup bash "...lsp-check.sh" ... &
      expect(scriptContent).toMatch(/lsp-check\.sh.*&/s);
    });
  });

  describe('LSP_CHECK_SCRIPT path resolution', () => {
    it('should resolve lsp-check.sh path from plugin root', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Should construct path like:
      // LSP_CHECK_SCRIPT="${SPECWEAVE_PKG}/plugins/specweave/scripts/lsp-check.sh"
      // or similar path resolution
      expect(scriptContent).toMatch(/LSP_CHECK_SCRIPT.*lsp-check\.sh/i);
    });

    it('should check if lsp-check.sh is executable before running', () => {
      const scriptContent = fs.readFileSync(hookScript, 'utf-8');

      // Should have a check like: [[ -x "$LSP_CHECK_SCRIPT" ]]
      expect(scriptContent).toMatch(/\[\[.*-[xf].*LSP_CHECK.*\]\]/);
    });
  });
});
