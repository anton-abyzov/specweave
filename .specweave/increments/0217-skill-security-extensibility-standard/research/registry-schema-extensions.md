# Registry Schema Extensions Design

**Status**: DRAFT
**Author**: anton.abyzov@gmail.com
**Date**: 2026-02-15
**Satisfies**: AC-US4-05 (T-013)
**Dependencies**: T-008 (Three-Tier Certification), T-009 (Trust Labels & Badges)

---

## 1. Overview

This document defines TypeScript interface extensions to `src/core/fabric/registry-schema.ts` that add certification, trust labels, security scan history, and contradiction detection to the existing `FabricRegistryEntry` schema. All new fields are **optional** to maintain backward compatibility with existing registry entries.

---

## 2. Design Principles

1. **Backward compatible**: All new fields are optional (`?` suffix). Existing code that reads `FabricRegistryEntry` continues to work unchanged.
2. **No breaking changes**: Existing types (`FabricTier`, `FabricSecurityScanResult`, `FabricSecurityFinding`) are preserved as-is.
3. **Additive only**: New types are added alongside existing ones. No type modifications.
4. **JSON-serializable**: All types must serialize to/from JSON without custom logic.
5. **Extensible**: Labels and certification levels use union types that can be extended.

---

## 3. New Types

### 3.1 CertificationLevel

Maps to the three-tier certification system (T-008):

```typescript
/**
 * Certification level achieved through the three-tier verification system.
 * - 'none':      Not yet submitted for verification
 * - 'scanned':   Passed Tier 1 deterministic scan (37 patterns)
 * - 'verified':  Passed Tier 1 + Tier 2 LLM judge (score >= 80)
 * - 'certified': Passed all 3 tiers + human review with signed attestation
 * - 'rejected':  Failed verification at any tier
 */
export type CertificationLevel = 'none' | 'scanned' | 'verified' | 'certified' | 'rejected';
```

### 3.2 CertificationMethod

How the certification level was achieved:

```typescript
/**
 * Method by which a certification level was granted.
 */
export type CertificationMethod =
  | 'automated-scan'   // Tier 1 only
  | 'llm-judge'        // Tier 1 + Tier 2
  | 'manual-review'    // Tier 1 + Tier 2 + Tier 3
  | 'vendor-auto';     // Auto-verified vendor org (skips scanning)
```

### 3.3 CertificationRecord

Full certification state for a skill/plugin:

```typescript
/**
 * Complete certification record for a registry entry.
 * Tracks the current certification level and the evidence that supports it.
 */
export interface CertificationRecord {
  /** Current certification level */
  level: CertificationLevel;

  /** How this level was achieved */
  method: CertificationMethod;

  /** Semantic version this certification applies to */
  version: string;

  /** SHA-256 hash of the skill content at certification time */
  contentHash: string;

  /** ISO timestamp when certification was granted */
  certifiedAt: string;

  /** ISO timestamp when certification expires (Tier 3 only, typically 6 months) */
  expiresAt?: string;

  /** Tier 2 judge score (0-100), present when method is 'llm-judge' or 'manual-review' */
  score?: number;

  /** Tier 3 reviewer ID, present when method is 'manual-review' */
  certifiedBy?: string;

  /** Number of non-critical findings at certification time */
  findingsCount?: number;

  /** Scanner version used for Tier 1 */
  scannerVersion?: string;
}
```

### 3.4 TrustLabelId

All available trust labels (T-009):

```typescript
/**
 * Trust label identifiers.
 * Extensible: new labels can be added to this union without schema migration.
 */
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
```

### 3.5 TrustLabel

A trust label applied to a skill:

```typescript
/**
 * A trust label applied to a skill or plugin.
 * Labels provide visual and machine-readable quality/safety indicators.
 */
export interface TrustLabel {
  /** Label identifier */
  id: TrustLabelId;

  /** ISO timestamp when the label was applied */
  appliedAt: string;

  /** Entity that applied the label */
  appliedBy: 'scanner' | 'llm-judge' | 'admin' | 'system' | 'author';

  /** Additional context (e.g., vendor org name, agent count, finding count) */
  metadata?: Record<string, string | number>;

  /** Semantic version this label applies to (absent = current version) */
  version?: string;

  /** ISO timestamp when this label expires */
  expiresAt?: string;
}
```

### 3.6 SecurityScanRecord

A timestamped security scan result for audit trail:

```typescript
/**
 * A recorded security scan result.
 * Supports scan history tracking for audit trails and badge verification.
 */
export interface SecurityScanRecord {
  /** ISO timestamp when the scan was performed */
  scannedAt: string;

  /** Version of the scanner used */
  scannerVersion: string;

  /** Number of patterns checked */
  patternsChecked: number;

  /** Whether the scan passed (no critical/high findings) */
  passed: boolean;

  /** Total findings count by severity */
  findingCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };

  /** The version of the skill that was scanned */
  skillVersion: string;

  /** SHA-256 hash of the content that was scanned */
  contentHash: string;

  /** Tier 2 judge verdict, if applicable */
  judgeVerdict?: 'PASS' | 'CONCERNS' | 'FAIL';

  /** Tier 2 judge score (0-100), if applicable */
  judgeScore?: number;
}
```

### 3.7 ContradictionType

Types of contradictions between skills:

```typescript
/**
 * Types of contradictions that can occur between skills.
 * From T-004 research: 4 categories with real-world examples.
 */
export type ContradictionType =
  | 'behavioral'      // Different instructions for same action (e.g., "always memoize" vs "don't memoize simple expressions")
  | 'configuration'   // Conflicting tool/config preferences (e.g., npm vs bun)
  | 'dependency'      // Incompatible version assumptions (e.g., React 18 vs React 19)
  | 'precedence';     // Ambiguous priority between global/project/vendor skills
```

### 3.8 ContradictionSeverity

```typescript
/**
 * Severity of a detected contradiction.
 */
export type ContradictionSeverity = 'high' | 'medium' | 'low';
```

### 3.9 ContradictionRecord

A detected contradiction between two skills:

```typescript
/**
 * A detected contradiction between two skills.
 * Used to warn users about conflicting instructions at install time.
 */
export interface ContradictionRecord {
  /** Type of contradiction */
  type: ContradictionType;

  /** Severity of the contradiction */
  severity: ContradictionSeverity;

  /** The other skill that this contradicts */
  conflictingSkill: string;

  /** Human-readable description of the contradiction */
  description: string;

  /** The specific instruction in THIS skill that conflicts */
  thisInstruction?: string;

  /** The specific instruction in the OTHER skill that conflicts */
  otherInstruction?: string;

  /** Suggested resolution strategy */
  resolution?: 'use-this' | 'use-other' | 'merge' | 'user-choice';

  /** ISO timestamp when the contradiction was detected */
  detectedAt: string;

  /** Whether this contradiction has been acknowledged by the user */
  acknowledged?: boolean;
}
```

---

## 4. Extended FabricRegistryEntry

The existing `FabricRegistryEntry` interface is extended with optional fields:

```typescript
/** A plugin entry in the Fabric registry (extended) */
export interface FabricRegistryEntry {
  // === EXISTING FIELDS (unchanged) ===
  /** Plugin name (e.g., "sw-frontend") */
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

  // === NEW OPTIONAL FIELDS ===

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
```

---

## 5. Extended FabricSkillEntry

Individual skills within a plugin also get optional certification fields:

```typescript
/** A single skill within a plugin (extended) */
export interface FabricSkillEntry {
  // === EXISTING FIELDS (unchanged) ===
  /** Skill name (e.g., "component-generate") */
  name: string;
  /** Human-readable description */
  description: string;
  /** Tags for search/filtering */
  tags: string[];

  // === NEW OPTIONAL FIELDS ===

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
```

---

## 6. Extended FabricSearchFilters

New search filters for the extended schema:

```typescript
/** Search filters for registry queries (extended) */
export interface FabricSearchFilters {
  // === EXISTING FIELDS (unchanged) ===
  /** Filter by trust tier */
  tier?: FabricTier;
  /** Filter by tag */
  tag?: string;
  /** Filter by author */
  author?: string;

  // === NEW OPTIONAL FIELDS ===

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
```

---

## 7. Helper Types

### 7.1 Certification Comparison

```typescript
/**
 * Certification level ordering for comparison operations.
 * Higher number = higher trust.
 */
export const CERTIFICATION_LEVEL_ORDER: Record<CertificationLevel, number> = {
  'none': 0,
  'rejected': 0,
  'scanned': 1,
  'verified': 2,
  'certified': 3,
};
```

### 7.2 Finding Severity Ordering

```typescript
/**
 * Finding severity ordering for sorting.
 * Higher number = more severe.
 */
export const FINDING_SEVERITY_ORDER: Record<FabricSecurityFinding['severity'], number> = {
  'info': 0,
  'low': 1,
  'medium': 2,
  'high': 3,
  'critical': 4,
};
```

---

## 8. Backward Compatibility Analysis

### 8.1 No Breaking Changes

| Aspect | Impact | Reason |
|--------|--------|--------|
| Existing `FabricRegistryEntry` consumers | None | All new fields are optional |
| Existing `FabricSecurityScanResult` consumers | None | Type preserved unchanged |
| Existing `FabricSecurityFinding` consumers | None | Type preserved unchanged |
| Existing `FabricTier` consumers | None | Type preserved unchanged |
| Existing `FabricSearchFilters` consumers | None | All new fields are optional |
| JSON deserialization | None | Missing optional fields = `undefined` |
| Existing registry.json files | None | Will deserialize without new fields |

### 8.2 Migration Path

1. **Phase 1** (this increment): Add types to `registry-schema.ts`. Existing entries have `undefined` for all new fields.
2. **Phase 2** (next increment): Scanner integration populates `certification`, `scanHistory`, `contentHash`, `lastScannedAt` on scan.
3. **Phase 3** (verified-skill.com): Full pipeline populates all fields including `trustLabels` and `contradictions`.

### 8.3 Type Guard Utilities

```typescript
/**
 * Check if an entry has been certified at a minimum level.
 */
export function isCertifiedAtLevel(
  entry: FabricRegistryEntry,
  minLevel: CertificationLevel
): boolean {
  if (!entry.certification) return minLevel === 'none';
  return CERTIFICATION_LEVEL_ORDER[entry.certification.level] >=
         CERTIFICATION_LEVEL_ORDER[minLevel];
}

/**
 * Check if an entry has a specific trust label.
 */
export function hasLabel(
  entry: FabricRegistryEntry,
  labelId: TrustLabelId
): boolean {
  return entry.trustLabels?.some(l => l.id === labelId) ?? false;
}

/**
 * Get the most recent scan record for an entry.
 */
export function getLatestScan(
  entry: FabricRegistryEntry
): SecurityScanRecord | undefined {
  return entry.scanHistory?.[0];
}

/**
 * Check if an entry has unresolved contradictions.
 */
export function hasUnresolvedContradictions(
  entry: FabricRegistryEntry
): boolean {
  return entry.contradictions?.some(c => !c.acknowledged) ?? false;
}
```

---

## 9. Example: Extended Registry Entry

```json
{
  "name": "sw-frontend",
  "displayName": "SpecWeave Frontend",
  "description": "Frontend development skills for React, Vue, Angular",
  "author": "specweave",
  "tier": "official",
  "version": "1.2.0",
  "tags": ["frontend", "react", "vue", "angular"],
  "skills": [
    {
      "name": "component-generate",
      "description": "Generate React/Vue/Angular components",
      "tags": ["react", "component"],
      "certification": {
        "level": "verified",
        "method": "llm-judge",
        "version": "1.2.0",
        "contentHash": "sha256:abc123...",
        "certifiedAt": "2026-02-15T18:00:00Z",
        "score": 92,
        "findingsCount": 0,
        "scannerVersion": "1.0.265"
      },
      "trustLabels": [
        { "id": "verified", "appliedAt": "2026-02-15T18:00:00Z", "appliedBy": "llm-judge" },
        { "id": "safe", "appliedAt": "2026-02-15T18:00:00Z", "appliedBy": "scanner" },
        { "id": "portable", "appliedAt": "2026-02-15T18:00:00Z", "appliedBy": "system" }
      ],
      "declaredPermissions": ["Read", "Write", "Glob", "Grep"],
      "declaredScope": {
        "languages": ["TypeScript", "JavaScript"],
        "frameworks": ["React", "Vue", "Angular"],
        "filePatterns": ["src/components/**/*.tsx"]
      }
    }
  ],
  "agentSkillsCompat": true,
  "repository": "https://github.com/specweave/plugins",
  "certification": {
    "level": "verified",
    "method": "llm-judge",
    "version": "1.2.0",
    "contentHash": "sha256:def456...",
    "certifiedAt": "2026-02-15T18:00:00Z",
    "score": 92,
    "findingsCount": 0,
    "scannerVersion": "1.0.265"
  },
  "trustLabels": [
    { "id": "verified", "appliedAt": "2026-02-15T18:00:00Z", "appliedBy": "llm-judge" },
    { "id": "vendor", "appliedAt": "2026-02-15T18:00:00Z", "appliedBy": "system", "metadata": { "org": "specweave" } }
  ],
  "scanHistory": [
    {
      "scannedAt": "2026-02-15T18:00:00Z",
      "scannerVersion": "1.0.265",
      "patternsChecked": 37,
      "passed": true,
      "findingCounts": { "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 2 },
      "skillVersion": "1.2.0",
      "contentHash": "sha256:def456...",
      "judgeVerdict": "PASS",
      "judgeScore": 92
    }
  ],
  "contradictions": [],
  "contentHash": "sha256:def456...",
  "lastScannedAt": "2026-02-15T18:00:00Z"
}
```

---

## 10. Implementation Notes

### 10.1 File Changes

| File | Change | Type |
|------|--------|------|
| `src/core/fabric/registry-schema.ts` | Add new types and extend existing interfaces | Type additions |
| `tests/unit/core/fabric/registry-schema.test.ts` | Add backward compat and type guard tests | New test file |

### 10.2 Implementation Approach

The implementation (T-024) should:

1. Add all new types **after** existing type definitions (preserve file structure)
2. Add helper functions (type guards) at the bottom of the file
3. Add `CERTIFICATION_LEVEL_ORDER` and `FINDING_SEVERITY_ORDER` as exported constants
4. Keep all existing exports unchanged
5. Export all new types via named exports
6. Total new lines: ~150 (keeping within the 1500-line limit)

### 10.3 Test Strategy

Tests should verify:
- Existing `FabricRegistryEntry` objects still pass type checks (backward compat)
- New optional fields default to `undefined`
- `isCertifiedAtLevel()` correctly compares certification levels
- `hasLabel()` finds labels and returns false when absent
- `getLatestScan()` returns first element of scanHistory
- `hasUnresolvedContradictions()` detects unacknowledged contradictions
- JSON round-trip preserves all fields

---

## 11. References

- [Current registry-schema.ts](/src/core/fabric/registry-schema.ts) — 86 lines, 6 interfaces
- [T-008: Three-tier certification](/research/three-tier-certification.md) — CertificationLevel, CertificationRecord
- [T-009: Trust labels and badges](/research/trust-labels-badges.md) — TrustLabelId, TrustLabel
- [T-004: Skill contradictions](/research/skill-contradictions.md) — ContradictionType, real examples
- [SpecWeave security-scanner.ts](/src/core/fabric/security-scanner.ts) — FabricSecurityScanResult, FabricSecurityFinding
