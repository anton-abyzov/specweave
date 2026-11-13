/**
 * Review records: the first line of every `specweave review` report names who
 * reviewed what, so closure can check the reviewer's family and the reviewed
 * code without trusting prose:
 *
 *   <!-- specweave review: reviewer=codex model=gpt-6.1-sol family=openai author=claude depth=deep repo=repositories/acme/api base=… head=… at=… -->
 *
 * A report without that line (a hand-written `reports/review.md`) is a record
 * of family `unknown`.
 *
 * @module core/review/record
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadTaskBoard } from '../tasks/task-board.js';
import { registeredRepositoryEntries, resolveFileOwner } from '../tasks/strict-close.js';
import { parseVerdict, type Verdict } from './reviewer.js';

export interface ReviewRecordFields {
  reviewer: string;
  model?: string;
  family: string;
  author?: string;
  depth?: string;
  /** Repository the review read, relative to the project root; `.` is the root. */
  repo?: string;
  base?: string;
  head?: string;
  at?: string;
}

export interface ReviewRecord extends ReviewRecordFields {
  /** Path relative to the increment's reports folder. */
  file: string;
  verdict?: Verdict;
  /** File modification time, ms. */
  mtime: number;
}

const HEADER = /^<!--\s*specweave review:([^>]*)-->\s*$/m;
const FIELD_ORDER: Array<keyof ReviewRecordFields> = ['reviewer', 'model', 'family', 'author', 'depth', 'repo', 'base', 'head', 'at'];

/** Values never hold spaces or `-->`; anything else is replaced. */
function clean(value: string): string {
  return value.replace(/-->/g, '').replace(/\s+/g, '_');
}

export function formatRecordHeader(fields: ReviewRecordFields): string {
  const parts = FIELD_ORDER
    .filter((k) => fields[k] !== undefined && fields[k] !== '')
    .map((k) => `${k}=${clean(String(fields[k]))}`);
  return `<!-- specweave review: ${parts.join(' ')} -->`;
}

export function parseRecordHeader(text: string): ReviewRecordFields | undefined {
  const m = text.match(HEADER);
  if (!m) return undefined;
  const fields: Record<string, string> = {};
  for (const pair of m[1].trim().split(/\s+/)) {
    const eq = pair.indexOf('=');
    if (eq > 0) fields[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  if (!fields.reviewer && !fields.model) return undefined;
  return {
    reviewer: fields.reviewer ?? fields.model,
    family: fields.family ?? 'unknown',
    ...(fields.model ? { model: fields.model } : {}),
    ...(fields.author && fields.author !== 'unknown' ? { author: fields.author } : {}),
    ...(fields.depth ? { depth: fields.depth } : {}),
    ...(fields.repo ? { repo: fields.repo } : {}),
    ...(fields.base ? { base: fields.base } : {}),
    ...(fields.head && fields.head !== 'HEAD' ? { head: fields.head } : {}),
    ...(fields.at ? { at: fields.at } : {}),
  };
}

/** The report text without a header line it already carried. */
export function stripRecordHeader(text: string): string {
  return text.replace(HEADER, '').replace(/^\s*\n/, '');
}

/** Every review report of an increment, newest first: `reports/review*.md` and `reports/reviews/*.md`. */
export function readReviewRecords(incrementDir: string): ReviewRecord[] {
  const reports = path.join(incrementDir, 'reports');
  const files: string[] = [];
  const list = (dir: string, prefix: string, pattern: RegExp) => {
    try {
      for (const f of fs.readdirSync(dir)) if (pattern.test(f)) files.push(prefix + f);
    } catch {
      // folder missing
    }
  };
  list(reports, '', /^review(-[A-Za-z0-9._-]+)?\.md$/);
  list(path.join(reports, 'reviews'), 'reviews/', /^review-[A-Za-z0-9._-]+\.md$/);
  const records: ReviewRecord[] = [];
  for (const file of files) {
    const abs = path.join(reports, file);
    let text: string;
    let mtime: number;
    try {
      text = fs.readFileSync(abs, 'utf8');
      mtime = fs.statSync(abs).mtimeMs;
    } catch {
      continue;
    }
    const header = parseRecordHeader(text);
    const verdict = parseVerdict(stripRecordHeader(text));
    records.push({
      ...(header ?? { reviewer: file.replace(/^reviews\//, '').replace(/\.md$/, ''), family: 'unknown' }),
      file,
      ...(verdict ? { verdict } : {}),
      mtime,
    });
  }
  // Newest first; at equal times a numbered run beats the latest-copy it was copied to.
  return records.sort((a, b) => b.mtime - a.mtime || Number(b.file.startsWith('reviews/')) - Number(a.file.startsWith('reviews/')));
}

/** Task Files that are bookkeeping, not code: `none`, the increment folders. */
function isReviewable(file: string): boolean {
  const f = file.replace(/\\/g, '/').trim();
  if (!f || /^(none|n\/a|-)$/i.test(f)) return false;
  return !/(^|\/)\.specweave(\/|$)/.test(f);
}

/**
 * The increment's task Files grouped by owning repository (`.` for the project
 * root), each path relative to that repository. Files the owner rules cannot
 * place are left out; strict closure already reports them.
 */
export function incrementRepoPaths(projectRoot: string, incrementDir: string): Map<string, string[]> {
  const groups = new Map<string, Set<string>>();
  let files: string[] = [];
  try {
    files = loadTaskBoard(incrementDir).tasks.flatMap((t) => t.filesAffected ?? []);
  } catch {
    return new Map();
  }
  const repos = registeredRepositoryEntries(projectRoot);
  for (const raw of files) {
    if (!isReviewable(raw)) continue;
    const file = raw.replace(/\\/g, '/').replace(/\/$/, '');
    const owner = resolveFileOwner(projectRoot, file, repos);
    if (owner && 'error' in owner) continue;
    const repo = owner ? owner.owner : '.';
    const rel = repo === '.' ? file : path.posix.relative(repo, file);
    if (!rel || rel.startsWith('..')) continue;
    if (!groups.has(repo)) groups.set(repo, new Set());
    groups.get(repo)!.add(rel);
  }
  return new Map([...groups].map(([repo, paths]) => [repo, [...paths].sort()]));
}

/** `repositories/acme/api` and `./repositories/acme/api/` name one repository; `.` and `` are the root. */
export function sameRepo(a: string | undefined, b: string): boolean {
  const norm = (v: string | undefined) => (v ?? '.').replace(/\\/g, '/').replace(/^\.\/+/, '').replace(/\/+$/, '') || '.';
  return norm(a) === norm(b);
}

/** Model id named in a reviewer command: `-m gpt-6.1-sol`, `--model opus`. */
export function modelOfCommand(command: string): string | undefined {
  const m = command.match(/(?:^|\s)(?:-m|--model)(?:\s+|=)(["']?)([^\s"']+)\1/);
  return m?.[2];
}
