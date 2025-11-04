# Increment 0009: Intelligent Reopen Logic with Automatic Detection

**Created**: 2025-11-04
**Type**: feature
**Priority**: P0
**Status**: active
**Estimated Duration**: 2 weeks (12-15 hours)

---

## Executive Summary

Implement intelligent automatic detection system that knows when to **reopen a completed increment** vs **create a new increment**. The PM agent will analyze user requests, compare against completed increments using semantic similarity, and automatically suggest reopening when additional work fits the same increment.

**Key Innovation**: The system is **intelligent enough to understand context** without requiring manual `/resume` commands. When a user says "Add retry logic to error handling" and increment 0007 handled error handling, the PM agent detects this relationship and suggests reopening 0007 instead of creating 0009.

---

## Problem Statement

### Current State (Manual)

**User discovers additional work for completed increment**:

```bash
# Current workflow (manual, error-prone):
User: "Add retry logic to error handling in increment 0007"

# User must explicitly:
1. Remember increment 0007 handled error handling
2. Manually run /specweave:resume 0007
3. Specify reopen reason
4. Update scope manually

# If user forgets and runs:
/inc "Add retry logic to error handling"

# Result: Creates 0009 (duplicate work!)
❌ New increment created
❌ Duplicates increment 0007 context
❌ Splits related work across increments
❌ No traceability
```

### Desired State (Intelligent)

**System automatically detects relationship and suggests reopen**:

```bash
User: "Add retry logic to error handling"

PM Agent (analyzing):
✓ Scanning completed increments...
✓ Found related increment: 0007-smart-increment-discipline
  - Similarity: 87% (error handling, retry logic)
  - Status: completed (3 days ago)
  - GitHub issue: #4 (closed)

🤔 DETECTED RELATED INCREMENT

This work appears related to:
📋 Increment 0007: Smart Increment Discipline
   - Handles error handling architecture
   - Completed 3 days ago
   - Similarity: 87%

Options:
1. 🔄 Reopen increment 0007 (add to existing)
   - Keeps related work together
   - Maintains context and history
   - Reopens GitHub issue #4

2. ✨ Create new increment 0009 (separate work)
   - Starts fresh increment
   - Creates new GitHub issue
   - Use if work is significantly different

What would you like to do? [1/2]:
```

---

## User Stories

### US-001: PM Agent Detects Related Increments (Core Intelligence)

**As a** developer
**I want** the PM agent to automatically detect when my work relates to a completed increment
**So that** I don't accidentally create duplicate increments for related work

**Acceptance Criteria**:
- [ ] **AC-US1-01**: PM agent scans all completed increments before planning new work (P0, testable)
- [ ] **AC-US1-02**: Calculates semantic similarity between user request and increment specs (P0, testable)
- [ ] **AC-US1-03**: Detects similarity >70% as "related" (P0, testable, configurable)
- [ ] **AC-US1-04**: Shows top 3 related increments if multiple matches (P1, testable)
- [ ] **AC-US1-05**: Handles no matches gracefully (creates new increment) (P0, testable)

**Example**:
```typescript
// User request
"Add exponential backoff to API retries"

// PM agent analyzes
const userIntent = analyzeUserRequest(userRequest);
const completed = getCompletedIncrements();
const matches = findRelatedIncrements(userIntent, completed);

// matches = [
//   { id: '0007', similarity: 0.85, reason: 'retry logic, API calls' },
//   { id: '0003', similarity: 0.42, reason: 'API integration' }
// ]

if (matches[0].similarity > 0.70) {
  promptUserToReopen(matches[0]);
}
```

---

### US-002: Interactive Reopen vs Create Decision

**As a** developer
**I want** clear options when related increment is detected
**So that** I can decide whether to reopen or create new

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Shows increment details (title, completion date, GitHub issue) (P0, testable)
- [ ] **AC-US2-02**: Explains similarity score and why it matched (P0, testable)
- [ ] **AC-US2-03**: Offers 2 clear options: Reopen or Create New (P0, testable)
- [ ] **AC-US2-04**: Shows consequences of each choice (P1, testable)
- [ ] **AC-US2-05**: Defaults to safer option (create new) if user unsure (P1, testable)

**Example Prompt**:
```
🤔 DETECTED RELATED INCREMENT

This work appears related to:
📋 Increment 0007: Smart Increment Discipline
   - Handles: Error handling architecture, retry logic
   - Completed: 3 days ago (2025-11-01)
   - GitHub: Issue #4 (closed)
   - Similarity: 87%
   - Match reasons:
     ✓ "retry logic" (mentioned in spec.md)
     ✓ "error handling" (core focus of increment)
     ✓ Same technical domain (TypeScript utilities)

Options:
1. 🔄 Reopen increment 0007 (RECOMMENDED)
   ✓ Keeps related work together
   ✓ Maintains context and history
   ✓ Reopens GitHub issue #4
   ✓ Updates scope in spec.md
   - Adds tasks to existing tasks.md

2. ✨ Create new increment 0009
   ✓ Starts fresh increment
   ✓ Creates new GitHub issue
   ✓ Use if work is significantly different
   - More overhead (new context)

What would you like to do? [1/2]: _
```

---

### US-003: Automatic Scope Update on Reopen

**As a** developer
**I want** the system to automatically update the increment scope when reopening
**So that** I don't have to manually edit spec.md and regenerate tasks

**Acceptance Criteria**:
- [ ] **AC-US3-01**: PM agent updates spec.md with additional scope (P0, testable)
- [ ] **AC-US3-02**: Preserves original user stories (marks as "Original") (P0, testable)
- [ ] **AC-US3-03**: Adds new user stories (marks as "Added in Reopen v2") (P0, testable)
- [ ] **AC-US3-04**: Architect reviews updated spec and regenerates plan.md (P0, testable)
- [ ] **AC-US3-05**: test-aware-planner generates new tasks for added scope (P0, testable)
- [ ] **AC-US3-06**: Preserves completed tasks (marks as [x]) (P0, testable)
- [ ] **AC-US3-07**: Appends new tasks to tasks.md (P0, testable)

**Example (spec.md)**:
```markdown
# Original Scope (Completed 2025-11-01)

## US1: Basic Error Handling
- [x] AC-US1-01: Catch and log errors
- [x] AC-US1-02: Show user-friendly messages

## US2: Error Recovery
- [x] AC-US2-01: Retry failed operations
- [x] AC-US2-02: Fallback mechanisms

---

# Added in Reopen v2 (2025-11-04)

**Reopen Reason**: Need exponential backoff and circuit breaker

## US3: Advanced Retry Logic (NEW)
- [ ] AC-US3-01: Implement exponential backoff
- [ ] AC-US3-02: Add jitter to prevent thundering herd
- [ ] AC-US3-03: Configure max retry attempts

## US4: Circuit Breaker Pattern (NEW)
- [ ] AC-US4-01: Detect repeated failures
- [ ] AC-US4-02: Open circuit after threshold
- [ ] AC-US4-03: Half-open state for testing recovery
```

---

### US-004: Intelligent Similarity Algorithm

**As a** PM agent
**I want** to accurately calculate semantic similarity between user requests and increment specs
**So that** I can reliably detect related work

**Acceptance Criteria**:
- [ ] **AC-US4-01**: Extracts keywords from user request (P0, testable)
- [ ] **AC-US4-02**: Extracts keywords from increment spec.md (P0, testable)
- [ ] **AC-US4-03**: Calculates keyword overlap percentage (P0, testable)
- [ ] **AC-US4-04**: Weights domain-specific terms higher (e.g., "retry", "circuit breaker") (P1, testable)
- [ ] **AC-US4-05**: Considers technical stack (TypeScript, Python, etc.) (P1, testable)
- [ ] **AC-US4-06**: Returns similarity score 0-100% (P0, testable)
- [ ] **AC-US4-07**: Configurable similarity threshold (default 70%) (P2, testable)

**Algorithm**:
```typescript
interface SimilarityMatch {
  incrementId: string;
  similarity: number; // 0-100
  matchedKeywords: string[];
  reason: string;
}

function calculateSimilarity(
  userRequest: string,
  incrementSpec: string
): number {
  // 1. Extract keywords (noun phrases, verbs, technical terms)
  const userKeywords = extractKeywords(userRequest);
  const specKeywords = extractKeywords(incrementSpec);

  // 2. Calculate Jaccard similarity (intersection/union)
  const intersection = userKeywords.filter(k => specKeywords.includes(k));
  const union = [...new Set([...userKeywords, ...specKeywords])];
  const jaccardScore = intersection.length / union.length;

  // 3. Weight domain-specific terms (2x weight)
  const domainTerms = ['retry', 'error', 'circuit breaker', 'backoff'];
  const domainMatches = intersection.filter(k => domainTerms.includes(k));
  const domainBonus = domainMatches.length * 0.1; // +10% per domain match

  // 4. Final score
  return Math.min(100, (jaccardScore + domainBonus) * 100);
}

function findRelatedIncrements(
  userRequest: string,
  threshold: number = 70
): SimilarityMatch[] {
  const completedIncrements = getCompletedIncrements();

  const matches = completedIncrements.map(inc => {
    const spec = readFile(inc.specPath);
    const similarity = calculateSimilarity(userRequest, spec);
    const matchedKeywords = getMatchedKeywords(userRequest, spec);

    return {
      incrementId: inc.id,
      similarity,
      matchedKeywords,
      reason: generateMatchReason(matchedKeywords)
    };
  });

  // Sort by similarity (highest first)
  return matches
    .filter(m => m.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3); // Top 3 matches
}
```

---

### US-005: Sync Reopen to GitHub/ADO/Jira

**As a** developer
**I want** reopened increments to automatically reopen their synced issues
**So that** external PM tools stay in sync without manual intervention

**Acceptance Criteria**:
- [ ] **AC-US5-01**: Detects synced GitHub issue from metadata.json (P0, testable)
- [ ] **AC-US5-02**: Reopens GitHub issue via gh CLI (P0, testable)
- [ ] **AC-US5-03**: Posts comment explaining reopen with new scope (P0, testable)
- [ ] **AC-US5-04**: Updates labels: +reopened, +scope-change, -completed (P0, testable)
- [ ] **AC-US5-05**: Updates issue description with added scope (P1, testable)
- [ ] **AC-US5-06**: Same logic for ADO work items (P1, testable)
- [ ] **AC-US5-07**: Same logic for Jira issues (P1, testable)

**Example (GitHub issue comment)**:
```markdown
🔄 **Increment Reopened with Additional Scope**

**Original Scope** (Completed 2025-11-01):
- ✅ Basic error handling
- ✅ Simple retry logic

**Added Scope** (2025-11-04):
- ⏳ Exponential backoff
- ⏳ Circuit breaker pattern
- ⏳ Jitter for retry timing

**Why**: Need advanced retry mechanisms for production resilience

**New Tasks**: 7 tasks added (see increment for details)

---
🤖 Reopened automatically by SpecWeave PM Agent
```

---

## Technical Architecture

### Component 1: Similarity Engine

**File**: `src/core/similarity/increment-similarity.ts`

```typescript
/**
 * Increment Similarity Engine
 * Calculates semantic similarity between user requests and completed increments
 */
export class IncrementSimilarity {
  /**
   * Find related completed increments
   */
  static async findRelated(
    userRequest: string,
    threshold: number = 70
  ): Promise<SimilarityMatch[]> {
    const completed = MetadataManager.getCompleted();

    const matches = await Promise.all(
      completed.map(async (metadata) => {
        const specPath = path.join(
          process.cwd(),
          '.specweave/increments',
          metadata.id,
          'spec.md'
        );

        const spec = await fs.readFile(specPath, 'utf-8');
        const similarity = this.calculateSimilarity(userRequest, spec);
        const keywords = this.getMatchedKeywords(userRequest, spec);

        return {
          incrementId: metadata.id,
          incrementTitle: this.extractTitle(spec),
          similarity,
          matchedKeywords: keywords,
          reason: this.generateReason(keywords),
          completedDate: metadata.lastActivity,
          githubIssue: metadata.github?.issue
        };
      })
    );

    return matches
      .filter(m => m.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
  }

  /**
   * Calculate similarity score (0-100)
   */
  private static calculateSimilarity(
    userRequest: string,
    incrementSpec: string
  ): number {
    const userKeywords = this.extractKeywords(userRequest);
    const specKeywords = this.extractKeywords(incrementSpec);

    // Jaccard similarity
    const intersection = userKeywords.filter(k =>
      specKeywords.some(s => this.fuzzyMatch(k, s))
    );
    const union = [...new Set([...userKeywords, ...specKeywords])];
    const jaccard = intersection.length / union.length;

    // Domain term bonus
    const domainBonus = this.calculateDomainBonus(intersection);

    return Math.min(100, Math.round((jaccard + domainBonus) * 100));
  }

  /**
   * Extract keywords (noun phrases, technical terms)
   */
  private static extractKeywords(text: string): string[] {
    // Simple keyword extraction (can be enhanced with NLP)
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3); // Filter short words

    // Remove stop words
    const stopWords = ['that', 'this', 'with', 'from', 'have', 'will'];
    return words.filter(w => !stopWords.includes(w));
  }

  /**
   * Fuzzy match (handles plurals, tenses)
   */
  private static fuzzyMatch(a: string, b: string): boolean {
    // Exact match
    if (a === b) return true;

    // Stem match (simple: remove common suffixes)
    const stemA = a.replace(/(ing|ed|s|es)$/, '');
    const stemB = b.replace(/(ing|ed|s|es)$/, '');
    return stemA === stemB;
  }

  /**
   * Calculate domain-specific term bonus
   */
  private static calculateDomainBonus(keywords: string[]): number {
    const domainTerms = [
      'retry', 'error', 'circuit', 'breaker', 'backoff',
      'timeout', 'resilience', 'recovery', 'fallback'
    ];

    const matches = keywords.filter(k =>
      domainTerms.some(d => this.fuzzyMatch(k, d))
    );

    return matches.length * 0.1; // +10% per domain match
  }

  /**
   * Generate human-readable match reason
   */
  private static generateReason(keywords: string[]): string {
    if (keywords.length === 0) return 'General similarity';
    if (keywords.length === 1) return `Matched: "${keywords[0]}"`;

    const shown = keywords.slice(0, 3);
    const rest = keywords.length - shown.length;
    const suffix = rest > 0 ? `, +${rest} more` : '';

    return `Matched: ${shown.map(k => `"${k}"`).join(', ')}${suffix}`;
  }
}
```

---

### Component 2: PM Agent Intelligence

**File**: `plugins/specweave/agents/pm/AGENT.md` (enhanced)

**Add new step 0A before existing Step 0**:

```markdown
## STEP 0A: Intelligent Reopen Detection (NEW!)

**CRITICAL**: Before checking incomplete increments, check if this work relates to a COMPLETED increment.

### Algorithm

1. **Analyze user request**:
   ```typescript
   const userRequest = getUserInput();
   const intent = analyzeIntent(userRequest);
   ```

2. **Scan completed increments**:
   ```typescript
   const matches = await IncrementSimilarity.findRelated(userRequest);
   ```

3. **If match found (similarity >70%)**:
   ```typescript
   if (matches.length > 0) {
     const topMatch = matches[0];

     console.log('🤔 DETECTED RELATED INCREMENT\n');
     console.log(`📋 Increment ${topMatch.incrementId}: ${topMatch.incrementTitle}`);
     console.log(`   - Similarity: ${topMatch.similarity}%`);
     console.log(`   - Completed: ${topMatch.completedDate}`);
     console.log(`   - Match reason: ${topMatch.reason}`);
     console.log('');

     const choice = await prompt({
       type: 'select',
       message: 'What would you like to do?',
       choices: [
         {
           name: '1',
           message: `🔄 Reopen increment ${topMatch.incrementId} (add to existing)`,
           hint: 'Keeps related work together'
         },
         {
           name: '2',
           message: '✨ Create new increment (separate work)',
           hint: 'Use if work is significantly different'
         }
       ]
     });

     if (choice === '1') {
       // REOPEN FLOW
       await reopenIncrementWithScope(topMatch.incrementId, userRequest);
       return; // Exit - don't create new increment
     }

     // If choice === '2', continue with normal flow (create new)
   }
   ```

4. **If no match (similarity <70%)**: Continue with normal flow (Step 0, check incomplete)

### Reopen Flow

When user chooses to reopen:

```typescript
async function reopenIncrementWithScope(
  incrementId: string,
  additionalScope: string
): Promise<void> {
  // 1. Get reopen reason from user
  const reason = await prompt({
    type: 'text',
    message: 'Reason for reopening:',
    initial: additionalScope
  });

  // 2. Reopen increment
  await MetadataManager.reopen(incrementId, reason);

  // 3. Update spec.md with additional scope
  await updateSpecWithScope(incrementId, additionalScope);

  // 4. Invoke Architect to update plan.md
  await invokeArchitect(incrementId);

  // 5. Invoke test-aware-planner to generate new tasks
  await invokeTestAwarePlanner(incrementId);

  // 6. Reopen synced issues (GitHub/ADO/Jira)
  await reopenSyncedIssues(incrementId, reason, additionalScope);

  // 7. Show success
  console.log(`✅ Increment ${incrementId} reopened`);
  console.log(`✅ Scope updated and tasks generated`);
  console.log(`✅ External issues reopened`);
  console.log('');
  console.log(`Next: /specweave:do ${incrementId}`);
}
```

---

### Component 3: Scope Updater

**File**: `src/core/increment/scope-updater.ts`

```typescript
/**
 * Update increment spec with additional scope
 */
export async function updateSpecWithScope(
  incrementId: string,
  additionalScope: string
): Promise<void> {
  const specPath = path.join(
    process.cwd(),
    '.specweave/increments',
    incrementId,
    'spec.md'
  );

  const spec = await fs.readFile(specPath, 'utf-8');

  // Find last user story section
  const reopenSection = `

---

# Added in Reopen v${getReopenVersion(incrementId)} (${new Date().toISOString().split('T')[0]})

**Reopen Reason**: ${additionalScope}

${await generateUserStories(additionalScope)}
`;

  // Append to spec
  await fs.writeFile(specPath, spec + reopenSection);

  console.log(`✅ Updated spec.md with additional scope`);
}

function getReopenVersion(incrementId: string): number {
  const metadata = MetadataManager.read(incrementId);
  return (metadata.reopenHistory?.length || 0) + 1;
}
```

---

## Configuration

**File**: `.specweave/config.json`

```json
{
  "intelligence": {
    "reopen_detection": {
      "enabled": true,
      "similarity_threshold": 70,
      "max_matches_shown": 3,
      "domain_terms": [
        "retry", "error", "circuit breaker", "backoff",
        "timeout", "resilience", "recovery", "fallback"
      ],
      "auto_reopen_threshold": 95
    }
  }
}
```

**Settings**:
- `enabled`: Enable intelligent reopen detection (default: true)
- `similarity_threshold`: Minimum similarity to suggest reopen (default: 70%)
- `max_matches_shown`: Max related increments to show (default: 3)
- `domain_terms`: Domain-specific keywords for bonus scoring
- `auto_reopen_threshold`: Auto-reopen without prompt if similarity >95% (default: 95)

---

## Edge Cases

### 1. Multiple High-Similarity Matches

```typescript
// Scenario: User request matches 2 increments at 85% each

const matches = [
  { id: '0007', similarity: 85, title: 'Error Handling' },
  { id: '0005', similarity: 82, title: 'API Resilience' }
];

// Solution: Show both, let user choose
console.log('🤔 Found 2 related increments:\n');
matches.forEach((m, i) => {
  console.log(`${i + 1}. Increment ${m.id}: ${m.title} (${m.similarity}%)`);
});

const choice = await prompt({
  choices: [
    '1: Reopen 0007',
    '2: Reopen 0005',
    '3: Create new increment'
  ]
});
```

### 2. Similarity Exactly at Threshold (70%)

```typescript
// Scenario: Match at exactly 70%

if (similarity === threshold) {
  // Prompt user with explanation
  console.log(`⚠️  Borderline match (${similarity}%)`);
  console.log('This work MAY be related. Review carefully before deciding.');
}
```

### 3. User Requests Reopen Explicitly

```typescript
// Scenario: User says "Add to increment 0007"

if (userRequest.includes('add to increment') || userRequest.includes('reopen')) {
  const incrementId = extractIncrementId(userRequest);
  if (incrementId) {
    // Skip similarity check, go straight to reopen
    await reopenIncrementWithScope(incrementId, userRequest);
    return;
  }
}
```

### 4. Increment Has Multiple Reopens

```typescript
// Scenario: Increment reopened 3+ times (quality signal)

const metadata = MetadataManager.read(incrementId);
if (metadata.reopenHistory && metadata.reopenHistory.length >= 3) {
  console.log(`⚠️  WARNING: Increment ${incrementId} has been reopened ${metadata.reopenHistory.length} times`);
  console.log('Frequent reopens may indicate:');
  console.log('- Insufficient initial planning');
  console.log('- Unclear requirements');
  console.log('- Missing test coverage');
  console.log('');
  console.log('Consider creating a new increment instead.');
}
```

---

## Success Metrics

**Intelligence Accuracy**:
- ✅ 90%+ of related work correctly detected (similarity >70%)
- ✅ <5% false positives (unrelated work flagged as related)
- ✅ <10% false negatives (related work not detected)

**User Experience**:
- ✅ Reopen decision takes <30 seconds (fast workflow)
- ✅ Users understand why match was suggested (clear reasoning)
- ✅ 80%+ of users choose to reopen when suggested (trust the system)

**Code Quality**:
- ✅ No duplicate increments for same work
- ✅ Related work stays together (easier to maintain)
- ✅ Clear audit trail (reopen history)

---

## Implementation Phases

### Phase 1: Core Similarity Engine (4-5 hours)

**Tasks**:
- [ ] Create `IncrementSimilarity` class
- [ ] Implement keyword extraction
- [ ] Implement Jaccard similarity calculation
- [ ] Add domain-specific term weighting
- [ ] Write unit tests (various similarity scenarios)

**Files**:
- `src/core/similarity/increment-similarity.ts` (new)
- `tests/unit/similarity/increment-similarity.test.ts` (new)

---

### Phase 2: PM Agent Intelligence (3-4 hours)

**Tasks**:
- [ ] Add Step 0A to PM agent (reopen detection)
- [ ] Implement interactive reopen prompt
- [ ] Add multi-match handling
- [ ] Add explicit reopen detection ("add to 0007")
- [ ] Write integration tests

**Files**:
- `plugins/specweave/agents/pm/AGENT.md` (update)
- `plugins/specweave/lib/reopen-with-scope.ts` (new)
- `tests/integration/pm-agent/reopen-detection.test.ts` (new)

---

### Phase 3: Scope Updater (2-3 hours)

**Tasks**:
- [ ] Create `updateSpecWithScope()` function
- [ ] Parse existing spec.md structure
- [ ] Append reopen section with new scope
- [ ] Preserve completed user stories
- [ ] Add reopen version tracking
- [ ] Write unit tests

**Files**:
- `src/core/increment/scope-updater.ts` (new)
- `tests/unit/increment/scope-updater.test.ts` (new)

---

### Phase 4: GitHub/ADO/Jira Sync (2-3 hours)

**Tasks**:
- [ ] Implement `reopenSyncedIssues()` orchestrator
- [ ] Update GitHub plugin to post scope change comment
- [ ] Update ADO plugin to post scope change comment
- [ ] Update Jira plugin to post scope change comment
- [ ] Update issue descriptions with added scope
- [ ] Write integration tests

**Files**:
- `src/core/sync/reopen-orchestrator.ts` (new)
- `plugins/specweave-github/lib/reopen-issue.ts` (update)
- `plugins/specweave-ado/lib/reopen-work-item.ts` (update)
- `plugins/specweave-jira/lib/reopen-issue.ts` (update)
- `tests/integration/sync/reopen-orchestrator.test.ts` (new)

---

### Phase 5: Testing & Documentation (2-3 hours)

**Tasks**:
- [ ] E2E test: Complete → Reopen with scope → Complete
- [ ] E2E test: Multiple high-similarity matches
- [ ] E2E test: Explicit reopen request
- [ ] Update CHANGELOG.md
- [ ] Update user documentation
- [ ] Update CLAUDE.md
- [ ] Create examples and tutorials

**Files**:
- `tests/e2e/intelligent-reopen.spec.ts` (new)
- `CHANGELOG.md` (update)
- `docs-site/docs/guides/intelligent-reopen.md` (new)
- `CLAUDE.md` (update)
- `README.md` (update)

---

## Out of Scope (Future Enhancements)

- ⏳ Machine learning-based similarity (currently uses keyword matching)
- ⏳ User feedback on match quality (learn from corrections)
- ⏳ Bulk reopen (reopen multiple increments at once)
- ⏳ Reopen analytics dashboard
- ⏳ AI suggests reopen proactively (monitors conversations)

---

## Dependencies

**Existing Components**:
- ✅ MetadataManager (increment 0007)
- ✅ IncrementStatus enum (increment 0007)
- ✅ VALID_TRANSITIONS (updated in increment 0007)
- ✅ PM agent framework (increment 0001)
- ✅ GitHub/ADO/Jira sync plugins (increment 0004)

**New Dependencies**:
- None (uses existing Node.js stdlib)

---

## References

### Related Increments

- 0007-smart-increment-discipline - Metadata system, status management
- 0004-plugin-architecture - Sync plugins (GitHub/ADO/Jira)
- 0001-core-framework - PM agent, increment lifecycle

### Related Issues

- #15 - [INC-0007] Smart Increment Discipline (current tracking)
- #4 - Original issue (closed, needs reopen)

### Related Documentation

- [REOPEN-LOGIC-DESIGN.md](reports/REOPEN-LOGIC-DESIGN.md) - Detailed design
- [Increment Lifecycle](docs-site/docs/concepts/increment-lifecycle.md)
- [PM Agent](plugins/specweave/agents/pm/AGENT.md)

---

**End of Specification**
