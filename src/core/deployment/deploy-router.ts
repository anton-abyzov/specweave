/**
 * Deploy Router
 *
 * Routes deployment to optimal platform (Vercel vs Cloudflare) based on
 * project analysis.
 */

import type {
  DeploymentPlatform,
  DeploymentFactor,
  DeploymentRecommendation,
  ProjectAnalysis,
  ConfidenceLevel,
  DeployRouterOptions,
} from './types.js';
import { analyzeProject } from './project-analyzer.js';

/**
 * Weight factors for scoring
 */
const WEIGHTS = {
  nativeModules: 30, // Heavy weight - absolute blocker for edge
  fileSystemUsage: 25,
  serverSideDB: 20,
  dynamicMeta: 15,
  getServerSideProps: 15,
  serverActions: 10,
  apiRoutes: 5,
  staticSite: 20, // Favors Cloudflare
  edgeCompatible: 15,
};

/**
 * Generate deployment factors from analysis
 */
function generateFactors(analysis: ProjectAnalysis): DeploymentFactor[] {
  const factors: DeploymentFactor[] = [];

  // Framework factor
  const frameworkImpact = getFrameworkImpact(analysis.framework.framework);
  factors.push({
    name: 'Framework',
    finding: `${analysis.framework.framework}${analysis.framework.version ? ` v${analysis.framework.version}` : ''}`,
    impact: frameworkImpact,
    weight: 10,
  });

  // Native modules
  if (analysis.nodeDeps.hasNativeModules) {
    factors.push({
      name: 'Native Modules',
      finding: `Uses: ${analysis.nodeDeps.nativeModules.join(', ')}`,
      impact: 'vercel',
      weight: WEIGHTS.nativeModules,
    });
  }

  // File system usage
  if (analysis.nodeDeps.hasFileSystemUsage) {
    factors.push({
      name: 'File System',
      finding: 'Uses Node.js fs module',
      impact: 'vercel',
      weight: WEIGHTS.fileSystemUsage,
    });
  }

  // Server-side database
  if (analysis.nodeDeps.hasServerSideDB) {
    const serverOnlyClients = analysis.nodeDeps.dbClients.filter(
      (c) => !c.includes('edge-compatible')
    );
    if (serverOnlyClients.length > 0) {
      factors.push({
        name: 'Database',
        finding: `Server-only clients: ${serverOnlyClients.join(', ')}`,
        impact: 'vercel',
        weight: WEIGHTS.serverSideDB,
      });
    }
  }

  // Dynamic meta/SEO
  if (analysis.seo.metaSourcesFromDB) {
    factors.push({
      name: 'Dynamic SEO',
      finding: 'Meta tags generated from database',
      impact: 'vercel',
      weight: WEIGHTS.dynamicMeta,
    });
  }

  // getServerSideProps
  if (analysis.ssr.hasGetServerSideProps) {
    factors.push({
      name: 'SSR Pattern',
      finding: 'Uses getServerSideProps',
      impact: 'vercel',
      weight: WEIGHTS.getServerSideProps,
    });
  }

  // Server Actions
  if (analysis.ssr.hasServerActions) {
    factors.push({
      name: 'Server Actions',
      finding: 'Uses React Server Actions',
      impact: analysis.nodeDeps.hasServerSideDB ? 'vercel' : 'neutral',
      weight: WEIGHTS.serverActions,
    });
  }

  // API Routes
  if (analysis.ssr.hasApiRoutes) {
    factors.push({
      name: 'API Routes',
      finding: 'Has API route handlers',
      impact: analysis.nodeDeps.hasNativeModules ? 'vercel' : 'neutral',
      weight: WEIGHTS.apiRoutes,
    });
  }

  // Edge compatibility
  if (analysis.edge.isEdgeCompatible) {
    factors.push({
      name: 'Edge Compatible',
      finding: 'No edge blockers detected',
      impact: 'cloudflare',
      weight: WEIGHTS.edgeCompatible,
    });
  }

  // Static site bonus
  if (isStaticSite(analysis)) {
    factors.push({
      name: 'Static Site',
      finding: 'No SSR requirements detected',
      impact: 'cloudflare',
      weight: WEIGHTS.staticSite,
    });
  }

  return factors;
}

/**
 * Determine framework's natural platform affinity
 */
function getFrameworkImpact(
  framework: string
): 'vercel' | 'cloudflare' | 'neutral' {
  switch (framework) {
    case 'nextjs':
      return 'neutral'; // Depends on features used
    case 'astro':
      return 'cloudflare'; // Static-first
    case 'gatsby':
      return 'cloudflare'; // Static-first
    case 'vite':
    case 'cra':
    case 'static':
      return 'cloudflare'; // Static/SPA
    case 'remix':
      return 'neutral'; // Supports both
    case 'nuxt':
    case 'sveltekit':
      return 'neutral'; // Adapter-based
    default:
      return 'neutral';
  }
}

/**
 * Check if project is essentially static
 */
function isStaticSite(analysis: ProjectAnalysis): boolean {
  const staticFrameworks = ['astro', 'gatsby', 'vite', 'cra', 'static'];

  if (staticFrameworks.includes(analysis.framework.framework)) {
    return true;
  }

  // Next.js without SSR patterns
  if (analysis.framework.framework === 'nextjs') {
    return (
      !analysis.ssr.hasServerComponents &&
      !analysis.ssr.hasServerActions &&
      !analysis.ssr.hasGetServerSideProps &&
      !analysis.nodeDeps.hasServerSideDB
    );
  }

  return false;
}

/**
 * Calculate platform scores
 */
function calculateScores(factors: DeploymentFactor[]): { vercel: number; cloudflare: number } {
  let vercelScore = 50; // Base score
  let cloudflareScore = 50;

  for (const factor of factors) {
    switch (factor.impact) {
      case 'vercel':
        vercelScore += factor.weight;
        break;
      case 'cloudflare':
        cloudflareScore += factor.weight;
        break;
      // neutral doesn't affect scores
    }
  }

  // Normalize to 0-100
  const total = vercelScore + cloudflareScore;
  return {
    vercel: Math.round((vercelScore / total) * 100),
    cloudflare: Math.round((cloudflareScore / total) * 100),
  };
}

/**
 * Determine confidence level based on score difference
 */
function getConfidenceLevel(scores: { vercel: number; cloudflare: number }): ConfidenceLevel {
  const diff = Math.abs(scores.vercel - scores.cloudflare);

  if (diff >= 30) return 'high';
  if (diff >= 15) return 'medium';
  return 'low';
}

/**
 * Determine winning platform based on scores and edge compatibility
 */
function determinePlatform(
  scores: { vercel: number; cloudflare: number },
  isEdgeCompatible: boolean
): DeploymentPlatform {
  // Edge blockers override any score-based preference for Cloudflare
  if (!isEdgeCompatible) {
    return 'vercel';
  }

  if (scores.vercel > scores.cloudflare) {
    return 'vercel';
  }

  if (scores.cloudflare > scores.vercel) {
    return 'cloudflare';
  }

  // Tie-breaker: prefer Cloudflare for cost when edge compatible
  return 'cloudflare';
}

/**
 * Generate reasoning text
 */
function generateReasoning(
  platform: DeploymentPlatform,
  analysis: ProjectAnalysis,
  factors: DeploymentFactor[]
): string {
  const reasons: string[] = [];

  if (platform === 'vercel') {
    if (analysis.nodeDeps.hasNativeModules) {
      reasons.push(
        `Your project uses native Node.js modules (${analysis.nodeDeps.nativeModules.join(', ')}) which require a Node.js runtime.`
      );
    }
    if (analysis.nodeDeps.hasServerSideDB) {
      reasons.push(
        'Database operations detected that require server-side execution.'
      );
    }
    if (analysis.seo.metaSourcesFromDB) {
      reasons.push(
        'Dynamic SEO meta tags are generated from database, requiring SSR.'
      );
    }
    if (analysis.nodeDeps.hasFileSystemUsage) {
      reasons.push('File system operations require Node.js runtime.');
    }
  } else if (platform === 'cloudflare') {
    if (isStaticSite(analysis)) {
      reasons.push(
        'Your project is primarily static, making it ideal for edge deployment.'
      );
    }
    if (analysis.edge.isEdgeCompatible) {
      reasons.push(
        'No edge-incompatible dependencies detected, allowing global edge distribution.'
      );
    }
    reasons.push(
      'Cloudflare offers cost-effective global CDN with generous free tier.'
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      `Based on analysis of ${factors.length} factors, ${platform === 'vercel' ? 'Vercel' : 'Cloudflare'} is the better fit.`
    );
  }

  return reasons.join(' ');
}

/**
 * Generate alternative recommendation
 */
function generateAlternative(
  platform: DeploymentPlatform,
  analysis: ProjectAnalysis
): { platform: DeploymentPlatform; migrationPath: string[] } | undefined {
  if (platform === 'vercel') {
    const migrationPath: string[] = [];

    if (analysis.nodeDeps.nativeModules.includes('prisma')) {
      migrationPath.push('Replace Prisma with Drizzle ORM + edge-compatible database');
    }
    if (analysis.nodeDeps.nativeModules.includes('sharp')) {
      migrationPath.push('Use Cloudflare Image Resizing or external image service');
    }
    if (analysis.nodeDeps.hasFileSystemUsage) {
      migrationPath.push('Replace fs operations with R2 storage or KV');
    }

    if (migrationPath.length > 0) {
      return {
        platform: 'cloudflare',
        migrationPath,
      };
    }
  } else if (platform === 'cloudflare') {
    return {
      platform: 'vercel',
      migrationPath: [
        'Vercel provides easier DX for complex Next.js features',
        'Better support for native Node.js modules',
        'Built-in image optimization',
      ],
    };
  }

  return undefined;
}

/**
 * Main deployment router function
 */
export function routeDeployment(
  projectPath: string,
  options: DeployRouterOptions = {}
): DeploymentRecommendation {
  const analysis = analyzeProject(projectPath);
  const factors = generateFactors(analysis);

  // Apply user preferences
  if (options.preferEdge) {
    factors.push({
      name: 'User Preference',
      finding: 'Prefers edge deployment',
      impact: 'cloudflare',
      weight: 15,
    });
  }

  if (options.preferCost) {
    factors.push({
      name: 'Cost Priority',
      finding: 'Cost-sensitive deployment',
      impact: 'cloudflare',
      weight: 10,
    });
  }

  if (options.requireSSR) {
    factors.push({
      name: 'SSR Requirement',
      finding: 'Requires server-side rendering',
      impact: 'vercel',
      weight: 15,
    });
  }

  const scores = calculateScores(factors);
  const confidence = getConfidenceLevel(scores);

  const platform = determinePlatform(scores, analysis.edge.isEdgeCompatible);

  const reasoning = generateReasoning(platform, analysis, factors);
  const alternative = generateAlternative(platform, analysis);

  return {
    platform,
    confidence,
    score: scores,
    factors,
    analysis,
    reasoning,
    alternative,
  };
}

/**
 * Get confidence indicator emoji
 */
function getConfidenceEmoji(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case 'high':
      return '🟢';
    case 'medium':
      return '🟡';
    case 'low':
      return '🔴';
  }
}

/**
 * Get human-readable impact label
 */
function getImpactLabel(impact: 'vercel' | 'cloudflare' | 'neutral'): string {
  switch (impact) {
    case 'vercel':
      return '→ Vercel';
    case 'cloudflare':
      return '→ Cloudflare';
    case 'neutral':
      return 'Neutral';
  }
}

/**
 * Format recommendation as markdown
 */
export function formatRecommendation(rec: DeploymentRecommendation): string {
  const platformName = rec.platform === 'vercel' ? 'Vercel' : 'Cloudflare';
  const confidenceEmoji = getConfidenceEmoji(rec.confidence);

  let output = `## 🚀 Deployment Recommendation\n\n`;
  output += `**Platform**: ${platformName}\n`;
  output += `**Confidence**: ${confidenceEmoji} ${rec.confidence.toUpperCase()}\n`;
  output += `**Score**: Vercel ${rec.score.vercel}% vs Cloudflare ${rec.score.cloudflare}%\n\n`;

  output += `### Analysis Results\n\n`;
  output += `| Factor | Finding | Impact |\n`;
  output += `|--------|---------|--------|\n`;

  for (const factor of rec.factors) {
    const impactArrow = getImpactLabel(factor.impact);
    output += `| ${factor.name} | ${factor.finding} | ${impactArrow} |\n`;
  }

  output += `\n### Why ${platformName}\n\n`;
  output += `${rec.reasoning}\n\n`;

  if (rec.alternative) {
    const altName =
      rec.alternative.platform === 'vercel' ? 'Vercel' : 'Cloudflare';
    output += `### Alternative: ${altName}\n\n`;
    output += `If you need ${altName} instead:\n`;
    for (const step of rec.alternative.migrationPath) {
      output += `- ${step}\n`;
    }
    output += '\n';
  }

  // Edge compatibility warnings
  if (rec.analysis.edge.blockers.length > 0) {
    output += `### ⚠️ Edge Blockers\n\n`;
    for (const blocker of rec.analysis.edge.blockers) {
      output += `- ${blocker}\n`;
    }
    output += '\n';
  }

  if (rec.analysis.edge.warnings.length > 0) {
    output += `### ⚡ Warnings\n\n`;
    for (const warning of rec.analysis.edge.warnings) {
      output += `- ${warning}\n`;
    }
  }

  return output;
}

export { analyzeProject };
