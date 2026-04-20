/**
 * `sw:reflect --status` dashboard renderer — produces the markdown output
 * for the status command, including the new `## Skill Refinement
 * Suggestions` section (AC-US4-01 … AC-US4-03).
 *
 * The skill's command.md invokes this through a thin CLI shim; the markdown
 * layer does not generate the dashboard on its own anymore.
 *
 * @module skills/reflect-status
 */

import * as path from 'path';
import {
  aggregateSuggestions,
  type SkillSuggestion,
  REFINEMENT_SUGGESTION_THRESHOLD,
} from '../core/reflect-nudge/aggregator.js';

export interface ReflectStatusOptions {
  projectRoot?: string;
  /** Override threshold (for tests). Defaults to {@link REFINEMENT_SUGGESTION_THRESHOLD}. */
  threshold?: number;
}

/**
 * Build the `## Skill Refinement Suggestions` section.
 *
 * Returns `null` when no skills meet the threshold — callers must NOT emit
 * any heading in that case (AC-US4-03).
 */
export async function renderRefinementSuggestionsSection(
  opts: ReflectStatusOptions = {},
): Promise<string | null> {
  const root = opts.projectRoot ?? process.cwd();
  const signalsPath = path.join(root, '.specweave', 'state', 'skill-signals.json');
  const threshold = opts.threshold ?? REFINEMENT_SUGGESTION_THRESHOLD;

  const suggestions = await aggregateSuggestions(signalsPath, { threshold }).catch(
    () => [] as SkillSuggestion[],
  );

  if (suggestions.length === 0) return null;

  const lines: string[] = [];
  lines.push('## Skill Refinement Suggestions');
  lines.push('');
  lines.push('Skills with accumulated refinement signals — sorted by severity × recency.');
  lines.push('');

  for (const s of suggestions) {
    const sources = formatCountsBySource(s);
    lines.push(`- **${s.slug}** — ${s.totalCount} signals (${sources})`);
    lines.push(`  - last signal: ${formatTimestamp(s.lastDetectedAt)}`);
    lines.push(`  - severity: ${s.highestSeverity}`);
    lines.push(`  - run: \`sw:skill-refine ${s.slug}\``);
  }

  lines.push('');
  return lines.join('\n');
}

function formatCountsBySource(s: SkillSuggestion): string {
  const parts: string[] = [];
  if (s.countsBySource['judge-llm']) parts.push(`judge-llm: ${s.countsBySource['judge-llm']}`);
  if (s.countsBySource.rubric) parts.push(`rubric: ${s.countsBySource.rubric}`);
  if (s.countsBySource['code-reviewer']) parts.push(`code-review: ${s.countsBySource['code-reviewer']}`);
  return parts.join(', ');
}

function formatTimestamp(iso: string): string {
  // Keep the ISO date-time for machine readability; callers format if needed.
  return iso;
}
