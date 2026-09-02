import * as http from 'http';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Router, sendJson, readBody } from './router.js';
import { SSEManager } from './sse-manager.js';
import { FileWatcher } from './file-watcher.js';
import { CommandRunner } from './command-runner.js';
import { DashboardDataAggregator } from './data/dashboard-data-aggregator.js';
import { ClaudeLogParser } from './data/claude-log-parser.js';
import { PluginScanner } from './data/plugin-scanner.js';
import { SyncAuditReader } from './data/sync-audit-reader.js';
import { ActivityStream } from './data/activity-stream.js';
import { CostAggregator } from './data/cost-aggregator.js';
import { MarketplaceAggregator } from './data/marketplace-aggregator.js';
import { HookEventStore } from './hooks/hook-event-store.js';
import { HookEventRouter } from './hooks/hook-event-router.js';
import { preToolUseHandler } from './hooks/handlers/pre-tool-use.js';
import { createSubagentStartHandler, createSubagentStopHandler } from './hooks/handlers/subagent-lifecycle.js';
import { passthroughHandler } from './hooks/handlers/passthrough.js';
import { createWorkspaceRouteHandlers } from './routes/workspace-routes.js';
import { isPortReachable } from '../../utils/port-reachable.js';
import { hasSpecweaveIncrements, findUmbrellaRoot } from '../../utils/find-project-root.js';
import { SCOPE_PORTS } from '../../utils/docs-preview/types.js';
import type { SSEEventType, ProjectInfo } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DashboardServerOptions {
  port: number;
  projectRoots: string[];
  openBrowser: boolean;
  hooksEnabled?: boolean;
}

export interface DashboardServerInstance {
  url: string;
  port: number;
  stop: () => Promise<void>;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export class DashboardServer {
  private server: http.Server | null = null;
  private router: Router;
  private sseManager: SSEManager;
  private hookEventStore: HookEventStore | null = null;
  private hookEventRouter: HookEventRouter | null = null;
  private pidFilePath: string | null = null;
  private projects = new Map<string, {
    root: string;
    watcher: FileWatcher;
    aggregator: DashboardDataAggregator;
    costAggregator: CostAggregator;
    commandRunner: CommandRunner;
    logParser: ClaudeLogParser;
    pluginScanner: PluginScanner;
    auditReader: SyncAuditReader;
    activityStream: ActivityStream;
    marketplaceAggregator: MarketplaceAggregator;
  }>();

  constructor(private options: DashboardServerOptions) {
    this.sseManager = new SSEManager();
    this.router = new Router();

    // Register initial projects
    for (const root of options.projectRoots) {
      this.addProject(root);
    }

    // Initialize hooks if enabled
    if (options.hooksEnabled && options.projectRoots.length > 0) {
      this.hookEventStore = new HookEventStore(options.projectRoots[0]);
      this.hookEventRouter = new HookEventRouter(this.hookEventStore, options.projectRoots[0]);
      this.pidFilePath = path.join(options.projectRoots[0], '.specweave', 'state', 'hooks', 'server.pid');
      this.registerDefaultHookHandlers();
    }

    this.registerRoutes();
  }

  /** Add a new project to the dashboard */
  addProject(projectRoot: string): ProjectInfo {
    const id = pathToProjectId(projectRoot);
    if (this.projects.has(id)) {
      return this.getProjectInfo(id, projectRoot);
    }

    const aggregator = new DashboardDataAggregator(projectRoot);
    const costAggregator = new CostAggregator(projectRoot);
    const logParser = new ClaudeLogParser(projectRoot);
    const pluginScanner = new PluginScanner(projectRoot);
    const auditReader = new SyncAuditReader(projectRoot);
    const activityStream = new ActivityStream(projectRoot);
    const marketplaceAggregator = new MarketplaceAggregator(projectRoot);
    const commandRunner = new CommandRunner(projectRoot, {
      onOutput: (execId, line, stream) => {
        this.sseManager.broadcast('command-output', { projectId: id, executionId: execId, line, stream });
      },
      onComplete: (execId, exitCode) => {
        this.sseManager.broadcast('command-complete', { projectId: id, executionId: execId, exitCode });
      },
    });
    const watcher = new FileWatcher(projectRoot, (event) => {
      // Invalidate increments cache on increment file changes
      if (event.type === 'increment-update') {
        aggregator.invalidateIncrementsCache();
      }
      this.sseManager.broadcast(event.type, { projectId: id, ...event.data });
      this.sseManager.broadcast('activity', {
        projectId: id,
        category: this.mapEventToCategory(event.type),
        severity: 'info',
        title: `File changed: ${event.type}`,
        ...event.data,
      });
    });

    this.projects.set(id, { root: projectRoot, watcher, aggregator, costAggregator, commandRunner, logParser, pluginScanner, auditReader, activityStream, marketplaceAggregator });
    return this.getProjectInfo(id, projectRoot);
  }

  /** Remove a project from the dashboard */
  removeProject(projectId: string): void {
    const project = this.projects.get(projectId);
    if (project) {
      project.watcher.close();
      project.commandRunner.cancel();
      this.projects.delete(projectId);
    }
  }

  private getProjectInfo(id: string, projectRoot: string): ProjectInfo {
    let name = '';

    // Priority 1: .specweave/config.json project.name
    try {
      const config = JSON.parse(fs.readFileSync(path.join(projectRoot, '.specweave/config.json'), 'utf-8'));
      if (config?.project?.name) name = config.project.name;
    } catch { /* fallthrough */ }

    // Priority 2: package.json name
    if (!name) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
        if (pkg?.name && typeof pkg.name === 'string') name = pkg.name;
      } catch { /* fallthrough */ }
    }

    // Priority 3: directory basename (cleaned up)
    if (!name) {
      name = path.basename(projectRoot);
    }

    return { id, path: projectRoot, name, hasSpecweave: true };
  }

  async start(): Promise<DashboardServerInstance> {
    // Hydrate hook store if hooks enabled
    if (this.hookEventStore) {
      await this.hookEventStore.hydrate();
      this.hookEventStore.cleanup();
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(this.options.port, () => {
        const actualPort = (this.server!.address() as net.AddressInfo)?.port ?? this.options.port;
        const url = `http://localhost:${actualPort}`;

        // Write PID file if hooks enabled
        if (this.pidFilePath) {
          try {
            fs.mkdirSync(path.dirname(this.pidFilePath), { recursive: true });
            fs.writeFileSync(this.pidFilePath, JSON.stringify({
              port: actualPort,
              pid: process.pid,
              startedAt: new Date().toISOString(),
            }));
          } catch {
            // Non-fatal
          }
        }

        resolve({
          url,
          port: actualPort,
          stop: () => this.stop(),
        });
      });
    });
  }

  async stop(): Promise<void> {
    // Flush hook events before shutdown
    if (this.hookEventStore) {
      this.hookEventStore.flush();
    }

    // Delete PID file
    if (this.pidFilePath) {
      try { fs.rmSync(this.pidFilePath, { force: true }); } catch { /* non-fatal */ }
    }

    for (const project of this.projects.values()) {
      project.watcher.close();
      project.commandRunner.cancel();
    }
    this.sseManager.closeAll();
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const url = req.url || '/';

    // CORS preflight — only allow localhost origins
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin || '';
      const headers: Record<string, string> = {
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Vary': 'Origin',
      };
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
      }
      res.writeHead(204, headers);
      res.end();
      return;
    }

    // SSE endpoint
    if (url.startsWith('/api/events') && req.method === 'GET') {
      this.sseManager.addConnection(res);
      return;
    }

    // API routes
    if (url.startsWith('/api/')) {
      const handled = await this.router.handle(req, res);
      if (!handled) {
        sendJson(res, { ok: false, error: 'Not found' }, 404);
      }
      return;
    }

    // Static files
    await this.serveStaticFile(req, res, url);
  }

  /** Resolve project from query string ?project=<id> */
  private resolveProject(req: http.IncomingMessage): {
    aggregator: DashboardDataAggregator;
    costAggregator: CostAggregator;
    commandRunner: CommandRunner;
    logParser: ClaudeLogParser;
    pluginScanner: PluginScanner;
    auditReader: SyncAuditReader;
    activityStream: ActivityStream;
    marketplaceAggregator: MarketplaceAggregator;
    id: string;
    root: string;
  } | null {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const projectId = url.searchParams.get('project');

    const pick = (id: string, p: typeof this.projects extends Map<string, infer V> ? V : never) => ({
      aggregator: p.aggregator,
      costAggregator: p.costAggregator,
      commandRunner: p.commandRunner,
      logParser: p.logParser,
      pluginScanner: p.pluginScanner,
      auditReader: p.auditReader,
      activityStream: p.activityStream,
      marketplaceAggregator: p.marketplaceAggregator,
      id,
      root: p.root,
    });

    if (projectId) {
      const project = this.projects.get(projectId);
      if (project) return pick(projectId, project);
    }

    const first = this.projects.entries().next().value;
    if (first) {
      const [id, project] = first;
      return pick(id, project);
    }

    return null;
  }

  private registerRoutes(): void {
    // === Hook routes (before other routes) ===
    if (this.options.hooksEnabled) {
      this.registerHookRoutes();
    }

    // === Global routes (not project-scoped) ===

    // Health
    this.router.get('/api/health', async (_req, res) => {
      sendJson(res, {
        ok: true,
        uptime: process.uptime(),
        connections: this.sseManager.connectionCount,
        projectCount: this.projects.size,
      });
    });

    // Project management
    this.router.get('/api/projects', async (_req, res) => {
      const projects: ProjectInfo[] = [];
      for (const [id, proj] of this.projects) {
        projects.push(this.getProjectInfo(id, proj.root));
      }
      sendJson(res, { ok: true, data: projects });
    });

    this.router.post('/api/projects', async (req, res) => {
      const body = await readBody(req) as { path?: string };
      if (!body?.path || typeof body.path !== 'string') {
        sendJson(res, { ok: false, error: 'Missing path' }, 400);
        return;
      }
      // Validate: must be an absolute path
      const resolvedPath = path.resolve(body.path);
      if (!path.isAbsolute(resolvedPath)) {
        sendJson(res, { ok: false, error: 'Path must be absolute' }, 400);
        return;
      }
      const specweavePath = path.join(resolvedPath, '.specweave');
      if (!fs.existsSync(specweavePath)) {
        sendJson(res, { ok: false, error: 'Not a SpecWeave project' }, 400);
        return;
      }
      const effectiveRoot = findUmbrellaRoot(resolvedPath) || resolvedPath;
      const info = this.addProject(effectiveRoot);
      sendJson(res, { ok: true, data: info });
    });

    this.router.delete('/api/projects/:id', async (_req, res, params) => {
      this.removeProject(params.id);
      sendJson(res, { ok: true });
    });

    // === Project-scoped routes (use ?project=<id> query param) ===

    // Overview
    this.router.get('/api/overview', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const costData = await project.costAggregator.getTokenSummaries(50);
      const data = await project.aggregator.getOverview(costData);
      // Ensure project name is always set using the resolved project info
      const info = this.getProjectInfo(project.id, project.root);
      data.project.name = data.project.name || info.name;
      sendJson(res, { ok: true, data });
    });

    // Increments (with server-side pagination and filtering)
    this.router.get('/api/increments', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const limit = safeParseInt(url.searchParams.get('limit'), 50, 1, 500);
      const offset = safeParseInt(url.searchParams.get('offset'), 0, 0, 100000);
      const statusFilter = url.searchParams.get('status') || undefined;
      const typeFilter = url.searchParams.get('type') || undefined;

      const fullData = await project.aggregator.getIncrements();

      // Apply filters
      let filtered = fullData.increments;
      if (statusFilter) {
        filtered = filtered.filter(inc => inc.status === statusFilter);
      }
      if (typeFilter) {
        filtered = filtered.filter(inc => inc.type === typeFilter);
      }

      const total = filtered.length;
      const page = filtered.slice(offset, offset + limit);

      sendJson(res, {
        ok: true,
        data: {
          increments: page,
          summary: fullData.summary,
          pagination: { total, limit, offset, hasMore: offset + limit < total },
        },
      });
    });

    // Analytics
    this.router.get('/api/analytics/summary', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const data = await project.aggregator.getAnalyticsSummary();
      sendJson(res, { ok: true, data });
    });

    this.router.get('/api/analytics/skills', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const data = await project.aggregator.getSkillUsage();
      sendJson(res, { ok: true, data });
    });

    // Costs
    this.router.get('/api/costs/summary', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const limit = safeParseInt(url.searchParams.get('limit'), 200, 1, 500);
      const data = await project.costAggregator.getTokenSummaries(limit);

      // Enrich with multi-model spend data if available
      const enriched: Record<string, unknown> = { ...data };
      try {
        const { SpendAggregator } = await import('../../core/cost/spend-aggregator.js');
        const spendDir = path.join(project.root, '.specweave', 'state', 'spend');
        const spendAgg = new SpendAggregator(spendDir);
        enriched.trends = spendAgg.getDailyRollups();
        enriched.providerBreakdown = spendAgg.getProviderBreakdown();
        const budget = spendAgg.getBudgetStatus(undefined);
        if (budget) enriched.budget = budget;
      } catch {
        // Spend tracking not yet initialized — no spend files exist
      }

      sendJson(res, { ok: true, data: enriched });
    });

    // Trends API (standalone endpoint)
    this.router.get('/api/costs/trends', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      try {
        const { SpendAggregator } = await import('../../core/cost/spend-aggregator.js');
        const spendDir = path.join(project.root, '.specweave', 'state', 'spend');
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const days = safeParseInt(url.searchParams.get('days'), 30, 1, 365);
        const from = new Date();
        from.setUTCDate(from.getUTCDate() - days);
        const spendAgg = new SpendAggregator(spendDir);
        const trends = spendAgg.getDailyRollups(from, new Date());
        sendJson(res, { ok: true, data: trends });
      } catch {
        sendJson(res, { ok: true, data: [] });
      }
    });

    // Budget API
    this.router.get('/api/costs/budget', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      try {
        const { SpendAggregator } = await import('../../core/cost/spend-aggregator.js');
        const config = await project.aggregator.getConfig();
        const budgetConfig = (config as any).billing?.budgets;
        const spendDir = path.join(project.root, '.specweave', 'state', 'spend');
        const spendAgg = new SpendAggregator(spendDir);
        const budget = spendAgg.getBudgetStatus(budgetConfig);
        sendJson(res, { ok: true, data: budget });
      } catch {
        sendJson(res, { ok: true, data: null });
      }
    });

    // Sync
    this.router.get('/api/sync/status', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const data = await project.aggregator.getSyncStatus();
      sendJson(res, { ok: true, data });
    });

    // Sync verify — lightweight per-platform connectivity check (supports ?repo= for umbrella child repos)
    this.router.post('/api/sync/verify', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const platform = url.searchParams.get('platform') || '';
      const repoId = url.searchParams.get('repo') || '';
      if (!['github', 'jira', 'ado'].includes(platform)) {
        return sendJson(res, { ok: false, error: 'Invalid platform. Use: github, jira, ado' }, 400);
      }

      try {
        const config = await project.aggregator.getConfig();
        const globalSyncConfig = (config as any)?.sync?.[platform] || {};

        // For child repos, merge child's per-platform override with the global config
        let syncConfig = globalSyncConfig;
        let childRepoPath: string | null = null;
        if (repoId) {
          const childRepos = (config as any)?.umbrella?.childRepos || [];
          const child = childRepos.find((r: any) => r.id === repoId);
          if (!child) {
            return sendJson(res, { ok: false, error: `Child repo '${repoId}' not found` }, 400);
          }
          childRepoPath = path.resolve(project.root, child.path);
          syncConfig = { ...globalSyncConfig, ...(child.sync?.[platform] || {}) };
        }

        if (!syncConfig || Object.keys(syncConfig).length === 0) {
          return sendJson(res, { ok: false, error: `${platform} is not configured${repoId ? ` for ${repoId}` : ''}` }, 400);
        }

        let connected = false;
        let detail = '';

        if (platform === 'github') {
          const { Octokit } = await import('@octokit/rest');
          const { resolveGitHubToken } = await import('../../utils/auth-helpers.js');
          const token = resolveGitHubToken(childRepoPath ?? project.root, { configToken: syncConfig.token }).token;
          const octokit = new Octokit({ auth: token });
          try {
            const resp = await octokit.rest.repos.get({ owner: syncConfig.owner, repo: syncConfig.repo });
            connected = true;
            detail = `${resp.data.full_name} (${resp.data.open_issues_count} open issues)`;
          } catch (e: any) {
            detail = e.status === 401 ? 'Authentication failed — check token' :
                     e.status === 404 ? 'Repository not found' :
                     e.status ? `HTTP ${e.status}` : 'Connection failed';
          }
        } else if (platform === 'jira') {
          const domain = syncConfig.domain || syncConfig.host || '';
          const email = syncConfig.email || process.env.JIRA_EMAIL || '';
          const apiToken = syncConfig.apiToken || process.env.JIRA_API_TOKEN || '';
          try {
            const resp = await fetch(`https://${domain}/rest/api/3/myself`, {
              headers: { Authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}` },
            });
            connected = resp.ok;
            detail = connected ? `Authenticated as ${(await resp.json() as any).displayName || email}` :
                     resp.status === 401 ? 'Authentication failed — check credentials' : `HTTP ${resp.status}`;
          } catch {
            detail = 'Connection failed — check domain';
          }
        } else if (platform === 'ado') {
          const org = syncConfig.organization || '';
          const adoProject = syncConfig.project || '';
          const pat = syncConfig.pat || process.env.ADO_PAT || '';
          try {
            const resp = await fetch(`https://dev.azure.com/${org}/${adoProject}/_apis/projects/${adoProject}?api-version=7.0`, {
              headers: { Authorization: `Basic ${Buffer.from(`:${pat}`).toString('base64')}` },
            });
            connected = resp.ok;
            detail = connected ? `Connected to ${org}/${adoProject}` :
                     resp.status === 401 ? 'Authentication failed — check PAT' : `HTTP ${resp.status}`;
          } catch {
            detail = 'Connection failed — check organization/project';
          }
        }

        // Only persist success to sync metadata — failures should NOT poison the status
        if (connected) {
          const { updateSyncMetadata, updateRepoSyncMetadata } = await import('../../sync/sync-metadata.js');
          const successMeta = {
            lastImport: new Date().toISOString(),
            lastImportCount: 0,
            lastSyncResult: 'success' as const,
          };

          if (repoId) {
            // For child repos: write to child's own file if it has .specweave, else umbrella's repos section
            if (childRepoPath && hasSpecweaveIncrements(childRepoPath)) {
              await updateSyncMetadata(childRepoPath, platform as 'github' | 'jira' | 'ado', successMeta);
            } else {
              await updateRepoSyncMetadata(project.root, repoId, platform as 'github' | 'jira' | 'ado', successMeta);
            }
          } else {
            await updateSyncMetadata(project.root, platform as 'github' | 'jira' | 'ado', successMeta);
          }
        }

        sendJson(res, { ok: true, data: { platform, connected, detail, repoId: repoId || undefined } });
      } catch (e: any) {
        sendJson(res, { ok: false, error: e.message || 'Verification failed' }, 500);
      }
    });

    // Notifications
    this.router.get('/api/notifications', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const data = await project.aggregator.getNotifications();
      sendJson(res, { ok: true, data });
    });

    // Config
    this.router.get('/api/config', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const data = await project.aggregator.getConfig();
      sendJson(res, { ok: true, data });
    });

    // Plugins & LSP
    this.router.get('/api/plugins', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const data = await project.aggregator.getPlugins();
      sendJson(res, { ok: true, data });
    });

    this.router.get('/api/lsp', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const data = await project.aggregator.getLspStatus();
      sendJson(res, { ok: true, data });
    });

    // Commands (supports ?repo= for per-repo execution in umbrella projects)
    this.router.post('/api/commands/:name', async (req, res, params) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);

      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const repoId = url.searchParams.get('repo');

      let cwd: string | undefined;
      if (repoId && params.name === 'sync-push') {
        const config = await project.aggregator.getConfig();
        const childRepos = (config as any)?.umbrella?.childRepos || [];
        const child = childRepos.find((r: any) => r.id === repoId);
        if (!child) {
          return sendJson(res, { ok: false, error: `Child repo '${repoId}' not found` }, 400);
        }
        const childPath = path.resolve(project.root, child.path);
        if (!hasSpecweaveIncrements(childPath)) {
          return sendJson(res, { ok: false, error: `Child repo '${repoId}' is not initialized. Run 'specweave init' in it first.` }, 400);
        }
        cwd = childPath;
      }

      const execution = project.commandRunner.execute(params.name, { cwd });
      if (!execution) {
        sendJson(res, { ok: false, error: 'Command not available or already running' }, 400);
        return;
      }
      sendJson(res, { ok: true, data: execution });
    });

    this.router.get('/api/commands/active', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: true, data: null });
      const active = project.commandRunner.getActive();
      sendJson(res, { ok: true, data: active });
    });

    this.router.get('/api/commands/allowed', async (_req, res) => {
      sendJson(res, { ok: true, data: CommandRunner.getAllowedCommands() });
    });

    // === Config Validate ===

    this.router.post('/api/config/validate', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      try {
        const body = await readBody(req) as Record<string, unknown>;
        if (!body || typeof body !== 'object') return sendJson(res, { ok: false, error: 'Invalid body' }, 400);
        // Read schema expectations from existing config structure
        const currentConfig = await project.aggregator.getConfig();
        const errors: Array<{ path: string; message: string }> = [];
        // Validate known typed fields
        if (body.testing && typeof body.testing === 'object') {
          const testing = body.testing as Record<string, unknown>;
          if (testing.mode && !['TDD', 'test-after', 'manual', 'none'].includes(String(testing.mode))) {
            errors.push({ path: 'testing.mode', message: 'must be one of: TDD, test-after, manual, none' });
          }
          if (testing.commands != null && !Array.isArray(testing.commands)) {
            errors.push({ path: 'testing.commands', message: 'must be an array of shell commands' });
          }
        }
        if (body.limits && typeof body.limits === 'object') {
          const limits = body.limits as Record<string, unknown>;
          if (limits.activeIncrements != null && (typeof limits.activeIncrements !== 'number' || limits.activeIncrements < 0)) {
            errors.push({ path: 'limits.activeIncrements', message: 'must be a number >= 0 (0 disables the advisory note)' });
          }
        }
        sendJson(res, { ok: errors.length === 0, errors, currentConfig });
      } catch {
        sendJson(res, { ok: false, error: 'Validation failed' }, 500);
      }
    });

    // === Command Cancel ===

    this.router.post('/api/commands/:id/cancel', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const cancelled = project.commandRunner.cancel();
      if (!cancelled) {
        sendJson(res, { ok: false, error: 'No running command to cancel' }, 400);
        return;
      }
      sendJson(res, { ok: true });
    });

    // === Analytics Events ===

    this.router.get('/api/analytics/events', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const limit = safeParseInt(url.searchParams.get('limit'), 200, 1, 1000);
      const type = url.searchParams.get('type') || undefined;
      const since = url.searchParams.get('since') || undefined;

      const eventsPath = path.join(project.root, '.specweave/state/analytics/events.jsonl');
      const events: unknown[] = [];
      try {
        if (fs.existsSync(eventsPath)) {
          const lines = fs.readFileSync(eventsPath, 'utf-8').split('\n').filter(Boolean);
          // Read from end for efficiency
          for (let i = lines.length - 1; i >= 0 && events.length < limit; i--) {
            try {
              const event = JSON.parse(lines[i]);
              if (type && event.type !== type) continue;
              if (since && event.timestamp && event.timestamp < since) break;
              events.push(event);
            } catch { /* skip bad lines */ }
          }
        }
      } catch { /* */ }
      sendJson(res, { ok: true, data: events });
    });

    // === Phase 2: Error Tracing ===

    this.router.get('/api/errors/recent', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const limit = safeParseInt(url.searchParams.get('limit'), 50, 1, 500);
      const offset = safeParseInt(url.searchParams.get('offset'), 0, 0, 100000);
      const typeFilter = url.searchParams.get('type') || undefined;
      const search = url.searchParams.get('search') || undefined;
      const data = await project.logParser.getRecentErrors(limit, offset, typeFilter, search);
      sendJson(res, { ok: true, data });
    });

    this.router.get('/api/errors/groups', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const data = await project.logParser.getErrorGroups();
      sendJson(res, { ok: true, data });
    });

    this.router.get('/api/errors/sessions', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const limit = safeParseInt(url.searchParams.get('limit'), 30, 1, 500);
      const data = await project.logParser.getSessionSummaries(limit);
      sendJson(res, { ok: true, data });
    });

    this.router.get('/api/errors/sessions/:sessionId', async (req, res, params) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const data = await project.logParser.getSessionDetail(params.sessionId);
      if (!data) return sendJson(res, { ok: false, error: 'Session not found' }, 404);
      sendJson(res, { ok: true, data });
    });

    this.router.get('/api/errors/timeline', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const bucket = safeParseInt(url.searchParams.get('bucket'), 60, 1, 1440);
      const data = await project.logParser.getErrorTimeline(bucket);
      sendJson(res, { ok: true, data });
    });

    // === Prompt Health ===

    this.router.get('/api/prompt-health', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);

      const stateDir = path.join(project.root, '.specweave', 'state');
      let health = null;
      let alert = null;

      try {
        const healthPath = path.join(stateDir, 'prompt-health.json');
        if (fs.existsSync(healthPath)) {
          health = JSON.parse(fs.readFileSync(healthPath, 'utf-8'));
        }
      } catch { /* invalid json */ }

      try {
        const alertPath = path.join(stateDir, 'prompt-health-alert.json');
        if (fs.existsSync(alertPath)) {
          alert = JSON.parse(fs.readFileSync(alertPath, 'utf-8'));
        }
      } catch { /* invalid json */ }

      sendJson(res, { ok: true, data: { health, alert } });
    });

    // === Phase 2: Sync Audit ===

    this.router.get('/api/sync/audit', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const data = await project.auditReader.getRecentEntries({
        limit: safeParseInt(url.searchParams.get('limit'), 100, 1, 1000),
        platform: url.searchParams.get('platform') || undefined,
        result: url.searchParams.get('result') || undefined,
        since: url.searchParams.get('since') || undefined,
      });
      sendJson(res, { ok: true, data });
    });

    this.router.get('/api/sync/audit/summary', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const data = await project.auditReader.getSummary();
      sendJson(res, { ok: true, data });
    });

    // Sync errors (from resilience audit log)
    this.router.get('/api/sync/errors', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const data = await project.aggregator.getSyncErrors();
      sendJson(res, { ok: true, data });
    });

    // Sync gaps (increments with partial provider coverage)
    this.router.get('/api/sync/gaps', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const data = await project.aggregator.getSyncGaps();
      sendJson(res, { ok: true, data });
    });

    // === Phase 2: Enhanced Plugins ===

    this.router.get('/api/plugins/full', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const skills = await project.aggregator.getSkillUsage();
      const data = project.pluginScanner.getFullPluginData(skills);
      sendJson(res, { ok: true, data });
    });

    // === Phase 3: Activity Stream ===

    this.router.get('/api/activity/stream', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const categoriesParam = url.searchParams.get('categories');
      const data = await project.activityStream.getRecentActivity({
        limit: safeParseInt(url.searchParams.get('limit'), 100, 1, 1000),
        categories: categoriesParam ? categoriesParam.split(',') : undefined,
        severity: url.searchParams.get('severity') || undefined,
        since: url.searchParams.get('since') || undefined,
      });
      sendJson(res, { ok: true, data });
    });

    // === Phase 3: Notification Dismiss ===

    this.router.post('/api/notifications/:id/dismiss', async (req, res, params) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const notifPath = path.join(project.root, '.specweave/state/notifications.json');
      try {
        if (!fs.existsSync(notifPath)) return sendJson(res, { ok: false, error: 'No notifications file' }, 404);
        const data = JSON.parse(fs.readFileSync(notifPath, 'utf-8'));
        const notifications = data?.notifications || data || [];
        if (!Array.isArray(notifications)) return sendJson(res, { ok: false, error: 'Invalid format' }, 400);
        const notif = notifications.find((n: any) => n.id === params.id);
        if (!notif) return sendJson(res, { ok: false, error: 'Notification not found' }, 404);
        notif.dismissedAt = new Date().toISOString();
        if (data?.notifications) {
          data.notifications = notifications;
        }
        fs.writeFileSync(notifPath, JSON.stringify(data?.notifications ? data : notifications, null, 2));
        sendJson(res, { ok: true });
      } catch {
        sendJson(res, { ok: false, error: 'Failed to dismiss' }, 500);
      }
    });

    // === Phase 2: Cost Sessions ===

    this.router.get('/api/costs/sessions', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const costs = await project.costAggregator.getTokenSummaries();
      sendJson(res, { ok: true, data: costs.sessions });
    });

    // === Phase 4: Config Write ===

    this.router.put('/api/config', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const configPath = path.join(project.root, '.specweave/config.json');
      try {
        const body = await readBody(req) as Record<string, unknown>;
        if (!body || typeof body !== 'object') return sendJson(res, { ok: false, error: 'Invalid body' }, 400);
        // Read current config, merge with updates
        let current: Record<string, unknown> = {};
        if (fs.existsSync(configPath)) {
          current = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
        const merged = deepMerge(current, body);
        fs.writeFileSync(configPath, JSON.stringify(merged, null, 2));
        sendJson(res, { ok: true, data: merged });
      } catch {
        sendJson(res, { ok: false, error: 'Failed to save config' }, 500);
      }
    });

    // === Phase 4: Increment Detail ===

    this.router.get('/api/increments/:id', async (req, res, params) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const data = await getIncrementDetail(project.root, params.id);
      if (!data) return sendJson(res, { ok: false, error: 'Increment not found' }, 404);
      sendJson(res, { ok: true, data });
    });

    // === Phase 4: Repos ===

    this.router.get('/api/repos', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: true, data: [] });
      const data = scanRepositories(project.root);
      sendJson(res, { ok: true, data });
    });

    // === Workspace CRUD ===

    this.router.get('/api/workspace', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const handlers = createWorkspaceRouteHandlers(project.root);
      await handlers.getWorkspace(req, res, {});
    });

    this.router.patch('/api/workspace/repos/:id', async (req, res, params) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const body = await readBody(req) as Record<string, unknown>;
      const handlers = createWorkspaceRouteHandlers(project.root);
      await handlers.patchRepo(req, res, params, body);
    });

    this.router.post('/api/workspace/repos', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const body = await readBody(req) as Record<string, unknown>;
      const handlers = createWorkspaceRouteHandlers(project.root);
      await handlers.postRepo(req, res, {}, body);
    });

    this.router.delete('/api/workspace/repos/:id', async (req, res, params) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const handlers = createWorkspaceRouteHandlers(project.root);
      await handlers.deleteRepo(req, res, params);
    });

    // === Phase 4: Services ===

    this.router.get('/api/services', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: true, data: [] });
      const [internalUp, publicUp] = await Promise.all([
        isPortReachable(SCOPE_PORTS.internal),
        isPortReachable(SCOPE_PORTS.public),
      ]);
      const services = [
        { name: 'Dashboard Server', status: 'running', detail: `http://localhost:${this.options.port}`, port: this.options.port },
        { name: 'Internal Docs', status: internalUp ? 'running' : 'stopped', detail: `http://localhost:${SCOPE_PORTS.internal}`, port: SCOPE_PORTS.internal, startCommand: 'docs-internal-start', stopCommand: 'docs-internal-stop' },
        { name: 'Public Docs', status: publicUp ? 'running' : 'stopped', detail: `http://localhost:${SCOPE_PORTS.public}`, port: SCOPE_PORTS.public, startCommand: 'docs-public-start', stopCommand: 'docs-public-stop' },
      ];
      sendJson(res, { ok: true, data: services });
    });

    // Links (derived from config)
    this.router.get('/api/links', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: true, data: [] });
      const config = await project.aggregator.getConfig() as any;
      const links: Array<{ name: string; url: string; type: string }> = [
        { name: 'Public Docs', url: 'https://spec-weave.com', type: 'docs' },
      ];
      if (config?.sync?.github?.owner && config?.sync?.github?.repo) {
        links.push({
          name: 'GitHub Repository',
          url: `https://github.com/${config.sync.github.owner}/${config.sync.github.repo}`,
          type: 'github',
        });
      }
      if (config?.sync?.jira?.domain) {
        links.push({
          name: 'JIRA Board',
          url: `https://${config.sync.jira.domain}/browse/${config.sync.jira.projectKey || ''}`,
          type: 'jira',
        });
      }
      if (config?.sync?.ado?.organization) {
        links.push({
          name: 'Azure DevOps',
          url: `https://dev.azure.com/${config.sync.ado.organization}/${config.sync.ado.project || ''}`,
          type: 'ado',
        });
      }
      sendJson(res, { ok: true, data: links });
    });

    // === Marketplace ===

    // Scanner status
    this.router.get('/api/marketplace/scanner/status', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const data = await project.marketplaceAggregator.getScannerStatus();
      sendJson(res, { ok: true, data });
    });

    // Start scanner
    this.router.post('/api/marketplace/scanner/start', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      try {
        const { launchMarketplaceScanJob } = await import('../../core/background/job-launcher.js');
        const config = await project.aggregator.getConfig() as any;
        if (config?.marketplace?.enabled !== true) {
          return sendJson(res, { ok: false, error: 'Marketplace scanning is disabled by default (set marketplace.enabled: true in config.json to enable)' }, 403);
        }
        const scannerConfig = config?.marketplace?.scanner || {};
        const result = await launchMarketplaceScanJob({
          projectPath: project.root,
          searchTopics: scannerConfig.searchTopics || ['claude-code-skill', 'specweave-plugin'],
          searchFilenames: scannerConfig.searchFilenames || ['SKILL.md'],
          maxResultsPerScan: scannerConfig.maxResultsPerScan || 100,
          intervalMinutes: scannerConfig.intervalMinutes || 60,
        });
        sendJson(res, { ok: true, data: result });
      } catch (e: any) {
        sendJson(res, { ok: false, error: e.message || 'Failed to start scanner' }, 500);
      }
    });

    // Stop scanner
    this.router.post('/api/marketplace/scanner/stop', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      try {
        const { killJob } = await import('../../core/background/job-launcher.js');
        const { getJobManager: getJM } = await import('../../core/background/job-manager.js');
        const jobManager = getJM(project.root);
        const activeJobs = jobManager.getActiveJobs();
        const scannerJob = activeJobs.find(
          j => j.type === 'marketplace-scan' && (j.status === 'running' || j.status === 'pending'),
        );
        if (scannerJob) {
          killJob(project.root, scannerJob.id);
        }
        sendJson(res, { ok: true });
      } catch (e: any) {
        sendJson(res, { ok: false, error: e.message || 'Failed to stop scanner' }, 500);
      }
    });

    // Queue (paginated, filterable)
    this.router.get('/api/marketplace/queue', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const status = url.searchParams.get('status') || undefined;
      const limit = safeParseInt(url.searchParams.get('limit'), 20, 1, 100);
      const offset = safeParseInt(url.searchParams.get('offset'), 0, 0, 100000);
      const data = await project.marketplaceAggregator.getQueue({ status: status as any, limit, offset });
      sendJson(res, { ok: true, data });
    });

    // Single submission
    this.router.get('/api/marketplace/queue/:id', async (req, res, params) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const data = await project.marketplaceAggregator.getSubmission(params.id);
      if (!data) return sendJson(res, { ok: false, error: 'Submission not found' }, 404);
      sendJson(res, { ok: true, data });
    });

    // Approve
    this.router.post('/api/marketplace/queue/:id/approve', async (req, res, params) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      await project.marketplaceAggregator.approveSubmission(params.id);
      sendJson(res, { ok: true });
    });

    // Reject
    this.router.post('/api/marketplace/queue/:id/reject', async (req, res, params) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const body = await readBody(req) as { reason?: string };
      await project.marketplaceAggregator.rejectSubmission(params.id, body?.reason || 'No reason provided');
      sendJson(res, { ok: true });
    });

    // Verified skills only
    this.router.get('/api/marketplace/verified', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const data = await project.marketplaceAggregator.getVerifiedSkills();
      sendJson(res, { ok: true, data });
    });

    // Insights/analytics
    this.router.get('/api/marketplace/insights', async (req, res) => {
      const project = this.resolveProject(req);
      if (!project) return sendJson(res, { ok: false, error: 'No projects registered' }, 404);
      const data = await project.marketplaceAggregator.getInsights();
      sendJson(res, { ok: true, data });
    });
  }

  private async serveStaticFile(
    _req: http.IncomingMessage,
    res: http.ServerResponse,
    url: string,
  ): Promise<void> {
    const dashboardDir = path.resolve(__dirname, '../../../dashboard');
    // Strip query params for static file resolution
    const cleanUrl = url.split('?')[0];
    let filePath = path.resolve(dashboardDir, cleanUrl === '/' ? 'index.html' : '.' + cleanUrl);

    // SECURITY: prevent path traversal (e.g. /../../../etc/passwd)
    if (!filePath.startsWith(dashboardDir + path.sep) && filePath !== dashboardDir) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    // SPA fallback: serve index.html for all non-file routes
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(dashboardDir, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Dashboard not built. Run: npm run build:dashboard');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
      }
      res.end('Internal server error');
    });
    stream.pipe(res);
  }

  private registerDefaultHookHandlers(): void {
    if (!this.hookEventRouter || !this.hookEventStore) return;

    // Specialized handlers
    this.hookEventRouter.register('PreToolUse', preToolUseHandler);
    this.hookEventRouter.register('SubagentStart', createSubagentStartHandler(this.hookEventStore));
    this.hookEventRouter.register('SubagentStop', createSubagentStopHandler(this.hookEventStore));

    // All other events are passthrough (store event, return 200)
    const passthroughEvents = [
      'PostToolUse', 'Stop', 'TaskCompleted', 'UserPromptSubmit',
      'SessionStart', 'SessionEnd', 'PostToolUseFailure',
      'PermissionRequest', 'Notification', 'ConfigChange',
      'PreCompact', 'TeammateIdle',
    ];
    for (const eventName of passthroughEvents) {
      this.hookEventRouter.register(eventName, passthroughHandler);
    }
  }

  private registerHookRoutes(): void {
    if (!this.hookEventRouter || !this.hookEventStore) return;

    const hookRouter = this.hookEventRouter;
    const hookStore = this.hookEventStore;

    // GET routes first (literal paths)
    this.router.get('/api/hooks/events', async (req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const sessionId = url.searchParams.get('sessionId') ?? undefined;
      const eventType = url.searchParams.get('eventType') ?? undefined;
      const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 200;
      const events = hookStore.getEvents({ sessionId, eventType, limit });
      sendJson(res, { ok: true, data: events });
    });

    this.router.get('/api/hooks/agents', async (req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const sessionId = url.searchParams.get('sessionId') ?? undefined;
      const status = url.searchParams.get('status') as 'running' | 'stopped' | undefined;
      const agents = hookStore.getAgents({ sessionId, status: status || undefined });
      sendJson(res, { ok: true, data: agents });
    });

    this.router.get('/api/hooks/status', async (_req, res) => {
      sendJson(res, { ok: true, data: hookStore.getStats() });
    });

    // POST route for receiving hook events
    this.router.post('/api/hooks/:event', async (req, res, params) => {
      let body: unknown;
      try {
        body = await readBody(req);
      } catch {
        sendJson(res, { error: 'Invalid request body' }, 400);
        return;
      }

      const result = await hookRouter.handle(params.event, body);
      sendJson(res, result.body ?? {}, result.status);

      // Broadcast stored event to SSE clients (includes id for HooksPage live updates)
      if (result.storedEvent) {
        this.sseManager.broadcast('hook-event', result.storedEvent);
      }
    });
  }

  private mapEventToCategory(eventType: SSEEventType): string {
    const map: Record<string, string> = {
      'increment-update': 'command',
      'analytics-event': 'command',
      'cost-update': 'cost',
      'notification': 'notification',
      'sync-update': 'sync',
      'sync-audit': 'sync',
      'config-changed': 'command',
      'error-detected': 'error',
      'submission-update': 'command',
      'marketplace-scan': 'command',
      'verification-complete': 'command',
    };
    return map[eventType] || 'command';
  }
}

/** Safely parse an integer query parameter with min/max bounds */
function safeParseInt(raw: string | null, defaultVal: number, min: number, max: number): number {
  if (raw == null) return defaultVal;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < min) return defaultVal;
  return Math.min(parsed, max);
}

function pathToProjectId(p: string): string {
  return p.replace(/^\//, '').replace(/\//g, '-');
}

/** Deep merge objects (target mutated). Filters prototype pollution keys. */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
  for (const key of Object.keys(source)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    const sv = source[key];
    const tv = target[key];
    if (sv && typeof sv === 'object' && !Array.isArray(sv) && tv && typeof tv === 'object' && !Array.isArray(tv)) {
      target[key] = deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
    } else {
      target[key] = sv;
    }
  }
  return target;
}

/** Get increment detail by reading metadata.json, tasks.md, and spec.md */
async function getIncrementDetail(projectRoot: string, incrementId: string): Promise<Record<string, unknown> | null> {
  // Search for increment directory
  const incrementsDir = path.join(projectRoot, '.specweave/increments');
  if (!fs.existsSync(incrementsDir)) return null;

  let incDir: string | null = null;
  try {
    const dirs = fs.readdirSync(incrementsDir, { withFileTypes: true });
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      if (d.name === incrementId || d.name.startsWith(incrementId)) {
        incDir = path.join(incrementsDir, d.name);
        break;
      }
    }
  } catch { return null; }
  if (!incDir) return null;

  // Read metadata
  let metadata: Record<string, unknown> = {};
  const metadataPath = path.join(incDir, 'metadata.json');
  if (fs.existsSync(metadataPath)) {
    try { metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8')); } catch { /* */ }
  }

  // Parse tasks from tasks.md
  const tasks: Array<{ id: string; title: string; status: string; userStory?: string; acs?: string[] }> = [];
  const tasksPath = path.join(incDir, 'tasks.md');
  if (fs.existsSync(tasksPath)) {
    const content = fs.readFileSync(tasksPath, 'utf-8');
    const taskRegex = /###\s+(T-\d+):\s*(.+)/g;
    let match;
    while ((match = taskRegex.exec(content)) !== null) {
      const id = match[1];
      const title = match[2].trim();
      // Find status: look for [x] or [ ] nearby
      const afterMatch = content.slice(match.index, match.index + 500);
      const statusMatch = afterMatch.match(/\*\*Status\*\*:\s*\[([ x])\]/);
      const usMatch = afterMatch.match(/\*\*User Story\*\*:\s*(US-\d+)/);
      const acMatch = afterMatch.match(/\*\*(?:Satisfies ACs?|AC)\*\*:\s*(AC-[^\n]+)/);
      tasks.push({
        id,
        title,
        status: statusMatch?.[1] === 'x' ? 'completed' : 'pending',
        userStory: usMatch?.[1],
        acs: acMatch?.[1]?.split(',').map(s => s.trim()),
      });
    }
  }

  // Parse ACs from spec.md
  const acs: Array<{ id: string; text: string; completed: boolean }> = [];
  const specPath = path.join(incDir, 'spec.md');
  if (fs.existsSync(specPath)) {
    const content = fs.readFileSync(specPath, 'utf-8');
    const acRegex = /- \[([ x])\] \*\*(AC-[^*]+)\*\*:\s*(.+)/g;
    let match;
    while ((match = acRegex.exec(content)) !== null) {
      acs.push({
        id: match[2].trim(),
        text: match[3].trim(),
        completed: match[1] === 'x',
      });
    }
  }

  const taskSummary = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    pending: tasks.filter(t => t.status === 'pending').length,
  };

  const acSummary = {
    total: acs.length,
    completed: acs.filter(a => a.completed).length,
  };

  return {
    id: incrementId,
    metadata,
    tasks,
    taskSummary,
    acs,
    acSummary,
    dirName: path.basename(incDir),
  };
}

/** Scan repositories/ directory for cloned repos, with single-repo git fallback */
export function scanRepositories(projectRoot: string): Array<{
  name: string;
  org: string;
  path: string;
  remote?: string;
  branch?: string;
  hasSpecweave: boolean;
  isUmbrellaManaged?: boolean;
  isCurrent?: boolean;
  lastModified?: string;
}> {
  const reposDir = path.join(projectRoot, 'repositories');
  const repos: Array<{
    name: string;
    org: string;
    path: string;
    remote?: string;
    branch?: string;
    hasSpecweave: boolean;
    isUmbrellaManaged?: boolean;
    isCurrent?: boolean;
    lastModified?: string;
  }> = [];

  // Multi-repo: scan repositories/ directory
  if (fs.existsSync(reposDir)) {
    try {
      const orgs = fs.readdirSync(reposDir, { withFileTypes: true });
      for (const org of orgs) {
        if (!org.isDirectory()) continue;
        const orgDir = path.join(reposDir, org.name);
        const repoEntries = fs.readdirSync(orgDir, { withFileTypes: true });
        for (const repo of repoEntries) {
          if (!repo.isDirectory()) continue;
          const repoPath = path.join(orgDir, repo.name);
          const hasSpecweave = fs.existsSync(path.join(repoPath, '.specweave'));
          let lastModified = '';
          try {
            const stat = fs.statSync(repoPath);
            lastModified = stat.mtime.toISOString();
          } catch { /* */ }
          repos.push({
            name: repo.name,
            org: org.name,
            path: repoPath,
            hasSpecweave,
            lastModified,
          });
        }
      }
    } catch { /* */ }
  }

  // Single-repo fallback: if no repos found, check if projectRoot itself is a git repo
  if (repos.length === 0 && fs.existsSync(path.join(projectRoot, '.git'))) {
    try {
      let remote = '';
      let repoName = path.basename(projectRoot);
      let org = 'local';

      // Parse remote origin URL from .git/config
      const gitConfigPath = path.join(projectRoot, '.git/config');
      if (fs.existsSync(gitConfigPath)) {
        const gitConfig = fs.readFileSync(gitConfigPath, 'utf-8');
        const urlMatch = gitConfig.match(/\[remote "origin"\][^[]*url\s*=\s*(.+)/m);
        if (urlMatch) {
          remote = urlMatch[1].trim();
          // Parse SSH: git@github.com:org/repo.git
          const sshMatch = remote.match(/git@[^:]+:([^/]+)\/([^/.]+?)(?:\.git)?$/);
          if (sshMatch) {
            org = sshMatch[1];
            repoName = sshMatch[2];
          } else {
            // Parse HTTPS: https://github.com/org/repo.git
            const httpsMatch = remote.match(/https?:\/\/[^/]+\/([^/]+)\/([^/.]+?)(?:\.git)?$/);
            if (httpsMatch) {
              org = httpsMatch[1];
              repoName = httpsMatch[2];
            }
          }
        }
      }

      // Parse current branch from .git/HEAD
      let branch = 'main';
      const headPath = path.join(projectRoot, '.git/HEAD');
      if (fs.existsSync(headPath)) {
        const headContent = fs.readFileSync(headPath, 'utf-8').trim();
        const branchMatch = headContent.match(/^ref: refs\/heads\/(.+)$/);
        if (branchMatch) {
          branch = branchMatch[1];
        }
      }

      repos.push({
        name: repoName,
        org,
        path: projectRoot,
        remote,
        branch,
        hasSpecweave: hasSpecweaveIncrements(projectRoot),
        isCurrent: true,
      });
    } catch { /* */ }
  }

  // Umbrella detection: if the project root itself has .specweave/,
  // mark sub-repos without their own .specweave/ as umbrella-managed
  if (repos.length > 0 && fs.existsSync(path.join(projectRoot, '.specweave'))) {
    for (const repo of repos) {
      if (!repo.hasSpecweave) {
        repo.isUmbrellaManaged = true;
      }
    }
  }

  return repos.sort((a, b) => a.name.localeCompare(b.name));
}

