---
name: increment-planner
description: Plan and create SpecWeave increments with PM and Architect agent collaboration. Use when starting new features, hotfixes, bugs, or any development work that needs specification and task breakdown. Creates spec.md, plan.md, tasks.md with proper AC-IDs and living docs integration.
visibility: public
context: fork
model: opus
hooks:
  PreToolUse:
    - matcher: Write
      hooks:
        - type: command
          command: bash plugins/specweave/hooks/v2/guards/spec-template-enforcement-guard.sh
---

# Increment Planner Skill

**Self-contained increment planning for ANY user project after `specweave init`.**

## Progressive Disclosure

Load phases as needed to reduce context:

| Phase | When to Load | File |
|-------|--------------|------|
| Pre-flight | Starting planning | `phases/00-preflight.md` |
| Project Context | Resolving project/board | `phases/01-project-context.md` |
| Create Increment | Creating files | `phases/02-create-increment.md` |
| Reference | Examples, troubleshooting | `phases/03-reference.md` |

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

## Workflow Overview

```
STEP 0: Pre-flight (TDD mode, multi-project)
        → Load phases/00-preflight.md

STEP 1: Project Context (resolve project/board)
        → Load phases/01-project-context.md

STEP 2: Create Increment (via Template API)
        → Load phases/02-create-increment.md

STEP 3: Guide User (complete in main conversation)
```

## Critical Rules

### 1. Project Field is MANDATORY

Every US MUST have `**Project**:` field:
```markdown
### US-001: Feature Name
**Project**: my-app    # ← REQUIRED!
**As a** user...
```

Get project: `specweave context projects`

### 2. Use Template Creator API

**Direct Write is FORBIDDEN!** Use:
```bash
specweave create-increment --id "0021-name" --project "my-app"
```

### 3. NO Agent Spawning

Skills MUST NOT spawn Task() agents (causes crashes).
Guide user to complete in MAIN conversation.

### 4. Increment Naming

Format: `####-descriptive-kebab-case`
```
✅ 0001-user-authentication
❌ 0001 (no description)
❌ my-feature (no number)
```

## Token Budget

- **Quick reference** (this file): ~400 tokens
- **Each phase**: ~300-500 tokens
- **Total if all loaded**: ~2000 tokens

**Load phases on-demand, not all at once!**

## Delegation

- **Pre-flight checks**: `/sw:increment` command handles WIP, discipline
- **Spec completion**: PM skill (in main conversation)
- **Architecture**: Architect skill (in main conversation)
- **Task generation**: Test-aware planner (in main conversation)

## Usage

```typescript
// Direct invocation
Skill({ skill: "sw:increment-planner", args: "--description=\"Add auth\"" })

// Via command (recommended - handles pre-flight)
/sw:increment "Add user authentication"
```

> **NOTE**: Use `sw:` prefix! Plain `increment-planner` fails.
