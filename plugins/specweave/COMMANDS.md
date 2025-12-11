# SpecWeave Commands

All SpecWeave commands are namespaced for brownfield safety and follow a consistent naming pattern.

## ⚠️ CRITICAL: No Shortcuts Allowed

**IMPORTANT**: SpecWeave commands MUST be invoked with the `/sw:*` namespace prefix.

**Why?** Shortcuts like `/inc`, `/do`, `/pause`, `/resume` conflict with Claude Code's native commands and break functionality.

**Always use**: `/sw:increment`, `/sw:do`, `/sw:resume`, etc.

## Command Naming Convention

**All command files**: `{command-name}.md` (simplified in v0.34.0)
**YAML name field**: `{command-name}`
**Invocation**: `/sw:{command-name}` (namespace prefix required)

### Example:
- **File**: `increment.md`
- **YAML**:
  ```yaml
  ---
  name: increment
  description: Plan new Product Increment
  ---
  ```
- **Usage**: `/sw:increment` (ONLY form, no shortcuts)

## All Available Commands

### Core Lifecycle (7 commands)
1. `increment.md` - Create increment → `/sw:increment`
2. `do.md` - Execute tasks → `/sw:do`
3. `done.md` - Close increment → `/sw:done`
4. `next.md` - Smart transition → `/sw:next`
5. `progress.md` - Current progress → `/sw:progress`
6. `validate.md` - Validate quality → `/sw:validate`
7. `sync-docs.md` - Sync documentation → `/sw:sync-docs`

### Status & Reporting (4 commands)
8. `status.md` - All increments overview → `/sw:status`
9. `costs.md` - AI cost dashboard → `/sw:costs`
10. `update-scope.md` - Update completion report → `/sw:update-scope`
11. `qa.md` - Quality assessment → `/sw:qa`

### State Management (3 commands)
12. `pause.md` - Pause increment → `/sw:pause`
13. `resume.md` - Resume increment → `/sw:resume`
14. `abandon.md` - Abandon increment → `/sw:abandon`

### Testing & Quality (2 commands)
15. `check-tests.md` - Validate test coverage → `/sw:check-tests`
16. `sync-tasks.md` - Sync tasks with GitHub → `/sw:sync-tasks`

### TDD Workflow (4 commands)
17. `tdd-red.md` - Write failing tests → `/sw:tdd-red`
18. `tdd-green.md` - Make tests pass → `/sw:tdd-green`
19. `tdd-refactor.md` - Refactor code → `/sw:tdd-refactor`
20. `tdd-cycle.md` - Full TDD cycle → `/sw:tdd-cycle`

### Archiving & Cleanup (6 commands)
21. `archive.md` - Archive increments → `/sw:archive`
22. `restore.md` - Restore from archive → `/sw:restore`
23. `archive-features.md` - Archive features/epics → `/sw:archive-features`
24. `restore-feature.md` - Restore features/epics → `/sw:restore-feature`
25. `fix-duplicates.md` - Resolve duplicate increments → `/sw:fix-duplicates`
26. `backlog.md` - Move to backlog → `/sw:backlog`

### Utilities (2 commands)
27. `translate.md` - Batch translation → `/sw:translate`
28. `sw.md` - Master router → `/sw`

**Total**: 28 commands (6 new archiving/cleanup commands added in v0.18.3)

## Command Categories

- **ESSENTIAL**: increment, do, done, next, progress, validate, sync-docs
- **IMPORTANT**: status, qa, check-tests, update-scope, costs, translate
- **STATE MANAGEMENT**: pause, resume, abandon, backlog
- **ARCHIVING**: archive, restore, archive-features, restore-feature, fix-duplicates
- **OPTIONAL**: TDD workflow commands, sync-tasks

## Removed/Deprecated Commands

**Duplicates removed** (v0.7.0 refactoring):
- ❌ `inc.md` → Use `/sw:increment`
- ❌ `status.md` → Use `/sw:status`
- ❌ `pause.md` → Use `/sw:pause`
- ❌ `resume.md` → Use `/sw:resume`
- ❌ `abandon.md` → Use `/sw:abandon`

**Deprecated commands**:
- ❌ `validate-coverage.md` → Use `/sw:check-tests` (NEW format)
- ❌ `specweave-validate-coverage.md` → Use `/sw:check-tests`

**Redundant commands**:
- ❌ `list-increments.md` → Use `/sw:status` (same functionality)

## Brownfield Safety

All commands are namespaced to prevent collisions with existing project commands:
- ✅ **Namespace form**: `/sw:increment` (ONLY way, always safe)
- ❌ **No shortcuts**: Do NOT use `/inc`, `/do`, `/pause`, `/resume` etc.

## Command Usage Philosophy

**Correct usage** (namespace prefix required):
```bash
/sw:increment "feature"   # Create increment
/sw:do                    # Execute tasks
/sw:status                # Check progress
/sw:qa 0007               # Quality check
/sw:done 0007             # Close increment
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
