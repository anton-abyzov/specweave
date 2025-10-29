# Tool-Specific Files Removal - AGENTS.md Refactor

**Date:** 2025-10-28
**Status:** ✅ COMPLETED
**Build:** ✅ Passing

---

## Summary

Removed redundant tool-specific configuration files (.cursorrules, .github/copilot/instructions.md, SPECWEAVE-MANUAL.md) in favor of the universal **AGENTS.md standard** (https://agents.md/).

**Result:** Simplified architecture with single source of truth for all non-Claude tools.

---

## What Changed

### Files Removed

1. ❌ `src/adapters/cursor/.cursorrules` (replaced by AGENTS.md)
2. ❌ `src/adapters/copilot/.github/copilot/instructions.md` (replaced by AGENTS.md)
3. ❌ `src/adapters/generic/SPECWEAVE-MANUAL.md` (replaced by AGENTS.md)

### Files Kept

✅ `src/adapters/cursor/.cursor/context/*.md` - These provide actual value (@ shortcuts)
✅ `src/templates/AGENTS.md.template` - Universal standard for ALL tools
✅ `src/templates/CLAUDE.md.template` - Native Claude Code features

### Adapters Updated

#### 1. CursorAdapter (`src/adapters/cursor/adapter.ts`)

**Before:**
- Created `.cursorrules` with workflow instructions
- Created `.cursor/context/*.md` for @ shortcuts
- Semi-automation via custom instructions file

**After:**
- Removed `.cursorrules` (AGENTS.md replaces it)
- Kept `.cursor/context/*.md` (actual Cursor-specific value)
- Semi-automation via universal AGENTS.md standard

**Changes:**
- Updated description: "Semi-automation with AGENTS.md and @ context shortcuts"
- Removed `.cursorrules` from `getFiles()` list
- Updated install message to reference AGENTS.md
- Updated `getInstructions()` to explain how Cursor reads AGENTS.md

#### 2. CopilotAdapter (`src/adapters/copilot/adapter.ts`)

**Before:**
- Created `.github/copilot/instructions.md` with workspace instructions
- Basic automation via custom instructions file

**After:**
- No files created (AGENTS.md is enough)
- Basic automation via universal AGENTS.md standard
- Essentially a no-op adapter (Copilot just reads AGENTS.md)

**Changes:**
- Updated description: "Basic automation with AGENTS.md"
- `getFiles()` now returns empty array
- `detect()` always returns false (manual selection only)
- Updated install message: "Copilot will automatically read AGENTS.md"
- Updated `getInstructions()` to explain how Copilot reads AGENTS.md

#### 3. GenericAdapter (`src/adapters/generic/adapter.ts`)

**Before:**
- Created `SPECWEAVE-MANUAL.md` with step-by-step instructions
- Manual workflow via custom instructions file

**After:**
- No files created (AGENTS.md is enough)
- Manual workflow via universal AGENTS.md standard
- Users copy-paste from AGENTS.md to any AI tool

**Changes:**
- Updated description: "AGENTS.md works with ANY AI tool"
- `getFiles()` now returns empty array
- Updated install message: "AGENTS.md works with any AI tool"
- Updated `getInstructions()` to explain copy-paste workflow with AGENTS.md

---

## Architecture Before

```
specweave init my-project (Cursor)
    ↓
Creates:
    ✅ AGENTS.md (universal)
    ❌ .cursorrules (redundant duplicate)
    ✅ .cursor/context/*.md (@ shortcuts)

specweave init my-project (Copilot)
    ↓
Creates:
    ✅ AGENTS.md (universal)
    ❌ .github/copilot/instructions.md (redundant duplicate)

specweave init my-project (Generic)
    ↓
Creates:
    ✅ AGENTS.md (universal)
    ❌ SPECWEAVE-MANUAL.md (redundant duplicate)
```

**Problem:** 4+ files with duplicate content that will diverge over time

---

## Architecture After

```
specweave init my-project (Claude Code)
    ↓
Creates:
    ✅ CLAUDE.md (native features)
    ✅ AGENTS.md (universal fallback)
    ✅ .claude/* (skills, agents, commands)

specweave init my-project (Cursor)
    ↓
Creates:
    ✅ AGENTS.md (universal - Cursor reads automatically)
    ✅ .cursor/context/*.md (@ shortcuts for quick context)

specweave init my-project (Copilot)
    ↓
Creates:
    ✅ AGENTS.md (universal - Copilot reads automatically)
    (No other files needed!)

specweave init my-project (Generic)
    ↓
Creates:
    ✅ AGENTS.md (universal - any AI can read)
    (No other files needed!)
```

**Solution:** Single source of truth (AGENTS.md) for all non-Claude tools

---

## Benefits

### 1. Simplicity
- **Before:** 4+ files with duplicate content
- **After:** 1 universal file (AGENTS.md)

### 2. Maintainability
- **Before:** Update workflow? Change 4 files
- **After:** Update workflow? Change 1 file

### 3. Consistency
- **Before:** Files diverge over time (forgot to update one)
- **After:** Impossible to diverge (only one file)

### 4. Standards Compliance
- **Before:** Proprietary files (.cursorrules, .github/copilot/*)
- **After:** Industry standard (agents.md)

### 5. User Experience
- **Before:** "Which file do I read? .cursorrules or AGENTS.md?"
- **After:** "Read AGENTS.md (works everywhere!)"

### 6. Adapter Simplicity
- **Before:** Each adapter creates custom files
- **After:** Most adapters create nothing (AGENTS.md already exists)

---

## What AGENTS.md Contains

From `src/templates/AGENTS.md.template`:

✅ Project overview
✅ Project structure (.specweave/ folders)
✅ Agent role definitions (PM, Architect, DevOps, etc.)
✅ Skill capability definitions (increment-planner, context-loader, etc.)
✅ Complete workflows (creating increments)
✅ Templates (spec.md, plan.md, tasks.md)
✅ Build/test commands
✅ Code style guidelines
✅ Testing strategy
✅ Security considerations
✅ Finding agents/skills
✅ Important reminders

**This is everything** that was in .cursorrules, .github/copilot/instructions.md, and SPECWEAVE-MANUAL.md!

---

## How Tools Use AGENTS.md

### Cursor
- Automatically reads AGENTS.md on project open
- Understands project structure and workflows
- User says: "Create increment for auth"
- Cursor follows AGENTS.md instructions to create spec.md, plan.md, tasks.md

### GitHub Copilot
- Automatically reads AGENTS.md for workspace context
- Provides better code suggestions based on AGENTS.md patterns
- User types in spec.md, Copilot suggests SpecWeave-compliant content

### Generic (ChatGPT, Claude web, Gemini, etc.)
- User opens AGENTS.md in browser
- Copies "Creating a Feature Increment" section
- Pastes into ChatGPT/Claude/Gemini
- AI generates content following AGENTS.md workflow
- User saves generated content to files

### Claude Code
- Reads CLAUDE.md (native features reference)
- AGENTS.md also available as fallback/documentation

---

## Testing

### Build Status
```bash
npm run build
```
✅ **PASSED** - No TypeScript errors

### Next Steps for Manual Testing

1. **Test Cursor:**
   ```bash
   specweave init test-cursor
   # Verify only AGENTS.md + .cursor/context/*.md created
   # Open in Cursor
   # Ask: "Create increment for user auth"
   # Verify Cursor follows AGENTS.md workflow
   ```

2. **Test Copilot:**
   ```bash
   specweave init test-copilot
   # Verify only AGENTS.md created (no .github/copilot/*)
   # Open in VS Code with Copilot
   # Start typing in spec.md
   # Verify Copilot suggests SpecWeave patterns
   ```

3. **Test Generic:**
   ```bash
   specweave init test-generic
   # Verify only AGENTS.md created (no SPECWEAVE-MANUAL.md)
   # Open AGENTS.md
   # Copy workflow section to ChatGPT
   # Verify ChatGPT follows instructions
   ```

---

## Migration Path for Existing Projects

Projects created before this change may have:
- `.cursorrules` file
- `.github/copilot/instructions.md` file
- `SPECWEAVE-MANUAL.md` file

**These files are now deprecated.**

### Migration Instructions

**For Cursor users:**
```bash
# Remove deprecated file
rm .cursorrules

# Cursor will now read AGENTS.md instead
```

**For Copilot users:**
```bash
# Remove deprecated directory
rm -rf .github/copilot

# Copilot will now read AGENTS.md instead
```

**For Generic users:**
```bash
# Remove deprecated file
rm SPECWEAVE-MANUAL.md

# Use AGENTS.md instead (copy-paste to any AI)
```

**Note:** All deprecated files contained the EXACT SAME content as AGENTS.md, so no functionality is lost.

---

## Documentation Updates Needed

### 1. README.md
Update tool comparison table:

**Before:**
```markdown
| Tool | Files Created |
|------|---------------|
| Cursor | AGENTS.md + .cursorrules + .cursor/context/* |
| Copilot | AGENTS.md + .github/copilot/instructions.md |
| Generic | AGENTS.md + SPECWEAVE-MANUAL.md |
```

**After:**
```markdown
| Tool | Files Created |
|------|---------------|
| Claude Code | CLAUDE.md + AGENTS.md + .claude/* (native) |
| Cursor | AGENTS.md + .cursor/context/* (@ shortcuts) |
| Copilot | AGENTS.md (auto-read by Copilot) |
| All Others | AGENTS.md (universal standard) |
```

### 2. Adapter READMEs
Update adapter-specific README files to reference AGENTS.md instead of tool-specific files.

### 3. Website/Docs
Update any documentation mentioning .cursorrules, .github/copilot/instructions.md, or SPECWEAVE-MANUAL.md.

---

## Related Files

### Analysis Documents Created
1. `ANALYSIS-MULTI-TOOL-COMPARISON.md` - Comparative analysis of SpecWeave vs Spec-Kit vs BMAD-METHOD
2. `FINDINGS-AGENTS-MD-ANALYSIS.md` - Evidence and rationale for removal
3. `CHANGES-AGENTS-MD-REFACTOR.md` - This file (change summary)

### Key Implementation Files Changed
1. `src/adapters/cursor/adapter.ts` - Removed .cursorrules, kept @ shortcuts
2. `src/adapters/copilot/adapter.ts` - Removed .github/copilot/*, simplified to no-op
3. `src/adapters/generic/adapter.ts` - Removed SPECWEAVE-MANUAL.md, uses AGENTS.md

### Template Files (Unchanged)
- `src/templates/AGENTS.md.template` - Already comprehensive!
- `src/templates/CLAUDE.md.template` - Native Claude Code features

---

## Conclusion

**Mission Accomplished:** ✅

Tool-specific instruction files were **100% redundant** with AGENTS.md. By removing them:
- ✅ Simplified architecture
- ✅ Reduced maintenance burden
- ✅ Eliminated content divergence risk
- ✅ Followed industry standards (agents.md)
- ✅ Improved user experience (single source of truth)

**Exception:** Cursor's `.cursor/context/*.md` files provide actual value (@ shortcuts) and are NOT redundant, so they were kept.

**Result:** Clean, standards-compliant architecture with AGENTS.md as universal instruction file for all tools except Claude Code (which has native CLAUDE.md + .claude/* components).

---

## Commit Message

```
refactor: remove redundant tool-specific files in favor of AGENTS.md universal standard

BREAKING CHANGE: Tool-specific files removed
- .cursorrules (Cursor) → replaced by AGENTS.md
- .github/copilot/instructions.md (Copilot) → replaced by AGENTS.md
- SPECWEAVE-MANUAL.md (Generic) → replaced by AGENTS.md

Rationale:
- agents.md is industry standard (https://agents.md/)
- Supported by Cursor, Copilot, and 20+ other tools
- All tool-specific files contained duplicate content
- Single source of truth prevents divergence

Benefits:
- Simplified architecture (1 file instead of 4+)
- Reduced maintenance burden
- Standards compliance
- Better user experience

Exception:
- Cursor's .cursor/context/*.md kept (provides @ shortcuts value)

Files changed:
- src/adapters/cursor/adapter.ts
- src/adapters/copilot/adapter.ts
- src/adapters/generic/adapter.ts

Files removed:
- src/adapters/cursor/.cursorrules
- src/adapters/copilot/.github/copilot/instructions.md
- src/adapters/generic/SPECWEAVE-MANUAL.md
```

---

**Generated by:** Claude Code
**Date:** 2025-10-28
**Build:** ✅ Passing
**Status:** ✅ Ready for commit
