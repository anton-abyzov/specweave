import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from '../../../src/utils/fs-native.js';
import * as path from 'path';
import * as os from 'os';
import { IncrementCompletionValidator } from '../../../src/core/increment/completion-validator.js';

/**
 * Tests for quality gate report validation in completion-validator.
 * Verifies that grill-report.json and judge-llm-report.json are checked
 * before allowing increment closure.
 */
describe('IncrementCompletionValidator - Quality Gate Reports', () => {
  let testRoot: string;
  let incrementId: string;
  let incrementPath: string;
  let reportsDir: string;
  let testCounter = 0;

  // Helper: create minimal valid increment files (all tasks/ACs done)
  async function createValidIncrement() {
    const specContent = `---
increment: ${incrementId}
status: active
---
# Test
## User Stories
### US-001: Test
- [x] **AC-US1-01**: Done
`;
    const tasksContent = `---
increment: ${incrementId}
total_tasks: 1
completed_tasks: 1
---
# Tasks
### T-001: Task
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed
`;
    await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);
    await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);
  }

  async function writeGrillReport(report: Record<string, unknown>) {
    await fs.ensureDir(reportsDir);
    await fs.writeFile(path.join(reportsDir, 'grill-report.json'), JSON.stringify(report));
  }

  async function writeJudgeReport(report: Record<string, unknown>) {
    await fs.ensureDir(reportsDir);
    await fs.writeFile(path.join(reportsDir, 'judge-llm-report.json'), JSON.stringify(report));
  }

  async function writeConfig(config: Record<string, unknown>) {
    const configDir = path.join(testRoot, '.specweave');
    await fs.ensureDir(configDir);
    await fs.writeFile(path.join(configDir, 'config.json'), JSON.stringify(config));
  }

  async function writeMetadata(metadata: Record<string, unknown>) {
    await fs.writeFile(path.join(incrementPath, 'metadata.json'), JSON.stringify(metadata));
  }

  beforeEach(async () => {
    testCounter++;
    testRoot = path.join(os.tmpdir(), `cv-qg-test-${Date.now()}-${testCounter}`);
    await fs.ensureDir(testRoot);

    incrementId = `000${testCounter}-test`;
    incrementPath = path.join(testRoot, '.specweave', 'increments', incrementId);
    reportsDir = path.join(incrementPath, 'reports');
    await fs.ensureDir(incrementPath);

    vi.spyOn(process, 'cwd').mockReturnValue(testRoot);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.remove(testRoot);
  });

  describe('grill report', () => {
    it('should error when grill-report.json is missing', async () => {
      await createValidIncrement();

      const result = await IncrementCompletionValidator.validateCompletion(incrementId);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('grill-report.json not found'))).toBe(true);
    });

    it('should pass when grill report has READY verdict', async () => {
      await createValidIncrement();
      await writeGrillReport({
        version: '1.0',
        verdict: 'PASS',
        shipReadiness: 'READY',
        summary: { totalFindings: 0, critical: 0, high: 0, medium: 0 },
      });
      await writeJudgeReport({ version: '1.0', verdict: 'WAIVED', consentStatus: 'denied' });

      const result = await IncrementCompletionValidator.validateCompletion(incrementId);

      const grillErrors = result.errors.filter(e => e.includes('grill'));
      expect(grillErrors).toHaveLength(0);
    });

    it('should error when grill report has NOT READY verdict', async () => {
      await createValidIncrement();
      await writeGrillReport({
        version: '1.0',
        verdict: 'FAIL',
        shipReadiness: 'NOT READY',
        summary: { totalFindings: 2, critical: 1, high: 1, medium: 0 },
      });

      const result = await IncrementCompletionValidator.validateCompletion(incrementId);

      expect(result.errors.some(e => e.includes('NOT READY'))).toBe(true);
    });

    it('should warn when grill report has NEEDS REVIEW verdict', async () => {
      await createValidIncrement();
      await writeGrillReport({
        version: '1.0',
        verdict: 'PASS',
        shipReadiness: 'NEEDS REVIEW',
        summary: { totalFindings: 1, critical: 0, high: 1, medium: 0 },
      });
      await writeJudgeReport({ version: '1.0', verdict: 'WAIVED', consentStatus: 'denied' });

      const result = await IncrementCompletionValidator.validateCompletion(incrementId);

      const grillWarnings = (result.warnings ?? []).filter(w => w.includes('grill'));
      expect(grillWarnings.some(w => w.includes('concerns'))).toBe(true);
    });

    it('should skip grill check when grill.required is false', async () => {
      await createValidIncrement();
      await writeConfig({ grill: { required: false } });
      // No grill report written — should still pass
      await writeJudgeReport({ version: '1.0', verdict: 'WAIVED', consentStatus: 'denied' });

      const result = await IncrementCompletionValidator.validateCompletion(incrementId);

      const grillErrors = result.errors.filter(e => e.includes('grill'));
      expect(grillErrors).toHaveLength(0);
    });

    it('should skip grill check for hotfix increments', async () => {
      await createValidIncrement();
      await writeMetadata({ type: 'hotfix', status: 'active' });
      // No grill report — hotfix should skip
      await writeJudgeReport({ version: '1.0', verdict: 'WAIVED', consentStatus: 'denied' });

      const result = await IncrementCompletionValidator.validateCompletion(incrementId);

      const grillErrors = result.errors.filter(e => e.includes('grill'));
      expect(grillErrors).toHaveLength(0);
    });

    it('should warn on malformed grill report JSON', async () => {
      await createValidIncrement();
      await fs.ensureDir(reportsDir);
      await fs.writeFile(path.join(reportsDir, 'grill-report.json'), 'not-json{');
      await writeJudgeReport({ version: '1.0', verdict: 'WAIVED', consentStatus: 'denied' });

      const result = await IncrementCompletionValidator.validateCompletion(incrementId);

      const grillWarnings = (result.warnings ?? []).filter(w => w.includes('grill'));
      expect(grillWarnings.some(w => w.includes('could not be parsed'))).toBe(true);
    });
  });

  describe('judge-llm report', () => {
    it('should warn when judge-llm report is missing (not error)', async () => {
      await createValidIncrement();
      await writeGrillReport({
        version: '1.0',
        verdict: 'PASS',
        shipReadiness: 'READY',
        summary: { totalFindings: 0, critical: 0, high: 0, medium: 0 },
      });

      const result = await IncrementCompletionValidator.validateCompletion(incrementId);

      // Missing judge-llm = warning, not error
      const judgeErrors = result.errors.filter(e => e.includes('judge-llm'));
      expect(judgeErrors).toHaveLength(0);
      const judgeWarnings = (result.warnings ?? []).filter(w => w.includes('judge-llm'));
      expect(judgeWarnings.length).toBeGreaterThan(0);
    });

    it('should error when judge-llm verdict is REJECTED', async () => {
      await createValidIncrement();
      await writeGrillReport({
        version: '1.0',
        verdict: 'PASS',
        shipReadiness: 'READY',
        summary: { totalFindings: 0, critical: 0, high: 0, medium: 0 },
      });
      await writeJudgeReport({ version: '1.0', verdict: 'REJECTED', score: 30 });

      const result = await IncrementCompletionValidator.validateCompletion(incrementId);

      expect(result.errors.some(e => e.includes('REJECTED'))).toBe(true);
    });

    it('should pass when judge-llm verdict is APPROVED', async () => {
      await createValidIncrement();
      await writeGrillReport({
        version: '1.0',
        verdict: 'PASS',
        shipReadiness: 'READY',
        summary: { totalFindings: 0, critical: 0, high: 0, medium: 0 },
      });
      await writeJudgeReport({ version: '1.0', verdict: 'APPROVED', score: 90 });

      const result = await IncrementCompletionValidator.validateCompletion(incrementId);

      const judgeErrors = result.errors.filter(e => e.includes('judge-llm'));
      expect(judgeErrors).toHaveLength(0);
    });

    it('should pass when judge-llm verdict is WAIVED', async () => {
      await createValidIncrement();
      await writeGrillReport({
        version: '1.0',
        verdict: 'PASS',
        shipReadiness: 'READY',
        summary: { totalFindings: 0, critical: 0, high: 0, medium: 0 },
      });
      await writeJudgeReport({
        version: '1.0',
        verdict: 'WAIVED',
        consentStatus: 'denied',
        reason: 'User declined',
      });

      const result = await IncrementCompletionValidator.validateCompletion(incrementId);

      const judgeErrors = result.errors.filter(e => e.includes('judge-llm'));
      expect(judgeErrors).toHaveLength(0);
    });

    it('should warn when judge-llm verdict is CONCERNS', async () => {
      await createValidIncrement();
      await writeGrillReport({
        version: '1.0',
        verdict: 'PASS',
        shipReadiness: 'READY',
        summary: { totalFindings: 0, critical: 0, high: 0, medium: 0 },
      });
      await writeJudgeReport({ version: '1.0', verdict: 'CONCERNS', score: 72 });

      const result = await IncrementCompletionValidator.validateCompletion(incrementId);

      const judgeErrors = result.errors.filter(e => e.includes('judge-llm'));
      expect(judgeErrors).toHaveLength(0);
      const judgeWarnings = (result.warnings ?? []).filter(w => w.includes('judge-llm'));
      expect(judgeWarnings.some(w => w.includes('CONCERNS'))).toBe(true);
    });
  });

  describe('skip all gates', () => {
    it('should skip all quality gate checks when auto.skipQualityGates is true', async () => {
      await createValidIncrement();
      await writeConfig({ auto: { skipQualityGates: true } });
      // No reports written — should still pass (gates skipped)

      const result = await IncrementCompletionValidator.validateCompletion(incrementId);

      const gateErrors = result.errors.filter(e => e.includes('Quality gate'));
      expect(gateErrors).toHaveLength(0);
    });
  });
});
