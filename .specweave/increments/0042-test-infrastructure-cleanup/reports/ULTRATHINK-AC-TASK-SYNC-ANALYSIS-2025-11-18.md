# ULTRATHINK: AC and Task Synchronization Analysis

**Date**: 2025-11-18
**Issue**: User reports "updating living docs has problems! ACs and tasks are not synchronized"
**Analyst**: Claude (Ultrathink Mode)
**Related Increments**: 0042 (test infrastructure), 0043 (spec.md desync)

---

## Executive Summary

User reports that when running `/specweave:sync-specs` or `/specweave:sync-docs update`, Acceptance Criteria (ACs) and tasks are not properly synchronized between:
1. Increment spec.md (source of truth)
2. Living docs user story files (.specweave/docs/internal/specs/)

**Key Finding**: After thorough code analysis, the implementation SHOULD work correctly. However, there's no test coverage for the critical scenario of UPDATING existing living docs user stories after AC completion status changes in spec.md.

**Recommended Action**: Add comprehensive test for the "second sync" scenario to verify or identify the issue.

---

## System Architecture Analysis

### Current Synchronization Flow

```
User completes task
    ↓
TodoWrite hook fires → update-ac-status.js
    ↓
spec.md ACs updated: [ ] → [x]
    ↓
User runs: /specweave:sync-specs
    ↓
LivingDocsSync.syncIncrement()
    ├─ parseIncrementSpec() → extracts ACs with completion status
    ├─ generateUserStoryFile() → creates content with updated ACs
    ├─ writeFile() → overwrites existing user story file
    └─ syncTasksToUserStories() → updates ## Tasks section
```

### Key Components

1. **ACStatusManager** (`src/core/increment/ac-status-manager.ts`)
   - Updates spec.md AC checkboxes based on task completion
   - Pattern: `- [x] **AC-US1-01**: Description`

2. **LivingDocsSync** (`src/core/living-docs/living-docs-sync.ts`)
   - Parses spec.md and extracts ACs (line 367-393)
   - Generates user story files with ACs (line 533-548)
   - Syncs tasks to user stories (line 569-601)

3. **Task Synchronization**:
   - `syncTasksToUserStories()` (line 569-601)
   - `updateTasksSection()` (line 606-639)
   - **Only updates ## Tasks section, NOT ## Acceptance Criteria**

---

## Code Deep Dive

### AC Extraction from spec.md

```typescript
// File: src/core/living-docs/living-docs-sync.ts (line 367-393)
private extractAcceptanceCriteria(content: string): AcceptanceCriterionData[] {
  const criteria: AcceptanceCriterionData[] = [];

  // Pattern: - [x] AC-US1-01: Description
  // Supports both plain text and bold formatting
  const acPattern = /^[-*]\s+\[([ x])\]\s+\*{0,2}(AC-US\d+-\d+)\*{0,2}:\s+(.+?)$/gm;

  let match;
  while ((match = acPattern.exec(content)) !== null) {
    const completed = match[1] === 'x';  // ✅ Reads completion status!
    const id = match[2];
    const description = match[3];

    criteria.push({
      id,
      userStoryId,
      description,
      completed  // ✅ Stores completion status
    });
  }

  return criteria;
}
```

**Finding**: ✅ AC extraction DOES read completion status from spec.md.

### User Story Generation

```typescript
// File: src/core/living-docs/living-docs-sync.ts (line 533-548)
// Acceptance Criteria
lines.push('## Acceptance Criteria');
lines.push('');

const storyCriteria = parsed.acceptanceCriteria.filter(
  ac => ac.userStoryId === story.id
);

if (storyCriteria.length > 0) {
  for (const ac of storyCriteria) {
    const checkbox = ac.completed ? '[x]' : '[ ]';  // ✅ Uses completion status!
    lines.push(`- ${checkbox} **${ac.id}**: ${ac.description}`);
  }
}
```

**Finding**: ✅ User story generation DOES include AC completion status.

### File Write Operation

```typescript
// File: src/core/living-docs/living-docs-sync.ts (line 139-144)
if (!options.dryRun) {
  const storyContent = this.generateUserStoryFile(story, featureId, incrementId, parsed);
  await fs.writeFile(storyFile, storyContent, 'utf-8');  // ✅ Overwrites file!
  result.filesCreated.push(storyFile);
}
```

**Finding**: ✅ File is OVERWRITTEN on every sync (not appended or partially updated).

---

## Test Coverage Analysis

### Existing Test: `ac-sync-e2e-flow.test.ts`

**What it tests**:
```typescript
it('should sync completed tasks to spec.md ACs to living docs', async () => {
  // Step 1: Create increment with spec.md and tasks.md
  // Step 2: Run AC status sync (updates spec.md)
  // Step 3: Sync to living docs (FIRST sync)
  // Step 4: Verify living docs user story file has updated ACs
```

**Test scenario**: First sync (user story files don't exist yet)

**Coverage**: ✅ Tests that newly created user story files have correct ACs

---

### MISSING Test: Second Sync After AC Update

**What's NOT tested**:
```typescript
// Scenario:
1. First sync - creates user story file with AC-US1-01: [ ] (unchecked)
2. User completes task
3. AC status sync - updates spec.md to AC-US1-01: [x] (checked)
4. Second sync - SHOULD update user story file to [x]
5. Verify - User story file shows [x]
```

**This is the critical scenario that may be failing!**

---

## Hypothesis: Why It Should Work

Based on code analysis, the implementation SHOULD work correctly:

1. **First Sync**:
   - Creates user story file: `us-001-status-line.md`
   - AC section: `- [ ] **AC-US1-01**: First AC`

2. **User Completes Task**:
   - AC status sync updates spec.md
   - spec.md now shows: `- [x] **AC-US1-01**: First AC`

3. **Second Sync**:
   - Parses spec.md → extracts `AC-US1-01` with `completed: true`
   - Generates user story content with `- [x] **AC-US1-01**: First AC`
   - Overwrites existing file with new content
   - File now shows: `- [x] **AC-US1-01**: First AC` ✅

**Expected Behavior**: ACs should sync correctly!

---

## Hypothesis: Why It Might Fail

### Scenario 1: Task Sync Overwrites ACs

**Flow**:
```
1. generateUserStoryFile() - creates content with [x] AC
2. writeFile() - writes file with [x] AC
3. syncTasksToUserStories() - reads file, updates ## Tasks
4. updateTasksSection() - writes file back
```

**Concern**: Does `updateTasksSection()` preserve the ## Acceptance Criteria section?

**Code Review** (line 606-639):
```typescript
private async updateTasksSection(userStoryFile: string, tasksMarkdown: string): Promise<void> {
  const content = await fs.readFile(userStoryFile, 'utf-8');

  // Replace existing ## Tasks section
  const tasksRegex = /##\s+Tasks\s+([\s\S]*?)(?=\n##|$)/;

  if (tasksRegex.test(content)) {
    const updatedContent = content.replace(
      tasksRegex,
      `## Tasks\n\n${tasksMarkdown}\n`
    );
    await fs.writeFile(userStoryFile, updatedContent, 'utf-8');
  }
}
```

**Finding**: ✅ Regex only replaces `## Tasks` section. It should NOT touch `## Acceptance Criteria`!

---

### Scenario 2: File Finding Issue

**Code Review** (line 126-137):
```typescript
// CRITICAL: Find existing file by US-ID first to prevent duplicates
const existingFile = await this.findExistingUserStoryFile(projectPath, story.id);

let storyFile: string;
if (existingFile) {
  // Reuse existing file (prevent duplicate creation)
  storyFile = path.join(projectPath, existingFile);
  console.log(`   ♻️  Reusing existing file: ${existingFile}`);
} else {
  const storySlug = story.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  storyFile = path.join(projectPath, `${story.id.toLowerCase()}-${storySlug}.md`);
}
```

**Finding**: "Reusing" means using the same filename, NOT skipping the write!
The file is still overwritten on line 142: `await fs.writeFile(storyFile, storyContent, 'utf-8');`

**Conclusion**: ✅ File finding should NOT prevent AC updates.

---

### Scenario 3: Parsing Issue

**Potential Issue**: What if spec.md has bold formatting but regex doesn't match?

**Code Review** (line 372):
```typescript
const acPattern = /^[-*]\s+\[([ x])\]\s+\*{0,2}(AC-US\d+-\d+)\*{0,2}:\s+(.+?)$/gm;
```

**Pattern Analysis**:
- `\*{0,2}` - Matches 0 or 2 asterisks (plain or **bold**)
- ✅ Supports: `- [x] AC-US1-01: Description`
- ✅ Supports: `- [x] **AC-US1-01**: Description`

**Finding**: ✅ Regex should handle both plain and bold formatting.

---

## Recommended Actions

### 1. Add Comprehensive Test (HIGH PRIORITY)

Create test: `tests/integration/core/ac-sync-second-update.test.ts`

```typescript
it('should update existing user story ACs on second sync', async () => {
  const incrementId = '0099-ac-sync-test';
  const incrementDir = path.join(testRoot, '.specweave/increments', incrementId);

  // Step 1: First sync - create user story files with unchecked ACs
  const specContent1 = `
---
increment: ${incrementId}
---

### US-001: Test User Story

**Acceptance Criteria**:
- [ ] **AC-US1-01**: First AC (unchecked initially)
`;
  await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent1);
  const result1 = await livingDocsSync.syncIncrement(incrementId);

  expect(result1.success).toBe(true);

  // Verify first sync created file with unchecked AC
  const userStoryFile = result1.filesCreated.find(f => f.includes('us-001'));
  let userStoryContent = await fs.readFile(userStoryFile!, 'utf-8');
  expect(userStoryContent).toMatch(/- \[ \] \*\*AC-US1-01\*\*/);

  // Step 2: Simulate AC completion - update spec.md
  const specContent2 = specContent1.replace(
    '- [ ] **AC-US1-01**',
    '- [x] **AC-US1-01**'
  );
  await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent2);

  // Step 3: Second sync - should update existing file
  const result2 = await livingDocsSync.syncIncrement(incrementId);

  expect(result2.success).toBe(true);

  // Step 4: Verify AC is now checked in user story file
  userStoryContent = await fs.readFile(userStoryFile!, 'utf-8');
  expect(userStoryContent).toMatch(/- \[x\] \*\*AC-US1-01\*\*/);  // NOW CHECKED!
  expect(userStoryContent).not.toMatch(/- \[ \] \*\*AC-US1-01\*\*/);  // NO UNCHECKED
});
```

**Expected**: Test should PASS if implementation is correct.
**If test fails**: We've identified the bug!

---

### 2. Add Logging (MEDIUM PRIORITY)

Add debug logging to `LivingDocsSync.syncIncrement()`:

```typescript
// After parsing spec.md
console.log(`📊 Extracted ${parsed.acceptanceCriteria.length} ACs`);
parsed.acceptanceCriteria.forEach(ac => {
  console.log(`   ${ac.id}: ${ac.completed ? '[x]' : '[ ]'} ${ac.description}`);
});

// After generating user story content
console.log(`📄 Generated user story content for ${story.id}`);
console.log(`   ACs in content: ${storyContent.match(/AC-US\d+-\d+/g)?.length || 0}`);
```

This will help debug if:
- ACs are being parsed correctly from spec.md
- ACs are being included in generated content
- File write is happening

---

### 3. Run Manual Reproduction (HIGH PRIORITY)

**Steps**:
1. Create test increment with unchecked ACs
2. Run `/specweave:sync-specs 0099`
3. Verify user story files have unchecked ACs
4. Manually edit spec.md to check ACs
5. Run `/specweave:sync-specs 0099` again
6. Check if user story files now have checked ACs

**Expected**: ACs should update to [x]
**If ACs still show [ ]**: Bug confirmed!

---

## Alternative Hypothesis: Caching Issue?

Could there be a caching layer preventing file updates?

**Code Review**:
- `fs.writeFile()` is used directly (no caching layer)
- No in-memory cache detected in `LivingDocsSync`

**Finding**: ❌ No caching issues detected.

---

## Conclusion

Based on comprehensive code analysis:

1. **Implementation SHOULD work correctly**
   - AC extraction reads completion status ✅
   - User story generation includes completion status ✅
   - File is overwritten on every sync ✅
   - updateTasksSection() preserves AC section ✅

2. **BUT there's NO test coverage for the critical "second sync" scenario**
   - Existing test only covers first sync
   - No test for updating existing user story files

3. **Recommended Next Steps**:
   1. Write the "second sync" test (above)
   2. Run the test to see if it passes or fails
   3. If it fails → bug confirmed, debug with logging
   4. If it passes → user may be experiencing a different issue (e.g., wrong command, wrong increment, stale files)

---

## Impact Assessment

**If bug exists**:
- **Severity**: HIGH
- **Impact**: Living docs user stories show outdated AC status
- **Stakeholder Impact**: External stakeholders (GitHub, JIRA) see incorrect AC completion
- **User Experience**: Confusing, misleading status information

**If bug doesn't exist (test passes)**:
- **Severity**: LOW
- **Impact**: Documentation gap / user error
- **User Experience**: Need better documentation / error messages

---

## Follow-up Questions

1. Which command is the user running?
   - `/specweave:sync-specs`?
   - `/specweave:sync-docs update`?
   - Something else?

2. What increment are they syncing?
   - Is it a completed increment?
   - Does spec.md have updated ACs?

3. Are they seeing any errors or warnings?

4. What does the user story file show vs. spec.md?
   - Can we get actual file examples?

---

**Status**: Analysis complete. Recommended action: Write and run the "second sync" test.
**Next**: Create test file and execute to verify or identify the bug.
