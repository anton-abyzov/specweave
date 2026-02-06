# Implementation Plan: Sync Architecture Redesign

## Overview

Comprehensive redesign of SpecWeave's external sync system. Replace the E suffix with platform suffixes (G/J/A), consolidate 17+ files into 7 provider-based modules, add GitHub Projects v2 support, implement permission presets, and fix all broken sync behavior.

## Architecture

See ADRs: [0233](../../docs/internal/architecture/adr/0233-platform-suffix-id-system.md), [0234](../../docs/internal/architecture/adr/0234-sync-engine-unified-api.md), [0235](../../docs/internal/architecture/adr/0235-provider-adapter-interface.md), [0236](../../docs/internal/architecture/adr/0236-permission-preset-system.md), [0237](../../docs/internal/architecture/adr/0237-hierarchy-auto-detection.md), [0238](../../docs/internal/architecture/adr/0238-github-projects-v2-integration.md)

### Components

- **SyncEngine** (`sync/engine.ts`): Central orchestrator with `push()`, `pull()`, `reconcile()` methods
- **SyncConfig** (`sync/config.ts`): Preset system, validation, backward compat with old boolean flags
- **ProviderAdapters** (`sync/providers/*.ts`): GitHub, JIRA, ADO adapters implementing `ProviderAdapter` interface
- **ProjectsV2** (`sync/projects-v2.ts`): GitHub GraphQL integration for Projects v2
- **Migration** (`sync/migration.ts`): E→G/J/A suffix migration with atomic renames

### Data Model

```typescript
// Platform suffix mapping
type PlatformSuffix = 'G' | 'J' | 'A' | 'E'  // E = legacy
type Platform = 'github' | 'jira' | 'ado'
const SUFFIX_MAP: Record<Platform, PlatformSuffix> = { github: 'G', jira: 'J', ado: 'A' }

// Unified ID parsing
interface ParsedId {
  prefix: 'FS' | 'US' | 'T'
  number: number
  suffix?: PlatformSuffix
  platform?: Platform
  isExternal: boolean
}

// Permission preset
type SyncPreset = 'read-only' | 'push-only' | 'bidirectional' | 'full-control'

// Hierarchy mapping
interface HierarchyMapping {
  pattern: 'flat' | 'standard' | 'safe' | 'custom'
  levels: HierarchyLevel[]
  collapsing: CollapsingRule[]
}
```

## Technology Stack

- **Language**: TypeScript (ESM, .js imports)
- **GitHub API**: REST v3 (Issues) + GraphQL (Projects v2)
- **JIRA API**: REST v3 (cloud) / v2 (server)
- **ADO API**: REST v7.1
- **Testing**: Vitest (unit), real API calls (E2E)

**Architecture Decisions**:
- ADR-0233: Platform suffix G/J/A replaces E suffix with independent namespaces
- ADR-0234: Single SyncEngine replaces 17+ scattered modules
- ADR-0235: ProviderAdapter interface for clean provider separation
- ADR-0236: Permission presets (4) replace 8+ boolean flags
- ADR-0237: Auto-detect hierarchy with collapsing rules (flat tasks = US)
- ADR-0238: GitHub Projects v2 via GraphQL as separate module

## Implementation Phases

### Phase 1: Foundation (US-001, US-002, US-011)
1. Implement platform suffix ID parsing (`ParsedId`, `isExternalId()`, `getPlatformFromSuffix()`)
2. Update increment folder naming to support `####G/J/A-name` format
3. Update `deriveFeatureId()` to handle platform suffixes
4. Fix config validation (detect contradictions, emit warnings)
5. Write unit tests for all ID parsing and config validation

### Phase 2: Core Engine (US-006, US-007, US-004, US-008)
1. Define `ProviderAdapter` interface
2. Implement `SyncEngine` with push/pull/reconcile
3. Migrate GitHub logic into `GitHubAdapter`
4. Migrate JIRA logic into `JiraAdapter`
5. Migrate ADO logic into `AdoAdapter`
6. Implement permission preset system
7. Fix label generation (priority mapping, deduplicate)
8. Update issue title format to `US-XXX: Title`

### Phase 3: Hierarchy & Detection (US-005)
1. Implement `detectHierarchy()` in each adapter
2. Implement collapsing rules (flat Task → US mapping)
3. Implement AC auto-extraction from descriptions
4. Add hierarchy confirmation flow to setup

### Phase 4: GitHub Projects v2 (US-009)
1. Implement GraphQL client for Projects v2
2. Add project discovery and field mapping
3. Implement bidirectional status sync via project fields
4. Integrate with setup wizard

### Phase 5: Setup & Migration (US-010, US-003)
1. Create `/sw:sync-setup` skill with AskUserQuestion flow
2. Implement credential validation (test API calls)
3. Implement E→G/J/A migration script
4. Add `specweave migrate-sync` CLI command

### Phase 6: E2E Testing (US-012)
1. GitHub E2E: create issue → update → sync status → cleanup
2. JIRA E2E: create story → transition → verify
3. ADO E2E: create work item → update state → verify
4. CI pipeline with scheduled runs and secret management

## Testing Strategy

- **Unit tests**: All ID parsing, config validation, preset resolution, hierarchy collapsing (Vitest)
- **Integration tests**: Provider adapters with mocked API responses
- **E2E tests**: Real API calls against GitHub (specweave repo), JIRA (test project), ADO (test org)
- **Regression**: All existing sync tests must pass or be migrated
- **Coverage target**: 90% (per config)

## Technical Challenges

### Challenge 1: Atomic E→G/J/A Migration
**Solution**: Transaction-style migration: scan all references, build rename plan, validate no conflicts, execute renames, update all cross-references in one pass
**Risk**: Interrupted migration leaves inconsistent state. Mitigation: write migration plan to file first, support resume from plan.

### Challenge 2: GitHub Projects v2 GraphQL Complexity
**Solution**: Use GitHub's `@octokit/graphql` or raw `fetch` with typed queries. Cache project schema (fields, options) to avoid repeated introspection.
**Risk**: GraphQL schema changes. Mitigation: version-pin queries, test against real API in E2E.

### Challenge 3: Hierarchy Auto-Detection Accuracy
**Solution**: Sample recent items (last 50), detect parent-child relationships, match against known patterns. Always require user confirmation.
**Risk**: Unusual project structures misclassified. Mitigation: template fallback (user picks from Flat/Standard/SAFe/Custom).

### Challenge 4: Backward Compatibility
**Solution**: Dual-format support during deprecation period. Old E suffix recognized everywhere, new G/J/A preferred. Old boolean permissions honored when preset not set.
**Risk**: Edge cases where old and new formats interact. Mitigation: comprehensive unit tests for all format combinations.
