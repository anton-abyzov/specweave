# ADR-0234: SyncEngine Unified API Design

**Date**: 2026-02-06
**Status**: Accepted
**Increment**: 0190-sync-architecture-redesign

## Context

Sync logic is spread across 17+ files: SyncCoordinator (2000+ lines), FormatPreservationSyncService, ExternalChangePuller, 3 reconcilers, StatusMapper, ProviderRouter, etc. This creates maintenance burden and makes the sync flow hard to follow.

## Decision

Consolidate into a single `SyncEngine` class with provider adapters:

```typescript
class SyncEngine {
  constructor(config: SyncConfig, providers: Map<Platform, ProviderAdapter>)

  // Unified operations
  async push(incrementId: string, options?: PushOptions): Promise<SyncResult>
  async pull(incrementId?: string): Promise<PullResult>
  async reconcile(incrementId?: string): Promise<ReconcileResult>

  // Lifecycle
  async setup(): Promise<SetupResult>  // Interactive wizard
  async validate(): Promise<ValidationResult>
}

interface ProviderAdapter {
  platform: Platform
  createIssue(us: UserStory, feature: Feature): Promise<ExternalRef>
  updateIssue(ref: ExternalRef, changes: ChangeSet): Promise<void>
  closeIssue(ref: ExternalRef, comment?: string): Promise<void>
  pullChanges(since: Date): Promise<ExternalChange[]>
  reconcile(expected: ItemState[]): Promise<ReconcileResult>
  detectHierarchy(): Promise<HierarchyMapping>
}
```

Module structure:
```
src/sync/engine.ts        → SyncEngine (core orchestration)
src/sync/config.ts        → SyncConfig, presets, validation
src/sync/migration.ts     → E→G/J/A migration logic
src/sync/projects-v2.ts   → GitHub Projects v2 GraphQL
src/sync/providers/github.ts → GitHubAdapter implements ProviderAdapter
src/sync/providers/jira.ts   → JiraAdapter implements ProviderAdapter
src/sync/providers/ado.ts    → AdoAdapter implements ProviderAdapter
```

## Alternatives Considered

1. **Function-based (push.ts/pull.ts)**: Groups by operation, fragments provider logic across files
2. **Keep current structure**: 17+ files, proven difficult to maintain and debug

## Consequences

**Positive**: Single entry point, clear provider contract, ~70% fewer files
**Negative**: Large refactor, temporary dual code paths during migration
