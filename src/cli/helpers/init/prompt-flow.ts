/**
 * Streamlined prompt flow for init command
 *
 * Orchestrates the minimal set of questions needed:
 * 1. Provider auto-detect → confirm/prompt if not found
 * 2. Credentials auto-detect → prompt if not found
 * 3. Multi-repo expansion (only for org-level providers like ADO)
 * 4. Tracker auto-suggest from provider → confirm/select
 * 5. Tracker credentials (only if tracker differs from provider)
 *
 * No greenfield/brownfield question — handled by isGreenfield() post-hoc.
 * No mono/multi-repo taxonomy — emerges from "add more repos?" context.
 *
 * Part of 0200-init-two-phase-redesign (T-004)
 */

import type { ProviderInfo } from './provider-detection.js';

export interface TrackerInfo {
  type: 'github-issues' | 'jira' | 'ado-boards' | 'none';
  name: string;
}

export interface PromptFlowContext {
  targetDir: string;
  language: string;
  isCI: boolean;
  existingConfig?: Record<string, any>;
}

export interface PromptFlowResult {
  provider: ProviderInfo | null;
  credentials: string | null;
  tracker: TrackerInfo;
  trackerCredentials?: Record<string, string>;
  additionalRepos: string[];
}

export interface PromptCallbacks {
  confirmTracker(suggested: TrackerInfo): Promise<boolean>;
  selectTracker(): Promise<TrackerInfo>;
  promptCredentials(providerType: string): Promise<string>;
  promptTrackerCredentials(trackerType: string): Promise<Record<string, string>>;
  confirmAddRepos(org: string): Promise<boolean>;
  selectRepos(org: string, providerType: string): Promise<string[]>;
  selectProvider(): Promise<ProviderInfo | null>;
}

export interface PromptFlowDeps {
  detectProvider(targetDir: string): ProviderInfo | null;
  detectCredentials(targetDir: string, provider: string): string | null;
  prompts: PromptCallbacks;
}

/**
 * Suggest a tracker based on the detected provider.
 */
export function suggestTracker(provider: ProviderInfo | null): TrackerInfo {
  if (!provider) return { type: 'none', name: 'None' };

  switch (provider.provider) {
    case 'github':
      return { type: 'github-issues', name: 'GitHub Issues' };
    case 'ado':
      return { type: 'ado-boards', name: 'Azure DevOps Boards' };
    default:
      return { type: 'none', name: 'None' };
  }
}

/**
 * Check if separate tracker credentials are needed.
 * Not needed when tracker matches provider (creds are reused).
 */
function needsTrackerCredentials(provider: ProviderInfo | null, tracker: TrackerInfo): boolean {
  if (tracker.type === 'none') return false;
  if (!provider) return true;
  if (provider.provider === 'github' && tracker.type === 'github-issues') return false;
  if (provider.provider === 'ado' && tracker.type === 'ado-boards') return false;
  return true;
}

/**
 * Extract existing tracker config from a previously saved config.json.
 */
function getExistingTracker(existingConfig?: Record<string, any>): TrackerInfo | null {
  const tracker = existingConfig?.sync?.tracker;
  if (tracker?.type && tracker?.name) {
    return { type: tracker.type, name: tracker.name };
  }
  return null;
}

/**
 * Run the streamlined prompt flow.
 *
 * In interactive mode, asks only the minimal questions needed.
 * In CI mode, auto-detects everything and skips all prompts.
 */
export async function runPromptFlow(
  ctx: PromptFlowContext,
  deps: PromptFlowDeps,
): Promise<PromptFlowResult> {
  const result: PromptFlowResult = {
    provider: null,
    credentials: null,
    tracker: { type: 'none', name: 'None' },
    additionalRepos: [],
  };

  // CI mode: auto-detect everything, no prompts
  if (ctx.isCI) {
    result.provider = deps.detectProvider(ctx.targetDir);
    if (result.provider) {
      result.credentials = deps.detectCredentials(ctx.targetDir, result.provider.provider);
    }
    result.tracker = suggestTracker(result.provider);
    return result;
  }

  // Step 1: Detect or prompt for provider
  result.provider = deps.detectProvider(ctx.targetDir);
  if (!result.provider) {
    result.provider = await deps.prompts.selectProvider();
  }

  // Step 2: Detect or prompt for credentials
  if (result.provider) {
    result.credentials = deps.detectCredentials(ctx.targetDir, result.provider.provider);
    if (!result.credentials) {
      result.credentials = await deps.prompts.promptCredentials(result.provider.provider);
    }
  }

  // Step 3: Multi-repo expansion (only for org-level providers)
  // GitHub has owner (user/org ambiguous) → skip expansion
  // ADO has explicit organization → offer expansion
  if (result.provider?.organization) {
    const org = result.provider.organization;
    const addMore = await deps.prompts.confirmAddRepos(org);
    if (addMore) {
      result.additionalRepos = await deps.prompts.selectRepos(org, result.provider.provider);
    }
  }

  // Step 4: Tracker suggestion
  // Use existing config tracker if re-initializing, otherwise auto-suggest
  const existingTracker = getExistingTracker(ctx.existingConfig);
  const suggested = existingTracker || suggestTracker(result.provider);

  if (suggested.type !== 'none') {
    // We have a suggestion — confirm it
    const confirmed = await deps.prompts.confirmTracker(suggested);
    if (confirmed) {
      result.tracker = suggested;
    } else {
      // User declined suggestion — let them pick
      result.tracker = await deps.prompts.selectTracker();
      if (needsTrackerCredentials(result.provider, result.tracker)) {
        result.trackerCredentials = await deps.prompts.promptTrackerCredentials(result.tracker.type);
      }
    }
  } else {
    // No suggestion available — must select
    result.tracker = await deps.prompts.selectTracker();
    if (needsTrackerCredentials(result.provider, result.tracker)) {
      result.trackerCredentials = await deps.prompts.promptTrackerCredentials(result.tracker.type);
    }
  }

  return result;
}
