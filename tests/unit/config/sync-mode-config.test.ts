/**
 * Sync Mode Config Tests
 *
 * Verifies the sync.mode config option type and default behavior.
 *
 * Satisfies: AC-US1-06 (T-005)
 */

import { describe, it, expect } from 'vitest';
import type { SyncConfiguration, SpecWeaveConfig } from '../../../src/core/config/types.js';
import { DEFAULT_CONFIG } from '../../../src/core/config/types.js';

describe('sync.mode config option', () => {
  it('SyncConfiguration accepts mode: "queued"', () => {
    const config: SyncConfiguration = {
      enabled: true,
      direction: 'bidirectional',
      autoSync: false,
      includeStatus: true,
      autoApplyLabels: true,
      mode: 'queued',
    };
    expect(config.mode).toBe('queued');
  });

  it('SyncConfiguration accepts mode: "immediate"', () => {
    const config: SyncConfiguration = {
      enabled: true,
      direction: 'bidirectional',
      autoSync: false,
      includeStatus: true,
      autoApplyLabels: true,
      mode: 'immediate',
    };
    expect(config.mode).toBe('immediate');
  });

  it('SyncConfiguration mode is optional (defaults to undefined)', () => {
    const config: SyncConfiguration = {
      enabled: true,
      direction: 'bidirectional',
      autoSync: false,
      includeStatus: true,
      autoApplyLabels: true,
    };
    expect(config.mode).toBeUndefined();
  });

  it('DEFAULT_CONFIG.sync does not set mode (consumers default to "queued")', () => {
    const syncMode = (DEFAULT_CONFIG.sync as any)?.mode;
    // Not explicitly set in defaults -- consumers use ?? 'queued'
    expect(syncMode).toBeUndefined();
  });

  it('consumer code defaults undefined to "queued"', () => {
    const config: SpecWeaveConfig = { ...DEFAULT_CONFIG };
    const syncMode = (config.sync as any)?.mode ?? 'queued';
    expect(syncMode).toBe('queued');
  });
});
