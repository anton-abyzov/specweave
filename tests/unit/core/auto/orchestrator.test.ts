/**
 * Parallel Orchestrator Tests
 *
 * Tests for the main orchestrator that coordinates parallel execution.
 */

import { describe, it, expect, beforeEach, vi, afterEach, type MockInstance } from 'vitest';
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

describe('ParallelOrchestrator', () => {
  let orchestrator: InstanceType<typeof ParallelOrchestrator>;
  let mockExistsSync: MockInstance;
  let mockReadFileSync: MockInstance;
  let mockWriteFileSync: MockInstance;
  let mockSpawnSync: MockInstance;
  let mockMkdirSync: MockInstance;
  let mockReaddirSync: MockInstance;

  const mockConfig: ParallelConfig = {
    enabled: true,
    maxParallel: 3,
    domains: ['frontend', 'backend'],
    createPR: true,
    draftPR: false,
    mergeStrategy: 'auto',
    baseBranch: 'main',
  };

  // Store sessions for mock
  let sessionStore: ParallelSession | null = null;
  let agentStore: Map<string, ParallelAgent> = new Map();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStore = null;
    agentStore.clear();

    mockExistsSync = vi.mocked(fs.existsSync);
    mockReadFileSync = vi.mocked(fs.readFileSync);
    mockWriteFileSync = vi.mocked(fs.writeFileSync);
    mockMkdirSync = vi.mocked(fs.mkdirSync);
    mockReaddirSync = vi.mocked(fs.readdirSync);
    mockSpawnSync = vi.mocked(childProcess.spawnSync);

    // Default behaviors
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

    // Git commands
    mockSpawnSync.mockImplementation((command: string, args?: readonly string[]) => {
      if (command === 'git') {
        const argsArr = args as string[];
        if (argsArr[0] === 'remote') {
          return { status: 0, stdout: 'https://github.com/org/repo.git', stderr: '' };
        }
        if (argsArr[0] === 'worktree') {
          if (argsArr[1] === 'add') {
            return { status: 0, stdout: '', stderr: '' };
          }
          if (argsArr[1] === 'list') {
            return { status: 0, stdout: '', stderr: '' };
          }
          if (argsArr[1] === 'remove') {
            return { status: 0, stdout: '', stderr: '' };
          }
          if (argsArr[1] === 'prune') {
            return { status: 0, stdout: '', stderr: '' };
          }
        }
        if (argsArr[0] === 'rev-parse') {
          return { status: 0, stdout: 'main\n', stderr: '' };
        }
        if (argsArr[0] === 'checkout') {
          return { status: 0, stdout: '', stderr: '' };
        }
        if (argsArr[0] === 'merge') {
          return { status: 0, stdout: '', stderr: '' };
        }
        if (argsArr[0] === 'merge-tree') {
          return { status: 0, stdout: '', stderr: '' };
        }
      }
      if (command === 'gh') {
        return {
          status: 0,
          stdout: 'https://github.com/org/repo/pull/42',
          stderr: '',
        };
      }
      return { status: 0, stdout: '', stderr: '' };
    });

    orchestrator = new ParallelOrchestrator('/home/user/project');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // SESSION MANAGEMENT TESTS
  // ============================================================================

  describe('Session Management', () => {
    describe('createSession', () => {
      it('should create a new session', async () => {
        const session = await orchestrator.createSession({
          incrementId: '0170-test',
          config: mockConfig,
        });

        expect(session).toBeDefined();
        expect(session.id).toMatch(/^session-/);
        expect(session.incrementId).toBe('0170-test');
        expect(session.status).toBe('active');
        expect(session.agents).toEqual([]);
      });

      it('should throw if active session exists', async () => {
        await orchestrator.createSession({
          incrementId: '0170-test',
          config: mockConfig,
        });

        await expect(
          orchestrator.createSession({
            incrementId: '0170-test-2',
            config: mockConfig,
          })
        ).rejects.toThrow('Active session already exists');
      });

      it('should use provided base branch', async () => {
        const session = await orchestrator.createSession({
          incrementId: '0170-test',
          config: mockConfig,
          baseBranch: 'develop',
        });

        expect(session.config.baseBranch).toBe('develop');
      });

      it('should set startedAt timestamp', async () => {
        const session = await orchestrator.createSession({
          incrementId: '0170-test',
          config: mockConfig,
        });

        expect(session.startedAt).toBeDefined();
        expect(session.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
      });
    });

    describe('getSession', () => {
      it('should return null when no session exists', () => {
        expect(orchestrator.getSession()).toBeNull();
      });

      it('should return existing session', async () => {
        await orchestrator.createSession({
          incrementId: '0170-test',
          config: mockConfig,
        });

        const session = orchestrator.getSession();
        expect(session).not.toBeNull();
        expect(session?.incrementId).toBe('0170-test');
      });
    });

    describe('hasActiveSession', () => {
      it('should return false when no session exists', () => {
        expect(orchestrator.hasActiveSession()).toBe(false);
      });

      it('should return true when active session exists', async () => {
        await orchestrator.createSession({
          incrementId: '0170-test',
          config: mockConfig,
        });

        expect(orchestrator.hasActiveSession()).toBe(true);
      });
    });

    describe('getSessionStatus', () => {
      it('should return null when no session exists', () => {
        expect(orchestrator.getSessionStatus()).toBeNull();
      });

      it('should return detailed status', async () => {
        await orchestrator.createSession({
          incrementId: '0170-test',
          config: mockConfig,
        });

        const status = orchestrator.getSessionStatus();

        expect(status).not.toBeNull();
        expect(status?.sessionId).toMatch(/^session-/);
        expect(status?.incrementId).toBe('0170-test');
        expect(status?.status).toBe('active');
        expect(status?.overall).toBeDefined();
        expect(status?.overall.totalAgents).toBe(0);
      });
    });

    describe('cancelSession', () => {
      it('should cancel active session', async () => {
        await orchestrator.createSession({
          incrementId: '0170-test',
          config: mockConfig,
        });

        await orchestrator.cancelSession();

        const session = orchestrator.getSession();
        expect(session?.status).toBe('cancelled');
      });

      it('should do nothing when no session exists', async () => {
        await expect(orchestrator.cancelSession()).resolves.not.toThrow();
      });
    });
  });

  // ============================================================================
  // AGENT MANAGEMENT TESTS
  // ============================================================================

  describe('Agent Management', () => {
    beforeEach(async () => {
      await orchestrator.createSession({
        incrementId: '0170-test',
        config: mockConfig,
      });
    });

    describe('spawnAgents', () => {
      it('should spawn agents for assignments', async () => {
        const results = await orchestrator.spawnAgents([
          { domain: 'frontend', taskIds: ['T-001', 'T-002'] },
        ]);

        expect(results).toHaveLength(1);
        expect(results[0].agent.domain).toBe('frontend');
        expect(results[0].taskRequest).toBeDefined();
      });

      it('should spawn multiple agents', async () => {
        const results = await orchestrator.spawnAgents([
          { domain: 'frontend', taskIds: ['T-001'] },
          { domain: 'backend', taskIds: ['T-002'] },
        ]);

        expect(results).toHaveLength(2);
      });

      it('should update session with spawned agents', async () => {
        await orchestrator.spawnAgents([
          { domain: 'frontend', taskIds: ['T-001'] },
        ]);

        const session = orchestrator.getSession();
        expect(session?.agents.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('getTaskRequests', () => {
      it('should extract task requests from spawn results', async () => {
        const results = await orchestrator.spawnAgents([
          { domain: 'frontend', taskIds: ['T-001'] },
          { domain: 'backend', taskIds: ['T-002'] },
        ]);
        const requests = orchestrator.getTaskRequests(results);

        expect(requests).toHaveLength(2);
        expect(requests[0].subagent_type).toBeDefined();
      });
    });
  });

  // ============================================================================
  // PROMPT ANALYSIS TESTS
  // ============================================================================

  describe('Prompt Analysis', () => {
    describe('analyzePrompt', () => {
      it('should analyze prompt for suggestions', () => {
        const suggestions = orchestrator.analyzePrompt('Build React frontend and Node.js backend API');

        expect(suggestions.length).toBeGreaterThan(0);
      });
    });

    describe('shouldSuggestParallel', () => {
      it('should suggest parallel for multi-domain prompts', () => {
        const result = orchestrator.shouldSuggestParallel('Build React UI and Express API');
        expect(result).toBe(true);
      });

      it('should not suggest parallel for single-domain prompts', () => {
        const result = orchestrator.shouldSuggestParallel('Fix button styling');
        expect(result).toBe(false);
      });
    });

    describe('getSuggestedDomains', () => {
      it('should get suggested domains', () => {
        const domains = orchestrator.getSuggestedDomains('Build React components and database schema');

        expect(domains.length).toBeGreaterThan(0);
      });
    });

    describe('formatSuggestions', () => {
      it('should format suggestions for display', () => {
        const suggestions = orchestrator.analyzePrompt('Build frontend and backend');
        const formatted = orchestrator.formatSuggestions(suggestions);

        expect(typeof formatted).toBe('string');
      });
    });
  });

  // ============================================================================
  // CLEANUP TESTS
  // ============================================================================

  describe('Cleanup', () => {
    describe('cleanupWorktrees', () => {
      it('should clean up worktrees', async () => {
        await orchestrator.createSession({
          incrementId: '0170-test',
          config: mockConfig,
        });
        await orchestrator.spawnAgents([{ domain: 'frontend', taskIds: ['T-001'] }]);

        await expect(orchestrator.cleanupWorktrees()).resolves.not.toThrow();
      });
    });

    describe('cleanup', () => {
      it('should clean up everything', async () => {
        await orchestrator.createSession({
          incrementId: '0170-test',
          config: mockConfig,
        });

        await expect(orchestrator.cleanup()).resolves.not.toThrow();
      });
    });
  });

  // ============================================================================
  // ACCESSOR TESTS
  // ============================================================================

  describe('Accessors', () => {
    it('should expose worktree manager', () => {
      expect(orchestrator.getWorktreeManager()).toBeDefined();
    });

    it('should expose state manager', () => {
      expect(orchestrator.getStateManager()).toBeDefined();
    });

    it('should expose agent spawner', () => {
      expect(orchestrator.getAgentSpawner()).toBeDefined();
    });

    it('should expose PR generator', () => {
      expect(orchestrator.getPRGenerator()).toBeDefined();
    });

    it('should expose prompt analyzer', () => {
      expect(orchestrator.getPromptAnalyzer()).toBeDefined();
    });

    it('should get git provider', () => {
      expect(orchestrator.getGitProvider()).toBe('github');
    });
  });

  // ============================================================================
  // PR MANAGEMENT TESTS
  // ============================================================================

  describe('PR Management', () => {
    beforeEach(async () => {
      await orchestrator.createSession({
        incrementId: '0170-test',
        config: mockConfig,
      });
    });

    describe('getPRResults', () => {
      it('should return empty array when no PRs created', () => {
        const results = orchestrator.getPRResults();
        expect(results).toEqual([]);
      });
    });
  });

  // ============================================================================
  // MERGE MANAGEMENT TESTS
  // ============================================================================

  describe('Merge Management', () => {
    beforeEach(async () => {
      await orchestrator.createSession({
        incrementId: '0170-test',
        config: mockConfig,
      });
    });

    describe('computeMergeOrder', () => {
      it('should return empty array for no agents', () => {
        const order = orchestrator.computeMergeOrder();
        expect(order).toEqual([]);
      });
    });

    describe('hasConflicts', () => {
      it('should check for merge conflicts', async () => {
        await orchestrator.spawnAgents([{ domain: 'frontend', taskIds: ['T-001'] }]);
        const session = orchestrator.getSession();
        const agentId = session?.agents[0]?.id;

        if (agentId) {
          const hasConflicts = await orchestrator.hasConflicts(agentId);
          expect(typeof hasConflicts).toBe('boolean');
        }
      });
    });
  });
});
