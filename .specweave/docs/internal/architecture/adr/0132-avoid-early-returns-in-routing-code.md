# ADR-0132: Avoid Early Returns in Routing Code

**Date**: 2025-11-24
**Status**: ✅ Accepted
**Context**: GitHub multirepo init flow bug fix

---

## Context

During the GitHub multirepo init flow, users selecting "Multiple repositories (with parent repo)" were **bypassing RepoStructureManager** entirely due to an early return on line 96-97 in `github-multi-repo.ts`:

```typescript
// BROKEN CODE:
if (repositoryHosting === 'github-multirepo') {
  return { setupType: 'multiple' };  // ← Early return bypasses all enhanced logic!
}

// Lines 115-153: RepoStructureManager (NEVER REACHED!)
if (projectPath && githubToken) {
  const manager = new RepoStructureManager(projectPath, githubToken);
  const config = await manager.promptStructure();  // ← Has parent repo prompts, bulk discovery, etc.
}
```

This caused three critical UX issues:
1. ❌ No parent repository prompt
2. ❌ No bulk discovery (pattern matching, all-org, all-personal)
3. ❌ No smart validation and suggestions

**Impact**: 100% of multirepo users forced into legacy manual entry loop

---

## Decision

**NEVER use early returns in routing/dispatcher code that bypasses later enhanced logic.**

### Principles

1. **Use Architecture Mapping Instead of Early Returns**
   ```typescript
   // ✅ CORRECT: Map to architecture type, let it fall through
   let preSelectedArchitecture: 'single' | 'github-parent' | undefined = undefined;

   if (repositoryHosting === 'github-multirepo') {
     preSelectedArchitecture = 'github-parent';  // Map, don't return!
   }

   // Now fall through to enhanced logic
   if (projectPath && githubToken) {
     const manager = new RepoStructureManager(projectPath, githubToken);
     const config = await manager.promptStructure(preSelectedArchitecture);
   }
   ```

2. **Centralize Complex Logic in Manager Classes**
   - Don't duplicate logic in routing code
   - Manager classes (like `RepoStructureManager`) should have ALL features
   - Routing code should just map inputs → manager method calls

3. **Early Returns Only for Exit Conditions**
   ```typescript
   // ✅ CORRECT: Early return for NON-GitHub providers (exit condition)
   if (repositoryHosting === 'bitbucket-multirepo' || repositoryHosting === 'ado-multirepo') {
     return { setupType: 'none' };  // Not GitHub → exit early
   }

   // ✅ CORRECT: Early return for error conditions
   if (recursionDepth >= MAX_RECURSION_DEPTH) {
     console.log(chalk.red('Too many redirections'));
     return { setupType: 'single' };  // Error → exit early
   }

   // ❌ WRONG: Early return for routing decisions
   if (repositoryHosting === 'github-multirepo') {
     return { setupType: 'multiple' };  // Should map, not return!
   }
   ```

4. **Always Trace Execution Paths**
   - Before adding early returns, trace ALL code paths
   - Ask: "What code am I bypassing with this return?"
   - If bypassing enhanced logic → use mapping instead

---

## Implementation Pattern

### Template for Routing Code

```typescript
export async function routeToFeature(
  input: UserInput,
  preSelected?: PreSelectedOption
): Promise<Result> {
  // Step 1: Map pre-selected options to internal types (NO EARLY RETURNS!)
  let internalOption: InternalType | undefined = undefined;

  if (preSelected) {
    // Map external types → internal types
    if (preSelected === 'option-a') {
      internalOption = 'internal-a';
    } else if (preSelected === 'option-b') {
      internalOption = 'internal-b';
    }

    // Early return ONLY for non-supported options (exit conditions)
    else if (preSelected === 'unsupported') {
      return { type: 'none' };
    }
  }

  // Step 2: Try enhanced flow (with fallback)
  if (input.hasEnhancedData) {
    try {
      const manager = new EnhancedManager(input);
      return await manager.process(internalOption);  // Pass mapped option!
    } catch (error) {
      // Log error and fall through to legacy flow
      console.log('Enhanced flow failed, falling back...');
    }
  }

  // Step 3: If pre-selected and enhanced flow didn't run, map directly
  if (preSelected && internalOption) {
    return mapToResult(internalOption);
  }

  // Step 4: Legacy prompt (ONLY if nothing pre-selected)
  const result = await inquirer.prompt([...]);
  return result;
}
```

---

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Early Return Bypassing Enhanced Logic

```typescript
// ❌ WRONG:
if (preSelected === 'option-b') {
  return { type: 'b' };  // Bypasses EnhancedManager!
}

// Lines 50-100: EnhancedManager (NEVER REACHED!)
if (hasEnhancedData) {
  const manager = new EnhancedManager(...);
  // ... parent prompts, bulk discovery, validation ...
}
```

**Fix**: Remove early return, map to internal type, pass to EnhancedManager.

---

### ❌ Anti-Pattern 2: Duplicating Logic in Routing Code

```typescript
// ❌ WRONG: 280 lines of manual loop in routing code
export async function configureMultipleItems(projectPath: string) {
  const { count } = await inquirer.prompt([...]);

  for (let i = 0; i < count; i++) {
    // 50+ lines of prompting, validation, etc.
    // ALL OF THIS duplicates EnhancedManager!
  }
}
```

**Fix**: Delete duplicated code. Always route to EnhancedManager for complex flows.

---

### ❌ Anti-Pattern 3: Error Fallbacks That Never Execute

```typescript
// ❌ WRONG:
if (preSelected === 'option-b') {
  return { type: 'b' };  // Early return
}

try {
  const manager = new EnhancedManager(...);
  // ... enhanced logic ...
} catch (error) {
  // ❌ This fallback NEVER executes because early return bypassed the try block!
  return { type: 'legacy' };
}
```

**Fix**: Remove early return so try-catch can actually catch errors.

---

## Code Review Checklist

When reviewing routing/dispatcher code:

- [ ] ✅ No early returns that bypass enhanced logic?
- [ ] ✅ Pre-selected options mapped to internal types instead of returned?
- [ ] ✅ Manager classes receive mapped options via parameters?
- [ ] ✅ Error fallbacks reachable (not bypassed by early returns)?
- [ ] ✅ No duplicated logic in routing code?
- [ ] ✅ Early returns ONLY for exit conditions (non-supported options, errors)?
- [ ] ✅ Execution path traced for ALL routing decisions?

---

## Examples

### ✅ Good: Architecture Mapping (github-multi-repo.ts after fix)

```typescript
// Step 1: Map repositoryHosting → preSelectedArchitecture (NO early return!)
let preSelectedArchitecture: 'single' | 'github-parent' | undefined = undefined;

if (repositoryHosting === 'github-single') {
  preSelectedArchitecture = 'single';
} else if (repositoryHosting === 'github-multirepo') {
  preSelectedArchitecture = 'github-parent';  // Map, don't return!
}

// Step 2: Fall through to RepoStructureManager
if (projectPath && githubToken) {
  try {
    const manager = new RepoStructureManager(projectPath, githubToken);
    const config = await manager.promptStructure(preSelectedArchitecture);  // ← Gets architecture!
    // ... parent repo prompts, bulk discovery, validation all work! ...
  } catch (error) {
    // Fallback to legacy flow
  }
}
```

---

### ❌ Bad: Early Return (github-multi-repo.ts before fix)

```typescript
// Step 1: Early return bypasses RepoStructureManager
if (repositoryHosting === 'github-multirepo') {
  return { setupType: 'multiple' };  // ❌ Bypasses lines 115-153!
}

// Step 2: RepoStructureManager (NEVER REACHED for multirepo!)
if (projectPath && githubToken) {
  const manager = new RepoStructureManager(projectPath, githubToken);
  const config = await manager.promptStructure();  // ← Never called!
}
```

---

## Benefits

1. **Enhanced Features Always Available**
   - Parent repo prompts work
   - Bulk discovery works
   - Smart validation works
   - Pattern matching works

2. **Single Source of Truth**
   - All complex logic in manager classes
   - Routing code just maps + dispatches

3. **Error Fallbacks Work**
   - Try-catch can actually catch errors
   - Graceful degradation to legacy flow

4. **Easier to Maintain**
   - No duplicated logic
   - Clear separation: routing vs logic

5. **Better Testing**
   - Test manager classes independently
   - Routing tests just verify mapping

---

## Consequences

### Positive

- ✅ All enhanced features work correctly
- ✅ No bypassing of advanced logic
- ✅ Error fallbacks reachable
- ✅ Cleaner architecture

### Negative

- ⚠️  Slightly more code (mapping instead of early return)
- ⚠️  Need to understand execution flow (not obvious from early returns)

**Trade-off**: Worth it for correctness and maintainability!

---

## Related

- **Incident Report**: `.specweave/increments/_archive/0053-safe-feature-deletion/reports/GITHUB-MULTIREPO-INIT-FIX-2025-11-24.md`
- **RepoStructureManager**: `src/core/repo-structure/repo-structure-manager.ts:426+`
- **promptGitHubSetupType**: `src/cli/helpers/issue-tracker/github-multi-repo.ts:80+`

---

## References

- **Incident**: GitHub multirepo init flow bypass (2025-11-24)
- **Root Cause**: Early return on line 96-97 bypassed RepoStructureManager
- **Impact**: 100% of multirepo users missed parent repo prompt, bulk discovery, smart validation
- **Fix**: 2-line change (removed early return, added architecture mapping)
- **Tests**: All github-multi-repo-conditional tests passing (4/4 ✅)

---

## Summary

**NEVER use early returns in routing code that bypass enhanced logic.**

Use architecture mapping instead:
```typescript
// ❌ WRONG:
if (option === 'advanced') {
  return { type: 'basic' };  // Bypasses EnhancedManager!
}

// ✅ CORRECT:
let mappedOption: AdvancedType | undefined = undefined;
if (option === 'advanced') {
  mappedOption = 'enhanced';  // Map, don't return!
}
// ... fall through to EnhancedManager ...
```

Early returns are ONLY for exit conditions (unsupported options, errors), NOT routing decisions!

---

**Status**: ✅ Accepted and Enforced
**Reviewed By**: Code review checklist added to CONTRIBUTING.md
**Incidents Prevented**: Parent repo prompt bypass, bulk discovery bypass, validation bypass
