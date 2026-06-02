import * as fs from '../../utils/fs-native.js';
import type {
  RubricDocument,
  RubricCriterion,
  RubricSeverity,
  RubricCategory,
  EvaluatorId,
  CriterionResult,
} from './types.js';
import { RubricParseError } from './types.js';

type ParserState = 'SCANNING_FRONTMATTER' | 'IN_FRONTMATTER' | 'SCANNING' | 'IN_CRITERION';

const CRITERION_HEADER_RE = /^###\s+(R-[A-Z0-9-]+\d+):\s+(.+?)\s+\[(blocking|advisory)\]\s*$/;
const CATEGORY_HEADING_RE = /^##\s+(.+)$/;
const FIELD_RE = /^-\s+\*\*(\w[\w\s]*)\*\*:\s+(.+)$/;
const RESULT_PASS_RE = /^\[x\]\s*PASS/i;
const RESULT_FAIL_RE = /^\[!\]\s*FAIL(?:\s*(?:—|-)\s*(.*))?$/i;
const RESULT_PENDING_RE = /^\[\s*\]\s*PENDING/i;

/**
 * Strip a surrounding markdown inline-code span from a field value so a
 * `command` probe written as `` `cmd` `` (or ``` ``cmd`` ```) executes the
 * command itself, not a backtick-wrapped string the shell would treat as
 * command substitution. Only strips when the whole value is one code span.
 */
function stripInlineCode(value: string): string {
  const trimmed = value.trim();
  const m = trimmed.match(/^(`{1,3})([\s\S]*)\1$/);
  return m ? m[2].trim() : trimmed;
}

function toKebabCategory(heading: string): RubricCategory {
  const kebab = heading.trim().toLowerCase().replace(/\s+/g, '-');
  const validCategories: RubricCategory[] = [
    'functional-correctness',
    'test-coverage',
    'code-quality',
    'security',
    'performance',
    'documentation',
    'independent-evaluation',
  ];
  return (validCategories.find(c => c === kebab) ?? 'functional-correctness') as RubricCategory;
}

function parseResultField(value: string): CriterionResult | null {
  const trimmed = value.trim();
  if (RESULT_PASS_RE.test(trimmed)) {
    return { status: 'pass', evidence: '', evaluatedAt: '' };
  }
  const failMatch = trimmed.match(RESULT_FAIL_RE);
  if (failMatch) {
    return { status: 'fail', evidence: failMatch[1]?.trim() ?? '', evaluatedAt: '' };
  }
  if (RESULT_PENDING_RE.test(trimmed)) {
    return null;
  }
  return null;
}

/**
 * Parse rubric.md markdown content into a structured RubricDocument.
 */
export function parseRubric(content: string): RubricDocument {
  const lines = content.split('\n');
  let state: ParserState = 'SCANNING_FRONTMATTER';
  const frontmatter: Record<string, string> = {};
  let currentCategory: RubricCategory = 'functional-correctness';
  let currentCriterion: Partial<RubricCriterion> | null = null;
  const criteria: RubricCriterion[] = [];
  let frontmatterStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    switch (state) {
      case 'SCANNING_FRONTMATTER':
        if (line.trim() === '---') {
          state = 'IN_FRONTMATTER';
          frontmatterStart = lineNum;
        }
        break;

      case 'IN_FRONTMATTER':
        if (line.trim() === '---') {
          state = 'SCANNING';
        } else {
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0) {
            const key = line.substring(0, colonIdx).trim();
            const val = line.substring(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
            frontmatter[key] = val;
          }
        }
        break;

      case 'SCANNING':
      case 'IN_CRITERION': {
        const categoryMatch = line.match(CATEGORY_HEADING_RE);
        if (categoryMatch) {
          if (currentCriterion) {
            criteria.push(finalizeCriterion(currentCriterion));
            currentCriterion = null;
          }
          currentCategory = toKebabCategory(categoryMatch[1]);
          state = 'SCANNING';
          break;
        }

        const criterionMatch = line.match(CRITERION_HEADER_RE);
        if (criterionMatch) {
          if (currentCriterion) {
            criteria.push(finalizeCriterion(currentCriterion));
          }
          currentCriterion = {
            id: criterionMatch[1],
            title: criterionMatch[2],
            severity: criterionMatch[3] as RubricSeverity,
            category: currentCategory,
            sourceACs: [],
            evaluator: 'sw:grill',
            verify: '',
            threshold: '',
            result: null,
          };
          state = 'IN_CRITERION';
          break;
        }

        if (state === 'IN_CRITERION' && currentCriterion) {
          const fieldMatch = line.match(FIELD_RE);
          if (fieldMatch) {
            const fieldName = fieldMatch[1].trim().toLowerCase();
            const fieldValue = fieldMatch[2].trim();

            switch (fieldName) {
              case 'source':
                currentCriterion.sourceACs = fieldValue
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean);
                break;
              case 'evaluator': {
                const validEvaluators: EvaluatorId[] = ['sw:grill', 'sw:code-reviewer', 'sw:judge-llm', 'command', 'coverage', 'manual'];
                currentCriterion.evaluator = validEvaluators.includes(fieldValue as EvaluatorId)
                  ? fieldValue as EvaluatorId
                  : 'sw:grill'; // default for unknown evaluators
                break;
              }
              case 'verify':
                // Strip a surrounding markdown inline-code span (``` ``cmd`` ``` or
                // `cmd`). Writing a command probe in backticks is the natural
                // markdown idiom, but leaving the backticks in makes the shell do
                // command substitution — it runs the inner command, then tries to
                // exec its OUTPUT as a command (`exit 127: RUN: command not found`).
                currentCriterion.verify = stripInlineCode(fieldValue);
                break;
              case 'threshold':
                currentCriterion.threshold = fieldValue;
                break;
              case 'result':
                currentCriterion.result = parseResultField(fieldValue);
                break;
            }
          }
        }
        break;
      }
    }
  }

  if (state === 'IN_FRONTMATTER') {
    throw new RubricParseError(
      'Unterminated frontmatter — missing closing ---',
      frontmatterStart,
      '---',
    );
  }

  if (currentCriterion) {
    criteria.push(finalizeCriterion(currentCriterion));
  }

  return {
    incrementId: frontmatter['increment'] ?? '',
    title: frontmatter['title'] ?? '',
    generated: frontmatter['generated'] ?? '',
    source: frontmatter['source'] ?? '',
    version: frontmatter['version'] ?? '1.0',
    status: frontmatter['status'] ?? 'pending',
    criteria,
  };
}

function finalizeCriterion(partial: Partial<RubricCriterion>): RubricCriterion {
  return {
    id: partial.id ?? 'R-000',
    title: partial.title ?? '',
    severity: partial.severity ?? 'blocking',
    sourceACs: partial.sourceACs ?? [],
    evaluator: partial.evaluator ?? 'sw:grill',
    category: partial.category ?? 'functional-correctness',
    verify: partial.verify ?? '',
    threshold: partial.threshold ?? '',
    result: partial.result ?? null,
  };
}

/**
 * Parse rubric.md from a file path.
 */
export async function parseRubricFile(filePath: string): Promise<RubricDocument> {
  const content = await fs.readFile(filePath, 'utf-8');
  return parseRubric(content);
}
