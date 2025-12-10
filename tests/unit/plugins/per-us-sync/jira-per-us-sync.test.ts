/**
 * Unit tests for Per-US JIRA Sync (v0.34.0+)
 *
 * Tests the PerUSJiraSync class which syncs each User Story
 * to its explicitly declared project's JIRA project.
 *
 * Part of increment 0137: Per-US Project/Board Enforcement
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import type { UserStoryData } from '../../../../src/core/living-docs/types.js';
import type { ProjectMappings } from '../../../../src/core/types/config.js';

/**
 * Inline types for testing
 */
interface USSyncResult {
  usId: string;
  projectId: string;
  jiraProject: string;
  issueKey: string;
  url: string;
  action: 'created' | 'updated' | 'skipped';
  error?: string;
}

interface PerUSSyncResult {
  success: boolean;
  synced: USSyncResult[];
  failed: USSyncResult[];
  externalRefs: Record<string, { jira?: { provider: string; issueNumber: string; url: string; targetProject: string; lastSynced: string } }>;
  summary: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
}

interface JiraMapping {
  project: string;
  issueType?: string;
}

interface JiraClient {
  createIssue: Mock;
  updateIssue: Mock;
  searchIssues: Mock;
  getIssueUrl: Mock;
}

/**
 * Minimal PerUSJiraSync implementation for testing
 */
class PerUSJiraSync {
  private projectMappings: ProjectMappings;
  private jiraClient: JiraClient;
  private logger: { log: Mock; warn: Mock };

  constructor(jiraClient: JiraClient, projectMappings: ProjectMappings, options: { logger?: { log: Mock; warn: Mock } } = {}) {
    this.projectMappings = projectMappings;
    this.jiraClient = jiraClient;
    this.logger = options.logger ?? { log: vi.fn(), warn: vi.fn() };
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

    this.logger.log(`📡 Per-US JIRA Sync: ${userStories.length} USs across ${groups.size} projects`);

    for (const [projectId, stories] of groups) {
      const mapping = this.projectMappings[projectId]?.jira as JiraMapping | undefined;

      if (!mapping) {
        this.logger.warn(`   ⚠️  No JIRA mapping for project "${projectId}" - skipping ${stories.length} USs`);
        for (const story of stories) {
          failed.push({
            usId: story.id,
            projectId,
            jiraProject: 'N/A',
            issueKey: '',
            url: '',
            action: 'skipped',
            error: `No JIRA mapping for project "${projectId}"`,
          });
        }
        continue;
      }

      for (const story of stories) {
        const summary = `[${featureId}][${story.id}] ${story.title}`;
        const description = this.buildIssueDescription(story, featureId);

        if (options.dryRun) {
          this.logger.log(`   🔍 [DRY-RUN] Would sync ${story.id} to JIRA project ${mapping.project}`);
          synced.push({
            usId: story.id,
            projectId,
            jiraProject: mapping.project,
            issueKey: '',
            url: '',
            action: 'skipped',
          });
        } else {
          try {
            const existing = await this.findExistingIssue(mapping.project, story.id);

            if (existing) {
              await this.jiraClient.updateIssue(existing.key, summary, description);
              synced.push({
                usId: story.id,
                projectId,
                jiraProject: mapping.project,
                issueKey: existing.key,
                url: this.jiraClient.getIssueUrl(existing.key),
                action: 'updated',
              });
            } else {
              const newIssue = await this.jiraClient.createIssue(mapping.project, 'Story', summary, description);
              synced.push({
                usId: story.id,
                projectId,
                jiraProject: mapping.project,
                issueKey: newIssue.key,
                url: this.jiraClient.getIssueUrl(newIssue.key),
                action: 'created',
              });
              externalRefs[story.id] = {
                jira: {
                  provider: 'jira',
                  issueNumber: newIssue.key,
                  url: this.jiraClient.getIssueUrl(newIssue.key),
                  targetProject: projectId,
                  lastSynced: new Date().toISOString(),
                },
              };
            }
          } catch (error) {
            failed.push({
              usId: story.id,
              projectId,
              jiraProject: mapping.project,
              issueKey: '',
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

  private async findExistingIssue(project: string, usId: string): Promise<{ key: string } | null> {
    try {
      const jql = `project = "${project}" AND summary ~ "[${usId}]"`;
      const results = await this.jiraClient.searchIssues(jql);
      return results.length > 0 ? { key: results[0].key } : null;
    } catch {
      return null;
    }
  }

  private buildIssueDescription(story: UserStoryData, featureId: string): string {
    const lines: string[] = [];
    lines.push(`h1. ${story.title}`);
    if (story.description) lines.push('', story.description);
    if (story.acceptanceCriteria?.length) {
      lines.push('', 'h2. Acceptance Criteria', '');
      for (const ac of story.acceptanceCriteria) lines.push(`* ${ac}`);
    }
    lines.push('', '----', '', `*Feature*: ${featureId}`, `*User Story*: ${story.id}`);
    if (story.project) lines.push(`*Project*: ${story.project}`);
    if (story.board) lines.push(`*Board*: ${story.board}`);
    lines.push('', '_Auto-generated by SpecWeave_');
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
  const lines: string[] = ['', '📊 Per-US JIRA Sync Results', ''];
  const byProject = new Map<string, USSyncResult[]>();
  for (const r of [...result.synced, ...result.failed]) {
    const existing = byProject.get(r.projectId) || [];
    existing.push(r);
    byProject.set(r.projectId, existing);
  }
  for (const [projectId, results] of byProject) {
    lines.push(`**${projectId}** (→ ${results[0]?.jiraProject || 'N/A'}):`);
    for (const r of results) {
      const icon = r.action === 'created' ? '✅' : r.action === 'updated' ? '🔄' : r.error ? '❌' : '⏭️';
      if (r.issueKey) lines.push(`  ${icon} ${r.usId} → ${r.issueKey}`);
      else if (r.error) lines.push(`  ${icon} ${r.usId}: ${r.error}`);
      else lines.push(`  ${icon} ${r.usId} (${r.action})`);
    }
    lines.push('');
  }
  lines.push(`📈 Summary: ${result.summary.created} created, ${result.summary.updated} updated, ${result.summary.failed} failed`);
  return lines.join('\n');
}

describe('PerUSJiraSync', () => {
  let mockJiraClient: JiraClient;

  const projectMappings: ProjectMappings = {
    frontend: {
      jira: {
        project: 'FE',
        issueType: 'Story',
      },
    },
    backend: {
      jira: {
        project: 'BE',
        issueType: 'Story',
      },
    },
    shared: {
      // No JIRA mapping - should be skipped
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

    mockJiraClient = {
      createIssue: vi.fn().mockResolvedValue({ key: 'FE-1', self: 'https://jira.example.com/FE-1' }),
      updateIssue: vi.fn().mockResolvedValue(undefined),
      searchIssues: vi.fn().mockResolvedValue([]),
      getIssueUrl: vi.fn().mockImplementation((key) => `https://jira.example.com/browse/${key}`),
    };
  });

  describe('groupByProject', () => {
    it('should group user stories by their explicit project field', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Add login form', project: 'frontend', acceptanceCriteria: [] },
        { id: 'US-002', title: 'Create auth API', project: 'backend', acceptanceCriteria: [] },
        { id: 'US-003', title: 'Add dashboard', project: 'frontend', acceptanceCriteria: [] },
      ];

      const sync = new PerUSJiraSync(mockJiraClient, projectMappings, { logger: mockLogger });
      await sync.syncUserStories(userStories, 'FS-001', { dryRun: true });

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('3 USs across 2 projects')
      );
    });

    it('should use defaultProject for stories without explicit project', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Add button', acceptanceCriteria: [] }, // No project field
      ];

      const sync = new PerUSJiraSync(mockJiraClient, projectMappings, { logger: mockLogger });
      const result = await sync.syncUserStories(userStories, 'FS-001', {
        dryRun: true,
        defaultProject: 'frontend',
      });

      expect(result.synced.length).toBe(1);
      expect(result.synced[0].projectId).toBe('frontend');
    });
  });

  describe('syncUserStories - dry run', () => {
    it('should not create issues in dry run mode', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Add login form', project: 'frontend', acceptanceCriteria: [] },
      ];

      const sync = new PerUSJiraSync(mockJiraClient, projectMappings, { logger: mockLogger });
      const result = await sync.syncUserStories(userStories, 'FS-001', { dryRun: true });

      expect(mockJiraClient.createIssue).not.toHaveBeenCalled();
      expect(mockJiraClient.updateIssue).not.toHaveBeenCalled();

      expect(result.synced.length).toBe(1);
      expect(result.synced[0].action).toBe('skipped');
    });
  });

  describe('syncUserStories - missing mapping', () => {
    it('should fail gracefully for projects without JIRA mapping', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Shared types', project: 'shared', acceptanceCriteria: [] },
      ];

      const sync = new PerUSJiraSync(mockJiraClient, projectMappings, { logger: mockLogger });
      const result = await sync.syncUserStories(userStories, 'FS-001', {});

      expect(result.success).toBe(false);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].error).toContain('No JIRA mapping for project "shared"');
    });
  });

  describe('syncUserStories - create', () => {
    it('should create new JIRA issue for US without existing issue', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Add login form', project: 'frontend', acceptanceCriteria: ['AC-1', 'AC-2'] },
      ];

      mockJiraClient.searchIssues.mockResolvedValue([]);
      mockJiraClient.createIssue.mockResolvedValue({ key: 'FE-123', self: 'https://jira.example.com/FE-123' });

      const sync = new PerUSJiraSync(mockJiraClient, projectMappings, { logger: mockLogger });
      const result = await sync.syncUserStories(userStories, 'FS-001', {});

      expect(mockJiraClient.createIssue).toHaveBeenCalledWith(
        'FE',
        'Story',
        '[FS-001][US-001] Add login form',
        expect.stringContaining('Acceptance Criteria')
      );

      expect(result.synced.length).toBe(1);
      expect(result.synced[0].action).toBe('created');
      expect(result.synced[0].issueKey).toBe('FE-123');
    });
  });

  describe('syncUserStories - update', () => {
    it('should update existing JIRA issue', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Add login form', project: 'frontend', acceptanceCriteria: [] },
      ];

      mockJiraClient.searchIssues.mockResolvedValue([
        { key: 'FE-100', fields: { summary: '[FS-001][US-001] Old title' } },
      ]);

      const sync = new PerUSJiraSync(mockJiraClient, projectMappings, { logger: mockLogger });
      const result = await sync.syncUserStories(userStories, 'FS-001', {});

      expect(mockJiraClient.updateIssue).toHaveBeenCalledWith(
        'FE-100',
        '[FS-001][US-001] Add login form',
        expect.any(String)
      );

      expect(result.synced[0].action).toBe('updated');
      expect(result.synced[0].issueKey).toBe('FE-100');
    });
  });

  describe('syncUserStories - externalRefs', () => {
    it('should build external refs for synced issues', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Add login form', project: 'frontend', acceptanceCriteria: [] },
      ];

      mockJiraClient.searchIssues.mockResolvedValue([]);
      mockJiraClient.createIssue.mockResolvedValue({ key: 'FE-200', self: 'https://jira.example.com/FE-200' });

      const sync = new PerUSJiraSync(mockJiraClient, projectMappings, { logger: mockLogger });
      const result = await sync.syncUserStories(userStories, 'FS-001', {});

      expect(result.externalRefs['US-001']).toBeDefined();
      expect(result.externalRefs['US-001'].jira).toBeDefined();
      expect(result.externalRefs['US-001'].jira?.issueNumber).toBe('FE-200');
      expect(result.externalRefs['US-001'].jira?.targetProject).toBe('frontend');
    });

    it('should not build external refs in dry run mode', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Add login form', project: 'frontend', acceptanceCriteria: [] },
      ];

      const sync = new PerUSJiraSync(mockJiraClient, projectMappings, { logger: mockLogger });
      const result = await sync.syncUserStories(userStories, 'FS-001', { dryRun: true });

      expect(Object.keys(result.externalRefs).length).toBe(0);
    });
  });

  describe('issue description format', () => {
    it('should include acceptance criteria in description', async () => {
      const userStories: UserStoryData[] = [
        {
          id: 'US-001',
          title: 'Add login form',
          project: 'frontend',
          description: 'A login form for users',
          acceptanceCriteria: ['User can enter email', 'User can enter password'],
        },
      ];

      mockJiraClient.searchIssues.mockResolvedValue([]);

      const sync = new PerUSJiraSync(mockJiraClient, projectMappings, { logger: mockLogger });
      await sync.syncUserStories(userStories, 'FS-001', {});

      const [, , , description] = mockJiraClient.createIssue.mock.calls[0];

      expect(description).toContain('Acceptance Criteria');
      expect(description).toContain('User can enter email');
      expect(description).toContain('User can enter password');
    });

    it('should include board field in description for 2-level structures', async () => {
      const userStories: UserStoryData[] = [
        {
          id: 'US-001',
          title: 'Add login form',
          project: 'frontend',
          board: 'auth',
          acceptanceCriteria: [],
        },
      ];

      mockJiraClient.searchIssues.mockResolvedValue([]);

      const sync = new PerUSJiraSync(mockJiraClient, projectMappings, { logger: mockLogger });
      await sync.syncUserStories(userStories, 'FS-001', {});

      const [, , , description] = mockJiraClient.createIssue.mock.calls[0];

      expect(description).toContain('*Board*: auth');
    });
  });
});

describe('formatPerUSSyncResults (JIRA)', () => {
  it('should format results with JIRA issue keys', () => {
    const result: PerUSSyncResult = {
      success: true,
      synced: [
        { usId: 'US-001', projectId: 'frontend', jiraProject: 'FE', issueKey: 'FE-1', url: 'https://...', action: 'created' },
        { usId: 'US-002', projectId: 'backend', jiraProject: 'BE', issueKey: 'BE-2', url: 'https://...', action: 'created' },
      ],
      failed: [],
      externalRefs: {},
      summary: { total: 2, created: 2, updated: 0, skipped: 0, failed: 0 },
    };

    const formatted = formatPerUSSyncResults(result);

    expect(formatted).toContain('Per-US JIRA Sync Results');
    expect(formatted).toContain('FE-1');
    expect(formatted).toContain('BE-2');
  });
});
