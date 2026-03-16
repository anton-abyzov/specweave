/**
 * Skill Generation Signal Types
 *
 * Defines the structure for .specweave/state/skill-signals.json
 *
 * @module core/skill-gen/types
 */

/**
 * Signal categories for pattern classification.
 * Uses semantic slugs for deduplication — not exact library names.
 */
export type SignalCategory =
  | 'error-handling'
  | 'naming-conventions'
  | 'architecture-patterns'
  | 'testing-patterns'
  | 'integration-patterns'
  | 'data-model'
  | 'api-patterns'
  | 'auth-patterns'
  | 'state-management'
  | 'build-deploy'
  | string; // Allow custom categories

/**
 * A single detected pattern signal
 */
export interface SignalEntry {
  /** Unique signal identifier (UUID or slug) */
  id: string;
  /** Short human-readable pattern name (e.g., "error-boundary-pattern") */
  pattern: string;
  /** Category slug for deduplication */
  category: SignalCategory;
  /** Human-readable description of the detected pattern */
  description: string;
  /** Increment IDs where this pattern was observed */
  incrementIds: string[];
  /** ISO date when first detected */
  firstSeen: string;
  /** ISO date when last detected */
  lastSeen: string;
  /** Confidence score 0.0-1.0 */
  confidence: number;
  /** Evidence: file paths, snippets, or analysis references */
  evidence: string[];
  /** Whether this signal has been surfaced as a suggestion */
  suggested: boolean;
  /** Whether the user has declined this suggestion */
  declined: boolean;
  /** Whether a skill has been generated from this signal */
  generated: boolean;
}

/**
 * Top-level structure of skill-signals.json
 */
export interface SignalStore {
  /** Schema version for migration support */
  version: string;
  /** Array of detected pattern signals */
  signals: SignalEntry[];
}

/**
 * Default empty signal store
 */
export const EMPTY_SIGNAL_STORE: SignalStore = {
  version: '1.0',
  signals: [],
};

/**
 * Default SkillGen config values (applied when config.skillGen is absent)
 */
export const SKILL_GEN_DEFAULTS = {
  detection: 'on-close' as const,
  suggest: true,
  minSignalCount: 3,
  declinedSuggestions: [] as string[],
  maxSignals: 100,
};
