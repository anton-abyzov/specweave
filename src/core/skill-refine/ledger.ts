/**
 * Append-only ledger for applied/rejected skill refinements.
 *
 * File lives at `.specweave/state/skill-refinements.json`. Missing/corrupt
 * files degrade to an empty ledger — readers never throw.
 *
 * @module core/skill-refine/ledger
 */

import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile, copyFile } from 'fs/promises';
import { dirname } from 'path';
import {
  EMPTY_LEDGER,
  RefinementLedgerSchema,
  type RefinementLedger,
  type RefinementLedgerEntry,
  type RefinementStatus,
} from '../../types/skill-refinements';

export interface AppendAppliedInput {
  targetSkill: string;
  author: string;
  signalIds: string[];
  diffSha: string;
  rationale: string;
  /** Override appliedAt (mainly for tests). */
  appliedAt?: string;
  /** Override id (mainly for tests). */
  id?: string;
}

export interface AppendRejectedInput {
  targetSkill: string;
  author: string;
  signalIds: string[];
  rationale: string;
  rejectionReason: string;
  appliedAt?: string;
  id?: string;
}

export async function readLedger(filePath: string): Promise<RefinementLedger> {
  let raw: unknown;
  try {
    const content = await readFile(filePath, 'utf-8');
    raw = JSON.parse(content);
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return { refinements: [] };
    }
    await backup(filePath);
    return { refinements: [] };
  }

  const parsed = RefinementLedgerSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  await backup(filePath);
  return { refinements: [] };
}

export async function appendApplied(
  filePath: string,
  input: AppendAppliedInput,
): Promise<RefinementLedgerEntry> {
  const entry: RefinementLedgerEntry = {
    id: input.id ?? generateRefinementId(),
    targetSkill: input.targetSkill,
    author: input.author,
    signalIds: [...input.signalIds],
    diffSha: input.diffSha,
    rationale: input.rationale,
    appliedAt: input.appliedAt ?? new Date().toISOString(),
    status: 'applied',
  };
  await persistAppend(filePath, entry);
  return entry;
}

export async function appendRejected(
  filePath: string,
  input: AppendRejectedInput,
): Promise<RefinementLedgerEntry> {
  const entry: RefinementLedgerEntry = {
    id: input.id ?? generateRefinementId(),
    targetSkill: input.targetSkill,
    author: input.author,
    signalIds: [...input.signalIds],
    diffSha: '',
    rationale: input.rationale,
    appliedAt: input.appliedAt ?? new Date().toISOString(),
    status: 'rejected',
    rejectionReason: input.rejectionReason,
  };
  await persistAppend(filePath, entry);
  return entry;
}

// ── Internals ────────────────────────────────────────────────────────

async function persistAppend(
  filePath: string,
  entry: RefinementLedgerEntry,
): Promise<void> {
  const current = await readLedger(filePath);
  current.refinements.push(entry);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(current, null, 2), 'utf-8');
}

async function backup(filePath: string): Promise<void> {
  try {
    await copyFile(filePath, filePath + '.bak');
  } catch {
    // best-effort
  }
}

function generateRefinementId(): string {
  return `ref_${randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`;
}

// Re-export for convenience.
export { EMPTY_LEDGER, type RefinementLedger, type RefinementLedgerEntry, type RefinementStatus };
