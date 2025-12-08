---
increment: 0114-slash-command-script-delegation
project: specweave
status: completed
created: 2025-12-06
completed: 2025-12-06
---

# Slash Command Script Delegation

## Problem

Status commands (`/specweave:jobs`, `/specweave:progress`, `/specweave:status`) take 3+ minutes because they expand as prompts requiring LLM processing. These commands need NO LLM reasoning - they just read JSON and format output.

**Additional problem**: Solution must work across all contexts:
- Claude Code (hooks available)
- Other LLM IDEs (Cursor, Windsurf, Copilot)
- Claude API/SDK (no hooks)
- Non-LLM CLI usage (direct terminal)

## Solution: Multi-Layer Architecture

Three execution layers ensure universal compatibility:

| Layer | Context | Speed | How It Works |
|-------|---------|-------|--------------|
| **Hook** | Claude Code | <100ms | `UserPromptSubmit` intercepts, runs script, returns `{"decision":"block"}` |
| **Skill** | Any LLM | ~2s | SKILL.md instructs LLM to run script via Bash tool |
| **CLI** | Terminal | ~500ms | `specweave status` command (existing) |

All three layers use the **same scripts** in `plugins/specweave/scripts/` - single source of truth.

## User Stories

### US-001: Script Infrastructure
- [x] **AC-US1-01**: `plugins/specweave/scripts/` folder exists
- [x] **AC-US1-02**: Scripts receive command arguments via process.argv
- [x] **AC-US1-03**: Scripts have access to cwd (project path)

### US-002: Hook Script Delegation
- [x] **AC-US2-01**: `user-prompt-submit.sh` detects status commands
- [x] **AC-US2-02**: Hook executes scripts from `scripts/` folder
- [x] **AC-US2-03**: Hook returns `{"decision":"block","reason":"<output>"}`
- [x] **AC-US2-04**: Execution completes in <1 second

### US-003: Core Status Scripts
- [x] **AC-US3-01**: `scripts/jobs.js` - background job status
- [x] **AC-US3-02**: `scripts/progress.js` - increment progress
- [x] **AC-US3-03**: `scripts/status.js` - status overview

### US-004: Fallback Handling
- [x] **AC-US4-01**: If script not found, fall through to LLM processing
- [x] **AC-US4-02**: If script errors, show error and fall through

### US-005: Skill-Based Discoverability (NEW)
- [x] **AC-US5-01**: `skills/instant-status/SKILL.md` exists with execution instructions
- [x] **AC-US5-02**: Skill activates for `/specweave:status`, `/specweave:progress`, `/specweave:jobs`
- [x] **AC-US5-03**: Skill instructs ANY LLM to execute scripts via shell (portable)
- [x] **AC-US5-04**: Skill documents all three execution paths (hook, skill, CLI)

### US-006: Non-Claude Documentation (NEW)
- [x] **AC-US6-01**: Scripts have `--help` output explaining standalone usage
- [x] **AC-US6-02**: SKILL.md documents `specweave status` CLI alternative
- [x] **AC-US6-03**: README in scripts folder explains direct execution

## Performance Targets

| Command | Before | After (Hook) | After (Skill) | After (CLI) |
|---------|--------|--------------|---------------|-------------|
| `/specweave:jobs` | 3+ min | <100ms | ~2s | ~500ms |
| `/specweave:progress` | 2+ min | <100ms | ~2s | ~500ms |
| `/specweave:status` | 2+ min | <100ms | ~2s | ~500ms |

## Non-Claude Usage

### Direct Script Execution
```bash
node plugins/specweave/scripts/status.js
node plugins/specweave/scripts/progress.js
node plugins/specweave/scripts/jobs.js
```

### CLI Commands
```bash
specweave status           # Status overview
specweave jobs             # Background jobs
```

### Other LLMs (via Skill)
LLM reads skill → runs `node scripts/status.js` via Bash → shows output
