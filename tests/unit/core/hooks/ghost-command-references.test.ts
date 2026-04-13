import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('ghost command cleanup', () => {
  const srcDir = path.resolve(__dirname, '../../../../src');

  function findReferences(pattern: string, dir: string): string[] {
    const results: string[] = [];
    const walk = (d: string) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules') {
          walk(full);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          const content = fs.readFileSync(full, 'utf-8');
          if (content.includes(pattern)) {
            results.push(path.relative(srcDir, full));
          }
        }
      }
    };
    walk(dir);
    return results;
  }

  it('has zero references to the deleted check-hooks command', () => {
    const refs = findReferences('check-hooks', srcDir);
    expect(refs).toEqual([]);
  });
});
