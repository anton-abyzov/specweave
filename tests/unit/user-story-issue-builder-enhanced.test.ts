import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests for UserStoryIssueBuilder - Enhanced Features
 *
 * Critical functionality:
 * 1. Related User Stories extraction with link conversion
 * 2. Dual AC format support (AC-US1-01 and AC-001)
 * 3. GitHub blob URL conversion
 */

import { UserStoryIssueBuilder } from '../../plugins/specweave-github/lib/user-story-issue-builder.js.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('UserStoryIssueBuilder - Enhanced Features', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('Acceptance Criteria - Dual Format Support', () => {
    it('should extract ACs with preferred format (AC-US1-01)', async () => {
      const userStoryPath = path.join(tmpDir, 'us-001-test.md');
      const content = `---
id: US-001
feature: FS-031
title: Test User Story
status: active
priority: P1
created: 2025-11-15
---

# US-001: Test User Story

## Acceptance Criteria

- [x] **AC-US1-01**: First criterion (completed)
- [ ] **AC-US1-02**: Second criterion (not completed)
- [x] **AC-US1-03**: Third criterion (completed)
`;

      await fs.writeFile(userStoryPath, content);

      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tmpDir,
        'FS-031',
        { owner: 'test-owner', repo: 'test-repo', branch: 'main' }
      );

      const result = await builder.buildIssueBody();

      // Check title format
      expect(result.title).toBe('[FS-031][US-001] Test User Story');

      // Check that ACs are in the body with checkboxes
      expect(result.body).toContain('## Acceptance Criteria');
      expect(result.body).toContain('- [x] **AC-US1-01**: First criterion (completed)');
      expect(result.body).toContain('- [ ] **AC-US1-02**: Second criterion (not completed)');
      expect(result.body).toContain('- [x] **AC-US1-03**: Third criterion (completed)');
    });

    it('should extract ACs with legacy format (AC-001)', async () => {
      const userStoryPath = path.join(tmpDir, 'us-001-legacy.md');
      const content = `---
id: US-001
feature: FS-023
title: Legacy Format Test
status: complete
priority: P2
created: 2025-11-15
---

# US-001: Legacy Format Test

## Acceptance Criteria

- [ ] **AC-001**: First criterion (not completed)
- [x] **AC-002**: Second criterion (completed)
- [ ] **AC-003**: Third criterion (not completed)
- [x] **AC-004**: Fourth criterion (completed)
`;

      await fs.writeFile(userStoryPath, content);

      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tmpDir,
        'FS-023',
        { owner: 'test-owner', repo: 'test-repo', branch: 'develop' }
      );

      const result = await builder.buildIssueBody();

      // Check that ACs are extracted with correct state
      expect(result.body).toContain('## Acceptance Criteria');
      expect(result.body).toContain('- [ ] **AC-001**: First criterion (not completed)');
      expect(result.body).toContain('- [x] **AC-002**: Second criterion (completed)');
      expect(result.body).toContain('- [ ] **AC-003**: Third criterion (not completed)');
      expect(result.body).toContain('- [x] **AC-004**: Fourth criterion (completed)');
    });

    it('should handle ACs without checkboxes (default to unchecked)', async () => {
      const userStoryPath = path.join(tmpDir, 'us-001-no-checkboxes.md');
      const content = `---
id: US-001
feature: FS-031
title: No Checkboxes Test
status: planning
created: 2025-11-15
---

# US-001: No Checkboxes Test

## Acceptance Criteria

- **AC-US1-01**: First criterion
- **AC-US1-02**: Second criterion
`;

      await fs.writeFile(userStoryPath, content);

      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tmpDir,
        'FS-031'
      );

      const result = await builder.buildIssueBody();

      // Should default to unchecked
      expect(result.body).toContain('- [ ] **AC-US1-01**: First criterion');
      expect(result.body).toContain('- [ ] **AC-US1-02**: Second criterion');
    });

    it('should handle mixed AC formats in same user story', async () => {
      const userStoryPath = path.join(tmpDir, 'us-001-mixed.md');
      const content = `---
id: US-001
feature: FS-031
title: Mixed Format Test
status: active
created: 2025-11-15
---

# US-001: Mixed Format Test

## Acceptance Criteria

- [x] **AC-US1-01**: Preferred format (completed)
- [ ] **AC-002**: Legacy format (not completed)
- [x] **AC-US1-03**: Preferred format (completed)
`;

      await fs.writeFile(userStoryPath, content);

      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tmpDir,
        'FS-031'
      );

      const result = await builder.buildIssueBody();

      // Both formats should be extracted
      expect(result.body).toContain('- [x] **AC-US1-01**: Preferred format (completed)');
      expect(result.body).toContain('- [ ] **AC-002**: Legacy format (not completed)');
      expect(result.body).toContain('- [x] **AC-US1-03**: Preferred format (completed)');
    });
  });

  describe('Related User Stories - Extraction and Link Conversion', () => {
    it('should extract Related User Stories section', async () => {
      const userStoryPath = path.join(tmpDir, 'us-001-related.md');
      const content = `---
id: US-001
feature: FS-031
title: Test with Related Stories
status: active
created: 2025-11-15
---

# US-001: Test with Related Stories

## User Story

**As a** developer
**I want** related stories
**So that** I can navigate easily

## Acceptance Criteria

- [ ] **AC-US1-01**: Test criterion

## Related User Stories

- [US-002: Task Mapping](us-002-task-level-mapping.md)
- [US-003: Status Config](us-003-status-mapping-configuration.md)
- [US-004: Bidirectional Sync](us-004-bidirectional-status-sync.md)

---

**Status**: Active
`;

      await fs.writeFile(userStoryPath, content);

      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tmpDir,
        'FS-031'
      );

      const result = await builder.buildIssueBody();

      // Should include Related User Stories section
      expect(result.body).toContain('## Related User Stories');
      expect(result.body).toContain('US-002: Task Mapping');
      expect(result.body).toContain('US-003: Status Config');
      expect(result.body).toContain('US-004: Bidirectional Sync');
    });

    it('should convert relative links to GitHub blob URLs', async () => {
      // Create user story in nested project structure
      const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs/specweave/FS-031');
      await fs.ensureDir(specsDir);

      const userStoryPath = path.join(specsDir, 'us-001-links.md');
      const content = `---
id: US-001
feature: FS-031
title: Test Link Conversion
status: active
created: 2025-11-15
---

# US-001: Test Link Conversion

## Related User Stories

- [US-002: Second Story](us-002-second-story.md)
- [US-003: Third Story](us-003-third-story.md)
`;

      await fs.writeFile(userStoryPath, content);

      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tmpDir,
        'FS-031',
        { owner: 'anton-abyzov', repo: 'specweave', branch: 'develop' }
      );

      const result = await builder.buildIssueBody();

      // Links should be converted to full GitHub blob URLs
      expect(result.body).toContain(
        'https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/specweave/FS-031/us-002-second-story.md'
      );
      expect(result.body).toContain(
        'https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/specweave/FS-031/us-003-third-story.md'
      );
    });

    it('should preserve absolute URLs (not convert them)', async () => {
      const userStoryPath = path.join(tmpDir, 'us-001-absolute.md');
      const content = `---
id: US-001
feature: FS-031
title: Absolute URLs Test
status: active
created: 2025-11-15
---

# US-001: Absolute URLs Test

## Related User Stories

- [External Doc](https://docs.example.com/guide.md)
- [US-002: Internal](us-002-internal.md)
`;

      await fs.writeFile(userStoryPath, content);

      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tmpDir,
        'FS-031',
        { owner: 'test-owner', repo: 'test-repo', branch: 'main' }
      );

      const result = await builder.buildIssueBody();

      // Absolute URL should remain unchanged
      expect(result.body).toContain('https://docs.example.com/guide.md');
      // Relative URL should be converted
      expect(result.body).toContain('test-repo/blob/main/');
    });

    it('should handle multi-project setup with backend project', async () => {
      // Create backend project structure
      const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs/backend/FS-028');
      await fs.ensureDir(specsDir);

      const userStoryPath = path.join(specsDir, 'us-001-backend.md');
      const content = `---
id: US-001
feature: FS-028
title: Backend User Story
status: active
project: backend
created: 2025-11-15
---

# US-001: Backend User Story

## Related User Stories

- [US-002: API Design](us-002-api-design.md)
`;

      await fs.writeFile(userStoryPath, content);

      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tmpDir,
        'FS-028',
        { owner: 'mycompany', repo: 'backend-api', branch: 'main' }
      );

      const result = await builder.buildIssueBody();

      // Should detect "backend" from path
      expect(result.body).toContain('.specweave/docs/internal/specs/backend/FS-028/us-002-api-design.md');
    });
  });

  describe('Business Rationale Extraction', () => {
    it('should extract Business Rationale section', async () => {
      const userStoryPath = path.join(tmpDir, 'us-001-rationale.md');
      const content = `---
id: US-001
feature: FS-031
title: Test with Rationale
status: active
created: 2025-11-15
---

# US-001: Test with Rationale

## Acceptance Criteria

- [ ] **AC-US1-01**: Test criterion

## Business Rationale

External stakeholders (PM, clients, executives) need complete context without developer access to repository.

This enables faster decision-making and reduces back-and-forth communication.
`;

      await fs.writeFile(userStoryPath, content);

      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tmpDir,
        'FS-031'
      );

      const result = await builder.buildIssueBody();

      expect(result.body).toContain('## Business Rationale');
      expect(result.body).toContain('External stakeholders (PM, clients, executives)');
      expect(result.body).toContain('faster decision-making');
    });
  });

  describe('Implementation Section with Link Conversion', () => {
    it('should convert increment links to GitHub blob URLs', async () => {
      const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs/specweave/FS-031');
      await fs.ensureDir(specsDir);

      const userStoryPath = path.join(specsDir, 'us-001-impl.md');
      const content = `---
id: US-001
feature: FS-031
title: Test Implementation Links
status: active
created: 2025-11-15
---

# US-001: Test Implementation Links

## Implementation

**Increment**: [0031-external-tool-status-sync](../../../../../increments/0031-external-tool-status-sync/tasks.md)

**Tasks**:
- [T-001: Create Builder](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-001-create-builder)
- [T-002: Add Tests](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-002-add-tests)
`;

      await fs.writeFile(userStoryPath, content);

      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tmpDir,
        'FS-031',
        { owner: 'anton-abyzov', repo: 'specweave', branch: 'develop' }
      );

      const result = await builder.buildIssueBody();

      // Check Implementation section exists
      expect(result.body).toContain('## Implementation');

      // Check links are converted to GitHub blob URLs
      expect(result.body).toContain(
        'https://github.com/anton-abyzov/specweave/blob/develop/.specweave/increments/0031-external-tool-status-sync/tasks.md'
      );
      expect(result.body).toContain('#t-001-create-builder');
      expect(result.body).toContain('#t-002-add-tests');
    });
  });

  describe('GitHub Issue Links Section', () => {
    it('should generate correct GitHub blob URLs in Links section', async () => {
      const specsDir = path.join(tmpDir, '.specweave/docs/internal/specs/specweave/FS-031');
      await fs.ensureDir(specsDir);

      const userStoryPath = path.join(specsDir, 'us-001-links-section.md');
      const content = `---
id: US-001
feature: FS-031
title: Test Links Section
status: active
created: 2025-11-15
---

# US-001: Test Links Section

## Acceptance Criteria

- [ ] **AC-US1-01**: Test
`;

      await fs.writeFile(userStoryPath, content);

      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tmpDir,
        'FS-031',
        { owner: 'anton-abyzov', repo: 'specweave', branch: 'develop' }
      );

      const result = await builder.buildIssueBody();

      // Check Links section
      expect(result.body).toContain('## Links');
      expect(result.body).toContain(
        '**Feature Spec**: [FS-031](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/_features/FS-031/FEATURE.md)'
      );
      expect(result.body).toContain(
        '**User Story File**: [us-001-links-section.md](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/specweave/FS-031/us-001-links-section.md)'
      );
    });
  });

  describe('Labels Generation', () => {
    it('should include correct labels', async () => {
      const userStoryPath = path.join(tmpDir, 'us-001-labels.md');
      const content = `---
id: US-001
feature: FS-031
title: Test Labels
status: complete
priority: P1
project: backend
created: 2025-11-15
---

# US-001: Test Labels
`;

      await fs.writeFile(userStoryPath, content);

      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tmpDir,
        'FS-031'
      );

      const result = await builder.buildIssueBody();

      expect(result.labels).toContain('user-story');
      expect(result.labels).toContain('specweave');
      expect(result.labels).toContain('status:complete');
      expect(result.labels).toContain('p1');
      expect(result.labels).toContain('project:backend');
    });

    it('should not include project label for default project', async () => {
      const userStoryPath = path.join(tmpDir, 'us-001-default.md');
      const content = `---
id: US-001
feature: FS-031
title: Default Project
status: active
project: default
created: 2025-11-15
---

# US-001: Default Project
`;

      await fs.writeFile(userStoryPath, content);

      const builder = new UserStoryIssueBuilder(
        userStoryPath,
        tmpDir,
        'FS-031'
      );

      const result = await builder.buildIssueBody();

      // Should NOT include "project:default" label
      expect(result.labels).toContain('user-story');
      expect(result.labels).toContain('specweave');
      expect(result.labels).not.toContain('project:default');
    });
  });
});
