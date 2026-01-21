/**
 * Serverless Suitability Analyzer
 *
 * Analyzes workload patterns to determine if serverless is a good fit.
 */

import type {
  SuitabilityRecommendation,
  SuitabilityAnalysisResult,
  WorkloadType,
} from './types.js';

interface WorkloadRequirements {
  description: string;
  expectedExecutionTime?: number; // in seconds
  memoryRequirements?: number; // in GB
  isStateful?: boolean;
  hasWebSockets?: boolean;
  requiresContinuousConnection?: boolean;
  trafficPattern?: 'variable' | 'consistent' | 'spiky';
  dataProcessingType?: 'stream' | 'batch' | 'realtime';
}

/**
 * Keywords for workload type detection
 */
const WORKLOAD_PATTERNS = {
  'event-driven': [
    'webhook',
    'event',
    'trigger',
    'notification',
    'message queue',
    'pub/sub',
    'sns',
    'sqs',
    'eventbridge',
    'file upload',
    'image processing',
    'email processing',
  ],
  'api-driven': [
    'rest api',
    'graphql',
    'api endpoint',
    'http',
    'json',
    'crud',
    'microservice',
    'backend',
    'server',
  ],
  batch: [
    'batch',
    'cron',
    'scheduled',
    'nightly',
    'daily job',
    'etl',
    'data pipeline',
    'report generation',
  ],
  stateful: [
    'websocket',
    'real-time chat',
    'persistent connection',
    'session state',
    'in-memory cache',
    'stateful',
  ],
  'long-running': [
    'video encoding',
    'large file processing',
    'hours',
    'long-running',
    'background worker',
    'continuous',
  ],
};

/**
 * Anti-patterns that make serverless unsuitable
 */
const ANTI_PATTERNS = {
  stateful: [
    'websocket',
    'real-time chat',
    'persistent connection',
    'stateful',
    'session state',
  ],
  'long-running': [
    'video encoding',
    'large file',
    'hours of processing',
    'continuous processing',
  ],
  'high-memory': ['10gb', '20gb', 'terabyte', 'high memory', 'large dataset in memory'],
};

/**
 * Analyze serverless suitability
 */
export function analyzeSuitability(
  requirements: WorkloadRequirements
): SuitabilityAnalysisResult {
  const descLower = requirements.description.toLowerCase();

  // Detect workload type
  const workloadType = detectWorkloadType(descLower);

  // Check for anti-patterns
  const antiPatterns = detectAntiPatterns(requirements);

  // Determine recommendation
  const recommendation = determineRecommendation(workloadType, antiPatterns, requirements);

  // Generate rationale
  const rationale = generateRationale(workloadType, recommendation, requirements);

  // Generate warnings
  const warnings = generateWarnings(antiPatterns, requirements);

  return {
    recommendation,
    rationale,
    warnings,
    workloadType,
  };
}

/**
 * Detect workload type from description
 */
function detectWorkloadType(description: string): WorkloadType {
  const scores: Record<WorkloadType, number> = {
    'event-driven': 0,
    'api-driven': 0,
    batch: 0,
    stateful: 0,
    'long-running': 0,
  };

  for (const [type, keywords] of Object.entries(WORKLOAD_PATTERNS)) {
    for (const keyword of keywords) {
      if (description.includes(keyword)) {
        scores[type as WorkloadType] += 1;
      }
    }
  }

  // Return workload type with highest score
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) {
    // Default to api-driven if no clear pattern
    return 'api-driven';
  }

  return Object.keys(scores).find((key) => scores[key as WorkloadType] === maxScore) as WorkloadType;
}

/**
 * Check if any keyword from a list matches the description
 */
function matchesKeyword(description: string, keywords: string[]): boolean {
  return keywords.some((keyword) => description.includes(keyword));
}

/**
 * Detect anti-patterns
 */
function detectAntiPatterns(requirements: WorkloadRequirements): string[] {
  const detected = new Set<string>();
  const descLower = requirements.description.toLowerCase();

  // Check stateful anti-patterns
  const isStateful =
    requirements.isStateful ||
    requirements.hasWebSockets ||
    requirements.requiresContinuousConnection ||
    matchesKeyword(descLower, ANTI_PATTERNS.stateful);
  if (isStateful) {
    detected.add('stateful');
  }

  // Check long-running anti-patterns (> 15 minutes)
  const isLongRunning =
    (requirements.expectedExecutionTime && requirements.expectedExecutionTime > 900) ||
    matchesKeyword(descLower, ANTI_PATTERNS['long-running']);
  if (isLongRunning) {
    detected.add('long-running');
  }

  // Check high-memory anti-patterns (> 10 GB)
  const isHighMemory =
    (requirements.memoryRequirements && requirements.memoryRequirements > 10) ||
    matchesKeyword(descLower, ANTI_PATTERNS['high-memory']);
  if (isHighMemory) {
    detected.add('high-memory');
  }

  return Array.from(detected);
}

/**
 * Determine recommendation based on workload and anti-patterns
 */
function determineRecommendation(
  workloadType: WorkloadType,
  antiPatterns: string[],
  requirements: WorkloadRequirements
): SuitabilityRecommendation {
  // Strong anti-patterns = "no"
  if (
    antiPatterns.includes('stateful') ||
    antiPatterns.includes('long-running') ||
    antiPatterns.includes('high-memory')
  ) {
    return 'no';
  }

  // Good patterns = "yes"
  if (workloadType === 'event-driven' || workloadType === 'api-driven' || workloadType === 'batch') {
    // Check traffic pattern
    if (requirements.trafficPattern === 'spiky' || requirements.trafficPattern === 'variable') {
      return 'yes'; // Serverless shines with variable traffic
    }

    if (requirements.trafficPattern === 'consistent') {
      return 'conditional'; // Consistent high traffic might be cheaper with containers
    }

    return 'yes'; // Default to yes for good patterns
  }

  // Unknown patterns = "conditional"
  return 'conditional';
}

/**
 * Generate rationale for recommendation
 */
function generateRationale(
  workloadType: WorkloadType,
  recommendation: SuitabilityRecommendation,
  requirements: WorkloadRequirements
): {
  cost: string;
  scalability: string;
  complexity: string;
} {
  const rationale = {
    cost: '',
    scalability: '',
    complexity: '',
  };

  if (recommendation === 'yes') {
    rationale.cost = 'Pay-per-use pricing is cost-effective for variable workloads. Free tier covers small traffic.';
    rationale.scalability = 'Automatic scaling to zero during idle periods. Handles traffic spikes seamlessly.';
    rationale.complexity = 'Managed infrastructure reduces operational overhead. Focus on code, not servers.';
  } else if (recommendation === 'conditional') {
    if (requirements.trafficPattern === 'consistent') {
      rationale.cost =
        'For consistent high traffic, containers or VMs may be more cost-effective. Consider reserved capacity.';
    } else {
      rationale.cost =
        'Cost depends on traffic patterns. Serverless is economical for variable loads, but monitor usage.';
    }
    rationale.scalability =
      'Serverless scales automatically, but consider cold starts for latency-sensitive applications.';
    rationale.complexity =
      'Managed infrastructure is convenient, but debugging and monitoring can be challenging.';
  } else {
    // recommendation === 'no'
    rationale.cost =
      'Serverless is not cost-effective for this workload. Consider containers, VMs, or dedicated servers.';
    rationale.scalability =
      'Serverless execution limits (time, memory) make it unsuitable for this workload.';
    rationale.complexity =
      'This workload requires stateful architecture or long-running processes that serverless cannot support.';
  }

  return rationale;
}

/**
 * Generate warnings for anti-patterns
 */
function generateWarnings(antiPatterns: string[], requirements: WorkloadRequirements): string[] {
  const warnings: string[] = [];

  if (antiPatterns.includes('stateful')) {
    warnings.push(
      'Stateful applications (WebSockets, real-time chat) are not well-suited for serverless. ' +
        'Consider using containers with persistent connections instead.'
    );
  }

  if (antiPatterns.includes('long-running')) {
    warnings.push(
      'Long-running processes (> 15 minutes) exceed serverless execution limits. ' +
        'Consider batch processing systems, containers, or Step Functions for orchestration.'
    );
  }

  if (antiPatterns.includes('high-memory')) {
    warnings.push(
      'High memory requirements (> 10 GB) exceed serverless limits. ' +
        'Consider VMs, containers, or specialized compute instances instead.'
    );
  }

  // Additional warnings based on requirements
  if (requirements.requiresContinuousConnection) {
    warnings.push(
      'Continuous connections are not supported in serverless. ' +
        'Use containers or managed services for persistent connections.'
    );
  }

  return warnings;
}
