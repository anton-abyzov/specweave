/**
 * RustStrategy - Warm-up strategy for Rust projects
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

export class RustStrategy implements WarmupStrategy {
  readonly language = 'rust';
  private readonly fs: FileSystemProvider;
  private projectRoot?: string;

  constructor(fs: FileSystemProvider) {
    this.fs = fs;
  }

  async detectProjectRoot(startDir: string): Promise<string | null> {
    const cargoPath = await this.fs.findUp('Cargo.toml', startDir);
    if (cargoPath) {
      this.projectRoot = getDirectory(cargoPath);
      return this.projectRoot;
    }
    return null;
  }

  async getFilesToOpen(projectRoot: string): Promise<string[]> {
    const files = await this.fs.glob('*.rs', projectRoot);
    return files.slice(0, MAX_FILES);
  }
}
