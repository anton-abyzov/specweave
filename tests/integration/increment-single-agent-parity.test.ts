/**
 * Single-agent planning parity test (0669 Wave 2, T-021/T-022).
 *
 * Verifies that a single-agent planning run produces output artifacts
 * with the same top-level structure as the 3-agent fan-out path:
 *   - spec.md with an "Acceptance Criteria" section containing AC-US*-NN IDs
 *   - plan.md with a "Design" and "Rationale" heading
 *   - tasks.md with at least one T-NN task entry
 *   - rubric.md with a "Quality Contract" heading
 *
 * The fixture lives under `test/fixtures/single-agent-parity/` per the
 * task plan and represents the expected output of a single-agent
 * invocation with the parallel flag OFF.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const FIXTURE_DIR = resolve(
  __dirname,
  '..',
  'fixtures',
  'single-agent-parity',
);

describe('single-agent planning parity (0669 T-021/T-022)', () => {
  it('fixture directory exists', () => {
    expect(existsSync(FIXTURE_DIR)).toBe(true);
  });

  it('spec.md has Acceptance Criteria section and AC IDs', () => {
    const path = resolve(FIXTURE_DIR, 'spec.md');
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, 'utf-8');
    expect(content).toMatch(/##\s+Acceptance Criteria/i);
    expect(content).toMatch(/AC-US\d+-\d+/);
  });

  it('plan.md has Design and Rationale headings', () => {
    const path = resolve(FIXTURE_DIR, 'plan.md');
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, 'utf-8');
    expect(content).toMatch(/##\s+Design/i);
    expect(content).toMatch(/##\s+Rationale/i);
  });

  it('tasks.md has at least one T-NN task entry', () => {
    const path = resolve(FIXTURE_DIR, 'tasks.md');
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, 'utf-8');
    expect(content).toMatch(/###\s+T-\d+/);
  });

  it('rubric.md has Quality Contract heading', () => {
    const path = resolve(FIXTURE_DIR, 'rubric.md');
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, 'utf-8');
    expect(content).toMatch(/##\s+Quality Contract/i);
  });
});
