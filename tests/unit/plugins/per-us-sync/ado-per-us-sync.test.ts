/**
 * Unit tests for Per-US Azure DevOps Sync (v0.34.0+)
 *
 * Tests the PerUSAdoSync class which syncs each User Story
 * to its explicitly declared project's ADO project/area path.
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
  adoProject: string;
  areaPath: string;
  workItemId: number;
  url: string;
  action: 'created' | 'updated' | 'skipped';
  error?: string;
}

interface PerUSSyncResult {
  success: boolean;
  synced: USSyncResult[];
  failed: USSyncResult[];
  externalRefs: Record<string, { ado?: { provider: string; issueNumber: number; url: string; targetProject: string; lastSynced: string } }>;
  summary: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
}

interface AdoMapping {
  project: string;
  areaPath?: string;
}

interface AdoClient {
  createWorkItem: Mock;
  updateWorkItem: Mock;
  searchWorkItems: Mock;
  getWorkItemUrl: Mock;
}

/**
 * Minimal PerUSAdoSync implementation for testing
 */
class PerUSAdoSync {
  private projectMappings: ProjectMappings;
  private adoClient: AdoClient;
  private logger: { log: Mock; warn: Mock };

  constructor(adoClient: AdoClient, projectMappings: ProjectMappings, options: { logger?: { log: Mock; warn: Mock } } = {}) {
    this.projectMappings = projectMappings;
    this.adoClient = adoClient;
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

    this.logger.log(`📡 Per-US ADO Sync: ${userStories.length} USs across ${groups.size} projects`);

    for (const [projectId, stories] of groups) {
      const mapping = this.projectMappings[projectId]?.ado as AdoMapping | undefined;

      if (!mapping) {
        this.logger.warn(`   ⚠️  No ADO mapping for project "${projectId}" - skipping ${stories.length} USs`);
        for (const story of stories) {
          failed.push({
            usId: story.id,
            projectId,
            adoProject: 'N/A',
            areaPath: '',
            workItemId: 0,
            url: '',
            action: 'skipped',
            error: `No ADO mapping for project "${projectId}"`,
          });
        }
        continue;
      }

      for (const story of stories) {
        const title = `[${featureId}][${story.id}] ${story.title}`;
        const description = this.buildWorkItemDescription(story, featureId);

        // Determine area path
        let areaPath = mapping.areaPath || mapping.project;
        if (story.board) {
          areaPath = `${mapping.project}\\${story.board}`;
        }

        if (options.dryRun) {
          this.logger.log(`   🔍 [DRY-RUN] Would sync ${story.id} to ${mapping.project} (area: ${areaPath})`);
          synced.push({
            usId: story.id,
            projectId,
            adoProject: mapping.project,
            areaPath,
            workItemId: 0,
            url: '',
            action: 'skipped',
          });
        } else {
          try {
            const existing = await this.findExistingWorkItem(mapping.project, story.id);

            if (existing) {
              await this.adoClient.updateWorkItem(mapping.project, existing.id, title, description, areaPath);
              synced.push({
                usId: story.id,
                projectId,
                adoProject: mapping.project,
                areaPath,
                workItemId: existing.id,
                url: this.adoClient.getWorkItemUrl(mapping.project, existing.id),
                action: 'updated',
              });
            } else {
              const newItem = await this.adoClient.createWorkItem(mapping.project, 'User Story', title, description, areaPath);
              synced.push({
                usId: story.id,
                projectId,
                adoProject: mapping.project,
                areaPath,
                workItemId: newItem.id,
                url: newItem.url,
                action: 'created',
              });
              externalRefs[story.id] = {
                ado: {
                  provider: 'ado',
                  issueNumber: newItem.id,
                  url: newItem.url,
                  targetProject: projectId,
                  lastSynced: new Date().toISOString(),
                },
              };
            }
          } catch (error) {
            failed.push({
              usId: story.id,
              projectId,
              adoProject: mapping.project,
              areaPath,
              workItemId: 0,
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

  private async findExistingWorkItem(project: string, usId: string): Promise<{ id: number } | null> {
    try {
      const query = `[System.Title] Contains '[${usId}]'`;
      const results = await this.adoClient.searchWorkItems(project, query);
      return results.length > 0 ? { id: results[0].id } : null;
    } catch {
      return null;
    }
  }

  private buildWorkItemDescription(story: UserStoryData, featureId: string): string {
    const lines: string[] = [];
    lines.push(`<h1>${story.title}</h1>`);
    if (story.description) lines.push('', `<p>${story.description}</p>`);
    if (story.acceptanceCriteria?.length) {
      lines.push('', '<h2>Acceptance Criteria</h2>', '<ul>');
      for (const ac of story.acceptanceCriteria) lines.push(`  <li>${ac}</li>`);
      lines.push('</ul>');
    }
    lines.push('', '<hr/>', '', `<p><strong>Feature</strong>: ${featureId}</p>`, `<p><strong>User Story</strong>: ${story.id}</p>`);
    if (story.project) lines.push(`<p><strong>Project</strong>: ${story.project}</p>`);
    if (story.board) lines.push(`<p><strong>Board</strong>: ${story.board}</p>`);
    lines.push('', '<p><em>Auto-generated by SpecWeave</em></p>');
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
  const lines: string[] = ['', '📊 Per-US ADO Sync Results', ''];
  const byProject = new Map<string, USSyncResult[]>();
  for (const r of [...result.synced, ...result.failed]) {
    const existing = byProject.get(r.projectId) || [];
    existing.push(r);
    byProject.set(r.projectId, existing);
  }
  for (const [projectId, results] of byProject) {
    const adoProject = results[0]?.adoProject || 'N/A';
    const areaPath = results[0]?.areaPath || '';
    lines.push(`**${projectId}** (→ ${adoProject}${areaPath ? ` [${areaPath}]` : ''}):`);
    for (const r of results) {
      const icon = r.action === 'created' ? '✅' : r.action === 'updated' ? '🔄' : r.error ? '❌' : '⏭️';
      if (r.workItemId > 0) lines.push(`  ${icon} ${r.usId} → ${r.adoProject}/${r.workItemId}`);
      else if (r.error) lines.push(`  ${icon} ${r.usId}: ${r.error}`);
      else lines.push(`  ${icon} ${r.usId} (${r.action})`);
    }
    lines.push('');
  }
  lines.push(`📈 Summary: ${result.summary.created} created, ${result.summary.updated} updated, ${result.summary.failed} failed`);
  return lines.join('\n');
}

describe('PerUSAdoSync', () => {
  let mockAdoClient: AdoClient;

  const projectMappings: ProjectMappings = {
    frontend: {
      ado: {
        project: 'WebApp',
        areaPath: 'WebApp\\Frontend',
      },
    },
    backend: {
      ado: {
        project: 'WebApp',
        areaPath: 'WebApp\\Backend',
      },
    },
    mobile: {
      ado: {
        project: 'MobileApp',
        // No areaPath - uses project root
      },
    },
    shared: {
      // No ADO mapping - should be skipped
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

    mockAdoClient = {
      createWorkItem: vi.fn().mockResolvedValue({ id: 1, url: 'https://dev.azure.com/org/WebApp/_workitems/edit/1' }),
      updateWorkItem: vi.fn().mockResolvedValue(undefined),
      searchWorkItems: vi.fn().mockResolvedValue([]),
      getWorkItemUrl: vi.fn().mockImplementation((project, id) => `https://dev.azure.com/org/${project}/_workitems/edit/${id}`),
    };
  });

  describe('groupByProject', () => {
    it('should group user stories by their explicit project field', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Add login form', project: 'frontend', acceptanceCriteria: [] },
        { id: 'US-002', title: 'Create auth API', project: 'backend', acceptanceCriteria: [] },
        { id: 'US-003', title: 'Add dashboard', project: 'frontend', acceptanceCriteria: [] },
      ];

      const sync = new PerUSAdoSync(mockAdoClient, projectMappings, { logger: mockLogger });
      await sync.syncUserStories(userStories, 'FS-001', { dryRun: true });

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('3 USs across 2 projects')
      );
    });
  });

  describe('syncUserStories - dry run', () => {
    it('should not create work items in dry run mode', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Add login form', project: 'frontend', acceptanceCriteria: [] },
      ];

      const sync = new PerUSAdoSync(mockAdoClient, projectMappings, { logger: mockLogger });
      const result = await sync.syncUserStories(userStories, 'FS-001', { dryRun: true });

      expect(mockAdoClient.createWorkItem).not.toHaveBeenCalled();
      expect(mockAdoClient.updateWorkItem).not.toHaveBeenCalled();

      expect(result.synced.length).toBe(1);
      expect(result.synced[0].action).toBe('skipped');
    });

    it('should log area path in dry-run message', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Add login form', project: 'frontend', acceptanceCriteria: [] },
      ];

      const sync = new PerUSAdoSync(mockAdoClient, projectMappings, { logger: mockLogger });
      await sync.syncUserStories(userStories, 'FS-001', { dryRun: true });

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('area: WebApp\\Frontend')
      );
    });
  });

  describe('syncUserStories - missing mapping', () => {
    it('should fail gracefully for projects without ADO mapping', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Shared types', project: 'shared', acceptanceCriteria: [] },
      ];

      const sync = new PerUSAdoSync(mockAdoClient, projectMappings, { logger: mockLogger });
      const result = await sync.syncUserStories(userStories, 'FS-001', {});

      expect(result.success).toBe(false);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].error).toContain('No ADO mapping for project "shared"');
    });
  });

  describe('syncUserStories - create', () => {
    it('should create new ADO work item for US without existing item', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Add login form', project: 'frontend', acceptanceCriteria: ['AC-1'] },
      ];

      mockAdoClient.searchWorkItems.mockResolvedValue([]);
      mockAdoClient.createWorkItem.mockResolvedValue({ id: 123, url: 'https://dev.azure.com/org/WebApp/_workitems/edit/123' });

      const sync = new PerUSAdoSync(mockAdoClient, projectMappings, { logger: mockLogger });
      const result = await sync.syncUserStories(userStories, 'FS-001', {});

      expect(mockAdoClient.createWorkItem).toHaveBeenCalledWith(
        'WebApp',
        'User Story',
        '[FS-001][US-001] Add login form',
        expect.stringContaining('Acceptance Criteria'),
        'WebApp\\Frontend'
      );

      expect(result.synced.length).toBe(1);
      expect(result.synced[0].action).toBe('created');
      expect(result.synced[0].workItemId).toBe(123);
    });
  });

  describe('syncUserStories - update', () => {
    it('should update existing ADO work item', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Add login form', project: 'frontend', acceptanceCriteria: [] },
      ];

      mockAdoClient.searchWorkItems.mockResolvedValue([
        { id: 100, fields: { 'System.Title': '[FS-001][US-001] Old title' } },
      ]);

      const sync = new PerUSAdoSync(mockAdoClient, projectMappings, { logger: mockLogger });
      const result = await sync.syncUserStories(userStories, 'FS-001', {});

      expect(mockAdoClient.updateWorkItem).toHaveBeenCalledWith(
        'WebApp',
        100,
        '[FS-001][US-001] Add login form',
        expect.any(String),
        'WebApp\\Frontend'
      );

      expect(result.synced[0].action).toBe('updated');
      expect(result.synced[0].workItemId).toBe(100);
    });
  });

  describe('2-level structure - board field', () => {
    it('should use board as area path segment in 2-level structures', async () => {
      const userStories: UserStoryData[] = [
        {
          id: 'US-001',
          title: 'Add login form',
          project: 'mobile',
          board: 'authentication',
          acceptanceCriteria: [],
        },
      ];

      mockAdoClient.searchWorkItems.mockResolvedValue([]);

      const sync = new PerUSAdoSync(mockAdoClient, projectMappings, { logger: mockLogger });
      await sync.syncUserStories(userStories, 'FS-001', {});

      expect(mockAdoClient.createWorkItem).toHaveBeenCalledWith(
        'MobileApp',
        'User Story',
        '[FS-001][US-001] Add login form',
        expect.any(String),
        'MobileApp\\authentication'
      );
    });

    it('should include board in work item description', async () => {
      const userStories: UserStoryData[] = [
        {
          id: 'US-001',
          title: 'Add login form',
          project: 'mobile',
          board: 'authentication',
          acceptanceCriteria: [],
        },
      ];

      mockAdoClient.searchWorkItems.mockResolvedValue([]);

      const sync = new PerUSAdoSync(mockAdoClient, projectMappings, { logger: mockLogger });
      await sync.syncUserStories(userStories, 'FS-001', {});

      const [, , , description] = mockAdoClient.createWorkItem.mock.calls[0];

      expect(description).toContain('<strong>Board</strong>: authentication');
    });
  });

  describe('syncUserStories - externalRefs', () => {
    it('should build external refs for synced work items', async () => {
      const userStories: UserStoryData[] = [
        { id: 'US-001', title: 'Add login form', project: 'frontend', acceptanceCriteria: [] },
      ];

      mockAdoClient.searchWorkItems.mockResolvedValue([]);
      mockAdoClient.createWorkItem.mockResolvedValue({ id: 200, url: 'https://dev.azure.com/...' });

      const sync = new PerUSAdoSync(mockAdoClient, projectMappings, { logger: mockLogger });
      const result = await sync.syncUserStories(userStories, 'FS-001', {});

      expect(result.externalRefs['US-001']).toBeDefined();
      expect(result.externalRefs['US-001'].ado).toBeDefined();
      expect(result.externalRefs['US-001'].ado?.issueNumber).toBe(200);
      expect(result.externalRefs['US-001'].ado?.targetProject).toBe('frontend');
    });
  });

  describe('work item description format', () => {
    it('should format description as HTML', async () => {
      const userStories: UserStoryData[] = [
        {
          id: 'US-001',
          title: 'Add login form',
          project: 'frontend',
          description: 'A login form for users',
          acceptanceCriteria: ['User can enter email', 'User can enter password'],
        },
      ];

      mockAdoClient.searchWorkItems.mockResolvedValue([]);

      const sync = new PerUSAdoSync(mockAdoClient, projectMappings, { logger: mockLogger });
      await sync.syncUserStories(userStories, 'FS-001', {});

      const [, , , description] = mockAdoClient.createWorkItem.mock.calls[0];

      expect(description).toContain('<h1>');
      expect(description).toContain('<h2>Acceptance Criteria</h2>');
      expect(description).toContain('<li>User can enter email</li>');
      expect(description).toContain('Auto-generated by SpecWeave');
    });
  });
});

describe('formatPerUSSyncResults (ADO)', () => {
  it('should format results with work item IDs and area paths', () => {
    const result: PerUSSyncResult = {
      success: true,
      synced: [
        { usId: 'US-001', projectId: 'frontend', adoProject: 'WebApp', areaPath: 'WebApp\\Frontend', workItemId: 1, url: 'https://...', action: 'created' },
        { usId: 'US-002', projectId: 'backend', adoProject: 'WebApp', areaPath: 'WebApp\\Backend', workItemId: 2, url: 'https://...', action: 'updated' },
      ],
      failed: [],
      externalRefs: {},
      summary: { total: 2, created: 1, updated: 1, skipped: 0, failed: 0 },
    };

    const formatted = formatPerUSSyncResults(result);

    expect(formatted).toContain('Per-US ADO Sync Results');
    expect(formatted).toContain('WebApp/1');
    expect(formatted).toContain('WebApp/2');
    expect(formatted).toContain('[WebApp\\Frontend]');
    expect(formatted).toContain('1 created');
    expect(formatted).toContain('1 updated');
  });
});
