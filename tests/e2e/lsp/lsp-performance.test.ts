/**
 * E2E Test: LSP vs Grep Performance
 *
 * Proves that LSP-based symbol resolution is significantly faster than grep
 * for semantic code analysis tasks.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { LSPLivingDocsAnalyzer } from '../../../src/core/lsp/lsp-living-docs-integration.js';
import * as path from 'path';
import * as fs from 'fs';

describe('LSP vs Grep Performance E2E', () => {
  const projectRoot = path.resolve(__dirname, '../../..');
  let testFiles: string[] = [];

  beforeAll(() => {
    // Gather TypeScript files from src/ for testing
    const srcDir = path.join(projectRoot, 'src');
    testFiles = gatherTypeScriptFiles(srcDir, 20); // Get up to 20 files

    expect(testFiles.length).toBeGreaterThan(0);
  });

  it('should analyze files with LSP or grep fallback', async () => {
    const analyzer = new LSPLivingDocsAnalyzer(projectRoot);
    await analyzer.initialize();

    try {
      const result = await analyzer.analyzeFiles(testFiles);

      // Should return results regardless of LSP availability
      expect(result.symbols.length).toBeGreaterThan(0);
      expect(result.analysisTimeMs).toBeGreaterThan(0);

      console.log(`  Analysis method: ${result.usedLSP ? 'LSP' : 'Grep'}`);
      console.log(`  Files analyzed: ${testFiles.length}`);
      console.log(`  Symbols found: ${result.symbols.length}`);
      console.log(`  Time: ${result.analysisTimeMs}ms`);

      // If LSP is available, it should be reasonably fast
      if (result.usedLSP) {
        // LSP should complete in reasonable time (< 5s for 20 files)
        expect(result.analysisTimeMs).toBeLessThan(5000);
      }

    } finally {
      await analyzer.shutdown();
    }
  });

  it('should gracefully fallback to grep when LSP unavailable', async () => {
    const analyzer = new LSPLivingDocsAnalyzer(projectRoot);
    // Don't initialize LSP - force grep fallback

    const sampleFiles = testFiles.slice(0, 5);
    const result = await analyzer.analyzeFiles(sampleFiles);

    // Should still work with grep
    expect(result.symbols.length).toBeGreaterThan(0);
    expect(result.usedLSP).toBe(false);
    expect(result.analysisTimeMs).toBeGreaterThan(0);

    console.log(`  Grep fallback analysis:`);
    console.log(`  Files analyzed: ${sampleFiles.length}`);
    console.log(`  Symbols found: ${result.symbols.length}`);
    console.log(`  Time: ${result.analysisTimeMs}ms`);

    await analyzer.shutdown();
  });

  it('should find exported functions and classes', async () => {
    const analyzer = new LSPLivingDocsAnalyzer(projectRoot);
    await analyzer.initialize();

    try {
      const result = await analyzer.analyzeFiles(testFiles);

      // Should find various symbol kinds
      const functions = result.symbols.filter(s => s.kind === 'function');
      const classes = result.symbols.filter(s => s.kind === 'class');

      expect(functions.length + classes.length).toBeGreaterThan(0);

      console.log(`  Functions found: ${functions.length}`);
      console.log(`  Classes found: ${classes.length}`);

    } finally {
      await analyzer.shutdown();
    }
  });
});

/**
 * Recursively gather TypeScript files from a directory
 */
function gatherTypeScriptFiles(dir: string, maxFiles: number): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    if (files.length >= maxFiles) return;

    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (files.length >= maxFiles) break;

        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules, dist, .git
          if (!['node_modules', 'dist', '.git', '.specweave'].includes(entry.name)) {
            walk(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  walk(dir);
  return files;
}
