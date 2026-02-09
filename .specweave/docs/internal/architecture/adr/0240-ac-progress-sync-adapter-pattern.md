# ADR-0240: AC Progress Sync — Function-Map Over Adapter Interface

**Date**: 2026-02-08
**Status**: Accepted (Revised)
**Increment**: 0194-provider-agnostic-ac-sync

## Context

Increment 0193 built the AC completion → progress comment → checkbox update → auto-close chain exclusively for GitHub. The same chain is needed for JIRA and ADO.

Investigation revealed the codebase already has **6 parallel adapter/provider systems** for external tools:
1. Project Adapters (`src/core/project/adapters/`) — project-level metadata
2. External Items Counter (`src/core/external-tools/providers/`) — read-only
3. SyncEngine ProviderAdapter (`src/sync/providers/`) — unified CRUD (tests only, not in production)
4. Plugin sync modules (`plugins/specweave-{github,jira,ado}/lib/`) — production sync
5. Shell handlers (`github-sync-handler.sh`, `github-ac-sync-handler.sh`) — hook triggers
6. SyncCoordinator (`src/sync/sync-coordinator.ts`) — legacy production orchestrator

Creating a new `ACProgressSyncAdapter` interface + `ACProgressSyncOrchestrator` class would be system #7. This is overengineering.

## Decision

Use a **function-map pattern** instead of adapter classes:

```typescript
type ACProgressSyncFn = (
  context: ACProgressContext,
  config: ProviderConfig,
) => Promise<ProviderSyncResult>;

const providerSyncFns: Record<SyncProvider, ACProgressSyncFn> = {
  github: syncGitHubACProgress,  // delegates to existing 0193 modules
  jira: syncJiraACProgress,      // calls JiraClient + JiraStatusSync
  ado: syncAdoACProgress,        // calls AdoClient + AdoStatusSync
};

export async function syncACProgressToProviders(
  incrementId: string,
  affectedUSIds: string[],
  specPath: string,
  config: SyncConfig,
): Promise<ACProgressSyncResult> {
  const context = buildACProgressContext(specPath, affectedUSIds);
  const results: ACProgressSyncResult = {};

  for (const [provider, syncFn] of Object.entries(providerSyncFns)) {
    if (!config.sync[provider]?.enabled) continue;
    try {
      results[provider] = await syncFn(context, config.sync[provider]);
    } catch (err) {
      results[provider] = { errors: [{ error: String(err) }] };
    }
  }
  return results;
}
```

Each provider function is ~50-80 lines calling existing infrastructure:
- **GitHub**: `postACProgressComments()` + `autoCloseCompletedUserStories()` (from 0193)
- **JIRA**: `JiraClient.addComment()` + REST description update + `JiraStatusSync.updateStatus()`
- **ADO**: `AdoClient.addComment()` + JSON Patch description + `AdoStatusSync.updateStatus()`

Adding a 4th provider = write one function, add to map.

## Alternatives Considered

1. **ACProgressSyncAdapter interface + Orchestrator class** (original ADR-0240): Creates system #7. Overengineered for a function that calls 3 existing clients.
2. **Wire into SyncEngine**: SyncEngine is not used in production (only tests). Wrong target.
3. **Wire into ProjectEventBus**: EventBus only handles project-level metadata. Wrong abstraction layer.
4. **Extend ProviderAdapter**: Bloats the CRUD interface with AC-specific methods.

## Consequences

**Positive**: No new abstractions. Reuses existing clients directly. ~200 lines total. Easy to understand.
**Negative**: Provider functions are not polymorphic (no shared interface). Acceptable — 3 providers is not enough to justify an interface.
