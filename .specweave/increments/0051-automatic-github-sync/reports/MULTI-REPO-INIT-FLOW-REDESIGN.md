# Multi-Repo Init Flow Redesign

**Date**: 2025-01-23
**Issue**: UX confusion when using pattern matching - parent repo asked BEFORE discovery
**Solution**: Discover repos FIRST, then select parent from discovered list

---

## Problem Statement

**Current flow (BROKEN UX)**:
1. Ask "Use existing parent or create new?" → User enters parent name
2. Ask "How many IMPLEMENTATION repositories?" → User enters count
3. Pattern matching discovers repos (including the parent!)
4. Result: Parent repo was already configured separately, but appears in discovered list

**Example scenario**:
```
User has repos: sw-qr-menu, sw-qr-menu-be, sw-qr-menu-fe, sw-qr-menu-shared

Current flow:
1. "Parent name?" → sw-qr-menu
2. "How many implementation repos?" → 3
3. Pattern "starts:sw-qr-menu" finds: sw-qr-menu, sw-qr-menu-be, sw-qr-menu-fe, sw-qr-menu-shared
4. Mismatch: 4 found, but user said 3 + already configured sw-qr-menu
```

---

## Solution: Discover-First Flow

**NEW FLOW (Pattern/All repos)**:
1. Ask "How do you want to configure?" → **Pattern matching** (FIRST!)
2. Ask "GitHub owner?" → anton-abyzov
3. Discover repos via pattern (e.g., "starts:sw-qr-menu")
4. **Ask "Which repo is the parent?"** → Select from discovered OR enter manually
5. Implementation repos = discovered - parent (auto-detected, no count question)
6. Configure each implementation repo

**MANUAL FLOW** (unchanged):
1. Ask "Use existing parent or create new?"
2. Ask "How many implementation repos?"
3. Enter each repo manually
4. Optional: Bulk discovery prompt (old behavior preserved)

---

## Implementation Details

### File: `src/core/repo-structure/repo-structure-manager.ts`

**Key changes**:

1. **New discovery strategy variable** (line 464):
   ```typescript
   let discoveryStrategy: 'manual' | 'pattern-first' = 'manual';
   let discoveredRepos: DiscoveredRepo[] = [];
   let owner: string = '';
   ```

2. **Ask configuration method FIRST** (lines 468-492):
   ```typescript
   const { configMethod } = await inquirer.prompt([{
     type: 'list',
     name: 'configMethod',
     message: 'How do you want to configure these repositories?',
     choices: [
       'Manual entry',
       'Pattern matching - Discover repositories, then select parent'
     ]
   }]);
   ```

3. **Pattern-first flow** (lines 494-625):
   - Get owner first (needed for API)
   - Discover repos via pattern matching
   - **Ask "Which repo is the parent?"** (select from discovered OR enter manually)
   - Remove parent from discoveredRepos
   - Set config.parentRepo
   - Skip count question (auto-detected)

4. **Manual flow** (lines 627-874):
   - Existing logic unchanged
   - Parent questions first
   - Count question
   - Optional bulk discovery (old behavior)

5. **Repository configuration loop** (lines 968+):
   - Uses `discoveredRepos` from either flow
   - `bulkDiscoveryStrategy` set based on `discoveryStrategy`
   - No changes needed (already handles discovered repos)

---

## Benefits

✅ **No duplicate parent configuration** - Parent selected from discovered list
✅ **Auto-detect count** - No need to count repos manually when using pattern
✅ **Clear UX** - Discover repos → Select parent → Done
✅ **Backward compatible** - Manual flow unchanged
✅ **Flexible** - Can still enter parent manually if not in discovered list

---

## Testing Checklist

- [ ] Pattern matching flow: Discover 4 repos → Select parent → 3 implementation repos
- [ ] Pattern matching flow: Select "Enter manually" → Falls back to manual flow
- [ ] Manual flow: Parent first → Count → Enter repos (old behavior)
- [ ] Manual flow: Bulk discovery prompt still works (old behavior)
- [ ] Edge case: 0 repos discovered → Error handling
- [ ] Edge case: All repos in pattern → Can still enter parent manually

---

## Migration Impact

**Breaking changes**: None
**API changes**: None
**User impact**: POSITIVE - Better UX for pattern matching

**Rollout plan**:
1. Deploy as part of v0.24.9
2. Update documentation with new flow screenshots
3. Announce in changelog: "Improved multi-repo init flow - discover repos first!"

---

## Related Files

- `src/core/repo-structure/repo-structure-manager.ts` (main changes)
- `src/core/repo-structure/repo-bulk-discovery.ts` (used by both flows)
- `src/core/repo-structure/prompt-consolidator.ts` (prompts)

---

## Conclusion

The redesigned flow eliminates UX confusion by discovering repos FIRST, then selecting the parent from the discovered list. This matches user expectations and removes the need to manually count implementation repos when using pattern matching.

**Impact**: Significant UX improvement for multi-repo setups with 0 breaking changes.
