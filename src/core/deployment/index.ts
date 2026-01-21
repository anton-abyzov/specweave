/**
 * Deployment module exports
 */

export { routeDeployment, formatRecommendation, analyzeProject } from './deploy-router.js';
export {
  detectFramework,
  analyzeNodeDependencies,
  analyzeSSR,
  analyzeSEO,
  analyzeEdgeCompatibility,
} from './project-analyzer.js';
export type {
  DeploymentPlatform,
  Framework,
  FrameworkDetection,
  NodeDependencyAnalysis,
  SSRAnalysis,
  SEOAnalysis,
  EdgeCompatibility,
  ProjectAnalysis,
  DeploymentFactor,
  DeploymentRecommendation,
  DeployRouterOptions,
  ConfidenceLevel,
} from './types.js';
