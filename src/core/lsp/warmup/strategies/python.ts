/**
 * PythonStrategy - Warm-up strategy for Python projects
 *
 * @see spec.md US-001: Language-Aware Warm-up
 * @satisfies AC-US1-01, AC-US1-02
 */

import type { WarmupStrategy } from '../strategy.js';

export interface FileSystemProvider {
  glob(pattern: string, cwd: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
  findUp(pattern: string, startDir: string): Promise<string | null>;
}

const MAX_FILES = 10;

export class PythonStrategy implements WarmupStrategy {
  readonly language = 'python';
  private readonly fs: FileSystemProvider;
  private projectRoot?: string;

  constructor(fs: FileSystemProvider) {
    this.fs = fs;
  }

  async detectProjectRoot(startDir: string): Promise<string | null> {
    // Try pyproject.toml first (modern Python)
    const pyprojectPath = await this.fs.findUp('pyproject.toml', startDir);
    if (pyprojectPath) {
      this.projectRoot = pyprojectPath.substring(0, pyprojectPath.lastIndexOf('/'));
      return this.projectRoot;
    }

    // Try requirements.txt (common)
    const requirementsPath = await this.fs.findUp('requirements.txt', startDir);
    if (requirementsPath) {
      this.projectRoot = requirementsPath.substring(0, requirementsPath.lastIndexOf('/'));
      return this.projectRoot;
    }

    // Try setup.py (legacy)
    const setupPath = await this.fs.findUp('setup.py', startDir);
    if (setupPath) {
      this.projectRoot = setupPath.substring(0, setupPath.lastIndexOf('/'));
      return this.projectRoot;
    }

    return null;
  }

  async getFilesToOpen(projectRoot: string): Promise<string[]> {
    const files = await this.fs.glob('*.py', projectRoot);
    return files.slice(0, MAX_FILES);
  }
}
