/**
 * Skill Fabric Registry Schema
 * Defines the structure for the curated skill registry.
 */

/** Trust tier for a registry entry */
export type FabricTier = 'official' | 'verified' | 'community';

/** A single skill within a plugin */
export interface FabricSkillEntry {
  /** Skill name (e.g., "component-generate") */
  name: string;
  /** Human-readable description */
  description: string;
  /** Tags for search/filtering */
  tags: string[];

  // === Certification & Security Extensions (0217) ===

  /** Per-skill certification (overrides plugin-level if present) */
  certification?: CertificationRecord;
  /** Per-skill trust labels */
  trustLabels?: TrustLabel[];
  /** Per-skill contradictions */
  contradictions?: ContradictionRecord[];
  /** Declared permissions from the Secure Skill Factory Standard */
  declaredPermissions?: string[];
  /** Declared scope from the Secure Skill Factory Standard */
  declaredScope?: {
    languages?: string[];
    frameworks?: string[];
    filePatterns?: string[];
  };
}

/** A plugin entry in the Fabric registry */
export interface FabricRegistryEntry {
  /** Plugin name (e.g., "frontend") */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Plugin description */
  description: string;
  /** Author name or org */
  author: string;
  /** Trust tier */
  tier: FabricTier;
  /** Current version */
  version: string;
  /** Search tags */
  tags: string[];
  /** Individual skills provided by this plugin */
  skills: FabricSkillEntry[];
  /** Whether compatible with Agent Skills standard */
  agentSkillsCompat: boolean;
  /** Repository URL (optional) */
  repository?: string;
  /** Homepage URL (optional) */
  homepage?: string;
  /** Minimum SpecWeave version required */
  minSpecweaveVersion?: string;

  // === Certification & Security Extensions (0217) ===

  /** Three-tier certification record */
  certification?: CertificationRecord;
  /** Trust labels applied to this entry */
  trustLabels?: TrustLabel[];
  /** Security scan history (most recent first, max 10 entries) */
  scanHistory?: SecurityScanRecord[];
  /** Known contradictions with other skills */
  contradictions?: ContradictionRecord[];
  /** SHA-256 hash of current version's content */
  contentHash?: string;
  /** ISO timestamp of the last security scan */
  lastScannedAt?: string;
}

/** The complete Fabric registry */
export interface FabricRegistry {
  /** Registry schema version */
  version: string;
  /** Last updated timestamp */
  updatedAt: string;
  /** All registry entries */
  entries: FabricRegistryEntry[];
}

/** Search filters for registry queries */
export interface FabricSearchFilters {
  /** Filter by trust tier */
  tier?: FabricTier;
  /** Filter by tag */
  tag?: string;
  /** Filter by author */
  author?: string;

  // === Extended Filters (0217) ===

  /** Filter by minimum certification level */
  minCertification?: CertificationLevel;
  /** Filter by presence of specific trust labels */
  hasLabels?: TrustLabelId[];
  /** Exclude entries with specific labels */
  excludeLabels?: TrustLabelId[];
  /** Filter by maximum finding count */
  maxFindings?: number;
  /** Only show entries scanned after this ISO timestamp */
  scannedAfter?: string;
}

/** Result from security scan */
export interface FabricSecurityScanResult {
  /** Whether the scan passed */
  passed: boolean;
  /** Individual findings */
  findings: FabricSecurityFinding[];
}

/** A single security finding */
export interface FabricSecurityFinding {
  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  /** Finding category */
  category: string;
  /** Human-readable description */
  message: string;
  /** Line number in the file (if applicable) */
  line?: number;
}

// ─── Three-Tier Certification Types ──────────────────────────────────────

/**
 * Certification level achieved through the three-tier verification system.
 * - 'none':      Not yet submitted for verification
 * - 'scanned':   Passed Tier 1 deterministic scan
 * - 'verified':  Passed Tier 1 + Tier 2 LLM judge (score >= 80)
 * - 'certified': Passed all 3 tiers + human review
 * - 'rejected':  Failed verification at any tier
 */
export type CertificationLevel = 'none' | 'scanned' | 'verified' | 'certified' | 'rejected';

/** Method by which a certification level was granted. */
export type CertificationMethod =
  | 'automated-scan'
  | 'llm-judge'
  | 'manual-review'
  | 'vendor-auto';

/** Complete certification record for a registry entry. */
export interface CertificationRecord {
  level: CertificationLevel;
  method: CertificationMethod;
  version: string;
  contentHash: string;
  certifiedAt: string;
  expiresAt?: string;
  score?: number;
  certifiedBy?: string;
  findingsCount?: number;
  scannerVersion?: string;
}

// ─── Trust Label Types ───────────────────────────────────────────────────

/** Trust label identifiers. */
export type TrustLabelId =
  | 'scanned'
  | 'verified'
  | 'certified'
  | 'extensible'
  | 'safe'
  | 'portable'
  | 'deprecated'
  | 'warning'
  | 'vendor'
  | 'popular';

/** A trust label applied to a skill or plugin. */
export interface TrustLabel {
  id: TrustLabelId;
  appliedAt: string;
  appliedBy: 'scanner' | 'llm-judge' | 'admin' | 'system' | 'author';
  metadata?: Record<string, string | number>;
  version?: string;
  expiresAt?: string;
}

// ─── Security Scan Record ────────────────────────────────────────────────

/** A recorded security scan result for audit trails. */
export interface SecurityScanRecord {
  scannedAt: string;
  scannerVersion: string;
  patternsChecked: number;
  passed: boolean;
  findingCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  skillVersion: string;
  contentHash: string;
  judgeVerdict?: 'PASS' | 'CONCERNS' | 'FAIL';
  judgeScore?: number;
}

// ─── Contradiction Types ─────────────────────────────────────────────────

/** Types of contradictions that can occur between skills. */
export type ContradictionType =
  | 'behavioral'
  | 'configuration'
  | 'dependency'
  | 'precedence';

/** Severity of a detected contradiction. */
export type ContradictionSeverity = 'high' | 'medium' | 'low';

/** A detected contradiction between two skills. */
export interface ContradictionRecord {
  type: ContradictionType;
  severity: ContradictionSeverity;
  conflictingSkill: string;
  description: string;
  thisInstruction?: string;
  otherInstruction?: string;
  resolution?: 'use-this' | 'use-other' | 'merge' | 'user-choice';
  detectedAt: string;
  acknowledged?: boolean;
}

// ─── Helper Constants ────────────────────────────────────────────────────

/** Certification level ordering for comparison. Higher = more trusted. */
export const CERTIFICATION_LEVEL_ORDER: Record<CertificationLevel, number> = {
  'none': 0,
  'rejected': 0,
  'scanned': 1,
  'verified': 2,
  'certified': 3,
};

/** Finding severity ordering. Higher = more severe. */
export const FINDING_SEVERITY_ORDER: Record<FabricSecurityFinding['severity'], number> = {
  'info': 0,
  'low': 1,
  'medium': 2,
  'high': 3,
  'critical': 4,
};

// ─── Helper Functions ────────────────────────────────────────────────────

/** Check if an entry has been certified at a minimum level. */
export function isCertifiedAtLevel(
  entry: FabricRegistryEntry,
  minLevel: CertificationLevel,
): boolean {
  if (!entry.certification) return minLevel === 'none';
  return CERTIFICATION_LEVEL_ORDER[entry.certification.level] >=
         CERTIFICATION_LEVEL_ORDER[minLevel];
}

/** Check if an entry has a specific trust label. */
export function hasLabel(
  entry: FabricRegistryEntry,
  labelId: TrustLabelId,
): boolean {
  return entry.trustLabels?.some(l => l.id === labelId) ?? false;
}

/** Get the most recent scan record for an entry. */
export function getLatestScan(
  entry: FabricRegistryEntry,
): SecurityScanRecord | undefined {
  return entry.scanHistory?.[0];
}

/** Check if an entry has unresolved contradictions. */
export function hasUnresolvedContradictions(
  entry: FabricRegistryEntry,
): boolean {
  return entry.contradictions?.some(c => !c.acknowledged) ?? false;
}
