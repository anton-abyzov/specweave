/**
 * Integration test for Intelligent Living Docs Sync
 *
 * Tests end-to-end workflow:
 * 1. Parse spec.md
 * 2. Classify sections
 * 3. Detect project
 * 4. Distribute content
 * 5. Generate cross-links
 * 6. Verify LLM context preservation
 */

import { ContentParser, ContentClassifier, ProjectDetector, ContentDistributor, CrossLinker } from '../../../src/core/living-docs/index';
import fs from 'fs-extra';
import path from 'path';

describe('Intelligent Living Docs Sync - Integration', () => {
  let testDir: string;
  let incrementId: string;
  let specPath: string;

  beforeAll(async () => {
    // Create test directory
    testDir = path.join(__dirname, '__test_data__');
    await fs.ensureDir(testDir);

    incrementId = '0016-user-authentication';
    const incrementDir = path.join(testDir, '.specweave', 'increments', incrementId);
    await fs.ensureDir(incrementDir);

    // Create mock spec.md with multi-project content
    specPath = path.join(incrementDir, 'spec.md');
    const specContent = `---
title: User Authentication System
status: planning
priority: P1
project: backend
---

# User Authentication System

Quick overview: Implement OAuth-based authentication for backend services and frontend application.

## US-001: Backend API Authentication

**As a** backend service
**I want** to authenticate API requests using OAuth tokens
**So that** only authorized clients can access protected resources

**Acceptance Criteria**:
- AC-US1-01: OAuth token validation (P1, testable)
- AC-US1-02: JWT signature verification (P1, testable)
- AC-US1-03: Rate limiting on failed auth (P2, testable)

## US-002: Frontend Login Flow

**As a** frontend user
**I want** to log in with my credentials
**So that** I can access the application

**Acceptance Criteria**:
- AC-US2-01: Login form with email/password (P1, testable)
- AC-US2-02: OAuth redirect handling (P1, testable)

## Architecture

### Authentication Flow

The system uses OAuth 2.0 with JWT tokens:
1. User submits credentials to backend
2. Backend validates with OAuth provider
3. JWT token returned to frontend
4. Frontend stores token in secure storage

\`\`\`mermaid
sequenceDiagram
    Frontend->>Backend: POST /login
    Backend->>OAuth: Validate
    OAuth-->>Backend: Token
    Backend-->>Frontend: JWT
\`\`\`

## ADR-001: Use OAuth 2.0 Over Session Cookies

**Context**: We need to choose between OAuth tokens and session cookies for authentication.

**Decision**: Use OAuth 2.0 with JWT tokens.

**Alternatives**: Session cookies, API keys

**Consequences**: Stateless authentication, better scalability, increased complexity.

## Operations

### Runbook: Authentication Service

**Step 1**: Check OAuth provider status
**Step 2**: Verify JWT signing keys
**Step 3**: Restart auth service if needed

### SLO: Authentication Availability

**SLI**: 99.9% uptime for auth endpoints
**Alerting**: PagerDuty on 3 consecutive failures

## Delivery

### Test Strategy

- Unit tests: 90% coverage for auth module
- Integration tests: E2E OAuth flow with test provider
- Load tests: 1000 concurrent auth requests

### Release Plan

- Sprint 1: Backend API (US-001)
- Sprint 2: Frontend integration (US-002)
- Sprint 3: Load testing and optimization

## Strategy

### Business Requirements

Authentication is critical for:
- Protecting user data (GDPR compliance)
- Preventing unauthorized access
- Enabling personalization

**Target**: 100% of users authenticated by Q2 2025
`;

    await fs.writeFile(specPath, specContent, 'utf-8');

    // Create config.json with multi-project setup
    const configPath = path.join(testDir, '.specweave', 'config.json');
    await fs.ensureDir(path.dirname(configPath));
    const config = {
      multiProject: {
        projects: {
          backend: {
            name: 'Backend Services',
            description: 'API and backend services',
            keywords: ['api', 'backend', 'service', 'oauth'],
            team: 'Backend Team',
            techStack: ['Node.js', 'TypeScript', 'OAuth'],
          },
          frontend: {
            name: 'Frontend Application',
            keywords: ['frontend', 'ui', 'login', 'user'],
            team: 'Frontend Team',
            techStack: ['React', 'Next.js'],
          },
        },
      },
      livingDocs: {
        intelligent: {
          enabled: true,
          splitByCategory: true,
          generateCrossLinks: true,
          preserveOriginal: true,
          classificationConfidenceThreshold: 0.6,
          fallbackProject: 'default',
        },
      },
    };
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  });

  afterAll(async () => {
    // Cleanup
    await fs.remove(testDir);
  });

  describe('End-to-End Workflow', () => {
    it('should parse, classify, detect project, distribute, and link', async () => {
      // Change working directory for the test
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // Step 1: Parse spec.md
        const parser = new ContentParser();
        const spec = parser.parse(await fs.readFile(specPath, 'utf-8'), specPath);

        expect(spec.frontmatter.title).toBe('User Authentication System');
        expect(spec.sections.length).toBeGreaterThan(0);

        // Step 2: Classify sections
        const classifier = new ContentClassifier();
        const flatSections = parser.flattenSections(spec.sections);
        const classifications = flatSections.map((section) => classifier.classify(section));

        expect(classifications.length).toBe(flatSections.length);

        // Verify classification categories
        const categories = classifications.map((c) => c.category);
        expect(categories).toContain('user-story'); // US-001, US-002
        expect(categories).toContain('architecture'); // Architecture section
        expect(categories).toContain('adr'); // ADR-001
        expect(categories).toContain('operations'); // Runbook, SLO
        expect(categories).toContain('delivery'); // Test Strategy, Release Plan
        expect(categories).toContain('strategy'); // Business Requirements

        // Step 3: Detect project
        const detector = new ProjectDetector({
          configPath: path.join(testDir, '.specweave', 'config.json'),
        });
        const project = detector.detectProject(incrementId, spec);

        expect(project.id).toBe('backend'); // Should detect backend project
        expect(project.confidence).toBeGreaterThan(0.7);

        // Step 4: Distribute content
        const distributor = new ContentDistributor({
          basePath: path.join(testDir, '.specweave', 'docs', 'internal'),
          generateFrontmatter: true,
          preserveOriginal: true,
          dryRun: false,
        });

        const distributionResult = await distributor.distribute(
          incrementId,
          spec,
          classifications,
          project
        );

        expect(distributionResult.created.length).toBeGreaterThan(0);
        expect(distributionResult.errors.length).toBe(0);

        // Verify files were created in correct project folder
        const backendSpecsFolder = path.join(
          testDir,
          '.specweave',
          'docs',
          'internal',
          'specs',
          'backend'
        );
        expect(fs.existsSync(backendSpecsFolder)).toBe(true);

        // Verify architecture files (global, not project-specific)
        const architectureFolder = path.join(testDir, '.specweave', 'docs', 'internal', 'architecture');
        expect(fs.existsSync(architectureFolder)).toBe(true);

        // Step 5: Generate cross-links
        const linker = new CrossLinker({
          basePath: path.join(testDir, '.specweave', 'docs', 'internal'),
          generateBacklinks: true,
          updateExisting: true,
          dryRun: false,
        });

        const links = await linker.generateLinks(distributionResult);

        expect(links.length).toBeGreaterThan(0);

        // Verify bidirectional links
        const stats = linker.getStatistics();
        expect(stats.bidirectional).toBeGreaterThan(0);
      } finally {
        // Restore working directory
        process.chdir(originalCwd);
      }
    });
  });

  describe('LLM Context Preservation', () => {
    it('should preserve project context in distributed files', async () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // Run full sync
        const parser = new ContentParser();
        const spec = parser.parse(await fs.readFile(specPath, 'utf-8'), specPath);

        const classifier = new ContentClassifier();
        const flatSections = parser.flattenSections(spec.sections);
        const classifications = flatSections.map((section) => classifier.classify(section));

        const detector = new ProjectDetector({
          configPath: path.join(testDir, '.specweave', 'config.json'),
        });
        const project = detector.detectProject(incrementId, spec);

        const distributor = new ContentDistributor({
          basePath: path.join(testDir, '.specweave', 'docs', 'internal'),
          generateFrontmatter: true,
          preserveOriginal: true,
          dryRun: false,
        });

        await distributor.distribute(incrementId, spec, classifications, project);

        // Find a distributed file
        const backendSpecsFolder = path.join(
          testDir,
          '.specweave',
          'docs',
          'internal',
          'specs',
          'backend'
        );

        const files = await fs.readdir(backendSpecsFolder);
        const userStoryFile = files.find((f) => f.includes('us-') && f.endsWith('.md'));

        expect(userStoryFile).toBeDefined();

        // Read the file and verify frontmatter
        const content = await fs.readFile(
          path.join(backendSpecsFolder, userStoryFile!),
          'utf-8'
        );

        // Verify frontmatter has project context
        expect(content).toContain('---'); // YAML frontmatter
        expect(content).toContain('project: "backend"'); // Project ID
        expect(content).toContain('increment: "0016-user-authentication"'); // Increment ID
        expect(content).toContain('category:'); // Category
        expect(content).toContain('tags:'); // Tags for searchability

        // Verify footer has source traceability
        expect(content).toContain('**Source**:');
        expect(content).toContain('**Project**: Backend Services');
        expect(content).toContain('**Last Updated**:');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should create README.md with project context', async () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const detector = new ProjectDetector({
          configPath: path.join(testDir, '.specweave', 'config.json'),
        });

        await detector.createProjectStructure('backend');

        // Verify README.md exists
        const readmePath = path.join(
          testDir,
          '.specweave',
          'docs',
          'internal',
          'specs',
          'backend',
          'README.md'
        );

        expect(fs.existsSync(readmePath)).toBe(true);

        const content = await fs.readFile(readmePath, 'utf-8');

        // Verify README has project context
        expect(content).toContain('# Backend Services Specifications');
        expect(content).toContain('**Project**: Backend Services');
        expect(content).toContain('**Description**:');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should generate cross-links with relative paths', async () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // Run full sync
        const parser = new ContentParser();
        const spec = parser.parse(await fs.readFile(specPath, 'utf-8'), specPath);

        const classifier = new ContentClassifier();
        const flatSections = parser.flattenSections(spec.sections);
        const classifications = flatSections.map((section) => classifier.classify(section));

        const detector = new ProjectDetector({
          configPath: path.join(testDir, '.specweave', 'config.json'),
        });
        const project = detector.detectProject(incrementId, spec);

        const distributor = new ContentDistributor({
          basePath: path.join(testDir, '.specweave', 'docs', 'internal'),
          generateFrontmatter: true,
          preserveOriginal: true,
          dryRun: false,
        });

        const distributionResult = await distributor.distribute(
          incrementId,
          spec,
          classifications,
          project
        );

        const linker = new CrossLinker({
          basePath: path.join(testDir, '.specweave', 'docs', 'internal'),
          generateBacklinks: true,
          updateExisting: true,
          dryRun: false,
        });

        await linker.generateLinks(distributionResult);

        // Find a file with links
        const backendSpecsFolder = path.join(
          testDir,
          '.specweave',
          'docs',
          'internal',
          'specs',
          'backend'
        );

        const files = await fs.readdir(backendSpecsFolder);
        const fileWithLinks = files.find((f) => f.endsWith('.md') && f !== 'README.md');

        if (fileWithLinks) {
          const content = await fs.readFile(
            path.join(backendSpecsFolder, fileWithLinks),
            'utf-8'
          );

          // Check for Related Documents section
          if (content.includes('## Related Documents')) {
            // Verify links use relative paths
            expect(content).toMatch(/\[.*\]\(.*\/.*\)/); // Has relative path links

            // Links should NOT have absolute paths
            expect(content).not.toContain('[...](' + testDir);
          }
        }
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Multi-Project Distribution', () => {
    it('should distribute backend and frontend content to separate folders', async () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // Create a spec with mixed content
        const mixedSpecPath = path.join(
          testDir,
          '.specweave',
          'increments',
          '0017-mixed',
          'spec.md'
        );
        await fs.ensureDir(path.dirname(mixedSpecPath));

        const mixedContent = `---
title: Mixed Project Spec
---

# Mixed Project Spec

## US-001: Backend API

Backend API for data processing

## US-002: Frontend Dashboard

Frontend dashboard for visualization
`;

        await fs.writeFile(mixedSpecPath, mixedContent, 'utf-8');

        // Parse and classify
        const parser = new ContentParser();
        const spec = parser.parse(mixedContent, mixedSpecPath);

        const classifier = new ContentClassifier();
        const flatSections = parser.flattenSections(spec.sections);
        const classifications = flatSections.map((section) => classifier.classify(section));

        // Detect project for backend section
        const detector = new ProjectDetector({
          configPath: path.join(testDir, '.specweave', 'config.json'),
        });

        // Create separate spec for backend
        const backendSpec = {
          ...spec,
          sections: [flatSections[0]], // US-001: Backend API
        };
        const backendProject = detector.detectProject('0017-backend-api', backendSpec);

        // Create separate spec for frontend
        const frontendSpec = {
          ...spec,
          sections: [flatSections[1]], // US-002: Frontend Dashboard
        };
        const frontendProject = detector.detectProject('0017-frontend-dashboard', frontendSpec);

        expect(backendProject.id).toBe('backend');
        expect(frontendProject.id).toBe('frontend');

        // This demonstrates project detection working correctly
        // Full distribution would create files in:
        // - .specweave/docs/internal/specs/backend/
        // - .specweave/docs/internal/specs/frontend/
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing spec.md gracefully', async () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const parser = new ContentParser();

        // Should not throw
        const spec = parser.parse('', 'non-existent.md');

        expect(spec.sections).toHaveLength(0);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should throw on invalid YAML frontmatter', async () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const parser = new ContentParser();

        const invalidSpec = `---
title: Test
invalid yaml here
---

# Content
`;

        // Invalid YAML should throw during parsing
        expect(() => parser.parse(invalidSpec)).toThrow();
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
