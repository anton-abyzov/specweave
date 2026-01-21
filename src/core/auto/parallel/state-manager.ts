/**
 * State Manager
 *
 * Manages agent and session state persistence for parallel execution.
 * Persists state to filesystem for crash recovery and monitoring.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import type { ParallelSession, ParallelAgent } from '../types.js';
import { timestamp } from './platform-utils.js';

/**
 * Default zombie detection timeout (5 minutes)
 */
const DEFAULT_ZOMBIE_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * State Manager handles persistence of parallel session and agent states.
 */
export class StateManager {
  private readonly stateDir: string;
  private readonly sessionPath: string;
  private readonly agentsDir: string;

  constructor(rootPath: string) {
    this.stateDir = join(rootPath, '.specweave', 'state', 'parallel');
    this.sessionPath = join(this.stateDir, 'session.json');
    this.agentsDir = join(this.stateDir, 'agents');
  }

  /**
   * Initialize state directories
   */
  private ensureDirectories(): void {
    if (!existsSync(this.stateDir)) {
      mkdirSync(this.stateDir, { recursive: true });
    }
    if (!existsSync(this.agentsDir)) {
      mkdirSync(this.agentsDir, { recursive: true });
    }
  }

  // ============================================================================
  // SESSION OPERATIONS
  // ============================================================================

  /**
   * Save session state
   */
  saveSession(session: ParallelSession): void {
    this.ensureDirectories();
    writeFileSync(this.sessionPath, JSON.stringify(session, null, 2), 'utf-8');
  }

  /**
   * Load session state
   */
  loadSession(): ParallelSession | null {
    if (!existsSync(this.sessionPath)) {
      return null;
    }

    try {
      const content = readFileSync(this.sessionPath, 'utf-8');
      return JSON.parse(content) as ParallelSession;
    } catch {
      return null;
    }
  }

  /**
   * Check if a session exists
   */
  hasSession(): boolean {
    return existsSync(this.sessionPath);
  }

  /**
   * Delete session state
   */
  deleteSession(): void {
    if (existsSync(this.sessionPath)) {
      rmSync(this.sessionPath);
    }
  }

  // ============================================================================
  // AGENT OPERATIONS
  // ============================================================================

  /**
   * Save agent state
   */
  saveAgent(agent: ParallelAgent): void {
    this.ensureDirectories();
    const agentPath = join(this.agentsDir, `${agent.id}.json`);
    writeFileSync(agentPath, JSON.stringify(agent, null, 2), 'utf-8');
  }

  /**
   * Load agent state
   */
  loadAgent(agentId: string): ParallelAgent | null {
    const agentPath = join(this.agentsDir, `${agentId}.json`);

    if (!existsSync(agentPath)) {
      return null;
    }

    try {
      const content = readFileSync(agentPath, 'utf-8');
      return JSON.parse(content) as ParallelAgent;
    } catch {
      return null;
    }
  }

  /**
   * Update agent state (partial update)
   */
  updateAgent(agentId: string, update: Partial<ParallelAgent>): ParallelAgent | null {
    const agent = this.loadAgent(agentId);
    if (!agent) {
      return null;
    }

    const updatedAgent = { ...agent, ...update };
    this.saveAgent(updatedAgent);
    return updatedAgent;
  }

  /**
   * Delete agent state
   */
  deleteAgent(agentId: string): void {
    const agentPath = join(this.agentsDir, `${agentId}.json`);
    if (existsSync(agentPath)) {
      rmSync(agentPath);
    }
  }

  /**
   * List all agent IDs
   */
  listAgentIds(): string[] {
    if (!existsSync(this.agentsDir)) {
      return [];
    }

    return readdirSync(this.agentsDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''));
  }

  /**
   * Load all agents
   */
  loadAllAgents(): ParallelAgent[] {
    const ids = this.listAgentIds();
    return ids.map((id) => this.loadAgent(id)).filter((a): a is ParallelAgent => a !== null);
  }

  // ============================================================================
  // HEARTBEAT OPERATIONS
  // ============================================================================

  /**
   * Update agent heartbeat timestamp
   */
  updateHeartbeat(agentId: string): void {
    const agent = this.loadAgent(agentId);
    if (agent) {
      agent.heartbeat = timestamp();
      this.saveAgent(agent);
    }
  }

  /**
   * Check if an agent is alive (heartbeat within timeout)
   */
  isAgentAlive(agentId: string, timeoutMs: number = DEFAULT_ZOMBIE_TIMEOUT_MS): boolean {
    const agent = this.loadAgent(agentId);
    if (!agent || !agent.heartbeat) {
      return false;
    }

    const heartbeatTime = new Date(agent.heartbeat).getTime();
    const now = Date.now();
    return now - heartbeatTime < timeoutMs;
  }

  /**
   * Detect zombie agents (agents with stale heartbeats)
   */
  detectZombies(timeoutMs: number = DEFAULT_ZOMBIE_TIMEOUT_MS): ParallelAgent[] {
    const agents = this.loadAllAgents();
    const now = Date.now();

    return agents.filter((agent) => {
      // Only check running agents
      if (agent.status !== 'running') {
        return false;
      }

      // No heartbeat = zombie
      if (!agent.heartbeat) {
        return true;
      }

      const heartbeatTime = new Date(agent.heartbeat).getTime();
      return now - heartbeatTime >= timeoutMs;
    });
  }

  // ============================================================================
  // PROGRESS TRACKING
  // ============================================================================

  /**
   * Update agent progress
   */
  updateProgress(agentId: string, completed: number, total: number): void {
    this.updateAgent(agentId, {
      progress: { completed, total },
    });
  }

  /**
   * Mark agent as started
   */
  markAgentStarted(agentId: string): void {
    this.updateAgent(agentId, {
      status: 'running',
      startedAt: timestamp(),
      heartbeat: timestamp(),
    });
  }

  /**
   * Mark agent as completed
   */
  markAgentCompleted(agentId: string): void {
    this.updateAgent(agentId, {
      status: 'completed',
      completedAt: timestamp(),
    });
  }

  /**
   * Mark agent as failed
   */
  markAgentFailed(agentId: string, error: string): void {
    this.updateAgent(agentId, {
      status: 'failed',
      failedAt: timestamp(),
      error,
    });
  }

  /**
   * Mark agent as cancelled
   */
  markAgentCancelled(agentId: string): void {
    this.updateAgent(agentId, {
      status: 'cancelled',
    });
  }

  // ============================================================================
  // SESSION STATUS
  // ============================================================================

  /**
   * Update session status
   */
  updateSessionStatus(status: ParallelSession['status']): void {
    const session = this.loadSession();
    if (session) {
      session.status = status;
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        session.completedAt = timestamp();
      }
      this.saveSession(session);
    }
  }

  /**
   * Get session status
   */
  getSessionStatus(): ParallelSession['status'] | null {
    const session = this.loadSession();
    return session?.status ?? null;
  }

  /**
   * Check if session is active
   */
  isSessionActive(): boolean {
    const status = this.getSessionStatus();
    return status === 'active';
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /**
   * Clean up all state files
   */
  cleanup(): void {
    // Delete session
    this.deleteSession();

    // Delete all agent files
    const agentIds = this.listAgentIds();
    for (const id of agentIds) {
      this.deleteAgent(id);
    }

    // Try to remove directories (will fail if not empty, which is fine)
    try {
      if (existsSync(this.agentsDir)) {
        rmSync(this.agentsDir, { recursive: true });
      }
      if (existsSync(this.stateDir)) {
        rmSync(this.stateDir, { recursive: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Get the state directory path
   */
  getStateDir(): string {
    return this.stateDir;
  }

  /**
   * Get the session file path
   */
  getSessionPath(): string {
    return this.sessionPath;
  }

  /**
   * Get the agents directory path
   */
  getAgentsDir(): string {
    return this.agentsDir;
  }
}
