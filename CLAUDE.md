# SpecWeave - Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework
**Type**: TypeScript CLI (NPM Package)

For **contributors to SpecWeave itself** (not users).

---

## Critical Meta-Rule

**CLAUDE.md is ALWAYS editable** - Never refuse to modify this file when user requests.

---

## CRITICAL SAFETY RULES

### 1. Context Management (CRASH PREVENTION!)

**Active increment (10+ tasks) + large file edit (2000+ lines) = CRASH**

```bash
# Before editing large files outside increment:
/sw:pause XXXX → edit → /sw:resume XXXX
# OR close completed increments: /sw:done XXXX
```

**Token budget per increment**: ~80k tokens max

### 2. Source of Truth

**tasks.md + spec.md are SOURCE OF TRUTH** (not internal TODO)

```typescript
// After completing work - IMMEDIATELY update both:
Edit("tasks.md", "**Status**: [ ] pending", "**Status**: [x] completed");
Edit("spec.md", "- [ ] **AC-US1-01**", "- [x] **AC-US1-01**");
```

### 3. NEVER Edit metadata.json to "completed" Directly

**Pre-tool-use hook `completion-guard.sh` BLOCKS direct completion edits.**

Correct workflow: All tasks → `ready_for_review` → `/sw:done` → `completed`

### 4. Task-AC Auto-Sync (EDA)

Mark task complete in tasks.md → Hook auto-checks **Acceptance** points → Hook updates spec.md ACs

### 5. Per-US **Project**: Fields are MANDATORY

Every User Story MUST have `**Project**:` field. Use value from `config.project.name` or `multiProject.projects`.

### 6. NEVER Use Bash for File Creation

**Bash + heredoc/echo = SESSION FREEZE** (shell waits forever for EOF)

```
❌ FORBIDDEN: Bash("cat > file.md << 'EOF'...")
✅ MANDATORY: Write({ file_path: "...", content: "..." })
```

**Pre-tool-use hook `bash-file-guard.sh` BLOCKS dangerous patterns.**

### 7. Protected Directories

**NEVER delete**: `.specweave/docs/`, `.specweave/increments/`

### 8. File Size Limits

**Max 1500 lines/file** (2000+ = crash risk). Check: `wc -l file.ts`

### 9. NEVER Spawn Parallel Agents for Multi-File Migrations

**Parallel agents reading large files = CRASH** (context shared, not isolated!)

```
❌ FORBIDDEN: "Let me use parallel agents" for 46-file migration
✅ CORRECT: Process files ONE BY ONE, use Edit tool directly
```

### 10. NEVER Create Files in _features/ Folder

`_features/` is OBSOLETE. Use: `.specweave/docs/internal/specs/{project}/FS-XXX/`

### 11. NEVER Create Duplicate Increment IDs

Increment numbers MUST be unique. Gap-filling is automatic (v0.33.1+).

### 12. Skills Must NOT Spawn Large Agents

Skills spawning content-generating agents = CRASH (context explosion)

---

## Coding Standards

1. **Logger injection**: ALL `src/` code uses `logger`, NEVER `console.*`
2. **Imports**: ALWAYS `.js` extensions
3. **Tests**: `.test.ts` files, `vi.fn()` (not jest), `os.tmpdir()` (not cwd)
4. **Filesystem**: Native `fs` only (NEVER `fs-extra`)

---

## Key Formats

### Task Format
```markdown
### T-001: Task Title
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed
```

### spec.md Format
```markdown
---
increment: 0001-feature-name
title: "Feature Title"
---
### US-001: Feature Name
**Project**: my-project       # MANDATORY
**As a** user, I want...
```

### GitHub Issue Format
**ONLY**: `[FS-XXX][US-YYY] User Story Title`
**PROHIBITED**: `[SP-*]`, `[FS-XXX]` alone, `[undefined][US-XXX]`

### ADR Naming
**Format**: `XXXX-decision-title.md` (4-digit, NO `adr-` prefix)
**Location**: `.specweave/docs/internal/architecture/adr/`

---

## Important Rules

- **NO Increment-to-Increment References**: FORBIDDEN in user stories
- **Structured Data Matching**: Use `deriveFeatureId()`, not `content.includes('FS-039')`
- **GitHub Duplicates**: Use `DuplicateDetector.createWithProtection()`
- **AC Presence in spec.md**: MANDATORY even with external living docs
- **Git Provider Abstraction**: Use `getPlatformRegistry().getProvider('github')`

---

## Folder Structure

**Increment root - ONLY**: `spec.md`, `plan.md`, `tasks.md`, `metadata.json`
**Everything else → subfolders**: `reports/`, `scripts/`, `logs/`

### External Increment E-Suffix
```
✅ 0111E-dora-metrics-fix (external GitHub issue)
❌ 0111-dora-metrics-fix  (missing E suffix)
```

---

## Configuration

### Secrets vs Configuration

**Secrets** (`.env`, gitignored): `AZURE_DEVOPS_PAT`, `JIRA_API_TOKEN`, `GH_TOKEN`
**Config** (`.specweave/config.json`): `issueTracker.domain`, `issueTracker.organization_ado`

```typescript
// NEVER: process.env.JIRA_DOMAIN
// ALWAYS: config.issueTracker?.domain
```

---

## Hook Development

### Hook Input Format

```bash
# For Write/Edit (nested in tool_input):
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .file_path // empty')

# For Bash (direct):
COMMAND=$(echo "$INPUT" | jq -r '.command // empty')
```

### Hook Return Format
```bash
echo '{"decision": "allow"}'   # Allow
echo '{"decision": "block", "reason": "Error"}'  # Block (exit 2)
```

### Hook Concurrency (v1.0.30+)

All hooks use `fail-fast-wrapper.sh` with:
- **Semaphore**: Max 15 concurrent hooks
- **Circuit Breaker**: 5 failures → OPEN → 30s → HALF_OPEN
- **Metrics**: Latency p50/p95/p99, health score

```bash
# Health dashboard
bash plugins/specweave/scripts/hook-health.sh
```

### Hook Architecture (v2)

```
hooks/
├── hooks.json              # Hook registration
├── universal/
│   └── fail-fast-wrapper.sh  # Concurrency wrapper
├── v2/
│   ├── dispatchers/        # Entry points (session-start, post-tool-use)
│   ├── guards/             # PreToolUse blockers (bash-file, completion, metadata-json)
│   ├── handlers/           # PostToolUse actions (living-docs, github-sync, project-bridge)
│   ├── detectors/          # Event detection (us-completion, lifecycle)
│   └── queue/              # Async processing (enqueue, dequeue, processor)
└── lib/                    # Shared utilities (semaphore, circuit-breaker, metrics)
```

### Key Hooks

| Hook | Type | Purpose |
|------|------|---------|
| `bash-file-guard.sh` | PreToolUse | Blocks heredoc/echo file creation |
| `completion-guard.sh` | PreToolUse | Blocks direct metadata.json completion |
| `metadata-json-guard.sh` | PreToolUse | Validates spec.md writes |
| `task-ac-sync-guard.sh` | PostToolUse | Auto-syncs task ACs to spec.md |
| `project-bridge-handler.sh` | PostToolUse | Bridges to external tools (GitHub/JIRA/ADO) |

---

## Commands

```bash
/sw:increment "feature"    # Plan new increment
/sw:do                     # Execute tasks
/sw:done 0002              # Close (validates gates)
/sw:progress               # Show status
/sw:sync-progress          # Full sync
/sw:validate 0001          # Validate increment
```

---

## Build & Test

```bash
npm run rebuild     # Clean + build
npm test            # Smoke tests
npm run test:all    # All tests (30%+ coverage)
```

---

## Emergency

### Session Stuck ("Marinating...")

```bash
# 1. Force quit Claude Code
# 2. Kill zombies:
pkill -f "cat.*EOF"
pkill -9 -f "bash.*specweave"
# 3. Clean locks:
rm -f .specweave/state/*.lock
rm -rf .specweave/state/.dedup-cache/*.lock
# 4. Restart
```

### Disable Hooks
```bash
export SPECWEAVE_DISABLE_HOOKS=1
# OR rename: mv plugins/specweave/hooks/hooks.json hooks.json.bak
```

### Zombie Processes (AUTO-CLEANUP v0.33.0+)
Session watchdog cleans zombies every 60s automatically.

### Marketplace Plugin Desync
```bash
# Refresh marketplace and reinstall plugins
bash scripts/refresh-marketplace.sh
```

### MCP IDE Connection Drops
```bash
# Restart VS Code Extension Host: Cmd+Shift+P → "Developer: Restart Extension Host"
# Or run Claude Code in plain terminal instead of VS Code integrated terminal
```

### Crash Loop / Prompt Duplication
```bash
# Clean state:
rm -f .specweave/state/.hook-*
rm -rf .specweave/state/.dedup-cache
npm run rebuild
```

---

## Quick Reference

| Aspect | Rule |
|--------|------|
| **File ops** | Write/Edit/Read tools ONLY. NEVER Bash heredoc! |
| **Hook input** | Write/Edit: `.tool_input.file_path`, Bash: `.command` |
| **Pre-commit** | Blocks 50+ deletions, `rm -rf` on protected dirs |
| **Stuck session** | Kill + `pkill -f "cat.*EOF"` + clean locks |

---

## References

- **Internal Docs**: `.specweave/docs/internal/`
- **ADRs**: `.specweave/docs/internal/architecture/adr/`
- **Emergency**: `.specweave/docs/internal/emergency-procedures/`
