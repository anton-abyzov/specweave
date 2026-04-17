/**
 * CLI dispatcher — shared option parsing for skill-invoking commands (0669 Wave 3).
 *
 * Currently exposes --effort <level> parsing. Propagate the returned EffortLevel
 * into the skill invocation options so skills can pick it up from
 * `quality.thinkingBudget` / `options.effort`.
 */

export const EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
export type EffortLevel = (typeof EFFORT_LEVELS)[number];
export const DEFAULT_EFFORT: EffortLevel = 'xhigh';

export interface EffortParseResult {
  effort: EffortLevel;
  error?: string;
}

const MAX_ADVISORY =
  '⚠️  --effort max: maximum effort risks overthinking on straightforward problems ' +
  'and costs significantly more — reserve for genuinely hard architectural decisions. ' +
  'Consider xhigh instead.\n';

function isEffortLevel(value: string): value is EffortLevel {
  return (EFFORT_LEVELS as readonly string[]).includes(value);
}

/**
 * Parse --effort <level> out of an argv array. Case-insensitive; defaults to
 * DEFAULT_EFFORT when the flag is absent. Emits an overthinking advisory to
 * stderr when `max` is selected.
 */
export function parseEffortFlag(argv: string[]): EffortParseResult {
  const flagIndex = argv.indexOf('--effort');
  if (flagIndex === -1) {
    return { effort: DEFAULT_EFFORT };
  }

  const rawValue = argv[flagIndex + 1];
  if (!rawValue) {
    return {
      effort: DEFAULT_EFFORT,
      error: '--effort requires a value (low|medium|high|xhigh|max)',
    };
  }

  const normalized = rawValue.toLowerCase();
  if (!isEffortLevel(normalized)) {
    return {
      effort: DEFAULT_EFFORT,
      error: `invalid --effort value "${rawValue}"; expected one of ${EFFORT_LEVELS.join('|')}`,
    };
  }

  if (normalized === 'max') {
    process.stderr.write(MAX_ADVISORY);
  }

  return { effort: normalized };
}

export interface DispatcherOptions {
  effort: EffortLevel;
}

/**
 * Build the shared dispatcher options object from argv. Callers merge this
 * with command-specific options before invoking the skill.
 */
export function buildDispatcherOptions(argv: string[]): DispatcherOptions {
  const { effort } = parseEffortFlag(argv);
  return { effort };
}
