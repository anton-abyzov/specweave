/**
 * Project Mapper - Intelligent User Story to Project Classification
 *
 * Analyzes user story content, tech stack mentions, and component architecture
 * to intelligently map user stories to the correct projects (FE, BE, MOBILE, etc.)
 *
 * @module project-mapper
 */

export interface ProjectMapping {
  projectId: string;
  confidence: number; // 0.0-1.0
  reasoning: string[];
}

export interface UserStory {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  technicalContext?: string;
}

export interface ProjectRule {
  id: string;
  name: string;
  keywords: string[];
  techStack: string[];
  componentTypes: string[];
  excludeKeywords?: string[];
}

/**
 * Default project mapping rules
 * These can be customized via .specweave/config.json
 */
export const DEFAULT_PROJECT_RULES: ProjectRule[] = [
  {
    id: 'FE',
    name: 'Frontend (Web)',
    keywords: [
      'ui', 'ux', 'web', 'browser', 'chart', 'graph', 'visualization',
      'dashboard', 'button', 'form', 'input', 'page', 'view', 'screen',
      'modal', 'dropdown', 'navigation', 'menu', 'search', 'filter',
      'responsive', 'desktop', 'tablet', 'css', 'styling', 'theme',
      'dark mode', 'light mode', 'component', 'state management'
    ],
    techStack: [
      'react', 'vue', 'angular', 'next.js', 'gatsby', 'svelte',
      'typescript', 'javascript', 'html', 'css', 'scss', 'tailwind',
      'mui', 'material-ui', 'antd', 'chakra', 'redux', 'zustand',
      'recharts', 'd3', 'chart.js', 'plotly'
    ],
    componentTypes: [
      'component', 'hook', 'context', 'provider', 'hoc', 'page',
      'layout', 'template', 'widget'
    ]
  },
  {
    id: 'BE',
    name: 'Backend (API)',
    keywords: [
      'api', 'endpoint', 'rest', 'graphql', 'database', 'query',
      'migration', 'schema', 'model', 'service', 'controller',
      'authentication', 'authorization', 'jwt', 'session', 'token',
      'validation', 'sanitization', 'rate limiting', 'caching',
      'redis', 'queue', 'job', 'worker', 'webhook', 'integration',
      'third-party', 'external api', 'data processing', 'batch',
      'cron', 'scheduler', 'background'
    ],
    techStack: [
      'node.js', 'express', 'fastify', 'nestjs', 'koa',
      'python', 'fastapi', 'django', 'flask',
      'java', 'spring boot',
      '.net', 'asp.net',
      'go', 'gin',
      'rust', 'actix',
      'postgresql', 'mysql', 'mongodb', 'redis',
      'prisma', 'typeorm', 'sequelize', 'sqlalchemy'
    ],
    componentTypes: [
      'controller', 'service', 'repository', 'middleware',
      'route', 'handler', 'util', 'helper', 'validator'
    ]
  },
  {
    id: 'MOBILE',
    name: 'Mobile (iOS/Android)',
    keywords: [
      'mobile', 'ios', 'android', 'app', 'native', 'cross-platform',
      'push notification', 'offline', 'sync', 'device', 'camera',
      'gps', 'location', 'gesture', 'touch', 'swipe', 'navigation',
      'tab bar', 'bottom sheet', 'drawer', 'stack', 'screen transition',
      'deep linking', 'universal link', 'app store', 'play store'
    ],
    techStack: [
      'react native', 'expo', 'flutter', 'swift', 'swiftui',
      'kotlin', 'jetpack compose', 'xamarin', 'cordova', 'ionic',
      'react-navigation', 'react-native-reanimated', 'asyncstorage'
    ],
    componentTypes: [
      'screen', 'navigator', 'modal', 'bottom-sheet', 'drawer'
    ],
    excludeKeywords: ['web']
  },
  {
    id: 'INFRA',
    name: 'Infrastructure',
    keywords: [
      'deployment', 'ci/cd', 'docker', 'kubernetes', 'helm',
      'terraform', 'cloudformation', 'infrastructure', 'devops',
      'monitoring', 'logging', 'metrics', 'alerting', 'slo', 'sli',
      'scalability', 'load balancing', 'cdn', 'dns', 'ssl', 'tls',
      'security', 'firewall', 'vpc', 'network', 'backup', 'disaster recovery'
    ],
    techStack: [
      'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'terraform',
      'ansible', 'jenkins', 'github actions', 'gitlab ci', 'circleci',
      'prometheus', 'grafana', 'datadog', 'new relic', 'sentry'
    ],
    componentTypes: [
      'pipeline', 'manifest', 'helm chart', 'terraform module'
    ]
  }
];

/**
 * Analyze user story content and map to projects
 *
 * @param userStory User story to analyze
 * @param projectRules Project mapping rules (defaults to DEFAULT_PROJECT_RULES)
 * @returns Array of project mappings sorted by confidence (highest first)
 */
export function mapUserStoryToProjects(
  userStory: UserStory,
  projectRules: ProjectRule[] = DEFAULT_PROJECT_RULES
): ProjectMapping[] {
  const mappings: ProjectMapping[] = [];

  // Combine all user story text for analysis
  const fullText = [
    userStory.title,
    userStory.description,
    ...userStory.acceptanceCriteria,
    userStory.technicalContext || ''
  ].join(' ').toLowerCase();

  for (const rule of projectRules) {
    const reasoning: string[] = [];
    let score = 0;
    let maxScore = 0;

    // Keyword matching (40% weight)
    const keywordMatches = rule.keywords.filter(keyword =>
      fullText.includes(keyword.toLowerCase())
    );
    const keywordScore = keywordMatches.length * 0.4;
    score += keywordScore;
    maxScore += rule.keywords.length * 0.4;

    if (keywordMatches.length > 0) {
      reasoning.push(`Keywords: ${keywordMatches.slice(0, 5).join(', ')}`);
    }

    // Tech stack matching (40% weight)
    const techStackMatches = rule.techStack.filter(tech =>
      fullText.includes(tech.toLowerCase())
    );
    const techScore = techStackMatches.length * 0.4;
    score += techScore;
    maxScore += rule.techStack.length * 0.4;

    if (techStackMatches.length > 0) {
      reasoning.push(`Tech stack: ${techStackMatches.slice(0, 5).join(', ')}`);
    }

    // Component type matching (20% weight)
    const componentMatches = rule.componentTypes.filter(component =>
      fullText.includes(component.toLowerCase())
    );
    const componentScore = componentMatches.length * 0.2;
    score += componentScore;
    maxScore += rule.componentTypes.length * 0.2;

    if (componentMatches.length > 0) {
      reasoning.push(`Components: ${componentMatches.slice(0, 3).join(', ')}`);
    }

    // Exclude keywords (penalty)
    if (rule.excludeKeywords) {
      const excludeMatches = rule.excludeKeywords.filter(keyword =>
        fullText.includes(keyword.toLowerCase())
      );

      if (excludeMatches.length > 0) {
        score *= 0.5; // 50% penalty
        reasoning.push(`Penalty: ${excludeMatches.join(', ')} (not primary focus)`);
      }
    }

    // Normalize confidence (0.0-1.0)
    const confidence = maxScore > 0 ? Math.min(score / (maxScore * 0.3), 1.0) : 0;

    // Only include mappings with confidence > 0.1
    if (confidence > 0.1) {
      mappings.push({
        projectId: rule.id,
        confidence,
        reasoning
      });
    }
  }

  // Sort by confidence (highest first)
  mappings.sort((a, b) => b.confidence - a.confidence);

  return mappings;
}

/**
 * Determine primary project for a user story
 * (highest confidence mapping)
 *
 * @param userStory User story to analyze
 * @param projectRules Project mapping rules
 * @returns Primary project mapping or null if no confident match
 */
export function getPrimaryProject(
  userStory: UserStory,
  projectRules: ProjectRule[] = DEFAULT_PROJECT_RULES
): ProjectMapping | null {
  const mappings = mapUserStoryToProjects(userStory, projectRules);

  // Require at least 30% confidence for primary project
  return mappings.length > 0 && mappings[0].confidence >= 0.3
    ? mappings[0]
    : null;
}

/**
 * Split spec into project-specific specs based on user story mappings
 *
 * @param userStories Array of user stories
 * @param projectRules Project mapping rules
 * @returns Map of projectId → user stories
 */
export function splitSpecByProject(
  userStories: UserStory[],
  projectRules: ProjectRule[] = DEFAULT_PROJECT_RULES
): Map<string, UserStory[]> {
  const projectSpecs = new Map<string, UserStory[]>();

  for (const userStory of userStories) {
    const primaryProject = getPrimaryProject(userStory, projectRules);

    if (primaryProject) {
      const existing = projectSpecs.get(primaryProject.projectId) || [];
      existing.push(userStory);
      projectSpecs.set(primaryProject.projectId, existing);
    } else {
      // No confident match - assign to "SHARED" or primary project
      const shared = projectSpecs.get('SHARED') || [];
      shared.push(userStory);
      projectSpecs.set('SHARED', shared);
    }
  }

  return projectSpecs;
}

/**
 * Suggest JIRA item type hierarchy based on user story scope
 *
 * @param userStory User story to analyze
 * @returns Suggested JIRA item type (Epic, Story, Task, Subtask)
 */
export function suggestJiraItemType(userStory: UserStory): 'Epic' | 'Story' | 'Task' | 'Subtask' {
  const storyPoints = estimateStoryPoints(userStory);

  // Epic: > 13 story points (large feature area)
  if (storyPoints > 13) {
    return 'Epic';
  }

  // Story: 3-13 story points (standard user story)
  if (storyPoints >= 3) {
    return 'Story';
  }

  // Task: 1-2 story points (small implementation task)
  if (storyPoints >= 1) {
    return 'Task';
  }

  // Subtask: < 1 story point (granular work)
  return 'Subtask';
}

/**
 * Estimate story points based on acceptance criteria count and complexity
 *
 * @param userStory User story to estimate
 * @returns Estimated story points (1-21)
 */
function estimateStoryPoints(userStory: UserStory): number {
  const acCount = userStory.acceptanceCriteria.length;

  // Simple heuristic: 1 AC ≈ 1 story point, max 21
  return Math.min(acCount, 21);
}

/**
 * Format project mapping report (for display to user)
 *
 * @param userStory User story
 * @param mappings Project mappings
 * @returns Formatted markdown report
 */
export function formatProjectMappingReport(
  userStory: UserStory,
  mappings: ProjectMapping[]
): string {
  const lines: string[] = [];

  lines.push(`## ${userStory.id}: ${userStory.title}`);
  lines.push('');

  if (mappings.length === 0) {
    lines.push('❌ **No project match** (assign to SHARED)');
    return lines.join('\n');
  }

  lines.push(`✅ **Primary Project**: ${mappings[0].projectId} (${(mappings[0].confidence * 100).toFixed(0)}% confidence)`);
  lines.push('');

  lines.push('**Reasoning**:');
  for (const reason of mappings[0].reasoning) {
    lines.push(`- ${reason}`);
  }

  if (mappings.length > 1) {
    lines.push('');
    lines.push('**Secondary Matches**:');
    for (const mapping of mappings.slice(1, 3)) {
      lines.push(`- ${mapping.projectId} (${(mapping.confidence * 100).toFixed(0)}%)`);
    }
  }

  return lines.join('\n');
}
