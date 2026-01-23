# Sync Orchestration Architecture (v1.0.148)

## Architecture Overview (v1.0.148)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SPECWEAVE EXTERNAL SYNC ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                   AUTOMATIC SYNC (Claude Code Hooks)                  │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │                                                                       │   │
│  │  PostToolUse Hook (when .specweave/increments/* edited)              │   │
│  │  ├── metadata.json changed                                           │   │
│  │  │   └── IF status = done/reopened                                   │   │
│  │  │       └── IMMEDIATE SYNC ──────► project-bridge-handler           │   │
│  │  │                                                                    │   │
│  │  ├── tasks.md / spec.md changed                                      │   │
│  │  │   └── Queue to pending.jsonl ──────┐                              │   │
│  │  │                                     │                              │   │
│  │  Stop Hook (Session End)               │                              │   │
│  │  ├── stop-reflect.sh (learnings)       │                              │   │
│  │  ├── stop-auto.sh (validation)         │                              │   │
│  │  └── stop-sync.sh ◄────────────────────┘                              │   │
│  │      └── BATCHED SYNC ──────► project-bridge-handler                  │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                   PROJECT BRIDGE (Universal Adapter)                  │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │                                                                       │   │
│  │              ┌─────────────────────┐                                  │   │
│  │              │  project-bridge.js  │                                  │   │
│  │              │  ────────────────── │                                  │   │
│  │              │  ProjectService     │                                  │   │
│  │              │  ProjectEventBus    │                                  │   │
│  │              └─────────┬───────────┘                                  │   │
│  │                        │                                              │   │
│  │          ┌─────────────┼─────────────┐                                │   │
│  │          ▼             ▼             ▼                                │   │
│  │     ┌────────┐   ┌─────────┐   ┌──────────┐                           │   │
│  │     │ GitHub │   │  JIRA   │   │   ADO    │                           │   │
│  │     │Adapter │   │ Adapter │   │ Adapter  │                           │   │
│  │     └────┬───┘   └────┬────┘   └────┬─────┘                           │   │
│  │          │            │             │                                 │   │
│  └──────────┼────────────┼─────────────┼─────────────────────────────────┘   │
│             │            │             │                                     │
│             ▼            ▼             ▼                                     │
│       ┌──────────┐ ┌──────────┐ ┌───────────────┐                            │
│       │  GitHub  │ │   JIRA   │ │ Azure DevOps  │                            │
│       │  Issues  │ │  Epics   │ │  Work Items   │                            │
│       └──────────┘ └──────────┘ └───────────────┘                            │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                   MANUAL COMMANDS (On-Demand)                         │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │                                                                       │   │
│  │  /sw-github:sync <id>  ─────► GitHub Issues/Projects                  │   │
│  │  /sw-jira:sync <id>    ─────► JIRA Epics/Stories                      │   │
│  │  /sw-ado:sync <id>     ─────► ADO Work Items                          │   │
│  │  /sw:sync-progress     ─────► ALL external tools                      │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Key Files (v1.0.148)

| File | Purpose |
|------|---------|
| `hooks/hooks.json` | Hook registration |
| `hooks/v2/dispatchers/post-tool-use.sh` | PostToolUse dispatcher |
| `hooks/v2/dispatchers/session-start.sh` | Session init + legacy cleanup |
| `hooks/stop-sync.sh` | Stop hook - batched sync |
| `hooks/v2/handlers/project-bridge-handler.sh` | Universal sync handler |
| `hooks/v2/queue/enqueue.sh` | Queue events to pending.jsonl |
| `scripts/cleanup-legacy-state.sh` | Removes old processor files on session start |
| `.specweave/state/event-queue/pending.jsonl` | Pending events queue |

### Migration (v1.0.148)

On session start, `cleanup-legacy-state.sh` automatically removes:
- `.processor.pid` - Old processor PID file
- `.processor.lock.d` - Old lock directory
- `*.event` files - Old event format (replaced by `pending.jsonl`)
- Stale `.dedup-*` files older than 1 minute

### Sync Timing

| Event | Timing | Why |
|-------|--------|-----|
| `increment.done` | Immediate | User expects external tools updated NOW |
| `increment.reopened` | Immediate | Critical status change |
| `task.updated` | Batched (session end) | Too frequent, batch is efficient |
| `spec.updated` | Batched (session end) | Can wait until session end |

---

## How GitHub Issue Sync Works

### 3-Phase Sync Flow

```
TodoWrite → Hook → US Completion Orchestrator → Living Docs Sync → External Tool Sync → GitHub Issues Updated
```

### Phase 1: Task Completion Detection

- User marks task complete via `TodoWrite`
- `post-task-completion.sh` fires (sets `SKIP_GITHUB_SYNC=true` to prevent duplicate syncs)
- `consolidated-sync.js` runs 6 operations sequentially

### Phase 2: US Completion Orchestration

- `syncCompletedUserStories()` (operation 5 of 6) detects newly completed user stories
- Checks if all ACs for a US are complete (100% → status: "completed")
- **Throttle**: 60s window prevents spam (manual override: `/specweave:sync-progress`)
- If newly completed USs found → triggers Phase 3

### Phase 3: External Tool Sync

- `LivingDocsSync.syncIncrement()` called
- `detectExternalTools()` checks **3 levels** for GitHub config:
  - **Level 1**: `metadata.json` (increment-cached links)
  - **Level 2**: `config.json` - **4 detection methods** (ADR-0137):
    - Method 1: `config.sync.github.enabled` ← **Most common (60% of users)**
    - Method 2: `config.sync.profiles[activeProfile]` ← Multi-profile setups
    - Method 3: `config.multiProject.projects[project].externalTools.github` ← Multi-project
    - Method 4: `config.plugins.settings['specweave-github']` ← Legacy
  - **Level 3**: Environment variables (`GITHUB_TOKEN` + `GITHUB_OWNER`/`GITHUB_REPOSITORY`)
- If GitHub detected → `syncToGitHub()` → `GitHubFeatureSync.syncFeatureToGitHub()`
- Updates GitHub issues with completed AC checkboxes

---

## GitHub Configuration

### Recommended Setup (Pattern 1 - Simplest)

```json
// .specweave/config.json
{
  "sync": {
    "github": {
      "enabled": true,
      "owner": "your-org",
      "repo": "your-repo"
    }
  }
}
```

**Plus `.env`**:
```bash
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=your-org  # Optional if in config.json
GITHUB_REPO=your-repo  # Optional if in config.json
```

---

## Troubleshooting Sync Issues

### Issue: GitHub issues not updating after US completion

**Diagnosis**:
```bash
# 1. Check detection
grep "External tools detected" .specweave/logs/hooks-debug.log | tail -5
# Should see: "📡 External tools detected: github"

# 2. Check config
cat .specweave/config.json | jq '.sync.github'
# Should have: enabled: true, owner: "...", repo: "..."

# 3. Check throttle
grep "throttled" .specweave/logs/hooks-debug.log | tail -3
# If throttled → wait 60s OR run: /specweave:sync-progress
```

### Issue: Throttle blocking sync

**Solution**: Manual sync (bypasses throttle):
```bash
/specweave:sync-progress 0054  # Sync specific increment
/specweave-github:sync FS-054   # Sync entire feature
```

### Issue: Detection not finding GitHub config

**Fix**: ADR-0137 enhanced detection (v0.26.3+)
- Checks 4 config locations + env vars
- Update to latest version: `npm update specweave`

---

## Hook Performance & Safety

### Emergency Recovery

```bash
export SPECWEAVE_DISABLE_HOOKS=1
rm -f .specweave/state/.hook-*
npm run rebuild
```

### Mandatory Checklist

- PROJECT_ROOT first
- Kill switch
- Circuit breaker
- File lock
- Debounce (5s)
- `set +e`
- `exit 0`
- Active-only filtering

### Never Do

- `set -e`
- Sync spawns
- Error propagation

### Performance Targets

- `<100ms` execution
- 0-2 processes
- 0 breaker trips

---

## Version History

| Version | Change |
|---------|--------|
| v1.0.148 | Stop-sync.sh for batched sync at session end, immediate sync for done/reopened, no background processor |
| v0.26.3 | Multi-location GitHub config detection (ADR-0137) |
| v0.26.1 | Automatic US sync restored, smart throttle (60s) |
| v0.25.2 | `SKIP_EXTERNAL_SYNC` guard at LivingDocsSync layer |
| v0.25.1 | Emergency `SKIP_US_SYNC=true` (temporary) |
| v0.25.0 | 6→4 hooks (33% reduction) |
| v0.24.4 | State-based filtering (95% overhead reduction) |

---

---

## Session-Based Sync (v0.28.68+)

### Sync Model: On-Demand, Not Polling

**Key Design Decision**: SpecWeave does NOT use polling or background daemons.

| Trigger | Description |
|---------|-------------|
| **Session Start** | Claude Code session starts → due jobs execute |
| **Task Completion** | Increment task completed → living docs updated |
| **Increment Closure** | `/specweave:done` → GitHub issues closed |
| **Manual Command** | `/specweave:sync-progress` → full sync |
| **Cron** | `specweave sync-scheduled` → for CI/scheduled use |

### Conflict Resolution (Rule-Based, Not LLM)

| Conflict Type | Resolution Rule |
|---------------|-----------------|
| Code vs Spec | **Code is source of truth** |
| External vs Internal | **External item format preserved** |
| Duplicate Increments | **Most complete version wins** |

### Format Preservation

External items (from JIRA/ADO) have `format_preservation=true`:
- **Comment-only sync** - Updates posted as comments
- **No title changes** - External title immutable
- **No AC modifications** - Original structure preserved

### Session-Start Configuration

```json
// .specweave/config.json
{
  "sync": {
    "orchestration": {
      "scheduler": {
        "enabled": true,
        "autoSyncOnSessionStart": true
      }
    },
    "settings": {
      "canUpdateExternalItems": false,  // Safety gate
      "canUpsertInternalItems": true,
      "autoSyncOnCompletion": true
    }
  }
}
```

### CLI for Cron Users

```bash
# Add to crontab (every 15 minutes)
0,15,30,45 * * * * cd /project && npx specweave sync-scheduled --silent

# Force sync all jobs
specweave sync-scheduled --force

# Preview what would run
specweave sync-scheduled --dry-run
```

---

## Related ADRs

- ADR-0032: GitHub Hierarchy
- ADR-0050: Config Management
- ADR-0060: Hook Optimization
- ADR-0070: Hook Consolidation
- ADR-0129: US Sync Guard Rails
- ADR-0137: Multi-location GitHub Detection
