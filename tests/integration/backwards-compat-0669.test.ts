/**
 * Backwards-compatibility regression test for increment 0669 Wave 1 changes.
 *
 * These tests confirm that archived increments carrying now-deprecated patterns
 * (state-marker files, --simple flag references, extended-thinking mentions,
 * the old 15-task cap) remain readable/resumable/closable after the 4.7
 * alignment changes ship.
 *
 * Each fixture represents a historical increment state we must not break.
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const FIXTURES_DIR = resolve(
  join(__filename, '..', '..', 'fixtures', 'archived-increments')
);

describe('backwards-compat-0669: existing increments survive 4.7 changes', () => {
  it('fixture 0001: increment with state-marker files can be opened', () => {
    expect(existsSync(join(FIXTURES_DIR, '0001-with-state-markers/metadata.json'))).toBe(true);
    expect(existsSync(join(FIXTURES_DIR, '0001-with-state-markers/spec.md'))).toBe(true);
    expect(existsSync(join(FIXTURES_DIR, '0001-with-state-markers/tasks.md'))).toBe(true);
    expect(existsSync(join(FIXTURES_DIR, '0001-with-state-markers/plan.md'))).toBe(true);
    expect(existsSync(join(FIXTURES_DIR, '0001-with-state-markers/skill-chain-0001.json'))).toBe(true);
  });

  it('fixture 0002: increment with --simple flag in tasks.md can be resumed', () => {
    expect(existsSync(join(FIXTURES_DIR, '0002-with-simple-flag/metadata.json'))).toBe(true);
    expect(existsSync(join(FIXTURES_DIR, '0002-with-simple-flag/spec.md'))).toBe(true);
    expect(existsSync(join(FIXTURES_DIR, '0002-with-simple-flag/tasks.md'))).toBe(true);
    expect(existsSync(join(FIXTURES_DIR, '0002-with-simple-flag/plan.md'))).toBe(true);
  });

  it('fixture 0003: increment with extended-thinking references can be closed', () => {
    expect(existsSync(join(FIXTURES_DIR, '0003-with-extended-thinking/metadata.json'))).toBe(true);
    expect(existsSync(join(FIXTURES_DIR, '0003-with-extended-thinking/spec.md'))).toBe(true);
    expect(existsSync(join(FIXTURES_DIR, '0003-with-extended-thinking/tasks.md'))).toBe(true);
    expect(existsSync(join(FIXTURES_DIR, '0003-with-extended-thinking/plan.md'))).toBe(true);
  });

  it('fixture 0004: increment with 15-task cap tasks.md can be executed', () => {
    expect(existsSync(join(FIXTURES_DIR, '0004-with-15-task-cap/metadata.json'))).toBe(true);
    expect(existsSync(join(FIXTURES_DIR, '0004-with-15-task-cap/spec.md'))).toBe(true);
    expect(existsSync(join(FIXTURES_DIR, '0004-with-15-task-cap/tasks.md'))).toBe(true);
    expect(existsSync(join(FIXTURES_DIR, '0004-with-15-task-cap/plan.md'))).toBe(true);
  });

  it('fixture 0005: increment without any deprecated features still works', () => {
    expect(existsSync(join(FIXTURES_DIR, '0005-clean-increment/metadata.json'))).toBe(true);
    expect(existsSync(join(FIXTURES_DIR, '0005-clean-increment/spec.md'))).toBe(true);
    expect(existsSync(join(FIXTURES_DIR, '0005-clean-increment/tasks.md'))).toBe(true);
    expect(existsSync(join(FIXTURES_DIR, '0005-clean-increment/plan.md'))).toBe(true);
  });
});
