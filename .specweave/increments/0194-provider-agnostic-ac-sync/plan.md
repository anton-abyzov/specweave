# Implementation Plan: Provider-Agnostic AC Progress Sync

## Overview

Replace the GitHub-only AC sync chain with a simple function-map pattern. One function (`syncACProgressToProviders`) iterates enabled providers, calling existing client libraries directly. No adapter interfaces, no orchestrator classes. GitHub delegates to existing 0193 modules as-is. JIRA/ADO call their existing clients. Dead sync code is cleaned up.

## Architecture

See ADRs: [0240 (revised)](../../docs/internal/architecture/adr/0240-ac-progress-sync-adapter-pattern.md), [0241](../../docs/internal/architecture/adr/0241-ac-checkbox-formatter-extraction.md), [0242](../../docs/internal/architecture/adr/0242-per-us-link-extension-jira-ado.md)

### New Files

```
src/core/
├── ac-progress-sync.ts           # syncACProgressToProviders() + provider map + context builder
├── ac-checkbox-formatter.ts      # formatACCheckboxes(acStates, 'github'|'jira'|'ado')

plugins/specweave/hooks/v2/
├── ac-sync-dispatcher.sh         # Unified, replaces github-ac-sync-handler.sh
```

That's it. 3 new files. No adapter classes, no orchestrator, no per-provider adapter files.

### Data Flow

```
Edit(tasks.md) → PostToolUse hook
  → task-ac-sync-guard.sh (sync, updates spec.md ACs)
    → ac-sync-dispatcher.sh (background, 5s debounce)
      → node: syncACProgressToProviders()
        → buildACProgressContext(specPath)
        → if github enabled: postACProgressComments() + autoCloseCompletedUserStories()
        → if jira enabled:   JiraClient.addComment() + update description + JiraStatusSync.updateStatus()
        → if ado enabled:    AdoClient.addComment() + update description + AdoStatusSync.updateStatus()
        → return aggregated results
```

### Key Types

```typescript
// src/core/ac-progress-sync.ts
interface ACProgressContext {
  incrementId: string;
  affectedUSIds: string[];
  specPath: string;
  userStories: Map<string, {
    acStates: Array<{ id: string; description: string; completed: boolean }>;
    links: {
      github?: { issueNumber: number; owner: string; repo: string };
      jira?: { issueKey: string };
      ado?: { workItemId: number };
    };
  }>;
}

interface ProviderSyncResult {
  posted: Array<{ usId: string; ref: string }>;
  closed: Array<{ usId: string; ref: string }>;
  skipped: Array<{ usId: string; reason: string }>;
  errors: Array<{ usId: string; error: string }>;
}

type ACProgressSyncResult = Partial<Record<SyncProvider, ProviderSyncResult>>;
```

### Per-US Link Types (ADR-0242)

```typescript
// Added to src/core/types/sync-profile.ts
interface JiraUserStoryLink { issueKey: string; issueUrl: string; syncedAt: string }
interface AdoUserStoryLink { workItemId: number; workItemUrl: string; syncedAt: string }
```

## Technology Stack

- **Language**: TypeScript (ESM)
- **Test Framework**: Vitest with `vi.hoisted()` + `vi.mock()` pattern
- **Existing Libraries**: `JiraClient`, `AdoClient`, `comment-builder.ts`, `JiraStatusSync`, `AdoStatusSync`, `postACProgressComments`, `autoCloseCompletedUserStories`
- **Shell**: Bash for `ac-sync-dispatcher.sh`

## Implementation Phases

### Phase 1: Core Function + Formatter (US-001)
1. Create `ac-checkbox-formatter.ts` — `formatACCheckboxes()` with 3 formats
2. Create `ac-progress-sync.ts` — `buildACProgressContext()` + `syncACProgressToProviders()` + GitHub provider function (delegates to 0193 modules)

### Phase 2: JIRA + ADO Provider Functions (US-002, US-003)
3. Add `syncJiraACProgress()` to provider map — comment + description + transition
4. Add `syncAdoACProgress()` to provider map — comment + description + state

### Phase 3: Dispatcher + Link Types (US-004)
5. Add `JiraUserStoryLink` and `AdoUserStoryLink` types to `sync-profile.ts`
6. Create `ac-sync-dispatcher.sh` (preserves debounce/circuit-breaker/locking from 0193)
7. Update `post-tool-use.sh` to reference new dispatcher

### Phase 4: Tests (US-005)
8. Unit tests for `syncACProgressToProviders()` — dispatch, error isolation, disabled providers
9. Per-provider tests — GitHub delegation, JIRA format/transition, ADO format/state
10. Format-specific assertions — `(/)/(x)`, `☑/☐`, `[x]/[ ]`

### Phase 5: Cleanup (US-006)
11. Remove dead files (ThreeLayerSyncManager, github-increment-sync-cli, etc.)
12. Remove old `github-ac-sync-handler.sh`
13. Verify all tests pass

## Testing Strategy

- **TDD strict**: RED → GREEN → REFACTOR per task
- **Unit tests**: Mock `JiraClient`, `AdoClient`, `execFileNoThrow` (for GitHub)
- **Format tests**: Assert exact checkbox strings per provider
- **Backward compatibility**: All 31 existing GitHub tests pass unchanged
- **Integration test**: Full chain with mocked providers

## Technical Challenges

### Challenge 1: JIRA Transitions API Variability
**Problem**: "Done" transition name varies per JIRA project.
**Solution**: `JiraStatusSync.updateStatus()` already handles this via category matching. Direct delegation.

### Challenge 2: Private AC Formatters
**Problem**: `buildJiraDescription()` and `generateStoryDescription()` are private in existing sync modules.
**Solution**: New `ac-checkbox-formatter.ts` handles AC-only formatting (ADR-0241). Existing private functions untouched.

### Challenge 3: Per-US Links Not Yet Populated for JIRA/ADO
**Problem**: JIRA/ADO frontmatter only has feature-level links. Per-US links must exist for AC sync.
**Solution**: Skip user stories with `reason: 'no-issue-link'`. Clear log messages. Populating links is handled by existing push-sync commands.
