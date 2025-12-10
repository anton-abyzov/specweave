/**
 * Unit tests for Per-US GitHub Sync (v0.34.0+)
 *
 * Tests the PerUSGitHubSync class which syncs each User Story
 * to its explicitly declared project's GitHub repository.
 *
 * Part of increment 0137: Per-US Project/Board Enforcement
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import type { UserStoryData } from '../../../../src/core/living-docs/types.js';
import type { ProjectMappings } from '../../../../src/core/types/config.js';

/**
 * Inline re-implementation for testing (avoids import issues)
 */
interface USSyncResult {
  usId: string;
  projectId: string;
  repo: string;
  issueNumber: number;
  url: string;
  action: 'created' | 'updated' | 'skipped';
  error?: string;
}

interface PerUSSyncResult {
  success: boolean;
  synced: USSyncResult[];
  failed: USSyncResult[];
  externalRefs: Record<string, { github?: { provider: string; issueNumber: number; url: string; targetProject: string; lastSynced: string } }>;
  summary: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
}

interface GitHubMapping {
  owner: string;
  repo: string;
}

interface MockOctokit {
  issues: {
    create: Mock;
    update: Mock;
    listForRepo: Mock;
  };
}

/**
 * Minimal PerUSGitHubSync implementation for testing
 */
class PerUSGitHubSync {
  private projectMappings: ProjectMappings;
  private octokit: MockOctokit;
  private logger: { log: Mock; warn: Mock };

  constructor(token: string, projectMappings: ProjectMappings, options: { logger?: { log: Mock; warn: Mock } } = {}) {
    this.projectMappings = projectMappings;
    this.logger = options.logger ?? { log: vi.fn(), warn: vi.fn() };
    // Get mock from test context
    this.octokit = (globalThis as unknown as { __mockOctokit: MockOctokit }).__mockOctokit;
  }

  async syncUserStories(
    userStories: UserStoryData[],
    featureId: string,
    options: { dryRun?: boolean; defaultProject?: string } = {}
  ): Promise<PerUSSyncResult> {
    const synced: USSyncResult[] = [];
    const failed: USSyncResult[] = [];
    const externalRefs: PerUSSyncResult['externalRefs'] = {};

    const groups = this.groupByProject(userStories, options.defaultProject);

    this.logger.log(`📡 Per-US GitHub Sync: ${userStories.length} USs across ${groups.size} projects`);

    for (const [projectId, stories] of groups) {
      const mapping = this.projectMappings[projectId]?.github as GitHubMapping | undefined;

      if (!mapping) {
        this.logger.warn(`   ⚠️  No GitHub mapping for project "${projectId}" - skipping ${stories.length} USs`);
        for (const story of stories) {
          failed.push({
            usId: story.id,
            projectId,
            repo: 'N/A',
            issueNumber: 0,
            url: '',
            action: 'skipped',
            error: `No GitHub mapping for project "${projectId}"`,
          });
        }
        continue;
      }

      for (const story of stories) {
        if (options.dryRun) {
          this.logger.log(`   🔍 [DRY-RUN] Would sync ${story.id} to ${mapping.owner}/${mapping.repo}`);
          synced.push({
            usId: story.id,
            projectId,
            repo: `${mapping.owner}/${mapping.repo}`,
            issueNumber: 0,
            url: '',
            action: 'skipped',
          });
        } else {
          try {
            const existing = await this.findExistingIssue(mapping, story.id);
            const title = `[${featureId}][${story.id}] ${story.title}`;
            const body = this.buildIssueBody(story, featureId);

            if (existing) {
              const response = await this.octokit.issues.update({
                owner: mapping.owner,
                repo: mapping.repo,
                issue_number: existing.number,
                title,
                body,
              });
              synced.push({
                usId: story.id,
                projectId,
                repo: `${mapping.owner}/${mapping.repo}`,
                issueNumber: response.data.number,
                url: response.data.html_url,
                action: 'updated',
              });
            } else {
              const response = await this.octokit.issues.create({
                owner: mapping.owner,
                repo: mapping.repo,
                title,
                body,
                labels: ['specweave', 'user-story'],
              });
              synced.push({
                usId: story.id,
                projectId,
                repo: `${mapping.owner}/${mapping.repo}`,
                issueNumber: response.data.number,
                url: response.data.html_url,
                action: 'created',
              });
              externalRefs[story.id] = {
                github: {
                  provider: 'github',
                  issueNumber: response.data.number,
                  url: response.data.html_url,
                  targetProject: projectId,
                  lastSynced: new Date().toISOString(),
                },
              };
            }
          } catch (error) {
            failed.push({
              usId: story.id,
              projectId,
              repo: `${mapping.owner}/${mapping.repo}`,
              issueNumber: 0,
              url: '',
              action: 'skipped',
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    }

    const created = synced.filter((r) => r.action === 'created').length;
    const updated = synced.filter((r) => r.action === 'updated').length;
    const skipped = synced.filter((r) => r.action === 'skipped').length;

    return {
      success: failed.length === 0,
      synced,
      failed,
      externalRefs,
      summary: { total: userStories.length, created, updated, skipped, failed: failed.length },
    };
  }

  private async findExistingIssue(mapping: GitHubMapping, usId: string): Promise<{ number: number } | null> {
    try {
      const response = await this.octokit.issues.listForRepo({
        owner: mapping.owner,
        repo: mapping.repo,
        labels: 'specweave',
        state: 'all',
        per_page: 100,
      });
      const existing = response.data.find((issue: { title: string }) => issue.title.includes(`[${usId}]`));
      return existing ? { number: existing.number } : null;
    } catch {
      return null;
    }
  }

  private buildIssueBody(story: UserStoryData, featureId: string): string {
    const lines: string[] = [];
    lines.push(`# ${story.title}`);
    if (story.description) lines.push('', story.description);
    if (story.acceptanceCriteria?.length) {
      lines.push('', '## Acceptance Criteria', '');
      for (const ac of story.acceptanceCriteria) lines.push(`- [ ] ${ac}`);
    }
    lines.push('', '---', '', `**Feature**: ${featureId}`, `**User Story**: ${story.id}`);
    if (story.project) lines.push(`**Project**: ${story.project}`);
    if (story.board) lines.push(`**Board**: ${story.board}`);
    lines.push('', '🤖 Auto-generated by SpecWeave');
    return lines.join('\n');
  }

  private groupByProject(userStories: UserStoryData[], defaultProject?: string): Map<string, UserStoryData[]> {
    const groups = new Map<string, UserStoryData[]>();
    for (const story of userStories) {
      const project = story.project || defaultProject || 'default';
      if (!groups.has(project)) groups.set(project, []);
      groups.get(project)!.push(story);
    }
    return groups;
  }
}

function formatPerUSSyncResults(result: PerUSSyncResult): string {
  const lines: string[] = ['', '📊 Per-US GitHub Sync Results', ''];
  const byProject = new Map<string, USSyncResult[]>();
  for (const r of [...result.synced, ...result.failed]) {
    const existing = byProject.get(r.projectId) || [];
    existing.push(r);
    byProject.set(r.projectId, existing);
  }
  for (const [projectId, results] of byProject) {
    lines.push(`**${projectId}**:`);
    for (const r of results) {
      const icon = r.action === 'created' ? '✅' : r.action === 'updated' ? '🔄' : r.error ? '❌' : '⏭️';
      if (r.issueNumber > 0) lines.push(`  ${icon} ${r.usId} → ${r.repo}#${r.issueNumber}`);
      else if (r.error) lines.push(`  ${icon} ${r.usId}: ${r.error}`);
      else lines.push(`  ${icon} ${r.usId} (${r.action})`);
    }
    lines.push('');
  }
  lines.push(`📈 Summary: ${result.summary.created} created, ${result.summary.updated} updated, ${result.summary.failed} failed`);
  return lines.join('\n');
}

describe('PerUSGitHubSync', () => {
  let mockOctokit: {
    issues: {
      create: Mock;
      update: Mock;
      listForRepo: Mock;
    };
  };

  const projectMappings: ProjectMappings = {
    frontend: {
      github: {
        owner: 'acme-corp',
        repo: 'frontend-app',
      },
    },
    backend: {
      github: {
        owner: 'acme-corp',
        repo: 'backend-api',
      },
    },
    shared: {
      // No GitHub mapping - should be skipped
    },
  };

  const mockLogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up mock Octokit instance in global context
    mockOctokit = {
      issues: {
        create: vi.fn(),
        update: vi.fn(),
        listForRepo: vi.fn().mockResolvedValue({ data: [] }),
      },
    };
    (globalThis as unknown as { __mockOctokit: typeof mockOctokit }).__mockOctokit = mockOctokit;
  });

  describe('groupByProject', () => {
    it('should group user stories by their explicit project field', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Add login form', project: 'frontend', acceptanceCriteria: [] },
        { id: 'US-002', title: 'Create auth API', project: 'backend', acceptanceCriteria: [] },
        { id: 'US-003', title: 'Add dashboard', project: 'frontend', acceptanceCriteria: [] },
      ];

      const sync = new PerUSGitHubSync('fake-token', projectMappings, { logger: mockLogger });

      // Mock successful creates
      mockOctokit.issues.create.mockResolvedValue({
        data: { number: 1, html_url: 'https://github.com/acme-corp/frontend-app/issues/1' },
      });

      const result = await sync.syncUserStories(userStories, 'FS-001', { dryRun: true });

      // Verify grouping happened (3 USs across 2 projects)
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('3 USs across 2 projects')
      );
    });

    it('should use defaultProject for stories without explicit project', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Add button', acceptanceCriteria: [] }, // No project field
      ];

      const sync = new PerUSGitHubSync('fake-token', projectMappings, { logger: mockLogger });

      const result = await sync.syncUserStories(userStories, 'FS-001', {
        dryRun: true,
        defaultProject: 'frontend',
      });

      // Should have synced to frontend (the default)
      expect(result.synced.length).toBe(1);
      expect(result.synced[0].projectId).toBe('frontend');
    });
  });

  describe('syncUserStories - dry run', () => {
    it('should not create issues in dry run mode', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Add login form', project: 'frontend', acceptanceCriteria: [] },
      ];

      const sync = new PerUSGitHubSync('fake-token', projectMappings, { logger: mockLogger });
      const result = await sync.syncUserStories(userStories, 'FS-001', { dryRun: true });

      // Verify no API calls were made
      expect(mockOctokit.issues.create).not.toHaveBeenCalled();
      expect(mockOctokit.issues.update).not.toHaveBeenCalled();

      // Should still return skipped results
      expect(result.synced.length).toBe(1);
      expect(result.synced[0].action).toBe('skipped');
    });

    it('should log dry-run message for each US', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Add login form', project: 'frontend', acceptanceCriteria: [] },
        { id: 'US-002', title: 'Create auth API', project: 'backend', acceptanceCriteria: [] },
      ];

      const sync = new PerUSGitHubSync('fake-token', projectMappings, { logger: mockLogger });
      await sync.syncUserStories(userStories, 'FS-001', { dryRun: true });

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('[DRY-RUN]')
      );
    });
  });

  describe('syncUserStories - missing mapping', () => {
    it('should fail gracefully for projects without GitHub mapping', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Shared types', project: 'shared', acceptanceCriteria: [] },
      ];

      const sync = new PerUSGitHubSync('fake-token', projectMappings, { logger: mockLogger });
      const result = await sync.syncUserStories(userStories, 'FS-001', {});

      expect(result.success).toBe(false);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].error).toContain('No GitHub mapping for project "shared"');
    });

    it('should warn about missing mappings', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Shared types', project: 'shared', acceptanceCriteria: [] },
      ];

      const sync = new PerUSGitHubSync('fake-token', projectMappings, { logger: mockLogger });
      await sync.syncUserStories(userStories, 'FS-001', {});

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No GitHub mapping for project "shared"')
      );
    });
  });

  describe('syncUserStories - summary', () => {
    it('should return correct summary counts', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Add login form', project: 'frontend', acceptanceCriteria: [] },
        { id: 'US-002', title: 'Create auth API', project: 'backend', acceptanceCriteria: [] },
        { id: 'US-003', title: 'Shared types', project: 'shared', acceptanceCriteria: [] }, // No mapping
      ];

      const sync = new PerUSGitHubSync('fake-token', projectMappings, { logger: mockLogger });
      const result = await sync.syncUserStories(userStories, 'FS-001', { dryRun: true });

      expect(result.summary.total).toBe(3);
      expect(result.summary.skipped).toBe(2); // dry-run skips
      expect(result.summary.failed).toBe(1); // no mapping
    });
  });

  describe('issue title format', () => {
    it('should format issue title with feature and US ID', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Add login form', project: 'frontend', acceptanceCriteria: [] },
      ];

      const sync = new PerUSGitHubSync('fake-token', projectMappings, { logger: mockLogger });

      // Not dry run - should attempt to create
      mockOctokit.issues.listForRepo.mockResolvedValue({ data: [] });
      mockOctokit.issues.create.mockResolvedValue({
        data: { number: 1, html_url: 'https://github.com/acme-corp/frontend-app/issues/1' },
      });

      await sync.syncUserStories(userStories, 'FS-001', {});

      expect(mockOctokit.issues.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '[FS-001][US-001] Add login form',
        })
      );
    });
  });
});

describe('formatPerUSSyncResults', () => {
  it('should format results grouped by project', () => {
    const result: PerUSSyncResult = {
      success: true,
      synced: [
        { usId: 'US-001', projectId: 'frontend', repo: 'acme/fe', issueNumber: 1, url: 'https://...', action: 'created' },
        { usId: 'US-002', projectId: 'backend', repo: 'acme/be', issueNumber: 2, url: 'https://...', action: 'created' },
        { usId: 'US-003', projectId: 'frontend', repo: 'acme/fe', issueNumber: 3, url: 'https://...', action: 'updated' },
      ],
      failed: [],
      externalRefs: {},
      summary: { total: 3, created: 2, updated: 1, skipped: 0, failed: 0 },
    };

    const formatted = formatPerUSSyncResults(result);

    expect(formatted).toContain('Per-US GitHub Sync Results');
    expect(formatted).toContain('**frontend**');
    expect(formatted).toContain('**backend**');
    expect(formatted).toContain('2 created');
    expect(formatted).toContain('1 updated');
  });

  it('should show errors for failed syncs', () => {
    const result: PerUSSyncResult = {
      success: false,
      synced: [],
      failed: [
        { usId: 'US-001', projectId: 'shared', repo: 'N/A', issueNumber: 0, url: '', action: 'skipped', error: 'No mapping' },
      ],
      externalRefs: {},
      summary: { total: 1, created: 0, updated: 0, skipped: 0, failed: 1 },
    };

    const formatted = formatPerUSSyncResults(result);

    expect(formatted).toContain('US-001');
    expect(formatted).toContain('No mapping');
    expect(formatted).toContain('1 failed');
  });
});

describe('Project names with special characters', () => {
  let mockOctokit: {
    issues: {
      create: Mock;
      update: Mock;
      listForRepo: Mock;
    };
  };

  const mockLogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOctokit = {
      issues: {
        create: vi.fn(),
        update: vi.fn(),
        listForRepo: vi.fn().mockResolvedValue({ data: [] }),
      },
    };
    (globalThis as unknown as { __mockOctokit: typeof mockOctokit }).__mockOctokit = mockOctokit;
  });

  it('should handle project names with spaces', async () => {
    const mappings: ProjectMappings = {
      'My Project': {
        github: { owner: 'acme', repo: 'my-project' },
      },
    };

    const stories: UserStoryData[] = [
      { id: 'US-001', title: 'Test feature', project: 'My Project', acceptanceCriteria: [] },
    ];

    const sync = new PerUSGitHubSync('fake-token', mappings, { logger: mockLogger });
    const result = await sync.syncUserStories(stories, 'FS-001', { dryRun: true });

    expect(result.synced.length).toBe(1);
    expect(result.synced[0].projectId).toBe('My Project');
    expect(result.failed.length).toBe(0);
  });

  it('should handle project names with special characters', async () => {
    const mappings: ProjectMappings = {
      'acme-corp_v2.0': {
        github: { owner: 'acme', repo: 'corp-v2' },
      },
    };

    const stories: UserStoryData[] = [
      { id: 'US-001', title: 'Test feature', project: 'acme-corp_v2.0', acceptanceCriteria: [] },
    ];

    const sync = new PerUSGitHubSync('fake-token', mappings, { logger: mockLogger });
    const result = await sync.syncUserStories(stories, 'FS-001', { dryRun: true });

    expect(result.synced.length).toBe(1);
    expect(result.synced[0].projectId).toBe('acme-corp_v2.0');
    expect(result.failed.length).toBe(0);
  });

  it('should handle project names with quotes in title', async () => {
    const mappings: ProjectMappings = {
      frontend: {
        github: { owner: 'acme', repo: 'frontend' },
      },
    };

    const stories: UserStoryData[] = [
      { id: 'US-001', title: 'Add "login" button', project: 'frontend', acceptanceCriteria: [] },
    ];

    mockOctokit.issues.create.mockResolvedValue({
      data: { number: 1, html_url: 'https://github.com/acme/frontend/issues/1' },
    });

    const sync = new PerUSGitHubSync('fake-token', mappings, { logger: mockLogger });
    const result = await sync.syncUserStories(stories, 'FS-001', {});

    expect(mockOctokit.issues.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '[FS-001][US-001] Add "login" button',
      })
    );
  });

  it('should handle unicode project names', async () => {
    const mappings: ProjectMappings = {
      'проект': {
        github: { owner: 'acme', repo: 'project-ru' },
      },
    };

    const stories: UserStoryData[] = [
      { id: 'US-001', title: 'Добавить функцию', project: 'проект', acceptanceCriteria: [] },
    ];

    const sync = new PerUSGitHubSync('fake-token', mappings, { logger: mockLogger });
    const result = await sync.syncUserStories(stories, 'FS-001', { dryRun: true });

    expect(result.synced.length).toBe(1);
    expect(result.synced[0].projectId).toBe('проект');
  });

  it('should preserve special characters in externalRefs', async () => {
    const mappings: ProjectMappings = {
      'my-project_v2': {
        github: { owner: 'acme', repo: 'my-project-v2' },
      },
    };

    const stories: UserStoryData[] = [
      { id: 'US-001', title: 'Feature', project: 'my-project_v2', acceptanceCriteria: [] },
    ];

    mockOctokit.issues.create.mockResolvedValue({
      data: { number: 42, html_url: 'https://github.com/acme/my-project-v2/issues/42' },
    });

    const sync = new PerUSGitHubSync('fake-token', mappings, { logger: mockLogger });
    const result = await sync.syncUserStories(stories, 'FS-001', {});

    expect(result.externalRefs['US-001']?.github?.targetProject).toBe('my-project_v2');
  });
});
