/**
 * Organization Synthesizer
 *
 * Clusters repos into teams, microservices, and domains
 * using LLM analysis and external specs from Jira/ADO.
 *
 * Supports 1-level (project/) and 2-level (project/board/) folder structures
 * matching the specs structure detected by structure-level-detector.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { extractJson, buildJsonPrompt } from '../../../utils/llm-json-extractor.js';
import { detectStructureLevel, type StructureLevelConfig } from '../../../utils/structure-level-detector.js';
import type { RepoAnalysis, OrganizationCluster, EnhancedTeam, LLMProvider, ProgressCallback } from './types.js';

/**
 * External team data fetched from ADO or JIRA
 */
interface ExternalTeam {
  id: string;
  name: string;
  description?: string;
  url?: string;
  projectId?: string;
  provider: 'ado' | 'jira';
}

export interface OrganizationSynthesisResult {
  teams: OrganizationCluster[];
  enhancedTeams: EnhancedTeam[]; // Rich team data for documentation
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

  // Detect structure level for team organization
  const structureConfig = detectStructureLevel(projectPath);
  log(`  Structure level: ${structureConfig.level}-level (${structureConfig.detectionReason})`);

  // Fetch teams from external tools (ADO/JIRA)
  onProgress('org-synthesis', 10, 100, 'Fetching external teams');
  const externalTeams = await fetchExternalTeams(projectPath, log);
  const externalEnhancedTeams = convertExternalTeamsToEnhanced(externalTeams, structureConfig);
  if (externalTeams.length > 0) {
    log(`  Imported ${externalTeams.length} teams from external tools`);
  }

  onProgress('org-synthesis', 20, 100, 'Building repo summaries');

  // Build summaries for LLM
  const repoSummaries = buildRepoSummaries(repoAnalyses);
  log(`  Built summaries for ${repoAnalyses.size} repos`);

  // If we have external teams WITH LLM, enrich them first
  if (llmProvider && externalTeams.length > 0) {
    log('  Enriching external teams with LLM analysis...');
    const enrichedExternalTeams = await enrichExternalTeamsWithLLM(
      externalEnhancedTeams,
      repoAnalyses,
      llmProvider,
      log
    );
    // Update the external teams array with enriched versions
    externalEnhancedTeams.splice(0, externalEnhancedTeams.length, ...enrichedExternalTeams);
    log(`  Enriched ${enrichedExternalTeams.length} external teams with AI-powered analysis`);
  }

  // If we have external teams and no LLM, use external teams directly
  if (!llmProvider && externalTeams.length > 0) {
    log('  No LLM provider, using external teams');
    return createExternalTeamsOnlyResult(externalEnhancedTeams);
  }

  if (!llmProvider) {
    log('  No LLM provider, using basic clustering');
    return createBasicClustering(repoAnalyses, projectPath);
  }

  onProgress('org-synthesis', 40, 100, 'LLM clustering analysis');

  // Build LLM prompt (include external teams context)
  const externalTeamsContext = externalTeams.length > 0
    ? `\n\nExternal teams from ADO/JIRA:\n${externalTeams.map(t => `- ${t.name}: ${t.description || 'No description'}`).join('\n')}`
    : '';
  const prompt = buildClusteringPrompt(repoSummaries, externalSpecs, externalTeamsContext);
  log('  Sending to LLM for organization analysis...');

  try {
    const result = await llmProvider.analyze(prompt);
    if (!result || !result.content) {
      log('  LLM returned empty, using external teams or basic clustering');
      return externalTeams.length > 0
        ? createExternalTeamsOnlyResult(externalEnhancedTeams)
        : createBasicClustering(repoAnalyses, projectPath);
    }

    const extraction = extractJson<LLMClusteringResponse>(result.content, { requiredFields: ['teams'] });
    if (extraction.success && extraction.data) {
      log('  LLM clustering successful');
      onProgress('org-synthesis', 80, 100, 'Processing results');

      // Merge LLM teams with external teams
      const llmResult = convertLLMResponse(extraction.data, projectPath);

      // Add external teams that aren't already covered by LLM
      const llmTeamNames = new Set(llmResult.enhancedTeams.map(t => t.name.toLowerCase()));
      const uniqueExternalTeams = externalEnhancedTeams.filter(
        et => !llmTeamNames.has(et.name.toLowerCase())
      );

      if (uniqueExternalTeams.length > 0) {
        llmResult.enhancedTeams.push(...uniqueExternalTeams);
        log(`  Merged ${uniqueExternalTeams.length} external teams`);
      }

      return llmResult;
    }

    log(`  JSON extraction failed: ${extraction.error}`);
    return externalTeams.length > 0
      ? createExternalTeamsOnlyResult(externalEnhancedTeams)
      : createBasicClustering(repoAnalyses, projectPath);
  } catch (err: any) {
    log(`  LLM error: ${err.message}`);
    return externalTeams.length > 0
      ? createExternalTeamsOnlyResult(externalEnhancedTeams)
      : createBasicClustering(repoAnalyses, projectPath);
  }
}

/**
 * Create result with only external teams (no LLM clustering)
 */
function createExternalTeamsOnlyResult(enhancedTeams: EnhancedTeam[]): OrganizationSynthesisResult {
  const teams: OrganizationCluster[] = enhancedTeams.map(t => ({
    name: t.name,
    type: 'team',
    description: t.description,
    repos: t.repos,
    confidence: 'high',
    reasoning: t.reasoning
  }));

  return {
    teams,
    enhancedTeams,
    microservices: [],
    domains: [],
    crossCutting: [],
    hypotheses: ['Teams imported from external tool - repo associations not automatic'],
    confidence: 'medium'
  };
}

interface LLMClusteringResponse {
  teams: EnhancedTeam[];
  microservices: Array<{ name: string; description: string; repos: string[]; reasoning: string }>;
  domains: Array<{ name: string; description: string; repos: string[]; reasoning: string }>;
  crossCutting: Array<{ name: string; description: string; repos: string[]; reasoning: string }>;
  hypotheses: string[];
}

/**
 * Enrich external teams (from ADO/JIRA) with LLM-powered analysis
 * This provides rich responsibilities, domain expertise, and tech stack based on repo analysis
 */
async function enrichExternalTeamsWithLLM(
  externalTeams: EnhancedTeam[],
  repoAnalyses: Map<string, RepoAnalysis>,
  llmProvider: LLMProvider,
  log: (msg: string) => void
): Promise<EnhancedTeam[]> {
  const enrichedTeams: EnhancedTeam[] = [];

  // Build a comprehensive repo context for LLM
  const repoContext = Array.from(repoAnalyses.entries())
    .map(([name, analysis]) => {
      const patterns = analysis.patternsUsed.map(p => p.pattern).join(', ');
      const concepts = analysis.keyConcepts.join(', ');
      return `- ${name}: ${analysis.purpose} | Patterns: ${patterns || 'none'} | Concepts: ${concepts || 'none'}`;
    })
    .join('\n');

  for (const team of externalTeams) {
    try {
      const schema = {
        responsibilities: '["responsibility1", "responsibility2", ...]',
        domainExpertise: '["expertise1", "expertise2", ...]',
        techStack: '["tech1", "tech2", ...]',
        description: 'string (2-3 sentences about what this team does)',
        integrationBoundaries: 'string (description of upstream/downstream dependencies)',
      };

      const prompt = buildJsonPrompt(
        `Team: ${team.name}\nOriginal description: ${team.description}\n\nAvailable repositories:\n${repoContext}\n\nAnalyze this team and provide:\n- responsibilities: 3-5 specific bullet points of what this team owns\n- domainExpertise: 3-5 technical competencies (e.g., "Azure Functions", "React development", "Medical device integration")\n- techStack: Primary technologies used (infer from repos)\n- description: Rich 2-3 sentence summary\n- integrationBoundaries: How this team integrates with others`,
        schema,
        `Provide detailed team analysis for ${team.name}`
      );

      const result = await llmProvider.analyze(prompt);
      if (result?.content) {
        const extraction = extractJson<any>(result.content, { requiredFields: [] });
        if (extraction.success && extraction.data) {
          enrichedTeams.push({
            ...team,
            description: extraction.data.description || team.description,
            responsibilities: extraction.data.responsibilities || team.responsibilities,
            domainExpertise: extraction.data.domainExpertise || team.domainExpertise,
            techStack: extraction.data.techStack || team.techStack,
            integrationBoundaries: extraction.data.integrationBoundaries || team.integrationBoundaries,
          });
          log(`    Enriched team: ${team.name}`);
          continue;
        }
      }
    } catch (err: any) {
      log(`    Failed to enrich team ${team.name}: ${err.message}`);
    }

    // Fallback: keep original if enrichment fails
    enrichedTeams.push(team);
  }

  return enrichedTeams;
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

/**
 * Fetch teams from external tools (ADO/JIRA) when sync is configured
 *
 * Uses dynamic imports to avoid initialization errors when external tools aren't configured.
 */
async function fetchExternalTeams(
  projectPath: string,
  log: (msg: string) => void
): Promise<ExternalTeam[]> {
  const externalTeams: ExternalTeam[] = [];
  const configPath = path.join(projectPath, '.specweave/config.json');

  if (!fs.existsSync(configPath)) {
    return externalTeams;
  }

  let config: any;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    log('  Could not parse config.json for external teams');
    return externalTeams;
  }

  // Check for ADO sync profiles
  const profiles = config.sync?.profiles || {};
  for (const [profileName, profile] of Object.entries(profiles)) {
    const p = profile as any;
    if (p.provider !== 'ado') continue;

    const adoProject = p.config?.project;
    const organization = p.config?.organization;

    if (!adoProject || !organization) {
      log(`  ADO profile ${profileName} missing project/organization`);
      continue;
    }

    try {
      // Dynamic import to avoid initialization errors
      const { AdoClient } = await import('../../../integrations/ado/ado-client.js');
      const { getAdoPat } = await import('../../../integrations/ado/ado-pat-provider.js');

      const pat = getAdoPat(organization);
      if (!pat) {
        log(`  No ADO PAT available for organization: ${organization}`);
        continue;
      }

      const adoClient = new AdoClient({ pat, organization, project: adoProject });
      const teams = await adoClient.getTeams(adoProject);

      log(`  Fetched ${teams.length} teams from ADO project: ${adoProject}`);

      for (const team of teams) {
        externalTeams.push({
          id: team.id || team.name,
          name: team.name,
          description: team.description,
          url: team.url || `https://dev.azure.com/${organization}/${adoProject}/_settings/teams/${team.name}`,
          projectId: adoProject,
          provider: 'ado'
        });
      }
    } catch (err: any) {
      log(`  Failed to fetch ADO teams from ${profileName}: ${err.message}`);
    }
  }

  // JIRA Teams API requires organization ID which isn't typically configured
  // Implementation note: JIRA Teams are org-level, not project-level
  // Future enhancement: Add JIRA teams via https://api.atlassian.com/public/teams/v1/org/{orgId}/teams

  return externalTeams;
}

/**
 * Convert external teams to EnhancedTeam format
 */
function convertExternalTeamsToEnhanced(
  externalTeams: ExternalTeam[],
  structureConfig: StructureLevelConfig
): EnhancedTeam[] {
  return externalTeams.map(et => ({
    name: et.name,
    description: et.description || `Team from ${et.provider === 'ado' ? 'Azure DevOps' : 'Jira'}`,
    responsibilities: ['Manage associated repositories and work items'] as string[],
    domainExpertise: [] as string[],
    techStack: [] as string[],
    repos: [] as string[], // External teams don't have direct repo mapping
    reasoning: `Team imported from ${et.provider === 'ado' ? 'Azure DevOps' : 'Jira'}`,
    project: et.projectId ? normalizeId(et.projectId) : structureConfig.projects[0]?.id,
    externalId: et.id,
    externalUrl: et.url,
    externalProvider: et.provider
  }));
}

/**
 * Normalize ID to kebab-case for folder names
 */
function normalizeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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

function buildClusteringPrompt(
  repoSummaries: string,
  externalSpecs: string[],
  externalTeamsContext: string = ''
): string {
  const schema = {
    teams: '[{name, description, responsibilities:[], domainExpertise:[], techStack:[], repos:[], reasoning, integrationBoundaries?}, ...]',
    microservices: '[{name, description, repos:[], reasoning}, ...]',
    domains: '[{name, description, repos:[], reasoning}, ...]',
    crossCutting: '[{name, description, repos:[], reasoning}, ...]',
    hypotheses: '["uncertainty1", ...]',
  };
  const specsContext = externalSpecs.length > 0 ? `\n\nExternal project info (from Jira/ADO):\n${externalSpecs.join('\n')}` : '';
  const context = `Analyze these repositories to understand organization structure.

For each TEAM, provide comprehensive documentation:
- name: Team name (e.g., "Platform Team", "API Gateway Team")
- description: 2-3 sentence summary of what this team does
- responsibilities: Array of 3-5 bullet points defining what the team owns and maintains
- domainExpertise: Array of technical competencies (e.g., "FHIR integration", "Angular development", "Azure Functions")
- techStack: Array of primary technologies used across team repos
- repos: List of repository names belonging to this team
- reasoning: Brief explanation of why these repos were grouped together
- integrationBoundaries: (optional) Description of upstream/downstream dependencies

Repositories to analyze:
${repoSummaries}${specsContext}${externalTeamsContext}

Group by:
1. Teams (likely ownership with rich metadata)
2. Microservices (service boundaries)
3. Domains (business areas)
4. Cross-cutting (shared infra)

Note any uncertainties in hypotheses.`;
  return buildJsonPrompt(context, schema, 'Cluster these repositories with detailed team information.');
}

function convertLLMResponse(
  response: LLMClusteringResponse,
  projectPath: string
): OrganizationSynthesisResult {
  const structureConfig = detectStructureLevel(projectPath);

  const convert = (items: any[], type: 'team' | 'microservice' | 'domain'): OrganizationCluster[] =>
    (items || []).map(item => ({
      name: item.name, type, description: item.description || '',
      repos: item.repos || [], confidence: 'medium', reasoning: item.reasoning || '',
    }));

  // Convert enhanced teams with all fields and project context
  const defaultProject = structureConfig.projects[0]?.id || 'default';
  const enhancedTeams: EnhancedTeam[] = (response.teams || []).map(team => ({
    name: team.name || 'Unknown Team',
    description: team.description || '',
    responsibilities: team.responsibilities || [],
    domainExpertise: team.domainExpertise || [],
    techStack: team.techStack || [],
    repos: team.repos || [],
    reasoning: team.reasoning || '',
    integrationBoundaries: team.integrationBoundaries,
    project: defaultProject, // Set default project for LLM-derived teams
  }));

  return {
    teams: convert(response.teams, 'team'),
    enhancedTeams,
    microservices: convert(response.microservices, 'microservice'),
    domains: convert(response.domains, 'domain'),
    crossCutting: convert(response.crossCutting, 'domain'),
    hypotheses: response.hypotheses || [],
    confidence: 'medium',
  };
}

function createBasicClustering(
  analyses: Map<string, RepoAnalysis>,
  projectPath: string
): OrganizationSynthesisResult {
  const structureConfig = detectStructureLevel(projectPath);
  const defaultProject = structureConfig.projects[0]?.id || 'default';

  // Basic clustering by naming conventions
  const teamMap = new Map<string, string[]>();
  for (const [name] of analyses) {
    const prefixMatch = name.match(/^([a-z]+)-/i);
    const team = prefixMatch ? prefixMatch[1] : 'other';
    if (!teamMap.has(team)) teamMap.set(team, []);
    teamMap.get(team)!.push(name);
  }

  const teams: OrganizationCluster[] = [];
  const enhancedTeams: EnhancedTeam[] = [];

  for (const [team, repos] of teamMap) {
    const teamName = `${team}-team`;
    teams.push({
      name: teamName,
      type: 'team',
      description: `Repos with ${team}- prefix`,
      repos,
      confidence: 'low',
      reasoning: 'Grouped by naming convention'
    });

    // Create basic enhanced team (without LLM-derived fields)
    enhancedTeams.push({
      name: teamName,
      description: `Repositories grouped by ${team}- naming prefix.`,
      responsibilities: ['Maintain repositories with this prefix'],
      domainExpertise: ['General development'],
      techStack: ['TypeScript'], // Default
      repos,
      reasoning: 'Grouped by naming convention - LLM analysis recommended for accurate details',
      project: defaultProject, // Set default project for basic clustering
    });
  }

  return {
    teams,
    enhancedTeams,
    microservices: [],
    domains: [],
    crossCutting: [],
    hypotheses: ['Basic clustering by naming only - LLM analysis recommended'],
    confidence: 'low'
  };
}

/**
 * Get the team folder path based on structure level configuration
 *
 * 1-level: organization/teams/{project}/
 * 2-level: organization/teams/{project}/{board}/
 */
function getTeamFolderPath(
  basePath: string,
  team: EnhancedTeam,
  structureConfig: StructureLevelConfig
): string {
  const teamsBasePath = path.join(basePath, 'teams');

  // Determine project ID
  const projectId = team.project
    || structureConfig.projects[0]?.id
    || 'default';

  if (structureConfig.level === 2) {
    // 2-level: teams/{project}/{board}/
    const boardId = team.board
      || (structureConfig.boardsByProject?.[projectId]?.[0]?.id)
      || 'general';
    return path.join(teamsBasePath, projectId, boardId);
  }

  // 1-level: teams/{project}/
  return path.join(teamsBasePath, projectId);
}

/**
 * Generate team markdown content with external links support
 */
function generateTeamMarkdown(team: EnhancedTeam): string {
  const sections: string[] = [
    `# ${team.name}`,
    '',
    team.description,
    ''
  ];

  // External links section (if available)
  if (team.externalUrl) {
    sections.push(
      '## External Links',
      '',
      `- [View in ${team.externalProvider === 'ado' ? 'Azure DevOps' : team.externalProvider === 'jira' ? 'Jira' : team.externalProvider}](${team.externalUrl})`,
      ''
    );
  }

  // Responsibilities
  sections.push(
    '## Responsibilities',
    '',
    ...(team.responsibilities.length > 0
      ? team.responsibilities.map(r => `- ${r}`)
      : ['- TBD']),
    ''
  );

  // Domain Expertise
  sections.push(
    '## Domain Expertise',
    '',
    ...(team.domainExpertise.length > 0
      ? team.domainExpertise.map(e => `- ${e}`)
      : ['- General development']),
    ''
  );

  // Technology Stack
  sections.push(
    '## Technology Stack',
    '',
    ...(team.techStack.length > 0
      ? team.techStack.map(t => `- ${t}`)
      : ['- TypeScript']),
    ''
  );

  // Repositories (adjust relative path based on depth)
  const modulesRelPath = team.board ? '../../../../modules' : '../../../modules';
  sections.push(
    '## Repositories',
    '',
    ...team.repos.map(r => `- [${r}](${modulesRelPath}/${r}.md)`),
    ''
  );

  // Integration Boundaries
  sections.push(
    '## Integration Boundaries',
    '',
    team.integrationBoundaries || 'Integration boundaries to be documented.',
    ''
  );

  // Footer
  sections.push(
    '---',
    `*Clustering reasoning: ${team.reasoning}*`,
    `*Generated on ${new Date().toISOString().split('T')[0]}*`
  );

  return sections.join('\n');
}

/**
 * Generate index.md for a team folder (project or board level)
 */
function generateTeamIndexMarkdown(
  folderName: string,
  teams: EnhancedTeam[],
  level: 'project' | 'board'
): string {
  const title = level === 'project'
    ? `# ${folderName} Teams`
    : `# ${folderName} Board Teams`;

  const sections = [
    title,
    '',
    `*${teams.length} teams in this ${level}*`,
    '',
    '## Teams',
    '',
    ...teams.map(t => `- [${t.name}](./${t.name.toLowerCase().replace(/\s+/g, '-')}.md)`),
    '',
    '---',
    `*Generated on ${new Date().toISOString().split('T')[0]}*`
  ];

  return sections.join('\n');
}

export async function saveOrganizationStructure(
  projectPath: string,
  result: OrganizationSynthesisResult,
  repoAnalyses: Map<string, RepoAnalysis>
): Promise<string[]> {
  const savedFiles: string[] = [];
  const orgPath = path.join(projectPath, '.specweave/docs/internal/organization');
  fs.mkdirSync(orgPath, { recursive: true });

  // Detect structure level for team organization
  const structureConfig = detectStructureLevel(projectPath);

  // Overview
  const overviewLines = [
    '# Organization Overview',
    '',
    `*Generated ${new Date().toISOString().split('T')[0]} | Confidence: ${result.confidence}*`,
    '',
    `## Summary`,
    '',
    `- **Teams**: ${result.teams.length}`,
    `- **Microservices**: ${result.microservices.length}`,
    `- **Domains**: ${result.domains.length}`,
    `- **Repositories**: ${repoAnalyses.size}`,
    `- **Structure Level**: ${structureConfig.level}-level (${structureConfig.detectionReason})`,
    ''
  ];

  if (result.hypotheses.length > 0) {
    overviewLines.push('## Uncertainties', '', ...result.hypotheses.map(h => `- ${h}`), '');
  }

  fs.writeFileSync(path.join(orgPath, 'overview.md'), overviewLines.join('\n'));
  savedFiles.push(path.join(orgPath, 'overview.md'));

  // Teams - use enhancedTeams for rich documentation with structure-level-aware folders
  if (result.enhancedTeams.length > 0) {
    // Group teams by their target folder
    const teamsByFolder = new Map<string, EnhancedTeam[]>();

    for (const team of result.enhancedTeams) {
      const folderPath = getTeamFolderPath(orgPath, team, structureConfig);
      if (!teamsByFolder.has(folderPath)) {
        teamsByFolder.set(folderPath, []);
      }
      teamsByFolder.get(folderPath)!.push(team);
    }

    // Create folders and write team files
    for (const [folderPath, teams] of teamsByFolder) {
      fs.mkdirSync(folderPath, { recursive: true });

      // Create index.md for this folder
      const relativePath = path.relative(path.join(orgPath, 'teams'), folderPath);
      const parts = relativePath.split(path.sep).filter(p => p);
      const folderName = parts[parts.length - 1] || 'Teams';
      const indexLevel = structureConfig.level === 2 && parts.length > 1 ? 'board' : 'project';

      const indexContent = generateTeamIndexMarkdown(folderName, teams, indexLevel);
      const indexPath = path.join(folderPath, 'index.md');
      fs.writeFileSync(indexPath, indexContent);
      savedFiles.push(indexPath);

      // Write individual team files
      for (const team of teams) {
        const content = generateTeamMarkdown(team);
        const fileName = `${team.name.toLowerCase().replace(/\s+/g, '-')}.md`;
        const filePath = path.join(folderPath, fileName);
        fs.writeFileSync(filePath, content);
        savedFiles.push(filePath);
      }
    }
  }

  return savedFiles;
}
