/**
 * ADO credential resolver tests (0865 T-006).
 *
 * The ADO runtime resolver (`ado-pat-provider.getAdoPat`) MUST accept the same
 * PAT aliases as `sync-health`: AZURE_DEVOPS_PAT, AZURE_DEVOPS_TOKEN, ADO_PAT
 * (plus the org-specific AZURE_DEVOPS_PAT_{ORG} precedence). Health was reporting
 * green while runtime writes threw "PAT not found" because the alias surfaces
 * diverged. Both now route through the canonical alias table in
 * credentials-manager (`ADO_PAT_ALIASES` / `resolveAdoPat`).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAdoPat, hasAdoPat } from './ado-pat-provider.js';
import { ADO_PAT_ALIASES, resolveAdoPat } from '../../core/credentials/credentials-manager.js';
import { maskValue } from '../../utils/credential-masker.js';

const ADO_ENV_KEYS = [
  'AZURE_DEVOPS_PAT',
  'AZURE_DEVOPS_TOKEN',
  'ADO_PAT',
  'AZURE_DEVOPS_PAT_ACME_CORP',
];

function clearAdoEnv() {
  for (const key of ADO_ENV_KEYS) {
    delete process.env[key];
  }
}

describe('ADO credential resolver — alias unification', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ADO_ENV_KEYS) saved[key] = process.env[key];
    clearAdoEnv();
  });

  afterEach(() => {
    for (const key of ADO_ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it('exposes the canonical ADO alias table', () => {
    expect(ADO_PAT_ALIASES).toEqual([
      'AZURE_DEVOPS_PAT',
      'AZURE_DEVOPS_TOKEN',
      'ADO_PAT',
    ]);
  });

  // TC-013: only AZURE_DEVOPS_TOKEN set → resolves
  it('TC-013: resolves when only AZURE_DEVOPS_TOKEN is set', () => {
    process.env.AZURE_DEVOPS_TOKEN = 'token-via-azure-devops-token';

    expect(resolveAdoPat()).toBe('token-via-azure-devops-token');
    expect(getAdoPat('acme-corp')).toBe('token-via-azure-devops-token');
    expect(hasAdoPat('acme-corp')).toBe(true);
  });

  // TC-014: only ADO_PAT set → resolves
  it('TC-014: resolves when only ADO_PAT is set', () => {
    process.env.ADO_PAT = 'pat-via-ado-pat';

    expect(resolveAdoPat()).toBe('pat-via-ado-pat');
    expect(getAdoPat('acme-corp')).toBe('pat-via-ado-pat');
    expect(hasAdoPat()).toBe(true);
  });

  // TC-015: resolved value is masked when serialized/logged
  it('TC-015: resolved credential is masked when logged', () => {
    process.env.ADO_PAT = 'super-secret-pat-value-1234567890';
    const resolved = resolveAdoPat();
    expect(resolved).toBe('super-secret-pat-value-1234567890');

    const masked = maskValue(resolved!);
    expect(masked).not.toContain('super-secret-pat-value-1234567890');
    expect(masked).not.toBe(resolved);
  });

  it('org-specific PAT takes precedence over the generic aliases', () => {
    process.env.AZURE_DEVOPS_PAT = 'generic-pat';
    process.env.AZURE_DEVOPS_PAT_ACME_CORP = 'org-specific-pat';

    expect(getAdoPat('acme-corp')).toBe('org-specific-pat');
    // resolveAdoPat with org arg also honors org precedence
    expect(resolveAdoPat('acme-corp')).toBe('org-specific-pat');
    // ...but a different org falls back to the generic alias
    expect(getAdoPat('other-org')).toBe('generic-pat');
  });

  it('AZURE_DEVOPS_PAT wins over AZURE_DEVOPS_TOKEN and ADO_PAT (order)', () => {
    process.env.AZURE_DEVOPS_PAT = 'primary';
    process.env.AZURE_DEVOPS_TOKEN = 'secondary';
    process.env.ADO_PAT = 'tertiary';

    expect(resolveAdoPat()).toBe('primary');
  });

  it('getAdoPat throws when no alias is set', () => {
    expect(() => getAdoPat('acme-corp')).toThrow(/PAT not found/i);
    expect(hasAdoPat('acme-corp')).toBe(false);
    expect(resolveAdoPat()).toBeUndefined();
  });
});
