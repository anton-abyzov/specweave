/**
 * Skill-signals reader — loads `.specweave/state/skill-signals.json` and
 * lazy-migrates v1 → v2 on first read.
 *
 * Contract: never throws on missing/empty/corrupted files. Caller receives
 * a well-formed v2 `SignalFile`.
 *
 * @module core/skill-signals/reader
 */

import { readFile, copyFile } from 'fs/promises';
import {
  EMPTY_SIGNAL_FILE,
  SignalFileSchema,
  isV1,
  migrateV1toV2,
  type RefinementSignal,
  type SignalFile,
  type SignalSeverity,
  type SkillSignal,
} from '../../types/skill-signals.js';

/**
 * Read + normalize the signal file at `filePath`. Missing files return an
 * empty v2 file. v1 files are migrated in memory; the file on disk is NOT
 * touched — the next writer call will persist the v2 shape.
 */
export async function readSignals(filePath: string): Promise<SignalFile> {
  let raw: unknown;
  try {
    const content = await readFile(filePath, 'utf-8');
    raw = JSON.parse(content);
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return { ...EMPTY_SIGNAL_FILE, signals: [] };
    }
    await backup(filePath);
    return { ...EMPTY_SIGNAL_FILE, signals: [] };
  }

  if (isV1(raw)) {
    return migrateV1toV2(raw);
  }

  const parsed = SignalFileSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }

  await backup(filePath);
  return { ...EMPTY_SIGNAL_FILE, signals: [] };
}

/**
 * List refinement signals targeting a given skill, ranked by severity ×
 * recency. The `lastNIncrements` option limits results to signals whose
 * `incrementId` is among the N highest-sorted increment IDs present in the
 * file (lexicographic sort is sufficient — increment IDs are 4-digit
 * zero-padded strings, optionally suffixed with an uppercase letter).
 *
 * Ranking (descending): severity rank first (high=3, medium=2, low=1),
 * then `detectedAt` ISO timestamp descending.
 */
export async function listRefinementsForSkill(
  filePath: string,
  skillSlug: string,
  opts: { lastNIncrements?: number } = {},
): Promise<RefinementSignal[]> {
  const file = await readSignals(filePath);
  const allRefinements = file.signals.filter(
    (s): s is RefinementSignal =>
      s.type === 'refinement' && s.targetSkill === skillSlug,
  );

  const inWindow = filterByIncrementWindow(
    file.signals,
    allRefinements,
    opts.lastNIncrements,
  );

  return inWindow.sort(compareBySeverityThenRecency);
}

// ── Internals ────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<SignalSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function compareBySeverityThenRecency(
  a: RefinementSignal,
  b: RefinementSignal,
): number {
  const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
  if (sev !== 0) return sev;
  // detectedAt desc
  if (a.detectedAt === b.detectedAt) return 0;
  return a.detectedAt < b.detectedAt ? 1 : -1;
}

function filterByIncrementWindow(
  allSignals: SkillSignal[],
  refinements: RefinementSignal[],
  lastN: number | undefined,
): RefinementSignal[] {
  if (lastN === undefined || lastN <= 0) return refinements;

  const incrementIds = collectIncrementIds(allSignals);
  if (incrementIds.length === 0) return refinements;

  const sorted = [...incrementIds].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  const window = new Set(sorted.slice(0, lastN));

  return refinements.filter((r) => window.has(r.incrementId));
}

function collectIncrementIds(signals: SkillSignal[]): string[] {
  const set = new Set<string>();
  for (const s of signals) {
    if (s.type === 'refinement') {
      set.add(s.incrementId);
    } else {
      for (const id of s.incrementIds) set.add(id);
    }
  }
  return Array.from(set);
}

async function backup(filePath: string): Promise<void> {
  try {
    await copyFile(filePath, filePath + '.bak');
  } catch {
    // backup is best-effort
  }
}
