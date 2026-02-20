# SpecWeave Command Reference - By Priority

**Last Updated**: 2025-11-14
**Version**: v0.19.0

This guide organizes all SpecWeave commands by priority, from essential daily workflow to specialized features.

---

## P0: Critical/Core Workflow (Use Daily)

These are the essential commands you'll use every day. Master these first!

### Increment Planning & Execution

| Command | Description | Example |
|---------|-------------|---------|
| `/sw:increment` | Plan new increment (PM-led) | `/sw:increment "User authentication"` |
| `/sw:do` | Execute tasks (smart resume) | `/sw:do` or `/sw:do 0031` |
| `/sw:done` | Close increment (PM validation) | `/sw:done 0031` |
| `/sw:progress` | Check current progress | `/sw:progress` |
| `/sw:status` | Show all increments status | `/sw:status` |

### Reopen Functionality

| Command | Description | Example |
|---------|-------------|---------|
| `/sw:reopen` | **NEW!** Reopen completed work | `/sw:reopen 0031 --reason "GitHub sync failing"` |

**Smart Detection**: Just say "GitHub sync not working" and the skill auto-suggests what to reopen!

**Usage**:
```bash
# Reopen entire increment
/sw:reopen 0031 --reason "Production bug found"

# Reopen specific task
/sw:reopen 0031 --task T-003 --reason "API broken"

# Reopen user story
/sw:reopen 0031 --user-story US-001 --reason "AC not met"
```

---

## P1: Common Workflow (Use Weekly)

Commands you'll use regularly but not every day.

### State Management

| Command | Description | Example |
|---------|-------------|---------|
| `/sw:pause` | Pause active increment | `/sw:pause 0031 --reason "Blocked by API"` |
| `/sw:resume` | Resume paused increment | `/sw:resume 0031` |
| `/sw:next` | Smart transition to next work | `/sw:next` |
| `/sw:backlog` | Move increment to backlog | `/sw:backlog 0032 --reason "Deprioritized"` |

### Quality & Validation

| Command | Description | Example |
|---------|-------------|---------|
| `/sw:validate` | Validate increment structure | `/sw:validate 0031` |
| `/sw:qa` | Quality assessment with risk scoring | `/sw:qa 0031` |
| `/sw:check-tests` | Validate test coverage | `/sw:check-tests 0031` |

### Documentation Sync

| Command | Description | Example |
|---------|-------------|---------|
| `/sw:sync-docs` | Sync to living docs | `/sw:sync-docs update` |
| `/sw:sync-specs` | Sync specs only | `/sw:sync-specs 0031` |
| `/sw:sync-tasks` | Sync task completion | `/sw:sync-tasks 0031` |

---

## P2: Advanced Features (Use Monthly)

Specialized commands for advanced workflows.

### Test-Driven Development

| Command | Description | Example |
|---------|-------------|---------|
| `/sw:tdd-cycle` | Full TDD red-green-refactor | `/sw:tdd-cycle 0031` |
| `/sw:tdd-red` | Write failing tests (red phase) | `/sw:tdd-red 0031` |
| `/sw:tdd-green` | Implement to pass tests | `/sw:tdd-green 0031` |
| `/sw:tdd-refactor` | Refactor with test safety | `/sw:tdd-refactor 0031` |

### Multi-Project Management

| Command | Description | Example |
|---------|-------------|---------|
| `/sw:init-multiproject` | Initialize multi-project mode | `/sw:init-multiproject` |
| `/sw:switch-project` | Switch active project | `/sw:switch-project backend` |

### Archiving & Cleanup

| Command | Description | Example |
|---------|-------------|---------|
| `/sw:archive-increments` | Archive completed increments | `/sw:archive-increments` |
| `/sw:archive-features` | Archive completed features | `/sw:archive-features FS-031` |
| `/sw:restore-feature` | Restore archived feature | `/sw:restore-feature FS-031` |
| `/sw:abandon` | Abandon increment | `/sw:abandon 0031 --reason "Obsolete"` |

### Import & Migration

| Command | Description | Example |
|---------|-------------|---------|
| `/sw:import-docs` | Import brownfield docs | `/sw:import-docs ./notion-export` |
| `/sw:translate` | Translate content | `/sw:translate ru` |

### Cost Tracking

| Command | Description | Example |
|---------|-------------|---------|
| `/sw:costs` | Show AI cost dashboard | `/sw:costs 0031` |
| `/sw:update-scope` | Log scope changes | `/sw:update-scope 0031` |

---

## P3: Optional/Specialized (Use Rarely)

Edge cases and specialized integrations.

### GitHub Integration

| Command | Description | Example |
|---------|-------------|---------|
| `/sw-github:sync` | Sync increment ↔ GitHub issue (bidirectional) | `/sw-github:sync 0031` |
| `/sw-github:create-issue` | Create GitHub issue | `/sw-github:create-issue 0031` |
| `/sw-github:close-issue` | Close GitHub issue | `/sw-github:close-issue 0031` |
| `/sw-github:status` | Check sync status | `/sw-github:status 0031` |
| `/sw-github:cleanup-duplicates` | Clean duplicate issues | `/sw-github:cleanup-duplicates FS-031` |

**Note**: Epic/Feature/User Story syncing happens automatically via living docs sync (triggered by `/sw:done`). The `/sync` command is for increments only.

### JIRA Integration

| Command | Description | Example |
|---------|-------------|---------|
| `/sw-jira:sync` | Sync increment ↔ JIRA epic (bidirectional) | `/sw-jira:sync 0031` |

**Note**: Epic/Feature/User Story syncing happens automatically via living docs sync (triggered by `/sw:done`). The `/sync` command is for increments only.

### Azure DevOps Integration

| Command | Description | Example |
|---------|-------------|---------|
| `/sw-ado:sync` | Sync increment ↔ ADO work item (bidirectional) | `/sw-ado:sync 0031` |
| `/sw-ado:create-workitem` | Create ADO work item | `/sw-ado:create-workitem 0031` |
| `/sw-ado:close-workitem` | Close ADO work item | `/sw-ado:close-workitem 0031` |
| `/sw-ado:status` | Check ADO sync status | `/sw-ado:status 0031` |

**Note**: Epic/Feature/User Story syncing happens automatically via living docs sync (triggered by `/sw:done`). The `/sync` command is for increments only.

### Documentation

| Command | Description | Example |
|---------|-------------|---------|
| `/sw-docs:view` | Launch docs server (internal or public) | `/sw-docs:view` or `/sw-docs:view --public` |
| `/sw-docs:build` | Build static docs site | `/sw-docs:build` |
| `/sw-docs:generate` | Generate documentation | `/sw-docs:generate` |
| `/sw-docs:organize` | Organize large doc folders | `/sw-docs:organize` |
| `/sw-docs:health` | Documentation health report | `/sw-docs:health` |
| `/sw-docs:validate` | Validate documentation | `/sw-docs:validate` |

### Infrastructure & SRE

| Command | Description | Example |
|---------|-------------|---------|
| `/sw-infra:monitor-setup` | Setup monitoring | `/sw-infra:monitor-setup` |
| `/sw-infra:slo-implement` | Implement SLOs | `/sw-infra:slo-implement` |

### ML/AI Workflows

| Command | Description | Example |
|---------|-------------|---------|
| `/sw-ml:pipeline` | Design ML pipeline | `/sw-ml:pipeline` |
| `/sw-ml:evaluate` | Evaluate ML model | `/sw-ml:evaluate` |
| `/sw-ml:explain` | Model explainability | `/sw-ml:explain` |
| `/sw-ml:deploy` | Deploy ML model | `/sw-ml:deploy` |

### Release Management

| Command | Description | Example |
|---------|-------------|---------|
| `/sw-release:init` | Initialize release strategy | `/sw-release:init` |
| `/sw-release:align` | Align versions across repos | `/sw-release:align` |
| `/sw-release:rc` | Manage release candidates | `/sw-release:rc create` |
| `/sw-release:platform` | Coordinate platform releases | `/sw-release:platform create` |

### Internal/Debug

| Command | Description | Example |
|---------|-------------|---------|
| `/sw:revert-wip-limit` | Revert WIP limit adjustment | `/sw:revert-wip-limit` |
| `/sw` | Command reference/help | `/sw` |

---

## Quick Start Guide - Essential 5 Commands

If you're new to SpecWeave, start with these 5 commands:

```bash
# 1. Plan new work
/sw:increment "Add user authentication"

# 2. Execute tasks
/sw:do

# 3. Check progress
/sw:progress

# 4. Close when done
/sw:done 0031

# 5. (NEW!) Reopen if issues found
/sw:reopen 0031 --reason "Auth broken in prod"
```

---

## Daily Workflow Example

**Monday - Start New Feature**:
```bash
/sw:increment "Implement payment processing"
# → Creates increment 0032, generates spec/plan/tasks
```

**Tuesday-Thursday - Execute Work**:
```bash
/sw:do
# → Smart resume, continues last active increment
# Work on tasks, mark [x] as you complete them

/sw:progress
# → Check: 15/20 tasks (75%)
```

**Friday - Complete or Pause**:
```bash
/sw:done 0032
# → PM validates, syncs to living docs, closes increment

# OR if blocked:
/sw:pause 0032 --reason "Waiting for API access"
```

**Next Week - Resume or Reopen**:
```bash
# Resume paused work
/sw:resume 0032

# OR reopen if issues found
/sw:reopen 0032 --reason "Payment gateway timeout"
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
/sw:reopen 0031 --task T-003 --reason "GitHub API rate limit"
```

**User Story-Level** (Feature Fix):
```bash
/sw:reopen 0031 --user-story US-001 --reason "AC not met"
```

**Increment-Level** (Systemic Fix):
```bash
/sw:reopen 0031 --reason "Multiple issues in production"
```

### WIP Limits Respected

Reopening respects WIP limits:
```
⚠️  WIP LIMIT WARNING:
   Current: 2/2 features active
   Reopening will EXCEED limit!

Options:
1. Pause: /sw:pause 0030
2. Force: /sw:reopen 0031 --force --reason "Production critical"
```

---

## Tips & Best Practices

### Do's ✅
- Use `/sw:increment` for ALL new work (even small fixes)
- Check `/sw:progress` frequently
- Always provide `--reason` for pause/reopen/abandon
- Use `/sw:validate` before closing
- Leverage smart reopen for production issues

### Don'ts ❌
- Don't skip `/sw:done` (breaks living docs sync)
- Don't exceed WIP limits without good reason
- Don't reopen old increments (>7 days) without investigation
- Don't abuse `--force` flag
- Don't create new increments for simple fixes (use reopen!)

---

## Command Aliases (Deprecated)

**⚠️ IMPORTANT**: Do NOT use shortcuts! They conflict with Claude Code native commands.

❌ **Never use**:
- `/inc` → Use `/sw:increment`
- `/do` → Use `/sw:do`
- `/done` → Use `/sw:done`

✅ **Always use full names**:
- `/sw:increment`
- `/sw:do`
- `/sw:done`

---

## Integration Workflows

### GitHub Workflow
```bash
# 1. Plan
/sw:increment "Feature X"

# 2. Auto-create GitHub issue (via hook)
# → Creates issue #123 automatically

# 3. Execute
/sw:do

# 4. Tasks update GitHub (via hook)
# → Checkboxes update automatically

# 5. Close
/sw:done 0031
# → Closes GitHub issue #123

# 6. (If needed) Reopen
/sw:reopen 0031 --reason "Bug found"
# → Reopens GitHub issue #123
```

### JIRA Workflow
```bash
# 1. Plan
/sw:increment "Feature X"

# 2. Sync to JIRA
/sw-jira:sync 0031
# → Creates JIRA epic

# 3. Execute
/sw:do

# 4. Close
/sw:done 0031

# 5. Sync completion
/sw-jira:sync 0031
# → Transitions JIRA: In Progress → Done
```

---

## Troubleshooting

**"Command not found"**:
- Ensure plugin installed: `/plugin list --installed`
- Restart Claude Code
- Check marketplace: `claude plugin marketplace list`

**"WIP limit exceeded"**:
- Check status: `/sw:status`
- Pause another: `/sw:pause 0030 --reason "..."`
- Or force: `--force` flag

**"Cannot reopen: status is active"**:
- Increment already active, no need to reopen
- Just continue work: `/sw:do`

**"Smart reopen not suggesting anything"**:
- Check if work is >7 days old
- Try manual command with increment ID
- Verify skill is loaded: skill activates on keywords

---

## Related Documentation

- **Full Command List**: `plugins/specweave/commands/sw.md`
- **Quick Start**: `.specweave/docs/public/guides/getting-started.md`
- **Workflow Guide**: `.specweave/docs/internal/delivery/guides/increment-lifecycle.md`
- **Reopen Architecture**: `.specweave/docs/internal/architecture/adr/0033-smart-reopen-functionality.md`

---

**Last Updated**: 2025-11-14
**Total Commands**: 62 across 10 plugins
**New in v0.19.0**: Smart Reopen Functionality ⭐
