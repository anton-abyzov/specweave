/**
 * Tests for skill-signals v2 schema + v1→v2 migration.
 *
 * Covers AC-US1-04: v1 files migrate in-memory without data loss;
 * generation signals remain deserializable.
 */

import { describe, it, expect } from 'vitest';
import {
  EMPTY_SIGNAL_FILE,
  GenerationSignalSchema,
  RefinementSignalSchema,
  SignalFileSchema,
  SkillSignalSchema,
  isV1,
  migrateV1toV2,
  type GenerationSignal,
  type RefinementSignal,
  type SignalFile,
} from './skill-signals.js';

describe('skill-signals v2 schema', () => {
  describe('SkillSignalSchema (discriminated union)', () => {
    it('accepts a valid generation signal', () => {
      const signal: GenerationSignal = {
        type: 'generation',
        id: 'sig-arch-micro',
        pattern: 'microservices-default',
        category: 'architecture',
        description: 'Defaults to microservices',
        incrementIds: ['0650'],
        firstSeen: '2026-04-10T00:00:00Z',
        lastSeen: '2026-04-11T00:00:00Z',
        confidence: 0.8,
        evidence: ['ev1'],
        suggested: false,
        declined: false,
        generated: false,
      };
      expect(SkillSignalSchema.parse(signal)).toEqual(signal);
    });

    it('accepts a valid refinement signal', () => {
      const signal: RefinementSignal = {
        type: 'refinement',
        id: 'sig_01HY',
        source: 'judge-llm',
        targetSkill: 'sw:architect',
        severity: 'high',
        incrementId: '0671',
        evidence: 'finding #3 cites skill instruction',
        detectedAt: '2026-04-20T00:00:00Z',
        consumedBy: null,
      };
      expect(SkillSignalSchema.parse(signal)).toEqual(signal);
    });

    it('rejects an unknown discriminator', () => {
      const invalid = { type: 'unknown', id: 'x' };
      expect(SkillSignalSchema.safeParse(invalid).success).toBe(false);
    });

    it('rejects a refinement signal with invalid severity', () => {
      const invalid = {
        type: 'refinement',
        id: 'sig_01HY',
        source: 'judge-llm',
        targetSkill: 'sw:architect',
        severity: 'critical',
        incrementId: '0671',
        evidence: 'x',
        detectedAt: '2026-04-20T00:00:00Z',
        consumedBy: null,
      };
      expect(RefinementSignalSchema.safeParse(invalid).success).toBe(false);
    });

    it('rejects a refinement signal with invalid source', () => {
      const invalid = {
        type: 'refinement',
        id: 'sig_01HY',
        source: 'human',
        targetSkill: 'sw:architect',
        severity: 'low',
        incrementId: '0671',
        evidence: 'x',
        detectedAt: '2026-04-20T00:00:00Z',
        consumedBy: null,
      };
      expect(RefinementSignalSchema.safeParse(invalid).success).toBe(false);
    });

    it('accepts a refinement signal with a consumedBy reference', () => {
      const signal: RefinementSignal = {
        type: 'refinement',
        id: 'sig_01HY',
        source: 'rubric',
        targetSkill: 'sw:tdd-cycle',
        severity: 'medium',
        incrementId: '0670',
        evidence: 'criterion X failed',
        detectedAt: '2026-04-20T00:00:00Z',
        consumedBy: 'ref_01HZ',
      };
      expect(RefinementSignalSchema.parse(signal).consumedBy).toBe('ref_01HZ');
    });
  });

  describe('SignalFileSchema', () => {
    it('requires schemaVersion: 2', () => {
      const bad = { schemaVersion: 1, signals: [] };
      expect(SignalFileSchema.safeParse(bad).success).toBe(false);
    });

    it('accepts an empty signal file', () => {
      expect(SignalFileSchema.parse(EMPTY_SIGNAL_FILE)).toEqual(EMPTY_SIGNAL_FILE);
    });

    it('accepts a mixed file with both generation and refinement signals', () => {
      const file: SignalFile = {
        schemaVersion: 2,
        signals: [
          {
            type: 'generation',
            id: 'sig-a',
            pattern: 'p',
            category: 'c',
            description: 'd',
            incrementIds: ['0650'],
            firstSeen: '2026-04-10T00:00:00Z',
            lastSeen: '2026-04-10T00:00:00Z',
            confidence: 1,
            evidence: [],
            suggested: false,
            declined: false,
            generated: false,
          },
          {
            type: 'refinement',
            id: 'sig_01HY',
            source: 'code-reviewer',
            targetSkill: 'sw:architect',
            severity: 'low',
            incrementId: '0671',
            evidence: 'ev',
            detectedAt: '2026-04-20T00:00:00Z',
            consumedBy: null,
          },
        ],
      };
      expect(SignalFileSchema.parse(file)).toEqual(file);
    });
  });

  describe('isV1()', () => {
    it('returns true for a v1 store with string version', () => {
      const v1 = {
        version: '1.0',
        signals: [
          {
            id: 'sig-a',
            pattern: 'p',
            category: 'c',
            description: 'd',
            incrementIds: ['0650'],
            firstSeen: '2026-04-10T00:00:00Z',
            lastSeen: '2026-04-10T00:00:00Z',
            confidence: 1,
            evidence: [],
            suggested: false,
            declined: false,
            generated: false,
          },
        ],
      };
      expect(isV1(v1)).toBe(true);
    });

    it('returns false for a v2 store', () => {
      expect(isV1(EMPTY_SIGNAL_FILE)).toBe(false);
    });

    it('returns false for random garbage', () => {
      expect(isV1(null)).toBe(false);
      expect(isV1({})).toBe(false);
      expect(isV1({ signals: [] })).toBe(false);
    });
  });

  describe('migrateV1toV2()', () => {
    it('migrates a v1 store with 3 generation signals without data loss', () => {
      const v1 = {
        version: '1.0',
        signals: [
          {
            id: 'sig-a',
            pattern: 'pattern-a',
            category: 'cat-a',
            description: 'desc-a',
            incrementIds: ['0650', '0651'],
            firstSeen: '2026-04-10T00:00:00Z',
            lastSeen: '2026-04-11T00:00:00Z',
            confidence: 0.66,
            evidence: ['ev-a-1', 'ev-a-2'],
            suggested: true,
            declined: false,
            generated: false,
            uniqueSourceFiles: ['src/a.ts', 'src/b.ts'],
          },
          {
            id: 'sig-b',
            pattern: 'pattern-b',
            category: 'cat-b',
            description: 'desc-b',
            incrementIds: ['0652'],
            firstSeen: '2026-04-12T00:00:00Z',
            lastSeen: '2026-04-12T00:00:00Z',
            confidence: 0.33,
            evidence: [],
            suggested: false,
            declined: false,
            generated: false,
          },
          {
            id: 'sig-c',
            pattern: 'pattern-c',
            category: 'cat-c',
            description: 'desc-c',
            incrementIds: ['0653'],
            firstSeen: '2026-04-13T00:00:00Z',
            lastSeen: '2026-04-13T00:00:00Z',
            confidence: 1,
            evidence: ['ev-c'],
            suggested: false,
            declined: true,
            generated: false,
          },
        ],
      };
      const v2 = migrateV1toV2(v1);

      expect(v2.schemaVersion).toBe(2);
      expect(v2.signals).toHaveLength(3);

      // Every original field is preserved; `type: "generation"` is added.
      for (let i = 0; i < 3; i++) {
        const src = v1.signals[i];
        const dst = v2.signals[i] as GenerationSignal;
        expect(dst.type).toBe('generation');
        expect(dst.id).toBe(src.id);
        expect(dst.pattern).toBe(src.pattern);
        expect(dst.category).toBe(src.category);
        expect(dst.description).toBe(src.description);
        expect(dst.incrementIds).toEqual(src.incrementIds);
        expect(dst.firstSeen).toBe(src.firstSeen);
        expect(dst.lastSeen).toBe(src.lastSeen);
        expect(dst.confidence).toBe(src.confidence);
        expect(dst.evidence).toEqual(src.evidence);
        expect(dst.suggested).toBe(src.suggested);
        expect(dst.declined).toBe(src.declined);
        expect(dst.generated).toBe(src.generated);
      }

      expect((v2.signals[0] as GenerationSignal).uniqueSourceFiles).toEqual([
        'src/a.ts',
        'src/b.ts',
      ]);
      expect((v2.signals[1] as GenerationSignal).uniqueSourceFiles).toBeUndefined();

      // Round-trip through the v2 validator.
      expect(SignalFileSchema.parse(v2)).toEqual(v2);
    });

    it('migrates an empty v1 store to an empty v2 file', () => {
      const v2 = migrateV1toV2({ version: '1.0', signals: [] });
      expect(v2).toEqual(EMPTY_SIGNAL_FILE);
    });

    it('does not mutate the input v1 arrays', () => {
      const v1 = {
        version: '1.0',
        signals: [
          {
            id: 'sig-a',
            pattern: 'p',
            category: 'c',
            description: 'd',
            incrementIds: ['0650'],
            firstSeen: '2026-04-10T00:00:00Z',
            lastSeen: '2026-04-10T00:00:00Z',
            confidence: 1,
            evidence: ['e'],
            suggested: false,
            declined: false,
            generated: false,
            uniqueSourceFiles: ['src/a.ts'],
          },
        ],
      };
      const v2 = migrateV1toV2(v1);
      (v2.signals[0] as GenerationSignal).incrementIds.push('mutated');
      expect(v1.signals[0].incrementIds).toEqual(['0650']);
    });
  });

  describe('GenerationSignalSchema', () => {
    it('rejects an entry missing type discriminator', () => {
      const legacy = {
        id: 'sig-a',
        pattern: 'p',
        category: 'c',
        description: 'd',
        incrementIds: ['0650'],
        firstSeen: '2026-04-10T00:00:00Z',
        lastSeen: '2026-04-10T00:00:00Z',
        confidence: 1,
        evidence: [],
        suggested: false,
        declined: false,
        generated: false,
      };
      expect(GenerationSignalSchema.safeParse(legacy).success).toBe(false);
    });
  });
});
