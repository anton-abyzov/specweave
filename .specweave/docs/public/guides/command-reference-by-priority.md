# SpecWeave Command Reference - By Priority

**Last Updated**: 2025-11-18
**Version**: v0.22.0+

This guide organizes all SpecWeave commands by priority, from essential daily workflow to specialized features.

**What's New in v0.22.0**:
- ✅ **AC Metrics in Status Line**: Now shows `X/Y tasks | A/B ACs`
- ✅ **Natural Language Reopen**: `/specweave:reopen 0043 Bug found` (no --reason flag needed)
- ✅ **Completion Scanning**: `/specweave:scan-completeness` finds false completions

---

## P0: Critical/Core Workflow (Use Daily)

These are the essential commands you'll use every day. Master these first!

### Increment Planning & Execution

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave:increment` | Plan new increment (PM-led) | `/specweave:increment "User authentication"` |
| `/specweave:do` | Execute tasks (smart resume) | `/specweave:do` or `/specweave:do 0031` |
| `/specweave:done` | Close increment (PM validation) | `/specweave:done 0031` |
| `/specweave:progress` | Check current progress | `/specweave:progress` |
| `/specweave:status` | Show all increments status | `/specweave:status` |

### New! Reopen & Completion Validation (v0.22.0)

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave:reopen` | **NEW!** Reopen completed work | `/specweave:reopen 0043 Bug found in implementation` |
| `/specweave:scan-completeness` | **NEW!** Find false completions | `/specweave:scan-completeness --auto-fix` |

**Natural Language Syntax** (v0.22.0+):
```bash
# ✅ NEW: Natural language (no --reason flag needed)
/specweave:reopen 0043 Bug found in implementation

# ✅ Traditional syntax still works
/specweave:reopen 0031 --reason "Production bug found"

# ✅ Scan for false completions
/specweave:scan-completeness

# ✅ Auto-fix invalid increments
/specweave:scan-completeness --auto-fix
```

**Smart Detection**: Just say "GitHub sync not working" and the skill auto-suggests what to reopen!

**Completion Scanning**: Automatically finds increments that were marked "completed" with open ACs or pending tasks.

**Usage**:
```bash
# Reopen entire increment (natural language)
/specweave:reopen 0043 Bug found need to fix

# Reopen specific task
/specweave:reopen 0031 --task T-003 API broken

# Reopen user story
/specweave:reopen 0031 --user-story US-001 AC not met

# Find all false completions
/specweave:scan-completeness

# Auto-fix false completions
/specweave:scan-completeness --auto-fix
```

---

## P1: Common Workflow (Use Weekly)

Commands you'll use regularly but not every day.

### State Management

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave:pause` | Pause active increment | `/specweave:pause 0031 --reason "Blocked by API"` |
| `/specweave:resume` | Resume paused increment | `/specweave:resume 0031` |
| `/specweave:next` | Smart transition to next work | `/specweave:next` |
| `/specweave:backlog` | Move increment to backlog | `/specweave:backlog 0032 --reason "Deprioritized"` |

### Quality & Validation

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave:validate` | Validate increment structure | `/specweave:validate 0031` |
| `/specweave:qa` | Quality assessment with risk scoring | `/specweave:qa 0031` |
| `/specweave:check-tests` | Validate test coverage | `/specweave:check-tests 0031` |

### Documentation Sync

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave:sync-docs` | Sync all increments to living docs (default) | `/specweave:sync-docs` (syncs all) or `/specweave:sync-docs 0031` (specific) |
| `/specweave:sync-specs` | Sync specs only | `/specweave:sync-specs 0031` |
| `/specweave:sync-tasks` | Sync task completion | `/specweave:sync-tasks 0031` |

---

## P2: Advanced Features (Use Monthly)

Specialized commands for advanced workflows.

### Test-Driven Development

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave:tdd-cycle` | Full TDD red-green-refactor | `/specweave:tdd-cycle 0031` |
| `/specweave:tdd-red` | Write failing tests (red phase) | `/specweave:tdd-red 0031` |
| `/specweave:tdd-green` | Implement to pass tests | `/specweave:tdd-green 0031` |
| `/specweave:tdd-refactor` | Refactor with test safety | `/specweave:tdd-refactor 0031` |

### Multi-Project Management

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave:init-multiproject` | Initialize multi-project mode | `/specweave:init-multiproject` |
| `/specweave:switch-project` | Switch active project | `/specweave:switch-project backend` |

### Archiving & Cleanup

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave:archive-increments` | Archive completed increments | `/specweave:archive-increments` |
| `/specweave:archive-features` | Archive completed features | `/specweave:archive-features FS-031` |
| `/specweave:restore-feature` | Restore archived feature | `/specweave:restore-feature FS-031` |
| `/specweave:abandon` | Abandon increment | `/specweave:abandon 0031 --reason "Obsolete"` |

### Import & Migration

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave:import-docs` | Import brownfield docs | `/specweave:import-docs ./notion-export` |
| `/specweave:translate` | Translate content | `/specweave:translate ru` |

### Cost Tracking

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave:costs` | Show AI cost dashboard | `/specweave:costs 0031` |
| `/specweave:update-scope` | Log scope changes | `/specweave:update-scope 0031` |

---

## P3: Optional/Specialized (Use Rarely)

Edge cases and specialized integrations.

### GitHub Integration

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave-github:sync` | Sync increment ↔ GitHub issue (bidirectional) | `/specweave-github:sync 0031` |
| `/specweave-github:create-issue` | Create GitHub issue | `/specweave-github:create-issue 0031` |
| `/specweave-github:close-issue` | Close GitHub issue | `/specweave-github:close-issue 0031` |
| `/specweave-github:status` | Check sync status | `/specweave-github:status 0031` |
| `/specweave-github:cleanup-duplicates` | Clean duplicate issues | `/specweave-github:cleanup-duplicates FS-031` |

**Note**: Epic/Feature/User Story syncing happens automatically via living docs sync (triggered by `/specweave:done`). The `/sync` command is for increments only.

### JIRA Integration

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave-jira:sync` | Sync increment ↔ JIRA epic (bidirectional) | `/specweave-jira:sync 0031` |

**Note**: Epic/Feature/User Story syncing happens automatically via living docs sync (triggered by `/specweave:done`). The `/sync` command is for increments only.

### Azure DevOps Integration

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave-ado:sync` | Sync increment ↔ ADO work item (bidirectional) | `/specweave-ado:sync 0031` |
| `/specweave-ado:create-workitem` | Create ADO work item | `/specweave-ado:create-workitem 0031` |
| `/specweave-ado:close-workitem` | Close ADO work item | `/specweave-ado:close-workitem 0031` |
| `/specweave-ado:status` | Check ADO sync status | `/specweave-ado:status 0031` |

**Note**: Epic/Feature/User Story syncing happens automatically via living docs sync (triggered by `/specweave:done`). The `/sync` command is for increments only.

### Documentation Preview

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave-docs-preview:preview` | Launch docs preview server | `/specweave-docs-preview:preview` |
| `/specweave-docs-preview:build` | Build static docs site | `/specweave-docs-preview:build` |

### Infrastructure & SRE

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave-infrastructure:monitor-setup` | Setup monitoring | `/specweave-infrastructure:monitor-setup` |
| `/specweave-infrastructure:slo-implement` | Implement SLOs | `/specweave-infrastructure:slo-implement` |

### ML/AI Workflows

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave-ml:pipeline` | Design ML pipeline | `/specweave-ml:pipeline` |
| `/specweave-ml:evaluate` | Evaluate ML model | `/specweave-ml:evaluate` |
| `/specweave-ml:explain` | Model explainability | `/specweave-ml:explain` |
| `/specweave-ml:deploy` | Deploy ML model | `/specweave-ml:deploy` |

### Release Management

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave-release:init` | Initialize release strategy | `/specweave-release:init` |
| `/specweave-release:align` | Align versions across repos | `/specweave-release:align` |
| `/specweave-release:rc` | Manage release candidates | `/specweave-release:rc create` |
| `/specweave-release:platform` | Coordinate platform releases | `/specweave-release:platform create` |

### Internal/Debug

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave:revert-wip-limit` | Revert WIP limit adjustment | `/specweave:revert-wip-limit` |
| `/specweave` | Command reference/help | `/specweave` |

---

## Quick Start Guide - Essential 5 Commands

If you're new to SpecWeave, start with these 5 commands:

```bash
# 1. Plan new work
/specweave:increment "Add user authentication"

# 2. Execute tasks
/specweave:do

# 3. Check progress
/specweave:progress

# 4. Close when done
/specweave:done 0031

# 5. (NEW!) Reopen if issues found
/specweave:reopen 0031 --reason "Auth broken in prod"
```

---

## Daily Workflow Example

**Monday - Start New Feature**:
```bash
/specweave:increment "Implement payment processing"
# → Creates increment 0032, generates spec/plan/tasks
```

**Tuesday-Thursday - Execute Work**:
```bash
/specweave:do
# → Smart resume, continues last active increment
# Work on tasks, mark [x] as you complete them

/specweave:progress
# → Check: 15/20 tasks (75%)
```

**Friday - Complete or Pause**:
```bash
/specweave:done 0032
# → PM validates, syncs to living docs, closes increment

# OR if blocked:
/specweave:pause 0032 --reason "Waiting for API access"
```

**Next Week - Resume or Reopen**:
```bash
# Resume paused work
/specweave:resume 0032

# OR reopen if issues found
/specweave:reopen 0032 --reason "Payment gateway timeout"
```

---

## Command Priority Matrix

| Priority | Frequency | Learn First? | Examples |
|----------|-----------|--------------|----------|
| **P0** | Daily | ✅ YES | increment, do, done, progress, **reopen** |
| **P1** | Weekly | ✅ YES | pause, resume, validate, sync-docs |
| **P2** | Monthly | ⚠️ LATER | tdd-cycle, archive, translate |
| **P3** | Rarely | ❌ OPTIONAL | GitHub sync, JIRA sync, ML pipelines |

---

## New in v0.19.0: Smart Reopen

**Breaking News**: COMPLETED is no longer terminal! You can now reopen work when issues are discovered.

### Auto-Detection Feature

Just report the issue naturally:
```
"The GitHub sync isn't working"
```

The `smart-reopen-detector` skill will:
1. 🔍 Scan recent work (active + 7 days completed)
2. 🎯 Find related items (keyword matching + relevance scoring)
3. 💡 Suggest exact reopen command

### Three Reopen Levels

**Task-Level** (Surgical Fix):
```bash
/specweave:reopen 0031 --task T-003 --reason "GitHub API rate limit"
```

**User Story-Level** (Feature Fix):
```bash
/specweave:reopen 0031 --user-story US-001 --reason "AC not met"
```

**Increment-Level** (Systemic Fix):
```bash
/specweave:reopen 0031 --reason "Multiple issues in production"
```

### WIP Limits Respected

Reopening respects WIP limits:
```
⚠️  WIP LIMIT WARNING:
   Current: 2/2 features active
   Reopening will EXCEED limit!

Options:
1. Pause: /specweave:pause 0030
2. Force: /specweave:reopen 0031 --force --reason "Production critical"
```

---

## Tips & Best Practices

### Do's ✅
- Use `/specweave:increment` for ALL new work (even small fixes)
- Check `/specweave:progress` frequently
- Always provide `--reason` for pause/reopen/abandon
- Use `/specweave:validate` before closing
- Leverage smart reopen for production issues

### Don'ts ❌
- Don't skip `/specweave:done` (breaks living docs sync)
- Don't exceed WIP limits without good reason
- Don't reopen old increments (>7 days) without investigation
- Don't abuse `--force` flag
- Don't create new increments for simple fixes (use reopen!)

---

## Command Aliases (Deprecated)

**⚠️ IMPORTANT**: Do NOT use shortcuts! They conflict with Claude Code native commands.

❌ **Never use**:
- `/inc` → Use `/specweave:increment`
- `/do` → Use `/specweave:do`
- `/done` → Use `/specweave:done`

✅ **Always use full names**:
- `/specweave:increment`
- `/specweave:do`
- `/specweave:done`

---

## Integration Workflows

### GitHub Workflow
```bash
# 1. Plan
/specweave:increment "Feature X"

# 2. Auto-create GitHub issue (via hook)
# → Creates issue #123 automatically

# 3. Execute
/specweave:do

# 4. Tasks update GitHub (via hook)
# → Checkboxes update automatically

# 5. Close
/specweave:done 0031
# → Closes GitHub issue #123

# 6. (If needed) Reopen
/specweave:reopen 0031 --reason "Bug found"
# → Reopens GitHub issue #123
```

### JIRA Workflow
```bash
# 1. Plan
/specweave:increment "Feature X"

# 2. Sync to JIRA
/specweave-jira:sync 0031
# → Creates JIRA epic

# 3. Execute
/specweave:do

# 4. Close
/specweave:done 0031

# 5. Sync completion
/specweave-jira:sync 0031
# → Transitions JIRA: In Progress → Done
```

---

## Troubleshooting

**"Command not found"**:
- Ensure plugin installed: `/plugin list --installed`
- Restart Claude Code
- Check marketplace: `claude plugin marketplace list`

**"WIP limit exceeded"**:
- Check status: `/specweave:status`
- Pause another: `/specweave:pause 0030 --reason "..."`
- Or force: `--force` flag

**"Cannot reopen: status is active"**:
- Increment already active, no need to reopen
- Just continue work: `/specweave:do`

**"Smart reopen not suggesting anything"**:
- Check if work is >7 days old
- Try manual command with increment ID
- Verify skill is loaded: skill activates on keywords

---

## Related Documentation

- **Full Command List**: `plugins/specweave/commands/specweave.md`
- **Quick Start**: `.specweave/docs/public/guides/getting-started.md`
- **Workflow Guide**: `.specweave/docs/internal/delivery/guides/increment-lifecycle.md`
- **Reopen Architecture**: `.specweave/docs/internal/architecture/adr/0033-smart-reopen-functionality.md`

---

**Last Updated**: 2025-11-14
**Total Commands**: 62 across 10 plugins
**New in v0.19.0**: Smart Reopen Functionality ⭐
