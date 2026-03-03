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

/**
 * JIRA Status Sync
 *
 * Handles status synchronization with JIRA issues.
 */
export class JiraStatusSync {
  private client: AxiosInstance;
  private domain: string;
  private projectKey: string;

  constructor(
    domain: string,
    email: string,
    apiToken: string,
    projectKey: string
  ) {
    this.domain = domain;
    this.projectKey = projectKey;

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
    const response = await this.client.get(`/issue/${issueKey}`);

    return {
      state: response.data.fields.status.name
    };
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

    return true;
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
    return true;
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
