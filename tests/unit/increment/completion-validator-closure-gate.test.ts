import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from '../../../src/utils/fs-native.js';
import * as path from 'path';
import * as os from 'os';
import { IncrementCompletionValidator } from '../../../src/core/increment/completion-validator.js';

/**
 * SpecWeave 2.0 closure gate.
 *
 * `reports/verify.json` with `ok: true` is the ONLY hard gate. Grill,
 * judge-llm, code-review and rubric reports are optional evidence and must
 * never block closure. `--reason` downgrades every blocking finding to a
 * warning (the reason is stored as metadata.closeReason by the CLI).
 */
describe('IncrementCompletionValidator — 2.0 closure gate', () => {
  let testRoot: string;
  let incrementId: string;
  let incrementPath: string;
  let reportsDir: string;
  let counter = 0;

  async function createCompleteIncrement() {
    await fs.writeFile(
      path.join(incrementPath, 'spec.md'),
      `---\nincrement: ${incrementId}\n---\n# Test\n## User Stories\n### US-001: Test\n- [x] **AC-US1-01**: Done\n`
    );
    await fs.writeFile(
      path.join(incrementPath, 'tasks.md'),
      `# Tasks\n\n### T-001 Task\n- AC: AC-US1-01 | Files: src/a.ts | Test: npm test\n- [x]\n`
    );
    await fs.writeFile(
      path.join(incrementPath, 'metadata.json'),
      JSON.stringify({ id: incrementId, status: 'active', type: 'feature' })
    );
  }

  async function writeReport(name: string, body: unknown) {
    await fs.ensureDir(reportsDir);
    await fs.writeFile(path.join(reportsDir, name), typeof body === 'string' ? body : JSON.stringify(body));
  }

  const okVerify = { ok: true, ranAt: '2026-09-02T10:00:00Z', commands: [{ cmd: 'npm test', exit: 0 }], acs: { total: 1, done: 1 } };
  const failedVerify = { ok: false, ranAt: '2026-09-02T10:00:00Z', commands: [{ cmd: 'npm test', exit: 1 }], acs: { total: 1, done: 1 } };

  beforeEach(async () => {
    counter++;
    testRoot = path.join(os.tmpdir(), `closure-gate-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}`);
    incrementId = `000${counter}-closure-gate`;
    incrementPath = path.join(testRoot, '.specweave', 'increments', incrementId);
    reportsDir = path.join(incrementPath, 'reports');
    await fs.ensureDir(incrementPath);
    await fs.writeFile(path.join(testRoot, '.specweave', 'config.json'), JSON.stringify({}));
    await createCompleteIncrement();
    vi.spyOn(process, 'cwd').mockReturnValue(testRoot);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.remove(testRoot);
  });

  it('blocks closure when reports/verify.json is missing', async () => {
    const result = await IncrementCompletionValidator.validateCompletion(incrementId);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('verify.json missing'))).toBe(true);
  });

  it('blocks closure when verify.json is not ok', async () => {
    await writeReport('verify.json', failedVerify);
    const result = await IncrementCompletionValidator.validateCompletion(incrementId);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('not ok'))).toBe(true);
  });

  it('allows closure when verify.json is ok', async () => {
    await writeReport('verify.json', okVerify);
    const result = await IncrementCompletionValidator.validateCompletion(incrementId);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('allows closure without verify.json when --reason is given', async () => {
    const result = await IncrementCompletionValidator.validateCompletion(incrementId, { reason: 'infra down' });
    expect(result.isValid).toBe(true);
    expect(result.warnings.some((w) => w.includes('infra down'))).toBe(true);
  });

  it('downgrades open ACs and pending tasks to warnings when --reason is given', async () => {
    await fs.writeFile(
      path.join(incrementPath, 'spec.md'),
      `---\nincrement: ${incrementId}\n---\n# Test\n- [ ] **AC-US1-01**: Open\n`
    );
    await fs.writeFile(path.join(incrementPath, 'tasks.md'), `# Tasks\n\n### T-001 Task\n- AC: AC-US1-01 | Files: src/a.ts\n- [ ]\n`);
    await writeReport('verify.json', okVerify);
    const result = await IncrementCompletionValidator.validateCompletion(incrementId, { reason: 'descoped' });
    expect(result.isValid).toBe(true);
    expect(result.warnings.some((w) => w.includes('acceptance criteria still open'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('tasks still pending'))).toBe(true);
  });

  it('never blocks on a missing grill / judge-llm / code-review report', async () => {
    await writeReport('verify.json', okVerify);
    const result = await IncrementCompletionValidator.validateCompletion(incrementId);
    expect(result.isValid).toBe(true);
    const joined = result.errors.join(' ');
    expect(joined).not.toMatch(/grill|judge|code-review/i);
  });

  it('never blocks on a failing grill / judge-llm / code-review report', async () => {
    await writeReport('verify.json', okVerify);
    await writeReport('grill-report.json', { shipReadiness: 'NOT READY', summary: { critical: 3 } });
    await writeReport('judge-llm-report.json', { verdict: 'REJECTED' });
    await writeReport('code-review-report.json', { summary: { critical: 2, high: 1, medium: 4 }, findings: [] });
    const result = await IncrementCompletionValidator.validateCompletion(incrementId);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('never blocks on rubric.md blocking criteria', async () => {
    await writeReport('verify.json', okVerify);
    await fs.writeFile(
      path.join(incrementPath, 'rubric.md'),
      `---\nstatus: active\n---\n## R-001 Something [blocking]\n- **Verify**: grill-report.json shipReadiness\n`
    );
    const result = await IncrementCompletionValidator.validateCompletion(incrementId);
    expect(result.isValid).toBe(true);
    expect(result.errors.join(' ')).not.toMatch(/rubric/i);
  });

  it('notes a missing reports/review.md without blocking', async () => {
    await writeReport('verify.json', okVerify);
    const result = await IncrementCompletionValidator.validateCompletion(incrementId);
    expect(result.isValid).toBe(true);
    expect(result.warnings.some((w) => w.includes('review.md'))).toBe(true);
  });
});
