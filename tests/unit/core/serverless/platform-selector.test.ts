/**
 * Unit tests for platform-selector.ts
 *
 * Tests exported function:
 * - selectPlatforms: ranks serverless platforms based on criteria
 *
 * Tests internal scoring functions via observable behavior:
 * - scorePetProject: free tier, docs, community, portability, Firebase/Supabase bonuses
 * - scoreStartup: startup credits, integrations, free tier compute, AWS/GCP bonuses
 * - scoreEnterprise: community, docs, features, AWS/Azure/GCP bonuses
 * - scoreEcosystem: ecosystem preference matching
 * - scoreLearning: learning prioritization bonus
 * - generateRationale: rationale text generation
 * - generateTradeoffs: pros/cons generation
 */

import { describe, it, expect } from 'vitest';

import { selectPlatforms } from '../../../../src/core/serverless/platform-selector.js';
import type {
  ServerlessPlatform,
  PlatformKnowledgeBase,
  CloudProvider,
} from '../../../../src/core/serverless/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlatform(overrides: Partial<ServerlessPlatform> = {}): ServerlessPlatform {
  return {
    id: 'test-platform',
    name: 'Test Platform',
    provider: 'AWS',
    pricing: {
      freeTier: {
        requests: 1000000,
        computeGbSeconds: 400000,
        dataTransferGb: 1,
      },
      payAsYouGo: {
        requestsPer1M: 0.2,
        computePerGbSecond: 0.0000166667,
        dataTransferPerGb: 0.09,
      },
    },
    features: {
      runtimes: ['nodejs', 'python', 'java', 'go', 'csharp', 'ruby', 'rust'],
      coldStartMs: 200,
      maxExecutionMinutes: 15,
      maxMemoryMb: 10240,
    },
    ecosystem: {
      integrations: Array.from({ length: 20 }, (_, i) => `integration-${i}`),
      sdks: ['sdk-1'],
      communitySize: 'very-large',
      documentation: 'excellent',
    },
    lockIn: {
      portability: 'medium',
      migrationComplexity: 'medium',
      vendorLockIn: 'Moderate',
    },
    startupPrograms: [
      {
        name: 'AWS Activate',
        credits: 100000,
        duration: '2 years',
      },
    ],
    lastVerified: '2026-01-01',
    ...overrides,
  };
}

function makeKnowledgeBase(platforms: ServerlessPlatform[]): PlatformKnowledgeBase {
  const map = new Map<string, ServerlessPlatform>();
  for (const p of platforms) {
    map.set(p.id, p);
  }
  return {
    platforms: map,
    lastUpdated: '2026-01-01',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('platform-selector', () => {
  // =========================================================================
  // selectPlatforms - basic structure
  // =========================================================================

  describe('selectPlatforms - result structure', () => {
    it('should return ranked platforms sorted by score descending', () => {
      const kb = makeKnowledgeBase([
        makePlatform({ id: 'a', name: 'Platform A' }),
        makePlatform({ id: 'b', name: 'Platform B' }),
      ]);

      const result = selectPlatforms(kb, { context: 'pet-project' });

      expect(result.rankedPlatforms).toHaveLength(2);
      expect(result.rankedPlatforms[0].score).toBeGreaterThanOrEqual(result.rankedPlatforms[1].score);
    });

    it('should set recommendedPlatform to highest-scoring platform', () => {
      const kb = makeKnowledgeBase([
        makePlatform({ id: 'a', name: 'Platform A' }),
      ]);

      const result = selectPlatforms(kb, { context: 'pet-project' });

      expect(result.recommendedPlatform).toBeDefined();
      expect(result.recommendedPlatform.platform.id).toBe('a');
    });

    it('should include context in result', () => {
      const kb = makeKnowledgeBase([makePlatform()]);

      const result = selectPlatforms(kb, { context: 'startup' });

      expect(result.context).toBe('startup');
    });

    it('should include rationale and tradeoffs for each platform', () => {
      const kb = makeKnowledgeBase([makePlatform()]);

      const result = selectPlatforms(kb, { context: 'pet-project' });

      const ranking = result.rankedPlatforms[0];
      expect(typeof ranking.rationale).toBe('string');
      expect(ranking.rationale.length).toBeGreaterThan(0);
      expect(ranking.tradeoffs).toBeDefined();
      expect(Array.isArray(ranking.tradeoffs.pros)).toBe(true);
      expect(Array.isArray(ranking.tradeoffs.cons)).toBe(true);
    });

    it('should clamp scores between 0 and 100', () => {
      const kb = makeKnowledgeBase([makePlatform()]);

      const result = selectPlatforms(kb, { context: 'enterprise' });

      for (const ranking of result.rankedPlatforms) {
        expect(ranking.score).toBeGreaterThanOrEqual(0);
        expect(ranking.score).toBeLessThanOrEqual(100);
      }
    });
  });

  // =========================================================================
  // Pet project scoring
  // =========================================================================

  describe('pet-project scoring', () => {
    it('should score higher for generous free tier (>= 1M requests)', () => {
      const generousPlatform = makePlatform({
        id: 'generous',
        pricing: {
          freeTier: { requests: 1000000, computeGbSeconds: 100, dataTransferGb: 1 },
          payAsYouGo: { requestsPer1M: 0.2, computePerGbSecond: 0.0001, dataTransferPerGb: 0.09 },
        },
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });
      const stingyPlatform = makePlatform({
        id: 'stingy',
        pricing: {
          freeTier: { requests: 100000, computeGbSeconds: 100, dataTransferGb: 1 },
          payAsYouGo: { requestsPer1M: 0.2, computePerGbSecond: 0.0001, dataTransferPerGb: 0.09 },
        },
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });

      const kb = makeKnowledgeBase([generousPlatform, stingyPlatform]);
      const result = selectPlatforms(kb, { context: 'pet-project' });

      const generousRank = result.rankedPlatforms.find((r) => r.platform.id === 'generous')!;
      const stingyRank = result.rankedPlatforms.find((r) => r.platform.id === 'stingy')!;

      expect(generousRank.score).toBeGreaterThan(stingyRank.score);
    });

    it('should give bonus for excellent documentation', () => {
      const excellentDocs = makePlatform({
        id: 'good-docs',
        ecosystem: { integrations: [], sdks: [], communitySize: 'small', documentation: 'excellent' },
        startupPrograms: [],
      });
      const poorDocs = makePlatform({
        id: 'poor-docs',
        ecosystem: { integrations: [], sdks: [], communitySize: 'small', documentation: 'poor' },
        startupPrograms: [],
      });

      const kb = makeKnowledgeBase([excellentDocs, poorDocs]);
      const result = selectPlatforms(kb, { context: 'pet-project' });

      const goodRank = result.rankedPlatforms.find((r) => r.platform.id === 'good-docs')!;
      const poorRank = result.rankedPlatforms.find((r) => r.platform.id === 'poor-docs')!;

      expect(goodRank.score).toBeGreaterThan(poorRank.score);
    });

    it('should give bonus for Firebase platform', () => {
      const firebase = makePlatform({
        id: 'firebase',
        provider: 'Firebase',
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });
      const other = makePlatform({
        id: 'other',
        provider: 'GCP',
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });

      const kb = makeKnowledgeBase([firebase, other]);
      const result = selectPlatforms(kb, { context: 'pet-project' });

      const firebaseRank = result.rankedPlatforms.find((r) => r.platform.id === 'firebase')!;
      const otherRank = result.rankedPlatforms.find((r) => r.platform.id === 'other')!;

      expect(firebaseRank.score).toBeGreaterThan(otherRank.score);
    });

    it('should give bonus for Supabase provider', () => {
      const supabase = makePlatform({
        id: 'supa',
        provider: 'Supabase',
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });
      const other = makePlatform({
        id: 'other',
        provider: 'GCP',
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });

      const kb = makeKnowledgeBase([supabase, other]);
      const result = selectPlatforms(kb, { context: 'pet-project' });

      const supaRank = result.rankedPlatforms.find((r) => r.platform.id === 'supa')!;
      const otherRank = result.rankedPlatforms.find((r) => r.platform.id === 'other')!;

      expect(supaRank.score).toBeGreaterThan(otherRank.score);
    });

    it('should give bonus for high portability', () => {
      const portable = makePlatform({
        id: 'portable',
        lockIn: { portability: 'high', migrationComplexity: 'low', vendorLockIn: 'Low' },
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });
      const locked = makePlatform({
        id: 'locked',
        lockIn: { portability: 'low', migrationComplexity: 'high', vendorLockIn: 'High' },
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });

      const kb = makeKnowledgeBase([portable, locked]);
      const result = selectPlatforms(kb, { context: 'pet-project' });

      const portableRank = result.rankedPlatforms.find((r) => r.platform.id === 'portable')!;
      const lockedRank = result.rankedPlatforms.find((r) => r.platform.id === 'locked')!;

      expect(portableRank.score).toBeGreaterThan(lockedRank.score);
    });

    it('should give bonus for free tier with 500K+ requests', () => {
      const midTier = makePlatform({
        id: 'mid',
        pricing: {
          freeTier: { requests: 500000, computeGbSeconds: 100, dataTransferGb: 1 },
          payAsYouGo: { requestsPer1M: 0.2, computePerGbSecond: 0.0001, dataTransferPerGb: 0.09 },
        },
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });
      const lowTier = makePlatform({
        id: 'low',
        pricing: {
          freeTier: { requests: 100000, computeGbSeconds: 100, dataTransferGb: 1 },
          payAsYouGo: { requestsPer1M: 0.2, computePerGbSecond: 0.0001, dataTransferPerGb: 0.09 },
        },
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });

      const kb = makeKnowledgeBase([midTier, lowTier]);
      const result = selectPlatforms(kb, { context: 'pet-project' });

      const midRank = result.rankedPlatforms.find((r) => r.platform.id === 'mid')!;
      const lowRank = result.rankedPlatforms.find((r) => r.platform.id === 'low')!;

      expect(midRank.score).toBeGreaterThan(lowRank.score);
    });
  });

  // =========================================================================
  // Startup scoring
  // =========================================================================

  describe('startup scoring', () => {
    it('should give large bonus for startup credits when prioritized', () => {
      const withCredits = makePlatform({ id: 'credits', startupPrograms: [{ name: 'Program', credits: 50000, duration: '1 year' }] });
      const noCredits = makePlatform({ id: 'no-credits', startupPrograms: [] });

      const kb = makeKnowledgeBase([withCredits, noCredits]);
      const result = selectPlatforms(kb, {
        context: 'startup',
        prioritizeStartupCredits: true,
      });

      const creditsRank = result.rankedPlatforms.find((r) => r.platform.id === 'credits')!;
      const noCreditsRank = result.rankedPlatforms.find((r) => r.platform.id === 'no-credits')!;

      expect(creditsRank.score).toBeGreaterThan(noCreditsRank.score);
    });

    it('should give smaller bonus for startup credits without priority flag', () => {
      const withCredits = makePlatform({
        id: 'credits',
        startupPrograms: [{ name: 'Program', credits: 50000, duration: '1 year' }],
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
      });

      const kb = makeKnowledgeBase([withCredits]);

      const withPriority = selectPlatforms(kb, { context: 'startup', prioritizeStartupCredits: true });
      const withoutPriority = selectPlatforms(kb, { context: 'startup', prioritizeStartupCredits: false });

      expect(withPriority.rankedPlatforms[0].score).toBeGreaterThan(
        withoutPriority.rankedPlatforms[0].score
      );
    });

    it('should give bonus for many integrations (>15)', () => {
      const manyIntegrations = makePlatform({
        id: 'many',
        ecosystem: { integrations: Array.from({ length: 16 }, (_, i) => `int-${i}`), sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });
      const fewIntegrations = makePlatform({
        id: 'few',
        ecosystem: { integrations: ['int-1', 'int-2'], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });

      const kb = makeKnowledgeBase([manyIntegrations, fewIntegrations]);
      const result = selectPlatforms(kb, { context: 'startup' });

      const manyRank = result.rankedPlatforms.find((r) => r.platform.id === 'many')!;
      const fewRank = result.rankedPlatforms.find((r) => r.platform.id === 'few')!;

      expect(manyRank.score).toBeGreaterThan(fewRank.score);
    });

    it('should give bonus for generous free tier compute (>= 400K GB-seconds)', () => {
      const generous = makePlatform({
        id: 'generous',
        pricing: {
          freeTier: { requests: 100, computeGbSeconds: 400000, dataTransferGb: 1 },
          payAsYouGo: { requestsPer1M: 0.2, computePerGbSecond: 0.0001, dataTransferPerGb: 0.09 },
        },
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });
      const stingy = makePlatform({
        id: 'stingy',
        pricing: {
          freeTier: { requests: 100, computeGbSeconds: 100, dataTransferGb: 1 },
          payAsYouGo: { requestsPer1M: 0.2, computePerGbSecond: 0.0001, dataTransferPerGb: 0.09 },
        },
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });

      const kb = makeKnowledgeBase([generous, stingy]);
      const result = selectPlatforms(kb, { context: 'startup' });

      const generousRank = result.rankedPlatforms.find((r) => r.platform.id === 'generous')!;
      const stingyRank = result.rankedPlatforms.find((r) => r.platform.id === 'stingy')!;

      expect(generousRank.score).toBeGreaterThan(stingyRank.score);
    });

    it('should give bonus for AWS and GCP providers', () => {
      const aws = makePlatform({ id: 'aws', provider: 'AWS', ecosystem: { integrations: [], sdks: [], communitySize: 'small' }, startupPrograms: [] });
      const azure = makePlatform({ id: 'azure', provider: 'Azure', ecosystem: { integrations: [], sdks: [], communitySize: 'small' }, startupPrograms: [] });

      const kb = makeKnowledgeBase([aws, azure]);
      const result = selectPlatforms(kb, { context: 'startup' });

      const awsRank = result.rankedPlatforms.find((r) => r.platform.id === 'aws')!;
      const azureRank = result.rankedPlatforms.find((r) => r.platform.id === 'azure')!;

      expect(awsRank.score).toBeGreaterThan(azureRank.score);
    });
  });

  // =========================================================================
  // Enterprise scoring
  // =========================================================================

  describe('enterprise scoring', () => {
    it('should give bonus for very-large community', () => {
      const large = makePlatform({
        id: 'large',
        ecosystem: { integrations: [], sdks: [], communitySize: 'very-large' },
        startupPrograms: [],
      });
      const small = makePlatform({
        id: 'small',
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });

      const kb = makeKnowledgeBase([large, small]);
      const result = selectPlatforms(kb, { context: 'enterprise' });

      const largeRank = result.rankedPlatforms.find((r) => r.platform.id === 'large')!;
      const smallRank = result.rankedPlatforms.find((r) => r.platform.id === 'small')!;

      expect(largeRank.score).toBeGreaterThan(smallRank.score);
    });

    it('should give bonus for high memory (>= 8192 MB)', () => {
      const highMem = makePlatform({
        id: 'high-mem',
        features: { runtimes: ['nodejs'], coldStartMs: 200, maxExecutionMinutes: 15, maxMemoryMb: 10240 },
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });
      const lowMem = makePlatform({
        id: 'low-mem',
        features: { runtimes: ['nodejs'], coldStartMs: 200, maxExecutionMinutes: 15, maxMemoryMb: 512 },
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });

      const kb = makeKnowledgeBase([highMem, lowMem]);
      const result = selectPlatforms(kb, { context: 'enterprise' });

      const highRank = result.rankedPlatforms.find((r) => r.platform.id === 'high-mem')!;
      const lowRank = result.rankedPlatforms.find((r) => r.platform.id === 'low-mem')!;

      expect(highRank.score).toBeGreaterThan(lowRank.score);
    });

    it('should give bonus for long execution time (>= 15 min)', () => {
      const longExec = makePlatform({
        id: 'long',
        features: { runtimes: ['nodejs'], coldStartMs: 200, maxExecutionMinutes: 15, maxMemoryMb: 512 },
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });
      const shortExec = makePlatform({
        id: 'short',
        features: { runtimes: ['nodejs'], coldStartMs: 200, maxExecutionMinutes: 5, maxMemoryMb: 512 },
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });

      const kb = makeKnowledgeBase([longExec, shortExec]);
      const result = selectPlatforms(kb, { context: 'enterprise' });

      const longRank = result.rankedPlatforms.find((r) => r.platform.id === 'long')!;
      const shortRank = result.rankedPlatforms.find((r) => r.platform.id === 'short')!;

      expect(longRank.score).toBeGreaterThan(shortRank.score);
    });

    it('should give highest bonus for AWS provider', () => {
      const aws = makePlatform({ id: 'aws', provider: 'AWS', ecosystem: { integrations: [], sdks: [], communitySize: 'small' }, startupPrograms: [] });
      const firebase = makePlatform({ id: 'fb', provider: 'Firebase', ecosystem: { integrations: [], sdks: [], communitySize: 'small' }, startupPrograms: [] });

      const kb = makeKnowledgeBase([aws, firebase]);
      const result = selectPlatforms(kb, { context: 'enterprise' });

      const awsRank = result.rankedPlatforms.find((r) => r.platform.id === 'aws')!;
      const fbRank = result.rankedPlatforms.find((r) => r.platform.id === 'fb')!;

      expect(awsRank.score).toBeGreaterThan(fbRank.score);
    });

    it('should give bonus for Azure and GCP providers', () => {
      const azure = makePlatform({ id: 'azure', provider: 'Azure', ecosystem: { integrations: [], sdks: [], communitySize: 'small' }, startupPrograms: [] });
      const gcp = makePlatform({ id: 'gcp', provider: 'GCP', ecosystem: { integrations: [], sdks: [], communitySize: 'small' }, startupPrograms: [] });
      const firebase = makePlatform({ id: 'fb', provider: 'Firebase', ecosystem: { integrations: [], sdks: [], communitySize: 'small' }, startupPrograms: [] });

      const kb = makeKnowledgeBase([azure, gcp, firebase]);
      const result = selectPlatforms(kb, { context: 'enterprise' });

      const azureRank = result.rankedPlatforms.find((r) => r.platform.id === 'azure')!;
      const gcpRank = result.rankedPlatforms.find((r) => r.platform.id === 'gcp')!;
      const fbRank = result.rankedPlatforms.find((r) => r.platform.id === 'fb')!;

      expect(azureRank.score).toBeGreaterThan(fbRank.score);
      expect(gcpRank.score).toBeGreaterThan(fbRank.score);
    });
  });

  // =========================================================================
  // Ecosystem preference
  // =========================================================================

  describe('ecosystem preference', () => {
    it('should strongly prefer AWS when ecosystem is aws', () => {
      const aws = makePlatform({ id: 'aws', provider: 'AWS', ecosystem: { integrations: [], sdks: [], communitySize: 'small' }, startupPrograms: [] });
      const gcp = makePlatform({ id: 'gcp', provider: 'GCP', ecosystem: { integrations: [], sdks: [], communitySize: 'small' }, startupPrograms: [] });

      const kb = makeKnowledgeBase([aws, gcp]);
      const result = selectPlatforms(kb, { context: 'pet-project', preferredEcosystem: 'aws' });

      expect(result.recommendedPlatform.platform.id).toBe('aws');
    });

    it('should strongly prefer Azure when ecosystem is azure', () => {
      const azure = makePlatform({ id: 'azure', provider: 'Azure', ecosystem: { integrations: [], sdks: [], communitySize: 'small' }, startupPrograms: [] });
      const aws = makePlatform({ id: 'aws', provider: 'AWS', ecosystem: { integrations: [], sdks: [], communitySize: 'small' }, startupPrograms: [] });

      const kb = makeKnowledgeBase([azure, aws]);
      const result = selectPlatforms(kb, { context: 'pet-project', preferredEcosystem: 'azure' });

      expect(result.recommendedPlatform.platform.id).toBe('azure');
    });

    it('should strongly prefer GCP when ecosystem is gcp', () => {
      const gcp = makePlatform({ id: 'gcp', provider: 'GCP', ecosystem: { integrations: [], sdks: [], communitySize: 'small' }, startupPrograms: [] });
      const aws = makePlatform({ id: 'aws', provider: 'AWS', ecosystem: { integrations: [], sdks: [], communitySize: 'small' }, startupPrograms: [] });

      const kb = makeKnowledgeBase([gcp, aws]);
      const result = selectPlatforms(kb, { context: 'pet-project', preferredEcosystem: 'gcp' });

      expect(result.recommendedPlatform.platform.id).toBe('gcp');
    });

    it('should prefer Supabase when ecosystem is open-source', () => {
      const supabase = makePlatform({ id: 'supa', provider: 'Supabase', ecosystem: { integrations: [], sdks: [], communitySize: 'small' }, startupPrograms: [] });
      const aws = makePlatform({ id: 'aws', provider: 'AWS', ecosystem: { integrations: [], sdks: [], communitySize: 'small' }, startupPrograms: [] });

      const kb = makeKnowledgeBase([supabase, aws]);
      const result = selectPlatforms(kb, { context: 'pet-project', preferredEcosystem: 'open-source' });

      expect(result.recommendedPlatform.platform.id).toBe('supa');
    });

    it('should prefer Firebase when ecosystem is mobile', () => {
      const firebase = makePlatform({ id: 'firebase', provider: 'Firebase', ecosystem: { integrations: [], sdks: [], communitySize: 'small' }, startupPrograms: [] });
      const aws = makePlatform({ id: 'aws', provider: 'AWS', ecosystem: { integrations: [], sdks: [], communitySize: 'small' }, startupPrograms: [] });

      const kb = makeKnowledgeBase([firebase, aws]);
      const result = selectPlatforms(kb, { context: 'pet-project', preferredEcosystem: 'mobile' });

      expect(result.recommendedPlatform.platform.id).toBe('firebase');
    });

    it('should give 0 bonus for unknown ecosystem', () => {
      const aws = makePlatform({ id: 'aws', provider: 'AWS', ecosystem: { integrations: [], sdks: [], communitySize: 'small' }, startupPrograms: [] });

      const kb = makeKnowledgeBase([aws]);

      const withUnknown = selectPlatforms(kb, { context: 'pet-project', preferredEcosystem: 'unknown' as any });
      const withoutPref = selectPlatforms(kb, { context: 'pet-project' });

      expect(withUnknown.rankedPlatforms[0].score).toBe(withoutPref.rankedPlatforms[0].score);
    });
  });

  // =========================================================================
  // Runtime requirement
  // =========================================================================

  describe('runtime requirement', () => {
    it('should add score when required runtime is available', () => {
      const platform = makePlatform({
        id: 'p1',
        features: { runtimes: ['nodejs', 'python'], coldStartMs: 200, maxExecutionMinutes: 15, maxMemoryMb: 1024 },
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });

      const kb = makeKnowledgeBase([platform]);

      const withRuntime = selectPlatforms(kb, { context: 'pet-project', runtimeRequired: 'nodejs' });
      const withoutRuntime = selectPlatforms(kb, { context: 'pet-project' });

      expect(withRuntime.rankedPlatforms[0].score).toBeGreaterThan(
        withoutRuntime.rankedPlatforms[0].score
      );
    });

    it('should subtract score when required runtime is missing', () => {
      const platform = makePlatform({
        id: 'p1',
        features: { runtimes: ['nodejs'], coldStartMs: 200, maxExecutionMinutes: 15, maxMemoryMb: 1024 },
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });

      const kb = makeKnowledgeBase([platform]);

      const missingRuntime = selectPlatforms(kb, { context: 'pet-project', runtimeRequired: 'rust' });
      const noRequirement = selectPlatforms(kb, { context: 'pet-project' });

      expect(missingRuntime.rankedPlatforms[0].score).toBeLessThan(
        noRequirement.rankedPlatforms[0].score
      );
    });

    it('should do case-insensitive runtime matching', () => {
      const platform = makePlatform({
        id: 'p1',
        features: { runtimes: ['NodeJS'], coldStartMs: 200, maxExecutionMinutes: 15, maxMemoryMb: 1024 },
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });

      const kb = makeKnowledgeBase([platform]);

      const result = selectPlatforms(kb, { context: 'pet-project', runtimeRequired: 'nodejs' });

      // Should find the runtime (case insensitive), so score should be higher than without
      const noRuntime = selectPlatforms(kb, { context: 'pet-project' });
      expect(result.rankedPlatforms[0].score).toBeGreaterThan(noRuntime.rankedPlatforms[0].score);
    });
  });

  // =========================================================================
  // Learning prioritization
  // =========================================================================

  describe('learning prioritization', () => {
    it('should give bonus when prioritizeLearning is true', () => {
      const platform = makePlatform({
        id: 'p1',
        ecosystem: { integrations: [], sdks: [], communitySize: 'very-large', documentation: 'excellent' },
        startupPrograms: [],
      });

      const kb = makeKnowledgeBase([platform]);

      const withLearning = selectPlatforms(kb, { context: 'pet-project', prioritizeLearning: true });
      const withoutLearning = selectPlatforms(kb, { context: 'pet-project', prioritizeLearning: false });

      expect(withLearning.rankedPlatforms[0].score).toBeGreaterThan(
        withoutLearning.rankedPlatforms[0].score
      );
    });

    it('should give extra learning bonus for Firebase', () => {
      const firebase = makePlatform({
        id: 'firebase',
        provider: 'Firebase',
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });
      const other = makePlatform({
        id: 'other',
        provider: 'GCP',
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });

      const kb = makeKnowledgeBase([firebase, other]);
      const result = selectPlatforms(kb, { context: 'pet-project', prioritizeLearning: true });

      const firebaseRank = result.rankedPlatforms.find((r) => r.platform.id === 'firebase')!;
      const otherRank = result.rankedPlatforms.find((r) => r.platform.id === 'other')!;

      expect(firebaseRank.score).toBeGreaterThan(otherRank.score);
    });

    it('should give extra learning bonus for Supabase', () => {
      const supabase = makePlatform({
        id: 'supa',
        provider: 'Supabase',
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });
      const other = makePlatform({
        id: 'other',
        provider: 'GCP',
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
        startupPrograms: [],
      });

      const kb = makeKnowledgeBase([supabase, other]);
      const result = selectPlatforms(kb, { context: 'pet-project', prioritizeLearning: true });

      const supaRank = result.rankedPlatforms.find((r) => r.platform.id === 'supa')!;
      const otherRank = result.rankedPlatforms.find((r) => r.platform.id === 'other')!;

      expect(supaRank.score).toBeGreaterThan(otherRank.score);
    });
  });

  // =========================================================================
  // Rationale generation
  // =========================================================================

  describe('rationale generation', () => {
    it('should include free tier info for pet-project context', () => {
      const platform = makePlatform();
      const kb = makeKnowledgeBase([platform]);

      const result = selectPlatforms(kb, { context: 'pet-project' });

      expect(result.rankedPlatforms[0].rationale).toContain('requests/month');
      expect(result.rankedPlatforms[0].rationale).toContain('Documentation');
    });

    it('should include startup credits for startup context', () => {
      const platform = makePlatform({
        startupPrograms: [{ name: 'Program', credits: 50000, duration: '1 year' }],
      });
      const kb = makeKnowledgeBase([platform]);

      const result = selectPlatforms(kb, { context: 'startup' });

      expect(result.rankedPlatforms[0].rationale).toContain('Startup credits');
      expect(result.rankedPlatforms[0].rationale).toContain('$50000');
    });

    it('should include integrations count for startup context', () => {
      const platform = makePlatform();
      const kb = makeKnowledgeBase([platform]);

      const result = selectPlatforms(kb, { context: 'startup' });

      expect(result.rankedPlatforms[0].rationale).toContain('integrations available');
    });

    it('should include max memory and execution for enterprise context', () => {
      const platform = makePlatform();
      const kb = makeKnowledgeBase([platform]);

      const result = selectPlatforms(kb, { context: 'enterprise' });

      expect(result.rankedPlatforms[0].rationale).toContain('Max memory');
      expect(result.rankedPlatforms[0].rationale).toContain('Max execution');
    });

    it('should handle startup context without startup programs', () => {
      const platform = makePlatform({ startupPrograms: [] });
      const kb = makeKnowledgeBase([platform]);

      const result = selectPlatforms(kb, { context: 'startup' });

      expect(result.rankedPlatforms[0].rationale).not.toContain('Startup credits');
    });
  });

  // =========================================================================
  // Tradeoffs generation
  // =========================================================================

  describe('tradeoffs generation', () => {
    it('should list high portability as pro', () => {
      const platform = makePlatform({
        lockIn: { portability: 'high', migrationComplexity: 'low', vendorLockIn: 'Low' },
      });
      const kb = makeKnowledgeBase([platform]);

      const result = selectPlatforms(kb, { context: 'pet-project' });

      expect(result.rankedPlatforms[0].tradeoffs.pros).toContain(
        'High portability - easy to migrate to other platforms'
      );
    });

    it('should list low portability as con', () => {
      const platform = makePlatform({
        lockIn: { portability: 'low', migrationComplexity: 'high', vendorLockIn: 'High' },
      });
      const kb = makeKnowledgeBase([platform]);

      const result = selectPlatforms(kb, { context: 'pet-project' });

      expect(result.rankedPlatforms[0].tradeoffs.cons).toContain(
        'Low portability - significant vendor lock-in'
      );
    });

    it('should list excellent documentation as pro', () => {
      const platform = makePlatform({
        ecosystem: { integrations: [], sdks: [], communitySize: 'small', documentation: 'excellent' },
      });
      const kb = makeKnowledgeBase([platform]);

      const result = selectPlatforms(kb, { context: 'pet-project' });

      expect(result.rankedPlatforms[0].tradeoffs.pros).toContain(
        'Excellent documentation and learning resources'
      );
    });

    it('should list very-large community as pro', () => {
      const platform = makePlatform({
        ecosystem: { integrations: [], sdks: [], communitySize: 'very-large' },
      });
      const kb = makeKnowledgeBase([platform]);

      const result = selectPlatforms(kb, { context: 'pet-project' });

      expect(result.rankedPlatforms[0].tradeoffs.pros).toContain(
        'Very large community for troubleshooting and support'
      );
    });

    it('should list small community as con', () => {
      const platform = makePlatform({
        ecosystem: { integrations: [], sdks: [], communitySize: 'small' },
      });
      const kb = makeKnowledgeBase([platform]);

      const result = selectPlatforms(kb, { context: 'pet-project' });

      expect(result.rankedPlatforms[0].tradeoffs.cons).toContain(
        'Smaller community - fewer resources and examples'
      );
    });

    it('should list generous free tier as pro', () => {
      const platform = makePlatform({
        pricing: {
          freeTier: { requests: 1000000, computeGbSeconds: 400000, dataTransferGb: 1 },
          payAsYouGo: { requestsPer1M: 0.2, computePerGbSecond: 0.0001, dataTransferPerGb: 0.09 },
        },
      });
      const kb = makeKnowledgeBase([platform]);

      const result = selectPlatforms(kb, { context: 'pet-project' });

      expect(result.rankedPlatforms[0].tradeoffs.pros).toContain('Generous free tier');
    });

    it('should list startup credits as pro for startup context', () => {
      const platform = makePlatform({
        startupPrograms: [{ name: 'Program', credits: 10000, duration: '1 year' }],
      });
      const kb = makeKnowledgeBase([platform]);

      const result = selectPlatforms(kb, { context: 'startup' });

      expect(result.rankedPlatforms[0].tradeoffs.pros.some((p) => p.includes('Startup credits'))).toBe(true);
    });

    it('should not list startup credits for non-startup context', () => {
      const platform = makePlatform({
        startupPrograms: [{ name: 'Program', credits: 10000, duration: '1 year' }],
      });
      const kb = makeKnowledgeBase([platform]);

      const result = selectPlatforms(kb, { context: 'pet-project' });

      expect(result.rankedPlatforms[0].tradeoffs.pros.some((p) => p.includes('Startup credits'))).toBe(false);
    });

    it('should list fast cold starts (< 200ms) as pro', () => {
      const platform = makePlatform({
        features: { runtimes: ['nodejs'], coldStartMs: 100, maxExecutionMinutes: 15, maxMemoryMb: 1024 },
      });
      const kb = makeKnowledgeBase([platform]);

      const result = selectPlatforms(kb, { context: 'pet-project' });

      expect(result.rankedPlatforms[0].tradeoffs.pros.some((p) => p.includes('Fast cold starts'))).toBe(true);
    });

    it('should list slow cold starts (> 400ms) as con', () => {
      const platform = makePlatform({
        features: { runtimes: ['nodejs'], coldStartMs: 500, maxExecutionMinutes: 15, maxMemoryMb: 1024 },
      });
      const kb = makeKnowledgeBase([platform]);

      const result = selectPlatforms(kb, { context: 'pet-project' });

      expect(result.rankedPlatforms[0].tradeoffs.cons.some((c) => c.includes('Slower cold starts'))).toBe(true);
    });

    it('should list wide runtime support as pro', () => {
      const platform = makePlatform({
        features: {
          runtimes: ['nodejs', 'python', 'java', 'go', 'csharp', 'ruby', 'rust'],
          coldStartMs: 200,
          maxExecutionMinutes: 15,
          maxMemoryMb: 1024,
        },
      });
      const kb = makeKnowledgeBase([platform]);

      const result = selectPlatforms(kb, { context: 'pet-project' });

      expect(result.rankedPlatforms[0].tradeoffs.pros.some((p) => p.includes('runtime support'))).toBe(true);
    });

    it('should not list runtime support pro when fewer than 7 runtimes', () => {
      const platform = makePlatform({
        features: { runtimes: ['nodejs', 'python'], coldStartMs: 200, maxExecutionMinutes: 15, maxMemoryMb: 1024 },
      });
      const kb = makeKnowledgeBase([platform]);

      const result = selectPlatforms(kb, { context: 'pet-project' });

      expect(result.rankedPlatforms[0].tradeoffs.pros.some((p) => p.includes('runtime support'))).toBe(false);
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe('edge cases', () => {
    it('should handle empty knowledge base', () => {
      const kb = makeKnowledgeBase([]);

      const result = selectPlatforms(kb, { context: 'pet-project' });

      expect(result.rankedPlatforms).toHaveLength(0);
    });

    it('should handle single platform', () => {
      const kb = makeKnowledgeBase([makePlatform()]);

      const result = selectPlatforms(kb, { context: 'pet-project' });

      expect(result.rankedPlatforms).toHaveLength(1);
      expect(result.recommendedPlatform).toBeDefined();
    });

    it('should handle medium portability (no pro or con)', () => {
      const platform = makePlatform({
        lockIn: { portability: 'medium', migrationComplexity: 'medium', vendorLockIn: 'Moderate' },
        ecosystem: { integrations: [], sdks: [], communitySize: 'medium' },
        features: { runtimes: ['nodejs'], coldStartMs: 300, maxExecutionMinutes: 5, maxMemoryMb: 256 },
        startupPrograms: [],
        pricing: {
          freeTier: { requests: 100, computeGbSeconds: 100, dataTransferGb: 1 },
          payAsYouGo: { requestsPer1M: 0.2, computePerGbSecond: 0.0001, dataTransferPerGb: 0.09 },
        },
      });
      const kb = makeKnowledgeBase([platform]);

      const result = selectPlatforms(kb, { context: 'pet-project' });

      // Medium portability generates neither pro nor con for portability
      expect(result.rankedPlatforms[0].tradeoffs.pros.some((p) => p.includes('portability'))).toBe(false);
      expect(result.rankedPlatforms[0].tradeoffs.cons.some((c) => c.includes('portability'))).toBe(false);
    });

    it('should handle medium integrations count (10-15) for startup', () => {
      const platform = makePlatform({
        ecosystem: {
          integrations: Array.from({ length: 12 }, (_, i) => `int-${i}`),
          sdks: [],
          communitySize: 'small',
        },
        startupPrograms: [],
      });

      const fewPlatform = makePlatform({
        id: 'few',
        ecosystem: {
          integrations: Array.from({ length: 5 }, (_, i) => `int-${i}`),
          sdks: [],
          communitySize: 'small',
        },
        startupPrograms: [],
      });

      const kb = makeKnowledgeBase([platform, fewPlatform]);
      const result = selectPlatforms(kb, { context: 'startup' });

      const midRank = result.rankedPlatforms.find((r) => r.platform.id === 'test-platform')!;
      const fewRank = result.rankedPlatforms.find((r) => r.platform.id === 'few')!;

      // 10-15 integrations gives 10 points, fewer gives 0
      expect(midRank.score).toBeGreaterThan(fewRank.score);
    });
  });
});
