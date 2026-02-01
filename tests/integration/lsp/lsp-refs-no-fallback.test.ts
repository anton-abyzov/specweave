/**
 * Integration test: LSP refs command MUST use real LSP, not grep fallback
 *
 * This test verifies that `specweave lsp refs` actually uses the TypeScript
 * language server for semantic analysis, NOT grep-based text matching.
 *
 * WHY THIS TEST EXISTS:
 * - We discovered LSP was silently falling back to grep without warning
 * - The warmup code exists but was never triggered (LSP_LLM_WARMUP parsed but unused)
 * - This test ensures we catch regression immediately
 *
 * WHAT IT TESTS:
 * 1. Runs `specweave lsp warmup` first to ensure indexing
 * 2. Runs `specweave lsp refs` on a known symbol
 * 3. Verifies output does NOT contain "(grep fallback)"
 * 4. Verifies output contains real file:line:col references
 *
 * @increment TDD test for LSP reliability
 * @task [RED] Verify LSP refs uses semantic analysis
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execSync, spawnSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Get clean environment without debugger flags
 * Required for spawning child processes in VSCode debug mode
 */
function getCleanEnv(): NodeJS.ProcessEnv {
  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_OPTIONS;
  delete cleanEnv.NODE_INSPECT;
  delete cleanEnv.NODE_INSPECT_RESUME_ON_START;
  delete cleanEnv.NODE_V8_COVERAGE;
  delete cleanEnv.VSCODE_INSPECTOR_OPTIONS;
  return cleanEnv;
}

/**
 * Get the specweave command for spawning.
 * In CI/production: uses 'npx specweave' (installed package)
 * In development: uses 'node bin/specweave.js' (local source)
 *
 * This ensures tests work both locally and in CI/CD environments.
 */
function getSpecweaveCommand(): { cmd: string; args: string[] } {
  const isCI = process.env.CI === 'true';
  const isDev = fs.existsSync(path.join(projectRoot, 'tsconfig.json'));

  // In CI or when testing installed package, use npx
  if (isCI || process.env.TEST_INSTALLED_PACKAGE === 'true') {
    return { cmd: 'npx', args: ['specweave'] };
  }

  // In development, use local bin for faster iteration
  if (isDev && fs.existsSync(path.join(projectRoot, 'bin/specweave.js'))) {
    return { cmd: 'node', args: ['bin/specweave.js'] };
  }

  // Fallback to npx
  return { cmd: 'npx', args: ['specweave'] };
}

const projectRoot = process.cwd();
const { cmd: swCmd, args: swArgs } = getSpecweaveCommand();

describe('LSP refs command - no grep fallback', () => {
  const testFile = 'src/core/increment/metadata-manager.ts';
  const testSymbol = 'MetadataManager';

  // Verify test prerequisites
  beforeAll(() => {
    // Ensure the test file exists
    const fullPath = path.join(projectRoot, testFile);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Test file not found: ${testFile}`);
    }

    // Ensure typescript-language-server is installed
    try {
      execSync('which typescript-language-server', {
        encoding: 'utf-8',
        env: getCleanEnv(),
      });
    } catch {
      throw new Error(
        'typescript-language-server not installed. Run: npm install -g typescript-language-server typescript'
      );
    }
  });

  it('should warm up LSP automatically when running refs query', () => {
    // Warmup now happens automatically inside refs command
    // This test verifies the warmup message appears
    const result = spawnSync(
      swCmd,
      [...swArgs, 'lsp', 'refs', testFile, testSymbol],
      {
        cwd: projectRoot,
        encoding: 'utf-8',
        env: getCleanEnv(),
        timeout: 30000, // 30s timeout (warmup is ~2s, refs is fast)
      }
    );

    const output = result.stdout + result.stderr;

    // Should show warmup message (first-time indexing)
    // OR already have results (if previously warmed up)
    const hasWarmupMessage = output.includes('Indexing workspace');
    const hasResults = output.includes('References to');

    expect(hasWarmupMessage || hasResults).toBe(true);
  });

  it('should use real LSP for refs, NOT grep fallback', () => {
    // Run the refs command (includes automatic warmup on first call)
    const result = spawnSync(
      swCmd,
      [...swArgs, 'lsp', 'refs', testFile, testSymbol],
      {
        cwd: projectRoot,
        encoding: 'utf-8',
        env: getCleanEnv(),
        timeout: 30000, // 30s timeout
      }
    );

    const output = result.stdout + result.stderr;

    // CRITICAL: Output must NOT contain "(grep fallback)"
    expect(output).not.toContain('(grep fallback)');
    expect(output).not.toContain('grep fallback');

    // Should contain the symbol name in output
    expect(output).toContain(testSymbol);

    // Should contain file references with line numbers (LSP format: file:line:col)
    // Example: "src/core/increment/metadata-manager.ts:44:14"
    expect(output).toMatch(/\.ts:\d+:\d+/);

    // Should show "Total: X references" (not "Total: X matches (grep)")
    expect(output).toMatch(/Total:\s*\d+\s*references/);
    expect(output).not.toMatch(/matches\s*\(grep\)/);
  });

  it('should find references across multiple files using LSP', () => {
    const result = spawnSync(
      swCmd,
      [...swArgs, 'lsp', 'refs', testFile, testSymbol],
      {
        cwd: projectRoot,
        encoding: 'utf-8',
        env: getCleanEnv(),
        timeout: 30000, // 30s timeout
      }
    );

    const output = result.stdout;

    // MetadataManager is used in many files - LSP should find them all
    // Count unique file paths in output (format: "  src/path/file.ts:line:col")
    const fileRefs = output.match(/^\s+(src|tests)\/[^\s:]+\.ts/gm) || [];
    const uniqueFiles = new Set(fileRefs.map((f) => f.trim().split(':')[0]));

    // Should find references in multiple files (at least 5 for MetadataManager)
    expect(uniqueFiles.size).toBeGreaterThanOrEqual(5);

    // Should include expected files that use MetadataManager
    const outputLower = output.toLowerCase();
    expect(outputLower).toContain('metadata-manager.ts'); // Definition
  });

  it('should return semantic references, not just text matches', () => {
    // Test with a symbol that has same-name but different semantic meaning
    // "read" appears as both MetadataManager.read() method and various other uses
    const result = spawnSync(
      swCmd,
      [...swArgs, 'lsp', 'refs', testFile, 'read'],
      {
        cwd: projectRoot,
        encoding: 'utf-8',
        env: getCleanEnv(),
        timeout: 30000, // 30s timeout
      }
    );

    const output = result.stdout + result.stderr;

    // If using real LSP, should NOT fallback
    expect(output).not.toContain('(grep fallback)');

    // LSP will find fewer, more precise references than grep would
    // (grep would match "read", "readFileSync", "readSync", etc.)
  });
});

describe('LSP refs - error handling', () => {
  it('should show clear error when symbol not found', () => {
    const result = spawnSync(
      swCmd,
      [
        ...swArgs,
        'lsp',
        'refs',
        'src/core/increment/metadata-manager.ts',
        'NonExistentSymbolXYZ123',
      ],
      {
        cwd: projectRoot,
        encoding: 'utf-8',
        env: getCleanEnv(),
        timeout: 15000, // 15s for error case
      }
    );

    const output = result.stdout + result.stderr;

    // Should indicate symbol not found
    expect(output).toContain('not found');
  });

  it('should show clear error when file not found', () => {
    const result = spawnSync(
      swCmd,
      [
        ...swArgs,
        'lsp',
        'refs',
        'nonexistent-file.ts',
        'SomeSymbol',
      ],
      {
        cwd: projectRoot,
        encoding: 'utf-8',
        env: getCleanEnv(),
        timeout: 15000, // 15s for error case
      }
    );

    const output = result.stdout + result.stderr;

    // Should indicate file not found or symbol not found
    expect(output.toLowerCase()).toMatch(/not found|no such file/);
  });
});
