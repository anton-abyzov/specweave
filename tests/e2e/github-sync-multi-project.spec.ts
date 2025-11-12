/**
 * E2E Tests for Multi-Project GitHub Sync Architecture
 *
 * Tests comprehensive multi-project scenarios:
 * 1. Single-project sync (default case, backward compatible)
 * 2. Multi-project sync (frontend, backend, ml)
 * 3. Parent repo pattern (_parent project)
 * 4. Cross-team specs (auth touches frontend + backend)
 * 5. Team-board strategy (aggregate multiple specs)
 * 6. Centralized strategy (parent repo tracks all)
 * 7. Distributed strategy (each team syncs to their repo)
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs-extra';
import * as path from 'path';
import { GitHubSpecSync } from '../../plugins/specweave-github/lib/github-spec-sync.js';
import { ProjectContextManager } from '../../src/core/sync/project-context.js';
import { SpecMetadataManager } from '../../src/core/specs/spec-metadata-manager.js';

const TEST_ROOT = path.join(process.cwd(), 'tests/fixtures/multi-project-github-sync');

test.describe('Multi-Project GitHub Sync Architecture', () => {
  let projectRoot: string;
  let githubSync: GitHubSpecSync;
  let projectManager: ProjectContextManager;
  let specManager: SpecMetadataManager;

  test.beforeEach(async () => {
    // Create test project structure
    projectRoot = path.join(TEST_ROOT, `test-${Date.now()}`);
    await fs.ensureDir(projectRoot);

    // Initialize SpecWeave structure
    await fs.ensureDir(path.join(projectRoot, '.specweave/docs/internal/specs/default'));
    await fs.ensureDir(path.join(projectRoot, '.specweave/docs/internal/specs/frontend'));
    await fs.ensureDir(path.join(projectRoot, '.specweave/docs/internal/specs/backend'));
    await fs.ensureDir(path.join(projectRoot, '.specweave/docs/internal/specs/ml'));
    await fs.ensureDir(path.join(projectRoot, '.specweave/docs/internal/specs/_parent'));

    // Initialize managers
    githubSync = new GitHubSpecSync(projectRoot);
    projectManager = new ProjectContextManager(projectRoot);
    specManager = new SpecMetadataManager(projectRoot);

    // Setup config with multiple profiles
    await setupMultiProjectConfig(projectRoot);
  });

  test.afterEach(async () => {
    // Cleanup test artifacts
    await fs.remove(projectRoot);
  });

  // ==========================================================================
  // Test 1: Single-Project Sync (Backward Compatible)
  // ==========================================================================

  test('should sync spec in default project (backward compatible)', async () => {
    // Create a spec in default project
    const specId = await createTestSpec(projectRoot, 'default', {
      id: 'spec-001',
      title: 'Core Framework',
      status: 'in-progress',
      priority: 'P1',
      userStories: [
        {
          id: 'US-001',
          title: 'As a developer, I want CLI commands',
          status: 'todo',
          priority: 'P1',
          acceptanceCriteria: [
            {
              id: 'AC-001-01',
              description: 'CLI installs via npm',
              status: 'todo'
            }
          ]
        }
      ]
    });

    // Sync to GitHub
    const result = await githubSync.syncSpecToGitHub(specId);

    // Verify sync succeeded
    expect(result.success).toBe(true);
    expect(result.specId).toBe(specId);
    expect(result.provider).toBe('github');
    expect(result.externalId).toBeDefined();

    // Verify spec metadata updated
    const spec = await specManager.loadSpec(specId);
    expect(spec?.metadata.externalLinks?.github).toBeDefined();
    expect(spec?.metadata.externalLinks?.github?.syncStrategy).toBe('project-per-spec');
  });

  // ==========================================================================
  // Test 2: Multi-Project Sync (Frontend, Backend, ML)
  // ==========================================================================

  test('should sync specs to different repos based on project', async () => {
    // Create specs in different projects
    const frontendSpecId = await createTestSpec(projectRoot, 'frontend', {
      id: 'spec-001',
      title: 'User Interface Components',
      status: 'in-progress',
      priority: 'P1'
    });

    const backendSpecId = await createTestSpec(projectRoot, 'backend', {
      id: 'spec-001',
      title: 'API Endpoints',
      status: 'in-progress',
      priority: 'P1'
    });

    const mlSpecId = await createTestSpec(projectRoot, 'ml', {
      id: 'spec-001',
      title: 'ML Model Training',
      status: 'in-progress',
      priority: 'P1'
    });

    // Sync all specs
    const frontendResult = await githubSync.syncSpecToGitHub(frontendSpecId);
    const backendResult = await githubSync.syncSpecToGitHub(backendSpecId);
    const mlResult = await githubSync.syncSpecToGitHub(mlSpecId);

    // Verify each synced to correct repo
    expect(frontendResult.success).toBe(true);
    expect(backendResult.success).toBe(true);
    expect(mlResult.success).toBe(true);

    // Verify metadata
    const frontendSpec = await specManager.loadSpec(frontendSpecId);
    expect(frontendSpec?.metadata.externalLinks?.github?.repo).toBe('frontend-app');

    const backendSpec = await specManager.loadSpec(backendSpecId);
    expect(backendSpec?.metadata.externalLinks?.github?.repo).toBe('backend-api');

    const mlSpec = await specManager.loadSpec(mlSpecId);
    expect(mlSpec?.metadata.externalLinks?.github?.repo).toBe('ml-engine');
  });

  // ==========================================================================
  // Test 3: Parent Repo Pattern (_parent project)
  // ==========================================================================

  test('should sync _parent project specs to parent repo', async () => {
    // Create spec in _parent project
    const parentSpecId = await createTestSpec(projectRoot, '_parent', {
      id: 'spec-001',
      title: 'System Architecture',
      status: 'in-progress',
      priority: 'P1'
    });

    // Sync to GitHub
    const result = await githubSync.syncSpecToGitHub(parentSpecId);

    // Verify synced to parent repo
    expect(result.success).toBe(true);

    const spec = await specManager.loadSpec(parentSpecId);
    expect(spec?.metadata.externalLinks?.github?.repo).toBe('parent-repo');
    expect(spec?.metadata.externalLinks?.github?.syncStrategy).toBe('centralized');
  });

  // ==========================================================================
  // Test 4: Cross-Team Specs (Auth touches frontend + backend)
  // ==========================================================================

  test('should sync cross-team spec to multiple repos', async () => {
    // Create cross-team auth spec
    const authSpecId = await createTestSpec(projectRoot, 'frontend', {
      id: 'spec-auth',
      title: 'User Authentication Integration',
      status: 'in-progress',
      priority: 'P1',
      tags: ['project:frontend', 'project:backend', 'cross-team'],
      userStories: [
        {
          id: 'US-001',
          title: 'As a frontend developer, I want login UI',
          status: 'todo',
          priority: 'P1',
          acceptanceCriteria: []
        },
        {
          id: 'US-002',
          title: 'As a backend developer, I want JWT validation',
          status: 'todo',
          priority: 'P1',
          acceptanceCriteria: []
        },
        {
          id: 'US-003',
          title: 'As a developer, I want API contract',
          status: 'todo',
          priority: 'P1',
          acceptanceCriteria: []
        }
      ]
    });

    // Sync with distributed strategy
    const result = await githubSync.syncSpecToGitHub(authSpecId);

    // Verify synced to multiple repos
    expect(result.success).toBe(true);
    expect(result.externalId).toBe('cross-team');

    const spec = await specManager.loadSpec(authSpecId);
    expect(spec?.metadata.externalLinks?.github?.crossTeamRepos).toBeDefined();
    expect(spec?.metadata.externalLinks?.github?.crossTeamRepos?.length).toBe(2);

    // Verify frontend repo got frontend stories
    const frontendRepoInfo = spec?.metadata.externalLinks?.github?.crossTeamRepos?.find(
      r => r.repo === 'frontend-app'
    );
    expect(frontendRepoInfo).toBeDefined();
    expect(frontendRepoInfo?.relevantUserStories).toContain('US-001');
    expect(frontendRepoInfo?.relevantUserStories).toContain('US-003'); // Shared story

    // Verify backend repo got backend stories
    const backendRepoInfo = spec?.metadata.externalLinks?.github?.crossTeamRepos?.find(
      r => r.repo === 'backend-api'
    );
    expect(backendRepoInfo).toBeDefined();
    expect(backendRepoInfo?.relevantUserStories).toContain('US-002');
    expect(backendRepoInfo?.relevantUserStories).toContain('US-003'); // Shared story
  });

  // ==========================================================================
  // Test 5: Team-Board Strategy (Aggregate Multiple Specs)
  // ==========================================================================

  test('should sync multiple specs to team board', async () => {
    // Create multiple specs for frontend team
    const spec1Id = await createTestSpec(projectRoot, 'frontend', {
      id: 'spec-001',
      title: 'Login Component',
      status: 'in-progress',
      priority: 'P1'
    });

    const spec2Id = await createTestSpec(projectRoot, 'frontend', {
      id: 'spec-002',
      title: 'Dashboard Component',
      status: 'in-progress',
      priority: 'P1'
    });

    // Set team-board strategy for frontend project
    await setProjectStrategy(projectRoot, 'frontend', 'team-board');

    // Sync both specs
    const result1 = await githubSync.syncSpecToGitHub(spec1Id);
    const result2 = await githubSync.syncSpecToGitHub(spec2Id);

    // Verify both synced to same team board
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    const spec1 = await specManager.loadSpec(spec1Id);
    const spec2 = await specManager.loadSpec(spec2Id);

    expect(spec1?.metadata.externalLinks?.github?.teamBoardId).toBeDefined();
    expect(spec2?.metadata.externalLinks?.github?.teamBoardId).toBe(
      spec1?.metadata.externalLinks?.github?.teamBoardId
    );
  });

  // ==========================================================================
  // Test 6: Centralized Strategy (Parent Repo Tracks All)
  // ==========================================================================

  test('should sync all specs to parent repo with project tags', async () => {
    // Set centralized strategy for all projects
    await setProjectStrategy(projectRoot, 'frontend', 'centralized');
    await setProjectStrategy(projectRoot, 'backend', 'centralized');

    // Create specs in different projects
    const frontendSpecId = await createTestSpec(projectRoot, 'frontend', {
      id: 'spec-001',
      title: 'Frontend Feature',
      status: 'in-progress',
      priority: 'P1'
    });

    const backendSpecId = await createTestSpec(projectRoot, 'backend', {
      id: 'spec-001',
      title: 'Backend Feature',
      status: 'in-progress',
      priority: 'P1'
    });

    // Sync both specs
    const result1 = await githubSync.syncSpecToGitHub(frontendSpecId);
    const result2 = await githubSync.syncSpecToGitHub(backendSpecId);

    // Verify both synced to parent repo
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    const spec1 = await specManager.loadSpec(frontendSpecId);
    const spec2 = await specManager.loadSpec(backendSpecId);

    expect(spec1?.metadata.externalLinks?.github?.repo).toBe('parent-repo');
    expect(spec2?.metadata.externalLinks?.github?.repo).toBe('parent-repo');
    expect(spec1?.metadata.externalLinks?.github?.syncStrategy).toBe('centralized');
  });

  // ==========================================================================
  // Test 7: Distributed Strategy (Each Team Syncs to Their Repo)
  // ==========================================================================

  test('should sync each team spec to their own repo', async () => {
    // Set distributed strategy
    await setProjectStrategy(projectRoot, 'frontend', 'distributed');
    await setProjectStrategy(projectRoot, 'backend', 'distributed');

    // Create specs in different projects
    const frontendSpecId = await createTestSpec(projectRoot, 'frontend', {
      id: 'spec-001',
      title: 'Frontend Feature',
      status: 'in-progress',
      priority: 'P1'
    });

    const backendSpecId = await createTestSpec(projectRoot, 'backend', {
      id: 'spec-001',
      title: 'Backend Feature',
      status: 'in-progress',
      priority: 'P1'
    });

    // Sync both specs
    const result1 = await githubSync.syncSpecToGitHub(frontendSpecId);
    const result2 = await githubSync.syncSpecToGitHub(backendSpecId);

    // Verify each synced to their own repo
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    const spec1 = await specManager.loadSpec(frontendSpecId);
    const spec2 = await specManager.loadSpec(backendSpecId);

    expect(spec1?.metadata.externalLinks?.github?.repo).toBe('frontend-app');
    expect(spec2?.metadata.externalLinks?.github?.repo).toBe('backend-api');
    expect(spec1?.metadata.externalLinks?.github?.syncStrategy).toBe('distributed');
  });
});

// ==========================================================================
// Helper Functions
// ==========================================================================

async function setupMultiProjectConfig(projectRoot: string): Promise<void> {
  const config = {
    sync: {
      enabled: true,
      activeProfile: 'frontend-profile',
      profiles: {
        'frontend-profile': {
          provider: 'github',
          displayName: 'Frontend App',
          config: {
            owner: 'myorg',
            repo: 'frontend-app',
            githubStrategy: 'distributed',
            enableCrossTeamDetection: true
          },
          timeRange: { default: '1M', max: '6M' },
          rateLimits: { maxItemsPerSync: 500, warnThreshold: 100 }
        },
        'backend-profile': {
          provider: 'github',
          displayName: 'Backend API',
          config: {
            owner: 'myorg',
            repo: 'backend-api',
            githubStrategy: 'distributed',
            enableCrossTeamDetection: true
          },
          timeRange: { default: '1M', max: '6M' },
          rateLimits: { maxItemsPerSync: 500, warnThreshold: 100 }
        },
        'ml-profile': {
          provider: 'github',
          displayName: 'ML Engine',
          config: {
            owner: 'myorg',
            repo: 'ml-engine',
            githubStrategy: 'project-per-spec'
          },
          timeRange: { default: '1M', max: '6M' },
          rateLimits: { maxItemsPerSync: 500, warnThreshold: 100 }
        },
        'parent-profile': {
          provider: 'github',
          displayName: 'Parent Repo',
          config: {
            owner: 'myorg',
            repo: 'parent-repo',
            githubStrategy: 'centralized'
          },
          timeRange: { default: '1M', max: '6M' },
          rateLimits: { maxItemsPerSync: 500, warnThreshold: 100 }
        }
      },
      projects: {
        'default': {
          id: 'default',
          name: 'Default Project',
          description: 'Single-project mode',
          keywords: ['core', 'framework'],
          defaultSyncProfile: 'frontend-profile',
          specsFolder: '.specweave/docs/internal/specs/default',
          increments: []
        },
        'frontend': {
          id: 'frontend',
          name: 'Frontend Team',
          description: 'React web application',
          team: 'Frontend Team',
          keywords: ['frontend', 'react', 'ui', 'web'],
          defaultSyncProfile: 'frontend-profile',
          specsFolder: '.specweave/docs/internal/specs/frontend',
          increments: []
        },
        'backend': {
          id: 'backend',
          name: 'Backend Team',
          description: 'Node.js API',
          team: 'Backend Team',
          keywords: ['backend', 'api', 'server', 'nodejs'],
          defaultSyncProfile: 'backend-profile',
          specsFolder: '.specweave/docs/internal/specs/backend',
          increments: []
        },
        'ml': {
          id: 'ml',
          name: 'ML Team',
          description: 'Machine learning models',
          team: 'ML Team',
          keywords: ['ml', 'machine-learning', 'tensorflow', 'pytorch'],
          defaultSyncProfile: 'ml-profile',
          specsFolder: '.specweave/docs/internal/specs/ml',
          increments: []
        },
        '_parent': {
          id: '_parent',
          name: 'Parent Repository',
          description: 'Parent repo for multi-repo architecture',
          keywords: ['parent', 'docs', 'architecture'],
          defaultSyncProfile: 'parent-profile',
          specsFolder: '.specweave/docs/internal/specs/_parent',
          increments: []
        }
      }
    }
  };

  await fs.writeJSON(path.join(projectRoot, '.specweave/config.json'), config, { spaces: 2 });
}

async function createTestSpec(
  projectRoot: string,
  projectId: string,
  metadata: any
): Promise<string> {
  const specId = metadata.id || `spec-${Date.now()}`;
  const specPath = path.join(
    projectRoot,
    `.specweave/docs/internal/specs/${projectId}/${specId}.md`
  );

  const content = `---
id: ${specId}
title: "${metadata.title}"
status: ${metadata.status}
priority: ${metadata.priority}
created: ${new Date().toISOString().split('T')[0]}
tags: ${JSON.stringify(metadata.tags || [])}
---

# ${specId.toUpperCase()}: ${metadata.title}

## Overview

Test spec for multi-project GitHub sync.

## User Stories

${(metadata.userStories || [])
  .map(
    (us: any) => `
### ${us.id}: ${us.title}
**Priority**: ${us.priority}
**Status**: ${us.status}

${us.acceptanceCriteria.map((ac: any) => `- [ ] **${ac.id}**: ${ac.description}`).join('\n')}
`
  )
  .join('\n')}

---

**Last Updated**: ${new Date().toISOString()}
`;

  await fs.ensureDir(path.dirname(specPath));
  await fs.writeFile(specPath, content, 'utf-8');

  return specId;
}

async function setProjectStrategy(
  projectRoot: string,
  projectId: string,
  strategy: string
): Promise<void> {
  const configPath = path.join(projectRoot, '.specweave/config.json');
  const config = await fs.readJSON(configPath);

  const project = config.sync.projects[projectId];
  if (project) {
    const profile = config.sync.profiles[project.defaultSyncProfile];
    if (profile) {
      profile.config.githubStrategy = strategy;
    }
  }

  await fs.writeJSON(configPath, config, { spaces: 2 });
}
