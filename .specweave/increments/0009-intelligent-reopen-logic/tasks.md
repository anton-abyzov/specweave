---
increment: 0009-intelligent-reopen-logic
total_tasks: 18
test_mode: TDD
coverage_target: 85%
---

# Tasks for Increment 0009: Intelligent Reopen Logic with Automatic Detection

**Complete specification**: [spec.md](./spec.md)
**Implementation plan**: [plan.md](./plan.md)

**Type**: feature
**Priority**: P0
**Estimated Duration**: 12-15 hours (2 weeks)

---

## Phase 1: Core Similarity Engine (4-5 hours, ~500 lines)

### T-001: Create IncrementSimilarity Class Foundation
**User Story**: [US-004: Intelligent Similarity Algorithm](../../docs/internal/specs/default/intelligent-reopen-logic/us-004-intelligent-similarity-algorithm.md)


**AC**: AC-US4-01, AC-US4-02, AC-US4-06

**Test Plan** (BDD format):
- **Given** user request "Add retry logic to API" → **When** extract keywords → **Then** returns ["retry", "logic", "api"]
- **Given** increment spec.md with "error handling" → **When** extract keywords → **Then** returns ["error", "handling"]
- **Given** empty text → **When** extract keywords → **Then** returns empty array

**Test Cases**:
- Unit (`tests/unit/similarity/increment-similarity.test.ts`):
  - extractKeywords_validText → returns filtered words (90% coverage)
  - extractKeywords_withStopWords → removes "the", "with", "from" (100%)
  - extractKeywords_shortWords → filters words <4 chars (100%)
  - extractKeywords_emptyText → handles empty input (100%)
  - extractKeywords_punctuation → removes punctuation correctly (100%)
- **Overall: 92% coverage**

**Implementation**:
1. Create `src/core/similarity/increment-similarity.ts`
2. Define `IncrementSimilarity` class with static methods
3. Implement `extractKeywords(text: string): string[]`
   - Lowercase and remove punctuation
   - Split by whitespace
   - Filter stop words: ["that", "this", "with", "from", "have", "will", "should", "could", "would", "there", "when", "where"]
   - Filter short words (<4 chars)
   - Return unique keywords
4. Define `SimilarityMatch` interface with incrementId, similarity, matchedKeywords, reason, completedDate, githubIssue
5. Add JSDoc comments explaining algorithm
6. TDD workflow: Write tests first, implement to pass

**Dependencies**: None (foundation task)

---

### T-002: Implement Fuzzy Keyword Matching
**User Story**: [US-004: Intelligent Similarity Algorithm](../../docs/internal/specs/default/intelligent-reopen-logic/us-004-intelligent-similarity-algorithm.md)


**AC**: AC-US4-01, AC-US4-02

**Test Plan** (BDD format):
- **Given** keywords "retry" and "retries" → **When** fuzzy match → **Then** returns true (plural match)
- **Given** keywords "handle" and "handling" → **When** fuzzy match → **Then** returns true (tense match)
- **Given** keywords "error" and "timeout" → **When** fuzzy match → **Then** returns false (no match)

**Test Cases**:
- Unit (`tests/unit/similarity/increment-similarity.test.ts`):
  - fuzzyMatch_exactMatch → "retry" matches "retry" (100%)
  - fuzzyMatch_plurals → "retry" matches "retries" (100%)
  - fuzzyMatch_tenses → "handle" matches "handling", "handled" (100%)
  - fuzzyMatch_suffixes → removes "ing", "ed", "s", "es" correctly (100%)
  - fuzzyMatch_noMatch → returns false for different stems (100%)
- **Overall: 95% coverage**

**Implementation**:
1. Add private static method `fuzzyMatch(a: string, b: string): boolean`
2. Check exact match first (performance)
3. Apply stemming: remove common suffixes (ing, ed, s, es)
4. Compare stemmed versions
5. Return boolean result
6. TDD workflow: Red → Green → Refactor

**Dependencies**: T-001 (uses extractKeywords)

---

### T-003: Implement Jaccard Similarity Calculation
**User Story**: [US-004: Intelligent Similarity Algorithm](../../docs/internal/specs/default/intelligent-reopen-logic/us-004-intelligent-similarity-algorithm.md)


**AC**: AC-US4-03, AC-US4-06

**Test Plan** (BDD format):
- **Given** user "retry error" and spec "retry error timeout" → **When** calculate similarity → **Then** returns 67% (2/3 keywords)
- **Given** identical keywords → **When** calculate similarity → **Then** returns 100%
- **Given** no common keywords → **When** calculate similarity → **Then** returns 0%

**Test Cases**:
- Unit (`tests/unit/similarity/increment-similarity.test.ts`):
  - calculateSimilarity_identical → 100% for same text (100%)
  - calculateSimilarity_partialMatch → 67% for 2/3 keywords (100%)
  - calculateSimilarity_noMatch → 0% for different keywords (100%)
  - calculateSimilarity_fuzzyMatching → counts plurals/tenses as matches (100%)
  - calculateSimilarity_emptyText → handles empty gracefully (100%)
- **Overall: 90% coverage**

**Implementation**:
1. Add private static method `calculateSimilarity(userRequest: string, incrementSpec: string): number`
2. Extract keywords from both texts
3. Calculate intersection using fuzzyMatch (count matched keywords)
4. Calculate union (all unique keywords)
5. Compute Jaccard: intersection.length / union.length
6. Return score as percentage (0-100)
7. TDD workflow: Test edge cases (empty, identical, no match)

**Dependencies**: T-001 (extractKeywords), T-002 (fuzzyMatch)

---

### T-004: Add Domain-Specific Term Weighting
**User Story**: [US-004: Intelligent Similarity Algorithm](../../docs/internal/specs/default/intelligent-reopen-logic/us-004-intelligent-similarity-algorithm.md)


**AC**: AC-US4-04, AC-US4-06

**Test Plan** (BDD format):
- **Given** matched keywords include "retry" (domain term) → **When** calculate bonus → **Then** adds +10%
- **Given** 2 domain term matches → **When** calculate bonus → **Then** adds +20%
- **Given** no domain term matches → **When** calculate bonus → **Then** adds 0%

**Test Cases**:
- Unit (`tests/unit/similarity/increment-similarity.test.ts`):
  - calculateDomainBonus_singleMatch → +10% for "retry" (100%)
  - calculateDomainBonus_multipleMatches → +20% for 2 domain terms (100%)
  - calculateDomainBonus_noMatches → 0% for regular keywords (100%)
  - calculateDomainBonus_maxCap → caps at +30% (3 matches) (100%)
  - finalScore_withBonus → Jaccard 67% + 20% bonus = 87% (100%)
- **Overall: 92% coverage**

**Implementation**:
1. Define `DOMAIN_TERMS` constant: ["retry", "error", "circuit", "breaker", "backoff", "timeout", "resilience", "recovery", "fallback", "throttle", "rate-limit", "exponential", "jitter"]
2. Add private static method `calculateDomainBonus(keywords: string[]): number`
3. Count domain term matches using fuzzyMatch
4. Return matches * 0.1 (10% per match)
5. Update calculateSimilarity to add domain bonus: `Math.min(100, (jaccard + domainBonus) * 100)`
6. TDD workflow: Test bonus calculation separately, then integrated score

**Dependencies**: T-003 (calculateSimilarity)

---

### T-005: Implement findRelated Method with Metadata Integration
**User Story**: [US-001: PM Agent Detects Related Increments (Core Intelligence)](../../docs/internal/specs/default/intelligent-reopen-logic/us-001-pm-agent-detects-related-increments-core-intelligence.md)


**AC**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05

**Test Plan** (BDD format):
- **Given** user "Add retry logic" and completed increment 0007 (error handling) → **When** findRelated → **Then** returns 87% match
- **Given** similarity 85% (>threshold 70%) → **When** findRelated → **Then** includes in results
- **Given** similarity 65% (<threshold 70%) → **When** findRelated → **Then** excludes from results
- **Given** 5 matches above threshold → **When** findRelated → **Then** returns top 3 sorted by similarity

**Test Cases**:
- Unit (`tests/unit/similarity/increment-similarity.test.ts`):
  - findRelated_singleMatch → returns 1 match above threshold (90%)
  - findRelated_multipleMatches → returns top 3 sorted descending (100%)
  - findRelated_belowThreshold → excludes matches <70% (100%)
  - findRelated_noCompletedIncrements → returns empty array (100%)
  - findRelated_customThreshold → respects custom threshold parameter (100%)
- Integration (`tests/integration/similarity/metadata-integration.test.ts`):
  - findRelated_readsSpecFiles → correctly reads spec.md from increments (85%)
  - findRelated_extractsMetadata → includes title, completedDate, githubIssue (85%)
  - findRelated_handlesInvalidSpec → skips increments with missing spec.md (80%)
- **Overall: 87% coverage**

**Implementation**:
1. Add async static method `findRelated(userRequest: string, threshold: number = 70): Promise<SimilarityMatch[]>`
2. Call `MetadataManager.getCompleted()` to get all completed increments
3. For each increment:
   - Read spec.md from `.specweave/increments/{id}/spec.md`
   - Calculate similarity score
   - Extract matched keywords (intersection)
   - Generate human-readable reason
4. Filter matches >= threshold
5. Sort by similarity descending
6. Return top 3 matches
7. Add error handling: skip increments with missing spec.md, handle empty text
8. TDD workflow: Mock MetadataManager for unit tests, real files for integration tests

**Dependencies**: T-001 through T-004 (full similarity algorithm), MetadataManager (existing from increment 0007)

---

### T-006: Add Helper Methods for Match Reasons
**User Story**: [US-002: Interactive Reopen vs Create Decision](../../docs/internal/specs/default/intelligent-reopen-logic/us-002-interactive-reopen-vs-create-decision.md)


**AC**: AC-US2-02, AC-US2-03

**Test Plan** (BDD format):
- **Given** matched keywords ["retry", "error", "circuit"] → **When** generateReason → **Then** returns 'Matched: "retry", "error", "circuit"'
- **Given** 5 matched keywords → **When** generateReason → **Then** shows first 3 + "+2 more"
- **Given** spec.md → **When** extractTitle → **Then** returns increment title from first heading

**Test Cases**:
- Unit (`tests/unit/similarity/increment-similarity.test.ts`):
  - generateReason_singleKeyword → 'Matched: "retry"' (100%)
  - generateReason_multipleKeywords → shows first 3 + rest count (100%)
  - generateReason_emptyKeywords → "General similarity" (100%)
  - extractTitle_validSpec → extracts "# Increment Title" (100%)
  - extractTitle_noTitle → returns empty string (100%)
  - getMatchedKeywords_returns_intersection → correct keyword list (100%)
- **Overall: 95% coverage**

**Implementation**:
1. Add private static method `generateReason(keywords: string[]): string`
   - If empty: return "General similarity"
   - If 1 keyword: return 'Matched: "{keyword}"'
   - If 2-3 keywords: return 'Matched: "k1", "k2", "k3"'
   - If >3 keywords: return 'Matched: "k1", "k2", "k3", +N more'
2. Add private static method `extractTitle(specContent: string): string`
   - Find first `# ` heading
   - Extract text after `# `
   - Trim and return
3. Add private static method `getMatchedKeywords(userRequest: string, spec: string): string[]`
   - Extract keywords from both
   - Return intersection (matched keywords)
4. TDD workflow: Test each helper independently

**Dependencies**: T-005 (uses in findRelated)

---

## Phase 2: PM Agent Intelligence (3-4 hours, ~600 lines)

### T-007: Add Step 0A to PM Agent with Detection Logic
**User Story**: [US-001: PM Agent Detects Related Increments (Core Intelligence)](../../docs/internal/specs/default/intelligent-reopen-logic/us-001-pm-agent-detects-related-increments-core-intelligence.md)


**AC**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05

**Test Plan** (BDD format):
- **Given** user request "Add retry logic" → **When** PM Step 0A runs → **Then** calls IncrementSimilarity.findRelated()
- **Given** similarity 87% (>70%) → **When** Step 0A → **Then** shows interactive prompt with match details
- **Given** similarity 65% (<70%) → **When** Step 0A → **Then** continues to normal flow (Step 0)

**Test Cases**:
- Integration (`tests/integration/pm-agent/reopen-detection.test.ts`):
  - step0A_highSimilarity → prompts user with match details (85%)
  - step0A_lowSimilarity → skips prompt, continues to Step 0 (85%)
  - step0A_multipleMatches → shows top 3 matches (80%)
  - step0A_noCompletedIncrements → continues to Step 0 (90%)
  - step0A_detectionError → fallback to normal flow (80%)
- **Overall: 84% coverage**

**Implementation**:
1. Update `plugins/specweave/agents/pm/AGENT.md`
2. Add new section before existing Step 0: "## STEP 0A: Intelligent Reopen Detection (MANDATORY - RUNS FIRST)"
3. Add detection logic:
   ```markdown
   1. Call IncrementSimilarity.findRelated(userRequest)
   2. If matches.length > 0 (similarity >= threshold):
      - Show match details (incrementId, title, similarity, completedDate, githubIssue)
      - Show match reasons (matched keywords)
      - Offer 2 options: Reopen or Create New
      - If user chooses Reopen: call reopenIncrementWithScope()
      - If user chooses Create New: continue to Step 0
   3. If matches.length === 0:
      - Continue to Step 0 (check incomplete increments)
   ```
4. Add error handling: try/catch around similarity detection, fallback to normal flow
5. Add clear documentation with examples
6. TDD workflow: Integration tests simulate PM agent execution

**Dependencies**: T-005 (findRelated), existing PM agent structure

---

### T-008: Create reopenIncrementWithScope Helper Function
**User Story**: [US-002: Interactive Reopen vs Create Decision](../../docs/internal/specs/default/intelligent-reopen-logic/us-002-interactive-reopen-vs-create-decision.md)


**AC**: AC-US2-01, AC-US2-03, AC-US3-01, AC-US3-04

**Test Plan** (BDD format):
- **Given** increment 0007 chosen for reopen → **When** reopenIncrementWithScope() → **Then** updates metadata status to ACTIVE
- **Given** additional scope provided → **When** reopenIncrementWithScope() → **Then** calls updateSpecWithScope()
- **Given** spec updated → **When** reopenIncrementWithScope() → **Then** invokes Architect and test-aware-planner agents

**Test Cases**:
- Integration (`tests/integration/pm-agent/reopen-with-scope.test.ts`):
  - reopenWithScope_updatesMetadata → status = ACTIVE (90%)
  - reopenWithScope_updatesSpec → calls updateSpecWithScope() (85%)
  - reopenWithScope_invokesArchitect → Architect updates plan.md (80%)
  - reopenWithScope_invokesPlanner → test-aware-planner generates tasks (80%)
  - reopenWithScope_reopensSyncedIssues → calls reopenSyncedIssues() (85%)
  - reopenWithScope_errorHandling → rollback on failure (80%)
- **Overall: 83% coverage**

**Implementation**:
1. Create `plugins/specweave/lib/reopen-with-scope.ts`
2. Export async function `reopenIncrementWithScope(incrementId: string, additionalScope: string): Promise<void>`
3. Implementation steps:
   - Prompt user for reopen reason (default: additionalScope)
   - Call `MetadataManager.updateStatus(incrementId, IncrementStatus.ACTIVE)`
   - Call `updateSpecWithScope(incrementId, additionalScope)` (from T-010)
   - Invoke Architect agent via Task tool (update plan.md)
   - Invoke test-aware-planner agent via Task tool (generate tasks)
   - Call `reopenSyncedIssues(incrementId, reason, additionalScope)` (from T-013)
   - Show success message with next steps
4. Add error handling: rollback status on failure, clear error messages
5. TDD workflow: Mock dependencies, test orchestration flow

**Dependencies**: T-010 (updateSpecWithScope), T-013 (reopenSyncedIssues), MetadataManager

---

### T-009: Add Interactive Prompt with Match Details
**User Story**: [US-002: Interactive Reopen vs Create Decision](../../docs/internal/specs/default/intelligent-reopen-logic/us-002-interactive-reopen-vs-create-decision.md)


**AC**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05

**Test Plan** (BDD format):
- **Given** match with 87% similarity → **When** show prompt → **Then** displays increment details, similarity %, match reasons
- **Given** 2 options shown → **When** user selects option 1 → **Then** returns "reopen"
- **Given** user cancels prompt → **When** prompt → **Then** returns "create-new" (safer default)

**Test Cases**:
- Integration (`tests/integration/pm-agent/interactive-prompt.test.ts`):
  - prompt_displaysMatchDetails → shows all required fields (90%)
  - prompt_explains_similarity → shows match reasons clearly (85%)
  - prompt_showsConsequences → explains both options (80%)
  - prompt_userSelectsReopen → returns correct choice (100%)
  - prompt_userSelectsCreateNew → returns correct choice (100%)
  - prompt_userCancels → defaults to "create-new" (100%)
- **Overall: 86% coverage**

**Implementation**:
1. Add prompt formatting to PM agent AGENT.md (Step 0A)
2. Create prompt template:
   ```
   🤔 DETECTED RELATED INCREMENT

   This work appears related to:
   📋 Increment {id}: {title}
      - Handles: {summary from spec}
      - Completed: {daysAgo} days ago ({date})
      - GitHub: Issue #{issue} (closed)
      - Similarity: {similarity}%
      - Match reasons:
        ✓ {keyword1}
        ✓ {keyword2}
        ✓ {keyword3}

   Options:
   1. 🔄 Reopen increment {id} (RECOMMENDED)
      ✓ Keeps related work together
      ✓ Maintains context and history
      ✓ Reopens GitHub issue #{issue}
      ✓ Updates scope in spec.md
      - Adds tasks to existing tasks.md

   2. ✨ Create new increment {nextId}
      ✓ Starts fresh increment
      ✓ Creates new GitHub issue
      ✓ Use if work is significantly different
      - More overhead (new context)

   What would you like to do? [1/2]: _
   ```
3. Add logic to extract summary from spec.md (first paragraph or user stories)
4. Calculate "days ago" from completedDate
5. TDD workflow: Test prompt rendering with various match scenarios

**Dependencies**: T-007 (PM Step 0A), T-005 (SimilarityMatch data)

---

### T-010: Handle Edge Cases (Multiple Matches, Borderline, Explicit)
**User Story**: [US-001: PM Agent Detects Related Increments (Core Intelligence)](../../docs/internal/specs/default/intelligent-reopen-logic/us-001-pm-agent-detects-related-increments-core-intelligence.md)


**AC**: AC-US1-04, AC-US2-05

**Test Plan** (BDD format):
- **Given** 3 matches (85%, 82%, 75%) → **When** prompt → **Then** shows all 3 with numbered options
- **Given** similarity exactly 70% → **When** prompt → **Then** shows borderline warning
- **Given** user request "add to 0007" → **When** detect → **Then** skips similarity check, goes to reopen

**Test Cases**:
- Integration (`tests/integration/pm-agent/edge-cases.test.ts`):
  - edgeCase_multipleMatches → shows top 3 + "Create New" option (85%)
  - edgeCase_borderlineMatch → shows 70% warning (90%)
  - edgeCase_explicitReopen → extracts increment ID, skips detection (85%)
  - edgeCase_frequentReopens → shows warning for 3+ reopens (80%)
  - edgeCase_invalidIncrementId → validates format before reopen (90%)
- **Overall: 86% coverage**

**Implementation**:
1. Add multi-match handling to PM Step 0A:
   - If matches.length > 1: show all with numbered options (1, 2, 3, 4=Create New)
   - User chooses which increment to reopen
2. Add borderline match warning:
   - If similarity === threshold: show "⚠️ Borderline match (70%)"
   - Add explanation: "This work MAY be related. Review carefully."
   - Default to "Create New" (safer choice)
3. Add explicit reopen detection:
   - Regex: `/(?:add to|reopen|extend) increment (\d{4})/i`
   - If match: extract increment ID, skip similarity check
   - Call reopenIncrementWithScope() directly
4. Add frequent reopen warning:
   - Check metadata.reopenHistory.length
   - If >= 3: show warning about planning quality
   - Suggest creating new increment instead
5. TDD workflow: Test each edge case independently, then combined scenarios

**Dependencies**: T-007 (PM Step 0A), T-008 (reopenIncrementWithScope)

---

## Phase 3: Scope Updater (2-3 hours, ~350 lines)

### T-011: Create updateSpecWithScope Function
**User Story**: [US-003: Automatic Scope Update on Reopen](../../docs/internal/specs/default/intelligent-reopen-logic/us-003-automatic-scope-update-on-reopen.md)


**AC**: AC-US3-01, AC-US3-02, AC-US3-03

**Test Plan** (BDD format):
- **Given** increment 0007 with original spec → **When** updateSpecWithScope() → **Then** appends "Added in Reopen v2" section
- **Given** original user stories → **When** updateSpecWithScope() → **Then** preserves original content (no overwrite)
- **Given** additional scope "Add retry logic" → **When** updateSpecWithScope() → **Then** generates new user stories for added scope

**Test Cases**:
- Unit (`tests/unit/increment/scope-updater.test.ts`):
  - updateSpec_firstReopen → appends "v2" section (90%)
  - updateSpec_multipleReopens → appends "v3", "v4" correctly (90%)
  - updateSpec_preservesOriginal → original content unchanged (100%)
  - updateSpec_generatesUserStories → creates new US sections (85%)
  - updateSpec_invalidIncrementId → throws error (100%)
  - updateSpec_missingSpecFile → throws error (100%)
- **Overall: 88% coverage**

**Implementation**:
1. Create `src/core/increment/scope-updater.ts`
2. Export async function `updateSpecWithScope(incrementId: string, additionalScope: string): Promise<void>`
3. Implementation steps:
   - Validate incrementId format: `/^\d{4}-[a-z0-9-]+$/`
   - Build spec.md path: `.specweave/increments/{id}/spec.md`
   - Check file exists, throw error if not
   - Read existing spec content
   - Get reopen version from metadata (reopenHistory.length + 1)
   - Generate new user stories from additionalScope (simplified for v1, PM agent enhances)
   - Build reopen section:
     ```markdown
     ---

     # Added in Reopen v{N} ({date})

     **Reopen Reason**: {additionalScope}

     {newUserStories}
     ```
   - Append to existing spec (no overwrite)
   - Write using atomic pattern (temp → rename)
   - Log success with version number
4. TDD workflow: Test with real spec.md files, verify preservation and appending

**Dependencies**: MetadataManager (getReopenVersion)

---

### T-012: Implement Atomic File Write (Temp → Rename)
**User Story**: [US-003: Automatic Scope Update on Reopen](../../docs/internal/specs/default/intelligent-reopen-logic/us-003-automatic-scope-update-on-reopen.md)


**AC**: AC-US3-01, AC-US3-06, AC-US3-07

**Test Plan** (BDD format):
- **Given** spec.md to update → **When** write fails mid-way → **Then** original file remains intact (no corruption)
- **Given** temp file written → **When** rename succeeds → **Then** spec.md updated atomically
- **Given** write error → **When** cleanup → **Then** temp file removed

**Test Cases**:
- Unit (`tests/unit/increment/atomic-write.test.ts`):
  - atomicWrite_success → file updated without corruption (95%)
  - atomicWrite_renameAtomic → uses fs.rename() (100%)
  - atomicWrite_errorCleanup → removes temp file on error (90%)
  - atomicWrite_concurrentSafe → handles concurrent operations (80%)
  - atomicWrite_preservesPermissions → maintains file permissions (85%)
- **Overall: 90% coverage**

**Implementation**:
1. Add atomic write pattern to updateSpecWithScope():
   ```typescript
   const specPath = path.join(process.cwd(), '.specweave/increments', incrementId, 'spec.md');
   const tempPath = `${specPath}.tmp`;

   try {
     // Write to temp file
     await fs.writeFile(tempPath, newContent, 'utf-8');

     // Atomic rename
     await fs.rename(tempPath, specPath);

     console.log(`✅ Updated spec.md (v${reopenVersion})`);
   } catch (error) {
     // Cleanup temp file on error
     if (await fs.pathExists(tempPath)) {
       await fs.unlink(tempPath);
     }
     throw error;
   }
   ```
2. Add error handling for each step
3. Preserve file permissions from original
4. TDD workflow: Test error scenarios, verify no corruption

**Dependencies**: T-011 (updateSpecWithScope)

---

### T-013: Add Reopen Version Tracking
**User Story**: [US-003: Automatic Scope Update on Reopen](../../docs/internal/specs/default/intelligent-reopen-logic/us-003-automatic-scope-update-on-reopen.md)


**AC**: AC-US3-03

**Test Plan** (BDD format):
- **Given** first reopen → **When** getReopenVersion() → **Then** returns 2
- **Given** second reopen → **When** getReopenVersion() → **Then** returns 3
- **Given** no reopenHistory → **When** getReopenVersion() → **Then** initializes and returns 2

**Test Cases**:
- Unit (`tests/unit/increment/reopen-version.test.ts`):
  - getReopenVersion_firstReopen → returns 2 (100%)
  - getReopenVersion_multipleReopens → increments correctly (100%)
  - getReopenVersion_uninitialized → handles missing reopenHistory (100%)
  - metadata_tracksReopenHistory → array updated correctly (95%)
- **Overall: 95% coverage**

**Implementation**:
1. Add helper function `getReopenVersion(incrementId: string): number`
   - Read metadata using MetadataManager
   - Check if reopenHistory exists, initialize if not
   - Return `metadata.reopenHistory.length + 1`
2. Update metadata schema to track reopens:
   ```typescript
   interface ReopenHistoryEntry {
     version: number;
     date: string;
     reason: string;
     addedScope: string;
   }

   interface IncrementMetadata {
     // ... existing fields
     reopenHistory?: ReopenHistoryEntry[];
   }
   ```
3. Add reopen entry when status changes to ACTIVE (in MetadataManager.reopen())
4. TDD workflow: Test version calculation, metadata updates

**Dependencies**: T-011 (uses in updateSpecWithScope), MetadataManager

---

## Phase 4: Sync Orchestrator (2-3 hours, ~650 lines)

### T-014: Create reopenSyncedIssues Orchestrator
**User Story**: [US-005: Sync Reopen to GitHub/ADO/Jira](../../docs/internal/specs/default/intelligent-reopen-logic/us-005-sync-reopen-to-github-ado-jira.md)


**AC**: AC-US5-01, AC-US5-02, AC-US5-03

**Test Plan** (BDD format):
- **Given** increment with GitHub issue → **When** reopenSyncedIssues() → **Then** calls reopenGitHubIssue()
- **Given** increment with ADO work item → **When** reopenSyncedIssues() → **Then** calls reopenAdoWorkItem()
- **Given** multiple synced tools → **When** reopenSyncedIssues() → **Then** executes all in parallel (Promise.all)

**Test Cases**:
- Integration (`tests/integration/sync/reopen-orchestrator.test.ts`):
  - orchestrator_gitHubSync → reopens GitHub issue (85%)
  - orchestrator_adoSync → reopens ADO work item (85%)
  - orchestrator_jiraSync → reopens Jira issue (85%)
  - orchestrator_parallelExecution → all plugins execute concurrently (80%)
  - orchestrator_noSyncedIssues → handles gracefully (90%)
  - orchestrator_partialFailure → continues if one plugin fails (85%)
- **Overall: 85% coverage**

**Implementation**:
1. Create `src/core/sync/reopen-orchestrator.ts`
2. Export async function `reopenSyncedIssues(incrementId: string, reason: string, additionalScope: string): Promise<void>`
3. Implementation steps:
   - Read metadata from MetadataManager
   - Collect reopen tasks for each plugin (array of promises)
   - If metadata.github?.issue: add reopenGitHubIssue() promise
   - If metadata.ado?.workItemId: add reopenAdoWorkItem() promise
   - If metadata.jira?.issueKey: add reopenJiraIssue() promise
   - Execute all promises in parallel: `await Promise.all(reopenTasks)`
   - Catch errors per plugin (don't block others)
   - Log success for each synced tool
4. TDD workflow: Mock CLI commands, test orchestration logic

**Dependencies**: MetadataManager, T-015/T-016/T-017 (plugin-specific reopen functions)

---

### T-015: Implement GitHub Issue Reopen with CLI
**User Story**: [US-005: Sync Reopen to GitHub/ADO/Jira](../../docs/internal/specs/default/intelligent-reopen-logic/us-005-sync-reopen-to-github-ado-jira.md)


**AC**: AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05

**Test Plan** (BDD format):
- **Given** GitHub issue #4 closed → **When** reopenGitHubIssue() → **Then** executes `gh issue reopen 4`
- **Given** issue reopened → **When** post comment → **Then** executes `gh issue comment 4 --body {comment}`
- **Given** labels to update → **When** update labels → **Then** executes `gh issue edit 4 --add-label reopened,scope-change --remove-label completed`

**Test Cases**:
- Integration (`tests/integration/sync/github-reopen.test.ts`):
  - githubReopen_issueReopened → gh CLI called correctly (85%)
  - githubReopen_commentPosted → scope change comment added (85%)
  - githubReopen_labelsUpdated → +reopened, +scope-change, -completed (90%)
  - githubReopen_secureExecution → uses execFileNoThrow (not shell) (95%)
  - githubReopen_cliNotAvailable → handles gh CLI missing (80%)
  - githubReopen_apiError → handles GitHub API errors (80%)
- **Overall: 86% coverage**

**Implementation**:
1. Create or update `plugins/specweave-github/lib/reopen-issue.ts`
2. Export async function `reopenGitHubIssue(issueNumber: number, incrementId: string, reason: string, additionalScope: string): Promise<void>`
3. Implementation using execFileNoThrow (security best practice):
   ```typescript
   import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';

   // 1. Check gh CLI available
   const { exitCode } = await execFileNoThrow('gh', ['--version']);
   if (exitCode !== 0) {
     console.warn('⚠️ GitHub CLI not available. Skipping GitHub sync.');
     return;
   }

   // 2. Reopen issue
   await execFileNoThrow('gh', ['issue', 'reopen', String(issueNumber)]);

   // 3. Post comment
   const comment = generateScopeChangeComment(incrementId, reason, additionalScope);
   await execFileNoThrow('gh', ['issue', 'comment', String(issueNumber), '--body', comment]);

   // 4. Update labels
   await execFileNoThrow('gh', ['issue', 'edit', String(issueNumber),
     '--add-label', 'reopened,scope-change',
     '--remove-label', 'completed'
   ]);

   console.log(`✅ GitHub issue #${issueNumber} reopened`);
   ```
4. Add helper: `generateScopeChangeComment()` returns Markdown comment
5. TDD workflow: Mock execFileNoThrow, verify CLI arguments

**Dependencies**: T-014 (called by orchestrator), execFileNoThrow utility

---

### T-016: Implement ADO Work Item Reopen with CLI
**User Story**: [US-005: Sync Reopen to GitHub/ADO/Jira](../../docs/internal/specs/default/intelligent-reopen-logic/us-005-sync-reopen-to-github-ado-jira.md)


**AC**: AC-US5-06

**Test Plan** (BDD format):
- **Given** ADO work item 123 closed → **When** reopenAdoWorkItem() → **Then** executes `az boards work-item update --id 123 --state Active`
- **Given** work item reopened → **When** post comment → **Then** adds scope change comment via az CLI

**Test Cases**:
- Integration (`tests/integration/sync/ado-reopen.test.ts`):
  - adoReopen_workItemReopened → az CLI called correctly (85%)
  - adoReopen_commentPosted → scope change comment added (85%)
  - adoReopen_secureExecution → uses execFileNoThrow (95%)
  - adoReopen_cliNotAvailable → handles az CLI missing (80%)
  - adoReopen_apiError → handles ADO API errors (80%)
- **Overall: 85% coverage**

**Implementation**:
1. Create or update `plugins/specweave-ado/lib/reopen-work-item.ts`
2. Export async function `reopenAdoWorkItem(workItemId: number, incrementId: string, reason: string, additionalScope: string): Promise<void>`
3. Implementation using execFileNoThrow:
   ```typescript
   import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';

   // 1. Check az CLI available
   const { exitCode } = await execFileNoThrow('az', ['--version']);
   if (exitCode !== 0) {
     console.warn('⚠️ Azure CLI not available. Skipping ADO sync.');
     return;
   }

   // 2. Reopen work item (set state to Active)
   await execFileNoThrow('az', ['boards', 'work-item', 'update',
     '--id', String(workItemId),
     '--state', 'Active'
   ]);

   // 3. Add comment
   const comment = generateScopeChangeComment(incrementId, reason, additionalScope);
   await execFileNoThrow('az', ['boards', 'work-item', 'update',
     '--id', String(workItemId),
     '--discussion', comment
   ]);

   console.log(`✅ ADO work item #${workItemId} reopened`);
   ```
4. TDD workflow: Mock execFileNoThrow, verify CLI arguments

**Dependencies**: T-014 (called by orchestrator), execFileNoThrow utility

---

### T-017: Implement Jira Issue Reopen with CLI
**User Story**: [US-005: Sync Reopen to GitHub/ADO/Jira](../../docs/internal/specs/default/intelligent-reopen-logic/us-005-sync-reopen-to-github-ado-jira.md)


**AC**: AC-US5-07

**Test Plan** (BDD format):
- **Given** Jira issue PROJ-123 closed → **When** reopenJiraIssue() → **Then** executes `jira issue move PROJ-123 Reopened`
- **Given** issue reopened → **When** post comment → **Then** adds scope change comment via jira CLI

**Test Cases**:
- Integration (`tests/integration/sync/jira-reopen.test.ts`):
  - jiraReopen_issueReopened → jira CLI called correctly (85%)
  - jiraReopen_commentPosted → scope change comment added (85%)
  - jiraReopen_secureExecution → uses execFileNoThrow (95%)
  - jiraReopen_cliNotAvailable → handles jira CLI missing (80%)
  - jiraReopen_apiError → handles Jira API errors (80%)
- **Overall: 85% coverage**

**Implementation**:
1. Create or update `plugins/specweave-jira/lib/reopen-issue.ts`
2. Export async function `reopenJiraIssue(issueKey: string, incrementId: string, reason: string, additionalScope: string): Promise<void>`
3. Implementation using execFileNoThrow:
   ```typescript
   import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';

   // 1. Check jira CLI available
   const { exitCode } = await execFileNoThrow('jira', ['--version']);
   if (exitCode !== 0) {
     console.warn('⚠️ Jira CLI not available. Skipping Jira sync.');
     return;
   }

   // 2. Reopen issue (move to Reopened status)
   await execFileNoThrow('jira', ['issue', 'move', issueKey, 'Reopened']);

   // 3. Add comment
   const comment = generateScopeChangeComment(incrementId, reason, additionalScope);
   await execFileNoThrow('jira', ['issue', 'comment', issueKey, comment]);

   console.log(`✅ Jira issue ${issueKey} reopened`);
   ```
4. TDD workflow: Mock execFileNoThrow, verify CLI arguments

**Dependencies**: T-014 (called by orchestrator), execFileNoThrow utility

---

## Phase 5: Testing & Documentation (2-3 hours, ~780 lines)

### T-018: Create E2E Tests and Complete Documentation

**AC**: All acceptance criteria (E2E validation)

**Test Plan** (BDD format):
- **Given** increment 0007 completed → **When** user "Add retry logic" → **Then** PM detects 87% match → user reopens → spec updated → tasks generated → GitHub issue reopened → implementation → complete
- **Given** 3 high similarity matches → **When** PM prompts → **Then** shows all 3 options + "Create New"
- **Given** user "add to 0007" → **When** PM detects explicit request → **Then** skips similarity, goes straight to reopen

**Test Cases**:
- E2E (`tests/e2e/intelligent-reopen.spec.ts`):
  - e2e_completeReopenWorkflow → full cycle: complete → detect → reopen → work → complete (80%)
  - e2e_multipleMatches → shows top 3, user chooses (75%)
  - e2e_explicitReopen → skips detection, direct reopen (80%)
  - e2e_userChoosesCreateNew → continues normal flow (85%)
  - e2e_frequentReopenWarning → shows warning for 3+ reopens (80%)
- **Overall: 80% coverage** (E2E covers full stack integration)

**Implementation**:
1. Create `tests/e2e/intelligent-reopen.spec.ts` using Playwright
2. Test scenarios:
   - **Scenario 1: Complete Reopen Workflow**
     - Complete increment 0007
     - User requests additional scope
     - PM detects 87% match
     - User chooses reopen
     - Verify: spec.md updated, tasks.md has new tasks, GitHub issue reopened
     - Implement new tasks
     - Complete increment
   - **Scenario 2: Multiple Matches**
     - Create 3 completed increments with overlapping keywords
     - User request matches all 3
     - PM shows top 3
     - User chooses one
   - **Scenario 3: Explicit Reopen**
     - User: "Add to increment 0007"
     - PM skips similarity check
     - Goes directly to reopen
   - **Scenario 4: Create New (User Choice)**
     - PM suggests reopen
     - User chooses "Create New"
     - Verify normal flow continues
   - **Scenario 5: Frequent Reopen Warning**
     - Increment reopened 3 times
     - User requests 4th reopen
     - PM shows warning about planning quality
3. Update CHANGELOG.md with v0.8.0 changes:
   - New Feature: Intelligent Reopen Detection
   - Breaking Changes: None
   - Migration Guide: Automatic, opt-out via config
4. Create user documentation `docs-site/docs/guides/intelligent-reopen.md`:
   - How it works
   - Configuration options
   - Examples and best practices
   - Troubleshooting
5. Update CLAUDE.md (contributor guide):
   - Add Intelligent Reopen Logic section
   - Document similarity algorithm
   - Explain PM Step 0A
   - ADR references
6. Update README.md:
   - Add intelligent reopen to features list
   - Link to user guide

**Dependencies**: All previous tasks (complete increment implementation)

---

## Summary

**Total Tasks**: 18
**Estimated Duration**: 12-15 hours
**Test Mode**: TDD (Red → Green → Refactor)
**Coverage Target**: 85% overall

**Phase Breakdown**:
- Phase 1 (Similarity Engine): T-001 to T-006 (6 tasks, 4-5 hours, 92% coverage)
- Phase 2 (PM Agent): T-007 to T-010 (4 tasks, 3-4 hours, 85% coverage)
- Phase 3 (Scope Updater): T-011 to T-013 (3 tasks, 2-3 hours, 91% coverage)
- Phase 4 (Sync Orchestrator): T-014 to T-017 (4 tasks, 2-3 hours, 85% coverage)
- Phase 5 (Testing & Docs): T-018 (1 task, 2-3 hours, 80% E2E coverage)

**Test Coverage by Component**:
- Similarity Engine: 92% (critical algorithm, high coverage required)
- PM Agent: 85% (complex branching, integration tests)
- Scope Updater: 91% (data integrity critical)
- Sync Orchestrator: 85% (external CLI dependencies)
- E2E: 80% (full stack integration)

**Dependencies Graph**:
```
T-001 (foundation) → T-002 (fuzzy match) → T-003 (Jaccard) → T-004 (domain bonus) → T-005 (findRelated) → T-006 (helpers)
                                                                                              ↓
T-007 (PM Step 0A) ← T-005 ────────────────────────────────────────────────────────→ T-009 (prompt)
      ↓                                                                                        ↓
T-008 (reopen helper) ──────────────────────────────────────────────────────────→ T-010 (edge cases)
      ↓                                                                                        ↓
T-011 (updateSpec) → T-012 (atomic write) → T-013 (version tracking) ──────────→ T-014 (orchestrator)
                                                                                              ↓
                                    T-015 (GitHub) ← T-014 → T-016 (ADO) → T-017 (Jira)
                                                     ↓
                                    T-018 (E2E + Docs) ← ALL TASKS
```

**Key Success Metrics**:
- ✅ 90%+ similarity detection accuracy (measured via E2E tests)
- ✅ <30 seconds for reopen decision (fast UX)
- ✅ 80%+ user trust (choose reopen when suggested)
- ✅ No duplicate increments (quality improvement)
- ✅ <2 seconds to scan 200 completed increments (performance)

**Next Steps After Tasks Complete**:
1. Run full test suite: `npm test && npm run test:e2e`
2. Manual testing: Create real increments, test reopen detection
3. Documentation review: Clarity, accuracy, examples
4. PR creation: `git commit -m "feat: Intelligent reopen logic with automatic detection"`
5. Deploy: `npm version minor` (v0.8.0), `npm publish`

---

**End of Tasks**
