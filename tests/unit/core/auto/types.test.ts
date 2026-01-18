/**
 * Parallel Types Tests
 *
 * Tests for type definitions and type guards.
 */

import { describe, it, expect } from 'vitest';
import {
  isAgentDomain,
  isAgentStatus,
  isGitProvider,
  DEFAULT_PARALLEL_CONFIG,
  DOMAIN_SUBAGENT_MAP,
  type AgentDomain,
  type AgentStatus,
  type GitProvider,
  type ParallelAgent,
  type ParallelSession,
  type ParallelConfig,
  type FlagSuggestion,
  type WorktreeInfo,
  type PRResult,
} from '../../../../src/core/auto/types.js';

describe('Parallel Types', () => {
  // ============================================================================
  // TYPE GUARD TESTS
  // ============================================================================

  describe('Type Guards', () => {
    describe('isAgentDomain', () => {
      it('should return true for valid domains', () => {
        expect(isAgentDomain('frontend')).toBe(true);
        expect(isAgentDomain('backend')).toBe(true);
        expect(isAgentDomain('database')).toBe(true);
        expect(isAgentDomain('devops')).toBe(true);
        expect(isAgentDomain('qa')).toBe(true);
        expect(isAgentDomain('general')).toBe(true);
      });

      it('should return false for invalid domains', () => {
        expect(isAgentDomain('invalid')).toBe(false);
        expect(isAgentDomain('')).toBe(false);
        expect(isAgentDomain('FRONTEND')).toBe(false);
        expect(isAgentDomain('Frontend')).toBe(false);
      });

      it('should return false for non-string values', () => {
        expect(isAgentDomain(null)).toBe(false);
        expect(isAgentDomain(undefined)).toBe(false);
        expect(isAgentDomain(123)).toBe(false);
        expect(isAgentDomain({})).toBe(false);
        expect(isAgentDomain([])).toBe(false);
      });
    });

    describe('isAgentStatus', () => {
      it('should return true for valid statuses', () => {
        expect(isAgentStatus('pending')).toBe(true);
        expect(isAgentStatus('running')).toBe(true);
        expect(isAgentStatus('completed')).toBe(true);
        expect(isAgentStatus('failed')).toBe(true);
        expect(isAgentStatus('cancelled')).toBe(true);
      });

      it('should return false for invalid statuses', () => {
        expect(isAgentStatus('invalid')).toBe(false);
        expect(isAgentStatus('')).toBe(false);
        expect(isAgentStatus('PENDING')).toBe(false);
        expect(isAgentStatus('Completed')).toBe(false);
        expect(isAgentStatus('active')).toBe(false);
      });

      it('should return false for non-string values', () => {
        expect(isAgentStatus(null)).toBe(false);
        expect(isAgentStatus(undefined)).toBe(false);
        expect(isAgentStatus(0)).toBe(false);
        expect(isAgentStatus(true)).toBe(false);
      });
    });

    describe('isGitProvider', () => {
      it('should return true for valid providers', () => {
        expect(isGitProvider('github')).toBe(true);
        expect(isGitProvider('gitlab')).toBe(true);
        expect(isGitProvider('azure-devops')).toBe(true);
        expect(isGitProvider('bitbucket')).toBe(true);
        expect(isGitProvider('unknown')).toBe(true);
      });

      it('should return false for invalid providers', () => {
        expect(isGitProvider('gitea')).toBe(false);
        expect(isGitProvider('')).toBe(false);
        expect(isGitProvider('GitHub')).toBe(false);
        expect(isGitProvider('GITLAB')).toBe(false);
      });

      it('should return false for non-string values', () => {
        expect(isGitProvider(null)).toBe(false);
        expect(isGitProvider(undefined)).toBe(false);
        expect(isGitProvider(42)).toBe(false);
      });
    });
  });

  // ============================================================================
  // DEFAULT CONFIG TESTS
  // ============================================================================

  describe('DEFAULT_PARALLEL_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_PARALLEL_CONFIG.enabled).toBe(false);
      expect(DEFAULT_PARALLEL_CONFIG.maxParallel).toBe(3);
      expect(DEFAULT_PARALLEL_CONFIG.domains).toEqual([]);
      expect(DEFAULT_PARALLEL_CONFIG.createPR).toBe(false);
      expect(DEFAULT_PARALLEL_CONFIG.draftPR).toBe(false);
      expect(DEFAULT_PARALLEL_CONFIG.mergeStrategy).toBe('auto');
      expect(DEFAULT_PARALLEL_CONFIG.baseBranch).toBe('main');
    });

    it('should be immutable by convention', () => {
      // Test that defaults are reasonable and won't break things
      const config = { ...DEFAULT_PARALLEL_CONFIG };
      expect(config.maxParallel).toBeGreaterThan(0);
      expect(config.maxParallel).toBeLessThanOrEqual(10);
    });
  });

  // ============================================================================
  // DOMAIN SUBAGENT MAP TESTS
  // ============================================================================

  describe('DOMAIN_SUBAGENT_MAP', () => {
    it('should map all domains to subagent types', () => {
      const domains: AgentDomain[] = ['frontend', 'backend', 'database', 'devops', 'qa', 'general'];
      for (const domain of domains) {
        expect(DOMAIN_SUBAGENT_MAP[domain]).toBeDefined();
        expect(typeof DOMAIN_SUBAGENT_MAP[domain]).toBe('string');
        expect(DOMAIN_SUBAGENT_MAP[domain].length).toBeGreaterThan(0);
      }
    });

    it('should have correct mappings for each domain', () => {
      expect(DOMAIN_SUBAGENT_MAP.frontend).toBe('sw-frontend:frontend-architect');
      expect(DOMAIN_SUBAGENT_MAP.backend).toBe('sw-backend:database-optimizer');
      expect(DOMAIN_SUBAGENT_MAP.database).toBe('sw-backend:database-optimizer');
      expect(DOMAIN_SUBAGENT_MAP.devops).toBe('sw-infra:devops');
      expect(DOMAIN_SUBAGENT_MAP.qa).toBe('sw-testing:qa-engineer');
      expect(DOMAIN_SUBAGENT_MAP.general).toBe('general-purpose');
    });
  });

  // ============================================================================
  // INTERFACE SERIALIZATION TESTS
  // ============================================================================

  describe('Interface Serialization', () => {
    describe('WorktreeInfo', () => {
      it('should serialize to valid JSON', () => {
        const worktree: WorktreeInfo = {
          path: '/home/user/.specweave/worktrees/agent-123',
          branch: 'auto/frontend-0170',
          agentId: 'agent-123',
          createdAt: '2025-01-17T10:00:00.000Z',
          locked: false,
        };
        const json = JSON.stringify(worktree);
        const parsed = JSON.parse(json);
        expect(parsed).toEqual(worktree);
      });

      it('should handle all field types correctly', () => {
        const worktree: WorktreeInfo = {
          path: 'C:\\Users\\test\\.specweave\\worktrees\\agent-456',
          branch: 'auto/backend-0170-12345678',
          agentId: 'agent-456',
          createdAt: new Date().toISOString(),
          locked: true,
        };
        const json = JSON.stringify(worktree);
        expect(() => JSON.parse(json)).not.toThrow();
      });
    });

    describe('ParallelAgent', () => {
      it('should serialize to valid JSON', () => {
        const agent: ParallelAgent = {
          id: 'agent-abc123',
          domain: 'frontend',
          status: 'running',
          worktree: {
            path: '/tmp/worktrees/agent-abc123',
            branch: 'auto/frontend-0170',
            agentId: 'agent-abc123',
            createdAt: '2025-01-17T10:00:00.000Z',
            locked: false,
          },
          taskIds: ['T-001', 'T-002', 'T-003'],
          startedAt: '2025-01-17T10:00:00.000Z',
          progress: {
            completed: 1,
            total: 3,
          },
          heartbeat: '2025-01-17T10:05:00.000Z',
          subagentType: 'sw-frontend:frontend-architect',
        };
        const json = JSON.stringify(agent);
        const parsed = JSON.parse(json);
        expect(parsed.id).toBe(agent.id);
        expect(parsed.domain).toBe(agent.domain);
        expect(parsed.status).toBe(agent.status);
        expect(parsed.taskIds).toEqual(agent.taskIds);
        expect(parsed.progress).toEqual(agent.progress);
      });

      it('should handle optional fields', () => {
        const agent: ParallelAgent = {
          id: 'agent-minimal',
          domain: 'general',
          status: 'pending',
          worktree: {
            path: '/tmp/worktrees/agent-minimal',
            branch: 'auto/general-0170',
            agentId: 'agent-minimal',
            createdAt: '2025-01-17T10:00:00.000Z',
            locked: false,
          },
          taskIds: [],
          progress: { completed: 0, total: 0 },
          subagentType: 'general-purpose',
        };
        const json = JSON.stringify(agent);
        const parsed = JSON.parse(json);
        expect(parsed.startedAt).toBeUndefined();
        expect(parsed.completedAt).toBeUndefined();
        expect(parsed.failedAt).toBeUndefined();
        expect(parsed.error).toBeUndefined();
        expect(parsed.heartbeat).toBeUndefined();
      });

      it('should handle failed agent state', () => {
        const agent: ParallelAgent = {
          id: 'agent-failed',
          domain: 'backend',
          status: 'failed',
          worktree: {
            path: '/tmp/worktrees/agent-failed',
            branch: 'auto/backend-0170',
            agentId: 'agent-failed',
            createdAt: '2025-01-17T10:00:00.000Z',
            locked: false,
          },
          taskIds: ['T-010'],
          startedAt: '2025-01-17T10:00:00.000Z',
          failedAt: '2025-01-17T10:15:00.000Z',
          error: 'Build failed with exit code 1',
          progress: { completed: 0, total: 1 },
          subagentType: 'sw-backend:database-optimizer',
        };
        const json = JSON.stringify(agent);
        const parsed = JSON.parse(json);
        expect(parsed.status).toBe('failed');
        expect(parsed.error).toBe('Build failed with exit code 1');
        expect(parsed.failedAt).toBeDefined();
      });
    });

    describe('ParallelSession', () => {
      it('should serialize to valid JSON for state file', () => {
        const session: ParallelSession = {
          id: 'session-xyz789',
          incrementId: '0170-parallel-auto-mode',
          status: 'active',
          agents: [
            {
              id: 'agent-fe',
              domain: 'frontend',
              status: 'running',
              worktree: {
                path: '/tmp/worktrees/agent-fe',
                branch: 'auto/frontend-0170',
                agentId: 'agent-fe',
                createdAt: '2025-01-17T10:00:00.000Z',
                locked: false,
              },
              taskIds: ['T-001'],
              progress: { completed: 0, total: 1 },
              subagentType: 'sw-frontend:frontend-architect',
            },
            {
              id: 'agent-be',
              domain: 'backend',
              status: 'completed',
              worktree: {
                path: '/tmp/worktrees/agent-be',
                branch: 'auto/backend-0170',
                agentId: 'agent-be',
                createdAt: '2025-01-17T10:00:00.000Z',
                locked: false,
              },
              taskIds: ['T-002'],
              completedAt: '2025-01-17T10:10:00.000Z',
              progress: { completed: 1, total: 1 },
              subagentType: 'sw-backend:database-optimizer',
            },
          ],
          startedAt: '2025-01-17T10:00:00.000Z',
          config: DEFAULT_PARALLEL_CONFIG,
          mergeOrder: ['agent-be', 'agent-fe'],
          prResults: [],
        };
        const json = JSON.stringify(session, null, 2);
        const parsed = JSON.parse(json);
        expect(parsed.id).toBe(session.id);
        expect(parsed.agents).toHaveLength(2);
        expect(parsed.mergeOrder).toEqual(['agent-be', 'agent-fe']);
      });
    });

    describe('FlagSuggestion', () => {
      it('should serialize to valid JSON', () => {
        const suggestion: FlagSuggestion = {
          flag: '--parallel',
          reason: 'Detected both frontend and backend keywords',
          confidence: 'high',
        };
        const json = JSON.stringify(suggestion);
        const parsed = JSON.parse(json);
        expect(parsed.flag).toBe('--parallel');
        expect(parsed.confidence).toBe('high');
      });

      it('should handle domain field', () => {
        const suggestion: FlagSuggestion = {
          flag: '--frontend',
          reason: 'Detected React and UI keywords',
          confidence: 'medium',
          domain: 'frontend',
        };
        const json = JSON.stringify(suggestion);
        const parsed = JSON.parse(json);
        expect(parsed.domain).toBe('frontend');
      });
    });

    describe('PRResult', () => {
      it('should serialize successful PR', () => {
        const result: PRResult = {
          agentId: 'agent-123',
          domain: 'frontend',
          prNumber: 42,
          prUrl: 'https://github.com/org/repo/pull/42',
          provider: 'github',
          status: 'created',
          createdAt: '2025-01-17T10:30:00.000Z',
        };
        const json = JSON.stringify(result);
        const parsed = JSON.parse(json);
        expect(parsed.prNumber).toBe(42);
        expect(parsed.status).toBe('created');
      });

      it('should serialize failed PR', () => {
        const result: PRResult = {
          agentId: 'agent-456',
          domain: 'backend',
          provider: 'github',
          status: 'failed',
          error: 'GitHub API rate limit exceeded',
          createdAt: '2025-01-17T10:30:00.000Z',
        };
        const json = JSON.stringify(result);
        const parsed = JSON.parse(json);
        expect(parsed.status).toBe('failed');
        expect(parsed.error).toBeDefined();
        expect(parsed.prNumber).toBeUndefined();
      });

      it('should serialize skipped PR', () => {
        const result: PRResult = {
          agentId: 'agent-789',
          domain: 'qa',
          provider: 'unknown',
          status: 'skipped',
          createdAt: '2025-01-17T10:30:00.000Z',
        };
        const json = JSON.stringify(result);
        const parsed = JSON.parse(json);
        expect(parsed.status).toBe('skipped');
      });
    });

    describe('ParallelConfig', () => {
      it('should serialize custom config', () => {
        const config: ParallelConfig = {
          enabled: true,
          maxParallel: 5,
          domains: ['frontend', 'backend', 'database'],
          createPR: true,
          draftPR: true,
          mergeStrategy: 'pr',
          baseBranch: 'develop',
        };
        const json = JSON.stringify(config);
        const parsed = JSON.parse(json);
        expect(parsed.enabled).toBe(true);
        expect(parsed.maxParallel).toBe(5);
        expect(parsed.domains).toEqual(['frontend', 'backend', 'database']);
        expect(parsed.mergeStrategy).toBe('pr');
      });
    });
  });

  // ============================================================================
  // TYPE COMPLETENESS TESTS
  // ============================================================================

  describe('Type Completeness', () => {
    it('should cover all AgentDomain values', () => {
      const domains: AgentDomain[] = ['frontend', 'backend', 'database', 'devops', 'qa', 'general'];
      expect(domains).toHaveLength(6);
      domains.forEach((domain) => {
        expect(isAgentDomain(domain)).toBe(true);
      });
    });

    it('should cover all AgentStatus values', () => {
      const statuses: AgentStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled'];
      expect(statuses).toHaveLength(5);
      statuses.forEach((status) => {
        expect(isAgentStatus(status)).toBe(true);
      });
    });

    it('should cover all GitProvider values', () => {
      const providers: GitProvider[] = [
        'github',
        'gitlab',
        'azure-devops',
        'bitbucket',
        'unknown',
      ];
      expect(providers).toHaveLength(5);
      providers.forEach((provider) => {
        expect(isGitProvider(provider)).toBe(true);
      });
    });
  });
});
