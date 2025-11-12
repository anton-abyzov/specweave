/**
 * Azure DevOps Project Detector
 *
 * Intelligently detects which Azure DevOps project a spec or increment belongs to
 * based on content analysis, folder structure, and configuration.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { AzureDevOpsStrategy } from '../../../src/cli/helpers/issue-tracker/types';

// ============================================================================
// Types
// ============================================================================

export interface ProjectConfidence {
  project: string;
  confidence: number;
  reasons: string[];
}

export interface ProjectDetectionResult {
  primary: string;
  secondary?: string[];
  confidence: number;
  strategy: AzureDevOpsStrategy;
}

export interface ProjectKeywords {
  [project: string]: string[];
}

export interface ProjectPatterns {
  [project: string]: RegExp[];
}

// ============================================================================
// Project Detection Keywords and Patterns
// ============================================================================

/**
 * Keywords that indicate a spec belongs to a specific project
 */
export const PROJECT_KEYWORDS: ProjectKeywords = {
  'AuthService': [
    'authentication', 'auth', 'login', 'logout', 'oauth',
    'jwt', 'token', 'session', 'password', 'credential',
    'sso', 'saml', 'ldap', 'mfa', '2fa', 'totp'
  ],
  'UserService': [
    'user', 'profile', 'account', 'registration', 'preferences',
    'settings', 'avatar', 'username', 'email', 'verification',
    'onboarding', 'demographics', 'personalization'
  ],
  'PaymentService': [
    'payment', 'billing', 'stripe', 'paypal', 'invoice',
    'subscription', 'charge', 'refund', 'credit card', 'transaction',
    'checkout', 'cart', 'pricing', 'plan', 'tier'
  ],
  'NotificationService': [
    'notification', 'email', 'sms', 'push', 'alert',
    'message', 'webhook', 'queue', 'sendgrid', 'twilio',
    'template', 'broadcast', 'digest', 'reminder'
  ],
  'Platform': [
    'infrastructure', 'deployment', 'monitoring', 'logging',
    'metrics', 'kubernetes', 'docker', 'ci/cd', 'pipeline',
    'terraform', 'ansible', 'helm', 'grafana', 'prometheus'
  ],
  'DataService': [
    'database', 'data', 'analytics', 'etl', 'warehouse',
    'pipeline', 'kafka', 'spark', 'hadoop', 'bigquery',
    'redshift', 'snowflake', 'datalake', 'streaming'
  ],
  'ApiGateway': [
    'gateway', 'api', 'proxy', 'routing', 'load balancer',
    'rate limiting', 'throttling', 'circuit breaker', 'cors',
    'authentication proxy', 'service mesh', 'envoy', 'kong'
  ],
  'WebApp': [
    'frontend', 'ui', 'react', 'angular', 'vue', 'component',
    'responsive', 'mobile-first', 'spa', 'ssr', 'next.js',
    'gatsby', 'webpack', 'css', 'sass', 'styled-components'
  ],
  'MobileApp': [
    'ios', 'android', 'react native', 'flutter', 'swift',
    'kotlin', 'objective-c', 'java', 'push notification',
    'app store', 'play store', 'mobile', 'tablet', 'responsive'
  ]
};

/**
 * File path patterns that indicate project ownership
 */
export const FILE_PATTERNS: ProjectPatterns = {
  'AuthService': [
    /auth\//i,
    /login\//i,
    /security\//i,
    /oauth\//i,
    /jwt\//i
  ],
  'UserService': [
    /users?\//i,
    /profiles?\//i,
    /accounts?\//i,
    /members?\//i
  ],
  'PaymentService': [
    /payment\//i,
    /billing\//i,
    /checkout\//i,
    /stripe\//i,
    /subscription\//i
  ],
  'NotificationService': [
    /notification\//i,
    /email\//i,
    /messaging\//i,
    /templates?\//i
  ],
  'Platform': [
    /infrastructure\//i,
    /terraform\//i,
    /kubernetes\//i,
    /k8s\//i,
    /\.github\/workflows\//i
  ],
  'WebApp': [
    /frontend\//i,
    /src\/components\//i,
    /src\/pages\//i,
    /public\//i,
    /styles?\//i
  ],
  'MobileApp': [
    /ios\//i,
    /android\//i,
    /mobile\//i,
    /app\//i
  ]
};

// ============================================================================
// Project Detector Class
// ============================================================================

export class AdoProjectDetector {
  private strategy: AzureDevOpsStrategy;
  private availableProjects: string[];
  private projectKeywords: ProjectKeywords;
  private filePatterns: ProjectPatterns;

  constructor(
    strategy: AzureDevOpsStrategy,
    availableProjects: string[],
    customKeywords?: ProjectKeywords,
    customPatterns?: ProjectPatterns
  ) {
    this.strategy = strategy;
    this.availableProjects = availableProjects;
    this.projectKeywords = { ...PROJECT_KEYWORDS, ...customKeywords };
    this.filePatterns = { ...FILE_PATTERNS, ...customPatterns };
  }

  /**
   * Detect project from spec file path
   */
  async detectFromSpecPath(specPath: string): Promise<ProjectDetectionResult> {
    // For project-per-team strategy, use folder structure
    if (this.strategy === 'project-per-team') {
      const pathParts = specPath.split(path.sep);
      const specsIndex = pathParts.indexOf('specs');

      if (specsIndex !== -1 && specsIndex < pathParts.length - 1) {
        const projectFolder = pathParts[specsIndex + 1];

        // Check if it matches an available project
        const matchedProject = this.availableProjects.find(
          p => p.toLowerCase() === projectFolder.toLowerCase()
        );

        if (matchedProject) {
          return {
            primary: matchedProject,
            confidence: 1.0,
            strategy: this.strategy
          };
        }
      }
    }

    // Fall back to content detection
    const content = await fs.readFile(specPath, 'utf-8');
    return this.detectFromContent(content);
  }

  /**
   * Detect project from spec content
   */
  async detectFromContent(content: string): Promise<ProjectDetectionResult> {
    const candidates = this.analyzeContent(content);

    // High confidence: Auto-select
    if (candidates[0]?.confidence >= 0.7) {
      return {
        primary: candidates[0].project,
        confidence: candidates[0].confidence,
        strategy: this.strategy
      };
    }

    // Medium confidence: Primary with secondary projects
    if (candidates[0]?.confidence >= 0.4) {
      const secondary = candidates
        .slice(1)
        .filter(c => c.confidence >= 0.3)
        .map(c => c.project);

      return {
        primary: candidates[0].project,
        secondary: secondary.length > 0 ? secondary : undefined,
        confidence: candidates[0].confidence,
        strategy: this.strategy
      };
    }

    // Low confidence: Default to first available project
    return {
      primary: this.availableProjects[0] || 'Unknown',
      confidence: 0,
      strategy: this.strategy
    };
  }

  /**
   * Analyze content and return project candidates with confidence scores
   */
  private analyzeContent(content: string): ProjectConfidence[] {
    const results: ProjectConfidence[] = [];
    const lowerContent = content.toLowerCase();

    for (const project of this.availableProjects) {
      let confidence = 0;
      const reasons: string[] = [];

      // Check if project name is in title or frontmatter
      if (lowerContent.includes(project.toLowerCase())) {
        confidence += 0.5;
        reasons.push(`Project name "${project}" found in content`);
      }

      // Check keywords
      const keywords = this.projectKeywords[project] || [];
      let keywordMatches = 0;
      for (const keyword of keywords) {
        if (lowerContent.includes(keyword.toLowerCase())) {
          keywordMatches++;
        }
      }
      if (keywordMatches > 0) {
        const keywordScore = Math.min(keywordMatches * 0.1, 0.4);
        confidence += keywordScore;
        reasons.push(`Found ${keywordMatches} keyword matches`);
      }

      // Check file references
      const patterns = this.filePatterns[project] || [];
      let patternMatches = 0;
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          patternMatches++;
        }
      }
      if (patternMatches > 0) {
        const patternScore = Math.min(patternMatches * 0.15, 0.3);
        confidence += patternScore;
        reasons.push(`Found ${patternMatches} file pattern matches`);
      }

      // Check for explicit project assignment
      const projectAssignment = new RegExp(`project:\\s*${project}`, 'i');
      if (projectAssignment.test(content)) {
        confidence = 1.0; // Override with full confidence
        reasons.push('Explicit project assignment in frontmatter');
      }

      results.push({ project, confidence, reasons });
    }

    // Sort by confidence (highest first)
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Detect projects for multi-project spec
   */
  async detectMultiProject(content: string): Promise<ProjectDetectionResult> {
    const candidates = this.analyzeContent(content);

    // Get all projects with meaningful confidence
    const significantProjects = candidates.filter(c => c.confidence >= 0.3);

    if (significantProjects.length === 0) {
      return {
        primary: this.availableProjects[0] || 'Unknown',
        confidence: 0,
        strategy: this.strategy
      };
    }

    // Primary is highest confidence
    const primary = significantProjects[0];

    // Secondary are other significant projects
    const secondary = significantProjects
      .slice(1)
      .map(c => c.project);

    return {
      primary: primary.project,
      secondary: secondary.length > 0 ? secondary : undefined,
      confidence: primary.confidence,
      strategy: this.strategy
    };
  }

  /**
   * Map spec to area path (for area-path-based strategy)
   */
  mapToAreaPath(content: string, project: string): string {
    const areaPaths = process.env.AZURE_DEVOPS_AREA_PATHS?.split(',').map(a => a.trim()) || [];
    const lowerContent = content.toLowerCase();

    // First try exact area path name match
    for (const areaPath of areaPaths) {
      if (lowerContent.includes(areaPath.toLowerCase())) {
        return `${project}\\${areaPath}`;
      }
    }

    // Try keyword-based detection using PROJECT_KEYWORDS
    // Map area paths to common project types
    const areaPathKeywordMap: { [key: string]: string[] } = {
      'Frontend': ['WebApp', 'frontend'],
      'Backend': ['backend', 'api', 'server'],
      'Mobile': ['MobileApp', 'mobile', 'ios', 'android'],
      'Infrastructure': ['Platform', 'infrastructure'],
      'Data': ['DataService', 'data', 'analytics']
    };

    let bestMatch = { areaPath: '', confidence: 0 };

    for (const areaPath of areaPaths) {
      // Get related project types for this area path
      const relatedTypes = areaPathKeywordMap[areaPath] || [areaPath];
      let matchCount = 0;

      for (const projectType of relatedTypes) {
        // Check if this project type has keywords defined
        const keywords = this.projectKeywords[projectType] || [];
        for (const keyword of keywords) {
          if (lowerContent.includes(keyword.toLowerCase())) {
            matchCount++;
          }
        }
      }

      if (matchCount > bestMatch.confidence) {
        bestMatch = { areaPath, confidence: matchCount };
      }
    }

    // Return best match if confidence is high enough
    if (bestMatch.confidence >= 2) {
      return `${project}\\${bestMatch.areaPath}`;
    }

    // Default area path
    return project;
  }

  /**
   * Assign to team (for team-based strategy)
   */
  assignToTeam(content: string): string {
    const teams = process.env.AZURE_DEVOPS_TEAMS?.split(',').map(t => t.trim()) || [];

    // Check for explicit team assignment
    const teamMatch = content.match(/team:\s*([^\n]+)/i);
    if (teamMatch) {
      const assignedTeam = teamMatch[1].trim();
      if (teams.includes(assignedTeam)) {
        return assignedTeam;
      }
    }

    // Auto-detect based on keywords
    const teamKeywords: { [team: string]: string[] } = {
      'Frontend': ['ui', 'react', 'component', 'css', 'design'],
      'Backend': ['api', 'database', 'server', 'endpoint', 'query'],
      'Mobile': ['ios', 'android', 'app', 'native', 'push'],
      'DevOps': ['deploy', 'ci/cd', 'kubernetes', 'docker', 'pipeline'],
      'Data': ['analytics', 'etl', 'warehouse', 'bigquery', 'spark']
    };

    for (const team of teams) {
      const keywords = teamKeywords[team] || [];
      for (const keyword of keywords) {
        if (content.toLowerCase().includes(keyword)) {
          return team;
        }
      }
    }

    // Default to first team
    return teams[0] || 'Default Team';
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get project detector from environment
 */
export function getProjectDetectorFromEnv(): AdoProjectDetector {
  const strategy = process.env.AZURE_DEVOPS_STRATEGY as AzureDevOpsStrategy || 'team-based';

  let projects: string[] = [];

  switch (strategy) {
    case 'project-per-team':
      projects = process.env.AZURE_DEVOPS_PROJECTS?.split(',').map(p => p.trim()) || [];
      break;
    case 'area-path-based':
    case 'team-based':
      const project = process.env.AZURE_DEVOPS_PROJECT;
      if (project) {
        projects = [project];
      }
      break;
  }

  return new AdoProjectDetector(strategy, projects);
}

/**
 * Create project folders based on strategy
 */
export async function createProjectFolders(
  baseDir: string,
  strategy: AzureDevOpsStrategy,
  projects: string[]
): Promise<void> {
  const specsPath = path.join(baseDir, '.specweave', 'docs', 'internal', 'specs');

  switch (strategy) {
    case 'project-per-team':
      // Create folder for each project
      for (const project of projects) {
        const projectPath = path.join(specsPath, project);
        await fs.ensureDir(projectPath);
        await createProjectReadme(projectPath, project);
      }
      break;

    case 'area-path-based':
      // Create folders for area paths
      const areaPaths = process.env.AZURE_DEVOPS_AREA_PATHS?.split(',').map(a => a.trim()) || [];
      const project = projects[0];
      if (project) {
        const projectPath = path.join(specsPath, project);
        await fs.ensureDir(projectPath);

        for (const area of areaPaths) {
          const areaPath = path.join(projectPath, area);
          await fs.ensureDir(areaPath);
        }
      }
      break;

    case 'team-based':
      // Create folders for teams
      const teams = process.env.AZURE_DEVOPS_TEAMS?.split(',').map(t => t.trim()) || [];
      const proj = projects[0];
      if (proj) {
        const projectPath = path.join(specsPath, proj);
        await fs.ensureDir(projectPath);

        for (const team of teams) {
          const teamPath = path.join(projectPath, team);
          await fs.ensureDir(teamPath);
        }
      }
      break;
  }
}

/**
 * Create README for project folder
 */
async function createProjectReadme(projectPath: string, projectName: string): Promise<void> {
  const readmePath = path.join(projectPath, 'README.md');

  // Don't overwrite existing README
  if (await fs.pathExists(readmePath)) {
    return;
  }

  const content = `# ${projectName} Specifications

## Overview

This folder contains specifications for the ${projectName} project.

## Azure DevOps

- Organization: ${process.env.AZURE_DEVOPS_ORG || 'TBD'}
- Project: ${projectName}
- URL: https://dev.azure.com/${process.env.AZURE_DEVOPS_ORG || 'org'}/${projectName}

## Specifications

_No specifications yet. Specs will appear here as they are created._

## Team

- Lead: TBD
- Members: TBD

## Keywords

${PROJECT_KEYWORDS[projectName]?.join(', ') || 'TBD'}

## Getting Started

1. Create a new spec: \`/specweave:increment "feature-name"\`
2. Specs will be organized here automatically
3. Sync to Azure DevOps: \`/specweave-ado:sync-spec spec-001\`

---

_Generated by SpecWeave_
`;

  await fs.writeFile(readmePath, content);
}