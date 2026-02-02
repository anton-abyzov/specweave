/**
 * Tests for LSP Setup command - Multi-repo language scanning
 *
 * TDD RED PHASE: These tests define the expected behavior for:
 * 1. Scanning multiple repositories for language files
 * 2. Counting files by language across all repos
 * 3. Ranking languages by file count
 * 4. Mapping languages to LSP plugins
 *
 * @module tests/unit/cli/commands/lsp-setup
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Will be implemented in src/cli/commands/lsp.ts
import {
  scanLanguagesAcrossRepos,
  type LanguageScanResult,
  type LanguageInfo,
  LANGUAGE_TO_LSP_PLUGIN,
} from '../../../../src/cli/commands/lsp.js';

describe('LSP Setup - Multi-repo Language Scanning', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsp-setup-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('scanLanguagesAcrossRepos', () => {
    it('should scan single project for TypeScript files', async () => {
      // Create some TypeScript files
      fs.writeFileSync(path.join(tempDir, 'index.ts'), 'export const x = 1;');
      fs.writeFileSync(path.join(tempDir, 'utils.ts'), 'export const y = 2;');
      fs.mkdirSync(path.join(tempDir, 'src'));
      fs.writeFileSync(path.join(tempDir, 'src/app.ts'), 'export const z = 3;');

      const result = await scanLanguagesAcrossRepos(tempDir);

      expect(result.success).toBe(true);
      expect(result.languages.length).toBeGreaterThan(0);

      const typescript = result.languages.find((l) => l.name === 'TypeScript');
      expect(typescript).toBeDefined();
      expect(typescript!.fileCount).toBe(3);
      expect(typescript!.plugin).toBe('vtsls');
    });

    it('should scan nested repositories folder', async () => {
      // Create umbrella structure with nested repos
      const reposDir = path.join(tempDir, 'repositories');
      fs.mkdirSync(reposDir);

      // Frontend repo (TypeScript)
      const frontendDir = path.join(reposDir, 'frontend');
      fs.mkdirSync(frontendDir);
      fs.mkdirSync(path.join(frontendDir, '.git')); // Mark as git repo
      fs.writeFileSync(path.join(frontendDir, 'app.tsx'), 'export const App = () => {};');
      fs.writeFileSync(path.join(frontendDir, 'index.ts'), 'export {};');

      // Backend repo (C#)
      const backendDir = path.join(reposDir, 'backend');
      fs.mkdirSync(backendDir);
      fs.mkdirSync(path.join(backendDir, '.git'));
      fs.mkdirSync(path.join(backendDir, 'src'));
      fs.writeFileSync(path.join(backendDir, 'Program.cs'), 'class Program {}');
      fs.writeFileSync(path.join(backendDir, 'src/Api.cs'), 'class Api {}');

      const result = await scanLanguagesAcrossRepos(tempDir);

      expect(result.success).toBe(true);
      expect(result.reposScanned).toContain('frontend');
      expect(result.reposScanned).toContain('backend');

      const typescript = result.languages.find((l) => l.name === 'TypeScript');
      const csharp = result.languages.find((l) => l.name === 'C#');

      expect(typescript).toBeDefined();
      expect(typescript!.fileCount).toBe(2);

      expect(csharp).toBeDefined();
      expect(csharp!.fileCount).toBe(2);
      expect(csharp!.plugin).toBe('csharp-lsp');
    });

    it('should scan packages folder for monorepos', async () => {
      // Create monorepo structure
      const packagesDir = path.join(tempDir, 'packages');
      fs.mkdirSync(packagesDir);

      // Shared package
      const sharedDir = path.join(packagesDir, 'shared');
      fs.mkdirSync(sharedDir);
      fs.writeFileSync(path.join(sharedDir, 'utils.ts'), 'export {};');

      // UI package
      const uiDir = path.join(packagesDir, 'ui');
      fs.mkdirSync(uiDir);
      fs.writeFileSync(path.join(uiDir, 'Button.tsx'), 'export {};');

      const result = await scanLanguagesAcrossRepos(tempDir);

      expect(result.success).toBe(true);
      const typescript = result.languages.find((l) => l.name === 'TypeScript');
      expect(typescript).toBeDefined();
      expect(typescript!.fileCount).toBe(2);
    });

    it('should exclude node_modules and build directories', async () => {
      // Create files in node_modules (should be excluded)
      fs.mkdirSync(path.join(tempDir, 'node_modules/@types'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'node_modules/@types/index.d.ts'), 'declare {};');

      // Create files in dist (should be excluded)
      fs.mkdirSync(path.join(tempDir, 'dist'));
      fs.writeFileSync(path.join(tempDir, 'dist/bundle.js'), 'var x = 1;');

      // Create actual source file
      fs.writeFileSync(path.join(tempDir, 'src.ts'), 'export const x = 1;');

      const result = await scanLanguagesAcrossRepos(tempDir);

      const typescript = result.languages.find((l) => l.name === 'TypeScript');
      expect(typescript).toBeDefined();
      expect(typescript!.fileCount).toBe(1); // Only src.ts
    });

    it('should detect multiple languages in mixed project', async () => {
      // TypeScript
      fs.writeFileSync(path.join(tempDir, 'app.ts'), 'export {};');
      fs.writeFileSync(path.join(tempDir, 'types.tsx'), 'export {};');

      // Python
      fs.writeFileSync(path.join(tempDir, 'main.py'), 'print("hello")');
      fs.writeFileSync(path.join(tempDir, 'utils.py'), 'def foo(): pass');
      fs.writeFileSync(path.join(tempDir, 'tests.py'), 'def test(): pass');

      // Rust
      fs.mkdirSync(path.join(tempDir, 'src'));
      fs.writeFileSync(path.join(tempDir, 'src/main.rs'), 'fn main() {}');

      // Go
      fs.writeFileSync(path.join(tempDir, 'main.go'), 'package main');

      const result = await scanLanguagesAcrossRepos(tempDir);

      expect(result.languages.length).toBeGreaterThanOrEqual(4);

      const typescript = result.languages.find((l) => l.name === 'TypeScript');
      const python = result.languages.find((l) => l.name === 'Python');
      const rust = result.languages.find((l) => l.name === 'Rust');
      const golang = result.languages.find((l) => l.name === 'Go');

      expect(typescript?.fileCount).toBe(2);
      expect(python?.fileCount).toBe(3);
      expect(rust?.fileCount).toBe(1);
      expect(golang?.fileCount).toBe(1);
    });

    it('should sort languages by file count (descending)', async () => {
      // Python has most files
      fs.writeFileSync(path.join(tempDir, 'a.py'), '');
      fs.writeFileSync(path.join(tempDir, 'b.py'), '');
      fs.writeFileSync(path.join(tempDir, 'c.py'), '');
      fs.writeFileSync(path.join(tempDir, 'd.py'), '');
      fs.writeFileSync(path.join(tempDir, 'e.py'), '');

      // TypeScript has fewer
      fs.writeFileSync(path.join(tempDir, 'a.ts'), '');
      fs.writeFileSync(path.join(tempDir, 'b.ts'), '');

      // Rust has least
      fs.writeFileSync(path.join(tempDir, 'main.rs'), '');

      const result = await scanLanguagesAcrossRepos(tempDir);

      // Should be sorted by file count
      expect(result.languages[0].name).toBe('Python');
      expect(result.languages[0].fileCount).toBe(5);
      expect(result.languages[1].name).toBe('TypeScript');
      expect(result.languages[1].fileCount).toBe(2);
    });

    it('should limit results to top N languages when specified', async () => {
      // Create files for multiple languages
      fs.writeFileSync(path.join(tempDir, 'a.py'), '');
      fs.writeFileSync(path.join(tempDir, 'b.py'), '');
      fs.writeFileSync(path.join(tempDir, 'a.ts'), '');
      fs.writeFileSync(path.join(tempDir, 'main.rs'), '');
      fs.writeFileSync(path.join(tempDir, 'main.go'), '');
      fs.writeFileSync(path.join(tempDir, 'main.cs'), '');

      const result = await scanLanguagesAcrossRepos(tempDir, { maxLanguages: 3 });

      expect(result.languages.length).toBe(3);
    });

    it('should return empty array for project with no recognized files', async () => {
      // Create only markdown and config files
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# Hello');
      fs.writeFileSync(path.join(tempDir, 'config.json'), '{}');

      const result = await scanLanguagesAcrossRepos(tempDir);

      expect(result.success).toBe(true);
      expect(result.languages.length).toBe(0);
    });

    it('should include install commands for each language', async () => {
      fs.writeFileSync(path.join(tempDir, 'app.ts'), 'export {};');
      fs.writeFileSync(path.join(tempDir, 'app.py'), 'print()');
      fs.writeFileSync(path.join(tempDir, 'app.cs'), 'class {}');

      const result = await scanLanguagesAcrossRepos(tempDir);

      for (const lang of result.languages) {
        expect(lang.binaryInstallCommand).toBeDefined();
        expect(lang.binaryInstallCommand.length).toBeGreaterThan(0);
        expect(lang.pluginInstallCommand).toBeDefined();
        expect(lang.pluginInstallCommand).toContain('claude plugin install');
      }
    });

    it('should track which repos contain each language', async () => {
      const reposDir = path.join(tempDir, 'repositories');
      fs.mkdirSync(reposDir);

      // Frontend repo - TypeScript only
      const frontend = path.join(reposDir, 'frontend');
      fs.mkdirSync(frontend);
      fs.writeFileSync(path.join(frontend, 'app.ts'), '');

      // Backend repo - TypeScript and Python
      const backend = path.join(reposDir, 'backend');
      fs.mkdirSync(backend);
      fs.writeFileSync(path.join(backend, 'api.ts'), '');
      fs.writeFileSync(path.join(backend, 'scripts.py'), '');

      const result = await scanLanguagesAcrossRepos(tempDir);

      const typescript = result.languages.find((l) => l.name === 'TypeScript');
      const python = result.languages.find((l) => l.name === 'Python');

      expect(typescript?.foundInRepos).toContain('frontend');
      expect(typescript?.foundInRepos).toContain('backend');
      expect(python?.foundInRepos).toContain('backend');
      expect(python?.foundInRepos).not.toContain('frontend');
    });
  });

  describe('LANGUAGE_TO_LSP_PLUGIN mapping', () => {
    it('should have mappings for all common languages', () => {
      expect(LANGUAGE_TO_LSP_PLUGIN['TypeScript']).toBe('vtsls');
      expect(LANGUAGE_TO_LSP_PLUGIN['Python']).toBe('pyright');
      expect(LANGUAGE_TO_LSP_PLUGIN['C#']).toBe('csharp-lsp');
      expect(LANGUAGE_TO_LSP_PLUGIN['Go']).toBe('gopls');
      expect(LANGUAGE_TO_LSP_PLUGIN['Rust']).toBe('rust-analyzer');
      expect(LANGUAGE_TO_LSP_PLUGIN['Java']).toBe('jdtls');
    });
  });
});
