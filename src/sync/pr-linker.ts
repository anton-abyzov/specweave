/**
 * PR Linker — Links pull requests to external tickets (JIRA, ADO)
 *
 * Called after PR creation to create remote links / hyperlinks
 * so external tools show the PR in the issue's UI.
 *
 * @module sync/pr-linker
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { consoleLogger, Logger } from '../utils/logger.js';

export interface PrLinkRequest {
  projectRoot: string;
  incrementId: string;
  prUrl: string;
  prNumber: number;
  branch: string;
}

export interface PrLinkResult {
  linked: { provider: string; key: string }[];
  errors: { provider: string; key: string; error: string }[];
}

/**
 * Link a PR to all external tickets associated with this increment.
 * Non-blocking: errors are collected, never thrown.
 */
export async function linkPrToExternalTickets(request: PrLinkRequest, logger?: Logger): Promise<PrLinkResult> {
  const log = logger || consoleLogger;
  const result: PrLinkResult = { linked: [], errors: [] };

  const configPath = join(request.projectRoot, '.specweave', 'config.json');
  if (!existsSync(configPath)) {
    log.warn('No .specweave/config.json found — skipping PR linking');
    return result;
  }

  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  const metadataPath = join(request.projectRoot, '.specweave', 'increments', request.incrementId, 'metadata.json');

  if (!existsSync(metadataPath)) {
    log.warn(`No metadata.json for increment ${request.incrementId}`);
    return result;
  }

  const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));

  // Collect JIRA issue keys from metadata
  const jiraKeys = collectJiraKeys(metadata, request.projectRoot, request.incrementId);

  // Collect ADO work item IDs from metadata
  const adoIds = collectAdoIds(metadata, request.projectRoot, request.incrementId);

  // Link to JIRA
  if (jiraKeys.length > 0 && config.sync?.jira?.enabled !== false) {
    await linkToJira(jiraKeys, request, config, result, log);
  }

  // Link to ADO
  if (adoIds.length > 0 && config.sync?.ado?.enabled !== false) {
    await linkToAdo(adoIds, request, config, result, log);
  }

  return result;
}

function collectJiraKeys(metadata: any, projectRoot: string, incrementId: string): string[] {
  const keys: string[] = [];

  // From metadata.json direct jira reference
  if (metadata.jira?.issue) keys.push(metadata.jira.issue);
  if (metadata.jira?.issueKey) keys.push(metadata.jira.issueKey);

  // From externalLinks
  if (metadata.externalLinks?.jira?.epicKey) keys.push(metadata.externalLinks.jira.epicKey);
  if (metadata.externalLinks?.jira?.issueKey) keys.push(metadata.externalLinks.jira.issueKey);

  // From per-user-story links
  const usLinks = metadata.externalLinks?.jira?.userStories;
  if (usLinks && typeof usLinks === 'object') {
    for (const us of Object.values(usLinks) as any[]) {
      if (us?.issueKey) keys.push(us.issueKey);
    }
  }

  // Deduplicate
  return [...new Set(keys)];
}

function collectAdoIds(metadata: any, projectRoot: string, incrementId: string): number[] {
  const ids: number[] = [];

  if (metadata.externalLinks?.ado?.featureId) ids.push(Number(metadata.externalLinks.ado.featureId));
  if (metadata.externalLinks?.ado?.workItemId) ids.push(Number(metadata.externalLinks.ado.workItemId));

  const usLinks = metadata.externalLinks?.ado?.userStories;
  if (usLinks && typeof usLinks === 'object') {
    for (const us of Object.values(usLinks) as any[]) {
      if (us?.workItemId) ids.push(Number(us.workItemId));
    }
  }

  return [...new Set(ids.filter(id => !isNaN(id)))];
}

async function linkToJira(
  keys: string[],
  request: PrLinkRequest,
  config: any,
  result: PrLinkResult,
  log: Logger
): Promise<void> {
  try {
    const { JiraClient } = await import('../integrations/jira/jira-client.js');

    const jiraClient = new JiraClient();

    for (const issueKey of keys) {
      try {
        await jiraClient.addRemoteLink(issueKey, {
          url: request.prUrl,
          title: `PR #${request.prNumber}: ${request.branch}`,
          globalId: `specweave-pr-${request.prNumber}`,
        });
        result.linked.push({ provider: 'jira', key: issueKey });
        log.info(`Linked PR #${request.prNumber} to JIRA ${issueKey}`);
      } catch (err: any) {
        result.errors.push({ provider: 'jira', key: issueKey, error: err.message });
        log.warn(`Failed to link PR to JIRA ${issueKey}: ${err.message}`);
      }
    }
  } catch (err: any) {
    log.warn(`JIRA client initialization failed: ${err.message}`);
    for (const key of keys) {
      result.errors.push({ provider: 'jira', key, error: err.message });
    }
  }
}

async function linkToAdo(
  ids: number[],
  request: PrLinkRequest,
  config: any,
  result: PrLinkResult,
  log: Logger
): Promise<void> {
  try {
    const { AdoClient } = await import('../../plugins/specweave/lib/integrations/ado/ado-client.js');

    const adoConfig = {
      organization: config.sync?.ado?.organization || '',
      project: config.sync?.ado?.project || '',
      personalAccessToken: process.env.ADO_PAT || process.env.AZURE_DEVOPS_PAT || '',
    };

    if (!adoConfig.organization || !adoConfig.personalAccessToken) {
      log.warn('ADO not configured — skipping PR linking');
      return;
    }

    const adoClient = new AdoClient(adoConfig);

    for (const workItemId of ids) {
      try {
        await adoClient.addHyperlink(
          workItemId,
          request.prUrl,
          `PR #${request.prNumber}: ${request.branch}`
        );
        result.linked.push({ provider: 'ado', key: String(workItemId) });
        log.info(`Linked PR #${request.prNumber} to ADO #${workItemId}`);
      } catch (err: any) {
        result.errors.push({ provider: 'ado', key: String(workItemId), error: err.message });
        log.warn(`Failed to link PR to ADO #${workItemId}: ${err.message}`);
      }
    }
  } catch (err: any) {
    log.warn(`ADO client initialization failed: ${err.message}`);
    for (const id of ids) {
      result.errors.push({ provider: 'ado', key: String(id), error: err.message });
    }
  }
}

/**
 * Resolve the external ticket key for branch naming.
 * Returns the JIRA key or ADO ID prefix if available.
 */
export function resolveExternalBranchPrefix(metadata: any): string | null {
  // JIRA key takes priority
  const jiraKeys = collectJiraKeys(metadata, '', '');
  if (jiraKeys.length > 0) return jiraKeys[0];

  // ADO work item ID
  const adoIds = collectAdoIds(metadata, '', '');
  if (adoIds.length > 0) return `AB#${adoIds[0]}`;

  return null;
}
