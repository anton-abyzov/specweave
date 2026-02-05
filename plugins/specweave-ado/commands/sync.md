---
description: Two-way sync between SpecWeave increment and Azure DevOps work item (push & pull by default)
---

# Sync ADO Work Item Command

**Usage**: `/sw-ado:sync <increment-id> [options]`

**Purpose**: Two-way synchronization between SpecWeave increment and Azure DevOps work item

**Default**: Two-way sync (push & pull)

---

## Options

- `--direction <mode>`: Sync direction (default: `two-way`)
  - `two-way`: SpecWeave <-> ADO (default - recommended)
  - `to-ado`: SpecWeave -> ADO only (push progress)
  - `from-ado`: ADO -> SpecWeave only (pull updates)

## Examples

```bash
# Two-way sync (default - both directions)
/sw-ado:sync 0005

# Push only (one-way to ADO)
/sw-ado:sync 0005 --direction to-ado

# Pull only (one-way from ADO)
/sw-ado:sync 0005 --direction from-ado
```

---

## Command Behavior

When user runs this command, Claude should:

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

### 1. Check Permission Gate (MANDATORY FIRST STEP)

**Before ANY ADO write operations**, check permissions:

```typescript
// Read .specweave/config.json
const config = JSON.parse(await fs.readFile('.specweave/config.json', 'utf-8'));
const canUpdateExternal = config?.sync?.settings?.canUpdateExternalItems ?? false;
const canUpdateStatus = config?.sync?.settings?.canUpdateStatus ?? false;

// Permission check based on direction
if (direction === 'to-ado' || direction === 'two-way') {
  if (!canUpdateExternal) {
    console.log(`
❌ Permission Denied: ADO Write Operations Disabled

Cannot push changes to ADO (sync.settings.canUpdateExternalItems = false).

Options:
1. Enable writes: Set canUpdateExternalItems to true in config.json
2. Pull-only mode: /sw-ado:sync ${incrementId} --direction from-ado
`);
    return;
  }
}
```

For `--direction from-ado` (pull-only), permission check is skipped as it's read-only.

### 2. Resolve ADO Profile

Use the increment's stored profile or fall back to global activeProfile:

```typescript
// Load increment metadata
const metadataPath = `.specweave/increments/${incrementId}/metadata.json`;
const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

// Priority: increment profile > global activeProfile
let profileName = metadata?.external_sync?.ado?.profile;
if (!profileName) {
  profileName = config?.sync?.activeProfile;
}

// Validate profile exists
const profileConfig = config?.sync?.profiles?.[profileName];
if (!profileConfig || profileConfig.provider !== 'ado') {
  console.log(`❌ ADO profile "${profileName}" not found`);
  console.log('Available ADO profiles:', Object.entries(config?.sync?.profiles || {})
    .filter(([_, p]) => p.provider === 'ado')
    .map(([name]) => name)
    .join(', '));
  return;
}

const { organization, project } = profileConfig.config;
console.log(`Using ADO profile: ${profileName}`);
console.log(`  Organization: ${organization}`);
console.log(`  Project: ${project}`);
```

### 3. Invoke ADO Manager Skill

```
Use Skill tool: Skill({ skill: "sw-ado:ado-manager", args: "{direction} sync for increment {increment-id} with ADO.

IMPORTANT:
- Permission verified: canUpdateExternalItems={canUpdateExternal}
- Using profile: {profileName} (org: {organization}, project: {project})

Phase 1 - Pull FROM ADO:
1. Fetch work item #{workItemId} from ADO API
2. Detect changes: state, priority, iteration, comments
3. Apply ADO changes to increment metadata
4. Import team comments to increment notes

Phase 2 - Push TO ADO (if direction allows):
1. Read .specweave/increments/{increment-id}/tasks.md
2. Calculate: X/Y tasks complete (Z%)
3. Identify: Recently completed tasks
4. Format comment with progress update
5. Load work item ID from metadata.json
6. POST comment to ADO API using org: {organization}, project: {project}
7. Update work item state/fields

Display: Sync summary with profile used"
```

### 4. Display Result

```
Sync Summary for increment {increment-id}

Profile: {profileName}
  Organization: {organization}
  Project: {project}

Direction: {direction}

FROM ADO:
  State: Active -> Resolved
  Priority: 2 -> 1
  Comments: 3 new

TO ADO:
  Progress: 60% (6/10 tasks)
  Posted comment #98765

Work Item: https://dev.azure.com/{organization}/{project}/_workitems/edit/{workItemId}
```

---

## Permission Check Matrix

| Direction | canUpdateExternalItems | Result |
|-----------|------------------------|--------|
| from-ado | any | Allowed (read-only) |
| to-ado | false | Denied |
| to-ado | true | Allowed |
| two-way | false | Denied |
| two-way | true | Allowed |

---

## Profile Resolution

The command resolves the ADO profile in this order:

1. **Increment profile** (metadata.json -> external_sync.ado.profile)
2. **Global profile** (config.json -> sync.activeProfile)

This allows:
- Different increments to sync to different ADO projects
- No manual `activeProfile` switching needed
- Automatic project targeting

---

## Example Output

### Two-way Sync (Default)

```
User: /sw-ado:sync 0005-payment-integration

Claude:
Checking permissions...
  canUpdateExternalItems: true

Resolving ADO profile...
  Using: ado-my-project (from increment)
  Organization: acme-corp
  Project: My Project

Syncing...

FROM ADO:
  State changed: Active -> Resolved
  Iteration updated: Sprint 23 -> Sprint 24
  Priority changed: 2 -> 1
  3 new comments from team

TO ADO:
  Progress: 60% complete (6/10 tasks)
  Posted comment (ID: 98765)
  Updated completion field: 60%

Sync Complete!
Profile: ado-my-project
Work Item: https://dev.azure.com/acme-corp/My%20Project/_workitems/edit/12345
```

### Permission Denied

```
User: /sw-ado:sync 0005 --direction to-ado

Claude:
Checking permissions...
  canUpdateExternalItems: false

Permission Denied: ADO Write Operations Disabled

Cannot push changes to ADO.

Options:
1. Enable writes: Set sync.settings.canUpdateExternalItems = true
2. Pull-only: /sw-ado:sync 0005 --direction from-ado
```

---

## Simpler Alternatives

For most use cases, use the git-style commands:

| Command | Purpose |
|---------|---------|
| `/sw-ado:pull` | Pull changes from ADO (read-only) |
| `/sw-ado:push` | Push progress to ADO |

Use `/sw-ado:sync` when you need explicit two-way sync with options.

---

## Sync Brief (MANDATORY OUTPUT)

**After EVERY sync operation, display a compact two-way summary:**

```
┌─────────────────────────────────────────────────────────┐
│  SYNC COMPLETE                                    ✓ ADO │
├─────────────────────────────────────────────────────────┤
│  Increment: 0005-payment-integration                    │
│  Work Item: #12345                                      │
│  Profile:   ado-techcorp                                │
│  Direction: two-way (pull + push)                       │
├─────────────────────────────────────────────────────────┤
│  PULLED (from ADO)                              ↓       │
│    ↓ Status:    Active → Resolved  (external wins)      │
│    ↓ Priority:  P2 → P1                                 │
│    + Comments:  2 new imported                          │
├─────────────────────────────────────────────────────────┤
│  PUSHED (to ADO)                                ↑       │
│    Tasks: 8/10 (80%)  ████████░░                        │
│    ↑ Comment posted: "Progress: 80% complete"           │
│    ↑ Completion: 60% → 80%                              │
├─────────────────────────────────────────────────────────┤
│  CONFLICTS RESOLVED: 1                                  │
│    Status: local "in-progress" vs ADO "Resolved"        │
│    Winner: ADO (external tool always wins)              │
├─────────────────────────────────────────────────────────┤
│  Last sync: 2025-12-04 10:32:15 (just now)              │
│  URL: https://dev.azure.com/.../12345                   │
└─────────────────────────────────────────────────────────┘
```

### Symbols Reference

| Symbol | Meaning |
|--------|---------|
| `✓` | Success |
| `⚠` | Warning |
| `✗` | Failed |
| `↓` | Pulled (incoming) |
| `↑` | Pushed (outgoing) |

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
- ❌ Any other variation

---

## Related

| Command | Purpose |
|---------|---------|
| `/sw-ado:pull` | Pull from ADO (git-style) |
| `/sw-ado:push` | Push to ADO (git-style) |
| `/sw-ado:create` | Create new ADO work item |
| `/sw-ado:status` | Check sync status |
| `/sw-ado:close` | Close work item when complete |
