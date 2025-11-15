# SpecWeave Skills Deduplication Analysis

**Date**: 2025-11-13
**Increment**: 0031-external-tool-status-sync
**Analysis**: Comprehensive skills overlap and consolidation opportunities

---

## Executive Summary

**Total Skills**: 20 skills in core `specweave` plugin
**Shared Keywords**: 21 keywords used by multiple skills
**Potential Duplicates**: 10 skill pairs with 19%+ overlap
**Critical Issues**: 1 deprecated skill, 1 versioning conflict (80% overlap)

### Key Findings

1. ✅ **Most overlaps are healthy** - Skills in same workflow naturally share keywords
2. ⚠️  **2 critical issues** - Versioning conflict + deprecated skill still present
3. 🎯 **Opportunities** - Can consolidate 3 plugin-related skills into 1

---

## Detailed Analysis

### 1. Critical: Versioning Conflict (80% Overlap)

**Skills**: `increment-quality-judge` vs `increment-quality-judge-v2`

**Overlap**:
```
Shared keywords (80%): increment, plan, quality, validate
```

**Analysis**:
- `increment-quality-judge` = Original quality assessment
- `increment-quality-judge-v2` = Enhanced with RISK SCORING (BMAD pattern)
- **Both activate on same keywords!** → Conflict

**Problem**:
When user says "validate quality", which skill fires? Claude Code doesn't have skill priority/versioning.

**Recommendation: CONSOLIDATE**

**Action**:
1. ✅ **Keep**: `increment-quality-judge-v2` (superior version)
2. ❌ **Remove**: `increment-quality-judge` (old version)
3. 🔄 **Update**: Any references in docs/commands

**Rationale**:
- v2 includes everything from v1 + RISK SCORING
- No reason to keep both (confuses activation)
- Users get better experience with v2

---

### 2. Deprecated Skill Still Present

**Skill**: `plugin-installer`

**Status**: Marked DEPRECATED in description
```
"DEPRECATED - This skill is no longer needed. All plugins are now
installed automatically during specweave init. This skill remains
for backward compatibility."
```

**Problem**:
- Still occupies tokens in context
- Can confuse users if accidentally activated
- "Backward compatibility" rationale is weak (skills auto-activate, not user-invoked)

**Recommendation: REMOVE**

**Action**:
1. ❌ **Delete**: `plugins/specweave/skills/plugin-installer/`
2. 📝 **Update**: `SKILLS-INDEX.md` to reflect removal

**Rationale**:
- No migration needed (users don't invoke skills manually)
- Reduces core plugin token count
- Eliminates confusion

---

### 3. Plugin Skills Consolidation Opportunity

**Skills**: 3 plugin-related skills

| Skill | Keywords | Purpose |
|-------|----------|---------|
| `plugin-expert` | plugin, add | Knowledge of plugin system |
| `plugin-installer` | plugin | DEPRECATED (already flagged) |
| `plugin-validator` | plugin, validate | Validates plugin installation |

**Overlap**: All share "plugin" keyword

**Analysis**:
- `plugin-expert` = Explains plugin system, commands, troubleshooting
- `plugin-validator` = Checks if plugins installed correctly
- `plugin-installer` = DEPRECATED

**Current Activation**:
```
User: "How do I install plugins?" → plugin-expert ✅
User: "Validate plugins" → plugin-validator ✅
User: "Install plugin X" → plugin-installer ❌ (deprecated)
```

**Recommendation: KEEP SEPARATE (for now)**

**Rationale**:
- Different activation contexts (explain vs validate)
- `plugin-expert` = passive knowledge
- `plugin-validator` = active validation (runs checks)
- Consolidation would create one large, unfocused skill
- **But**: Remove `plugin-installer` (already deprecated)

**Alternative**: If overlap causes issues, consolidate into:
```
plugin-manager (combined expert + validator)
```

---

### 4. Workflow Skills (Healthy Overlap)

**Skills**: Core increment workflow skills

| Skill | Keywords | Phase | Overlap |
|-------|----------|-------|---------|
| `project-kickstarter` | build, product, MVP, features | Kickstart | 19-21% |
| `increment-planner` | implement, plan, tasks, feature | Plan | 21% |
| `increment-work-router` | implement, complete, continue | Execute | 19-21% |
| `spec-generator` | spec, plan, tasks, feature | Generate | 19-21% |

**Analysis**:
These skills work together in a pipeline:
```
User: "Build SaaS app" → project-kickstarter (detects product)
        ↓
User: "Create increment" → increment-planner (creates structure)
        ↓
        spec-generator (generates files)
        ↓
User: "Implement feature" → increment-work-router (routes to increment)
        ↓
User: "Continue working" → increment-work-router (resumes)
```

**Overlap Breakdown**:
- **19-21% overlap is HEALTHY** - Same domain (increment workflow)
- **Different activation intents**:
  - `project-kickstarter`: Product descriptions (MVP, tech stack)
  - `increment-planner`: Explicit planning requests
  - `increment-work-router`: Implementation verbs (implement, complete)
  - `spec-generator`: File generation (internal, invoked by planner)

**Recommendation: KEEP SEPARATE ✅**

**Rationale**:
- Each skill has distinct activation pattern
- Natural workflow progression (kickstart → plan → execute)
- Consolidation would create one massive skill (2000+ lines)
- Users benefit from focused, specialized skills

**Testing**:
No conflicts observed. When user says:
- "Build X" → project-kickstarter (product detection)
- "Implement X" → increment-work-router (execution)
- "Plan X" → increment-planner (planning)

---

### 5. Brownfield Skills (Complementary)

**Skills**: `brownfield-analyzer` vs `brownfield-onboarder`

**Overlap**: Both share "brownfield" keyword

**Analysis**:
- `brownfield-analyzer` = Scans existing project, maps docs structure
- `brownfield-onboarder` = Merges existing CLAUDE.md into SpecWeave

**Different purposes**:
```
User: "Analyze brownfield project" → brownfield-analyzer
User: "Import existing docs" → brownfield-onboarder
```

**Recommendation: KEEP SEPARATE ✅**

**Rationale**:
- Distinct activation contexts (analyze vs import)
- Sequential workflow (analyze first, then onboard)
- No activation conflicts observed

---

### 6. Context Skills (Complementary)

**Skills**: `context-loader` vs `context-optimizer`

**Overlap**: Both about context management

**Analysis**:
- `context-loader` = Explains SpecWeave's progressive disclosure
- `context-optimizer` = Actually optimizes loaded context (removes irrelevant specs)

**Different purposes**:
```
User: "How does context loading work?" → context-loader (explanation)
User: "Optimize context" → context-optimizer (action)
```

**Recommendation: KEEP SEPARATE ✅**

**Rationale**:
- One is passive (knowledge), one is active (optimization)
- Different use cases
- No conflicts

---

### 7. Detection Skills (Complementary)

**Skills**: Multiple skills with "detect" keyword

| Skill | Detects | Activates For |
|-------|---------|---------------|
| `specweave-detector` | .specweave/ directory | SpecWeave context questions |
| `project-kickstarter` | Product descriptions | Project planning |
| `increment-work-router` | Implementation intent | Execution requests |
| `tdd-workflow` | TDD intent | Test-driven development |
| `brownfield-analyzer` | Existing project structure | Brownfield analysis |

**Overlap**: All share "detect" but in different contexts

**Recommendation: KEEP SEPARATE ✅**

**Rationale**:
- "Detect" is used for different purposes
- No activation conflicts (different keywords beyond "detect")
- Each serves distinct purpose

---

### 8. Role Orchestrator (Specialized)

**Skill**: `role-orchestrator`

**Overlap**: 9-20% with increment-planner, increment-work-router

**Analysis**:
- Shares: build, create, implement
- Purpose: Multi-agent orchestration (PM, Architect, DevOps, QA)
- Activation: "complex project", "multi-agent", "orchestrate"

**Recommendation: KEEP SEPARATE ✅**

**Rationale**:
- Specialized for complex, multi-role tasks
- Different activation pattern (not just "implement X")
- Useful for large-scale planning
- Low overlap (9-20%) is acceptable

---

## Keyword Overlap Matrix

**21 keywords shared by multiple skills:**

| Keyword | Skills Using It | Conflict? |
|---------|----------------|-----------|
| increment | 8 skills | ✅ No (different contexts) |
| plan | 5 skills | ✅ No (different phases) |
| build | 4 skills | ✅ No (kickstart vs execute) |
| feature | 4 skills | ✅ No (kickstart vs planner) |
| plugin | 4 skills | ⚠️ Remove deprecated |
| implement | 3 skills | ✅ No (orchestrator, planner, router) |
| validate | 4 skills | ⚠️ v1 vs v2 conflict! |
| quality | 2 skills | ⚠️ v1 vs v2 conflict! |
| create | 6 skills | ✅ No (different contexts) |
| detect | 5 skills | ✅ No (different targets) |

**Key Insight**: Most overlaps are healthy! Skills naturally share domain keywords but have distinct activation patterns.

---

## Consolidation Recommendations

### Immediate Actions (High Priority)

#### 1. Remove `increment-quality-judge` (v1)

**File**: `plugins/specweave/skills/increment-quality-judge/SKILL.md`

**Action**: DELETE

**Reason**:
- Superseded by v2 (RISK SCORING + all v1 features)
- 80% keyword overlap = activation conflict
- No migration needed (v2 is superset)

**Commands to run**:
```bash
rm -rf plugins/specweave/skills/increment-quality-judge/
```

**Update references**:
- `plugins/specweave/skills/SKILLS-INDEX.md`
- `CLAUDE.md` (if mentioned)
- Any documentation referencing v1

---

#### 2. Remove `plugin-installer` (deprecated)

**File**: `plugins/specweave/skills/plugin-installer/SKILL.md`

**Action**: DELETE

**Reason**:
- Already marked DEPRECATED
- Functionality moved to `specweave init`
- Wastes tokens in context
- No backward compatibility needed (skills auto-activate)

**Commands to run**:
```bash
rm -rf plugins/specweave/skills/plugin-installer/
```

**Update references**:
- `plugins/specweave/skills/SKILLS-INDEX.md`

---

### Medium Priority (Optional)

#### 3. Consider Consolidating Plugin Skills

**Current**: 3 skills (expert, validator, installer)
**Proposal**: 2 skills (expert, validator) after removing installer

**Future Optimization** (if overlap causes issues):
Consolidate `plugin-expert` + `plugin-validator` into:
```
plugin-manager (combined knowledge + validation)
```

**For now**: Keep separate (distinct activation contexts)

---

### Low Priority (Monitor)

#### 4. Monitor Workflow Skills Overlap

**Skills**: project-kickstarter, increment-planner, increment-work-router, spec-generator

**Current Status**: ✅ Working well, no conflicts observed

**Action**: Monitor activation patterns in production

**If issues arise**: Consider:
- Adjust keyword weights in descriptions
- Add explicit "NOT for X" statements in SKILL.md
- Test with real user queries

---

## Impact Analysis

### Token Reduction

**Current Skills**: 20 skills
**After Consolidation**: 18 skills

**Skills to Remove**:
1. `increment-quality-judge` (v1) - ~600 lines
2. `plugin-installer` (deprecated) - ~400 lines

**Token Savings**: ~1000 lines = ~2500 tokens

**Percentage**: ~3% reduction in core plugin token count

---

### Activation Clarity

**Before**:
```
User: "validate quality"
→ Could activate: increment-quality-judge OR increment-quality-judge-v2
   (Conflict! Which one fires?)
```

**After**:
```
User: "validate quality"
→ Activates: increment-quality-judge-v2 (only option)
   (Clear! No confusion)
```

---

### Maintenance Burden

**Before**: 20 skills to maintain
**After**: 18 skills to maintain

**Reduced Complexity**:
- No versioning conflicts
- No deprecated skills lingering
- Clearer skill index

---

## Testing Plan

### Phase 1: Remove Deprecated Skills

**Test Cases**:
1. ✅ User says "install plugin X" → Should NOT activate plugin-installer
2. ✅ User says "validate quality" → Should activate increment-quality-judge-v2 ONLY
3. ✅ Check no broken references in docs/commands

**Validation**:
```bash
# Check for references to removed skills
grep -r "increment-quality-judge" --exclude-dir=".git" .
grep -r "plugin-installer" --exclude-dir=".git" .
```

---

### Phase 2: Monitor Workflow Skills

**Test Cases**:
1. ✅ "Build SaaS app" → project-kickstarter activates
2. ✅ "Implement feature" → increment-work-router activates
3. ✅ "Create increment" → increment-planner activates
4. ✅ "Continue working" → increment-work-router activates

**Expected**: No conflicts, skills activate correctly

---

## Implementation Steps

### Step 1: Backup

```bash
# Create backup before changes
cp -r plugins/specweave/skills plugins/specweave/skills.backup
```

---

### Step 2: Remove Old Skills

```bash
# Remove v1 quality judge
rm -rf plugins/specweave/skills/increment-quality-judge

# Remove deprecated installer
rm -rf plugins/specweave/skills/plugin-installer
```

---

### Step 3: Update SKILLS-INDEX.md

**File**: `plugins/specweave/skills/SKILLS-INDEX.md`

**Remove entries for**:
- `increment-quality-judge` (replaced by v2)
- `plugin-installer` (deprecated)

---

### Step 4: Update References

**Search for references**:
```bash
# Find any docs mentioning removed skills
grep -r "increment-quality-judge" docs/
grep -r "plugin-installer" docs/
```

**Update**:
- Replace "increment-quality-judge" → "increment-quality-judge-v2"
- Remove "plugin-installer" mentions (functionality now in `specweave init`)

---

### Step 5: Test

```bash
# Restart Claude Code
# Test activation patterns with real queries

# Test 1: Quality validation
"Validate the increment quality"  # Should activate v2 only

# Test 2: Plugin help
"How do I install plugins?"  # Should activate plugin-expert, not installer

# Test 3: Workflow (no changes)
"Implement user authentication"  # Should activate increment-work-router
```

---

## Conclusion

### Summary of Changes

**Remove**:
1. ❌ `increment-quality-judge` (v1) - Superseded by v2
2. ❌ `plugin-installer` - Deprecated, functionality moved

**Keep**:
- ✅ All workflow skills (project-kickstarter, increment-planner, increment-work-router, spec-generator)
- ✅ Brownfield skills (analyzer, onboarder)
- ✅ Context skills (loader, optimizer)
- ✅ Plugin skills (expert, validator)
- ✅ All other specialized skills

**Result**:
- 18 skills (down from 20)
- ~3% token reduction
- Eliminated versioning conflict
- Removed deprecated skill
- Clearer activation patterns

---

### Next Steps

1. **Immediate**: Remove 2 skills (quality-judge v1, plugin-installer)
2. **Test**: Validate activation patterns
3. **Monitor**: Watch for conflicts in production
4. **Future**: Consider plugin skills consolidation if issues arise

---

**Status**: ✅ Analysis Complete
**Recommendation**: Proceed with removal of 2 skills
**Risk**: Low (both are superseded/deprecated)
**Benefit**: Clearer activation, reduced tokens, easier maintenance

---

🤖 Generated by Claude Code | Increment 0031-external-tool-status-sync
