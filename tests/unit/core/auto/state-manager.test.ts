/**
 * State Manager Tests
 *
 * Tests for state persistence with mocked filesystem.
 * Target: 90%+ coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { join } from 'path';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  rmSync: vi.fn(),
  readdirSync: vi.fn(),
}));

// Import after mocking
import { StateManager } from '../../../../src/core/auto/parallel/state-manager.js';
import type { ParallelSession, ParallelAgent, ParallelConfig } from '../../../../src/core/auto/types.js';

describe('StateManager', () => {
  const rootPath = '/test/project';
  let manager: StateManager;

  const mockConfig: ParallelConfig = {
    enabled: true,
    maxParallel: 3,
    domains: ['frontend', 'backend'],
    createPR: false,
    draftPR: false,
    mergeStrategy: 'auto',
    baseBranch: 'main',
  };

  const mockAgent: ParallelAgent = {
    id: 'agent-123',
    domain: 'frontend',
    status: 'running',
    worktree: {
      path: '/test/.specweave/worktrees/agent-123',
      branch: 'auto/frontend',
      agentId: 'agent-123',
      createdAt: '2025-01-17T10:00:00.000Z',
      locked: false,
    },
    taskIds: ['T-001', 'T-002'],
    startedAt: '2025-01-17T10:00:00.000Z',
    progress: { completed: 1, total: 2 },
    heartbeat: new Date().toISOString(),
    subagentType: 'sw-frontend:frontend-architect',
  };

  const mockSession: ParallelSession = {
    id: 'session-abc',
    incrementId: '0170',
    status: 'active',
    agents: [mockAgent],
    startedAt: '2025-01-17T10:00:00.000Z',
    config: mockConfig,
    mergeOrder: ['agent-123'],
    prResults: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new StateManager(rootPath);

    // Default mocks
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.readdirSync).mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // SESSION TESTS
  // ============================================================================

  describe('Session Operations', () => {
    describe('saveSession', () => {
      it('should save session to file', () => {
        manager.saveSession(mockSession);

        expect(fs.mkdirSync).toHaveBeenCalled();
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          expect.stringContaining('session.json'),
          expect.any(String),
          'utf-8'
        );
      });

      it('should create directories if they do not exist', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        manager.saveSession(mockSession);

        expect(fs.mkdirSync).toHaveBeenCalledWith(
          expect.stringContaining('.specweave/state/parallel'),
          expect.objectContaining({ recursive: true })
        );
      });

      it('should serialize session as JSON', () => {
        manager.saveSession(mockSession);

        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const content = writeCall[1] as string;
        const parsed = JSON.parse(content);

        expect(parsed.id).toBe(mockSession.id);
        expect(parsed.incrementId).toBe(mockSession.incrementId);
      });
    });

    describe('loadSession', () => {
      it('should return null if session file does not exist', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = manager.loadSession();

        expect(result).toBeNull();
      });

      it('should load and parse session from file', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockSession));

        const result = manager.loadSession();

        expect(result).toEqual(mockSession);
      });

      it('should return null if JSON is invalid', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('invalid json {');

        const result = manager.loadSession();

        expect(result).toBeNull();
      });
    });

    describe('hasSession', () => {
      it('should return true if session file exists', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);

        expect(manager.hasSession()).toBe(true);
      });

      it('should return false if session file does not exist', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        expect(manager.hasSession()).toBe(false);
      });
    });

    describe('deleteSession', () => {
      it('should delete session file if exists', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);

        manager.deleteSession();

        expect(fs.rmSync).toHaveBeenCalledWith(expect.stringContaining('session.json'));
      });

      it('should not throw if session file does not exist', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        expect(() => manager.deleteSession()).not.toThrow();
      });
    });
  });

  // ============================================================================
  // AGENT TESTS
  // ============================================================================

  describe('Agent Operations', () => {
    describe('saveAgent', () => {
      it('should save agent to file', () => {
        manager.saveAgent(mockAgent);

        expect(fs.writeFileSync).toHaveBeenCalledWith(
          expect.stringContaining('agent-123.json'),
          expect.any(String),
          'utf-8'
        );
      });
    });

    describe('loadAgent', () => {
      it('should return null if agent file does not exist', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = manager.loadAgent('agent-notfound');

        expect(result).toBeNull();
      });

      it('should load and parse agent from file', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockAgent));

        const result = manager.loadAgent('agent-123');

        expect(result).toEqual(mockAgent);
      });

      it('should return null if JSON is invalid', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('not valid json');

        const result = manager.loadAgent('agent-invalid');

        expect(result).toBeNull();
      });
    });

    describe('updateAgent', () => {
      it('should update agent with partial data', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockAgent));

        const result = manager.updateAgent('agent-123', { status: 'completed' });

        expect(result?.status).toBe('completed');
        expect(fs.writeFileSync).toHaveBeenCalled();
      });

      it('should return null if agent does not exist', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = manager.updateAgent('agent-notfound', { status: 'completed' });

        expect(result).toBeNull();
      });
    });

    describe('deleteAgent', () => {
      it('should delete agent file if exists', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);

        manager.deleteAgent('agent-123');

        expect(fs.rmSync).toHaveBeenCalledWith(expect.stringContaining('agent-123.json'));
      });

      it('should not throw if agent file does not exist', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        expect(() => manager.deleteAgent('agent-notfound')).not.toThrow();
      });
    });

    describe('listAgentIds', () => {
      it('should return empty array if agents directory does not exist', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = manager.listAgentIds();

        expect(result).toEqual([]);
      });

      it('should return agent IDs from directory', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([
          'agent-1.json',
          'agent-2.json',
          'other-file.txt',
        ] as any);

        const result = manager.listAgentIds();

        expect(result).toEqual(['agent-1', 'agent-2']);
      });
    });

    describe('loadAllAgents', () => {
      it('should return empty array if no agents', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = manager.loadAllAgents();

        expect(result).toEqual([]);
      });

      it('should load all agents', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['agent-1.json', 'agent-2.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockAgent));

        const result = manager.loadAllAgents();

        expect(result).toHaveLength(2);
      });
    });
  });

  // ============================================================================
  // HEARTBEAT TESTS
  // ============================================================================

  describe('Heartbeat Operations', () => {
    describe('updateHeartbeat', () => {
      it('should update agent heartbeat timestamp', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockAgent));

        manager.updateHeartbeat('agent-123');

        expect(fs.writeFileSync).toHaveBeenCalled();
        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const content = JSON.parse(writeCall[1] as string);
        expect(content.heartbeat).toBeDefined();
      });

      it('should not throw if agent does not exist', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        expect(() => manager.updateHeartbeat('agent-notfound')).not.toThrow();
      });
    });

    describe('isAgentAlive', () => {
      it('should return true if heartbeat is recent', () => {
        const recentAgent = {
          ...mockAgent,
          heartbeat: new Date().toISOString(),
        };
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(recentAgent));

        const result = manager.isAgentAlive('agent-123');

        expect(result).toBe(true);
      });

      it('should return false if heartbeat is stale', () => {
        const staleAgent = {
          ...mockAgent,
          heartbeat: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 min ago
        };
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(staleAgent));

        const result = manager.isAgentAlive('agent-123', 5 * 60 * 1000); // 5 min timeout

        expect(result).toBe(false);
      });

      it('should return false if agent does not exist', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = manager.isAgentAlive('agent-notfound');

        expect(result).toBe(false);
      });

      it('should return false if agent has no heartbeat', () => {
        const noHeartbeatAgent = { ...mockAgent, heartbeat: undefined };
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(noHeartbeatAgent));

        const result = manager.isAgentAlive('agent-123');

        expect(result).toBe(false);
      });
    });

    describe('detectZombies', () => {
      it('should return agents with stale heartbeats', () => {
        const staleAgent = {
          ...mockAgent,
          status: 'running' as const,
          heartbeat: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        };
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['agent-stale.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(staleAgent));

        const result = manager.detectZombies(5 * 60 * 1000);

        expect(result).toHaveLength(1);
      });

      it('should return agents with no heartbeat', () => {
        const noHeartbeatAgent = {
          ...mockAgent,
          status: 'running' as const,
          heartbeat: undefined,
        };
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['agent-nohb.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(noHeartbeatAgent));

        const result = manager.detectZombies();

        expect(result).toHaveLength(1);
      });

      it('should not return completed agents', () => {
        const completedAgent = {
          ...mockAgent,
          status: 'completed' as const,
          heartbeat: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        };
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['agent-completed.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(completedAgent));

        const result = manager.detectZombies(5 * 60 * 1000);

        expect(result).toHaveLength(0);
      });

      it('should not return agents with recent heartbeat', () => {
        const aliveAgent = {
          ...mockAgent,
          status: 'running' as const,
          heartbeat: new Date().toISOString(),
        };
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['agent-alive.json'] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(aliveAgent));

        const result = manager.detectZombies(5 * 60 * 1000);

        expect(result).toHaveLength(0);
      });
    });
  });

  // ============================================================================
  // PROGRESS TRACKING TESTS
  // ============================================================================

  describe('Progress Tracking', () => {
    describe('updateProgress', () => {
      it('should update agent progress', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockAgent));

        manager.updateProgress('agent-123', 5, 10);

        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const content = JSON.parse(writeCall[1] as string);
        expect(content.progress).toEqual({ completed: 5, total: 10 });
      });
    });

    describe('markAgentStarted', () => {
      it('should mark agent as started', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockAgent));

        manager.markAgentStarted('agent-123');

        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const content = JSON.parse(writeCall[1] as string);
        expect(content.status).toBe('running');
        expect(content.startedAt).toBeDefined();
        expect(content.heartbeat).toBeDefined();
      });
    });

    describe('markAgentCompleted', () => {
      it('should mark agent as completed', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockAgent));

        manager.markAgentCompleted('agent-123');

        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const content = JSON.parse(writeCall[1] as string);
        expect(content.status).toBe('completed');
        expect(content.completedAt).toBeDefined();
      });
    });

    describe('markAgentFailed', () => {
      it('should mark agent as failed with error', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockAgent));

        manager.markAgentFailed('agent-123', 'Build failed');

        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const content = JSON.parse(writeCall[1] as string);
        expect(content.status).toBe('failed');
        expect(content.failedAt).toBeDefined();
        expect(content.error).toBe('Build failed');
      });
    });

    describe('markAgentCancelled', () => {
      it('should mark agent as cancelled', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockAgent));

        manager.markAgentCancelled('agent-123');

        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const content = JSON.parse(writeCall[1] as string);
        expect(content.status).toBe('cancelled');
      });
    });
  });

  // ============================================================================
  // SESSION STATUS TESTS
  // ============================================================================

  describe('Session Status', () => {
    describe('updateSessionStatus', () => {
      it('should update session status', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockSession));

        manager.updateSessionStatus('completed');

        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const content = JSON.parse(writeCall[1] as string);
        expect(content.status).toBe('completed');
        expect(content.completedAt).toBeDefined();
      });

      it('should set completedAt for terminal statuses', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockSession));

        for (const status of ['completed', 'failed', 'cancelled'] as const) {
          manager.updateSessionStatus(status);

          const writeCall = vi.mocked(fs.writeFileSync).mock.calls.slice(-1)[0];
          const content = JSON.parse(writeCall[1] as string);
          expect(content.completedAt).toBeDefined();
        }
      });
    });

    describe('getSessionStatus', () => {
      it('should return session status', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockSession));

        const result = manager.getSessionStatus();

        expect(result).toBe('active');
      });

      it('should return null if no session', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = manager.getSessionStatus();

        expect(result).toBeNull();
      });
    });

    describe('isSessionActive', () => {
      it('should return true for active session', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockSession));

        expect(manager.isSessionActive()).toBe(true);
      });

      it('should return false for completed session', () => {
        const completedSession = { ...mockSession, status: 'completed' as const };
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(completedSession));

        expect(manager.isSessionActive()).toBe(false);
      });

      it('should return false if no session', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        expect(manager.isSessionActive()).toBe(false);
      });
    });
  });

  // ============================================================================
  // CLEANUP TESTS
  // ============================================================================

  describe('Cleanup', () => {
    describe('cleanup', () => {
      it('should delete session and all agents', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['agent-1.json', 'agent-2.json'] as any);

        manager.cleanup();

        // Should delete session
        expect(fs.rmSync).toHaveBeenCalledWith(expect.stringContaining('session.json'));
        // Should delete agents
        expect(fs.rmSync).toHaveBeenCalledWith(expect.stringContaining('agent-1.json'));
        expect(fs.rmSync).toHaveBeenCalledWith(expect.stringContaining('agent-2.json'));
      });

      it('should try to remove directories', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([]);

        manager.cleanup();

        expect(fs.rmSync).toHaveBeenCalledWith(
          expect.stringContaining('agents'),
          expect.objectContaining({ recursive: true })
        );
      });

      it('should not throw on cleanup errors', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([]);

        // Only throw on directory cleanup (recursive: true), not on file deletes
        vi.mocked(fs.rmSync).mockImplementation((_path, options) => {
          if (options && typeof options === 'object' && 'recursive' in options) {
            throw new Error('Permission denied');
          }
        });

        expect(() => manager.cleanup()).not.toThrow();
      });
    });
  });

  // ============================================================================
  // PATH GETTER TESTS
  // ============================================================================

  describe('Path Getters', () => {
    it('should return state directory path', () => {
      expect(manager.getStateDir()).toContain('.specweave/state/parallel');
    });

    it('should return session file path', () => {
      expect(manager.getSessionPath()).toContain('session.json');
    });

    it('should return agents directory path', () => {
      expect(manager.getAgentsDir()).toContain('agents');
    });
  });
});
