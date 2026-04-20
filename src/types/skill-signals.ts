/**
 * Skill Signals v2 — discriminated-union schema for .specweave/state/skill-signals.json
 *
 * v1 (legacy) was a generation-only store produced by SignalCollector
 * (see src/core/skill-gen/types.ts). v2 adds refinement signals emitted by
 * closure gates (judge-llm, rubric, code-reviewer) and keeps generation
 * signals bit-identical except for an added `type: "generation"` discriminator.
 *
 * Migration is lazy: the reader detects a v1 file and returns a v2 view in
 * memory; the next writer call persists v2 to disk.
 *
 * @module types/skill-signals
 */

import { z } from 'zod';

// ── Shared primitives ────────────────────────────────────────────────

export type SignalSource = 'judge-llm' | 'rubric' | 'code-reviewer';
export type SignalSeverity = 'low' | 'medium' | 'high';

export const SIGNAL_SOURCES: readonly SignalSource[] = [
  'judge-llm',
  'rubric',
  'code-reviewer',
];
export const SIGNAL_SEVERITIES: readonly SignalSeverity[] = ['low', 'medium', 'high'];

// ── Generation signal (v1 fields + type discriminator) ───────────────

/**
 * Legacy generation signal produced by SignalCollector. All v1 fields are
 * preserved; `type: "generation"` is added during migration.
 */
export interface GenerationSignal {
  type: 'generation';
  id: string;
  pattern: string;
  category: string;
  description: string;
  incrementIds: string[];
  firstSeen: string;
  lastSeen: string;
  confidence: number;
  evidence: string[];
  suggested: boolean;
  declined: boolean;
  generated: boolean;
  uniqueSourceFiles?: string[];
}

export const GenerationSignalSchema = z.object({
  type: z.literal('generation'),
  id: z.string(),
  pattern: z.string(),
  category: z.string(),
  description: z.string(),
  incrementIds: z.array(z.string()),
  firstSeen: z.string(),
  lastSeen: z.string(),
  confidence: z.number(),
  evidence: z.array(z.string()),
  suggested: z.boolean(),
  declined: z.boolean(),
  generated: z.boolean(),
  uniqueSourceFiles: z.array(z.string()).optional(),
});

// ── Refinement signal (new in v2) ────────────────────────────────────

/**
 * Refinement signal emitted by a closure gate when a gate failure traces
 * to a specific skill's instructions.
 */
export interface RefinementSignal {
  type: 'refinement';
  id: string;
  source: SignalSource;
  targetSkill: string;
  severity: SignalSeverity;
  incrementId: string;
  evidence: string;
  detectedAt: string;
  consumedBy: string | null;
}

export const RefinementSignalSchema = z.object({
  type: z.literal('refinement'),
  id: z.string(),
  source: z.enum(['judge-llm', 'rubric', 'code-reviewer']),
  targetSkill: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  incrementId: z.string(),
  evidence: z.string(),
  detectedAt: z.string(),
  consumedBy: z.string().nullable(),
});

// ── Union + file envelope ────────────────────────────────────────────

export type SkillSignal = GenerationSignal | RefinementSignal;

export const SkillSignalSchema = z.discriminatedUnion('type', [
  GenerationSignalSchema,
  RefinementSignalSchema,
]);

/**
 * v2 on-disk envelope for `.specweave/state/skill-signals.json`.
 */
export interface SignalFile {
  schemaVersion: 2;
  signals: SkillSignal[];
}

export const SignalFileSchema = z.object({
  schemaVersion: z.literal(2),
  signals: z.array(SkillSignalSchema),
});

export const EMPTY_SIGNAL_FILE: SignalFile = {
  schemaVersion: 2,
  signals: [],
};

// ── v1 shape (for migration input) ───────────────────────────────────

interface V1SignalEntry {
  id: string;
  pattern: string;
  category: string;
  description: string;
  incrementIds: string[];
  firstSeen: string;
  lastSeen: string;
  confidence: number;
  evidence: string[];
  suggested: boolean;
  declined: boolean;
  generated: boolean;
  uniqueSourceFiles?: string[];
}

interface V1SignalStore {
  version: string;
  signals: V1SignalEntry[];
}

const V1SignalEntrySchema = z.object({
  id: z.string(),
  pattern: z.string(),
  category: z.string(),
  description: z.string(),
  incrementIds: z.array(z.string()),
  firstSeen: z.string(),
  lastSeen: z.string(),
  confidence: z.number(),
  evidence: z.array(z.string()),
  suggested: z.boolean(),
  declined: z.boolean(),
  generated: z.boolean(),
  uniqueSourceFiles: z.array(z.string()).optional(),
});

const V1SignalStoreSchema = z.object({
  version: z.string(),
  signals: z.array(V1SignalEntrySchema),
});

// ── Migration ────────────────────────────────────────────────────────

/**
 * Returns true when `raw` conforms to the v1 on-disk shape.
 * v1 is identified by a string `version` field (e.g. "1.0") and absent
 * `schemaVersion`. v2 uses a numeric `schemaVersion: 2`.
 */
export function isV1(raw: unknown): raw is V1SignalStore {
  return V1SignalStoreSchema.safeParse(raw).success;
}

/**
 * Migrate a v1 store to v2 without data loss. Adds `type: "generation"`
 * to every existing entry; all other fields are preserved verbatim.
 */
export function migrateV1toV2(v1: V1SignalStore): SignalFile {
  return {
    schemaVersion: 2,
    signals: v1.signals.map((entry) => ({
      type: 'generation' as const,
      id: entry.id,
      pattern: entry.pattern,
      category: entry.category,
      description: entry.description,
      incrementIds: [...entry.incrementIds],
      firstSeen: entry.firstSeen,
      lastSeen: entry.lastSeen,
      confidence: entry.confidence,
      evidence: [...entry.evidence],
      suggested: entry.suggested,
      declined: entry.declined,
      generated: entry.generated,
      ...(entry.uniqueSourceFiles !== undefined
        ? { uniqueSourceFiles: [...entry.uniqueSourceFiles] }
        : {}),
    })),
  };
}
