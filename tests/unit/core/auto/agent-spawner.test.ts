/**
 * Agent Spawner Tests
 *
 * Tests for the Agent Spawner that creates Task tool invocations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AgentSpawner,
  type AgentContext,
  type TaskSpawnRequest,
  type AgentSpawnResult,
} from '../../../../src/core/auto/parallel/agent-spawner.js';
import type {
  AgentDomain,
  ParallelConfig,
  WorktreeInfo,
} from '../../../../src/core/auto/types.js';

// Mock platform-utils
vi.mock('../../../../src/core/auto/parallel/platform-utils.js', () => ({
  generateId: (prefix: string) => `${prefix}-test-12345678`,
  timestamp: () => '2025-01-17T10:00:00.000Z',
}));

describe('AgentSpawner', () => {
  let spawner: AgentSpawner;

  const mockWorktree: WorktreeInfo = {
    path: '/tmp/worktrees/agent-test',
    branch: 'auto/frontend-0170',
    agentId: 'agent-test',
    createdAt: '2025-01-17T10:00:00.000Z',
    locked: false,
  };

  const mockConfig: ParallelConfig = {
    enabled: true,
    maxParallel: 3,
    domains: ['frontend', 'backend'],
    createPR: false,
    draftPR: false,
    mergeStrategy: 'auto',
    baseBranch: 'main',
  };

  const createContext = (overrides: Partial<AgentContext> = {}): AgentContext => ({
    incrementId: '0170-parallel-auto-mode',
    worktree: mockWorktree,
    taskIds: ['T-001', 'T-002', 'T-003'],
    config: mockConfig,
    ...overrides,
  });

  beforeEach(() => {
    spawner = new AgentSpawner();
  });

  // ============================================================================
  // SPAWN TESTS
  // ============================================================================

  describe('spawn', () => {
    it('should create a spawn result with agent and task request', () => {
      const context = createContext();
      const result = spawner.spawn('frontend', context);

      expect(result).toBeDefined();
      expect(result.agent).toBeDefined();
      expect(result.taskRequest).toBeDefined();
    });

    it('should create agent with correct domain', () => {
      const context = createContext();
      const result = spawner.spawn('frontend', context);

      expect(result.agent.domain).toBe('frontend');
    });

    it('should create agent with pending status', () => {
      const context = createContext();
      const result = spawner.spawn('backend', context);

      expect(result.agent.status).toBe('pending');
    });

    it('should create agent with correct task IDs', () => {
      const context = createContext({ taskIds: ['T-010', 'T-011'] });
      const result = spawner.spawn('database', context);

      expect(result.agent.taskIds).toEqual(['T-010', 'T-011']);
    });

    it('should create agent with correct progress tracking', () => {
      const context = createContext({ taskIds: ['T-001', 'T-002', 'T-003', 'T-004'] });
      const result = spawner.spawn('frontend', context);

      expect(result.agent.progress.completed).toBe(0);
      expect(result.agent.progress.total).toBe(4);
    });

    it('should create agent with worktree info', () => {
      const context = createContext();
      const result = spawner.spawn('frontend', context);

      expect(result.agent.worktree).toEqual(mockWorktree);
    });

    it('should generate unique agent ID', () => {
      const context = createContext();
      const result = spawner.spawn('frontend', context);

      expect(result.agent.id).toMatch(/^agent-frontend-test-/);
    });

    it('should set subagent type on agent', () => {
      const context = createContext();
      const result = spawner.spawn('frontend', context);

      expect(result.agent.subagentType).toBe('sw-frontend:frontend-architect');
    });

    describe('TaskSpawnRequest', () => {
      it('should have correct subagent_type', () => {
        const context = createContext();
        const result = spawner.spawn('frontend', context);

        expect(result.taskRequest.subagent_type).toBe('sw-frontend:frontend-architect');
      });

      it('should have non-empty prompt', () => {
        const context = createContext();
        const result = spawner.spawn('frontend', context);

        expect(result.taskRequest.prompt.length).toBeGreaterThan(0);
      });

      it('should have descriptive description', () => {
        const context = createContext();
        const result = spawner.spawn('frontend', context);

        expect(result.taskRequest.description).toBe('frontend agent for 0170-parallel-auto-mode');
      });

      it('should run in background by default', () => {
        const context = createContext();
        const result = spawner.spawn('frontend', context);

        expect(result.taskRequest.run_in_background).toBe(true);
      });

      it('should have model set', () => {
        const context = createContext();
        const result = spawner.spawn('frontend', context);

        expect(result.taskRequest.model).toBe('sonnet');
      });
    });
  });

  // ============================================================================
  // SUBAGENT TYPE SELECTION TESTS
  // ============================================================================

  describe('selectSubagentType', () => {
    it('should return frontend architect for frontend domain', () => {
      expect(spawner.selectSubagentType('frontend')).toBe('sw-frontend:frontend-architect');
    });

    it('should return database optimizer for backend domain', () => {
      expect(spawner.selectSubagentType('backend')).toBe('sw-backend:database-optimizer');
    });

    it('should return database optimizer for database domain', () => {
      expect(spawner.selectSubagentType('database')).toBe('sw-backend:database-optimizer');
    });

    it('should return devops for devops domain', () => {
      expect(spawner.selectSubagentType('devops')).toBe('sw-infra:devops');
    });

    it('should return qa engineer for qa domain', () => {
      expect(spawner.selectSubagentType('qa')).toBe('sw-testing:qa-engineer');
    });

    it('should return general-purpose for general domain', () => {
      expect(spawner.selectSubagentType('general')).toBe('general-purpose');
    });
  });

  // ============================================================================
  // MODEL SELECTION TESTS
  // ============================================================================

  describe('selectModel', () => {
    it('should return sonnet for frontend', () => {
      expect(spawner.selectModel('frontend')).toBe('sonnet');
    });

    it('should return sonnet for backend', () => {
      expect(spawner.selectModel('backend')).toBe('sonnet');
    });

    it('should return sonnet for database', () => {
      expect(spawner.selectModel('database')).toBe('sonnet');
    });

    it('should return sonnet for devops', () => {
      expect(spawner.selectModel('devops')).toBe('sonnet');
    });

    it('should return sonnet for qa', () => {
      expect(spawner.selectModel('qa')).toBe('sonnet');
    });

    it('should return sonnet for general', () => {
      expect(spawner.selectModel('general')).toBe('sonnet');
    });
  });

  // ============================================================================
  // PROMPT BUILDING TESTS
  // ============================================================================

  describe('buildAgentPrompt', () => {
    it('should include domain header', () => {
      const context = createContext();
      const prompt = spawner.buildAgentPrompt('frontend', context);

      expect(prompt).toContain('# Parallel Agent: FRONTEND');
    });

    it('should include increment ID', () => {
      const context = createContext();
      const prompt = spawner.buildAgentPrompt('frontend', context);

      expect(prompt).toContain('0170-parallel-auto-mode');
    });

    it('should include worktree path', () => {
      const context = createContext();
      const prompt = spawner.buildAgentPrompt('frontend', context);

      expect(prompt).toContain(mockWorktree.path);
    });

    it('should include branch name', () => {
      const context = createContext();
      const prompt = spawner.buildAgentPrompt('frontend', context);

      expect(prompt).toContain(mockWorktree.branch);
    });

    it('should list all task IDs', () => {
      const context = createContext({ taskIds: ['T-001', 'T-002', 'T-003'] });
      const prompt = spawner.buildAgentPrompt('frontend', context);

      expect(prompt).toContain('T-001');
      expect(prompt).toContain('T-002');
      expect(prompt).toContain('T-003');
    });

    it('should include task descriptions when provided', () => {
      const context = createContext({
        taskIds: ['T-001', 'T-002'],
        taskDescriptions: ['Create login form', 'Add validation'],
      });
      const prompt = spawner.buildAgentPrompt('frontend', context);

      expect(prompt).toContain('Create login form');
      expect(prompt).toContain('Add validation');
    });

    it('should use default descriptions when not provided', () => {
      const context = createContext({ taskIds: ['T-001'] });
      const prompt = spawner.buildAgentPrompt('frontend', context);

      expect(prompt).toContain('Complete task T-001');
    });

    it('should include domain-specific guidelines', () => {
      const context = createContext();
      const prompt = spawner.buildAgentPrompt('frontend', context);

      expect(prompt).toContain('Focus on UI/UX');
    });

    it('should include completion requirements', () => {
      const context = createContext();
      const prompt = spawner.buildAgentPrompt('frontend', context);

      expect(prompt).toContain('Completion Requirements');
      expect(prompt).toContain('90%+ coverage');
    });

    it('should mention auto merge when strategy is auto', () => {
      const context = createContext({
        config: { ...mockConfig, mergeStrategy: 'auto' },
      });
      const prompt = spawner.buildAgentPrompt('frontend', context);

      expect(prompt).toContain('automatically merged');
    });

    it('should mention PR when strategy is pr', () => {
      const context = createContext({
        config: { ...mockConfig, mergeStrategy: 'pr' },
      });
      const prompt = spawner.buildAgentPrompt('frontend', context);

      expect(prompt).toContain('pull request');
    });

    it('should not mention merge for manual strategy', () => {
      const context = createContext({
        config: { ...mockConfig, mergeStrategy: 'manual' },
      });
      const prompt = spawner.buildAgentPrompt('frontend', context);

      expect(prompt).not.toContain('automatically merged');
      expect(prompt).not.toContain('pull request will be created');
    });
  });

  // ============================================================================
  // DOMAIN GUIDELINES TESTS
  // ============================================================================

  describe('getDomainGuidelines', () => {
    it('should return frontend guidelines', () => {
      const guidelines = spawner.getDomainGuidelines('frontend');

      expect(guidelines).toContain('UI/UX');
      expect(guidelines).toContain('component');
      expect(guidelines).toContain('responsive');
      expect(guidelines).toContain('accessibility');
    });

    it('should return backend guidelines', () => {
      const guidelines = spawner.getDomainGuidelines('backend');

      expect(guidelines).toContain('API');
      expect(guidelines).toContain('error handling');
      expect(guidelines).toContain('validation');
      expect(guidelines).toContain('security');
    });

    it('should return database guidelines', () => {
      const guidelines = spawner.getDomainGuidelines('database');

      expect(guidelines).toContain('schema');
      expect(guidelines).toContain('migrations');
      expect(guidelines).toContain('indexes');
      expect(guidelines).toContain('integrity');
    });

    it('should return devops guidelines', () => {
      const guidelines = spawner.getDomainGuidelines('devops');

      expect(guidelines).toContain('infrastructure-as-code');
      expect(guidelines).toContain('idempotent');
      expect(guidelines).toContain('monitoring');
      expect(guidelines).toContain('secrets');
    });

    it('should return qa guidelines', () => {
      const guidelines = spawner.getDomainGuidelines('qa');

      expect(guidelines).toContain('test cases');
      expect(guidelines).toContain('edge cases');
      expect(guidelines).toContain('mocking');
      expect(guidelines).toContain('coverage');
    });

    it('should return general guidelines', () => {
      const guidelines = spawner.getDomainGuidelines('general');

      expect(guidelines).toContain('conventions');
      expect(guidelines).toContain('maintainable');
      expect(guidelines).toContain('documentation');
    });
  });

  // ============================================================================
  // DESCRIPTION BUILDING TESTS
  // ============================================================================

  describe('buildDescription', () => {
    it('should create description with domain and increment', () => {
      const desc = spawner.buildDescription('frontend', '0170-parallel-auto-mode');

      expect(desc).toBe('frontend agent for 0170-parallel-auto-mode');
    });

    it('should work for all domains', () => {
      const domains: AgentDomain[] = ['frontend', 'backend', 'database', 'devops', 'qa', 'general'];

      for (const domain of domains) {
        const desc = spawner.buildDescription(domain, '0001-test');
        expect(desc).toContain(domain);
        expect(desc).toContain('0001-test');
      }
    });
  });

  // ============================================================================
  // SPAWN MULTIPLE TESTS
  // ============================================================================

  describe('spawnMultiple', () => {
    it('should spawn multiple agents', () => {
      const contexts = new Map<AgentDomain, AgentContext>();
      contexts.set('frontend', createContext());
      contexts.set('backend', createContext());

      const results = spawner.spawnMultiple(['frontend', 'backend'], contexts);

      expect(results).toHaveLength(2);
    });

    it('should spawn agents in order', () => {
      const contexts = new Map<AgentDomain, AgentContext>();
      contexts.set('frontend', createContext());
      contexts.set('backend', createContext());
      contexts.set('database', createContext());

      const results = spawner.spawnMultiple(['database', 'frontend', 'backend'], contexts);

      expect(results[0].agent.domain).toBe('database');
      expect(results[1].agent.domain).toBe('frontend');
      expect(results[2].agent.domain).toBe('backend');
    });

    it('should skip domains without context', () => {
      const contexts = new Map<AgentDomain, AgentContext>();
      contexts.set('frontend', createContext());

      const results = spawner.spawnMultiple(['frontend', 'backend', 'database'], contexts);

      expect(results).toHaveLength(1);
      expect(results[0].agent.domain).toBe('frontend');
    });

    it('should return empty array for empty domains', () => {
      const contexts = new Map<AgentDomain, AgentContext>();
      const results = spawner.spawnMultiple([], contexts);

      expect(results).toEqual([]);
    });

    it('should return empty array for empty contexts', () => {
      const contexts = new Map<AgentDomain, AgentContext>();
      const results = spawner.spawnMultiple(['frontend', 'backend'], contexts);

      expect(results).toEqual([]);
    });

    it('should create unique agents for each domain', () => {
      const contexts = new Map<AgentDomain, AgentContext>();
      contexts.set('frontend', createContext({ taskIds: ['T-001'] }));
      contexts.set('backend', createContext({ taskIds: ['T-002'] }));

      const results = spawner.spawnMultiple(['frontend', 'backend'], contexts);

      const agentIds = results.map((r) => r.agent.id);
      const uniqueIds = new Set(agentIds);
      expect(uniqueIds.size).toBe(agentIds.length);
    });
  });

  // ============================================================================
  // UTILITY METHOD TESTS
  // ============================================================================

  describe('getSubagentMap', () => {
    it('should return a copy of the subagent map', () => {
      const map = spawner.getSubagentMap();

      expect(map.frontend).toBe('sw-frontend:frontend-architect');
      expect(map.backend).toBe('sw-backend:database-optimizer');
      expect(map.general).toBe('general-purpose');
    });

    it('should return a copy, not the original', () => {
      const map1 = spawner.getSubagentMap();
      const map2 = spawner.getSubagentMap();

      expect(map1).not.toBe(map2);
      expect(map1).toEqual(map2);
    });

    it('should include all domains', () => {
      const map = spawner.getSubagentMap();

      expect(Object.keys(map)).toContain('frontend');
      expect(Object.keys(map)).toContain('backend');
      expect(Object.keys(map)).toContain('database');
      expect(Object.keys(map)).toContain('devops');
      expect(Object.keys(map)).toContain('qa');
      expect(Object.keys(map)).toContain('general');
    });
  });

  describe('isDomainSupported', () => {
    it('should return true for supported domains', () => {
      expect(spawner.isDomainSupported('frontend')).toBe(true);
      expect(spawner.isDomainSupported('backend')).toBe(true);
      expect(spawner.isDomainSupported('database')).toBe(true);
      expect(spawner.isDomainSupported('devops')).toBe(true);
      expect(spawner.isDomainSupported('qa')).toBe(true);
      expect(spawner.isDomainSupported('general')).toBe(true);
    });

    it('should return false for unsupported domains', () => {
      expect(spawner.isDomainSupported('unknown')).toBe(false);
      expect(spawner.isDomainSupported('mobile')).toBe(false);
      expect(spawner.isDomainSupported('security')).toBe(false);
      expect(spawner.isDomainSupported('')).toBe(false);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty task IDs', () => {
      const context = createContext({ taskIds: [] });
      const result = spawner.spawn('frontend', context);

      expect(result.agent.taskIds).toEqual([]);
      expect(result.agent.progress.total).toBe(0);
    });

    it('should handle single task', () => {
      const context = createContext({ taskIds: ['T-001'] });
      const result = spawner.spawn('frontend', context);

      expect(result.agent.taskIds).toHaveLength(1);
      expect(result.agent.progress.total).toBe(1);
    });

    it('should handle many tasks', () => {
      const taskIds = Array.from({ length: 50 }, (_, i) => `T-${String(i + 1).padStart(3, '0')}`);
      const context = createContext({ taskIds });
      const result = spawner.spawn('frontend', context);

      expect(result.agent.taskIds).toHaveLength(50);
      expect(result.agent.progress.total).toBe(50);
    });

    it('should handle Windows paths in worktree', () => {
      const windowsWorktree: WorktreeInfo = {
        ...mockWorktree,
        path: 'C:\\Users\\test\\.specweave\\worktrees\\agent-win',
      };
      const context = createContext({ worktree: windowsWorktree });
      const result = spawner.spawn('frontend', context);

      expect(result.taskRequest.prompt).toContain(windowsWorktree.path);
    });

    it('should handle special characters in increment ID', () => {
      const context = createContext({ incrementId: '0170-test_feature-v2.0' });
      const result = spawner.spawn('frontend', context);

      expect(result.taskRequest.description).toContain('0170-test_feature-v2.0');
    });

    it('should handle task descriptions with special characters', () => {
      const context = createContext({
        taskIds: ['T-001'],
        taskDescriptions: ['Fix "login" & <validation> issues'],
      });
      const prompt = spawner.buildAgentPrompt('frontend', context);

      expect(prompt).toContain('Fix "login" & <validation> issues');
    });
  });

  // ============================================================================
  // ALL DOMAINS INTEGRATION
  // ============================================================================

  describe('All Domains Integration', () => {
    const domains: AgentDomain[] = ['frontend', 'backend', 'database', 'devops', 'qa', 'general'];

    it.each(domains)('should spawn %s agent correctly', (domain) => {
      const context = createContext();
      const result = spawner.spawn(domain, context);

      expect(result.agent.domain).toBe(domain);
      expect(result.agent.status).toBe('pending');
      expect(result.taskRequest.subagent_type).toBeTruthy();
      expect(result.taskRequest.prompt.length).toBeGreaterThan(100);
    });

    it.each(domains)('should include domain guidelines for %s', (domain) => {
      const guidelines = spawner.getDomainGuidelines(domain);

      expect(guidelines.length).toBeGreaterThan(50);
      expect(guidelines).not.toContain('undefined');
    });
  });
});
