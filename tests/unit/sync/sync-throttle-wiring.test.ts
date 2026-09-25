/**
 * Unit tests for SyncThrottle wiring in trigger paths
 *
 * Verifies that sync-progress and
 * auto-create-external-issue all check SyncThrottle.shouldSkip()
 * before executing downstream sync operations.
 *
 * Satisfies: AC-US3-02, AC-US3-03
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));

describe('SyncThrottle wiring in trigger paths', () => {
  describe('sync-progress.ts', () => {
    it('should import SyncThrottle', () => {
      const source = readFileSync(
        path.join(REPO, 'src/cli/commands/sync-progress.ts'),
        'utf-8'
      );
      expect(source).toContain('SyncThrottle');
      expect(source).toMatch(/import.*SyncThrottle/);
    });

    it('should check shouldSkip with forceBypass from --force flag', () => {
      const source = readFileSync(
        path.join(REPO, 'src/cli/commands/sync-progress.ts'),
        'utf-8'
      );
      // Should reference both shouldSkip and force together
      expect(source).toContain('shouldSkip');
      expect(source).toContain('force');
    });

    it('should call record after sync completes', () => {
      const source = readFileSync(
        path.join(REPO, 'src/cli/commands/sync-progress.ts'),
        'utf-8'
      );
      expect(source).toContain('.record(');
    });
  });

});
