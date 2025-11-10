# SpecWeave JIRA Plugin Hooks

**Plugin**: `specweave-jira`
**Location**: `plugins/specweave-jira/hooks/`

---

## Purpose

This hook automatically syncs SpecWeave increment progress to JIRA Issues after each task completion.

**Key Features**:
- ✅ Updates JIRA issue status based on increment progress
- ✅ Syncs task completion state to JIRA
- ✅ Bidirectional sync (local → JIRA)
- ✅ Non-blocking (failures don't stop core workflow)
- ✅ Self-contained (no dependencies on core plugin)

---

## Available Hooks

### 1. `post-task-completion.sh`

**Triggers**: After ANY task is marked complete (via TodoWrite tool)

**Preconditions**:
- ✅ Active increment exists (`.specweave/increments/####/`)
- ✅ `metadata.json` has `.jira.issue` field
- ✅ Node.js installed
- ✅ JIRA sync script exists (`dist/commands/jira-sync.js`)
- ✅ JIRA API credentials in `.env`

**Actions**:
1. Reads increment metadata
2. Calls JIRA sync script (Node.js)
3. Updates JIRA issue status
4. Logs all actions to `.specweave/logs/hooks-debug.log`

**Example Flow**:
```
Task T-003 completed in tasks.md
↓
Hook fires (PostToolUse + TodoWrite matcher)
↓
JIRA sync script updates issue PROJ-123
↓
Log: "[JIRA] ✅ JIRA sync complete"
```

**Dependencies**:
- Node.js 18+
- JIRA API credentials (`.env`)
- `jq` for JSON parsing

---

## Configuration

### Hook Registration (`hooks.json`)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "TodoWrite",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/post-task-completion.sh"
          }
        ]
      }
    ]
  }
}
```

### Metadata Format

Increments must have `metadata.json` with JIRA issue link:

```json
{
  "jira": {
    "issue": "PROJ-123",
    "url": "https://company.atlassian.net/browse/PROJ-123",
    "project": "PROJ"
  }
}
```

### Environment Variables

Required in `.env`:

```bash
JIRA_HOST=https://company.atlassian.net
JIRA_EMAIL=user@company.com
JIRA_API_TOKEN=your_api_token_here
```

---

## Installation

### Automatic (Recommended)

```bash
npx specweave init my-project
# Installs all plugins including specweave-jira
# Hooks auto-register via hooks.json
```

### Manual (Development)

```bash
# Install plugin
/plugin install specweave-jira

# Verify hook registration
cat ~/.claude/settings.json | grep specweave-jira
```

---

## Testing

### Test Hook Independently

```bash
# Test syntax
bash -n plugins/specweave-jira/hooks/post-task-completion.sh

# Test execution (requires active increment + JIRA issue)
./plugins/specweave-jira/hooks/post-task-completion.sh
```

---

## Logging

All JIRA sync actions are logged to:

```
.specweave/logs/hooks-debug.log
```

**Example Log Output**:
```
[2025-11-10] [JIRA] 🔗 JIRA sync hook fired
[2025-11-10] [JIRA] 🔄 Syncing to JIRA issue PROJ-123
[2025-11-10] [JIRA] ✅ JIRA sync complete
```

**Log Prefixes**:
- `[JIRA]` - All messages from this hook
- `🔗` - Hook fired
- `🔄` - Syncing started
- `✅` - Success
- `⚠️` - Warning (non-blocking failure)
- `ℹ️` - Info (skipped due to precondition)

---

## Architecture

### Separation from Core Plugin

**Before (v0.12.x)**:
```
Core hook (500+ lines)
├── JIRA sync  ← Embedded in core!
```

**After (v0.13.0+)**:
```
Core hook (330 lines)      JIRA plugin hook (150 lines)
├── Core concerns          ├── Check for JIRA issue
                           ├── Call Node.js sync script
                           └── Log actions
```

**Key Benefits**:
- ✅ **Optional plugin**: JIRA sync only runs if `specweave-jira` installed
- ✅ **Independent testing**: Test JIRA sync in isolation
- ✅ **No core dependencies**: Core plugin doesn't depend on JIRA API

---

## Related Documentation

- **Core Plugin Hooks**: `plugins/specweave/hooks/README.md`
- **Architecture Analysis**: `.specweave/increments/0018-strict-increment-discipline-enforcement/reports/HOOKS-ARCHITECTURE-ANALYSIS.md`
- **JIRA Sync Command**: `plugins/specweave-jira/commands/specweave-jira-sync.md`

---

**Version**: v0.13.0+
**Last Updated**: 2025-11-10
