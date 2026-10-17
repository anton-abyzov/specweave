/**
 * `specweave glossary check`: drift between GLOSSARY.md and the code.
 *
 * - avoided-word: a word a term lists under Avoid appears as a whole word or
 *   identifier segment in a tracked code file (`PurchaseItem`, `purchase_id`,
 *   `submit(purchase)`, a `purchases` table, a UI string). Markdown and text files
 *   and comment lines are skipped, so prose stays quiet.
 * - missing-pointer: a backticked path under Data or Code is not in the project, a
 *   route (`POST /orders`) or identifier (`Order.id`: each part) is found nowhere in
 *   the tracked files.
 * - avoid-is-a-term: one term avoids a word another term is named after.
 *
 * Read-only and offline; it shells out to `git grep` only.
 *
 * @module core/glossary/check
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { findGlossaryFiles, readGlossary, type GlossaryTerm } from './parse.js';
import { canonicalPath, isWithin } from '../workspace/context.js';

export type GlossaryFindingKind = 'avoided-word' | 'missing-pointer' | 'avoid-is-a-term';

export interface GlossaryFinding {
  kind: GlossaryFindingKind;
  term: string;
  /** Where the term is defined, `GLOSSARY.md:12`. */
  at: string;
  word?: string;
  /** For avoided-word: `src/cart.ts:14`. */
  file?: string;
  line?: number;
  identifier?: string;
  pointer?: string;
  level?: string;
}

export interface GlossaryCheckResult {
  files: string[];
  terms: number;
  findings: GlossaryFinding[];
  /** avoided-word hits not listed because of the per-word cap. */
  truncated: number;
}

const MAX_HITS_PER_WORD = 20;
const EXCLUDED = [
  ':(exclude)*.md',
  ':(exclude)*.mdx',
  ':(exclude)*.txt',
  ':(exclude).specweave/**',
  ':(exclude)**/package-lock.json',
  ':(exclude)**/*.lock',
  ':(exclude)**/dist/**',
];

/** `PurchaseItem` → [purchase, item]; `line_items` → [line, items]. */
export function segments(token: string): string[] {
  return token
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((s) => s.toLowerCase());
}

function samePlural(a: string, b: string): boolean {
  return a === b || a === b + 's' || a === b + 'es' || (b.endsWith('y') && a === b.slice(0, -1) + 'ies');
}

/** Does `token` contain the avoided word (its segments, in order)? */
export function tokenUsesWord(token: string, word: string[]): boolean {
  const seg = segments(token);
  for (let i = 0; i + word.length <= seg.length; i++) {
    let ok = true;
    for (let j = 0; j < word.length && ok; j++) {
      const last = j === word.length - 1;
      ok = last ? samePlural(seg[i + j], word[j]) : seg[i + j] === word[j];
    }
    if (ok) return true;
  }
  return false;
}

const COMMENT_LINE = /^\s*(\/\/|\/\*|\*|#(?![\[!])|--|<!--)/;

function git(root: string, args: string[]): { status: number; stdout: string } {
  const res = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { status: res.status ?? 1, stdout: res.stdout ?? '' };
}

function grepArgs(root: string): string[] {
  const inRepo = git(root, ['rev-parse', '--is-inside-work-tree']).stdout.trim() === 'true';
  return inRepo ? ['grep'] : ['grep', '--no-index', '--exclude-standard'];
}

function wordPattern(word: string[]): string {
  return word.map((w) => w.replace(/[^a-z0-9]/g, '')).join('[ _-]?');
}

function findAvoidedWords(root: string, terms: GlossaryTerm[], exclude: string[], result: GlossaryCheckResult): void {
  const names = new Set(terms.map((t) => t.term.toLowerCase()));
  const words = new Map<string, { word: string; parts: string[]; term: GlossaryTerm }>();
  for (const t of terms) {
    for (const w of t.avoid) {
      if (names.has(w.toLowerCase())) {
        result.findings.push({ kind: 'avoid-is-a-term', term: t.term, at: `${t.file}:${t.line}`, word: w });
        continue;
      }
      const parts = segments(w);
      if (parts.length && !words.has(parts.join(' '))) words.set(parts.join(' '), { word: w, parts, term: t });
    }
  }
  if (!words.size) return;

  const args = [...grepArgs(root), '-n', '-I', '-i', '-E'];
  for (const { parts } of words.values()) args.push('-e', wordPattern(parts));
  args.push('--', '.', ...EXCLUDED, ...exclude.map((f) => `:(exclude)${f}`));
  const res = git(root, args);
  if (res.status > 1) return;

  const hits = new Map<string, number>();
  for (const raw of res.stdout.split('\n')) {
    const m = raw.match(/^(.+?):(\d+):(.*)$/);
    if (!m || m[3].length > 1000) continue;
    const [, file, lineNo, text] = m;
    if (COMMENT_LINE.test(text)) continue;
    const seen = new Set<string>();
    for (const token of text.match(/[A-Za-z_$][A-Za-z0-9_$-]*/g) ?? []) {
      for (const [key, w] of words) {
        if (seen.has(key + token) || !tokenUsesWord(token, w.parts)) continue;
        seen.add(key + token);
        const n = (hits.get(key) ?? 0) + 1;
        hits.set(key, n);
        if (n > MAX_HITS_PER_WORD) { result.truncated++; continue; }
        result.findings.push({
          kind: 'avoided-word', term: w.term.term, at: `${w.term.file}:${w.term.line}`,
          word: w.word, file, line: Number(lineNo), identifier: token,
        });
      }
    }
  }
}

/** Backticked spans of a Data or Code line. */
function pointers(value: string): string[] {
  return [...value.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim()).filter(Boolean);
}

const ROUTE = /^(?:(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+)?(\/[^\s]*)$/;

const FILE_EXTENSION = /\.(ts|tsx|js|jsx|mjs|cjs|py|rb|go|rs|java|kt|kts|cs|fs|swift|php|scala|ex|exs|sql|prisma|graphql|gql|proto|json|ya?ml|toml|xml|html?|css|scss|vue|svelte|md|sh)$/i;

function looksLikePath(p: string): boolean {
  return !/\s/.test(p) && !p.startsWith('/') && (p.includes('/') || FILE_EXTENSION.test(p));
}

/** A path pointer resolves only to a file or folder that really lives inside the project. */
function pathInProject(root: string, rel: string): boolean {
  const target = path.resolve(root, rel);
  if (!fs.existsSync(target)) return false;
  return isWithin(canonicalPath(root), canonicalPath(target));
}

/** Literal part of a route to search for: `/orders/:id` → `/orders`. */
function routeLiteral(route: string): string {
  return route.split(/[:{<*]/)[0].replace(/\/+$/, '') || route;
}

function findMissingPointers(root: string, terms: GlossaryTerm[], exclude: string[], result: GlossaryCheckResult): void {
  const grep = grepArgs(root);
  const known = new Map<string, boolean>();
  for (const t of terms) {
    for (const level of ['Data', 'Code'] as const) {
      const value = t.levels[level];
      if (!value) continue;
      for (const p of pointers(value)) {
        let found: boolean | undefined;
        const route = p.match(ROUTE);
        const grepFor = (needle: string, word: boolean) => {
          const key = `${word ? 'w' : 'f'}:${needle}`;
          if (!known.has(key)) {
            const args = [...grep, '-q', '-I', '-F', ...(word ? ['-w'] : []), '-e', needle, '--', '.', ...exclude.map((f) => `:(exclude)${f}`)];
            known.set(key, git(root, args).status === 0);
          }
          return known.get(key);
        };
        if (route) {
          found = grepFor(routeLiteral(route[1]), false);
        } else if (looksLikePath(p)) {
          found = pathInProject(root, p.replace(/:\d+(-\d+)?$/, ''));
        } else if (/^[A-Za-z_$][\w$.-]*$/.test(p)) {
          found = p.split('.').filter(Boolean).every((part) => grepFor(part, true));
        }
        if (found === false) {
          result.findings.push({ kind: 'missing-pointer', term: t.term, at: `${t.file}:${t.line}`, level, pointer: p });
        }
      }
    }
  }
}

export function checkGlossary(root: string): GlossaryCheckResult {
  const files = findGlossaryFiles(root);
  const terms = readGlossary(root);
  const result: GlossaryCheckResult = { files, terms: terms.length, findings: [], truncated: 0 };
  if (!terms.length) return result;
  const exclude = [...files, 'GLOSSARY-MAP.md'];
  findAvoidedWords(root, terms, exclude, result);
  findMissingPointers(root, terms, exclude, result);
  return result;
}

export function describeFinding(f: GlossaryFinding): string {
  switch (f.kind) {
    case 'avoided-word':
      return `${f.file}:${f.line}  ${f.identifier} uses "${f.word}", which ${f.term} avoids (${f.at})`;
    case 'missing-pointer':
      return `${f.term} ${f.level}: \`${f.pointer}\` not found (${f.at})`;
    case 'avoid-is-a-term':
      return `${f.term} avoids "${f.word}", which is also a term (${f.at})`;
  }
}
