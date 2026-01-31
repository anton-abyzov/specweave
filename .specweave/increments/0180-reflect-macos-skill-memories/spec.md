---
increment: 0180-reflect-macos-skill-memories
title: "Reflect macOS Bug + Skill Memory Integration"
status: completed
type: bug
tdd: true
---

# Reflect macOS Bug + Skill Memory Integration

## Problem Statement

Two critical bugs prevent SpecWeave's learning system from working:

1. **Reflect Hook Fails on macOS**: The `stop-reflect.sh` hook uses `timeout` command which doesn't exist on macOS (exit code 127). All reflections fail silently.

2. **Auto Mode Never Activates**: The `auto-mode.json` session marker is never created because Claude doesn't always execute `specweave auto` when `/sw:auto` skill is invoked. Stop hook silently approves all exits.

Additionally, skill-specific learnings aren't visible when skills load because:
- Learnings go to CLAUDE.md only
- When a skill loads mid-session, it doesn't see relevant learnings

## Root Cause Analysis

### Bug 1: Reflect - Exit Code 127

**Evidence** (from `.specweave/logs/reflect/reflect.log`):
```
[2026-01-31T07:57:35Z] [warn] Reflection completed with exit code 127
```

**Root Cause** (`stop-reflect.sh:91`):
```bash
timeout 60 specweave reflect-stop "$transcript" --silent
```

macOS doesn't have GNU `timeout`. Needs `gtimeout` (coreutils) or perl fallback.

### Bug 2: Auto Mode - No Session File

**Evidence** (from `.specweave/logs/stop-auto.log`):
```
[2026-01-31T07:57:35Z] APPROVE: Auto mode not activated (no session file)
```
100% of log entries show this - `auto-mode.json` is NEVER created.

**Root Cause**: The `auto.md` skill provides instructions but doesn't force execution of `specweave auto` command.

## User Stories

### US-001: Cross-Platform Timeout for Reflect Hook
**Project**: specweave
**As a** macOS user,
**I want** the reflect hook to work without installing additional tools,
**So that** my learnings are captured automatically.

#### Acceptance Criteria
- [x] AC-US1-01: Hook uses gtimeout if available (coreutils installed)
- [x] AC-US1-02: Hook falls back to timeout if gtimeout not found
- [x] AC-US1-03: Hook falls back to perl timeout if neither available
- [x] AC-US1-04: Hook works on Linux (timeout available)
- [x] AC-US1-05: Hook works on macOS without coreutils
- [x] AC-US1-06: Integration test verifies cross-platform timeout

### US-002: Auto Mode Session Marker Creation
**Project**: specweave
**As a** user running `/sw:auto`,
**I want** the auto-mode.json session marker to be created reliably,
**So that** the stop hook blocks exit until work is complete.

#### Acceptance Criteria
- [x] AC-US2-01: `specweave auto` command creates auto-mode.json
- [x] AC-US2-02: Hook detects active auto session and blocks exit
- [x] AC-US2-03: Session marker includes incrementIds, tddMode, successCriteria
- [x] AC-US2-04: Stale sessions (>30min) are cleaned up
- [x] AC-US2-05: Integration test verifies session marker creation

### US-003: Skill-Specific Memory Files
**Project**: specweave
**As a** user with skill-specific learnings,
**I want** learnings to be written to skill-specific memory files,
**So that** when a skill loads, I see relevant learnings.

#### Acceptance Criteria
- [x] AC-US3-01: Reflect handler writes to `.specweave/skill-memories/{skill}.md`
- [x] AC-US3-02: Each SKILL.md includes instruction to read skill memories
- [x] AC-US3-03: Memory file format matches MEMORY.md pattern
- [x] AC-US3-04: Duplicate detection works across CLAUDE.md and skill memories
- [x] AC-US3-05: Integration test verifies skill memory file creation

## Technical Notes

### Cross-Platform Timeout Pattern
```bash
run_with_timeout() {
    local timeout_sec="$1"
    shift

    if command -v gtimeout >/dev/null 2>&1; then
        gtimeout "$timeout_sec" "$@"
    elif command -v timeout >/dev/null 2>&1; then
        timeout "$timeout_sec" "$@"
    else
        # Perl fallback (available on all macOS/Linux)
        perl -e 'alarm shift; exec @ARGV' "$timeout_sec" "$@"
    fi
}
```

### Skill Memory File Format
```markdown
# {Skill Name} Memory

<!-- Project-specific learnings for this skill -->

## Learnings

- **2026-01-31**: Learning content here
```

### SKILL.md Instruction Template
```markdown
## Project Learnings

Before using this skill, check for project-specific learnings:
- Read `.specweave/skill-memories/{skill-name}.md` if it exists
```
