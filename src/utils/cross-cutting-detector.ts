/**
 * Cross-Cutting Feature Detector
 *
 * Detects when a feature spans multiple projects based on keywords,
 * tech stack mentions, and component references.
 *
 * @module utils/cross-cutting-detector
 * @since v0.33.0
 */

import { Logger, consoleLogger } from './logger.js';

/**
 * Result of cross-cutting detection
 */
export interface CrossCuttingResult {
  isCrossCutting: boolean;
  confidence: 'high' | 'medium' | 'low';
  suggestedProjects: string[];
  detectedPatterns: DetectedPattern[];
  reason?: string;
}

/**
 * Pattern that triggered detection
 */
export interface DetectedPattern {
  type: 'keyword' | 'tech-stack' | 'component' | 'explicit';
  matched: string;
  suggestedProject?: string;
}

/**
 * Cross-cutting detection keywords and mappings
 */
const CROSS_CUTTING_PATTERNS: Record<string, string[]> = {
  // Frontend indicators
  frontend: ['frontend', 'ui', 'react', 'vue', 'angular', 'next.js', 'nuxt', 'svelte', 'client-side', 'browser'],

  // Backend indicators
  backend: ['backend', 'api', 'server', 'node', 'express', 'fastify', 'django', 'flask', 'rails', 'spring', 'graphql', 'rest api'],

  // Infrastructure indicators
  infrastructure: ['infrastructure', 'infra', 'devops', 'ci/cd', 'pipeline', 'kubernetes', 'k8s', 'docker', 'terraform', 'aws', 'azure', 'gcp'],

  // Database indicators
  database: ['database', 'db', 'postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'migration', 'schema'],

  // Security indicators
  security: ['security', 'auth', 'oauth', 'authentication', 'authorization', 'rbac', 'permissions', 'jwt', 'sso'],

  // Mobile indicators
  mobile: ['mobile', 'ios', 'android', 'react native', 'flutter', 'app store', 'play store'],

  // Shared/common indicators
  shared: ['shared', 'common', 'library', 'sdk', 'package', 'module', 'types', 'models']
};

/**
 * Explicit cross-cutting phrases
 */
const EXPLICIT_CROSS_CUTTING = [
  'across projects',
  'multiple repos',
  'cross-project',
  'cross-team',
  'frontend and backend',
  'end-to-end',
  'full-stack',
  'fullstack',
  'from ui to api',
  'from client to server',
  'all services',
  'all teams',
  'affects multiple',
  'impacts all'
];

/**
 * Cross-Cutting Detector
 */
export class CrossCuttingDetector {
  private logger: Logger;
  private customMappings: Record<string, string[]> = {};

  constructor(options: { logger?: Logger; customMappings?: Record<string, string[]> } = {}) {
    this.logger = options.logger ?? consoleLogger;
    this.customMappings = options.customMappings ?? {};
  }

  /**
   * Detect if a description indicates cross-cutting concerns
   */
  detect(description: string): CrossCuttingResult {
    const normalized = description.toLowerCase();
    const detectedPatterns: DetectedPattern[] = [];
    const suggestedProjects = new Set<string>();

    // 1. Check explicit cross-cutting phrases (high confidence)
    for (const phrase of EXPLICIT_CROSS_CUTTING) {
      if (normalized.includes(phrase)) {
        detectedPatterns.push({
          type: 'explicit',
          matched: phrase
        });
      }
    }

    // 2. Check keyword patterns
    const allPatterns = { ...CROSS_CUTTING_PATTERNS, ...this.customMappings };

    for (const [project, keywords] of Object.entries(allPatterns)) {
      for (const keyword of keywords) {
        // Use word boundary matching for more accuracy
        const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'i');
        if (regex.test(description)) {
          detectedPatterns.push({
            type: 'keyword',
            matched: keyword,
            suggestedProject: project
          });
          suggestedProjects.add(project);
        }
      }
    }

    // 3. Determine if cross-cutting
    const uniqueProjects = [...suggestedProjects];
    const isCrossCutting = uniqueProjects.length >= 2 || detectedPatterns.some(p => p.type === 'explicit');

    // 4. Calculate confidence
    let confidence: 'high' | 'medium' | 'low' = 'low';

    if (detectedPatterns.some(p => p.type === 'explicit')) {
      confidence = 'high';
    } else if (uniqueProjects.length >= 3) {
      confidence = 'high';
    } else if (uniqueProjects.length === 2) {
      // Check if multiple keywords matched per project
      const projectKeywordCounts = new Map<string, number>();
      for (const pattern of detectedPatterns) {
        if (pattern.suggestedProject) {
          projectKeywordCounts.set(
            pattern.suggestedProject,
            (projectKeywordCounts.get(pattern.suggestedProject) || 0) + 1
          );
        }
      }
      const minMatches = Math.min(...projectKeywordCounts.values());
      confidence = minMatches >= 2 ? 'high' : 'medium';
    }

    // 5. Generate reason
    let reason: string | undefined;
    if (isCrossCutting) {
      if (detectedPatterns.some(p => p.type === 'explicit')) {
        const explicit = detectedPatterns.find(p => p.type === 'explicit');
        reason = `Explicit cross-cutting phrase detected: "${explicit?.matched}"`;
      } else {
        reason = `Multiple project domains detected: ${uniqueProjects.join(', ')}`;
      }
    }

    return {
      isCrossCutting,
      confidence,
      suggestedProjects: uniqueProjects,
      detectedPatterns,
      reason
    };
  }

  /**
   * Add custom project mappings
   */
  addCustomMapping(project: string, keywords: string[]): void {
    this.customMappings[project] = [
      ...(this.customMappings[project] || []),
      ...keywords
    ];
  }

  /**
   * Load custom mappings from config
   */
  loadMappingsFromConfig(projectMappings: Record<string, unknown>): void {
    // Extract project IDs as potential mapping targets
    for (const projectId of Object.keys(projectMappings)) {
      // Add the project ID itself as a keyword
      if (!this.customMappings[projectId]) {
        this.customMappings[projectId] = [projectId];
      }
    }
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

/**
 * Convenience function for one-off detection
 */
export function detectCrossCutting(
  description: string,
  options?: { customMappings?: Record<string, string[]> }
): CrossCuttingResult {
  const detector = new CrossCuttingDetector(options);
  return detector.detect(description);
}

/**
 * Get suggested project for a single-project feature
 */
export function suggestSingleProject(description: string): string | null {
  const result = detectCrossCutting(description);

  if (result.isCrossCutting) {
    return null; // Ambiguous - needs user selection
  }

  if (result.suggestedProjects.length === 1) {
    return result.suggestedProjects[0];
  }

  return null; // No clear suggestion
}
