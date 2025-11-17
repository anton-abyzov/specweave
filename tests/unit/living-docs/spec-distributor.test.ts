/**
 * Unit tests for SpecDistributor
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import * as os from 'os';
import { SpecDistributor } from '../../../src/core/living-docs/SpecDistributor.js';

// ✅ SAFE: Isolated test directory (prevents .specweave deletion)
const TEST_DIR = path.join(os.tmpdir(), 'specweave-test-spec-distributor-' + Date.now());
const TEST_INCREMENT = path.join(TEST_DIR, 'increments/0001-test');
const TEST_LIVING_DOCS = path.join(TEST_DIR, 'docs/user-stories');

describe('SpecDistributor', () => {
  let distributor: SpecDistributor;

  beforeEach(async () => {
    distributor = new SpecDistributor();

    // Create test directories
    await fs.mkdir(TEST_INCREMENT, { recursive: true });
    await fs.mkdir(TEST_LIVING_DOCS, { recursive: true });
  });

  afterEach(async () => {
    // Clean up
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  });

  it('should copy ACs and Tasks to User Story files', async () => {
    // Create test increment files
    const specMd = `# Spec

## User Stories

### US1: Create backend API

**Acceptance Criteria**:
- [ ] AC-US1-01: Create REST endpoint /api/users
- [x] AC-US1-02: Add authentication middleware
- [ ] AC-US1-03: Implement database schema

## US2: Create frontend UI

**Acceptance Criteria**:
- [ ] AC-US2-01: Create user list component
- [ ] AC-US2-02: Add loading states
`;

    const tasksMd = `# Tasks

### T-001: Setup API endpoint (P1)
**Effort**: 2h | **AC**: AC-US1-01
**Completed**: 2025-11-16

### T-002: Add auth middleware (P1)
**Effort**: 1h | **AC**: AC-US1-02
**Completed**: 2025-11-15

### T-003: Create user component (P1)
**Effort**: 3h | **AC**: AC-US2-01
`;

    await fs.writeFile(path.join(TEST_INCREMENT, 'spec.md'), specMd);
    await fs.writeFile(path.join(TEST_INCREMENT, 'tasks.md'), tasksMd);

    // Create User Story files
    const us1Content = `# US1: Create backend API

## Acceptance Criteria

(Will be updated)

## Implementation

(Will be updated)
`;

    await fs.writeFile(path.join(TEST_LIVING_DOCS, 'US1.md'), us1Content);

    // Run distributor
    await distributor.copyAcsAndTasksToUserStories(TEST_INCREMENT, TEST_LIVING_DOCS);

    // Verify US1 was updated
    const updatedContent = await fs.readFile(path.join(TEST_LIVING_DOCS, 'US1.md'), 'utf-8');

    // Test for AC presence with new format (checkbox + bold ID)
    expect(updatedContent).toContain('**AC-US1-01**');
    expect(updatedContent).toContain('Create REST endpoint');
    expect(updatedContent).toContain('**AC-US1-02**');
    expect(updatedContent).toContain('Add authentication middleware');

    // Test for task presence with new format
    expect(updatedContent).toContain('**T-001**');
    expect(updatedContent).toContain('Setup API endpoint');
    expect(updatedContent).toContain('**T-002**');
    expect(updatedContent).toContain('Add auth middleware');

    // Test for completion status
    expect(updatedContent).toContain('[x] **T-002**'); // Completed task
  });

  it('should filter tasks by AC IDs', async () => {
    const specMd = `# Spec

### US1: Test Story

**Acceptance Criteria**:
- [ ] AC-US1-01: First criterion
`;

    const tasksMd = `# Tasks

### T-001: Related task (P1)
**AC**: AC-US1-01

### T-002: Unrelated task (P1)
**AC**: AC-US2-01
`;

    await fs.writeFile(path.join(TEST_INCREMENT, 'spec.md'), specMd);
    await fs.writeFile(path.join(TEST_INCREMENT, 'tasks.md'), tasksMd);
    await fs.writeFile(path.join(TEST_LIVING_DOCS, 'US1.md'), '# US1\n\n## Acceptance Criteria\n\n## Implementation\n');

    await distributor.copyAcsAndTasksToUserStories(TEST_INCREMENT, TEST_LIVING_DOCS);

    const content = await fs.readFile(path.join(TEST_LIVING_DOCS, 'US1.md'), 'utf-8');

    expect(content).toContain('T-001'); // Related task
    expect(content).not.toContain('T-002'); // Unrelated task
  });

  it('should preserve checkbox states', async () => {
    const specMd = `# Spec

### US1: Test

**Acceptance Criteria**:
- [x] AC-US1-01: Completed criterion
- [ ] AC-US1-02: Incomplete criterion
`;

    const tasksMd = `# Tasks

### T-001: Task (P1)
**AC**: AC-US1-01
**Completed**: 2025-11-16
`;

    await fs.writeFile(path.join(TEST_INCREMENT, 'spec.md'), specMd);
    await fs.writeFile(path.join(TEST_INCREMENT, 'tasks.md'), tasksMd);
    await fs.writeFile(path.join(TEST_LIVING_DOCS, 'US1.md'), '# US1\n\n## Acceptance Criteria\n\n## Implementation\n');

    await distributor.copyAcsAndTasksToUserStories(TEST_INCREMENT, TEST_LIVING_DOCS);

    const content = await fs.readFile(path.join(TEST_LIVING_DOCS, 'US1.md'), 'utf-8');

    expect(content).toContain('[x] **AC-US1-01**'); // Completed AC
    expect(content).toContain('[ ] **AC-US1-02**'); // Incomplete AC
    expect(content).toContain('[x] **T-001**'); // Completed task
  });
});
