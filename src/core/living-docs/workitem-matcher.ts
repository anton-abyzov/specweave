/**
 * Work Item Matcher - Matches imported work items to discovered modules
 *
 * Used by Living Docs Builder to:
 * 1. Load work items from .specweave/docs/internal/specs/
 * 2. Match them to modules based on keywords and paths
 * 3. Generate priority queue for documentation focus
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import * as yaml from 'yaml';
import type { DiscoveryResult, ModuleInfo } from './discovery.js';

/**
 * Work item representation (from user story files)
 */
export interface WorkItem {
  /** ID (e.g., "US-001", "US-002E") */
  id: string;
  /** Feature ID (e.g., "FS-031") */
  featureId: string;
  /** Title */
  title: string;
  /** Description */
  description?: string;
  /** Status */
  status?: string;
  /** Priority */
  priority?: string;
  /** Original file path */
  filePath: string;
  /** External source if imported */
  externalSource?: 'github' | 'jira' | 'ado';
  /** External ID */
  externalId?: string;
  /** Keywords extracted from title and description */
  keywords: string[];
  /** Team name (extracted from folder structure or ADO area path) */
  team?: string;
  /** ADO area path (e.g., "Acme\\Inventory") */
  areaPath?: string;
}

/**
 * Match between work item and module
 */
export interface WorkItemMatch {
  /** Work item */
  workItem: WorkItem;
  /** Match score (0-100) */
  score: number;
  /** Reasons for match */
  reasons: string[];
}

/**
 * Module with matched work items
 */
export interface ModuleWorkItemMapping {
  /** Module name */
  moduleName: string;
  /** Module path */
  modulePath: string;
  /** Matched work items with scores */
  matches: WorkItemMatch[];
  /** Total work item count */
  workItemCount: number;
  /** Priority based on work item count */
  priority: 'critical' | 'high' | 'medium' | 'low';
  /** Documentation status */
  docStatus: 'complete' | 'partial' | 'none';
}

/**
 * Priority queue entry
 */
export interface PriorityQueueEntry {
  /** Module name */
  moduleName: string;
  /** Module path */
  modulePath: string;
  /** Work item count */
  workItemCount: number;
  /** Priority level */
  priority: 'critical' | 'high' | 'medium' | 'low';
  /** Top work items (up to 5) */
  topWorkItems: string[];
}

/**
 * Work item matching result
 */
export interface WorkItemMatchResult {
  /** Full mapping of modules to work items */
  moduleMap: Map<string, ModuleWorkItemMapping>;
  /** Priority queue sorted by work item count */
  priorityQueue: PriorityQueueEntry[];
  /** Work items that couldn't be matched */
  unmatchedItems: WorkItem[];
  /** Statistics */
  stats: {
    totalWorkItems: number;
    matchedWorkItems: number;
    unmatchedWorkItems: number;
    modulesWithWorkItems: number;
  };
}

/**
 * Progress callback
 */
export type MatcherProgressCallback = (
  phase: 'loading' | 'matching' | 'ranking',
  current: number,
  total: number
) => void;

/**
 * Load imported work items from specs directory
 */
export async function loadImportedWorkItems(
  projectPath: string,
  onProgress?: MatcherProgressCallback
): Promise<WorkItem[]> {
  const specsDir = path.join(projectPath, '.specweave', 'docs', 'internal', 'specs');

  if (!fs.existsSync(specsDir)) {
    return [];
  }

  const workItems: WorkItem[] = [];
  const usFiles = await findUserStoryFiles(specsDir);

  for (let i = 0; i < usFiles.length; i++) {
    onProgress?.('loading', i + 1, usFiles.length);

    try {
      const workItem = await parseUserStoryFile(usFiles[i], specsDir);
      if (workItem) {
        workItems.push(workItem);
      }
    } catch {
      // Skip files we can't parse
    }
  }

  return workItems;
}

/**
 * Find all user story markdown files recursively
 */
async function findUserStoryFiles(specsDir: string): Promise<string[]> {
  const files: string[] = [];

  function scanDir(dir: string): void {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip archive directories
        if (entry.name !== '_archive') {
          scanDir(fullPath);
        }
      } else if (entry.isFile() && entry.name.startsWith('us-') && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  scanDir(specsDir);
  return files;
}

/**
 * Parse a user story markdown file
 *
 * Enhanced for umbrella projects (v0.31.0+):
 * - Extracts team from folder structure (specs/{org}/{team}/...)
 * - Extracts areaPath from frontmatter (ADO imports include this)
 */
async function parseUserStoryFile(filePath: string, specsDir: string): Promise<WorkItem | null> {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  try {
    const frontmatter = yaml.parse(frontmatterMatch[1]) as Record<string, any>;

    // Extract feature ID from path or frontmatter
    const relativePath = path.relative(specsDir, filePath);
    const pathParts = relativePath.split(path.sep);
    const featureId = frontmatter.feature || pathParts.find(p => p.startsWith('FS-')) || 'unknown';

    // Extract description from content
    const descMatch = content.match(/\*\*As a\*\*[\s\S]*?\*\*So that\*\*.*/);
    const description = descMatch ? descMatch[0] : frontmatter.description || '';

    // Extract keywords from title and description
    const keywords = extractKeywords(
      (frontmatter.title || '') + ' ' + description
    );

    // ==================================================
    // UMBRELLA-SPECIFIC EXTRACTION (v0.31.0+)
    // ==================================================

    // Extract team from folder structure: specs/{org}/{team}/FS-XXX/...
    // pathParts example: ["acme", "inventory", "FS-001", "us-001.md"]
    let team: string | undefined;
    if (pathParts.length >= 2) {
      // Skip if first part looks like a feature ID (non-umbrella structure)
      const potentialTeam = pathParts[1];
      if (potentialTeam && !potentialTeam.startsWith('FS-') && !potentialTeam.startsWith('us-')) {
        team = potentialTeam;
      }
    }

    // Extract areaPath from frontmatter (ADO imports include this)
    // Common frontmatter keys: area_path, areaPath, area, system_area_path
    const areaPath: string | undefined =
      frontmatter.area_path ||
      frontmatter.areaPath ||
      frontmatter.system_area_path ||
      frontmatter.area ||
      undefined;

    // If no team from folder but we have areaPath, derive team from it
    if (!team && areaPath) {
      const areaSegments = areaPath
        .replace(/\\\\/g, '\\')
        .split('\\')
        .filter((s: string) => s.length > 0);
      // Second segment is usually the team (after org)
      if (areaSegments.length >= 2) {
        team = areaSegments[1];
      } else if (areaSegments.length === 1) {
        team = areaSegments[0];
      }
    }

    return {
      id: frontmatter.id || 'unknown',
      featureId,
      title: frontmatter.title || '',
      description,
      status: frontmatter.status,
      priority: frontmatter.priority,
      filePath,
      externalSource: frontmatter.external_source,
      externalId: frontmatter.external_id,
      keywords,
      team,
      areaPath
    };
  } catch {
    return null;
  }
}

/**
 * Extract meaningful keywords from text
 */
function extractKeywords(text: string): string[] {
  // Common words to skip
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can',
    'that', 'which', 'who', 'whom', 'this', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'so', 'want',
    'user', 'system', 'feature', 'when', 'then', 'given'
  ]);

  // Tokenize and normalize
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(word =>
      word.length > 2 &&
      !stopWords.has(word) &&
      !/^\d+$/.test(word)
    );

  // Deduplicate
  return [...new Set(words)];
}

/**
 * Match work items to discovered modules
 */
export async function matchWorkItemsToModules(
  projectPath: string,
  discovery: DiscoveryResult,
  workItems: WorkItem[],
  onProgress?: MatcherProgressCallback
): Promise<WorkItemMatchResult> {
  const moduleMap = new Map<string, ModuleWorkItemMapping>();
  const unmatchedItems: WorkItem[] = [];

  // Initialize module map
  for (const module of discovery.modules) {
    moduleMap.set(module.name, {
      moduleName: module.name,
      modulePath: module.path,
      matches: [],
      workItemCount: 0,
      priority: 'low',
      docStatus: module.hasReadme ? 'partial' : 'none'
    });
  }

  // Match each work item
  for (let i = 0; i < workItems.length; i++) {
    onProgress?.('matching', i + 1, workItems.length);

    const workItem = workItems[i];
    const matches = findModuleMatches(workItem, discovery.modules);

    if (matches.length === 0) {
      unmatchedItems.push(workItem);
    } else {
      // Add to all matching modules (item can match multiple)
      for (const match of matches) {
        const mapping = moduleMap.get(match.moduleName);
        if (mapping) {
          mapping.matches.push({
            workItem,
            score: match.score,
            reasons: match.reasons
          });
          mapping.workItemCount++;
        }
      }
    }
  }

  // Calculate priorities
  onProgress?.('ranking', 0, moduleMap.size);
  for (const mapping of moduleMap.values()) {
    mapping.priority = calculatePriority(mapping.workItemCount);
  }

  // Build priority queue
  const priorityQueue = buildPriorityQueue(moduleMap);

  // Calculate stats
  const matchedWorkItems = workItems.length - unmatchedItems.length;
  const modulesWithWorkItems = [...moduleMap.values()].filter(m => m.workItemCount > 0).length;

  return {
    moduleMap,
    priorityQueue,
    unmatchedItems,
    stats: {
      totalWorkItems: workItems.length,
      matchedWorkItems,
      unmatchedWorkItems: unmatchedItems.length,
      modulesWithWorkItems
    }
  };
}

/**
 * Find matching modules for a work item
 */
function findModuleMatches(
  workItem: WorkItem,
  modules: ModuleInfo[]
): Array<{ moduleName: string; score: number; reasons: string[] }> {
  const matches: Array<{ moduleName: string; score: number; reasons: string[] }> = [];

  for (const module of modules) {
    const result = scoreMatch(workItem, module);
    if (result.score >= 20) { // Minimum threshold
      matches.push({
        moduleName: module.name,
        score: result.score,
        reasons: result.reasons
      });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  // For umbrella projects, work items may legitimately match multiple related repos
  // (e.g., assetcare-fe, assetcare-be, assetcare-api for the same team).
  // Keep all matches with score >= 50 (high confidence), but limit lower scores to top 3
  const highConfidenceThreshold = 50;

  if (matches.length <= 3) {
    return matches;
  }

  // If we have more than 3 matches, keep all high-confidence ones plus top 3 overall
  const highConfidence = matches.filter(m => m.score >= highConfidenceThreshold);
  if (highConfidence.length >= 3) {
    return highConfidence;
  }

  // Otherwise, return top 3
  return matches.slice(0, 3);
}

/**
 * Score the match between a work item and a module
 *
 * Enhanced for umbrella projects (v0.31.0+):
 * - Area path matching: "Acme\\Inventory" → "inventory-*"
 * - Team prefix matching: team "inventory" → repo "inventory-fe"
 * - File path structure: specs/acme/inventory/ → inventory repos
 */
function scoreMatch(
  workItem: WorkItem,
  module: ModuleInfo
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const moduleName = module.name.toLowerCase();
  const modulePathParts = module.path.toLowerCase().split('/');

  // ==================================================
  // UMBRELLA-SPECIFIC MATCHING (v0.31.0+)
  // ==================================================

  // 1. Area path matching (highest priority for ADO imports)
  if (workItem.areaPath) {
    const areaPathScore = scoreAreaPathMatch(workItem.areaPath, moduleName, module.path);
    if (areaPathScore.score > 0) {
      score += areaPathScore.score;
      reasons.push(...areaPathScore.reasons);
    }
  }

  // 2. Team-based matching
  if (workItem.team) {
    const teamScore = scoreTeamMatch(workItem.team, moduleName, module.path);
    if (teamScore.score > 0) {
      score += teamScore.score;
      reasons.push(...teamScore.reasons);
    }
  }

  // 3. File path structure matching (specs/org/team/ → org/team-*)
  const filePathScore = scoreFilePathMatch(workItem.filePath, moduleName, module.path);
  if (filePathScore.score > 0) {
    score += filePathScore.score;
    reasons.push(...filePathScore.reasons);
  }

  // ==================================================
  // STANDARD MATCHING (existing logic)
  // ==================================================

  // Check title match
  const titleLower = workItem.title.toLowerCase();
  if (titleLower.includes(moduleName)) {
    score += 40;
    reasons.push(`title contains "${moduleName}"`);
  }

  // Check path segment match
  for (const part of modulePathParts) {
    if (part.length > 2 && titleLower.includes(part)) {
      score += 20;
      reasons.push(`title contains path segment "${part}"`);
      break;
    }
  }

  // Check keyword matches
  for (const keyword of workItem.keywords) {
    // Direct module name match
    if (keyword === moduleName) {
      score += 30;
      reasons.push(`keyword match: ${keyword}`);
    }
    // Partial module name match (e.g., "auth" in "authentication")
    else if (moduleName.includes(keyword) || keyword.includes(moduleName)) {
      score += 15;
      reasons.push(`partial keyword match: ${keyword}`);
    }
    // Path segment match
    else if (modulePathParts.some(p => p === keyword)) {
      score += 20;
      reasons.push(`path keyword match: ${keyword}`);
    }
  }

  // Check description if available
  if (workItem.description) {
    const descLower = workItem.description.toLowerCase();
    if (descLower.includes(moduleName)) {
      score += 15;
      reasons.push(`description contains "${moduleName}"`);
    }
  }

  // Cap score at 100
  score = Math.min(score, 100);

  return { score, reasons };
}

/**
 * Score area path match (v0.31.0+ / Enhanced v0.31.1+)
 *
 * ADO area paths like "Acme\\Inventory\\Feature" should match
 * repos like "inventory-fe", "inventory-be", "inv-api", "inventory_service"
 *
 * Uses smart fuzzy matching to handle:
 * - Different naming conventions (camelCase, kebab-case, etc.)
 * - Acronyms (AssetCare → AC)
 * - Common abbreviations (service → svc, frontend → fe)
 */
function scoreAreaPathMatch(
  areaPath: string,
  moduleName: string,
  modulePath: string
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Parse area path segments (handle both \\ and \ separators)
  const areaSegments = areaPath
    .replace(/\\\\/g, '\\')
    .split('\\')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (areaSegments.length === 0) {
    return { score: 0, reasons: [] };
  }

  // The team/project is usually the 2nd segment (after org)
  // e.g., "Acme\\Inventory" → "Inventory"
  const teamFromArea = areaSegments.length >= 2
    ? areaSegments[1]
    : areaSegments[0];

  // Use smart fuzzy matching
  const fuzzyResult = smartFuzzyMatch(teamFromArea, moduleName);

  if (fuzzyResult.score > 0) {
    // Scale the score based on match quality
    if (fuzzyResult.confidence === 'high') {
      score += Math.round(fuzzyResult.score * 0.7); // Up to 70 points
      reasons.push(`area path "${teamFromArea}" → "${moduleName}" (${fuzzyResult.matchType}, high confidence)`);
    } else if (fuzzyResult.confidence === 'medium') {
      score += Math.round(fuzzyResult.score * 0.5); // Up to 50 points
      reasons.push(`area path "${teamFromArea}" ~ "${moduleName}" (${fuzzyResult.matchType}, medium confidence)`);
    } else {
      score += Math.round(fuzzyResult.score * 0.3); // Up to 30 points
      reasons.push(`area path "${teamFromArea}" ~? "${moduleName}" (${fuzzyResult.matchType}, low confidence)`);
    }
  }

  // Also check module path for org/team structure
  const pathSegments = modulePath.toLowerCase().split('/');
  const teamLower = teamFromArea.toLowerCase();
  const teamTokens = tokenize(teamFromArea);

  for (const seg of pathSegments) {
    const segFuzzy = smartFuzzyMatch(teamFromArea, seg);
    if (segFuzzy.score >= 50) {
      score += 15;
      reasons.push(`module path segment "${seg}" matches area team`);
      break;
    }
  }

  return { score, reasons };
}

/**
 * Score team-based match (v0.31.0+ / Enhanced v0.31.1+)
 *
 * Uses smart fuzzy matching to handle team name variations:
 * - "DataPlatform" → "data-platform-api", "dp-service", "dataplatform-be"
 * - "UserMgmt" → "user-management-fe", "um-api"
 */
function scoreTeamMatch(
  team: string,
  moduleName: string,
  modulePath: string
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Use smart fuzzy matching
  const fuzzyResult = smartFuzzyMatch(team, moduleName);

  if (fuzzyResult.score > 0) {
    if (fuzzyResult.confidence === 'high') {
      score += Math.round(fuzzyResult.score * 0.6); // Up to 60 points
      reasons.push(`team "${team}" → "${moduleName}" (${fuzzyResult.matchType}, high confidence)`);
    } else if (fuzzyResult.confidence === 'medium') {
      score += Math.round(fuzzyResult.score * 0.4); // Up to 40 points
      reasons.push(`team "${team}" ~ "${moduleName}" (${fuzzyResult.matchType}, medium confidence)`);
    } else {
      score += Math.round(fuzzyResult.score * 0.25); // Up to 25 points
      reasons.push(`team "${team}" ~? "${moduleName}" (${fuzzyResult.matchType}, low confidence)`);
    }
  }

  return { score, reasons };
}

/**
 * Score file path structure match (v0.31.0+ / Enhanced v0.31.1+)
 *
 * Work item at specs/acme/inventory/FS-001/ should match
 * repos at acme/inventory-*, acme/inv-*, inventory-*
 *
 * Uses smart fuzzy matching for flexible team-to-module mapping
 */
function scoreFilePathMatch(
  filePath: string,
  moduleName: string,
  modulePath: string
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Extract team folder from file path
  // Pattern: .specweave/docs/internal/specs/{org}/{team}/...
  const specsMatch = filePath.match(/specs[/\\]([^/\\]+)[/\\]([^/\\]+)/);
  if (!specsMatch) {
    return { score: 0, reasons: [] };
  }

  const [, org, team] = specsMatch;

  // Check if module path starts with org (using fuzzy match)
  const pathSegments = modulePath.split('/');
  if (pathSegments.length > 0) {
    const orgFuzzy = smartFuzzyMatch(org, pathSegments[0]);
    if (orgFuzzy.score >= 50) {
      score += 15;
      reasons.push(`module path org matches "${org}"`);
    }
  }

  // Use smart fuzzy matching for team → module
  const fuzzyResult = smartFuzzyMatch(team, moduleName);

  if (fuzzyResult.score > 0) {
    if (fuzzyResult.confidence === 'high') {
      score += Math.round(fuzzyResult.score * 0.4); // Up to 40 points
      reasons.push(`specs folder "${team}" → "${moduleName}" (${fuzzyResult.matchType})`);
    } else if (fuzzyResult.confidence === 'medium') {
      score += Math.round(fuzzyResult.score * 0.25); // Up to 25 points
      reasons.push(`specs folder "${team}" ~ "${moduleName}" (${fuzzyResult.matchType})`);
    } else {
      score += Math.round(fuzzyResult.score * 0.15); // Up to 15 points
      reasons.push(`specs folder "${team}" ~? "${moduleName}" (${fuzzyResult.matchType})`);
    }
  }

  return { score, reasons };
}

// ==================================================
// SMART FUZZY MATCHING ENGINE (v0.31.1+)
// ==================================================

/**
 * Common abbreviation mappings for enterprise naming
 */
const ABBREVIATION_MAP: Record<string, string[]> = {
  // Component type abbreviations
  'fe': ['frontend', 'front', 'ui', 'web', 'client'],
  'be': ['backend', 'back', 'server', 'srv'],
  'api': ['service', 'svc', 'rest', 'gateway', 'gw'],
  'db': ['database', 'data', 'store', 'storage'],
  'ui': ['frontend', 'fe', 'web', 'client', 'app'],
  'svc': ['service', 'api', 'srv', 'microservice', 'ms'],
  'srv': ['service', 'server', 'svc'],
  'gw': ['gateway', 'api', 'proxy'],
  'ms': ['microservice', 'service', 'svc'],
  'lib': ['library', 'common', 'shared', 'core'],
  'pkg': ['package', 'lib', 'module'],
  'mgr': ['manager', 'management', 'admin'],
  'mgmt': ['management', 'manager', 'admin'],  // Added mgmt
  'admin': ['administration', 'mgmt', 'management'],
  'auth': ['authentication', 'authorization', 'identity', 'idp'],
  'msg': ['messaging', 'message', 'queue', 'mq'],
  'mq': ['messagequeue', 'messaging', 'queue', 'rabbit', 'kafka'],
  'cfg': ['config', 'configuration', 'settings'],
  'infra': ['infrastructure', 'platform', 'devops', 'ops'],
  'mon': ['monitoring', 'observability', 'metrics', 'telemetry'],
  'log': ['logging', 'logs', 'audit'],
  'notif': ['notification', 'notifications', 'alerts'],
  'inv': ['inventory', 'stock', 'warehouse'],
  'fin': ['finance', 'financial', 'billing', 'payment'],
  'hr': ['humanresources', 'people', 'employee'],
  'crm': ['customerrelations', 'customer', 'sales'],
  'erp': ['enterprise', 'business', 'core'],
  // Add reverse mappings for common full words
  'management': ['mgmt', 'mgr'],
  'manager': ['mgr', 'mgmt'],
  'frontend': ['fe', 'ui', 'web'],
  'backend': ['be', 'srv', 'server'],
  'service': ['svc', 'srv', 'api'],
};

/**
 * Reverse lookup: full word → abbreviations
 */
const REVERSE_ABBREV_MAP: Record<string, string[]> = {};
for (const [abbrev, fullWords] of Object.entries(ABBREVIATION_MAP)) {
  for (const word of fullWords) {
    if (!REVERSE_ABBREV_MAP[word]) {
      REVERSE_ABBREV_MAP[word] = [];
    }
    REVERSE_ABBREV_MAP[word].push(abbrev);
  }
}

/**
 * Common suffixes to strip from target for core matching (P1 fix from judge review)
 * Using Set for O(1) lookup instead of array recreation per call
 */
const CORE_SUFFIXES = new Set([
  'fe', 'be', 'api', 'web', 'mobile', 'backend', 'frontend',
  'service', 'srv', 'app', 'worker', 'job', 'cron', 'portal',
  'admin', 'engine', 'sync', 'analytics', 'data'
]);

/**
 * Tokenize a string into words
 * Handles: camelCase, PascalCase, kebab-case, snake_case, spaces, ALL_CAPS
 *
 * "AssetCare" → ["asset", "care"]
 * "data-platform-api" → ["data", "platform", "api"]
 * "user_management_service" → ["user", "management", "service"]
 * "CRM" → ["crm"] (short all-caps stays as one token)
 * "CRMPortal" → ["crm", "portal"]
 */
function tokenize(str: string): string[] {
  // Handle short all-caps strings (3-4 chars) as single token
  if (/^[A-Z]{2,4}$/.test(str)) {
    return [str.toLowerCase()];
  }

  return str
    // Handle all-caps followed by lowercase (CRMPortal → CRM Portal)
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1 $2')
    // Insert space before uppercase letters (camelCase/PascalCase)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Replace separators with spaces
    .replace(/[-_]+/g, ' ')
    // Split and filter
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * Generate acronym from words
 * ["asset", "care"] → "ac"
 * ["data", "platform"] → "dp"
 */
function generateAcronym(words: string[]): string {
  return words
    .map(w => w.charAt(0))
    .join('')
    .toLowerCase();
}

/**
 * Calculate word overlap score between two token arrays
 * Returns 0-100 based on how many words match
 */
function calculateWordOverlap(tokens1: string[], tokens2: string[]): number {
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  let matches = 0;
  const used = new Set<number>();

  for (const t1 of tokens1) {
    for (let i = 0; i < tokens2.length; i++) {
      if (used.has(i)) continue;

      const t2 = tokens2[i];
      if (
        t1 === t2 ||
        wordsAreSimilar(t1, t2)
      ) {
        matches++;
        used.add(i);
        break;
      }
    }
  }

  // Score based on proportion of matches
  const maxTokens = Math.max(tokens1.length, tokens2.length);
  return Math.round((matches / maxTokens) * 100);
}

/**
 * Check if two words are similar (abbreviation match, fuzzy match, or prefix)
 */
function wordsAreSimilar(word1: string, word2: string): boolean {
  // Exact match
  if (word1 === word2) return true;

  // One is abbreviation of the other
  if (ABBREVIATION_MAP[word1]?.includes(word2)) return true;
  if (ABBREVIATION_MAP[word2]?.includes(word1)) return true;
  if (REVERSE_ABBREV_MAP[word1]?.includes(word2)) return true;
  if (REVERSE_ABBREV_MAP[word2]?.includes(word1)) return true;

  // Prefix match (at least 3 chars)
  if (word1.length >= 3 && word2.length >= 3) {
    if (word1.startsWith(word2) || word2.startsWith(word1)) return true;
  }

  // Fuzzy match using Levenshtein distance
  // Allow 1 edit for short words, 2 for longer
  const maxDistance = Math.max(word1.length, word2.length) <= 5 ? 1 : 2;
  if (levenshteinDistance(word1, word2) <= maxDistance) return true;

  return false;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Quick checks
  if (m === 0) return n;
  if (n === 0) return m;
  if (str1 === str2) return 0;

  // Use two-row optimization for memory efficiency
  let prevRow = Array.from({ length: n + 1 }, (_, i) => i);
  let currRow = new Array(n + 1);

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;

    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,      // deletion
        currRow[j - 1] + 1,  // insertion
        prevRow[j - 1] + cost // substitution
      );
    }

    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[n];
}

/**
 * Smart fuzzy match between area path/team and module name
 *
 * Handles:
 * - "AssetCare" → "assetcare-fe", "asset-care-api", "ac-service"
 * - "DataPlatform" → "data-platform-be", "dp-api", "dataplatform-worker"
 * - "UserManagement" → "user-mgmt-svc", "um-api", "usermanagement-fe"
 */
function smartFuzzyMatch(
  source: string,
  target: string
): { score: number; matchType: string; confidence: 'high' | 'medium' | 'low' } {
  // Guard against empty strings (P1 fix from judge review)
  if (!source || !target) {
    return { score: 0, matchType: 'none', confidence: 'low' };
  }

  const sourceTokens = tokenize(source);
  const targetTokens = tokenize(target);

  // Filter out common suffixes from target for core matching
  const targetCoreTokens = targetTokens.filter(t => !CORE_SUFFIXES.has(t));

  // Handle short source strings (like "CRM", "ERP") - they should match as prefixes
  const sourceJoined = sourceTokens.join('');
  const targetCoreJoined = targetCoreTokens.join('');
  const targetFullJoined = targetTokens.join('');

  // Short source (2-4 chars) should match if target starts with it
  if (sourceJoined.length >= 2 && sourceJoined.length <= 4) {
    if (targetFullJoined.startsWith(sourceJoined) || targetCoreJoined.startsWith(sourceJoined)) {
      return { score: 90, matchType: 'short-prefix', confidence: 'high' };
    }
    if (targetFullJoined.includes(sourceJoined)) {
      return { score: 70, matchType: 'short-contains', confidence: 'medium' };
    }
    // Also check original target (before tokenization) for no-separator cases like "crmapi"
    const targetLower = target.toLowerCase();
    if (targetLower.startsWith(sourceJoined)) {
      return { score: 85, matchType: 'raw-prefix', confidence: 'high' };
    }
  }

  // 1. Check for exact token match (after normalization)
  if (sourceJoined === targetCoreJoined) {
    return { score: 100, matchType: 'exact', confidence: 'high' };
  }

  // 2. Check for acronym match
  const sourceAcronym = generateAcronym(sourceTokens);
  const targetAcronym = generateAcronym(targetCoreTokens);

  // Source acronym matches target start (e.g., "AC" matches "ac-service")
  if (sourceAcronym.length >= 2 && targetCoreJoined.startsWith(sourceAcronym)) {
    return { score: 85, matchType: 'acronym-prefix', confidence: 'high' };
  }

  // Target is the acronym (e.g., target "ac" matches source "AssetCare")
  if (targetCoreJoined === sourceAcronym && sourceAcronym.length >= 2) {
    return { score: 80, matchType: 'acronym-exact', confidence: 'high' };
  }

  // 3. Check word overlap with abbreviation expansion
  const wordOverlap = calculateWordOverlap(sourceTokens, targetCoreTokens);

  if (wordOverlap >= 80) {
    return { score: 75, matchType: 'word-overlap-high', confidence: 'high' };
  }

  if (wordOverlap >= 50) {
    return { score: 55, matchType: 'word-overlap-medium', confidence: 'medium' };
  }

  // 4. Check if source is prefix of target (after removing separators)
  if (targetCoreJoined.startsWith(sourceJoined)) {
    return { score: 70, matchType: 'prefix', confidence: 'high' };
  }

  // 5. Check if target contains source
  if (targetCoreJoined.includes(sourceJoined) && sourceJoined.length >= 4) {
    return { score: 50, matchType: 'contains', confidence: 'medium' };
  }

  // 6. Fuzzy string similarity for the whole string
  const distance = levenshteinDistance(sourceJoined, targetCoreJoined);
  const maxLen = Math.max(sourceJoined.length, targetCoreJoined.length);
  const similarity = maxLen > 0 ? (1 - distance / maxLen) * 100 : 0;

  if (similarity >= 80) {
    return { score: 60, matchType: 'fuzzy-high', confidence: 'medium' };
  }

  if (similarity >= 60) {
    return { score: 40, matchType: 'fuzzy-medium', confidence: 'low' };
  }

  // 7. Partial word match (at least one significant word matches)
  if (wordOverlap >= 30 && sourceTokens.length >= 2) {
    return { score: 30, matchType: 'word-overlap-low', confidence: 'low' };
  }

  return { score: 0, matchType: 'none', confidence: 'low' };
}

/**
 * Normalize team name for matching (legacy, kept for compatibility)
 */
function normalizeTeamName(team: string): string {
  return team
    .toLowerCase()
    .replace(/[_\s-]+/g, '') // Remove separators
    .replace(/team$/i, '')   // Remove "team" suffix
    .trim();
}

/**
 * Normalize module name for matching (legacy, kept for compatibility)
 */
function normalizeModuleName(name: string): string {
  return name
    .toLowerCase()
    .replace(/-fe$/, '')
    .replace(/-be$/, '')
    .replace(/-api$/, '')
    .replace(/-web$/, '')
    .replace(/-mobile$/, '')
    .replace(/-backend$/, '')
    .replace(/-frontend$/, '')
    .replace(/-service$/, '')
    .replace(/-srv$/, '')
    .replace(/-app$/, '')
    .trim();
}

/**
 * Calculate priority based on work item count
 */
function calculatePriority(count: number): 'critical' | 'high' | 'medium' | 'low' {
  if (count >= 20) return 'critical';
  if (count >= 10) return 'high';
  if (count >= 5) return 'medium';
  return 'low';
}

/**
 * Build priority queue from module map
 */
function buildPriorityQueue(
  moduleMap: Map<string, ModuleWorkItemMapping>
): PriorityQueueEntry[] {
  const entries: PriorityQueueEntry[] = [];

  for (const mapping of moduleMap.values()) {
    // Get top work items (highest scoring)
    const topMatches = [...mapping.matches]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    entries.push({
      moduleName: mapping.moduleName,
      modulePath: mapping.modulePath,
      workItemCount: mapping.workItemCount,
      priority: mapping.priority,
      topWorkItems: topMatches.map(m => m.workItem.title)
    });
  }

  // Sort by work item count descending
  entries.sort((a, b) => b.workItemCount - a.workItemCount);

  return entries;
}

/**
 * Save work item matching results to files
 */
export async function saveMatchingResults(
  projectPath: string,
  result: WorkItemMatchResult
): Promise<string[]> {
  const outputDir = path.join(projectPath, '.specweave', 'docs', 'internal', 'architecture');
  fs.ensureDirSync(outputDir);

  const savedFiles: string[] = [];

  // Convert Map to serializable object
  const moduleMapObj: Record<string, ModuleWorkItemMapping> = {};
  for (const [key, value] of result.moduleMap) {
    moduleMapObj[key] = {
      ...value,
      // Simplify matches for JSON
      matches: value.matches.map(m => ({
        workItem: {
          id: m.workItem.id,
          featureId: m.workItem.featureId,
          title: m.workItem.title,
          status: m.workItem.status,
          priority: m.workItem.priority
        },
        score: m.score,
        reasons: m.reasons
      })) as WorkItemMatch[]
    };
  }

  // Save module-workitem-map.json
  const mapPath = path.join(outputDir, 'module-workitem-map.json');
  fs.writeFileSync(mapPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    stats: result.stats,
    modules: moduleMapObj,
    unmatchedItems: result.unmatchedItems.map(i => ({
      id: i.id,
      featureId: i.featureId,
      title: i.title,
      keywords: i.keywords.slice(0, 10)
    }))
  }, null, 2));
  savedFiles.push(mapPath);

  // Save priority-queue.json
  const queuePath = path.join(outputDir, 'priority-queue.json');
  fs.writeFileSync(queuePath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    summary: {
      criticalModules: result.priorityQueue.filter(e => e.priority === 'critical').length,
      highModules: result.priorityQueue.filter(e => e.priority === 'high').length,
      mediumModules: result.priorityQueue.filter(e => e.priority === 'medium').length,
      lowModules: result.priorityQueue.filter(e => e.priority === 'low').length
    },
    queue: result.priorityQueue
  }, null, 2));
  savedFiles.push(queuePath);

  return savedFiles;
}

/**
 * Get match reason as human-readable string
 */
export function getMatchReason(match: WorkItemMatch): string {
  if (match.reasons.length === 0) {
    return 'generic match';
  }
  return match.reasons.slice(0, 3).join(', ');
}
