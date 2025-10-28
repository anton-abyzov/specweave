# File Organization Enforcement - Root Pollution Prevention

**Date**: 2025-10-27
**Purpose**: Enforce increment-centric organization to prevent polluting user's project root

---

## Problem

Without clear enforcement, AI could create supporting files (logs, scripts, reports) in the project root, causing:
- ❌ Root folder clutter
- ❌ Lost traceability (which increment created which file?)
- ❌ Difficult cleanup (files scattered everywhere)
- ❌ Poor organization (no clear context)

---

## Solution

**MANDATORY**: ALL AI-generated supporting files MUST go into increment-specific folders:
- `.specweave/increments/{increment-id}/logs/`
- `.specweave/increments/{increment-id}/scripts/`
- `.specweave/increments/{increment-id}/reports/`

---

## Implementation

### 1. Framework CLAUDE.md (Updated)

**Location**: Line 92

Added prominent **"🚨 CRITICAL: File Organization (Keep Root Clean!)"** section:

```markdown
## 🚨 CRITICAL: File Organization (Keep Root Clean!)

**MANDATORY**: ALL AI-generated supporting files MUST go into increment folders - NEVER in project root!

**✅ ALLOWED in Root**:
- `CLAUDE.md` (ONLY file SpecWeave adds to user's project)
- User's existing files (unchanged)

**❌ NEVER Create in Root**:
- Logs → `.specweave/increments/{id}/logs/`
- Scripts → `.specweave/increments/{id}/scripts/`
- Reports → `.specweave/increments/{id}/reports/`

**Example**:
❌ WRONG:                          ✅ CORRECT:
project-root/                      .specweave/increments/0001-auth/
├── analysis.md                    ├── reports/analysis.md
├── script.py                      ├── scripts/script.py
└── errors.log                     └── logs/errors.log
```

### 2. User Template (Updated)

**Location**: `src/templates/CLAUDE.md.template`, Line 45

Added comprehensive **"🚨 CRITICAL: File Organization Rules"** section with:

1. **What Goes Where** (clear allowlist/blocklist)
2. **Increment-Centric Organization** (complete example)
3. **Benefits** (why this matters)
4. **Enforcement** (how AI should behave)
5. **Examples** (wrong vs correct)

---

## Rules Summary

### ✅ Allowed in Project Root

1. **CLAUDE.md** - ONLY file SpecWeave adds
2. **User's existing files** - Unchanged (package.json, src/, etc.)
3. **Standard config files** - .env, .gitignore, tsconfig.json, etc.

### ❌ NEVER Create in Root

| File Type | Goes To | Example |
|-----------|---------|---------|
| **Execution logs** | `.specweave/increments/{id}/logs/` | `execution.log`, `errors.log`, `ai-session.log` |
| **Helper scripts** | `.specweave/increments/{id}/scripts/` | `migration.sql`, `setup.sh`, `validation.py` |
| **Analysis reports** | `.specweave/increments/{id}/reports/` | `completion.md`, `test-results.md`, `performance.md` |
| **Temporary files** | `.specweave/increments/{id}/logs/` | Any temp files |

---

## AI Behavior Enforcement

**When AI generates ANY supporting file**:

### Step 1: Identify Current Increment

```
Question: Which feature/increment are you working on?
Answer: 0001-user-authentication
```

### Step 2: Determine File Type

```
Question: What type of file is this?
- Execution log → logs/
- Helper script → scripts/
- Analysis report → reports/
```

### Step 3: Create in Increment Folder

```bash
# CORRECT path:
.specweave/increments/0001-user-authentication/logs/execution.log

# NEVER:
project-root/execution.log  # ❌ WRONG!
```

---

## Examples

### Example 1: Migration Script

**❌ WRONG**:
```
project-root/
├── migrate-users-to-v2.py          # NO! Pollutes root
└── CLAUDE.md
```

**✅ CORRECT**:
```
.specweave/increments/0002-user-migration/
├── scripts/
│   └── migrate-users-to-v2.py      # YES! Organized
```

### Example 2: Execution Logs

**❌ WRONG**:
```
project-root/
├── deployment.log                   # NO! Pollutes root
├── errors.log                       # NO! Pollutes root
└── CLAUDE.md
```

**✅ CORRECT**:
```
.specweave/increments/0003-deployment/
├── logs/
│   ├── deployment.log               # YES! Organized
│   └── errors.log                   # YES! Organized
```

### Example 3: Analysis Reports

**❌ WRONG**:
```
project-root/
├── performance-analysis.md          # NO! Pollutes root
├── completion-report.md             # NO! Pollutes root
└── CLAUDE.md
```

**✅ CORRECT**:
```
.specweave/increments/0004-optimization/
├── reports/
│   ├── performance-analysis.md      # YES! Organized
│   └── completion-report.md         # YES! Organized
```

---

## Benefits

### 1. Complete Traceability

```
.specweave/increments/0001-user-auth/
├── spec.md                          # What we're building
├── plan.md                          # How we're building it
├── tasks.md                         # Implementation steps
├── logs/execution.log               # ← What happened during implementation
├── scripts/migration.sql            # ← Helper scripts created
└── reports/completion.md            # ← Results and analysis
```

**Know exactly which increment created which files!**

### 2. Easy Cleanup

```bash
# Remove entire feature (including ALL supporting files):
rm -rf .specweave/increments/0001-user-auth/

# vs scattered files:
# Find and delete: execution.log, migration.sql, completion.md, errors.log...
# (scattered across project root - easy to miss files!)
```

### 3. Clear Context

```
Working on increment 0001-user-auth?
→ Look in .specweave/increments/0001-user-auth/
→ ALL related files in one place
→ Logs, scripts, reports - everything you need
```

### 4. No Root Clutter

```
project-root/               # Clean!
├── .specweave/             # Framework
├── .claude/                # Installed components
├── CLAUDE.md               # Development guide (ONLY file we add)
├── src/                    # User's code (unchanged)
├── package.json            # User's files (unchanged)
└── .gitignore              # User's files (unchanged)
```

---

## Verification

### Check Framework CLAUDE.md

```bash
grep -n "🚨 CRITICAL: File Organization" CLAUDE.md
# Output: 92:## 🚨 CRITICAL: File Organization (Keep Root Clean!)
```

### Check User Template

```bash
grep -n "🚨 CRITICAL: File Organization" src/templates/CLAUDE.md.template
# Output: 45:## 🚨 CRITICAL: File Organization Rules
```

### Verify Structure

Both files now have:
- ✅ Prominent placement (near top of file)
- ✅ Clear rules (allowlist/blocklist)
- ✅ Examples (wrong vs correct)
- ✅ Benefits (why it matters)
- ✅ Enforcement logic (how AI should behave)

---

## Impact

### Before

```
User's project-root/
├── CLAUDE.md
├── analysis-report.md              # ← AI-generated, pollutes root
├── migration-script.py             # ← AI-generated, pollutes root
├── execution.log                   # ← AI-generated, pollutes root
├── performance-test.md             # ← AI-generated, pollutes root
├── validation-script.sh            # ← AI-generated, pollutes root
└── src/                            # User's code buried in clutter
```

**Problems**: Cluttered, hard to clean up, poor traceability

### After

```
User's project-root/
├── CLAUDE.md                       # ONLY file we add
├── .specweave/
│   └── increments/
│       ├── 0001-feature/
│       │   ├── logs/execution.log
│       │   ├── scripts/migration-script.py
│       │   └── reports/
│       │       ├── analysis-report.md
│       │       └── performance-test.md
│       └── 0002-enhancement/
│           └── scripts/validation-script.sh
└── src/                            # User's code (clean!)
```

**Benefits**: Clean root, organized, easy cleanup, complete traceability

---

## Files Updated

1. **CLAUDE.md** (framework) - Line 92 - Added critical section
2. **src/templates/CLAUDE.md.template** (user template) - Line 45 - Added comprehensive section

---

## Conclusion

**Root pollution prevention is now ENFORCED**:

- ✅ Prominent placement in both files
- ✅ Clear rules (what goes where)
- ✅ Examples (wrong vs correct)
- ✅ AI behavior defined (enforcement logic)
- ✅ Benefits explained (why it matters)

**Result**: User's project root stays CLEAN, all supporting files organized in increment folders with complete traceability!

---

**Generated**: 2025-10-27
**Status**: ✅ Complete
