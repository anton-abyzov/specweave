/**
 * Parallel Orchestrator
 *
 * Orchestrates parallel agent execution for the auto mode.
 * Coordinates worktrees, state, spawning, and PR creation.
 */

import type {
  AgentDomain,
  ParallelSession,
  ParallelAgent,
  ParallelConfig,
  WorktreeInfo,
  PRResult,
  FlagSuggestion,
  DEFAULT_PARALLEL_CONFIG,
} from '../types.js';
import { WorktreeManager } from './worktree-manager.js';
import { StateManager } from './state-manager.js';
import { AgentSpawner, type AgentContext, type AgentSpawnResult, type TaskSpawnRequest } from './agent-spawner.js';
import { PRGenerator, type PRCreateOptions } from './pr-generator.js';
import { PromptAnalyzer } from './prompt-analyzer.js';
import { generateId, timestamp } from './platform-utils.js';

/**
 * Task assignment for a domain
 */
export interface DomainTaskAssignment {
  domain: AgentDomain;
  taskIds: string[];
  taskDescriptions?: string[];
}

/**
 * Session creation options
 */
export interface SessionCreateOptions {
  incrementId: string;
  config: ParallelConfig;
  baseBranch?: string;
}

/**
 * Session status result
 */
export interface SessionStatus {
  sessionId: string;
  incrementId: string;
  status: ParallelSession['status'];
  agents: Array<{
    id: string;
    domain: AgentDomain;
    status: string;
    progress: { completed: number; total: number };
    branch: string;
  }>;
  overall: {
    totalAgents: number;
    running: number;
    completed: number;
    failed: number;
    pending: number;
  };
  startedAt: string;
  completedAt?: string;
}

/**
 * Agent completion callback
 */
export type AgentCompletionCallback = (agent: ParallelAgent, result: 'completed' | 'failed') => void;

/**
 * Parallel Orchestrator coordinates all parallel execution components.
 */
export class ParallelOrchestrator {
  private readonly rootPath: string;
  private readonly worktreeManager: WorktreeManager;
  private readonly stateManager: StateManager;
  private readonly agentSpawner: AgentSpawner;
  private readonly prGenerator: PRGenerator;
  private readonly promptAnalyzer: PromptAnalyzer;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.worktreeManager = new WorktreeManager(rootPath);
    this.stateManager = new StateManager(rootPath);
    this.agentSpawner = new AgentSpawner();
    this.prGenerator = new PRGenerator(rootPath);
    this.promptAnalyzer = new PromptAnalyzer();
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  /**
   * Create a new parallel session
   */
  async createSession(options: SessionCreateOptions): Promise<ParallelSession> {
    const { incrementId, config, baseBranch = config.baseBranch } = options;

    // Check for existing session
    if (this.stateManager.hasSession()) {
      const existing = this.stateManager.loadSession();
      if (existing && existing.status === 'active') {
        throw new Error(`Active session already exists: ${existing.id}`);
      }
    }

    const session: ParallelSession = {
      id: generateId('session'),
      incrementId,
      status: 'active',
      agents: [],
      startedAt: timestamp(),
      config: { ...config, baseBranch },
      mergeOrder: [],
      prResults: [],
    };

    this.stateManager.saveSession(session);
    return session;
  }

  /**
   * Get current session
   */
  getSession(): ParallelSession | null {
    return this.stateManager.loadSession();
  }

  /**
   * Check if a session is active
   */
  hasActiveSession(): boolean {
    return this.stateManager.isSessionActive();
  }

  /**
   * Get session status with detailed agent info
   */
  getSessionStatus(): SessionStatus | null {
    const session = this.stateManager.loadSession();
    if (!session) {
      return null;
    }

    const agents = session.agents.map((agent) => ({
      id: agent.id,
      domain: agent.domain,
      status: agent.status,
      progress: agent.progress,
      branch: agent.worktree.branch,
    }));

    const overall = {
      totalAgents: agents.length,
      running: agents.filter((a) => a.status === 'running').length,
      completed: agents.filter((a) => a.status === 'completed').length,
      failed: agents.filter((a) => a.status === 'failed').length,
      pending: agents.filter((a) => a.status === 'pending').length,
    };

    return {
      sessionId: session.id,
      incrementId: session.incrementId,
      status: session.status,
      agents,
      overall,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
    };
  }

  /**
   * Cancel the current session
   */
  async cancelSession(): Promise<void> {
    const session = this.stateManager.loadSession();
    if (!session) {
      return;
    }

    // Mark all pending/running agents as cancelled
    for (const agent of session.agents) {
      if (agent.status === 'pending' || agent.status === 'running') {
        this.stateManager.markAgentCancelled(agent.id);
      }
    }

    // Update session status
    this.stateManager.updateSessionStatus('cancelled');

    // Clean up worktrees
    await this.cleanupWorktrees();
  }

  /**
   * Complete the session (after all agents done)
   */
  async completeSession(): Promise<ParallelSession | null> {
    const session = this.stateManager.loadSession();
    if (!session) {
      return null;
    }

    // Check if all agents are done
    const allDone = session.agents.every(
      (a) => a.status === 'completed' || a.status === 'failed' || a.status === 'cancelled'
    );

    if (!allDone) {
      throw new Error('Cannot complete session: some agents are still running');
    }

    // Determine final status
    const anyFailed = session.agents.some((a) => a.status === 'failed');
    const allCancelled = session.agents.every((a) => a.status === 'cancelled');

    let finalStatus: ParallelSession['status'];
    if (allCancelled) {
      finalStatus = 'cancelled';
    } else if (anyFailed) {
      finalStatus = 'failed';
    } else {
      finalStatus = 'completed';
    }

    this.stateManager.updateSessionStatus(finalStatus);
    return this.stateManager.loadSession();
  }

  // ============================================================================
  // AGENT MANAGEMENT
  // ============================================================================

  /**
   * Spawn agents for task assignments
   */
  async spawnAgents(assignments: DomainTaskAssignment[]): Promise<AgentSpawnResult[]> {
    const session = this.stateManager.loadSession();
    if (!session) {
      throw new Error('No active session');
    }

    const results: AgentSpawnResult[] = [];

    for (const assignment of assignments) {
      // Create worktree
      const worktree = await this.worktreeManager.create({
        agentId: generateId(`agent-${assignment.domain}`),
        branchName: this.worktreeManager.generateBranchName(
          generateId(''),
          assignment.domain,
          session.incrementId
        ),
        baseBranch: session.config.baseBranch,
      });

      // Create agent context
      const context: AgentContext = {
        incrementId: session.incrementId,
        worktree,
        taskIds: assignment.taskIds,
        taskDescriptions: assignment.taskDescriptions,
        config: session.config,
      };

      // Spawn agent
      const result = this.agentSpawner.spawn(assignment.domain, context);
      results.push(result);

      // Save agent state
      this.stateManager.saveAgent(result.agent);

      // Update session with new agent
      session.agents.push(result.agent);
    }

    // Save updated session
    this.stateManager.saveSession(session);

    return results;
  }

  /**
   * Get all task spawn requests (for batch execution)
   */
  getTaskRequests(spawnResults: AgentSpawnResult[]): TaskSpawnRequest[] {
    return spawnResults.map((r) => r.taskRequest);
  }

  /**
   * Mark an agent as started
   */
  markAgentStarted(agentId: string): void {
    this.stateManager.markAgentStarted(agentId);
    this.updateSessionAgent(agentId, { status: 'running' });
  }

  /**
   * Update agent progress
   */
  updateAgentProgress(agentId: string, completed: number, total: number): void {
    this.stateManager.updateProgress(agentId, completed, total);
    this.updateSessionAgent(agentId, { progress: { completed, total } });
  }

  /**
   * Mark an agent as completed
   */
  markAgentCompleted(agentId: string): void {
    this.stateManager.markAgentCompleted(agentId);
    this.updateSessionAgent(agentId, { status: 'completed', completedAt: timestamp() });
  }

  /**
   * Mark an agent as failed
   */
  markAgentFailed(agentId: string, error: string): void {
    this.stateManager.markAgentFailed(agentId, error);
    this.updateSessionAgent(agentId, { status: 'failed', failedAt: timestamp(), error });
  }

  /**
   * Update agent heartbeat
   */
  updateHeartbeat(agentId: string): void {
    this.stateManager.updateHeartbeat(agentId);
  }

  /**
   * Check for zombie agents
   */
  detectZombies(timeoutMs?: number): ParallelAgent[] {
    return this.stateManager.detectZombies(timeoutMs);
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): ParallelAgent | null {
    return this.stateManager.loadAgent(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents(): ParallelAgent[] {
    return this.stateManager.loadAllAgents();
  }

  // ============================================================================
  // PR MANAGEMENT
  // ============================================================================

  /**
   * Create PRs for completed agents
   */
  async createPRs(options: PRCreateOptions = {}): Promise<PRResult[]> {
    const session = this.stateManager.loadSession();
    if (!session) {
      throw new Error('No active session');
    }

    const completedAgents = session.agents.filter((a) => a.status === 'completed');
    const results = await this.prGenerator.createMultiplePRs(
      completedAgents,
      session.incrementId,
      {
        ...options,
        baseBranch: session.config.baseBranch,
        draft: session.config.draftPR || options.draft,
      }
    );

    // Update session with PR results
    session.prResults = results;
    this.stateManager.saveSession(session);

    return results;
  }

  /**
   * Create a single PR for an agent
   */
  async createPR(agentId: string, options: PRCreateOptions = {}): Promise<PRResult | null> {
    const session = this.stateManager.loadSession();
    const agent = this.stateManager.loadAgent(agentId);

    if (!session || !agent) {
      return null;
    }

    const result = await this.prGenerator.createPR(agent, session.incrementId, {
      ...options,
      baseBranch: session.config.baseBranch,
    });

    // Update session with PR result
    const existingIndex = session.prResults.findIndex((r) => r.agentId === agentId);
    if (existingIndex >= 0) {
      session.prResults[existingIndex] = result;
    } else {
      session.prResults.push(result);
    }
    this.stateManager.saveSession(session);

    return result;
  }

  /**
   * Get PR results
   */
  getPRResults(): PRResult[] {
    const session = this.stateManager.loadSession();
    return session?.prResults ?? [];
  }

  // ============================================================================
  // MERGE MANAGEMENT
  // ============================================================================

  /**
   * Compute merge order for completed agents
   */
  computeMergeOrder(): string[] {
    const session = this.stateManager.loadSession();
    if (!session) {
      return [];
    }

    const completedAgents = session.agents
      .filter((a) => a.status === 'completed')
      .map((a) => ({ id: a.id, domain: a.domain }));

    return this.worktreeManager.computeMergeOrder(completedAgents);
  }

  /**
   * Merge an agent's branch
   */
  async mergeAgent(agentId: string, baseBranch?: string): Promise<{ success: boolean; error?: string }> {
    const session = this.stateManager.loadSession();
    if (!session) {
      return { success: false, error: 'No active session' };
    }

    const result = await this.worktreeManager.merge(
      agentId,
      baseBranch || session.config.baseBranch
    );

    return result;
  }

  /**
   * Check for merge conflicts
   */
  async hasConflicts(agentId: string): Promise<boolean> {
    const session = this.stateManager.loadSession();
    if (!session) {
      return false;
    }

    return this.worktreeManager.hasConflicts(agentId, session.config.baseBranch);
  }

  // ============================================================================
  // PROMPT ANALYSIS
  // ============================================================================

  /**
   * Analyze a prompt for parallel execution suggestions
   */
  analyzePrompt(prompt: string): FlagSuggestion[] {
    const result = this.promptAnalyzer.analyze(prompt);
    return result.suggestions;
  }

  /**
   * Check if prompt should suggest parallel execution
   */
  shouldSuggestParallel(prompt: string): boolean {
    const result = this.promptAnalyzer.analyze(prompt);
    return result.shouldUseParallel;
  }

  /**
   * Get suggested domains from prompt
   */
  getSuggestedDomains(prompt: string): AgentDomain[] {
    return this.promptAnalyzer.getSuggestedDomains(prompt);
  }

  /**
   * Format flag suggestions for display
   */
  formatSuggestions(suggestions: FlagSuggestion[]): string {
    return this.promptAnalyzer.formatSuggestions(suggestions);
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /**
   * Clean up all worktrees
   */
  async cleanupWorktrees(): Promise<void> {
    const agents = this.stateManager.loadAllAgents();

    for (const agent of agents) {
      try {
        await this.worktreeManager.remove(agent.id, { force: true, deleteBranch: true });
      } catch {
        // Ignore cleanup errors
      }
    }

    this.worktreeManager.cleanup();
  }

  /**
   * Full cleanup (worktrees + state)
   */
  async cleanup(): Promise<void> {
    await this.cleanupWorktrees();
    this.stateManager.cleanup();
  }

  // ============================================================================
  // INTERNAL HELPERS
  // ============================================================================

  /**
   * Update an agent in the session
   */
  private updateSessionAgent(agentId: string, update: Partial<ParallelAgent>): void {
    const session = this.stateManager.loadSession();
    if (!session) {
      return;
    }

    const agentIndex = session.agents.findIndex((a) => a.id === agentId);
    if (agentIndex >= 0) {
      session.agents[agentIndex] = { ...session.agents[agentIndex], ...update };
      this.stateManager.saveSession(session);
    }
  }

  // ============================================================================
  // ACCESSORS
  // ============================================================================

  /**
   * Get the worktree manager
   */
  getWorktreeManager(): WorktreeManager {
    return this.worktreeManager;
  }

  /**
   * Get the state manager
   */
  getStateManager(): StateManager {
    return this.stateManager;
  }

  /**
   * Get the agent spawner
   */
  getAgentSpawner(): AgentSpawner {
    return this.agentSpawner;
  }

  /**
   * Get the PR generator
   */
  getPRGenerator(): PRGenerator {
    return this.prGenerator;
  }

  /**
   * Get the prompt analyzer
   */
  getPromptAnalyzer(): PromptAnalyzer {
    return this.promptAnalyzer;
  }

  /**
   * Get git provider
   */
  getGitProvider(): ReturnType<PRGenerator['detectProvider']> {
    return this.prGenerator.detectProvider();
  }
}
