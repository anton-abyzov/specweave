/**
 * Strategy Generator Unit Tests
 *
 * Tests for strategic insight extraction:
 * - Tech debt cataloging
 * - Business domain mapping
 * - Modernization candidate identification
 * - Strategic recommendation generation
 * - Strategy saving to disk
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  generateStrategy,
  saveStrategy,
} from '../../../../../src/core/living-docs/intelligent-analyzer/strategy-generator.js';
import type {
  StrategyResult,
  DomainMapping,
  ModernizationCandidate,
  StrategicRecommendation,
} from '../../../../../src/core/living-docs/intelligent-analyzer/strategy-generator.js';
import type {
  RepoAnalysis,
  TechDebtItem,
} from '../../../../../src/core/living-docs/intelligent-analyzer/types.js';
import type { OrganizationSynthesisResult } from '../../../../../src/core/living-docs/intelligent-analyzer/organization-synthesizer.js';
import type { InconsistencyResult } from '../../../../../src/core/living-docs/intelligent-analyzer/inconsistency-detector.js';

// ---- Helpers ----

function makeRepoAnalysis(overrides: Partial<RepoAnalysis> = {}): RepoAnalysis {
  return {
    name: 'test-repo',
    path: '/repos/test-repo',
    purpose: 'A test repository',
    keyConcepts: ['auth', 'api'],
    mainApis: [],
    patternsUsed: [],
    internalDependencies: [],
    externalDependencies: [],
    filesAnalyzed: 20,
    confidence: 'high',
    analyzedAt: new Date().toISOString(),
    observations: [],
    ...overrides,
  };
}

function makeOrgResult(overrides: Partial<OrganizationSynthesisResult> = {}): OrganizationSynthesisResult {
  return {
    teams: [],
    enhancedTeams: [],
    microservices: [],
    domains: [],
    crossCutting: [],
    hypotheses: [],
    confidence: 'medium',
    ...overrides,
  };
}

function makeInconsistencyResult(overrides: Partial<InconsistencyResult> = {}): InconsistencyResult {
  return {
    issues: [],
    enhancedIssues: [],
    techDebt: [],
    questionsForCTO: [],
    questionsForPO: [],
    byPriority: new Map(),
    brokenLinks: [],
    specCodeGaps: [],
    orphanedDocs: [],
    ...overrides,
  };
}

function noop(): void {}
const noopProgress = () => {};

describe('strategy-generator', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strat-gen-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // =========================================================
  // generateStrategy
  // =========================================================
  describe('generateStrategy', () => {
    it('should return a StrategyResult with all four properties', async () => {
      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('repo-a', makeRepoAnalysis({ name: 'repo-a' }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult(),
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      expect(result).toHaveProperty('techDebtCatalog');
      expect(result).toHaveProperty('domainMap');
      expect(result).toHaveProperty('modernizationCandidates');
      expect(result).toHaveProperty('recommendations');
      expect(Array.isArray(result.techDebtCatalog)).toBe(true);
      expect(Array.isArray(result.domainMap)).toBe(true);
      expect(Array.isArray(result.modernizationCandidates)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should call onProgress with strategy phase', async () => {
      const progressCalls: Array<[string, number, number, string]> = [];
      const onProgress = (phase: string, current: number, total: number, msg: string) => {
        progressCalls.push([phase, current, total, msg]);
      };

      await generateStrategy(
        new Map(),
        makeOrgResult(),
        makeInconsistencyResult(),
        null,
        onProgress,
        noop,
      );

      expect(progressCalls.length).toBeGreaterThanOrEqual(4);
      expect(progressCalls[0][0]).toBe('strategy');
      expect(progressCalls[0][1]).toBe(0);
    });

    it('should call log with phase information', async () => {
      const logs: string[] = [];
      const log = (msg: string) => logs.push(msg);

      await generateStrategy(
        new Map(),
        makeOrgResult(),
        makeInconsistencyResult(),
        null,
        noopProgress,
        log,
      );

      expect(logs.some(l => l.includes('PHASE F'))).toBe(true);
      expect(logs.some(l => l.includes('tech debt'))).toBe(true);
      expect(logs.some(l => l.includes('business domains'))).toBe(true);
      expect(logs.some(l => l.includes('modernization'))).toBe(true);
      expect(logs.some(l => l.includes('strategic recommendations'))).toBe(true);
    });

    // ------ Tech Debt Collection ------

    it('should include tech debt from inconsistency result', async () => {
      const existingDebt: TechDebtItem = {
        id: 'DEBT-001',
        title: 'Existing debt',
        description: 'Already found',
        severity: 'high',
        effort: 'large',
        repos: ['repo-x'],
        category: 'legacy',
      };

      const result = await generateStrategy(
        new Map(),
        makeOrgResult(),
        makeInconsistencyResult({ techDebt: [existingDebt] }),
        null,
        noopProgress,
        noop,
      );

      expect(result.techDebtCatalog).toContainEqual(existingDebt);
    });

    it('should detect outdated patterns as tech debt', async () => {
      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('legacy-repo', makeRepoAnalysis({
        name: 'legacy-repo',
        patternsUsed: [
          { pattern: 'jQuery UI', category: 'frontend', evidence: ['found in code'], confidence: 'high' },
          { pattern: 'Backbone.js views', category: 'frontend', evidence: ['found in code'], confidence: 'high' },
        ],
      }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult(),
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      const outdatedDebt = result.techDebtCatalog.find(d => d.title.includes('legacy-repo'));
      expect(outdatedDebt).toBeDefined();
      expect(outdatedDebt!.category).toBe('legacy');
      expect(outdatedDebt!.description).toContain('jQuery UI');
      expect(outdatedDebt!.description).toContain('Backbone.js views');
    });

    it('should detect callback pattern as outdated', async () => {
      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('cb-repo', makeRepoAnalysis({
        name: 'cb-repo',
        patternsUsed: [
          { pattern: 'callback-based async', category: 'architecture', evidence: [], confidence: 'medium' },
        ],
      }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult(),
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      expect(result.techDebtCatalog.some(d => d.repos.includes('cb-repo') && d.category === 'legacy')).toBe(true);
    });

    it('should detect grunt as outdated', async () => {
      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('grunt-repo', makeRepoAnalysis({
        name: 'grunt-repo',
        patternsUsed: [
          { pattern: 'Grunt task runner', category: 'tooling' as any, evidence: [], confidence: 'medium' },
        ],
      }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult(),
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      expect(result.techDebtCatalog.some(d => d.repos.includes('grunt-repo'))).toBe(true);
    });

    it('should detect bower as outdated', async () => {
      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('bower-repo', makeRepoAnalysis({
        name: 'bower-repo',
        patternsUsed: [
          { pattern: 'Bower package manager', category: 'tooling' as any, evidence: [], confidence: 'low' },
        ],
      }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult(),
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      expect(result.techDebtCatalog.some(d => d.repos.includes('bower-repo'))).toBe(true);
    });

    it('should detect angular.js as outdated', async () => {
      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('angularjs-repo', makeRepoAnalysis({
        name: 'angularjs-repo',
        patternsUsed: [
          { pattern: 'Angular.js controllers', category: 'frontend', evidence: [], confidence: 'high' },
        ],
      }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult(),
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      expect(result.techDebtCatalog.some(d => d.repos.includes('angularjs-repo'))).toBe(true);
    });

    it('should NOT flag modern patterns as outdated', async () => {
      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('modern-repo', makeRepoAnalysis({
        name: 'modern-repo',
        patternsUsed: [
          { pattern: 'React hooks', category: 'frontend', evidence: [], confidence: 'high' },
          { pattern: 'async/await', category: 'architecture', evidence: [], confidence: 'high' },
        ],
      }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult(),
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      expect(result.techDebtCatalog.filter(d => d.repos.includes('modern-repo') && d.category === 'legacy')).toHaveLength(0);
    });

    it('should add missing-tests debt for low-confidence repos with few files', async () => {
      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('small-repo', makeRepoAnalysis({
        name: 'small-repo',
        filesAnalyzed: 3,
        confidence: 'low',
      }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult(),
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      const testDebt = result.techDebtCatalog.find(d =>
        d.repos.includes('small-repo') && d.category === 'missing-tests'
      );
      expect(testDebt).toBeDefined();
      expect(testDebt!.title).toContain('test coverage');
    });

    it('should NOT add missing-tests debt for high-confidence repos', async () => {
      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('good-repo', makeRepoAnalysis({
        name: 'good-repo',
        filesAnalyzed: 3,
        confidence: 'high',
      }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult(),
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      expect(result.techDebtCatalog.filter(d =>
        d.repos.includes('good-repo') && d.category === 'missing-tests'
      )).toHaveLength(0);
    });

    it('should NOT add missing-tests debt for repos with many files', async () => {
      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('big-repo', makeRepoAnalysis({
        name: 'big-repo',
        filesAnalyzed: 50,
        confidence: 'low',
      }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult(),
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      expect(result.techDebtCatalog.filter(d =>
        d.repos.includes('big-repo') && d.category === 'missing-tests'
      )).toHaveLength(0);
    });

    it('should generate unique debt IDs continuing from existing debt', async () => {
      const existingDebt: TechDebtItem[] = [
        { id: 'DEBT-001', title: 'First', description: 'd', severity: 'low', effort: 'small', repos: ['x'], category: 'other' },
        { id: 'DEBT-002', title: 'Second', description: 'd', severity: 'low', effort: 'small', repos: ['x'], category: 'other' },
      ];

      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('repo-with-debt', makeRepoAnalysis({
        name: 'repo-with-debt',
        patternsUsed: [{ pattern: 'jQuery', category: 'frontend', evidence: [], confidence: 'high' }],
      }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult(),
        makeInconsistencyResult({ techDebt: existingDebt }),
        null,
        noopProgress,
        noop,
      );

      // The new debt item should start numbering after existing ones
      const newItems = result.techDebtCatalog.filter(d => !existingDebt.includes(d));
      expect(newItems.length).toBeGreaterThan(0);
      expect(newItems[0].id).toBe('DEBT-003');
    });

    // ------ Domain Mapping ------

    it('should map domains from organization result', async () => {
      const orgResult = makeOrgResult({
        domains: [
          {
            name: 'payments',
            type: 'domain',
            description: 'Payment processing',
            repos: ['pay-api', 'pay-ui'],
            confidence: 'high',
            reasoning: 'based on analysis',
          },
        ],
      });

      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('pay-api', makeRepoAnalysis({ name: 'pay-api', confidence: 'high' }));
      analyses.set('pay-ui', makeRepoAnalysis({ name: 'pay-ui', confidence: 'medium' }));

      const result = await generateStrategy(
        analyses,
        orgResult,
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      expect(result.domainMap).toHaveLength(1);
      expect(result.domainMap[0].domain).toBe('payments');
      expect(result.domainMap[0].repos).toEqual(['pay-api', 'pay-ui']);
    });

    it('should compute healthScore as average confidence', async () => {
      const orgResult = makeOrgResult({
        domains: [{
          name: 'auth',
          type: 'domain',
          description: 'Auth domain',
          repos: ['auth-service'],
          confidence: 'high',
          reasoning: '',
        }],
      });

      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('auth-service', makeRepoAnalysis({ name: 'auth-service', confidence: 'high' }));

      const result = await generateStrategy(
        analyses,
        orgResult,
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      // high = 100
      expect(result.domainMap[0].healthScore).toBe(100);
    });

    it('should compute mixed confidence health score', async () => {
      const orgResult = makeOrgResult({
        domains: [{
          name: 'mixed',
          type: 'domain',
          description: 'Mixed domain',
          repos: ['high-repo', 'low-repo'],
          confidence: 'medium',
          reasoning: '',
        }],
      });

      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('high-repo', makeRepoAnalysis({ name: 'high-repo', confidence: 'high' }));
      analyses.set('low-repo', makeRepoAnalysis({ name: 'low-repo', confidence: 'low' }));

      const result = await generateStrategy(
        analyses,
        orgResult,
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      // (100 + 40) / 2 = 70
      expect(result.domainMap[0].healthScore).toBe(70);
    });

    it('should default healthScore to 50 when no analyses match', async () => {
      const orgResult = makeOrgResult({
        domains: [{
          name: 'orphan',
          type: 'domain',
          description: 'Unknown repos',
          repos: ['missing-repo'],
          confidence: 'low',
          reasoning: '',
        }],
      });

      const result = await generateStrategy(
        new Map(),
        orgResult,
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      expect(result.domainMap[0].healthScore).toBe(50);
    });

    it('should add Low documentation quality concern when average confidence < 60', async () => {
      const orgResult = makeOrgResult({
        domains: [{
          name: 'poor',
          type: 'domain',
          description: 'Poorly documented',
          repos: ['low-repo'],
          confidence: 'low',
          reasoning: '',
        }],
      });

      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('low-repo', makeRepoAnalysis({ name: 'low-repo', confidence: 'low' }));

      const result = await generateStrategy(
        analyses,
        orgResult,
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      // low = 40, which is < 60
      expect(result.domainMap[0].concerns).toContain('Low documentation quality');
    });

    it('should add poorly structured concern when repos have < 3 files', async () => {
      const orgResult = makeOrgResult({
        domains: [{
          name: 'sparse',
          type: 'domain',
          description: 'Sparse repos',
          repos: ['tiny-repo'],
          confidence: 'medium',
          reasoning: '',
        }],
      });

      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('tiny-repo', makeRepoAnalysis({
        name: 'tiny-repo',
        filesAnalyzed: 2,
        confidence: 'medium',
      }));

      const result = await generateStrategy(
        analyses,
        orgResult,
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      expect(result.domainMap[0].concerns).toContain('Some repos poorly structured');
    });

    it('should fall back to concept-based domains when org has none', async () => {
      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('repo-a', makeRepoAnalysis({ name: 'repo-a', keyConcepts: ['auth', 'security', 'tokens'] }));
      analyses.set('repo-b', makeRepoAnalysis({ name: 'repo-b', keyConcepts: ['auth', 'oauth', 'sso'] }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult({ domains: [] }),
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      // "auth" appears in both repos (top-3 concepts), so a domain should be created
      const authDomain = result.domainMap.find(d => d.domain === 'auth');
      expect(authDomain).toBeDefined();
      expect(authDomain!.repos).toContain('repo-a');
      expect(authDomain!.repos).toContain('repo-b');
      expect(authDomain!.healthScore).toBe(70);
    });

    it('should NOT create concept-based domain for concepts appearing in only 1 repo', async () => {
      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('repo-a', makeRepoAnalysis({ name: 'repo-a', keyConcepts: ['unique-concept'] }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult({ domains: [] }),
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      expect(result.domainMap.find(d => d.domain === 'unique-concept')).toBeUndefined();
    });

    it('should only consider top 3 key concepts for domain mapping', async () => {
      const analyses = new Map<string, RepoAnalysis>();
      // Both repos share 'shared-concept' but it's at index 3 (0-based), so only if sliced to 3 it would be excluded
      analyses.set('repo-a', makeRepoAnalysis({
        name: 'repo-a',
        keyConcepts: ['c1', 'c2', 'c3', 'shared-concept'],
      }));
      analyses.set('repo-b', makeRepoAnalysis({
        name: 'repo-b',
        keyConcepts: ['c4', 'c5', 'c6', 'shared-concept'],
      }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult({ domains: [] }),
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      // 'shared-concept' is at index 3 (4th) so it should be excluded by slice(0, 3)
      expect(result.domainMap.find(d => d.domain === 'shared-concept')).toBeUndefined();
    });

    // ------ Modernization Candidates ------

    it('should identify repos with high debt count as modernization candidates', async () => {
      const techDebt: TechDebtItem[] = [
        { id: 'D1', title: 't', description: 'd', severity: 'high', effort: 'large', repos: ['old-repo'], category: 'legacy' },
        { id: 'D2', title: 't', description: 'd', severity: 'medium', effort: 'medium', repos: ['old-repo'], category: 'legacy' },
        { id: 'D3', title: 't', description: 'd', severity: 'low', effort: 'small', repos: ['old-repo'], category: 'other' },
      ];

      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('old-repo', makeRepoAnalysis({ name: 'old-repo' }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult(),
        makeInconsistencyResult({ techDebt }),
        null,
        noopProgress,
        noop,
      );

      const candidate = result.modernizationCandidates.find(c => c.repo === 'old-repo');
      expect(candidate).toBeDefined();
      expect(candidate!.reason).toContain('High tech debt');
    });

    it('should give high priority to repos with combined issues', async () => {
      const techDebt: TechDebtItem[] = [
        { id: 'D1', title: 't', description: 'd', severity: 'high', effort: 'large', repos: ['terrible-repo'], category: 'legacy' },
        { id: 'D2', title: 't', description: 'd', severity: 'high', effort: 'large', repos: ['terrible-repo'], category: 'legacy' },
        { id: 'D3', title: 't', description: 'd', severity: 'high', effort: 'large', repos: ['terrible-repo'], category: 'legacy' },
      ];

      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('terrible-repo', makeRepoAnalysis({
        name: 'terrible-repo',
        confidence: 'low',
        patternsUsed: [{ pattern: 'jQuery', category: 'frontend', evidence: [], confidence: 'high' }],
        filesAnalyzed: 2,
      }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult(),
        makeInconsistencyResult({ techDebt }),
        null,
        noopProgress,
        noop,
      );

      const candidate = result.modernizationCandidates.find(c => c.repo === 'terrible-repo');
      expect(candidate).toBeDefined();
      expect(candidate!.priority).toBe('high');
      expect(candidate!.estimatedEffort).toBe('large');
    });

    it('should sort modernization candidates by priority (high first)', async () => {
      const techDebt: TechDebtItem[] = [
        { id: 'D1', title: 't', description: 'd', severity: 'high', effort: 'large', repos: ['high-debt'], category: 'legacy' },
        { id: 'D2', title: 't', description: 'd', severity: 'high', effort: 'large', repos: ['high-debt'], category: 'legacy' },
        { id: 'D3', title: 't', description: 'd', severity: 'high', effort: 'large', repos: ['high-debt'], category: 'legacy' },
      ];

      const analyses = new Map<string, RepoAnalysis>();
      // high-debt: score = 3 (high debt) + 2 (low confidence) + 2 (outdated) + 1 (fewer files) = 8 -> high
      analyses.set('high-debt', makeRepoAnalysis({
        name: 'high-debt',
        confidence: 'low',
        filesAnalyzed: 2,
        patternsUsed: [{ pattern: 'jQuery', category: 'frontend', evidence: [], confidence: 'high' }],
      }));
      // low-priority: score = 3 (debt from above) -> low
      analyses.set('low-priority', makeRepoAnalysis({
        name: 'low-priority',
        confidence: 'high',
        filesAnalyzed: 50,
      }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult(),
        makeInconsistencyResult({ techDebt }),
        null,
        noopProgress,
        noop,
      );

      // If there are multiple candidates, high should come first
      if (result.modernizationCandidates.length >= 2) {
        const priorities = result.modernizationCandidates.map(c => c.priority);
        const prioOrder = { high: 0, medium: 1, low: 2 };
        for (let i = 1; i < priorities.length; i++) {
          expect(prioOrder[priorities[i]]).toBeGreaterThanOrEqual(prioOrder[priorities[i - 1]]);
        }
      }
    });

    it('should suggest incremental migration for outdated patterns', async () => {
      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('old-patterns', makeRepoAnalysis({
        name: 'old-patterns',
        confidence: 'low',
        patternsUsed: [{ pattern: 'jQuery', category: 'frontend', evidence: [], confidence: 'high' }],
      }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult(),
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      const candidate = result.modernizationCandidates.find(c => c.repo === 'old-patterns');
      if (candidate) {
        expect(candidate.suggestedApproach).toContain('migration');
      }
    });

    it('should NOT flag repos below score threshold as modernization candidates', async () => {
      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('healthy-repo', makeRepoAnalysis({
        name: 'healthy-repo',
        confidence: 'high',
        filesAnalyzed: 50,
        patternsUsed: [{ pattern: 'React', category: 'frontend', evidence: [], confidence: 'high' }],
      }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult(),
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      expect(result.modernizationCandidates.find(c => c.repo === 'healthy-repo')).toBeUndefined();
    });

    // ------ Recommendations ------

    it('should recommend addressing high-priority modernization candidates', async () => {
      const techDebt: TechDebtItem[] = [
        { id: 'D1', title: 't', description: 'd', severity: 'high', effort: 'large', repos: ['critical-repo'], category: 'legacy' },
        { id: 'D2', title: 't', description: 'd', severity: 'high', effort: 'large', repos: ['critical-repo'], category: 'legacy' },
        { id: 'D3', title: 't', description: 'd', severity: 'high', effort: 'large', repos: ['critical-repo'], category: 'legacy' },
      ];

      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('critical-repo', makeRepoAnalysis({
        name: 'critical-repo',
        confidence: 'low',
        filesAnalyzed: 2,
        patternsUsed: [{ pattern: 'callback', category: 'architecture', evidence: [], confidence: 'high' }],
      }));

      const result = await generateStrategy(
        analyses,
        makeOrgResult(),
        makeInconsistencyResult({ techDebt }),
        null,
        noopProgress,
        noop,
      );

      const rec = result.recommendations.find(r => r.title.includes('modernization'));
      expect(rec).toBeDefined();
      expect(rec!.impact).toBe('high');
      expect(rec!.category).toBe('architecture');
    });

    it('should recommend documentation improvement when 3+ doc debt items exist', async () => {
      const docDebt: TechDebtItem[] = [
        { id: 'D1', title: 't1', description: 'd', severity: 'medium', effort: 'medium', repos: ['r1'], category: 'documentation' },
        { id: 'D2', title: 't2', description: 'd', severity: 'medium', effort: 'medium', repos: ['r2'], category: 'documentation' },
        { id: 'D3', title: 't3', description: 'd', severity: 'medium', effort: 'medium', repos: ['r3'], category: 'documentation' },
      ];

      const result = await generateStrategy(
        new Map(),
        makeOrgResult(),
        makeInconsistencyResult({ techDebt: docDebt }),
        null,
        noopProgress,
        noop,
      );

      const rec = result.recommendations.find(r => r.title.includes('documentation'));
      expect(rec).toBeDefined();
      expect(rec!.category).toBe('process');
    });

    it('should NOT recommend documentation improvement when < 3 doc debt items', async () => {
      const docDebt: TechDebtItem[] = [
        { id: 'D1', title: 't1', description: 'd', severity: 'medium', effort: 'medium', repos: ['r1'], category: 'documentation' },
        { id: 'D2', title: 't2', description: 'd', severity: 'medium', effort: 'medium', repos: ['r2'], category: 'documentation' },
      ];

      const result = await generateStrategy(
        new Map(),
        makeOrgResult(),
        makeInconsistencyResult({ techDebt: docDebt }),
        null,
        noopProgress,
        noop,
      );

      expect(result.recommendations.find(r => r.title.includes('documentation'))).toBeUndefined();
    });

    it('should recommend domain health improvement for unhealthy domains', async () => {
      const orgResult = makeOrgResult({
        domains: [{
          name: 'sick-domain',
          type: 'domain',
          description: 'Sick',
          repos: ['sick-repo'],
          confidence: 'low',
          reasoning: '',
        }],
      });

      const analyses = new Map<string, RepoAnalysis>();
      analyses.set('sick-repo', makeRepoAnalysis({ name: 'sick-repo', confidence: 'low' }));

      const result = await generateStrategy(
        analyses,
        orgResult,
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      const rec = result.recommendations.find(r => r.title.includes('health'));
      expect(rec).toBeDefined();
      expect(rec!.impact).toBe('high');
    });

    it('should recommend clarifying team ownership when hypotheses exist', async () => {
      const result = await generateStrategy(
        new Map(),
        makeOrgResult({ hypotheses: ['Unclear who owns repo-x', 'Team structure might be wrong'] }),
        makeInconsistencyResult(),
        null,
        noopProgress,
        noop,
      );

      const rec = result.recommendations.find(r => r.title.includes('ownership'));
      expect(rec).toBeDefined();
      expect(rec!.category).toBe('team');
      expect(rec!.description).toContain('Unclear who owns repo-x');
    });

    it('should recommend pattern standardization when pattern-related debt exists', async () => {
      const debtWithPatterns: TechDebtItem[] = [
        { id: 'D1', title: 't', description: 'Inconsistent pattern usage', severity: 'medium', effort: 'medium', repos: ['r1'], category: 'legacy' },
      ];

      const result = await generateStrategy(
        new Map(),
        makeOrgResult(),
        makeInconsistencyResult({ techDebt: debtWithPatterns }),
        null,
        noopProgress,
        noop,
      );

      const rec = result.recommendations.find(r => r.title.includes('pattern'));
      expect(rec).toBeDefined();
      expect(rec!.category).toBe('tooling');
    });

    it('should generate unique recommendation IDs', async () => {
      const docDebt: TechDebtItem[] = Array.from({ length: 4 }, (_, i) => ({
        id: `D${i}`,
        title: `t${i}`,
        description: 'pattern mismatch',
        severity: 'medium' as const,
        effort: 'medium' as const,
        repos: [`r${i}`],
        category: 'documentation' as const,
      }));

      const result = await generateStrategy(
        new Map(),
        makeOrgResult({ hypotheses: ['uncertainty'] }),
        makeInconsistencyResult({ techDebt: docDebt }),
        null,
        noopProgress,
        noop,
      );

      const ids = result.recommendations.map(r => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  // =========================================================
  // saveStrategy
  // =========================================================
  describe('saveStrategy', () => {
    it('should create strategy directory', async () => {
      const result: StrategyResult = {
        techDebtCatalog: [],
        domainMap: [],
        modernizationCandidates: [],
        recommendations: [],
      };

      await saveStrategy(testDir, result);

      const strategyPath = path.join(testDir, '.specweave/docs/internal/strategy');
      expect(fs.existsSync(strategyPath)).toBe(true);
    });

    it('should save tech debt catalog file', async () => {
      const result: StrategyResult = {
        techDebtCatalog: [
          { id: 'DEBT-001', title: 'Test debt', description: 'A debt item', severity: 'high', effort: 'large', repos: ['repo-a'], category: 'legacy' },
        ],
        domainMap: [],
        modernizationCandidates: [],
        recommendations: [],
      };

      const savedFiles = await saveStrategy(testDir, result);

      const debtFile = path.join(testDir, '.specweave/docs/internal/strategy/tech-debt-catalog.md');
      expect(savedFiles).toContain(debtFile);
      expect(fs.existsSync(debtFile)).toBe(true);

      const content = fs.readFileSync(debtFile, 'utf-8');
      expect(content).toContain('# Tech Debt Catalog');
      expect(content).toContain('DEBT-001');
      expect(content).toContain('Test debt');
      expect(content).toContain('repo-a');
      expect(content).toContain('| High | 1 |');
    });

    it('should save domain map file', async () => {
      const result: StrategyResult = {
        techDebtCatalog: [],
        domainMap: [
          { domain: 'payments', description: 'Payment processing', repos: ['pay-api'], healthScore: 85, concerns: [] },
        ],
        modernizationCandidates: [],
        recommendations: [],
      };

      const savedFiles = await saveStrategy(testDir, result);

      const domainFile = path.join(testDir, '.specweave/docs/internal/strategy/domain-map.md');
      expect(savedFiles).toContain(domainFile);
      expect(fs.existsSync(domainFile)).toBe(true);

      const content = fs.readFileSync(domainFile, 'utf-8');
      expect(content).toContain('# Business Domain Map');
      expect(content).toContain('payments');
      expect(content).toContain('85%');
    });

    it('should include concerns in domain map', async () => {
      const result: StrategyResult = {
        techDebtCatalog: [],
        domainMap: [
          { domain: 'auth', description: 'Auth', repos: ['auth-svc'], healthScore: 40, concerns: ['Low documentation quality', 'Some repos poorly structured'] },
        ],
        modernizationCandidates: [],
        recommendations: [],
      };

      const savedFiles = await saveStrategy(testDir, result);

      const domainFile = path.join(testDir, '.specweave/docs/internal/strategy/domain-map.md');
      const content = fs.readFileSync(domainFile, 'utf-8');
      expect(content).toContain('Low documentation quality');
      expect(content).toContain('Some repos poorly structured');
      expect(content).toContain('**Concerns**');
    });

    it('should save modernization candidates file when candidates exist', async () => {
      const result: StrategyResult = {
        techDebtCatalog: [],
        domainMap: [],
        modernizationCandidates: [
          { repo: 'old-app', reason: 'Outdated', priority: 'high', suggestedApproach: 'Rewrite', estimatedEffort: 'large' },
        ],
        recommendations: [],
      };

      const savedFiles = await saveStrategy(testDir, result);

      const modernFile = path.join(testDir, '.specweave/docs/internal/strategy/modernization-candidates.md');
      expect(savedFiles).toContain(modernFile);

      const content = fs.readFileSync(modernFile, 'utf-8');
      expect(content).toContain('# Modernization Candidates');
      expect(content).toContain('old-app (HIGH)');
      expect(content).toContain('Rewrite');
      expect(content).toContain('| High | 1 |');
    });

    it('should NOT save modernization file when no candidates', async () => {
      const result: StrategyResult = {
        techDebtCatalog: [],
        domainMap: [],
        modernizationCandidates: [],
        recommendations: [],
      };

      const savedFiles = await saveStrategy(testDir, result);

      const modernFile = path.join(testDir, '.specweave/docs/internal/strategy/modernization-candidates.md');
      expect(savedFiles).not.toContain(modernFile);
      expect(fs.existsSync(modernFile)).toBe(false);
    });

    it('should save recommendations file when recommendations exist', async () => {
      const result: StrategyResult = {
        techDebtCatalog: [],
        domainMap: [],
        modernizationCandidates: [],
        recommendations: [
          { id: 'REC-001', title: 'Fix things', description: 'Do it', impact: 'high', effort: 'medium', category: 'architecture' },
        ],
      };

      const savedFiles = await saveStrategy(testDir, result);

      const recFile = path.join(testDir, '.specweave/docs/internal/strategy/recommendations.md');
      expect(savedFiles).toContain(recFile);

      const content = fs.readFileSync(recFile, 'utf-8');
      expect(content).toContain('# Strategic Recommendations');
      expect(content).toContain('REC-001');
      expect(content).toContain('Fix things');
      expect(content).toContain('| Impact | high |');
    });

    it('should NOT save recommendations file when no recommendations', async () => {
      const result: StrategyResult = {
        techDebtCatalog: [],
        domainMap: [],
        modernizationCandidates: [],
        recommendations: [],
      };

      const savedFiles = await saveStrategy(testDir, result);

      const recFile = path.join(testDir, '.specweave/docs/internal/strategy/recommendations.md');
      expect(savedFiles).not.toContain(recFile);
      expect(fs.existsSync(recFile)).toBe(false);
    });

    it('should always return tech debt and domain map files', async () => {
      const result: StrategyResult = {
        techDebtCatalog: [],
        domainMap: [],
        modernizationCandidates: [],
        recommendations: [],
      };

      const savedFiles = await saveStrategy(testDir, result);

      expect(savedFiles).toHaveLength(2); // debt + domain (no modernization, no recommendations)
      expect(savedFiles[0]).toContain('tech-debt-catalog.md');
      expect(savedFiles[1]).toContain('domain-map.md');
    });

    it('should correctly count severity breakdown in tech debt catalog', async () => {
      const result: StrategyResult = {
        techDebtCatalog: [
          { id: 'D1', title: 't', description: 'd', severity: 'high', effort: 'small', repos: ['r'], category: 'legacy' },
          { id: 'D2', title: 't', description: 'd', severity: 'high', effort: 'small', repos: ['r'], category: 'legacy' },
          { id: 'D3', title: 't', description: 'd', severity: 'medium', effort: 'medium', repos: ['r'], category: 'other' },
          { id: 'D4', title: 't', description: 'd', severity: 'low', effort: 'large', repos: ['r'], category: 'other' },
        ],
        domainMap: [],
        modernizationCandidates: [],
        recommendations: [],
      };

      await saveStrategy(testDir, result);

      const content = fs.readFileSync(
        path.join(testDir, '.specweave/docs/internal/strategy/tech-debt-catalog.md'),
        'utf-8',
      );
      expect(content).toContain('| High | 2 |');
      expect(content).toContain('| Medium | 1 |');
      expect(content).toContain('| Low | 1 |');
    });

    it('should correctly count priority breakdown in modernization candidates', async () => {
      const result: StrategyResult = {
        techDebtCatalog: [],
        domainMap: [],
        modernizationCandidates: [
          { repo: 'a', reason: 'r', priority: 'high', suggestedApproach: 's', estimatedEffort: 'large' },
          { repo: 'b', reason: 'r', priority: 'medium', suggestedApproach: 's', estimatedEffort: 'medium' },
          { repo: 'c', reason: 'r', priority: 'medium', suggestedApproach: 's', estimatedEffort: 'medium' },
          { repo: 'd', reason: 'r', priority: 'low', suggestedApproach: 's', estimatedEffort: 'small' },
        ],
        recommendations: [],
      };

      await saveStrategy(testDir, result);

      const content = fs.readFileSync(
        path.join(testDir, '.specweave/docs/internal/strategy/modernization-candidates.md'),
        'utf-8',
      );
      expect(content).toContain('| High | 1 |');
      expect(content).toContain('| Medium | 2 |');
      expect(content).toContain('| Low | 1 |');
    });
  });
});
