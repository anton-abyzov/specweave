/**
 * 0708 wrap-up: regression test for the AC-sync regex used by
 * `sync-progress`. The legacy pattern only matched `**AC-USN-NN**:` (colon
 * directly after the closing bold). Specs that use the parenthetical
 * annotation form `**AC-USN-NN** (P0): description` were not detected,
 * causing 23 false-positive `acSyncEvents` warnings on increment 0708.
 */
import { describe, it, expect } from 'vitest';
import { ACStatusManager } from './ac-status-manager.js';

describe('ACStatusManager.parseSpecForACs (0708 wrap-up — parenthetical AC format)', () => {
  const mgr = new ACStatusManager('/tmp/no-such-root');

  it('detects ACs in legacy "**AC-USN-NN**: description" form', () => {
    const spec = [
      '## Acceptance Criteria',
      '- [ ] **AC-US1-01**: Foo bar baz',
      '- [x] **AC-US1-02**: Already done',
    ].join('\n');
    const acs = mgr.parseSpecForACs(spec);
    expect(acs.has('AC-US1-01')).toBe(true);
    expect(acs.has('AC-US1-02')).toBe(true);
    expect(acs.get('AC-US1-02')?.checked).toBe(true);
  });

  it('detects ACs in parenthetical "**AC-USN-NN** (P0): description" form', () => {
    const spec = [
      '## Acceptance Criteria',
      '- [ ] **AC-US1-01** (P0): Foo bar baz',
      '- [x] **AC-US1-02** (NFR-001): Already done',
      '- [ ] **AC-US3-04** (some annotation): Mixed',
    ].join('\n');
    const acs = mgr.parseSpecForACs(spec);
    expect(acs.has('AC-US1-01')).toBe(true);
    expect(acs.has('AC-US1-02')).toBe(true);
    expect(acs.has('AC-US3-04')).toBe(true);
    expect(acs.get('AC-US1-02')?.checked).toBe(true);
  });
});
