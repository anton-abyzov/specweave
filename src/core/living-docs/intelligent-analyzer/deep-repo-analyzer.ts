/**
 * Deep Repo Analyzer
 *
 * Uses LLM to deeply understand each repository's purpose,
 * key concepts, APIs, and patterns.
 */

import { sampleRepoFiles, formatSamplesForPrompt } from './file-sampler.js';
import { extractJson, buildJsonPrompt } from '../../../utils/llm-json-extractor.js';
import type {
  RepoAnalysis,
  ApiSurface,
  PatternUsage,
  LLMProvider,
  ProgressCallback,
  FileSample,
} from './types.js';

export async function analyzeRepo(
  repoPath: string,
  repoName: string,
  llmProvider: LLMProvider | null,
  log: (msg: string) => void
): Promise<RepoAnalysis> {
  log(`  Sampling files from ${repoName}...`);
  const samples = await sampleRepoFiles(repoPath);
  log(`  Sampled ${samples.length} files`);

  if (!llmProvider) {
    return createBasicAnalysis(repoPath, repoName, samples);
  }

  const prompt = buildRepoAnalysisPrompt(repoName, samples);
  log(`  Sending to LLM for deep analysis...`);

  try {
    const result = await llmProvider.analyze(prompt);
    if (!result || !result.content) {
      return createBasicAnalysis(repoPath, repoName, samples);
    }
    const extraction = extractJson<LLMRepoAnalysisResponse>(result.content, { requiredFields: ['purpose'] });
    if (extraction.success && extraction.data) {
      log(`  LLM analysis successful`);
      return convertLLMResponse(repoPath, repoName, extraction.data, samples.length);
    }
    return createBasicAnalysis(repoPath, repoName, samples);
  } catch (err: any) {
    log(`  LLM error: ${err.message}`);
    return createBasicAnalysis(repoPath, repoName, samples);
  }
}

interface LLMRepoAnalysisResponse {
  purpose: string;
  keyConcepts: string[];
  mainApis: Array<{ name: string; type: string; description: string; location?: string }>;
  patternsUsed: Array<{ pattern: string; category: string; evidence: string[] }>;
  internalDependencies: string[];
  externalDependencies: string[];
  observations: string[];
}

function buildRepoAnalysisPrompt(repoName: string, samples: FileSample[]): string {
  const filesContent = formatSamplesForPrompt(samples);
  const schema = {
    purpose: 'string (2-3 sentences)',
    keyConcepts: '["concept1", ...]',
    mainApis: '[{name, type, description, location}, ...]',
    patternsUsed: '[{pattern, category, evidence}, ...]',
    internalDependencies: '["repo1", ...]',
    externalDependencies: '["service1", ...]',
    observations: '["observation1", ...]',
  };
  const context = `Repository: ${repoName}\n\nKey files:\n${filesContent}\n\nBe SPECIFIC. Don't say "handles data" - say "processes DICOM medical images".`;
  return buildJsonPrompt(context, schema, 'Analyze this repository.');
}

function convertLLMResponse(repoPath: string, repoName: string, response: LLMRepoAnalysisResponse, filesAnalyzed: number): RepoAnalysis {
  return {
    name: repoName, path: repoPath, purpose: response.purpose || 'Purpose not determined',
    keyConcepts: response.keyConcepts || [],
    mainApis: (response.mainApis || []).map(api => ({ name: api.name, type: (api.type as ApiSurface['type']) || 'function', description: api.description, location: api.location || '' })),
    patternsUsed: (response.patternsUsed || []).map(p => ({ pattern: p.pattern, category: (p.category as PatternUsage['category']) || 'other', evidence: p.evidence || [], confidence: 'medium' as const })),
    internalDependencies: response.internalDependencies || [], externalDependencies: response.externalDependencies || [],
    filesAnalyzed, confidence: filesAnalyzed > 10 ? 'high' : filesAnalyzed > 5 ? 'medium' : 'low',
    analyzedAt: new Date().toISOString(), observations: response.observations || [],
  };
}

function createBasicAnalysis(repoPath: string, repoName: string, samples: FileSample[]): RepoAnalysis {
  const purpose = extractPurposeFromReadme(samples) || `Repository with ${samples.length} files`;
  return { name: repoName, path: repoPath, purpose, keyConcepts: [], mainApis: extractBasicApis(samples),
    patternsUsed: detectBasicPatterns(samples), internalDependencies: [], externalDependencies: extractDependencies(samples),
    filesAnalyzed: samples.length, confidence: 'low', analyzedAt: new Date().toISOString(), observations: [] };
}

function extractPurposeFromReadme(samples: FileSample[]): string | null {
  const readme = samples.find(s => s.type === 'readme');
  if (!readme) return null;
  const lines = readme.content.split('\n');
  let foundTitle = false, purposeLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('#') && !foundTitle) { foundTitle = true; continue; }
    if (foundTitle && line.trim()) { if (line.startsWith('#')) break; purposeLines.push(line.trim()); if (purposeLines.length >= 3) break; }
  }
  return purposeLines.length > 0 ? purposeLines.join(' ') : null;
}

function detectBasicPatterns(samples: FileSample[]): PatternUsage[] {
  const patterns: PatternUsage[] = [];
  const content = samples.map(s => s.content).join('\n');
  if (content.includes('express') || content.includes('fastify')) patterns.push({ pattern: 'REST API', category: 'api', evidence: ['Framework detected'], confidence: 'high' });
  if (content.includes('graphql')) patterns.push({ pattern: 'GraphQL', category: 'api', evidence: ['GraphQL imports'], confidence: 'high' });
  if (content.includes('prisma') || content.includes('typeorm')) patterns.push({ pattern: 'ORM', category: 'data', evidence: ['ORM detected'], confidence: 'high' });
  if (content.includes('jwt')) patterns.push({ pattern: 'JWT Auth', category: 'auth', evidence: ['JWT library'], confidence: 'high' });
  return patterns;
}

function extractBasicApis(samples: FileSample[]): ApiSurface[] {
  const apis: ApiSurface[] = [];
  for (const s of samples.filter(s => s.type === 'api' || s.type === 'entry')) {
    const matches = s.content.matchAll(/export\s+(async\s+)?(?:function|const|class)\s+(\w+)/g);
    for (const m of matches) apis.push({ name: m[2], type: m[0].includes('class') ? 'class' : 'function', description: 'From ' + s.path, location: s.path });
  }
  return apis.slice(0, 10);
}

function extractDependencies(samples: FileSample[]): string[] {
  const pkg = samples.find(s => s.path === 'package.json');
  if (!pkg) return [];
  try { const p = JSON.parse(pkg.content); return Object.keys(p.dependencies || {}).filter(d => /aws|azure|redis|mongo|postgres|kafka/.test(d)).slice(0, 5); } catch { return []; }
}

export async function analyzeAllRepos(repos: Array<{ name: string; path: string }>, llmProvider: LLMProvider | null, onProgress: ProgressCallback, log: (msg: string) => void, checkpoint?: { reposCompleted: string[] }): Promise<Map<string, RepoAnalysis>> {
  const results = new Map<string, RepoAnalysis>();
  const completed = new Set(checkpoint?.reposCompleted || []);
  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    if (completed.has(repo.name)) { log(`  Skipping ${repo.name} (done)`); continue; }
    onProgress('deep-analysis', i + 1, repos.length, `Analyzing ${repo.name}`);
    log(`Analyzing ${i + 1}/${repos.length}: ${repo.name}`);
    results.set(repo.name, await analyzeRepo(repo.path, repo.name, llmProvider, log));
    if (llmProvider && i < repos.length - 1) await new Promise(r => setTimeout(r, 1000));
  }
  return results;
}
