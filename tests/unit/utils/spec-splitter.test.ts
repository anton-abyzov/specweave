import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  normalizeMetadata,
  parseSpecFile,
  splitSpecIntoProjects,
  createMultiProjectFolderStructure,
} from '../../../src/utils/spec-splitter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'spec-splitter-test-'));
}

function cleanDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Minimal valid spec content with frontmatter, sections, and user stories */
function validSpecContent(overrides: { metadata?: string; body?: string } = {}): string {
  const metadata =
    overrides.metadata ??
    `spec_id: SPEC-0042
title: "Test Feature"
version: "1.0"
status: draft
created: "2026-01-01"
last_updated: "2026-02-01"
authors:
  - Alice
  - Bob
priority: high
estimated_effort: "2 weeks"
target_release: "v3.0"
jira_sync: true
jira_projects: ["FE", "BE"]`;

  const body =
    overrides.body ??
    `
## Executive Summary

This is the executive summary.

## Problem Statement

This is the problem statement.

## User Stories

### US-001: Build Login Page

**As a** user
**I want** to log in
**So that** I can access the app

**AC-US1-01**: User sees a login form
- field: email
- field: password

#### Technical Context

React + Next.js login page

### US-002: Create Auth API

**As a** developer
**I want** an auth endpoint
**So that** the frontend can authenticate

**AC-US2-01**: POST /auth returns JWT

## Functional Requirements

Must support OAuth2.

## Non-Functional Requirements

99.9% uptime target.

## Success Metrics

Measure DAU.

## Technical Architecture

Microservices on K8s.

## Test Strategy

BDD + E2E.

## Risk Analysis

Third-party auth outage.

## Future Roadmap

Add SSO.

## Appendices

None.`;

  return `---\n${metadata}\n---\n${body}`;
}

// ---------------------------------------------------------------------------
// normalizeMetadata
// ---------------------------------------------------------------------------

describe('spec-splitter', () => {
  describe('normalizeMetadata', () => {
    it('should prefer camelCase specId over snake_case', () => {
      const result = normalizeMetadata({
        specId: 'CAMEL',
        spec_id: 'SNAKE',
        title: 't',
        version: '1',
        status: 's',
        created: 'c',
        authors: [],
        priority: 'p',
      });
      expect(result.specId).toBe('CAMEL');
    });

    it('should fall back to snake_case spec_id when camelCase is missing', () => {
      const result = normalizeMetadata({
        spec_id: 'SNAKE',
        title: 't',
        version: '1',
        status: 's',
        created: 'c',
        authors: [],
        priority: 'p',
      });
      expect(result.specId).toBe('SNAKE');
    });

    it('should prefer camelCase lastUpdated', () => {
      const result = normalizeMetadata({
        lastUpdated: '2026-02-01',
        last_updated: '2025-01-01',
        title: 't',
        version: '1',
        status: 's',
        created: 'c',
        authors: [],
        priority: 'p',
      });
      expect(result.lastUpdated).toBe('2026-02-01');
    });

    it('should fall back to snake_case last_updated', () => {
      const result = normalizeMetadata({
        last_updated: '2025-01-01',
        title: 't',
        version: '1',
        status: 's',
        created: 'c',
        authors: [],
        priority: 'p',
      });
      expect(result.lastUpdated).toBe('2025-01-01');
    });

    it('should prefer camelCase estimatedEffort', () => {
      const result = normalizeMetadata({
        estimatedEffort: '3d',
        estimated_effort: '5d',
        title: 't',
        version: '1',
        status: 's',
        created: 'c',
        authors: [],
        priority: 'p',
      });
      expect(result.estimatedEffort).toBe('3d');
    });

    it('should fall back to snake_case estimated_effort', () => {
      const result = normalizeMetadata({
        estimated_effort: '5d',
        title: 't',
        version: '1',
        status: 's',
        created: 'c',
        authors: [],
        priority: 'p',
      });
      expect(result.estimatedEffort).toBe('5d');
    });

    it('should prefer camelCase targetRelease', () => {
      const result = normalizeMetadata({
        targetRelease: 'v2',
        target_release: 'v1',
        title: 't',
        version: '1',
        status: 's',
        created: 'c',
        authors: [],
        priority: 'p',
      });
      expect(result.targetRelease).toBe('v2');
    });

    it('should fall back to snake_case target_release', () => {
      const result = normalizeMetadata({
        target_release: 'v1',
        title: 't',
        version: '1',
        status: 's',
        created: 'c',
        authors: [],
        priority: 'p',
      });
      expect(result.targetRelease).toBe('v1');
    });

    it('should prefer camelCase jiraSync (explicit false)', () => {
      const result = normalizeMetadata({
        jiraSync: false,
        jira_sync: true,
        title: 't',
        version: '1',
        status: 's',
        created: 'c',
        authors: [],
        priority: 'p',
      });
      expect(result.jiraSync).toBe(false);
    });

    it('should fall back to snake_case jira_sync when camelCase is undefined', () => {
      const result = normalizeMetadata({
        jira_sync: true,
        title: 't',
        version: '1',
        status: 's',
        created: 'c',
        authors: [],
        priority: 'p',
      });
      expect(result.jiraSync).toBe(true);
    });

    it('should prefer camelCase jiraProjects', () => {
      const result = normalizeMetadata({
        jiraProjects: ['FE'],
        jira_projects: ['BE'],
        title: 't',
        version: '1',
        status: 's',
        created: 'c',
        authors: [],
        priority: 'p',
      });
      expect(result.jiraProjects).toEqual(['FE']);
    });

    it('should handle all fields being undefined gracefully', () => {
      const result = normalizeMetadata({
        title: 't',
        version: '1',
        status: 's',
        created: 'c',
        authors: [],
        priority: 'p',
      });
      expect(result.specId).toBeUndefined();
      expect(result.lastUpdated).toBeUndefined();
      expect(result.estimatedEffort).toBeUndefined();
      expect(result.targetRelease).toBeUndefined();
      expect(result.jiraSync).toBeUndefined();
      expect(result.jiraProjects).toBeUndefined();
    });

    it('should preserve non-normalized fields unchanged', () => {
      const result = normalizeMetadata({
        title: 'My Feature',
        version: '2.5',
        status: 'approved',
        created: '2026-01-15',
        authors: ['Charlie'],
        priority: 'critical',
      });
      expect(result.title).toBe('My Feature');
      expect(result.version).toBe('2.5');
      expect(result.status).toBe('approved');
      expect(result.authors).toEqual(['Charlie']);
    });
  });

  // ---------------------------------------------------------------------------
  // parseSpecFile
  // ---------------------------------------------------------------------------

  describe('parseSpecFile', () => {
    let dir: string;

    beforeEach(() => {
      dir = tmpDir();
    });

    afterEach(() => {
      cleanDir(dir);
    });

    it('should parse a valid spec file with all sections', async () => {
      const specPath = path.join(dir, 'spec.md');
      fs.writeFileSync(specPath, validSpecContent(), 'utf-8');

      const parsed = await parseSpecFile(specPath);

      expect(parsed.metadata.title).toBe('Test Feature');
      expect(parsed.metadata.version).toBe('1.0');
      expect(parsed.metadata.status).toBe('draft');
      expect(parsed.metadata.authors).toEqual(['Alice', 'Bob']);
      expect(parsed.executiveSummary).toContain('executive summary');
      expect(parsed.problemStatement).toContain('problem statement');
      expect(parsed.functionalRequirements).toContain('OAuth2');
      expect(parsed.nonFunctionalRequirements).toContain('99.9%');
      expect(parsed.successMetrics).toContain('DAU');
      expect(parsed.technicalArchitecture).toContain('Microservices');
      expect(parsed.testStrategy).toContain('BDD');
      expect(parsed.riskAnalysis).toContain('outage');
      expect(parsed.futureRoadmap).toContain('SSO');
      expect(parsed.appendices).toContain('None');
    });

    it('should normalize metadata (snake_case to camelCase)', async () => {
      const specPath = path.join(dir, 'spec.md');
      fs.writeFileSync(specPath, validSpecContent(), 'utf-8');

      const parsed = await parseSpecFile(specPath);

      // spec_id in YAML gets normalized to specId
      expect(parsed.metadata.specId).toBe('SPEC-0042');
      expect(parsed.metadata.lastUpdated).toBe('2026-02-01');
      expect(parsed.metadata.estimatedEffort).toBe('2 weeks');
      expect(parsed.metadata.targetRelease).toBe('v3.0');
      expect(parsed.metadata.jiraSync).toBe(true);
      expect(parsed.metadata.jiraProjects).toEqual(['FE', 'BE']);
    });

    it('should parse user stories with IDs and titles', async () => {
      const specPath = path.join(dir, 'spec.md');
      fs.writeFileSync(specPath, validSpecContent(), 'utf-8');

      const parsed = await parseSpecFile(specPath);

      expect(parsed.userStories).toHaveLength(2);
      expect(parsed.userStories[0].id).toBe('US-001');
      expect(parsed.userStories[0].title).toBe('Build Login Page');
      expect(parsed.userStories[1].id).toBe('US-002');
      expect(parsed.userStories[1].title).toBe('Create Auth API');
    });

    it('should extract user story descriptions', async () => {
      const specPath = path.join(dir, 'spec.md');
      fs.writeFileSync(specPath, validSpecContent(), 'utf-8');

      const parsed = await parseSpecFile(specPath);

      expect(parsed.userStories[0].description).toContain('As a');
      expect(parsed.userStories[0].description).toContain('I want');
      expect(parsed.userStories[0].description).toContain('So that');
    });

    it('should extract technical context when present', async () => {
      const specPath = path.join(dir, 'spec.md');
      fs.writeFileSync(specPath, validSpecContent(), 'utf-8');

      const parsed = await parseSpecFile(specPath);

      expect(parsed.userStories[0].technicalContext).toContain('React');
    });

    it('should throw when frontmatter is missing', async () => {
      const specPath = path.join(dir, 'no-frontmatter.md');
      fs.writeFileSync(specPath, '# No frontmatter here\n\nJust content.', 'utf-8');

      await expect(parseSpecFile(specPath)).rejects.toThrow('No frontmatter found');
    });

    it('should handle spec with empty sections', async () => {
      const content = validSpecContent({
        body: `
## Executive Summary

## User Stories

## Functional Requirements
`,
      });
      const specPath = path.join(dir, 'empty-sections.md');
      fs.writeFileSync(specPath, content, 'utf-8');

      const parsed = await parseSpecFile(specPath);

      expect(parsed.executiveSummary).toBe('');
      expect(parsed.userStories).toHaveLength(0);
      expect(parsed.problemStatement).toBe('');
    });

    it('should handle spec with no user stories section', async () => {
      const content = validSpecContent({
        body: `
## Executive Summary

Summary text here.

## Functional Requirements

Some requirements.
`,
      });
      const specPath = path.join(dir, 'no-stories.md');
      fs.writeFileSync(specPath, content, 'utf-8');

      const parsed = await parseSpecFile(specPath);

      expect(parsed.userStories).toHaveLength(0);
      expect(parsed.executiveSummary).toContain('Summary text');
    });

    it('should parse boolean values in frontmatter correctly', async () => {
      const content = validSpecContent({
        metadata: `title: "Bool Test"
version: "1"
status: draft
created: "2026-01-01"
authors:
  - Dev
priority: low
jira_sync: false`,
      });
      const specPath = path.join(dir, 'bool.md');
      fs.writeFileSync(specPath, content, 'utf-8');

      const parsed = await parseSpecFile(specPath);

      expect(parsed.metadata.jiraSync).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // createMultiProjectFolderStructure
  // ---------------------------------------------------------------------------

  describe('createMultiProjectFolderStructure', () => {
    let dir: string;

    beforeEach(() => {
      dir = tmpDir();
    });

    afterEach(() => {
      cleanDir(dir);
    });

    it('should create a directory for each project ID', async () => {
      const specsDir = path.join(dir, 'specs');
      await createMultiProjectFolderStructure(specsDir, ['FE', 'BE', 'MOBILE']);

      expect(fs.existsSync(path.join(specsDir, 'FE'))).toBe(true);
      expect(fs.existsSync(path.join(specsDir, 'BE'))).toBe(true);
      expect(fs.existsSync(path.join(specsDir, 'MOBILE'))).toBe(true);
    });

    it('should create a README.md in each project directory', async () => {
      const specsDir = path.join(dir, 'specs');
      await createMultiProjectFolderStructure(specsDir, ['FE', 'BE']);

      const feReadme = path.join(specsDir, 'FE', 'README.md');
      const beReadme = path.join(specsDir, 'BE', 'README.md');

      expect(fs.existsSync(feReadme)).toBe(true);
      expect(fs.existsSync(beReadme)).toBe(true);
    });

    it('should include the project ID in README content', async () => {
      const specsDir = path.join(dir, 'specs');
      await createMultiProjectFolderStructure(specsDir, ['MOBILE']);

      const readmeContent = fs.readFileSync(
        path.join(specsDir, 'MOBILE', 'README.md'),
        'utf-8',
      );

      expect(readmeContent).toContain('# MOBILE Specifications');
      expect(readmeContent).toContain('**MOBILE** project');
    });

    it('should handle an empty project list without error', async () => {
      const specsDir = path.join(dir, 'specs');
      await createMultiProjectFolderStructure(specsDir, []);

      expect(fs.existsSync(specsDir)).toBe(true);
      // No subdirectories created
      const contents = fs.readdirSync(specsDir);
      expect(contents).toHaveLength(0);
    });

    it('should create the base specs directory if it does not exist', async () => {
      const specsDir = path.join(dir, 'deep', 'nested', 'specs');
      expect(fs.existsSync(specsDir)).toBe(false);

      await createMultiProjectFolderStructure(specsDir, ['API']);

      expect(fs.existsSync(specsDir)).toBe(true);
      expect(fs.existsSync(path.join(specsDir, 'API', 'README.md'))).toBe(true);
    });

    it('should include JIRA and GitHub sync references in README', async () => {
      const specsDir = path.join(dir, 'specs');
      await createMultiProjectFolderStructure(specsDir, ['BE']);

      const readmeContent = fs.readFileSync(
        path.join(specsDir, 'BE', 'README.md'),
        'utf-8',
      );

      expect(readmeContent).toContain('JIRA');
      expect(readmeContent).toContain('GitHub');
      expect(readmeContent).toContain('Project BE');
    });
  });
});
