# Multi-Repo Init Flow - Design Document

## Executive Summary

This document outlines the improved `specweave init` flow for multi-repository setups with:
- ✅ Context awareness (no duplicate questions)
- ✅ Manual parent repo selection (or local-only)
- ✅ Bulk discovery for implementation repos (all, pattern, regex)
- ✅ Clear, intuitive prompts

## Current State Analysis

### What Works Well ✅

1. **Bulk Discovery Already Exists** (`repo-bulk-discovery.ts`)
   - All repos from owner/org
   - Pattern matching (starts, ends, contains, glob)
   - Regex matching
   - Preview and confirmation

2. **Pattern-First Flow Exists** (`configureMultiRepo`, lines 461-625)
   - Discovers repos FIRST
   - Asks user to select parent from discovered list
   - Auto-populates implementation repos
   - Validates with GitHub API

3. **Manual Flow Works** (lines 628-874)
   - Individual repo configuration
   - Full control over each setting
   - Smart defaults and validation

### Issues to Fix ❌

1. **Poor Naming**
   - "pattern-first" is misleading
   - Should be "bulk-discovery" or "auto-discover"

2. **Unclear Prompts**
   - "Manual entry vs Pattern matching" doesn't explain bulk discovery well
   - Missing context about what each option does

3. **No Context Awareness**
   - Re-asks architecture questions even when known from previous context
   - `preSelectedArchitecture` parameter exists but not fully utilized

4. **Suboptimal Flow Order**
   - Asks discovery strategy BEFORE explaining what it means
   - Should show benefits of bulk discovery more prominently

## Improved Flow Design

### Flow Diagram

```
┌─────────────────────────────────────────────────┐
│  1. Architecture Selection (SKIP if known)      │
│     • Single repo                               │
│     • Parent repo + nested repos (GitHub)       │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  2. Platform Selection                          │
│     • GitHub, GitLab, Bitbucket, etc.           │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  3. URL Type Selection                          │
│     • SSH (recommended)                         │
│     • HTTPS                                     │
└─────────────────────────────────────────────────┘
                      ↓
    ┌─────────────────────────────────┐
    │  IF: Multi-repo with parent     │
    └─────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  4. Repository Discovery Strategy               │
│  📋 "You're setting up multiple repositories.   │
│      We can discover them automatically!"       │
│                                                  │
│  Options:                                       │
│  • 🚀 Bulk Discovery (RECOMMENDED)              │
│    → Discover all repos from owner/org          │
│    → Filter by pattern (starts, ends, contains) │
│    → Filter by regex (advanced)                 │
│    → Then select parent from list               │
│                                                  │
│  • ✏️  Manual Entry                             │
│    → Enter parent repo details manually         │
│    → Enter each implementation repo manually    │
└─────────────────────────────────────────────────┘
                      ↓
    ┌─────────────────────────────────┐
    │  IF: Bulk Discovery selected    │
    └─────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  5a. Bulk Discovery Flow                        │
│      Step 1: Enter owner/org                    │
│      Step 2: Choose discovery method            │
│              • All repos                        │
│              • Pattern (starts:*, ends:*, etc)  │
│              • Regex (^ec-.*-api$)              │
│      Step 3: Preview discovered repos           │
│      Step 4: Select parent from list            │
│      Step 5: Confirm implementation repos       │
│              (all discovered - parent)          │
└─────────────────────────────────────────────────┘
                      ↓
                   DONE ✅

    ┌─────────────────────────────────┐
    │  IF: Manual Entry selected      │
    └─────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  5b. Manual Entry Flow                          │
│      Step 1: Parent repo setup                  │
│              • Use existing OR create new       │
│              • Enter owner/org                  │
│              • Enter parent repo name           │
│              • Description, visibility          │
│      Step 2: Implementation repos               │
│              • Enter count (with auto-detect)   │
│              • For each repo:                   │
│                - ID, name, description          │
│                - Owner (default: same as parent)│
│                - Visibility                     │
│                - Create on GitHub?              │
└─────────────────────────────────────────────────┘
                      ↓
                   DONE ✅
```

### Key Improvements

#### 1. Context Awareness

**Before:**
```typescript
// Always asks architecture
const result = await inquirer.prompt([...]);
architecture = result.architecture;
```

**After:**
```typescript
// Skip if already known
if (preSelectedArchitecture) {
  architecture = preSelectedArchitecture;
  console.log(chalk.green(`✓ Architecture: ${format(architecture)}`));
} else {
  const result = await inquirer.prompt([...]);
  architecture = result.architecture;
}
```

**Impact:** Eliminates duplicate questions when user already specified architecture

#### 2. Improved Prompts

**Before:**
```
How do you want to configure these repositories?
• Manual entry - Enter parent and each repository one by one (full control)
• Pattern matching - Discover repositories, then select parent (faster for many repos)
```

**After:**
```
🚀 Repository Discovery

You're setting up multiple repositories. We can discover them automatically!

How do you want to configure repositories?

• 🎯 Bulk Discovery (RECOMMENDED - saves time!)
  ┌────────────────────────────────────────────────┐
  │ Automatically discover repositories from       │
  │ GitHub/GitLab/Bitbucket, then:                 │
  │   1. Select which one is the parent            │
  │   2. Auto-configure implementation repos       │
  │                                                │
  │ Supports:                                      │
  │   ✓ All repos from owner/org                   │
  │   ✓ Pattern matching (starts:*, ends:*, etc)   │
  │   ✓ Regex matching (^ec-.*-api$)               │
  └────────────────────────────────────────────────┘

• ✏️  Manual Entry (full control, slower)
  ┌────────────────────────────────────────────────┐
  │ Enter parent and each repository manually:     │
  │   1. Configure parent repo details             │
  │   2. Enter each implementation repo one by one │
  │                                                │
  │ Use when:                                      │
  │   • Repos don't exist yet                      │
  │   • Need full control over each setting        │
  └────────────────────────────────────────────────┘
```

**Impact:**
- Makes bulk discovery the OBVIOUS choice for most users
- Clearly explains what each option does
- Shows benefits visually

#### 3. Better Naming

**Before:**
```typescript
discoveryStrategy: 'manual' | 'pattern-first'
```

**After:**
```typescript
discoveryStrategy: 'manual' | 'bulk-discovery'
```

**Impact:** Clearer terminology throughout codebase

#### 4. Enhanced Bulk Discovery Messages

**Current:**
```
📋 Discovered Repositories:

   1. 🔒 frontend-app - Frontend application
   2. 🌐 backend-api - Backend API
   ...
```

**Enhanced:**
```
📋 Discovered Repositories from myorg:

Strategy: Pattern matching (starts:ec-)
Found: 15 repositories matching "starts:ec-"

   1. 🔒 ec-frontend-app      - Frontend application
   2. 🔒 ec-backend-api        - Backend API service
   3. 🔒 ec-auth-service       - Authentication service
   ...

   15. 🔒 ec-monitoring        - Monitoring dashboard

✅ Ready to configure! Next step: Select which one is the parent.
```

**Impact:** More informative, shows discovery strategy and results clearly

## Implementation Plan

### Phase 1: Naming & Terminology ✅

**Files to modify:**
- `src/core/repo-structure/repo-structure-manager.ts`
  - Line 464: `'pattern-first'` → `'bulk-discovery'`
  - Line 468-491: Update prompt text
  - Line 878: Update variable names

**Changes:**
```typescript
// Before
let discoveryStrategy: 'manual' | 'pattern-first' = 'manual';

// After
let discoveryStrategy: 'manual' | 'bulk-discovery' = 'manual';
```

### Phase 2: Improved Prompts ✅

**Files to modify:**
- `src/core/repo-structure/repo-structure-manager.ts`
  - Lines 468-491: Replace with new detailed prompt

**New prompt structure:**
```typescript
console.log(chalk.cyan('\n🚀 Repository Discovery\n'));
console.log(chalk.gray('You\'re setting up multiple repositories. We can discover them automatically!\n'));

const { configMethod } = await inquirer.prompt([{
  type: 'list',
  name: 'configMethod',
  message: 'How do you want to configure repositories?',
  choices: [
    {
      name: [
        chalk.bold.green('🎯 Bulk Discovery (RECOMMENDED)'),
        chalk.gray('  Automatically discover repos from ' + provider.config.name),
        chalk.gray('  • Select parent from discovered list'),
        chalk.gray('  • Auto-configure implementation repos'),
        chalk.gray('  • Supports: all, pattern, regex filtering'),
        ''
      ].join('\n'),
      value: 'bulk-discovery',
      short: 'Bulk Discovery'
    },
    {
      name: [
        chalk.bold('✏️  Manual Entry'),
        chalk.gray('  Enter each repository manually'),
        chalk.gray('  • Full control over settings'),
        chalk.gray('  • Best for new repos or custom setup'),
        ''
      ].join('\n'),
      value: 'manual',
      short: 'Manual'
    }
  ],
  default: 'bulk-discovery'  // Make bulk discovery the default!
}]);
```

### Phase 3: Enhanced Messages ✅

**Files to modify:**
- `src/core/repo-structure/repo-bulk-discovery.ts`
  - Lines 138-160: Enhance preview output

**New preview output:**
```typescript
function showRepositoryPreview(
  repos: DiscoveredRepo[],
  strategy: string,
  pattern: string | undefined,
  owner: string,
  maxDisplay: number = 20
): void {
  console.log(chalk.cyan(`\n📋 Discovered Repositories from ${chalk.bold(owner)}:\n`));

  if (strategy !== 'all-repos' && pattern) {
    console.log(chalk.gray(`   Strategy: ${strategy}`));
    console.log(chalk.gray(`   Pattern: ${pattern}`));
    console.log(chalk.gray(`   Matches: ${repos.length} repositories\n`));
  } else {
    console.log(chalk.gray(`   Found: ${repos.length} repositories\n`));
  }

  // ... rest of preview ...

  console.log(chalk.green(`\n✅ Ready to configure! Next: Select which one is the parent.\n`));
}
```

### Phase 4: Context Awareness ✅

**Already implemented!**
- `preSelectedArchitecture` parameter exists (line 93)
- Skip logic exists (lines 122-141)
- Just needs documentation

### Phase 5: Testing

**Test scenarios:**
1. ✅ Bulk discovery with "all repos"
2. ✅ Bulk discovery with pattern (starts:, ends:, contains:)
3. ✅ Bulk discovery with regex
4. ✅ Manual entry (existing flow)
5. ✅ Context awareness (preSelectedArchitecture)
6. ✅ Parent repo selection from discovered list
7. ✅ Implementation repos auto-population

**Test files to update:**
- `tests/integration/core/repo-structure/repo-structure-manager.test.ts`
- `tests/integration/core/repo-structure/bulk-discovery.test.ts` (new)

## Success Criteria

✅ Users can discover all repos from owner/org with one click
✅ Pattern matching works (starts:, ends:, contains:, glob, regex)
✅ Parent repo is selected manually from discovered list
✅ Implementation repos are auto-populated (discovered - parent)
✅ Manual flow still works for full control
✅ Context awareness eliminates duplicate questions
✅ Prompts are clear and visually appealing
✅ Default option is bulk discovery (fastest path)

## Migration Notes

### Breaking Changes

**None!** This is purely additive.

### Deprecations

- ❌ `'pattern-first'` → Use `'bulk-discovery'` instead
- ❌ Old prompt text → New detailed prompts

### Backward Compatibility

✅ All existing flows continue to work
✅ Manual entry unchanged
✅ API signatures unchanged
✅ State management unchanged

## Documentation Updates

**Files to update:**
1. `CLAUDE.md` - Add section on bulk discovery
2. `README.md` - Update init flow documentation
3. `.specweave/docs/internal/user-guides/multi-repo-setup.md` - New guide

**Key points to document:**
- Bulk discovery is RECOMMENDED for 3+ repos
- Pattern syntax: `starts:prefix`, `ends:suffix`, `contains:substring`, glob, regex
- Parent repo is ALWAYS manual selection (or local-only)
- Implementation repos are auto-discovered

## Timeline

- **Phase 1-2:** 2 hours (naming, prompts)
- **Phase 3:** 1 hour (enhanced messages)
- **Phase 4:** 0 hours (already done!)
- **Phase 5:** 2 hours (testing)
- **Documentation:** 1 hour
- **Total:** ~6 hours

## Conclusion

This design improves the multi-repo init flow by:
1. Making bulk discovery the DEFAULT and OBVIOUS choice
2. Providing clear, informative prompts
3. Supporting all discovery methods (all, pattern, regex)
4. Maintaining backward compatibility
5. Eliminating duplicate questions via context awareness

**Result:** Users can set up 10+ repos in seconds instead of 10+ minutes! 🚀
