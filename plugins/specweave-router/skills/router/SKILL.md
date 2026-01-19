---
name: specweave-router
description: |
  Lightweight SpecWeave router that detects spec-driven development intent
  and loads full plugins on-demand. Activates for: increment, specweave,
  /sw:, /sw-github:, /sw-jira:, /sw-ado:, /sw-release:, /sw-infra:,
  /sw-k8s:, /sw-ml:, /sw-kafka:, /sw-confluent:, /sw-mobile:, /sw-payments:,
  /sw-testing:, /sw-diagrams:, /sw-frontend:, /sw-backend:,
  spec.md, tasks.md, plan.md, living docs, living documentation,
  acceptance criteria, user story, feature planning, sprint planning,
  jira sync, github sync, ado sync, auto mode, tdd mode, parallel auto.
visibility: public
user-invocable: false
allowed-tools:
  - Bash
---

# SpecWeave Router

Minimal router for lazy-loading SpecWeave plugins. Detects intent and loads full functionality on-demand.

## When I Activate

I detect SpecWeave intent when you mention:
- **Core Commands**: `/sw:*` (increment, do, done, progress, validate, etc.)
- **Plugin Commands**: `/sw-github:*`, `/sw-jira:*`, `/sw-ado:*`, `/sw-release:*`, etc.
- **Files**: `spec.md`, `tasks.md`, `plan.md`
- **Concepts**: increment, living docs, acceptance criteria, user story
- **Integrations**: jira sync, github sync, ado sync
- **Modes**: auto mode, tdd mode, parallel auto

## CRITICAL: Command Prefix Detection

When user types a plugin-specific command, load THAT plugin specifically:

| Command Prefix | Plugin to Load | Load Command |
|---------------|----------------|--------------|
| `/sw:*` | specweave (core) | `specweave load-plugins core` |
| `/sw-github:*` | specweave-github | `specweave load-plugins github` |
| `/sw-jira:*` | specweave-jira | `specweave load-plugins jira` |
| `/sw-ado:*` | specweave-ado | `specweave load-plugins ado` |
| `/sw-release:*` | specweave-release | `specweave load-plugins release` |
| `/sw-infra:*` | specweave-infrastructure | `specweave load-plugins infra` |
| `/sw-k8s:*` | specweave-k8s | `specweave load-plugins infra` |
| `/sw-ml:*` | specweave-ml | `specweave load-plugins ml` |
| `/sw-kafka:*` | specweave-kafka | `specweave load-plugins kafka` |
| `/sw-confluent:*` | specweave-confluent | `specweave load-plugins confluent` |
| `/sw-mobile:*` | specweave-mobile | `specweave load-plugins mobile` |
| `/sw-payments:*` | specweave-payments | `specweave load-plugins payments` |
| `/sw-testing:*` | specweave-testing | `specweave load-plugins testing` |
| `/sw-diagrams:*` | specweave-diagrams | `specweave load-plugins diagrams` |
| `/sw-frontend:*` | specweave-frontend | `specweave load-plugins frontend` |
| `/sw-backend:*` | specweave-backend | `specweave load-plugins backend` |

## On Activation - CROSS-PLATFORM

When SpecWeave intent detected, follow this sequence:

### Step 1: Check if this is a SpecWeave project

First verify the project has SpecWeave initialized:

**macOS/Linux:**
```bash
test -d ".specweave" && echo "SpecWeave project detected"
```

**Windows (PowerShell):**
```powershell
if (Test-Path ".specweave") { Write-Host "SpecWeave project detected" }
```

**If `.specweave/` folder does NOT exist**: Stop here. This is not a SpecWeave project. Tell user to run `specweave init` first if they want to use SpecWeave.

### Step 2: Determine which plugin to load

Analyze the user's request:

1. **If command starts with `/sw-github:`** → Load github plugin
2. **If command starts with `/sw-jira:`** → Load jira plugin
3. **If command starts with `/sw-ado:`** → Load ado plugin
4. **If command starts with `/sw-release:`** → Load release plugin
5. **If command starts with `/sw-infra:` or `/sw-k8s:`** → Load infra plugin
6. **If command starts with `/sw-ml:`** → Load ml plugin
7. **If command starts with `/sw:`** (core) → Load core plugin
8. **If natural language** → Load all plugins

### Step 3: Load plugins (CROSS-PLATFORM)

Use the CLI which handles all OS differences internally:

**For specific plugin (faster, recommended):**
```bash
specweave load-plugins github    # For /sw-github:* commands
specweave load-plugins jira      # For /sw-jira:* commands
specweave load-plugins core      # For /sw:* commands
```

**For all plugins (if unsure):**
```bash
specweave load-plugins all
```

This command:
- Auto-detects shell (Bash > PowerShell > cmd)
- Handles Windows long paths (>260 chars)
- Has retry mechanism with exponential backoff
- Works on macOS, Linux, and Windows

### Step 4: Execute the original command

After plugins are loaded (hot-reload ~2 seconds), the original command will work.

Output to user:
```
Loading SpecWeave [plugin-name] plugin...
✅ Ready. Executing /sw-*:command...
```

Then proceed with the user's original request.

## IMPORTANT: Project Detection

**NEVER load plugins if `.specweave/` folder doesn't exist!**

This prevents:
- Loading SpecWeave in non-SpecWeave projects
- Confusing users who don't have SpecWeave initialized
- Wasting context on projects that don't need it

If user asks about SpecWeave but project isn't initialized:
```
This project doesn't have SpecWeave initialized.
Run: specweave init
Then I can help with spec-driven development.
```

## Token Savings

- This router: ~800 tokens
- Full plugins: ~60,000 tokens
- Savings: 98% when not using SpecWeave

## Manual Loading

Users can manually load plugins anytime:
```bash
specweave load-plugins all       # Load all plugins
specweave load-plugins core      # Load core only
specweave load-plugins github    # Load GitHub integration
specweave load-plugins --force   # Force reload even if loaded
```

## Related

- Full documentation: https://spec-weave.com
- Commands reference: `/sw:sw`
