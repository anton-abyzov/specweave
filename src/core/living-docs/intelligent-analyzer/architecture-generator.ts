/**
 * Architecture Generator
 *
 * Generates C4 diagrams and detects architectural decisions
 * from the organization structure and repo analyses.
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractJson, buildJsonPrompt } from '../../../utils/llm-json-extractor.js';
import type {
  RepoAnalysis,
  OrganizationCluster,
  DetectedADR,
  ADREvidence,
  LLMProvider,
  ProgressCallback,
} from './types.js';
import type { OrganizationSynthesisResult } from './organization-synthesizer.js';

export interface ArchitectureResult {
  c4Context: string;
  c4Container: string;
  dataFlow: string;
  detectedAdrs: DetectedADR[];
  confidence: 'high' | 'medium' | 'low';
}

export async function generateArchitecture(
  repoAnalyses: Map<string, RepoAnalysis>,
  orgResult: OrganizationSynthesisResult,
  projectPath: string,
  llmProvider: LLMProvider | null,
  onProgress: ProgressCallback,
  log: (msg: string) => void
): Promise<ArchitectureResult> {
  log('PHASE D: Architecture Generation');
  onProgress('architecture', 0, 100, 'Generating C4 diagrams');

  const context = buildArchitectureContext(repoAnalyses, orgResult);

  if (!llmProvider) {
    log('  No LLM provider, using basic diagram generation');
    return createBasicArchitecture(repoAnalyses, orgResult);
  }

  onProgress('architecture', 20, 100, 'LLM C4 diagram generation');

  try {
    const c4Result = await generateC4Diagrams(context, llmProvider, log);
    onProgress('architecture', 50, 100, 'Detecting architectural patterns');

    const adrs = await detectArchitecturalDecisions(repoAnalyses, llmProvider, log);
    onProgress('architecture', 80, 100, 'Finalizing architecture docs');

    return {
      c4Context: c4Result.context,
      c4Container: c4Result.container,
      dataFlow: c4Result.dataFlow,
      detectedAdrs: adrs,
      confidence: 'medium',
    };
  } catch (err: any) {
    log(`  Architecture generation error: ${err.message}`);
    return createBasicArchitecture(repoAnalyses, orgResult);
  }
}

function buildArchitectureContext(
  analyses: Map<string, RepoAnalysis>,
  org: OrganizationSynthesisResult
): string {
  const lines: string[] = ['# System Overview', ''];

  if (org.teams.length > 0) {
    lines.push('## Teams');
    for (const team of org.teams) {
      lines.push(`- **${team.name}**: ${team.repos.join(', ')}`);
    }
    lines.push('');
  }

  if (org.microservices.length > 0) {
    lines.push('## Microservices');
    for (const svc of org.microservices) {
      lines.push(`- **${svc.name}**: ${svc.description}`);
    }
    lines.push('');
  }

  lines.push('## Key APIs');
  for (const [name, analysis] of analyses) {
    if (analysis.mainApis.length > 0) {
      const apis = analysis.mainApis.slice(0, 3).map(a => a.name).join(', ');
      lines.push(`- **${name}**: ${apis}`);
    }
  }
  lines.push('');

  lines.push('## Detected Patterns');
  const allPatterns = new Map<string, string[]>();
  for (const [name, analysis] of analyses) {
    for (const p of analysis.patternsUsed) {
      if (!allPatterns.has(p.pattern)) allPatterns.set(p.pattern, []);
      allPatterns.get(p.pattern)!.push(name);
    }
  }
  for (const [pattern, repos] of allPatterns) {
    lines.push(`- **${pattern}**: ${repos.join(', ')}`);
  }

  return lines.join('\n');
}

interface C4DiagramResult {
  context: string;
  container: string;
  dataFlow: string;
}

async function generateC4Diagrams(
  context: string,
  llmProvider: LLMProvider,
  log: (msg: string) => void
): Promise<C4DiagramResult> {
  const schema = {
    contextDiagram: 'Mermaid C4Context diagram code',
    containerDiagram: 'Mermaid C4Container diagram code',
    dataFlowDiagram: 'Mermaid flowchart for data flow',
  };

  const prompt = buildJsonPrompt(
    `${context}\n\nGenerate Mermaid diagrams. Use C4Context for high-level, C4Container for services, flowchart TD for data flow.`,
    schema,
    'Generate architecture diagrams in Mermaid format.'
  );

  try {
    const result = await llmProvider.analyze(prompt);
    if (!result?.content) {
      return createBasicDiagrams();
    }

    const extraction = extractJson<any>(result.content, { requiredFields: [] });
    if (extraction.success && extraction.data) {
      log('  C4 diagrams generated successfully');
      return {
        context: extraction.data.contextDiagram || createBasicContextDiagram(),
        container: extraction.data.containerDiagram || createBasicContainerDiagram(),
        dataFlow: extraction.data.dataFlowDiagram || createBasicDataFlow(),
      };
    }
  } catch {
    log('  C4 diagram generation failed, using basic');
  }

  return createBasicDiagrams();
}

/**
 * Derives a human-readable ADR title from pattern and evidence using LLM
 * Returns a concise 5-8 word title explaining WHAT was decided
 */
async function deriveADRTitle(
  pattern: string,
  evidence: string[],
  llmProvider: LLMProvider
): Promise<string> {
  const prompt = `Given this architectural pattern and evidence, generate a concise decision title (5-8 words).

Pattern: ${pattern}
Evidence: ${evidence.slice(0, 5).join(', ')}

Good examples:
- "Adopt Feature-Based Folder Structure"
- "Use Event-Driven Architecture for Async Processing"
- "Implement CQRS for Write Operations"
- "Standardize REST API Design Patterns"
- "Apply Domain-Driven Design Principles"

Return ONLY the title (5-8 words), no explanation or quotes.`;

  try {
    const result = await llmProvider.analyze(prompt);
    if (result?.content) {
      // Clean up the response: remove quotes, special chars, limit length
      const cleaned = result.content
        .trim()
        .replace(/^["']|["']$/g, '')      // Remove surrounding quotes
        .replace(/[^\w\s-]/g, '')          // Remove special chars except hyphen
        .substring(0, 60);                 // Max 60 chars

      if (cleaned.length >= 10) {
        return cleaned;
      }
    }
  } catch {
    // Fallback silently
  }

  // Fallback: Use pattern name with "Adopt" prefix
  return `Adopt ${pattern}`;
}

/**
 * Converts a title to kebab-case for use in ADR filenames
 */
function toKebabCase(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

async function detectArchitecturalDecisions(
  analyses: Map<string, RepoAnalysis>,
  llmProvider: LLMProvider,
  log: (msg: string) => void
): Promise<DetectedADR[]> {
  const patternMap = new Map<string, { repos: string[]; evidence: string[]; highConfidenceCount: number }>();

  // Collect all patterns with confidence tracking
  for (const [name, analysis] of analyses) {
    for (const p of analysis.patternsUsed) {
      if (!patternMap.has(p.pattern)) {
        patternMap.set(p.pattern, { repos: [], evidence: [], highConfidenceCount: 0 });
      }
      const entry = patternMap.get(p.pattern)!;
      entry.repos.push(name);
      entry.evidence.push(...p.evidence);
      if (p.confidence === 'high') {
        entry.highConfidenceCount++;
      }
    }
  }

  const adrs: DetectedADR[] = [];
  let adrNum = 1;

  // Sort patterns by adoption (repos count DESC) for better ADR numbering
  const sortedPatterns = Array.from(patternMap.entries())
    .sort((a, b) => b[1].repos.length - a[1].repos.length);

  for (const [pattern, data] of sortedPatterns) {
    // Generate ADR if:
    // 1. Found in 2+ repos (standard adoption), OR
    // 2. Found in 1 repo with HIGH confidence (clear architectural decision)
    // Skip trivial single-repo low-confidence patterns
    const shouldGenerateADR =
      data.repos.length >= 2 ||
      (data.repos.length === 1 && data.highConfidenceCount > 0);

    if (shouldGenerateADR) {
      // Derive semantic title using LLM
      const semanticTitle = await deriveADRTitle(pattern, data.evidence, llmProvider);
      const kebabTitle = toKebabCase(semanticTitle);

      // Determine confidence based on adoption breadth
      let confidence: 'high' | 'medium' | 'low';
      if (data.repos.length >= 5 && data.highConfidenceCount >= 3) {
        confidence = 'high';
      } else if (data.repos.length >= 2) {
        confidence = 'medium';
      } else {
        confidence = 'low'; // Single repo with high confidence
      }

      // Craft context based on adoption
      const context = data.repos.length >= 2
        ? `Found ${pattern} pattern in ${data.repos.length} repositories.`
        : `Found ${pattern} pattern with high confidence in ${data.repos[0]}.`;

      adrs.push({
        id: `${String(adrNum).padStart(4, '0')}-${kebabTitle}`,
        title: semanticTitle,
        pattern,
        status: 'Detected',
        context,
        decision: data.repos.length >= 2
          ? `The team has adopted ${pattern} as a standard approach.`
          : `${pattern} was chosen for ${data.repos[0]} implementation.`,
        consequences: data.repos.length >= 2
          ? [
              `Consistent ${pattern} implementation across services`,
              'Team familiarity with the pattern',
              `Standardization benefits for ${data.repos.length} repositories`,
            ]
          : [
              `${pattern} enables specific architectural requirements`,
              'Pattern establishes precedent for similar use cases',
            ],
        evidence: [{
          repo: data.repos.join(', '),
          files: [],
          description: data.evidence.slice(0, 5).join('; '),
        }],
        confidence,
      });
      adrNum++;
    }
  }

  log(`  Detected ${adrs.length} architectural decisions from ${patternMap.size} total patterns`);
  return adrs;
}

function createBasicArchitecture(
  analyses: Map<string, RepoAnalysis>,
  org: OrganizationSynthesisResult
): ArchitectureResult {
  return {
    c4Context: createBasicContextDiagram(),
    c4Container: createBasicContainerDiagram(),
    dataFlow: createBasicDataFlow(),
    detectedAdrs: [],
    confidence: 'low',
  };
}

function createBasicDiagrams(): C4DiagramResult {
  return {
    context: createBasicContextDiagram(),
    container: createBasicContainerDiagram(),
    dataFlow: createBasicDataFlow(),
  };
}

function createBasicContextDiagram(): string {
  return `C4Context
  title System Context Diagram
  Person(user, "User", "System user")
  System(system, "System", "The system under analysis")
  Rel(user, system, "Uses")`;
}

function createBasicContainerDiagram(): string {
  return `C4Container
  title Container Diagram
  Container(api, "API", "REST/GraphQL", "Main API surface")
  Container(db, "Database", "Storage", "Data persistence")
  Rel(api, db, "Reads/Writes")`;
}

function createBasicDataFlow(): string {
  return `flowchart TD
  A[Client] --> B[API Gateway]
  B --> C[Services]
  C --> D[Database]`;
}

export async function saveArchitecture(
  projectPath: string,
  result: ArchitectureResult
): Promise<string[]> {
  const savedFiles: string[] = [];
  const archPath = path.join(projectPath, '.specweave/docs/internal/architecture');
  const diagramsPath = path.join(archPath, 'diagrams');
  const adrPath = path.join(archPath, 'adr');

  fs.mkdirSync(diagramsPath, { recursive: true });
  fs.mkdirSync(adrPath, { recursive: true });

  const contextFile = path.join(diagramsPath, 'c4-context.md');
  fs.writeFileSync(contextFile, [
    '# C4 Context Diagram',
    '',
    '*Auto-generated by Intelligent Analyzer*',
    '',
    '```mermaid',
    result.c4Context,
    '```',
  ].join('\n'));
  savedFiles.push(contextFile);

  const containerFile = path.join(diagramsPath, 'c4-container.md');
  fs.writeFileSync(containerFile, [
    '# C4 Container Diagram',
    '',
    '*Auto-generated by Intelligent Analyzer*',
    '',
    '```mermaid',
    result.c4Container,
    '```',
  ].join('\n'));
  savedFiles.push(containerFile);

  const dataFlowFile = path.join(diagramsPath, 'data-flow.md');
  fs.writeFileSync(dataFlowFile, [
    '# Data Flow Diagram',
    '',
    '*Auto-generated by Intelligent Analyzer*',
    '',
    '```mermaid',
    result.dataFlow,
    '```',
  ].join('\n'));
  savedFiles.push(dataFlowFile);

  for (const adr of result.detectedAdrs) {
    const adrFile = path.join(adrPath, `${adr.id}.md`);
    const content = [
      `# ${adr.id}: ${adr.title}`,
      '',
      `**Status**: ${adr.status}`,
      `**Confidence**: ${adr.confidence}`,
      '',
      '## Context',
      '',
      adr.context,
      '',
      '## Decision',
      '',
      adr.decision,
      '',
      '## Consequences',
      '',
      ...adr.consequences.map(c => `- ${c}`),
      '',
      '## Evidence',
      '',
      ...adr.evidence.map(e => `- **${e.repo}**: ${e.description}`),
    ].join('\n');
    fs.writeFileSync(adrFile, content);
    savedFiles.push(adrFile);
  }

  return savedFiles;
}
