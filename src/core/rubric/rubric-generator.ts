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
  let counter = 1;

  const pad = (n: number) => String(n).padStart(3, '0');

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
        const id = `R-${pad(counter++)}`;
        lines.push(`### ${id}: ${ac.description} [blocking]`);
        lines.push(`- **Source**: ${ac.id}`);
        lines.push('- **Evaluator**: sw:grill');
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
  lines.push(`### R-D01: Unit test coverage meets target [blocking]`);
  lines.push('- **Source**: project-default');
  lines.push('- **Evaluator**: coverage');
  lines.push(`- **Verify**: Coverage output on new/modified files`);
  lines.push(`- **Threshold**: >= ${coverageTarget}% line coverage`);
  lines.push('- **Result**: [ ] PENDING');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## Code Quality');
  lines.push('');
  lines.push('### R-D02: No critical, high, or medium code review findings [blocking]');
  lines.push('- **Source**: project-default');
  lines.push('- **Evaluator**: sw:code-reviewer');
  lines.push('- **Verify**: code-review-report.json summary');
  lines.push('- **Threshold**: critical === 0 AND high === 0 AND medium === 0');
  lines.push('- **Result**: [ ] PENDING');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## Independent Evaluation');
  lines.push('');
  lines.push('### R-D03: Ship readiness verified [blocking]');
  lines.push('- **Source**: project-default');
  lines.push('- **Evaluator**: sw:grill');
  lines.push('- **Verify**: grill-report.json shipReadiness');
  lines.push('- **Threshold**: shipReadiness !== "NOT READY"');
  lines.push('- **Result**: [ ] PENDING');
  lines.push('');
  lines.push('### R-D04: LLM judge verdict acceptable [blocking]');
  lines.push('- **Source**: project-default');
  lines.push('- **Evaluator**: sw:judge-llm');
  lines.push('- **Verify**: judge-llm-report.json verdict');
  lines.push('- **Threshold**: verdict !== "REJECTED"');
  lines.push('- **Result**: [ ] PENDING');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate rubric.md and write to the increment directory.
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
