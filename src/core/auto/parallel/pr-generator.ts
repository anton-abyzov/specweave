/**
 * PR Generator
 *
 * Generates pull requests for completed parallel agents.
 * Supports GitHub, GitLab, and Azure DevOps.
 */

import { spawnSync } from 'child_process';
import type { AgentDomain, GitProvider, ParallelAgent, PRResult } from '../types.js';
import { timestamp } from './platform-utils.js';

/**
 * PR creation options
 */
export interface PRCreateOptions {
  draft?: boolean;
  baseBranch?: string;
  labels?: string[];
  assignees?: string[];
  reviewers?: string[];
}

/**
 * PR Generator for creating pull requests.
 */
export class PRGenerator {
  private readonly rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  /**
   * Detect the git provider from remote URL
   */
  detectProvider(): GitProvider {
    const result = spawnSync('git', ['remote', 'get-url', 'origin'], {
      cwd: this.rootPath,
      encoding: 'utf-8',
    });

    if (result.status !== 0) {
      return 'unknown';
    }

    const url = result.stdout.trim().toLowerCase();

    if (url.includes('github.com') || url.includes('github:')) {
      return 'github';
    }
    if (url.includes('gitlab.com') || url.includes('gitlab:')) {
      return 'gitlab';
    }
    if (
      url.includes('dev.azure.com') ||
      url.includes('visualstudio.com') ||
      url.includes('azure:')
    ) {
      return 'azure-devops';
    }
    if (url.includes('bitbucket.org') || url.includes('bitbucket:')) {
      return 'bitbucket';
    }

    return 'unknown';
  }

  /**
   * Create a PR for a completed agent
   */
  async createPR(
    agent: ParallelAgent,
    incrementId: string,
    options: PRCreateOptions = {}
  ): Promise<PRResult> {
    const provider = this.detectProvider();
    const { baseBranch = 'main', draft = false } = options;

    const title = this.buildPRTitle(agent, incrementId);
    const body = this.buildPRBody(agent, incrementId);

    let result: PRResult;

    switch (provider) {
      case 'github':
        result = await this.createGitHubPR(agent, title, body, baseBranch, draft);
        break;
      case 'gitlab':
        result = await this.createGitLabMR(agent, title, body, baseBranch, draft);
        break;
      case 'azure-devops':
        result = await this.createAzureDevOpsPR(agent, title, body, baseBranch, draft);
        break;
      default:
        result = {
          agentId: agent.id,
          domain: agent.domain,
          provider,
          status: 'skipped',
          error: `Unsupported git provider: ${provider}`,
          createdAt: timestamp(),
        };
    }

    return result;
  }

  /**
   * Build PR title
   */
  buildPRTitle(agent: ParallelAgent, incrementId: string): string {
    const domainLabel = agent.domain.charAt(0).toUpperCase() + agent.domain.slice(1);
    return `[${incrementId}] ${domainLabel}: Parallel agent changes`;
  }

  /**
   * Build PR body
   */
  buildPRBody(agent: ParallelAgent, incrementId: string): string {
    const taskList = agent.taskIds
      .map((id) => `- [x] ${id}`)
      .join('\n');

    return `## Summary

${agent.domain.charAt(0).toUpperCase() + agent.domain.slice(1)} changes for increment ${incrementId}.

## Tasks Completed

${taskList}

## Progress

- Completed: ${agent.progress.completed}/${agent.progress.total}
- Status: ${agent.status}

## Branch

\`${agent.worktree.branch}\`

---
Created by SpecWeave Parallel Auto Mode`;
  }

  /**
   * Create GitHub PR using gh CLI
   */
  private async createGitHubPR(
    agent: ParallelAgent,
    title: string,
    body: string,
    baseBranch: string,
    draft: boolean
  ): Promise<PRResult> {
    const args = [
      'pr',
      'create',
      '--base', baseBranch,
      '--head', agent.worktree.branch,
      '--title', title,
      '--body', body,
    ];

    if (draft) {
      args.push('--draft');
    }

    const result = spawnSync('gh', args, {
      cwd: this.rootPath,
      encoding: 'utf-8',
    });

    if (result.status !== 0) {
      return {
        agentId: agent.id,
        domain: agent.domain,
        provider: 'github',
        status: 'failed',
        error: result.stderr || result.stdout,
        createdAt: timestamp(),
      };
    }

    // Parse PR URL from output
    const prUrl = result.stdout.trim();
    const prNumber = this.extractPRNumber(prUrl);

    return {
      agentId: agent.id,
      domain: agent.domain,
      prNumber,
      prUrl,
      provider: 'github',
      status: 'created',
      createdAt: timestamp(),
    };
  }

  /**
   * Create GitLab MR using glab CLI
   */
  private async createGitLabMR(
    agent: ParallelAgent,
    title: string,
    body: string,
    baseBranch: string,
    draft: boolean
  ): Promise<PRResult> {
    const args = [
      'mr',
      'create',
      '--target-branch', baseBranch,
      '--source-branch', agent.worktree.branch,
      '--title', draft ? `Draft: ${title}` : title,
      '--description', body,
    ];

    const result = spawnSync('glab', args, {
      cwd: this.rootPath,
      encoding: 'utf-8',
    });

    if (result.status !== 0) {
      return {
        agentId: agent.id,
        domain: agent.domain,
        provider: 'gitlab',
        status: 'failed',
        error: result.stderr || result.stdout,
        createdAt: timestamp(),
      };
    }

    const prUrl = result.stdout.trim();
    const prNumber = this.extractMRNumber(prUrl);

    return {
      agentId: agent.id,
      domain: agent.domain,
      prNumber,
      prUrl,
      provider: 'gitlab',
      status: 'created',
      createdAt: timestamp(),
    };
  }

  /**
   * Create Azure DevOps PR using az CLI
   */
  private async createAzureDevOpsPR(
    agent: ParallelAgent,
    title: string,
    body: string,
    baseBranch: string,
    draft: boolean
  ): Promise<PRResult> {
    const args = [
      'repos',
      'pr',
      'create',
      '--target-branch', baseBranch,
      '--source-branch', agent.worktree.branch,
      '--title', title,
      '--description', body,
    ];

    if (draft) {
      args.push('--draft', 'true');
    }

    const result = spawnSync('az', args, {
      cwd: this.rootPath,
      encoding: 'utf-8',
    });

    if (result.status !== 0) {
      return {
        agentId: agent.id,
        domain: agent.domain,
        provider: 'azure-devops',
        status: 'failed',
        error: result.stderr || result.stdout,
        createdAt: timestamp(),
      };
    }

    // Parse PR ID from JSON output
    try {
      const output = JSON.parse(result.stdout);
      return {
        agentId: agent.id,
        domain: agent.domain,
        prNumber: output.pullRequestId,
        prUrl: output.url,
        provider: 'azure-devops',
        status: 'created',
        createdAt: timestamp(),
      };
    } catch {
      return {
        agentId: agent.id,
        domain: agent.domain,
        provider: 'azure-devops',
        status: 'created',
        createdAt: timestamp(),
      };
    }
  }

  /**
   * Extract PR number from GitHub URL
   */
  private extractPRNumber(url: string): number | undefined {
    const match = url.match(/\/pull\/(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  /**
   * Extract MR number from GitLab URL
   */
  private extractMRNumber(url: string): number | undefined {
    const match = url.match(/\/merge_requests\/(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  /**
   * Create PRs for multiple agents
   */
  async createMultiplePRs(
    agents: ParallelAgent[],
    incrementId: string,
    options: PRCreateOptions = {}
  ): Promise<PRResult[]> {
    const results: PRResult[] = [];

    for (const agent of agents) {
      if (agent.status === 'completed') {
        const result = await this.createPR(agent, incrementId, options);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Get current branch name
   */
  getCurrentBranch(): string | undefined {
    const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: this.rootPath,
      encoding: 'utf-8',
    });

    if (result.status !== 0) {
      return undefined;
    }

    return result.stdout.trim();
  }
}
