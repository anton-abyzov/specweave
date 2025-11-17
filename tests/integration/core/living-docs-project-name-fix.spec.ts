import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SpecDistributor } from '../../src/core/living-docs/spec-distributor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * E2E Test: Living Docs Project Name Fix
 *
 * Tests the critical fix where project detection fallback was hardcoded to 'default'
 * instead of using configured projects from config.json.
 *
 * This ensures GitHub external tool sync works correctly with 1:1 mapping:
 * - Project folder name MUST match GitHub repository name
 * - Example: specs/specweave/ → anton-abyzov/specweave repo
 *
 * Bug Fixed:
 * - BEFORE: Living docs created specs/default/ (no matching GitHub repo!)
 * - AFTER: Living docs creates specs/specweave/ (matches repo name!)
 */

test.describe('Living Docs Project Name Fix (E2E)', () => {
  let testDir: string;

  test.beforeEach(() => {
    // ✅ SAFE: Isolated test directory (prevents .specweave deletion)
    testDir = path.join(os.tmpdir(), 'specweave-test-project-name-fix-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
  });

  test.afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should use repo name (specweave) instead of hardcoded default', async () => {
    // 1. Setup: Create SpecWeave project config with specweave project
    fs.mkdirSync(path.join(testDir, '.specweave/increments'), { recursive: true });

    const config = {
      project: {
        name: 'specweave',
        version: '0.18.2',
      },
      multiProject: {
        enabled: true,
        projects: {
          specweave: {
            name: 'SpecWeave',
            description: 'Core SpecWeave framework and CLI',
            keywords: ['specweave', 'framework', 'spec-driven'],
            techStack: ['TypeScript', 'Node.js', 'Claude Code'],
            github: {
              owner: 'anton-abyzov',
              repo: 'specweave',
            },
          },
        },
      },
      livingDocs: {
        intelligent: {
          enabled: true,
          fallbackProject: 'specweave',
        },
      },
    };

    fs.writeFileSync(
      path.join(testDir, '.specweave/config.json'),
      JSON.stringify(config, null, 2)
    );

    // 2. Create increment with NO explicit project indicators (triggers fallback)
    const incrementDir = path.join(testDir, '.specweave/increments/0031-external-tool-sync');
    fs.mkdirSync(incrementDir, { recursive: true });

    // spec.md WITHOUT project frontmatter, NO project keywords in name
    const specContent = `---
title: External Tool Status Sync
created: 2025-11-15
---

# External Tool Status Sync

## Quick Overview

Implement bidirectional status synchronization.

## User Stories

### US-001: Rich External Issue Content

**As a** developer
**I want** rich content in external issues
**So that** stakeholders have context

**Acceptance Criteria**:
- **AC-US1-01** (P1): Extract title from frontmatter
- **AC-US1-02** (P1): Generate task checklist
`;

    fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

    // 3. Run living docs sync
    const distributor = new SpecDistributor(testDir);
    await distributor.distribute('0031-external-tool-sync');

    // 4. Verify: Files created under specs/specweave/ NOT specs/default/
    const specweaveFolder = path.join(testDir, '.specweave/docs/internal/specs/specweave');
    const defaultFolder = path.join(testDir, '.specweave/docs/internal/specs/default');

    expect(fs.existsSync(specweaveFolder)).toBe(true);
    expect(fs.existsSync(defaultFolder)).toBe(false);

    // 5. Verify: Feature folder created with correct project name
    const featureFolder = path.join(specweaveFolder, 'FS-031');
    expect(fs.existsSync(featureFolder)).toBe(true);

    // 6. Verify: User stories created in correct project folder
    const userStoryFile = path.join(featureFolder, 'us-001-rich-external-issue-content.md');
    expect(fs.existsSync(userStoryFile)).toBe(true);

    // 7. Verify: User story file contains correct project context
    const userStoryContent = fs.readFileSync(userStoryFile, 'utf-8');
    expect(userStoryContent).toContain('project: specweave');
    expect(userStoryContent).not.toContain('project: default');

    // 8. Verify: README.md created in project folder
    const readmeFile = path.join(featureFolder, 'README.md');
    expect(fs.existsSync(readmeFile)).toBe(true);
  });

  test('should work with multi-project config (multiple repos)', async () => {
    // Setup: Multi-project with 3 repos
    fs.mkdirSync(path.join(testDir, '.specweave/increments'), { recursive: true });

    const config = {
      multiProject: {
        enabled: true,
        projects: {
          backend: {
            name: 'Backend Services',
            keywords: ['api', 'backend', 'service'],
            github: { owner: 'org', repo: 'backend' },
          },
          frontend: {
            name: 'Frontend App',
            keywords: ['ui', 'frontend', 'react'],
            github: { owner: 'org', repo: 'frontend' },
          },
          mobile: {
            name: 'Mobile App',
            keywords: ['mobile', 'ios', 'android'],
            github: { owner: 'org', repo: 'mobile' },
          },
        },
      },
      livingDocs: {
        intelligent: {
          enabled: true,
        },
      },
    };

    fs.writeFileSync(
      path.join(testDir, '.specweave/config.json'),
      JSON.stringify(config, null, 2)
    );

    // Create increment with explicit project frontmatter
    const incrementDir = path.join(testDir, '.specweave/increments/0016-backend-auth');
    fs.mkdirSync(incrementDir, { recursive: true });

    const specContent = `---
title: Backend Authentication
project: backend
---

# Backend Authentication

### US-001: JWT Authentication

**Acceptance Criteria**:
- **AC-US1-01**: Implement JWT token generation
`;

    fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

    // Run sync
    const distributor = new SpecDistributor(testDir);
    await distributor.distribute('0016-backend-auth');

    // Verify: Files created under specs/backend/ (matches repo name)
    const backendFolder = path.join(testDir, '.specweave/docs/internal/specs/backend');
    expect(fs.existsSync(backendFolder)).toBe(true);

    // Verify: NOT created under other project folders
    const frontendFolder = path.join(testDir, '.specweave/docs/internal/specs/frontend');
    const mobileFolder = path.join(testDir, '.specweave/docs/internal/specs/mobile');
    expect(fs.existsSync(frontendFolder)).toBe(false);
    expect(fs.existsSync(mobileFolder)).toBe(false);

    // Verify: User story in correct folder
    const featureFolder = path.join(backendFolder, 'FS-016');
    const userStoryFile = path.join(featureFolder, 'us-001-jwt-authentication.md');
    expect(fs.existsSync(userStoryFile)).toBe(true);
  });

  test('should detect project from increment name when frontmatter missing', async () => {
    // Setup
    fs.mkdirSync(path.join(testDir, '.specweave/increments'), { recursive: true });

    const config = {
      multiProject: {
        enabled: true,
        projects: {
          backend: {
            name: 'Backend',
            keywords: ['api', 'backend'],
            github: { owner: 'org', repo: 'backend' },
          },
          frontend: {
            name: 'Frontend',
            keywords: ['ui', 'frontend'],
            github: { owner: 'org', repo: 'frontend' },
          },
        },
      },
    };

    fs.writeFileSync(
      path.join(testDir, '.specweave/config.json'),
      JSON.stringify(config, null, 2)
    );

    // Increment name contains "frontend" keyword
    const incrementDir = path.join(testDir, '.specweave/increments/0016-frontend-dashboard');
    fs.mkdirSync(incrementDir, { recursive: true });

    const specContent = `---
title: User Dashboard
---

### US-001: Dashboard View

**Acceptance Criteria**:
- **AC-US1-01**: Display user stats
`;

    fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

    // Run sync
    const distributor = new SpecDistributor(testDir);
    await distributor.distribute('0016-frontend-dashboard');

    // Verify: Detected frontend from increment name
    const frontendFolder = path.join(testDir, '.specweave/docs/internal/specs/frontend');
    expect(fs.existsSync(frontendFolder)).toBe(true);

    const backendFolder = path.join(testDir, '.specweave/docs/internal/specs/backend');
    expect(fs.existsSync(backendFolder)).toBe(false);
  });

  test('should fallback to all configured projects when no indicators', async () => {
    // Setup: Multi-project mode
    fs.mkdirSync(path.join(testDir, '.specweave/increments'), { recursive: true });

    const config = {
      multiProject: {
        enabled: true,
        projects: {
          backend: {
            name: 'Backend',
            github: { owner: 'org', repo: 'backend' },
          },
          frontend: {
            name: 'Frontend',
            github: { owner: 'org', repo: 'frontend' },
          },
        },
      },
    };

    fs.writeFileSync(
      path.join(testDir, '.specweave/config.json'),
      JSON.stringify(config, null, 2)
    );

    // Increment with NO project indicators
    const incrementDir = path.join(testDir, '.specweave/increments/0016-generic-task');
    fs.mkdirSync(incrementDir, { recursive: true });

    const specContent = `---
title: Generic Task
---

### US-001: Generic Feature

**Acceptance Criteria**:
- **AC-US1-01**: Implement feature
`;

    fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

    // Run sync
    const distributor = new SpecDistributor(testDir);
    await distributor.distribute('0016-generic-task');

    // Verify: Files created in BOTH project folders (fallback to all)
    const backendFolder = path.join(testDir, '.specweave/docs/internal/specs/backend/FS-016');
    const frontendFolder = path.join(testDir, '.specweave/docs/internal/specs/frontend/FS-016');

    expect(fs.existsSync(backendFolder)).toBe(true);
    expect(fs.existsSync(frontendFolder)).toBe(true);
  });

  test('REGRESSION: should NOT create specs/default/ folder', async () => {
    // This is the CRITICAL regression test for the bug fix

    // Setup: specweave single-project
    fs.mkdirSync(path.join(testDir, '.specweave/increments'), { recursive: true });

    const config = {
      multiProject: {
        enabled: true,
        projects: {
          specweave: {
            name: 'SpecWeave',
            github: { owner: 'anton-abyzov', repo: 'specweave' },
          },
        },
      },
      livingDocs: {
        intelligent: {
          fallbackProject: 'specweave',
        },
      },
    };

    fs.writeFileSync(
      path.join(testDir, '.specweave/config.json'),
      JSON.stringify(config, null, 2)
    );

    // Create 5 increments (similar to real scenario)
    for (const incNum of [23, 28, 31, 33, 35]) {
      const incrementDir = path.join(testDir, `.specweave/increments/00${incNum}-test-feature`);
      fs.mkdirSync(incrementDir, { recursive: true });

      const specContent = `---
title: Test Feature ${incNum}
---

### US-001: Test User Story

**Acceptance Criteria**:
- **AC-US1-01**: Test AC
`;

      fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

      // Sync
      const distributor = new SpecDistributor(testDir);
      await distributor.distribute(`00${incNum}-test-feature`);
    }

    // CRITICAL ASSERTION: default/ folder should NOT exist
    const defaultFolder = path.join(testDir, '.specweave/docs/internal/specs/default');
    expect(fs.existsSync(defaultFolder)).toBe(false);

    // CRITICAL ASSERTION: specweave/ folder SHOULD exist
    const specweaveFolder = path.join(testDir, '.specweave/docs/internal/specs/specweave');
    expect(fs.existsSync(specweaveFolder)).toBe(true);

    // Verify all features created in specweave/ folder
    expect(fs.existsSync(path.join(specweaveFolder, 'FS-023'))).toBe(true);
    expect(fs.existsSync(path.join(specweaveFolder, 'FS-028'))).toBe(true);
    expect(fs.existsSync(path.join(specweaveFolder, 'FS-031'))).toBe(true);
    expect(fs.existsSync(path.join(specweaveFolder, 'FS-033'))).toBe(true);
    expect(fs.existsSync(path.join(specweaveFolder, 'FS-035'))).toBe(true);
  });

  test('should maintain GitHub sync compatibility (1:1 mapping)', async () => {
    // Verify the fix ensures 1:1 mapping for GitHub sync

    fs.mkdirSync(path.join(testDir, '.specweave/increments'), { recursive: true });

    const config = {
      multiProject: {
        enabled: true,
        projects: {
          'my-awesome-repo': {
            name: 'My Awesome Repo',
            github: {
              owner: 'user',
              repo: 'my-awesome-repo', // Project ID MUST match repo name!
            },
          },
        },
      },
    };

    fs.writeFileSync(
      path.join(testDir, '.specweave/config.json'),
      JSON.stringify(config, null, 2)
    );

    const incrementDir = path.join(testDir, '.specweave/increments/0016-feature');
    fs.mkdirSync(incrementDir, { recursive: true });

    fs.writeFileSync(
      path.join(incrementDir, 'spec.md'),
      `---
title: Feature
---

### US-001: Test

**Acceptance Criteria**:
- **AC-US1-01**: Test
`
    );

    // Sync
    const distributor = new SpecDistributor(testDir);
    await distributor.distribute('0016-feature');

    // Verify: Folder name matches repo name exactly
    const projectFolder = path.join(testDir, '.specweave/docs/internal/specs/my-awesome-repo');
    expect(fs.existsSync(projectFolder)).toBe(true);

    // This ensures GitHub sync will work:
    // - Living docs path: specs/my-awesome-repo/FS-016/
    // - GitHub repo: user/my-awesome-repo
    // - PERFECT 1:1 MATCH! ✓

    // Verify feature folder created
    const featureFolder = path.join(projectFolder, 'FS-016');
    expect(fs.existsSync(featureFolder)).toBe(true);
  });
});
