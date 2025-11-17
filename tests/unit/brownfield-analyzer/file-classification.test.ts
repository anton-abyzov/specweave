import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests: BrownfieldAnalyzer File Classification
 *
 * Tests file classification logic and type determination.
 * Coverage Target: 95%
 */

import { BrownfieldAnalyzer } from '../../../src/core/brownfield/analyzer.js';
import { withTempDir } from '../../utils/temp-dir.js';
import fs from 'fs-extra';
import path from 'path';

describe('BrownfieldAnalyzer - File Classification', () => {
  let analyzer: BrownfieldAnalyzer;

  beforeEach(() => {
    analyzer = new BrownfieldAnalyzer();
  });

  describe('classifyFile() - Type Classification', () => {
    it('should classify file as spec when spec keywords dominate', async () => {
      await withTempDir(async (tmpDir) => {
        const filePath = path.join(tmpDir, 'user-auth.md');
        await fs.writeFile(filePath, `
# User Authentication Feature

## User Story
As a user, I want to log in with email and password.

## Acceptance Criteria
- AC-1: Valid credentials allow login
- AC-2: Invalid credentials show error
`);

        const result = await (analyzer as any).classifyFile(filePath, tmpDir);

        expect(result.type).toBe('spec');
        expect(result.confidence).toBeGreaterThan(0.3);
        expect(result.keywords).toContain('user story');
        expect(result.keywords).toContain('acceptance criteria');
        expect(result.reasons.length).toBeGreaterThan(0);
      });
    });

    it('should classify file as module when module keywords dominate', async () => {
      await withTempDir(async (tmpDir) => {
        const filePath = path.join(tmpDir, 'auth-module.md');
        await fs.writeFile(filePath, `
# Authentication Module

Component architecture for authentication service.

## API Interface
- POST /api/auth/login
- POST /api/auth/logout

## Design
Module handles authentication with JWT tokens.
`);

        const result = await (analyzer as any).classifyFile(filePath, tmpDir);

        expect(result.type).toBe('module');
        expect(result.confidence).toBeGreaterThan(0.3);
        expect(result.keywords).toContain('module');
        expect(result.keywords).toContain('api');
        expect(result.keywords).toContain('design');
      });
    });

    it('should classify file as team when team keywords dominate', async () => {
      await withTempDir(async (tmpDir) => {
        const filePath = path.join(tmpDir, 'onboarding.md');
        await fs.writeFile(filePath, `
# Team Onboarding Guide

## Getting Started
Setup your development environment.

## Conventions
Follow our coding standards and style guide.

## Workflow
Our PR process and code review guidelines.
`);

        const result = await (analyzer as any).classifyFile(filePath, tmpDir);

        expect(result.type).toBe('team');
        expect(result.confidence).toBeGreaterThan(0.3);
        expect(result.keywords).toContain('onboarding');
        expect(result.keywords).toContain('getting started');
        expect(result.keywords).toContain('convention');
      });
    });

    it('should classify file as legacy when no keywords above threshold', async () => {
      await withTempDir(async (tmpDir) => {
        const filePath = path.join(tmpDir, 'meeting-notes.md');
        await fs.writeFile(filePath, `
# Meeting Notes - 2025-11-10

Discussed project timeline and budget.
`);

        const result = await (analyzer as any).classifyFile(filePath, tmpDir);

        expect(result.type).toBe('legacy');
        expect(result.confidence).toBe(0);
        expect(result.keywords).toEqual([]);
        expect(result.reasons).toContain('No strong match for spec, module, or team keywords');
      });
    });
  });

  describe('classifyFile() - Frontmatter Parsing', () => {
    it('should parse YAML frontmatter and include in classification', async () => {
      await withTempDir(async (tmpDir) => {
        const filePath = path.join(tmpDir, 'spec-with-frontmatter.md');
        await fs.writeFile(filePath, `---
type: feature
tags: [user-story, acceptance-criteria]
---

# Feature Specification

User story content here.
`);

        const result = await (analyzer as any).classifyFile(filePath, tmpDir);

        // Frontmatter contains "user-story" and "acceptance-criteria"
        // Combined with markdown content containing "feature", "specification", "user story"
        expect(result.type).toBe('spec');
        expect(result.confidence).toBeGreaterThan(0.3);
      });
    });

    it('should handle files without frontmatter', async () => {
      await withTempDir(async (tmpDir) => {
        const filePath = path.join(tmpDir, 'no-frontmatter.md');
        await fs.writeFile(filePath, `
# Module Documentation

Component architecture with design patterns.
API interface for the service module.
Technical design and implementation details.
`);

        const result = await (analyzer as any).classifyFile(filePath, tmpDir);

        // Should still classify based on content (module keywords)
        expect(result.type).toBe('module');
      });
    });
  });

  describe('classifyFile() - Path Handling', () => {
    it('should calculate correct relative path', async () => {
      await withTempDir(async (tmpDir) => {
        const subDir = path.join(tmpDir, 'subfolder');
        await fs.ensureDir(subDir);
        const filePath = path.join(subDir, 'test.md');
        await fs.writeFile(filePath, 'user story content');

        const result = await (analyzer as any).classifyFile(filePath, tmpDir);

        expect(result.relativePath).toBe(path.join('subfolder', 'test.md'));
        expect(result.path).toBe(filePath);
      });
    });
  });

  describe('classifyFile() - Confidence Threshold', () => {
    it('should not classify as spec/module/team if below 0.3 threshold', async () => {
      await withTempDir(async (tmpDir) => {
        const filePath = path.join(tmpDir, 'low-confidence.md');
        // Only one weak keyword
        await fs.writeFile(filePath, 'This document mentions feature once.');

        const result = await (analyzer as any).classifyFile(filePath, tmpDir);

        // Single keyword not enough to exceed 0.3 threshold
        // Should be classified as legacy
        expect(result.type).toBe('legacy');
        expect(result.confidence).toBe(0);
      });
    });
  });
});
