# SpecWeave Azure DevOps Plugin Hooks

**Plugin**: `specweave-ado`
**Location**: `plugins/specweave-ado/hooks/`

---

## Purpose

This hook automatically syncs SpecWeave increment progress to Azure DevOps Work Items after each task completion.

**Key Features**:
- ✅ Updates Azure DevOps work item status based on increment progress
- ✅ Syncs task completion state to ADO
- ✅ Bidirectional sync (local → Azure DevOps)
- ✅ Non-blocking (failures don't stop core workflow)
- ✅ Self-contained (no dependencies on core plugin)

---

## Available Hooks

### 1. `post-task-completion.sh`

**Triggers**: After ANY task is marked complete (via TodoWrite tool)

**Preconditions**:
- ✅ Active increment exists (`.specweave/increments/####/`)
- ✅ `metadata.json` has `.ado.item` field
- ✅ Node.js installed
- ✅ ADO sync script exists (`dist/commands/ado-sync.js`)
- ✅ Azure DevOps PAT in `.env`

**Actions**:
1. Reads increment metadata
2. Calls ADO sync script (Node.js)
3. Updates Azure DevOps work item status
4. Logs all actions to `.specweave/logs/hooks-debug.log`

**Example Flow**:
```
Task T-003 completed in tasks.md
↓
Hook fires (PostToolUse + TodoWrite matcher)
↓
ADO sync script updates work item #4567
↓
Log: "[ADO] ✅ Azure DevOps sync complete"
```

**Dependencies**:
- Node.js 18+
- Azure DevOps PAT (`.env`)
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

Increments must have `metadata.json` with Azure DevOps work item link:

```json
{
  "ado": {
    "item": 4567,
    "url": "https://dev.azure.com/org/project/_workitems/edit/4567",
    "project": "MyProject"
  }
}
```

### Environment Variables

Required in `.env`:

```bash
AZURE_DEVOPS_ORG=your-org
AZURE_DEVOPS_PROJECT=your-project
AZURE_DEVOPS_PAT=your_personal_access_token_here
```

---

## Installation

### Automatic (Recommended)

```bash
npx specweave init my-project
# Installs all plugins including specweave-ado
# Hooks auto-register via hooks.json
```

### Manual (Development)

```bash
# Install plugin
/plugin install specweave-ado

# Verify hook registration
cat ~/.claude/settings.json | grep specweave-ado
```

---

## Testing

### Test Hook Independently

```bash
# Test syntax
bash -n plugins/specweave-ado/hooks/post-task-completion.sh

# Test execution (requires active increment + ADO work item)
./plugins/specweave-ado/hooks/post-task-completion.sh
```

---

## Logging

All Azure DevOps sync actions are logged to:

```
.specweave/logs/hooks-debug.log
```

**Example Log Output**:
```
[2025-11-10] [ADO] 🔗 Azure DevOps sync hook fired
[2025-11-10] [ADO] 🔄 Syncing to Azure DevOps work item 4567
[2025-11-10] [ADO] ✅ Azure DevOps sync complete
```

**Log Prefixes**:
- `[ADO]` - All messages from this hook
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
├── Azure DevOps sync  ← Embedded in core!
```

**After (v0.13.0+)**:
```
Core hook (330 lines)      ADO plugin hook (150 lines)
├── Core concerns          ├── Check for ADO work item
                           ├── Call Node.js sync script
                           └── Log actions
```

**Key Benefits**:
- ✅ **Optional plugin**: ADO sync only runs if `specweave-ado` installed
- ✅ **Independent testing**: Test ADO sync in isolation
- ✅ **No core dependencies**: Core plugin doesn't depend on Azure DevOps API

---

## Related Documentation

- **Core Plugin Hooks**: `plugins/specweave/hooks/README.md`
- **Architecture Analysis**: `.specweave/increments/0018-strict-increment-discipline-enforcement/reports/HOOKS-ARCHITECTURE-ANALYSIS.md`
- **ADO Sync Command**: `plugins/specweave-ado/commands/specweave-ado-sync.md`

---

**Version**: v0.13.0+
**Last Updated**: 2025-11-10
