import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Integration tests for Cross-Project User Story Sync
 *
 * Tests the v0.33.0 feature where user stories can target different projects
 * within a single increment using the **Project**: and **Board**: fields.
 *
 * Key features tested:
 * - Per-US project targeting (US-001 → frontend, US-002 → backend)
 * - Cross-project detection (isCrossCutting)
 * - Multi-folder living docs sync
 * - External refs per US (USExternalRefsMap)
 */

describe('Cross-Project User Story Sync (v0.33.0)', () => {
  let testDir: string;

  beforeEach(() => {
    // Create isolated test directory
    testDir = path.join(os.tmpdir(), 'specweave-cross-project-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });

    // Initialize SpecWeave project structure
    fs.mkdirSync(path.join(testDir, '.specweave/increments'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.specweave/docs/internal/specs/frontend-app'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.specweave/docs/internal/specs/backend-api'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.specweave/docs/internal/specs/shared-lib'), { recursive: true });

    // Create config with projectMappings
    const config = {
      version: '1.0',
      multiProject: {
        enabled: true,
        projects: {
          'frontend-app': {
            id: 'frontend-app',
            name: 'Frontend Application',
            techStack: ['React', 'TypeScript']
          },
          'backend-api': {
            id: 'backend-api',
            name: 'Backend API',
            techStack: ['Node.js', 'Express']
          },
          'shared-lib': {
            id: 'shared-lib',
            name: 'Shared Library',
            techStack: ['TypeScript']
          }
        }
      },
      projectMappings: {
        'frontend-app': {
          github: {
            owner: 'myorg',
            repo: 'frontend-app'
          }
        },
        'backend-api': {
          github: {
            owner: 'myorg',
            repo: 'backend-api'
          }
        }
      }
    };
    fs.writeFileSync(
      path.join(testDir, '.specweave/config.json'),
      JSON.stringify(config, null, 2)
    );
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should parse per-US project fields from spec.md', async () => {
    // Create increment with cross-project user stories
    const incrementDir = path.join(testDir, '.specweave/increments/0125-cross-project-auth');
    fs.mkdirSync(incrementDir, { recursive: true });

    const specContent = `---
increment: 0125-cross-project-auth
title: Cross-Project Authentication
project: frontend-app
---

# Cross-Project Authentication

## User Stories

### US-001: Login Form UI
**Project**: frontend-app
**As a** user
**I want** to see a login form
**So that** I can authenticate

**Acceptance Criteria**:
- **AC-US1-01**: Login form renders

---

### US-002: Auth API Endpoints
**Project**: backend-api
**As a** developer
**I want** authentication endpoints
**So that** users can log in

**Acceptance Criteria**:
- **AC-US2-01**: POST /auth/login works

---

### US-003: Auth Types
**Project**: shared-lib
**As a** developer
**I want** shared auth types
**So that** contracts are consistent

**Acceptance Criteria**:
- **AC-US3-01**: AuthToken type exported
`;
    fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

    // Import and test parser
    const { extractUserStories } = await import('../../../src/core/living-docs/sync-helpers/parsers.js');

    const stories = extractUserStories(specContent, 'default');

    expect(stories).toHaveLength(3);
    expect(stories[0].project).toBe('frontend-app');
    expect(stories[1].project).toBe('backend-api');
    expect(stories[2].project).toBe('shared-lib');
  });

  test('should detect cross-project increment', async () => {
    const { CrossProjectSync } = await import('../../../src/core/living-docs/cross-project-sync.js');

    const sync = new CrossProjectSync(testDir);

    // Create mock user stories with different projects
    const userStories = [
      { id: 'US-001', title: 'Login Form', project: 'frontend-app', acceptanceCriteria: [] },
      { id: 'US-002', title: 'Auth API', project: 'backend-api', acceptanceCriteria: [] },
      { id: 'US-003', title: 'Shared Types', project: 'shared-lib', acceptanceCriteria: [] }
    ] as any[];

    const isCrossProject = sync.isCrossProject(userStories, 'default');
    expect(isCrossProject).toBe(true);

    const groups = sync.groupByProject(userStories, 'default');
    expect(groups.size).toBe(3);
    expect(groups.get('frontend-app')).toHaveLength(1);
    expect(groups.get('backend-api')).toHaveLength(1);
    expect(groups.get('shared-lib')).toHaveLength(1);
  });

  test('should detect single-project increment', async () => {
    const { CrossProjectSync } = await import('../../../src/core/living-docs/cross-project-sync.js');

    const sync = new CrossProjectSync(testDir);

    // All stories in same project
    const userStories = [
      { id: 'US-001', title: 'Feature A', project: 'frontend-app', acceptanceCriteria: [] },
      { id: 'US-002', title: 'Feature B', project: 'frontend-app', acceptanceCriteria: [] }
    ] as any[];

    const isCrossProject = sync.isCrossProject(userStories, 'default');
    expect(isCrossProject).toBe(false);

    const groups = sync.groupByProject(userStories, 'default');
    expect(groups.size).toBe(1);
    expect(groups.get('frontend-app')).toHaveLength(2);
  });

  test('should use default project for USs without explicit project', async () => {
    const { CrossProjectSync } = await import('../../../src/core/living-docs/cross-project-sync.js');

    const sync = new CrossProjectSync(testDir);

    // Some stories without project field
    const userStories = [
      { id: 'US-001', title: 'Feature A', acceptanceCriteria: [] }, // No project
      { id: 'US-002', title: 'Feature B', project: 'backend-api', acceptanceCriteria: [] }
    ] as any[];

    const groups = sync.groupByProject(userStories, 'frontend-app');
    expect(groups.size).toBe(2);
    expect(groups.get('frontend-app')).toHaveLength(1); // US-001 gets default
    expect(groups.get('backend-api')).toHaveLength(1);
  });

  test('should detect cross-cutting features from description', async () => {
    const { detectCrossCutting } = await import('../../../src/utils/cross-cutting-detector.js');

    // Cross-cutting: mentions frontend AND backend
    const result1 = detectCrossCutting('OAuth with React frontend and Node backend API');
    expect(result1.isCrossCutting).toBe(true);
    expect(result1.suggestedProjects).toContain('frontend');
    expect(result1.suggestedProjects).toContain('backend');

    // Not cross-cutting: single domain
    const result2 = detectCrossCutting('Add button to homepage');
    expect(result2.isCrossCutting).toBe(false);

    // Explicit cross-cutting phrase
    const result3 = detectCrossCutting('This feature affects multiple repos');
    expect(result3.isCrossCutting).toBe(true);
    expect(result3.confidence).toBe('high');
  });

  test('should build external refs map from sync results', async () => {
    const { ExternalSyncOrchestrator } = await import('../../../src/core/living-docs/external-sync-orchestrator.js');

    const orchestrator = new ExternalSyncOrchestrator(testDir);

    const projectResults = [
      {
        projectId: 'frontend-app',
        provider: 'github' as const,
        success: true,
        synced: [
          { usId: 'US-001', provider: 'github' as const, success: true, issueNumber: 45, url: 'https://github.com/myorg/frontend-app/issues/45' }
        ],
        errors: []
      },
      {
        projectId: 'backend-api',
        provider: 'github' as const,
        success: true,
        synced: [
          { usId: 'US-002', provider: 'github' as const, success: true, issueNumber: 23, url: 'https://github.com/myorg/backend-api/issues/23' }
        ],
        errors: []
      }
    ];

    const refsMap = orchestrator.buildExternalRefsMap(projectResults);

    expect(refsMap['US-001']).toBeDefined();
    expect(refsMap['US-001'].github?.issueNumber).toBe(45);
    expect(refsMap['US-001'].github?.targetProject).toBe('frontend-app');

    expect(refsMap['US-002']).toBeDefined();
    expect(refsMap['US-002'].github?.issueNumber).toBe(23);
    expect(refsMap['US-002'].github?.targetProject).toBe('backend-api');
  });

  test('should generate cross-references for FEATURE.md', async () => {
    const { CrossProjectSync } = await import('../../../src/core/living-docs/cross-project-sync.js');

    const sync = new CrossProjectSync(testDir);

    const crossRefs = sync.generateCrossReferences(
      'FS-125',
      ['frontend-app', 'backend-api', 'shared-lib'],
      'frontend-app'
    );

    expect(crossRefs).toContain('Related Projects');
    expect(crossRefs).toContain('backend-api');
    expect(crossRefs).toContain('shared-lib');
    expect(crossRefs).not.toContain('frontend-app'); // Don't self-reference
  });

  test('should validate project mapping exists', async () => {
    const { ProjectValidator } = await import('../../../src/core/living-docs/validators/project-validator.js');

    const validator = new ProjectValidator();

    // Mock config with projectMappings
    const config = {
      projectMappings: {
        'frontend-app': {
          github: { owner: 'myorg', repo: 'frontend-app' }
        },
        'backend-api': {
          github: { owner: 'myorg', repo: 'backend-api' }
        }
      },
      multiProject: {
        enabled: true,
        projects: [
          { id: 'frontend-app', name: 'Frontend' },
          { id: 'backend-api', name: 'Backend' }
        ]
      }
    };

    // Valid project with mapping
    const result1 = validator.validateUSProject({ id: 'US-001', project: 'frontend-app' } as any, config);
    expect(result1.isValid).toBe(true);
    expect(result1.hasMapping).toBe(true);

    // Unknown project - should be invalid
    const result2 = validator.validateUSProject({ id: 'US-002', project: 'unknown-project' } as any, config);
    expect(result2.isValid).toBe(false);
    expect(result2.warning).toContain('not found in config');
  });
});
