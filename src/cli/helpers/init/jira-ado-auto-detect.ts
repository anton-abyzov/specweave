/**
 * JIRA/ADO Auto-Detection for Init
 *
 * Analyzes external tool structure and recommends optimal organization.
 * Supports 2-level folder structure: specs/{provider-project}/{board-or-area}/
 *
 * @module cli/helpers/init/jira-ado-auto-detect
 */

import chalk from 'chalk';
import ora from 'ora';
import { select, confirm } from '@inquirer/prompts';
import { JiraClient } from '../../../integrations/jira/jira-client.js';
import { fetchBoardsForProject, type JiraBoard } from '../../../../plugins/specweave-jira/lib/jira-board-resolver.js';
import { fetchAreaPathsForProject, type AdoAreaPath } from '../../../../plugins/specweave-ado/lib/ado-board-resolver.js';
import { normalizeToProjectId } from '../../../utils/project-id-generator.js';

// =============================================================================
// TYPES
// =============================================================================

/** Detected team organization pattern */
export type TeamPattern =
  | 'tech-stack'      // Frontend, Backend, Mobile, iOS, Android
  | 'squad-based'     // Team Alpha, Squad 1, Pod A
  | 'domain-based'    // Payments, Users, Orders, Catalog
  | 'service-based'   // Platform, Infrastructure, DevOps, SRE
  | 'feature-based'   // Feature teams working on specific features
  | 'mixed'           // Multiple patterns detected
  | 'unknown';        // No clear pattern

export interface JiraProjectInfo {
  key: string;
  name: string;
  boards: JiraBoard[];
}

export interface AdoProjectInfo {
  name: string;
  areaPaths: AdoAreaPath[];
}

/** Analysis result with detected patterns */
export interface StructureAnalysis {
  pattern: TeamPattern;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  scrumBoardCount: number;
  kanbanBoardCount: number;
  suggestedMapping: string[];  // Example folder mappings
}

export interface JiraStructure {
  projects: JiraProjectInfo[];
  totalBoards: number;
  recommendedMode: 'simple' | 'by-project' | 'by-board' | 'hybrid';
  analysis: StructureAnalysis;
}

export interface AdoStructure {
  projects: AdoProjectInfo[];
  totalAreaPaths: number;
  recommendedMode: 'simple' | 'by-project' | 'by-area';
  analysis: StructureAnalysis;
}

/**
 * Mapping result for JIRA
 */
export interface JiraMappingResult {
  mode: 'simple' | 'by-project' | 'by-board' | 'hybrid';
  /** Project key → board name → specweave folder */
  mappings: Map<string, Map<string, string>>;
}

/**
 * Mapping result for ADO
 */
export interface AdoMappingResult {
  mode: 'simple' | 'by-project' | 'by-area';
  /** Project name → area path → specweave folder */
  mappings: Map<string, Map<string, string>>;
}

// =============================================================================
// SMART ANALYSIS - Pattern Detection
// =============================================================================

/** Keywords for detecting team patterns */
const PATTERN_KEYWORDS: Record<TeamPattern, string[]> = {
  'tech-stack': ['frontend', 'backend', 'mobile', 'ios', 'android', 'web', 'api', 'ui', 'ux', 'server', 'client', 'infra'],
  'squad-based': ['team', 'squad', 'pod', 'tribe', 'crew', 'group', 'alpha', 'beta', 'gamma', 'delta'],
  'domain-based': ['payment', 'user', 'order', 'catalog', 'checkout', 'shipping', 'inventory', 'customer', 'billing', 'auth'],
  'service-based': ['platform', 'infrastructure', 'devops', 'sre', 'core', 'shared', 'common', 'tools', 'ops'],
  'feature-based': ['feature', 'epic', 'initiative', 'project', 'release', 'sprint'],
  'mixed': [],
  'unknown': [],
};

/**
 * Analyze names to detect team organization pattern
 */
function detectTeamPattern(names: string[]): { pattern: TeamPattern; confidence: 'high' | 'medium' | 'low'; matches: Map<TeamPattern, string[]> } {
  const normalizedNames = names.map(n => n.toLowerCase());
  const matches = new Map<TeamPattern, string[]>();

  // Check each pattern
  for (const [pattern, keywords] of Object.entries(PATTERN_KEYWORDS)) {
    if (pattern === 'mixed' || pattern === 'unknown') continue;

    const matchedNames: string[] = [];
    for (const name of normalizedNames) {
      for (const keyword of keywords) {
        if (name.includes(keyword)) {
          matchedNames.push(names[normalizedNames.indexOf(name)]);
          break;
        }
      }
    }

    if (matchedNames.length > 0) {
      matches.set(pattern as TeamPattern, matchedNames);
    }
  }

  // Determine primary pattern
  if (matches.size === 0) {
    return { pattern: 'unknown', confidence: 'low', matches };
  }

  if (matches.size > 2) {
    return { pattern: 'mixed', confidence: 'medium', matches };
  }

  // Find pattern with most matches
  let bestPattern: TeamPattern = 'unknown';
  let bestCount = 0;

  for (const [pattern, matched] of matches) {
    if (matched.length > bestCount) {
      bestCount = matched.length;
      bestPattern = pattern;
    }
  }

  const coverage = bestCount / names.length;
  const confidence = coverage > 0.7 ? 'high' : coverage > 0.4 ? 'medium' : 'low';

  return { pattern: bestPattern, confidence, matches };
}

/**
 * Generate reasoning explanation for detected pattern
 */
function generateReasoning(
  pattern: TeamPattern,
  matches: Map<TeamPattern, string[]>,
  scrumCount: number,
  kanbanCount: number
): string {
  const parts: string[] = [];

  // Pattern explanation
  const patternDescriptions: Record<TeamPattern, string> = {
    'tech-stack': 'Teams organized by technology layer (Frontend/Backend/Mobile)',
    'squad-based': 'Cross-functional squads or pods',
    'domain-based': 'Teams organized by business domain',
    'service-based': 'Platform/infrastructure focused teams',
    'feature-based': 'Teams organized around features or initiatives',
    'mixed': 'Multiple organization patterns detected',
    'unknown': 'No clear organizational pattern detected',
  };

  parts.push(patternDescriptions[pattern]);

  // Show matched keywords
  if (matches.size > 0) {
    const examples: string[] = [];
    for (const [, matched] of matches) {
      examples.push(...matched.slice(0, 2));
    }
    if (examples.length > 0) {
      parts.push(`Found: ${examples.slice(0, 4).join(', ')}`);
    }
  }

  // Board type insight
  if (scrumCount > 0 || kanbanCount > 0) {
    const boardInfo = [];
    if (scrumCount > 0) boardInfo.push(`${scrumCount} Scrum`);
    if (kanbanCount > 0) boardInfo.push(`${kanbanCount} Kanban`);
    parts.push(`Board types: ${boardInfo.join(', ')}`);
  }

  return parts.join('. ');
}

/**
 * Analyze JIRA structure and create detailed analysis
 */
function analyzeJiraStructureDeep(projects: JiraProjectInfo[]): StructureAnalysis {
  // Collect all board names
  const allBoardNames: string[] = [];
  let scrumCount = 0;
  let kanbanCount = 0;

  for (const project of projects) {
    for (const board of project.boards) {
      allBoardNames.push(board.name);
      if (board.type === 'scrum') scrumCount++;
      else if (board.type === 'kanban') kanbanCount++;
    }
  }

  // Detect pattern
  const { pattern, confidence, matches } = detectTeamPattern(allBoardNames);

  // Generate example mappings
  const suggestedMapping: string[] = [];
  for (const project of projects.slice(0, 2)) {
    for (const board of project.boards.slice(0, 2)) {
      const folder = `JIRA-${normalizeToProjectId(project.key)}/${normalizeToProjectId(board.name)}`;
      suggestedMapping.push(folder);
    }
  }

  return {
    pattern,
    confidence,
    reasoning: generateReasoning(pattern, matches, scrumCount, kanbanCount),
    scrumBoardCount: scrumCount,
    kanbanBoardCount: kanbanCount,
    suggestedMapping,
  };
}

/**
 * Analyze ADO structure and create detailed analysis
 */
function analyzeAdoStructureDeep(projects: AdoProjectInfo[]): StructureAnalysis {
  // Collect all area path names
  const allAreaNames: string[] = [];

  for (const project of projects) {
    for (const area of project.areaPaths) {
      allAreaNames.push(area.name);
    }
  }

  // Detect pattern
  const { pattern, confidence, matches } = detectTeamPattern(allAreaNames);

  // Generate example mappings
  const suggestedMapping: string[] = [];
  for (const project of projects.slice(0, 2)) {
    for (const area of project.areaPaths.slice(0, 2)) {
      const folder = `ADO-${normalizeToProjectId(project.name)}/${normalizeToProjectId(area.name)}`;
      suggestedMapping.push(folder);
    }
  }

  return {
    pattern,
    confidence,
    reasoning: generateReasoning(pattern, matches, 0, 0),
    scrumBoardCount: 0,
    kanbanBoardCount: 0,
    suggestedMapping,
  };
}

// =============================================================================
// JIRA AUTO-DETECTION
// =============================================================================

/**
 * Auto-detect JIRA structure: projects and their boards
 */
export async function detectJiraStructure(): Promise<JiraStructure | null> {
  const spinner = ora('Analyzing JIRA structure...').start();

  try {
    const client = new JiraClient();

    // 1. Fetch all accessible projects
    const projects = await client.getProjects();
    if (!projects || projects.length === 0) {
      spinner.warn('No JIRA projects found');
      return null;
    }

    // 2. For each project, fetch boards
    const projectInfos: JiraProjectInfo[] = [];
    let totalBoards = 0;

    for (const project of projects.slice(0, 20)) { // Limit to 20 projects for performance
      try {
        const boards = await fetchBoardsForProject(client, project.key);
        projectInfos.push({
          key: project.key,
          name: project.name,
          boards: boards || [],
        });
        totalBoards += boards?.length || 0;
      } catch {
        // Skip projects where we can't fetch boards
        projectInfos.push({
          key: project.key,
          name: project.name,
          boards: [],
        });
      }
    }

    // 3. Analyze structure and recommend mode
    const recommendedMode = analyzeJiraStructure(projectInfos, totalBoards);
    const analysis = analyzeJiraStructureDeep(projectInfos);

    spinner.succeed(`Found ${projectInfos.length} projects with ${totalBoards} boards`);

    return {
      projects: projectInfos,
      totalBoards,
      recommendedMode,
      analysis,
    };
  } catch (error) {
    spinner.fail('Failed to analyze JIRA structure');
    console.log(chalk.gray(`   Error: ${error instanceof Error ? error.message : String(error)}`));
    return null;
  }
}

/**
 * Analyze JIRA structure and recommend organization mode
 */
function analyzeJiraStructure(
  projects: JiraProjectInfo[],
  totalBoards: number
): 'simple' | 'by-project' | 'by-board' | 'hybrid' {
  const projectCount = projects.length;
  const avgBoardsPerProject = totalBoards / projectCount;

  // Single project
  if (projectCount === 1) {
    const boards = projects[0].boards.length;
    if (boards <= 1) return 'simple';
    return 'by-board'; // Multiple boards in single project → board-based
  }

  // Multiple projects
  if (avgBoardsPerProject <= 1.5) {
    return 'by-project'; // Most projects have 1 board → project-based
  }

  return 'hybrid'; // Multiple projects with multiple boards → 2-level
}

/**
 * Display JIRA structure and get user confirmation
 */
export async function confirmJiraMapping(
  structure: JiraStructure
): Promise<JiraMappingResult | null> {
  console.log(chalk.cyan('\n📊 Detected JIRA Structure:\n'));

  // Show detected structure
  for (const project of structure.projects.slice(0, 10)) {
    const boardList = project.boards.length > 0
      ? project.boards.map(b => `${b.name}${b.type ? ` (${b.type})` : ''}`).join(', ')
      : '(no boards)';
    console.log(chalk.white(`   ${project.key}`), chalk.gray(`(${project.boards.length} boards): ${boardList}`));
  }

  if (structure.projects.length > 10) {
    console.log(chalk.gray(`   ... and ${structure.projects.length - 10} more projects`));
  }

  // Show analysis insight
  console.log('');
  const { analysis } = structure;
  const patternEmoji: Record<TeamPattern, string> = {
    'tech-stack': '🔧',
    'squad-based': '👥',
    'domain-based': '📦',
    'service-based': '⚙️',
    'feature-based': '🎯',
    'mixed': '🔀',
    'unknown': '❓',
  };
  console.log(chalk.yellow(`${patternEmoji[analysis.pattern]} Team Pattern: ${analysis.pattern} (${analysis.confidence} confidence)`));
  console.log(chalk.gray(`   ${analysis.reasoning}`));
  if (analysis.scrumBoardCount > 0 || analysis.kanbanBoardCount > 0) {
    console.log(chalk.gray(`   Methodology: ${analysis.scrumBoardCount} Scrum boards, ${analysis.kanbanBoardCount} Kanban boards`));
  }

  // Show recommended organization
  console.log('');
  const modeDescriptions = {
    'simple': 'All items → specs/jira/',
    'by-project': 'specs/JIRA-{PROJECT}/',
    'by-board': 'specs/JIRA-{PROJECT}/{board}/',
    'hybrid': 'specs/JIRA-{PROJECT}/{board}/ (2-level)',
  };

  console.log(chalk.green(`💡 Recommended: ${modeDescriptions[structure.recommendedMode]}`));
  console.log('');

  // Let user choose
  const mode = await select<'simple' | 'by-project' | 'by-board' | 'hybrid'>({
    message: 'How do you want to organize JIRA items?',
    choices: [
      {
        name: `${structure.recommendedMode === 'simple' ? '● ' : '○ '}Simple (all items in one folder)`,
        value: 'simple',
      },
      {
        name: `${structure.recommendedMode === 'by-project' ? '● ' : '○ '}By Project (specs/JIRA-{PROJECT}/)`,
        value: 'by-project',
      },
      {
        name: `${structure.recommendedMode === 'by-board' || structure.recommendedMode === 'hybrid' ? '● ' : '○ '}By Board (specs/JIRA-{PROJECT}/{board}/) [2-level]`,
        value: 'hybrid',
      },
    ],
    default: structure.recommendedMode === 'by-board' ? 'hybrid' : structure.recommendedMode,
  });

  // Build mappings based on mode
  const mappings = new Map<string, Map<string, string>>();

  for (const project of structure.projects) {
    const projectFolder = normalizeToProjectId(project.key);
    const boardMappings = new Map<string, string>();

    if (mode === 'simple') {
      boardMappings.set('*', 'jira');
    } else if (mode === 'by-project') {
      boardMappings.set('*', `JIRA-${projectFolder}`);
    } else {
      // hybrid/by-board: each board gets its own folder
      if (project.boards.length === 0) {
        boardMappings.set('*', `JIRA-${projectFolder}/default`);
      } else {
        for (const board of project.boards) {
          const boardFolder = normalizeToProjectId(board.name);
          boardMappings.set(board.name, `JIRA-${projectFolder}/${boardFolder}`);
        }
      }
    }

    mappings.set(project.key, boardMappings);
  }

  // Show preview
  console.log(chalk.cyan('\n📁 Folder Structure Preview:\n'));
  let shown = 0;
  outer: for (const [projectKey, boardMap] of mappings) {
    for (const [, folder] of boardMap) {
      console.log(chalk.gray(`   specs/${folder}/FS-XXX/`));
      shown++;
      if (shown >= 6) {
        if (mappings.size > 3) console.log(chalk.gray('   ...'));
        break outer;
      }
    }
  }

  const confirmed = await confirm({
    message: 'Accept this organization?',
    default: true,
  });

  if (!confirmed) {
    return null;
  }

  return { mode, mappings };
}

// =============================================================================
// ADO AUTO-DETECTION
// =============================================================================

/**
 * Auto-detect ADO structure: projects and their area paths
 */
export async function detectAdoStructure(
  organization: string,
  pat: string
): Promise<AdoStructure | null> {
  const spinner = ora('Analyzing Azure DevOps structure...').start();

  try {
    // Fetch projects using ADO API directly
    const projectsUrl = `https://dev.azure.com/${organization}/_apis/projects?api-version=7.0`;
    const projectsResponse = await fetch(projectsUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!projectsResponse.ok) {
      throw new Error(`ADO API error: ${projectsResponse.status}`);
    }

    const projectsData = await projectsResponse.json() as { value: Array<{ name: string }> };
    const projects = projectsData.value || [];

    if (projects.length === 0) {
      spinner.warn('No ADO projects found');
      return null;
    }

    // For each project, fetch area paths
    const projectInfos: AdoProjectInfo[] = [];
    let totalAreaPaths = 0;

    for (const project of projects.slice(0, 10)) { // Limit to 10 projects
      try {
        const areaPaths = await fetchAreaPathsForProject(organization, project.name, pat);
        // Filter to top-level area paths only (direct children of project root)
        const topLevelPaths = areaPaths.filter(ap => {
          const parts = ap.path.split('\\');
          return parts.length === 2; // "Project\Area"
        });

        projectInfos.push({
          name: project.name,
          areaPaths: topLevelPaths,
        });
        totalAreaPaths += topLevelPaths.length;
      } catch {
        projectInfos.push({
          name: project.name,
          areaPaths: [],
        });
      }
    }

    // Analyze structure and recommend mode
    const recommendedMode = analyzeAdoStructure(projectInfos, totalAreaPaths);
    const analysis = analyzeAdoStructureDeep(projectInfos);

    spinner.succeed(`Found ${projectInfos.length} projects with ${totalAreaPaths} area paths`);

    return {
      projects: projectInfos,
      totalAreaPaths,
      recommendedMode,
      analysis,
    };
  } catch (error) {
    spinner.fail('Failed to analyze ADO structure');
    console.log(chalk.gray(`   Error: ${error instanceof Error ? error.message : String(error)}`));
    return null;
  }
}

/**
 * Analyze ADO structure and recommend organization mode
 */
function analyzeAdoStructure(
  projects: AdoProjectInfo[],
  totalAreaPaths: number
): 'simple' | 'by-project' | 'by-area' {
  const projectCount = projects.length;
  const avgAreasPerProject = totalAreaPaths / projectCount;

  // Single project
  if (projectCount === 1) {
    const areas = projects[0].areaPaths.length;
    if (areas <= 1) return 'simple';
    return 'by-area'; // Multiple area paths → area-based (2-level)
  }

  // Multiple projects
  if (avgAreasPerProject <= 1.5) {
    return 'by-project'; // Most projects have few area paths → project-based
  }

  return 'by-area'; // Multiple projects with multiple areas → 2-level
}

/**
 * Display ADO structure and get user confirmation
 */
export async function confirmAdoMapping(
  structure: AdoStructure
): Promise<AdoMappingResult | null> {
  console.log(chalk.cyan('\n📊 Detected Azure DevOps Structure:\n'));

  // Show detected structure
  for (const project of structure.projects.slice(0, 10)) {
    const areaList = project.areaPaths.length > 0
      ? project.areaPaths.map(a => a.name).join(', ')
      : '(root only)';
    console.log(chalk.white(`   ${project.name}`), chalk.gray(`(${project.areaPaths.length} areas): ${areaList}`));
  }

  if (structure.projects.length > 10) {
    console.log(chalk.gray(`   ... and ${structure.projects.length - 10} more projects`));
  }

  // Show analysis insight
  console.log('');
  const { analysis } = structure;
  const patternEmoji: Record<TeamPattern, string> = {
    'tech-stack': '🔧',
    'squad-based': '👥',
    'domain-based': '📦',
    'service-based': '⚙️',
    'feature-based': '🎯',
    'mixed': '🔀',
    'unknown': '❓',
  };
  console.log(chalk.yellow(`${patternEmoji[analysis.pattern]} Team Pattern: ${analysis.pattern} (${analysis.confidence} confidence)`));
  console.log(chalk.gray(`   ${analysis.reasoning}`));

  // Show recommended organization
  console.log('');
  const modeDescriptions = {
    'simple': 'All items → specs/ado/',
    'by-project': 'specs/{PROJECT}/',
    'by-area': 'specs/{PROJECT}/{area}/ (2-level)',
  };

  console.log(chalk.green(`💡 Recommended: ${modeDescriptions[structure.recommendedMode]}`));
  console.log('');

  // Let user choose
  const mode = await select<'simple' | 'by-project' | 'by-area'>({
    message: 'How do you want to organize ADO items?',
    choices: [
      {
        name: `${structure.recommendedMode === 'simple' ? '● ' : '○ '}Simple (all items in one folder)`,
        value: 'simple',
      },
      {
        name: `${structure.recommendedMode === 'by-project' ? '● ' : '○ '}By Project (specs/{PROJECT}/)`,
        value: 'by-project',
      },
      {
        name: `${structure.recommendedMode === 'by-area' ? '● ' : '○ '}By Area Path (specs/{PROJECT}/{area}/) [2-level]`,
        value: 'by-area',
      },
    ],
    default: structure.recommendedMode,
  });

  // Build mappings based on mode
  const mappings = new Map<string, Map<string, string>>();

  for (const project of structure.projects) {
    const projectFolder = normalizeToProjectId(project.name);
    const areaMappings = new Map<string, string>();

    if (mode === 'simple') {
      areaMappings.set('*', 'ado');
    } else if (mode === 'by-project') {
      areaMappings.set('*', projectFolder);
    } else {
      // by-area: each area path gets its own folder
      if (project.areaPaths.length === 0) {
        areaMappings.set('*', `${projectFolder}/_default`);
      } else {
        for (const area of project.areaPaths) {
          const areaFolder = normalizeToProjectId(area.name);
          areaMappings.set(area.path, `${projectFolder}/${areaFolder}`);
        }
      }
    }

    mappings.set(project.name, areaMappings);
  }

  // Show preview
  console.log(chalk.cyan('\n📁 Folder Structure Preview:\n'));
  let shown = 0;
  outer: for (const [, areaMap] of mappings) {
    for (const [, folder] of areaMap) {
      console.log(chalk.gray(`   specs/${folder}/FS-XXX/`));
      shown++;
      if (shown >= 6) {
        if (mappings.size > 3) console.log(chalk.gray('   ...'));
        break outer;
      }
    }
  }

  const confirmed = await confirm({
    message: 'Accept this organization?',
    default: true,
  });

  if (!confirmed) {
    return null;
  }

  return { mode, mappings };
}

// =============================================================================
// COORDINATOR CONFIG BUILDERS
// =============================================================================

/**
 * Build JIRA coordinator config from mapping result
 */
export function buildJiraCoordinatorConfig(
  baseConfig: { host: string; email?: string; apiToken?: string },
  mapping: JiraMappingResult
): {
  host: string;
  email?: string;
  apiToken?: string;
  mode: 'simple' | 'by-project' | 'by-board' | 'hybrid';
  projectMappings: Array<{
    projectKey: string;
    boardMappings: Array<{ boardName: string; specweaveFolder: string }>;
  }>;
} {
  const projectMappings: Array<{
    projectKey: string;
    boardMappings: Array<{ boardName: string; specweaveFolder: string }>;
  }> = [];

  for (const [projectKey, boardMap] of mapping.mappings) {
    const boardMappings: Array<{ boardName: string; specweaveFolder: string }> = [];
    for (const [boardName, folder] of boardMap) {
      boardMappings.push({ boardName, specweaveFolder: folder });
    }
    projectMappings.push({ projectKey, boardMappings });
  }

  return {
    ...baseConfig,
    mode: mapping.mode,
    projectMappings,
  };
}

/**
 * Build ADO coordinator config from mapping result
 */
export function buildAdoCoordinatorConfig(
  baseConfig: { orgUrl: string; project: string; pat?: string },
  mapping: AdoMappingResult
): {
  orgUrl: string;
  project: string;
  pat?: string;
  mode: 'simple' | 'by-project' | 'by-area';
  projectMappings: Array<{
    projectName: string;
    areaMappings: Array<{ areaPath: string; specweaveFolder: string }>;
  }>;
} {
  const projectMappings: Array<{
    projectName: string;
    areaMappings: Array<{ areaPath: string; specweaveFolder: string }>;
  }> = [];

  for (const [projectName, areaMap] of mapping.mappings) {
    const areaMappings: Array<{ areaPath: string; specweaveFolder: string }> = [];
    for (const [areaPath, folder] of areaMap) {
      areaMappings.push({ areaPath, specweaveFolder: folder });
    }
    projectMappings.push({ projectName, areaMappings });
  }

  return {
    orgUrl: baseConfig.orgUrl,
    project: baseConfig.project,
    pat: baseConfig.pat,
    mode: mapping.mode,
    projectMappings,
  };
}
