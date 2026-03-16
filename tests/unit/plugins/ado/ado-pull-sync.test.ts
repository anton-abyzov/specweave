import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pullAdoChanges, mapAdoStateToSpecweave, type PullSyncContext } from '../../../../plugins/specweave-ado/lib/ado-pull-sync.js';

describe('pullAdoChanges — last-write-wins', () => {
  const makePullContext = (overrides: Partial<PullSyncContext> = {}): PullSyncContext => ({
    localStatus: 'active',
    localUpdatedAt: new Date('2026-03-10T00:00:00Z'),
    adoState: 'Active',
    adoModifiedAt: new Date('2026-03-10T00:00:00Z'),
    workItemId: 42,
    canUpsertInternalItems: true,
    ...overrides,
  });

  it('updates metadata when ADO is newer and state differs', () => {
    const ctx = makePullContext({
      localStatus: 'active',
      localUpdatedAt: new Date('2026-03-10T00:00:00Z'),
      adoState: 'Closed',
      adoModifiedAt: new Date('2026-03-15T00:00:00Z'),
    });

    const result = pullAdoChanges(ctx);

    expect(result.changed).toBe(true);
    expect(result.newStatus).toBe('completed');
  });

  it('keeps local when local is newer than ADO', () => {
    const ctx = makePullContext({
      localStatus: 'active',
      localUpdatedAt: new Date('2026-03-16T00:00:00Z'),
      adoState: 'Closed',
      adoModifiedAt: new Date('2026-03-10T00:00:00Z'),
    });

    const result = pullAdoChanges(ctx);

    expect(result.changed).toBe(false);
  });

  it('returns no change when canUpsertInternalItems is false', () => {
    const ctx = makePullContext({
      localStatus: 'active',
      localUpdatedAt: new Date('2026-03-10T00:00:00Z'),
      adoState: 'Closed',
      adoModifiedAt: new Date('2026-03-15T00:00:00Z'),
      canUpsertInternalItems: false,
    });

    const result = pullAdoChanges(ctx);

    expect(result.changed).toBe(false);
  });

  it('returns no change when states are equivalent', () => {
    const ctx = makePullContext({
      localStatus: 'active',
      localUpdatedAt: new Date('2026-03-10T00:00:00Z'),
      adoState: 'Active',
      adoModifiedAt: new Date('2026-03-15T00:00:00Z'),
    });

    const result = pullAdoChanges(ctx);

    expect(result.changed).toBe(false);
  });
});

describe('mapAdoStateToSpecweave', () => {
  it('maps New to planned', () => {
    expect(mapAdoStateToSpecweave('New')).toBe('planned');
  });

  it('maps Active to active', () => {
    expect(mapAdoStateToSpecweave('Active')).toBe('active');
  });

  it('maps Closed to completed', () => {
    expect(mapAdoStateToSpecweave('Closed')).toBe('completed');
  });

  it('maps Removed to abandoned', () => {
    expect(mapAdoStateToSpecweave('Removed')).toBe('abandoned');
  });

  it('defaults unknown states to active', () => {
    expect(mapAdoStateToSpecweave('SomeWeirdState')).toBe('active');
  });

  it('maps Resolved to completed', () => {
    expect(mapAdoStateToSpecweave('Resolved')).toBe('completed');
  });

  it('maps Done to completed', () => {
    expect(mapAdoStateToSpecweave('Done')).toBe('completed');
  });

  it('maps To Do to planned', () => {
    expect(mapAdoStateToSpecweave('To Do')).toBe('planned');
  });

  it('maps Doing to active', () => {
    expect(mapAdoStateToSpecweave('Doing')).toBe('active');
  });
});
