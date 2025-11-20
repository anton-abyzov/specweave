/**
 * Integration Tests: Spec Content Synchronization
 *
 * Tests full sync (all permissions enabled) between SpecWeave specs and external tools:
 * - CONTENT (title, description, user stories): SpecWeave → External Tool (we update)
 * - STATUS (state, workflow): External Tool → SpecWeave (we read)
 *
 * Covers:
 * - GitHub Issues
 * - JIRA Epics
 * - Azure DevOps Features
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import {
  parseSpecContent,
  detectContentChanges,
  buildExternalDescription,
  hasExternalLink,
  updateSpecWithExternalLink,
  type SpecUserStory,
  type SpecAcceptanceCriterion,
  type SpecContent,
} from '../../../../dist/src/core/spec-content-sync.js';
import type { SpecIdentifier } from '../../../../dist/src/core/types/spec-identifier.js';

/**
 * Helper to create complete SpecIdentifier mock
 */
function createSpecIdentifier(
  value: string,
  project: string = 'default',
  source: 'sequential' | 'title-slug' | 'external-jira' | 'external-ado' | 'external-github' | 'custom' | 'hybrid-prefix' = 'sequential'
): SpecIdentifier {
  const projectCode = project === 'backend' ? 'BE' : project === 'frontend' ? 'FE' : 'DF';
  return {
    full: `${project}/${value}`,
    display: value,
    source,
    project,
    stable: true,
    compact: `${projectCode}-${value}`,
  };
}

/**
 * Helper to create complete SpecContent mock
 */
function createSpecContent(
  id: string,
  title: string,
  description: string,
  userStories: SpecUserStory[] = [],
  project: string = 'default'
): SpecContent {
  return {
    identifier: createSpecIdentifier(id, project),
    id,
    title,
    description,
    userStories,
    metadata: {},
    project,
  };
}

describe('Spec Content Sync - Core', () => {
  const fixturesDir = path.join(__dirname, '../../fixtures/specs');
  let tempDir: string;

  beforeEach(async () => {
    // ✅ SAFE: Use OS temp directory with unique timestamp
    tempDir = path.join(process.env.TMPDIR || '/tmp', `specweave-test-spec-content-sync-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('parseSpecContent', () => {
    it('should parse spec with user stories and acceptance criteria', async () => {
      const specPath = path.join(fixturesDir, 'spec-001-user-auth.md');
      const spec = await parseSpecContent(specPath);

      expect(spec).not.toBeNull();
      expect(spec!.identifier).toBeDefined();
      expect(spec!.id).toBeTruthy(); // ID is auto-generated from title or frontmatter
      expect(spec!.title).toContain('User Authentication');
      expect(spec!.description).toBeTruthy();
      expect(spec!.userStories.length).toBeGreaterThan(0);

      // Check first user story
      const us1 = spec!.userStories[0];
      expect(us1.id).toBe('US-001');
      expect(us1.title).toBeTruthy();
      expect(us1.acceptanceCriteria.length).toBeGreaterThan(0);

      // Check acceptance criteria
      const ac1 = us1.acceptanceCriteria[0];
      expect(ac1.id).toMatch(/^AC-US\d+-\d+$/);
      expect(ac1.description).toBeTruthy();
      expect(typeof ac1.completed).toBe('boolean');
      expect(typeof ac1.testable).toBe('boolean');
    });

    it('should extract metadata (priority, external links)', async () => {
      const specPath = path.join(fixturesDir, 'spec-002-payment-integration.md');
      const spec = await parseSpecContent(specPath);

      expect(spec).not.toBeNull();
      expect(spec!.metadata.priority).toBe('P1');
      expect(spec!.metadata.githubProject).toBeTruthy();
    });

    it('should handle spec without user stories', async () => {
      const specContent = `---
title: "Simple Spec"
---

# Simple Spec

Just a simple spec with no user stories.

**Priority**: P2
`;
      const specPath = path.join(tempDir, 'spec-simple.md');
      await fs.writeFile(specPath, specContent);

      const spec = await parseSpecContent(specPath);

      expect(spec).not.toBeNull();
      expect(spec!.title).toBe('Simple Spec');
      expect(spec!.userStories).toHaveLength(0);
      expect(spec!.metadata.priority).toBe('P2');
    });

    it('should parse spec with linked User Story files', async () => {
      const specPath = path.join(fixturesDir, 'FS-043/FEATURE.md');
      const spec = await parseSpecContent(specPath);

      expect(spec).not.toBeNull();
      expect(spec!.title).toBe('Task/Epic Synchronization via Syncing Hooks');
      expect(spec!.userStories.length).toBe(3);

      // Check first user story
      const us1 = spec!.userStories.find((us) => us.id === 'US-001');
      expect(us1).toBeDefined();
      expect(us1!.title).toBe('Sync Increment Metadata');
      expect(us1!.acceptanceCriteria.length).toBe(4);

      // Check acceptance criteria with completion status
      const ac1 = us1!.acceptanceCriteria.find((ac) => ac.id === 'AC-US1-01');
      expect(ac1).toBeDefined();
      expect(ac1!.completed).toBe(true); // [x] checked
      expect(ac1!.description).toContain('metadata changes');

      const ac3 = us1!.acceptanceCriteria.find((ac) => ac.id === 'AC-US1-03');
      expect(ac3).toBeDefined();
      expect(ac3!.completed).toBe(false); // [ ] unchecked

      // Check second user story
      const us2 = spec!.userStories.find((us) => us.id === 'US-002');
      expect(us2).toBeDefined();
      expect(us2!.title).toBe('Hook Integration');
      expect(us2!.acceptanceCriteria.length).toBe(3);

      // Check third user story
      const us3 = spec!.userStories.find((us) => us.id === 'US-003');
      expect(us3).toBeDefined();
      expect(us3!.title).toBe('Status Propagation');
      expect(us3!.acceptanceCriteria.length).toBe(3);
    });

    it('should handle linked User Story files with missing files gracefully', async () => {
      const specContent = `---
title: "Test Spec"
---

# Test Spec

Spec with broken link to User Story file.

## User Stories

- [US-001: Missing Story](./us-001-missing.md)
`;
      const specPath = path.join(tempDir, 'spec-broken-links.md');
      await fs.writeFile(specPath, specContent);

      const spec = await parseSpecContent(specPath);

      expect(spec).not.toBeNull();
      // Should create minimal entry even when file is missing (preserves intent)
      expect(spec!.userStories.length).toBe(1);

      // US-001 should have minimal info (title from link, no ACs)
      const us1 = spec!.userStories.find((us) => us.id === 'US-001');
      expect(us1).toBeDefined();
      expect(us1!.title).toBe('Missing Story'); // Title from link
      expect(us1!.acceptanceCriteria).toHaveLength(0); // No ACs when file missing
    });
  });

  describe('detectContentChanges', () => {
    it('should detect title change', () => {
      const localSpec = createSpecContent(
        'spec-001',
        'User Authentication v2',
        'Add user authentication'
      );

      const externalContent = {
        title: 'User Authentication',
        description: 'Add user authentication',
        userStoryCount: 0,
      };

      const result = detectContentChanges(localSpec, externalContent);

      expect(result.hasChanges).toBe(true);
      expect(result.changes).toContain('title: "User Authentication" → "User Authentication v2"');
    });

    it('should detect description change', () => {
      const localSpec = createSpecContent(
        'spec-001',
        'User Authentication',
        'Add user authentication with OAuth'
      );

      const externalContent = {
        title: 'User Authentication',
        description: 'Add user authentication',
        userStoryCount: 0,
      };

      const result = detectContentChanges(localSpec, externalContent);

      expect(result.hasChanges).toBe(true);
      expect(result.changes).toContain('description updated');
    });

    it('should detect user story count change', () => {
      const localSpec = createSpecContent(
        'spec-001',
        'User Authentication',
        'Add user authentication',
        [
          { id: 'US-001', title: 'Login', acceptanceCriteria: [] as SpecAcceptanceCriterion[] },
          { id: 'US-002', title: 'Logout', acceptanceCriteria: [] as SpecAcceptanceCriterion[] },
        ]
      );

      const externalContent = {
        title: 'User Authentication',
        description: 'Add user authentication',
        userStoryCount: 1,
      };

      const result = detectContentChanges(localSpec, externalContent);

      expect(result.hasChanges).toBe(true);
      expect(result.changes).toContain('user stories: 1 → 2');
    });

    it('should detect no changes when content is identical', () => {
      const localSpec = createSpecContent(
        'spec-001',
        'User Authentication',
        'Add user authentication',
        [{ id: 'US-001', title: 'Login', acceptanceCriteria: [] as SpecAcceptanceCriterion[] }]
      );

      const externalContent = {
        title: 'User Authentication',
        description: 'Add user authentication',
        userStoryCount: 1,
      };

      const result = detectContentChanges(localSpec, externalContent);

      expect(result.hasChanges).toBe(false);
      expect(result.changes).toHaveLength(0);
    });

    it('should normalize whitespace when comparing descriptions', () => {
      const localSpec = createSpecContent(
        'spec-001',
        'User Authentication',
        'Add user\n\nauthentication with\nOAuth'
      );

      const externalContent = {
        title: 'User Authentication',
        description: 'Add user authentication with OAuth',
        userStoryCount: 0,
      };

      const result = detectContentChanges(localSpec, externalContent);

      expect(result.hasChanges).toBe(false);
    });
  });

  describe('buildExternalDescription', () => {
    it('should build markdown description with user stories', () => {
      const spec = createSpecContent(
        'spec-001',
        'User Authentication',
        'Add user authentication system',
        [
          {
            id: 'US-001',
            title: 'Basic Login',
            acceptanceCriteria: [
              {
                id: 'AC-US1-01',
                description: 'User can log in with email/password',
                completed: false,
                testable: true,
              },
              {
                id: 'AC-US1-02',
                description: 'Invalid credentials show error',
                completed: true,
                testable: true,
              },
            ],
          },
        ]
      );
      spec.metadata.priority = 'P1';

      const description = buildExternalDescription(spec);

      expect(description).toContain('Add user authentication system');
      expect(description).toContain('## User Stories');
      expect(description).toContain('### US-001: Basic Login');
      expect(description).toContain('**Acceptance Criteria:**');
      expect(description).toContain('- [ ] AC-US1-01: User can log in with email/password');
      expect(description).toContain('- [x] AC-US1-02: Invalid credentials show error');
      expect(description).toContain('**Priority:** P1');
    });

    it('should handle spec without user stories', () => {
      const spec = createSpecContent(
        'spec-001',
        'Simple Spec',
        'Simple description'
      );

      const description = buildExternalDescription(spec);

      expect(description).toContain('Simple description');
      expect(description).not.toContain('## User Stories');
    });

    it('should handle spec without description', () => {
      const spec = createSpecContent(
        'spec-001',
        'Minimal Spec',
        '',
        [{ id: 'US-001', title: 'Feature', acceptanceCriteria: [] as SpecAcceptanceCriterion[] }]
      );

      const description = buildExternalDescription(spec);

      expect(description).toContain('## User Stories');
      expect(description).toContain('### US-001: Feature');
    });
  });

  describe('hasExternalLink', () => {
    it('should detect GitHub project link', async () => {
      const specContent = `# User Authentication

**GitHub Project**: https://github.com/myorg/myrepo/issues/123

Add user authentication system.
`;
      const specPath = path.join(tempDir, 'spec-github.md');
      await fs.writeFile(specPath, specContent);

      const result = await hasExternalLink(specPath, 'github');

      expect(result).toBe('https://github.com/myorg/myrepo/issues/123');
    });

    it('should detect JIRA epic link', async () => {
      const specContent = `# User Authentication

**JIRA Epic**: PROJ-123

Add user authentication system.
`;
      const specPath = path.join(tempDir, 'spec-jira.md');
      await fs.writeFile(specPath, specContent);

      const result = await hasExternalLink(specPath, 'jira');

      expect(result).toBe('PROJ-123');
    });

    it('should detect ADO feature link', async () => {
      const specContent = `# User Authentication

**ADO Feature**: #456

Add user authentication system.
`;
      const specPath = path.join(tempDir, 'spec-ado.md');
      await fs.writeFile(specPath, specContent);

      const result = await hasExternalLink(specPath, 'ado');

      expect(result).toBe('456');
    });

    it('should return null if no link found', async () => {
      const specContent = `# User Authentication

Add user authentication system.
`;
      const specPath = path.join(tempDir, 'spec-no-link.md');
      await fs.writeFile(specPath, specContent);

      const result = await hasExternalLink(specPath, 'github');

      expect(result).toBeNull();
    });
  });

  describe('updateSpecWithExternalLink', () => {
    it('should add GitHub link to spec without link', async () => {
      const specContent = `# User Authentication

Add user authentication system.
`;
      const specPath = path.join(tempDir, 'spec-update.md');
      await fs.writeFile(specPath, specContent);

      await updateSpecWithExternalLink(
        specPath,
        'github',
        '123',
        'https://github.com/myorg/myrepo/issues/123'
      );

      const updated = await fs.readFile(specPath, 'utf-8');

      expect(updated).toContain('**GitHub Project**: https://github.com/myorg/myrepo/issues/123');
    });

    it('should add JIRA link to spec', async () => {
      const specContent = `# User Authentication

Add user authentication system.
`;
      const specPath = path.join(tempDir, 'spec-jira-update.md');
      await fs.writeFile(specPath, specContent);

      await updateSpecWithExternalLink(specPath, 'jira', 'PROJ-456', 'https://jira.com/browse/PROJ-456');

      const updated = await fs.readFile(specPath, 'utf-8');

      expect(updated).toContain('**JIRA Epic**: PROJ-456');
    });

    it('should add ADO link to spec', async () => {
      const specContent = `# User Authentication

Add user authentication system.
`;
      const specPath = path.join(tempDir, 'spec-ado-update.md');
      await fs.writeFile(specPath, specContent);

      await updateSpecWithExternalLink(specPath, 'ado', '789', 'https://dev.azure.com/org/project/_workitems/789');

      const updated = await fs.readFile(specPath, 'utf-8');

      expect(updated).toContain('**ADO Feature**: #789');
    });

    it('should not duplicate link if already present', async () => {
      const specContent = `# User Authentication

**GitHub Project**: https://github.com/myorg/myrepo/issues/123

Add user authentication system.
`;
      const specPath = path.join(tempDir, 'spec-duplicate.md');
      await fs.writeFile(specPath, specContent);

      await updateSpecWithExternalLink(
        specPath,
        'github',
        '123',
        'https://github.com/myorg/myrepo/issues/123'
      );

      const updated = await fs.readFile(specPath, 'utf-8');

      // Should only have one occurrence
      const matches = updated.match(/\*\*GitHub Project\*\*/g);
      expect(matches).toHaveLength(1);
    });
  });
});

describe('Spec Content Sync - Integration Scenarios', () => {
  it('should handle full workflow: parse → detect changes → build description → update link', async () => {
    // ✅ SAFE: Use OS temp directory with unique timestamp
    const tempDir = path.join(process.env.TMPDIR || '/tmp', `specweave-test-workflow-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // 1. Create initial spec
      const specContent = `---
title: "User Authentication"
priority: P1
---

# SPEC-001: User Authentication

Add user authentication system with OAuth support.

## User Stories

**US-001**: Basic Login Flow

**Acceptance Criteria**:
- [ ] **AC-US1-01**: User can log in with valid email/password (P1, testable)
- [ ] **AC-US1-02**: Invalid credentials show error (P1, testable)
`;
      const specPath = path.join(tempDir, 'spec-001-user-auth.md');
      await fs.writeFile(specPath, specContent);

      // 2. Parse spec content
      const spec = await parseSpecContent(specPath);
      expect(spec).not.toBeNull();
      expect(spec!.title).toBe('User Authentication');
      expect(spec!.userStories).toHaveLength(1);
      expect(spec!.description).toBe('Add user authentication system with OAuth support.');

      // 3. Simulate external tool having old content
      const externalContent = {
        title: 'User Authentication (OLD)',
        description: 'Old description',
        userStoryCount: 0,
      };

      // 4. Detect changes
      const changes = detectContentChanges(spec!, externalContent);
      expect(changes.hasChanges).toBe(true);
      expect(changes.changes.length).toBeGreaterThan(0);

      // 5. Build updated description
      const description = buildExternalDescription(spec!);
      expect(description).toContain('Add user authentication system with OAuth support');
      expect(description).toContain('US-001: Basic Login Flow');

      // 6. Update spec with external link
      await updateSpecWithExternalLink(specPath, 'github', '456', 'https://github.com/org/repo/issues/456');

      const updated = await fs.readFile(specPath, 'utf-8');
      expect(updated).toContain('**GitHub Project**: https://github.com/org/repo/issues/456');
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
