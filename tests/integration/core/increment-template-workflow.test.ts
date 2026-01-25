/**
 * Integration test for Increment Template Creation Workflow
 *
 * Validates the complete workflow:
 * 1. Template creator creates proper templates (not full content)
 * 2. Templates contain required markers
 * 3. Validation detects incomplete templates
 * 4. PM/Architect skills can complete templates
 *
 * This test ensures the fix for "increment-planner bypassing skill system"
 * is working correctly.
 *
 * @module increment-template-workflow.test
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
} from '../../../src/core/increment/template-creator.js';

describe('Increment Template Workflow Integration', () => {
  let tempDir: string;
  let specweavePath: string;
  let incrementsPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-workflow-test-'));
    specweavePath = path.join(tempDir, '.specweave');
    incrementsPath = path.join(specweavePath, 'increments');
    fs.mkdirSync(incrementsPath, { recursive: true });

    // Create minimal config.json for tests
    fs.writeFileSync(
      path.join(specweavePath, 'config.json'),
      JSON.stringify({
        project: { name: 'test-project' },
        testing: { defaultTestMode: 'test-after', defaultCoverageTarget: 80 },
      })
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('CRITICAL: Template Creation Must Not Contain Full Content', () => {
    it('should create spec.md with template markers, NOT full user stories', async () => {
      const result = await createIncrementTemplates({
        incrementId: '0001-stripe-dashboard',
        title: 'Stripe Dashboard MVP',
        description: 'React dashboard with Stripe checkout',
        projectId: 'test-project',
        projectRoot: tempDir,
      });

      expect(result.success).toBe(true);

      const specPath = path.join(incrementsPath, '0001-stripe-dashboard', 'spec.md');
      const content = fs.readFileSync(specPath, 'utf-8');

      // CRITICAL: Must have template markers
      expect(content).toContain('[Story Title]');
      expect(content).toContain('[user type]');
      expect(content).toContain('[goal]');
      expect(content).toContain('[benefit]');

      // CRITICAL: Must NOT have fully populated user stories
      // These would indicate the skill system was bypassed
      expect(content).not.toMatch(/### US-001: User Registration/);
      expect(content).not.toMatch(/### US-001: Login Feature/);
      expect(content).not.toMatch(/\*\*As a\*\* new user/);
      expect(content).not.toMatch(/\*\*As a\*\* registered user/);

      // Must be detected as template
      expect(isTemplateFile(specPath)).toBe(true);
    });

    it('should create plan.md with template markers, NOT full architecture', async () => {
      const result = await createIncrementTemplates({
        incrementId: '0001-stripe-dashboard',
        title: 'Stripe Dashboard MVP',
        description: 'React dashboard with Stripe checkout',
        projectId: 'test-project',
        projectRoot: tempDir,
      });

      expect(result.success).toBe(true);

      const planPath = path.join(incrementsPath, '0001-stripe-dashboard', 'plan.md');
      const content = fs.readFileSync(planPath, 'utf-8');

      // CRITICAL: Must have template markers
      expect(content).toContain('[Component 1]');
      expect(content).toContain('[Technical summary of implementation approach]');

      // CRITICAL: Must NOT have full architecture content
      expect(content).not.toMatch(/PostgreSQL/);
      expect(content).not.toMatch(/React.*frontend/i);
      expect(content).not.toMatch(/ASP\.NET/);
    });

    it('should create tasks.md with template markers, NOT full task list', async () => {
      const result = await createIncrementTemplates({
        incrementId: '0001-stripe-dashboard',
        title: 'Stripe Dashboard MVP',
        description: 'React dashboard with Stripe checkout',
        projectId: 'test-project',
        projectRoot: tempDir,
      });

      expect(result.success).toBe(true);

      const tasksPath = path.join(incrementsPath, '0001-stripe-dashboard', 'tasks.md');
      const content = fs.readFileSync(tasksPath, 'utf-8');

      // CRITICAL: Must have template markers
      expect(content).toContain('[User Story Title]');
      expect(content).toContain('[component]');

      // CRITICAL: Must NOT have fully populated tasks
      // These would indicate the skill system was bypassed
      expect(content).not.toMatch(/T-001:.*Initialize.*Backend/);
      expect(content).not.toMatch(/T-001:.*Configure.*Stripe/);
      expect(content).not.toMatch(/T-001:.*Create.*Authentication/);
    });
  });

  describe('Template Validation Must Detect Incomplete Templates', () => {
    it('should detect template as incomplete', async () => {
      await createIncrementTemplates({
        incrementId: '0001-test',
        title: 'Test',
        description: 'Test',
        projectId: 'test-project',
        projectRoot: tempDir,
      });

      const specPath = path.join(incrementsPath, '0001-test', 'spec.md');
      const validation = validateSpecCompletion(specPath);

      expect(validation.isComplete).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
    });

    it('should detect completed spec as complete', async () => {
      await createIncrementTemplates({
        incrementId: '0001-test',
        title: 'Test',
        description: 'Test',
        projectId: 'test-project',
        projectRoot: tempDir,
      });

      // Simulate PM skill completing the spec
      const specPath = path.join(incrementsPath, '0001-test', 'spec.md');
      fs.writeFileSync(
        specPath,
        `---
increment: 0001-test
title: "Test Feature"
---

# Feature: Test Feature

## Overview

A properly completed specification.

## User Stories

### US-001: Create User Account
**Project**: test-project

**As a** visitor
**I want** to create an account
**So that** I can use the application

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Registration form validates email
- [ ] **AC-US1-02**: Password must be 8+ characters

### US-002: Login
**Project**: test-project

**As a** registered user
**I want** to login
**So that** I can access my data

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Login form accepts email/password
- [ ] **AC-US2-02**: JWT token issued on success
`
      );

      // Should NOT be detected as template anymore
      expect(isTemplateFile(specPath)).toBe(false);

      // Should pass validation
      const validation = validateSpecCompletion(specPath);
      expect(validation.isComplete).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });
  });

  describe('Next Steps Guidance', () => {
    it('should provide correct next steps for PM/Architect completion', async () => {
      const result = await createIncrementTemplates({
        incrementId: '0001-feature',
        title: 'Feature',
        description: 'A feature',
        projectId: 'test-project',
        projectRoot: tempDir,
      });

      expect(result.nextSteps).toHaveLength(3);
      expect(result.nextSteps[0]).toContain('Complete product specification');
      expect(result.nextSteps[0]).toContain('0001-feature');
      expect(result.nextSteps[1]).toContain('Design architecture');
      expect(result.nextSteps[2]).toContain('Create tasks');
    });
  });

  describe('Prevention of Direct Content Writing', () => {
    it('template markers are required and cannot be faked easily', () => {
      // This test ensures that a file without proper template markers
      // is detected as "completed" (not a template)

      const specPath = path.join(tempDir, 'fake-spec.md');

      // Write "full content" without template markers
      fs.writeFileSync(
        specPath,
        `
### US-001: Login Feature
**Project**: test

**As a** user
**I want** to login
**So that** I can access the app

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Form validates email
- [ ] **AC-US1-02**: JWT issued on success

### US-002: Register
**Project**: test

**As a** new user
**I want** to register
**So that** I can create an account

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Form validates password strength
`
      );

      // This should NOT be detected as template
      // because it has full content without markers
      expect(isTemplateFile(specPath)).toBe(false);
    });
  });
});
