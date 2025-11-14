
# CLAUDE.md Size Reduction Proposal

**Current Size**: 4,165 lines (MASSIVE!)
**Target Size**: ~1,500 lines (64% reduction)
**Goal**: Keep it as **contributor quick reference**, not comprehensive documentation

---

## 🎯 Core Principle

**CLAUDE.md should be**:
- ✅ Quick reference for contributors working on SpecWeave itself
- ✅ Critical architecture rules that MUST be known
- ✅ Links to detailed docs (not the docs themselves)

**CLAUDE.md should NOT be**:
- ❌ User-facing documentation (that's Docusaurus)
- ❌ Feature tutorials (that's docs.spec-weave.com)
- ❌ Marketing content ("Why Claude Code is best")
- ❌ Complete implementation guides (link to them)

---

## 📊 Size Breakdown & Recommendations

### 1. ❌ REMOVE ENTIRELY (Move to Docusaurus)

#### "Claude Code Skills - Quick Reference" (~150 lines)
**Current**: Complete tutorial on Claude Code skills system
**Issue**: This is for USERS, not SpecWeave contributors
**Action**: Move to `docs-site/docs/contributors/claude-code-skills.md`
**CLAUDE.md**: Replace with 2-line link: "See [Claude Code Skills Guide](https://docs.spec-weave.com/contributors/claude-code-skills)"

#### "Why Claude Code is Best-in-Class" (~200 lines)
**Current**: Complete comparison table, marketing content
**Issue**: This is positioning/marketing, not contributor guidance
**Action**: Move to `docs-site/docs/why-claude-code.md`
**CLAUDE.md**: Replace with 3 lines:
```markdown
## Tool Support

SpecWeave is Claude Code-first. See [Why Claude Code?](https://docs.spec-weave.com/why-claude-code) for comparison.
```

**Savings**: ~350 lines (8.4%)

---

### 2. 📏 COMPACT HEAVILY (Keep essence, remove verbosity)

#### "🚨 CRITICAL: NEVER POLLUTE PROJECT ROOT!" (~350 lines)
**Current**: Multiple examples, verbose explanations, repetitive "Why This Matters"
**Issue**: The rule is critical, but takes 8.4% of entire document
**Proposal**: Reduce to ~100 lines

**Keep**:
- ✅ The core rule (ALL files → increment folders)
- ✅ One good example (WRONG vs CORRECT)
- ✅ One-line "Why This Matters"

**Remove**:
- ❌ reports/ folder deep-dive (move to separate ADR)
- ❌ Multiple redundant examples
- ❌ Verbose "Why" sections (make concise)
- ❌ Build artifacts section (obvious, add to .gitignore docs)

**After**:
```markdown
## 🚨 CRITICAL: NEVER POLLUTE PROJECT ROOT!

**ALL AI-generated files MUST go into increment folders**, NOT project root!

### ❌ WRONG (Root Files - REJECTED!)
```
/PLUGIN-MIGRATION-COMPLETE.md          # NO!
/SESSION-SUMMARY-2025-10-28.md         # NO!
/ADR-006-DEEP-ANALYSIS.md              # NO!
```

### ✅ CORRECT (Increment Folders)
```
.specweave/increments/0004-plugin-architecture/
├── spec.md, plan.md, tasks.md         # Core files
├── reports/                           # ✅ ALL reports/analysis here!
│   ├── PLUGIN-MIGRATION-COMPLETE.md
│   └── SESSION-SUMMARY.md
├── scripts/                           # ✅ Helper scripts here!
└── logs/                              # ✅ Execution logs here!

.specweave/docs/internal/architecture/  # ✅ ADRs here!
└── adr/0006-deep-analysis.md
```

**Why**: Complete traceability, easy cleanup, no root clutter.

**Only these files allowed in root**: README.md, CLAUDE.md, CHANGELOG.md, package.json, tsconfig.json, .gitignore, src/, tests/, plugins/.

**Before committing**: `git status` - If you see .md files in root, MOVE THEM!

**See**: [File Organization Guide](https://docs.spec-weave.com/contributors/file-organization) for complete rules.
```

**Savings**: ~250 lines

#### "Increment Discipline" (~400 lines)
**Current**: Very verbose with multiple examples, redundant explanations
**Proposal**: Reduce to ~150 lines

**Keep**:
- ✅ Core philosophy (1 active = focus)
- ✅ WIP limits table
- ✅ The Iron Rule
- ✅ Three options for closing

**Remove**:
- ❌ Verbose "why this rule exists" (make 2 sentences)
- ❌ Multiple scenario examples (keep 1)
- ❌ Real-world example section (obvious)
- ❌ Exception details (move to command docs)

**Savings**: ~250 lines

#### "Test-Aware Planning" (~300 lines)
**Current**: Complete architecture explanation, multiple examples
**Proposal**: Reduce to ~100 lines

**Keep**:
- ✅ NEW format summary (tests embedded in tasks.md)
- ✅ Quick workflow example (condensed)
- ✅ Link to detailed docs

**Remove**:
- ❌ OLD format details (deprecated)
- ❌ Verbose "Why the change?" section
- ❌ Complete spec.md excerpt examples
- ❌ TDD workflow mode details (link to docs)

**Savings**: ~200 lines

#### "Specs Architecture: Two Locations Explained" (~400 lines)
**Current**: Very verbose conceptual explanation with multiple examples
**Proposal**: Reduce to ~100 lines

**Keep**:
- ✅ Core concept (2 locations: permanent vs temporary)
- ✅ Quick table comparison
- ✅ Link to detailed guide

**Remove**:
- ❌ Verbose analogies (Wikipedia vs Sticky Notes)
- ❌ Multiple workflow examples
- ❌ Typical workflow phase-by-phase
- ❌ Relationship tree examples

**Savings**: ~300 lines

#### "Living Docs Sync" (~250 lines in hooks section)
**Current**: Complete implementation details, intelligent mode architecture
**Proposal**: Reduce to ~80 lines

**Keep**:
- ✅ What it does (automatic sync)
- ✅ Configuration snippet
- ✅ Link to detailed architecture

**Remove**:
- ❌ Complete intelligent mode architecture
- ❌ Classification system details
- ❌ Project detection algorithm
- ❌ Docusaurus frontmatter examples

**Savings**: ~170 lines

#### "Hooks Architecture" (~300 lines)
**Current**: Complete hook implementation details, session detection algorithm
**Proposal**: Reduce to ~100 lines

**Keep**:
- ✅ How hooks work (brief)
- ✅ What gets installed
- ✅ Link to hook documentation

**Remove**:
- ❌ Complete session-end detection algorithm
- ❌ Pre-tool-use hook implementation details
- ❌ Verbose "How It Works" scenarios

**Savings**: ~200 lines

#### "Status Line Feature" (~200 lines)
**Current**: Complete implementation details, benchmarks, cache architecture
**Proposal**: Reduce to ~50 lines OR move to docs

**Keep** (if staying):
- ✅ What it does (brief)
- ✅ Configuration
- ✅ Link to detailed docs

**Remove**:
- ❌ Complete cache architecture
- ❌ Performance benchmarks
- ❌ Multi-window support details
- ❌ Implementation files list

**Better**: Move entire section to `docs-site/docs/features/status-line.md`

**Savings**: ~150 lines

#### "Multi-Project Sync Architecture" (~350 lines)
**Current**: Complete architecture, profiles, time ranges, rate limiting
**Proposal**: Reduce to ~80 lines OR move to docs

**Keep** (if staying):
- ✅ Core concept (3-layer architecture)
- ✅ Quick profile example
- ✅ Link to detailed guide

**Remove**:
- ❌ Complete sync profiles documentation
- ❌ Project contexts details
- ❌ Time range filtering table
- ❌ Rate limiting protection details

**Better**: Move to `docs-site/docs/features/multi-project-sync.md`

**Savings**: ~270 lines

**Total Compact Savings**: ~1,790 lines

---

### 3. ✅ KEEP BUT IMPROVE (Critical for contributors)

#### "Project Architecture" (~200 lines)
**Action**: Keep as-is, it's essential source of truth
**Improvement**: Add TOC links at top

#### "Directory Structure" (~150 lines)
**Action**: Keep, it's a critical reference
**Improvement**: Compact inline comments slightly

#### "Plugin Architecture" (~250 lines)
**Action**: Keep core concepts
**Improvement**: Move plugin creation tutorial to docs, keep just the decision tree

#### "Development Workflow" (~150 lines)
**Action**: Keep, essential for contributors
**Improvement**: None needed

#### "Release Process" (~100 lines)
**Action**: Keep, essential for maintainers
**Improvement**: None needed

---

### 4. 🔄 MOVE TO DOCUSAURUS (User-facing features)

These are feature documentation, not contributor guidance:

| Section | Lines | Move To |
|---------|-------|---------|
| Translation Workflow | ~200 | `docs-site/docs/features/translation.md` |
| Living Completion Reports | ~150 | `docs-site/docs/features/completion-reports.md` |
| Enterprise Specs Organization | ~250 | `docs-site/docs/features/enterprise-specs.md` |
| Status Line Feature | ~200 | `docs-site/docs/features/status-line.md` |
| Multi-Project Sync | ~350 | `docs-site/docs/features/multi-project-sync.md` |

**Total**: ~1,150 lines → Move to Docusaurus, replace with links

---

## 📐 Summary of Reductions

| Action | Lines Removed | % of Total |
|--------|---------------|------------|
| **Remove entirely** (move to docs) | 350 | 8.4% |
| **Compact heavily** | 1,790 | 43.0% |
| **Move to Docusaurus** | 1,150 | 27.6% |
| **TOTAL REDUCTION** | **3,290** | **79.0%** |

**Result**: 4,165 → ~875 lines (core contributor reference)

---

## ✨ Proposed New Structure (875 lines)

```markdown
# SpecWeave - Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework

This CLAUDE.md is for **contributors to SpecWeave itself**.

**Quick Links**:
- 📘 [Full Documentation](https://docs.spec-weave.com)
- 👥 [User Guide](https://docs.spec-weave.com/getting-started)
- 🏗️ [Architecture](https://docs.spec-weave.com/architecture)
- 🔧 [Features](https://docs.spec-weave.com/features)

---

## Table of Contents
1. [Critical Rules](#critical-rules)
2. [Project Architecture](#project-architecture)
3. [Directory Structure](#directory-structure)
4. [Plugin System](#plugin-system)
5. [Development Workflow](#development-workflow)
6. [Release Process](#release-process)
7. [Quick Reference](#quick-reference)

---

## Critical Rules

### 🚨 NEVER POLLUTE PROJECT ROOT!
[Compacted version - ~100 lines]

### Increment Discipline
[Compacted version - ~150 lines]

### Root-Level .specweave/ Only
[Keep current - ~100 lines]

---

## Project Architecture

[Keep current - ~200 lines]

---

## Directory Structure

[Keep current - ~150 lines]

---

## Plugin System

**SpecWeave is 100% Claude Code plugins**: [Learn More](https://docs.spec-weave.com/architecture/plugins)

[Decision tree only - ~80 lines]

For:
- Creating plugins: See [Plugin Guide](https://docs.spec-weave.com/contributors/creating-plugins)
- Available plugins: See [Plugin Catalog](https://docs.spec-weave.com/plugins)

---

## Development Workflow

[Keep current - ~150 lines]

---

## Release Process

[Keep current - ~100 lines]

---

## Quick Reference

**Commands**: [Keep table]
**Build & Test**: [Keep list]
**File Structure**: [Keep summary]

---

**For detailed documentation**: https://docs.spec-weave.com
**Last Updated**: 2025-11-12
```

---

## 🎯 Implementation Plan

### Phase 1: Create Docusaurus Pages (~2 hours)
1. Create `docs-site/docs/contributors/` directory
2. Move sections to appropriate pages:
   - `claude-code-skills.md`
   - `file-organization.md`
   - `creating-plugins.md`
3. Create `docs-site/docs/features/` pages:
   - `translation.md`
   - `completion-reports.md`
   - `enterprise-specs.md`
   - `status-line.md`
   - `multi-project-sync.md`
4. Create `docs-site/docs/why-claude-code.md`

### Phase 2: Compact CLAUDE.md (~1 hour)
1. Replace removed sections with links
2. Compact verbose sections (keep essence)
3. Add TOC at top
4. Verify all links work

### Phase 3: Validate (~30 minutes)
1. Check no broken links
2. Verify critical rules preserved
3. Test that contributors can still find info quickly
4. Get maintainer approval

---

## ✅ Benefits

**For Contributors**:
- ✅ Find critical rules in <2 minutes (not 10+ minutes)
- ✅ Less overwhelming onboarding
- ✅ Clear separation: rules vs features

**For Users**:
- ✅ Feature docs in proper location (Docusaurus)
- ✅ Better navigation
- ✅ Searchable, categorized

**For Maintainers**:
- ✅ Easier to keep CLAUDE.md updated
- ✅ Single source of truth for features (Docusaurus)
- ✅ Less duplication

---

## 🤔 Questions for Maintainer

1. **Target size**: Is ~875 lines acceptable? Or aim for even smaller (~600)?
2. **Docusaurus structure**: OK with proposed `contributors/` and `features/` directories?
3. **Priority**: Which sections should we tackle first?
4. **Tone**: Keep current detailed style or make even more concise?

---

## 📝 Next Steps

**Option A (Aggressive)**: Reduce to ~875 lines (remove + compact + move)
**Option B (Conservative)**: Reduce to ~1,500 lines (compact only, keep most content)
**Option C (Ultra-lean)**: Reduce to ~600 lines (absolute minimum, heavy linking)

**Recommendation**: **Option A** - 875 lines is perfect balance (comprehensive enough, not overwhelming)
