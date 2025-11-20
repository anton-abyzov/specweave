import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * E2E tests for Living Docs Sync with Bidirectional Linking
 *
 * Tests the core functionality of the living docs sync hook (post-task-completion.sh)
 * which creates bidirectional links between:
 * - User stories in .specweave/docs/internal/specs/{project}/{epic}/us-*.md
 * - Tasks in .specweave/increments/{id}/tasks.md
 *
 * Architecture:
 * - SpecDistributor: Extracts user stories from spec.md, writes to living docs
 * - HierarchyMapper: Detects which FS-* folder the increment belongs to
 * - Bidirectional linking: Creates forward (US → Tasks) and reverse (Tasks → US) links
 */

test.describe('Living Docs Sync - Bidirectional Linking (E2E)', () => {
  let testDir: string;

  test.beforeEach(() => {
    // ✅ SAFE: Isolated test directory (prevents .specweave deletion)
    testDir = path.join(os.tmpdir(), 'specweave-test-e2e-living-docs-sync-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });

    // Initialize SpecWeave project
    fs.mkdirSync(path.join(testDir, '.specweave/increments'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.specweave/docs/internal/specs/default'), { recursive: true });

    // Create config
    const config = {
      version: '1.0',
      livingDocs: {
        intelligent: {
          enabled: true,
          splitByCategory: true,
          generateCrossLinks: true,
          bidirectionalLinks: true
        }
      }
    };
    fs.writeFileSync(
      path.join(testDir, '.specweave/config.json'),
      JSON.stringify(config, null, 2)
    );
  });

  test.afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should create bidirectional links between user stories and tasks', async () => {
    // 1. Create increment with spec.md (user stories with AC-IDs)
    const incrementDir = path.join(testDir, '.specweave/increments/0031-external-tool-status-sync');
    fs.mkdirSync(incrementDir, { recursive: true });

    // spec.md with user stories
    // Note: Greenfield increments use numeric feature IDs (FS-XXX), e.g., increment 0031 → FS-031
    const specContent = `---
title: External Tool Status Synchronization
created: 2025-11-12
project: default
---

# External Tool Status Synchronization

## Quick Overview

Implement bidirectional status sync between SpecWeave and external tools.

## User Stories

### US-001: Rich External Issue Content

**As a** developer
**I want** to sync rich content to external issues
**So that** stakeholders have complete context

**Acceptance Criteria**:
- **AC-US1-01** (P1): System extracts title from spec frontmatter
- **AC-US1-02** (P1): System generates task checklist from tasks.md
- **AC-US1-03** (P2): System includes links to spec/plan/tasks files

### US-002: Task-Level Mapping

**As a** developer
**I want** tasks mapped to user stories via AC-IDs
**So that** I can trace implementation to requirements

**Acceptance Criteria**:
- **AC-US2-01** (P1): Tasks reference AC-IDs in **AC**: field
- **AC-US2-02** (P1): System creates bidirectional links
- **AC-US2-03** (P2): Links work across multi-project setups
`;

    fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

    // tasks.md with AC-ID references
    const tasksContent = `---
title: External Tool Status Sync - Implementation Tasks
total_tasks: 3
completed_tasks: 0
---

# Tasks

## T-001: Extract Title from Spec Frontmatter

**AC**: AC-US1-01

**Test Plan** (BDD):
- **Given** spec.md with frontmatter → **When** sync triggered → **Then** extract title field

**Implementation**: SpecDistributor.extractTitle()

---

## T-002: Generate Task Checklist

**AC**: AC-US1-01, AC-US1-02

**Test Plan** (BDD):
- **Given** tasks.md with 5 tasks → **When** sync triggered → **Then** generate 5 checkboxes

**Implementation**: SpecDistributor.generateTaskChecklist()

---

## T-003: Create Bidirectional Links

**AC**: AC-US2-01, AC-US2-02, AC-US2-03

**Test Plan** (BDD):
- **Given** tasks with AC-IDs → **When** sync triggered → **Then** inject user story links

**Implementation**: SpecDistributor.updateTasksWithUserStoryLinks()
`;

    fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

    // 2. Trigger living docs sync (call SpecDistributor directly)
    const syncScript = `
      const { SpecDistributor } = require('${path.join(process.cwd(), 'dist/src/core/living-docs/spec-distributor.js')}');
      const distributor = new SpecDistributor('${testDir}');
      distributor.distribute('0031-external-tool-status-sync')
        .then(() => process.exit(0))
        .catch(err => { console.error(err); process.exit(1); });
    `;

    execSync(`node -e "${syncScript}"`, { cwd: testDir, stdio: 'inherit' });

    // 3. Verify user story files exist (Greenfield: numeric folder naming FS-XXX)
    // Find the feature folder (should be FS-031 for increment 0031)
    const specsDir = path.join(testDir, '.specweave/docs/internal/specs/default');
    const featureDir = path.join(specsDir, 'FS-031');
    expect(fs.existsSync(featureDir)).toBeTruthy();

    const us001Path = path.join(featureDir, 'us-001-rich-external-issue-content.md');
    const us002Path = path.join(featureDir, 'us-002-task-level-mapping.md');

    expect(fs.existsSync(us001Path)).toBeTruthy();
    expect(fs.existsSync(us002Path)).toBeTruthy();

    // 4. Verify FORWARD links (US → Tasks) exist in user story files
    const us001Content = fs.readFileSync(us001Path, 'utf-8');

    // Should contain Implementation section with links to tasks (markdown format)
    expect(us001Content).toContain('## Implementation');
    expect(us001Content).toContain('T-001'); // Task ID present (format may vary)
    expect(us001Content).toContain('T-002'); // Task ID present
    expect(us001Content).toContain('increments/0031-external-tool-status-sync/tasks.md');

    const us002Content = fs.readFileSync(us002Path, 'utf-8');
    expect(us002Content).toContain('## Implementation');
    expect(us002Content).toContain('T-003'); // Task ID present

    // 5. Verify REVERSE links (Tasks → US) exist in tasks.md
    const updatedTasksContent = fs.readFileSync(path.join(incrementDir, 'tasks.md'), 'utf-8');

    // Each task should have a "User Story" link injected after the heading
    expect(updatedTasksContent).toContain('## T-001: Extract Title from Spec Frontmatter');
    expect(updatedTasksContent).toContain('**User Story**: [US-001: Rich External Issue Content]');
    // Path will include FS-031 folder (greenfield numeric naming)
    expect(updatedTasksContent).toContain('docs/internal/specs/default/');
    expect(updatedTasksContent).toContain('FS-031');

    expect(updatedTasksContent).toContain('## T-002: Generate Task Checklist');
    expect(updatedTasksContent).toContain('**User Story**: [US-001: Rich External Issue Content]');

    expect(updatedTasksContent).toContain('## T-003: Create Bidirectional Links');
    expect(updatedTasksContent).toContain('**User Story**: [US-002: Task-Level Mapping]');
  });

  test('should handle multi-project bidirectional links correctly', async () => {
    // Setup multi-project config
    const config = {
      version: '1.0',
      multiProject: {
        enabled: true,
        projects: {
          backend: {
            name: 'Backend Services',
            keywords: ['api', 'backend'],
            techStack: ['Node.js']
          },
          frontend: {
            name: 'Frontend App',
            keywords: ['ui', 'frontend'],
            techStack: ['React']
          }
        }
      },
      livingDocs: {
        intelligent: {
          enabled: true,
          bidirectionalLinks: true
        }
      }
    };
    fs.writeFileSync(
      path.join(testDir, '.specweave/config.json'),
      JSON.stringify(config, null, 2)
    );

    // Create backend increment
    const backendDir = path.join(testDir, '.specweave/increments/0025-backend-auth');
    fs.mkdirSync(backendDir, { recursive: true });

    const backendSpec = `---
title: Backend Authentication
created: 2025-11-10
project: backend
---

# Backend Authentication

## User Stories

### US-001: API Authentication

**As a** backend developer
**I want** JWT-based authentication
**So that** APIs are secured

**Acceptance Criteria**:
- **AC-US1-01** (P1): Implement JWT token generation
`;

    const backendTasks = `---
title: Backend Auth Tasks
---

## T-001: JWT Token Generation

**AC**: AC-US1-01

**Implementation**: AuthService.generateToken()
`;

    fs.writeFileSync(path.join(backendDir, 'spec.md'), backendSpec);
    fs.writeFileSync(path.join(backendDir, 'tasks.md'), backendTasks);

    // Trigger sync (backend specs directory will be created automatically)
    const syncScript = `
      const { SpecDistributor } = require('${path.join(process.cwd(), 'dist/src/core/living-docs/spec-distributor.js')}');
      const distributor = new SpecDistributor('${testDir}');
      distributor.distribute('0025-backend-auth')
        .then(() => process.exit(0))
        .catch(err => { console.error(err); process.exit(1); });
    `;

    execSync(`node -e "${syncScript}"`, { cwd: testDir, stdio: 'inherit' });

    // Verify links point to correct project folder (backend, not default)
    // Find backend feature folder (should be FS-025 for increment 0025)
    const backendSpecsDir = path.join(testDir, '.specweave/docs/internal/specs/backend');
    const backendFeatureDir = path.join(backendSpecsDir, 'FS-025');
    expect(fs.existsSync(backendFeatureDir)).toBeTruthy();

    const us001Path = path.join(backendFeatureDir, 'us-001-api-authentication.md');
    expect(fs.existsSync(us001Path)).toBeTruthy();

    const us001Content = fs.readFileSync(us001Path, 'utf-8');
    expect(us001Content).toContain('increments/0025-backend-auth/tasks.md');

    const syncedTasksContent = fs.readFileSync(path.join(backendDir, 'tasks.md'), 'utf-8');
    expect(syncedTasksContent).toContain('**User Story**: [US-001: API Authentication]');
    expect(syncedTasksContent).toContain('specs/backend/'); // Project-specific path
    expect(syncedTasksContent).toContain('FS-025'); // Feature folder (numeric naming)
  });

  test('should handle tasks with multiple AC-IDs (maps to multiple user stories)', async () => {
    const incrementDir = path.join(testDir, '.specweave/increments/0032-complex-feature');
    fs.mkdirSync(incrementDir, { recursive: true });

    const specContent = `---
title: Complex Feature
created: 2025-11-13
---

# Complex Feature

## User Stories

### US-001: Frontend UI

**Acceptance Criteria**:
- **AC-US1-01** (P1): Build login form

### US-002: Backend API

**Acceptance Criteria**:
- **AC-US2-01** (P1): Create login endpoint
`;

    const tasksContent = `---
title: Tasks
---

## T-001: Full-Stack Login Implementation

**AC**: AC-US1-01, AC-US2-01

**Implementation**: Frontend form + Backend API
`;

    fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);
    fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

    // Trigger sync
    const syncScript = `
      const { SpecDistributor } = require('${path.join(process.cwd(), 'dist/src/core/living-docs/spec-distributor.js')}');
      const distributor = new SpecDistributor('${testDir}');
      distributor.distribute('0032-complex-feature')
        .then(() => process.exit(0))
        .catch(err => { console.error(err); process.exit(1); });
    `;

    execSync(`node -e "${syncScript}"`, { cwd: testDir, stdio: 'inherit' });

    // Verify task appears in BOTH user stories (forward links)
    const specsDir2 = path.join(testDir, '.specweave/docs/internal/specs/default');
    const featureDir = path.join(specsDir2, 'FS-032');

    const us001Content = fs.readFileSync(path.join(featureDir, 'us-001-frontend-ui.md'), 'utf-8');
    expect(us001Content).toContain('T-001'); // Task ID present in US-001

    const us002Content = fs.readFileSync(path.join(featureDir, 'us-002-backend-api.md'), 'utf-8');
    expect(us002Content).toContain('T-001'); // Task ID present in US-002 as well

    // Verify task has ONE reverse link (to first user story by convention)
    const updatedTasksContent = fs.readFileSync(path.join(incrementDir, 'tasks.md'), 'utf-8');
    expect(updatedTasksContent).toContain('**User Story**: [US-001: Frontend UI]');

    // Should NOT duplicate links
    const userStoryLinkCount = (updatedTasksContent.match(/\*\*User Story\*\*:/g) || []).length;
    expect(userStoryLinkCount).toBe(1); // Only one link per task (to primary US)
  });

  test('should be idempotent (safe to run sync multiple times)', async () => {
    const incrementDir = path.join(testDir, '.specweave/increments/0033-idempotent-test');
    fs.mkdirSync(incrementDir, { recursive: true });

    const specContent = `---
title: Idempotent Test
created: 2025-11-13
---

# Idempotent Test

## User Stories

### US-001: Test Idempotency

**Acceptance Criteria**:
- **AC-US1-01** (P1): Should not duplicate links
`;

    const tasksContent = `---
title: Tasks
---

## T-001: Test Task

**AC**: AC-US1-01

**Implementation**: Test
`;

    fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);
    fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

    const syncScript = `
      const { SpecDistributor } = require('${path.join(process.cwd(), 'dist/src/core/living-docs/spec-distributor.js')}');
      const distributor = new SpecDistributor('${testDir}');
      distributor.distribute('0033-idempotent-test')
        .then(() => process.exit(0))
        .catch(err => { console.error(err); process.exit(1); });
    `;

    // Run sync FIRST time
    execSync(`node -e "${syncScript}"`, { cwd: testDir, stdio: 'inherit' });

    const tasksAfterFirst = fs.readFileSync(path.join(incrementDir, 'tasks.md'), 'utf-8');
    const linkCountFirst = (tasksAfterFirst.match(/\*\*User Story\*\*:/g) || []).length;

    // Run sync SECOND time (should be idempotent)
    execSync(`node -e "${syncScript}"`, { cwd: testDir, stdio: 'inherit' });

    const tasksAfterSecond = fs.readFileSync(path.join(incrementDir, 'tasks.md'), 'utf-8');
    const linkCountSecond = (tasksAfterSecond.match(/\*\*User Story\*\*:/g) || []).length;

    // Link count should NOT increase (no duplication)
    expect(linkCountSecond).toBe(linkCountFirst);
    expect(linkCountSecond).toBe(1); // Still just 1 link
  });

  test('should handle tasks without AC-IDs gracefully (no links added)', async () => {
    const incrementDir = path.join(testDir, '.specweave/increments/0034-no-ac-ids');
    fs.mkdirSync(incrementDir, { recursive: true });

    const specContent = `---
title: No AC IDs Test
created: 2025-11-13
---

# No AC IDs Test

## User Stories

### US-001: Test Story

**Acceptance Criteria**:
- **AC-US1-01** (P1): Test
`;

    const tasksContent = `---
title: Tasks
---

## T-001: Task Without AC Field

**Implementation**: No AC field at all
`;

    fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);
    fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

    const syncScript = `
      const { SpecDistributor } = require('${path.join(process.cwd(), 'dist/src/core/living-docs/spec-distributor.js')}');
      const distributor = new SpecDistributor('${testDir}');
      distributor.distribute('0034-no-ac-ids')
        .then(() => process.exit(0))
        .catch(err => { console.error(err); process.exit(1); });
    `;

    execSync(`node -e "${syncScript}"`, { cwd: testDir, stdio: 'inherit' });

    const finalTasksContent = fs.readFileSync(path.join(incrementDir, 'tasks.md'), 'utf-8');

    // Should NOT add any user story links (no AC-IDs to map)
    expect(finalTasksContent).not.toContain('**User Story**:');
  });

  test('should create FEATURE.md in feature folder with implementation history', async () => {
    const incrementDir = path.join(testDir, '.specweave/increments/0035-epic-readme-test');
    fs.mkdirSync(incrementDir, { recursive: true });

    const specContent = `---
title: Epic README Test
created: 2025-11-13
---

# Epic README Test

High-level feature overview describing the feature.

## User Stories

### US-001: Test Story

**Acceptance Criteria**:
- **AC-US1-01** (P1): Test
`;

    const tasksContent = `---
title: Tasks
---

## T-001: Test Task

**AC**: AC-US1-01
`;

    fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);
    fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);

    const syncScript = `
      const { SpecDistributor } = require('${path.join(process.cwd(), 'dist/src/core/living-docs/spec-distributor.js')}');
      const distributor = new SpecDistributor('${testDir}');
      distributor.distribute('0035-epic-readme-test')
        .then(() => process.exit(0))
        .catch(err => { console.error(err); process.exit(1); });
    `;

    execSync(`node -e "${syncScript}"`, { cwd: testDir, stdio: 'inherit' });

    // FEATURE.md is in cross-project _features/ folder (Universal Hierarchy)
    const specsBaseDir = path.join(testDir, '.specweave/docs/internal/specs');
    const featureDir = path.join(specsBaseDir, '_features', 'FS-035');
    const featurePath = path.join(featureDir, 'FEATURE.md');

    expect(fs.existsSync(featurePath)).toBeTruthy();

    const featureContent = fs.readFileSync(featurePath, 'utf-8');

    // Should contain feature overview (Greenfield format: FS-XXX as ID)
    expect(featureContent).toContain('FS-035'); // Feature ID (numeric)
    expect(featureContent).toContain('Epic README Test'); // Title
    expect(featureContent).toContain('High-level feature overview');

    // Should contain source increment reference
    expect(featureContent).toContain('## Source');
    expect(featureContent).toContain('0035-epic-readme-test');
    expect(featureContent).toContain('increments/0035-epic-readme-test');

    // Should contain user stories by project
    expect(featureContent).toContain('## User Stories by Project');
    expect(featureContent).toContain('[US-001: Test Story]');

    // Should contain progress section
    expect(featureContent).toContain('## Progress');
    expect(featureContent).toContain('**Total Stories**:');
  });
});
