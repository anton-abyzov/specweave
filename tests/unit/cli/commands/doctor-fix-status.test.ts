import { describe, it, expect, vi } from 'vitest';
import { fixStatusDesyncs } from '../../../../src/cli/commands/doctor.js';

function detector(desyncs: string[], fixable: string[]) {
  return {
    scanAll: vi.fn().mockResolvedValue({
      totalScanned: 3,
      totalDesyncs: desyncs.length,
      desyncs: desyncs.map((id) => ({ incrementId: id, hasDesync: true })),
      healthy: [],
      errors: [],
    }),
    fixDesync: vi.fn(async (id: string) => fixable.includes(id)),
  } as any;
}

describe('doctor --fix-status (formerly sw:sync-status)', () => {
  it('fixes every metadata/spec desync the detector reports', async () => {
    const d = detector(['0001-a', '0002-b'], ['0001-a']);
    const result = await fixStatusDesyncs('/tmp/project', { quiet: true }, d);
    expect(d.fixDesync).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ scanned: 3, desyncs: ['0001-a', '0002-b'], fixed: ['0001-a'] });
  });

  it('is a no-op when everything is in sync', async () => {
    const d = detector([], []);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const result = await fixStatusDesyncs('/tmp/project', {}, d);
    expect(d.fixDesync).not.toHaveBeenCalled();
    expect(result.fixed).toEqual([]);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('no metadata/spec desyncs'));
  });
});
