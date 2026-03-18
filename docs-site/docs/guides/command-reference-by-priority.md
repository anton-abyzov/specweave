import CommandTabs from '@site/src/components/CommandTabs';

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
| `/sw:resume` | **NEW!** Reopen completed work | `/sw:resume 0031 --reason "GitHub sync failing"` |

**Smart Detection**: Just say "GitHub sync not working" and the skill auto-suggests what to reopen!

**Usage**:
```bash
# Reopen entire increment
/sw:resume 0031 --reason "Production bug found"

# Reopen specific task
/sw:resume 0031 --task T-003 --reason "API broken"

# Reopen user story
/sw:resume 0031 --user-story US-001 --reason "AC not met"
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
| `/sw:status` | Move increment to backlog | `/sw:status 0032 --reason "Deprioritized"` |

### Quality & Validation

| Command | Description | Example |
|---------|-------------|---------|
| `/sw:validate` | Validate increment structure | `/sw:validate 0031` |
| `/sw:qa` | Quality assessment with risk scoring | `/sw:qa 0031` |
| `npx vitest run` | Validate test coverage | `npx vitest run 0031` |

### Documentation Sync

| Command | Description | Example |
|---------|-------------|---------|
| `/sw:sync-docs` | Sync to living docs | `/sw:sync-docs update` |
| `/sw:sync-specs` | Sync specs only | `/sw:sync-specs 0031` |
| `/sw:progress-sync` | Sync task completion | `/sw:progress-sync 0031` |

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

Multi-project mode is enabled during `specweave init` (when connecting JIRA/ADO with multiple projects), via `specweave migrate-to-umbrella --reorganize-specs`, or by manually editing config.json. Project routing is per-increment via the `**Project**:` field in spec.md user stories.

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
| `/sw:import` | Import issues from GitHub/JIRA/ADO | `/sw:import` |
| `/sw:translate` | Translate content | `/sw:translate ru` |

### Cost Tracking

| Command | Description | Example |
|---------|-------------|---------|
| `/sw:costs` | Show AI cost dashboard | `/sw:costs 0031` |
| `/sw:increment (to update spec)` | Log scope changes | `/sw:increment (to update spec) 0031` |

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
| `/docs:view` | Launch docs server (internal or public) | `/docs:view` or `/docs:view --public` |
| `/docs:build` | Build static docs site | `/docs:build` |
| `/docs:generate` | Generate documentation | `/docs:generate` |
| `/docs:organize` | Organize large doc folders | `/docs:organize` |
| `/docs:health` | Documentation health report | `/docs:health` |
| `/docs:validate` | Validate documentation | `/docs:validate` |

### Infrastructure & SRE

| Command | Description | Example |
|---------|-------------|---------|
| `/infra:monitor-setup` | Setup monitoring | `/infra:monitor-setup` |
| `/infra:slo-implement` | Implement SLOs | `/infra:slo-implement` |

### ML/AI Workflows

| Command | Description | Example |
|---------|-------------|---------|
| `/ml:pipeline` | Design ML pipeline | `/ml:pipeline` |
| `/ml:evaluate` | Evaluate ML model | `/ml:evaluate` |
| `/ml:explain` | Model explainability | `/ml:explain` |
| `/ml:deploy` | Deploy ML model | `/ml:deploy` |

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

**1. Plan new work:**

<CommandTabs
  natural="I want to add user authentication"
  claude='/sw:increment "Add user authentication"'
  other='increment "Add user authentication"'
/>

**2. Execute tasks:**

<CommandTabs
  natural="Start implementing"
  claude="/sw:do"
  other="do"
/>

**3. Check progress:**

<CommandTabs
  natural="What's the status?"
  claude="/sw:progress"
  other="progress"
/>

**4. Close when done:**

<CommandTabs
  natural="We're done, close it"
  claude="/sw:done 0031"
  other="done 0031"
/>

**5. Reopen if issues found:**

```bash
/sw:resume 0031 --reason "Auth broken in prod"
```

---

## Daily Workflow Example

**Monday - Start New Feature**:

<CommandTabs
  natural="Let's build payment processing"
  claude='/sw:increment "Implement payment processing"'
  other='increment "Implement payment processing"'
/>

```
→ Creates increment 0032, generates spec/plan/tasks
```

**Tuesday-Thursday - Execute Work**:

<CommandTabs
  natural="Start implementing"
  claude="/sw:do"
  other="do"
/>

```
→ Smart resume, continues last active increment
Work on tasks, mark [x] as you complete them
```

<CommandTabs
  natural="What's the status?"
  claude="/sw:progress"
  other="progress"
/>

```
→ Check: 15/20 tasks (75%)
```

**Friday - Complete or Pause**:

<CommandTabs
  natural="We're done with 0032, finish up"
  claude="/sw:done 0032"
  other="done 0032"
/>

```
→ PM validates, syncs to living docs, closes increment
```

OR if blocked:
```bash
/sw:pause 0032 --reason "Waiting for API access"
```

**Next Week - Resume or Reopen**:
```bash
# Resume paused work
/sw:resume 0032

# OR reopen if issues found
/sw:resume 0032 --reason "Payment gateway timeout"
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
/sw:resume 0031 --task T-003 --reason "GitHub API rate limit"
```

**User Story-Level** (Feature Fix):
```bash
/sw:resume 0031 --user-story US-001 --reason "AC not met"
```

**Increment-Level** (Systemic Fix):
```bash
/sw:resume 0031 --reason "Multiple issues in production"
```

### WIP Limits Respected

Reopening respects WIP limits:
```
⚠️  WIP LIMIT WARNING:
   Current: 2/2 features active
   Reopening will EXCEED limit!

Options:
1. Pause: /sw:pause 0030
2. Force: /sw:resume 0031 --force --reason "Production critical"
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

**1. Plan:**

<CommandTabs
  natural="Let's build Feature X"
  claude='/sw:increment "Feature X"'
  other='increment "Feature X"'
/>

Auto-creates GitHub issue #123 via hook.

**2. Execute:**

<CommandTabs
  natural="Start implementing"
  claude="/sw:do"
  other="do"
/>

Tasks update GitHub checkboxes automatically via hook.

**3. Close:**

<CommandTabs
  natural="We're done, close it"
  claude="/sw:done 0031"
  other="done 0031"
/>

Closes GitHub issue #123.

**4. (If needed) Reopen:**

```bash
/sw:resume 0031 --reason "Bug found"
# → Reopens GitHub issue #123
```

### JIRA Workflow

**1. Plan:**

<CommandTabs
  natural="Let's build Feature X"
  claude='/sw:increment "Feature X"'
  other='increment "Feature X"'
/>

**2. Sync to JIRA:**

<CommandTabs
  natural="Sync to JIRA"
  claude="/sw-jira:sync 0031"
  other="jira-sync 0031"
/>

Creates JIRA epic.

**3. Execute:**

<CommandTabs
  natural="Start implementing"
  claude="/sw:do"
  other="do"
/>

**4. Close:**

<CommandTabs
  natural="We're done, close it"
  claude="/sw:done 0031"
  other="done 0031"
/>

**5. Sync completion:**

<CommandTabs
  natural="Sync to JIRA"
  claude="/sw-jira:sync 0031"
  other="jira-sync 0031"
/>

Transitions JIRA: In Progress to Done.

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
