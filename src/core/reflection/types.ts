/**
 * Reflection System Types
 *
 * Data models for the per-skill reflection and learning system.
 * Supports automatic learning extraction with confidence levels.
 */

/**
 * Confidence level for a learning entry
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Type of learning based on how it was acquired
 */
export type LearningType = 'correction' | 'rule' | 'approval';

/**
 * Signal detected from user interaction
 * Used to calculate confidence level for learnings
 */
export interface Signal {
  /** Type of signal detected */
  type: LearningType;

  /** Raw content that triggered the signal */
  content: string;

  /** Confidence weight (0.0-1.0) */
  weight: number;
}

/**
 * Individual learning entry
 * Stored in MEMORY.md files per skill
 */
export interface Learning {
  /** Unique identifier (format: LRN-YYYYMMDD-XXXX) */
  id: string;

  /** ISO 8601 timestamp when learning was captured */
  timestamp: string;

  /** Type of learning */
  type: LearningType;

  /** Confidence level of this learning */
  confidence: ConfidenceLevel;

  /** Main content/rule to remember */
  content: string;

  /** Optional context about when/why this learning occurred */
  context?: string;

  /** Keywords that trigger this learning */
  triggers: string[];

  /** Source of the learning (e.g., "session:2026-01-06", "manual") */
  source: string;
}
