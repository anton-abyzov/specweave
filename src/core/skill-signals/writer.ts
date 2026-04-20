/**
 * Skill-signals writer — appends refinement / generation signals to
 * `.specweave/state/skill-signals.json`, always persisting in v2 format.
 *
 * First write to a legacy v1 file upgrades it to v2 on disk.
 *
 * @module core/skill-signals/writer
 */

import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { readSignals } from './reader.js';
import {
  EMPTY_SIGNAL_FILE,
  type GenerationSignal,
  type RefinementSignal,
  type SignalSource,
  type SignalSeverity,
} from '../../types/skill-signals.js';

export interface AppendRefinementInput {
  source: SignalSource;
  targetSkill: string;
  severity: SignalSeverity;
  incrementId: string;
  evidence: string;
  /** Override detectedAt (mainly for tests). Defaults to `new Date().toISOString()`. */
  detectedAt?: string;
  /** Override id (mainly for tests). Defaults to `sig_<random>`. */
  id?: string;
}

/**
 * Append a refinement signal to the file at `filePath`. The file is created
 * if missing and upgraded to v2 if it's currently v1. Returns the newly
 * appended signal for convenience (id/detectedAt generation is visible to
 * the caller).
 */
export async function appendRefinementSignal(
  filePath: string,
  input: AppendRefinementInput,
): Promise<RefinementSignal> {
  const file = await readSignals(filePath);

  const signal: RefinementSignal = {
    type: 'refinement',
    id: input.id ?? generateSignalId(),
    source: input.source,
    targetSkill: input.targetSkill,
    severity: input.severity,
    incrementId: input.incrementId,
    evidence: input.evidence,
    detectedAt: input.detectedAt ?? new Date().toISOString(),
    consumedBy: null,
  };

  file.signals.push(signal);
  await persist(filePath, file);
  return signal;
}

/**
 * Append a pre-constructed generation signal. SignalCollector continues to
 * write through its own path; this helper exists so other callers (e.g. the
 * skill-gen CLI) can migrate to the v2 API incrementally.
 */
export async function appendGenerationSignal(
  filePath: string,
  signal: Omit<GenerationSignal, 'type'>,
): Promise<GenerationSignal> {
  const file = await readSignals(filePath);
  const full: GenerationSignal = { type: 'generation', ...signal };
  file.signals.push(full);
  await persist(filePath, file);
  return full;
}

// ── Internals ────────────────────────────────────────────────────────

async function persist(
  filePath: string,
  file: { schemaVersion: 2; signals: (GenerationSignal | RefinementSignal)[] },
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const payload = {
    schemaVersion: EMPTY_SIGNAL_FILE.schemaVersion,
    signals: file.signals,
  };
  await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
}

function generateSignalId(): string {
  // `sig_<hex>` — matches plan.md convention without pulling in ulid.
  return `sig_${randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`;
}
