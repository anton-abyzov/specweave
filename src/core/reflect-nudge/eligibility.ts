/**
 * Nudge eligibility — checks whether the session-end prompt should be
 * shown at /sw:done close time (AC-US3-01, AC-US3-02).
 *
 * @module core/reflect-nudge/eligibility
 */

import * as fs from 'fs';
import * as path from 'path';
import { aggregateSuggestions, type SkillSuggestion } from './aggregator.js';

export interface NudgeEligibility {
  shouldNudge: boolean;
  reason: 'disabled' | 'no-signal' | 'has-refinement' | 'has-learning';
  topRefinement: SkillSuggestion | null;
  hasHighConfidenceLearning: boolean;
}

export interface EligibilityOptions {
  /** Project root — defaults to cwd. */
  projectRoot?: string;
  /** Increment ID, used to scope the learning-window check. */
  incrementId: string;
  /** Override the autoNudge config flag (for tests). */
  autoNudge?: boolean;
}

/**
 * Evaluate whether to show the session-end nudge. Never throws; failure
 * to read state is treated as "no signal".
 */
export async function checkNudgeEligibility(
  opts: EligibilityOptions,
): Promise<NudgeEligibility> {
  const root = opts.projectRoot ?? process.cwd();

  const autoNudge = opts.autoNudge ?? readAutoNudge(root);
  if (!autoNudge) {
    return {
      shouldNudge: false,
      reason: 'disabled',
      topRefinement: null,
      hasHighConfidenceLearning: false,
    };
  }

  const signalsPath = path.join(root, '.specweave', 'state', 'skill-signals.json');
  const suggestions = await aggregateSuggestions(signalsPath, { threshold: 1 }).catch(() => [] as SkillSuggestion[]);
  const topRefinement = suggestions[0] ?? null;

  const hasHighConfidenceLearning = detectFreshLearning(root, opts.incrementId);

  if (topRefinement) {
    return {
      shouldNudge: true,
      reason: 'has-refinement',
      topRefinement,
      hasHighConfidenceLearning,
    };
  }

  if (hasHighConfidenceLearning) {
    return {
      shouldNudge: true,
      reason: 'has-learning',
      topRefinement: null,
      hasHighConfidenceLearning: true,
    };
  }

  return {
    shouldNudge: false,
    reason: 'no-signal',
    topRefinement: null,
    hasHighConfidenceLearning: false,
  };
}

// ── Internals ────────────────────────────────────────────────────────

function readAutoNudge(root: string): boolean {
  try {
    const configPath = path.join(root, '.specweave', 'config.json');
    if (!fs.existsSync(configPath)) return true;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (config?.reflect?.autoNudge === false) return false;
    return true;
  } catch {
    return true;
  }
}

/**
 * A "high-confidence learning" at close time is a skill-memory file under
 * `.specweave/skill-memories/` whose mtime is newer than the increment's
 * metadata.json mtime — i.e. something written during the session.
 *
 * This is a heuristic, not a guarantee. On read errors we return false,
 * which just means the nudge falls back to the refinement-only path.
 */
function detectFreshLearning(root: string, incrementId: string): boolean {
  try {
    const memoriesDir = path.join(root, '.specweave', 'skill-memories');
    if (!fs.existsSync(memoriesDir)) return false;

    const metadataPath = resolveMetadataPath(root, incrementId);
    if (!metadataPath) return false;

    const since = fs.statSync(metadataPath).mtimeMs;
    const files = fs.readdirSync(memoriesDir).filter((f) => f.endsWith('.md'));
    for (const f of files) {
      const stat = fs.statSync(path.join(memoriesDir, f));
      if (stat.mtimeMs > since) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function resolveMetadataPath(root: string, incrementId: string): string | null {
  try {
    const incrementsDir = path.join(root, '.specweave', 'increments');
    if (!fs.existsSync(incrementsDir)) return null;

    for (const entry of fs.readdirSync(incrementsDir)) {
      if (entry === incrementId || entry.startsWith(`${incrementId}-`)) {
        const candidate = path.join(incrementsDir, entry, 'metadata.json');
        if (fs.existsSync(candidate)) return candidate;
      }
    }
    return null;
  } catch {
    return null;
  }
}
