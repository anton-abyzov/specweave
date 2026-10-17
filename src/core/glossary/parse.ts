/**
 * GLOSSARY.md parser. Two entry shapes are read:
 *
 *   ### Order                              (sw-glossary)
 *   A customer's request to buy ...
 *   - Avoid: purchase, basket
 *   - Data: `orders` table
 *   - Code: `Order` in `src/orders/order.ts`
 *   - UI: "Order"
 *
 *   **Order**:                             (mattpocock/skills domain-modeling)
 *   A customer's request to buy ...
 *   _Avoid_: purchase, basket
 *
 * A root `GLOSSARY-MAP.md` links one GLOSSARY.md per context; each is read.
 *
 * @module core/glossary/parse
 */

import * as fs from 'fs';
import * as path from 'path';

export type GlossaryLevel = 'Data' | 'Code' | 'UI' | 'Rules';

export interface GlossaryTerm {
  term: string;
  /** Glossary file, relative to the project root (posix). */
  file: string;
  line: number;
  definition: string;
  avoid: string[];
  levels: Partial<Record<GlossaryLevel, string>>;
}

const LEVELS: GlossaryLevel[] = ['Data', 'Code', 'UI', 'Rules'];

function splitList(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((w) => w.replace(/[`"'*_]/g, '').trim())
    .filter(Boolean);
}

/** Parse one glossary file's text. */
export function parseGlossary(text: string, file: string): GlossaryTerm[] {
  const terms: GlossaryTerm[] = [];
  let current: GlossaryTerm | undefined;
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let inFence = false;
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      current = undefined;
      if (heading[1].length >= 3) {
        current = { term: heading[2].trim(), file, line: i + 1, definition: '', avoid: [], levels: {} };
        terms.push(current);
      }
      return;
    }
    const bold = line.match(/^\*\*([^*]+)\*\*\s*:\s*(.*)$/);
    if (bold) {
      current = { term: bold[1].trim(), file, line: i + 1, definition: bold[2].trim(), avoid: [], levels: {} };
      terms.push(current);
      return;
    }
    if (!current) return;
    const avoid = line.match(/^\s*(?:[-*]\s*)?_?Avoid_?\s*:\s*(.*)$/i);
    if (avoid) {
      current.avoid.push(...splitList(avoid[1]));
      return;
    }
    const level = line.match(/^\s*[-*]\s*(Data|Code|UI|Rules)\s*:\s*(.*)$/i);
    if (level) {
      const name = LEVELS.find((l) => l.toLowerCase() === level[1].toLowerCase())!;
      current.levels[name] = [current.levels[name], level[2].trim()].filter(Boolean).join(' ');
      return;
    }
    if (line.trim() && !/^\s*[-*]\s/.test(line)) {
      current.definition = [current.definition, line.trim()].filter(Boolean).join(' ');
    }
  });
  return terms;
}

/** True when `rel` resolves, through any symlinks, to a file inside `root`. */
export function insideProject(root: string, rel: string): boolean {
  try {
    const real = fs.realpathSync(path.join(root, rel));
    const base = fs.realpathSync(root);
    const relative = path.relative(base, real);
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative) && fs.statSync(real).isFile();
  } catch {
    return false;
  }
}

/**
 * Glossary files of a project: the root GLOSSARY.md plus those GLOSSARY-MAP.md
 * links to. Only files that really live inside the project are read; a link or
 * symlink that leads outside it is ignored.
 */
export function findGlossaryFiles(root: string): string[] {
  const files: string[] = [];
  const add = (rel: string) => {
    if (!files.includes(rel) && insideProject(root, rel)) files.push(rel);
  };
  add('GLOSSARY.md');
  if (insideProject(root, 'GLOSSARY-MAP.md')) {
    for (const m of fs.readFileSync(path.join(root, 'GLOSSARY-MAP.md'), 'utf8').matchAll(/\]\(([^)\s]+\.md)\)/g)) {
      const rel = path.posix.normalize(m[1].replace(/^\.\//, ''));
      if (!rel.startsWith('..') && !path.isAbsolute(rel)) add(rel);
    }
  }
  return files;
}

export function readGlossary(root: string): GlossaryTerm[] {
  return findGlossaryFiles(root).flatMap((rel) => parseGlossary(fs.readFileSync(path.join(root, rel), 'utf8'), rel));
}
