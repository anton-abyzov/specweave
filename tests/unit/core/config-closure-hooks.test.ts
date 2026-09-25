/**
 * Unit tests for closure hook config defaults (T-014)
 *
 * Closure hook flags are opt-in in 2.0: DEFAULT_CONFIG ships no `hooks` section.
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../../../src/core/config/types.js';

describe('closure hook config types and defaults', () => {
  it('DEFAULT_CONFIG ships no closure hook flags — they are opt-in (2.0)', () => {
    expect(DEFAULT_CONFIG.hooks).toBeUndefined();
  });
});
