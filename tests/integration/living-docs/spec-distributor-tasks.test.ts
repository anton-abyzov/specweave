/**
 * Integration Tests for SpecDistributor - Project-Specific Tasks
 *
 * Tests the full workflow of generating user story files with project-specific tasks.
 */

import { SpecDistributor } from '../../../src/core/living-docs/spec-distributor.js';
import fs from 'fs-extra';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('SpecDistributor - Project-Specific Tasks Integration', () => {
  let testDir: string;
  let distributor: SpecDistributor;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(__dirname, '../../fixtures/temp-distributor-tasks-test');
    await fs.ensureDir(testDir);

    // Create .specweave structure
    await fs.ensureDir(path.join(testDir, '.specweave', 'increments'));
    await fs.ensureDir(path.join(testDir, '.specweave', 'docs', 'internal', 'specs'));
    await fs.ensureDir(path.join(testDir, '.specweave', 'docs', 'internal', 'specs', '_features'));

    distributor = new SpecDistributor(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('User Story File Generation with Tasks', () => {
    it('should generate user story files with ## Tasks section', async () => {
      // Create test increment
      const incrementId = '0031-test-feature';
      const incrementPath = path.join(testDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementPath);

      // Create spec.md
      const specContent = `---
title: "Test Feature"
priority: P1
status: active
---

# SPEC-031: Test Feature

## Quick Overview

This is a test feature for validating project-specific task generation.

**Business Value**:
- **User Experience**: Better task visibility
- **Developer Productivity**: Clear task assignments

---

### US-001: Backend API Implementation

**As a** backend developer
**I want** to implement the API endpoint
**So that** the frontend can consume the data

**Acceptance Criteria**:
- AC-001: API endpoint returns correct data format
- AC-002: API endpoint handles errors gracefully

**Business Rationale**: Need reliable API for frontend integration

---

### US-002: Frontend Component

**As a** frontend developer
**I want** to create the UI component
**So that** users can interact with the feature

**Acceptance Criteria**:
- AC-003: Component renders correctly
- AC-004: Component handles user input

**Business Rationale**: Need user interface for feature access
`;

      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      // Create tasks.md with AC-IDs
      const tasksContent = `# Tasks for 0031-test-feature

## T-001: Setup API endpoint

**Status**: [x] (100% - Completed)

**AC**: AC-001, AC-002

**Description**: Implement REST API endpoint for data retrieval

## T-002: Create React component

**Status**: [ ] (0% - Not started)

**AC**: AC-003

**Description**: Build reusable React component

## T-003: Add error handling

**Status**: [x] (100% - Completed)

**AC**: AC-002

**Description**: Implement comprehensive error handling

## T-004: Style component with CSS

**Status**: [ ] (0% - Not started)

**AC**: AC-004

**Description**: Apply styling to match design system
`;

      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      // Create config.json with multi-project setup
      const config = {
        multiProject: {
          enabled: true,
          projects: {
            backend: {
              name: 'Backend',
              techStack: ['Node.js', 'PostgreSQL'],
              keywords: ['api', 'endpoint', 'database'],
            },
            frontend: {
              name: 'Frontend',
              techStack: ['React', 'TypeScript'],
              keywords: ['component', 'react', 'ui', 'css', 'style'],
            },
          },
        },
      };

      await fs.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify(config, null, 2)
      );

      // Run distribution
      const result = await distributor.distribute(incrementId);

      expect(result.success).toBe(true);

      // Check backend user story file
      const backendUSPath = path.join(
        testDir,
        '.specweave',
        'docs',
        'internal',
        'specs',
        'backend',
        'FS-031',
        'us-001-backend-api-implementation.md'
      );

      expect(await fs.pathExists(backendUSPath)).toBe(true);

      const backendUSContent = await fs.readFile(backendUSPath, 'utf-8');

      // Verify ## Tasks section exists
      expect(backendUSContent).toContain('## Tasks');

      // Verify backend tasks are included (API and error handling)
      expect(backendUSContent).toContain('- [x] **T-001**: Setup API endpoint');
      expect(backendUSContent).toContain('- [x] **T-003**: Add error handling');

      // Verify frontend tasks are NOT included
      expect(backendUSContent).not.toContain('T-002');
      expect(backendUSContent).not.toContain('T-004');

      // Verify note about project-specific tasks
      expect(backendUSContent).toContain('> **Note**: Tasks are project-specific');

      // Check frontend user story file
      const frontendUSPath = path.join(
        testDir,
        '.specweave',
        'docs',
        'internal',
        'specs',
        'frontend',
        'FS-031',
        'us-002-frontend-component.md'
      );

      expect(await fs.pathExists(frontendUSPath)).toBe(true);

      const frontendUSContent = await fs.readFile(frontendUSPath, 'utf-8');

      // Verify frontend tasks are included
      expect(frontendUSContent).toContain('- [ ] **T-002**: Create React component');
      expect(frontendUSContent).toContain('- [ ] **T-004**: Style component with CSS');

      // Verify backend tasks are NOT included
      expect(frontendUSContent).not.toContain('T-001');
      expect(frontendUSContent).not.toContain('T-003');
    });

    it('should preserve task completion status from increment tasks.md', async () => {
      const incrementId = '0032-completion-test';
      const incrementPath = path.join(testDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementPath);

      const specContent = `---
title: "Completion Test"
---

# SPEC-032: Completion Test

## Overview
Test completion status preservation

### US-001: Test User Story

**As a** developer
**I want** to verify completion tracking
**So that** we can track progress accurately

**Acceptance Criteria**:
- AC-001: Completed tasks show [x]
- AC-002: Incomplete tasks show [ ]
`;

      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      const tasksContent = `
## T-001: Completed task

**Status**: [x] (100% - Completed)

**AC**: AC-001

## T-002: Incomplete task

**Status**: [ ] (0% - Not started)

**AC**: AC-002
`;

      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      const result = await distributor.distribute(incrementId);
      expect(result.success).toBe(true);

      const usPath = path.join(
        testDir,
        '.specweave',
        'docs',
        'internal',
        'specs',
        'default',
        'FS-032',
        'us-001-test-user-story.md'
      );

      const usContent = await fs.readFile(usPath, 'utf-8');

      // Verify completion status is preserved
      expect(usContent).toContain('- [x] **T-001**: Completed task');
      expect(usContent).toContain('- [ ] **T-002**: Incomplete task');
    });

    it('should handle increments with no user stories gracefully', async () => {
      const incrementId = '0033-no-stories';
      const incrementPath = path.join(testDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementPath);

      const specContent = `---
title: "No User Stories"
---

# SPEC-033: No User Stories

## Overview
This increment has no user stories (implementation-only work)
`;

      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      const tasksContent = `
## T-001: Implementation task

**Status**: [x]

**AC**: N/A
`;

      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      const result = await distributor.distribute(incrementId);

      // Should succeed but generate no user story files
      expect(result.success).toBe(true);
      expect(result.userStories.length).toBe(0);
    });
  });

  describe('Legacy Compatibility', () => {
    it('should maintain backward compatibility with old user story format', async () => {
      const incrementId = '0034-legacy-test';
      const incrementPath = path.join(testDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementPath);

      const specContent = `---
title: "Legacy Test"
---

# SPEC-034: Legacy Test

### US-001: Legacy User Story

**As a** user
**I want** legacy format support
**So that** old increments still work

**Acceptance Criteria**:
- AC-001: Old format works
`;

      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      const tasksContent = `
## T-001: Legacy task

**Status**: [x]

**AC**: AC-001
`;

      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      const result = await distributor.distribute(incrementId);
      expect(result.success).toBe(true);

      const usPath = path.join(
        testDir,
        '.specweave',
        'docs',
        'internal',
        'specs',
        'default',
        'FS-034',
        'us-001-legacy-user-story.md'
      );

      const usContent = await fs.readFile(usPath, 'utf-8');

      // Should have both new ## Tasks section and legacy Implementation section
      expect(usContent).toContain('## Tasks');
      expect(usContent).toContain('## Implementation');
      expect(usContent).toContain('**Source Tasks**: See increment tasks.md');
    });
  });

  describe('Multi-Project Task Filtering', () => {
    it('should correctly filter tasks for cross-project features', async () => {
      const incrementId = '0035-cross-project';
      const incrementPath = path.join(testDir, '.specweave', 'increments', incrementId);
      await fs.ensureDir(incrementPath);

      const specContent = `---
title: "Cross-Project Feature"
projects:
  - backend
  - frontend
  - mobile
---

# SPEC-035: Cross-Project Feature

### US-001: Universal User Story

**As a** user
**I want** the feature across all platforms
**So that** I have consistent experience

**Acceptance Criteria**:
- AC-001: Works on all platforms
`;

      await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent);

      const tasksContent = `
## T-001: API endpoint

**Status**: [x]

**AC**: AC-001

## T-002: React web component

**Status**: [ ]

**AC**: AC-001

## T-003: React Native component

**Status**: [ ]

**AC**: AC-001
`;

      await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);

      const config = {
        multiProject: {
          enabled: true,
          projects: {
            backend: {
              name: 'Backend',
              keywords: ['api', 'endpoint'],
            },
            frontend: {
              name: 'Frontend',
              keywords: ['react', 'web', 'component'],
            },
            mobile: {
              name: 'Mobile',
              keywords: ['react native', 'mobile'],
            },
          },
        },
      };

      await fs.writeFile(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify(config, null, 2)
      );

      const result = await distributor.distribute(incrementId);
      expect(result.success).toBe(true);

      // Backend should have API task
      const backendUSPath = path.join(
        testDir,
        '.specweave',
        'docs',
        'internal',
        'specs',
        'backend',
        'FS-035',
        'us-001-universal-user-story.md'
      );

      const backendContent = await fs.readFile(backendUSPath, 'utf-8');
      expect(backendContent).toContain('T-001');
      expect(backendContent).not.toContain('T-002');
      expect(backendContent).not.toContain('T-003');

      // Frontend should have web component task
      const frontendUSPath = path.join(
        testDir,
        '.specweave',
        'docs',
        'internal',
        'specs',
        'frontend',
        'FS-035',
        'us-001-universal-user-story.md'
      );

      const frontendContent = await fs.readFile(frontendUSPath, 'utf-8');
      expect(frontendContent).toContain('T-002');

      // Mobile should have React Native task
      const mobileUSPath = path.join(
        testDir,
        '.specweave',
        'docs',
        'internal',
        'specs',
        'mobile',
        'FS-035',
        'us-001-universal-user-story.md'
      );

      const mobileContent = await fs.readFile(mobileUSPath, 'utf-8');
      expect(mobileContent).toContain('T-003');
    });
  });
});
