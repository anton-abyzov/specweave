/**
 * Inconsistency Detector
 *
 * Finds inconsistencies, duplicates, ownership gaps,
 * and generates questions for CTO/PO.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  RepoAnalysis,
  DetectedIssue,
  TechDebtItem,
  LLMProvider,
  ProgressCallback,
} from './types.js';
import type { OrganizationSynthesisResult } from './organization-synthesizer.js';

export interface InconsistencyResult {
  issues: DetectedIssue[];
  techDebt: TechDebtItem[];
  questionsForCTO: string[];
  questionsForPO: string[];
}

export async function detectInconsistencies(
  repoAnalyses: Map<string, RepoAnalysis>,
  orgResult: OrganizationSynthesisResult,
  llmProvider: LLMProvider | null,
  onProgress: ProgressCallback,
  log: (msg: string) => void
): Promise<InconsistencyResult> {
  log('PHASE E: Inconsistency Detection');
  onProgress('inconsistency', 0, 100, 'Analyzing patterns');

  const issues: DetectedIssue[] = [];
  const techDebt: TechDebtItem[] = [];

  onProgress('inconsistency', 20, 100, 'Checking pattern consistency');
  const patternIssues = detectPatternInconsistencies(repoAnalyses);
  issues.push(...patternIssues);
  log('  Found ' + patternIssues.length + ' pattern inconsistencies');

  onProgress('inconsistency', 40, 100, 'Finding duplicates');
  const duplicates = detectPotentialDuplicates(repoAnalyses);
  issues.push(...duplicates);
  log('  Found ' + duplicates.length + ' potential duplicates');

  onProgress('inconsistency', 60, 100, 'Checking ownership');
  const ownershipIssues = detectOwnershipGaps(repoAnalyses, orgResult);
  issues.push(...ownershipIssues);
  log('  Found ' + ownershipIssues.length + ' ownership issues');

  onProgress('inconsistency', 80, 100, 'Cataloging tech debt');
  const debt = extractTechDebt(repoAnalyses);
  techDebt.push(...debt);
  log('  Identified ' + debt.length + ' tech debt items');

  const questionsForCTO = generateCTOQuestions(issues, techDebt, orgResult);
  const questionsForPO = generatePOQuestions(issues, repoAnalyses);

  return { issues, techDebt, questionsForCTO, questionsForPO };
}

function detectPatternInconsistencies(analyses: Map<string, RepoAnalysis>): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const categoryPatterns = new Map<string, Map<string, string[]>>();

  for (const [name, analysis] of analyses) {
    for (const p of analysis.patternsUsed) {
      if (!categoryPatterns.has(p.category)) {
        categoryPatterns.set(p.category, new Map());
      }
      const catMap = categoryPatterns.get(p.category)!;
      if (!catMap.has(p.pattern)) catMap.set(p.pattern, []);
      catMap.get(p.pattern)!.push(name);
    }
  }

  let issueNum = 1;
  for (const [category, patterns] of categoryPatterns) {
    if (patterns.size > 1) {
      const patternList = Array.from(patterns.entries())
        .map(([p, r]) => p + ' (' + r.join(', ') + ')')
        .join('; ');

      issues.push({
        id: 'ICS-' + String(issueNum++).padStart(3, '0'),
        type: 'inconsistency',
        severity: 'important',
        title: 'Multiple ' + category + ' patterns in use',
        description: 'Found ' + patterns.size + ' different ' + category + ' patterns: ' + patternList,
        evidence: Array.from(patterns.entries()).map(([p, r]) => ({
          repo: r.join(', '),
          files: [] as string[],
          details: 'Uses ' + p,
        })),
        suggestedAction: 'Standardize on a single ' + category + ' pattern',
        targetAudience: 'cto',
      });
    }
  }

  return issues;
}

function detectPotentialDuplicates(analyses: Map<string, RepoAnalysis>): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const repos = Array.from(analyses.entries());
  let issueNum = 1;

  for (let i = 0; i < repos.length; i++) {
    for (let j = i + 1; j < repos.length; j++) {
      const [name1, a1] = repos[i];
      const [name2, a2] = repos[j];

      const overlap = a1.keyConcepts.filter(c => a2.keyConcepts.includes(c));
      if (overlap.length >= 3) {
        issues.push({
          id: 'DUM-' + String(issueNum++).padStart(3, '0'),
          type: 'duplicate',
          severity: 'important',
          title: 'Potential duplicate: ' + name1 + ' vs ' + name2,
          description: 'These repos share ' + overlap.length + ' concepts: ' + overlap.join(', '),
          evidence: [
            { repo: name1, files: [], details: a1.purpose.slice(0, 100) },
            { repo: name2, files: [], details: a2.purpose.slice(0, 100) },
          ],
          suggestedAction: 'Investigate if these could be consolidated',
          targetAudience: 'team',
        });
      }
    }
  }

  return issues;
}

function detectOwnershipGaps(
  analyses: Map<string, RepoAnalysis>,
  org: OrganizationSynthesisResult
): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const assignedRepos = new Set<string>();

  for (const team of org.teams) {
    for (const repo of team.repos) {
      assignedRepos.add(repo);
    }
  }

  const orphanedRepos = Array.from(analyses.keys()).filter(r => !assignedRepos.has(r));

  if (orphanedRepos.length > 0) {
    issues.push({
      id: 'OWN-001',
      type: 'ownership',
      severity: 'important',
      title: orphanedRepos.length + ' repos with unclear ownership',
      description: 'These repositories could not be assigned to a team: ' + orphanedRepos.join(', '),
      evidence: orphanedRepos.map(r => ({
        repo: r,
        files: [] as string[],
        details: analyses.get(r)!.purpose.slice(0, 50),
      })),
      suggestedAction: 'Assign team ownership for these repositories',
      targetAudience: 'cto',
    });
  }

  return issues;
}

function extractTechDebt(analyses: Map<string, RepoAnalysis>): TechDebtItem[] {
  const debt: TechDebtItem[] = [];
  let debtNum = 1;

  for (const [name, analysis] of analyses) {
    if (analysis.confidence === 'low') {
      debt.push({
        id: 'DEBT-' + String(debtNum++).padStart(3, '0'),
        title: 'Improve documentation for ' + name,
        description: 'Low confidence analysis suggests missing or outdated docs',
        severity: 'medium',
        effort: 'small',
        repos: [name],
        category: 'documentation',
      });
    }

    if (analysis.filesAnalyzed < 3) {
      debt.push({
        id: 'DEBT-' + String(debtNum++).padStart(3, '0'),
        title: 'Review project structure for ' + name,
        description: 'Very few files could be analyzed - may need restructuring',
        severity: 'low',
        effort: 'medium',
        repos: [name],
        category: 'legacy',
      });
    }
  }

  return debt;
}

function generateCTOQuestions(
  issues: DetectedIssue[],
  techDebt: TechDebtItem[],
  org: OrganizationSynthesisResult
): string[] {
  const questions: string[] = [];

  const patternIssues = issues.filter(i => i.type === 'inconsistency');
  if (patternIssues.length > 0) {
    questions.push('We found ' + patternIssues.length + ' cases where different repos use different patterns for the same thing. Should we standardize?');
  }

  if (org.hypotheses.length > 0) {
    questions.push(...org.hypotheses.map(h => 'Organization question: ' + h));
  }

  const highDebt = techDebt.filter(d => d.severity === 'high');
  if (highDebt.length > 0) {
    questions.push('We identified ' + highDebt.length + ' high-priority tech debt items. What is the appetite for addressing these?');
  }

  return questions;
}

function generatePOQuestions(
  issues: DetectedIssue[],
  analyses: Map<string, RepoAnalysis>
): string[] {
  const questions: string[] = [];

  const dups = issues.filter(i => i.type === 'duplicate');
  if (dups.length > 0) {
    questions.push('We found ' + dups.length + ' pairs of repos that might be doing similar things. Are these intentional?');
  }

  const unclear = Array.from(analyses.entries())
    .filter(([_, a]) => a.purpose.includes('not determined') || a.confidence === 'low');
  if (unclear.length > 0) {
    questions.push('We could not determine the purpose of ' + unclear.length + ' repos. Can you clarify their business value?');
  }

  return questions;
}

export async function saveReviewNeeded(
  projectPath: string,
  result: InconsistencyResult
): Promise<string[]> {
  const savedFiles: string[] = [];
  const reviewPath = path.join(projectPath, '.specweave/docs/internal/review-needed');
  fs.mkdirSync(reviewPath, { recursive: true });

  if (result.questionsForCTO.length > 0) {
    const ctoFile = path.join(reviewPath, 'questions-for-cto.md');
    fs.writeFileSync(ctoFile, [
      '# Questions for CTO',
      '',
      '*Auto-generated by Intelligent Analyzer*',
      '',
      ...result.questionsForCTO.map((q, i) => (i + 1) + '. ' + q),
    ].join('\n'));
    savedFiles.push(ctoFile);
  }

  if (result.questionsForPO.length > 0) {
    const poFile = path.join(reviewPath, 'questions-for-po.md');
    fs.writeFileSync(poFile, [
      '# Questions for Product Owner',
      '',
      '*Auto-generated by Intelligent Analyzer*',
      '',
      ...result.questionsForPO.map((q, i) => (i + 1) + '. ' + q),
    ].join('\n'));
    savedFiles.push(poFile);
  }

  const inconsistencies = result.issues.filter(i => i.type === 'inconsistency');
  if (inconsistencies.length > 0) {
    const incFile = path.join(reviewPath, 'inconsistencies.md');
    const lines = ['# Inconsistencies', '', '*Auto-generated by Intelligent Analyzer*', ''];
    for (const issue of inconsistencies) {
      lines.push('## ' + issue.id + ': ' + issue.title, '', issue.description, '',
        '**Suggested action**: ' + issue.suggestedAction, '');
    }
    fs.writeFileSync(incFile, lines.join('\n'));
    savedFiles.push(incFile);
  }

  const duplicates = result.issues.filter(i => i.type === 'duplicate');
  if (duplicates.length > 0) {
    const dupFile = path.join(reviewPath, 'potential-duplicates.md');
    const lines = ['# Potential Duplicates', '', '*Auto-generated by Intelligent Analyzer*', ''];
    for (const issue of duplicates) {
      lines.push('## ' + issue.id + ': ' + issue.title, '', issue.description, '',
        '**Suggested action**: ' + issue.suggestedAction, '');
    }
    fs.writeFileSync(dupFile, lines.join('\n'));
    savedFiles.push(dupFile);
  }

  if (result.techDebt.length > 0) {
    const debtFile = path.join(reviewPath, 'tech-debt.md');
    const lines = ['# Tech Debt', '', '*Auto-generated by Intelligent Analyzer*', ''];
    for (const item of result.techDebt) {
      lines.push('## ' + item.id + ': ' + item.title, '', item.description, '',
        '- **Severity**: ' + item.severity, '- **Effort**: ' + item.effort,
        '- **Repos**: ' + item.repos.join(', '), '');
    }
    fs.writeFileSync(debtFile, lines.join('\n'));
    savedFiles.push(debtFile);
  }

  return savedFiles;
}
