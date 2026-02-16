import { describe, it, expect } from 'vitest';
import type {
  FabricRegistryEntry,
  FabricSkillEntry,
  FabricSearchFilters,
  CertificationLevel,
  CertificationRecord,
  TrustLabel,
  SecurityScanRecord,
  ContradictionRecord,
} from '../../../../src/core/fabric/registry-schema.js';
import {
  CERTIFICATION_LEVEL_ORDER,
  FINDING_SEVERITY_ORDER,
  isCertifiedAtLevel,
  hasLabel,
  getLatestScan,
  hasUnresolvedContradictions,
} from '../../../../src/core/fabric/registry-schema.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────

function makeEntry(overrides?: Partial<FabricRegistryEntry>): FabricRegistryEntry {
  return {
    name: 'test-plugin',
    displayName: 'Test Plugin',
    description: 'A test plugin',
    author: 'test-author',
    tier: 'community',
    version: '1.0.0',
    tags: ['test'],
    skills: [],
    agentSkillsCompat: true,
    ...overrides,
  };
}

function makeCert(overrides?: Partial<CertificationRecord>): CertificationRecord {
  return {
    level: 'verified',
    method: 'llm-judge',
    version: '1.0.0',
    contentHash: 'sha256:abc123',
    certifiedAt: '2026-02-15T00:00:00Z',
    ...overrides,
  };
}

// ─── Backward Compatibility ───────────────────────────────────────────────

describe('Registry Schema Backward Compatibility', () => {
  it('existing FabricRegistryEntry without new fields still works', () => {
    const entry = makeEntry();
    expect(entry.name).toBe('test-plugin');
    expect(entry.certification).toBeUndefined();
    expect(entry.trustLabels).toBeUndefined();
    expect(entry.scanHistory).toBeUndefined();
    expect(entry.contradictions).toBeUndefined();
    expect(entry.contentHash).toBeUndefined();
    expect(entry.lastScannedAt).toBeUndefined();
  });

  it('existing FabricSkillEntry without new fields still works', () => {
    const skill: FabricSkillEntry = {
      name: 'test-skill',
      description: 'A test skill',
      tags: ['test'],
    };
    expect(skill.name).toBe('test-skill');
    expect(skill.certification).toBeUndefined();
    expect(skill.trustLabels).toBeUndefined();
    expect(skill.contradictions).toBeUndefined();
    expect(skill.declaredPermissions).toBeUndefined();
    expect(skill.declaredScope).toBeUndefined();
  });

  it('existing FabricSearchFilters without new fields still works', () => {
    const filters: FabricSearchFilters = { tier: 'official' };
    expect(filters.tier).toBe('official');
    expect(filters.minCertification).toBeUndefined();
    expect(filters.hasLabels).toBeUndefined();
    expect(filters.excludeLabels).toBeUndefined();
  });

  it('new fields are optional on FabricRegistryEntry', () => {
    const entry = makeEntry({
      certification: makeCert(),
      trustLabels: [{ id: 'verified', appliedAt: '2026-01-01T00:00:00Z', appliedBy: 'scanner' }],
      scanHistory: [],
      contradictions: [],
      contentHash: 'sha256:def456',
      lastScannedAt: '2026-02-15T00:00:00Z',
    });
    expect(entry.certification?.level).toBe('verified');
    expect(entry.trustLabels).toHaveLength(1);
    expect(entry.contentHash).toBe('sha256:def456');
  });
});

// ─── JSON Round-Trip ──────────────────────────────────────────────────────

describe('JSON Round-Trip', () => {
  it('preserves all fields through JSON serialization', () => {
    const entry = makeEntry({
      certification: makeCert({ score: 92 }),
      trustLabels: [
        { id: 'verified', appliedAt: '2026-01-01T00:00:00Z', appliedBy: 'llm-judge' },
        { id: 'safe', appliedAt: '2026-01-01T00:00:00Z', appliedBy: 'scanner', metadata: { patterns: 37 } },
      ],
      scanHistory: [{
        scannedAt: '2026-02-15T00:00:00Z',
        scannerVersion: '1.0.265',
        patternsChecked: 37,
        passed: true,
        findingCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 2 },
        skillVersion: '1.0.0',
        contentHash: 'sha256:abc',
        judgeVerdict: 'PASS',
        judgeScore: 92,
      }],
      contradictions: [{
        type: 'behavioral',
        severity: 'medium',
        conflictingSkill: 'other-skill',
        description: 'Opposing memoization guidance',
        detectedAt: '2026-02-15T00:00:00Z',
        acknowledged: false,
      }],
    });

    const json = JSON.stringify(entry);
    const parsed = JSON.parse(json) as FabricRegistryEntry;

    expect(parsed.certification?.score).toBe(92);
    expect(parsed.trustLabels).toHaveLength(2);
    expect(parsed.scanHistory).toHaveLength(1);
    expect(parsed.scanHistory![0].judgeVerdict).toBe('PASS');
    expect(parsed.contradictions).toHaveLength(1);
    expect(parsed.contradictions![0].type).toBe('behavioral');
  });
});

// ─── Constants ────────────────────────────────────────────────────────────

describe('CERTIFICATION_LEVEL_ORDER', () => {
  it('orders levels correctly', () => {
    expect(CERTIFICATION_LEVEL_ORDER['none']).toBe(0);
    expect(CERTIFICATION_LEVEL_ORDER['rejected']).toBe(0);
    expect(CERTIFICATION_LEVEL_ORDER['scanned']).toBe(1);
    expect(CERTIFICATION_LEVEL_ORDER['verified']).toBe(2);
    expect(CERTIFICATION_LEVEL_ORDER['certified']).toBe(3);
  });

  it('certified > verified > scanned', () => {
    expect(CERTIFICATION_LEVEL_ORDER['certified']).toBeGreaterThan(
      CERTIFICATION_LEVEL_ORDER['verified'],
    );
    expect(CERTIFICATION_LEVEL_ORDER['verified']).toBeGreaterThan(
      CERTIFICATION_LEVEL_ORDER['scanned'],
    );
  });
});

describe('FINDING_SEVERITY_ORDER', () => {
  it('orders severities correctly', () => {
    expect(FINDING_SEVERITY_ORDER['info']).toBe(0);
    expect(FINDING_SEVERITY_ORDER['low']).toBe(1);
    expect(FINDING_SEVERITY_ORDER['medium']).toBe(2);
    expect(FINDING_SEVERITY_ORDER['high']).toBe(3);
    expect(FINDING_SEVERITY_ORDER['critical']).toBe(4);
  });
});

// ─── Helper Functions ─────────────────────────────────────────────────────

describe('isCertifiedAtLevel', () => {
  it('returns true when entry meets minimum level', () => {
    const entry = makeEntry({ certification: makeCert({ level: 'certified' }) });
    expect(isCertifiedAtLevel(entry, 'scanned')).toBe(true);
    expect(isCertifiedAtLevel(entry, 'verified')).toBe(true);
    expect(isCertifiedAtLevel(entry, 'certified')).toBe(true);
  });

  it('returns false when entry is below minimum level', () => {
    const entry = makeEntry({ certification: makeCert({ level: 'scanned' }) });
    expect(isCertifiedAtLevel(entry, 'verified')).toBe(false);
    expect(isCertifiedAtLevel(entry, 'certified')).toBe(false);
  });

  it('handles entry without certification', () => {
    const entry = makeEntry();
    expect(isCertifiedAtLevel(entry, 'none')).toBe(true);
    expect(isCertifiedAtLevel(entry, 'scanned')).toBe(false);
  });

  it('treats rejected same as none', () => {
    const entry = makeEntry({ certification: makeCert({ level: 'rejected' }) });
    expect(isCertifiedAtLevel(entry, 'none')).toBe(true);
    expect(isCertifiedAtLevel(entry, 'scanned')).toBe(false);
  });
});

describe('hasLabel', () => {
  it('returns true when label exists', () => {
    const entry = makeEntry({
      trustLabels: [
        { id: 'verified', appliedAt: '2026-01-01T00:00:00Z', appliedBy: 'scanner' },
        { id: 'safe', appliedAt: '2026-01-01T00:00:00Z', appliedBy: 'scanner' },
      ],
    });
    expect(hasLabel(entry, 'verified')).toBe(true);
    expect(hasLabel(entry, 'safe')).toBe(true);
  });

  it('returns false when label does not exist', () => {
    const entry = makeEntry({
      trustLabels: [
        { id: 'verified', appliedAt: '2026-01-01T00:00:00Z', appliedBy: 'scanner' },
      ],
    });
    expect(hasLabel(entry, 'deprecated')).toBe(false);
  });

  it('returns false when no labels at all', () => {
    const entry = makeEntry();
    expect(hasLabel(entry, 'verified')).toBe(false);
  });
});

describe('getLatestScan', () => {
  it('returns first element of scanHistory', () => {
    const scan: SecurityScanRecord = {
      scannedAt: '2026-02-15T00:00:00Z',
      scannerVersion: '1.0.265',
      patternsChecked: 37,
      passed: true,
      findingCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      skillVersion: '1.0.0',
      contentHash: 'sha256:abc',
    };
    const entry = makeEntry({ scanHistory: [scan] });
    expect(getLatestScan(entry)).toBe(scan);
  });

  it('returns undefined when no scan history', () => {
    const entry = makeEntry();
    expect(getLatestScan(entry)).toBeUndefined();
  });

  it('returns undefined for empty scan history', () => {
    const entry = makeEntry({ scanHistory: [] });
    expect(getLatestScan(entry)).toBeUndefined();
  });
});

describe('hasUnresolvedContradictions', () => {
  it('returns true when unacknowledged contradictions exist', () => {
    const entry = makeEntry({
      contradictions: [{
        type: 'behavioral',
        severity: 'medium',
        conflictingSkill: 'other',
        description: 'conflict',
        detectedAt: '2026-01-01T00:00:00Z',
        acknowledged: false,
      }],
    });
    expect(hasUnresolvedContradictions(entry)).toBe(true);
  });

  it('returns false when all contradictions acknowledged', () => {
    const entry = makeEntry({
      contradictions: [{
        type: 'behavioral',
        severity: 'medium',
        conflictingSkill: 'other',
        description: 'conflict',
        detectedAt: '2026-01-01T00:00:00Z',
        acknowledged: true,
      }],
    });
    expect(hasUnresolvedContradictions(entry)).toBe(false);
  });

  it('returns false when no contradictions', () => {
    const entry = makeEntry();
    expect(hasUnresolvedContradictions(entry)).toBe(false);
  });

  it('returns true when acknowledged field is absent (treated as unresolved)', () => {
    const entry = makeEntry({
      contradictions: [{
        type: 'configuration',
        severity: 'high',
        conflictingSkill: 'other',
        description: 'conflict',
        detectedAt: '2026-01-01T00:00:00Z',
      }],
    });
    expect(hasUnresolvedContradictions(entry)).toBe(true);
  });
});
