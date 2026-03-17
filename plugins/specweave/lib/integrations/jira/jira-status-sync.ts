/**
 * JIRA Status Sync
 *
 * Synchronizes SpecWeave increment statuses with JIRA issue statuses.
 *
 * JIRA Status Transitions:
 * - Uses JIRA transitions API to change issue status
 * - Available transitions depend on workflow configuration
 * - Must fetch available transitions before applying
 *
 * @module jira-status-sync
 */

import axios, { AxiosInstance } from 'axios';
import { detectDeploymentType, getApiBaseUrl } from './jira-deployment-detector.js';
import { toCommentBody, type AdfDocument, type AdfNode } from './content-format-adapter.js';
import { CircuitBreakerRegistry } from '../../../../../src/core/sync/circuit-breaker-registry.js';
import { SyncRetryQueue } from '../../../../../src/core/sync/sync-retry-queue.js';
import { SyncError } from '../../../../../src/core/errors/sync-error.js';
import { LockManager } from '../../../../../src/utils/lock-manager.js';

/**
 * External status representation (JIRA-specific)
 */
export interface ExternalStatus {
  state: string; // e.g., "To Do", "In Progress", "Done"
  labels?: string[]; // Optional labels (JIRA supports labels)
}

/**
 * JIRA transition representation
 */
interface JiraTransition {
  id: string;
  name: string;
  to: {
    name: string;
  };
}

export interface JiraStatusSyncOptions {
  circuitBreakerRegistry?: CircuitBreakerRegistry;
  retryQueue?: SyncRetryQueue;
  incrementId?: string;
  featureId?: string;
  projectPath?: string;
  projectName?: string;
  lockDir?: string;
}

/**
 * JIRA Status Sync
 *
 * Handles status synchronization with JIRA issues.
 */
export class JiraStatusSync {
  private client: AxiosInstance;
  private domain: string;
  private projectKey: string;
  private circuitBreakerRegistry?: CircuitBreakerRegistry;
  private retryQueue?: SyncRetryQueue;
  private lockManager?: LockManager;
  private incrementId: string;
  private featureId: string;
  private projectPath: string;
  private projectName: string;

  constructor(
    domain: string,
    email: string,
    apiToken: string,
    projectKey: string,
    options?: JiraStatusSyncOptions,
  ) {
    this.domain = domain;
    this.projectKey = projectKey;
    this.circuitBreakerRegistry = options?.circuitBreakerRegistry;
    this.retryQueue = options?.retryQueue;
    this.incrementId = options?.incrementId ?? '';
    this.featureId = options?.featureId ?? '';
    this.projectPath = options?.projectPath ?? '';
    this.projectName = options?.projectName ?? '';
    if (options?.lockDir) {
      this.lockManager = new LockManager(options.lockDir);
    }

    // Create JIRA API client — baseURL set dynamically via init()
    this.client = axios.create({
      baseURL: getApiBaseUrl(domain),
      auth: {
        username: email,
        password: apiToken
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Execute fn under file lock (if lockManager configured).
   */
  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.lockManager) return fn();
    const acquired = await this.lockManager.acquire();
    if (!acquired) {
      throw new SyncError('jira', 0, '', 'Failed to acquire JIRA sync lock');
    }
    try {
      return await fn();
    } finally {
      await this.lockManager.release();
    }
  }

  /**
   * Check circuit breaker before making API calls.
   * Throws if breaker is open.
   */
  private checkCircuitBreaker(): void {
    if (!this.circuitBreakerRegistry) return;
    const breaker = this.circuitBreakerRegistry.get('jira');
    if (!breaker.canSync()) {
      throw new SyncError('jira', 0, '', 'Circuit breaker open for jira');
    }
  }

  /**
   * Record success on circuit breaker.
   */
  private recordSuccess(): void {
    if (!this.circuitBreakerRegistry) return;
    this.circuitBreakerRegistry.get('jira').recordSuccess();
  }

  /**
   * Handle API error: record failure on circuit breaker, enqueue retry, throw SyncError.
   */
  private async handleApiError(error: unknown, operation: string): Promise<never> {
    const httpStatus = (error as any)?.response?.status ?? 0;
    const responseBody = JSON.stringify((error as any)?.response?.data ?? '');
    const detail = (error as Error)?.message ?? String(error);

    // Record failure on circuit breaker
    if (this.circuitBreakerRegistry) {
      this.circuitBreakerRegistry.get('jira').recordFailure();
    }

    // Enqueue for retry on server errors (5xx)
    if (this.retryQueue && httpStatus >= 500) {
      await this.retryQueue.enqueue({
        incrementId: this.incrementId,
        provider: 'jira',
        featureId: this.featureId,
        projectPath: this.projectPath,
        projectName: this.projectName,
        error: `${httpStatus} ${operation}: ${detail}`,
      });
    }

    throw new SyncError('jira', httpStatus, responseBody, detail);
  }

  /**
   * Initialize: detect deployment type and update client baseURL
   */
  async init(): Promise<void> {
    const deployment = await detectDeploymentType(this.domain, {
      email: this.client.defaults.auth?.username || '',
      apiToken: this.client.defaults.auth?.password || '',
    });
    this.client.defaults.baseURL = deployment.baseUrl;
  }

  /**
   * Get current status from JIRA issue
   *
   * @param issueKey - JIRA issue key (e.g., PROJ-123)
   * @returns Current issue status
   */
  async getStatus(issueKey: string): Promise<ExternalStatus> {
    return this.withLock(async () => {
      this.checkCircuitBreaker();
      try {
        const response = await this.client.get(`/issue/${issueKey}`);
        this.recordSuccess();
        return {
          state: response.data.fields.status.name
        };
      } catch (error) {
        return this.handleApiError(error, 'getStatus');
      }
    });
  }

  /**
   * Update JIRA issue status via transitions
   *
   * JIRA requires using transitions to change status.
   * Cannot directly set status field.
   *
   * Handles missing transitions gracefully by logging a warning
   * instead of throwing an error.
   *
   * @param issueKey - JIRA issue key (e.g., PROJ-123)
   * @param status - Desired status
   * @returns true if transition succeeded, false if not available
   */
  async updateStatus(issueKey: string, status: ExternalStatus): Promise<boolean> {
    return this.withLock(async () => {
      this.checkCircuitBreaker();
      try {
        // 1. Get available transitions for this issue
        const transitionsResponse = await this.client.get(`/issue/${issueKey}/transitions`);
        const transitions: JiraTransition[] = transitionsResponse.data.transitions;

        // 2. Find transition that leads to desired status (case-insensitive)
        const targetTransition = transitions.find(
          (t) => t.to.name.toLowerCase() === status.state.toLowerCase()
        );

        if (!targetTransition) {
          // Log warning instead of throwing - workflow may not support this transition
          console.warn(
            `⚠️  Cannot transition ${issueKey} to "${status.state}". ` +
            `Available transitions: ${transitions.map(t => t.to.name).join(', ')}. ` +
            `This may be expected if your JIRA workflow doesn't support this status.`
          );
          return false;
        }

        // 3. Execute transition
        await this.client.post(`/issue/${issueKey}/transitions`, {
          transition: {
            id: targetTransition.id
          }
        });

        this.recordSuccess();
        return true;
      } catch (error) {
        return this.handleApiError(error, 'updateStatus');
      }
    });
  }

  /**
   * Post comment about status change to JIRA issue
   *
   * @param issueKey - JIRA issue key (e.g., PROJ-123)
   * @param oldStatus - Previous SpecWeave status
   * @param newStatus - New SpecWeave status
   */
  async postStatusComment(
    issueKey: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    return this.withLock(async () => {
      this.checkCircuitBreaker();
      try {
        const rawBody = `*Status Update*\n\n` +
          `SpecWeave status changed:\n` +
          `* *From*: ${oldStatus}\n` +
          `* *To*: ${newStatus}\n` +
          `* *When*: ${new Date().toISOString()}\n\n` +
          `_Synced from SpecWeave_`;

        const body = toCommentBody(rawBody, this.domain);

        await this.client.post(`/issue/${issueKey}/comment`, {
          body
        });
        this.recordSuccess();
      } catch (error) {
        return this.handleApiError(error, 'postStatusComment');
      }
    });
  }

  /**
   * Post AC progress comment with proper ADF formatting and dedup.
   *
   * Builds native ADF with:
   * - Bold header showing completion percentage
   * - Bullet list with checkmark/cross emojis per AC
   * - Fingerprint marker to prevent duplicate comments
   *
   * @param issueKey - JIRA issue key (e.g., PROJ-123)
   * @param acStates - Array of AC states with id, description, completed
   * @returns true if comment was posted, false if skipped (duplicate)
   */
  async postProgressComment(
    issueKey: string,
    acStates: Array<{ id: string; description: string; completed: boolean }>,
  ): Promise<boolean> {
    return this.withLock(async () => {
    this.checkCircuitBreaker();
    const total = acStates.length;
    const completed = acStates.filter(ac => ac.completed).length;
    const percentage = Math.round((completed / total) * 100);
    const fingerprint = `sw-progress:${completed}/${total}`;

    // Dedup: check last comment for same fingerprint
    try {
      const commentsResp = await this.client.get(`/issue/${issueKey}/comment`, {
        params: { orderBy: '-created', maxResults: 1 },
      });
      const lastComment = commentsResp.data?.comments?.[0];
      if (lastComment) {
        const lastText = extractAdfText(lastComment.body);
        if (lastText.includes(fingerprint)) {
          return false; // Already posted for this state
        }
      }
    } catch {
      // If comment fetch fails, proceed with posting
    }

    // Build ADF body directly — ✅ for done, ❌ for pending
    const listItems: AdfNode[] = acStates.map(ac => ({
      type: 'listItem',
      content: [{
        type: 'paragraph',
        content: [
          { type: 'text', text: `${ac.completed ? '\u2705' : '\u274C'} ${ac.id}: ${ac.description}` },
        ],
      }],
    }));

    const body: AdfDocument = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: `Progress: ${completed}/${total} ACs (${percentage}%)` }],
        },
        {
          type: 'bulletList',
          content: listItems,
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: `${fingerprint} | Synced from SpecWeave`, marks: [{ type: 'em' }] },
          ],
        },
      ],
    };

    await this.client.post(`/issue/${issueKey}/comment`, { body });
    this.recordSuccess();
    return true;
    });
  }
}

/**
 * Extract plain text from an ADF document (for dedup comparison).
 */
function extractAdfText(adf: any): string {
  if (!adf) return '';
  if (typeof adf === 'string') return adf;
  let text = '';
  if (adf.text) text += adf.text;
  if (Array.isArray(adf.content)) {
    for (const child of adf.content) {
      text += extractAdfText(child);
    }
  }
  return text;
}
