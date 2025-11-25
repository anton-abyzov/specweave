/**
 * Multi-Repo Intent Detector
 *
 * Detects when user describes a multi-repo architecture and extracts
 * suggested repo structure with project prefixes.
 *
 * @example
 * detectMultiRepoIntent("Build platform with 3 repos: Frontend, Backend, Shared")
 * // Returns:
 * // {
 * //   detected: true,
 * //   confidence: 'high',
 * //   suggestedRepos: [
 * //     { name: 'frontend', type: 'frontend', prefix: 'FE' },
 * //     { name: 'backend', type: 'backend', prefix: 'BE' },
 * //     { name: 'shared', type: 'shared', prefix: 'SHARED' }
 * //   ]
 * // }
 */

export type RepoType = 'frontend' | 'backend' | 'shared' | 'api' | 'mobile' | 'infrastructure' | 'unknown';

export interface SuggestedRepo {
  /** Suggested repo name (lowercase, kebab-case) */
  name: string;
  /** Detected repo type */
  type: RepoType;
  /** Prefix for user stories (e.g., 'FE', 'BE', 'SHARED') */
  prefix: string;
  /** Keywords that triggered this detection */
  matchedKeywords: string[];
  /** Original text that matched */
  originalMatch?: string;
}

export interface MultiRepoIntent {
  /** Whether multi-repo architecture was detected */
  detected: boolean;
  /** Confidence level of detection */
  confidence: 'high' | 'medium' | 'low';
  /** Suggested repos with types and prefixes */
  suggestedRepos: SuggestedRepo[];
  /** GitHub URLs if user provided them */
  cloneUrls: string[];
  /** Raw detection triggers that fired */
  triggers: string[];
}

/** Patterns that indicate multi-repo architecture */
const MULTI_REPO_PATTERNS = [
  // Explicit multi-repo mentions
  /(\d+)\s*repos?/i,                                    // "3 repos", "2 repo"
  /multiple\s+repos?/i,                                 // "multiple repos"
  /separate\s+repos?/i,                                 // "separate repos"
  /independent\s+repos?/i,                              // "independent repos"

  // Architecture patterns
  /monorepo\s+with/i,                                   // "monorepo with"
  /microservices?/i,                                    // "microservices"
  /multi[- ]?repo/i,                                    // "multi-repo", "multirepo"

  // Service/package listings
  /services?:\s*\*\*/i,                                 // "services: **Frontend**"
  /packages?:\s*\*\*/i,                                 // "packages: **Shared**"

  // Explicit repo type mentions with "repo"
  /frontend\s+repo/i,                                   // "Frontend repo"
  /backend\s+repo/i,                                    // "Backend repo"
  /api\s+repo/i,                                        // "API repo"
  /shared\s+(library\s+)?repo/i,                        // "Shared repo", "Shared library repo"
  /mobile\s+repo/i,                                     // "Mobile repo"
];

/** Patterns to extract individual repo names/types */
const REPO_TYPE_PATTERNS: Array<{ pattern: RegExp; type: RepoType; prefix: string; name: string }> = [
  // Frontend variations
  { pattern: /\*\*frontend\s*repo\*\*/i, type: 'frontend', prefix: 'FE', name: 'frontend' },
  { pattern: /frontend\s+repo/i, type: 'frontend', prefix: 'FE', name: 'frontend' },
  { pattern: /\bfe\s+repo/i, type: 'frontend', prefix: 'FE', name: 'frontend' },
  { pattern: /web\s+(?:app|frontend)/i, type: 'frontend', prefix: 'FE', name: 'web-frontend' },
  { pattern: /ui\s+repo/i, type: 'frontend', prefix: 'FE', name: 'ui' },
  { pattern: /client\s+repo/i, type: 'frontend', prefix: 'FE', name: 'client' },
  { pattern: /drag[- ]?drop\s+.*builder/i, type: 'frontend', prefix: 'FE', name: 'frontend' },
  { pattern: /menu\s+builder/i, type: 'frontend', prefix: 'FE', name: 'frontend' },
  { pattern: /customer[- ]facing/i, type: 'frontend', prefix: 'FE', name: 'frontend' },
  { pattern: /mobile[- ]optimized/i, type: 'frontend', prefix: 'FE', name: 'frontend' },

  // Backend variations
  { pattern: /\*\*backend\s*(api\s*)?repo\*\*/i, type: 'backend', prefix: 'BE', name: 'backend' },
  { pattern: /backend\s*(api\s*)?repo/i, type: 'backend', prefix: 'BE', name: 'backend' },
  { pattern: /\bbe\s+repo/i, type: 'backend', prefix: 'BE', name: 'backend' },
  { pattern: /api\s+repo/i, type: 'api', prefix: 'BE', name: 'api' },
  { pattern: /server\s+repo/i, type: 'backend', prefix: 'BE', name: 'server' },
  { pattern: /crud\s+endpoints?/i, type: 'backend', prefix: 'BE', name: 'backend' },
  { pattern: /webhook\s+notifications?/i, type: 'backend', prefix: 'BE', name: 'backend' },
  { pattern: /analytics\s+tracking/i, type: 'backend', prefix: 'BE', name: 'backend' },

  // Shared/Common variations
  { pattern: /\*\*shared\s*(library\s*)?repo\*\*/i, type: 'shared', prefix: 'SHARED', name: 'shared' },
  { pattern: /shared\s*(library\s*)?repo/i, type: 'shared', prefix: 'SHARED', name: 'shared' },
  { pattern: /common\s+repo/i, type: 'shared', prefix: 'SHARED', name: 'common' },
  { pattern: /lib\s+repo/i, type: 'shared', prefix: 'SHARED', name: 'lib' },
  { pattern: /core\s+repo/i, type: 'shared', prefix: 'SHARED', name: 'core' },
  { pattern: /schema\s+validators?/i, type: 'shared', prefix: 'SHARED', name: 'shared' },
  { pattern: /validation\s+schemas?/i, type: 'shared', prefix: 'SHARED', name: 'shared' },
  { pattern: /type\s+definitions?/i, type: 'shared', prefix: 'SHARED', name: 'shared' },
  { pattern: /localization\s+helpers?/i, type: 'shared', prefix: 'SHARED', name: 'shared' },

  // Mobile variations
  { pattern: /mobile\s+repo/i, type: 'mobile', prefix: 'MOBILE', name: 'mobile' },
  { pattern: /ios\s+repo/i, type: 'mobile', prefix: 'MOBILE', name: 'ios' },
  { pattern: /android\s+repo/i, type: 'mobile', prefix: 'MOBILE', name: 'android' },
  { pattern: /react\s*native/i, type: 'mobile', prefix: 'MOBILE', name: 'mobile' },
  { pattern: /flutter/i, type: 'mobile', prefix: 'MOBILE', name: 'mobile' },

  // Infrastructure variations
  { pattern: /infra(structure)?\s+repo/i, type: 'infrastructure', prefix: 'INFRA', name: 'infrastructure' },
  { pattern: /devops\s+repo/i, type: 'infrastructure', prefix: 'INFRA', name: 'devops' },
  { pattern: /terraform/i, type: 'infrastructure', prefix: 'INFRA', name: 'infrastructure' },
  { pattern: /k8s|kubernetes/i, type: 'infrastructure', prefix: 'INFRA', name: 'infrastructure' },
];

/** GitHub URL pattern */
const GITHUB_URL_PATTERN = /https?:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/gi;

/**
 * Detect multi-repo intent from user prompt
 *
 * @param userPrompt - User's project description
 * @returns Detection result with suggested repos
 */
export function detectMultiRepoIntent(userPrompt: string): MultiRepoIntent {
  const triggers: string[] = [];
  const suggestedRepos: SuggestedRepo[] = [];
  const cloneUrls: string[] = [];

  // 1. Check for explicit multi-repo patterns
  for (const pattern of MULTI_REPO_PATTERNS) {
    const match = userPrompt.match(pattern);
    if (match) {
      triggers.push(match[0]);
    }
  }

  // 2. Extract GitHub URLs
  const urlMatches = userPrompt.match(GITHUB_URL_PATTERN);
  if (urlMatches) {
    cloneUrls.push(...urlMatches);
    triggers.push(`GitHub URLs: ${urlMatches.length}`);
  }

  // 3. Detect individual repo types
  const seenTypes = new Set<string>();

  for (const { pattern, type, prefix, name } of REPO_TYPE_PATTERNS) {
    const match = userPrompt.match(pattern);
    if (match && !seenTypes.has(type)) {
      seenTypes.add(type);
      suggestedRepos.push({
        name,
        type,
        prefix,
        matchedKeywords: [match[0]],
        originalMatch: match[0],
      });
    }
  }

  // 4. Try to extract repo count from "N repos" pattern
  const repoCountMatch = userPrompt.match(/(\d+)\s*repos?/i);
  const expectedRepoCount = repoCountMatch ? parseInt(repoCountMatch[1], 10) : 0;

  // 5. Calculate confidence
  let confidence: 'high' | 'medium' | 'low' = 'low';

  if (triggers.length >= 2 && suggestedRepos.length >= 2) {
    confidence = 'high';
  } else if (triggers.length >= 1 && suggestedRepos.length >= 2) {
    confidence = 'high';
  } else if (triggers.length >= 1 || suggestedRepos.length >= 2) {
    confidence = 'medium';
  } else if (suggestedRepos.length === 1 || cloneUrls.length >= 2) {
    confidence = 'medium';
  }

  // 6. Check if detection threshold met
  const detected = (
    triggers.length >= 1 ||
    suggestedRepos.length >= 2 ||
    cloneUrls.length >= 2 ||
    (expectedRepoCount >= 2 && suggestedRepos.length >= 1)
  );

  return {
    detected,
    confidence,
    suggestedRepos,
    cloneUrls,
    triggers,
  };
}

/**
 * Get user story prefix for a repo type
 *
 * @param type - Repo type
 * @returns Prefix for user stories (e.g., 'FE', 'BE')
 */
export function getPrefixForRepoType(type: RepoType): string {
  const prefixMap: Record<RepoType, string> = {
    frontend: 'FE',
    backend: 'BE',
    api: 'BE',
    shared: 'SHARED',
    mobile: 'MOBILE',
    infrastructure: 'INFRA',
    unknown: 'GEN',
  };
  return prefixMap[type];
}

/**
 * Detect repo type from keywords in a user story description
 *
 * @param description - User story or feature description
 * @returns Detected repo type
 */
export function detectRepoTypeFromDescription(description: string): RepoType {
  const lower = description.toLowerCase();

  // Frontend indicators
  if (/\b(ui|component|page|form|view|button|modal|layout|style|css|theme|responsive|drag.?drop|builder)\b/i.test(lower)) {
    return 'frontend';
  }

  // Backend indicators
  if (/\b(api|endpoint|controller|service|database|query|crud|webhook|notification|email|sms|analytics)\b/i.test(lower)) {
    return 'backend';
  }

  // Shared indicators
  if (/\b(schema|validator|type|interface|model|utility|helper|common|shared|localization|i18n)\b/i.test(lower)) {
    return 'shared';
  }

  // Mobile indicators
  if (/\b(mobile|ios|android|native|app.?store|push.?notification|touch|gesture)\b/i.test(lower)) {
    return 'mobile';
  }

  // Infrastructure indicators
  if (/\b(terraform|k8s|kubernetes|docker|ci.?cd|deploy|infrastructure|monitoring|logging)\b/i.test(lower)) {
    return 'infrastructure';
  }

  return 'unknown';
}

/**
 * Parse repo name to extract project prefix
 *
 * @param repoName - Repository name (e.g., "sw-qr-menu-fe")
 * @returns Extracted prefix or null
 *
 * @example
 * extractPrefixFromRepoName("sw-qr-menu-fe") // "FE"
 * extractPrefixFromRepoName("my-app-backend") // "BE"
 * extractPrefixFromRepoName("shared-lib") // "SHARED"
 */
export function extractPrefixFromRepoName(repoName: string): string | null {
  const lower = repoName.toLowerCase();

  // Check suffixes first (most common pattern)
  if (/-fe$|frontend$|-web$|-ui$|-client$/.test(lower)) {
    return 'FE';
  }
  if (/-be$|backend$|-api$|-server$|-service$/.test(lower)) {
    return 'BE';
  }
  if (/-shared$|-common$|-lib$|-core$|-types$/.test(lower)) {
    return 'SHARED';
  }
  if (/-mobile$|-ios$|-android$|-app$/.test(lower)) {
    return 'MOBILE';
  }
  if (/-infra$|-devops$|-k8s$|-terraform$/.test(lower)) {
    return 'INFRA';
  }

  return null;
}

/**
 * Format multi-repo detection result for display
 *
 * @param result - Detection result
 * @returns Formatted string for user display
 */
export function formatDetectionResult(result: MultiRepoIntent): string {
  if (!result.detected) {
    return 'No multi-repo architecture detected.';
  }

  const lines: string[] = [
    `Multi-repo architecture detected (${result.confidence} confidence):`,
    '',
  ];

  if (result.suggestedRepos.length > 0) {
    lines.push('Suggested repos:');
    for (const repo of result.suggestedRepos) {
      lines.push(`  - ${repo.name} (${repo.type}) → User stories: US-${repo.prefix}-*`);
    }
    lines.push('');
  }

  if (result.cloneUrls.length > 0) {
    lines.push('GitHub URLs detected:');
    for (const url of result.cloneUrls) {
      lines.push(`  - ${url}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
