/**
 * Skill Generation Signal Types
 *
 * Defines the structure for .specweave/state/skill-signals.json
 *
 * @module core/skill-gen/types
 */

/**
 * A single detected pattern signal
 */
export interface SignalEntry {
  /** Unique signal identifier (UUID or slug) */
  id: string;
  /** Short human-readable pattern name (e.g., "error-boundary-pattern") */
  pattern: string;
  /** Category slug for deduplication — dynamic string discovered by LLM */
  category: string;
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
  /** Distinct source file paths where this pattern was detected */
  uniqueSourceFiles?: string[];
}

/**
 * Structured result from DriftDetector.check()
 */
export interface DriftResult {
  skillFile: string;
  staleRefs: string[];
  validRefs: string[];
}

/**
 * Structured response schema for LLM-based pattern extraction
 */
export interface LLMPatternResponse {
  patterns: Array<{
    category: string;
    name: string;
    description: string;
    evidence: string[];
  }>;
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
 * Default SkillGen values (2.0 has no `skillGen` config key)
 */
export const SKILL_GEN_DEFAULTS = {
  detection: 'on-close' as const,
  suggest: true,
  minSignalCount: 3,
  declinedSuggestions: [] as string[],
  maxSignals: 100,
};

/**
 * Skill generation configuration (v1.0.XXX+)
 *
 * Controls automatic detection of recurring patterns from living docs
 * and on-demand generation of project-local skills.
 */
/**
 * 2.0 removed the `skillGen` config key; these values come from
 * SKILL_GEN_DEFAULTS unless a caller passes overrides explicitly.
 */
export interface SkillGenConfig {
  /** Pattern detection trigger: "on-close" runs on increment completion, "off" disables. Default: "on-close" */
  detection?: 'on-close' | 'off';
  /** Whether to print suggestions when patterns qualify. Default: true */
  suggest?: boolean;
  /** Minimum number of increments a pattern must appear in before qualifying. Default: 3 */
  minSignalCount?: number;
  /** Pattern IDs permanently excluded from suggestions (still visible in sw:skill-gen). Default: [] */
  declinedSuggestions?: string[];
  /** Maximum number of signals to retain (prunes lowest-confidence when exceeded). Default: 100 */
  maxSignals?: number;
}
