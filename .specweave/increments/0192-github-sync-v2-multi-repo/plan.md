# Implementation Plan: GitHub Sync V2

## Overview

Extend the existing `github-spec-sync.ts` with bidirectional sync, replace the V1 board resolver with a Projects V2 GraphQL client, wire up distributed multi-repo routing, create an Agent Teams orchestration skill, and remove deprecated code. All work is within `plugins/specweave-github/` with minor type extensions in `src/core/types/`.

## Architecture

### Components

```
plugins/specweave-github/
├── lib/
│   ├── github-spec-sync.ts          # EXTEND: add pull direction + two-way
│   ├── github-graphql-client.ts      # NEW: Projects V2 GraphQL wrapper
│   ├── github-board-resolver-v2.ts   # NEW: replaces V1 board resolver
│   ├── github-conflict-resolver.ts   # NEW: field-level conflict detection
│   ├── github-rate-limiter.ts        # NEW: shared token bucket
│   ├── github-issue-body-parser.ts   # NEW: parse AC checkboxes from issue body
│   ├── github-multi-project-sync.ts  # EXTEND: cross-repo issue linking
│   ├── github-board-resolver.ts      # DELETE: V1 Classic Projects (deprecated)
│   ├── task-sync.ts                  # DELETE: deprecated increment sync
│   └── task-parser.ts               # DELETE: deprecated increment sync
├── skills/
│   ├── github-sync/SKILL.md          # UPDATE: document new commands
│   ├── github-multi-project/SKILL.md # UPDATE: distributed strategy docs
│   ├── github-issue-tracker/         # DELETE: deprecated
│   └── github-issue-standard/        # KEEP: still used
├── commands/
│   ├── sync.md                       # UPDATE: deprecation redirect
│   └── sync-spec.md                  # NEW or UPDATE: primary sync command
└── MULTI-PROJECT-SYNC-ARCHITECTURE.md # UPDATE: canonical sync path

plugins/specweave/skills/
└── team-orchestrate/SKILL.md          # NEW: Agent Teams skill

src/core/types/
└── sync-profile.ts                    # EXTEND: GitHubConfig with V2 fields
```

### Data Model

**Spec Frontmatter (extended)**:
```yaml
externalLinks:
  github:
    syncStatus: synced|dirty|conflicted
    projectV2Number: 5              # org project number
    projectV2Id: "PVT_kwDO..."     # node ID
    userStories:
      US-001:
        issueNumber: 42
        issueUrl: "https://github.com/org/repo/issues/42"
        issueNodeId: "I_kwDO..."   # for Projects V2 item addition
        syncedAt: "2026-02-06T12:00:00Z"
        lastConflict: null
      US-002:
        issueNumber: 43
        issueUrl: "https://github.com/org/repo/issues/43"
        issueNodeId: "I_kwDO..."
        syncedAt: "2026-02-06T12:00:00Z"
    crossTeamRepos:
      - owner: org
        repo: backend-api
        relevantStories: [US-003]
```

**GitHubConfig type extension** (sync-profile.ts):
```typescript
interface GitHubConfig {
  owner?: string;
  repo?: string;
  repos?: string[];
  masterRepo?: string;
  githubStrategy?: GitHubSyncStrategy;
  teamBoardId?: number;
  enableCrossTeamDetection?: boolean;
  // NEW V2 fields:
  projectV2Number?: number;        // Project number (visible in URL)
  projectV2Id?: string;            // Node ID (for GraphQL)
  projectV2Enabled?: boolean;      // Enable Projects V2 sync (default: false)
  statusFieldMapping?: Record<string, string>;  // spec status → V2 option name
  priorityFieldMapping?: Record<string, string>; // P1/P2/P3 → V2 option name
}
```

### API Contracts

**GitHub GraphQL (via `gh api graphql`)**:
- `createProjectV2(ownerId, title)` → Project node ID
- `addProjectV2ItemById(projectId, contentId)` → Item ID (idempotent)
- `updateProjectV2ItemFieldValue(projectId, itemId, fieldId, value)` → Updated item
- `getProjectV2Fields(projectId)` → Field IDs + option IDs for Status, Priority

**GitHub REST (via `gh` CLI)**:
- `gh issue create --repo owner/repo --title --body --label` → Issue number
- `gh issue edit NUMBER --repo owner/repo --title --body` → Updated
- `gh issue view NUMBER --repo owner/repo --json title,body,state,labels` → Current state
- `gh project item-add NUMBER --owner ORG --url ISSUE_URL` → V2 item added

## Technology Stack

- **Runtime**: Node.js (ESM), TypeScript
- **CLI**: `gh` CLI for REST + GraphQL (avoids direct HTTP, leverages user auth)
- **Testing**: Vitest with `vi.mock()` for gh CLI calls
- **GraphQL**: Via `gh api graphql -f query=...` (no external GraphQL client needed)

**Architecture Decisions**:
- **gh CLI over direct HTTP**: Users already have `gh` authenticated; avoids token management complexity. The `gh api graphql` command handles auth headers automatically.
- **Projects V2 via CLI first, GraphQL fallback**: `gh project item-add` and `gh project field-list` are simpler for basic operations. GraphQL needed only for custom field value updates.
- **Skill-based Agent Teams**: The team orchestration skill is a SKILL.md (prompt-only), not TypeScript code. It instructs Claude to use existing Task tool + parallel auto infrastructure. This avoids coupling to the experimental TeammateTool API.

## Implementation Phases

### Phase 1: Foundation (US-006 + FR-001)
1. Delete deprecated files (task-sync.ts, task-parser.ts, V1 board resolver, deprecated skill)
2. Create `github-graphql-client.ts` with Projects V2 mutations
3. Extend `GitHubConfig` type with V2 fields
4. Update sync command to redirect to sync-spec

### Phase 2: Core Sync (US-001 + US-002)
1. Implement push: User Story → GitHub Issue creation/update in `github-spec-sync.ts`
2. Implement issue body generator (AC checkboxes, links, metadata)
3. Implement pull: GitHub Issue state → spec.md updates
4. Implement conflict detection and resolution
5. Update spec frontmatter with per-US issue tracking
6. Implement `--all` batch sync mode

### Phase 3: Projects V2 (US-003)
1. Create `github-board-resolver-v2.ts` using GraphQL client
2. Implement: create project → add items → set Status/Priority fields
3. Wire into sync flow: after issue creation, add to Project V2
4. Support both org-level and repo-level projects

### Phase 4: Multi-Repo (US-004)
1. Extend distributed strategy with cross-repo issue creation
2. Implement cross-reference links in issue bodies
3. Add issues from multiple repos to single org-level Project V2
4. Implement shared rate limiter across sync profiles

### Phase 5: Agent Teams (US-005)
1. Create `team-orchestrate` SKILL.md
2. Create `team-status` SKILL.md
3. Document integration with existing parallel auto mode
4. Test with both subagents and (optionally) Agent Teams

## Testing Strategy

- **Unit tests**: Mock `gh` CLI calls, test each function in isolation
- **Integration tests**: End-to-end sync with actual GitHub repos (requires GH_TOKEN)
- **Conflict tests**: Simulate divergent spec/GitHub states
- **Multi-repo tests**: 2+ repos with distributed strategy
- **Mocking pattern**: `vi.hoisted()` + `vi.mock()` for `child_process.execFile`

## Technical Challenges

### Challenge 1: GitHub Projects V2 Custom Fields
Custom fields can't be created via API — must exist in the project first.
**Solution**: On first sync, query existing fields. If Status/Priority not found, log a warning with instructions to create them in the GitHub UI. Don't fail the sync.
**Risk**: Users may not create fields → items added without status/priority. Acceptable — items still visible.

### Challenge 2: AC Checkbox Round-Trip Parsing
Issue body checkboxes `- [x] AC-US1-01: ...` must be parsed back during pull.
**Solution**: Use regex to extract checkbox state from issue body markdown. Match by AC-ID pattern `AC-US\d+-\d+`.
**Risk**: Users editing issue body could break parsing. Mitigate with a `<!-- specweave:sync -->` marker around the AC section.

### Challenge 3: Rate Limiting Across Multi-Repo Sync
5 repos syncing simultaneously could exhaust the 5000 req/hr GitHub limit.
**Solution**: Shared in-memory token bucket in `github-rate-limiter.ts`. Pre-flight count estimates API calls. Sequential sync if near limit, parallel if capacity available.
**Risk**: Token bucket is per-process. If multiple Claude sessions sync simultaneously, no cross-process coordination. Document this limitation.

### Challenge 4: Agent Teams is Experimental
The TeammateTool API may change or be removed.
**Solution**: The skill is a SKILL.md prompt that works with BOTH Task tool subagents (current, stable) and Agent Teams (experimental). No hard dependency on TeammateTool. The skill detects which is available at runtime via environment variable check.
