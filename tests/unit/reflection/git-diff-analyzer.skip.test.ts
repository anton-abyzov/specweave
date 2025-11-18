import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for Git Diff Analyzer
 */

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import {
  isGitRepository,
  getModifiedFilesList,
  parseNumstat,
  getFileDiff,
  getFileContent,
  getModifiedFiles,
  getModifiedFilesSummary,
  filterFilesByExtension,
  excludeFilesByPattern
} from '../../../src/hooks/lib/git-diff-analyzer.js';
import { GitDiffInfo } from '../../../src/hooks/lib/types/reflection-types.js';

describe('Git Diff Analyzer', () => {
  const testDir = path.join(__dirname, '../../fixtures/git-test-repo');

  beforeAll(() => {
    // Create test git repository
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
    fs.mkdirpSync(testDir);

    // Initialize git repo
    execSync('git init', { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });
    execSync('git config user.email "test@example.com"', { cwd: testDir });

    // Create initial commit
    fs.writeFileSync(path.join(testDir, 'file1.ts'), 'const x = 1;\n', 'utf-8');
    fs.writeFileSync(path.join(testDir, 'file2.js'), 'const y = 2;\n', 'utf-8');
    execSync('git add .', { cwd: testDir });
    execSync('git commit -m "Initial commit"', { cwd: testDir });
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
  });

  describe('isGitRepository', () => {
    it('should return true for git repository', () => {
      expect(isGitRepository(testDir)).toBe(true);
    });

    it('should return false for non-git directory', () => {
      const nonGitDir = path.join(__dirname, '../../fixtures/non-git');
      fs.mkdirpSync(nonGitDir);
      expect(isGitRepository(nonGitDir)).toBe(false);
      fs.removeSync(nonGitDir);
    });
  });

  describe('getModifiedFilesList', () => {
    it('should return empty array when no changes', () => {
      const files = getModifiedFilesList(testDir);
      expect(files).toEqual([]);
    });

    it('should detect modified files', () => {
      // Modify file1.ts
      fs.appendFileSync(path.join(testDir, 'file1.ts'), 'const z = 3;\n');

      const files = getModifiedFilesList(testDir);
      expect(files).toContain('file1.ts');
      expect(files.length).toBeGreaterThan(0);

      // Reset
      execSync('git checkout -- file1.ts', { cwd: testDir });
    });

    it('should detect new files', () => {
      // Create new file
      fs.writeFileSync(path.join(testDir, 'newfile.ts'), 'const a = 1;\n');
      execSync('git add newfile.ts', { cwd: testDir });

      const files = getModifiedFilesList(testDir);
      expect(files).toContain('newfile.ts');

      // Clean up
      fs.removeSync(path.join(testDir, 'newfile.ts'));
      execSync('git reset HEAD newfile.ts', { cwd: testDir });
    });

    it('should return empty array for non-git directory', () => {
      const nonGitDir = path.join(__dirname, '../../fixtures/non-git');
      fs.mkdirpSync(nonGitDir);
      const files = getModifiedFilesList(nonGitDir);
      expect(files).toEqual([]);
      fs.removeSync(nonGitDir);
    });
  });

  describe('parseNumstat', () => {
    it('should parse git numstat output', () => {
      const numstatOutput = `10\t5\tfile1.ts\n3\t2\tfile2.js\n`;
      const stats = parseNumstat(numstatOutput);

      expect(stats.size).toBe(2);
      expect(stats.get('file1.ts')).toEqual({ added: 10, removed: 5 });
      expect(stats.get('file2.js')).toEqual({ added: 3, removed: 2 });
    });

    it('should handle binary files (- in numstat)', () => {
      const numstatOutput = `-\t-\timage.png\n5\t3\tfile.ts\n`;
      const stats = parseNumstat(numstatOutput);

      expect(stats.get('image.png')).toEqual({ added: 0, removed: 0 });
      expect(stats.get('file.ts')).toEqual({ added: 5, removed: 3 });
    });

    it('should handle empty input', () => {
      const stats = parseNumstat('');
      expect(stats.size).toBe(0);
    });

    it('should handle files with spaces in names', () => {
      const numstatOutput = `5\t2\tfile with spaces.ts\n`;
      const stats = parseNumstat(numstatOutput);
      expect(stats.get('file with spaces.ts')).toEqual({ added: 5, removed: 2 });
    });
  });

  describe('getFileDiff', () => {
    it('should return empty string when no changes', () => {
      const diff = getFileDiff('file1.ts', testDir);
      expect(diff).toBe('');
    });

    it('should return diff for modified file', () => {
      // Modify file1.ts
      fs.appendFileSync(path.join(testDir, 'file1.ts'), 'const z = 3;\n');

      const diff = getFileDiff('file1.ts', testDir);
      expect(diff).toContain('const z = 3;');
      expect(diff).toContain('@@'); // Diff hunk header

      // Reset
      execSync('git checkout -- file1.ts', { cwd: testDir });
    });

    it('should return empty string for non-existent file', () => {
      const diff = getFileDiff('nonexistent.ts', testDir);
      expect(diff).toBe('');
    });

    it('should return empty string for non-git directory', () => {
      const nonGitDir = path.join(__dirname, '../../fixtures/non-git');
      fs.mkdirpSync(nonGitDir);
      const diff = getFileDiff('file.ts', nonGitDir);
      expect(diff).toBe('');
      fs.removeSync(nonGitDir);
    });
  });

  describe('getFileContent', () => {
    it('should read file content', () => {
      const content = getFileContent('file1.ts', testDir);
      expect(content).toContain('const x = 1;');
    });

    it('should return empty string for non-existent file', () => {
      const content = getFileContent('nonexistent.ts', testDir);
      expect(content).toBe('');
    });

    it('should handle absolute paths', () => {
      const absolutePath = path.join(testDir, 'file1.ts');
      const content = getFileContent(absolutePath);
      expect(content).toContain('const x = 1;');
    });
  });

  describe('getModifiedFiles', () => {
    it('should return empty array when no changes', () => {
      const modifiedFiles = getModifiedFiles(testDir);
      expect(modifiedFiles).toEqual([]);
    });

    it('should return GitDiffInfo for modified files', () => {
      // Modify file1.ts
      fs.appendFileSync(path.join(testDir, 'file1.ts'), 'const z = 3;\n');

      const modifiedFiles = getModifiedFiles(testDir);
      expect(modifiedFiles.length).toBeGreaterThan(0);

      const file1 = modifiedFiles.find(f => f.file === 'file1.ts');
      expect(file1).toBeDefined();
      expect(file1!.linesAdded).toBeGreaterThan(0);
      expect(file1!.content).toContain('const z = 3;');

      // Reset
      execSync('git checkout -- file1.ts', { cwd: testDir });
    });

    it('should limit number of files', () => {
      // Create multiple files
      for (let i = 0; i < 10; i++) {
        fs.writeFileSync(path.join(testDir, `temp${i}.ts`), `const x${i} = ${i};\n`);
      }
      execSync('git add .', { cwd: testDir });

      const modifiedFiles = getModifiedFiles(testDir, 5);
      expect(modifiedFiles.length).toBeLessThanOrEqual(5);

      // Clean up
      for (let i = 0; i < 10; i++) {
        fs.removeSync(path.join(testDir, `temp${i}.ts`));
      }
      execSync('git reset HEAD .', { cwd: testDir });
    });

    it('should return empty array for non-git directory', () => {
      const nonGitDir = path.join(__dirname, '../../fixtures/non-git');
      fs.mkdirpSync(nonGitDir);
      const modifiedFiles = getModifiedFiles(nonGitDir);
      expect(modifiedFiles).toEqual([]);
      fs.removeSync(nonGitDir);
    });
  });

  describe('getModifiedFilesSummary', () => {
    it('should calculate summary statistics', () => {
      const modifiedFiles: GitDiffInfo[] = [
        { file: 'file1.ts', linesAdded: 10, linesRemoved: 5, content: '' },
        { file: 'file2.js', linesAdded: 3, linesRemoved: 2, content: '' },
        { file: 'file3.ts', linesAdded: 7, linesRemoved: 1, content: '' }
      ];

      const summary = getModifiedFilesSummary(modifiedFiles);

      expect(summary.count).toBe(3);
      expect(summary.linesAdded).toBe(20);
      expect(summary.linesRemoved).toBe(8);
      expect(summary.totalChanges).toBe(28);
    });

    it('should handle empty array', () => {
      const summary = getModifiedFilesSummary([]);
      expect(summary.count).toBe(0);
      expect(summary.linesAdded).toBe(0);
      expect(summary.linesRemoved).toBe(0);
      expect(summary.totalChanges).toBe(0);
    });
  });

  describe('filterFilesByExtension', () => {
    it('should filter files by extension', () => {
      const modifiedFiles: GitDiffInfo[] = [
        { file: 'file1.ts', linesAdded: 10, linesRemoved: 5, content: '' },
        { file: 'file2.js', linesAdded: 3, linesRemoved: 2, content: '' },
        { file: 'file3.ts', linesAdded: 7, linesRemoved: 1, content: '' },
        { file: 'file4.md', linesAdded: 2, linesRemoved: 0, content: '' }
      ];

      const tsFiles = filterFilesByExtension(modifiedFiles, ['.ts']);
      expect(tsFiles.length).toBe(2);
      expect(tsFiles.every(f => f.file.endsWith('.ts'))).toBe(true);

      const codeFiles = filterFilesByExtension(modifiedFiles, ['.ts', '.js']);
      expect(codeFiles.length).toBe(3);
    });

    it('should be case-insensitive', () => {
      const modifiedFiles: GitDiffInfo[] = [
        { file: 'File1.TS', linesAdded: 10, linesRemoved: 5, content: '' }
      ];

      const filtered = filterFilesByExtension(modifiedFiles, ['.ts']);
      expect(filtered.length).toBe(1);
    });

    it('should return empty array when no matches', () => {
      const modifiedFiles: GitDiffInfo[] = [
        { file: 'file1.ts', linesAdded: 10, linesRemoved: 5, content: '' }
      ];

      const filtered = filterFilesByExtension(modifiedFiles, ['.py']);
      expect(filtered).toEqual([]);
    });
  });

  describe('excludeFilesByPattern', () => {
    it('should exclude files matching pattern', () => {
      const modifiedFiles: GitDiffInfo[] = [
        { file: 'src/file1.ts', linesAdded: 10, linesRemoved: 5, content: '' },
        { file: 'tests/file1.test.ts', linesAdded: 3, linesRemoved: 2, content: '' },
        { file: 'dist/file1.js', linesAdded: 7, linesRemoved: 1, content: '' }
      ];

      const filtered = excludeFilesByPattern(modifiedFiles, ['tests/*', 'dist/*']);
      expect(filtered.length).toBe(1);
      expect(filtered[0].file).toBe('src/file1.ts');
    });

    it('should support wildcard patterns', () => {
      const modifiedFiles: GitDiffInfo[] = [
        { file: 'file1.test.ts', linesAdded: 10, linesRemoved: 5, content: '' },
        { file: 'file2.ts', linesAdded: 3, linesRemoved: 2, content: '' },
        { file: 'file3.spec.ts', linesAdded: 7, linesRemoved: 1, content: '' }
      ];

      const filtered = excludeFilesByPattern(modifiedFiles, ['*.test.ts', '*.spec.ts']);
      expect(filtered.length).toBe(1);
      expect(filtered[0].file).toBe('file2.ts');
    });

    it('should return all files when no patterns match', () => {
      const modifiedFiles: GitDiffInfo[] = [
        { file: 'file1.ts', linesAdded: 10, linesRemoved: 5, content: '' }
      ];

      const filtered = excludeFilesByPattern(modifiedFiles, ['tests/*']);
      expect(filtered).toEqual(modifiedFiles);
    });
  });
});
