/**
 * Inconsistency Detector
 *
 * Finds inconsistencies, duplicates, ownership gaps,
 * and generates questions for CTO/PO.
 *
 * Enhanced with:
 * - Severity categorization (P0-P3)
 * - Broken link detection
 * - Spec-code gap detection
 * - Orphaned document detection
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import type {
  RepoAnalysis,
  DetectedIssue,
  TechDebtItem,
  LLMProvider,
  ProgressCallback,
} from './types.js';
import type { OrganizationSynthesisResult } from './organization-synthesizer.js';

export type IssueSeverity = 'P0' | 'P1' | 'P2' | 'P3';

export interface EnhancedIssue extends DetectedIssue {
  priority: IssueSeverity;
  remediation: string[];
  category: 'inconsistency' | 'duplicate' | 'ownership' | 'broken-link' | 'spec-gap' | 'orphaned';
}

export interface InconsistencyResult {
  issues: DetectedIssue[];
  enhancedIssues: EnhancedIssue[];
  techDebt: TechDebtItem[];
  questionsForCTO: string[];
  questionsForPO: string[];
  byPriority: Map<IssueSeverity, EnhancedIssue[]>;
  brokenLinks: BrokenLink[];
  specCodeGaps: SpecCodeGap[];
  orphanedDocs: string[];
}

export interface BrokenLink {
  file: string;
  line: number;
  link: string;
  reason: string;
}

export interface SpecCodeGap {
  specId: string;
  specFile: string;
  type: 'ghost_completion' | 'missing_impl' | 'outdated_spec';
  confidence: number;
  details: string;
}

export async function detectInconsistencies(
  repoAnalyses: Map<string, RepoAnalysis>,
  orgResult: OrganizationSynthesisResult,
  llmProvider: LLMProvider | null,
  onProgress: ProgressCallback,
  log: (msg: string) => void,
  projectPath?: string
): Promise<InconsistencyResult> {
  log('PHASE E: Inconsistency Detection (Enhanced)');
  onProgress('inconsistency', 0, 100, 'Analyzing patterns');

  const issues: DetectedIssue[] = [];
  const enhancedIssues: EnhancedIssue[] = [];
  const techDebt: TechDebtItem[] = [];
  const byPriority = new Map<IssueSeverity, EnhancedIssue[]>([
    ['P0', []],
    ['P1', []],
    ['P2', []],
    ['P3', []],
  ]);

  // Phase E.1: Pattern Inconsistencies
  onProgress('inconsistency', 10, 100, 'Checking pattern consistency');
  const patternIssues = detectPatternInconsistencies(repoAnalyses);
  issues.push(...patternIssues);
  const enhancedPatterns = patternIssues.map(i => enhanceIssue(i, 'inconsistency'));
  enhancedIssues.push(...enhancedPatterns);
  log('  Found ' + patternIssues.length + ' pattern inconsistencies');

  // Phase E.2: Potential Duplicates
  onProgress('inconsistency', 20, 100, 'Finding duplicates');
  const duplicates = detectPotentialDuplicates(repoAnalyses);
  issues.push(...duplicates);
  const enhancedDups = duplicates.map(i => enhanceIssue(i, 'duplicate'));
  enhancedIssues.push(...enhancedDups);
  log('  Found ' + duplicates.length + ' potential duplicates');

  // Phase E.3: Ownership Gaps
  onProgress('inconsistency', 30, 100, 'Checking ownership');
  const ownershipIssues = detectOwnershipGaps(repoAnalyses, orgResult);
  issues.push(...ownershipIssues);
  const enhancedOwn = ownershipIssues.map(i => enhanceIssue(i, 'ownership'));
  enhancedIssues.push(...enhancedOwn);
  log('  Found ' + ownershipIssues.length + ' ownership issues');

  // Phase E.4: Broken Links (new)
  let brokenLinks: BrokenLink[] = [];
  if (projectPath) {
    onProgress('inconsistency', 40, 100, 'Detecting broken links');
    brokenLinks = await detectBrokenLinks(projectPath);
    log('  Found ' + brokenLinks.length + ' broken links');

    // Convert to issues
    if (brokenLinks.length > 0) {
      const brokenLinkIssue = createBrokenLinkIssue(brokenLinks);
      issues.push(brokenLinkIssue);
      enhancedIssues.push(enhanceIssue(brokenLinkIssue, 'broken-link'));
    }
  }

  // Phase E.5: Spec-Code Gaps (new)
  let specCodeGaps: SpecCodeGap[] = [];
  if (projectPath) {
    onProgress('inconsistency', 55, 100, 'Detecting spec-code gaps');
    specCodeGaps = await detectSpecCodeGaps(projectPath);
    log('  Found ' + specCodeGaps.length + ' spec-code gaps');

    // Convert to issues
    for (const gap of specCodeGaps) {
      const gapIssue = createSpecCodeGapIssue(gap);
      issues.push(gapIssue);
      enhancedIssues.push(enhanceIssue(gapIssue, 'spec-gap'));
    }
  }

  // Phase E.6: Orphaned Documents (new)
  let orphanedDocs: string[] = [];
  if (projectPath) {
    onProgress('inconsistency', 70, 100, 'Detecting orphaned documents');
    orphanedDocs = await detectOrphanedDocs(projectPath);
    log('  Found ' + orphanedDocs.length + ' orphaned documents');

    // Convert to issue
    if (orphanedDocs.length > 0) {
      const orphanIssue = createOrphanedDocsIssue(orphanedDocs);
      issues.push(orphanIssue);
      enhancedIssues.push(enhanceIssue(orphanIssue, 'orphaned'));
    }
  }

  // Phase E.7: Tech Debt
  onProgress('inconsistency', 85, 100, 'Cataloging tech debt');
  const debt = extractTechDebt(repoAnalyses);
  techDebt.push(...debt);
  log('  Identified ' + debt.length + ' tech debt items');

  // Categorize by priority
  for (const issue of enhancedIssues) {
    byPriority.get(issue.priority)!.push(issue);
  }

  const questionsForCTO = generateCTOQuestions(issues, techDebt, orgResult);
  const questionsForPO = generatePOQuestions(issues, repoAnalyses);

  onProgress('inconsistency', 100, 100, 'Detection complete');

  return {
    issues,
    enhancedIssues,
    techDebt,
    questionsForCTO,
    questionsForPO,
    byPriority,
    brokenLinks,
    specCodeGaps,
    orphanedDocs,
  };
}

/**
 * Enhance a basic issue with priority, remediation, and category
 */
function enhanceIssue(
  issue: DetectedIssue,
  category: EnhancedIssue['category']
): EnhancedIssue {
  const priority = determinePriority(issue, category);
  const remediation = generateRemediation(issue, category);

  return {
    ...issue,
    priority,
    remediation,
    category,
  };
}

/**
 * Determine issue priority based on type and severity
 */
function determinePriority(
  issue: DetectedIssue,
  category: EnhancedIssue['category']
): IssueSeverity {
  // P0: Critical - blocks production or security risk
  if (category === 'spec-gap' && issue.description.includes('ghost_completion')) {
    return 'P0'; // Ghost completions are critical - shows we think something is done but isn't
  }
  if (category === 'broken-link' && issue.description.includes('critical')) {
    return 'P0';
  }

  // P1: High - significant issues needing attention
  if (issue.severity === 'critical') return 'P1';
  if (category === 'ownership' && issue.evidence && issue.evidence.length > 5) {
    return 'P1'; // Many repos without owners is serious
  }
  if (category === 'duplicate' && issue.evidence && issue.evidence.length > 3) {
    return 'P1'; // Many duplicates suggest bigger architecture issue
  }

  // P2: Medium - should fix but not urgent
  if (issue.severity === 'important') return 'P2';
  if (category === 'inconsistency') return 'P2';
  if (category === 'orphaned') return 'P2';

  // P3: Low - nice to have
  return 'P3';
}

/**
 * Generate actionable remediation steps
 */
function generateRemediation(
  issue: DetectedIssue,
  category: EnhancedIssue['category']
): string[] {
  const steps: string[] = [];

  switch (category) {
    case 'inconsistency':
      steps.push('1. Review the conflicting patterns across repositories');
      steps.push('2. Create an ADR documenting the standard pattern to use');
      steps.push('3. Create migration tickets for non-compliant repos');
      steps.push('4. Update linting rules to enforce the standard');
      break;

    case 'duplicate':
      steps.push('1. Compare functionality of both services/repos');
      steps.push('2. Identify which is the canonical source');
      steps.push('3. Plan consolidation or document why both exist');
      steps.push('4. Update documentation to clarify boundaries');
      break;

    case 'ownership':
      steps.push('1. Review each unassigned repository');
      steps.push('2. Determine appropriate team based on domain');
      steps.push('3. Update CODEOWNERS file');
      steps.push('4. Add ownership to team charter documents');
      break;

    case 'broken-link':
      steps.push('1. Identify source files with broken links');
      steps.push('2. Update or remove broken references');
      steps.push('3. Add link validation to CI/CD pipeline');
      steps.push('4. Consider using relative links where possible');
      break;

    case 'spec-gap':
      steps.push('1. Compare spec completion claims with actual code');
      steps.push('2. Update spec status to reflect reality');
      steps.push('3. Create tickets for missing implementations');
      steps.push('4. Review completion verification process');
      break;

    case 'orphaned':
      steps.push('1. Review each orphaned document');
      steps.push('2. Archive if no longer relevant');
      steps.push('3. Link to appropriate parent if still relevant');
      steps.push('4. Update documentation structure');
      break;
  }

  return steps;
}

/**
 * Detect broken links in documentation
 */
async function detectBrokenLinks(projectPath: string): Promise<BrokenLink[]> {
  const brokenLinks: BrokenLink[] = [];
  const docsPath = path.join(projectPath, '.specweave/docs');

  if (!fs.existsSync(docsPath)) return brokenLinks;

  const mdFiles = await glob('**/*.md', { cwd: docsPath, absolute: true });

  // Link patterns to detect
  const linkPatterns = [
    /\[([^\]]+)\]\(([^)]+)\)/g,           // Markdown links [text](url)
    /\[\[([^\]]+)\]\]/g,                   // Wiki-style links [[page]]
    /href="([^"]+)"/g,                     // HTML href
  ];

  for (const file of mdFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];

        for (const pattern of linkPatterns) {
          let match;
          pattern.lastIndex = 0; // Reset regex

          while ((match = pattern.exec(line)) !== null) {
            const link = match[2] || match[1];

            // Skip external URLs and anchors
            if (link.startsWith('http') || link.startsWith('#') || link.startsWith('mailto:')) {
              continue;
            }

            // Check if local file exists
            const brokenReason = checkLinkValidity(file, link, projectPath);
            if (brokenReason) {
              brokenLinks.push({
                file: path.relative(projectPath, file),
                line: lineNum + 1,
                link,
                reason: brokenReason,
              });
            }
          }
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return brokenLinks;
}

/**
 * Check if a link is valid
 */
function checkLinkValidity(sourceFile: string, link: string, projectPath: string): string | null {
  // Remove anchor from link
  const linkPath = link.split('#')[0];
  if (!linkPath) return null; // Pure anchor link

  // Resolve relative to source file or project root
  let targetPath: string;
  if (linkPath.startsWith('/')) {
    targetPath = path.join(projectPath, linkPath);
  } else {
    targetPath = path.resolve(path.dirname(sourceFile), linkPath);
  }

  // Check if target exists
  if (!fs.existsSync(targetPath)) {
    // Try with .md extension
    if (!fs.existsSync(targetPath + '.md')) {
      return 'File not found: ' + linkPath;
    }
  }

  return null;
}

/**
 * Detect gaps between specifications and code
 */
async function detectSpecCodeGaps(projectPath: string): Promise<SpecCodeGap[]> {
  const gaps: SpecCodeGap[] = [];
  const specsPath = path.join(projectPath, '.specweave/docs/internal/specs');
  const incrementsPath = path.join(projectPath, '.specweave/increments');

  if (!fs.existsSync(specsPath)) return gaps;

  // Find all spec files
  const specFiles = await glob('**/spec.md', { cwd: incrementsPath, absolute: true });

  for (const specFile of specFiles) {
    try {
      const content = fs.readFileSync(specFile, 'utf-8');
      const incrementFolder = path.dirname(specFile);
      const metadataPath = path.join(incrementFolder, 'metadata.json');

      if (!fs.existsSync(metadataPath)) continue;

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

      // Check for ghost completions: status = completed but ACs unchecked
      if (metadata.status === 'completed') {
        const acPattern = /- \[ \] \*\*AC-/g;
        const uncheckedACs = content.match(acPattern);

        if (uncheckedACs && uncheckedACs.length > 0) {
          gaps.push({
            specId: metadata.id || path.basename(incrementFolder),
            specFile: path.relative(projectPath, specFile),
            type: 'ghost_completion',
            confidence: 0.9,
            details: `Increment marked complete but ${uncheckedACs.length} ACs unchecked`,
          });
        }
      }

      // Check for missing implementations: status = active but no recent activity
      if (metadata.status === 'active') {
        const lastActivity = metadata.updatedAt ? new Date(metadata.updatedAt) : null;
        const daysSinceActivity = lastActivity
          ? (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
          : 999;

        if (daysSinceActivity > 30) {
          gaps.push({
            specId: metadata.id || path.basename(incrementFolder),
            specFile: path.relative(projectPath, specFile),
            type: 'missing_impl',
            confidence: 0.7,
            details: `Active increment with no activity for ${Math.floor(daysSinceActivity)} days`,
          });
        }
      }

      // Check for outdated specs: tasks completed but spec not updated
      const tasksPath = path.join(incrementFolder, 'tasks.md');
      if (fs.existsSync(tasksPath)) {
        const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
        const completedTasks = (tasksContent.match(/\[x\]/gi) || []).length;
        const totalTasks = (tasksContent.match(/### T-\d+/g) || []).length;

        if (completedTasks > 0 && totalTasks > 0) {
          const specCompletedACs = (content.match(/- \[x\] \*\*AC-/g) || []).length;
          const specTotalACs = (content.match(/- \[[ x]\] \*\*AC-/g) || []).length;

          // If tasks are mostly done but ACs aren't updated
          if (completedTasks / totalTasks > 0.7 && specTotalACs > 0 && specCompletedACs / specTotalACs < 0.3) {
            gaps.push({
              specId: metadata.id || path.basename(incrementFolder),
              specFile: path.relative(projectPath, specFile),
              type: 'outdated_spec',
              confidence: 0.8,
              details: `${completedTasks}/${totalTasks} tasks done but only ${specCompletedACs}/${specTotalACs} ACs checked`,
            });
          }
        }
      }
    } catch {
      // Skip files that can't be processed
    }
  }

  return gaps;
}

/**
 * Detect orphaned documents without proper links
 */
async function detectOrphanedDocs(projectPath: string): Promise<string[]> {
  const orphaned: string[] = [];
  const docsPath = path.join(projectPath, '.specweave/docs');

  if (!fs.existsSync(docsPath)) return orphaned;

  const mdFiles = await glob('**/*.md', { cwd: docsPath, absolute: true });

  // Build a map of all documents and their references
  const docRefs = new Map<string, Set<string>>();
  const allDocs = new Set<string>();

  for (const file of mdFiles) {
    const relativePath = path.relative(docsPath, file);
    allDocs.add(relativePath);
    docRefs.set(relativePath, new Set());

    try {
      const content = fs.readFileSync(file, 'utf-8');

      // Find all internal links
      const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;

      while ((match = linkPattern.exec(content)) !== null) {
        const link = match[2];
        if (!link.startsWith('http') && !link.startsWith('#')) {
          // Normalize link path
          const linkPath = link.split('#')[0];
          if (linkPath) {
            const absPath = path.resolve(path.dirname(file), linkPath);
            const relPath = path.relative(docsPath, absPath);
            docRefs.get(relativePath)!.add(relPath);
          }
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  // Find documents that are never referenced (except by themselves)
  const referencedDocs = new Set<string>();
  for (const [source, refs] of docRefs) {
    for (const ref of refs) {
      if (ref !== source) {
        referencedDocs.add(ref);
      }
    }
  }

  // Index files and special files are not orphaned
  const specialPatterns = [
    /^index\.md$/i,
    /^readme\.md$/i,
    /^_/,
    /overview/i,
    /^internal\/specs\//,  // Specs are linked from increments
  ];

  for (const doc of allDocs) {
    if (!referencedDocs.has(doc)) {
      // Check if it's a special file
      const isSpecial = specialPatterns.some(p => p.test(doc));
      if (!isSpecial) {
        orphaned.push(doc);
      }
    }
  }

  return orphaned;
}

/**
 * Create an issue for broken links
 */
function createBrokenLinkIssue(brokenLinks: BrokenLink[]): DetectedIssue {
  return {
    id: 'BLK-001',
    type: 'broken-link' as DetectedIssue['type'],
    severity: brokenLinks.length > 10 ? 'critical' : 'important',
    title: brokenLinks.length + ' broken links in documentation',
    description: 'Found broken internal links that need to be fixed:\n' +
      brokenLinks.slice(0, 10).map(l => `- ${l.file}:${l.line}: ${l.link} (${l.reason})`).join('\n') +
      (brokenLinks.length > 10 ? `\n... and ${brokenLinks.length - 10} more` : ''),
    evidence: brokenLinks.slice(0, 5).map(l => ({
      repo: 'docs',
      files: [l.file],
      details: l.reason,
    })),
    suggestedAction: 'Fix broken links in documentation',
    targetAudience: 'team',
  };
}

/**
 * Create an issue for spec-code gaps
 */
function createSpecCodeGapIssue(gap: SpecCodeGap): DetectedIssue {
  const typeLabels: Record<SpecCodeGap['type'], string> = {
    ghost_completion: 'Ghost Completion',
    missing_impl: 'Missing Implementation',
    outdated_spec: 'Outdated Specification',
  };

  return {
    id: 'GAP-' + gap.specId,
    type: 'spec-gap' as DetectedIssue['type'],
    severity: gap.type === 'ghost_completion' ? 'critical' : 'important',
    title: typeLabels[gap.type] + ': ' + gap.specId,
    description: gap.details,
    evidence: [{
      repo: 'increments',
      files: [gap.specFile],
      details: `Confidence: ${Math.round(gap.confidence * 100)}%`,
    }],
    suggestedAction: gap.type === 'ghost_completion'
      ? 'Review and update increment status or complete missing work'
      : gap.type === 'missing_impl'
        ? 'Resume work on stalled increment or archive if no longer needed'
        : 'Update spec.md to reflect completed work',
    targetAudience: 'team',
  };
}

/**
 * Create an issue for orphaned documents
 */
function createOrphanedDocsIssue(orphanedDocs: string[]): DetectedIssue {
  return {
    id: 'ORP-001',
    type: 'orphaned' as DetectedIssue['type'],
    severity: 'minor',
    title: orphanedDocs.length + ' orphaned documents without references',
    description: 'These documents are not linked from anywhere:\n' +
      orphanedDocs.slice(0, 15).map(d => `- ${d}`).join('\n') +
      (orphanedDocs.length > 15 ? `\n... and ${orphanedDocs.length - 15} more` : ''),
    evidence: orphanedDocs.slice(0, 5).map(d => ({
      repo: 'docs',
      files: [d],
      details: 'No incoming links',
    })),
    suggestedAction: 'Review and either link, archive, or delete orphaned documents',
    targetAudience: 'team',
  };
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

  // Save questions for CTO
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

  // Save questions for PO
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

  // Save CRITICAL-ISSUES.md (P0 and P1 only)
  const criticalIssues = result.enhancedIssues.filter(i => i.priority === 'P0' || i.priority === 'P1');
  if (criticalIssues.length > 0) {
    const critFile = path.join(reviewPath, 'CRITICAL-ISSUES.md');
    const lines = [
      '# 🚨 Critical Issues',
      '',
      '*Auto-generated by Intelligent Analyzer*',
      '',
      `> **${criticalIssues.filter(i => i.priority === 'P0').length} P0** and **${criticalIssues.filter(i => i.priority === 'P1').length} P1** issues require immediate attention.`,
      '',
    ];

    // P0 first
    const p0Issues = criticalIssues.filter(i => i.priority === 'P0');
    if (p0Issues.length > 0) {
      lines.push('## P0 - Critical (Immediate Action Required)', '');
      for (const issue of p0Issues) {
        lines.push(
          '### ' + issue.id + ': ' + issue.title,
          '',
          '**Category**: ' + issue.category,
          '',
          issue.description,
          '',
          '**Remediation Steps**:',
          ...issue.remediation,
          '',
        );
      }
    }

    // P1 next
    const p1Issues = criticalIssues.filter(i => i.priority === 'P1');
    if (p1Issues.length > 0) {
      lines.push('## P1 - High Priority', '');
      for (const issue of p1Issues) {
        lines.push(
          '### ' + issue.id + ': ' + issue.title,
          '',
          '**Category**: ' + issue.category,
          '',
          issue.description,
          '',
          '**Remediation Steps**:',
          ...issue.remediation,
          '',
        );
      }
    }

    fs.writeFileSync(critFile, lines.join('\n'));
    savedFiles.push(critFile);
  }

  // Save inconsistencies.md
  const inconsistencies = result.enhancedIssues.filter(i => i.category === 'inconsistency');
  if (inconsistencies.length > 0) {
    const incFile = path.join(reviewPath, 'inconsistencies.md');
    const lines = ['# Pattern Inconsistencies', '', '*Auto-generated by Intelligent Analyzer*', ''];
    for (const issue of inconsistencies) {
      lines.push(
        '## ' + issue.id + ': ' + issue.title,
        '',
        '**Priority**: ' + issue.priority,
        '',
        issue.description,
        '',
        '**Remediation**:',
        ...issue.remediation,
        '',
      );
    }
    fs.writeFileSync(incFile, lines.join('\n'));
    savedFiles.push(incFile);
  }

  // Save potential-duplicates.md
  const duplicates = result.enhancedIssues.filter(i => i.category === 'duplicate');
  if (duplicates.length > 0) {
    const dupFile = path.join(reviewPath, 'potential-duplicates.md');
    const lines = ['# Potential Duplicates', '', '*Auto-generated by Intelligent Analyzer*', ''];
    for (const issue of duplicates) {
      lines.push(
        '## ' + issue.id + ': ' + issue.title,
        '',
        '**Priority**: ' + issue.priority,
        '',
        issue.description,
        '',
        '**Remediation**:',
        ...issue.remediation,
        '',
      );
    }
    fs.writeFileSync(dupFile, lines.join('\n'));
    savedFiles.push(dupFile);
  }

  // Save BROKEN-LINKS.md (new)
  if (result.brokenLinks.length > 0) {
    const blFile = path.join(reviewPath, 'BROKEN-LINKS.md');
    const lines = [
      '# Broken Links',
      '',
      '*Auto-generated by Intelligent Analyzer*',
      '',
      `Found **${result.brokenLinks.length}** broken links in documentation.`,
      '',
      '| File | Line | Link | Reason |',
      '|------|------|------|--------|',
      ...result.brokenLinks.map(l => `| ${l.file} | ${l.line} | \`${l.link}\` | ${l.reason} |`),
      '',
      '## How to Fix',
      '',
      '1. Update each broken link to point to the correct file',
      '2. Remove links to deleted content',
      '3. Use relative paths where possible',
      '4. Run `/sw:organize-docs` to regenerate navigation indexes',
    ];
    fs.writeFileSync(blFile, lines.join('\n'));
    savedFiles.push(blFile);
  }

  // Save SPEC-CODE-GAPS.md (new)
  if (result.specCodeGaps.length > 0) {
    const gapFile = path.join(reviewPath, 'SPEC-CODE-GAPS.md');
    const lines = [
      '# Spec-Code Gaps',
      '',
      '*Auto-generated by Intelligent Analyzer*',
      '',
      'Detected gaps between specifications and actual implementation status.',
      '',
    ];

    // Group by type
    const ghostCompletions = result.specCodeGaps.filter(g => g.type === 'ghost_completion');
    const missingImpl = result.specCodeGaps.filter(g => g.type === 'missing_impl');
    const outdatedSpecs = result.specCodeGaps.filter(g => g.type === 'outdated_spec');

    if (ghostCompletions.length > 0) {
      lines.push(
        '## 🚨 Ghost Completions (Critical)',
        '',
        'These increments are marked as completed but have unchecked acceptance criteria:',
        '',
        '| Spec ID | File | Details | Confidence |',
        '|---------|------|---------|------------|',
        ...ghostCompletions.map(g => `| ${g.specId} | ${g.specFile} | ${g.details} | ${Math.round(g.confidence * 100)}% |`),
        '',
      );
    }

    if (missingImpl.length > 0) {
      lines.push(
        '## ⚠️ Missing Implementations',
        '',
        'These active increments have had no recent activity:',
        '',
        '| Spec ID | File | Details | Confidence |',
        '|---------|------|---------|------------|',
        ...missingImpl.map(g => `| ${g.specId} | ${g.specFile} | ${g.details} | ${Math.round(g.confidence * 100)}% |`),
        '',
      );
    }

    if (outdatedSpecs.length > 0) {
      lines.push(
        '## 📝 Outdated Specifications',
        '',
        'These specs have completed tasks but haven\'t updated their acceptance criteria:',
        '',
        '| Spec ID | File | Details | Confidence |',
        '|---------|------|---------|------------|',
        ...outdatedSpecs.map(g => `| ${g.specId} | ${g.specFile} | ${g.details} | ${Math.round(g.confidence * 100)}% |`),
        '',
      );
    }

    fs.writeFileSync(gapFile, lines.join('\n'));
    savedFiles.push(gapFile);
  }

  // Save ORPHANED-DOCS.md (new)
  if (result.orphanedDocs.length > 0) {
    const orphanFile = path.join(reviewPath, 'ORPHANED-DOCS.md');
    const lines = [
      '# Orphaned Documents',
      '',
      '*Auto-generated by Intelligent Analyzer*',
      '',
      `Found **${result.orphanedDocs.length}** documents with no incoming links.`,
      '',
      '## Documents to Review',
      '',
      ...result.orphanedDocs.map(d => `- ${d}`),
      '',
      '## Recommended Actions',
      '',
      '1. **Link** - Add links from parent documents if still relevant',
      '2. **Archive** - Move to archive if no longer needed',
      '3. **Delete** - Remove if completely obsolete',
      '4. **Consolidate** - Merge with related documents',
    ];
    fs.writeFileSync(orphanFile, lines.join('\n'));
    savedFiles.push(orphanFile);
  }

  // Save tech-debt.md
  if (result.techDebt.length > 0) {
    const debtFile = path.join(reviewPath, 'tech-debt.md');
    const lines = ['# Tech Debt Catalog', '', '*Auto-generated by Intelligent Analyzer*', ''];

    // Group by severity
    const bySeverity = new Map<string, TechDebtItem[]>();
    for (const item of result.techDebt) {
      if (!bySeverity.has(item.severity)) bySeverity.set(item.severity, []);
      bySeverity.get(item.severity)!.push(item);
    }

    for (const severity of ['high', 'medium', 'low']) {
      const items = bySeverity.get(severity);
      if (items && items.length > 0) {
        lines.push(
          '## ' + severity.charAt(0).toUpperCase() + severity.slice(1) + ' Priority',
          '',
        );
        for (const item of items) {
          lines.push(
            '### ' + item.id + ': ' + item.title,
            '',
            item.description,
            '',
            '- **Effort**: ' + item.effort,
            '- **Category**: ' + item.category,
            '- **Repos**: ' + item.repos.join(', '),
            '',
          );
        }
      }
    }

    fs.writeFileSync(debtFile, lines.join('\n'));
    savedFiles.push(debtFile);
  }

  // Save summary index
  const indexFile = path.join(reviewPath, 'index.md');
  const summary = [
    '# Review Needed - Summary',
    '',
    '*Auto-generated by Intelligent Analyzer*',
    '',
    '## Overview',
    '',
    '| Category | Count | Priority |',
    '|----------|-------|----------|',
    `| Critical Issues | ${result.enhancedIssues.filter(i => i.priority === 'P0' || i.priority === 'P1').length} | P0/P1 |`,
    `| Pattern Inconsistencies | ${result.enhancedIssues.filter(i => i.category === 'inconsistency').length} | P2 |`,
    `| Potential Duplicates | ${result.enhancedIssues.filter(i => i.category === 'duplicate').length} | P2 |`,
    `| Broken Links | ${result.brokenLinks.length} | P2/P3 |`,
    `| Spec-Code Gaps | ${result.specCodeGaps.length} | P0-P2 |`,
    `| Orphaned Docs | ${result.orphanedDocs.length} | P3 |`,
    `| Tech Debt Items | ${result.techDebt.length} | Various |`,
    '',
    '## Priority Breakdown',
    '',
    `- **P0 (Critical)**: ${result.byPriority.get('P0')?.length || 0} issues`,
    `- **P1 (High)**: ${result.byPriority.get('P1')?.length || 0} issues`,
    `- **P2 (Medium)**: ${result.byPriority.get('P2')?.length || 0} issues`,
    `- **P3 (Low)**: ${result.byPriority.get('P3')?.length || 0} issues`,
    '',
    '## Documents',
    '',
    savedFiles.length > 0
      ? savedFiles.map(f => `- [${path.basename(f)}](./${path.basename(f)})`).join('\n')
      : '*No issues found*',
  ];
  fs.writeFileSync(indexFile, summary.join('\n'));
  savedFiles.push(indexFile);

  return savedFiles;
}
