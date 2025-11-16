# SpecWeave - Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework
**Type**: Open Source NPM Package (TypeScript CLI)
**Repository**: https://github.com/anton-abyzov/specweave
**Website**: https://spec-weave.com

This CLAUDE.md is for **contributors to SpecWeave itself**, not users of SpecWeave.
Users receive a different CLAUDE.md via the template system.

---

## 🚨 CRITICAL: NEVER POLLUTE PROJECT ROOT!

**⛔ THIS IS THE #1 RULE - VIOLATING THIS WILL GET YOUR PR REJECTED ⛔**

**ALL AI-generated files MUST go into the CURRENT INCREMENT folder**, NOT in the project root!

### ❌ NEVER Create in Root (Pollutes Repository)

```
❌ WRONG - ROOT FILES (REJECTED!):
/PLUGIN-MIGRATION-COMPLETE.md          # NO! Goes to increment reports/
/SESSION-SUMMARY-2025-10-28.md         # NO! Goes to increment reports/
/ADR-006-DEEP-ANALYSIS.md              # NO! Goes to .specweave/docs/internal/architecture/adr/
/ANALYSIS-MULTI-TOOL-COMPARISON.md     # NO! Goes to increment reports/
/migration-helper.sh                   # NO! Goes to increment scripts/
/execution.log                         # NO! Goes to increment logs/

✅ CORRECT - INCREMENT FOLDERS:
.specweave/increments/0004-plugin-architecture/
├── spec.md                            # Spec files (core 3)
├── plan.md
├── tasks.md                           # Tasks with embedded tests
├── reports/                           # ✅ PUT REPORTS HERE!
│   ├── PLUGIN-MIGRATION-COMPLETE.md   # ✅ Completion reports
│   ├── SESSION-SUMMARY.md             # ✅ Session summaries
│   └── ANALYSIS-*.md                  # ✅ Analysis files
├── scripts/                           # ✅ PUT SCRIPTS HERE!
│   └── migration-helper.sh            # ✅ Helper scripts
└── logs/                              # ✅ PUT LOGS HERE!
    └── execution.log                  # ✅ Execution logs

.specweave/docs/internal/architecture/ # ✅ PUT ADRS/DIAGRAMS HERE!
└── adr/
    └── 0006-deep-analysis.md          # ✅ Architecture decisions
```

**Before committing, ALWAYS check**: `git status` - If you see `.md` files in root, MOVE THEM!

---

## Tool Support

SpecWeave supports multiple AI coding tools with varying automation levels:
- **Claude Code** (Recommended): Native support via plugins, hooks, MCP
- **Cursor**: Partial support via AGENTS.md compilation
- **Other tools** (Copilot, ChatGPT, Gemini): Basic support via AGENTS.md

For adapter implementation details, see "Multi-Tool Support via Adapters" section below.

---

## Development Workflow

### Core SpecWeave Commands

**Note**: Detailed rules (naming, discipline, archiving) are in skills that auto-load when you use these commands.

**Primary Workflow**:
```bash
/specweave:increment "feature name"  # Plan new work (increment-planner skill)
/specweave:do                        # Execute tasks
/specweave:progress                  # Check status
/specweave:done                      # Close increment
```

**State Management**:
```bash
/specweave:pause 0002 --reason="..." # Pause increment
/specweave:resume 0002               # Resume paused
/specweave:abandon 0002              # Abandon incomplete
```

**Archiving** (MANUAL ONLY):
```bash
/specweave:archive 0031              # Archive specific
/specweave:archive --keep-last 10    # Archive old work
/specweave:restore 0031              # Restore from archive
```

**Quality**:
```bash
/specweave:validate 0001             # Rule-based validation
/specweave:qa 0001                   # AI quality assessment
```

**Documentation**:
```bash
/specweave:sync-docs update          # Sync living docs
/specweave:sync-tasks                # Sync task status
```

**For complete command reference**: See "Quick Reference" section below.

---

## Project Structure

### Source of Truth Principle

```
src/                    # TypeScript code ONLY (compiled to dist/)
plugins/                # ALL Claude Code components (skills, agents, commands, hooks)
├── specweave/          # Core plugin (auto-loaded)
└── specweave-*/        # Optional plugins (GitHub, JIRA, etc.)
.specweave/             # Framework data (increments, docs, logs)
```

**Key Rules**:
- ✅ `src/` = TypeScript code ONLY
- ✅ ALL skills/agents/commands/hooks = Inside `plugins/`
- ✅ Marketplace = GLOBAL via CLI (no per-project `.claude/`)
- ❌ NEVER mix `*.ts` and `SKILL.md` in same directory
- ❌ NEVER create new files in project root (use increment folders)

**For complete structure**: See `README.md`

---

## Plugin Architecture

### Core Plugin (Always Auto-Loaded)

**Plugin**: `specweave` - The essential SpecWeave plugin loaded in every project:
- **Skills**: 9 skills (increment-planner, tdd-workflow, spec-generator, etc.)
- **Agents**: 22 agents (PM, Architect, Tech Lead, + 19 specialized)
- **Commands**: 22 commands (/specweave:increment, /specweave:do, etc.)
- **Hooks**: 8 lifecycle hooks
- **Size**: ~12K tokens

### Available Plugins

All plugins are auto-installed during `specweave init`. Skills activate based on context keywords.

**Plugin List**: `ls plugins/` or `/plugin list --installed`

**Example plugins**:
- `specweave` - Core (increment lifecycle, living docs)
- `specweave-github` - GitHub Issues sync
- `specweave-{frontend|backend|infrastructure}` - Tech stacks
- `specweave-{ml|payments}` - Domain-specific

### Plugin Installation

`specweave init` automatically:
1. Registers marketplace: `claude plugin marketplace add anton-abyzov/specweave`
2. Installs all plugins via Claude CLI
3. Marketplace is GLOBAL (persists across projects)

After init, all plugins are ready. Skills auto-activate based on keywords.

### Local Development Setup (Contributors Only)

**🚨 CRITICAL for SpecWeave Contributors:**

When developing SpecWeave itself, you MUST use a **symlink** from the marketplace to your local repository. This ensures:
- ✅ All code/hook/skill changes are immediately reflected
- ✅ No need to reinstall plugins after every change
- ✅ Real-time testing of hooks, skills, and commands

**Setup Instructions:**

```bash
# 1. Remove any existing marketplace installation
rm -rf ~/.claude/plugins/marketplaces/specweave

# 2. Create symlink to your local SpecWeave repository
ln -s /path/to/your/specweave/repo ~/.claude/plugins/marketplaces/specweave

# Example:
ln -s ~/Projects/github/specweave ~/.claude/plugins/marketplaces/specweave

# 3. Register the local marketplace with Claude Code
cd /path/to/your/specweave/repo
claude plugin marketplace add ./.

# 4. Verify the marketplace is registered
claude plugin marketplace list
# Should show: specweave (Source: Directory /path/to/your/repo)

# 5. Update marketplace to discover all plugins
claude plugin marketplace update specweave

# 6. Verify hooks are accessible
test -f ~/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/user-prompt-submit.sh && \
  echo "✅ Hooks accessible" || echo "❌ Setup failed"
```

**If you see "Plugin not found" errors:**

This means the plugin registry is out of sync. Fix it:

```bash
# 1. Backup current registry
cp ~/.claude/plugins/installed_plugins.json ~/.claude/plugins/installed_plugins.json.backup

# 2. Clear registry (forces rediscovery)
echo '{"version": 1, "plugins": {}}' > ~/.claude/plugins/installed_plugins.json

# 3. Update marketplace
claude plugin marketplace update specweave

# 4. Restart Claude Code
# All 25 plugins will be rediscovered from your local repo
```

**Verification:**

```bash
# Check symlink target
readlink ~/.claude/plugins/marketplaces/specweave
# Should output: /path/to/your/specweave/repo

# Check all plugins are accessible
ls ~/.claude/plugins/marketplaces/specweave/plugins/
# Should list: specweave, specweave-github, specweave-jira, etc.
```

**Why This Matters:**

Without the symlink, Claude Code will try to execute hooks from a non-existent location:
```
❌ Plugin hook error: /bin/sh:
   ~/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/user-prompt-submit.sh:
   No such file or directory
```

**Troubleshooting:**

If you see "Plugin not found in marketplace 'specweave'" errors:
1. Check symlink exists: `ls -la ~/.claude/plugins/marketplaces/specweave`
2. Verify it points to your repo: `readlink ~/.claude/plugins/marketplaces/specweave`
3. Recreate symlink if needed (see setup instructions above)

**What NOT to Do:**

- ❌ Don't copy the repository - use a symlink
- ❌ Don't use relative paths in symlink - use absolute paths
- ❌ Don't register the marketplace via `claude plugin marketplace add` - symlink is enough for local dev

---

## Multi-Tool Support via Adapters

SpecWeave supports multiple AI coding tools through an adapter system. Tool selection happens during `specweave init`.

**Adapter Architecture**:
- **Location**: `src/adapters/` (interface, loader, tool-specific implementations)
- **Selection**: Auto-detected or via `--adapter` flag
- **Files**: Tool-specific files (`.cursorrules`, `AGENTS.md`, etc.)

**Supported Tools**:

| Tool | Automation Level | Implementation | Status |
|------|------------------|----------------|--------|
| **Claude Code** | Full | Native plugins (no adapter) | ✅ Recommended |
| **Cursor** | Partial | AGENTS.md compilation | ✅ Supported |
| **Generic** | Basic | AGENTS.md static file | ✅ Supported |

**Key Differences**:
- **Claude Code**: No adapter needed - uses native plugin system
- **Cursor/Generic**: Require compilation step to generate AGENTS.md
- **All tools**: Share same `.specweave/` data structure

**For contributors**: Adapter code is in `src/adapters/`. Tests in `tests/unit/adapter-loader.test.ts`.

---

## Development Principles

See [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md#core-development-principles) for:
- Source of Truth Discipline
- Documentation = Code
- Testing Requirements
- Incremental Development
- Multi-Tool Support

---

## Recent Architectural Enhancements (v0.18.3+)

### Project-Specific Tasks in User Stories

**New in v0.18.3**: User stories now include project-specific checkable task lists instead of just links to increment tasks.

**Key Changes**:
1. **TaskProjectSpecificGenerator** (`src/core/living-docs/task-project-specific-generator.ts`):
   - Filters increment tasks by User Story ID (via AC-IDs)
   - Optional project keyword filtering (backend vs frontend)
   - Preserves completion status from increment tasks.md

2. **User Story File Format** - New `## Tasks` section:
```markdown
## Tasks

- [ ] **T-001**: Setup API endpoint
- [x] **T-003**: Add DB migration (completed)

> **Note**: Tasks are project-specific. See increment tasks.md for full list
```

3. **GitHub Sync** - Issues now have checkable task lists:
   - Stakeholders can tick/untick tasks in GitHub
   - Task completion syncs from user story files
   - Backward compatible (falls back to legacy extraction)

**Benefits**:
- **Project Isolation**: Backend tasks ≠ Frontend tasks
- **Traceability**: Each user story explicitly lists its tasks
- **GitHub UX**: Checkable task lists in issues
- **Completion Tracking**: Status preserved from increment

**Data Flow**:
```
Increment tasks.md (All tasks, source of truth)
    ↓
TaskProjectSpecificGenerator (Filters by US + Project)
    ↓
User Story ## Tasks Section (Project-specific checkboxes)
    ↓
GitHub Issue (Checkable task list for stakeholders)
```

**See Also**:
- Implementation: `.specweave/increments/0034-github-ac-checkboxes-fix/reports/PROJECT-SPECIFIC-TASKS-IMPLEMENTATION-COMPLETE.md`
- Architecture: `.specweave/increments/0034-github-ac-checkboxes-fix/reports/ULTRATHINK-PROJECT-SPECIFIC-TASKS-ARCHITECTURE.md`

---

## Build & Test

```bash
# Build
npm run build

# Test
npm test                    # Unit tests
npm run test:e2e            # E2E tests (Playwright)
npm run test:integration    # Integration tests
```

**Coverage Requirements**:
- Critical paths: 90%+
- Overall: 80%+

---

## Common Tasks

### Adding Skills, Agents, or Commands

**All components go into plugins**:
- **Core components**: `plugins/specweave/{skills|agents|commands|hooks}/`
- **Plugin components**: `plugins/specweave-{name}/{skills|agents|commands}/`
- **Tests**: `tests/integration/{component-name}/` or `tests/unit/`

**See**: `.github/CONTRIBUTING.md` for complete instructions

### Updating Documentation

```bash
# Internal docs (architecture, ADRs)
vim .specweave/docs/internal/architecture/hld-system.md

# Public docs (user-facing guides)
vim .specweave/docs/public/guides/user-guide.md

# Build docs site
cd docs-site && npm run build
```

---

## Troubleshooting

**Skills not activating?**
1. Check plugin installed: `/plugin list --installed`
2. Verify YAML frontmatter in skill SKILL.md
3. Restart Claude Code
4. Check description has trigger keywords

**Commands not working?**
1. Check plugin installed: `/plugin list --installed`
2. Verify command exists in plugin
3. Restart Claude Code

**Tests failing?**
1. Run `npm run build` first
2. Check test output
3. Verify test data in `tests/fixtures/`

**Root folder polluted?**
1. Move files to `.specweave/increments/####/reports/`
2. Update `.gitignore` if needed

**Plugin hooks not working? (Development)**
See `.claude/CONTRIBUTING.md` for plugin marketplace setup.

---

## Getting Help

**Documentation**:
- User docs: https://spec-weave.com
- Contributor docs: `.specweave/docs/internal/`
- Architecture: `.specweave/docs/internal/architecture/`

**Community**:
- GitHub Issues: https://github.com/anton-abyzov/specweave/issues
- Discussions: https://github.com/anton-abyzov/specweave/discussions

**Current Increment**:
```bash
/specweave:status  # Show all increments
```

---

## Quick Reference

**Commands** (all use `/specweave:*` namespace):

*Primary*:
- `/specweave:increment "feature"` - Plan new increment
- `/specweave:do` - Execute tasks
- `/specweave:done 0002` - Close increment
- `/specweave:validate 0002` - Validate increment
- `/specweave:qa 0002` - Quality assessment
- `/specweave:status` - Show status
- `/specweave:progress` - Check progress

*State management*:
- `/specweave:pause 0002 --reason="..."` - Pause
- `/specweave:resume 0002` - Resume
- `/specweave:abandon 0002 --reason="..."` - Abandon

*Archiving (MANUAL ONLY)*:
- `/specweave:archive 0031` - Archive specific
- `/specweave:archive --keep-last 10` - Archive old
- `/specweave:restore 0031` - Restore
- `/specweave:fix-duplicates` - Resolve duplicates

*Documentation*:
- `/specweave:sync-docs update` - Sync living docs
- `/specweave:sync-tasks` - Sync task status

*Other*:
- `/specweave:costs` - AI cost dashboard
- `/specweave:translate` - Translate content
- `/specweave:update-scope` - Log scope changes
- `/specweave:next` - Smart transition

**Build & Test**:
- `npm run build` - Compile TypeScript
- `npm test` - Unit tests
- `npm run test:e2e` - E2E tests
- `npm run test:integration` - Integration tests

**File Structure**:
- Source: `src/` (TypeScript) and `plugins/` (skills/agents/commands)
- Marketplace: GLOBAL (via CLI)
- Increments: `.specweave/increments/`
- Docs: `.specweave/docs/internal/` and `.specweave/docs/public/`
- Tests: `tests/` (unit, integration, E2E)

---

**Remember**:
1. Edit source files in `src/` and `plugins/`, not `.claude/`
2. Keep root folder clean (use increment folders)
3. Test before committing (E2E + unit + integration)
4. Skills/agents/commands auto-activate when needed
5. All detailed rules are in skills (progressive disclosure)

**SpecWeave Documentation**: https://spec-weave.com
**Last Updated**: 2025-11-15
