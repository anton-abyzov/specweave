/**
 * Strategy Generator
 *
 * Extracts strategic insights from codebase analysis:
 * - Tech debt catalog
 * - Business domain mapping
 * - Modernization candidates
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  RepoAnalysis,
  TechDebtItem,
  LLMProvider,
  ProgressCallback,
} from './types.js';
import type { OrganizationSynthesisResult } from './organization-synthesizer.js';
import type { InconsistencyResult } from './inconsistency-detector.js';

export interface StrategyResult {
  techDebtCatalog: TechDebtItem[];
  domainMap: DomainMapping[];
  modernizationCandidates: ModernizationCandidate[];
  recommendations: StrategicRecommendation[];
}

export interface DomainMapping {
  domain: string;
  description: string;
  repos: string[];
  healthScore: number;
  concerns: string[];
}

export interface ModernizationCandidate {
  repo: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggestedApproach: string;
  estimatedEffort: 'small' | 'medium' | 'large';
}

export interface StrategicRecommendation {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'small' | 'medium' | 'large';
  category: 'architecture' | 'process' | 'tooling' | 'team';
}

export async function generateStrategy(
  repoAnalyses: Map<string, RepoAnalysis>,
  orgResult: OrganizationSynthesisResult,
  inconsistencyResult: InconsistencyResult,
  llmProvider: LLMProvider | null,
  onProgress: ProgressCallback,
  log: (msg: string) => void
): Promise<StrategyResult> {
  log('PHASE F: Strategy Generation');
  onProgress('strategy', 0, 100, 'Analyzing strategic landscape');

  // Collect all tech debt
  onProgress('strategy', 20, 100, 'Cataloging tech debt');
  const techDebtCatalog = collectTechDebt(repoAnalyses, inconsistencyResult);
  log('  Collected ' + techDebtCatalog.length + ' tech debt items');

  // Map business domains
  onProgress('strategy', 40, 100, 'Mapping business domains');
  const domainMap = mapBusinessDomains(repoAnalyses, orgResult);
  log('  Mapped ' + domainMap.length + ' business domains');

  // Identify modernization candidates
  onProgress('strategy', 60, 100, 'Identifying modernization candidates');
  const modernizationCandidates = identifyModernizationCandidates(repoAnalyses, techDebtCatalog);
  log('  Found ' + modernizationCandidates.length + ' modernization candidates');

  // Generate recommendations
  onProgress('strategy', 80, 100, 'Generating recommendations');
  const recommendations = generateRecommendations(
    techDebtCatalog,
    domainMap,
    modernizationCandidates,
    orgResult
  );
  log('  Generated ' + recommendations.length + ' strategic recommendations');

  return { techDebtCatalog, domainMap, modernizationCandidates, recommendations };
}

function collectTechDebt(
  analyses: Map<string, RepoAnalysis>,
  inconsistencyResult: InconsistencyResult
): TechDebtItem[] {
  const debt: TechDebtItem[] = [...inconsistencyResult.techDebt];
  let debtNum = debt.length + 1;

  for (const [name, analysis] of analyses) {
    // Check for outdated patterns
    const outdatedPatterns = analysis.patternsUsed.filter(p => 
      isOutdatedPattern(p.pattern)
    );
    
    if (outdatedPatterns.length > 0) {
      debt.push({
        id: 'DEBT-' + String(debtNum++).padStart(3, '0'),
        title: 'Update outdated patterns in ' + name,
        description: 'Found ' + outdatedPatterns.length + ' outdated patterns: ' + 
          outdatedPatterns.map(p => p.pattern).join(', '),
        severity: 'medium',
        effort: 'medium',
        repos: [name],
        category: 'legacy',
      });
    }

    // Check for missing tests (heuristic: no test files in sample)
    if (analysis.filesAnalyzed < 5 && analysis.confidence === 'low') {
      debt.push({
        id: 'DEBT-' + String(debtNum++).padStart(3, '0'),
        title: 'Improve test coverage for ' + name,
        description: 'Low file count and confidence suggests missing tests',
        severity: 'medium',
        effort: 'medium',
        repos: [name],
        category: 'missing-tests',
      });
    }
  }

  return debt;
}

function isOutdatedPattern(pattern: string): boolean {
  const outdated = [
    'callback',
    'jquery',
    'angular.js',
    'backbone',
    'grunt',
    'bower',
  ];
  return outdated.some(o => pattern.toLowerCase().includes(o));
}

function mapBusinessDomains(
  analyses: Map<string, RepoAnalysis>,
  orgResult: OrganizationSynthesisResult
): DomainMapping[] {
  const domains: DomainMapping[] = [];

  // Use organization domains if available
  for (const domain of orgResult.domains) {
    const repoAnalysesList = domain.repos
      .map(r => analyses.get(r))
      .filter((a): a is RepoAnalysis => a !== undefined);

    const avgConfidence = repoAnalysesList.length > 0
      ? repoAnalysesList.reduce((sum, a) => 
          sum + (a.confidence === 'high' ? 100 : a.confidence === 'medium' ? 70 : 40), 0
        ) / repoAnalysesList.length
      : 50;

    const concerns: string[] = [];
    if (avgConfidence < 60) concerns.push('Low documentation quality');
    if (repoAnalysesList.some(a => a.filesAnalyzed < 3)) concerns.push('Some repos poorly structured');

    domains.push({
      domain: domain.name,
      description: domain.description,
      repos: domain.repos,
      healthScore: Math.round(avgConfidence),
      concerns,
    });
  }

  // If no domains from org, create from key concepts
  if (domains.length === 0) {
    const conceptGroups = new Map<string, string[]>();
    
    for (const [name, analysis] of analyses) {
      for (const concept of analysis.keyConcepts.slice(0, 3)) {
        const normalized = concept.toLowerCase();
        if (!conceptGroups.has(normalized)) {
          conceptGroups.set(normalized, []);
        }
        conceptGroups.get(normalized)!.push(name);
      }
    }

    for (const [concept, repos] of conceptGroups) {
      if (repos.length >= 2) {
        domains.push({
          domain: concept,
          description: 'Repos sharing ' + concept + ' concept',
          repos,
          healthScore: 70,
          concerns: [],
        });
      }
    }
  }

  return domains;
}

function identifyModernizationCandidates(
  analyses: Map<string, RepoAnalysis>,
  techDebt: TechDebtItem[]
): ModernizationCandidate[] {
  const candidates: ModernizationCandidate[] = [];
  const debtByRepo = new Map<string, number>();

  // Count debt items per repo
  for (const item of techDebt) {
    for (const repo of item.repos) {
      debtByRepo.set(repo, (debtByRepo.get(repo) || 0) + 1);
    }
  }

  for (const [name, analysis] of analyses) {
    const debtCount = debtByRepo.get(name) || 0;
    const hasLowConfidence = analysis.confidence === 'low';
    const hasOutdatedPatterns = analysis.patternsUsed.some(p => isOutdatedPattern(p.pattern));
    const hasFewerFiles = analysis.filesAnalyzed < 5;

    // Score for modernization need
    let score = 0;
    const reasons: string[] = [];

    if (debtCount >= 3) { score += 3; reasons.push('High tech debt (' + debtCount + ' items)'); }
    if (hasLowConfidence) { score += 2; reasons.push('Poor documentation'); }
    if (hasOutdatedPatterns) { score += 2; reasons.push('Outdated patterns'); }
    if (hasFewerFiles) { score += 1; reasons.push('Minimal codebase'); }

    if (score >= 3) {
      candidates.push({
        repo: name,
        reason: reasons.join(', '),
        priority: score >= 5 ? 'high' : score >= 4 ? 'medium' : 'low',
        suggestedApproach: suggestApproach(reasons),
        estimatedEffort: score >= 5 ? 'large' : score >= 4 ? 'medium' : 'small',
      });
    }
  }

  return candidates.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function suggestApproach(reasons: string[]): string {
  if (reasons.some(r => r.includes('Outdated patterns'))) {
    return 'Incremental migration to modern patterns with feature flags';
  }
  if (reasons.some(r => r.includes('Poor documentation'))) {
    return 'Documentation sprint followed by gradual refactoring';
  }
  if (reasons.some(r => r.includes('High tech debt'))) {
    return 'Dedicated tech debt reduction sprint';
  }
  return 'Evaluate for rewrite vs refactor based on business criticality';
}

function generateRecommendations(
  techDebt: TechDebtItem[],
  domains: DomainMapping[],
  candidates: ModernizationCandidate[],
  orgResult: OrganizationSynthesisResult
): StrategicRecommendation[] {
  const recommendations: StrategicRecommendation[] = [];
  let recNum = 1;

  // High priority modernization
  const highPriorityCandidates = candidates.filter(c => c.priority === 'high');
  if (highPriorityCandidates.length > 0) {
    recommendations.push({
      id: 'REC-' + String(recNum++).padStart(3, '0'),
      title: 'Address high-priority modernization candidates',
      description: highPriorityCandidates.length + ' repositories need immediate attention: ' +
        highPriorityCandidates.map(c => c.repo).join(', '),
      impact: 'high',
      effort: 'large',
      category: 'architecture',
    });
  }

  // Documentation debt
  const docDebt = techDebt.filter(d => d.category === 'documentation');
  if (docDebt.length >= 3) {
    recommendations.push({
      id: 'REC-' + String(recNum++).padStart(3, '0'),
      title: 'Launch documentation improvement initiative',
      description: docDebt.length + ' repos have documentation issues. ' +
        'Consider a team-wide doc sprint.',
      impact: 'medium',
      effort: 'medium',
      category: 'process',
    });
  }

  // Domain health
  const unhealthyDomains = domains.filter(d => d.healthScore < 60);
  if (unhealthyDomains.length > 0) {
    recommendations.push({
      id: 'REC-' + String(recNum++).padStart(3, '0'),
      title: 'Improve health of critical domains',
      description: unhealthyDomains.length + ' business domains have low health scores: ' +
        unhealthyDomains.map(d => d.domain + ' (' + d.healthScore + '%)').join(', '),
      impact: 'high',
      effort: 'medium',
      category: 'architecture',
    });
  }

  // Team ownership
  if (orgResult.hypotheses.length > 0) {
    recommendations.push({
      id: 'REC-' + String(recNum++).padStart(3, '0'),
      title: 'Clarify team ownership and boundaries',
      description: 'Organization analysis identified uncertainties: ' +
        orgResult.hypotheses.slice(0, 2).join('; '),
      impact: 'medium',
      effort: 'small',
      category: 'team',
    });
  }

  // Pattern standardization
  const patternInconsistencies = techDebt.filter(d => 
    d.description.toLowerCase().includes('pattern')
  );
  if (patternInconsistencies.length > 0) {
    recommendations.push({
      id: 'REC-' + String(recNum++).padStart(3, '0'),
      title: 'Standardize development patterns',
      description: 'Multiple inconsistent patterns detected. ' +
        'Create and enforce architectural guidelines.',
      impact: 'medium',
      effort: 'medium',
      category: 'tooling',
    });
  }

  return recommendations;
}

export async function saveStrategy(
  projectPath: string,
  result: StrategyResult
): Promise<string[]> {
  const savedFiles: string[] = [];
  const strategyPath = path.join(projectPath, '.specweave/docs/internal/strategy');
  fs.mkdirSync(strategyPath, { recursive: true });

  // Tech Debt Catalog
  const debtFile = path.join(strategyPath, 'tech-debt-catalog.md');
  const debtLines = [
    '# Tech Debt Catalog',
    '',
    '*Auto-generated by Intelligent Analyzer*',
    '',
    '## Summary',
    '',
    '| Severity | Count |',
    '|----------|-------|',
    '| High | ' + result.techDebtCatalog.filter(d => d.severity === 'high').length + ' |',
    '| Medium | ' + result.techDebtCatalog.filter(d => d.severity === 'medium').length + ' |',
    '| Low | ' + result.techDebtCatalog.filter(d => d.severity === 'low').length + ' |',
    '',
    '## Items',
    '',
  ];

  for (const item of result.techDebtCatalog) {
    debtLines.push(
      '### ' + item.id + ': ' + item.title,
      '',
      item.description,
      '',
      '- **Severity**: ' + item.severity,
      '- **Effort**: ' + item.effort,
      '- **Category**: ' + item.category,
      '- **Repos**: ' + item.repos.join(', '),
      ''
    );
  }
  fs.writeFileSync(debtFile, debtLines.join('\n'));
  savedFiles.push(debtFile);

  // Domain Map
  const domainFile = path.join(strategyPath, 'domain-map.md');
  const domainLines = [
    '# Business Domain Map',
    '',
    '*Auto-generated by Intelligent Analyzer*',
    '',
  ];

  for (const domain of result.domainMap) {
    domainLines.push(
      '## ' + domain.domain,
      '',
      domain.description,
      '',
      '- **Health Score**: ' + domain.healthScore + '%',
      '- **Repos**: ' + domain.repos.join(', '),
      ''
    );
    if (domain.concerns.length > 0) {
      domainLines.push('**Concerns**:', '');
      for (const concern of domain.concerns) {
        domainLines.push('- ' + concern);
      }
      domainLines.push('');
    }
  }
  fs.writeFileSync(domainFile, domainLines.join('\n'));
  savedFiles.push(domainFile);

  // Modernization Candidates
  if (result.modernizationCandidates.length > 0) {
    const modernFile = path.join(strategyPath, 'modernization-candidates.md');
    const modernLines = [
      '# Modernization Candidates',
      '',
      '*Auto-generated by Intelligent Analyzer*',
      '',
      '## Priority Summary',
      '',
      '| Priority | Count |',
      '|----------|-------|',
      '| High | ' + result.modernizationCandidates.filter(c => c.priority === 'high').length + ' |',
      '| Medium | ' + result.modernizationCandidates.filter(c => c.priority === 'medium').length + ' |',
      '| Low | ' + result.modernizationCandidates.filter(c => c.priority === 'low').length + ' |',
      '',
      '## Candidates',
      '',
    ];

    for (const candidate of result.modernizationCandidates) {
      modernLines.push(
        '### ' + candidate.repo + ' (' + candidate.priority.toUpperCase() + ')',
        '',
        '**Reason**: ' + candidate.reason,
        '',
        '**Suggested Approach**: ' + candidate.suggestedApproach,
        '',
        '**Estimated Effort**: ' + candidate.estimatedEffort,
        ''
      );
    }
    fs.writeFileSync(modernFile, modernLines.join('\n'));
    savedFiles.push(modernFile);
  }

  // Strategic Recommendations
  if (result.recommendations.length > 0) {
    const recFile = path.join(strategyPath, 'recommendations.md');
    const recLines = [
      '# Strategic Recommendations',
      '',
      '*Auto-generated by Intelligent Analyzer*',
      '',
    ];

    for (const rec of result.recommendations) {
      recLines.push(
        '## ' + rec.id + ': ' + rec.title,
        '',
        rec.description,
        '',
        '| Aspect | Value |',
        '|--------|-------|',
        '| Impact | ' + rec.impact + ' |',
        '| Effort | ' + rec.effort + ' |',
        '| Category | ' + rec.category + ' |',
        ''
      );
    }
    fs.writeFileSync(recFile, recLines.join('\n'));
    savedFiles.push(recFile);
  }

  return savedFiles;
}
