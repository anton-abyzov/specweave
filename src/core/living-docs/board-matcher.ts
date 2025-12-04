/**
 * BoardMatcher - Intelligent board/area path matching for living docs sync
 *
 * Matches increments to the correct board/area path based on:
 * - Increment title and description keywords
 * - Area path names from config
 * - ChildRepo names/teams from umbrella config
 * - Configured keywords (areaPathMapping.mappings[].keywords)
 *
 * @see ADR-0178: Intelligent Board/Area Path Matching
 */

import { existsSync } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Information about an available board/area path
 */
export interface BoardInfo {
  /** Unique identifier (area path name, childRepo id, or folder name) */
  id: string;
  /** Human-readable name */
  name: string;
  /** Source of this board info */
  source: 'areaPath' | 'areaPathMapping' | 'childRepo' | 'existing-folder' | 'multiProject';
  /** ADO profile name (if from ADO config) */
  adoProfile?: string;
  /** ADO project name (for 2-level folder structure: {project}/{areaPath}) */
  adoProject?: string;
  /** Configured keywords for matching */
  keywords?: string[];
  /** Team name (from childRepo) */
  team?: string;
  /** Full path in specs folder (if existing) */
  specsPath?: string;
}

/**
 * Result of matching an increment against boards
 */
export interface BoardMatchResult {
  /** Board identifier */
  boardId: string;
  /** Human-readable board name */
  boardName: string;
  /** Confidence score (0-100) */
  confidence: number;
  /** Terms that matched */
  matchedTerms: string[];
  /** Source of the match */
  source: BoardInfo['source'];
  /** Match type explanation */
  matchType: 'exact' | 'partial' | 'keyword' | 'fuzzy';
  /** ADO project name (for 2-level folder structure: {project}/{boardId}) */
  adoProject?: string;
}

/**
 * Decision from the matcher
 */
export interface MatchDecision {
  /** Whether user input is needed */
  needsUserInput: boolean;
  /** Reason for the decision */
  reason: string;
  /** Best match (if any) */
  bestMatch?: BoardMatchResult;
  /** All matches sorted by confidence */
  allMatches: BoardMatchResult[];
  /** Available boards (for user selection) */
  availableBoards: BoardInfo[];
}

/**
 * Configuration object structure (minimal subset)
 */
interface ConfigSubset {
  sync?: {
    profiles?: Record<string, {
      provider?: string;
      config?: {
        project?: string;
        areaPaths?: string[];
        areaPathMapping?: {
          project: string;
          mappings: Array<{
            areaPath: string;
            specweaveProject: string;
            keywords?: string[];
          }>;
        };
      };
    }>;
  };
  umbrella?: {
    enabled?: boolean;
    childRepos?: Array<{
      id: string;
      name: string;
      team?: string;
      path?: string;
    }>;
  };
  multiProject?: {
    enabled?: boolean;
    projects?: Record<string, { name?: string }>;
  };
}

export class BoardMatcher {
  private config: ConfigSubset | null = null;
  private configLoaded = false;

  constructor(
    private projectRoot: string,
    private options: { logger?: Logger } = {}
  ) {}

  private get logger(): Logger {
    return this.options.logger ?? consoleLogger;
  }

  /**
   * Load config from project root
   */
  private async loadConfig(): Promise<ConfigSubset | null> {
    if (this.configLoaded) return this.config;

    const configPath = path.join(this.projectRoot, '.specweave/config.json');
    if (!existsSync(configPath)) {
      this.configLoaded = true;
      return null;
    }

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(content);
      this.configLoaded = true;
      return this.config;
    } catch {
      this.configLoaded = true;
      return null;
    }
  }

  /**
   * Extract keywords from increment spec content
   *
   * Extracts meaningful words from:
   * - Title (# heading)
   * - Description (first paragraph)
   * - User stories (## US-XXX sections)
   * - Type field
   */
  extractIncrementKeywords(specContent: string): string[] {
    const keywords: Set<string> = new Set();

    // Extract title (first # heading)
    const titleMatch = specContent.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      this.addWordsToSet(titleMatch[1], keywords);
    }

    // Extract increment name from YAML frontmatter
    const incrementMatch = specContent.match(/^increment:\s*(.+)$/m);
    if (incrementMatch) {
      this.addWordsToSet(incrementMatch[1], keywords);
    }

    // Extract type field
    const typeMatch = specContent.match(/\*\*Type\*\*:\s*(.+)/i);
    if (typeMatch) {
      this.addWordsToSet(typeMatch[1], keywords);
    }

    // Extract description (text after ## Description or first paragraph after title)
    const descMatch = specContent.match(/##\s*Description\s*\n([\s\S]*?)(?=\n##|\n\*\*|$)/i);
    if (descMatch) {
      this.addWordsToSet(descMatch[1], keywords);
    }

    // Extract user story titles
    const usMatches = specContent.matchAll(/##\s*(?:US-\d+[:\s]+)?(.+)/g);
    for (const match of usMatches) {
      this.addWordsToSet(match[1], keywords);
    }

    // Remove common stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'for', 'and', 'nor', 'but', 'or', 'yet', 'so', 'as', 'to', 'of',
      'in', 'on', 'at', 'by', 'with', 'from', 'up', 'about', 'into',
      'through', 'during', 'before', 'after', 'above', 'below', 'between',
      'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
      'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other',
      'some', 'such', 'no', 'not', 'only', 'own', 'same', 'than', 'too',
      'very', 'just', 'also', 'now', 'new', 'user', 'feature', 'implement',
      'add', 'create', 'update', 'fix', 'bug', 'enhancement', 'story',
      'increment', 'spec', 'task', 'status', 'completed', 'pending', 'active'
    ]);

    return Array.from(keywords).filter(w => !stopWords.has(w) && w.length > 2);
  }

  /**
   * Add words from text to a Set
   */
  private addWordsToSet(text: string, set: Set<string>): void {
    // Split on non-word characters, normalize
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/[\s-]+/)
      .filter(w => w.length > 2);

    for (const word of words) {
      set.add(word);
    }

    // Also add hyphenated combinations (e.g., "clinical-insights")
    const hyphenated = text
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (hyphenated.includes('-') && hyphenated.length > 3) {
      set.add(hyphenated);
    }
  }

  /**
   * Get all available boards from config
   */
  async getAvailableBoards(): Promise<BoardInfo[]> {
    const config = await this.loadConfig();
    const boards: BoardInfo[] = [];
    const seenIds = new Set<string>();

    // 1. Check ADO area paths (both formats)
    if (config?.sync?.profiles) {
      for (const [profileName, profile] of Object.entries(config.sync.profiles)) {
        if (profile.provider !== 'ado') continue;

        // Get ADO project name for 2-level folder structure
        const adoProject = profile.config?.project
          ? this.normalizeId(profile.config.project)
          : undefined;

        // Format 1: areaPathMapping.mappings[] (with keywords)
        if (profile.config?.areaPathMapping?.mappings?.length) {
          for (const mapping of profile.config.areaPathMapping.mappings) {
            const id = this.normalizeId(mapping.specweaveProject);
            if (!seenIds.has(id)) {
              seenIds.add(id);
              boards.push({
                id,
                name: mapping.specweaveProject,
                source: 'areaPathMapping',
                adoProfile: profileName,
                adoProject,
                keywords: mapping.keywords
              });
            }
          }
        }

        // Format 2: areaPaths[] (simple list)
        if (profile.config?.areaPaths?.length) {
          for (const areaPath of profile.config.areaPaths) {
            const id = this.normalizeId(areaPath);
            if (!seenIds.has(id)) {
              seenIds.add(id);
              boards.push({
                id,
                name: areaPath,
                source: 'areaPath',
                adoProfile: profileName,
                adoProject
              });
            }
          }
        }
      }
    }

    // 2. Check umbrella childRepos
    if (config?.umbrella?.enabled && config.umbrella.childRepos?.length) {
      for (const repo of config.umbrella.childRepos) {
        const id = this.normalizeId(repo.name || repo.id);
        if (!seenIds.has(id)) {
          seenIds.add(id);
          boards.push({
            id,
            name: repo.name || repo.id,
            source: 'childRepo',
            team: repo.team
          });
        }
      }
    }

    // 3. Check multiProject.projects
    if (config?.multiProject?.enabled && config.multiProject.projects) {
      for (const [projectId, project] of Object.entries(config.multiProject.projects)) {
        const id = this.normalizeId(projectId);
        if (!seenIds.has(id)) {
          seenIds.add(id);
          boards.push({
            id,
            name: project.name || projectId,
            source: 'multiProject'
          });
        }
      }
    }

    // 4. Check existing folders in specs/
    const specsBase = path.join(this.projectRoot, '.specweave/docs/internal/specs');
    if (existsSync(specsBase)) {
      try {
        const entries = await fs.readdir(specsBase, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('FS-')) {
            const id = this.normalizeId(entry.name);
            if (!seenIds.has(id)) {
              seenIds.add(id);
              boards.push({
                id,
                name: entry.name,
                source: 'existing-folder',
                specsPath: entry.name
              });
            }
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    return boards;
  }

  /**
   * Normalize board ID to kebab-case
   */
  private normalizeId(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Match increment content against available boards
   */
  async matchIncrement(incrementId: string, specContent: string): Promise<MatchDecision> {
    const boards = await this.getAvailableBoards();
    const keywords = this.extractIncrementKeywords(specContent);

    this.logger.log(`   🔍 Extracted keywords: ${keywords.slice(0, 10).join(', ')}${keywords.length > 10 ? '...' : ''}`);

    if (boards.length === 0) {
      return {
        needsUserInput: false,
        reason: 'no-boards-configured',
        allMatches: [],
        availableBoards: []
      };
    }

    if (boards.length === 1) {
      // Single board - auto-assign
      return {
        needsUserInput: false,
        reason: 'single-board',
        bestMatch: {
          boardId: boards[0].id,
          boardName: boards[0].name,
          confidence: 100,
          matchedTerms: [],
          source: boards[0].source,
          matchType: 'exact',
          adoProject: boards[0].adoProject
        },
        allMatches: [{
          boardId: boards[0].id,
          boardName: boards[0].name,
          confidence: 100,
          matchedTerms: [],
          source: boards[0].source,
          matchType: 'exact',
          adoProject: boards[0].adoProject
        }],
        availableBoards: boards
      };
    }

    // Multiple boards - calculate matches
    const matches: BoardMatchResult[] = [];

    for (const board of boards) {
      const result = this.calculateMatch(board, keywords, incrementId);
      if (result.confidence > 0) {
        matches.push(result);
      }
    }

    // Sort by confidence (descending)
    matches.sort((a, b) => b.confidence - a.confidence);

    const bestMatch = matches[0];
    const secondBest = matches[1];

    // Decision logic
    if (!bestMatch || bestMatch.confidence === 0) {
      return {
        needsUserInput: true,
        reason: 'no-match-found',
        allMatches: matches,
        availableBoards: boards
      };
    }

    // High confidence (>80%) AND significantly better than second best
    if (bestMatch.confidence > 80 && (!secondBest || bestMatch.confidence - secondBest.confidence > 20)) {
      return {
        needsUserInput: false,
        reason: 'high-confidence-match',
        bestMatch,
        allMatches: matches,
        availableBoards: boards
      };
    }

    // Medium confidence (50-80%) OR close to second best - ask for confirmation
    if (bestMatch.confidence >= 50) {
      return {
        needsUserInput: true,
        reason: 'medium-confidence-needs-confirmation',
        bestMatch,
        allMatches: matches,
        availableBoards: boards
      };
    }

    // Low confidence (<50%) - ask user
    return {
      needsUserInput: true,
      reason: 'low-confidence',
      bestMatch,
      allMatches: matches,
      availableBoards: boards
    };
  }

  /**
   * Calculate match score for a board against keywords
   */
  private calculateMatch(board: BoardInfo, keywords: string[], incrementId: string): BoardMatchResult {
    let confidence = 0;
    const matchedTerms: string[] = [];
    let matchType: BoardMatchResult['matchType'] = 'fuzzy';

    const boardNameNormalized = this.normalizeId(board.name);
    const boardNameWords = boardNameNormalized.split('-').filter(w => w.length > 2);

    // Check for exact match in increment ID
    if (incrementId.toLowerCase().includes(boardNameNormalized)) {
      confidence += 50;
      matchedTerms.push(`increment-id:${boardNameNormalized}`);
      matchType = 'exact';
    }

    // Check each keyword against board name
    for (const keyword of keywords) {
      const keywordNorm = this.normalizeId(keyword);

      // Exact match with board name
      if (keywordNorm === boardNameNormalized) {
        confidence += 40;
        matchedTerms.push(`exact:${keyword}`);
        matchType = 'exact';
        continue;
      }

      // Keyword is part of board name (e.g., "clinical" in "clinical-insights")
      if (boardNameNormalized.includes(keywordNorm) && keywordNorm.length > 3) {
        confidence += 25;
        matchedTerms.push(`partial:${keyword}`);
        if (matchType !== 'exact') matchType = 'partial';
        continue;
      }

      // Board name word matches keyword
      for (const boardWord of boardNameWords) {
        if (boardWord === keywordNorm) {
          confidence += 20;
          matchedTerms.push(`word:${keyword}`);
          if (matchType !== 'exact' && matchType !== 'partial') matchType = 'keyword';
          break;
        }
        // Fuzzy match (singularization)
        if (this.fuzzyMatch(boardWord, keywordNorm)) {
          confidence += 10;
          matchedTerms.push(`fuzzy:${keyword}`);
          break;
        }
      }
    }

    // Check configured keywords
    if (board.keywords) {
      for (const configKeyword of board.keywords) {
        const configNorm = this.normalizeId(configKeyword);
        for (const keyword of keywords) {
          if (this.normalizeId(keyword) === configNorm) {
            confidence += 30;
            matchedTerms.push(`config-keyword:${keyword}`);
            matchType = 'keyword';
          }
        }
      }
    }

    // Check team name (from childRepo)
    if (board.team) {
      const teamNorm = this.normalizeId(board.team);
      for (const keyword of keywords) {
        if (this.normalizeId(keyword) === teamNorm) {
          confidence += 25;
          matchedTerms.push(`team:${keyword}`);
          if (matchType !== 'exact') matchType = 'partial';
        }
      }
    }

    // Cap at 100
    confidence = Math.min(confidence, 100);

    return {
      boardId: board.id,
      boardName: board.name,
      confidence,
      matchedTerms,
      source: board.source,
      matchType,
      adoProject: board.adoProject
    };
  }

  /**
   * Fuzzy match for common variations
   */
  private fuzzyMatch(a: string, b: string): boolean {
    // Singularization
    if (a + 's' === b || b + 's' === a) return true;
    if (a.replace(/s$/, '') === b.replace(/s$/, '')) return true;

    // Common variations
    const variations: Record<string, string[]> = {
      'ops': ['operations', 'operation'],
      'dev': ['development', 'developer'],
      'eng': ['engineering', 'engineer'],
      'mgmt': ['management'],
      'mgt': ['management'],
      'svc': ['service', 'services'],
      'sys': ['system', 'systems'],
      'config': ['configuration'],
      'auth': ['authentication', 'authorization'],
      'admin': ['administration', 'administrator']
    };

    for (const [abbr, full] of Object.entries(variations)) {
      if ((a === abbr && full.includes(b)) || (b === abbr && full.includes(a))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if this is a utility/cross-cutting increment that shouldn't auto-match
   */
  isUtilityIncrement(specContent: string): boolean {
    const utilityIndicators = [
      /\*\*Type\*\*:\s*utility/i,
      /\*\*Type\*\*:\s*cross-cutting/i,
      /\*\*Type\*\*:\s*infrastructure/i,
      /\*\*Type\*\*:\s*tooling/i,
      /cross-cutting/i,
      /utility\s+increment/i,
      /shared\s+infrastructure/i,
      /platform-wide/i,
      /all\s+teams/i
    ];

    return utilityIndicators.some(pattern => pattern.test(specContent));
  }
}
