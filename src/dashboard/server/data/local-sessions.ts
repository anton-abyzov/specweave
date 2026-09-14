import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { ExecutionSegment } from '../../work-types.js';

export interface LocalSession {
  key: string;
  sessionId: string;
  harness: 'Codex' | 'Claude Code';
  updatedAt: string;
  coverage: 'complete' | 'partial';
  segments: ExecutionSegment[];
}
interface CachedFile {
  size: number;
  mtime: number;
  value: LocalSession | null;
  cwd?: string;
}
const WINDOW = 384 * 1024;
const caches = new Map<string, Map<string, CachedFile>>();
const directoryCaches = new Map<string, { at: number; files: string[] }>();
const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;
function real(file: string): string {
  try {
    return fs.realpathSync(file);
  } catch {
    return path.resolve(file);
  }
}
function belongs(cwd: string, root: string): boolean {
  const relative = path.relative(real(root), real(cwd));
  return (
    relative === '' ||
    (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
  );
}
function walk(dir: string, depth = 0): string[] {
  if (depth > 5) return [];
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const file = path.join(dir, entry.name);
      return entry.isDirectory()
        ? walk(file, depth + 1)
        : entry.isFile() && entry.name.endsWith('.jsonl')
          ? [file]
          : [];
    });
  } catch {
    return [];
  }
}
function candidates(dir: string): string[] {
  const cache = directoryCaches.get(dir);
  if (cache && Date.now() - cache.at < 10000) return cache.files;
  const files = walk(dir);
  directoryCaches.set(dir, { at: Date.now(), files });
  return files;
}
function window(fd: number, offset: number, count: number): string {
  const buffer = Buffer.alloc(count);
  const length = fs.readSync(fd, buffer, 0, count, offset);
  return buffer.subarray(0, length).toString('utf8');
}

/** Bounded local metadata reader. Never returns prompts, responses, tool payloads or native paths. */
export function readLocalSessions(
  root: string,
  homes: { codex?: string; claude?: string } = {},
): LocalSession[] {
  const codex =
    homes.codex ?? path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'sessions');
  const slug = root.replace(/[^a-zA-Z0-9]/g, '-');
  const claude = homes.claude ?? path.join(os.homedir(), '.claude/projects', slug);
  const cacheKey = `${real(root)}:${codex}:${claude}`;
  let cache = caches.get(cacheKey);
  if (!cache) {
    cache = new Map();
    caches.set(cacheKey, cache);
  }
  const sessions = new Map<string, LocalSession>();
  for (const [dir, harness] of [
    [codex, 'Codex'],
    [claude, 'Claude Code'],
  ] as const) {
    for (const file of candidates(dir)) {
      try {
        const stat = fs.statSync(file);
        const old = cache.get(file);
        if (old?.mtime === stat.mtimeMs && old.size === stat.size) {
          if (old.value) sessions.set(old.value.key, old.value);
          continue;
        }
        // A session rooted elsewhere cannot become this project's session by appending messages.
        if (old?.cwd && !belongs(old.cwd, root)) {
          cache.set(file, { ...old, size: stat.size, mtime: stat.mtimeMs });
          continue;
        }
        const fd = fs.openSync(file, 'r');
        let head = '';
        let tail = '';
        try {
          head = window(fd, 0, Math.min(stat.size, WINDOW));
          if (stat.size > WINDOW) {
            const offset = Math.max(WINDOW, stat.size - WINDOW);
            tail = window(fd, offset, stat.size - offset);
            // Windows may start in the middle of a JSON record: never parse a fragment.
            if (offset > 0) tail = tail.slice(tail.indexOf('\n') + 1);
          }
        } finally {
          fs.closeSync(fd);
        }
        const partial = stat.size > WINDOW;
        const lines = (head + '\n' + tail).split(/\r?\n/);
        let cwd: string | null = old?.cwd ?? null;
        let sessionId: string | null = null;
        let provider: string | null = null;
        let surface: string | null = null;
        let fallbackTime = stat.mtime.toISOString();
        const segments: ExecutionSegment[] = [];
        for (const line of lines) {
          let row: Record<string, any>;
          try {
            row = JSON.parse(line);
          } catch {
            continue;
          }
          const payload = row.payload || {};
          if (harness === 'Codex' && row.type === 'session_meta') {
            // Forks may contain parent headers; the first header owns this physical log.
            if (!sessionId) {
              cwd = text(payload.cwd);
              sessionId = text(payload.session_id) || text(payload.id);
              provider = text(payload.model_provider);
              surface = text(payload.originator) || text(payload.source);
              fallbackTime = text(payload.timestamp) || text(row.timestamp) || fallbackTime;
            }
          }
          if (harness === 'Claude Code') {
            cwd ||= text(row.cwd);
            sessionId ||= text(row.sessionId);
            surface ||= text(row.entrypoint);
          }
          const model =
            harness === 'Codex' && row.type === 'turn_context'
              ? text(payload.model)
              : harness === 'Claude Code' && row.type === 'assistant'
                ? text(row.message?.model)
                : null;
          if (!model || model.startsWith('<')) continue;
          const effort = harness === 'Codex' ? text(payload.effort) : text(row.effort);
          const previous = segments[segments.length - 1];
          if (previous?.model === model && previous.effort === effort) continue;
          const startedAt = text(row.timestamp) || fallbackTime;
          segments.push({
            id: createHash('sha256')
              .update(`${file}:${startedAt}:${model}:${effort}`)
              .digest('hex')
              .slice(0, 20),
            sessionId,
            harness,
            model,
            effort,
            provider,
            surface,
            actor: harness,
            startedAt,
            source: 'session',
            note: partial
              ? 'Observed in bounded log windows; intermediate model changes may be missing.'
              : 'Observed in local session metadata.',
          });
        }
        if (!cwd || !sessionId || !belongs(cwd, root)) {
          cache.set(file, { size: stat.size, mtime: stat.mtimeMs, value: null, cwd: cwd ?? undefined });
          continue;
        }
        if (!segments.length)
          segments.push({
            id: createHash('sha256').update(file).digest('hex').slice(0, 20),
            sessionId,
            harness,
            model: null,
            effort: null,
            provider,
            surface,
            actor: harness,
            startedAt: fallbackTime,
            source: 'session',
            note: 'No model metadata available in the observed log windows.',
          });
        const session: LocalSession = {
          key: `${harness}:${sessionId}`,
          sessionId,
          harness,
          updatedAt: stat.mtime.toISOString(),
          coverage: partial ? 'partial' : 'complete',
          segments,
        };
        cache.set(file, { size: stat.size, mtime: stat.mtimeMs, value: session, cwd });
        sessions.set(session.key, session);
      } catch {
        /* disappearing, inaccessible or unsupported logs provide no metadata */
      }
    }
  }
  return [...sessions.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
