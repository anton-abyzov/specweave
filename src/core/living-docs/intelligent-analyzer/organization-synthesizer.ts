/**
 * Organization Synthesizer
 *
 * Clusters repos into teams, microservices, and domains
 * using LLM analysis and external specs from Jira/ADO.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { extractJson, buildJsonPrompt } from '../../../utils/llm-json-extractor.js';
import type { RepoAnalysis, OrganizationCluster, LLMProvider, ProgressCallback } from './types.js';

export interface OrganizationSynthesisResult {
  teams: OrganizationCluster[];
  microservices: OrganizationCluster[];
  domains: OrganizationCluster[];
  crossCutting: OrganizationCluster[];
  hypotheses: string[];
  confidence: 'high' | 'medium' | 'low';
}

export async function synthesizeOrganization(
  repoAnalyses: Map<string, RepoAnalysis>,
  projectPath: string,
  llmProvider: LLMProvider | null,
  onProgress: ProgressCallback,
  log: (msg: string) => void
): Promise<OrganizationSynthesisResult> {
  log('PHASE C: Organization Synthesis');
  onProgress('org-synthesis', 0, 100, 'Loading external specs');

  // Load external specs from Jira/ADO imports
  const externalSpecs = await loadExternalSpecs(projectPath);
  log(`  Loaded ${externalSpecs.length} external spec files`);

  onProgress('org-synthesis', 20, 100, 'Building repo summaries');

  // Build summaries for LLM
  const repoSummaries = buildRepoSummaries(repoAnalyses);
  log(`  Built summaries for ${repoAnalyses.size} repos`);

  if (!llmProvider) {
    log('  No LLM provider, using basic clustering');
    return createBasicClustering(repoAnalyses);
  }

  onProgress('org-synthesis', 40, 100, 'LLM clustering analysis');

  // Build LLM prompt
  const prompt = buildClusteringPrompt(repoSummaries, externalSpecs);
  log('  Sending to LLM for organization analysis...');

  try {
    const result = await llmProvider.analyze(prompt);
    if (!result || !result.content) {
      log('  LLM returned empty, using basic clustering');
      return createBasicClustering(repoAnalyses);
    }

    const extraction = extractJson<LLMClusteringResponse>(result.content, { requiredFields: ['teams'] });
    if (extraction.success && extraction.data) {
      log('  LLM clustering successful');
      onProgress('org-synthesis', 80, 100, 'Processing results');
      return convertLLMResponse(extraction.data);
    }

    log(`  JSON extraction failed: ${extraction.error}`);
    return createBasicClustering(repoAnalyses);
  } catch (err: any) {
    log(`  LLM error: ${err.message}`);
    return createBasicClustering(repoAnalyses);
  }
}

interface LLMClusteringResponse {
  teams: Array<{ name: string; description: string; repos: string[]; reasoning: string }>;
  microservices: Array<{ name: string; description: string; repos: string[]; reasoning: string }>;
  domains: Array<{ name: string; description: string; repos: string[]; reasoning: string }>;
  crossCutting: Array<{ name: string; description: string; repos: string[]; reasoning: string }>;
  hypotheses: string[];
}

async function loadExternalSpecs(projectPath: string): Promise<string[]> {
  const specsPath = path.join(projectPath, '.specweave/docs/internal/specs');
  if (!fs.existsSync(specsPath)) return [];

  try {
    const files = await glob('**/*.md', { cwd: specsPath, nodir: true });
    const summaries: string[] = [];
    for (const file of files.slice(0, 20)) {
      try {
        const content = fs.readFileSync(path.join(specsPath, file), 'utf-8');
        const titleMatch = content.match(/^#\s+(.+)/m);
        if (titleMatch) summaries.push(`${file}: ${titleMatch[1]}`);
      } catch { /* skip */ }
    }
    return summaries;
  } catch { return []; }
}

function buildRepoSummaries(analyses: Map<string, RepoAnalysis>): string {
  const lines: string[] = [];
  for (const [name, analysis] of analyses) {
    lines.push(`## ${name}`);
    lines.push(`Purpose: ${analysis.purpose}`);
    if (analysis.keyConcepts.length > 0) lines.push(`Concepts: ${analysis.keyConcepts.join(', ')}`);
    if (analysis.patternsUsed.length > 0) lines.push(`Patterns: ${analysis.patternsUsed.map(p => p.pattern).join(', ')}`);
    lines.push('');
  }
  return lines.join('\n');
}

function buildClusteringPrompt(repoSummaries: string, externalSpecs: string[]): string {
  const schema = {
    teams: '[{name, description, repos:[], reasoning}, ...]',
    microservices: '[{name, description, repos:[], reasoning}, ...]',
    domains: '[{name, description, repos:[], reasoning}, ...]',
    crossCutting: '[{name, description, repos:[], reasoning}, ...]',
    hypotheses: '["uncertainty1", ...]',
  };
  const specsContext = externalSpecs.length > 0 ? `\n\nExternal project info (from Jira/ADO):\n${externalSpecs.join('\n')}` : '';
  const context = `Analyze these repositories to understand organization structure:\n\n${repoSummaries}${specsContext}\n\nGroup by:\n1. Teams (likely ownership)\n2. Microservices (service boundaries)\n3. Domains (business areas)\n4. Cross-cutting (shared infra)\n\nNote any uncertainties in hypotheses.`;
  return buildJsonPrompt(context, schema, 'Cluster these repositories.');
}

function convertLLMResponse(response: LLMClusteringResponse): OrganizationSynthesisResult {
  const convert = (items: any[], type: 'team' | 'microservice' | 'domain'): OrganizationCluster[] =>
    (items || []).map(item => ({
      name: item.name, type, description: item.description || '',
      repos: item.repos || [], confidence: 'medium', reasoning: item.reasoning || '',
    }));

  return {
    teams: convert(response.teams, 'team'),
    microservices: convert(response.microservices, 'microservice'),
    domains: convert(response.domains, 'domain'),
    crossCutting: convert(response.crossCutting, 'domain'),
    hypotheses: response.hypotheses || [],
    confidence: 'medium',
  };
}

function createBasicClustering(analyses: Map<string, RepoAnalysis>): OrganizationSynthesisResult {
  // Basic clustering by naming conventions
  const teamMap = new Map<string, string[]>();
  for (const [name] of analyses) {
    const prefixMatch = name.match(/^([a-z]+)-/i);
    const team = prefixMatch ? prefixMatch[1] : 'other';
    if (!teamMap.has(team)) teamMap.set(team, []);
    teamMap.get(team)!.push(name);
  }

  const teams: OrganizationCluster[] = [];
  for (const [team, repos] of teamMap) {
    teams.push({ name: `${team}-team`, type: 'team', description: `Repos with ${team}- prefix`,
      repos, confidence: 'low', reasoning: 'Grouped by naming convention' });
  }

  return { teams, microservices: [], domains: [], crossCutting: [], hypotheses: ['Basic clustering by naming only - LLM analysis recommended'], confidence: 'low' };
}

export async function saveOrganizationStructure(
  projectPath: string,
  result: OrganizationSynthesisResult,
  repoAnalyses: Map<string, RepoAnalysis>
): Promise<string[]> {
  const savedFiles: string[] = [];
  const orgPath = path.join(projectPath, '.specweave/docs/internal/organization');
  fs.mkdirSync(orgPath, { recursive: true });

  // Overview
  const overviewLines = ['# Organization Overview', '', `*Generated ${new Date().toISOString().split('T')[0]} | Confidence: ${result.confidence}*`, '',
    `## Summary`, '', `- **Teams**: ${result.teams.length}`, `- **Microservices**: ${result.microservices.length}`,
    `- **Domains**: ${result.domains.length}`, `- **Repositories**: ${repoAnalyses.size}`, ''];

  if (result.hypotheses.length > 0) {
    overviewLines.push('## Uncertainties', '', ...result.hypotheses.map(h => `- ${h}`), '');
  }

  fs.writeFileSync(path.join(orgPath, 'overview.md'), overviewLines.join('\n'));
  savedFiles.push(path.join(orgPath, 'overview.md'));

  // Teams
  if (result.teams.length > 0) {
    const teamsPath = path.join(orgPath, 'teams');
    fs.mkdirSync(teamsPath, { recursive: true });
    for (const team of result.teams) {
      const content = [`# ${team.name}`, '', team.description, '', '## Repositories', '',
        ...team.repos.map(r => `- [${r}](../../repos/${r}/overview.md)`), '', `*Reasoning: ${team.reasoning}*`].join('\n');
      const fileName = `${team.name.toLowerCase().replace(/\s/g, '-')}.md`;
      fs.writeFileSync(path.join(teamsPath, fileName), content);
      savedFiles.push(path.join(teamsPath, fileName));
    }
  }

  return savedFiles;
}
