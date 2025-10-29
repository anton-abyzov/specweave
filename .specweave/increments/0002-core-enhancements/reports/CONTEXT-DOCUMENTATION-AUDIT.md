# Context Documentation Comprehensive Audit

**Date**: 2025-10-28
**Status**: In Progress
**Scope**: 138 files with context-related terms

---

## ✅ COMPLETED FIXES (Critical Files)

### 1. Skills
- ✅ `.claude/skills/context-loader/SKILL.md` - Completely rewritten
- ✅ `src/skills/context-loader/SKILL.md` - Synced from .claude
- ✅ Removed 6 invalid test files
- ✅ Removed 5 non-existent context-manifest.yaml files

### 2. Architecture Decision Records
- ✅ `.specweave/docs/internal/architecture/adr/0002-context-loading.md` - Completely rewritten

### 3. Architecture Documentation
- ✅ `.specweave/docs/internal/architecture/context-loading.md` - Completely rewritten

###Summary of Changes:
**Before (Wrong)**:
- Custom context manifests (YAML files)
- Custom caching system
- 70-90% token reduction claims
- Section-level filtering with #anchors

**After (Correct)**:
- Progressive disclosure (Claude native)
- Sub-agent parallelization (Claude Code native)
- Realistic token estimates (50-95% depending on complexity)
- No custom systems

---

## 📋 REMAINING FILES TO REVIEW (By Priority)

### Priority 1: User-Facing (PUBLIC)

#### YouTube Content
- `youtube-content/scripts/001-specweave-masterclass.md`
- `youtube-content/demos/greenfield-demo.md`
- `youtube-content/demos/brownfield-easychamp-demo.md`
- `youtube-content/slides/masterclass-outline.md`
- `youtube-content/comparisons/speckit-comparison.md`
- `youtube-content/comparisons/bmad-comparison.md`

#### Docusaurus Public Site
- `docs-site/docs/intro.md`
- `docs-site/blog/2025-10-26-introducing-specweave.md`
- `.specweave/docs/public/overview/features.md`
- `.specweave/docs/public/overview/introduction.md`

#### Public Guides
- `.specweave/docs/public/guides/getting-started/quickstart.md`
- `.specweave/docs/public/guides/github-action-setup.md`

**Action**: Search for "context manifest", "70%", "90%", caching claims

### Priority 2: Internal Documentation

#### Increment Specs
- `.specweave/increments/0001-core-framework/spec.md`
- `.specweave/increments/0002-core-enhancements/spec.md`
- `.specweave/increments/0006-recipe-meal-planning/spec.md`

#### Reports
- `.specweave/increments/0001-core-framework/reports/CLAUDE-MD-OPTIMIZATION-PLAN.md`
- `.specweave/increments/0001-core-framework/reports/CLAUDE-MD-OPTIMIZATION-SUMMARY.md`
- `.specweave/increments/0002-core-enhancements/reports/WORKFLOW-IMPROVEMENTS.md`

**Action**: Remove context manifest references

### Priority 3: Skills/Agents

#### Skills
- `src/skills/increment-planner/SKILL.md`
- `src/skills/role-orchestrator/SKILL.md`
- `src/skills/context-optimizer/SKILL.md`
- `src/skills/spec-driven-brainstorming/SKILL.md`

#### Agents
- `src/agents/sre/AGENT.md`

**Action**: Ensure no references to context manifests

### Priority 4: Test Files
- `tests/integration/context-loader/context-loader.test.ts`
- `tests/e2e/specweave-smoke.spec.ts`

**Action**: Update or remove if testing non-existent features

### Priority 5: Templates & Adapters
- `src/templates/CLAUDE.md.template`
- `src/templates/AGENTS.md.template`
- `src/adapters/*/README.md`

**Action**: Update context explanations

---

## 🔍 SEARCH PATTERNS TO FIND

Run these searches to find remaining issues:

```bash
# Context manifests
grep -rn "context.manifest\|context-manifest" . --include="*.md"

# Token reduction claims
grep -rn "70.*reduction\|90.*reduction\|70%\|90%" . --include="*.md"

# Caching claims
grep -rn "cache.*context\|context.*cache" . --include="*.md"

# Section filtering
grep -rn "#.*anchor\|section.*filter" . --include="*.md"
```

---

## 📊 STATISTICS

**Total files with context terms**: 138
**Files fixed**: 5 (critical architecture files)
**Files remaining**: ~133

**Priority breakdown**:
- Priority 1 (User-facing): ~15 files
- Priority 2 (Internal docs): ~30 files
- Priority 3 (Skills/Agents): ~20 files
- Priority 4 (Tests): ~10 files
- Priority 5 (Templates): ~10 files
- Other (Low priority): ~48 files

---

## ✅ VERIFICATION CHECKLIST

After all updates, verify:

- [ ] No "context manifest" references (except in "rejected" sections)
- [ ] No "70-90%" token reduction claims
- [ ] No custom caching claims
- [ ] All references point to progressive disclosure
- [ ] All references point to sub-agent parallelization
- [ ] Links to Claude documentation present
- [ ] Realistic token estimates (50-95% range)

---

## 🎯 RECOMMENDED NEXT STEPS

1. **Update Priority 1** (User-facing docs) - Most visible
2. **Update Priority 2** (Internal increment specs) - Important for consistency
3. **Update Priority 3** (Skills/Agents) - Functional correctness
4. **Update Priority 4-5** (Tests/Templates) - As needed

**Estimated time**: 2-3 hours for all priorities

---

**Status**: Core architecture fixes complete ✅
**Next**: Update user-facing documentation (Priority 1)

