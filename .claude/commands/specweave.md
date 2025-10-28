---
name: specweave
description: SpecWeave master command - routes to increment lifecycle subcommands (inc, build, next, done, progress, validate, sync-github, sync-docs, create-project). Namespaced to avoid collisions in brownfield projects.
---

# SpecWeave Master Command

**Namespace Protection**: All SpecWeave commands are prefixed with `specweave` to avoid collisions with existing project commands.

This master command routes to SpecWeave increment lifecycle subcommands.

---

## Usage

```bash
/specweave <subcommand> [arguments]
```

---

## Available Subcommands

### Increment Lifecycle

| Subcommand | Description | Example |
|------------|-------------|---------|
| **inc** | Create new increment (PM-led) | `/specweave inc "User auth"` |
| **build** | Execute tasks (auto-resumes) | `/specweave build` or `/specweave build 0001` |
| **next** | Smart transition (close + suggest) | `/specweave next` |
| **done** | Manual closure with PM validation | `/specweave done 0001` |
| **progress** | Check status and next action | `/specweave progress` |
| **validate** | Validate increment quality | `/specweave validate 0001` |

### Project Setup

| Subcommand | Description | Example |
|------------|-------------|---------|
| **create-project** | Bootstrap SpecWeave in new/existing project | `/specweave create-project` |
| **sync-github** | Sync increment to GitHub issues | `/specweave sync-github 0001` |
| **sync-docs** | Sync documentation (review/update) | `/specweave sync-docs` or `/specweave sync-docs update 0001` |

---

## Subcommand Routing

**IMPORTANT**: This command acts as a router. When invoked, it:

1. **Parses the subcommand** from the first argument
2. **Routes to the corresponding command** file
3. **Passes remaining arguments** to the subcommand

### Routing Table

```yaml
subcommands:
  inc: .claude/commands/specweave-inc.md
  build: .claude/commands/specweave-build.md
  next: .claude/commands/specweave-next.md
  done: .claude/commands/specweave-done.md
  progress: .claude/commands/specweave-progress.md
  validate: .claude/commands/specweave-validate.md
  create-project: .claude/commands/specweave-create-project.md
  sync-github: .claude/commands/specweave-sync-github.md
  sync-docs: .claude/commands/specweave-sync-docs.md
  review-docs: .claude/commands/specweave-review-docs.md  # DEPRECATED: use sync-docs
```

---

## Routing Logic

### Step 1: Parse Subcommand

```
Input: /specweave inc "User authentication"
                  ↓
Parse: subcommand = "inc"
       arguments = ["User authentication"]
```

### Step 2: Validate Subcommand

```
Known subcommands: [inc, build, next, done, progress, validate, create-project, sync-github, sync-docs, review-docs]

If subcommand in known_subcommands:
    Route to corresponding command
Else:
    Show error with available subcommands
```

### Step 3: Route to Command

```
Read file: .claude/commands/specweave-inc.md
Execute: Command content with arguments
```

---

## Examples

### Example 1: Create Increment

**Input**:
```bash
/specweave inc "User authentication"
```

**Routing**:
```
Parse: subcommand = "inc", args = ["User authentication"]
Route to: .claude/commands/specweave-inc.md
Execute: /specweave-inc "User authentication"
```

### Example 2: Build Current Increment

**Input**:
```bash
/specweave build
```

**Routing**:
```
Parse: subcommand = "build", args = []
Route to: .claude/commands/specweave-build.md
Execute: /specweave-build (auto-finds active increment)
```

### Example 3: Smart Transition

**Input**:
```bash
/specweave next
```

**Routing**:
```
Parse: subcommand = "next", args = []
Route to: .claude/commands/specweave-next.md
Execute: /specweave-next (validates, closes, suggests)
```

### Example 4: Invalid Subcommand

**Input**:
```bash
/specweave invalid-command
```

**Output**:
```
❌ Error: Unknown subcommand "invalid-command"

Available subcommands:
  Increment Lifecycle:
    inc          - Create new increment
    build        - Execute tasks
    next         - Smart transition
    done         - Manual closure
    progress     - Check status
    validate     - Validate quality

  Project Setup:
    create-project  - Bootstrap SpecWeave
    sync-github     - Sync to GitHub
    sync-docs       - Sync documentation (review/update)

Usage: /specweave <subcommand> [arguments]
Example: /specweave inc "User authentication"
```

---

## Implementation (For Command Processor)

### Pseudocode

```javascript
function handleSpecweaveCommand(rawInput) {
  // Parse input
  const parts = rawInput.split(' ');
  const subcommand = parts[1]; // First arg after /specweave
  const args = parts.slice(2);  // Remaining args

  // Routing table
  const routes = {
    'inc': 'specweave-inc.md',
    'build': 'specweave-build.md',
    'next': 'specweave-next.md',
    'done': 'specweave-done.md',
    'progress': 'specweave-progress.md',
    'validate': 'specweave-validate.md',
    'create-project': 'specweave-create-project.md',
    'sync-github': 'specweave-sync-github.md',
    'sync-docs': 'specweave-sync-docs.md',
    'review-docs': 'specweave-review-docs.md'  // DEPRECATED: redirects to sync-docs
  };

  // Validate subcommand
  if (!routes[subcommand]) {
    return showError(`Unknown subcommand "${subcommand}"`);
  }

  // Route to command
  const commandFile = `.claude/commands/${routes[subcommand]}`;
  return executeCommand(commandFile, args);
}
```

---

## Why Namespacing?

### Problem: Brownfield Collision

**Without namespacing**:
```
User's project:
  .claude/commands/build.md    (their own build command)

SpecWeave installation:
  .claude/commands/build.md    (SpecWeave's build)

Result: ❌ COLLISION - User's command overwritten!
```

**With namespacing**:
```
User's project:
  .claude/commands/build.md    (their own build command)

SpecWeave installation:
  .claude/commands/specweave-build.md    (SpecWeave's build)
  .claude/commands/specweave.md          (master router)

Result: ✅ NO COLLISION - Both coexist!
```

### Benefits

1. **No collisions** - SpecWeave commands never overwrite user commands
2. **Clear ownership** - `specweave-*` prefix shows it's framework command
3. **Easy identification** - `/specweave` clearly indicates SpecWeave action
4. **Brownfield safe** - Can install in any existing project
5. **Uninstall clean** - Remove `specweave-*` files, user's files intact

---

## Backward Compatibility (Aliases)

For convenience, you can create aliases for shorter commands:

### Option 1: Shell Aliases (in user's shell profile)

```bash
# ~/.zshrc or ~/.bashrc
alias sw='/specweave'           # /specweave → sw
alias swinc='sw inc'             # /specweave inc → swinc
alias swbuild='sw build'         # /specweave build → swbuild
alias swnext='sw next'           # /specweave next → swnext
```

**Usage**:
```bash
sw inc "User auth"        # Instead of /specweave inc
swbuild                   # Instead of /specweave build
swnext                    # Instead of /specweave next
```

### Option 2: Command Aliases (in .claude/config.yaml)

```yaml
# .claude/config.yaml
command_aliases:
  /inc: /specweave inc
  /build: /specweave build
  /next: /specweave next
  /done: /specweave done
  /progress: /specweave progress
```

**Usage**:
```bash
/inc "User auth"      # Automatically routes to /specweave inc
/build                # Automatically routes to /specweave build
/next                 # Automatically routes to /specweave next
```

**IMPORTANT**: Aliases are opt-in. Default is always namespaced `/specweave` to ensure brownfield safety.

---

## Installation Behavior

### Fresh Project (Greenfield)

```bash
# No existing .claude/ directory
/specweave create-project

Result:
  ✅ Creates .claude/commands/specweave*.md
  ✅ Creates .specweave/ structure
  ✅ No conflicts possible
```

### Existing Project (Brownfield)

```bash
# Existing .claude/commands/build.md (user's)
/specweave create-project

Behavior:
  1. Detects existing .claude/ directory
  2. Backs up existing files:
     .claude/commands/ → .claude/commands.backup-1698765432/
  3. Installs SpecWeave commands:
     .claude/commands/specweave*.md
  4. Restores user's commands:
     Copies non-conflicting files back
  5. Reports:
     ✅ Installed SpecWeave commands
     ✅ Backed up your commands to .claude/commands.backup-1698765432/
     ℹ️ Your existing commands preserved (no overwrite)
```

**Backup Structure**:
```
.claude/
├── commands/
│   ├── build.md                    (user's original - preserved)
│   ├── specweave-build.md          (SpecWeave's - new)
│   ├── specweave-inc.md            (SpecWeave's - new)
│   └── specweave.md                (master router - new)
├── commands.backup-1698765432/     (timestamped backup)
│   └── build.md                    (original backup)
└── skills/
    └── ... (similar backup strategy)
```

---

## Migration from Old Commands

If you have code/docs referencing old commands:

### Find and Replace

```bash
# Old → New
/inc              → /specweave inc
/build            → /specweave build
/next             → /specweave next
/done             → /specweave done
/progress         → /specweave progress
/validate         → /specweave validate
/create-project   → /specweave create-project
/sync-github      → /specweave sync-github
/sync-docs        → /specweave sync-docs
/review-docs      → /specweave sync-docs  # DEPRECATED
```

### Automated Migration Script

```bash
# migrate-specweave-commands.sh
#!/bin/bash

echo "Migrating SpecWeave commands to namespaced versions..."

# Find all markdown files
find .specweave -type f -name "*.md" -exec sed -i '' \
  -e 's|`/inc |`/specweave inc |g' \
  -e 's|`/build|`/specweave build|g' \
  -e 's|`/next|`/specweave next|g' \
  -e 's|`/done|`/specweave done|g' \
  -e 's|`/progress|`/specweave progress|g' \
  {} \;

echo "✅ Migration complete!"
```

---

## Help Command

```bash
/specweave help
# or
/specweave --help
# or
/specweave (no args)
```

**Output**:
```
SpecWeave - Production-Ready Development Framework

Usage: /specweave <subcommand> [arguments]

Increment Lifecycle:
  inc "feature"      - Create new increment (PM-led planning)
  build [id]         - Execute tasks (auto-resumes from last incomplete)
  next               - Smart transition (validate, close, suggest next)
  done <id>          - Manual closure with PM validation
  progress [id]      - Check status, completion %, and next action
  validate <id>      - Validate increment quality

Project Setup:
  create-project     - Bootstrap SpecWeave in new/existing project
  sync-github <id>   - Sync increment to GitHub issues
  sync-docs [mode] [id] - Sync documentation (review/update)

Examples:
  /specweave inc "User authentication"
  /specweave build
  /specweave next
  /specweave done 0001
  /specweave progress

Documentation: https://spec-weave.com/docs
```

---

## Related Documentation

- [Installation Guide](.specweave/docs/public/guides/getting-started/installation.md)
- [Brownfield Integration](.specweave/docs/internal/delivery/BROWNFIELD-INTEGRATION-STRATEGY.md)
- [Command Reference](.claude/commands/README.md)

---

**Important**: Always use `/specweave` prefix to ensure brownfield compatibility and avoid command collisions!
