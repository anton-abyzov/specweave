/**
 * GitHub Batch Sync — Sync all specs in workspace
 *
 * Discovers all spec files and syncs them sequentially
 * using the GitHubSyncOrchestrator.
 *
 * @module github-batch-sync
 */

import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { GitHubSyncOrchestrator } from './github-sync-orchestrator.js';
import type { UserStoryForSync } from './github-push-sync.js';

export interface BatchSyncConfig {
  owner: string;
  repo: string;
  workspaceRoot: string;
  token?: string;
  dryRun?: boolean;
  projectV2Enabled?: boolean;
  projectV2Number?: number;
  projectV2Id?: string;
  statusFieldMapping?: Record<string, string>;
  priorityFieldMapping?: Record<string, string>;
}

export interface BatchSyncResult {
  specsProcessed: number;
  specsFailed: number;
  totalIssuesCreated: number;
  totalIssuesUpdated: number;
  errors: Array<{ specPath: string; error: string }>;
  summary: string;
}

/**
 * Discover all specs and sync them sequentially.
 */
export async function batchSyncAllSpecs(config: BatchSyncConfig): Promise<BatchSyncResult> {
  const specsDir = join(config.workspaceRoot, '.specweave/docs/internal/specs');

  // Discover specs
  const specFiles = await glob('**/spec-*.md', { cwd: specsDir });

  const result: BatchSyncResult = {
    specsProcessed: 0,
    specsFailed: 0,
    totalIssuesCreated: 0,
    totalIssuesUpdated: 0,
    errors: [],
    summary: '',
  };

  if (specFiles.length === 0) {
    result.summary = 'No specs found';
    return result;
  }

  // Create orchestrator
  const orchestrator = new GitHubSyncOrchestrator({
    owner: config.owner,
    repo: config.repo,
    token: config.token,
    dryRun: config.dryRun,
    projectV2Enabled: config.projectV2Enabled,
    projectV2Number: config.projectV2Number,
    projectV2Id: config.projectV2Id,
    statusFieldMapping: config.statusFieldMapping,
    priorityFieldMapping: config.priorityFieldMapping,
  });

  // Sync each spec sequentially
  for (const specFile of specFiles) {
    const specPath = join(specsDir, specFile);
    result.specsProcessed++;

    try {
      const content = await readFile(specPath, 'utf-8');
      const userStories = parseUserStoriesFromSpec(content);
      const syncResult = await orchestrator.syncSpec(specPath, userStories);

      result.totalIssuesCreated += syncResult.pushResult.created.length;
      result.totalIssuesUpdated += syncResult.pushResult.updated.length;
    } catch (err) {
      result.specsFailed++;
      result.errors.push({
        specPath,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const synced = result.specsProcessed - result.specsFailed;
  result.summary = `Synced ${synced}/${result.specsProcessed} specs, ${result.totalIssuesCreated} issues created, ${result.totalIssuesUpdated} updated`;

  return result;
}

// US header: ### US-001: Title
const US_HEADER_RE = /^###?\s+(US-\d{3,}E?):\s*(.+)$/;
// AC checkbox: - [x] **AC-US1-01**: Description
const AC_CHECKBOX_RE = /^-\s+\[([ xX])\]\s+\*\*(?<acId>AC-US\d+E?-\d{2})\*\*:\s*(?<desc>.+)$/;
// Priority: **Priority**: P1
const PRIORITY_RE = /\*\*Priority\*\*:\s*(P[0-3])/;
// Section headers that end description collection
const AC_SECTION_RE = /^\*\*(?:Acceptance Criteria|ACs?)\*\*:/i;
// Metadata lines to exclude from description
const METADATA_RE = /^\*\*(?:Project|Board|External)\*\*:/i;

/**
 * Parse user stories from spec.md content.
 */
function parseUserStoriesFromSpec(content: string): UserStoryForSync[] {
  const lines = content.split('\n');
  const userStories: UserStoryForSync[] = [];
  let current: UserStoryForSync | null = null;
  let collectingDescription = false;

  for (const line of lines) {
    const usMatch = line.match(US_HEADER_RE);
    if (usMatch) {
      if (current) {
        current.description = current.description.trim();
        userStories.push(current);
      }
      current = {
        id: usMatch[1],
        title: usMatch[2],
        description: '',
        priority: 'P3',
        status: 'planned',
        acceptanceCriteria: [],
      };
      collectingDescription = true;
      continue;
    }

    if (!current) continue;

    const acMatch = line.match(AC_CHECKBOX_RE);
    if (acMatch?.groups) {
      collectingDescription = false;
      current.acceptanceCriteria.push({
        id: acMatch.groups.acId,
        description: acMatch.groups.desc.trim(),
        completed: acMatch[1] !== ' ',
      });
      continue;
    }

    const prioMatch = line.match(PRIORITY_RE);
    if (prioMatch) {
      collectingDescription = false;
      current.priority = prioMatch[1];
      continue;
    }

    if (AC_SECTION_RE.test(line)) {
      collectingDescription = false;
      continue;
    }

    // Collect description lines between US header and first AC/Priority
    if (collectingDescription) {
      if (METADATA_RE.test(line)) continue;
      if (line.trim() !== '' || current.description.length > 0) {
        current.description += line + '\n';
      }
    }
  }

  if (current) {
    current.description = current.description.trim();
    userStories.push(current);
  }

  return userStories;
}
