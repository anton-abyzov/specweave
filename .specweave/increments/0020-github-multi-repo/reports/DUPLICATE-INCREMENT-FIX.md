# Duplicate Increment ID Prevention - Fix Report

## Issue Description

The system needed to prevent duplicate increment IDs (e.g., two increments with ID 0020) from being created. While the utility functions existed to check for duplicates (`incrementNumberExists()` in `feature-utils.js`), the actual workflow in the `increment-planner` skill wasn't enforcing this check before creating new increments.

## Root Cause

The `increment-planner` skill instructed agents to create increments at `.specweave/increments/{number}-{name}/` but didn't provide a concrete mechanism to:
1. Determine the next available increment number
2. Check if that number already exists
3. Prevent creation if a duplicate is detected

## Solution Implemented

### 1. Updated increment-planner Skill Workflow

Added explicit **STEP 1** to the increment-planner skill workflow:

```markdown
STEP 1: Determine increment number and check for duplicates
├─ Use the Bash tool to run: node plugins/specweave/skills/increment-planner/scripts/feature-utils.js next
├─ Get next available increment number (e.g., "0021")
├─ Get short name from user description
├─ Check if increment already exists using: node plugins/specweave/skills/increment-planner/scripts/feature-utils.js check-increment {number}
└─ If duplicate found, STOP and tell user: "Increment {number} already exists! Please use the existing increment."
```

This ensures duplicate detection happens BEFORE any agents are invoked to create files.

### 2. Enhanced feature-utils.js CLI

Added a new `check-increment` command to the feature-utils.js CLI:

```javascript
case 'check-increment':
  if (args[1]) {
    const incrementNumber = args[1];
    const checkDir = args[2] || '.specweave/increments';
    if (incrementNumberExists(incrementNumber, checkDir)) {
      console.error(`ERROR: Increment ${incrementNumber} already exists!`);
      process.exit(1);
    } else {
      console.log(`OK: Increment ${incrementNumber} is available`);
    }
  }
  break;
```

### 3. Converted to ES Module

Updated `feature-utils.js` from CommonJS to ES module format to work with the project's ESM configuration:
- Changed `require()` to `import`
- Changed `module.exports` to `export`
- Updated CLI detection to use `import.meta.url`

### 4. Created Comprehensive Tests

Added `tests/unit/increment/duplicate-prevention.test.ts` with test cases for:
- Detecting existing increment numbers
- Handling both 3-digit and 4-digit formats
- Preventing duplicate increment creation
- Getting next available number
- Real-world workflow simulation

## Files Modified

1. **plugins/specweave/skills/increment-planner/SKILL.md**
   - Added STEP 1 for duplicate checking
   - Renumbered subsequent steps (2→3, 3→4, 4→5, 5→6)

2. **plugins/specweave/skills/increment-planner/scripts/feature-utils.js**
   - Added `check-increment` CLI command
   - Converted from CommonJS to ES module format

3. **tests/unit/increment/duplicate-prevention.test.ts** (new)
   - Comprehensive test suite for duplicate prevention

## Verification

### Manual Testing
```bash
# Get next increment number (returns 0021)
node plugins/specweave/skills/increment-planner/scripts/feature-utils.js next

# Check if 0020 exists (returns error - already exists)
node plugins/specweave/skills/increment-planner/scripts/feature-utils.js check-increment 0020

# Check if 0021 exists (returns OK - available)
node plugins/specweave/skills/increment-planner/scripts/feature-utils.js check-increment 0021
```

### Automated Testing
```bash
npm run test:unit -- tests/unit/increment/duplicate-prevention.test.ts
```

All tests pass successfully.

## Impact

This fix ensures:
1. **No duplicate increment IDs** can be created
2. **Clear error messages** when duplicates are detected
3. **Workflow enforcement** at the skill level (before agents run)
4. **Backward compatibility** with existing increments (handles both 3-digit and 4-digit formats)

## Recommendations

1. Consider adding this check directly in the PM agent as well for additional safety
2. Consider adding a `--force` flag for rare cases where overriding might be needed
3. Consider adding a cleanup utility to detect and report existing duplicates in legacy projects

## Status

✅ **COMPLETE** - The duplicate increment ID prevention is now fully implemented and tested.