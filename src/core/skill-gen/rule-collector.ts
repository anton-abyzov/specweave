/**
 * Rule Collector — gathers existing project rules for dedup context in skill-gen.
 *
 * Reads CLAUDE.md, .cursorrules, .github/copilot-instructions.md, .claude/skills,
 * and .cursor/rules to provide existing-rules context so the LLM avoids suggesting
 * patterns that duplicate already-documented conventions.
 *
 * @module core/skill-gen/rule-collector
 */

import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { estimateTokenCount } from './utils.js';

export const MAX_RULES_TOKENS = 10_000;
export const MAX_PER_FILE_TOKENS = 2_000;

const RULE_FILE_PATHS = [
  'CLAUDE.md',
  '.cursorrules',
  '.github/copilot-instructions.md',
];

const RULE_DIRS: ReadonlyArray<{ dir: string; extensions: string[] }> = [
  { dir: '.claude/skills', extensions: ['.md'] },
  { dir: '.cursor/rules', extensions: ['.mdc'] },
  { dir: '.cursor/skills', extensions: ['.mdc'] },
];

export class RuleCollector {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Collect existing rule content from known locations.
   * Returns formatted string for injection into the LLM prompt, or empty string if none found.
   */
  async collectExistingRules(): Promise<string> {
    const rules: Array<{ path: string; content: string }> = [];
    let totalTokens = 0;

    // 1. Read known file paths
    for (const relPath of RULE_FILE_PATHS) {
      if (totalTokens >= MAX_RULES_TOKENS) break;
      const content = await this.readFileSafe(join(this.projectRoot, relPath));
      if (content) {
        const truncated = this.truncateToTokens(content, MAX_PER_FILE_TOKENS);
        const tokens = estimateTokenCount(truncated);
        if (totalTokens + tokens <= MAX_RULES_TOKENS) {
          rules.push({ path: relPath, content: truncated });
          totalTokens += tokens;
        }
      }
    }

    // 2. Read rule directories (.claude/skills, .cursor/rules)
    for (const { dir, extensions } of RULE_DIRS) {
      if (totalTokens >= MAX_RULES_TOKENS) break;
      const files = await this.collectFiles(join(this.projectRoot, dir), extensions);
      for (const file of files) {
        if (totalTokens >= MAX_RULES_TOKENS) break;
        const content = await this.readFileSafe(file);
        if (content) {
          const truncated = this.truncateToTokens(content, MAX_PER_FILE_TOKENS);
          const tokens = estimateTokenCount(truncated);
          if (totalTokens + tokens <= MAX_RULES_TOKENS) {
            const relPath = file.slice(this.projectRoot.length + 1);
            rules.push({ path: relPath, content: truncated });
            totalTokens += tokens;
          }
        }
      }
    }

    if (rules.length === 0) return '';

    return rules.map(r => `--- rule: ${r.path} ---\n${r.content}`).join('\n');
  }

  /**
   * Recursively collect files matching given extensions from a directory.
   * Returns empty array if directory doesn't exist.
   */
  private async collectFiles(dir: string, extensions: string[]): Promise<string[]> {
    const results: string[] = [];
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...(await this.collectFiles(fullPath, extensions)));
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          results.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist or is unreadable
    }
    return results;
  }

  private async readFileSafe(path: string): Promise<string | null> {
    try {
      const content = await readFile(path, 'utf-8');
      return content.trim() || null;
    } catch {
      return null;
    }
  }

  private truncateToTokens(text: string, maxTokens: number): string {
    const maxChars = maxTokens * 4; // rough: 1 token ~ 4 chars
    return text.length > maxChars
      ? text.slice(0, maxChars) + '\n[...truncated]'
      : text;
  }
}
