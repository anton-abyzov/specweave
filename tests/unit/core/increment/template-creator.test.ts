/**
 * Tests for Increment Template Creator
 *
 * Ensures that:
 * 1. Templates are created with proper markers
 * 2. Template detection works correctly
 * 3. Full content is NOT created directly
 * 4. Templates require PM/Architect skills to complete
 *
 * @module template-creator.test
 * @since 1.0.162
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  createIncrementTemplates,
  isTemplateFile,
  validateSpecCompletion,
  TEMPLATE_MARKERS,
} from '../../../../src/core/increment/template-creator.js';

describe('template-creator', () => {
  let tempDir: string;
  let specweavePath: string;
  let incrementsPath: string;

  beforeEach(() => {
    // Create temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-template-test-'));
    specweavePath = path.join(tempDir, '.specweave');
    incrementsPath = path.join(specweavePath, 'increments');
    fs.mkdirSync(incrementsPath, { recursive: true });
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('createIncrementTemplates', () => {
    it('should create all required template files', async () => {
      const result = await createIncrementTemplates({
        incrementId: '0001-test-feature',
        title: 'Test Feature',
        description: 'A test feature description',
        projectId: 'test-project',
        projectRoot: tempDir,
      });

      expect(result.success).toBe(true);
      expect(result.createdFiles).toContain('metadata.json');
      expect(result.createdFiles).toContain('spec.md');
      expect(result.createdFiles).toContain('plan.md');
      expect(result.createdFiles).toContain('tasks.md');

      // Verify files exist
      const incrementPath = path.join(incrementsPath, '0001-test-feature');
      expect(fs.existsSync(path.join(incrementPath, 'metadata.json'))).toBe(true);
      expect(fs.existsSync(path.join(incrementPath, 'spec.md'))).toBe(true);
      expect(fs.existsSync(path.join(incrementPath, 'plan.md'))).toBe(true);
      expect(fs.existsSync(path.join(incrementPath, 'tasks.md'))).toBe(true);
    });

    it('should create spec.md as a TEMPLATE with markers', async () => {
      await createIncrementTemplates({
        incrementId: '0001-test-feature',
        title: 'Test Feature',
        description: 'A test feature description',
        projectId: 'test-project',
        projectRoot: tempDir,
      });

      const specPath = path.join(incrementsPath, '0001-test-feature', 'spec.md');
      const content = fs.readFileSync(specPath, 'utf-8');

      // CRITICAL: spec.md must contain template markers
      expect(content).toContain(TEMPLATE_MARKERS.STORY_TITLE);
      expect(content).toContain(TEMPLATE_MARKERS.USER_TYPE);
      expect(content).toContain(TEMPLATE_MARKERS.GOAL);
      expect(content).toContain(TEMPLATE_MARKERS.BENEFIT);
      expect(content).toContain(TEMPLATE_MARKERS.CRITERION);

      // Must contain the template warning comment
      expect(content).toContain('TEMPLATE FILE - MUST BE COMPLETED VIA PM/ARCHITECT SKILLS');
    });

    it('should create plan.md as a TEMPLATE with markers', async () => {
      await createIncrementTemplates({
        incrementId: '0001-test-feature',
        title: 'Test Feature',
        description: 'A test feature description',
        projectId: 'test-project',
        projectRoot: tempDir,
      });

      const planPath = path.join(incrementsPath, '0001-test-feature', 'plan.md');
      const content = fs.readFileSync(planPath, 'utf-8');

      // CRITICAL: plan.md must contain template markers
      expect(content).toContain(TEMPLATE_MARKERS.COMPONENT);
      expect(content).toContain('[Technical summary of implementation approach]');

      // Must contain the template warning comment
      expect(content).toContain('TEMPLATE FILE - MUST BE COMPLETED VIA ARCHITECT SKILL');
    });

    it('should create tasks.md as a TEMPLATE with markers', async () => {
      await createIncrementTemplates({
        incrementId: '0001-test-feature',
        title: 'Test Feature',
        description: 'A test feature description',
        projectId: 'test-project',
        projectRoot: tempDir,
      });

      const tasksPath = path.join(incrementsPath, '0001-test-feature', 'tasks.md');
      const content = fs.readFileSync(tasksPath, 'utf-8');

      // CRITICAL: tasks.md must contain template markers
      expect(content).toContain('[User Story Title]');
      expect(content).toContain('[component]');

      // Must contain the template warning comment
      expect(content).toContain('TEMPLATE FILE - MUST BE COMPLETED VIA TASK BUILDER SKILL');
    });

    it('should include projectId in user stories', async () => {
      await createIncrementTemplates({
        incrementId: '0001-test-feature',
        title: 'Test Feature',
        description: 'A test feature description',
        projectId: 'my-custom-project',
        projectRoot: tempDir,
      });

      const specPath = path.join(incrementsPath, '0001-test-feature', 'spec.md');
      const content = fs.readFileSync(specPath, 'utf-8');

      // Project ID must be in user stories
      expect(content).toContain('**Project**: my-custom-project');
    });

    it('should include boardId for 2-level structures', async () => {
      await createIncrementTemplates({
        incrementId: '0001-test-feature',
        title: 'Test Feature',
        description: 'A test feature description',
        projectId: 'my-project',
        boardId: 'frontend-team',
        projectRoot: tempDir,
      });

      const specPath = path.join(incrementsPath, '0001-test-feature', 'spec.md');
      const content = fs.readFileSync(specPath, 'utf-8');

      expect(content).toContain('**Board**: frontend-team');
    });

    it('should create valid metadata.json', async () => {
      await createIncrementTemplates({
        incrementId: '0001-test-feature',
        title: 'Test Feature',
        description: 'A test feature description',
        projectId: 'test-project',
        type: 'hotfix',
        priority: 'P1',
        testMode: 'TDD',
        coverageTarget: 90,
        projectRoot: tempDir,
      });

      const metadataPath = path.join(incrementsPath, '0001-test-feature', 'metadata.json');
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

      expect(metadata.id).toBe('0001-test-feature');
      expect(metadata.status).toBe('planned');
      expect(metadata.type).toBe('hotfix');
      expect(metadata.priority).toBe('P1');
      expect(metadata.testMode).toBe('TDD');
      expect(metadata.coverageTarget).toBe(90);
    });

    it('should provide next steps guidance', async () => {
      const result = await createIncrementTemplates({
        incrementId: '0001-test-feature',
        title: 'Test Feature',
        description: 'A test feature description',
        projectId: 'test-project',
        projectRoot: tempDir,
      });

      expect(result.nextSteps).toHaveLength(3);
      expect(result.nextSteps[0]).toContain('Complete product specification');
      expect(result.nextSteps[1]).toContain('Design architecture');
      expect(result.nextSteps[2]).toContain('Generate tasks');
    });

    it('should fail if increment already exists', async () => {
      // Create first increment
      await createIncrementTemplates({
        incrementId: '0001-test-feature',
        title: 'Test Feature',
        description: 'A test feature description',
        projectId: 'test-project',
        projectRoot: tempDir,
      });

      // Try to create duplicate
      const result = await createIncrementTemplates({
        incrementId: '0001-another-feature',
        title: 'Another Feature',
        description: 'Another description',
        projectId: 'test-project',
        projectRoot: tempDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('DUPLICATE');
    });

    /**
     * TDD is an EXECUTION practice, not a PLANNING practice.
     * Planning ALWAYS generates standard templates.
     * TDD discipline is enforced at execution time via /sw:tdd-* commands.
     */
    it('should store TDD testMode in metadata but use standard tasks template', async () => {
      await createIncrementTemplates({
        incrementId: '0001-tdd-feature',
        title: 'TDD Feature',
        description: 'Testing TDD mode handling',
        projectId: 'test-project',
        testMode: 'TDD',
        projectRoot: tempDir,
      });

      // metadata.json should store testMode for execution-time reference
      const metadataPath = path.join(incrementsPath, '0001-tdd-feature', 'metadata.json');
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      expect(metadata.testMode).toBe('TDD');

      // But tasks.md should ALWAYS use standard template
      // TDD discipline is enforced at EXECUTION time, not planning time
      const tasksPath = path.join(incrementsPath, '0001-tdd-feature', 'tasks.md');
      const content = fs.readFileSync(tasksPath, 'utf-8');

      // Should NOT have TDD-specific sections (TDD is execution-time)
      expect(content).not.toContain('## TDD Contract');
      expect(content).not.toContain('TDD MODE ACTIVE');
      expect(content).not.toContain('[RED]');
      expect(content).not.toContain('[GREEN]');
      expect(content).not.toContain('[REFACTOR]');

      // Should have standard task builder template
      expect(content).toContain('TEMPLATE FILE - MUST BE COMPLETED VIA TASK BUILDER SKILL');
    });

    it('should use standard template regardless of testMode setting', async () => {
      // Test with various testMode values - all should produce standard templates
      const testModes = ['TDD', 'tdd', 'Tdd', 'test-after', 'test-first', undefined];

      for (let i = 0; i < testModes.length; i++) {
        const testMode = testModes[i];
        const incrementId = `000${i + 1}-testmode-${testMode || 'undefined'}`;

        await createIncrementTemplates({
          incrementId,
          title: `TestMode ${testMode}`,
          description: 'Testing testMode handling',
          projectId: 'test-project',
          testMode: testMode as string,
          projectRoot: tempDir,
        });

        const tasksPath = path.join(incrementsPath, incrementId, 'tasks.md');
        const content = fs.readFileSync(tasksPath, 'utf-8');

        // ALL testModes should produce standard template
        expect(content).toContain('TEMPLATE FILE - MUST BE COMPLETED VIA TASK BUILDER SKILL');
        expect(content).not.toContain('## TDD Contract');
        expect(content).not.toContain('TDD MODE ACTIVE');
      }
    });

    it('should preserve testMode in metadata for execution-time use', async () => {
      await createIncrementTemplates({
        incrementId: '0001-preserve-mode',
        title: 'Preserve Mode',
        description: 'Testing testMode preservation',
        projectId: 'test-project',
        testMode: 'TDD',
        projectRoot: tempDir,
      });

      const metadataPath = path.join(incrementsPath, '0001-preserve-mode', 'metadata.json');
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

      // testMode should be preserved in metadata for execution commands
      // (e.g., /sw:do --tdd reads this to enforce TDD discipline)
      expect(metadata.testMode).toBe('TDD');
    });
  });

  describe('isTemplateFile', () => {
    it('should return true for template files with markers', () => {
      const specPath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(
        specPath,
        `
### US-001: [Story Title]
**Project**: test-project

**As a** [user type]
**I want** [goal]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] **AC-US1-01**: [Specific, testable criterion]
      `
      );

      expect(isTemplateFile(specPath)).toBe(true);
    });

    it('should return true for files with placeholders', () => {
      const specPath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(
        specPath,
        `
### US-001: Login Feature
**Project**: {{RESOLVED_PROJECT}}

**As a** user
**I want** to login
**So that** I can access the app
      `
      );

      expect(isTemplateFile(specPath)).toBe(true);
    });

    it('should return false for completed spec files', () => {
      const specPath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(
        specPath,
        `
---
increment: 0001-auth
title: "User Authentication"
---

# Feature: User Authentication

## Overview

Complete authentication system with login, registration, and OAuth.

## User Stories

### US-001: User Registration
**Project**: my-app

**As a** new user
**I want** to create an account with email and password
**So that** I can access the application

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Registration form validates email format
- [ ] **AC-US1-02**: Password must be at least 8 characters
- [ ] **AC-US1-03**: Confirmation email is sent after registration

### US-002: User Login
**Project**: my-app

**As a** registered user
**I want** to log in with my credentials
**So that** I can access my account

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Login form accepts email and password
- [ ] **AC-US2-02**: JWT token is issued on successful login
- [ ] **AC-US2-03**: Invalid credentials show error message

### US-003: OAuth Login
**Project**: my-app

**As a** user
**I want** to sign in with Google
**So that** I don't need to remember another password

**Acceptance Criteria**:
- [ ] **AC-US3-01**: Google OAuth button is visible
- [ ] **AC-US3-02**: OAuth flow redirects correctly
      `
      );

      expect(isTemplateFile(specPath)).toBe(false);
    });

    it('should return true for non-existent files', () => {
      expect(isTemplateFile('/non/existent/path/spec.md')).toBe(true);
    });
  });

  describe('validateSpecCompletion', () => {
    it('should report incomplete for template files', () => {
      const specPath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(
        specPath,
        `
### US-001: [Story Title]
**Project**: test-project

**As a** [user type]
**I want** [goal]

**Acceptance Criteria**:
- [ ] **AC-US1-01**: [Specific, testable criterion]
      `
      );

      const result = validateSpecCompletion(specPath);

      expect(result.isComplete).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some((i) => i.includes('User story titles'))).toBe(true);
      expect(result.issues.some((i) => i.includes('User types'))).toBe(true);
    });

    it('should report complete for properly filled files', () => {
      const specPath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(
        specPath,
        `
---
increment: 0001-feature
title: "My Feature"
---

## User Stories

### US-001: Create User Account
**Project**: my-app

**As a** visitor
**I want** to create an account
**So that** I can use the app

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Form validates email format
- [ ] **AC-US1-02**: Password requires 8 characters
- [ ] **AC-US1-03**: Success message shown

### US-002: Login to Account
**Project**: my-app

**As a** user
**I want** to login
**So that** I can access my data

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Login form works
- [ ] **AC-US2-02**: JWT token issued
      `
      );

      const result = validateSpecCompletion(specPath);

      expect(result.isComplete).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should report incomplete when no user stories', () => {
      const specPath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(
        specPath,
        `
---
increment: 0001-feature
title: "My Feature"
---

## Overview

Some overview text.

## Requirements

Some requirements.
      `
      );

      const result = validateSpecCompletion(specPath);

      expect(result.isComplete).toBe(false);
      expect(result.issues.some((i) => i.includes('No user stories'))).toBe(true);
    });

    it('should detect unfilled placeholders', () => {
      const specPath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(
        specPath,
        `
### US-001: Login Feature
**Project**: {{PROJECT_ID}}

**As a** user
**I want** to login
      `
      );

      const result = validateSpecCompletion(specPath);

      expect(result.isComplete).toBe(false);
      expect(result.issues.some((i) => i.includes('placeholder'))).toBe(true);
    });
  });

  describe('TEMPLATE_MARKERS', () => {
    it('should have all required markers defined', () => {
      expect(TEMPLATE_MARKERS.STORY_TITLE).toBe('[Story Title]');
      expect(TEMPLATE_MARKERS.USER_TYPE).toBe('[user type]');
      expect(TEMPLATE_MARKERS.GOAL).toBe('[goal]');
      expect(TEMPLATE_MARKERS.BENEFIT).toBe('[benefit]');
      expect(TEMPLATE_MARKERS.CRITERION).toBe('[Specific, testable criterion]');
      expect(TEMPLATE_MARKERS.COMPONENT).toBe('[Component 1]');
      expect(TEMPLATE_MARKERS.PROJECT_PLACEHOLDER).toBe('{{RESOLVED_PROJECT}}');
    });

    it('should have valid regex patterns', () => {
      expect(TEMPLATE_MARKERS.PLACEHOLDER_PATTERN.test('{{PROJECT_ID}}')).toBe(true);
      expect(TEMPLATE_MARKERS.PLACEHOLDER_PATTERN.test('{{RESOLVED_PROJECT}}')).toBe(true);
      expect(TEMPLATE_MARKERS.PLACEHOLDER_PATTERN.test('regular text')).toBe(false);

      expect(TEMPLATE_MARKERS.BRACKET_PLACEHOLDER.test('[Story Title]')).toBe(true);
      expect(TEMPLATE_MARKERS.BRACKET_PLACEHOLDER.test('[user type]')).toBe(true);
      expect(TEMPLATE_MARKERS.BRACKET_PLACEHOLDER.test('no brackets')).toBe(false);
    });
  });

  describe('integration: template creation workflow', () => {
    it('should create templates that pass isTemplateFile check', async () => {
      const result = await createIncrementTemplates({
        incrementId: '0001-test-feature',
        title: 'Test Feature',
        description: 'A test feature description',
        projectId: 'test-project',
        projectRoot: tempDir,
      });

      expect(result.success).toBe(true);

      const specPath = path.join(incrementsPath, '0001-test-feature', 'spec.md');
      expect(isTemplateFile(specPath)).toBe(true);
    });

    it('should create templates that fail validation', async () => {
      const result = await createIncrementTemplates({
        incrementId: '0001-test-feature',
        title: 'Test Feature',
        description: 'A test feature description',
        projectId: 'test-project',
        projectRoot: tempDir,
      });

      expect(result.success).toBe(true);

      const specPath = path.join(incrementsPath, '0001-test-feature', 'spec.md');
      const validation = validateSpecCompletion(specPath);

      expect(validation.isComplete).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
    });
  });
});
