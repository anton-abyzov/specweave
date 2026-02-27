import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from '../../../src/utils/fs-native.js';
import * as path from 'path';
import * as os from 'os';
import { SkillJudge, type JudgeResult } from '../../../src/core/skills/skill-judge.js';

describe('SkillJudge - Report Writing', () => {
  let testRoot: string;
  let incrementId: string;
  let reportsDir: string;
  let testCounter = 0;

  beforeEach(async () => {
    testCounter++;
    testRoot = path.join(os.tmpdir(), `judge-report-test-${Date.now()}-${testCounter}`);
    await fs.ensureDir(testRoot);

    incrementId = `000${testCounter}-test`;
    const incrementPath = path.join(testRoot, '.specweave', 'increments', incrementId);
    reportsDir = path.join(incrementPath, 'reports');
    await fs.ensureDir(incrementPath);
  });

  afterEach(async () => {
    await fs.remove(testRoot);
  });

  function makeJudge(): SkillJudge {
    return new SkillJudge({ projectRoot: testRoot });
  }

  function makeResult(overrides: Partial<JudgeResult> = {}): JudgeResult {
    return {
      verdict: 'PASS',
      score: 90,
      summary: 'Test result',
      strengths: ['good'],
      concerns: [],
      recommendations: [],
      domainChecks: [],
      duration_ms: 1000,
      timedOut: false,
      ...overrides,
    };
  }

  describe('writeReport', () => {
    it('should write valid JSON to correct path', () => {
      const judge = makeJudge();
      const result = makeResult();

      const reportPath = judge.writeReport(incrementId, result, 'granted');

      expect(reportPath).toContain('judge-llm-report.json');
      expect(fs.existsSync(reportPath)).toBe(true);

      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      expect(report.version).toBe('1.0');
      expect(report.incrementId).toBe(incrementId);
      expect(report.verdict).toBe('APPROVED');
      expect(report.score).toBe(90);
      expect(report.consentStatus).toBe('granted');
    });

    it('should create reports directory if missing', () => {
      const judge = makeJudge();

      expect(fs.existsSync(reportsDir)).toBe(false);

      judge.writeReport(incrementId, makeResult(), 'granted');

      expect(fs.existsSync(reportsDir)).toBe(true);
    });

    it('should map PASS verdict to APPROVED', () => {
      const judge = makeJudge();
      const reportPath = judge.writeReport(incrementId, makeResult({ verdict: 'PASS' }), 'granted');

      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      expect(report.verdict).toBe('APPROVED');
    });

    it('should map FAIL verdict to REJECTED', () => {
      const judge = makeJudge();
      const reportPath = judge.writeReport(incrementId, makeResult({ verdict: 'FAIL' }), 'granted');

      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      expect(report.verdict).toBe('REJECTED');
    });

    it('should map CONCERNS verdict to CONCERNS', () => {
      const judge = makeJudge();
      const reportPath = judge.writeReport(incrementId, makeResult({ verdict: 'CONCERNS' }), 'granted');

      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      expect(report.verdict).toBe('CONCERNS');
    });
  });

  describe('writeWaivedReport', () => {
    it('should write WAIVED verdict with reason', () => {
      const judge = makeJudge();

      const reportPath = judge.writeWaivedReport(incrementId, 'No API key');

      expect(fs.existsSync(reportPath)).toBe(true);

      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      expect(report.verdict).toBe('WAIVED');
      expect(report.consentStatus).toBe('denied');
      expect(report.reason).toBe('No API key');
    });

    it('should create reports directory if missing', () => {
      const judge = makeJudge();

      expect(fs.existsSync(reportsDir)).toBe(false);

      judge.writeWaivedReport(incrementId, 'test');

      expect(fs.existsSync(reportsDir)).toBe(true);
    });
  });
});
