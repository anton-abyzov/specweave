/**
 * 2.0 status vocabulary + increment resolution regressions.
 *
 * The design fixes metadata.json `status` to a closed vocabulary
 * (planned|active|paused|completed|abandoned) set only by CLI transitions.
 * The shipped tree wrote `planning` and threw on every other legacy spelling,
 * which made those increments vanish from `specweave status` totals (a project
 * with pending work read as "100% complete"), and left a freshly created
 * increment outside every in-flight resolver.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  IncrementStatus,
  migrateLegacyStatus,
  UNKNOWN_STATUS_FALLBACK,
} from '../../../src/core/types/increment-metadata.js';
import {
  resolveIncrement,
  listActiveIncrementIds,
  listStartableIncrementIds,
  ensureIncrementStarted,
  IncrementResolutionError,
} from '../../../src/core/tasks/resolve-increment.js';

const DESIGN_VOCABULARY = ['planned', 'active', 'paused', 'completed', 'abandoned'];

describe('IncrementStatus vocabulary', () => {
  it('spells the not-started state `planned`, as the design does', () => {
    expect(IncrementStatus.PLANNED).toBe('planned');
    expect(Object.values(IncrementStatus)).not.toContain('planning');
  });

  it('contains the design vocabulary', () => {
    for (const status of DESIGN_VOCABULARY) {
      expect(Object.values(IncrementStatus)).toContain(status);
    }
  });
});

describe('migrateLegacyStatus', () => {
  it.each([
    ['planning', IncrementStatus.PLANNED],
    ['closed', IncrementStatus.COMPLETED],
    ['complete', IncrementStatus.COMPLETED],
    ['done', IncrementStatus.COMPLETED],
    ['superseded', IncrementStatus.ABANDONED],
    ['in-progress', IncrementStatus.ACTIVE],
    ['on-hold', IncrementStatus.PAUSED],
  ])('maps legacy status %s → %s', (legacy, expected) => {
    const result = migrateLegacyStatus({ id: '0001-x', status: legacy });
    expect(result.changed).toBe(true);
    expect(result.metadata.status).toBe(expected);
  });

  it('leaves a status it cannot interpret to the caller (metadata.json coerces, spec.md rejects)', () => {
    expect(migrateLegacyStatus({ id: '0001-x', status: 'totally-made-up' })).toMatchObject({
      changed: false,
    });
    // The visibility fallback for metadata.json is applied by MetadataManager.
    expect(UNKNOWN_STATUS_FALLBACK).toBe(IncrementStatus.PLANNED);
  });

  it('is idempotent for statuses already in the vocabulary', () => {
    for (const status of DESIGN_VOCABULARY) {
      expect(migrateLegacyStatus({ status })).toMatchObject({ changed: false });
    }
  });
});

describe('increment resolution', () => {
  let root: string;

  const write = (id: string, status: string) => {
    const dir = path.join(root, '.specweave', 'increments', id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ id, status, type: 'feature' }));
    return dir;
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-resolve-'));
    fs.mkdirSync(path.join(root, '.specweave', 'increments'), { recursive: true });
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('resolves the single active increment', () => {
    write('0001-a', 'active');
    expect(resolveIncrement(root).id).toBe('0001-a');
    expect(listActiveIncrementIds(root)).toEqual(['0001-a']);
  });

  it('falls back to the single not-started increment when nothing is in flight', () => {
    write('0002-planned', 'planned');
    expect(resolveIncrement(root).id).toBe('0002-planned');
    expect(listStartableIncrementIds(root)).toEqual(['0002-planned']);
  });

  it('still prefers the active increment over a planned one', () => {
    write('0001-a', 'active');
    write('0002-planned', 'planned');
    expect(resolveIncrement(root).id).toBe('0001-a');
  });

  it('points at `create-increment`, not a maintainer-private increment number', () => {
    expect(() => resolveIncrement(root)).toThrow(IncrementResolutionError);
    try {
      resolveIncrement(root);
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toMatch(/create-increment/);
      expect(message).toMatch(/0001/);
      expect(message).not.toMatch(/0874/);
    }
  });

  it('ensureIncrementStarted promotes planned/planning/backlog to active exactly once', () => {
    const dir = write('0003-planned', 'planning');
    expect(ensureIncrementStarted(dir)).toMatch(/planning → active/);
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf-8')).status).toBe('active');
    expect(ensureIncrementStarted(dir)).toBeUndefined();
  });

  it('ensureIncrementStarted never touches a completed increment', () => {
    const dir = write('0004-done', 'completed');
    expect(ensureIncrementStarted(dir)).toBeUndefined();
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf-8')).status).toBe('completed');
  });
});
