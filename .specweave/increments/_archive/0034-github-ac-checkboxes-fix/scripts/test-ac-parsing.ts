/**
 * Unit test for Acceptance Criteria extraction logic
 */

// Mock the extraction logic to test it independently
function extractAcceptanceCriteria(content: string): Array<{
  id: string;
  description: string;
  completed: boolean;
}> {
  const acceptanceCriteria: Array<{
    id: string;
    description: string;
    completed: boolean;
  }> = [];

  // Find Acceptance Criteria section
  const acSectionMatch = content.match(/##\s+Acceptance Criteria\s*\n([\s\S]*?)(?=\n##|\n---|\n$)/i);

  if (!acSectionMatch) {
    return acceptanceCriteria;
  }

  const acSection = acSectionMatch[1];

  // Parse each AC line: - [x] **AC-US2-01**: Description (P1, testable)
  const acPattern = /^-\s+\[([x\s])\]\s+\*\*([^*]+)\*\*:\s*(.+)$/gm;

  let match;
  while ((match = acPattern.exec(acSection)) !== null) {
    const completed = match[1].trim().toLowerCase() === 'x';
    const acId = match[2].trim();
    const description = match[3].trim();

    acceptanceCriteria.push({
      id: acId,
      description,
      completed,
    });
  }

  return acceptanceCriteria;
}

// Test with real user story content
const testContent = `---
id: US-002
epic: FS-031
title: "Task-Level Mapping & Traceability"
status: complete
created: 2025-11-15
completed: 2025-11-15
---

# US-002: Task-Level Mapping & Traceability

**Feature**: [FS-031](../../_features/FS-031/FEATURE.md)

**As a** developer or PM
**I want** to see which tasks implement which user stories
**So that** I can track progress and understand implementation history

---

## Acceptance Criteria

- [x] **AC-US2-01**: Spec frontmatter includes linked_increments mapping (P1, testable)
- [x] **AC-US2-02**: User stories map to specific tasks (US-001 → T-001, T-002) (P1, testable)
- [x] **AC-US2-03**: Tasks include GitHub/JIRA/ADO issue numbers (P1, testable)
- [x] **AC-US2-04**: Can query "which increment implemented US-001?" (P2, testable)
- [ ] **AC-US2-05**: Traceability report shows complete history (P2, testable)
- [ ] **AC-US2-06**: Acceptance criteria map to task validation (P3, testable)

---

## Implementation

**Increment**: [0031-external-tool-status-sync](../../../../../increments/0031-external-tool-status-sync/tasks.md)

**Tasks**:
- [T-002: Create Spec-to-Increment Mapper](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-002-create-spec-to-increment-mapper)
`;

console.log('🧪 Testing Acceptance Criteria Extraction...\n');

const result = extractAcceptanceCriteria(testContent);

console.log(`✅ Extracted ${result.length} acceptance criteria:\n`);

for (const ac of result) {
  const checkbox = ac.completed ? '[x]' : '[ ]';
  console.log(`  ${checkbox} **${ac.id}**: ${ac.description}`);
}

console.log('\n🔍 Validation:');
console.log(`   Total AC items: ${result.length}`);
console.log(`   Completed: ${result.filter(ac => ac.completed).length}`);
console.log(`   Pending: ${result.filter(ac => !ac.completed).length}`);

// Verify expected results
const expectedCount = 6;
const expectedCompleted = 4;
const expectedPending = 2;

const success =
  result.length === expectedCount &&
  result.filter(ac => ac.completed).length === expectedCompleted &&
  result.filter(ac => !ac.completed).length === expectedPending &&
  result[0].id === 'AC-US2-01' &&
  result[0].completed === true &&
  result[4].id === 'AC-US2-05' &&
  result[4].completed === false;

if (success) {
  console.log('\n🎉 SUCCESS: All validations passed!');
  process.exit(0);
} else {
  console.log('\n❌ FAILURE: Validation failed!');
  console.log(`   Expected: ${expectedCount} total, ${expectedCompleted} completed, ${expectedPending} pending`);
  console.log(`   Got: ${result.length} total, ${result.filter(ac => ac.completed).length} completed, ${result.filter(ac => !ac.completed).length} pending`);
  process.exit(1);
}
