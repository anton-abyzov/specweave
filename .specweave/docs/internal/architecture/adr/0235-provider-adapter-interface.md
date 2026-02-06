# ADR-0235: Provider Adapter Interface

**Date**: 2026-02-06
**Status**: Accepted
**Increment**: 0190-sync-architecture-redesign

## Context

Each provider (GitHub, JIRA, ADO) has different APIs, auth patterns, and data models but needs to support the same sync operations. Current code has parallel implementations with significant duplication.

## Decision

Define a `ProviderAdapter` interface that each provider implements:

```typescript
type Platform = 'github' | 'jira' | 'ado'

interface ProviderAdapter {
  readonly platform: Platform
  readonly suffix: 'G' | 'J' | 'A'

  // Connection
  testConnection(): Promise<{ ok: boolean; error?: string }>

  // CRUD
  createIssue(story: UserStoryData, feature: FeatureData): Promise<ExternalRef>
  updateIssue(ref: ExternalRef, changes: FieldChanges): Promise<void>
  closeIssue(ref: ExternalRef, comment?: string): Promise<void>
  reopenIssue(ref: ExternalRef): Promise<void>

  // Pull
  pullChanges(since: Date): Promise<ExternalChange[]>
  getIssueState(ref: ExternalRef): Promise<ItemState>

  // Labels/metadata
  applyLabels(ref: ExternalRef, labels: Label[]): Promise<void>

  // Hierarchy
  detectHierarchy(): Promise<DetectedHierarchy>

  // Reconciliation
  reconcile(items: ExpectedState[]): Promise<ReconcileResult>
}

interface ExternalRef {
  platform: Platform
  id: string           // GitHub: "123", JIRA: "PROJ-456", ADO: "789"
  url: string
  userStory: string    // US-001
}
```

Each adapter handles its own auth, API calls, and status mapping internally. The SyncEngine only works with the interface.

## Consequences

**Positive**: Clean separation, testable with mocks, easy to add new providers
**Negative**: Some provider-specific features (GitHub Projects v2) need extension interface
