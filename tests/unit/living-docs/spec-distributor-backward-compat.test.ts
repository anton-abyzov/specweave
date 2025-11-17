/**
 * Unit tests for SpecDistributor - Backward Compatibility
 *
 * Tests the backward compatibility feature that auto-generates
 * ## Implementation sections for User Stories that don't have one.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { SpecDistributor } from '../../../src/core/living-docs/SpecDistributor.js';

const TEST_DIR = '.specweave/test-backward-compat';
const TEST_INCREMENT = path.join(TEST_DIR, 'increments/0001-test');
const TEST_LIVING_DOCS = path.join(TEST_DIR, 'docs/user-stories');

describe('SpecDistributor - Backward Compatibility', () => {
  let distributor: SpecDistributor;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    distributor = new SpecDistributor();

    // Spy on console.log to verify backward compatibility logging
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Create test directories
    await fs.mkdir(TEST_INCREMENT, { recursive: true });
    await fs.mkdir(TEST_LIVING_DOCS, { recursive: true });
  });

  afterEach(async () => {
    // Restore console.log
    consoleLogSpy.mockRestore();

    // Clean up
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  });

  it('should auto-generate ## Implementation section for User Story without one', async () => {
    // Create test increment files
    const specMd = `# Spec

## User Stories

### US1: Legacy User Story

**Acceptance Criteria**:
- [ ] AC-US1-01: Create REST endpoint /api/users
- [ ] AC-US1-02: Add authentication middleware
`;

    const tasksMd = `# Tasks

### T-001: Setup API endpoint (P1)
**Effort**: 2h | **AC**: AC-US1-01

### T-002: Add auth middleware (P1)
**Effort**: 1h | **AC**: AC-US1-02
`;

    await fs.writeFile(path.join(TEST_INCREMENT, 'spec.md'), specMd);
    await fs.writeFile(path.join(TEST_INCREMENT, 'tasks.md'), tasksMd);

    // Create User Story WITHOUT ## Implementation section (legacy format)
    const us1ContentLegacy = `# US1: Legacy User Story

## Acceptance Criteria

- [ ] AC-US1-01: Create REST endpoint /api/users
- [ ] AC-US1-02: Add authentication middleware

## Business Rationale

This is a legacy user story without Implementation section.
`;

    await fs.writeFile(path.join(TEST_LIVING_DOCS, 'US1.md'), us1ContentLegacy);

    // Run distributor
    await distributor.copyAcsAndTasksToUserStories(TEST_INCREMENT, TEST_LIVING_DOCS);

    // Verify backward compatibility logging
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Backward Compatibility')
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Auto-generating ## Implementation section')
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('US1.md')
    );

    // Verify US1 now has ## Implementation section
    const updatedContent = await fs.readFile(path.join(TEST_LIVING_DOCS, 'US1.md'), 'utf-8');

    // Check ## Implementation section was added
    expect(updatedContent).toContain('## Implementation');

    // Check tasks were added
    expect(updatedContent).toContain('**T-001**');
    expect(updatedContent).toContain('Setup API endpoint');
    expect(updatedContent).toContain('**T-002**');
    expect(updatedContent).toContain('Add auth middleware');

    // Check note was added
    expect(updatedContent).toContain('Task status syncs from increment tasks.md');

    // Verify ## Implementation section exists (may be at end or before Business Rationale)
    const implementationIndex = updatedContent.indexOf('## Implementation');
    expect(implementationIndex).toBeGreaterThan(0);

    // Note: updateSection appends at end if section doesn't exist
    // This is acceptable behavior - the section is added regardless of position
  });

  it('should NOT log backward compatibility message for User Story with ## Implementation', async () => {
    // Create test increment files
    const specMd = `# Spec

## User Stories

### US2: Modern User Story

**Acceptance Criteria**:
- [ ] AC-US2-01: Create user list component
`;

    const tasksMd = `# Tasks

### T-003: Create user component (P1)
**Effort**: 3h | **AC**: AC-US2-01
`;

    await fs.writeFile(path.join(TEST_INCREMENT, 'spec.md'), specMd);
    await fs.writeFile(path.join(TEST_INCREMENT, 'tasks.md'), tasksMd);

    // Create User Story WITH ## Implementation section (modern format)
    const us2ContentModern = `# US2: Modern User Story

## Acceptance Criteria

- [ ] AC-US2-01: Create user list component

## Implementation

- [ ] **T-003**: Create user component

> **Note**: Task status syncs from increment tasks.md
`;

    await fs.writeFile(path.join(TEST_LIVING_DOCS, 'US2.md'), us2ContentModern);

    // Run distributor
    await distributor.copyAcsAndTasksToUserStories(TEST_INCREMENT, TEST_LIVING_DOCS);

    // Verify NO backward compatibility logging for modern format
    const backwardCompatCalls = consoleLogSpy.mock.calls.filter(call =>
      call[0]?.includes('Backward Compatibility')
    );
    expect(backwardCompatCalls.length).toBe(0);

    // Verify US2 still has ## Implementation section (was updated, not added)
    const updatedContent = await fs.readFile(path.join(TEST_LIVING_DOCS, 'US2.md'), 'utf-8');
    expect(updatedContent).toContain('## Implementation');
    expect(updatedContent).toContain('**T-003**');
  });

  it('should handle User Story without any sections gracefully', async () => {
    // Create test increment files
    const specMd = `# Spec

## User Stories

### US3: Minimal User Story

**Acceptance Criteria**:
- [ ] AC-US3-01: Minimal task
`;

    const tasksMd = `# Tasks

### T-004: Minimal implementation (P1)
**Effort**: 1h | **AC**: AC-US3-01
`;

    await fs.writeFile(path.join(TEST_INCREMENT, 'spec.md'), specMd);
    await fs.writeFile(path.join(TEST_INCREMENT, 'tasks.md'), tasksMd);

    // Create minimal User Story (no sections at all)
    const us3ContentMinimal = `# US3: Minimal User Story

This is a minimal user story with no structured sections.
`;

    await fs.writeFile(path.join(TEST_LIVING_DOCS, 'US3.md'), us3ContentMinimal);

    // Run distributor
    await distributor.copyAcsAndTasksToUserStories(TEST_INCREMENT, TEST_LIVING_DOCS);

    // Verify backward compatibility logging
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Backward Compatibility')
    );

    // Verify US3 now has both sections appended at the end
    const updatedContent = await fs.readFile(path.join(TEST_LIVING_DOCS, 'US3.md'), 'utf-8');

    expect(updatedContent).toContain('## Acceptance Criteria');
    expect(updatedContent).toContain('## Implementation');
    expect(updatedContent).toContain('**T-004**');
    expect(updatedContent).toContain('Minimal implementation');
  });
});
