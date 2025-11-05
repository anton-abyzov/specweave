# SpecWeave Commands

All SpecWeave commands are namespaced for brownfield safety and follow a consistent naming pattern.

## ⚠️ CRITICAL: No Shortcuts Allowed

**IMPORTANT**: SpecWeave commands MUST be invoked with the `/specweave:*` namespace prefix.

**Why?** Shortcuts like `/inc`, `/do`, `/pause`, `/resume` conflict with Claude Code's native commands and break functionality.

**Always use**: `/specweave:increment`, `/specweave:do`, `/specweave:resume`, etc.

## Command Naming Convention

**All command files**: `specweave-{command-name}.md`
**YAML name field**: `{command-name}` (without `specweave-` prefix)
**Invocation**: `/specweave:{command-name}` (namespace prefix required)

### Example:
- **File**: `specweave-increment.md`
- **YAML**:
  ```yaml
  ---
  name: increment
  description: Plan new Product Increment
  ---
  ```
- **Usage**: `/specweave:increment` (ONLY form, no shortcuts)

## All Available Commands

### Core Lifecycle (7 commands)
1. `specweave-increment.md` - Create increment → `/specweave:increment`
2. `specweave-do.md` - Execute tasks → `/specweave:do`
3. `specweave-done.md` - Close increment → `/specweave:done`
4. `specweave-next.md` - Smart transition → `/specweave:next`
5. `specweave-progress.md` - Current progress → `/specweave:progress`
6. `specweave-validate.md` - Validate quality → `/specweave:validate`
7. `specweave-sync-docs.md` - Sync documentation → `/specweave:sync-docs`

### Status & Reporting (4 commands)
8. `specweave-status.md` - All increments overview → `/specweave:status`
9. `specweave-costs.md` - AI cost dashboard → `/specweave:costs`
10. `specweave-update-scope.md` - Update completion report → `/specweave:update-scope`
11. `specweave-qa.md` - Quality assessment → `/specweave:qa`

### State Management (3 commands)
12. `specweave-pause.md` - Pause increment → `/specweave:pause`
13. `specweave-resume.md` - Resume increment → `/specweave:resume`
14. `specweave-abandon.md` - Abandon increment → `/specweave:abandon`

### Testing & Quality (2 commands)
15. `specweave-check-tests.md` - Validate test coverage → `/specweave:check-tests`
16. `specweave-sync-tasks.md` - Sync tasks with GitHub → `/specweave:sync-tasks`

### TDD Workflow (4 commands)
17. `specweave-tdd-red.md` - Write failing tests → `/specweave:tdd-red`
18. `specweave-tdd-green.md` - Make tests pass → `/specweave:tdd-green`
19. `specweave-tdd-refactor.md` - Refactor code → `/specweave:tdd-refactor`
20. `specweave-tdd-cycle.md` - Full TDD cycle → `/specweave:tdd-cycle`

### Utilities (2 commands)
21. `specweave-translate.md` - Batch translation → `/specweave:translate`
22. `specweave.md` - Master router → `/specweave`

**Total**: 22 commands (down from 31, removed 8 duplicates/deprecated, removed 1 redundant)

## Command Categories

- **ESSENTIAL**: increment, do, done, next, progress, validate, sync-docs
- **IMPORTANT**: status, qa, check-tests, update-scope, costs, translate
- **STATE MANAGEMENT**: pause, resume, abandon
- **OPTIONAL**: TDD workflow commands, sync-tasks

## Removed/Deprecated Commands

**Duplicates removed** (v0.7.0 refactoring):
- ❌ `inc.md` → Use `/specweave:increment`
- ❌ `status.md` → Use `/specweave:status`
- ❌ `pause.md` → Use `/specweave:pause`
- ❌ `resume.md` → Use `/specweave:resume`
- ❌ `abandon.md` → Use `/specweave:abandon`

**Deprecated commands**:
- ❌ `validate-coverage.md` → Use `/specweave:check-tests` (NEW format)
- ❌ `specweave-validate-coverage.md` → Use `/specweave:check-tests`

**Redundant commands**:
- ❌ `list-increments.md` → Use `/specweave:status` (same functionality)

## Brownfield Safety

All commands are namespaced to prevent collisions with existing project commands:
- ✅ **Namespace form**: `/specweave:increment` (ONLY way, always safe)
- ❌ **No shortcuts**: Do NOT use `/inc`, `/do`, `/pause`, `/resume` etc.

## Command Usage Philosophy

**Correct usage** (namespace prefix required):
```bash
/specweave:increment "feature"   # Create increment
/specweave:do                    # Execute tasks
/specweave:status                # Check progress
/specweave:qa 0007               # Quality check
/specweave:done 0007             # Close increment
```

**Incorrect usage** (DO NOT USE):
```bash
/inc "feature"       # ❌ Conflicts with Claude Code native commands
/do                  # ❌ Conflicts with Claude Code native commands
/status              # ❌ Conflicts with Claude Code native commands
/pause 0007          # ❌ Conflicts with Claude Code native commands
/resume 0007         # ❌ Conflicts with Claude Code native commands
```

## See Also

- **User Documentation**: https://spec-weave.com/docs/commands
- **CLAUDE.md**: Project contributor guide with complete command reference
- **Plugin Marketplace**: `.claude-plugin/marketplace.json`
