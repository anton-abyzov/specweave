/**
 * ADO Pull Sync — Bidirectional state synchronization
 *
 * Implements last-write-wins conflict resolution for pulling
 * ADO work item state changes back into SpecWeave metadata.
 *
 * @module ado-pull-sync
 */

export interface PullSyncContext {
  localStatus: string;
  localUpdatedAt: Date;
  adoState: string;
  adoModifiedAt: Date;
  workItemId: number;
  canUpsertInternalItems: boolean;
}

export interface PullSyncResult {
  changed: boolean;
  newStatus?: string;
  reason?: string;
}

/**
 * Map ADO work item states to SpecWeave statuses.
 *
 * Covers Agile/Scrum/Basic process templates.
 */
export function mapAdoStateToSpecweave(adoState: string): string {
  const map: Record<string, string> = {
    'New': 'planned',
    'To Do': 'planned',
    'Active': 'active',
    'Doing': 'active',
    'In Progress': 'active',
    'Resolved': 'completed',
    'Closed': 'completed',
    'Done': 'completed',
    'Removed': 'abandoned',
  };

  return map[adoState] ?? 'active';
}

/**
 * Determine if ADO changes should override local state.
 *
 * Uses last-write-wins: if ADO was modified more recently than local,
 * and the mapped state differs, update local metadata.
 */
export function pullAdoChanges(ctx: PullSyncContext): PullSyncResult {
  if (!ctx.canUpsertInternalItems) {
    return { changed: false, reason: 'canUpsertInternalItems is false' };
  }

  const mappedStatus = mapAdoStateToSpecweave(ctx.adoState);

  // Same effective status — no change needed
  if (mappedStatus === ctx.localStatus) {
    return { changed: false, reason: 'states are equivalent' };
  }

  // Last-write-wins: ADO must be newer
  if (ctx.adoModifiedAt.getTime() <= ctx.localUpdatedAt.getTime()) {
    return { changed: false, reason: 'local is newer' };
  }

  return {
    changed: true,
    newStatus: mappedStatus,
    reason: `ADO state "${ctx.adoState}" is newer — updating to "${mappedStatus}"`,
  };
}
