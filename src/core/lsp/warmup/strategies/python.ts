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

/**
 * Get directory from file path (cross-platform)
 */
function getDirectory(filePath: string): string {
  const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return lastSlash > 0 ? filePath.substring(0, lastSlash) : filePath;
}

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
      this.projectRoot = getDirectory(pyprojectPath);
      return this.projectRoot;
    }

    // Try requirements.txt (common)
    const requirementsPath = await this.fs.findUp('requirements.txt', startDir);
    if (requirementsPath) {
      this.projectRoot = getDirectory(requirementsPath);
      return this.projectRoot;
    }

    // Try setup.py (legacy)
    const setupPath = await this.fs.findUp('setup.py', startDir);
    if (setupPath) {
      this.projectRoot = getDirectory(setupPath);
      return this.projectRoot;
    }

    return null;
  }

  async getFilesToOpen(projectRoot: string): Promise<string[]> {
    const files = await this.fs.glob('*.py', projectRoot);
    return files.slice(0, MAX_FILES);
  }
}
