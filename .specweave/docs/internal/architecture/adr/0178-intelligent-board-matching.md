# ADR-0178: Intelligent Board/Area Path Matching for Living Docs Sync

## Status
Accepted

## Date
2025-12-03

## Context

When syncing increments to living docs in multi-project/multi-board setups, the system needs to determine which board/area path the increment belongs to. Currently, `resolveProjectPath()` in `living-docs-sync.ts` has a 4-level fallback:

1. Explicit `**Project**:` field in spec.md
2. Multi-project mode detection from config
3. Hierarchical path matching against existing folders
4. Ask user if unsure

**The Problem:**

In enterprise setups with 40+ area paths (like ADO TechCorp with Clinical-Insights, AI-Platform, etc.), the system fails to intelligently match increments to the correct board. Instead, it creates features directly in the main project folder (e.g., `techcorp/FS-002` instead of `techcorp/clinical-insights/FS-002`).

**Root Causes:**
1. `detectMultiProjectMode()` only checks `areaPathMapping.mappings[]` (v0.29 format), not `areaPaths[]` (simple list)
2. No content-based matching using increment title/description
3. No keyword matching against board names or configured keywords
4. User prompt only triggers in narrow circumstances

## Decision

Implement **intelligent board matching** with:

### 1. Extended Multi-Project Detection

Detect multi-board scenarios from ALL config formats:
```typescript
// Current: only checks areaPathMapping.mappings[]
// NEW: also check areaPaths[] (simple list)
if (p.config?.areaPaths?.length > 1) {
  // Treat each area path as a potential board
}
```

### 2. Content-Based Matching with Keyword Extraction

Extract keywords from increment spec.md:
- Title (e.g., "Clinical Insights Dashboard")
- Description
- User stories (if any)
- Type field (feature, hotfix, bug)

Match against:
- Area path names (e.g., "Clinical-Insights")
- ChildRepo names/teams (e.g., "clinical-insights")
- Configured keywords (if using `areaPathMapping.mappings[].keywords`)

### 3. Confidence Scoring System

```typescript
interface MatchResult {
  boardId: string;        // Area path or project ID
  boardName: string;      // Human-readable name
  confidence: number;     // 0-100
  matchedTerms: string[]; // Terms that matched
  source: 'areaPath' | 'childRepo' | 'keyword' | 'existing-folder';
}
```

**Scoring Rules:**
- Exact name match: +50 points
- Partial name match (contains): +30 points
- Keyword match: +20 points per keyword
- Fuzzy match (singularization, hyphens): +15 points
- Already has features in this board: +10 points

### 4. Decision Logic

| Confidence | Action |
|------------|--------|
| >80% | Auto-assign, log decision |
| 50-80% | Show best match, ask confirmation |
| <50% | Ask user to select from list |
| 0% (utility/cross-cutting) | Always ask user |

### 5. New BoardMatcher Utility

Create `src/core/living-docs/board-matcher.ts`:

```typescript
export class BoardMatcher {
  constructor(
    private config: SpecweaveConfig,
    private projectRoot: string,
    private logger: Logger
  ) {}

  /**
   * Extract matchable content from increment spec
   */
  extractIncrementKeywords(specContent: string): string[];

  /**
   * Get all available boards from config
   */
  getAvailableBoards(): BoardInfo[];

  /**
   * Match increment content against available boards
   */
  matchIncrement(incrementId: string, specContent: string): MatchResult[];

  /**
   * Determine if user input is needed
   */
  needsUserInput(matches: MatchResult[]): boolean;
}
```

## Implementation Strategy

### Phase 1: BoardMatcher Utility (Core Logic)
- Create `BoardMatcher` class with keyword extraction
- Support all config formats (areaPaths[], areaPathMapping, umbrella.childRepos)
- Implement confidence scoring

### Phase 2: Integration with LivingDocsSync
- Call `BoardMatcher` before creating feature folders
- Add user prompts for low-confidence matches
- Remember user selections for future increments

### Phase 3: Enhanced User Experience
- Show match reasoning in prompts
- Allow saving board preference to spec.md
- Support "cross-cutting" or "utility" as valid choices

## Consequences

### Positive
- Correct board placement without manual `**Project**:` field
- User is asked when system is uncertain (no silent wrong decisions)
- Works with both old (`areaPaths[]`) and new (`areaPathMapping`) config formats
- Enterprise-friendly with 40+ boards

### Negative
- Additional complexity in sync flow
- May prompt user more often (better than wrong placement)
- Keyword matching is heuristic, not perfect

### Neutral
- Existing `**Project**:` field still takes precedence (backward compatible)
- Users can opt out by always specifying project in spec.md

## Alternatives Considered

### 1. Require `**Project**:` Field
**Rejected**: Too manual for large teams, easy to forget

### 2. Always Ask User
**Rejected**: Annoying for obvious matches (e.g., increment named "Clinical Insights Dashboard" obviously goes to clinical-insights)

### 3. Machine Learning Classification
**Rejected**: Over-engineered, keyword matching sufficient for this use case

## Related ADRs
- ADR-0153: Strategy-Based Team Mapping
- ADR-0166: Universal Hierarchy Mapping

## References
- Issue: Living docs sync places features in wrong board
- Config: `.specweave/config.json` with `areaPaths[]` or `areaPathMapping`
