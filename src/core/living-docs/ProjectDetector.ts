/**
 * Project Detector
 *
 * Detects project type (backend/frontend/mobile) from AC descriptions.
 */

import type { ProjectType, ProjectDetectionResult } from './types.js';

/**
 * Project detection keywords
 */
const PROJECT_KEYWORDS: Record<ProjectType, string[]> = {
  backend: [
    'backend', 'api', 'server', 'database', 'db', 'endpoint', 'service',
    'rest', 'graphql', 'microservice', 'lambda', 'function', 'worker',
    'queue', 'cache', 'redis', 'postgres', 'mongodb', 'sql'
  ],
  frontend: [
    'frontend', 'ui', 'component', 'form', 'page', 'view', 'button',
    'modal', 'dialog', 'menu', 'nav', 'layout', 'react', 'vue', 'angular',
    'css', 'style', 'responsive', 'ux', 'user interface'
  ],
  mobile: [
    'mobile', 'ios', 'android', 'app', 'native', 'react native', 'flutter',
    'swift', 'kotlin', 'push notification', 'mobile app', 'tablet'
  ],
  shared: [
    'shared', 'common', 'utility', 'helper', 'type', 'interface', 'constant',
    'config', 'environment', 'validation'
  ]
};

/**
 * Detect project type from text
 *
 * @param text - Text to analyze (AC description, task title, etc.)
 * @returns ProjectDetectionResult with detected projects and confidence
 *
 * @example
 * ```typescript
 * const result = detectProject('Create backend API endpoint for user authentication');
 * // result.projects = ['backend']
 * // result.confidence = 0.8
 * ```
 */
export function detectProject(text: string): ProjectDetectionResult {
  const lowerText = text.toLowerCase();
  const detectedProjects: ProjectType[] = [];
  const matches: Record<ProjectType, number> = {
    backend: 0,
    frontend: 0,
    mobile: 0,
    shared: 0
  };

  // Count keyword matches for each project type
  for (const [project, keywords] of Object.entries(PROJECT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        matches[project as ProjectType]++;
      }
    }
  }

  // Determine detected projects (any with matches)
  const entries = Object.entries(matches) as [ProjectType, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);

  // Add projects with at least one match
  for (const [project, count] of sorted) {
    if (count > 0) {
      detectedProjects.push(project);
    }
  }

  // Default to 'shared' if no specific project detected
  if (detectedProjects.length === 0) {
    detectedProjects.push('shared');
  }

  // Calculate confidence based on keyword density
  const totalMatches = Object.values(matches).reduce((sum, count) => sum + count, 0);
  const confidence = totalMatches > 0
    ? Math.min(totalMatches / 5, 1) // Cap at 1.0
    : 0.3; // Low confidence for shared

  return {
    projects: detectedProjects,
    confidence
  };
}

/**
 * Filter text by project keywords
 *
 * @param text - Text to check
 * @param projectFilter - Projects to filter by
 * @returns True if text contains keywords for any of the specified projects
 */
export function matchesProject(text: string, projectFilter: ProjectType[]): boolean {
  const result = detectProject(text);

  // Check if any detected project matches the filter
  return result.projects.some(p => projectFilter.includes(p));
}
