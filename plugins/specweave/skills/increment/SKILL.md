---
description: Plan and create SpecWeave increments with PM and Architect agent collaboration. Use when starting new features, hotfixes, bugs, or any development work that needs specification and task breakdown. Creates spec.md, plan.md, tasks.md with proper AC-IDs and living docs integration.
argument-hint: "<feature-description>"
model: opus
hooks:
  PreToolUse:
    - matcher: Write
      hooks:
        - type: command
          command: bash -c 'W="${CLAUDE_PLUGIN_ROOT}/hooks/universal/fail-fast-wrapper.sh"; S="${CLAUDE_PLUGIN_ROOT}/hooks/v2/guards/interview-enforcement-guard.sh"; [[ -x "$W" ]] && exec "$W" "$S" || (cat >/dev/null && printf "{\"decision\":\"allow\"}")'
        - type: command
          command: bash -c 'W="${CLAUDE_PLUGIN_ROOT}/hooks/universal/fail-fast-wrapper.sh"; S="${CLAUDE_PLUGIN_ROOT}/hooks/v2/guards/spec-template-enforcement-guard.sh"; [[ -x "$W" ]] && exec "$W" "$S" || (cat >/dev/null && printf "{\"decision\":\"allow\"}")'
  PostToolUse:
    - matcher: Write
      hooks:
        - type: command
          command: bash -c 'W="${CLAUDE_PLUGIN_ROOT}/hooks/universal/fail-fast-wrapper.sh"; S="${CLAUDE_PLUGIN_ROOT}/hooks/v2/guards/increment-duplicate-guard.sh"; [[ -x "$W" ]] && exec "$W" "$S" || (cat >/dev/null && printf "{\"decision\":\"allow\"}")'
---

# Plan Product Increment

## CRITICAL: Plan Mode Required (BLOCKING)

**You MUST be in plan mode before proceeding.** If not, call `EnterPlanMode` now and wait for confirmation before continuing to Step 0A.

1. Call `EnterPlanMode` immediately
2. Wait for plan mode confirmation
3. Then proceed to Step 0A

Increment planning produces specs, plans, and task breakdowns that require user review. Do not skip plan mode or defer it — the user must approve the plan before any implementation begins.

## Project Overrides

!`s="increment"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`

## Project Context

!`.specweave/scripts/skill-context.sh increment 2>/dev/null; true`

**Self-contained increment planning for ANY user project after `specweave init`.**

## Workflow Overview

```
STEP 0A: Discipline Check (BLOCKING)
STEP 0B: WIP Enforcement
STEP 0C: Tech Stack Detection
STEP 0D: Structure Resolution (if deferred from init)
STEP 1:  Pre-flight (TDD mode, multi-project, Deep Interview check)
STEP 2:  Project Context (resolve project/board)
STEP 3:  Create Increment (via Template API) ← folder + ID exist after this
STEP 3a: Deep Interview (if enabled) ← runs AFTER folder exists
STEP 4:  Delegation (architect + planner)
STEP 5:  Post-Creation Sync
STEP 6:  Execution Strategy Recommendation
```

**CRITICAL**: Step 3 (Create Increment) MUST run before Step 3a (Deep Interview).
The interview state file is written to `.specweave/state/interview-{increment-id}.json`,
and the enforcement guard looks for it by increment ID. If the interview runs before the
increment folder exists, the guard cannot find the state file and blocks spec.md writing.

## Step 0A: Discipline Check (MANDATORY)

**Cannot start N+1 until N is DONE.**

```bash
if ! specweave check-discipline; then
  echo "Cannot create new increment! Close existing work first."
  echo "Run: /sw:done <id>"
  exit 1
fi
```

## Step 0B: WIP Enforcement

Default: 1 active increment (focus). Allow 2 for emergencies.

```typescript
const active = MetadataManager.getAllActive();
const limits = config.limits || { maxActiveIncrements: 1, hardCap: 3 };

if (active.length >= limits.hardCap) {
  // BLOCK - ask user to complete/pause existing
  console.log("WIP LIMIT REACHED");
  console.log("Options: /sw:done <id> | /sw:pause <id>");
}

if (active.length >= limits.maxActiveIncrements) {
  // SOFT WARNING - hotfix/bug can bypass
  const isEmergency = ['hotfix', 'bug'].includes(incrementType);
  if (!isEmergency) {
    // Prompt: complete, pause, or continue anyway
  }
}
```

**Type-Based Limits:**
- Hotfix/Bug: Unlimited (emergency)
- Feature/Change-Request: Max 2
- Refactor: Max 1
- Experiment: Unlimited

## Step 0C: Tech Stack Detection

Auto-detect from project files:

| File | Language |
|------|----------|
| package.json | TypeScript/JavaScript |
| requirements.txt | Python |
| go.mod | Go |
| Cargo.toml | Rust |
| pom.xml | Java |
| *.csproj | C#/.NET |

If detection fails, ask user.

## Step 0D: Structure Resolution (if deferred)

Check if the user deferred their repository structure decision during init (greenfield projects):

```bash
DEFERRED=$(jq -r '.project.structureDeferred // false' .specweave/config.json 2>/dev/null)
```

If `DEFERRED` is `true`, this is the user's **first increment** and they need to define their project structure.

Based on the user's feature description and what you've learned from tech stack detection:

1. **Ask the user** about their repository structure:
   - **Single repo** — one repository (monorepo or standard project)
   - **Multiple repos** — microservices, EDA, parent/child architecture

2. **Run the resolve command** based on their answer:
   ```bash
   specweave resolve-structure --type single
   # OR
   specweave resolve-structure --type multiple
   ```

3. This clears the deferred flag and configures the project accordingly. Continue with the normal increment flow.

## Step 1: Pre-flight Checks

```bash
# 1. Check TDD mode
jq -r '.testing.defaultTestMode // "TDD"' .specweave/config.json 2>/dev/null

# 2. Check multi-project config
specweave context projects 2>/dev/null

# 3. Check deep interview mode (note: interview itself runs at Step 3a, after increment exists)
DEEP_INTERVIEW=$(jq -r '.planning.deepInterview.enabled // false' .specweave/config.json 2>/dev/null)

# 4. Check WIP limits
find .specweave/increments -maxdepth 2 -name "metadata.json" -exec grep -l '"status":"active"' {} \; 2>/dev/null | wc -l
```

## Step 2: Project Context

```bash
# Get project/board values for spec.md
specweave context projects
```

Every US MUST have `**Project**:` field. For 2-level structures, also `**Board**:`.

## Step 3: Create Increment

### 3a. Determine Increment Location

**CRITICAL for umbrella vs single-repo:**

```bash
# Check umbrella mode
UMBRELLA_ENABLED=$(jq -r '.umbrella.enabled // false' .specweave/config.json 2>/dev/null)

if [ "$UMBRELLA_ENABLED" = "true" ]; then
  echo "UMBRELLA MODE: Increments go in UMBRELLA ROOT .specweave/increments/"
  echo "The **Project**: field in each user story controls sync routing to child repos."
  # List available child repos for context
  jq -r '.umbrella.childRepos[]? | "\(.name) (\(.path))"' .specweave/config.json 2>/dev/null
elif [ -d "repositories" ]; then
  echo "MULTI-REPO (no umbrella): Increments belong in EACH repo's .specweave/"
  ORG=$(jq -r '.repository.organization // empty' .specweave/config.json 2>/dev/null)
  [ -z "$ORG" ] && ORG=$(ls -d repositories/*/ 2>/dev/null | head -1 | xargs basename 2>/dev/null)
  echo "Organization: $ORG"
  ls -d repositories/*/* 2>/dev/null | head -20
else
  echo "SINGLE-REPO: Use .specweave/increments/"
fi
```

**Umbrella mode (`umbrella.enabled: true`):**
- ALL increments go in the umbrella root `.specweave/increments/` — NOT in child repos
- The `**Project**:` field in each user story controls which repo receives sync (GitHub issues, JIRA tickets)
- Cross-cutting increments can span multiple child repos — each US targets a different project
- Repos MUST be at `repositories/{ORG}/{repo-name}/` — NEVER directly under `repositories/`

**Non-umbrella multi-repo (legacy):**
- Each repository has its OWN `.specweave/increments/` directory
- Run `specweave init` in each repo if `.specweave/` doesn't exist

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

1. **NEVER write spec.md/plan.md/tasks.md directly** — ALWAYS delegate via Agent() calls to custom subagents
2. **Project field is MANDATORY** — Every US MUST have `**Project**:` field
3. **Use Template Creator CLI** (REQUIRED): `specweave create-increment --id "XXXX-name" --title "Title" --description "Desc" --project "my-app"`
4. **Agent delegation is the ONLY way** to produce spec.md/plan.md/tasks.md — spawn `sw:sw-pm`, `sw:sw-architect`, `sw:sw-planner` subagents via Agent() calls
5. **Increment naming** — Format: `####-descriptive-kebab-case`
6. **Umbrella mode** — When `umbrella.enabled: true`, ALL increments go in the umbrella root `.specweave/increments/`. The `**Project**:` field per user story routes sync to child repos. Do NOT create increments in child repos.

## CRITICAL: Mandatory Subagent Delegation

**This skill MUST NOT write spec.md, plan.md, or tasks.md directly.**
Delegate to custom subagents via Agent() calls. Each subagent preloads its corresponding skill with full domain logic.

**You MUST spawn these subagents:**

| File | Subagent | Invocation |
|------|----------|------------|
| spec.md | sw:sw-pm | `Agent({ subagent_type: "sw:sw-pm", prompt: "Write spec for increment XXXX-name: <description>. Increment path: <path>. [UMBRELLA: child repos list if enabled]", description: "PM writes spec.md" })` |
| plan.md | sw:sw-architect | `Agent({ subagent_type: "sw:sw-architect", prompt: "Design architecture for increment XXXX-name. Read spec.md at <path>/spec.md", description: "Architect writes plan.md" })` |
| tasks.md | sw:sw-planner | `Agent({ subagent_type: "sw:sw-planner", prompt: "Generate tasks for increment XXXX-name. Read spec.md at <path>/spec.md and plan.md at <path>/plan.md", description: "Planner writes tasks.md" })` |

**DO NOT:**
- Write user stories, architecture, or tasks inline
- Copy/paste spec content into Write() calls
- "Summarize" what an agent would produce
- Skip any of the 3 Agent() calls
- Use Skill() for these — subagents provide memory + resumability

## Step 3a: Deep Interview Mode (if enabled)

**IMPORTANT**: This step runs AFTER the increment folder is created (Step 3), so the
interview state file can reference the real increment ID.

**If deep interview is enabled, delegate to PM subagent:**

```typescript
Agent({ subagent_type: "sw:sw-pm", prompt: "Deep interview for increment XXXX-name: <user description>. Increment path: <path>", description: "PM deep interview" })
```

The PM agent will:
1. Assess complexity and determine question count (trivial: 0-3, small: 4-8, medium: 9-18, large: 19-40)
2. Interview the user across relevant categories
3. Write interview state to `.specweave/state/interview-{increment-id}.json`
4. Return interview summary for spec.md creation

**After PM agent returns**, read the interview state file to confirm all categories are covered
before proceeding to spec.md creation (especially when `enforcement: "strict"`).

## Step 4: Delegation (MANDATORY - Custom Subagent Based)

**After increment folder + metadata.json are created, you MUST spawn all 3 subagents sequentially.**

Each subagent preloads its corresponding skill (with full domain logic, phases, templates). The subagent provides: isolated context, persistent memory, resumability, auto-compaction.

### 4a. Spawn PM Subagent for spec.md (REQUIRED)

**Include umbrella context when `umbrella.enabled: true`:**
```typescript
// Umbrella mode — pass child repos so PM can assign **Project**: per user story
Agent({ subagent_type: "sw:sw-pm", prompt: "Write spec for increment XXXX-name: <description>. Increment path: .specweave/increments/XXXX-name/. UMBRELLA MODE: Child repos: [repo1, repo2, ...]. Design cross-cutting stories — assign **Project**: to each US based on which repo owns that work.", description: "PM writes spec.md" })

// Single-project mode — standard invocation
Agent({ subagent_type: "sw:sw-pm", prompt: "Write spec for increment XXXX-name: <description>. Increment path: .specweave/increments/XXXX-name/", description: "PM writes spec.md" })
```

### 4b. Spawn Architect Subagent for plan.md (REQUIRED)
```typescript
Agent({ subagent_type: "sw:sw-architect", prompt: "Design architecture for increment XXXX-name. Read spec.md at .specweave/increments/XXXX-name/spec.md. ADR directory: .specweave/docs/internal/architecture/adr/", description: "Architect writes plan.md" })
```

### 4c. Spawn Planner Subagent for tasks.md (REQUIRED)
```typescript
Agent({ subagent_type: "sw:sw-planner", prompt: "Generate tasks for increment XXXX-name. Read spec.md at .specweave/increments/XXXX-name/spec.md and plan.md at .specweave/increments/XXXX-name/plan.md", description: "Planner writes tasks.md" })
```

**Order matters**: PM first (spec.md) -> Architect second (plan.md) -> Planner last (tasks.md).
Each agent reads the output of the previous one.

## Step 5: Post-Creation Sync (MANDATORY)

After ALL delegation completes (PM + Architect + Planner), sync living docs AND external tools.
This MUST run — the template guard in `create-increment` skips sync because spec.md is empty at that point.
By now spec.md has real content, so this is the actual sync trigger.

```bash
specweave sync-living-docs {increment-id}
```

This command chains automatically to external tools (GitHub Issues, JIRA, ADO) via `syncToExternalTools()`.
No separate GitHub/JIRA/ADO sync call needed — it's all handled by `sync-living-docs`.

## Step 6: Execution Strategy Recommendation

After delegation completes, analyze the increment:

1. **Count tasks**: `grep -c '^\- \[ \]\|^### T-' tasks.md`
2. **Count domains** from spec.md user stories and plan.md architecture
3. **Classify**: Low (<=8 tasks, 1 domain) | Medium (9-15, 1-2 domains) | High (>15 OR 3+ domains)

**Show recommendation in output:**

```
EXECUTION STRATEGY
================================================
Tasks: [N] | Domains: [M] | Complexity: [Low/Medium/High]

  /sw:do <id>         - Step-by-step, full control
  /sw:auto <id>       - Autonomous sequential (unattended)
  /sw:team-lead       - Parallel multi-agent (best quality for multi-domain, higher token cost)
```

See CLAUDE.md Execution Strategy section for the full decision matrix.

## Markdown Preview Guidelines

When presenting **scope or structure decisions** that have 2+ meaningful options, use `AskUserQuestion` with the `markdown` preview field to show tree diagrams (folder structures) or tables (AC coverage). This helps the user visually compare what each approach delivers.

**When to use**: Choosing between increment scopes (MVP vs full), folder structures, or comparing AC coverage across approaches.

**When NOT to use**: Simple type classification (feature vs bug), single-option confirmations, or questions without structural implications.

### Example 1: Scope Decision with AC Coverage Table

```
AskUserQuestion({
  questions: [{
    question: "Which scope should this increment cover?",
    header: "Scope",
    multiSelect: false,
    options: [
      {
        label: "MVP (Recommended)",
        description: "Core auth flow only. Ship fast, iterate in next increment.",
        markdown: "Task        AC Coverage      Stories\n──────────  ───────────────  ───────\nDB Schema   AC-US1-01        US-001\nJWT Utils   AC-US1-02        US-001\nLogin API   AC-US1-01,03     US-001\nAuth MW     AC-US2-01        US-002\n\nTotal: 4 tasks | 2 stories | 4 ACs covered"
      },
      {
        label: "Full Feature",
        description: "Auth + password reset + OAuth. More complete but 3x the work.",
        markdown: "Task          AC Coverage        Stories\n────────────  ─────────────────  ───────\nDB Schema     AC-US1-01          US-001\nJWT Utils     AC-US1-02          US-001\nLogin API     AC-US1-01,03       US-001\nAuth MW       AC-US2-01          US-002\nPwd Reset     AC-US3-01,02       US-003\nOAuth Flow    AC-US4-01,02,03    US-004\nE2E Tests     AC-US1-01..US4-03  All\n\nTotal: 7 tasks | 4 stories | 10 ACs covered"
      }
    ]
  }]
})
```

### Example 2: Structure Decision with Tree Preview

```
AskUserQuestion({
  questions: [{
    question: "Which folder structure should we use for this feature?",
    header: "Structure",
    multiSelect: false,
    options: [
      {
        label: "By Domain (Recommended)",
        description: "Group files by business domain. Better for feature isolation.",
        markdown: "src/\n├── auth/\n│   ├── api/\n│   │   ├── login.ts\n│   │   └── register.ts\n│   ├── middleware.ts\n│   └── jwt-utils.ts\n├── billing/\n│   ├── api/\n│   └── stripe-client.ts\n└── shared/\n    └── db.ts"
      },
      {
        label: "By Layer",
        description: "Group by technical layer. Familiar MVC-style structure.",
        markdown: "src/\n├── api/\n│   ├── auth.ts\n│   └── billing.ts\n├── middleware/\n│   └── auth.ts\n├── services/\n│   ├── jwt-utils.ts\n│   └── stripe-client.ts\n└── db/\n    └── client.ts"
      }
    ]
  }]
})
```

## Output

```
Created increment 0003-user-authentication

   Tech stack: TypeScript, NextJS, PostgreSQL
   Location: .specweave/increments/0003-user-authentication/

   Files: spec.md, plan.md, tasks.md, metadata.json

   Next: /sw:do 0003 | /sw:auto 0003 | /sw:team-lead (see Execution Strategy)
```

## Error Handling

- `.specweave/` not found: "Run specweave init first"
- Vague description: Ask clarifying questions
- Subagent fails: Fall back to invoking `/sw:pm` or `/sw:architect` skills directly (skills still work standalone)

---

**This command is the main entry point for creating new work in SpecWeave.**
