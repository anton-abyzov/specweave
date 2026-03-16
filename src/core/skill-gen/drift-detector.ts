/**
 * Drift Detector — compares project-local skills against current living docs.
 *
 * Runs during living docs sync. Returns structured DriftResult[] when skills
 * reference modules or APIs that no longer appear in the analysis output.
 *
 * Error-isolated: never throws, never blocks sync.
 *
 * @module core/skill-gen/drift-detector
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import type { DriftResult } from './types.js';
import { collectMarkdownFiles } from './utils.js';

/**
 * Extracts capitalized multi-word identifiers that look like module/class names.
 * Matches PascalCase identifiers (e.g., AuthModule, OldModule, CoreService).
 */
const MODULE_NAME_PATTERN = /\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b/g;

/**
 * Common PascalCase words that are not project-specific module references.
 * These are excluded from drift detection to reduce false positives.
 */
const PASCAL_CASE_EXCLUSIONS = new Set([
  'TypeScript', 'JavaScript', 'SpecWeave', 'ReactComponent', 'NextJs',
  'NodeModule', 'ErrorBoundary', 'PascalCase', 'CamelCase', 'GraphQL',
  'TypeORM', 'PostgreSQL', 'MongoDB', 'CloudFlare', 'GitHub', 'GitLab',
  'BitBucket', 'WebSocket', 'OAuth', 'OpenAPI', 'AsyncIterator', 'EventEmitter',
  'ReadStream', 'WriteStream', 'AbortController', 'RegExp', 'ArrayBuffer',
  'SharedWorker', 'ServiceWorker', 'IndexedDB', 'LocalStorage', 'SessionStorage',
]);

export class DriftDetector {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Check project-local skills for stale references.
   * Returns structured DriftResult[] — never throws.
   */
  async check(): Promise<DriftResult[]> {
    try {
      const skillsDir = join(this.projectRoot, '.claude', 'skills');

      // Check if skills directory exists
      try {
        const st = await stat(skillsDir);
        if (!st.isDirectory()) return [];
      } catch {
        return []; // No skills directory
      }

      const skillFiles = await this.getSkillFiles(skillsDir);
      if (skillFiles.length === 0) return [];

      const docsContent = await this.loadDocsContent();
      if (!docsContent) return [];

      const docsLower = docsContent.toLowerCase();
      const results: DriftResult[] = [];

      for (const skillFile of skillFiles) {
        const content = await readFile(join(skillsDir, skillFile), 'utf-8');
        const moduleRefs = this.extractModuleReferences(content);
        const staleRefs = moduleRefs.filter(
          (ref) => !docsLower.includes(ref.toLowerCase()),
        );
        const validRefs = moduleRefs.filter(
          (ref) => docsLower.includes(ref.toLowerCase()),
        );

        if (staleRefs.length > 0 || validRefs.length > 0) {
          results.push({ skillFile, staleRefs, validRefs });
        }
      }

      return results;
    } catch {
      return [];
    }
  }

  private async getSkillFiles(dir: string): Promise<string[]> {
    try {
      const entries = await readdir(dir);
      return entries.filter((e) => e.endsWith('.md'));
    } catch {
      return [];
    }
  }

  private async loadDocsContent(): Promise<string | null> {
    const docsDir = join(this.projectRoot, '.specweave', 'docs', 'internal');
    try {
      const files = await collectMarkdownFiles(docsDir);
      if (files.length === 0) return null;

      const contents: string[] = [];
      for (const f of files) {
        try {
          contents.push(await readFile(f, 'utf-8'));
        } catch {
          // Skip unreadable files
        }
      }
      return contents.join('\n');
    } catch {
      return null;
    }
  }

  private extractModuleReferences(content: string): string[] {
    const matches = new Set<string>();
    let match: RegExpExecArray | null;
    // Reset regex state
    MODULE_NAME_PATTERN.lastIndex = 0;
    while ((match = MODULE_NAME_PATTERN.exec(content)) !== null) {
      const name = match[1];
      // Skip common false positives and excluded PascalCase words
      if (
        !['README', 'SKILL', 'CHANGELOG', 'LICENSE', 'TODO'].includes(name.toUpperCase()) &&
        !PASCAL_CASE_EXCLUSIONS.has(name)
      ) {
        matches.add(name);
      }
    }
    return Array.from(matches);
  }
}
