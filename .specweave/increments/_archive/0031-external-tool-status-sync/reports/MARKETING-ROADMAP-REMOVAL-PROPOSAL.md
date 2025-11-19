# Marketing & Roadmap Content Removal Proposal

**Date**: 2025-11-13
**Context**: Phase 4 cannot use progressive disclosure (only skills can). User requested removing marketing, announcements, roadmaps from CLAUDE.md.

---

## 🎯 Core Principle

**CLAUDE.md should be**: Contributor quick reference for working on SpecWeave itself
**CLAUDE.md should NOT be**: Marketing material, user documentation, version announcements, future plans

---

## 📊 Content Analysis

### 1. Marketing Content (Lines 119-151) - 33 lines

**Section**: "Why Claude Code is Best-in-Class"

**Current Content**:
- Comparison table with Cursor, Copilot, ChatGPT, Gemini
- Marketing language: "10x Better", "ONLY fully reliable option", "100% Reliable"
- Positioning statements: "Anthropic defines the industry standards"
- Tool comparisons with star ratings (⭐⭐⭐⭐⭐ vs ⭐⭐)

**Why Remove?**:
- ❌ This is marketing/positioning, not contributor guidance
- ❌ Comparison tables change frequently (tool updates)
- ❌ Subjective ratings ("60% Less reliable", "40% Manual workflow")
- ❌ Users already chose Claude Code by installing SpecWeave
- ❌ Contributors don't need convincing - they're already here

**Where to Move**:
1. **README.md** - Project-level marketing (GitHub landing page)
2. **Docusaurus** - `/docs/why-claude-code.md` (for users researching tools)
3. **Blog post** - Detailed comparison article on spec-weave.com

**Proposed Replacement** (3 lines):
```markdown
## Tool Support

**CRITICAL**: SpecWeave is Claude Code-first. Other tools (Cursor, Copilot) have limited support.

**Why?** Claude Code provides native hooks, MCP protocol, plugin system, and isolated agent contexts. See [Architecture](https://spec-weave.com/architecture) for details.
```

**Savings**: 30 lines (0.8%)

---

### 2. Future Roadmap (Lines 499-532) - 34 lines

**Section**: "Planned Plugins (future releases)"

**Current Content**:
```markdown
**Planned Plugins** (future releases):

| Plugin | Skills | Agents | Commands | Use When |
|--------|--------|--------|----------|----------|
| **frontend-stack** | 5 | 1 | 0 | React, Next.js, design systems |
| **kubernetes** | 3 | 1 | 2 | Deploying to K8s, Helm |

**Domain Plugins**:

| Plugin | Skills | Agents | Commands | Use When |
|--------|--------|--------|----------|----------|
| **ml-ops** | 3 | 3 | 1 | Machine learning, TensorFlow, PyTorch |
| **observability** | 4 | 4 | 2 | Prometheus, Grafana, monitoring |
... (10 more planned plugins)
```

**Why Remove?**:
- ❌ This is a roadmap, not implemented features
- ❌ Plans change - documentation becomes outdated
- ❌ Contributors should work on CURRENT architecture
- ❌ Causes confusion: "Wait, where's the ml-ops plugin?"
- ❌ Future plans belong in GitHub Projects, not contributor guide

**Where to Move**:
1. **GitHub Projects** - Roadmap board (https://github.com/anton-abyzov/specweave/projects)
2. **ROADMAP.md** - Separate file in root (optional)
3. **Docusaurus** - `/docs/roadmap.md` (for users wanting to see future)

**Proposed Replacement** (2 lines):
```markdown
**Available Plugins**: See `plugins/` directory or [Plugin Catalog](https://spec-weave.com/plugins).
**Plugin Roadmap**: See [GitHub Projects](https://github.com/anton-abyzov/specweave/projects) for planned plugins.
```

**Savings**: 32 lines (0.9%)

---

### 3. Version Announcements (Multiple Locations) - ~90 lines

**Pattern**: "NEW in v0.X.X", "(v0.X.X+)", "CHANGES (v0.X.X)"

**Found Instances**:

#### A. Line 198: Test-Aware Planning
```markdown
**NEW in v0.7.0**: Tests embedded in tasks.md (no separate tests.md).
```

#### B. Line 1278: Enterprise Specs
```markdown
**NEW in v0.20.0**: Living docs specs organized by feature domain...
```

#### C. Line 2032: Pre-Tool-Use Hook
```markdown
Scenario 2: Question WITHOUT task completion (NEW!)
```

#### D. Line 2101: Intelligent Living Docs
```markdown
**🧠 INTELLIGENT LIVING DOCS SYNC (v0.18.0+)**
```

#### E. Line 2110: Intelligent Mode
```markdown
2. **Intelligent Mode** (NEW in v0.18.0+):
```

#### F. Line 2277: Hooks Architecture
```markdown
**🔧 HOOKS ARCHITECTURE CHANGES (v0.13.0)**
```

#### G. Line 2336: GitHub Auto-Creation
```markdown
**GitHub Issue Auto-Creation** (NEW in v0.8.20+):
```

#### H. Line 2467: Metadata Validation
```markdown
**✅ Metadata Validation & Fallback Creation** (NEW in v0.14.0+):
```

#### I. Line 2572: Status Line
```markdown
**NEW in v0.14.0**: Ultra-fast status line showing current increment progress...
```

**Why Remove?**:
- ❌ Version-specific announcements become stale
- ❌ Contributors care about CURRENT architecture, not when it was added
- ❌ Change history belongs in CHANGELOG.md or git commits
- ❌ Clutters the guide with temporal information
- ❌ "NEW" is subjective (new to whom? as of when?)

**Proposed Change**: Remove all version prefixes

**Before**:
```markdown
**NEW in v0.7.0**: Tests embedded in tasks.md (no separate tests.md).
```

**After**:
```markdown
Tests embedded in tasks.md (no separate tests.md).
```

**Before**:
```markdown
**🧠 INTELLIGENT LIVING DOCS SYNC (v0.18.0+)**

**What Changed**: External tool sync logic...

**Before (v0.12.x)**:
...

**After (v0.13.0+)**:
...
```

**After**:
```markdown
**Intelligent Living Docs Sync**

Classifies content (user stories, architecture, ADRs) and distributes to appropriate folders.
```

**Savings**: ~90 lines (2.4%) by removing version annotations and "What Changed" historical narratives

---

## 📐 Summary of Removals

| Content Type | Lines | % of Total | Action |
|--------------|-------|------------|--------|
| **Marketing** ("Why Claude Code is Best") | 30 | 0.8% | Remove, move to README.md |
| **Roadmap** ("Planned Plugins") | 32 | 0.9% | Remove, move to GitHub Projects |
| **Version Announcements** (9 instances) | 90 | 2.4% | Remove version prefixes |
| **TOTAL** | **152** | **4.1%** | |

**Current Size**: 3,718 lines (after Phase 3)
**After Removal**: ~3,566 lines (4.1% reduction)
**Cumulative Total**: 599 lines saved (14.4% reduction from original 4,165 lines)

---

## ✅ Proposed Changes

### Change 1: Remove Marketing Section (Lines 119-151)

**Replace 33 lines with 3 lines**:

```markdown
## Tool Support

**CRITICAL**: SpecWeave is Claude Code-first. Other tools (Cursor, Copilot) have limited support.

**Why?** Claude Code provides native hooks, MCP protocol, plugin system, and isolated agent contexts. See [Architecture](https://spec-weave.com/architecture) for technical details.
```

**Content moves to**:
- README.md (project marketing for GitHub landing page)
- docs-site/docs/why-claude-code.md (user documentation)

---

### Change 2: Remove Roadmap Section (Lines 499-532)

**Replace 34 lines with 2 lines**:

```markdown
**Available Plugins**: See `plugins/` directory or [Plugin Catalog](https://spec-weave.com/plugins).
**Plugin Roadmap**: See [GitHub Projects](https://github.com/anton-abyzov/specweave/projects) for planned plugins.
```

**Content moves to**:
- GitHub Projects board (roadmap management)
- ROADMAP.md (optional root file)
- docs-site/docs/roadmap.md (user-facing)

---

### Change 3: Remove Version Announcements (9 instances)

**Pattern**: Remove "NEW in v0.X.X", "(v0.X.X+)", "What Changed in v0.X.X"

**Examples**:

**Before**:
```markdown
**NEW in v0.7.0**: Tests embedded in tasks.md (no separate tests.md).
```

**After**:
```markdown
Tests embedded in tasks.md (no separate tests.md).
```

---

**Before**:
```markdown
**🧠 INTELLIGENT LIVING DOCS SYNC (v0.18.0+)**

**Two Sync Modes**:

1. **Simple Mode** (Legacy):
   - Copies entire spec.md...
   - Use when: Single project

2. **Intelligent Mode** (NEW in v0.18.0+):
   - Parses spec.md into sections...
```

**After**:
```markdown
**Intelligent Living Docs Sync**

Classifies content (user stories, architecture, ADRs) and distributes to appropriate folders.

**Two Sync Modes**:
- **Simple**: Copies entire spec.md as single file
- **Intelligent**: Parses and distributes by category (user stories, ADRs, etc.)
```

---

**Before**:
```markdown
**🔧 HOOKS ARCHITECTURE CHANGES (v0.13.0)**

**What Changed**: External tool sync logic moved from core plugin to respective plugin hooks.

**Before (v0.12.x)**:
```
Core hook: 452 lines (embedded GitHub sync)
```

**After (v0.13.0+)**:
```
Core hook: 330 lines (core concerns only)
GitHub plugin: 241 lines (GitHub sync separate)
```
```

**After**:
```markdown
**Hooks Architecture**

External tool sync (GitHub, JIRA, ADO) is handled by plugin-specific hooks, not core:
- Core hook: Sound, living docs, translation, reflection
- GitHub plugin hook: Issue updates, progress comments
- JIRA plugin hook: Issue status updates
- ADO plugin hook: Work item updates
```

**Apply this pattern to all 9 instances**:
1. Test-Aware Planning (line 198)
2. Enterprise Specs (line 1278)
3. Pre-Tool-Use Hook (line 2032)
4. Intelligent Living Docs (line 2101)
5. Intelligent Mode (line 2110)
6. Hooks Architecture (line 2277)
7. GitHub Auto-Creation (line 2336)
8. Metadata Validation (line 2467)
9. Status Line (line 2572)

---

## 🎯 Benefits

**For Contributors**:
- ✅ Focus on CURRENT architecture, not history
- ✅ No confusion about planned vs implemented
- ✅ Faster to find essential information
- ✅ Less marketing noise

**For Maintainers**:
- ✅ Less to update when versions change
- ✅ Marketing in appropriate place (README.md, docs)
- ✅ Roadmap managed in GitHub Projects
- ✅ CLAUDE.md stays focused on contribution workflow

**For New Contributors**:
- ✅ Clear what's implemented NOW
- ✅ No outdated "NEW" labels
- ✅ Roadmap separate from contributor guide

---

## 📝 Implementation Plan

### Step 1: Remove Marketing (15 minutes)

1. Remove lines 119-151 ("Why Claude Code is Best-in-Class")
2. Replace with 3-line Tool Support section
3. Move content to:
   - README.md (add "Why Claude Code?" section)
   - docs-site/docs/why-claude-code.md (create new page)

### Step 2: Remove Roadmap (10 minutes)

1. Remove lines 499-532 ("Planned Plugins")
2. Replace with 2-line reference to GitHub Projects
3. Create GitHub Projects board for plugin roadmap (if not exists)
4. Optional: Create ROADMAP.md in root

### Step 3: Remove Version Announcements (30 minutes)

1. Find all instances (9 total)
2. Remove version prefixes ("NEW in v0.X.X", "(v0.X.X+)")
3. Simplify historical narratives ("Before/After" comparisons)
4. Keep technical content, remove temporal context

### Total Time: ~55 minutes

---

## 🤔 Questions for Maintainer

1. **Marketing Content**: Should we move comparison table to README.md or docs-site?
2. **Roadmap**: Do you want ROADMAP.md in root or just GitHub Projects?
3. **Version Announcements**: Remove ALL version references or keep major architectural changes (v0.13.0 hooks refactor)?
4. **Implementation**: Approve all 3 changes or prioritize?

---

## 📊 Comparison: Before vs After

### Before (3,718 lines)
- ✅ Comprehensive BUT verbose
- ❌ Marketing mixed with contributor guidance
- ❌ Roadmap creates false expectations
- ❌ Version announcements clutter the guide

### After (~3,566 lines)
- ✅ Focused contributor quick reference
- ✅ Marketing in appropriate location (README.md)
- ✅ Roadmap managed separately (GitHub Projects)
- ✅ Current architecture, not historical narrative

---

## ✅ Success Criteria

**Phase 4 Goals**:
- [x] Identify ALL marketing content (33 lines)
- [x] Identify ALL roadmap content (34 lines)
- [x] Identify ALL version announcements (9 instances, ~90 lines)
- [x] Propose clear removal strategy
- [x] Show where content should move
- [ ] Get maintainer approval
- [ ] Implement changes

**Result**: 4.1% reduction (152 lines) by removing non-contributor content

---

## 🏆 Cumulative Progress

**Original CLAUDE.md**: 4,165 lines (100%)

**After Phase 1** (Increment Discipline): 3,864 lines (-301, -7.2%)
**After Phase 2** (Naming Convention): 3,838 lines (-26, -0.7%)
**After Phase 3** (Test-Aware Planning): 3,718 lines (-120, -2.9%)
**After Phase 4** (Marketing/Roadmap): ~3,566 lines (-152, -4.1%)

**Total Reduction**: 599 lines (14.4%)

---

## 🚀 Next Potential Phases

**Phase 5**: Move verbose feature sections to Docusaurus
- Status Line Feature (~200 lines)
- Living Completion Reports (~150 lines)
- Enterprise Specs Organization (~300 lines)
- Multi-Project Sync Architecture (~250 lines)

**Potential Additional Savings**: ~900 lines (24% more reduction)

**If Phase 5 Complete**: 4,165 → 2,666 lines (36% total reduction)

---

**Implementation By**: Claude (marketing/roadmap removal specialist)
**Reviewed By**: Pending
**Approved By**: Pending
**Recommendation**: Approve Phase 4 - removes marketing noise, keeps technical content focused

