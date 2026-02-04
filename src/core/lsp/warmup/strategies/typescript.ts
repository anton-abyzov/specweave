/**
 * TypeScriptStrategy - Warm-up strategy for TypeScript projects
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

export class TypeScriptStrategy implements WarmupStrategy {
  readonly language = 'typescript';
  private readonly fs: FileSystemProvider;
  private projectRoot?: string;

  constructor(fs: FileSystemProvider) {
    this.fs = fs;
  }

  async detectProjectRoot(startDir: string): Promise<string | null> {
    const tsconfigPath = await this.fs.findUp('tsconfig.json', startDir);
    if (tsconfigPath) {
      this.projectRoot = tsconfigPath.substring(0, tsconfigPath.lastIndexOf('/'));
      return this.projectRoot;
    }

    const packagePath = await this.fs.findUp('package.json', startDir);
    if (packagePath) {
      this.projectRoot = packagePath.substring(0, packagePath.lastIndexOf('/'));
      return this.projectRoot;
    }

    return null;
  }

  async getFilesToOpen(projectRoot: string): Promise<string[]> {
    const files = await this.fs.glob('*.ts', projectRoot);
    return files.slice(0, MAX_FILES);
  }
}
