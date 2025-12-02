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
      keywords
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

  // Return top 3 matches at most
  return matches.slice(0, 3);
}

/**
 * Score the match between a work item and a module
 */
function scoreMatch(
  workItem: WorkItem,
  module: ModuleInfo
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const moduleName = module.name.toLowerCase();
  const modulePathParts = module.path.toLowerCase().split('/');

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
