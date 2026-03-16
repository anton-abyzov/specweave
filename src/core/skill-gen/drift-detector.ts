/**
 * Drift Detector — compares project-local skills against current living docs.
 *
 * Runs during living docs sync. Warns when skills reference modules or APIs
 * that no longer appear in the analysis output.
 *
 * Error-isolated: never throws, never blocks sync.
 *
 * @module core/skill-gen/drift-detector
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';

/**
 * Extracts capitalized multi-word identifiers that look like module/class names.
 * Matches PascalCase identifiers (e.g., AuthModule, OldModule, CoreService).
 */
const MODULE_NAME_PATTERN = /\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b/g;

export class DriftDetector {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Check project-local skills for stale references.
   * Never throws.
   */
  async check(): Promise<void> {
    try {
      const skillsDir = join(this.projectRoot, '.claude', 'skills');

      // Check if skills directory exists
      try {
        const st = await stat(skillsDir);
        if (!st.isDirectory()) return;
      } catch {
        return; // No skills directory
      }

      const skillFiles = await this.getSkillFiles(skillsDir);
      if (skillFiles.length === 0) return;

      const docsContent = await this.loadDocsContent();
      if (!docsContent) return;

      const docsLower = docsContent.toLowerCase();

      for (const skillFile of skillFiles) {
        const content = await readFile(join(skillsDir, skillFile), 'utf-8');
        const moduleRefs = this.extractModuleReferences(content);
        const staleRefs = moduleRefs.filter(
          (ref) => !docsLower.includes(ref.toLowerCase()),
        );

        if (staleRefs.length > 0) {
          console.warn(
            `[DriftDetector] Possible stale references in ${skillFile}: ${staleRefs.join(', ')}. These modules no longer appear in living docs.`,
          );
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[DriftDetector] Warning: ${msg}`);
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
      const files = await this.collectMarkdownFiles(docsDir);
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

  private async collectMarkdownFiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...(await this.collectMarkdownFiles(fullPath)));
        } else if (entry.name.endsWith('.md')) {
          results.push(fullPath);
        }
      }
    } catch {
      // Skip
    }
    return results;
  }

  private extractModuleReferences(content: string): string[] {
    const matches = new Set<string>();
    let match: RegExpExecArray | null;
    // Reset regex state
    MODULE_NAME_PATTERN.lastIndex = 0;
    while ((match = MODULE_NAME_PATTERN.exec(content)) !== null) {
      // Skip common false positives
      const name = match[1];
      if (!['README', 'SKILL', 'CHANGELOG', 'LICENSE', 'TODO'].includes(name.toUpperCase())) {
        matches.add(name);
      }
    }
    return Array.from(matches);
  }
}
