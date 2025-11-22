/**
 * Multi-Spec Detector
 *
 * Detects ALL specs referenced in an increment, supporting:
 * - Single-spec increments (backend OR frontend)
 * - Multi-spec increments (backend AND frontend AND mobile)
 * - Parent coordination specs (_parent project)
 */

import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { detectSpecIdentifier, SpecContent } from './spec-identifier-detector.js';
import { SpecIdentifier } from './types/spec-identifier.js';

export interface DetectedSpec {
  /** Spec identifier */
  identifier: SpecIdentifier;

  /** Project this spec belongs to */
  project: string;

  /** Path to spec file */
  path: string;

  /** Whether this spec should be synced to GitHub */
  syncEnabled: boolean;
}

export interface MultiSpecDetectionResult {
  /** All detected specs */
  specs: DetectedSpec[];

  /** Primary spec (if single-spec increment) */
  primary?: DetectedSpec;

  /** Whether this is a multi-spec increment */
  isMultiSpec: boolean;

  /** Projects involved */
  projects: string[];
}

/**
 * Detect all specs referenced in an increment
 *
 * CRITICAL ARCHITECTURE (v0.24.0+):
 * - Increments NEVER reference other increments
 * - Flow: INCREMENT (feature_id) → FEATURE → USER STORIES
 * - Detection: Read increment metadata.json → Find feature_id → Find all user stories with that feature
 */
export async function detectSpecsInIncrement(
  incrementPath: string,
  config: any = {}
): Promise<MultiSpecDetectionResult> {
  const specs: DetectedSpec[] = [];

  // STEP 1: Read increment metadata to get feature_id
  const metadataPath = path.join(incrementPath, 'metadata.json');

  if (!fs.existsSync(metadataPath)) {
    // Fallback: try spec.md frontmatter
    const specPath = path.join(incrementPath, 'spec.md');
    if (fs.existsSync(specPath)) {
      const specContent = fs.readFileSync(specPath, 'utf-8');
      const { data: frontmatter } = matter(specContent);

      // No feature_id in frontmatter either - return empty
      if (!frontmatter.feature_id) {
        return {
          specs: [],
          isMultiSpec: false,
          projects: []
        };
      }

      // Use feature_id from spec.md frontmatter
      return await detectSpecsByFeatureId(frontmatter.feature_id, config);
    }

    return {
      specs: [],
      isMultiSpec: false,
      projects: []
    };
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  const featureId = metadata.feature_id;

  if (!featureId) {
    // No feature_id - return empty (increment is standalone)
    return {
      specs: [],
      isMultiSpec: false,
      projects: []
    };
  }

  // STEP 2: Find all user stories for this feature_id
  return await detectSpecsByFeatureId(featureId, config);
}

/**
 * Detect all user stories for a given feature_id
 *
 * ARCHITECTURE:
 * - Scans .specweave/docs/internal/specs/{project}/{feature}/
 * - Finds all user story files with feature: {featureId} in frontmatter
 * - Returns detected specs ready for GitHub sync
 */
async function detectSpecsByFeatureId(
  featureId: string,
  config: any = {}
): Promise<MultiSpecDetectionResult> {
  const specs: DetectedSpec[] = [];

  // 1. Check for specs in living docs folder
  const specsFolder = path.join(
    process.cwd(),
    '.specweave/docs/internal/specs'
  );

  if (!fs.existsSync(specsFolder)) {
    return {
      specs: [],
      isMultiSpec: false,
      projects: []
    };
  }

  // 2. Scan all project folders
  const projectFolders = fs.readdirSync(specsFolder);

  for (const projectFolder of projectFolders) {
    const projectPath = path.join(specsFolder, projectFolder);

    // Skip if not a directory or _features folder
    if (!fs.statSync(projectPath).isDirectory() || projectFolder === '_features') {
      continue;
    }

    // 3. Scan for feature-specific folders (e.g., FS-048/)
    const featureFolderPath = path.join(projectPath, featureId);

    if (!fs.existsSync(featureFolderPath) || !fs.statSync(featureFolderPath).isDirectory()) {
      continue;
    }

    // 4. Scan all user story files in this feature folder
    const specFiles = fs.readdirSync(featureFolderPath).filter(f => f.endsWith('.md') && f.startsWith('us-'));

    for (const specFile of specFiles) {
      const specPath = path.join(featureFolderPath, specFile);
      const specContent = fs.readFileSync(specPath, 'utf-8');
      const { data: frontmatter, content } = matter(specContent);

      // 5. Verify this user story belongs to the feature
      if (frontmatter.feature !== featureId) {
        continue;
      }

      // 6. Detect identifier for this spec
      const title = frontmatter.title || extractTitle(content);
      const specContentObj: SpecContent = {
        content: specContent,
        frontmatter,
        title,
        project: projectFolder,
        path: specPath
      };

      const identifier = detectSpecIdentifier(specContentObj, {
        existingSpecs: specs.map(s => s.identifier.full),
        preferTitleSlug: config.specs?.preferTitleSlug ?? true,
        minSlugLength: config.specs?.minSlugLength ?? 5
      });

      // 7. Check if sync is enabled for this project
      const projectConfig = config.specs?.projects?.[projectFolder];
      const syncEnabled = projectConfig?.syncEnabled !== false;

      specs.push({
        identifier,
        project: projectFolder,
        path: specPath,
        syncEnabled
      });
    }
  }

  // 8. Determine if multi-spec
  const isMultiSpec = specs.length > 1;
  const projects = [...new Set(specs.map(s => s.project))];

  // 9. Find primary spec (first non-parent spec)
  const primary = specs.find(s => s.project !== '_parent') || specs[0];

  return {
    specs,
    primary,
    isMultiSpec,
    projects
  };
}

/**
 * Extract increment references from spec content
 */
function extractIncrementReferences(
  content: string,
  frontmatter: Record<string, any>
): string[] {
  const references: string[] = [];

  // Check frontmatter
  if (frontmatter.increments && Array.isArray(frontmatter.increments)) {
    references.push(...frontmatter.increments);
  }

  // Check content for increment links
  const incrementPattern = /\[([^\]]+)\]\(\.\.\/\.\.\/increments\/([^)]+)\)/g;
  let match;

  while ((match = incrementPattern.exec(content)) !== null) {
    references.push(match[2].split('/')[0]); // Extract increment ID
  }

  // Check for "Implemented in" sections
  const implementedPattern = /Implemented in:?\s*`?([0-9]{4}-[a-z0-9-]+)`?/gi;

  while ((match = implementedPattern.exec(content)) !== null) {
    references.push(match[1]);
  }

  return [...new Set(references)]; // Deduplicate
}

/**
 * Extract title from markdown content (fallback)
 */
function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

/**
 * Project detection result with confidence score
 */
export interface ProjectDetectionResult {
  project: string;
  confidence: number; // 0.0 - 1.0
  matchedKeywords: string[];
}

/**
 * Detect project from increment name or description with confidence scoring
 */
export function detectProjectFromIncrementWithConfidence(
  incrementName: string,
  description: string = '',
  config: any = {}
): ProjectDetectionResult {
  const text = `${incrementName} ${description}`.toLowerCase();
  const projectScores: Map<string, { score: number; keywords: string[] }> = new Map();

  // Check for explicit project keywords
  const projectConfigs = config.specs?.projects || {};

  for (const [projectId, projectConfig] of Object.entries(projectConfigs)) {
    const keywords = (projectConfig as any).keywords || [];
    const matchedKeywords: string[] = [];
    let score = 0;

    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        score += 0.3; // Each keyword match = +30%
      }
    }

    if (matchedKeywords.length > 0) {
      projectScores.set(projectId, { score, keywords: matchedKeywords });
    }
  }

  // Fallback to common patterns with lower confidence
  const fallbackPatterns = [
    { project: 'backend', patterns: ['backend', 'api', 'server', 'database'], score: 0.2 },
    { project: 'frontend', patterns: ['frontend', 'ui', 'web', 'react', 'vue', 'angular'], score: 0.2 },
    { project: 'mobile', patterns: ['mobile', 'ios', 'android', 'react-native', 'flutter'], score: 0.2 },
    { project: 'infra', patterns: ['infra', 'devops', 'k8s', 'kubernetes', 'terraform', 'docker'], score: 0.2 },
  ];

  for (const { project, patterns, score: patternScore } of fallbackPatterns) {
    const matched = patterns.filter(p => text.includes(p));

    if (matched.length > 0) {
      const existing = projectScores.get(project) || { score: 0, keywords: [] };
      projectScores.set(project, {
        score: existing.score + (patternScore * matched.length),
        keywords: [...existing.keywords, ...matched]
      });
    }
  }

  // Find highest scoring project
  let bestProject = 'default';
  let bestScore = 0;
  let bestKeywords: string[] = [];

  for (const [project, { score, keywords }] of projectScores.entries()) {
    if (score > bestScore) {
      bestScore = score;
      bestProject = project;
      bestKeywords = keywords;
    }
  }

  return {
    project: bestProject,
    confidence: Math.min(bestScore, 1.0),
    matchedKeywords: bestKeywords
  };
}

/**
 * Detect project from increment name or description (simple version)
 */
export function detectProjectFromIncrement(
  incrementName: string,
  description: string = '',
  config: any = {}
): string {
  const result = detectProjectFromIncrementWithConfidence(incrementName, description, config);
  return result.project;
}

/**
 * Check if spec should be synced to GitHub
 */
export function shouldSyncSpec(
  spec: DetectedSpec,
  config: any = {}
): boolean {
  // 1. Check if sync is enabled globally
  if (config.sync?.enabled === false) {
    return false;
  }

  // 2. Check if project sync is enabled
  if (!spec.syncEnabled) {
    return false;
  }

  // 3. Parent specs are NEVER synced
  if (spec.project === '_parent') {
    return false;
  }

  // 4. Check if project has GitHub config
  const projectConfig = config.specs?.projects?.[spec.project];

  if (!projectConfig?.github) {
    return false;
  }

  return true;
}
