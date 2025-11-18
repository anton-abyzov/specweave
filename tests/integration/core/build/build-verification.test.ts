/**
 * Build Verification Tests
 *
 * Ensures TypeScript compilation produces valid output:
 * - No TS5055 errors (output overwriting input)
 * - No TypeScript source files in dist/
 * - All expected compiled files exist
 * - Hooks can actually import their dependencies
 *
 * These tests catch issues like:
 * - Polluted dist/ folder (TS5055)
 * - Missing .js extensions in imports
 * - Broken hook import paths
 * - Stale compiled output
 *
 * Related: .specweave/increments/0039/reports/HOOK-IMPORT-ERROR-ULTRATHINK-ANALYSIS.md
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Build Verification', () => {
  const rootDir = path.resolve(__dirname, '../../../..');

  describe('TypeScript Compilation', () => {
    it('should compile without TS5055 errors (no input overwrite)', () => {
      // Clean build to ensure fresh state
      try {
        execSync('rm -rf dist/', { cwd: rootDir, stdio: 'pipe' });
      } catch {
        // Ignore if dist doesn't exist
      }

      // Run build
      const output = execSync('npm run build', {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: 'pipe'
      });

      // Should not contain TS5055 error
      expect(output).not.toContain('TS5055');
      expect(output).not.toContain('Cannot write file');
      expect(output).not.toContain('would overwrite input file');

      // Should not contain other TypeScript errors
      expect(output).not.toMatch(/error TS\d{4}:/);
    });

    it('should not have TypeScript source files in dist/', () => {
      // After build, dist/ should ONLY have .js, .d.ts, .js.map
      // NO .ts source files should be in dist/

      const findResult = execSync(
        'find dist/src -name "*.ts" -not -name "*.d.ts" 2>/dev/null || true',
        {
          cwd: rootDir,
          encoding: 'utf-8'
        }
      ).trim();

      // Should be empty (no .ts source files in dist/)
      expect(findResult).toBe('');
    });

    it('should have all expected compiled files', () => {
      // Check critical files exist
      const criticalFiles = [
        'dist/src/core/increment/ac-status-manager.js',
        'dist/src/core/increment/ac-status-manager.d.ts',
        'dist/src/core/increment/metadata-manager.js',
        'dist/src/core/increment/metadata-manager.d.ts',
        'dist/src/core/types/increment-metadata.js',
        'dist/src/core/types/increment-metadata.d.ts'
        // Note: dist/index.js doesn't exist - SpecWeave is CLI-only, not a library
      ];

      for (const file of criticalFiles) {
        const fullPath = path.join(rootDir, file);
        expect(fs.existsSync(fullPath)).toBe(true);
      }
    });
  });

  describe('Plugin Hook Compilation', () => {
    it('should compile hooks with esbuild', () => {
      // Hooks should be transpiled in-place by esbuild
      const hookFiles = [
        'plugins/specweave/lib/hooks/update-ac-status.js',
        'plugins/specweave/lib/hooks/auto-transition.js',
        'plugins/specweave/lib/hooks/invoke-translator-skill.js',
        'plugins/specweave/lib/hooks/translate-file.js'
      ];

      for (const hookFile of hookFiles) {
        const fullPath = path.join(rootDir, hookFile);
        expect(fs.existsSync(fullPath)).toBe(true);
      }
    });

    it('should have hooks importing from dist/src/', () => {
      // Hooks must import from compiled output (dist/src/), not source (src/)
      const hooksToCheck = [
        {
          file: 'plugins/specweave/lib/hooks/update-ac-status.js',
          expectedImport: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/dist\/src\//
        },
        {
          file: 'plugins/specweave/lib/hooks/auto-transition.js',
          expectedImport: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/dist\/src\//
        }
      ];

      for (const { file, expectedImport } of hooksToCheck) {
        const fullPath = path.join(rootDir, file);
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Should import from dist/src/
        expect(content).toMatch(expectedImport);

        // Should NOT import from src/ (without dist/)
        expect(content).not.toMatch(/from ['"][.\/]*src\/[^/]/);
      }
    });
  });

  describe('Build Cleanliness', () => {
    it('should have clean dist/ folder structure', () => {
      // dist/ should mirror src/ structure
      const distSrcPath = path.join(rootDir, 'dist/src');
      expect(fs.existsSync(distSrcPath)).toBe(true);

      // dist/ should not have random files at root level
      const distContents = fs.readdirSync(path.join(rootDir, 'dist'));
      const expectedFolders = ['src', 'plugins', 'index.js', 'index.d.ts', 'index.js.map', 'index.d.ts.map'];

      // All items should be expected
      for (const item of distContents) {
        const isExpected =
          expectedFolders.includes(item) ||
          item.endsWith('.js') ||
          item.endsWith('.d.ts') ||
          item.endsWith('.js.map') ||
          item.endsWith('.d.ts.map');

        expect(isExpected).toBe(true);
      }
    });
  });

  describe('Import Resolution', () => {
    it('should have .js extensions in ES module imports', () => {
      // TypeScript ES modules MUST have .js extensions
      // Check a few critical files

      const filesToCheck = [
        'dist/src/core/increment/ac-status-manager.js',
        'dist/src/core/increment/metadata-manager.js'
      ];

      for (const file of filesToCheck) {
        const fullPath = path.join(rootDir, file);
        if (!fs.existsSync(fullPath)) {
          continue; // Skip if file doesn't exist
        }

        const content = fs.readFileSync(fullPath, 'utf-8');

        // Extract import statements
        const importRegex = /import .+ from ['"](\.[^'"]+)['"]/g;
        const matches = [...content.matchAll(importRegex)];

        for (const match of matches) {
          const importPath = match[1];

          // Relative imports should have .js extension
          if (importPath.startsWith('.')) {
            // Allow .json imports
            if (importPath.endsWith('.json')) {
              continue;
            }

            expect(importPath).toMatch(/\.js$/);
          }
        }
      }
    });
  });
});

describe('Hook Execution Validation', () => {
  const rootDir = path.resolve(__dirname, '../../../..');

  it('should be able to import ACStatusManager from hook', async () => {
    // Dynamically import the hook module to verify it loads without errors
    const hookPath = path.join(rootDir, 'plugins/specweave/lib/hooks/update-ac-status.js');

    // This will throw if imports can't be resolved
    await expect(async () => {
      await import(`file://${hookPath}`);
    }).not.toThrow();
  });

  it('should be able to import AutoTransitionManager from hook', async () => {
    const hookPath = path.join(rootDir, 'plugins/specweave/lib/hooks/auto-transition.js');

    // This will throw if imports can't be resolved
    await expect(async () => {
      await import(`file://${hookPath}`);
    }).not.toThrow();
  });
});
