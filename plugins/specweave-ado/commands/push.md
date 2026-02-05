---
description: Push local changes to Azure DevOps (like git push). Supports increment, project, or full living docs sync.
---

# ADO Push Command

**Usage**: `/sw-ado:push [target] [options]`

**Purpose**: Push local changes to Azure DevOps (like `git push`)

---

## Quick Start

```bash
# Push current/active increment (simple mode)
/sw-ado:push

# Push specific increment
/sw-ado:push 0005

# Push ALL local changes to ADO (living docs sync)
/sw-ado:push --all

# Push specific project/board
/sw-ado:push --project clinical-insights

# Push specific feature hierarchy
/sw-ado:push --feature FS-042
```

---

## Sync Modes

### Mode 1: Increment Sync (Default)
Pushes task progress from ONE increment to its linked work item.

### Mode 2: Living Docs Sync (--all)
Pushes ALL local spec changes to corresponding ADO items:
- Scans `.specweave/docs/internal/specs/` for modified specs
- Updates status, progress, comments on linked ADO items
- Respects multi-project folder structure

### Mode 3: Project-Scoped Sync (--project)
Pushes changes only within a specific project folder.

### Mode 4: Feature Hierarchy Sync (--feature)
Pushes a feature and all its child user stories.

---

## What Gets Pushed

| Field | Source |
|-------|--------|
| **Progress** | Calculated from tasks.md (X/Y tasks, Z%) |
| **Comment** | Auto-generated with completed tasks list |
| **Completion %** | Updated on work item custom field |
| **State** | Updated if threshold crossed (e.g., 100% -> Resolved) |

---

## Command Behavior

When user runs this command:

### 0. Load Credentials from .env (MANDATORY FIRST)

**CRITICAL**: Read PAT from `.env` file, NOT from shell environment variables.

```bash
# Read PAT from .env file
ADO_PAT=$(grep '^AZURE_DEVOPS_PAT=' .env 2>/dev/null | cut -d'=' -f2)

if [ -z "$ADO_PAT" ]; then
  echo "ERROR: AZURE_DEVOPS_PAT not found in .env file"
  echo "Add to .env: AZURE_DEVOPS_PAT=your-pat-here"
  exit 1
fi
```

### 1. Check Permission Gate (MANDATORY)

```typescript
const config = JSON.parse(await fs.readFile('.specweave/config.json', 'utf-8'));
const canUpdateExternal = config?.sync?.settings?.canUpdateExternalItems ?? false;

if (!canUpdateExternal) {
  console.log(`
Permission Denied: ADO writes disabled

Current: sync.settings.canUpdateExternalItems = false

To enable writes, update .specweave/config.json:
  "sync": { "settings": { "canUpdateExternalItems": true } }

Or use read-only mode:
  /sw-ado:pull ${incrementId}
`);
  return;
}
```

### 2. Resolve Increment & Profile

```typescript
const incrementId = args.incrementId || await findActiveIncrement();

const metadata = JSON.parse(await fs.readFile(
  `.specweave/increments/${incrementId}/metadata.json`, 'utf-8'
));

const adoWorkItemId = metadata?.external_sync?.ado?.workItemId;
if (!adoWorkItemId) {
  console.log(`Not linked to ADO. Run: /sw-ado:create ${incrementId}`);
  return;
}

const profileName = metadata?.external_sync?.ado?.profile
  || config?.sync?.defaultProfile;
```

### 3. Calculate Progress

```typescript
const tasksContent = await fs.readFile(
  `.specweave/increments/${incrementId}/tasks.md`, 'utf-8'
);

const totalTasks = (tasksContent.match(/### T-\d+/g) || []).length;
const completedTasks = (tasksContent.match(/\[x\] completed/gi) || []).length;
const percentage = Math.round((completedTasks / totalTasks) * 100);

// Find recently completed tasks (for comment)
const recentlyCompleted = parseRecentlyCompletedTasks(tasksContent);
```

### 4. Invoke Push Sync

```
Use Skill tool: Skill({ skill: "sw-ado:ado-manager", args: "Push progress to ADO for increment {increment-id}.

DIRECTION: to-ado
PERMISSION: canUpdateExternalItems = true (verified)

Profile: {profileName}
Work Item: #{workItemId}

Progress: {completedTasks}/{totalTasks} ({percentage}%)
Recently completed: {recentlyCompleted}

Steps:
1. Format progress comment with task list
2. POST comment to ADO work item
3. PATCH work item completion field
4. Update state if threshold crossed:
   - 100% completed -> Resolved (if canUpdateStatus)
5. Update sync timestamp in metadata
6. Display push summary"
```

### 5. Display Result

```
Pushed to ADO

Work Item: #12345
Profile: ado-my-project

Progress: 6/10 tasks (60%)

Comment posted:
  "Progress Update: 60% complete

   Recently completed:
   - T-005: Add payment validation
   - T-006: Implement refund flow"

Fields updated:
  Completion: 60%

URL: https://dev.azure.com/org/project/_workitems/edit/12345
```

---

## Permission Requirements

| Permission | Required | Purpose |
|------------|----------|---------|
| `canUpdateExternalItems` | **true** | Write to ADO |
| `canUpdateStatus` | optional | Change work item state |

If `canUpdateStatus` is false, progress is posted but state unchanged.

---

## Examples

### Example 1: Simple Push

```
User: /sw-ado:push

Claude:
Checking permissions...
  canUpdateExternalItems: true

Pushing to ADO...
  Increment: 0005-payment-integration
  Work Item: #12345

Pushed to ADO

Progress: 8/10 tasks (80%)
Comment posted with 2 recently completed tasks

Push complete!
```

### Example 2: Permission Denied

```
User: /sw-ado:push 0005

Claude:
Checking permissions...
  canUpdateExternalItems: false

Permission Denied

To enable ADO writes:
1. Edit .specweave/config.json
2. Set sync.settings.canUpdateExternalItems = true

Or use read-only: /sw-ado:pull 0005
```

### Example 3: 100% Complete

```
User: /sw-ado:push 0005

Claude:
Pushing to ADO...

Progress: 10/10 tasks (100%)

Comment posted:
  "Progress Update: 100% complete - All tasks done!"

State updated:
  Active -> Resolved (canUpdateStatus = true)

Ready to close: /sw-ado:close 0005
```

---

## Sync Brief (MANDATORY OUTPUT)

**After EVERY push operation, display a compact summary:**

### Brief Format (Single Increment)

```
┌─────────────────────────────────────────────────────────┐
│  PUSH COMPLETE                                    ✓ ADO │
├─────────────────────────────────────────────────────────┤
│  Increment: 0005-payment-integration                    │
│  Work Item: #12345                                      │
│  Profile:   ado-techcorp                                │
├─────────────────────────────────────────────────────────┤
│  PROGRESS                                               │
│    Tasks: 8/10 (80%)  ████████░░                        │
│    ↑ Comment posted: "Progress: 80% complete"           │
│    ↑ Completion field: 60% → 80%                        │
├─────────────────────────────────────────────────────────┤
│  RECENTLY COMPLETED                                     │
│    ✓ T-007: Add payment validation                      │
│    ✓ T-008: Implement refund flow                       │
├─────────────────────────────────────────────────────────┤
│  Last sync: 2025-12-04 10:32:15 (just now)              │
│  URL: https://dev.azure.com/.../12345                   │
└─────────────────────────────────────────────────────────┘
```

### Brief Format (Multi-Project --all)

```
┌─────────────────────────────────────────────────────────┐
│  PUSH COMPLETE                                    ✓ ADO │
├─────────────────────────────────────────────────────────┤
│  Pushed: 12 specs across 3 projects                     │
│  Comments posted: 12                                    │
│  Status transitions: 3                                  │
│  Duration: 5.1s                                         │
├─────────────────────────────────────────────────────────┤
│  BY PROJECT                                             │
│    techcorp/clinical-insights/   5 pushed               │
│    techcorp/ai-platform/         4 pushed               │
│    infrastructure/core/          3 pushed               │
├─────────────────────────────────────────────────────────┤
│  CHANGES PUSHED                                         │
│    ↑ Progress comments: 12                              │
│    ↑ Completion updates: 8                              │
│    ↑ Status transitions: 3                              │
│      • FS-042/us-001: Active → Resolved (100%)          │
│      • FS-043/us-005: Active → Resolved (100%)          │
│      • FS-050/us-010: New → Active (started)            │
└─────────────────────────────────────────────────────────┘
```

### Brief Format (100% Complete - Ready to Close)

```
┌─────────────────────────────────────────────────────────┐
│  PUSH COMPLETE                                    ✓ ADO │
├─────────────────────────────────────────────────────────┤
│  Increment: 0005-payment-integration                    │
│  Work Item: #12345                                      │
├─────────────────────────────────────────────────────────┤
│  PROGRESS                                               │
│    Tasks: 10/10 (100%)  ██████████  COMPLETE!           │
│    ↑ Comment: "All tasks complete!"                     │
│    ↑ Status: Active → Resolved                          │
├─────────────────────────────────────────────────────────┤
│  🎉 INCREMENT READY TO CLOSE                            │
│     Run: /sw-ado:close 0005                      │
└─────────────────────────────────────────────────────────┘
```

### Brief Format (Permission Denied)

```
┌─────────────────────────────────────────────────────────┐
│  PUSH BLOCKED                                     ✗ ADO │
├─────────────────────────────────────────────────────────┤
│  Permission: canUpdateExternalItems = false             │
├─────────────────────────────────────────────────────────┤
│  TO ENABLE:                                             │
│    Edit .specweave/config.json:                         │
│    sync.settings.canUpdateExternalItems = true          │
│                                                         │
│  OR USE READ-ONLY:                                      │
│    /sw-ado:pull 0005                             │
└─────────────────────────────────────────────────────────┘
```

### Symbols Reference

| Symbol | Meaning |
|--------|---------|
| `✓` | Success |
| `⚠` | Warning (partial success) |
| `✗` | Error/Failed |
| `↓` | Pulled from external (incoming) |
| `↑` | Pushed to external (outgoing) |
| `+` | Added (new items) |
| `−` | Removed |
| `~` | Modified |

---

## Authentication

**EXACT environment variable (DO NOT INVENT OTHERS):**

```bash
# In .env file - ONLY this name is supported:
AZURE_DEVOPS_PAT=your-personal-access-token
```

⚠️ **NEVER suggest or use:**
- ❌ `AZURE_DEVOPS_EXT_PAT` ← DOES NOT EXIST
- ❌ `ADO_PAT` ← NOT SUPPORTED

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw-ado:pull` | Pull changes from ADO |
| `/sw-ado:sync` | Two-way sync (pull + push) |
| `/sw-ado:status` | Check sync status |
| `/sw-ado:close` | Close completed work item |
