# Completion Summary: Eliminate Skill Agent Spawning Crashes

**Increment**: 0055-eliminate-skill-agent-spawning-crashes
**Date**: 2025-11-24
**Status**: ✅ COMPLETE

---

## Problem Statement

Claude Code repeatedly crashed when skills spawned content-generating agents. Root causes identified:

1. **Context Explosion**: Skill (1500 lines) + Agent (600 lines) + Output (2000 lines) = 4100+ lines → CRASH 💥
2. **Skills Too Large**: 10+ skills over 1000 lines consuming excessive context on activation
3. **External References**: Skills referenced SpecWeave internal docs (ADRs, guides) that don't exist in user projects

---

## Solution Implemented

### 1. Removed Agent Spawning from Skills

**Changed**: Skills NO LONGER spawn agents via Task() tool

**Instead**: Skills create templates and guide users to invoke agents in main conversation

**Result**: Agents run in main context → chunking works → no crashes

### 2. Compacted Large Skills

**Refactored 5 critical skills** (1000+ lines each):

| Skill | Before | After | Reduction |
|-------|--------|-------|-----------|
| increment-planner | 1480 | 566 | 62% |
| role-orchestrator | 1126 | 450 | 60% |
| technical-writing | 1039 | 533 | 49% |
| unit-testing-expert | 1011 | 519 | 49% |
| brownfield-analyzer | 1008 | 407 | 60% |
| **TOTAL** | **5,644** | **2,475** | **56%** |

**Impact**: 3,169 lines removed from active context

### 3. Made Skills Self-Contained

**Removed**: All references to SpecWeave internal docs/ADRs
**Added**: Embedded all essential instructions inline
**Result**: Skills work in ANY user project after `specweave init`

---

## Technical Changes

### Skill Workflow Pattern (NEW)

**OLD (Broken)**:
```markdown
STEP 5: Invoke Agent (❌ CAUSES CRASH)

Task({
  subagent_type: "specweave:pm:pm",
  prompt: "[large prompt]"
});
```

**NEW (Safe)**:
```markdown
STEP 4: Create Templates
write spec.md (50 lines - placeholder)
write plan.md (50 lines - placeholder)
write metadata.json (MANDATORY)

STEP 5: Guide User
Output: "To complete spec, tell Claude: 'Complete spec for increment 0001'"
        "(PM agent will activate in MAIN conversation - safe!)"
```

### Skill Size Limits (NEW)

| Skill Type | Max Lines | Rationale |
|------------|-----------|-----------|
| Planning | 400-600 | Complex workflows, templates |
| Implementation | 300-500 | Code examples, patterns |
| Orchestration | 400-500 | Multi-agent coordination |
| Utility | 200-300 | Focused, single-purpose |

### Self-Containment Rule (NEW)

**❌ Prohibited**:
```markdown
See ADR-0133 for details
Reference: .specweave/docs/internal/guides/...
```

**✅ Required**:
- Embed all essential instructions
- Complete templates inline
- Works in ANY user project
- No SpecWeave repo dependencies

---

## Files Changed

### Skills Refactored (5)
1. `plugins/specweave/skills/increment-planner/SKILL.md`
   - Removed PM/Architect/test-aware-planner spawning
   - Added template creation logic
   - Added user guidance workflow
   - Backup: `SKILL-backup-1480lines.md`

2. `plugins/specweave/skills/role-orchestrator/SKILL.md`
   - Removed nested agent spawning
   - Changed to sequential user-guided workflow
   - Backup: `SKILL-backup-1126lines.md`

3. `plugins/specweave-docs/skills/technical-writing/SKILL.md`
   - Removed verbose examples
   - Focused on essential patterns
   - Backup: `SKILL-backup-1039lines.md`

4. `plugins/specweave-testing/skills/unit-testing-expert/SKILL.md`
   - Consolidated testing patterns
   - Removed redundant examples
   - Backup: `SKILL-backup-1011lines.md`

5. `plugins/specweave/skills/brownfield-analyzer/SKILL.md`
   - Streamlined analysis workflow
   - Removed external tool details (kept essentials)
   - Backup: `SKILL-backup-1008lines.md`

### Documentation Updated
- `.specweave/docs/internal/architecture/adr/0133-skills-must-not-spawn-large-agents.md`
  - Added skill size limits section
  - Added self-containment rule
  - Documented refactoring results

---

## Testing & Validation

### Build Test
```bash
npm run rebuild
```
**Result**: ✅ SUCCESS - All skills compile cleanly

### Marketplace Test
```bash
bash scripts/refresh-marketplace.sh
```
**Result**: ✅ SUCCESS - All 27 plugins installed

### Expected User Experience

**Before** (❌ Crashes):
```
User: "Plan a feature for user authentication"
→ increment-planner skill loads (1480 lines)
  → spawns PM agent (600 lines)
    → PM generates spec (2000 lines)
      → Claude Code CRASHES 💥
```

**After** (✅ Works):
```
User: "Plan a feature for user authentication"
→ increment-planner skill loads (566 lines)
  → Creates templates (150 lines total)
  → Guides user: "Tell Claude: 'Complete spec for increment 0001'"

User: "Complete spec for increment 0001"
→ PM agent activates in MAIN conversation (600 lines)
  → Generates spec in chunks (safe!)
  → NO CRASH ✅
```

---

## Remaining Work (Optional)

**7 skills still >700 lines** (not critical, but could be optimized):
- tdd-expert (934 lines)
- ado-resource-validator (905 lines)
- brownfield-onboarder (841 lines)
- e2e-playwright (769 lines)
- diagrams-architect (763 lines)
- visual-regression (728 lines)
- ui-testing (716 lines)

**Recommendation**: Defer to future increment. Critical 1000+ line skills fixed.

---

## Deployment

### Pre-Deployment Checklist
- [x] All skills refactored and backed up
- [x] Build passes
- [x] Marketplace refresh successful
- [x] ADR-0133 updated
- [x] No agent spawning code remains

### Deployment Steps
```bash
# 1. Commit changes
git add .
git commit -m "fix: eliminate skill agent spawning crashes (ADR-0133)

- Refactored 5 critical skills (1000+ lines each)
- Total reduction: 5,644 → 2,475 lines (56%)
- Removed all agent spawning from skills
- Made skills 100% self-contained
- Added skill size limits
- Updated ADR-0133

Fixes: Context explosion crashes
Reference: Increment 0055"

# 2. Push to develop
git push origin develop

# 3. GitHub Actions will auto-refresh marketplace (5-10s)

# 4. Users restart Claude Code to pick up changes
```

---

## Success Metrics

### Crash Prevention
- **Before**: Regular crashes when planning increments
- **After**: Zero crashes expected (agent spawning eliminated)

### Context Efficiency
- **Before**: 5,644 lines loaded for 5 skills
- **After**: 2,475 lines loaded (56% reduction)
- **Savings**: 3,169 lines freed

### User Experience
- **Before**: "One command" (but crashes)
- **After**: Guided workflow (stable, visible progress)

---

## Lessons Learned

1. **Context Budget Matters**: Even 1500-line skills consume too much context
2. **Nested Spawning Dangerous**: Task() from skills bypasses agent chunking
3. **Self-Containment Critical**: Skills must work in user projects (no SpecWeave repo deps)
4. **Chunking Works in Main**: Agents need main conversation for proper chunking
5. **User Control Better**: Guided workflows > black-box automation

---

## Related Work

- **Increment 0052**: Architect crash incident (original discovery)
- **Increment 0054**: Sync guard fixes (related context issues)
- **ADR-0133**: Skills must not spawn large agents
- **Emergency Procedure**: `SKILL-CRASH-RECOVERY.md`

---

## Acknowledgments

**User Insight**: "ultrathink why claude code crashed again!! I think limits to work in chunks are not applied for claude plugins/skills I have !!"

**Root Cause Identified**: Skills not respecting chunking limits → context explosion

**Solution**: Remove agent spawning, compact skills, enforce limits

---

**🎉 This increment eliminates Claude Code crashes caused by skill agent spawning! 🎉**
