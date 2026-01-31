# Plan - 0180-reflect-macos-skill-memories

## Overview

Fix two critical bugs and add skill-specific memory support.

## Architecture

### Bug 1: Cross-Platform Timeout

**File**: `plugins/specweave/hooks/stop-reflect.sh`

**Change**:
```bash
# Before (line 91):
timeout 60 specweave reflect-stop "$transcript" --silent

# After:
run_with_timeout 60 specweave reflect-stop "$transcript" --silent

# Add function:
run_with_timeout() {
    local timeout_sec="$1"
    shift
    if command -v gtimeout >/dev/null 2>&1; then
        gtimeout "$timeout_sec" "$@"
    elif command -v timeout >/dev/null 2>&1; then
        timeout "$timeout_sec" "$@"
    else
        perl -e 'alarm shift; exec @ARGV' "$timeout_sec" "$@"
    fi
}
```

### Bug 2: Auto Mode Session (Already Works)

The `auto.ts` DOES create `auto-mode.json` (lines 469-496). The issue is:
- Skill provides instructions but Claude doesn't always run `specweave auto`
- No code change needed - this is a skill usage pattern issue
- Tests will verify the existing code works correctly

### Enhancement: Skill-Specific Memory Files

**File**: `src/core/reflection/reflect-handler.ts`

**Changes**:
1. Add `writeSkillMemory()` function
2. Modify `handleReflectStop()` to also write to skill-specific files
3. Add duplicate detection across CLAUDE.md and skill memory files

**Location**: `.specweave/skill-memories/{skill-name}.md`

**Format**:
```markdown
# {Skill Name} Memory

<!-- Project-specific learnings -->

## Learnings

- **2026-01-31**: Learning content
```

### SKILL.md Updates

Add to ALL skill files in `plugins/specweave/skills/*/SKILL.md`:

```markdown
## Project Learnings

Check `.specweave/skill-memories/{skill-name}.md` for project-specific learnings before proceeding.
```

## Dependencies

- None - all changes are internal

## Risks

1. **Perl not available**: Extremely rare - perl is on all macOS/Linux
2. **SKILL.md changes**: Many files to update - use batch script

## Test Strategy

1. Unit tests for `run_with_timeout()` function
2. Integration tests for reflect hook on mock macOS environment
3. Integration tests for auto-mode.json creation
4. Integration tests for skill memory file creation
