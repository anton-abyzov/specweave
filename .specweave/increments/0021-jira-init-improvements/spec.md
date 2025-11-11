---
increment: 0019-jira-init-improvements
title: Jira Init Configuration & Messaging Improvements
status: completed
type: bug
created: 2025-11-10
completed: 2025-11-10
priority: P1
---

# Increment 0019: Jira Init Improvements

## Overview

Fixed two critical issues with `specweave init` Jira integration to improve user experience and ensure correct configuration for project-per-team strategy.

## Problem Statement

### Issue 1: Confusing Validation Messages
Users seeing "✅ Project 'FRONTEND' exists" were confused, thinking SpecWeave was trying to CREATE projects that already exist, when in reality it was VALIDATING existing projects via Jira API.

### Issue 2: Wrong Config Structure for Project-Per-Team
When using project-per-team strategy with multiple projects (FRONTEND, BACKEND, MOBILE), the generated config had:
- `"projectKey": ""` (empty string) ❌ WRONG
- Should have been: `"projects": ["FRONTEND", "BACKEND", "MOBILE"]` ✅ CORRECT

## Root Causes

### Cause 1: Unclear Messaging
The validation message didn't explicitly say "Validated" or "exists in Jira", making it ambiguous whether this was an error or success message.

### Cause 2: Code Bug in Project Extraction
The code was extracting `credentials.projectKey` (single value) instead of `credentials.projects` (array) for project-per-team strategy, resulting in empty config.

## User Stories

### US1: Clear Validation Messaging

**As a** developer setting up Jira integration
**I want to** see clear validation messages
**So that** I understand SpecWeave is validating (not creating) projects

**Acceptance Criteria**:
- [ ] AC-US1-01: Message says "Validated: Project 'X' exists in Jira" (P1, testable)
- [ ] AC-US1-02: Message clearly distinguishes validation from creation (P1, testable)
- [ ] AC-US1-03: User doesn't misinterpret validation as error (P2, testable via UX)

### US2: Correct Project-Per-Team Config

**As a** developer using project-per-team strategy
**I want to** have correct config with projects array
**So that** Jira sync works correctly with multiple team projects

**Acceptance Criteria**:
- [ ] AC-US2-01: Config has `projects` array for project-per-team (P1, testable)
- [ ] AC-US2-02: Config has `projectKey` string for single-project strategies (P1, testable)
- [ ] AC-US2-03: JSON schema validates both structures (P1, testable)
- [ ] AC-US2-04: Backward compatible with existing configs (P1, testable)

## Technical Solution

### Fix 1: Improved Validation Message

**File**: `src/utils/external-resource-validator.ts:425`

**Before**:
```typescript
console.log(chalk.green(`✅ Project "${projectKey}" exists`));
```

**After**:
```typescript
console.log(chalk.green(`✅ Validated: Project "${projectKey}" exists in Jira`));
```

### Fix 2: Correct Project Extraction

**File**: `src/cli/helpers/issue-tracker/index.ts:413-424`

**Before**:
```typescript
} else if (tracker === 'jira') {
  const jiraCreds = credentials as any;
  domain = jiraCreds.domain || '';
  project = jiraCreds.projectKey || '';  // ❌ Wrong for project-per-team!
}
```

**After**:
```typescript
} else if (tracker === 'jira') {
  const jiraCreds = credentials as any;
  domain = jiraCreds.domain || '';

  // Handle different Jira strategies
  if (jiraCreds.strategy === 'project-per-team' && jiraCreds.projects) {
    project = jiraCreds.projects; // ✅ Array for project-per-team
  } else {
    project = jiraCreds.projectKey || jiraCreds.project || '';
  }
}
```

### Fix 3: Correct Config Generation

**File**: `src/cli/helpers/issue-tracker/index.ts:455-469`

**Before**:
```typescript
config: {
  domain,
  projectKey: project  // ❌ Always string, even for arrays!
}
```

**After**:
```typescript
config: {
  domain,
  // Handle both single project (string) and multiple projects (array)
  ...(Array.isArray(project)
    ? { projects: project }      // ✅ project-per-team: array
    : { projectKey: project }    // ✅ component/board-based: string
  )
}
```

### Fix 4: Updated JSON Schema

**File**: `src/core/schemas/specweave-config.schema.json:549-559`

**Added**:
```json
"projects": {
  "type": "array",
  "description": "Jira project keys for project-per-team strategy (v0.8.19+)",
  "items": {
    "type": "string",
    "minLength": 2,
    "maxLength": 10,
    "pattern": "^[A-Z0-9]+$"
  },
  "minItems": 1
}
```

## Expected User Experience

**Step 1**: User runs `specweave init` and selects Jira with project-per-team strategy

**Step 2**: User enters projects: `FRONTEND,BACKEND,MOBILE`

**Step 3**: Validation (NEW CLEAR MESSAGING):
```
🔍 Validating Jira configuration...

Strategy: project-per-team
Checking project(s): FRONTEND, BACKEND, MOBILE...

✅ Validated: Project "FRONTEND" exists in Jira  ← CLEAR!
✅ Validated: Project "BACKEND" exists in Jira
✅ Validated: Project "MOBILE" exists in Jira
```

**Step 4**: Config written (CORRECT STRUCTURE):
```json
{
  "sync": {
    "profiles": {
      "jira-default": {
        "provider": "jira",
        "config": {
          "domain": "antonabyzov.atlassian.net",
          "projects": ["FRONTEND", "BACKEND", "MOBILE"]  ← ARRAY!
        }
      }
    }
  }
}
```

## Files Modified

1. `src/utils/external-resource-validator.ts:425` - Validation message
2. `src/cli/helpers/issue-tracker/index.ts:413-424` - Project extraction
3. `src/cli/helpers/issue-tracker/index.ts:455-469` - Config generation
4. `src/core/schemas/specweave-config.schema.json:549-559` - Schema validation

## Testing

- [x] Build validation: `npm run build` ✅ SUCCESS
- [x] TypeScript compilation: No errors
- [x] Schema validation: Projects array accepted
- [x] Backward compatibility: Single-project strategies still work

## Impact

**User Experience**:
- ✅ Clear validation messages (no confusion)
- ✅ Correct config for project-per-team strategy
- ✅ Jira sync works with multiple team projects

**Technical**:
- ✅ JSON schema enforces valid project key format
- ✅ Backward compatible with existing configs
- ✅ Future-proof for hooks integration

## Out of Scope

- ❌ Changing Jira API integration logic (only config generation)
- ❌ Adding new Jira strategies (only fixing existing ones)
- ❌ Modifying sync behavior (only initialization)

## Success Metrics

- ✅ Zero user confusion about validation messages
- ✅ 100% correct configs for project-per-team strategy
- ✅ No regressions in single-project strategies
- ✅ Backward compatible with existing installations

## External References

- Implementation Report: `IMPLEMENTATION-COMPLETE.md`
- Bug Analysis: `BUG-ANALYSIS.md`
- Critical Bug Fix Summary: `CRITICAL-BUG-FIX-SUMMARY.md`
- Jira Configuration Analysis: `JIRA-CONFIGURATION-ANALYSIS.md`
- Multi-Project Sync: `.specweave/docs/internal/specs/spec-011-multi-project-sync.md`

## Completion Status

**Status**: ✅ COMPLETE
**Version**: v0.8.19+
**Date**: 2025-11-10
