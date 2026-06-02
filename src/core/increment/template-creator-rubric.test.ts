/**
 * Scaffolding test for rubric placeholder removal (0865 T-004 / AC-US1-05).
 *
 * Fresh increment scaffolding must NOT write a `reports/rubric.md` template
 * placeholder. The real root rubric.md is produced post-planning by the
 * generator (T-002), and the closure gate reads the ROOT rubric.md — a stray
 * `status: template` placeholder under reports/ was always dead weight.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fsp from 'fs/promises';
import { existsSync } from 'fs';
import { createIncrementTemplates } from './template-creator.js';

describe('createIncrementTemplates rubric scaffolding (0865 AC-US1-05)', () => {
  let root: string;

  beforeEach(async () => {
    root = await fsp.mkdtemp(path.join(os.tmpdir(), 'tmpl-rubric-'));
    await fsp.mkdir(path.join(root, '.specweave', 'increments'), { recursive: true });
  });

  afterEach(async () => {
    await fsp.rm(root, { recursive: true, force: true });
  });

  it('TC-009: fresh scaffold writes NO reports/rubric.md placeholder', async () => {
    const incrementId = '0001-fresh-scaffold';
    const result = await createIncrementTemplates({
      incrementId,
      title: 'Fresh Scaffold',
      description: 'A fresh increment',
      projectRoot: root,
    });

    expect(result.success).toBe(true);

    const incrementPath = path.join(root, '.specweave', 'increments', incrementId);

    // No reports/rubric.md placeholder is written.
    expect(existsSync(path.join(incrementPath, 'reports', 'rubric.md'))).toBe(false);
    expect(result.createdFiles).not.toContain('reports/rubric.md');

    // Core scaffolding remains intact.
    expect(existsSync(path.join(incrementPath, 'spec.md'))).toBe(true);
    expect(existsSync(path.join(incrementPath, 'tasks.md'))).toBe(true);
    expect(existsSync(path.join(incrementPath, 'plan.md'))).toBe(true);
  });
});
