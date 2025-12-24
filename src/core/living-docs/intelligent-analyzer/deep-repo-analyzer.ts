/**
 * Deep Repo Analyzer
 *
 * Uses LLM to deeply understand each repository's purpose,
 * key concepts, APIs, and patterns.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { sampleRepoFiles, formatSamplesForPrompt } from './file-sampler.js';
import { extractJson, buildJsonPrompt } from '../../../utils/llm-json-extractor.js';
import type {
  RepoAnalysis,
  ApiSurface,
  PatternUsage,
  LLMProvider,
  ProgressCallback,
  FileSample,
  JSDocEntry,
  CodeHealthIndicators,
  DependencyAuditResult,
  DependencyVulnerability,
  OutdatedPackage,
  LicenseIssue,
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

  // ADAPTIVE TIMEOUT CALCULATION (v2 - GENEROUS for thorough analysis)
  // PHILOSOPHY: For deep analysis mode, we WANT to wait for thorough insights!
  // Base timeout: 240s (4 min) - generous baseline for quality analysis
  // Additional time based on complexity factors:
  // - File count: 5s per file (more files = MORE context to deeply analyze)
  // - Prompt size: 50ms per 1000 chars (larger prompts need proportional time)
  // - Domain complexity: Detect regulatory/compliance keywords (+120s = +2min)
  const baseTimeout = 240000; // 4 minutes (was 3 min)
  const timeoutPerFile = 5000; // 5 seconds per file (was 2s) - GENEROUS
  const timeoutPerPromptKB = 50; // 50ms per 1000 chars (was 10ms)

  // Calculate prompt-based timeout
  const promptSizeTimeout = Math.floor((prompt.length / 1000) * timeoutPerPromptKB);

  // Detect complex domains (regulatory, compliance, financial, healthcare)
  const complexityKeywords = [
    'regulatory', 'compliance', 'hipaa', 'gdpr', 'sox', 'pci',
    'financial', 'healthcare', 'medical', 'governance', 'audit',
    'stewardship', 'privacy', 'security', 'encryption'
  ];
  const isComplexDomain = complexityKeywords.some(kw =>
    repoName.toLowerCase().includes(kw) ||
    prompt.toLowerCase().includes(kw)
  );
  const complexityBonus = isComplexDomain ? 120000 : 0; // +2 min for complex domains (was +1min)

  // Final adaptive timeout (max 10 minutes for HUGE repos - we can wait!)
  // Examples:
  // - Small simple repo (2 files): 240s + 10s = 250s (~4min)
  // - Large simple repo (20 files): 240s + 100s = 340s (~5.5min)
  // - Small complex repo (2 files): 240s + 10s + 120s = 370s (~6min)
  // - HUGE complex repo (20 files): 240s + 100s + 120s = 460s (~7.5min)
  const adaptiveTimeout = Math.min(
    baseTimeout + (samples.length * timeoutPerFile) + promptSizeTimeout + complexityBonus,
    600000 // 10 minutes max (was 5 min) - GENEROUS for thorough analysis!
  );

  log(`  Sending to LLM for deep analysis... (timeout: ${Math.round(adaptiveTimeout / 1000)}s, files: ${samples.length}, complex: ${isComplexDomain})`);

  // Wrap LLM provider with adaptive timeout and retry logic
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // CRITICAL: Track timeout ID to prevent resource leak
    // If LLM completes before timeout, we MUST cancel the timer
    // Otherwise timer runs for full 4-10min holding closure memory
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      // Create timeout promise with cancellable timer
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`Claude Code command timed out after ${adaptiveTimeout}ms`)),
          adaptiveTimeout
        );
      });

      // Race between LLM analysis and timeout
      const result = await Promise.race([
        llmProvider.analyze(prompt),
        timeoutPromise
      ]);

      // SUCCESS: Clear timeout immediately to prevent resource leak
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      if (!result || !result.content) {
        return createBasicAnalysis(repoPath, repoName, samples);
      }
      const extraction = extractJson<LLMRepoAnalysisResponse>(result.content, { requiredFields: ['purpose'] });
      if (extraction.success && extraction.data) {
        log(`  LLM analysis successful${attempt > 0 ? ` (after ${attempt} retry/retries)` : ''}`);
        return convertLLMResponse(repoPath, repoName, extraction.data, samples.length);
      }
      return createBasicAnalysis(repoPath, repoName, samples);
    } catch (err: any) {
      // ERROR/TIMEOUT: Clear timeout to prevent resource leak
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      lastError = err;

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        log(`  LLM attempt ${attempt + 1} failed: ${err.message}`);
        log(`  Retrying in ${delay}ms... (attempt ${attempt + 2}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted
  log(`  LLM error: ${lastError?.message || 'Unknown error'}`);
  log(`  Falling back to basic analysis (rule-based pattern detection)`);
  return createBasicAnalysis(repoPath, repoName, samples);
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
    patternsUsed: '[{pattern, category, evidence:["evidence1", "evidence2"]}, ...]',
    internalDependencies: '["repo1", ...]',
    externalDependencies: '["service1", ...]',
    observations: '["observation1", ...]',
  };

  const patternExamples = `
Detect ALL relevant patterns from these categories:
- API: REST API, GraphQL, gRPC, WebSocket, OpenAPI/Swagger
- Data: ORM, MongoDB, PostgreSQL, Redis Cache, Elasticsearch, CQRS, Repository Pattern, Event Sourcing
- Auth: JWT Authentication, OAuth/SSO, Password Hashing, RBAC
- Cloud: AWS/Azure/GCP Integration, Docker, Kubernetes, Serverless, Infrastructure as Code
- Frontend: React, Angular, Vue.js, State Management (Redux/Zustand), Design System
- Testing: Unit Testing, E2E Testing, Code Quality Tools
- Architecture: Event-Driven, Domain-Driven Design, Microservices, Clean Architecture, Hexagonal Architecture
- Messaging: Message Queue (RabbitMQ), Event Streaming (Kafka)
- Security: Security Middleware, Encryption, CORS

For EACH pattern detected, provide:
- pattern: Clear pattern name (e.g., "REST API using Express", "PostgreSQL with TypeORM")
- category: One of [api, data, auth, cloud, frontend, testing, architecture, messaging, security, integration, deployment, structure]
- evidence: Array of specific evidence (file names, library names, code patterns)
`;

  const context = `Repository: ${repoName}\n\nKey files:\n${filesContent}\n\n${patternExamples}\n\nBe SPECIFIC. Don't say "handles data" - say "processes DICOM medical images". Identify ALL technologies and patterns present.`;
  return buildJsonPrompt(context, schema, 'Deeply analyze this repository for patterns and purpose.');
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
  const contentLower = content.toLowerCase();

  // API & Communication Patterns (10)
  if (content.includes('express') || content.includes('fastify') || content.includes('koa'))
    patterns.push({ pattern: 'REST API', category: 'api', evidence: ['Web framework detected'], confidence: 'high' });
  if (content.includes('graphql') || contentLower.includes('gql'))
    patterns.push({ pattern: 'GraphQL', category: 'api', evidence: ['GraphQL library'], confidence: 'high' });
  if (content.includes('grpc') || content.includes('@grpc'))
    patterns.push({ pattern: 'gRPC', category: 'api', evidence: ['gRPC imports'], confidence: 'high' });
  if (content.includes('socket.io') || content.includes('ws') || contentLower.includes('websocket'))
    patterns.push({ pattern: 'WebSocket', category: 'api', evidence: ['Real-time communication'], confidence: 'high' });
  if (contentLower.includes('event-driven') || content.includes('EventEmitter') || content.includes('eventemitter'))
    patterns.push({ pattern: 'Event-Driven Architecture', category: 'architecture', evidence: ['Event system detected'], confidence: 'medium' });
  if (content.includes('rabbitmq') || content.includes('amqp'))
    patterns.push({ pattern: 'Message Queue (RabbitMQ)', category: 'messaging', evidence: ['RabbitMQ client'], confidence: 'high' });
  if (content.includes('kafka') || content.includes('kafkajs'))
    patterns.push({ pattern: 'Event Streaming (Kafka)', category: 'messaging', evidence: ['Kafka client'], confidence: 'high' });
  if (contentLower.includes('swagger') || contentLower.includes('openapi'))
    patterns.push({ pattern: 'OpenAPI/Swagger', category: 'api', evidence: ['API documentation'], confidence: 'high' });
  if (content.includes('axios') || content.includes('fetch') || content.includes('got'))
    patterns.push({ pattern: 'HTTP Client', category: 'integration', evidence: ['HTTP library'], confidence: 'medium' });
  if (contentLower.includes('webhook'))
    patterns.push({ pattern: 'Webhook Integration', category: 'integration', evidence: ['Webhook handling'], confidence: 'medium' });

  // Data & Persistence Patterns (8)
  if (content.includes('prisma') || content.includes('typeorm') || content.includes('sequelize'))
    patterns.push({ pattern: 'ORM', category: 'data', evidence: ['ORM library'], confidence: 'high' });
  if (content.includes('mongoose') || contentLower.includes('mongodb'))
    patterns.push({ pattern: 'MongoDB', category: 'data', evidence: ['MongoDB driver'], confidence: 'high' });
  if (content.includes('pg') || content.includes('postgres') || contentLower.includes('postgresql'))
    patterns.push({ pattern: 'PostgreSQL', category: 'data', evidence: ['PostgreSQL driver'], confidence: 'high' });
  if (content.includes('redis') || content.includes('ioredis'))
    patterns.push({ pattern: 'Redis Cache', category: 'data', evidence: ['Redis client'], confidence: 'high' });
  if (contentLower.includes('cqrs') || (contentLower.includes('command') && contentLower.includes('query')))
    patterns.push({ pattern: 'CQRS', category: 'architecture', evidence: ['Command/Query separation'], confidence: 'medium' });
  if (contentLower.includes('repository') && contentLower.includes('interface'))
    patterns.push({ pattern: 'Repository Pattern', category: 'data', evidence: ['Repository abstraction'], confidence: 'medium' });
  if (content.includes('elasticsearch') || content.includes('@elastic'))
    patterns.push({ pattern: 'Elasticsearch', category: 'data', evidence: ['Search engine integration'], confidence: 'high' });
  if (contentLower.includes('event sourcing') || contentLower.includes('eventsourcing'))
    patterns.push({ pattern: 'Event Sourcing', category: 'architecture', evidence: ['Event store pattern'], confidence: 'medium' });

  // Auth & Security Patterns (5)
  if (content.includes('jwt') || content.includes('jsonwebtoken'))
    patterns.push({ pattern: 'JWT Authentication', category: 'auth', evidence: ['JWT library'], confidence: 'high' });
  if (content.includes('passport') || content.includes('oauth'))
    patterns.push({ pattern: 'OAuth/SSO', category: 'auth', evidence: ['Authentication provider'], confidence: 'high' });
  if (content.includes('bcrypt') || content.includes('argon2'))
    patterns.push({ pattern: 'Password Hashing', category: 'security', evidence: ['Cryptographic library'], confidence: 'high' });
  if (contentLower.includes('rbac') || (contentLower.includes('role') && contentLower.includes('permission')))
    patterns.push({ pattern: 'RBAC', category: 'auth', evidence: ['Role-based access control'], confidence: 'medium' });
  if (content.includes('helmet') || contentLower.includes('csrf'))
    patterns.push({ pattern: 'Security Middleware', category: 'security', evidence: ['Security headers/CSRF'], confidence: 'high' });

  // Cloud & Infrastructure Patterns (7)
  if (content.includes('aws-sdk') || content.includes('@aws-sdk'))
    patterns.push({ pattern: 'AWS Integration', category: 'cloud', evidence: ['AWS SDK'], confidence: 'high' });
  if (content.includes('@azure') || contentLower.includes('azure'))
    patterns.push({ pattern: 'Azure Integration', category: 'cloud', evidence: ['Azure SDK'], confidence: 'high' });
  if (content.includes('@google-cloud') || content.includes('gcp'))
    patterns.push({ pattern: 'GCP Integration', category: 'cloud', evidence: ['Google Cloud SDK'], confidence: 'high' });
  if (content.includes('docker') || contentLower.includes('dockerfile'))
    patterns.push({ pattern: 'Docker Containerization', category: 'deployment', evidence: ['Docker config'], confidence: 'high' });
  if (content.includes('kubernetes') || content.includes('k8s') || contentLower.includes('kubectl'))
    patterns.push({ pattern: 'Kubernetes Orchestration', category: 'deployment', evidence: ['K8s manifests'], confidence: 'high' });
  if (content.includes('terraform') || contentLower.includes('.tf'))
    patterns.push({ pattern: 'Infrastructure as Code', category: 'deployment', evidence: ['Terraform detected'], confidence: 'high' });
  if (content.includes('serverless') || content.includes('lambda'))
    patterns.push({ pattern: 'Serverless Architecture', category: 'cloud', evidence: ['Serverless framework'], confidence: 'high' });

  // Frontend & UI Patterns (5)
  if (content.includes('react') || content.includes('jsx'))
    patterns.push({ pattern: 'React', category: 'frontend', evidence: ['React library'], confidence: 'high' });
  if (content.includes('angular') || content.includes('@angular'))
    patterns.push({ pattern: 'Angular', category: 'frontend', evidence: ['Angular framework'], confidence: 'high' });
  if (content.includes('vue') || content.includes('vuex'))
    patterns.push({ pattern: 'Vue.js', category: 'frontend', evidence: ['Vue framework'], confidence: 'high' });
  if (content.includes('redux') || content.includes('zustand') || content.includes('mobx'))
    patterns.push({ pattern: 'State Management', category: 'frontend', evidence: ['State library'], confidence: 'high' });
  if (content.includes('storybook') || contentLower.includes('component library'))
    patterns.push({ pattern: 'Design System', category: 'frontend', evidence: ['Component documentation'], confidence: 'medium' });

  // Testing & Quality Patterns (3)
  if (content.includes('jest') || content.includes('vitest') || content.includes('mocha'))
    patterns.push({ pattern: 'Unit Testing', category: 'testing', evidence: ['Test framework'], confidence: 'high' });
  if (content.includes('cypress') || content.includes('playwright') || content.includes('selenium'))
    patterns.push({ pattern: 'E2E Testing', category: 'testing', evidence: ['E2E test framework'], confidence: 'high' });
  if (content.includes('eslint') || content.includes('prettier'))
    patterns.push({ pattern: 'Code Quality Tools', category: 'quality', evidence: ['Linter/formatter'], confidence: 'high' });

  // Domain & Business Patterns (5)
  if (contentLower.includes('domain-driven') || contentLower.includes('ddd') || (contentLower.includes('aggregate') && contentLower.includes('entity')))
    patterns.push({ pattern: 'Domain-Driven Design', category: 'architecture', evidence: ['DDD concepts'], confidence: 'medium' });
  if (contentLower.includes('microservices') || contentLower.includes('micro-services'))
    patterns.push({ pattern: 'Microservices Architecture', category: 'architecture', evidence: ['Service pattern'], confidence: 'medium' });
  if (contentLower.includes('monorepo') || content.includes('nx') || content.includes('lerna'))
    patterns.push({ pattern: 'Monorepo', category: 'structure', evidence: ['Monorepo tooling'], confidence: 'high' });
  if (contentLower.includes('clean architecture') || (contentLower.includes('use case') && contentLower.includes('entity')))
    patterns.push({ pattern: 'Clean Architecture', category: 'architecture', evidence: ['Layered structure'], confidence: 'medium' });
  if (contentLower.includes('hexagonal') || contentLower.includes('ports and adapters'))
    patterns.push({ pattern: 'Hexagonal Architecture', category: 'architecture', evidence: ['Ports/Adapters pattern'], confidence: 'medium' });

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
    const analysis = await analyzeRepo(repo.path, repo.name, llmProvider, log);

    // Enterprise enhancements (v1.0.48): Add JSDoc, code health, and dependency audit
    try {
      analysis.jsdocEntries = extractJSDocEntries(repo.path, log);
      analysis.codeHealth = await extractCodeHealth(repo.path, log);
      analysis.dependencyAudit = await runDependencyAudit(repo.path, log);
    } catch (err: any) {
      log(`  Enterprise enhancements skipped: ${err.message}`);
    }

    results.set(repo.name, analysis);
    if (llmProvider && i < repos.length - 1) await new Promise(r => setTimeout(r, 1000));
  }
  return results;
}

// =============================================================================
// ENTERPRISE ENHANCEMENTS (v1.0.48)
// JSDoc extraction, code health indicators, dependency audit
// =============================================================================

/**
 * Extract JSDoc/TSDoc entries from TypeScript/JavaScript files
 * Parses /** comments to build API documentation
 */
function extractJSDocEntries(repoPath: string, log: (msg: string) => void): JSDocEntry[] {
  const entries: JSDocEntry[] = [];
  const maxEntries = 50; // Limit for performance

  try {
    // Find TypeScript/JavaScript files
    const files = findSourceFiles(repoPath, ['.ts', '.tsx', '.js', '.jsx']);

    for (const file of files.slice(0, 30)) { // Limit files scanned
      if (entries.length >= maxEntries) break;

      try {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(repoPath, file);

        // Extract JSDoc blocks with their following declarations
        const jsdocRegex = /\/\*\*[\s\S]*?\*\/\s*(export\s+)?(async\s+)?(function|class|const|interface|type|enum)\s+(\w+)/g;
        let match;

        while ((match = jsdocRegex.exec(content)) !== null && entries.length < maxEntries) {
          const jsdocBlock = match[0];
          const exported = !!match[1];
          const rawKind = match[3]; // 'function' | 'class' | 'const' | 'interface' | 'type' | 'enum'
          const name = match[4];

          // Map regex-captured kinds to JSDocEntry kinds
          // 'const' -> 'constant', 'enum' -> 'type' (closest semantic match)
          const kind: JSDocEntry['kind'] =
            rawKind === 'const' ? 'constant' :
            rawKind === 'enum' ? 'type' :
            rawKind as JSDocEntry['kind'];

          // Parse JSDoc content
          const description = extractJSDocDescription(jsdocBlock);
          const params = extractJSDocParams(jsdocBlock);
          const returns = extractJSDocReturns(jsdocBlock);
          const examples = extractJSDocExamples(jsdocBlock);
          const deprecated = extractJSDocTag(jsdocBlock, 'deprecated');
          const since = extractJSDocTag(jsdocBlock, 'since');

          if (description || params.length > 0) {
            entries.push({
              name,
              kind, // Already converted above
              description: description || `${kind} ${name}`,
              params: params.length > 0 ? params : undefined,
              returns: returns || undefined,
              examples: examples.length > 0 ? examples : undefined,
              deprecated: deprecated || undefined,
              since: since || undefined,
              location: relativePath,
              exported,
            });
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    log(`  Extracted ${entries.length} JSDoc entries`);
  } catch (err: any) {
    log(`  JSDoc extraction error: ${err.message}`);
  }

  return entries;
}

function extractJSDocDescription(block: string): string {
  // Get text between /** and first @tag (or */)
  const match = block.match(/\/\*\*\s*([\s\S]*?)(?:@|\*\/)/);
  if (!match) return '';

  return match[1]
    .split('\n')
    .map(line => line.replace(/^\s*\*\s?/, '').trim())
    .filter(line => line && !line.startsWith('@'))
    .join(' ')
    .trim();
}

function extractJSDocParams(block: string): Array<{ name: string; type: string; description: string; optional?: boolean }> {
  const params: Array<{ name: string; type: string; description: string; optional?: boolean }> = [];
  const paramRegex = /@param\s+(?:\{([^}]+)\}\s+)?(\[?\w+\]?)\s*[-:]?\s*(.*)/g;
  let match;

  while ((match = paramRegex.exec(block)) !== null) {
    const isOptional = match[2].startsWith('[');
    const name = match[2].replace(/[\[\]]/g, '');
    params.push({
      name,
      type: match[1] || 'any',
      description: match[3]?.trim() || '',
      optional: isOptional || undefined,
    });
  }

  return params;
}

function extractJSDocReturns(block: string): { type: string; description: string } | null {
  const match = block.match(/@returns?\s+(?:\{([^}]+)\}\s*)?(.*)/);
  if (!match) return null;
  return {
    type: match[1] || 'any',
    description: match[2]?.trim() || '',
  };
}

function extractJSDocExamples(block: string): string[] {
  const examples: string[] = [];
  const exampleRegex = /@example\s*([\s\S]*?)(?=@\w|$|\*\/)/g;
  let match;

  while ((match = exampleRegex.exec(block)) !== null) {
    const example = match[1]
      .split('\n')
      .map(line => line.replace(/^\s*\*\s?/, ''))
      .join('\n')
      .trim();
    if (example) examples.push(example);
  }

  return examples;
}

function extractJSDocTag(block: string, tag: string): string | null {
  const regex = new RegExp(`@${tag}\\s+(.*)`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : null;
}

function findSourceFiles(dir: string, extensions: string[], maxDepth = 5, currentDepth = 0): string[] {
  const files: string[] = [];
  if (currentDepth > maxDepth) return files;

  const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.specweave']);

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !skipDirs.has(entry.name) && !entry.name.startsWith('.')) {
        files.push(...findSourceFiles(path.join(dir, entry.name), extensions, maxDepth, currentDepth + 1));
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(path.join(dir, entry.name));
      }
    }
  } catch {
    // Skip unreadable directories
  }

  return files;
}

/**
 * Extract code health indicators from repository
 */
async function extractCodeHealth(repoPath: string, log: (msg: string) => void): Promise<CodeHealthIndicators> {
  const health: CodeHealthIndicators = {};

  try {
    // Try to get test coverage from common coverage report locations
    const coveragePaths = [
      path.join(repoPath, 'coverage/coverage-summary.json'),
      path.join(repoPath, 'coverage/lcov-report/index.html'),
      path.join(repoPath, '.nyc_output/coverage-summary.json'),
    ];

    for (const coveragePath of coveragePaths) {
      if (fs.existsSync(coveragePath) && coveragePath.endsWith('.json')) {
        try {
          const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
          if (coverage.total?.lines?.pct !== undefined) {
            health.testCoverage = Math.round(coverage.total.lines.pct);
          }
          break;
        } catch {
          // Skip invalid coverage files
        }
      }
    }

    // Get git info if available
    if (fs.existsSync(path.join(repoPath, '.git'))) {
      try {
        // Last modified
        const lastCommit = execSync('git log -1 --format=%cI', { cwd: repoPath, encoding: 'utf-8', timeout: 5000 }).trim();
        if (lastCommit) health.lastModified = lastCommit;

        // Contributor count
        const contributors = execSync('git shortlog -sn --all | wc -l', { cwd: repoPath, encoding: 'utf-8', timeout: 5000 }).trim();
        if (contributors) health.contributorCount = parseInt(contributors, 10);
      } catch {
        // Git commands failed, skip
      }
    }

    // Count lines of code (rough estimate)
    const sourceFiles = findSourceFiles(repoPath, ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java']);
    let totalLines = 0;
    for (const file of sourceFiles.slice(0, 100)) { // Limit for performance
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n').filter(line => {
          const trimmed = line.trim();
          return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*');
        });
        totalLines += lines.length;
      } catch {
        // Skip unreadable files
      }
    }
    health.linesOfCode = totalLines;

    log(`  Code health: ${health.testCoverage || 'N/A'}% coverage, ${health.linesOfCode} LOC`);
  } catch (err: any) {
    log(`  Code health extraction error: ${err.message}`);
  }

  return health;
}

/**
 * Run dependency audit to find vulnerabilities and outdated packages
 */
async function runDependencyAudit(repoPath: string, log: (msg: string) => void): Promise<DependencyAuditResult> {
  const result: DependencyAuditResult = {
    totalDependencies: 0,
    directDependencies: 0,
    vulnerabilities: [],
    outdatedPackages: [],
    licenseIssues: [],
    auditedAt: new Date().toISOString(),
  };

  const packageJsonPath = path.join(repoPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return result;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};

    result.directDependencies = Object.keys(deps).length + Object.keys(devDeps).length;

    // Try npm audit (if npm is available and node_modules exists)
    const nodeModulesPath = path.join(repoPath, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      try {
        const auditOutput = execSync('npm audit --json 2>/dev/null || true', {
          cwd: repoPath,
          encoding: 'utf-8',
          timeout: 30000,
          maxBuffer: 10 * 1024 * 1024,
        });

        if (auditOutput.trim()) {
          const audit = JSON.parse(auditOutput);
          result.totalDependencies = audit.metadata?.totalDependencies || result.directDependencies;

          // Extract vulnerabilities
          if (audit.vulnerabilities) {
            for (const [pkg, vuln] of Object.entries(audit.vulnerabilities as Record<string, any>)) {
              if (result.vulnerabilities.length >= 20) break; // Limit
              result.vulnerabilities.push({
                package: pkg,
                version: vuln.range || 'unknown',
                severity: vuln.severity || 'medium',
                title: vuln.title || vuln.name || 'Vulnerability detected',
                fixedIn: vuln.fixAvailable?.version,
              });
            }
          }
        }
      } catch {
        // npm audit failed, continue with basic analysis
      }

      // Try npm outdated
      try {
        const outdatedOutput = execSync('npm outdated --json 2>/dev/null || true', {
          cwd: repoPath,
          encoding: 'utf-8',
          timeout: 30000,
        });

        if (outdatedOutput.trim() && outdatedOutput.trim() !== '{}') {
          const outdated = JSON.parse(outdatedOutput);
          for (const [pkg, info] of Object.entries(outdated as Record<string, any>)) {
            if (result.outdatedPackages.length >= 20) break; // Limit
            const current = info.current || 'unknown';
            const latest = info.latest || 'unknown';

            // Determine update type
            let updateType: 'major' | 'minor' | 'patch' = 'patch';
            if (current !== 'unknown' && latest !== 'unknown') {
              const currentMajor = parseInt(current.split('.')[0], 10);
              const latestMajor = parseInt(latest.split('.')[0], 10);
              const currentMinor = parseInt(current.split('.')[1], 10);
              const latestMinor = parseInt(latest.split('.')[1], 10);

              if (latestMajor > currentMajor) updateType = 'major';
              else if (latestMinor > currentMinor) updateType = 'minor';
            }

            result.outdatedPackages.push({ package: pkg, current, latest, updateType });
          }
        }
      } catch {
        // npm outdated failed, continue
      }
    }

    // Check for license issues (basic analysis)
    const restrictedLicenses = ['GPL', 'AGPL', 'LGPL', 'SSPL', 'CPAL'];
    for (const [pkg] of Object.entries(deps)) {
      try {
        const pkgPath = path.join(repoPath, 'node_modules', pkg, 'package.json');
        if (fs.existsSync(pkgPath)) {
          const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          const license = pkgJson.license || 'UNKNOWN';

          if (license === 'UNKNOWN' || license === 'UNLICENSED') {
            result.licenseIssues.push({
              package: pkg,
              license,
              issue: 'unknown',
              risk: 'medium',
            });
          } else if (restrictedLicenses.some(l => license.toUpperCase().includes(l))) {
            result.licenseIssues.push({
              package: pkg,
              license,
              issue: 'copyleft',
              risk: 'high',
            });
          }

          if (result.licenseIssues.length >= 10) break; // Limit
        }
      } catch {
        // Skip packages we can't read
      }
    }

    const vulnCount = result.vulnerabilities.length;
    const outdatedCount = result.outdatedPackages.length;
    log(`  Dependency audit: ${vulnCount} vulnerabilities, ${outdatedCount} outdated`);
  } catch (err: any) {
    log(`  Dependency audit error: ${err.message}`);
  }

  return result;
}
