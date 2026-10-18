import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// The capture is slow on purpose: a handoff that lands while it runs must
// still count as newer than the checkpoint, whose state predates it.
const capture = vi.hoisted(() => ({ startedAt: 0 }));
vi.mock('../../../../src/core/session/work-handoff.js', () => ({
  buildWorkHandoff: async (_cwd: string, opts: { out: string }) => {
    capture.startedAt = Date.now();
    await new Promise((r) => setTimeout(r, 60));
    fs.writeFileSync(opts.out, '# Local checkpoint\n');
    const diffPath = path.join(path.dirname(opts.out), 'handoff.diff');
    fs.writeFileSync(diffPath, '');
    return { docPath: opts.out, diffPath };
  },
}));

import { cleanupCheckpointRequest, prepareSessionCheckpoint, readSessionCheckpoint, runSessionCheckpoint } from '../../../../src/core/session/session-checkpoint.js';

let root: string;
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('checkpoint savedAt', () => {
  it('is when the capture started, not when the receipt was published', async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-checkpoint-at-'));
    const home = path.join(root, 'home');
    const cwd = path.join(root, 'plain');
    fs.mkdirSync(home);
    fs.mkdirSync(cwd);
    const input = { session_id: 's1', cwd };
    const request = prepareSessionCheckpoint(input, { home });
    expect(request).toBeDefined();
    await runSessionCheckpoint(request!);
    cleanupCheckpointRequest(request!);
    const receipt = readSessionCheckpoint(input, { home });
    expect(receipt).toBeDefined();
    expect(Date.parse(receipt!.savedAt)).toBeLessThanOrEqual(capture.startedAt);
  });
});
