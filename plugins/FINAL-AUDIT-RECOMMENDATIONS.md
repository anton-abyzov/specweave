# SpecWeave Plugin Audit - Final Recommendations

> **Audit Date**: 2026-01-24
> **Validator**: LLM-as-Judge (Opus 4.5)
> **Scope**: All plugins, skills, commands, agents

---

## Executive Summary

| Category | Finding | Priority | Action |
|----------|---------|----------|--------|
| **Agents → Skills** | ✅ Complete | - | 35 agents converted |
| **`tools:` → `allowed-tools:`** | ✅ Fixed | HIGH | 6 files corrected |
| **`context: fork` misuse** | ⚠️ 25 skills incorrect | MEDIUM | Remove from reference skills |
| **Commands → Skills migration** | ❌ Not recommended | - | Keep as commands |
| **Duplicates** | ✅ None found | - | Commands & skills are complementary |
| **Unused files** | ✅ 1 deprecated | LOW | Remove `github-manager` skill |

---

## 1. Context Fork Analysis (CRITICAL)

### The Rule

**`context: fork` should ONLY be used for skills with explicit task instructions.**

Per official Claude Code docs, `context: fork` spawns an isolated subagent. This is for:
- ✅ **Explicit tasks**: "Build X", "Generate Y", "Create Z"
- ❌ **NOT for**: Reference knowledge, documentation, patterns

### Skills INCORRECTLY Using `context: fork` (25 files)

These are **knowledge/reference** skills that provide patterns and best practices but don't execute explicit tasks:

| Skill | Type | Recommendation |
|-------|------|----------------|
| `architect` | Reference/knowledge | Remove `context: fork` |
| `pm` | Reference/knowledge | Remove `context: fork` |
| `tech-lead` | Reference/knowledge | Remove `context: fork` |
| `security` | Reference/knowledge | Remove `context: fork` |
| `sre` | Reference/knowledge | Remove `context: fork` |
| `devops` | Reference/knowledge | Remove `context: fork` |
| `performance` | Reference/knowledge | Remove `context: fork` |
| `observability-engineer` | Reference/knowledge | Remove `context: fork` |
| `network-engineer` | Reference/knowledge | Remove `context: fork` |
| `mobile-architect` | Reference/knowledge | Remove `context: fork` |
| `kafka-architect` | Reference/knowledge | Remove `context: fork` |
| `kubernetes-architect` | Reference/knowledge | Remove `context: fork` |
| `frontend-architect` | Reference/knowledge | Remove `context: fork` |
| `database-optimizer` | Reference/knowledge | Remove `context: fork` |
| `diagrams` | Reference/knowledge | Remove `context: fork` |
| `payment-integration` | Reference/knowledge | Remove `context: fork` |
| `dotnet-backend` | Reference/knowledge | Remove `context: fork` |
| `python-backend` | Reference/knowledge | Remove `context: fork` |
| `nodejs-backend` | Reference/knowledge | Remove `context: fork` |
| `ml-engineer` | Reference/knowledge | Remove `context: fork` |
| `data-scientist` | Reference/knowledge | Remove `context: fork` |
| `ado-mapper` | Reference/knowledge | Remove `context: fork` |
| `jira-mapper` | Reference/knowledge | Remove `context: fork` |
| `release-manager` | Reference/knowledge | Remove `context: fork` |
| `github-manager` | DEPRECATED | Delete entirely |

### Skills CORRECTLY Using `context: fork` (21 files)

These have **explicit task instructions** (e.g., "create tests", "generate code"):

| Skill | Has Explicit Task? | Keep `context: fork`? |
|-------|-------------------|----------------------|
| `qa-engineer` (sw-testing) | ✅ "Creates test suites ONE FILE AT A TIME" | ✅ Keep |
| `tech-lead` | ✅ "Implements code ONE FILE AT A TIME" | ✅ Keep |
| `docs-writer` | ✅ "Generates docs ONE SECTION AT A TIME" | ✅ Keep |
| `devops` (sw-infra) | ✅ "Generates IaC ONE LAYER AT A TIME" | ✅ Keep |
| `increment` | ✅ Creates increment structure | ✅ Keep |
| `test-aware-planner` | ✅ Generates tasks.md with tests | ✅ Keep |
| `tdd-cycle` | ✅ Coordinates TDD workflow | ✅ Keep |
| (etc.) | | |

### Fix Script

```bash
#!/bin/bash
# Remove context: fork from reference skills

files=(
  "plugins/specweave/skills/architect/SKILL.md"
  "plugins/specweave/skills/pm/SKILL.md"
  "plugins/specweave/skills/security/SKILL.md"
  # ... add remaining 22 files
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    sed -i '' '/^context: fork$/d' "$file"
    echo "Fixed: $file"
  fi
done
```

---

## 2. Commands vs Skills Analysis

### Key Finding: Commands Should NOT Be Migrated to Skills

**Why not migrate?**

1. **Context Bloat**: Skills auto-activate on keywords → large files load into context
   - Commands: Only loaded when explicitly invoked
   - Skills: Auto-load when keywords match (unpredictable context usage)

2. **Side Effects**: Commands with side effects should require explicit invocation
   - `/sw:do` - Executes tasks (major changes)
   - `/sw:save` - Git commit/push
   - `/sw:npm` - NPM publish
   - `/sw:done` - Closes increments

3. **Predictability**: Users expect commands to require explicit invocation
   - Auto-activation for "deploy", "sync", "publish" would be dangerous

4. **Official Docs Confirm**: Commands and skills are unified but serve different purposes
   - Commands: User-triggered workflows
   - Skills: Auto-activating expertise

### Commands That Should Add `disable-model-invocation: true`

Critical side-effect commands (prevents accidental auto-trigger):

```yaml
# Add to frontmatter of these commands:
disable-model-invocation: true
```

| Command | Reason |
|---------|--------|
| `/sw:do` | Executes tasks (major side effects) |
| `/sw:done` | Closes increments |
| `/sw:auto` | Autonomous execution mode |
| `/sw:save` | Git commit/push |
| `/sw:npm` | NPM publish |
| `/sw-github:sync` | GitHub sync |
| `/sw-github:push` | GitHub push |
| `/sw-jira:sync` | JIRA sync |
| `/sw-ado:sync` | ADO sync |

---

## 3. Duplicate Analysis

### Potential Duplicates Investigated

| Command | Skill | Relationship | Verdict |
|---------|-------|--------------|---------|
| `reflect.md` | `reflect/SKILL.md` | **Complementary** | Command is workflow, skill is knowledge |
| `translate.md` | `translator/SKILL.md` | **Complementary** | Command is batch workflow, skill is expertise |
| `qa.md` | `sw-testing:qa-engineer` | **Complementary** | Command runs CLI, skill creates tests |
| `plan.md` | `increment/SKILL.md` | **Complementary** | Command for existing, skill for new increments |
| `tdd-cycle.md` | `tdd-cycle/SKILL.md` | **Complementary** | Command starts workflow, skill orchestrates |

### Conclusion: No True Duplicates Found

Commands and skills serve different purposes:
- **Commands**: User-invocable workflows with specific execution steps
- **Skills**: Auto-activating expertise that provides patterns and knowledge

---

## 4. Unused/Deprecated Files

### Files to Remove

| File | Reason | Action |
|------|--------|--------|
| `plugins/specweave-github/skills/github-manager/SKILL.md` | Deprecated - superseded by commands | Delete |

### Files Already Cleaned

- All 35 `agents/` folders successfully converted to skills
- No orphan agent folders remain

---

## 5. Frontmatter Fixes Applied

### Issue: Incorrect `tools:` Field (FIXED)

Per official docs, the correct field is `allowed-tools:`, not `tools:`.

**Files fixed** (6 total):
1. ✅ `specweave-diagrams/skills/diagrams/SKILL.md`
2. ✅ `specweave-backend/skills/python-backend/SKILL.md`
3. ✅ `specweave-backend/skills/nodejs-backend/SKILL.md`
4. ✅ `specweave-backend/skills/dotnet-backend/SKILL.md`
5. ✅ `specweave-ado/skills/ado-mapper/SKILL.md`
6. ✅ `specweave-jira/skills/jira-mapper/SKILL.md`

---

## 6. Context Bloat Considerations

### Current State

| Type | Count | Avg Size | Auto-Load? | Context Impact |
|------|-------|----------|------------|----------------|
| Commands | 168 | ~200 lines | No (explicit `/command`) | Low (predictable) |
| Skills (fork) | 47 | ~400 lines | Yes (keywords) | Isolated (subagent) |
| Skills (no fork) | ~60 | ~150 lines | Yes (keywords) | Medium (main context) |

### Recommendations

1. **Large reference skills** (>500 lines): Consider chunking or progressive disclosure
2. **Skills with `context: fork`**: Safe - runs in isolated subagent
3. **Commands**: Keep as commands - predictable context usage

---

## 7. Final Recommendations

### HIGH Priority

1. ✅ **DONE**: Fix `tools:` → `allowed-tools:` (6 files)
2. 🔄 **TODO**: Remove `context: fork` from 25 reference skills
3. 🔄 **TODO**: Add `disable-model-invocation: true` to 9 critical commands

### MEDIUM Priority

4. 🔄 **TODO**: Delete deprecated `github-manager` skill
5. 🔄 **TODO**: Consider chunking large skills (>500 lines) for context efficiency

### LOW Priority

6. ⏳ **OPTIONAL**: Add descriptions to all frontmatter for better auto-activation
7. ⏳ **OPTIONAL**: Document skill vs command usage patterns in CLAUDE.md

---

## 8. Metrics Summary

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Agents | 35 | 0 | -35 (converted to skills) |
| Skills (total) | 107 | 107 | 0 |
| Skills with `context: fork` | 47 | 22 | -25 (pending fix) |
| Commands | 168 | 168 | 0 |
| Files with wrong frontmatter | 6 | 0 | -6 (fixed) |
| Deprecated files | 1 | 0 | -1 (pending delete) |

---

## 9. Validation Checklist

- [x] All agents converted to skills
- [x] All `tools:` → `allowed-tools:` fixed
- [x] No duplicate commands/skills found
- [x] Commands vs skills analysis complete
- [x] Context bloat impact assessed
- [ ] Remove `context: fork` from 25 reference skills
- [ ] Add `disable-model-invocation: true` to critical commands
- [ ] Delete deprecated `github-manager` skill

---

**Overall Assessment**: The plugin ecosystem is well-structured. The agent-to-skill conversion was successful. Commands and skills are properly differentiated. Minor fixes needed for `context: fork` usage and command safety flags.

**Grade**: A- (Excellent with minor fixes needed)
