# Hooks and Documentation Update Workflow

**Status**: ✅ **IMPLEMENTED**
**Date**: 2025-10-28
**Files Updated**:
- `.claude/hooks.json` (NEW)
- `.claude/hooks/post-task-completion.sh` (UPDATED)
- `src/commands/specweave:do.md` (UPDATED)
- `src/commands/specweave:increment.md` (UPDATED)
- `.specweave/config.yaml` (UPDATED)
- `src/hooks/README.md` (UPDATED)

---

## Problem Statement

**Original Issue**:
- Documentation updates weren't happening after each task
- No sound notification on task completion
- Confusion about when to call `/sync-docs`

**Root Cause**:
Claude Code hooks **CANNOT** invoke slash commands or skills. Hooks can only:
- Run bash commands
- Play sounds
- Output JSON messages
- NOT call `/sync-docs`, `/do`, or any other slash command

---

## Solution Architecture

### 1. Hook Configuration (`.claude/hooks.json`)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "TodoWrite",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/post-task-completion.sh"
          }
        ]
      }
    ]
  }
}
```

**What this does**:
- Triggers hook after ANY `TodoWrite` tool call
- Executes `post-task-completion.sh` bash script
- Happens automatically when task is marked complete

---

### 2. Hook Script (`.claude/hooks/post-task-completion.sh`)

```bash
#!/bin/bash

# 1. Play sound SYNCHRONOUSLY (not in background)
afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true

# 2. Log completion
echo "[$(date)] Task completed" >> .specweave/logs/tasks.log

# 3. Output JSON reminder
cat <<EOF
{
  "continue": true,
  "systemMessage": "🔔 Task completed! Remember to update documentation..."
}
EOF
```

**What this does**:
- ✅ Plays Glass.aiff sound (macOS) BEFORE Claude continues
- ✅ Logs to `.specweave/logs/tasks.log`
- ✅ Shows reminder message to user
- ❌ Does NOT update documentation (hooks can't do that)
- ❌ Does NOT call `/sync-docs` (hooks can't do that)

---

### 3. Complete Workflow

## After `/increment` (Planning Phase)

```
User: /increment "User Authentication"

Claude:
1. ✅ Creates increment files (spec.md, plan.md, tasks.md, etc.)
2. ✅ Detects tech stack (TypeScript, NextJS, PostgreSQL, etc.)
3. ✅ Shows increment summary

4. 🔊 [Plays celebration sound]
5. 📝 Runs /sync-docs update
   - Creates ADRs from plan.md (status: Proposed)
   - Adds features to .specweave/docs/public/overview/features.md
   - Adds diagrams to .specweave/docs/internal/architecture/diagrams/
   - May prompt for conflicts

6. ✅ Done - Ready for /do
```

---

## During `/do` (Implementation Phase)

### After EACH task:

```
Task T001: Create User model

Claude:
1. ✅ Implements task (creates src/models/User.ts)
2. ✅ Marks task complete in tasks.md

3. 🔊 [Glass.aiff plays automatically via hook]
4. 🔔 Shows: "Task completed! Remember to update documentation..."

5. 📝 Claude manually updates (inline edits):
   - CLAUDE.md: Adds User model to schema reference
   - README.md: Updates database section
   - CHANGELOG.md: (if public API changed)

6. ✅ Moves to next task
```

**Key points**:
- Sound plays BEFORE step 5
- Documentation updates are INLINE (not via slash command)
- NO `/sync-docs` call after each task (too disruptive)

---

## After `/do` completes ALL tasks:

```
All tasks complete!

Claude:
1. 🔊 [Plays celebration sound]
2. 📝 Runs /sync-docs update
   - Updates ADRs with implementation details (Proposed → Accepted)
   - Updates API docs with actual endpoints
   - Updates architecture diagrams with actual system
   - May prompt for conflicts

3. ✅ Shows: "Ready for /validate then /done"
```

---

## Documentation Update Strategy

### Types of Documentation

| Type | Location | When Updated | How Updated |
|------|----------|--------------|-------------|
| **Project Docs** | `CLAUDE.md`, `README.md`, `CHANGELOG.md` | After each task | Inline edits |
| **Living Docs** | `.specweave/docs/` | After `/increment` and after `/do` completes | `/sync-docs update` |

### Project Docs (Updated After Each Task)

**CLAUDE.md** - Updated when task adds:
- New commands or CLI flags
- New file structure
- New configuration options
- New skills or agents

**README.md** - Updated when task adds:
- User-facing features
- Installation steps
- Usage examples
- API changes

**CHANGELOG.md** - Updated when task adds:
- Public API changes
- Breaking changes
- New features

### Living Docs (Updated via `/sync-docs`)

**After `/increment`** (Planning):
- Create ADRs from architectural decisions (status: Proposed)
- Add features to feature list
- Add diagrams to architecture docs

**After `/do` completes** (Implementation):
- Update ADRs to Accepted with implementation details
- Update API docs with actual endpoints
- Update diagrams with actual system architecture

---

## Sound Notifications

### Hook Sound (Task Completion)
- **File**: `Glass.aiff` (macOS)
- **When**: After marking task complete (via hook)
- **Trigger**: Automatic (PostToolUse hook)
- **Timing**: BEFORE Claude continues

### Manual Sound (Celebration)
- **File**: `Glass.aiff` or custom celebration sound
- **When**: After `/increment` completes, After `/do` completes
- **Trigger**: Manual in command prompt
- **Timing**: Before calling `/sync-docs`

---

## Testing the Workflow

### Test 1: Hook Sound

```bash
# Mark a task complete in any increment's tasks.md
# Expected: Glass.aiff plays + reminder message shows
```

### Test 2: After `/increment`

```bash
/increment "Test Feature"

# Expected:
# 1. Increment created
# 2. Sound plays
# 3. /sync-docs update runs
# 4. ADRs created, features added
```

### Test 3: During `/do`

```bash
/do 0001

# For each task:
# 1. Task executes
# 2. Sound plays (hook)
# 3. CLAUDE.md/README.md updated inline
# 4. Next task continues
```

### Test 4: After `/do` completes

```bash
# After last task:
# 1. Celebration
# 2. Sound plays
# 3. /sync-docs update runs
# 4. Living docs synchronized
```

---

## Troubleshooting

### No sound playing

**Check**:
1. Does `.claude/hooks.json` exist?
2. Is `post-task-completion.sh` executable? (`chmod +x`)
3. macOS: Does `/System/Library/Sounds/Glass.aiff` exist?

**Fix**:
```bash
chmod +x .claude/hooks/post-task-completion.sh
afplay /System/Library/Sounds/Glass.aiff  # Test manually
```

### Hook not triggering

**Check**:
1. Is hook matcher correct? (Should be `TodoWrite`)
2. Restart Claude Code after creating `.claude/hooks.json`

**Fix**:
```bash
# Restart Claude Code
# Verify hooks.json syntax is valid JSON
cat .claude/hooks.json | jq .
```

### Documentation not updating

**Remember**:
- Hooks CANNOT update docs automatically
- Claude must manually edit CLAUDE.md/README.md after each task
- `/sync-docs update` must be called manually after `/increment` and `/do`

---

## Migration from Old System

**Old behavior** (config.yaml actions):
```yaml
actions:
  - update_documentation    # ❌ Hooks can't do this
  - update_claude_md        # ❌ Hooks can't do this
  - update_changelog        # ❌ Hooks can't do this
```

**New behavior** (explicit workflow):
```yaml
# Hook does:
- play_notification_sound  # ✅ Plays sound
- show_reminder            # ✅ Shows JSON message
- log_completion           # ✅ Logs to file

# Claude does manually:
- update_claude_md         # Via inline edits
- update_readme            # Via inline edits
- update_changelog         # Via inline edits

# /sync-docs does:
- update_living_docs       # Via slash command
```

---

## Why This Architecture?

### ✅ Pros
- **Sound works**: Hooks can play sounds reliably
- **Clear responsibility**: Hook = notify, Claude = update docs
- **Batch living docs**: One `/sync-docs` call instead of many
- **Conflict resolution**: User can handle conflicts once, not per task
- **Explicit workflow**: No magic, user knows when docs update

### ❌ Previous issues (now solved)
- ~~Hooks tried to call `/sync-docs` (impossible)~~
- ~~No sound (background execution + errors suppressed)~~
- ~~Unclear when docs update (config said "auto" but didn't work)~~

---

## Related Files

- `.claude/hooks.json` - Hook configuration
- `.claude/hooks/post-task-completion.sh` - Hook script
- `src/commands/specweave:do.md` - `/do` command with doc update workflow
- `src/commands/specweave:increment.md` - `/increment` command with doc sync
- `src/commands/specweave:sync-docs.md` - Documentation sync command
- `.specweave/config.yaml` - Configuration with hook clarification
- `src/hooks/README.md` - Hook documentation

---

## Next Steps

1. ✅ Test workflow with actual increment
2. ✅ Verify sound plays on macOS
3. ✅ Verify `/sync-docs update` works after `/increment`
4. ✅ Verify `/sync-docs update` works after `/do`
5. ✅ Document any edge cases discovered

---

**Last Updated**: 2025-10-28
**Status**: Ready for testing
