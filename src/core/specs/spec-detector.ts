/**
 * Multi-Spec Detector
 *
 * Detects ALL specs referenced in an increment, supporting:
 * - Single-spec increments (backend OR frontend)
 * - Multi-spec increments (backend AND frontend AND mobile)
 * - Parent coordination specs (_parent project)
 */

import * as fs from '../../utils/fs-native.js';
import path from 'path';
import matter from 'gray-matter';
import { detectSpecIdentifier, SpecContent } from './spec-identifier-detector.js';
import { SpecIdentifier } from '../types/spec-identifier.js';

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
  const emptyResult: MultiSpecDetectionResult = { specs: [], isMultiSpec: false, projects: [] };

  // Try to get feature_id from metadata.json first, then spec.md frontmatter
  const featureId = getFeatureIdFromIncrement(incrementPath);
  if (!featureId) {
    return emptyResult;
  }

  return await detectSpecsByFeatureId(featureId, config);
}

/**
 * Extract feature_id from increment metadata or spec frontmatter
 */
function getFeatureIdFromIncrement(incrementPath: string): string | null {
  const metadataPath = path.join(incrementPath, 'metadata.json');

  if (fs.existsSync(metadataPath)) {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    return metadata.feature_id || null;
  }

  const specPath = path.join(incrementPath, 'spec.md');
  if (fs.existsSync(specPath)) {
    const { data: frontmatter } = matter(fs.readFileSync(specPath, 'utf-8'));
    return frontmatter.feature_id || null;
  }

  return null;
}

/**
 * Detect all user stories for a given feature_id
 */
async function detectSpecsByFeatureId(
  featureId: string,
  config: any = {}
): Promise<MultiSpecDetectionResult> {
  const specsFolder = path.join(process.cwd(), '.specweave/docs/internal/specs');
  const emptyResult: MultiSpecDetectionResult = { specs: [], isMultiSpec: false, projects: [] };

  if (!fs.existsSync(specsFolder)) {
    return emptyResult;
  }

  const specs: DetectedSpec[] = [];
  const projectFolders = fs.readdirSync(specsFolder)
    .filter(folder => {
      const folderPath = path.join(specsFolder, folder);
      return fs.statSync(folderPath).isDirectory() && !folder.startsWith('_');
    });

  for (const projectFolder of projectFolders) {
    const featureFolderPath = path.join(specsFolder, projectFolder, featureId);
    if (!fs.existsSync(featureFolderPath) || !fs.statSync(featureFolderPath).isDirectory()) {
      continue;
    }

    const specFiles = fs.readdirSync(featureFolderPath)
      .filter(f => f.endsWith('.md') && f.startsWith('us-'));

    for (const specFile of specFiles) {
      const spec = parseUserStorySpec(
        path.join(featureFolderPath, specFile),
        projectFolder,
        featureId,
        specs.map(s => s.identifier.full),
        config
      );
      if (spec) {
        specs.push(spec);
      }
    }
  }

  const projects = [...new Set(specs.map(s => s.project))];
  return {
    specs,
    primary: specs.find(s => s.project !== '_parent') || specs[0],
    isMultiSpec: specs.length > 1,
    projects
  };
}

/**
 * Parse a single user story spec file
 */
function parseUserStorySpec(
  specPath: string,
  projectFolder: string,
  featureId: string,
  existingSpecs: string[],
  config: any
): DetectedSpec | null {
  const specContent = fs.readFileSync(specPath, 'utf-8');
  const { data: frontmatter, content } = matter(specContent);

  if (frontmatter.feature !== featureId) {
    return null;
  }

  const title = frontmatter.title || extractTitle(content);
  const specContentObj: SpecContent = {
    content: specContent,
    frontmatter,
    title,
    project: projectFolder,
    path: specPath
  };

  const identifier = detectSpecIdentifier(specContentObj, {
    existingSpecs,
    preferTitleSlug: config.specs?.preferTitleSlug ?? true,
    minSlugLength: config.specs?.minSlugLength ?? 5
  });

  const projectConfig = config.specs?.projects?.[projectFolder];
  return {
    identifier,
    project: projectFolder,
    path: specPath,
    syncEnabled: projectConfig?.syncEnabled !== false
  };
}

/**
 * Extract increment references from spec content (currently unused but kept for potential future use)
 */
function extractIncrementReferences(
  content: string,
  frontmatter: Record<string, any>
): string[] {
  const references: string[] = [];

  if (frontmatter.increments && Array.isArray(frontmatter.increments)) {
    references.push(...frontmatter.increments);
  }

  // Extract from markdown links
  const linkMatches = [...content.matchAll(/\[([^\]]+)\]\(\.\.\/\.\.\/increments\/([^)]+)\)/g)];
  references.push(...linkMatches.map(m => m[2].split('/')[0]));

  // Extract from "Implemented in" sections
  const implementedMatches = [...content.matchAll(/Implemented in:?\s*`?([0-9]{4}-[a-z0-9-]+)`?/gi)];
  references.push(...implementedMatches.map(m => m[1]));

  return [...new Set(references)];
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
  const projectScores = new Map<string, { score: number; keywords: string[] }>();

  // Score configured project keywords
  const projectConfigs = config.specs?.projects || {};
  for (const [projectId, projectConfig] of Object.entries(projectConfigs)) {
    const keywords = (projectConfig as any).keywords || [];
    const matched = keywords.filter((k: string) => text.includes(k.toLowerCase()));
    if (matched.length > 0) {
      projectScores.set(projectId, { score: matched.length * 0.3, keywords: matched });
    }
  }

  // Score fallback patterns
  const fallbackPatterns = [
    { project: 'backend', patterns: ['backend', 'api', 'server', 'database'] },
    { project: 'frontend', patterns: ['frontend', 'ui', 'web', 'react', 'vue', 'angular'] },
    { project: 'mobile', patterns: ['mobile', 'ios', 'android', 'react-native', 'flutter'] },
    { project: 'infra', patterns: ['infra', 'devops', 'k8s', 'kubernetes', 'terraform', 'docker'] },
  ];

  for (const { project, patterns } of fallbackPatterns) {
    const matched = patterns.filter(p => text.includes(p));
    if (matched.length > 0) {
      const existing = projectScores.get(project) || { score: 0, keywords: [] };
      projectScores.set(project, {
        score: existing.score + matched.length * 0.2,
        keywords: [...existing.keywords, ...matched]
      });
    }
  }

  // Find best match
  let best = { project: 'default', score: 0, keywords: [] as string[] };
  for (const [project, data] of projectScores.entries()) {
    if (data.score > best.score) {
      best = { project, ...data };
    }
  }

  return {
    project: best.project,
    confidence: Math.min(best.score, 1.0),
    matchedKeywords: best.keywords
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
export function shouldSyncSpec(spec: DetectedSpec, config: any = {}): boolean {
  if (config.sync?.enabled === false) return false;
  if (!spec.syncEnabled) return false;
  if (spec.project === '_parent') return false;

  const projectConfig = config.specs?.projects?.[spec.project];
  return Boolean(projectConfig?.github);
}
