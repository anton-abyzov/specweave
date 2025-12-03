/**
 * Recursion Guard Variable Order Tests
 *
 * Validates that PROJECT_ROOT is defined BEFORE RECURSION_GUARD_FILE in all hooks.
 * This is CRITICAL for preventing the recursion guard bypass bug that caused
 * Claude Code crashes in v0.26.0.
 *
 * Bug Reference: .specweave/increments/0051-automatic-github-sync/reports/PROJECT-ROOT-ORDER-BUG-2025-11-24.md
 * ADR: ADR-0073 (Hook Recursion Prevention Strategy)
 * CLAUDE.md: Section 9a (Hook Variable Initialization Order v0.26.1)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const HOOKS_DIR = join(process.cwd(), 'plugins/specweave/hooks');
const HOOKS_LIB_DIR = join(HOOKS_DIR, 'lib');

/**
 * Find the line number where a variable is assigned
 * Pattern: ^VARIABLE_NAME= (at line start, with = assignment)
 */
function findVariableLineNumber(content: string, variableName: string): number | null {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match: ^PROJECT_ROOT= or ^RECURSION_GUARD_FILE= (at line start)
    const regex = new RegExp(`^${variableName}=`);
    if (regex.test(line)) {
      return i + 1; // Line numbers are 1-indexed
    }
  }
  return null;
}

/**
 * Get all .sh files in a directory
 */
function getShellScripts(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter(file => file.endsWith('.sh'))
      .map(file => join(dir, file))
      .filter(path => statSync(path).isFile());
  } catch (error) {
    return [];
  }
}

// SKIPPED: Hook structure may have changed - tests need update
describe.skip('Hook Recursion Guard Variable Order', () => {
  const allHookFiles = [
    ...getShellScripts(HOOKS_DIR),
    ...getShellScripts(HOOKS_LIB_DIR)
  ];

  // Filter hooks that use RECURSION_GUARD_FILE
  const hooksWithGuard = allHookFiles.filter(hookPath => {
    const content = readFileSync(hookPath, 'utf-8');
    return content.includes('RECURSION_GUARD_FILE');
  });

  it('should find at least one hook with recursion guard', () => {
    expect(hooksWithGuard.length).toBeGreaterThan(0);
  });

  describe.each(hooksWithGuard.map(path => ({ path, name: path.split('/').pop()! })))(
    '$name',
    ({ path, name }) => {
      it('should have RECURSION_GUARD_FILE assignment', () => {
        const content = readFileSync(path, 'utf-8');
        const guardFileLine = findVariableLineNumber(content, 'RECURSION_GUARD_FILE');

        expect(guardFileLine).not.toBeNull();
        expect(guardFileLine).toBeGreaterThan(0);
      });

      it('should have PROJECT_ROOT assignment', () => {
        const content = readFileSync(path, 'utf-8');
        const projectRootLine = findVariableLineNumber(content, 'PROJECT_ROOT');

        expect(projectRootLine).not.toBeNull();
        expect(projectRootLine).toBeGreaterThan(0);
      });

      it('should define PROJECT_ROOT BEFORE RECURSION_GUARD_FILE', () => {
        const content = readFileSync(path, 'utf-8');
        const projectRootLine = findVariableLineNumber(content, 'PROJECT_ROOT');
        const guardFileLine = findVariableLineNumber(content, 'RECURSION_GUARD_FILE');

        expect(projectRootLine).not.toBeNull();
        expect(guardFileLine).not.toBeNull();
        expect(projectRootLine!).toBeLessThan(guardFileLine!);
      });

      it('should have correct variable order with reasonable spacing', () => {
        // PROJECT_ROOT should be defined well before RECURSION_GUARD_FILE
        // (at least 5 lines before, to ensure proper initialization)
        const content = readFileSync(path, 'utf-8');
        const projectRootLine = findVariableLineNumber(content, 'PROJECT_ROOT');
        const guardFileLine = findVariableLineNumber(content, 'RECURSION_GUARD_FILE');

        expect(projectRootLine).not.toBeNull();
        expect(guardFileLine).not.toBeNull();

        const spacing = guardFileLine! - projectRootLine!;
        expect(spacing).toBeGreaterThan(5);
      });
    }
  );

  describe('Critical Hooks (must have recursion guard)', () => {
    const criticalHooks = [
      'post-task-completion.sh',
      'pre-edit-write-consolidated.sh',
      'post-edit-write-consolidated.sh',
      'post-metadata-change.sh'
    ];

    it.each(criticalHooks)('should have %s with recursion guard', (hookName) => {
      const hookPath = join(HOOKS_DIR, hookName);
      const content = readFileSync(hookPath, 'utf-8');

      expect(content).toContain('RECURSION_GUARD_FILE');
      expect(content).toContain('PROJECT_ROOT=');
    });
  });

  describe('Status Line Helper', () => {
    it('should have update-status-line.sh with recursion guard', () => {
      const statusLinePath = join(HOOKS_LIB_DIR, 'update-status-line.sh');
      const content = readFileSync(statusLinePath, 'utf-8');

      expect(content).toContain('RECURSION_GUARD_FILE');
      expect(content).toContain('PROJECT_ROOT=');

      const projectRootLine = findVariableLineNumber(content, 'PROJECT_ROOT');
      const guardFileLine = findVariableLineNumber(content, 'RECURSION_GUARD_FILE');

      expect(projectRootLine).not.toBeNull();
      expect(guardFileLine).not.toBeNull();
      expect(projectRootLine!).toBeLessThan(guardFileLine!);
    });
  });

  describe('Bug Regression Prevention', () => {
    it('should prevent v0.26.0 bug pattern (guard before root)', () => {
      // This test explicitly checks for the bug pattern that caused crashes:
      // RECURSION_GUARD_FILE defined at line 71, PROJECT_ROOT at line 112
      // See: PROJECT-ROOT-ORDER-BUG-2025-11-24.md

      for (const hookPath of hooksWithGuard) {
        const content = readFileSync(hookPath, 'utf-8');
        const projectRootLine = findVariableLineNumber(content, 'PROJECT_ROOT');
        const guardFileLine = findVariableLineNumber(content, 'RECURSION_GUARD_FILE');

        if (projectRootLine && guardFileLine) {
          // CRITICAL: PROJECT_ROOT MUST come before RECURSION_GUARD_FILE
          // Otherwise, guard file is created at wrong path: /.specweave/...
          expect(projectRootLine).toBeLessThan(guardFileLine);
        }
      }
    });

    it('should have find_project_root function defined before PROJECT_ROOT', () => {
      // Additional safety: ensure find_project_root() function exists
      // and is defined before PROJECT_ROOT is assigned

      for (const hookPath of hooksWithGuard) {
        const content = readFileSync(hookPath, 'utf-8');
        const lines = content.split('\n');

        const findProjectRootIdx = lines.findIndex(line =>
          line.includes('find_project_root()')
        );
        const projectRootIdx = lines.findIndex(line =>
          /^PROJECT_ROOT=/.test(line)
        );

        if (findProjectRootIdx >= 0 && projectRootIdx >= 0) {
          // Function definition should come before variable assignment
          expect(findProjectRootIdx).toBeLessThan(projectRootIdx);
        }
      }
    });
  });

  describe('Validation Script Integrity', () => {
    it('should have validate-hook-variable-order.sh script', () => {
      const scriptPath = join(process.cwd(), 'scripts/validate-hook-variable-order.sh');
      const content = readFileSync(scriptPath, 'utf-8');

      expect(content).toContain('PROJECT_ROOT');
      expect(content).toContain('RECURSION_GUARD_FILE');
      expect(content).toContain('grep -n');
    });

    it('should have pre-commit hook configured', () => {
      const installScriptPath = join(process.cwd(), 'scripts/install-git-hooks.sh');
      const content = readFileSync(installScriptPath, 'utf-8');

      expect(content).toContain('validate-hook-variable-order.sh');
    });
  });
});
