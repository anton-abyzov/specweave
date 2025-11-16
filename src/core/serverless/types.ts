/**
 * Serverless platform types for platform comparison and recommendation
 */

// Cloud providers (matches actual JSON data)
export type CloudProvider = 'AWS' | 'Azure' | 'GCP' | 'Supabase';

// Platform data structures
export interface PlatformPricing {
  freeTier: {
    requests: number;
    computeGbSeconds: number;
    dataTransferGb: number;
  };
  payAsYouGo: {
    requestsPer1M: number;
    computePerGbSecond: number;
    dataTransferPerGb: number;
  };
}

export interface PlatformFeatures {
  runtimes: string[];
  coldStartMs: number;
  maxExecutionMinutes: number;
  maxMemoryMb: number;
}

export interface PlatformEcosystem {
  integrations: string[];
  sdks: string[];
  communitySize: 'small' | 'medium' | 'large' | 'very-large';
  documentation?: 'poor' | 'good' | 'excellent';
}

export interface PlatformLockIn {
  portability: 'low' | 'medium' | 'high';
  migrationComplexity: 'low' | 'medium' | 'high';
  vendorLockIn: string;
}

export interface StartupProgram {
  name: string;
  credits: number;
  duration: string;
}

export interface ServerlessPlatform {
  id: string;
  name: string;
  provider: CloudProvider;
  pricing: PlatformPricing;
  features: PlatformFeatures;
  ecosystem: PlatformEcosystem;
  lockIn: PlatformLockIn;
  startupPrograms: StartupProgram[];
  lastVerified: string; // YYYY-MM-DD format
}

// Platform knowledge base
export interface PlatformKnowledgeBase {
  platforms: Map<string, ServerlessPlatform>;
  lastUpdated: string;
}

// Platform selection types
export interface PlatformRanking {
  platform: ServerlessPlatform;
  score: number;
  rationale: string;
  tradeoffs: {
    pros: string[];
    cons: string[];
  };
}

export interface PlatformSelectionResult {
  rankedPlatforms: PlatformRanking[];
  recommendedPlatform: PlatformRanking;
  context: ProjectContext;
}

// Context detection types
export type ProjectContext = 'pet-project' | 'startup' | 'enterprise';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface ProjectMetadata {
  teamSize?: number;
  expectedTrafficRequestsPerMonth?: number;
  monthlyBudget?: number;
  complianceRequirements?: string[];
  hasExistingInfrastructure?: boolean;
}

export interface ContextDetectionResult {
  context: ProjectContext;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  signals: string[];
  clarifyingQuestions?: string[];
}

// Suitability analysis types
export type SuitabilityRecommendation = 'yes' | 'no' | 'conditional';
export type WorkloadType = 'event-driven' | 'api-driven' | 'batch' | 'stateful' | 'long-running';

export interface SuitabilityAnalysisResult {
  recommendation: SuitabilityRecommendation;
  rationale: {
    cost: string;
    scalability: string;
    complexity: string;
  };
  warnings: string[];
  workloadType: WorkloadType;
}
