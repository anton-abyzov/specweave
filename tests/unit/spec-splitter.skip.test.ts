/**
 * Unit Tests for Spec Splitter
 *
 * Tests parsing and splitting of specification files
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import {
  parseSpecFile,
  splitSpecIntoProjects,
  normalizeMetadata,
  type SpecMetadata,
  type ParsedSpec
} from '../../src/utils/spec-splitter.js';

// Test fixtures directory
const FIXTURES_DIR = path.join(__dirname, '../fixtures/spec-splitter');
const TEMP_DIR = path.join(__dirname, '../temp/spec-splitter');

describe('Spec Splitter', () => {
  beforeEach(async () => {
    // Create temp directory for test outputs
    await fs.ensureDir(TEMP_DIR);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(TEMP_DIR);
  });

  describe('normalizeMetadata', () => {
    it('should prefer camelCase over snake_case for specId', () => {
      const metadata: SpecMetadata = {
        spec_id: 'SPEC-001',
        title: 'Test Spec',
        version: '1.0.0',
        status: 'draft',
        created: '2025-11-10',
        authors: ['Author 1'],
        priority: 'P1'
      };

      const normalized = normalizeMetadata(metadata);

      expect(normalized.specId).toBe('SPEC-001');
      expect(normalized.spec_id).toBe('SPEC-001'); // Preserved for backward compat
    });

    it('should prefer camelCase for all dual-named fields', () => {
      const metadata: SpecMetadata = {
        spec_id: 'SPEC-002',
        last_updated: '2025-11-11',
        estimated_effort: '40 hours',
        target_release: 'v1.2.0',
        jira_sync: true,
        jira_projects: ['PROJ-A', 'PROJ-B'],
        title: 'Test Spec',
        version: '1.0.0',
        status: 'draft',
        created: '2025-11-10',
        authors: ['Author 1'],
        priority: 'P1'
      };

      const normalized = normalizeMetadata(metadata);

      expect(normalized.specId).toBe('SPEC-002');
      expect(normalized.lastUpdated).toBe('2025-11-11');
      expect(normalized.estimatedEffort).toBe('40 hours');
      expect(normalized.targetRelease).toBe('v1.2.0');
      expect(normalized.jiraSync).toBe(true);
      expect(normalized.jiraProjects).toEqual(['PROJ-A', 'PROJ-B']);
    });

    it('should prioritize camelCase when both versions exist', () => {
      const metadata: SpecMetadata = {
        specId: 'CAMEL-CASE',
        spec_id: 'SNAKE_CASE',
        lastUpdated: '2025-11-11',
        last_updated: '2025-11-10',
        title: 'Test Spec',
        version: '1.0.0',
        status: 'draft',
        created: '2025-11-10',
        authors: ['Author 1'],
        priority: 'P1'
      };

      const normalized = normalizeMetadata(metadata);

      expect(normalized.specId).toBe('CAMEL-CASE');
      expect(normalized.lastUpdated).toBe('2025-11-11');
    });

    it('should handle missing optional fields gracefully', () => {
      const metadata: SpecMetadata = {
        title: 'Minimal Spec',
        version: '1.0.0',
        status: 'draft',
        created: '2025-11-10',
        authors: ['Author 1'],
        priority: 'P2'
      };

      const normalized = normalizeMetadata(metadata);

      expect(normalized.specId).toBeUndefined();
      expect(normalized.lastUpdated).toBeUndefined();
      expect(normalized.estimatedEffort).toBeUndefined();
    });

    it('should preserve all original fields', () => {
      const metadata: SpecMetadata = {
        specId: 'SPEC-003',
        title: 'Test Spec',
        version: '1.0.0',
        status: 'review',
        created: '2025-11-10',
        lastUpdated: '2025-11-11',
        authors: ['Author 1', 'Author 2'],
        reviewers: ['Reviewer 1'],
        priority: 'P1',
        estimatedEffort: '60 hours',
        targetRelease: 'v2.0.0',
        jiraSync: true,
        jiraProjects: ['PROJ-X']
      };

      const normalized = normalizeMetadata(metadata);

      expect(normalized.title).toBe('Test Spec');
      expect(normalized.version).toBe('1.0.0');
      expect(normalized.authors).toEqual(['Author 1', 'Author 2']);
      expect(normalized.reviewers).toEqual(['Reviewer 1']);
    });
  });

  describe('parseSpecFile', () => {
    it('should parse spec file with frontmatter', async () => {
      const specContent = `---
specId: SPEC-001
title: Test Specification
version: 1.0.0
status: draft
created: 2025-11-10
authors:
  - Author 1
  - Author 2
priority: P1
---

# Test Specification

## Executive Summary

This is a test specification.

## User Stories

### US-001: Create login form

**Description**: As a user, I want to login

**Acceptance Criteria**:
- Login form renders
- Validation works

**Priority**: P1
**Story Points**: 5
`;

      const specPath = path.join(TEMP_DIR, 'test-spec.md');
      await fs.writeFile(specPath, specContent, 'utf-8');

      const parsed = await parseSpecFile(specPath);

      expect(parsed.metadata.specId).toBe('SPEC-001');
      expect(parsed.metadata.title).toBe('Test Specification');
      expect(parsed.metadata.version).toBe('1.0.0');
      expect(parsed.metadata.authors).toEqual(['Author 1', 'Author 2']);
      expect(parsed.executiveSummary).toContain('This is a test specification');
      expect(parsed.userStories.length).toBeGreaterThan(0);
      expect(parsed.userStories[0].id).toBe('US-001');
    });

    it('should normalize metadata after parsing', async () => {
      const specContent = `---
spec_id: SPEC-002
last_updated: 2025-11-11
estimated_effort: 40 hours
title: Test Spec
version: 1.0.0
status: draft
created: 2025-11-10
authors:
  - Author 1
priority: P1
---

# Test Spec

## Executive Summary

Test summary.
`;

      const specPath = path.join(TEMP_DIR, 'test-snake-case.md');
      await fs.writeFile(specPath, specContent, 'utf-8');

      const parsed = await parseSpecFile(specPath);

      // Should be normalized to camelCase
      expect(parsed.metadata.specId).toBe('SPEC-002');
      expect(parsed.metadata.lastUpdated).toBe('2025-11-11');
      expect(parsed.metadata.estimatedEffort).toBe('40 hours');
    });

    it('should handle spec file without frontmatter', async () => {
      const specContent = `# Test Specification

## Executive Summary

No frontmatter here.
`;

      const specPath = path.join(TEMP_DIR, 'no-frontmatter.md');
      await fs.writeFile(specPath, specContent, 'utf-8');

      await expect(parseSpecFile(specPath)).rejects.toThrow('No frontmatter found');
    });

    it('should parse multiple user stories', async () => {
      const specContent = `---
specId: SPEC-003
title: Multi-Story Spec
version: 1.0.0
status: draft
created: 2025-11-10
authors:
  - Author 1
priority: P1
---

# Multi-Story Spec

## User Stories

### US-001: First story

**Description**: First user story

**Acceptance Criteria**:
- Criterion 1
- Criterion 2

**Priority**: P1
**Story Points**: 5

### US-002: Second story

**Description**: Second user story

**Acceptance Criteria**:
- Criterion A
- Criterion B

**Priority**: P2
**Story Points**: 8
`;

      const specPath = path.join(TEMP_DIR, 'multi-story.md');
      await fs.writeFile(specPath, specContent, 'utf-8');

      const parsed = await parseSpecFile(specPath);

      expect(parsed.userStories.length).toBe(2);
      expect(parsed.userStories[0].id).toBe('US-001');
      expect(parsed.userStories[1].id).toBe('US-002');
      expect(parsed.userStories[0].storyPoints).toBe(5);
      expect(parsed.userStories[1].storyPoints).toBe(8);
    });

    it('should extract all required sections', async () => {
      const specContent = `---
specId: SPEC-004
title: Complete Spec
version: 1.0.0
status: draft
created: 2025-11-10
authors:
  - Author 1
priority: P1
---

# Complete Spec

## Executive Summary

Executive summary content.

## Problem Statement

Problem statement content.

## Functional Requirements

Functional requirements content.

## Non-Functional Requirements

Non-functional requirements content.

## Success Metrics

Success metrics content.

## Technical Architecture

Technical architecture content.

## Test Strategy

Test strategy content.

## Risk Analysis

Risk analysis content.

## Future Roadmap

Future roadmap content.

## Appendices

Appendices content.
`;

      const specPath = path.join(TEMP_DIR, 'complete-spec.md');
      await fs.writeFile(specPath, specContent, 'utf-8');

      const parsed = await parseSpecFile(specPath);

      expect(parsed.executiveSummary).toContain('Executive summary content');
      expect(parsed.problemStatement).toContain('Problem statement content');
      expect(parsed.functionalRequirements).toContain('Functional requirements content');
      expect(parsed.nonFunctionalRequirements).toContain('Non-functional requirements content');
      expect(parsed.successMetrics).toContain('Success metrics content');
      expect(parsed.technicalArchitecture).toContain('Technical architecture content');
      expect(parsed.testStrategy).toContain('Test strategy content');
      expect(parsed.riskAnalysis).toContain('Risk analysis content');
      expect(parsed.futureRoadmap).toContain('Future roadmap content');
      expect(parsed.appendices).toContain('Appendices content');
    });
  });

  describe('splitSpecIntoProjects', () => {
    it('should split spec into project-specific files', async () => {
      const specContent = `---
specId: SPEC-005
title: Multi-Project Spec
version: 1.0.0
status: draft
created: 2025-11-10
authors:
  - Author 1
priority: P1
---

# Multi-Project Spec

## Executive Summary

Cross-project specification.

## User Stories

### US-001: Create React login form

**Description**: Frontend login UI with React

**Acceptance Criteria**:
- Form renders
- Validation works

**Priority**: P1
**Story Points**: 5

### US-002: Implement authentication API

**Description**: Backend API for authentication

**Acceptance Criteria**:
- POST /api/auth/login works
- Returns JWT token

**Priority**: P1
**Story Points**: 8

### US-003: Add mobile biometric auth

**Description**: iOS and Android biometric authentication

**Acceptance Criteria**:
- Works on iOS
- Works on Android

**Priority**: P2
**Story Points**: 13
`;

      const specPath = path.join(TEMP_DIR, 'multi-project-spec.md');
      await fs.writeFile(specPath, specContent, 'utf-8');

      const outputMap = await splitSpecIntoProjects(specPath, TEMP_DIR);

      // Should create files for FE, BE, MOBILE
      expect(outputMap.size).toBeGreaterThan(0);
      expect(outputMap.has('FE') || outputMap.has('BE') || outputMap.has('MOBILE')).toBe(true);

      // Verify files were created
      for (const [projectId, outputPath] of outputMap.entries()) {
        const exists = await fs.pathExists(outputPath);
        expect(exists).toBe(true);

        const content = await fs.readFile(outputPath, 'utf-8');
        expect(content).toContain(projectId); // Should mention project ID
      }
    });

    it('should preserve metadata in project-specific specs', async () => {
      const specContent = `---
specId: SPEC-006
title: Test Spec
version: 2.0.0
status: review
created: 2025-11-10
authors:
  - Author 1
priority: P1
estimatedEffort: 40 hours
---

# Test Spec

## User Stories

### US-001: React component

**Description**: Build React component

**Acceptance Criteria**:
- Component works

**Priority**: P1
**Story Points**: 5
`;

      const specPath = path.join(TEMP_DIR, 'metadata-spec.md');
      await fs.writeFile(specPath, specContent, 'utf-8');

      const outputMap = await splitSpecIntoProjects(specPath, TEMP_DIR);

      for (const [projectId, outputPath] of outputMap.entries()) {
        const content = await fs.readFile(outputPath, 'utf-8');

        // Should preserve key metadata
        expect(content).toContain('version: 2.0.0');
        expect(content).toContain('status: review');
        expect(content).toContain('Author 1');
      }
    });

    it('should handle specs with no user stories', async () => {
      const specContent = `---
specId: SPEC-007
title: No Stories Spec
version: 1.0.0
status: draft
created: 2025-11-10
authors:
  - Author 1
priority: P1
---

# No Stories Spec

## Executive Summary

Spec with no user stories.
`;

      const specPath = path.join(TEMP_DIR, 'no-stories.md');
      await fs.writeFile(specPath, specContent, 'utf-8');

      const outputMap = await splitSpecIntoProjects(specPath, TEMP_DIR);

      // Should handle gracefully (may create DEFAULT project or return empty map)
      expect(outputMap).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle YAML arrays in frontmatter', async () => {
      const specContent = `---
specId: SPEC-008
title: Test Spec
version: 1.0.0
status: draft
created: 2025-11-10
authors:
  - Author 1
  - Author 2
  - Author 3
jiraProjects:
  - PROJ-A
  - PROJ-B
priority: P1
---

# Test Spec

## Executive Summary

Test.
`;

      const specPath = path.join(TEMP_DIR, 'yaml-arrays.md');
      await fs.writeFile(specPath, specContent, 'utf-8');

      const parsed = await parseSpecFile(specPath);

      expect(Array.isArray(parsed.metadata.authors)).toBe(true);
      expect(parsed.metadata.authors.length).toBe(3);
      expect(parsed.metadata.jiraProjects).toEqual(['PROJ-A', 'PROJ-B']);
    });

    it('should handle special characters in frontmatter', async () => {
      const specContent = `---
specId: SPEC-009
title: "Test: OAuth2.0 & JWT Authentication"
version: 1.0.0
status: draft
created: 2025-11-10
authors:
  - "Author (Senior)"
priority: P1
---

# Test Spec

## Executive Summary

OAuth 2.0 test.
`;

      const specPath = path.join(TEMP_DIR, 'special-chars.md');
      await fs.writeFile(specPath, specContent, 'utf-8');

      const parsed = await parseSpecFile(specPath);

      expect(parsed.metadata.title).toBe('Test: OAuth2.0 & JWT Authentication');
      expect(parsed.metadata.authors[0]).toBe('Author (Senior)');
    });

    it('should handle very large spec files', async () => {
      const largeContent = `---
specId: SPEC-010
title: Large Spec
version: 1.0.0
status: draft
created: 2025-11-10
authors:
  - Author 1
priority: P1
---

# Large Spec

## Executive Summary

${'This is a large spec. '.repeat(1000)}
`;

      const specPath = path.join(TEMP_DIR, 'large-spec.md');
      await fs.writeFile(specPath, largeContent, 'utf-8');

      const parsed = await parseSpecFile(specPath);

      expect(parsed.executiveSummary).toBeDefined();
      expect(parsed.executiveSummary.length).toBeGreaterThan(1000);
    });
  });
});
