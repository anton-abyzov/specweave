/**
 * Test order and coverage are opt-in: reading an increment must not stamp
 * `testMode` or `coverageTarget` into its metadata.json.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MetadataManager } from '../../../../src/core/increment/metadata-manager.js';

describe('metadata.json carries no implied test policy', () => {
  let root: string;
  const id = '0001-sample';
  const metaPath = () => path.join(root, '.specweave', 'increments', id, 'metadata.json');

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-no-test-defaults-'));
    fs.mkdirSync(path.join(root, '.specweave', 'increments', id), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('does not add testMode or coverageTarget when repairing existing metadata', () => {
    fs.writeFileSync(metaPath(), JSON.stringify({ id, status: 'planned', type: 'feature', created: '2026-10-24T00:00:00.000Z' }));
    const metadata = MetadataManager.read(id, root);
    expect(metadata).not.toHaveProperty('testMode');
    expect(metadata).not.toHaveProperty('coverageTarget');
    const onDisk = JSON.parse(fs.readFileSync(metaPath(), 'utf-8'));
    expect(onDisk).not.toHaveProperty('testMode');
    expect(onDisk).not.toHaveProperty('coverageTarget');
  });

  it('keeps a test mode the user set', () => {
    fs.writeFileSync(metaPath(), JSON.stringify({ id, status: 'planned', type: 'feature', created: '2026-10-24T00:00:00.000Z', testMode: 'TDD' }));
    expect(MetadataManager.read(id, root).testMode).toBe('TDD');
  });
});
