# ADR-0211: Unified External Tool Configuration Architecture

**Status**: Accepted
**Date**: 2025-12-18
**Author**: Claude (Opus 4.5)
**Category**: External Tools / Sync

## Context

External tool configuration (GitHub, JIRA, ADO) is currently fragmented across multiple locations with unclear precedence:

1. **Global level** (`config.json`)
   - `sync.profiles` - Profile-based sync config
   - `projectMappings` - Per-project → external tool mapping (v0.34.0+)

2. **Increment level** (`metadata.json`)
   - `externalLinks` - Legacy external references
   - `externalRefs` - Per-US external references (v0.33.0+)

3. **Per-US level** (`spec.md`)
   - `**Project**:` field determines target project

### Problems Identified

1. **Inconsistent tool selection logic** - Different parts of code make different decisions
2. **Implicit profile selection** - Increments don't explicitly specify which profile to use
3. **No validation at increment start** - Missing external config discovered late
4. **Competing configuration pathways** - Unclear which takes precedence
5. **Scattered sync state** - `metadata.github`, `metadata.jira`, `metadata.ado` with no schema

## Decision

### 1. Global Configuration is Authoritative

Sync profiles and project mappings remain in `config.json` (GLOBAL):
- Credentials are org-level, not per-increment
- Repository mappings are stable
- Reduces duplication

### 2. Increments Reference Profiles via `syncTarget`

Add explicit `syncTarget` field to increment metadata:

```typescript
interface SyncTarget {
  /** Profile ID from config.sync.profiles (e.g., "github-frontend") */
  profileId: string;

  /** Provider type for quick filtering */
  provider: 'github' | 'jira' | 'ado';

  /** How this target was determined */
  derivedFrom: 'user-selection' | 'project-mapping' | 'default-profile';

  /** Timestamp when target was set */
  setAt: string;
}
```

### 3. Create ExternalToolResolver Service

Single source of truth for external tool selection:

```typescript
class ExternalToolResolver {
  /**
   * Resolve external tool for an increment based on:
   * 1. Explicit syncTarget in metadata (highest priority)
   * 2. Project mapping from spec.md **Project**: field
   * 3. Default profile from config (fallback)
   */
  resolveForIncrement(incrementId: string): SyncTarget | null;

  /**
   * Resolve external tool for a specific project ID
   */
  resolveForProject(projectId: string): SyncTarget | null;

  /**
   * Validate that all required external tool config exists
   * Call at increment start to fail fast
   */
  validateIncrementConfig(incrementId: string): ValidationResult;
}
```

### 4. Resolution Priority

```
1. metadata.json → syncTarget.profileId (explicit)
2. spec.md → **Project**: field → config.projectMappings[projectId]
3. config.sync.defaultProfile (fallback)
4. null (no external tool configured)
```

### 5. Per-US External References (USExternalRefsMap)

Continue using existing `externalRefs` structure but ensure it's:
- Fully typed in TypeScript
- Used consistently by all sync operations
- Updated atomically with sync operations

## Implementation Plan

### Phase 1: Types and Resolver (v1.0.31)

1. Add `SyncTarget` interface to `increment-metadata.ts`
2. Create `ExternalToolResolver` class in `src/core/sync/`
3. Add `syncTarget` to `IncrementMetadataV2` interface

### Phase 2: Integration (v1.0.32)

1. Update `MetadataManager` to read/write `syncTarget`
2. Update increment creation to set `syncTarget` from project mappings
3. Add validation hook at increment start

### Phase 3: Migration (v1.0.33)

1. Auto-populate `syncTarget` for existing increments based on `externalRefs`
2. Deprecation warnings for direct `metadata.github/jira/ado` access

## Consequences

### Positive

- Single source of truth for external tool selection
- Explicit profile reference in metadata (auditable)
- Fail-fast validation at increment start
- Typed sync state instead of magic strings

### Negative

- Migration needed for existing increments
- Slightly more verbose metadata structure

### Neutral

- Global config structure unchanged (backward compatible)
- Per-US `externalRefs` structure unchanged

## Related ADRs

- ADR-0140: Per-US Project Fields
- ADR-0194: Config.json Separation (Secrets vs Config)
- ADR-0196: Project Registry EDA Sync
