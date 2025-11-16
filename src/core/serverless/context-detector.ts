/**
 * Context Detector
 *
 * Detects project context (pet project, startup, enterprise) based on
 * keywords and metadata.
 */

import type {
  ProjectContext,
  ConfidenceLevel,
  ContextDetectionResult,
  ProjectMetadata,
} from './types.js';

/**
 * Keyword signals for each context type
 */
const CONTEXT_SIGNALS = {
  'pet-project': [
    'learning',
    'personal',
    'side project',
    'hobby',
    'experiment',
    'portfolio',
    'practice',
    'tutorial',
    'pet project',
    'for fun',
    'self-taught',
    'beginner',
    'student',
    'school project',
    'university',
    'bootcamp',
    'trying out',
    'play around',
  ],
  startup: [
    'mvp',
    'minimum viable product',
    'early stage',
    'startup',
    'founder',
    'co-founder',
    'seed funding',
    'series a',
    'investors',
    'pitch',
    'product-market fit',
    'yc',
    'y combinator',
    'accelerator',
    'incubator',
    'bootstrapped',
    'launch',
    'traction',
    'users',
    'growth',
    'revenue',
  ],
  enterprise: [
    'production',
    'large scale',
    'compliance',
    'soc 2',
    'hipaa',
    'gdpr',
    'pci-dss',
    'enterprise',
    'corporate',
    'mission critical',
    'high availability',
    '99.9',
    'sla',
    'uptime',
    'audit',
    'security review',
    'penetration test',
    'disaster recovery',
    'business continuity',
    'multi-region',
    'thousands of users',
    'millions of users',
  ],
};

/**
 * Detect project context from user input
 */
export function detectContext(
  userInput: string,
  metadata?: ProjectMetadata
): ContextDetectionResult {
  const inputLower = userInput.toLowerCase();

  // Count keyword matches for each context
  const scores = {
    'pet-project': 0,
    startup: 0,
    enterprise: 0,
  };

  for (const [context, keywords] of Object.entries(CONTEXT_SIGNALS)) {
    for (const keyword of keywords) {
      if (inputLower.includes(keyword)) {
        scores[context as ProjectContext] += 1;
      }
    }
  }

  // Analyze metadata if provided
  if (metadata) {
    const metadataScores = analyzeMetadata(metadata);
    scores['pet-project'] += metadataScores['pet-project'];
    scores.startup += metadataScores.startup;
    scores.enterprise += metadataScores.enterprise;
  }

  // Determine context based on highest score
  const maxScore = Math.max(scores['pet-project'], scores.startup, scores.enterprise);
  const context: ProjectContext =
    maxScore === scores.enterprise
      ? 'enterprise'
      : maxScore === scores.startup
      ? 'startup'
      : 'pet-project';

  // Calculate confidence score (0-100)
  const totalScore = scores['pet-project'] + scores.startup + scores.enterprise;
  const confidenceScore = totalScore > 0 ? Math.min(100, (maxScore / totalScore) * 100) : 30;

  const confidenceLevel: ConfidenceLevel =
    confidenceScore >= 70 ? 'high' : confidenceScore >= 40 ? 'medium' : 'low';

  // Collect signals (keywords that matched)
  const signals: string[] = [];
  for (const [ctx, keywords] of Object.entries(CONTEXT_SIGNALS)) {
    if (ctx === context) {
      for (const keyword of keywords) {
        if (inputLower.includes(keyword)) {
          signals.push(keyword);
        }
      }
    }
  }

  // Generate clarifying questions if confidence is low
  const clarifyingQuestions =
    confidenceLevel === 'low' ? generateClarifyingQuestions(metadata) : undefined;

  return {
    context,
    confidence: confidenceLevel,
    confidenceScore,
    signals,
    clarifyingQuestions,
  };
}

/**
 * Analyze project metadata to determine context
 */
function analyzeMetadata(metadata: ProjectMetadata): Record<ProjectContext, number> {
  const scores: Record<ProjectContext, number> = {
    'pet-project': 0,
    startup: 0,
    enterprise: 0,
  };

  // Team size analysis
  if (metadata.teamSize !== undefined) {
    if (metadata.teamSize <= 2) {
      scores['pet-project'] += 3;
    } else if (metadata.teamSize <= 15) {
      scores.startup += 3;
    } else {
      scores.enterprise += 3;
    }
  }

  // Traffic analysis
  if (metadata.expectedTrafficRequestsPerMonth !== undefined) {
    if (metadata.expectedTrafficRequestsPerMonth < 100000) {
      scores['pet-project'] += 2;
    } else if (metadata.expectedTrafficRequestsPerMonth < 10000000) {
      scores.startup += 2;
    } else {
      scores.enterprise += 2;
    }
  }

  // Budget analysis
  if (metadata.monthlyBudget !== undefined) {
    if (metadata.monthlyBudget === 0 || metadata.monthlyBudget < 50) {
      scores['pet-project'] += 3;
    } else if (metadata.monthlyBudget < 1000) {
      scores.startup += 3;
    } else {
      scores.enterprise += 3;
    }
  }

  // Compliance requirements indicate enterprise
  if (metadata.complianceRequirements && metadata.complianceRequirements.length > 0) {
    scores.enterprise += 5;
  }

  // Existing infrastructure indicates enterprise
  if (metadata.hasExistingInfrastructure) {
    scores.enterprise += 2;
  }

  return scores;
}

/**
 * Generate clarifying questions when confidence is low
 */
function generateClarifyingQuestions(metadata?: ProjectMetadata): string[] {
  const questions: string[] = [];

  if (!metadata || metadata.teamSize === undefined) {
    questions.push('How many people are on your team?');
  }

  if (!metadata || metadata.expectedTrafficRequestsPerMonth === undefined) {
    questions.push('How much traffic do you expect (requests per month)?');
  }

  if (!metadata || metadata.monthlyBudget === undefined) {
    questions.push('What is your monthly infrastructure budget?');
  }

  if (!metadata || !metadata.complianceRequirements) {
    questions.push('Do you have any compliance requirements (SOC 2, HIPAA, GDPR, PCI-DSS)?');
  }

  if (!metadata || metadata.hasExistingInfrastructure === undefined) {
    questions.push('Do you have existing infrastructure to integrate with?');
  }

  return questions;
}
