/**
 * Unit tests for suffix convention enforcement (T-018)
 *
 * Verifies that ALL suffix formatting across plugin libs uses
 * formatSuffixedId() or formatId() from src/sync/types.ts
 * rather than inline concatenation.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Recursively collect all .ts files in a directory.
 */
function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(full));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

const PLUGIN_ROOT = join(__dirname, '..', '..', '..', 'plugins');

describe('suffix convention enforcement', () => {
  const pluginDirs = [
    join(PLUGIN_ROOT, 'specweave-github', 'lib'),
    join(PLUGIN_ROOT, 'specweave-jira', 'lib'),
    join(PLUGIN_ROOT, 'specweave-ado', 'lib'),
  ];

  it('zero inline suffix concatenation patterns in plugin libs', () => {
    // Patterns that indicate inline suffix concatenation:
    // - `${id}G`, `${id}J`, `${id}A` — direct platform suffix appending
    // - `+ 'G'`, `+ 'J'`, `+ 'A'` — string concatenation with suffix
    const inlineSuffixPatterns = [
      /\$\{[^}]+\}[GJA](?!')/g,          // Template literal + suffix letter
      /\+\s*['"][GJA]['"]\s*(?!;)/g,      // String concat with suffix
      /`\$\{.*?\}[GJA]`/g,                // Template string ending in suffix
    ];

    const violations: string[] = [];

    for (const dir of pluginDirs) {
      const files = collectTsFiles(dir);

      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          for (const pattern of inlineSuffixPatterns) {
            pattern.lastIndex = 0;
            if (pattern.test(line)) {
              // Exclude import statements and comments
              if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.includes('import')) {
                continue;
              }
              violations.push(`${file}:${i + 1}: ${line.trim()}`);
            }
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('formatSuffixedId is importable from sync/types', async () => {
    const { formatSuffixedId, formatId } = await import('../../../src/sync/types.js');

    expect(formatSuffixedId('FS-001', 'github')).toBe('FS-001G');
    expect(formatSuffixedId('FS-001', 'jira')).toBe('FS-001J');
    expect(formatSuffixedId('FS-001', 'ado')).toBe('FS-001A');
    expect(formatSuffixedId('FS-001', undefined)).toBe('FS-001');

    expect(formatId('FS', 42, 'G')).toBe('FS-042G');
    expect(formatId('FS', 42)).toBe('FS-042');
  });
});
