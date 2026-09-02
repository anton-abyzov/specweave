import * as fs from '../../utils/fs-native.js';
import * as path from 'path';

interface GenerateOptions {
  coverageTarget?: number;
}

interface ExtractedAC {
  id: string;
  description: string;
  userStory: string;
}

function extractACs(specContent: string): ExtractedAC[] {
  const acs: ExtractedAC[] = [];
  const lines = specContent.split('\n');
  let currentUS = '';

  for (const line of lines) {
    const usMatch = line.match(/^###\s+US-(\d+)/);
    if (usMatch) {
      currentUS = `US-${usMatch[1]}`;
    }
    const acMatch = line.match(/\*\*AC-(US\d+-\d+)\*\*:\s*(.+)/);
    if (acMatch) {
      acs.push({
        id: `AC-${acMatch[1]}`,
        description: acMatch[2].trim(),
        userStory: currentUS,
      });
    }
  }
  return acs;
}

/**
 * Generate rubric.md markdown from spec.md content.
 */
export function generateRubric(
  incrementId: string,
  specContent: string,
  options: GenerateOptions = {},
): string {
  const acs = extractACs(specContent);
  const coverageTarget = options.coverageTarget ?? 90;
  const lines: string[] = [];

  // Derive the criterion ID from the AC ID: AC-US1-03 → R-US1-03. The rubric
  // parser requires the ID to end in a digit (`R-[A-Z0-9-]+\d+`).
  const criterionIdForAC = (acId: string) => `R-${acId.replace(/^AC-/, '')}`;

  // Frontmatter
  lines.push('---');
  lines.push(`increment: ${incrementId}`);
  lines.push(`title: Rubric for ${incrementId}`);
  lines.push(`generated: ${new Date().toISOString()}`);
  lines.push('source: spec.md (auto-generated from ACs)');
  lines.push('version: "1.0"');
  lines.push('status: pending');
  lines.push('---');
  lines.push('');
  lines.push(`# Rubric: ${incrementId}`);
  lines.push('');
  lines.push('> Auto-generated from spec.md acceptance criteria. Review and customize before implementation.');
  lines.push('> All **[blocking]** criteria must pass before `sw:done` can close the increment.');
  lines.push('');

  // Functional criteria from ACs
  if (acs.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Functional Correctness');
    lines.push('');

    // Group ACs by user story
    const byUS = new Map<string, ExtractedAC[]>();
    for (const ac of acs) {
      const key = ac.userStory || 'unknown';
      if (!byUS.has(key)) byUS.set(key, []);
      byUS.get(key)!.push(ac);
    }

    for (const [, usAcs] of byUS) {
      for (const ac of usAcs) {
        const id = criterionIdForAC(ac.id);
        lines.push(`### ${id}: ${ac.description} [blocking]`);
        lines.push(`- **Source**: ${ac.id}`);
        lines.push('- **Evaluator**: sw:review');
        lines.push(`- **Verify**: ${ac.description}`);
        lines.push('- **Threshold**: AC passes');
        lines.push('- **Result**: [ ] PENDING');
        lines.push('');
      }
    }
  }

  // Standard categories
  lines.push('---');
  lines.push('');
  lines.push('## Test Coverage');
  lines.push('');
  // R-D01 is ADVISORY: line coverage is authoritatively gated by the dedicated
  // validateCoverage path in completion-validator (which hard-fails on real
  // low coverage and skips when no coverage report exists). The `coverage`
  // rubric evaluator is not automated and would otherwise resolve to `skip`,
  // which blocks closure for every increment — so it mirrors, not double-gates.
  lines.push(`### R-D01: Unit test coverage meets target [advisory]`);
  lines.push('- **Source**: project-default');
  lines.push('- **Evaluator**: coverage');
  lines.push(`- **Verify**: Coverage output on new/modified files (authoritative gate: completion-validator validateCoverage)`);
  lines.push(`- **Threshold**: >= ${coverageTarget}% line coverage`);
  lines.push('- **Result**: [ ] PENDING');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## Code Quality');
  lines.push('');
  lines.push('### R-D02: No critical, high, or medium code review findings [blocking]');
  lines.push('- **Source**: project-default');
  lines.push('- **Evaluator**: sw:review');
  lines.push('- **Verify**: reports/review.json findings');
  lines.push('- **Threshold**: critical === 0 AND high === 0');
  lines.push('- **Result**: [ ] PENDING');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## Independent Evaluation');
  lines.push('');
  lines.push('### R-D03: Adversarial review found nothing blocking [blocking]');
  lines.push('- **Source**: project-default');
  lines.push('- **Evaluator**: sw:review');
  lines.push('- **Verify**: reports/review.json (ok + findings)');
  lines.push('- **Threshold**: ok !== false AND no critical/high findings');
  lines.push('- **Result**: [ ] PENDING');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate rubric.md and write to the increment ROOT directory.
 *
 * Writes unconditionally (overwrites). Use {@link ensureRubricFile} for the
 * idempotent, no-clobber path that respects an existing user-authored rubric.
 */
export async function generateRubricFile(
  incrementId: string,
  incrementPath: string,
  options: GenerateOptions = {},
): Promise<void> {
  const specPath = path.join(incrementPath, 'spec.md');
  const specContent = await fs.readFile(specPath, 'utf-8');
  const rubricContent = generateRubric(incrementId, specContent, options);
  await fs.writeFile(path.join(incrementPath, 'rubric.md'), rubricContent, 'utf-8');
}

/** True when a rubric.md's frontmatter carries `status: template` (placeholder). */
function isTemplateRubric(content: string): boolean {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  return fmMatch ? fmMatch[1].includes('status: template') : false;
}

export interface EnsureRubricResult {
  /** Whether the root rubric.md was (re)written. */
  written: boolean;
  /** Absolute path to the root rubric.md. */
  rubricPath: string;
  /** Why generation was skipped, when `written` is false. */
  skippedReason?: 'exists-non-template' | 'no-acs';
}

export interface EnsureRubricOptions extends GenerateOptions {
  /** Overwrite an existing non-template rubric.md. Default false (no-clobber). */
  refresh?: boolean;
}

/**
 * Idempotently ensure a non-template `rubric.md` exists at the increment ROOT.
 *
 * - If a non-template root rubric.md already exists and `refresh` is false,
 *   it is left untouched (no clobber).
 * - A `status: template` placeholder is always replaced.
 * - With `refresh: true`, the rubric is regenerated from the current spec.md.
 *
 * Writing to the ROOT (not `reports/`) is intentional — the closure gate in
 * `completion-validator.ts` reads the root rubric.md.
 */
export async function ensureRubricFile(
  incrementId: string,
  incrementPath: string,
  options: EnsureRubricOptions = {},
): Promise<EnsureRubricResult> {
  const rubricPath = path.join(incrementPath, 'rubric.md');
  const refresh = options.refresh ?? false;

  if (!refresh && (await fs.pathExists(rubricPath))) {
    const existing = await fs.readFile(rubricPath, 'utf-8');
    if (!isTemplateRubric(existing)) {
      return { written: false, rubricPath, skippedReason: 'exists-non-template' };
    }
  }

  const specPath = path.join(incrementPath, 'spec.md');
  const specContent = await fs.readFile(specPath, 'utf-8');
  const rubricContent = generateRubric(incrementId, specContent, options);
  await fs.writeFile(rubricPath, rubricContent, 'utf-8');
  return { written: true, rubricPath };
}
