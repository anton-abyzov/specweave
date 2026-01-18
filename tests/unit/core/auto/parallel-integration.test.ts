/**
 * Parallel Module Integration Tests
 *
 * Tests that verify multiple parallel components work together correctly.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as childProcess from 'child_process';
import type {
  AgentDomain,
  ParallelConfig,
  ParallelSession,
  ParallelAgent,
} from '../../../../src/core/auto/types.js';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  rmSync: vi.fn(),
  readdirSync: vi.fn().mockReturnValue([]),
}));

// Mock child_process
vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
  execSync: vi.fn(),
}));

// Import after mocking
const { ParallelOrchestrator } = await import('../../../../src/core/auto/parallel/orchestrator.js');
const { PromptAnalyzer } = await import('../../../../src/core/auto/parallel/prompt-analyzer.js');
const { AgentSpawner } = await import('../../../../src/core/auto/parallel/agent-spawner.js');

describe('Parallel Module Integration', () => {
  let sessionStore: ParallelSession | null = null;
  let agentStore: Map<string, ParallelAgent> = new Map();

  const mockConfig: ParallelConfig = {
    enabled: true,
    maxParallel: 4,
    domains: ['frontend', 'backend', 'database', 'qa'],
    createPR: true,
    draftPR: false,
    mergeStrategy: 'auto',
    baseBranch: 'main',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStore = null;
    agentStore.clear();

    const mockExistsSync = vi.mocked(fs.existsSync);
    const mockReadFileSync = vi.mocked(fs.readFileSync);
    const mockWriteFileSync = vi.mocked(fs.writeFileSync);
    const mockReaddirSync = vi.mocked(fs.readdirSync);
    const mockSpawnSync = vi.mocked(childProcess.spawnSync);

    mockExistsSync.mockImplementation((path: fs.PathLike) => {
      const pathStr = path.toString();
      if (pathStr.includes('session.json')) {
        return sessionStore !== null;
      }
      if (pathStr.includes('/agents/')) {
        const agentId = pathStr.split('/').pop()?.replace('.json', '');
        return agentId ? agentStore.has(agentId) : false;
      }
      return false;
    });

    mockReadFileSync.mockImplementation((path: fs.PathOrFileDescriptor) => {
      const pathStr = path.toString();
      if (pathStr.includes('session.json') && sessionStore) {
        return JSON.stringify(sessionStore);
      }
      if (pathStr.includes('/agents/')) {
        const agentId = pathStr.toString().split('/').pop()?.replace('.json', '');
        const agent = agentId ? agentStore.get(agentId) : undefined;
        if (agent) {
          return JSON.stringify(agent);
        }
      }
      throw new Error('File not found');
    });

    mockWriteFileSync.mockImplementation((path: fs.PathOrFileDescriptor, data: string) => {
      const pathStr = path.toString();
      if (pathStr.includes('session.json')) {
        sessionStore = JSON.parse(data as string);
      } else if (pathStr.includes('/agents/')) {
        const agent = JSON.parse(data as string) as ParallelAgent;
        agentStore.set(agent.id, agent);
      }
    });

    mockReaddirSync.mockImplementation(() => {
      return Array.from(agentStore.keys()).map((id) => `${id}.json`) as unknown as fs.Dirent[];
    });

    mockSpawnSync.mockImplementation((command: string, args?: readonly string[]) => {
      if (command === 'git') {
        const argsArr = args as string[];
        if (argsArr[0] === 'remote') {
          return { status: 0, stdout: 'https://github.com/org/repo.git', stderr: '' };
        }
        if (argsArr[0] === 'worktree') {
          return { status: 0, stdout: '', stderr: '' };
        }
        if (argsArr[0] === 'rev-parse') {
          return { status: 0, stdout: 'main\n', stderr: '' };
        }
      }
      if (command === 'gh') {
        return { status: 0, stdout: 'https://github.com/org/repo/pull/42', stderr: '' };
      }
      return { status: 0, stdout: '', stderr: '' };
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // END-TO-END WORKFLOW TESTS
  // ============================================================================

  describe('End-to-End Workflow', () => {
    it('should complete full parallel execution workflow', async () => {
      const orchestrator = new ParallelOrchestrator('/home/user/project');

      // Step 1: Create session
      const session = await orchestrator.createSession({
        incrementId: '0170-test-feature',
        config: mockConfig,
      });
      expect(session.status).toBe('active');

      // Step 2: Spawn agents
      const results = await orchestrator.spawnAgents([
        { domain: 'frontend', taskIds: ['T-001', 'T-002'] },
        { domain: 'backend', taskIds: ['T-003', 'T-004'] },
      ]);
      expect(results).toHaveLength(2);

      // Step 3: Verify session has agents
      const status = orchestrator.getSessionStatus();
      expect(status?.overall.totalAgents).toBe(2);
      expect(status?.overall.pending).toBe(2);

      // Step 4: Mark agents as running and completed
      for (const result of results) {
        orchestrator.markAgentStarted(result.agent.id);
        orchestrator.updateAgentProgress(result.agent.id, 2, 2);
        orchestrator.markAgentCompleted(result.agent.id);
      }

      // Step 5: Verify completion
      const finalStatus = orchestrator.getSessionStatus();
      expect(finalStatus?.overall.completed).toBe(2);
    });

    it('should handle mixed agent outcomes', async () => {
      const orchestrator = new ParallelOrchestrator('/home/user/project');

      await orchestrator.createSession({
        incrementId: '0170-mixed-outcome',
        config: mockConfig,
      });

      const results = await orchestrator.spawnAgents([
        { domain: 'frontend', taskIds: ['T-001'] },
        { domain: 'backend', taskIds: ['T-002'] },
        { domain: 'database', taskIds: ['T-003'] },
      ]);

      // Complete first agent
      orchestrator.markAgentStarted(results[0].agent.id);
      orchestrator.markAgentCompleted(results[0].agent.id);

      // Fail second agent
      orchestrator.markAgentStarted(results[1].agent.id);
      orchestrator.markAgentFailed(results[1].agent.id, 'Build failed');

      // Complete third agent
      orchestrator.markAgentStarted(results[2].agent.id);
      orchestrator.markAgentCompleted(results[2].agent.id);

      const status = orchestrator.getSessionStatus();
      expect(status?.overall.completed).toBe(2);
      expect(status?.overall.failed).toBe(1);
    });
  });

  // ============================================================================
  // PROMPT TO AGENT FLOW TESTS
  // ============================================================================

  describe('Prompt to Agent Flow', () => {
    it('should analyze prompt and create appropriate agents', async () => {
      const orchestrator = new ParallelOrchestrator('/home/user/project');

      // Analyze a complex prompt
      const prompt = 'Build a React dashboard with Express API and PostgreSQL database, including Jest tests';

      const suggestions = orchestrator.analyzePrompt(prompt);
      const shouldParallel = orchestrator.shouldSuggestParallel(prompt);
      const suggestedDomains = orchestrator.getSuggestedDomains(prompt);

      expect(shouldParallel).toBe(true);
      expect(suggestedDomains.length).toBeGreaterThanOrEqual(2);
      expect(suggestions.length).toBeGreaterThan(0);

      // Create session and spawn agents based on suggestions
      await orchestrator.createSession({
        incrementId: '0170-dashboard',
        config: mockConfig,
      });

      const assignments = suggestedDomains.map((domain) => ({
        domain,
        taskIds: [`T-${domain}-001`],
      }));

      const results = await orchestrator.spawnAgents(assignments);
      expect(results.length).toBe(suggestedDomains.length);
    });

    it('should not suggest parallel for single-domain prompts', () => {
      const orchestrator = new ParallelOrchestrator('/home/user/project');

      const singleDomainPrompts = [
        'Fix the CSS button styling issue',
        'Update the database migration script',
        'Configure the CI/CD pipeline',
      ];

      for (const prompt of singleDomainPrompts) {
        const shouldParallel = orchestrator.shouldSuggestParallel(prompt);
        expect(shouldParallel).toBe(false);
      }
    });
  });

  // ============================================================================
  // COMPONENT INTERACTION TESTS
  // ============================================================================

  describe('Component Interactions', () => {
    it('should coordinate between spawner and orchestrator', async () => {
      const orchestrator = new ParallelOrchestrator('/home/user/project');
      const spawner = new AgentSpawner();

      // Use spawner directly to understand format
      const worktree = {
        path: '/tmp/test',
        branch: 'auto/test',
        agentId: 'test',
        createdAt: new Date().toISOString(),
        locked: false,
      };

      const context = {
        incrementId: '0170-test',
        worktree,
        taskIds: ['T-001'],
        config: mockConfig,
      };

      const spawnResult = spawner.spawn('frontend', context);
      expect(spawnResult.agent.status).toBe('pending');
      expect(spawnResult.taskRequest.run_in_background).toBe(true);

      // Verify orchestrator uses same spawner logic
      await orchestrator.createSession({
        incrementId: '0170-test',
        config: mockConfig,
      });

      const orchestratorResults = await orchestrator.spawnAgents([
        { domain: 'frontend', taskIds: ['T-001'] },
      ]);

      expect(orchestratorResults[0].taskRequest.run_in_background).toBe(true);
    });

    it('should coordinate between analyzer and orchestrator', () => {
      const orchestrator = new ParallelOrchestrator('/home/user/project');
      const analyzer = new PromptAnalyzer();

      const prompt = 'Create React components with TypeScript and add unit tests with Jest';

      // Direct analyzer call
      const directResult = analyzer.analyze(prompt);

      // Through orchestrator
      const orchestratorSuggestions = orchestrator.analyzePrompt(prompt);

      // Results should be consistent
      expect(orchestratorSuggestions.length).toBe(directResult.suggestions.length);
    });
  });

  // ============================================================================
  // ERROR HANDLING INTEGRATION TESTS
  // ============================================================================

  describe('Error Handling Integration', () => {
    it('should prevent duplicate sessions', async () => {
      const orchestrator = new ParallelOrchestrator('/home/user/project');

      await orchestrator.createSession({
        incrementId: '0170-first',
        config: mockConfig,
      });

      await expect(
        orchestrator.createSession({
          incrementId: '0170-second',
          config: mockConfig,
        })
      ).rejects.toThrow('Active session already exists');
    });

    it('should handle agent spawning without session', async () => {
      const newOrchestrator = new ParallelOrchestrator('/tmp/no-session');

      await expect(
        newOrchestrator.spawnAgents([{ domain: 'frontend', taskIds: ['T-001'] }])
      ).rejects.toThrow('No active session');
    });

    it('should gracefully handle cleanup', async () => {
      const orchestrator = new ParallelOrchestrator('/home/user/project');

      await orchestrator.createSession({
        incrementId: '0170-cleanup-test',
        config: mockConfig,
      });

      await orchestrator.spawnAgents([
        { domain: 'frontend', taskIds: ['T-001'] },
      ]);

      // Cleanup should not throw
      await expect(orchestrator.cleanup()).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // STATE PERSISTENCE TESTS
  // ============================================================================

  describe('State Persistence', () => {
    it('should persist session and agent state', async () => {
      const orchestrator = new ParallelOrchestrator('/home/user/project');

      await orchestrator.createSession({
        incrementId: '0170-persist-test',
        config: mockConfig,
      });

      await orchestrator.spawnAgents([
        { domain: 'frontend', taskIds: ['T-001'] },
      ]);

      // Verify session was saved
      expect(sessionStore).not.toBeNull();
      expect(sessionStore?.incrementId).toBe('0170-persist-test');

      // Verify agents were saved
      expect(agentStore.size).toBe(1);
    });

    it('should track agent progress through state', async () => {
      const orchestrator = new ParallelOrchestrator('/home/user/project');

      await orchestrator.createSession({
        incrementId: '0170-progress-test',
        config: mockConfig,
      });

      const results = await orchestrator.spawnAgents([
        { domain: 'frontend', taskIds: ['T-001', 'T-002', 'T-003'] },
      ]);

      const agentId = results[0].agent.id;

      orchestrator.markAgentStarted(agentId);
      orchestrator.updateAgentProgress(agentId, 1, 3);

      const agent = orchestrator.getAgent(agentId);
      expect(agent?.progress.completed).toBe(1);
      expect(agent?.progress.total).toBe(3);
    });
  });

  // ============================================================================
  // DOMAIN COVERAGE TESTS
  // ============================================================================

  describe('Domain Coverage', () => {
    it('should handle all domains correctly', async () => {
      const orchestrator = new ParallelOrchestrator('/home/user/project');

      await orchestrator.createSession({
        incrementId: '0170-all-domains',
        config: { ...mockConfig, domains: ['frontend', 'backend', 'database', 'devops', 'qa', 'general'] },
      });

      const allDomains: AgentDomain[] = ['frontend', 'backend', 'database', 'devops', 'qa', 'general'];

      const results = await orchestrator.spawnAgents(
        allDomains.map((domain, i) => ({
          domain,
          taskIds: [`T-${i + 1}`],
        }))
      );

      expect(results).toHaveLength(6);

      // Each agent should have appropriate subagent type
      for (const result of results) {
        expect(result.agent.subagentType).toBeDefined();
        expect(result.taskRequest.subagent_type).toBe(result.agent.subagentType);
      }
    });
  });

  // ============================================================================
  // TASK REQUEST GENERATION TESTS
  // ============================================================================

  describe('Task Request Generation', () => {
    it('should generate valid task requests for background execution', async () => {
      const orchestrator = new ParallelOrchestrator('/home/user/project');

      await orchestrator.createSession({
        incrementId: '0170-task-requests',
        config: mockConfig,
      });

      const results = await orchestrator.spawnAgents([
        { domain: 'frontend', taskIds: ['T-001', 'T-002'], taskDescriptions: ['Build login form', 'Add validation'] },
      ]);

      const requests = orchestrator.getTaskRequests(results);

      expect(requests).toHaveLength(1);
      expect(requests[0].run_in_background).toBe(true);
      expect(requests[0].prompt).toContain('Build login form');
      expect(requests[0].prompt).toContain('Add validation');
      expect(requests[0].model).toBe('sonnet');
    });
  });
});
