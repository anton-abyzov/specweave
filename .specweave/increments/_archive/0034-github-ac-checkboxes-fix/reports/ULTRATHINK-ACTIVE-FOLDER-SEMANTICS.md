# 🧠 ULTRATHINK: "Active" Folder Semantics & Refactoring

**Date**: 2025-11-15
**Scope**: Analysis and resolution of the `active/` folder misuse
**Status**: Analysis Complete - Implementation Ready

---

## 📊 Problem Summary

### Issue Discovered

A literal folder named `active/` was created in `.specweave/increments/` and treated as if it were a real increment:

```
.specweave/increments/
├── 0034-github-ac-checkboxes-fix/  ✅ Valid increment
├── active/                          ❌ INVALID - reserved term used as ID
│   ├── metadata.json                   (id: "active", status: "active")
│   ├── reports/
│   │   ├── INTEGRATION-TESTS-FIXING-SESSION.md
│   │   ├── TEST-COVERAGE-COMPLETE.md
│   │   └── ULTRATHINK-HELP-COMMAND-UX-ANALYSIS.md
│   └── scripts/
└── _archive/                        ✅ Valid archive folder
```

**State Tracking Pollution**:
```json
// .specweave/state/active-increment.json
{
  "ids": [
    "0034-github-ac-checkboxes-fix",  // ✅ Valid
    "active"                           // ❌ INVALID
  ]
}
```

### Root Cause

**Terminology Confusion**: The term "active" has multiple meanings in SpecWeave:

1. **Status Value** (`IncrementStatus.ACTIVE = 'active'`)
   - Meaning: "Currently being worked on"
   - Valid values: `active`, `backlog`, `paused`, `completed`, `abandoned`

2. **Location Descriptor** (informal use in docs/comments)
   - Meaning: "Not archived" (in `.specweave/increments/` vs `_archive/`)
   - Used to distinguish working increments from archived ones

3. **State Tracking** (`.specweave/state/active-increment.json`)
   - Meaning: Array of increment IDs with `status: "active"`
   - Tracks which increments are currently in progress

The problem: Someone (or some code) used "active" as an **increment ID**, which is semantically wrong and pollutes the state tracking system.

---

## 🎯 SpecWeave Terminology - Official Definitions

### Increment Statuses (Enum Values)

Source: `src/core/types/increment-metadata.ts`

```typescript
export enum IncrementStatus {
  ACTIVE = 'active',        // Currently being worked on
  BACKLOG = 'backlog',      // Planned but not started
  PAUSED = 'paused',        // Temporarily stopped
  COMPLETED = 'completed',  // All tasks complete
  ABANDONED = 'abandoned'   // Work abandoned
}
```

### Increment Locations (File System)

1. **Working Increments** (not archived):
   - Path: `.specweave/increments/####-name/`
   - Example: `0034-github-ac-checkboxes-fix/`
   - Status: Any (active, backlog, paused, completed, abandoned)

2. **Archived Increments**:
   - Path: `.specweave/increments/_archive/####-name/`
   - Example: `_archive/0026-multiproject-structure-fix-MERGED/`
   - Status: Typically `completed` or `abandoned`

### Reserved Folder Names (Cannot be Increment IDs)

The following names are RESERVED and should NEVER be used as increment IDs:

1. **Status Values**: `active`, `backlog`, `paused`, `completed`, `abandoned`
2. **Special Folders**: `_archive`, `_templates`, `_config`
3. **State Files**: `active-increment`, `state`, `config`

**Current Problem**: No validation exists to prevent these reserved names.

---

## 🔍 Impact Analysis

### Files in `active/reports/` (Should be in 0034)

1. **INTEGRATION-TESTS-FIXING-SESSION.md** (10KB)
   - Content: Integration test fixes for 0034
   - Belongs to: Increment 0034
   - Evidence: References GitHub sync, immutable descriptions, hook validation

2. **TEST-COVERAGE-COMPLETE.md** (7KB)
   - Content: Test coverage completion report
   - Belongs to: Increment 0034
   - Evidence: References same test files as 0034

3. **ULTRATHINK-HELP-COMMAND-UX-ANALYSIS.md** (39KB)
   - Content: UX analysis for SpecWeave help command
   - Belongs to: Future increment OR internal docs
   - Decision: Keep in 0034 for now (active context)

### State Pollution

**Before**:
```json
// active-increment.json
{
  "ids": ["0034-github-ac-checkboxes-fix", "active"],
  "lastUpdated": "2025-11-15T18:59:27.518Z"
}
```

**After** (corrected):
```json
{
  "ids": ["0034-github-ac-checkboxes-fix"],
  "lastUpdated": "2025-11-15T XX:XX:XX.XXXZ"
}
```

---

## ✅ Refactoring Plan

### Phase 1: Move Reports (Immediate)

```bash
# Move all reports to increment 0034
mv .specweave/increments/active/reports/*.md \
   .specweave/increments/0034-github-ac-checkboxes-fix/reports/

# Verify move
ls -la .specweave/increments/0034-github-ac-checkboxes-fix/reports/
```

### Phase 2: Clean Up Active Folder (Immediate)

```bash
# Remove the entire active/ folder
rm -rf .specweave/increments/active/

# Verify deletion
! test -d .specweave/increments/active && echo "✅ Deleted successfully"
```

### Phase 3: Update State Tracking (Immediate)

```json
// .specweave/state/active-increment.json
{
  "ids": ["0034-github-ac-checkboxes-fix"],
  "lastUpdated": "<new-timestamp>"
}
```

### Phase 4: Add Validation (Future Increment)

**Location**: `src/core/increment/metadata-manager.ts` or new validator

```typescript
const RESERVED_INCREMENT_IDS = [
  // Status values
  'active', 'backlog', 'paused', 'completed', 'abandoned',

  // Special folders
  '_archive', '_templates', '_config',

  // State files
  'active-increment', 'state', 'config',

  // Common terms that should not be IDs
  'current', 'latest', 'new', 'temp', 'test'
];

function validateIncrementId(id: string): void {
  const baseName = id.split('-')[0];

  if (RESERVED_INCREMENT_IDS.includes(id)) {
    throw new Error(
      `Invalid increment ID "${id}": This is a reserved name.\n` +
      `Reserved names: ${RESERVED_INCREMENT_IDS.join(', ')}`
    );
  }

  // Increment IDs must start with 4-digit number
  if (!/^\d{4}-/.test(id)) {
    throw new Error(
      `Invalid increment ID "${id}": Must start with 4-digit number (e.g., "0035-feature-name")`
    );
  }
}
```

### Phase 5: Update Documentation (If Needed)

**CLAUDE.md Analysis**:

Current terminology in CLAUDE.md:
- ✅ Uses "working increments" (not archived)
- ✅ Mentions status values correctly
- ❌ Could be more explicit about reserved names

**Proposed Addition** (optional):

```markdown
### Reserved Folder Names

The following names are RESERVED and cannot be used as increment IDs:
- Status values: `active`, `backlog`, `paused`, `completed`, `abandoned`
- Special folders: `_archive`, `_templates`
- Never create folders with these names in `.specweave/increments/`

**Example of INVALID naming**:
```bash
❌ .specweave/increments/active/          # Reserved status name
❌ .specweave/increments/completed/       # Reserved status name
❌ .specweave/increments/_archive/####/   # This is valid (archive location)
```

**Example of VALID naming**:
```bash
✅ .specweave/increments/0035-kafka-plugin/
✅ .specweave/increments/_archive/0031-external-tool-status-sync/
```
```

**Decision**: CLAUDE.md is already clear enough. The issue was likely manual folder creation, not documentation confusion. **No update needed**.

---

## 🎨 Better Terminology (Proposed)

To avoid future confusion, consider using these terms consistently:

| Concept | Current Term | Proposed Alternative | Rationale |
|---------|--------------|---------------------|-----------|
| Not archived | "Active increments" | "Working increments" | Avoids confusion with status="active" |
| Status tracking | `active-increment.json` | No change needed | File name is fine (plural would be better) |
| Location descriptor | "In root vs archive" | "Working vs Archived" | More explicit |

**Example Usage**:

```markdown
❌ Before (confusing):
"Active increments are those in .specweave/increments/ (not archived)"

✅ After (clear):
"Working increments are those in .specweave/increments/ (not archived)"
```

**Decision**: Keep current terminology. It's clear in context. Just add validation to prevent reserved names.

---

## 📋 Implementation Checklist

### Immediate Actions (This Session)

- [x] Analyze the issue and create ultrathink document
- [ ] Move reports from `active/` to `0034/reports/`
- [ ] Delete the `active/` folder
- [ ] Update `active-increment.json`
- [ ] Verify no broken references

### Future Increment (Validation)

- [ ] Create increment for reserved name validation
- [ ] Implement `validateIncrementId()` function
- [ ] Add validation to increment creation flow
- [ ] Add E2E test for reserved name rejection
- [ ] Add unit tests for validation function

### Documentation (Optional)

- [ ] Consider adding "Reserved Names" section to CLAUDE.md
- [ ] Update skills if they reference terminology
- [ ] Add ADR if significant architectural decision

---

## 🧪 Testing Strategy

### Manual Verification

```bash
# 1. Verify active/ folder is gone
! test -d .specweave/increments/active && echo "✅ Deleted"

# 2. Verify reports moved to 0034
ls -1 .specweave/increments/0034-github-ac-checkboxes-fix/reports/ | grep -E "INTEGRATION-TESTS|TEST-COVERAGE|ULTRATHINK-HELP"

# 3. Verify state tracking cleaned up
cat .specweave/state/active-increment.json | jq '.ids | contains(["active"])'
# Should output: false
```

### Future E2E Test

```typescript
// tests/e2e/increment-validation.spec.ts
describe('Increment ID Validation', () => {
  it('should reject reserved status names as increment IDs', async () => {
    const reservedNames = ['active', 'backlog', 'paused', 'completed', 'abandoned'];

    for (const name of reservedNames) {
      await expect(
        exec(`specweave increment "${name}"`)
      ).rejects.toThrow(`Invalid increment ID "${name}": This is a reserved name`);
    }
  });

  it('should reject special folder names as increment IDs', async () => {
    const specialNames = ['_archive', '_templates', '_config'];

    for (const name of specialNames) {
      await expect(
        exec(`specweave increment "${name}"`)
      ).rejects.toThrow('Invalid increment ID');
    }
  });

  it('should require 4-digit number prefix', async () => {
    await expect(
      exec(`specweave increment "feature-name"`)
    ).rejects.toThrow('Must start with 4-digit number');
  });
});
```

---

## 🎯 Success Criteria

### Immediate Success

1. ✅ All reports moved to correct increment folder
2. ✅ `active/` folder completely removed
3. ✅ `active-increment.json` cleaned up (no "active" ID)
4. ✅ No broken references or errors
5. ✅ Git status shows only expected changes

### Long-term Success (Future Increment)

1. ✅ Validation prevents reserved names as increment IDs
2. ✅ Clear error messages guide users to correct naming
3. ✅ E2E tests verify validation works
4. ✅ Documentation updated if needed

---

## 📝 Lessons Learned

### What Went Wrong

1. **No Validation**: System allowed creating folder with reserved name
2. **Manual Creation**: Likely created manually, bypassing normal increment flow
3. **State Tracking**: `active-increment.json` accepted invalid ID

### Preventive Measures

1. **Add Validation**: Reject reserved names at creation time
2. **Clear Naming Rules**: Document in error messages
3. **State Validation**: Validate IDs when reading state files

### Design Principles Reinforced

1. **Fail Fast**: Validate input immediately, don't allow invalid state
2. **Clear Error Messages**: Tell users exactly what's wrong and how to fix
3. **Progressive Disclosure**: Skills explain rules, code enforces them

---

## 🚀 Next Steps

### This Session

1. Execute Phases 1-3 (move, delete, update)
2. Verify cleanup complete
3. Commit changes

### Future Work

1. Create increment for validation (e.g., "0036-increment-id-validation")
2. Implement reserved name validation
3. Add comprehensive tests
4. Consider ADR if significant architectural impact

---

## 🎨 Architecture Notes

### Current State Management

```
.specweave/
├── increments/
│   ├── ####-name/          # Working increments (any status)
│   └── _archive/####-name/ # Archived increments
└── state/
    ├── active-increment.json   # Tracks status="active" increments
    └── config.json             # Project configuration
```

### Proposed State Validation

```typescript
// When reading active-increment.json
function loadActiveIncrements(): string[] {
  const state = readJSON('active-increment.json');
  const validIds = state.ids.filter(id => {
    // Validate each ID
    return /^\d{4}-/.test(id) && !RESERVED_NAMES.includes(id);
  });

  if (validIds.length !== state.ids.length) {
    console.warn('Invalid increment IDs removed from state');
    saveActiveIncrements(validIds);
  }

  return validIds;
}
```

---

## 📚 References

- **Source Code**: `src/core/types/increment-metadata.ts` (IncrementStatus enum)
- **State Management**: `src/core/increment/active-increment-manager.ts`
- **Documentation**: `CLAUDE.md` (Project Structure section)
- **Related Issue**: Git status shows `active/` as untracked folder

---

**Status**: Ready for implementation
**Estimated Time**: 10 minutes (immediate cleanup)
**Risk**: Low (moving files to correct location)
**Impact**: High (prevents future confusion and state pollution)
