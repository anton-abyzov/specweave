# SpecWeave Commands

All SpecWeave commands are namespaced for brownfield safety and follow a consistent naming pattern.

## ⚠️ CRITICAL: No Shortcuts Allowed

**IMPORTANT**: SpecWeave commands MUST be invoked with the `/sw:*` namespace prefix.

**Why?** Shortcuts like `/inc`, `/do`, `/pause`, `/resume` conflict with Claude Code's native commands and break functionality.

**Always use**: `/sw:increment`, `/sw:do`, `/sw:resume`, etc.

## Command Naming Convention

**All command files**: `{command-name}.md`
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

## All Available Commands (55 total)

### Core Lifecycle (9 commands)
1. `increment.md` - Plan new Product Increment → `/sw:increment`
2. `plan.md` - Generate plan.md and tasks.md using Architect Agent → `/sw:plan`
3. `do.md` - Execute increment tasks → `/sw:do`
4. `done.md` - Close increment with PM validation → `/sw:done`
5. `next.md` - Smart workflow transition (auto-close + suggest next) → `/sw:next`
6. `progress.md` - Show increment progress → `/sw:progress`
7. `validate.md` - Validate increment quality → `/sw:validate`
8. `workflow.md` - Smart workflow navigator → `/sw:workflow`
9. `context.md` - Load living docs context for LLM → `/sw:context`

### Status & Reporting (5 commands)
10. `status.md` - Show all increments overview → `/sw:status`
11. `update-scope.md` - Update living completion report → `/sw:update-scope`
12. `qa.md` - Quality assessment with risk scoring → `/sw:qa`
13. `judge-llm.md` - Ultrathink LLM-as-Judge validation → `/sw:judge-llm`
14. `jobs.md` - Show background jobs and increment status → `/sw:jobs`

### State Management (5 commands)
15. `pause.md` - Pause active increment → `/sw:pause`
16. `resume.md` - Resume paused/backlog increment → `/sw:resume`
17. `abandon.md` - Abandon incomplete increment → `/sw:abandon`
18. `backlog.md` - Move increment to backlog → `/sw:backlog`
19. `reopen.md` - Reopen completed increment → `/sw:reopen`

### Testing & Quality (3 commands)
20. `check-tests.md` - Validate test coverage → `/sw:check-tests`
21. `sync-tasks.md` - Sync tasks with external tools → `/sw:sync-tasks`
22. `check-hooks.md` - Health check for hooks → `/sw:check-hooks`

### TDD Workflow (4 commands)
23. `tdd-red.md` - Write failing tests (TDD red phase) → `/sw:tdd-red`
24. `tdd-green.md` - Make tests pass (TDD green phase) → `/sw:tdd-green`
25. `tdd-refactor.md` - Refactor with test safety net → `/sw:tdd-refactor`
26. `tdd-cycle.md` - Full TDD red-green-refactor cycle → `/sw:tdd-cycle`

### Archiving & Cleanup (6 commands)
27. `archive.md` - Archive completed increments → `/sw:archive`
28. `restore.md` - Restore archived increments → `/sw:restore`
29. `archive-features.md` - Archive features/epics → `/sw:archive-features`
30. `restore-feature.md` - Restore features/epics → `/sw:restore-feature`
31. `fix-duplicates.md` - Resolve duplicate increments → `/sw:fix-duplicates`
32. `revert-wip-limit.md` - Revert WIP limit after adjustment → `/sw:revert-wip-limit`

### Sync & Monitoring (10 commands)
33. `sync-docs.md` - Strategic documentation sync → `/sw:sync-docs`
34. `sync-specs.md` - Sync specs to living docs → `/sw:sync-specs`
35. `sync-progress.md` - Full progress sync to external tools → `/sw:sync-progress`
36. `sync-acs.md` - Sync AC checkbox status → `/sw:sync-acs`
37. `sync-status.md` - Fix metadata/spec status desyncs → `/sw:sync-status`
38. `sync-monitor.md` - Sync orchestration dashboard → `/sw:sync-monitor`
39. `sync-logs.md` - Query sync audit logs → `/sw:sync-logs`
40. `sync-diagnostics.md` - Sync circuit breaker diagnostics → `/sw:sync-diagnostics`
41. `update-status.md` - Force-update status line cache → `/sw:update-status`
42. `notifications.md` - View sync notifications → `/sw:notifications`

### Brownfield & Documentation (7 commands)
43. `discrepancies.md` - View code-to-spec discrepancies → `/sw:discrepancies`
44. `discrepancy-to-increment.md` - Convert discrepancy to increment → `/sw:discrepancy-to-increment`
45. `import-docs.md` - Import brownfield documentation → `/sw:import-docs`
46. `import-external.md` - Import external work items → `/sw:import-external`
47. `living-docs.md` - Launch Living Docs Builder → `/sw:living-docs`
48. `organize-docs.md` - Smart documentation organization → `/sw:organize-docs`
49. `validate-features.md` - Validate feature folder consistency → `/sw:validate-features`

### External Tools (2 commands)
50. `external.md` - View external items dashboard → `/sw:external`
51. `embed-acs.md` - Embed ACs from living docs into spec.md → `/sw:embed-acs`

### Utilities (4 commands)
52. `translate.md` - Batch translation → `/sw:translate`
53. `save.md` - Smart git save across repos → `/sw:save`
54. `migrate-config.md` - Migrate config format → `/sw:migrate-config`
55. `sw.md` - Master command reference → `/sw:sw`

**Total**: 55 commands in the core SpecWeave plugin

## Command Categories

**By Frequency of Use**:
- **ESSENTIAL**: increment, do, done, next, progress, validate, sync-docs, save, context
- **IMPORTANT**: status, qa, check-tests, update-scope, workflow, sync-specs
- **STATE MANAGEMENT**: pause, resume, abandon, backlog, reopen
- **ARCHIVING**: archive, restore, archive-features, restore-feature, fix-duplicates
- **SYNC & MONITORING**: sync-monitor, sync-logs, sync-progress, sync-acs, sync-status, notifications
- **BROWNFIELD**: discrepancies, discrepancy-to-increment, import-docs, import-external, living-docs
- **TDD**: tdd-red, tdd-green, tdd-refactor, tdd-cycle
- **ADVANCED**: judge-llm, check-hooks, embed-acs, validate-features, organize-docs

## Plugin Commands

SpecWeave plugins provide additional namespaced commands:

| Plugin | Prefix | Commands |
|--------|--------|----------|
| **GitHub** | `/sw-github:*` | sync, create, push, pull, close, status, reconcile, clone |
| **JIRA** | `/sw-jira:*` | sync, create, push, pull, close, status, reconcile |
| **Azure DevOps** | `/sw-ado:*` | sync, create, push, pull, close, status, reconcile |
| **Release** | `/sw-release:*` | init, align, rc, platform, npm |
| **Docs** | `/sw-docs:*` | init, generate, build, view, validate, organize |
| **Frontend** | `/sw-frontend:*` | component-generate, design-system-init, frontend-scaffold |
| **Backend** | `/sw-backend:*` | api-scaffold, crud-generate, migration-generate |
| **Kubernetes** | `/sw-kubernetes:*` | cluster-setup, deployment-generate, helm-scaffold |
| **Testing** | `/sw-testing:*` | e2e-setup, test-coverage, test-generate, test-init |
| **Infrastructure** | `/sw-infra:*` | monitor-setup, slo-implement |
| **Kafka** | `/sw-kafka:*` | deploy, dev-env, monitor-setup, mcp-configure |
| **Mobile** | `/sw-mobile:*` | app-scaffold, build-config, screen-generate |
| **ML** | `/sw-ml:*` | deploy, evaluate, explain, pipeline |
| **Payments** | `/sw-payments:*` | subscription-manage, webhook-setup |
| **Diagrams** | `/sw-diagrams:*` | diagrams-generate |

## Removed/Deprecated Commands

**Duplicates removed**:
- ❌ `inc.md` → Use `/sw:increment`

**Deprecated commands**:
- ❌ `validate-coverage.md` → Use `/sw:check-tests`
- ❌ `specweave-validate-coverage.md` → Use `/sw:check-tests`
- ❌ `list-increments.md` → Use `/sw:status`

**Removed**:
- ❌ `costs.md` - Cost tracking infrastructure not wired up

## Brownfield Safety

All commands are namespaced to prevent collisions with existing project commands:
- ✅ **Namespace form**: `/sw:increment` (ONLY way, always safe)
- ❌ **No shortcuts**: Do NOT use `/inc`, `/do`, `/pause`, `/resume` etc.

## Quick Reference

```bash
# Core workflow
/sw:increment "feature"    # Plan new increment
/sw:do                     # Execute tasks
/sw:progress               # Check status
/sw:qa 0007                # Quality check
/sw:done 0007              # Close increment
/sw:save                   # Commit & push changes

# Sync to external tools
/sw-github:sync 0007       # Sync to GitHub
/sw-jira:sync 0007         # Sync to JIRA
/sw-ado:sync 0007          # Sync to Azure DevOps

# State management
/sw:pause 0007             # Pause increment
/sw:resume 0007            # Resume increment
/sw:backlog 0007           # Move to backlog
/sw:abandon 0007           # Abandon increment

# Documentation
/sw:sync-docs update       # Sync to living docs
/sw:living-docs            # Launch docs builder
/sw:import-docs            # Import brownfield docs
```

## See Also

- **User Documentation**: https://spec-weave.com/docs/commands
- **CLAUDE.md**: Project contributor guide with complete command reference
- **Plugin Marketplace**: `.claude-plugin/marketplace.json`
