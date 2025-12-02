/**
 * Brownfield Discrepancy Types
 *
 * Types for brownfield documentation analysis and persistent discrepancy management.
 * Different from detector.ts which handles real-time code-spec comparison.
 * This module handles persistent storage of documentation gaps for brownfield projects.
 *
 * @module core/discrepancy/brownfield-types
 */

/**
 * Type of brownfield discrepancy detected.
 * These represent documentation gaps, not code-spec mismatches.
 */
export type BrownfieldDiscrepancyType =
  | 'missing-docs'        // Code exists, no documentation
  | 'stale-docs'          // Code changed, docs didn't update
  | 'code-doc-mismatch'   // Docs say X, code does Y
  | 'knowledge-gap'       // Module with single contributor (bus factor 1)
  | 'orphan-doc'          // Docs for deleted code
  | 'missing-adr';        // Significant pattern, no ADR

/**
 * Status of a brownfield discrepancy.
 */
export type BrownfieldDiscrepancyStatus =
  | 'pending'       // Needs attention
  | 'in-progress'   // Linked to increment
  | 'resolved'      // Fixed
  | 'ignored';      // Marked as false positive/won't fix

/**
 * Priority level for discrepancies.
 */
export type BrownfieldDiscrepancyPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * How the discrepancy was detected.
 */
export type BrownfieldDiscrepancySource =
  | 'brownfield-analyzer'   // Initial brownfield analysis
  | 'drift-detector'        // Ongoing drift detection
  | 'manual';               // Manually reported

/**
 * Type of resolution applied.
 */
export type BrownfieldResolutionType =
  | 'doc-updated'       // Documentation was updated
  | 'code-updated'      // Code was updated to match docs
  | 'both-updated'      // Both code and docs updated
  | 'false-positive';   // Not a real discrepancy

/**
 * Evidence supporting a discrepancy detection.
 */
export interface BrownfieldDiscrepancyEvidence {
  /** Relevant code snippet */
  codeSnippet?: string;
  /** Relevant documentation snippet */
  docSnippet?: string;
  /** Git history information */
  gitHistory?: {
    /** ISO date of last code change */
    lastCodeChange: string;
    /** ISO date of last doc change (if exists) */
    lastDocChange?: string;
    /** Authors who have contributed */
    authors: string[];
  };
}

/**
 * Resolution details for a resolved discrepancy.
 */
export interface BrownfieldDiscrepancyResolution {
  /** Type of resolution */
  type: BrownfieldResolutionType;
  /** ISO date when resolved */
  resolvedAt: string;
  /** Who resolved it */
  resolvedBy: string;
  /** Optional notes about the resolution */
  notes?: string;
}

/**
 * Represents a brownfield discrepancy (documentation gap).
 */
export interface BrownfieldDiscrepancy {
  /** Unique identifier: DISC-0001 format */
  id: string;
  /** Type of discrepancy */
  type: BrownfieldDiscrepancyType;

  // Location
  /** Module name (e.g., "payment-service") */
  module: string;
  /** Code file location (e.g., "src/payment/processor.ts:42") */
  codeLocation?: string;
  /** Documentation file location (e.g., "docs/modules/payment.md") */
  docLocation?: string;

  // Details
  /** Brief description */
  summary: string;
  /** Full explanation */
  details: string;
  /** Supporting evidence */
  evidence: BrownfieldDiscrepancyEvidence;

  // Classification
  /** Priority level */
  priority: BrownfieldDiscrepancyPriority;
  /** Confidence score 0-100 */
  confidence: number;
  /** Whether auto-detected or manually created */
  autoDetected: boolean;

  // Resolution tracking
  /** Current status */
  status: BrownfieldDiscrepancyStatus;
  /** Linked increment ID (if in-progress) */
  incrementId?: string;
  /** Resolution details (if resolved) */
  resolution?: BrownfieldDiscrepancyResolution;

  // Metadata
  /** ISO date when detected */
  detectedAt: string;
  /** How it was detected */
  detectedBy: BrownfieldDiscrepancySource;
  /** ISO date of last check */
  lastChecked: string;
}

/**
 * Summary statistics for discrepancies.
 */
export interface BrownfieldDiscrepancyStats {
  /** Total discrepancies across all statuses */
  total: number;
  /** Count by status */
  pending: number;
  inProgress: number;
  resolved: number;
  ignored: number;
  /** Count by type */
  byType: Record<BrownfieldDiscrepancyType, number>;
  /** Count by priority */
  byPriority: Record<BrownfieldDiscrepancyPriority, number>;
}

/**
 * Index file for discrepancy folder.
 */
export interface BrownfieldDiscrepancyIndex {
  /** Schema version */
  version: '1.0.0';
  /** Summary statistics */
  stats: BrownfieldDiscrepancyStats;
  /** ISO date of last update */
  lastUpdated: string;
  /** Last analysis job info */
  lastAnalysis?: {
    /** Job ID */
    jobId: string;
    /** ISO date of completion */
    completedAt: string;
    /** Duration in milliseconds */
    duration: number;
    /** Phases completed */
    phasesCompleted: string[];
  };
}

/**
 * Filter options for querying discrepancies.
 */
export interface BrownfieldDiscrepancyFilter {
  /** Filter by module name */
  module?: string;
  /** Filter by type */
  type?: BrownfieldDiscrepancyType;
  /** Filter by types (multiple) */
  types?: BrownfieldDiscrepancyType[];
  /** Filter by status */
  status?: BrownfieldDiscrepancyStatus;
  /** Filter by statuses (multiple) */
  statuses?: BrownfieldDiscrepancyStatus[];
  /** Filter by priority */
  priority?: BrownfieldDiscrepancyPriority;
  /** Filter by priorities (multiple) */
  priorities?: BrownfieldDiscrepancyPriority[];
  /** Filter by minimum confidence */
  minConfidence?: number;
  /** Filter by linked increment */
  incrementId?: string;
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Data for creating a new discrepancy (id is auto-generated).
 */
export type BrownfieldDiscrepancyCreate = Omit<BrownfieldDiscrepancy, 'id'>;

/**
 * Data for updating a discrepancy.
 */
export type BrownfieldDiscrepancyUpdate = Partial<
  Omit<BrownfieldDiscrepancy, 'id' | 'detectedAt' | 'detectedBy'>
>;
