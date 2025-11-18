/**
 * AC Extraction with Bold Formatting - Integration Test
 *
 * Tests that LivingDocsSync correctly extracts ACs with bold formatting.
 *
 * Bug Fixed: AC extraction regex didn't support **AC-US1-01** (bold)
 * Fix: Updated regex to \*{0,2}(AC-US\d+-\d+)\*{0,2}
 *
 * Test Coverage:
 * - Plain AC format: - [ ] AC-US1-01: Description
 * - Bold AC format: - [ ] **AC-US1-01**: Description
 * - Mixed format: Both plain and bold in same spec
 * - User story mapping: AC-US1-01 → US-001
 * - Living docs generation: ACs appear in user story files
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LivingDocsSync } from '../../../src/core/living-docs/living-docs-sync.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('AC Extraction with Bold Formatting', () => {
  let testRoot: string;
  let sync: LivingDocsSync;

  beforeEach(async () => {
    // Create isolated test directory
    testRoot = path.join(os.tmpdir(), `specweave-ac-bold-test-${Date.now()}`);
    await fs.ensureDir(testRoot);

    // Initialize LivingDocsSync
    sync = new LivingDocsSync(testRoot);
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.remove(testRoot);
  });

  it('should extract ACs with plain text format', async () => {
    // Create increment with plain ACs
    const incrementId = '0001-test-plain-acs';
    const incrementDir = path.join(testRoot, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementDir);

    const specContent = `---
increment: ${incrementId}
title: "Test Plain ACs"
status: planning
---

# Test Feature

## User Stories

### US-001: Test User Story

**As a** developer
**I want** plain AC format
**So that** extraction works

**Acceptance Criteria**:

- [ ] AC-US1-01: First plain AC
- [ ] AC-US1-02: Second plain AC
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent);

    // Sync to living docs
    const result = await sync.syncIncrement(incrementId);

    expect(result.success).toBe(true);
    expect(result.filesCreated.length).toBeGreaterThan(0);

    // Verify US-001 file has ACs
    const userStoryFile = result.filesCreated.find(f => f.includes('us-001'));
    expect(userStoryFile).toBeDefined();

    const userStoryContent = await fs.readFile(userStoryFile!, 'utf-8');

    // Should contain both ACs
    expect(userStoryContent).toContain('AC-US1-01');
    expect(userStoryContent).toContain('First plain AC');
    expect(userStoryContent).toContain('AC-US1-02');
    expect(userStoryContent).toContain('Second plain AC');
  });

  it('should extract ACs with bold formatting', async () => {
    // Create increment with bold ACs
    const incrementId = '0002-test-bold-acs';
    const incrementDir = path.join(testRoot, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementDir);

    const specContent = `---
increment: ${incrementId}
title: "Test Bold ACs"
status: planning
---

# Test Feature

## User Stories

### US-001: Test User Story with Bold ACs

**As a** developer
**I want** bold AC format support
**So that** SpecWeave can extract ACs from real specs

**Acceptance Criteria**:

- [ ] **AC-US1-01**: First bold AC (this is the bug fix!)
- [ ] **AC-US1-02**: Second bold AC with **nested** formatting
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent);

    // Sync to living docs
    const result = await sync.syncIncrement(incrementId);

    expect(result.success).toBe(true);

    // Verify US-001 file has ACs with bold formatting
    const userStoryFile = result.filesCreated.find(f => f.includes('us-001'));
    expect(userStoryFile).toBeDefined();

    const userStoryContent = await fs.readFile(userStoryFile!, 'utf-8');

    // Should contain both bold ACs
    expect(userStoryContent).toContain('**AC-US1-01**');
    expect(userStoryContent).toContain('First bold AC');
    expect(userStoryContent).toContain('**AC-US1-02**');
    expect(userStoryContent).toContain('Second bold AC');
  });

  it('should extract mixed plain and bold ACs', async () => {
    // Create increment with mixed format
    const incrementId = '0003-test-mixed-acs';
    const incrementDir = path.join(testRoot, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementDir);

    const specContent = `---
increment: ${incrementId}
title: "Test Mixed ACs"
status: planning
---

# Test Feature

## User Stories

### US-001: Mixed Format User Story

**As a** developer
**I want** support for both formats
**So that** legacy and new specs both work

**Acceptance Criteria**:

- [ ] AC-US1-01: Plain AC format
- [ ] **AC-US1-02**: Bold AC format
- [ ] AC-US1-03: Another plain AC
- [ ] **AC-US1-04**: Another bold AC
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent);

    // Sync to living docs
    const result = await sync.syncIncrement(incrementId);

    expect(result.success).toBe(true);

    // Verify US-001 file has all 4 ACs
    const userStoryFile = result.filesCreated.find(f => f.includes('us-001'));
    expect(userStoryFile).toBeDefined();

    const userStoryContent = await fs.readFile(userStoryFile!, 'utf-8');

    // Should contain all ACs (both plain and bold)
    expect(userStoryContent).toContain('AC-US1-01');
    expect(userStoryContent).toContain('Plain AC format');
    expect(userStoryContent).toContain('**AC-US1-02**');
    expect(userStoryContent).toContain('Bold AC format');
    expect(userStoryContent).toContain('AC-US1-03');
    expect(userStoryContent).toContain('Another plain AC');
    expect(userStoryContent).toContain('**AC-US1-04**');
    expect(userStoryContent).toContain('Another bold AC');
  });

  it('should correctly map AC-US1-01 to US-001', async () => {
    // Verify user story ID extraction logic
    const incrementId = '0004-test-user-story-mapping';
    const incrementDir = path.join(testRoot, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementDir);

    const specContent = `---
increment: ${incrementId}
title: "Test User Story Mapping"
status: planning
---

# Test Feature

## User Stories

### US-001: First User Story

**Acceptance Criteria**:

- [ ] **AC-US1-01**: AC for US-001
- [ ] **AC-US1-02**: Another AC for US-001

### US-002: Second User Story

**Acceptance Criteria**:

- [ ] **AC-US2-01**: AC for US-002
- [ ] **AC-US2-02**: Another AC for US-002
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent);

    // Sync to living docs
    const result = await sync.syncIncrement(incrementId);

    expect(result.success).toBe(true);

    // Verify US-001 file has only US1 ACs
    const us001File = result.filesCreated.find(f => f.includes('us-001'));
    expect(us001File).toBeDefined();

    const us001Content = await fs.readFile(us001File!, 'utf-8');
    expect(us001Content).toContain('AC-US1-01');
    expect(us001Content).toContain('AC-US1-02');
    expect(us001Content).not.toContain('AC-US2-01'); // Should NOT contain US2 ACs

    // Verify US-002 file has only US2 ACs
    const us002File = result.filesCreated.find(f => f.includes('us-002'));
    expect(us002File).toBeDefined();

    const us002Content = await fs.readFile(us002File!, 'utf-8');
    expect(us002Content).toContain('AC-US2-01');
    expect(us002Content).toContain('AC-US2-02');
    expect(us002Content).not.toContain('AC-US1-01'); // Should NOT contain US1 ACs
  });

  it('should preserve AC completion status (checked/unchecked)', async () => {
    // Test that completed ACs appear as [x], incomplete as [ ]
    const incrementId = '0005-test-ac-completion';
    const incrementDir = path.join(testRoot, '.specweave/increments', incrementId);
    await fs.ensureDir(incrementDir);

    const specContent = `---
increment: ${incrementId}
title: "Test AC Completion Status"
status: planning
---

# Test Feature

## User Stories

### US-001: Test Completion Status

**Acceptance Criteria**:

- [x] **AC-US1-01**: Completed AC (checked)
- [ ] **AC-US1-02**: Incomplete AC (unchecked)
- [x] **AC-US1-03**: Another completed AC
`;

    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent);

    // Sync to living docs
    const result = await sync.syncIncrement(incrementId);

    expect(result.success).toBe(true);

    // Verify US-001 file preserves completion status
    const userStoryFile = result.filesCreated.find(f => f.includes('us-001'));
    expect(userStoryFile).toBeDefined();

    const userStoryContent = await fs.readFile(userStoryFile!, 'utf-8');

    // Should preserve [x] for completed ACs
    expect(userStoryContent).toMatch(/- \[x\] \*\*AC-US1-01\*\*/);
    expect(userStoryContent).toMatch(/- \[x\] \*\*AC-US1-03\*\*/);

    // Should preserve [ ] for incomplete ACs
    expect(userStoryContent).toMatch(/- \[ \] \*\*AC-US1-02\*\*/);
  });
});
