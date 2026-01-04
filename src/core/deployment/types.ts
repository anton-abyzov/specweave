/**
 * Types for deployment platform routing
 */

export type DeploymentPlatform = 'vercel' | 'cloudflare' | 'hybrid';

export type Framework =
  | 'nextjs'
  | 'remix'
  | 'astro'
  | 'nuxt'
  | 'sveltekit'
  | 'vite'
  | 'cra'
  | 'gatsby'
  | 'static'
  | 'unknown';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface FrameworkDetection {
  framework: Framework;
  version?: string;
  configFile?: string;
}

export interface NodeDependencyAnalysis {
  hasNativeModules: boolean;
  nativeModules: string[];
  hasFileSystemUsage: boolean;
  hasCryptoUsage: boolean;
  hasServerSideDB: boolean;
  dbClients: string[];
}

export interface SSRAnalysis {
  hasServerComponents: boolean;
  hasServerActions: boolean;
  hasGetServerSideProps: boolean;
  hasGenerateMetadata: boolean;
  hasDynamicRoutes: boolean;
  hasApiRoutes: boolean;
}

export interface SEOAnalysis {
  hasDynamicMeta: boolean;
  hasStaticMeta: boolean;
  hasSitemap: boolean;
  hasRobotsTxt: boolean;
  hasStructuredData: boolean;
  metaSourcesFromDB: boolean;
}

export interface EdgeCompatibility {
  isEdgeCompatible: boolean;
  blockers: string[];
  warnings: string[];
}

export interface ProjectAnalysis {
  framework: FrameworkDetection;
  nodeDeps: NodeDependencyAnalysis;
  ssr: SSRAnalysis;
  seo: SEOAnalysis;
  edge: EdgeCompatibility;
}

export interface DeploymentFactor {
  name: string;
  finding: string;
  impact: 'vercel' | 'cloudflare' | 'neutral';
  weight: number;
}

export interface DeploymentRecommendation {
  platform: DeploymentPlatform;
  confidence: ConfidenceLevel;
  score: {
    vercel: number;
    cloudflare: number;
  };
  factors: DeploymentFactor[];
  analysis: ProjectAnalysis;
  reasoning: string;
  alternative?: {
    platform: DeploymentPlatform;
    migrationPath: string[];
  };
}

export interface DeployRouterOptions {
  projectPath?: string;
  preferEdge?: boolean;
  preferCost?: boolean;
  requireSSR?: boolean;
}
