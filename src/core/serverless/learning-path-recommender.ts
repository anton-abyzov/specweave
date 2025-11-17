/**
 * Learning Path Recommender for Serverless Platforms
 *
 * Recommends curated learning resources based on skill level, platform,
 * and best practices for serverless development.
 */

import * as path from 'path';
import * as fs from 'fs';
import { ServerlessPlatform } from './types';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * User skill levels for serverless development
 */
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Learning resource types
 */
export type ResourceType =
  | 'tutorial'
  | 'documentation'
  | 'video'
  | 'course'
  | 'sample-project'
  | 'blog-post'
  | 'webinar';

/**
 * Complexity rating for sample projects
 */
export type ProjectComplexity = 'basic' | 'intermediate' | 'advanced';

/**
 * Best practice categories
 */
export type BestPracticeCategory =
  | 'performance'
  | 'security'
  | 'cost'
  | 'architecture'
  | 'monitoring'
  | 'testing';

/**
 * Severity level for common pitfalls
 */
export type PitfallSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * A single learning resource (tutorial, course, video, etc.)
 */
export interface LearningResource {
  id: string;
  title: string;
  url: string;
  type: ResourceType;
  skillLevel: SkillLevel;
  estimatedTime?: string;
  provider?: string;
  description?: string;
  tags?: string[];
  prerequisite?: string;
  lastVerified?: string; // YYYY-MM-DD format
}

/**
 * A best practice guide for a specific category
 */
export interface BestPractice {
  id: string;
  category: BestPracticeCategory;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  example?: string;
  relatedResources?: string[]; // IDs of related learning resources
}

/**
 * A common pitfall with mitigation strategy
 */
export interface CommonPitfall {
  id: string;
  title: string;
  description: string;
  mitigation: string;
  severity: PitfallSeverity;
  example?: string;
  affectedSkillLevels?: SkillLevel[];
}

/**
 * A sample project with complexity rating
 */
export interface SampleProject extends LearningResource {
  complexity: ProjectComplexity;
  estimatedDuration?: string; // e.g., "2-4 hours"
  technologies?: string[];
  sourceRepo?: string;
}

/**
 * Data freshness information
 */
export interface DataFreshness {
  lastVerified: string; // YYYY-MM-DD format
  isStale: boolean;
  staleDays: number;
  maxStaleDays: number;
}

/**
 * Complete learning path recommendation result
 */
export interface LearningPathResult {
  platform: string;
  platformId: string;
  skillLevel: SkillLevel;
  tutorials: LearningResource[];
  documentation: LearningResource[];
  videos: LearningResource[];
  courses: LearningResource[];
  sampleProjects: SampleProject[];
  bestPractices: BestPractice[];
  commonPitfalls: CommonPitfall[];
  dataFreshness: DataFreshness;
  nextSteps: string[];
  estimatedLearningTime?: string;
}

/**
 * Skill detection result with confidence
 */
export interface SkillDetectionResult {
  skillLevel: SkillLevel;
  confidence: 'low' | 'medium' | 'high';
  signals: string[];
  justification: string;
}

/**
 * Knowledge base structure for learning paths
 */
interface LearningPathsKnowledgeBase {
  version: string;
  lastUpdated: string;
  maxStaleDays: number;
  platforms: {
    [platformId: string]: {
      name: string;
      id: string;
      resources: {
        tutorials: LearningResource[];
        documentation: LearningResource[];
        videos: LearningResource[];
        courses: LearningResource[];
        sampleProjects: SampleProject[];
      };
      bestPractices: BestPractice[];
      commonPitfalls: CommonPitfall[];
      lastVerified: string;
    };
  };
}

// ============================================================================
// Module Functions
// ============================================================================

/**
 * Detect user skill level from natural language input
 *
 * Analyzes keywords and patterns to determine if user is beginner/intermediate/advanced
 * @param userInput - User's description of their experience
 * @returns SkillDetectionResult with detected level and confidence
 */
export function detectSkillLevel(userInput: string): SkillDetectionResult {
  const input = userInput.toLowerCase();
  const signals: string[] = [];

  // Beginner indicators
  const beginnerKeywords = [
    'new to',
    'first time',
    'never used',
    'just getting started',
    'learning',
    'basics',
    'beginner',
    'noob',
    'what is',
    'how do i',
    'no experience',
  ];

  // Advanced indicators
  const advancedKeywords = [
    'production',
    'performance optimization',
    'cold start',
    'concurrent execution',
    'distributed',
    'scaling',
    'advanced',
    'expert',
    'complex architecture',
    'migration',
    'multi-region',
    'enterprise',
    'vpc',
    'reserved capacity',
  ];

  // Intermediate indicators
  const intermediateKeywords = [
    'worked with',
    'familiar with',
    'experienced',
    'built',
    'deployed',
    'integration',
    'api',
    'database',
    'ci/cd',
    'testing',
  ];

  let beginnerScore = 0;
  let advancedScore = 0;
  let intermediateScore = 0;

  for (const keyword of beginnerKeywords) {
    if (input.includes(keyword)) {
      beginnerScore += 2;
      signals.push(`Beginner keyword: "${keyword}"`);
    }
  }

  for (const keyword of advancedKeywords) {
    if (input.includes(keyword)) {
      advancedScore += 3;
      signals.push(`Advanced keyword: "${keyword}"`);
    }
  }

  for (const keyword of intermediateKeywords) {
    if (input.includes(keyword)) {
      intermediateScore += 1;
      signals.push(`Intermediate keyword: "${keyword}"`);
    }
  }

  // Determine skill level based on scores
  let skillLevel: SkillLevel = 'beginner';
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  let justification = '';

  if (advancedScore > beginnerScore && advancedScore > intermediateScore) {
    skillLevel = 'advanced';
    confidence = advancedScore >= 6 ? 'high' : 'medium';
    justification = `Detected ${advancedScore} advanced signals`;
  } else if (intermediateScore > beginnerScore && intermediateScore > advancedScore) {
    skillLevel = 'intermediate';
    confidence = intermediateScore >= 3 ? 'high' : 'medium';
    justification = `Detected ${intermediateScore} intermediate signals`;
  } else {
    skillLevel = 'beginner';
    confidence = beginnerScore >= 2 ? 'high' : 'low';
    justification = `Detected ${beginnerScore} beginner signals`;
  }

  // Adjust confidence if input is very short
  if (userInput.length < 20) {
    confidence = 'low';
  }

  return {
    skillLevel,
    confidence,
    signals,
    justification,
  };
}

/**
 * Load learning paths knowledge base from JSON file
 * @returns Parsed knowledge base
 */
function loadKnowledgeBase(): LearningPathsKnowledgeBase {
  const knowledgeBasePath = path.join(
    __dirname,
    '../../..',
    'plugins/specweave/knowledge-base/serverless/learning-paths.json'
  );

  if (!fs.existsSync(knowledgeBasePath)) {
    throw new Error(`Learning paths knowledge base not found at ${knowledgeBasePath}`);
  }

  const jsonContent = fs.readFileSync(knowledgeBasePath, 'utf-8');
  return JSON.parse(jsonContent);
}

/**
 * Check if data is fresh (verified within max stale days)
 * @param lastVerified - Date in YYYY-MM-DD format
 * @param maxStaleDays - Maximum days allowed before data is considered stale
 * @returns DataFreshness object
 */
function checkDataFreshness(lastVerified: string, maxStaleDays: number = 60): DataFreshness {
  const verifiedDate = new Date(lastVerified);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - verifiedDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    lastVerified,
    isStale: diffDays > maxStaleDays,
    staleDays: diffDays,
    maxStaleDays,
  };
}

/**
 * Recommend learning path for a specific platform and skill level
 *
 * @param platformId - ID of the serverless platform
 * @param skillLevel - Optional skill level (will default to 'beginner' if not provided)
 * @returns Complete learning path recommendation
 */
export function recommendLearningPath(
  platformId: string,
  skillLevel?: SkillLevel
): LearningPathResult {
  const knowledgeBase = loadKnowledgeBase();

  // Find platform in knowledge base
  const platformData = knowledgeBase.platforms[platformId];
  if (!platformData) {
    throw new Error(
      `Platform '${platformId}' not found. Available platforms: ${Object.keys(
        knowledgeBase.platforms
      ).join(', ')}`
    );
  }

  // Default to beginner if not specified
  const detectedSkillLevel = skillLevel || 'beginner';

  // Filter resources by skill level
  const tutorials = platformData.resources.tutorials.filter(
    (r) => r.skillLevel === detectedSkillLevel || r.skillLevel === 'beginner'
  );

  const documentation = platformData.resources.documentation.filter(
    (r) => r.skillLevel === detectedSkillLevel || r.skillLevel === 'beginner'
  );

  const videos = platformData.resources.videos.filter(
    (r) => r.skillLevel === detectedSkillLevel || r.skillLevel === 'beginner'
  );

  const courses = platformData.resources.courses.filter(
    (r) => r.skillLevel === detectedSkillLevel || r.skillLevel === 'beginner'
  );

  const sampleProjects = platformData.resources.sampleProjects.filter(
    (r) => r.skillLevel === detectedSkillLevel
  );

  // Filter best practices by relevance to skill level
  const bestPractices = platformData.bestPractices;

  // Filter pitfalls by skill level relevance
  const commonPitfalls = platformData.commonPitfalls.filter((p) => {
    if (!p.affectedSkillLevels) {
      return true; // Include if not restricted
    }
    return p.affectedSkillLevels.includes(detectedSkillLevel);
  });

  // Check data freshness
  const dataFreshness = checkDataFreshness(
    platformData.lastVerified,
    knowledgeBase.maxStaleDays
  );

  // Generate next steps based on skill level
  const nextSteps = generateNextSteps(detectedSkillLevel, tutorials, sampleProjects);

  // Estimate total learning time
  const estimatedLearningTime = estimateTotalLearningTime(
    tutorials,
    videos,
    courses,
    sampleProjects
  );

  return {
    platform: platformData.name,
    platformId,
    skillLevel: detectedSkillLevel,
    tutorials,
    documentation,
    videos,
    courses,
    sampleProjects,
    bestPractices,
    commonPitfalls,
    dataFreshness,
    nextSteps,
    estimatedLearningTime,
  };
}

/**
 * Generate recommended next steps based on skill level
 */
function generateNextSteps(
  skillLevel: SkillLevel,
  tutorials: LearningResource[],
  projects: SampleProject[]
): string[] {
  const steps: string[] = [];

  if (skillLevel === 'beginner') {
    steps.push('Start with the official documentation to understand core concepts');
    steps.push('Complete a beginner tutorial to set up your first function');
    steps.push('Build a simple "Hello World" function to test the basics');
    steps.push('Explore the sample projects for inspiration');
    steps.push('Gradually move to intermediate tutorials as you gain confidence');
  } else if (skillLevel === 'intermediate') {
    steps.push('Review the best practices guide for performance and security');
    steps.push('Build a sample project with real-world features (database, API calls)');
    steps.push('Study common pitfalls and how to avoid them');
    steps.push('Explore monitoring and logging strategies');
    steps.push('Consider advanced topics like cold start optimization');
  } else {
    steps.push('Review the cost optimization and advanced architecture guides');
    steps.push('Implement advanced patterns (event sourcing, CQRS)');
    steps.push('Work on scaling and multi-region deployments');
    steps.push('Contribute to open-source serverless projects');
    steps.push('Mentor junior developers and share your knowledge');
  }

  return steps;
}

/**
 * Estimate total learning time from resources
 */
function estimateTotalLearningTime(
  tutorials: LearningResource[],
  videos: LearningResource[],
  courses: LearningResource[],
  projects: SampleProject[]
): string | undefined {
  const timeEstimates: number[] = [];

  // Parse time estimates
  const parseTimeEstimate = (timeStr?: string): number | null => {
    if (!timeStr) return null;

    const match = timeStr.match(/(\d+)/);
    if (!match) return null;

    const minutes = parseInt(match[1], 10);
    return minutes;
  };

  // Collect all time estimates
  for (const resource of [...tutorials, ...videos, ...courses, ...projects]) {
    const estimate = parseTimeEstimate(resource.estimatedTime);
    if (estimate) {
      timeEstimates.push(estimate);
    }
  }

  if (timeEstimates.length === 0) {
    return undefined;
  }

  const totalMinutes = timeEstimates.reduce((a, b) => a + b, 0);
  const totalHours = Math.round(totalMinutes / 60);

  if (totalHours < 1) {
    return `${totalMinutes} minutes`;
  } else if (totalHours < 24) {
    return `${totalHours} hours`;
  } else {
    const days = Math.round(totalHours / 8);
    return `${days} days (studying ${Math.round(totalHours / days)} hours/day)`;
  }
}

/**
 * Get all available platform IDs
 */
export function getAvailablePlatforms(): string[] {
  try {
    const knowledgeBase = loadKnowledgeBase();
    return Object.keys(knowledgeBase.platforms);
  } catch {
    return ['aws-lambda', 'azure-functions', 'gcp-functions', 'firebase-functions', 'supabase'];
  }
}

/**
 * Get platforms with fresh data (not stale)
 */
export function getFreshPlatforms(maxStaleDays: number = 60): string[] {
  const knowledgeBase = loadKnowledgeBase();
  const freshPlatforms: string[] = [];

  for (const [platformId, platformData] of Object.entries(knowledgeBase.platforms)) {
    const freshness = checkDataFreshness(platformData.lastVerified, maxStaleDays);
    if (!freshness.isStale) {
      freshPlatforms.push(platformId);
    }
  }

  return freshPlatforms;
}

/**
 * Get stale platforms (data not verified within max days)
 */
export function getStalePlatforms(maxStaleDays: number = 60): string[] {
  const knowledgeBase = loadKnowledgeBase();
  const stalePlatforms: string[] = [];

  for (const [platformId, platformData] of Object.entries(knowledgeBase.platforms)) {
    const freshness = checkDataFreshness(platformData.lastVerified, maxStaleDays);
    if (freshness.isStale) {
      stalePlatforms.push(platformId);
    }
  }

  return stalePlatforms;
}

/**
 * Get learning resources for a specific category and platform
 */
export function getResourcesByType(
  platformId: string,
  resourceType: ResourceType,
  skillLevel?: SkillLevel
): LearningResource[] {
  const knowledgeBase = loadKnowledgeBase();
  const platformData = knowledgeBase.platforms[platformId];

  if (!platformData) {
    throw new Error(`Platform '${platformId}' not found`);
  }

  let resources: LearningResource[] = [];

  switch (resourceType) {
    case 'tutorial':
      resources = platformData.resources.tutorials;
      break;
    case 'documentation':
      resources = platformData.resources.documentation;
      break;
    case 'video':
      resources = platformData.resources.videos;
      break;
    case 'course':
      resources = platformData.resources.courses;
      break;
    case 'sample-project':
      resources = platformData.resources.sampleProjects;
      break;
    default:
      resources = [];
  }

  // Filter by skill level if specified
  if (skillLevel) {
    resources = resources.filter((r) => r.skillLevel === skillLevel);
  }

  return resources;
}

/**
 * Validate learning path data integrity
 */
export function validateLearningPathData(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const knowledgeBase = loadKnowledgeBase();

    // Check for required fields
    for (const [platformId, platformData] of Object.entries(knowledgeBase.platforms)) {
      if (!platformData.name) {
        errors.push(`Platform ${platformId} missing name`);
      }

      if (!platformData.lastVerified) {
        errors.push(`Platform ${platformId} missing lastVerified date`);
      }

      // Check for stale data
      const freshness = checkDataFreshness(platformData.lastVerified, 60);
      if (freshness.isStale) {
        warnings.push(
          `Platform ${platformId} data is stale (last verified ${freshness.staleDays} days ago)`
        );
      }

      // Validate all resources have IDs
      const allResources = [
        ...platformData.resources.tutorials,
        ...platformData.resources.documentation,
        ...platformData.resources.videos,
        ...platformData.resources.courses,
        ...platformData.resources.sampleProjects,
      ];

      for (const resource of allResources) {
        if (!resource.id) {
          errors.push(`Platform ${platformId} has resource without ID: ${resource.title}`);
        }

        if (!resource.url) {
          errors.push(
            `Platform ${platformId} resource ${resource.id} missing URL: ${resource.title}`
          );
        }
      }
    }
  } catch (error) {
    errors.push(`Failed to load knowledge base: ${error}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
