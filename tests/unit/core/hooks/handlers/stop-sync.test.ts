/**
 * stop-sync hook handler tests
 *
 * Tests: pending event reading, deduplication, event clearing, always approve.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { HookInput, HookContext } from '../../../../../src/core/hooks/handlers/types.js';

const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn(),
}));

vi.mock('fs', () => mockFs);

import { handle } from '../../../../../src/core/hooks/handlers/stop-sync.js';

function makeContext(overrides?: Partial<HookContext>): HookContext {
  return {
    projectRoot: '/fake/project',
    stateDir: '/fake/project/.specweave/state',
    logsDir: '/fake/project/.specweave/logs',
    configPath: '/fake/project/.specweave/config.json',
    timestamp: '2026-03-27T00:00:00.000Z',
    ...overrides,
  };
}

describe('stop-sync handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue('');
  });

  describe('no pending events', () => {
    it('should approve immediately when pending.jsonl does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await handle({}, makeContext());
      expect(result.decision).toBe('approve');
    });

    it('should approve immediately when pending.jsonl is empty', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('');

      const result = await handle({}, makeContext());
      expect(result.decision).toBe('approve');
    });
  });

  describe('with pending events', () => {
    it('should process events and approve', async () => {
      const events = [
        '{"type":"task.updated","incrementId":"0001-feature","ts":"2026-03-27T00:00:00Z"}',
        '{"type":"task.completed","incrementId":"0001-feature","ts":"2026-03-27T00:01:00Z"}',
      ].join('\n');

      mockFs.existsSync.mockImplementation((p: string) => {
        if (String(p).includes('pending.jsonl')) return true;
        return false;
      });
      mockFs.readFileSync.mockImplementation((p: string) => {
        if (String(p).includes('pending.jsonl')) return events;
        return '';
      });

      const result = await handle({}, makeContext());
      expect(result.decision).toBe('approve');
    });

    it('should deduplicate events by increment ID', async () => {
      const events = [
        '{"type":"task.updated","incrementId":"0001-feature","ts":"2026-03-27T00:00:00Z"}',
        '{"type":"task.updated","incrementId":"0001-feature","ts":"2026-03-27T00:01:00Z"}',
        '{"type":"task.updated","incrementId":"0002-other","ts":"2026-03-27T00:02:00Z"}',
      ].join('\n');

      mockFs.existsSync.mockImplementation((p: string) => {
        if (String(p).includes('pending.jsonl')) return true;
        return false;
      });
      mockFs.readFileSync.mockImplementation((p: string) => {
        if (String(p).includes('pending.jsonl')) return events;
        return '';
      });

      const result = await handle({}, makeContext());
      expect(result.decision).toBe('approve');
      // Should have logged for both unique increments
      expect(mockFs.appendFileSync).toHaveBeenCalled();
    });

    it('should clear processed events from pending.jsonl', async () => {
      const events = '{"type":"task.updated","incrementId":"0001-feature","ts":"2026-03-27T00:00:00Z"}';

      mockFs.existsSync.mockImplementation((p: string) => {
        if (String(p).includes('pending.jsonl')) return true;
        return false;
      });
      mockFs.readFileSync.mockImplementation((p: string) => {
        if (String(p).includes('pending.jsonl')) return events;
        return '';
      });

      await handle({}, makeContext());
      // Should write empty content to clear the file
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('pending.jsonl'),
        '',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle malformed JSONL lines gracefully', async () => {
      const events = [
        '{"type":"task.updated","incrementId":"0001-feature"}',
        'not valid json',
        '{"type":"task.updated","incrementId":"0002-other"}',
      ].join('\n');

      mockFs.existsSync.mockImplementation((p: string) => {
        if (String(p).includes('pending.jsonl')) return true;
        return false;
      });
      mockFs.readFileSync.mockImplementation((p: string) => {
        if (String(p).includes('pending.jsonl')) return events;
        return '';
      });

      const result = await handle({}, makeContext());
      expect(result.decision).toBe('approve');
    });

    it('should never throw', async () => {
      mockFs.existsSync.mockImplementation(() => { throw new Error('boom'); });

      const result = await handle({}, makeContext());
      expect(result.decision).toBe('approve');
    });

    it('should handle events without increment IDs', async () => {
      const events = '{"type":"system.event","data":"no-increment-id"}';

      mockFs.existsSync.mockImplementation((p: string) => {
        if (String(p).includes('pending.jsonl')) return true;
        return false;
      });
      mockFs.readFileSync.mockImplementation((p: string) => {
        if (String(p).includes('pending.jsonl')) return events;
        return '';
      });

      const result = await handle({}, makeContext());
      expect(result.decision).toBe('approve');
    });
  });
});
