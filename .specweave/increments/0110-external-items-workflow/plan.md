# Implementation Plan: External Items Workflow

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    External Items Lifecycle                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GitHub Issues ──┬──> /import-external ──> FS-XXXE in specs     │
│                  │                              │                │
│  JIRA Epics ─────┤                              ▼                │
│                  │                    Create/Reopen Increment    │
│  ADO Work Items ─┘                              │                │
│                                                 ▼                │
│                                          Work on Tasks           │
│                                                 │                │
│                                                 ▼                │
│                                          /specweave:done         │
│                                                 │                │
│                                                 ▼                │
│                                    Auto-close GitHub Issue       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 1: Enhance Import (T-001, T-002)

**Goal**: Ensure imported items create proper FS-XXXE structure

1. Wire up `/specweave:import-external` command in CLI
2. Ensure proper folder structure: `specs/{project}/FS-XXXE/`
3. Include external_id in frontmatter for linking

## Phase 2: Increment-External Linking (T-003)

**Goal**: Allow increments to reference external items

1. Add `external_ref` field to metadata schema
2. Modify `/specweave:increment` to accept `--external FS-XXXE` flag
3. Auto-populate spec from external item content

## Phase 3: Reopen Detection (T-004)

**Goal**: Find and reopen existing increments for external items

1. Query increments by external_ref.id
2. Prompt user for reopen vs new
3. Handle reopen state transition

## Phase 4: Auto-Close on Completion (T-005, T-006)

**Goal**: Close GitHub issues when increment completes

1. Extend `/specweave:done` hook to check external_ref
2. Use `gh issue close` with completion summary
3. Update living docs status to "closed"

## Key Files

| File | Purpose |
|------|---------|
| `src/cli/commands/import-external.ts` | Import coordinator |
| `src/importers/item-converter.ts` | Convert to FS-XXXE |
| `src/core/increment/metadata-manager.ts` | Add external_ref |
| `plugins/specweave/hooks/post-increment-done.sh` | Auto-close hook |
| `src/sync/external-item-sync.ts` | NEW: Bidirectional sync |
