# Progressive Disclosure Implementation

**Goal**: Reduce CLAUDE.md size by moving detailed rules to skill files and documentation, using Claude Code's progressive disclosure pattern.

**Principle**: Skills load content only when activated → reduces token usage by 60-80%

---

## 🎯 Strategy

**Current Problem**:
- CLAUDE.md: 4,165 lines (HUGE!)
- Contains detailed rules that should be in skills/docs
- Skills already exist but aren't being fully utilized

**Solution**:
```
CLAUDE.md = High-level overview + links
Skills/Docs = Detailed content (loads only when needed)
```

**Example**:
```
❌ Before: CLAUDE.md contains 400 lines of increment discipline rules
✅ After:  CLAUDE.md has 20 lines + link to increment-lifecycle.md (loads when increment-planner skill activates)
```

---

## 📊 Content Mapping

### Phase 1: Move Increment Discipline Rules (Approved!)

**Source**: CLAUDE.md "Increment Discipline" section (~400 lines)

**Destinations**:

1. **increment-lifecycle.md** - Add new section:
   ```markdown
   ## Increment Discipline (The Iron Rule)

   ### Core Philosophy: ONE Active Increment = Maximum Focus

   [Move detailed rules here]
   ```

2. **CLAUDE.md** - Replace with:
   ```markdown
   ## Increment Discipline

   **The Iron Rule**: You CANNOT start increment N+1 until increment N is DONE.

   **Why**: Focus = Quality. Multiple incomplete increments = chaos.

   **For complete rules**: See `.specweave/docs/internal/delivery/guides/increment-lifecycle.md` (auto-loads when using `/specweave:increment`)

   **Quick Reference**:
   - Default: 1 active increment (maximum productivity)
   - Emergency ceiling: 2 active max (hotfix/bug can interrupt)
   - Hard cap: Never >2 active (enforced)
   ```

**Savings**: ~380 lines (9.1%)

---

### Phase 2: Move Increment Naming Rules

**Source**: CLAUDE.md "Increment Naming Convention" section (~50 lines)

**Destination**: `plugins/specweave/skills/increment-planner/SKILL.md`

**Add section**:
```markdown
## Increment Naming Convention

**Format**: `####-descriptive-kebab-case-name`

**Examples**:
- ✅ `0001-core-framework`
- ✅ `0003-intelligent-model-selection`
- ❌ `0003` (rejected - no description)

**Rules**:
- `####` = Zero-padded 4-digit number
- `-descriptive-name` = Kebab-case (lowercase, hyphens)
- Max 50 chars total

**Why**: Clear intent at a glance, searchable, self-documenting
```

**CLAUDE.md**: Replace with link

**Savings**: ~45 lines (1.1%)

---

### Phase 3: Move Test-Aware Planning Details

**Source**: CLAUDE.md "Test-Aware Planning" section (~300 lines)

**Note**: increment-planner skill already has test-aware workflow!

**Action**: Just add link in CLAUDE.md

**CLAUDE.md**: Replace verbose section with:
```markdown
## Test-Aware Planning

**NEW in v0.7.0**: Tests embedded in tasks.md (no separate tests.md).

**Quick Summary**:
- Spec.md: User stories with AC-IDs (AC-US1-01, AC-US1-02)
- Tasks.md: Tasks with embedded test plans (BDD format: Given/When/Then)
- Coverage: 80-90% (realistic, not 100%)

**For complete workflow**: The increment-planner skill contains complete test-aware planning guide (auto-loads when using `/specweave:increment`)

**TDD Mode**: Set `test_mode: TDD` in tasks.md frontmatter for red-green-refactor workflow
```

**Savings**: ~270 lines (6.5%)

---

### Phase 4: Move "NEVER POLLUTE ROOT" Details

**Source**: CLAUDE.md "NEVER POLLUTE ROOT" section (~350 lines)

**Destination**: New file `.specweave/docs/internal/delivery/guides/file-organization.md`

**CLAUDE.md**: Replace verbose section with:
```markdown
## 🚨 CRITICAL: NEVER POLLUTE PROJECT ROOT!

**The Rule**: ALL AI-generated files MUST go into increment folders, NOT project root!

**Examples**:
```
❌ WRONG:
/ANALYSIS-REPORT.md              # NO!
/SESSION-SUMMARY.md              # NO!

✅ CORRECT:
.specweave/increments/0004-plugin-architecture/
├── reports/
│   ├── ANALYSIS-REPORT.md       # ✅
│   └── SESSION-SUMMARY.md       # ✅
```

**Why**: Complete traceability, easy cleanup, no root clutter.

**For complete file organization rules**: See `.specweave/docs/internal/delivery/guides/file-organization.md`

**Before committing**: `git status` - If you see .md files in root, MOVE THEM!
```

**Savings**: ~320 lines (7.7%)

---

## 📉 Total Reduction Summary

| Phase | Lines Saved | % of Total | Status |
|-------|-------------|------------|--------|
| **Increment Discipline** | 380 | 9.1% | ✅ Ready |
| **Naming Convention** | 45 | 1.1% | ✅ Ready |
| **Test-Aware Planning** | 270 | 6.5% | ✅ Ready |
| **File Organization** | 320 | 7.7% | ✅ Ready |
| **TOTAL** | **1,015** | **24.4%** | ✅ **High Confidence** |

**Result**: 4,165 → 3,150 lines (conservative estimate, still 1,000+ lines saved!)

---

## ✅ Implementation Plan

### Step 1: Add Increment Discipline to increment-lifecycle.md

**File**: `.specweave/docs/internal/delivery/guides/increment-lifecycle.md`

**Add new section after "WIP Limits"**:

```markdown
---

## Increment Discipline (The Iron Rule)

### Core Philosophy: ONE Active Increment = Maximum Focus

Simplified from complex per-type limits to **focus-first architecture**:
- ✅ **Default**: 1 active increment (maximum productivity)
- ✅ **Emergency ceiling**: 2 active max (hotfix/bug can interrupt)
- ✅ **Hard cap**: Never >2 active (enforced)

**Why 1?** Research shows:
- 1 task = 100% productivity
- 2 tasks = 20% slower (context switching cost)
- 3+ tasks = 40% slower + more bugs

### The Iron Rule

**⛔ You CANNOT start increment N+1 until increment N is DONE**

This is **NOT negotiable**. It is a **hard enforcement** to prevent:
- Multiple incomplete increments piling up
- No clear source of truth ("which increment are we working on?")
- Living docs becoming stale (sync doesn't know what's current)
- Scope creep (jumping between features without finishing)
- Quality degradation (tests not run, docs not updated)

### What "DONE" Means

An increment is DONE if **ONE** of the following is true:

1. **All tasks completed**: All tasks in `tasks.md` marked `[x] Completed`
2. **Completion report exists**: `COMPLETION-SUMMARY.md` with "✅ COMPLETE" status
3. **Explicit closure**: Closed via `/specweave:done` with documentation

### Enforcement

**When you try to start a new increment**:

```bash
/specweave:increment "new feature"

# If previous increments incomplete:
❌ Cannot create new increment!

Previous increments are incomplete:
- 0002-core-enhancements (73% complete)
- 0003-intelligent-model-selection (50% complete)

💡 Options:
1️⃣  Complete the work: /specweave:do
2️⃣  Close interactively: /specweave:close
3️⃣  Check status: /specweave:status
4️⃣  Force create (DANGEROUS): Add --force flag
```

### Three Options for Closing

When using `/specweave:close`:

**Option 1: Adjust Scope** (Simplest):
- Remove features from spec.md
- Regenerate plan.md and tasks.md
- Now 100% complete!

**Option 2: Move Scope to Next Increment**:
- Transfer incomplete tasks
- Old increment closed
- New increment gets the work

**Option 3: Extend Existing Increment** (Merge Work):
- Don't start new increment
- Update spec.md to include new features
- Add new tasks to tasks.md
- Work on combined scope in ONE increment

### Helper Commands

| Command | Purpose |
|---------|---------|
| `/specweave:status` | Show all increments and completion status |
| `/specweave:close` | Interactive closure of incomplete increments |
| `/specweave:force-close <id>` | Mark all tasks complete (dangerous!) |

### Exception: The `--force` Flag

For **emergencies only** (hotfixes, urgent features):

```bash
/specweave:increment "urgent-security-fix" --force
```

**This bypasses the check** but:
- ✅ Logs the force creation
- ✅ Warns in CLI output
- ✅ Should be explained in PR/standup
- ✅ Should close previous increments ASAP

**Use sparingly!** The discipline exists for a reason.

---
```

**Estimated time**: 10 minutes

---

### Step 2: Update CLAUDE.md with Links

**File**: `/Users/antonabyzov/Projects/github/specweave/CLAUDE.md`

**Find section**: "## Increment Discipline"

**Replace with**:

```markdown
## Increment Discipline

**The Iron Rule**: You CANNOT start increment N+1 until increment N is DONE.

**Core Philosophy**:
- ✅ **Default**: 1 active increment (maximum productivity)
- ✅ **Emergency ceiling**: 2 active max (hotfix/bug can interrupt)
- ✅ **Hard cap**: Never >2 active (enforced)

**Why**: Focus = Quality. Research shows 1 task = 100% productivity, 2 tasks = 20% slower, 3+ = 40% slower + more bugs.

**For complete discipline rules, enforcement, and closing options**: See `.specweave/docs/internal/delivery/guides/increment-lifecycle.md#increment-discipline-the-iron-rule`

This guide auto-loads when using:
- `/specweave:increment` - Creates new increment (enforces discipline)
- `/specweave:close` - Closes incomplete increments
- `/specweave:status` - Shows completion status

**Quick Reference**:
- Complete work: `/specweave:do`
- Close with options: `/specweave:close`
- Check status: `/specweave:status`
- Emergency bypass: `--force` (use sparingly!)
```

**Estimated time**: 5 minutes

**Savings**: ~380 lines!

---

### Step 3: Add Naming Convention to increment-planner Skill

**File**: `plugins/specweave/skills/increment-planner/SKILL.md`

**Add section after "When NOT to Use This Skill"**:

```markdown
---

## Increment Naming Convention

**CRITICAL**: All increments MUST use descriptive names, not just numbers.

**Format**: `####-descriptive-kebab-case-name`

**Examples**:
- ✅ `0001-core-framework`
- ✅ `0002-core-enhancements`
- ✅ `0003-intelligent-model-selection`
- ❌ `0003` (too generic, rejected)
- ❌ `0004` (no description, rejected)

**Rationale**:
- **Clear intent at a glance** - "0003-intelligent-model-selection" tells you exactly what it does
- **Easy to reference** - "the model selection increment" vs "increment 3"
- **Better git history** - Commit messages naturally include feature name
- **Searchable by feature** - `git log --grep="model-selection"` works
- **Self-documenting** - Increment folders are readable without opening files

**Rules**:
- `####` = Zero-padded 4-digit number (0001, 0002, 0003, ...)
- `-descriptive-name` = Kebab-case description (lowercase, hyphens)
- Max 50 chars total (for readability)
- No special characters except hyphens

**Enforcement**:
- `/specweave:increment` command validates naming (rejects bare numbers)
- Code review requirement (descriptive names mandatory)

---
```

**Estimated time**: 5 minutes

---

### Step 4: Update CLAUDE.md Test-Aware Section

**File**: `/Users/antonabyzov/Projects/github/specweave/CLAUDE.md`

**Find section**: "## Test-Aware Planning"

**Replace with**:

```markdown
## Test-Aware Planning

**NEW in v0.7.0**: Tests are now embedded in tasks.md instead of separate tests.md file.

**Quick Summary**:
- **spec.md**: User stories with AC-IDs (AC-US1-01, AC-US1-02, etc.)
- **tasks.md**: Tasks with embedded test plans in BDD format (Given/When/Then)
- **Coverage**: 80-90% (realistic, not 100%)
- **TDD Support**: Set `test_mode: TDD` in tasks.md frontmatter

**Example**:
```markdown
## T-001: Implement Authentication Service

**AC**: AC-US1-01, AC-US1-02

**Test Plan** (BDD):
- **Given** user with valid credentials → **When** login → **Then** receive JWT token

**Test Cases**:
- Unit (`auth.test.ts`): validLogin, invalidPassword, rateLimiting → 90% coverage

**Implementation**: AuthService.ts, bcrypt, JWT generation, Redis rate limiting
```

**For complete test-aware planning workflow**: The `increment-planner` skill contains comprehensive test-aware planning guide (auto-loads when using `/specweave:increment`)

**Validation**: `/specweave:check-tests` shows AC-ID coverage, missing tests, recommendations
```

**Estimated time**: 5 minutes

**Savings**: ~270 lines!

---

## 🎉 Expected Results

### Before (Current State)
- CLAUDE.md: 4,165 lines
- Detailed rules embedded in contributor guide
- Skills/docs underutilized

### After (Phase 1-4 Complete)
- CLAUDE.md: ~3,150 lines (24% reduction!)
- Detailed rules in proper locations:
  - increment-lifecycle.md: Discipline rules (auto-loads with skill)
  - increment-planner skill: Naming + test workflow
  - file-organization.md: File structure rules
- Progressive disclosure working correctly

### Benefits

**For Contributors**:
- ✅ Faster onboarding (CLAUDE.md is now scannable)
- ✅ Find rules quickly (organized by topic)
- ✅ Less overwhelming (20-30 lines per topic vs 300-400)

**For Claude Code**:
- ✅ Context efficiency (skills load only when needed)
- ✅ Better activation (detailed content in skills)
- ✅ Follows best practices (progressive disclosure pattern)

**For Maintainers**:
- ✅ Easier to update (rules in one place)
- ✅ Less duplication (CLAUDE.md references, not copies)
- ✅ Better organization (content in logical locations)

---

## 🚀 Next Phases (Future)

### Phase 5: Move "Why Claude Code is Best" to Docusaurus
**Savings**: ~200 lines

### Phase 6: Move Feature Documentation to Docs
- Translation Workflow → `docs/features/translation.md`
- Status Line → `docs/features/status-line.md`
- Multi-Project Sync → `docs/features/multi-project-sync.md`

**Savings**: ~900 lines

### Phase 7: Compact File Structure and Architecture
- Keep essentials, remove verbosity
**Savings**: ~400 lines

**Total potential**: 4,165 → ~1,500 lines (64% reduction!)

---

## ✅ Decision: Start with Phase 1

**Why Phase 1 First?**:
1. ✅ **High confidence** - Increment lifecycle guide already exists
2. ✅ **Clear benefit** - 380 lines saved (9% reduction)
3. ✅ **Low risk** - Just moving content, not changing it
4. ✅ **Quick** - 20 minutes total implementation
5. ✅ **Tests progressive disclosure** - Validates the approach

**Let's implement Phase 1 now!**
