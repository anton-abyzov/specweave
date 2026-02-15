---
description: Plan and create SpecWeave increments with PM and Architect agent collaboration. Use when starting new features, hotfixes, bugs, or any development work that needs specification and task breakdown. Creates spec.md, plan.md, tasks.md with proper AC-IDs and living docs integration.
context: fork
model: opus
hooks:
  PreToolUse:
    - matcher: Write
      hooks:
        - type: command
          command: bash plugins/specweave/hooks/v2/guards/interview-enforcement-guard.sh
        - type: command
          command: bash plugins/specweave/hooks/v2/guards/spec-template-enforcement-guard.sh
  PostToolUse:
    - matcher: Write
      hooks:
        - type: command
          command: bash plugins/specweave/hooks/v2/guards/increment-duplicate-guard.sh
---

# Increment Planner Skill

## CRITICAL: Plan Mode Required

**Before executing this skill, you MUST be in plan mode.** If you are not currently in plan mode, call `EnterPlanMode` first. Increment planning is ALWAYS a planning activity — never skip straight to implementation.

## Project Overrides

!`s="increment-planner"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`

## Project Context

!`.specweave/scripts/skill-context.sh increment-planner 2>/dev/null; true`

**Self-contained increment planning for ANY user project after `specweave init`.**

## Workflow Overview

```
STEP 1: Pre-flight (TDD mode, multi-project, Deep Interview)
        -> CHECK: Deep Interview Mode enabled?

STEP 1a: Deep Interview (if enabled)
         -> PM skill loads phases/00-deep-interview.md
         -> ASSESS complexity first, then ask right number of questions
         -> Skip categories that don't apply to this feature

STEP 2: Project Context (resolve project/board)

STEP 3: Create Increment (via Template API)

STEP 4: Guide User (complete in main conversation)
```

## Step 1: Pre-flight Checks

```bash
# 1. Check TDD mode
jq -r '.testing.defaultTestMode // "test-after"' .specweave/config.json 2>/dev/null

# 2. Check multi-project config
specweave context projects 2>/dev/null

# 3. Check deep interview mode
jq -r '.planning.deepInterview.enabled // false' .specweave/config.json 2>/dev/null

# 4. Check WIP limits
find .specweave/increments -maxdepth 2 -name "metadata.json" -exec grep -l '"status":"active"' {} \; 2>/dev/null | wc -l
```

## Step 1a: Deep Interview Mode (if enabled)

**If deep interview is enabled, delegate to PM skill:**

```typescript
Skill({ skill: "sw:pm", args: "Deep interview mode for: <user description>" })
```

**THINK about complexity first** - assess before asking:
- Trivial: 0-3 questions | Small: 4-8 | Medium: 9-18 | Large: 19-40+

## Step 2: Project Context

```bash
# Get project/board values for spec.md
specweave context projects
```

Every US MUST have `**Project**:` field. For 2-level structures, also `**Board**:`.

## Step 3: Create Increment

### 3a. Determine Increment Location

**CRITICAL for multi-repo setups:**

```bash
# Check if this is a multi-repo umbrella project
if [ -d "repositories" ]; then
  echo "MULTI-REPO: Increments belong in EACH repo's .specweave/"
  # Discover organization from config (NOT from .env)
  ORG=$(jq -r '.repository.organization // empty' .specweave/config.json 2>/dev/null)
  [ -z "$ORG" ] && ORG=$(jq -r '[.sync.profiles[].config.owner // .sync.profiles[].config.organization] | map(select(. != null)) | first // empty' .specweave/config.json 2>/dev/null)
  [ -z "$ORG" ] && ORG=$(ls -d repositories/*/ 2>/dev/null | head -1 | xargs basename 2>/dev/null)
  echo "Organization: $ORG"
  echo "Example: repositories/$ORG/{repo-name}/.specweave/increments/"
  ls -d repositories/*/* 2>/dev/null | head -20
else
  echo "SINGLE-REPO: Use .specweave/increments/"
fi
```

**Multi-repo rules:**
- Each repository has its OWN `.specweave/increments/` directory
- Team agents MUST create increments in their assigned repo's `.specweave/`
- The umbrella root `.specweave/` is for umbrella-level config ONLY
- Run `specweave init` in each repo if `.specweave/` doesn't exist
- Repos MUST be at `repositories/{ORG}/{repo-name}/` — NEVER directly under `repositories/`

### 3b. Get Unique ID

```bash
# Check ALL folders for existing IDs
find .specweave/increments -maxdepth 2 -type d -name "[0-9]*" 2>/dev/null | grep -oE '[0-9]{4}E?' | sort -u | tail -5

# For multi-repo, also check child repos
find repositories -path "*/specweave/increments/*" -maxdepth 5 -type d -name "[0-9]*" 2>/dev/null | grep -oE '[0-9]{4}E?' | sort -u | tail -5
```

### 3c. Create via CLI (preferred)

```bash
specweave create-increment --id "XXXX-name" --title "Feature Title" --description "Brief description" --project "my-app"
```

**Optional flags**: `--type hotfix` | `--priority P1` | `--board "team-name"` | `--json`

### 3d. Create manually (if CLI unavailable)

```bash
mkdir -p .specweave/increments/XXXX-name
```

Create files in order: metadata.json FIRST, then spec.md, plan.md, tasks.md.

## Quick Reference

### Increment Types

| Type | Use When | WIP Limit |
|------|----------|-----------|
| **feature** | New functionality | Max 2 |
| **hotfix** | Production broken | Unlimited |
| **bug** | Needs RCA | Unlimited |
| **change-request** | Business changes | Max 2 |
| **refactor** | Technical debt | Max 1 |
| **experiment** | POC/spike | Unlimited |

### Directory Structure

```
.specweave/increments/####-name/
├── metadata.json  # REQUIRED - create FIRST
├── spec.md        # REQUIRED - user stories, ACs
├── plan.md        # OPTIONAL - architecture
└── tasks.md       # REQUIRED - implementation
```

### User Story Format

```markdown
### US-001: Feature Name
**Project**: my-app    # <- REQUIRED! Get from: specweave context projects

**As a** [role]
**I want** [capability]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] **AC-US1-01**: [Criterion 1]
- [ ] **AC-US1-02**: [Criterion 2]
```

## Critical Rules

1. **Project field is MANDATORY** - Every US MUST have `**Project**:` field
2. **Use Template Creator CLI** (REQUIRED): `specweave create-increment --id "XXXX-name" --title "Title" --description "Desc" --project "my-app"`
3. **NO agent spawning** - Skills MUST NOT spawn Task() agents (causes crashes). Guide user in main conversation.
4. **Increment naming** - Format: `####-descriptive-kebab-case`
5. **Multi-repo** - In umbrella projects with `repositories/` folder, create increments in EACH repo's `.specweave/`, not the umbrella root

## Delegation

After increment creation:

```typescript
// Invoke architect for plan.md
Skill({ skill: "sw:architect", args: "Design architecture for increment XXXX" })

// Invoke test-aware planner for tasks.md
Skill({ skill: "sw:test-aware-planner", args: "Generate tasks for increment XXXX" })
```

## Step 5: Execution Strategy Recommendation

After delegation completes (architect + test-aware-planner have created plan.md and tasks.md), analyze the increment:

1. **Count tasks**: `grep -c '^\- \[ \]\|^### T-' tasks.md`
2. **Count domains** from spec.md user stories and plan.md architecture (frontend, backend, database, API, DevOps, security, mobile, ML/AI)
3. **Classify**: Low (≤8 tasks, 1 domain) | Medium (9-15, 1-2 domains) | High (>15 OR 3+ domains)

**Show recommendation in output:**

```
EXECUTION STRATEGY
================================================
Tasks: [N] | Domains: [M] | Complexity: [Low/Medium/High]

  /sw:do <id>         - Step-by-step, full control
  /sw:auto <id>       - Autonomous sequential (unattended)
  /sw:team-lead       - Parallel multi-agent (best quality for multi-domain, higher token cost)
```

- **Low**: Show `/sw:do <id>` as next step (default behavior)
- **Medium**: Show `/sw:do <id>` and recommend `/sw:auto <id>` for unattended execution
- **High**: Recommend `/sw:team-lead` as primary, with `/sw:auto` and `/sw:do` as alternatives

See CLAUDE.md Execution Strategy section for the full decision matrix.

## Usage

```typescript
// Called by hook system (primary path)
Skill({ skill: "sw:increment-planner", args: "Add user authentication" })

// Via command (handles pre-flight checks too)
/sw:increment "Add user authentication"
```

