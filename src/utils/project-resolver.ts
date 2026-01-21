/**
 * Project Resolver
 *
 * Smart utility that auto-resolves project/board for user stories
 * based on context analysis:
 * - Single project → auto-select
 * - Keyword matching → suggest with confidence
 * - Cross-cutting detection → split across projects
 * - Learned patterns from existing specs
 *
 * Part of increment 0137: Per-US Project/Board Enforcement
 *
 * @module utils/project-resolver
 * @since v0.34.0
 */

import * as fs from './fs-native.js';
import * as path from 'path';
import { detectStructureLevel, type StructureLevelConfig, type ProjectInfo, type BoardInfo } from './structure-level-detector.js';
import { Logger, consoleLogger } from './logger.js';
import { CrossCuttingDetector, type CrossCuttingResult, type DetectedPattern } from './cross-cutting-detector.js';

/**
 * Resolution result for a single user story
 */
export interface ProjectResolution {
  /** Whether project was successfully resolved */
  resolved: boolean;

  /** Resolved project ID (if resolved) */
  projectId?: string;

  /** Resolved board ID (for 2-level structures) */
  boardId?: string;

  /** Confidence level */
  confidence: 'high' | 'medium' | 'low';

  /** Reason for resolution decision */
  reason: string;

  /** Keywords that matched (if any) */
  matchedKeywords?: string[];
}

/**
 * Resolution result for an entire increment
 */
export interface IncrementResolution {
  /** Whether this is a cross-project increment */
  isCrossProject: boolean;

  /** Default project for USs without explicit assignment */
  defaultProject: string;

  /** Default board for 2-level (optional) */
  defaultBoard?: string;

  /** Suggested project for each US type */
  suggestions: Map<string, ProjectResolution>;

  /** Structure level detected */
  structureLevel: 1 | 2;

  /** Cross-cutting detection result (when detected) */
  crossCuttingResult?: CrossCuttingResult;

  /** Detected patterns for display/logging */
  detectedPatterns?: DetectedPattern[];
}

/**
 * Keyword patterns for project detection
 */
interface KeywordPatterns {
  /** Project ID to keyword list mapping */
  projectKeywords: Record<string, string[]>;

  /** Board ID to keyword list mapping (2-level) */
  boardKeywords?: Record<string, string[]>;
}

/**
 * Default keyword patterns for common project types
 */
const DEFAULT_KEYWORD_PATTERNS: Record<string, string[]> = {
  // Frontend patterns
  frontend: [
    'ui', 'form', 'button', 'page', 'component', 'react', 'vue', 'angular', 'next.js',
    'css', 'style', 'responsive', 'chart', 'dashboard', 'view', 'modal', 'widget',
    'tailwind', 'material-ui', 'recharts', 'user interface', 'client', 'browser'
  ],
  // Backend patterns
  backend: [
    'api', 'endpoint', 'rest', 'graphql', 'database', 'query', 'migration', 'service',
    'controller', 'authentication', 'jwt', 'session', 'middleware', 'crud',
    'redis', 'postgresql', 'mongodb', 'microservice', 'server', 'lambda'
  ],
  // Mobile patterns
  mobile: [
    'mobile', 'ios', 'android', 'react native', 'flutter', 'expo', 'app', 'native',
    'push notification', 'offline', 'asyncstorage', 'screen', 'touch', 'gesture'
  ],
  // Infrastructure patterns
  infrastructure: [
    'deploy', 'ci/cd', 'docker', 'kubernetes', 'terraform', 'monitoring',
    'logging', 'pipeline', 'aws', 'azure', 'gcp', 'nginx', 'helm', 'argocd'
  ],
  // Shared/common patterns
  shared: [
    'types', 'interfaces', 'utilities', 'validators', 'shared', 'common', 'library',
    'sdk', 'models', 'constants', 'helpers', 'utils'
  ]
};

/**
 * Board-level keyword patterns (for 2-level structures)
 */
const DEFAULT_BOARD_KEYWORDS: Record<string, string[]> = {
  analytics: ['analytics', 'metrics', 'kpi', 'dashboard', 'report', 'chart', 'graph'],
  'user-management': ['user', 'auth', 'login', 'registration', 'profile', 'permissions', 'roles'],
  integrations: ['integration', 'webhook', 'api', 'third-party', 'sync', 'import', 'export'],
  payments: ['payment', 'billing', 'subscription', 'invoice', 'stripe', 'checkout'],
  notifications: ['notification', 'alert', 'email', 'sms', 'push', 'messaging'],
  devops: ['deploy', 'infrastructure', 'monitoring', 'ci/cd', 'pipeline']
};

/**
 * Project Resolver
 *
 * Resolves project/board context for user stories based on:
 * 1. Single project auto-selection
 * 2. Learned patterns from existing specs
 * 3. Keyword-based matching
 * 4. Cross-cutting detection
 */
export class ProjectResolver {
  private projectRoot: string;
  private logger: Logger;
  private structureConfig: StructureLevelConfig;
  private learnedPatterns: Map<string, string> = new Map();
  private keywordPatterns: KeywordPatterns;
  private crossCuttingDetector: CrossCuttingDetector;

  constructor(projectRoot: string, options: { logger?: Logger } = {}) {
    this.projectRoot = projectRoot;
    this.logger = options.logger ?? consoleLogger;
    this.structureConfig = detectStructureLevel(projectRoot);
    this.keywordPatterns = {
      projectKeywords: { ...DEFAULT_KEYWORD_PATTERNS },
      boardKeywords: { ...DEFAULT_BOARD_KEYWORDS }
    };

    // Initialize cross-cutting detector with custom mappings from actual projects
    const customMappings: Record<string, string[]> = {};
    for (const project of this.structureConfig.projects) {
      // Map project ID and name to itself
      customMappings[project.id] = [project.id.toLowerCase()];
      if (project.name && project.name !== project.id) {
        customMappings[project.id].push(project.name.toLowerCase());
      }
    }
    this.crossCuttingDetector = new CrossCuttingDetector({
      logger: this.logger,
      customMappings
    });
  }

  /**
   * Get structure level (1 or 2)
   */
  getStructureLevel(): 1 | 2 {
    return this.structureConfig.level;
  }

  /**
   * Get available projects
   */
  getProjects(): ProjectInfo[] {
    return this.structureConfig.projects;
  }

  /**
   * Get boards for a project (2-level only)
   */
  getBoards(projectId: string): BoardInfo[] {
    return this.structureConfig.boardsByProject?.[projectId] ?? [];
  }

  /**
   * Learn keyword patterns from existing spec.md files
   */
  async learnFromExistingSpecs(): Promise<void> {
    const incrementsPath = path.join(this.projectRoot, '.specweave/increments');

    if (!fs.existsSync(incrementsPath)) {
      return;
    }

    try {
      const entries = fs.readdirSync(incrementsPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('_')) continue;

        const specPath = path.join(incrementsPath, entry.name, 'spec.md');

        if (!fs.existsSync(specPath)) continue;

        try {
          const content = fs.readFileSync(specPath, 'utf-8');
          this.extractPatternsFromSpec(content);
        } catch {
          // Skip unreadable specs
        }
      }

      this.logger.debug?.(`Learned ${this.learnedPatterns.size} keyword patterns from existing specs`);
    } catch {
      // Ignore read errors
    }
  }

  /**
   * Extract keyword → project patterns from a spec file
   */
  private extractPatternsFromSpec(content: string): void {
    // Find US sections with **Project**: field
    const usPattern = /### US-\d+:([^\n]+)\n(?:[^\n]*\n){0,5}\*\*Project\*\*:\s*(\S+)/gi;

    let match;
    while ((match = usPattern.exec(content)) !== null) {
      const usTitle = match[1].toLowerCase().trim();
      const project = match[2].trim();

      // Extract significant words from title
      const words = usTitle.split(/\s+/).filter(w => w.length > 3);

      for (const word of words) {
        // Only learn if not already a default pattern
        if (!this.isDefaultPattern(word)) {
          this.learnedPatterns.set(word, project);
        }
      }
    }
  }

  /**
   * Check if word is in default patterns
   */
  private isDefaultPattern(word: string): boolean {
    const lowerWord = word.toLowerCase();
    for (const patterns of Object.values(DEFAULT_KEYWORD_PATTERNS)) {
      if (patterns.some(p => p.includes(lowerWord) || lowerWord.includes(p))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Resolve project for a single user story
   */
  resolveForUserStory(usContent: string): ProjectResolution {
    const lowerContent = usContent.toLowerCase();

    // 1. Single project → auto-select
    if (this.structureConfig.projects.length === 1) {
      const project = this.structureConfig.projects[0];
      return {
        resolved: true,
        projectId: project.id,
        confidence: 'high',
        reason: 'Single project available - auto-selected'
      };
    }

    // 2. Check learned patterns (highest priority after single project)
    for (const [keyword, project] of this.learnedPatterns) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        // Validate project still exists
        if (this.structureConfig.projects.some(p => p.id === project)) {
          return {
            resolved: true,
            projectId: project,
            confidence: 'high',
            reason: `Matched learned pattern: "${keyword}" → ${project}`,
            matchedKeywords: [keyword]
          };
        }
      }
    }

    // 3. Match against actual project IDs in config
    const matchedProjects = this.matchProjectsByKeywords(lowerContent);

    if (matchedProjects.length === 1) {
      const match = matchedProjects[0];
      return {
        resolved: true,
        projectId: match.projectId,
        confidence: match.confidence > 0.7 ? 'high' : 'medium',
        reason: `Keyword match: ${match.matchedKeywords.join(', ')}`,
        matchedKeywords: match.matchedKeywords
      };
    }

    if (matchedProjects.length > 1) {
      // Multiple matches - return highest confidence
      const sorted = matchedProjects.sort((a, b) => b.confidence - a.confidence);
      const best = sorted[0];

      if (best.confidence > 0.6 && best.confidence > sorted[1].confidence * 1.3) {
        // Clear winner (>30% higher than runner-up)
        return {
          resolved: true,
          projectId: best.projectId,
          confidence: 'medium',
          reason: `Best keyword match (${Math.round(best.confidence * 100)}%): ${best.matchedKeywords.join(', ')}`,
          matchedKeywords: best.matchedKeywords
        };
      }
    }

    // 4. Use CrossCuttingDetector for more sophisticated analysis
    const crossCuttingResult = this.crossCuttingDetector.detect(usContent);

    if (crossCuttingResult.suggestedProjects.length === 1) {
      // Single project suggested by cross-cutting detection
      const suggestedType = crossCuttingResult.suggestedProjects[0];
      const mappedProject = this.mapSuggestedTypeToProject(suggestedType);

      if (mappedProject) {
        const matchedKeywords = crossCuttingResult.detectedPatterns
          .filter(p => p.suggestedProject === suggestedType)
          .map(p => p.matched);

        return {
          resolved: true,
          projectId: mappedProject,
          confidence: crossCuttingResult.confidence,
          reason: `Cross-cutting analysis: ${suggestedType} → ${mappedProject}`,
          matchedKeywords
        };
      }
    }

    if (crossCuttingResult.isCrossCutting && crossCuttingResult.suggestedProjects.length > 1) {
      // Multiple projects detected - this is a cross-project US
      // Return first match with medium confidence and note the ambiguity
      const firstType = crossCuttingResult.suggestedProjects[0];
      const mappedProject = this.mapSuggestedTypeToProject(firstType);

      if (mappedProject) {
        return {
          resolved: true,
          projectId: mappedProject,
          confidence: 'medium',
          reason: `Cross-project detected (${crossCuttingResult.suggestedProjects.join(', ')}) - using ${firstType}`,
          matchedKeywords: crossCuttingResult.detectedPatterns.map(p => p.matched)
        };
      }
    }

    // 5. No clear resolution
    return {
      resolved: false,
      confidence: 'low',
      reason: 'Could not determine project from content - user selection required'
    };
  }

  /**
   * Map suggested project type (frontend, backend, etc.) to actual project ID
   */
  private mapSuggestedTypeToProject(suggestedType: string): string | null {
    const lowerType = suggestedType.toLowerCase();

    // First, check if any project ID directly matches the type
    for (const project of this.structureConfig.projects) {
      const lowerId = project.id.toLowerCase();
      const lowerName = (project.name || '').toLowerCase();

      if (lowerId === lowerType || lowerName === lowerType) {
        return project.id;
      }

      // Check if project ID contains the type (e.g., "my-frontend" contains "frontend")
      if (lowerId.includes(lowerType) || lowerType.includes(lowerId)) {
        return project.id;
      }

      // Check common mappings
      if (
        (lowerType === 'frontend' && (lowerId.includes('fe') || lowerId.includes('ui') || lowerId.includes('web') || lowerId.includes('client'))) ||
        (lowerType === 'backend' && (lowerId.includes('be') || lowerId.includes('api') || lowerId.includes('server') || lowerId.includes('service'))) ||
        (lowerType === 'mobile' && (lowerId.includes('mobile') || lowerId.includes('app') || lowerId.includes('ios') || lowerId.includes('android'))) ||
        (lowerType === 'infrastructure' && (lowerId.includes('infra') || lowerId.includes('devops') || lowerId.includes('platform'))) ||
        (lowerType === 'shared' && (lowerId.includes('shared') || lowerId.includes('common') || lowerId.includes('lib')))
      ) {
        return project.id;
      }
    }

    // If only one project exists, use it (fallback)
    if (this.structureConfig.projects.length === 1) {
      return this.structureConfig.projects[0].id;
    }

    return null;
  }

  /**
   * Resolve board for a user story (2-level structures only)
   */
  resolveBoard(usContent: string, projectId: string): ProjectResolution {
    if (this.structureConfig.level !== 2) {
      return {
        resolved: false,
        confidence: 'high',
        reason: 'Board not required for 1-level structure'
      };
    }

    const boards = this.structureConfig.boardsByProject?.[projectId] ?? [];

    // Single board → auto-select
    if (boards.length === 1) {
      return {
        resolved: true,
        boardId: boards[0].id,
        confidence: 'high',
        reason: 'Single board available - auto-selected'
      };
    }

    if (boards.length === 0) {
      return {
        resolved: false,
        confidence: 'low',
        reason: `No boards found for project "${projectId}"`
      };
    }

    const lowerContent = usContent.toLowerCase();

    // Match against board keywords
    for (const board of boards) {
      // Check board's own keywords
      if (board.keywords) {
        for (const keyword of board.keywords) {
          if (lowerContent.includes(keyword.toLowerCase())) {
            return {
              resolved: true,
              boardId: board.id,
              confidence: 'high',
              reason: `Board keyword match: "${keyword}"`,
              matchedKeywords: [keyword]
            };
          }
        }
      }

      // Check default board keywords
      const boardPatterns = DEFAULT_BOARD_KEYWORDS[board.id.toLowerCase()];
      if (boardPatterns) {
        for (const pattern of boardPatterns) {
          if (lowerContent.includes(pattern)) {
            return {
              resolved: true,
              boardId: board.id,
              confidence: 'medium',
              reason: `Default board pattern match: "${pattern}"`,
              matchedKeywords: [pattern]
            };
          }
        }
      }
    }

    return {
      resolved: false,
      confidence: 'low',
      reason: 'Could not determine board from content - user selection required'
    };
  }

  /**
   * Match content against project keywords
   */
  private matchProjectsByKeywords(content: string): Array<{
    projectId: string;
    confidence: number;
    matchedKeywords: string[];
  }> {
    const results: Array<{
      projectId: string;
      confidence: number;
      matchedKeywords: string[];
    }> = [];

    for (const project of this.structureConfig.projects) {
      const projectId = project.id.toLowerCase();
      const matchedKeywords: string[] = [];

      // Check if project ID appears directly
      if (content.includes(projectId)) {
        matchedKeywords.push(projectId);
      }

      // Check default patterns that might map to this project
      for (const [patternType, patterns] of Object.entries(DEFAULT_KEYWORD_PATTERNS)) {
        // Match pattern type to project ID
        if (projectId.includes(patternType) || patternType.includes(projectId.split('-')[0])) {
          for (const pattern of patterns) {
            if (content.includes(pattern)) {
              if (!matchedKeywords.includes(pattern)) {
                matchedKeywords.push(pattern);
              }
            }
          }
        }
      }

      if (matchedKeywords.length > 0) {
        // Calculate confidence based on number of matches
        const confidence = Math.min(0.9, 0.3 + (matchedKeywords.length * 0.15));
        results.push({
          projectId: project.id,
          confidence,
          matchedKeywords
        });
      }
    }

    return results;
  }

  /**
   * Resolve project context for an entire increment description
   */
  resolveForIncrement(incrementDescription: string): IncrementResolution {
    // Use CrossCuttingDetector for sophisticated analysis
    const crossCuttingResult = this.crossCuttingDetector.detect(incrementDescription);
    const isCrossProject = crossCuttingResult.isCrossCutting;

    // Get default project
    let defaultProject = this.structureConfig.projects[0]?.id ?? 'default';
    let defaultBoard: string | undefined;

    // Build suggestions map from cross-cutting detection
    const suggestions = new Map<string, ProjectResolution>();

    if (!isCrossProject && crossCuttingResult.suggestedProjects.length === 1) {
      // Single project detected - use it as default
      const suggestedType = crossCuttingResult.suggestedProjects[0];
      const mappedProject = this.mapSuggestedTypeToProject(suggestedType);

      if (mappedProject) {
        defaultProject = mappedProject;
        suggestions.set('default', {
          resolved: true,
          projectId: mappedProject,
          confidence: crossCuttingResult.confidence,
          reason: crossCuttingResult.reason ?? `Detected: ${suggestedType}`
        });
      }
    } else if (isCrossProject) {
      // Multiple projects detected - build suggestions per detected type
      for (const suggestedType of crossCuttingResult.suggestedProjects) {
        const mappedProject = this.mapSuggestedTypeToProject(suggestedType);
        if (mappedProject) {
          const patterns = crossCuttingResult.detectedPatterns
            .filter(p => p.suggestedProject === suggestedType);

          suggestions.set(suggestedType, {
            resolved: true,
            projectId: mappedProject,
            confidence: crossCuttingResult.confidence,
            reason: `Detected ${suggestedType} patterns`,
            matchedKeywords: patterns.map(p => p.matched)
          });
        }
      }

      // Use first detected project as default
      if (crossCuttingResult.suggestedProjects.length > 0) {
        const firstType = crossCuttingResult.suggestedProjects[0];
        const mappedProject = this.mapSuggestedTypeToProject(firstType);
        if (mappedProject) {
          defaultProject = mappedProject;
        }
      }
    } else {
      // Fallback to simple resolution
      const resolution = this.resolveForUserStory(incrementDescription);
      if (resolution.resolved && resolution.projectId) {
        defaultProject = resolution.projectId;
        suggestions.set('default', resolution);
      }
    }

    // For 2-level, also resolve default board
    if (this.structureConfig.level === 2 && defaultProject) {
      const boardResolution = this.resolveBoard(incrementDescription, defaultProject);
      if (boardResolution.resolved && boardResolution.boardId) {
        defaultBoard = boardResolution.boardId;
      }
    }

    return {
      isCrossProject,
      defaultProject,
      defaultBoard,
      suggestions,
      structureLevel: this.structureConfig.level,
      crossCuttingResult,
      detectedPatterns: crossCuttingResult.detectedPatterns
    };
  }

  /**
   * Check if content matches any keywords
   */
  private matchesKeywords(content: string, keywords: string[]): boolean {
    return keywords.some(k => content.includes(k.toLowerCase()));
  }

  /**
   * Detect cross-cutting concerns using the integrated detector
   * Returns full detection result for advanced use cases
   */
  detectCrossCuttingConcerns(description: string): CrossCuttingResult {
    return this.crossCuttingDetector.detect(description);
  }

  /**
   * Get the cross-cutting detector instance for direct access
   */
  getCrossCuttingDetector(): CrossCuttingDetector {
    return this.crossCuttingDetector;
  }

  /**
   * Format available projects for display
   */
  formatProjectsForDisplay(): string {
    const lines: string[] = [];

    lines.push(`Structure Level: ${this.structureConfig.level}-level`);
    lines.push('');
    lines.push('Available Projects:');

    for (const project of this.structureConfig.projects) {
      lines.push(`  - ${project.id}${project.name !== project.id ? ` (${project.name})` : ''}`);

      if (this.structureConfig.level === 2 && this.structureConfig.boardsByProject) {
        const boards = this.structureConfig.boardsByProject[project.id] ?? [];
        for (const board of boards) {
          lines.push(`      └── ${board.id}${board.name !== board.id ? ` (${board.name})` : ''}`);
        }
      }
    }

    return lines.join('\n');
  }
}

/**
 * Create a project resolver instance (sync - no pattern learning)
 */
export function createProjectResolver(
  projectRoot: string,
  options: { logger?: Logger } = {}
): ProjectResolver {
  return new ProjectResolver(projectRoot, { logger: options.logger });
}

/**
 * Create a project resolver instance with pattern learning (async)
 *
 * This awaits learnFromExistingSpecs() to ensure patterns are available
 * before the resolver is used.
 */
export async function createProjectResolverWithPatterns(
  projectRoot: string,
  options: { logger?: Logger } = {}
): Promise<ProjectResolver> {
  const resolver = new ProjectResolver(projectRoot, { logger: options.logger });

  try {
    await resolver.learnFromExistingSpecs();
  } catch {
    // Pattern learning is optional - continue without it
  }

  return resolver;
}

// Re-export types from cross-cutting-detector for convenience
export type { CrossCuttingResult, DetectedPattern };
