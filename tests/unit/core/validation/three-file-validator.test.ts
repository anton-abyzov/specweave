import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  ThreeFileValidator,
  ValidationSeverity,
  ValidationErrorCode,
} from '../../../../src/core/validation/three-file-validator.js';

describe('ThreeFileValidator', () => {
  let tempDir: string;
  let validator: ThreeFileValidator;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-3fv-test-'));
    validator = new ThreeFileValidator();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // ── Helper functions ──────────────────────────────────────────────

  function writeSpec(content: string): void {
    fs.writeFileSync(path.join(tempDir, 'spec.md'), content, 'utf-8');
  }

  function writePlan(content: string): void {
    fs.writeFileSync(path.join(tempDir, 'plan.md'), content, 'utf-8');
  }

  function writeTasks(content: string): void {
    fs.writeFileSync(path.join(tempDir, 'tasks.md'), content, 'utf-8');
  }

  function writeValidSpec(): void {
    writeSpec(`# Feature Specification

## Overview

The system should allow users to manage their profiles.

## User Stories

### US-001: Profile management
As a user, I want to update my profile so that my information stays current.

## Acceptance Criteria

- [ ] AC-US1-01: User can edit their display name
- [ ] AC-US1-02: User can upload a profile picture
- [ ] AC-US1-03: Changes are saved and visible immediately
`);
  }

  function writeValidPlan(): void {
    writePlan(`# Implementation Plan

## Architecture

The profile service will be implemented as a REST API with a React frontend.

## Phases

### Phase 1: Backend API
Build the profile endpoints.

### Phase 2: Frontend UI
Build the profile editing form.

## Dependencies
None.
`);
  }

  function writeValidTasks(): void {
    writeTasks(`# Tasks

### T-001: Create profile API endpoint
**AC-IDs**: AC-US1-01, AC-US1-02
**Status**: [ ] pending
**Implementation**:
- [ ] Create POST /api/profile route
- [ ] Add validation middleware
- [ ] Write database migration

**Test Plan** (BDD):
- Given a logged-in user, When they submit profile data, Then it is saved

### T-002: Build profile form
**AC-IDs**: AC-US1-03
**Status**: [ ] pending
**Implementation**:
- [ ] Create ProfileForm component
- [ ] Add field validation
- [ ] Connect to API

**Tests**:
- Given the profile page, When user edits name, Then form updates
`);
  }

  // ── Missing files ─────────────────────────────────────────────────

  describe('missing files', () => {
    it('should report ERROR when spec.md is not found', () => {
      writePlan('# Plan');
      writeTasks('# Tasks');

      const result = validator.validateIncrement(tempDir);

      const specIssue = result.issues.find(
        i => i.file === 'spec.md' && i.code === ValidationErrorCode.FILE_NOT_FOUND
      );
      expect(specIssue).toBeDefined();
      expect(specIssue!.severity).toBe(ValidationSeverity.ERROR);
      expect(specIssue!.message).toContain('spec.md not found');
    });

    it('should report ERROR when tasks.md is not found', () => {
      writeSpec('# Spec\n## Acceptance Criteria\n');
      writePlan('# Plan');

      const result = validator.validateIncrement(tempDir);

      const tasksIssue = result.issues.find(
        i => i.file === 'tasks.md' && i.code === ValidationErrorCode.FILE_NOT_FOUND
      );
      expect(tasksIssue).toBeDefined();
      expect(tasksIssue!.severity).toBe(ValidationSeverity.ERROR);
      expect(tasksIssue!.message).toContain('tasks.md not found');
    });

    it('should NOT report error when plan.md is missing (optional)', () => {
      writeValidSpec();
      writeValidTasks();

      const result = validator.validateIncrement(tempDir);

      const planIssue = result.issues.find(
        i => i.file === 'plan.md' && i.code === ValidationErrorCode.FILE_NOT_FOUND
      );
      expect(planIssue).toBeUndefined();
    });

    it('should report both spec.md and tasks.md missing when directory is empty', () => {
      const result = validator.validateIncrement(tempDir);

      const fileNotFoundIssues = result.issues.filter(
        i => i.code === ValidationErrorCode.FILE_NOT_FOUND
      );
      expect(fileNotFoundIssues).toHaveLength(2);

      const files = fileNotFoundIssues.map(i => i.file);
      expect(files).toContain('spec.md');
      expect(files).toContain('tasks.md');
    });

    it('should mark result as invalid when spec.md is missing', () => {
      writePlan('# Plan');
      writeTasks('# Tasks');

      const result = validator.validateIncrement(tempDir);
      expect(result.valid).toBe(false);
    });

    it('should mark result as invalid when tasks.md is missing', () => {
      writeValidSpec();
      writePlan('# Plan');

      const result = validator.validateIncrement(tempDir);
      expect(result.valid).toBe(false);
    });

    it('should provide fix suggestion for missing spec.md', () => {
      writeTasks('# Tasks');

      const result = validator.validateIncrement(tempDir);

      const specIssue = result.issues.find(
        i => i.file === 'spec.md' && i.code === ValidationErrorCode.FILE_NOT_FOUND
      );
      expect(specIssue!.fix).toBeDefined();
      expect(specIssue!.fix).toContain('Create spec.md');
    });

    it('should provide fix suggestion for missing tasks.md', () => {
      writeValidSpec();

      const result = validator.validateIncrement(tempDir);

      const tasksIssue = result.issues.find(
        i => i.file === 'tasks.md' && i.code === ValidationErrorCode.FILE_NOT_FOUND
      );
      expect(tasksIssue!.fix).toBeDefined();
      expect(tasksIssue!.fix).toContain('Create tasks.md');
    });
  });

  // ── spec.md validation ────────────────────────────────────────────

  describe('spec.md validation', () => {
    beforeEach(() => {
      writeValidPlan();
      writeValidTasks();
    });

    it('should report ERROR when spec.md contains task IDs like T-001', () => {
      writeSpec(`# Spec

## Acceptance Criteria
- [ ] AC-US1-01: Something

## Notes
See T-001 for implementation details.
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.SPEC_CONTAINS_TASK_IDS
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe(ValidationSeverity.ERROR);
      expect(issue!.message).toContain('T-001');
    });

    it('should report ERROR for multi-digit task IDs like T-1000', () => {
      writeSpec(`# Spec

## Acceptance Criteria
- [ ] AC-US1-01: Something

Implemented in T-1000.
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.SPEC_CONTAINS_TASK_IDS
      );
      expect(issue).toBeDefined();
      expect(issue!.message).toContain('T-1000');
    });

    it('should report multiple task ID violations on different lines', () => {
      writeSpec(`# Spec

## Acceptance Criteria
- [ ] AC-US1-01: Check T-001
- [ ] AC-US1-02: Check T-002
`);

      const result = validator.validateIncrement(tempDir);

      const taskIdIssues = result.issues.filter(
        i => i.code === ValidationErrorCode.SPEC_CONTAINS_TASK_IDS
      );
      expect(taskIdIssues.length).toBeGreaterThanOrEqual(2);
    });

    it('should report correct line numbers for task ID violations', () => {
      writeSpec(`# Spec
## Acceptance Criteria
- [ ] AC-US1-01: Something
See T-001 here.
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.SPEC_CONTAINS_TASK_IDS
      );
      expect(issue).toBeDefined();
      expect(issue!.line).toBe(4);
    });

    it('should report WARNING when spec.md contains "class ClassName"', () => {
      writeSpec(`# Spec

## Acceptance Criteria
- [ ] AC-US1-01: Something

The class ProfileService handles this.
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.SPEC_CONTAINS_TECHNICAL_DETAILS
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe(ValidationSeverity.WARNING);
    });

    it('should report WARNING when spec.md contains .ts file extension', () => {
      writeSpec(`# Spec

## Acceptance Criteria
- [ ] AC-US1-01: Something

Edit the profile.ts file.
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.SPEC_CONTAINS_TECHNICAL_DETAILS
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe(ValidationSeverity.WARNING);
    });

    it('should report WARNING when spec.md contains .tsx file extension', () => {
      writeSpec(`# Spec

## Acceptance Criteria
- [ ] AC-US1-01: Something

Update ProfileForm.tsx component.
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.SPEC_CONTAINS_TECHNICAL_DETAILS
      );
      expect(issue).toBeDefined();
    });

    it('should report WARNING when spec.md contains .js file extension', () => {
      writeSpec(`# Spec

## Acceptance Criteria
- [ ] AC-US1-01: Something

Modify util.js for the change.
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.SPEC_CONTAINS_TECHNICAL_DETAILS
      );
      expect(issue).toBeDefined();
    });

    it('should report WARNING when spec.md contains "interface Name"', () => {
      writeSpec(`# Spec

## Acceptance Criteria
- [ ] AC-US1-01: Something

Define interface UserProfile for the data model.
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.SPEC_CONTAINS_TECHNICAL_DETAILS
      );
      expect(issue).toBeDefined();
    });

    it('should report WARNING when spec.md contains "function name("', () => {
      writeSpec(`# Spec

## Acceptance Criteria
- [ ] AC-US1-01: Something

Call function updateProfile(data) to save.
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.SPEC_CONTAINS_TECHNICAL_DETAILS
      );
      expect(issue).toBeDefined();
    });

    it('should NOT report technical details when line contains backtick code fence', () => {
      writeSpec(`# Spec

## Acceptance Criteria
- [ ] AC-US1-01: Something

\`\`\` class ProfileService { }
`);

      const result = validator.validateIncrement(tempDir);

      const techIssues = result.issues.filter(
        i => i.code === ValidationErrorCode.SPEC_CONTAINS_TECHNICAL_DETAILS
      );
      expect(techIssues).toHaveLength(0);
    });

    it('should report WARNING when spec.md is missing Acceptance Criteria section', () => {
      writeSpec(`# Spec

## Overview
This feature adds profile management.

## Requirements
Users should be able to update their profiles.
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.SPEC_MISSING_AC
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe(ValidationSeverity.WARNING);
    });

    it('should accept "## Acceptance Criteria" heading', () => {
      writeSpec(`# Spec

## Acceptance Criteria
- [ ] AC-US1-01: User can edit name
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.SPEC_MISSING_AC
      );
      expect(issue).toBeUndefined();
    });

    it('should accept "### Acceptance Criteria" heading (h3)', () => {
      writeSpec(`# Spec

### Acceptance Criteria
- [ ] AC-US1-01: User can edit name
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.SPEC_MISSING_AC
      );
      expect(issue).toBeUndefined();
    });

    it('should report no issues for a valid spec.md', () => {
      writeValidSpec();

      const result = validator.validateIncrement(tempDir);

      const specIssues = result.issues.filter(i => i.file === 'spec.md');
      expect(specIssues).toHaveLength(0);
    });

    it('should only report one technical detail issue per line even if multiple patterns match', () => {
      writeSpec(`# Spec

## Acceptance Criteria
- [ ] AC-US1-01: Something

Update class MyClass in file.ts to add interface IUser.
`);

      const result = validator.validateIncrement(tempDir);

      // The implementation breaks after first pattern match per line
      const techIssues = result.issues.filter(
        i =>
          i.code === ValidationErrorCode.SPEC_CONTAINS_TECHNICAL_DETAILS &&
          i.line === 6
      );
      expect(techIssues).toHaveLength(1);
    });
  });

  // ── plan.md validation ────────────────────────────────────────────

  describe('plan.md validation', () => {
    beforeEach(() => {
      writeValidSpec();
      writeValidTasks();
    });

    it('should report ERROR when plan.md contains "## Acceptance Criteria"', () => {
      writePlan(`# Plan

## Architecture
REST API approach.

## Acceptance Criteria
- [ ] AC-US1-01: Something
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.PLAN_CONTAINS_AC
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe(ValidationSeverity.ERROR);
      expect(issue!.file).toBe('plan.md');
    });

    it('should report ERROR when plan.md contains "### Acceptance Criteria"', () => {
      writePlan(`# Plan

### Acceptance Criteria
- [ ] AC-US1-01: Something
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.PLAN_CONTAINS_AC
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe(ValidationSeverity.ERROR);
    });

    it('should report ERROR when plan.md contains "**Acceptance Criteria**"', () => {
      writePlan(`# Plan

**Acceptance Criteria**
- AC-US1-01: Something
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.PLAN_CONTAINS_AC
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe(ValidationSeverity.ERROR);
    });

    it('should include correct line number for plan AC violation', () => {
      writePlan(`# Plan

## Architecture
Design notes.

## Acceptance Criteria
- [ ] AC-US1-01: Something
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.PLAN_CONTAINS_AC
      );
      expect(issue).toBeDefined();
      expect(issue!.line).toBe(6);
    });

    it('should report WARNING when plan.md contains task checkboxes', () => {
      writePlan(`# Plan

## Steps

- [ ] Set up the database
- [ ] Create the API routes
`);

      const result = validator.validateIncrement(tempDir);

      const checkboxIssues = result.issues.filter(
        i => i.code === ValidationErrorCode.PLAN_CONTAINS_TASK_CHECKBOXES
      );
      expect(checkboxIssues.length).toBeGreaterThanOrEqual(2);
      expect(checkboxIssues[0].severity).toBe(ValidationSeverity.WARNING);
    });

    it('should report correct line numbers for each checkbox in plan.md', () => {
      writePlan(`# Plan

- [ ] First task
- [x] Second task (completed)
- [ ] Third task
`);

      const result = validator.validateIncrement(tempDir);

      // Only unchecked checkboxes "- [ ]" match the pattern
      const checkboxIssues = result.issues.filter(
        i => i.code === ValidationErrorCode.PLAN_CONTAINS_TASK_CHECKBOXES
      );

      const lines = checkboxIssues.map(i => i.line);
      expect(lines).toContain(3);
      expect(lines).toContain(5);
    });

    it('should NOT report checkbox issues for checked items "- [x]"', () => {
      writePlan(`# Plan

- [x] Completed item
`);

      const result = validator.validateIncrement(tempDir);

      const checkboxIssues = result.issues.filter(
        i => i.code === ValidationErrorCode.PLAN_CONTAINS_TASK_CHECKBOXES
      );
      expect(checkboxIssues).toHaveLength(0);
    });

    it('should report no issues for a valid plan.md', () => {
      writeValidPlan();

      const result = validator.validateIncrement(tempDir);

      const planIssues = result.issues.filter(i => i.file === 'plan.md');
      expect(planIssues).toHaveLength(0);
    });
  });

  // ── tasks.md validation ───────────────────────────────────────────

  describe('tasks.md validation', () => {
    beforeEach(() => {
      writeValidSpec();
      writeValidPlan();
    });

    it('should report ERROR when tasks.md contains "**Acceptance Criteria**:"', () => {
      writeTasks(`# Tasks

### T-001: Some task
**Acceptance Criteria**:
- AC-US1-01: User can do something
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.TASKS_CONTAINS_AC
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe(ValidationSeverity.ERROR);
      expect(issue!.file).toBe('tasks.md');
      expect(issue!.message).toContain('CRITICAL');
    });

    it('should include the correct line number for AC in tasks violation', () => {
      writeTasks(`# Tasks

### T-001: Some task
**Status**: [ ] pending
**Acceptance Criteria**:
- Something
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.TASKS_CONTAINS_AC
      );
      expect(issue).toBeDefined();
      expect(issue!.line).toBe(5);
    });

    it('should report WARNING when task is missing "**Implementation**:" section', () => {
      writeTasks(`# Tasks

### T-001: Some task
**AC-IDs**: AC-US1-01
**Status**: [ ] pending

**Test Plan** (BDD):
- Given X, When Y, Then Z
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.TASKS_MISSING_IMPLEMENTATION
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe(ValidationSeverity.WARNING);
      expect(issue!.message).toContain('T-001');
    });

    it('should report WARNING when task is missing "**Test Plan**" section', () => {
      writeTasks(`# Tasks

### T-001: Some task
**AC-IDs**: AC-US1-01
**Status**: [ ] pending
**Implementation**:
- [ ] Do something
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.TASKS_MISSING_TEST_PLAN
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe(ValidationSeverity.WARNING);
      expect(issue!.message).toContain('T-001');
    });

    it('should accept "**Tests**:" as alternative to "**Test Plan**"', () => {
      writeTasks(`# Tasks

### T-001: Some task
**AC-IDs**: AC-US1-01
**Implementation**:
- [ ] Do something

**Tests**:
- Given X, When Y, Then Z
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.TASKS_MISSING_TEST_PLAN
      );
      expect(issue).toBeUndefined();
    });

    it('should report INFO when task is missing "**AC-IDs**:" or "**AC**:" section', () => {
      writeTasks(`# Tasks

### T-001: Some task
**Status**: [ ] pending
**Implementation**:
- [ ] Do something

**Test Plan** (BDD):
- Given X, When Y, Then Z
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.TASKS_MISSING_AC_IDS
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe(ValidationSeverity.INFO);
      expect(issue!.message).toContain('T-001');
    });

    it('should accept "**AC**:" as alternative to "**AC-IDs**:"', () => {
      writeTasks(`# Tasks

### T-001: Some task
**AC**: AC-US1-01
**Implementation**:
- [ ] Do something

**Test Plan**:
- Given X, When Y, Then Z
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.TASKS_MISSING_AC_IDS
      );
      expect(issue).toBeUndefined();
    });

    it('should report WARNING when tasks.md contains "As a user I want" language', () => {
      writeTasks(`# Tasks

### T-001: Profile task
**AC-IDs**: AC-US1-01
**Implementation**:
- [ ] Do something

As a user I want to update my profile.

**Test Plan**:
- Given X, When Y, Then Z
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.TASKS_CONTAINS_USER_STORY
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe(ValidationSeverity.WARNING);
      expect(issue!.message).toContain('user story');
    });

    it('should report correct line number for user story language', () => {
      writeTasks(`# Tasks
Line 2
Line 3
As a developer I want to refactor the code.
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.TASKS_CONTAINS_USER_STORY
      );
      expect(issue).toBeDefined();
      expect(issue!.line).toBe(4);
    });

    it('should validate multiple tasks independently', () => {
      writeTasks(`# Tasks

### T-001: First task
**AC-IDs**: AC-US1-01
**Implementation**:
- [ ] Do something

**Test Plan**:
- Test

### T-002: Second task
**Status**: [ ] pending
`);

      const result = validator.validateIncrement(tempDir);

      // T-001 should be clean; T-002 should have missing Implementation and Test Plan
      const implIssues = result.issues.filter(
        i => i.code === ValidationErrorCode.TASKS_MISSING_IMPLEMENTATION
      );
      const testIssues = result.issues.filter(
        i => i.code === ValidationErrorCode.TASKS_MISSING_TEST_PLAN
      );

      // Only T-002 should be flagged
      expect(implIssues).toHaveLength(1);
      expect(implIssues[0].message).toContain('T-002');
      expect(testIssues).toHaveLength(1);
      expect(testIssues[0].message).toContain('T-002');
    });

    it('should report no issues for valid tasks.md', () => {
      writeValidTasks();

      const result = validator.validateIncrement(tempDir);

      const taskIssues = result.issues.filter(i => i.file === 'tasks.md');
      expect(taskIssues).toHaveLength(0);
    });

    it('should detect user story language with various actor roles', () => {
      writeTasks(`# Tasks

As a admin I want to manage users.
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.TASKS_CONTAINS_USER_STORY
      );
      expect(issue).toBeDefined();
    });

    it('should NOT flag "As a" without "I want" as user story', () => {
      writeTasks(`# Tasks

### T-001: Something
**AC-IDs**: AC-US1-01
**Implementation**:
As a side note, this is important.

**Test Plan**:
- Test
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.TASKS_CONTAINS_USER_STORY
      );
      expect(issue).toBeUndefined();
    });
  });

  // ── Valid increment (all three files correct) ─────────────────────

  describe('valid increment', () => {
    it('should return valid=true with zero errors when all files are correct', () => {
      writeValidSpec();
      writeValidPlan();
      writeValidTasks();

      const result = validator.validateIncrement(tempDir);

      expect(result.valid).toBe(true);
      expect(result.summary.errors).toBe(0);
    });

    it('should return empty issues array for a perfect increment', () => {
      writeValidSpec();
      writeValidPlan();
      writeValidTasks();

      const result = validator.validateIncrement(tempDir);

      expect(result.issues).toHaveLength(0);
    });

    it('should return valid=true when there are only warnings and infos but no errors', () => {
      // Spec missing AC section (WARNING) but no errors
      writeSpec(`# Spec

## Overview
Some description without formal AC section.
`);
      writeValidPlan();
      writeTasks(`# Tasks

### T-001: Some task
**Implementation**:
- [ ] Do something

**Test Plan**:
- Test
`);

      const result = validator.validateIncrement(tempDir);

      expect(result.valid).toBe(true);
      expect(result.summary.errors).toBe(0);
      expect(result.summary.warnings + result.summary.infos).toBeGreaterThan(0);
    });
  });

  // ── Summary counts ────────────────────────────────────────────────

  describe('summary counts', () => {
    it('should count errors correctly', () => {
      // Missing spec.md (ERROR) + Missing tasks.md (ERROR)
      const result = validator.validateIncrement(tempDir);

      expect(result.summary.errors).toBe(2);
    });

    it('should count warnings correctly', () => {
      writeSpec(`# Spec

## Acceptance Criteria
- [ ] AC-US1-01: Something

The class ProfileService in file.ts handles this.
`);
      writeValidPlan();
      writeValidTasks();

      const result = validator.validateIncrement(tempDir);

      // "class ProfileService" -> WARNING, "file.ts" is on same line so only 1
      expect(result.summary.warnings).toBeGreaterThanOrEqual(1);
    });

    it('should count infos correctly', () => {
      writeValidSpec();
      writeValidPlan();
      writeTasks(`# Tasks

### T-001: Some task
**Implementation**:
- [ ] Do something

**Test Plan**:
- Test
`);

      const result = validator.validateIncrement(tempDir);

      // T-001 missing AC-IDs -> INFO
      const infoCount = result.summary.infos;
      expect(infoCount).toBe(1);
    });

    it('should have consistent counts between summary and filtered issues', () => {
      writeSpec('# Spec\nSee T-001.\n');
      writePlan('# Plan\n## Acceptance Criteria\n- AC\n- [ ] Task\n');
      writeTasks(`# Tasks

**Acceptance Criteria**: something

### T-001: Task
As a user I want to test.
`);

      const result = validator.validateIncrement(tempDir);

      const errorCount = result.issues.filter(
        i => i.severity === ValidationSeverity.ERROR
      ).length;
      const warningCount = result.issues.filter(
        i => i.severity === ValidationSeverity.WARNING
      ).length;
      const infoCount = result.issues.filter(
        i => i.severity === ValidationSeverity.INFO
      ).length;

      expect(result.summary.errors).toBe(errorCount);
      expect(result.summary.warnings).toBe(warningCount);
      expect(result.summary.infos).toBe(infoCount);
    });
  });

  // ── formatValidationReport ────────────────────────────────────────

  describe('formatValidationReport', () => {
    it('should return pass message when all files are valid and no issues', () => {
      writeValidSpec();
      writeValidPlan();
      writeValidTasks();

      const result = validator.validateIncrement(tempDir);
      const report = validator.formatValidationReport(result);

      expect(report).toContain('All files pass validation');
    });

    it('should include "FAIL" status when there are errors', () => {
      const result = validator.validateIncrement(tempDir);
      const report = validator.formatValidationReport(result);

      expect(report).toContain('FAIL');
    });

    it('should include "PASS" status when there are only warnings', () => {
      writeSpec(`# Spec

## Overview
Something without AC section.
`);
      writeValidPlan();
      writeValidTasks();

      const result = validator.validateIncrement(tempDir);
      const report = validator.formatValidationReport(result);

      expect(report).toContain('PASS');
    });

    it('should include error count in the report', () => {
      const result = validator.validateIncrement(tempDir);
      const report = validator.formatValidationReport(result);

      expect(report).toContain(`**Errors**: ${result.summary.errors}`);
    });

    it('should include warning count in the report', () => {
      writeSpec('# Spec\n## Acceptance Criteria\nclass Foo is used.\n');
      writeValidPlan();
      writeValidTasks();

      const result = validator.validateIncrement(tempDir);
      const report = validator.formatValidationReport(result);

      expect(report).toContain(`**Warnings**: ${result.summary.warnings}`);
    });

    it('should include info count in the report', () => {
      writeValidSpec();
      writeValidPlan();
      writeTasks(`# Tasks

### T-001: Task
**Implementation**:
- [ ] step

**Test Plan**:
- test
`);

      const result = validator.validateIncrement(tempDir);
      const report = validator.formatValidationReport(result);

      expect(report).toContain(`**Infos**: ${result.summary.infos}`);
    });

    it('should group issues by severity with proper headers', () => {
      writeSpec('# Spec\nSee T-001.\nclass Foo handles it.\n');
      writeValidPlan();
      writeTasks(`# Tasks

### T-001: Task
`);

      const result = validator.validateIncrement(tempDir);
      const report = validator.formatValidationReport(result);

      // Should have sections for errors and warnings
      expect(report).toContain('Errors (Must Fix)');
      expect(report).toContain('Warnings (Should Fix)');
    });

    it('should include issue code in the report', () => {
      const result = validator.validateIncrement(tempDir);
      const report = validator.formatValidationReport(result);

      expect(report).toContain(ValidationErrorCode.FILE_NOT_FOUND);
    });

    it('should include fix suggestions in the report', () => {
      const result = validator.validateIncrement(tempDir);
      const report = validator.formatValidationReport(result);

      expect(report).toContain('**Fix**:');
    });

    it('should include file and line information in the report', () => {
      writeSpec('# Spec\n## Acceptance Criteria\nSee T-001.\n');
      writeValidPlan();
      writeValidTasks();

      const result = validator.validateIncrement(tempDir);
      const report = validator.formatValidationReport(result);

      expect(report).toContain('spec.md:3');
    });

    it('should show "?" for line number when line is undefined', () => {
      // FILE_NOT_FOUND issues have no line number
      const result = validator.validateIncrement(tempDir);
      const report = validator.formatValidationReport(result);

      expect(report).toContain('spec.md:?');
    });

    it('should include info section header when there are info-level issues', () => {
      writeValidSpec();
      writeValidPlan();
      writeTasks(`# Tasks

### T-001: Task
**Implementation**:
- [ ] step

**Test Plan**:
- test
`);

      const result = validator.validateIncrement(tempDir);
      const report = validator.formatValidationReport(result);

      expect(report).toContain('Info (Nice to Have)');
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('should handle empty spec.md', () => {
      writeSpec('');
      writeValidPlan();
      writeValidTasks();

      const result = validator.validateIncrement(tempDir);

      // Empty spec should trigger missing AC warning
      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.SPEC_MISSING_AC
      );
      expect(issue).toBeDefined();
    });

    it('should handle empty plan.md without errors', () => {
      writeValidSpec();
      writePlan('');
      writeValidTasks();

      const result = validator.validateIncrement(tempDir);

      const planIssues = result.issues.filter(i => i.file === 'plan.md');
      expect(planIssues).toHaveLength(0);
    });

    it('should handle empty tasks.md', () => {
      writeValidSpec();
      writeValidPlan();
      writeTasks('');

      const result = validator.validateIncrement(tempDir);

      // Empty tasks.md should not crash; no task headers means no per-task checks
      const taskIssues = result.issues.filter(i => i.file === 'tasks.md');
      expect(taskIssues).toHaveLength(0);
    });

    it('should handle tasks.md with no task headers (no ### T-NNN)', () => {
      writeValidSpec();
      writeValidPlan();
      writeTasks(`# Tasks

Some general notes about the implementation.
No formal task structure yet.
`);

      const result = validator.validateIncrement(tempDir);

      // Per-task validations should not trigger since there are no task headers
      const implIssues = result.issues.filter(
        i => i.code === ValidationErrorCode.TASKS_MISSING_IMPLEMENTATION
      );
      expect(implIssues).toHaveLength(0);
    });

    it('should not flag T-01 or T-12 (fewer than 3 digits) as task IDs in spec.md', () => {
      writeSpec(`# Spec

## Acceptance Criteria
- [ ] AC-US1-01: Something

Reference: T-01, T-12 are not task IDs.
`);
      writeValidPlan();
      writeValidTasks();

      const result = validator.validateIncrement(tempDir);

      const taskIdIssues = result.issues.filter(
        i => i.code === ValidationErrorCode.SPEC_CONTAINS_TASK_IDS
      );
      expect(taskIdIssues).toHaveLength(0);
    });

    it('should handle spec.md with only whitespace content', () => {
      writeSpec('   \n  \n   \n');
      writeValidPlan();
      writeValidTasks();

      const result = validator.validateIncrement(tempDir);

      // Should report missing AC (no heading found)
      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.SPEC_MISSING_AC
      );
      expect(issue).toBeDefined();
    });

    it('should handle nonexistent directory path gracefully', () => {
      const badDir = path.join(tempDir, 'nonexistent-subdir');
      const result = validator.validateIncrement(badDir);

      // All required files will be "not found"
      expect(result.valid).toBe(false);
      const notFoundIssues = result.issues.filter(
        i => i.code === ValidationErrorCode.FILE_NOT_FOUND
      );
      expect(notFoundIssues.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle tasks with 4+ digit IDs like T-1234', () => {
      writeValidSpec();
      writeValidPlan();
      writeTasks(`# Tasks

### T-1234: Large increment task
**AC-IDs**: AC-US1-01
**Implementation**:
- [ ] Do something

**Test Plan**:
- Test
`);

      const result = validator.validateIncrement(tempDir);

      const taskIssues = result.issues.filter(i => i.file === 'tasks.md');
      expect(taskIssues).toHaveLength(0);
    });

    it('should detect AC in tasks.md even without task headers', () => {
      writeValidSpec();
      writeValidPlan();
      writeTasks(`# Tasks

**Acceptance Criteria**:
- AC-US1-01: Something
`);

      const result = validator.validateIncrement(tempDir);

      const issue = result.issues.find(
        i => i.code === ValidationErrorCode.TASKS_CONTAINS_AC
      );
      expect(issue).toBeDefined();
    });

    it('should return ThreeFileValidationResult with correct shape', () => {
      writeValidSpec();
      writeValidPlan();
      writeValidTasks();

      const result = validator.validateIncrement(tempDir);

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('errors');
      expect(result.summary).toHaveProperty('warnings');
      expect(result.summary).toHaveProperty('infos');
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should include fix suggestions on all issues', () => {
      writeSpec('# Spec\nSee T-001 and class Foo.\n');
      writePlan('# Plan\n## Acceptance Criteria\n- AC\n- [ ] Task\n');
      writeTasks(`# Tasks

**Acceptance Criteria**: something

### T-001: Task
As a user I want to test.
`);

      const result = validator.validateIncrement(tempDir);

      for (const issue of result.issues) {
        expect(issue.fix).toBeDefined();
        expect(typeof issue.fix).toBe('string');
        expect(issue.fix!.length).toBeGreaterThan(0);
      }
    });
  });
});
