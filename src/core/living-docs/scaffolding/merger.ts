/**
 * Living Docs Merger - Intelligently merges existing documentation
 *
 * This module scans for existing documentation in a user project and
 * offers to merge/import it into the living docs structure.
 *
 * Smart features:
 * - Detects documentation type (README, API docs, guides, etc.)
 * - Suggests appropriate target folders
 * - Detects similar/duplicate content
 * - Preserves original files (copies, doesn't move)
 *
 * @module core/living-docs/scaffolding/merger
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger, consoleLogger } from '../../../utils/logger.js';

/**
 * Detected documentation file
 */
export interface DetectedDoc {
  /** Original file path (relative to project root) */
  sourcePath: string;

  /** Absolute path */
  absolutePath: string;

  /** File name */
  fileName: string;

  /** Detected document type */
  type: DocType;

  /** Confidence score (0-1) */
  confidence: number;

  /** Suggested target folder in living docs */
  suggestedTarget: string;

  /** File size in bytes */
  size: number;

  /** First 500 chars of content (for preview) */
  preview: string;

  /** Detected keywords/themes */
  themes: string[];
}

/**
 * Document types
 */
export type DocType =
  | 'readme'
  | 'api'
  | 'guide'
  | 'architecture'
  | 'adr'
  | 'runbook'
  | 'contributing'
  | 'changelog'
  | 'spec'
  | 'other';

/**
 * Merge options
 */
export interface MergeOptions {
  /** Project root path */
  projectPath: string;

  /** Additional folders to scan (besides common locations) */
  additionalFolders?: string[];

  /** Whether to scan recursively */
  recursive?: boolean;

  /** Maximum depth for recursive scan */
  maxDepth?: number;

  /** Minimum confidence to include in results */
  minConfidence?: number;

  /** Logger instance */
  logger?: Logger;
}

/**
 * Merge result
 */
export interface MergeResult {
  /** Detected documentation files */
  detected: DetectedDoc[];

  /** Files that were merged */
  merged: string[];

  /** Files that were skipped */
  skipped: string[];

  /** Any errors */
  errors: string[];

  /** Suggested merges (grouped by target folder) */
  suggestions: Map<string, DetectedDoc[]>;
}

/**
 * Similarity result
 */
export interface SimilarityResult {
  /** Whether files are similar */
  isSimilar: boolean;

  /** Similarity score (0-1) */
  score: number;

  /** Reason for similarity */
  reason?: string;
}

/**
 * Common documentation folder patterns
 */
const DOC_FOLDER_PATTERNS = [
  'docs',
  'doc',
  'documentation',
  'wiki',
  'guides',
  'tutorials',
  'api-docs',
  'notion-export',
  'confluence-export',
];

/**
 * File patterns for document types
 */
const DOC_TYPE_PATTERNS: Record<DocType, RegExp[]> = {
  readme: [/^readme/i, /^index\.md$/i],
  api: [/api/i, /endpoint/i, /swagger/i, /openapi/i],
  guide: [/guide/i, /tutorial/i, /how-to/i, /getting-started/i],
  architecture: [/architecture/i, /design/i, /system/i, /diagram/i],
  adr: [/^adr-/i, /^\d{4}-/i, /decision/i],
  runbook: [/runbook/i, /playbook/i, /incident/i, /sop/i],
  contributing: [/contributing/i, /contribution/i],
  changelog: [/changelog/i, /changes/i, /history/i, /release/i],
  spec: [/spec/i, /requirement/i, /prd/i, /rfc/i],
  other: [/.*/],
};

/**
 * Target folder mapping
 */
const TYPE_TO_TARGET: Record<DocType, string> = {
  readme: 'public/overview',
  api: 'public/api',
  guide: 'public/guides',
  architecture: 'internal/architecture',
  adr: 'internal/architecture/adr',
  runbook: 'internal/operations',
  contributing: 'public/overview',
  changelog: 'internal/delivery',
  spec: 'internal/specs',
  other: 'internal/modules',
};

/**
 * Living Docs Merger class
 */
export class LivingDocsMerger {
  private projectPath: string;
  private logger: Logger;
  private recursive: boolean;
  private maxDepth: number;
  private minConfidence: number;
  private additionalFolders: string[];

  constructor(options: MergeOptions) {
    this.projectPath = options.projectPath;
    this.logger = options.logger ?? consoleLogger;
    this.recursive = options.recursive ?? true;
    this.maxDepth = options.maxDepth ?? 5;
    this.minConfidence = options.minConfidence ?? 0.3;
    this.additionalFolders = options.additionalFolders ?? [];
  }

  /**
   * Scan for existing documentation
   */
  async scan(): Promise<DetectedDoc[]> {
    const detected: DetectedDoc[] = [];

    this.logger.info('Scanning for existing documentation...');

    // Scan root-level markdown files
    await this.scanDirectory(this.projectPath, detected, 0, false);

    // Scan common doc folders
    for (const folder of DOC_FOLDER_PATTERNS) {
      const folderPath = path.join(this.projectPath, folder);
      if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
        this.logger.info('  Found: ' + folder + '/');
        await this.scanDirectory(folderPath, detected, 0, true);
      }
    }

    // Scan additional folders
    for (const folder of this.additionalFolders) {
      const folderPath = path.isAbsolute(folder)
        ? folder
        : path.join(this.projectPath, folder);
      if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
        this.logger.info('  Scanning additional: ' + folder);
        await this.scanDirectory(folderPath, detected, 0, true);
      }
    }

    // Filter by confidence
    const filtered = detected.filter(d => d.confidence >= this.minConfidence);

    this.logger.info('Found ' + filtered.length + ' documentation files');

    return filtered;
  }

  /**
   * Scan a directory for markdown files
   */
  private async scanDirectory(
    dirPath: string,
    results: DetectedDoc[],
    depth: number,
    recursive: boolean
  ): Promise<void> {
    if (depth > this.maxDepth) return;

    // Skip certain directories
    const dirName = path.basename(dirPath);
    if (this.shouldSkipDir(dirName)) return;

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory() && recursive && this.recursive) {
          await this.scanDirectory(fullPath, results, depth + 1, recursive);
        } else if (entry.isFile() && this.isDocFile(entry.name)) {
          const doc = this.analyzeFile(fullPath);
          if (doc) {
            results.push(doc);
          }
        }
      }
    } catch (error) {
      this.logger.warn('Could not scan ' + dirPath + ': ' + error);
    }
  }

  /**
   * Check if directory should be skipped
   */
  private shouldSkipDir(name: string): boolean {
    const skipDirs = [
      'node_modules',
      '.git',
      '.specweave',
      'dist',
      'build',
      'coverage',
      '.next',
      '.nuxt',
      'vendor',
      '__pycache__',
    ];
    return skipDirs.includes(name) || name.startsWith('.');
  }

  /**
   * Check if file is a documentation file
   */
  private isDocFile(fileName: string): boolean {
    return /\.(md|mdx|rst|txt)$/i.test(fileName);
  }

  /**
   * Analyze a documentation file
   */
  private analyzeFile(filePath: string): DetectedDoc | null {
    try {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      const relativePath = path.relative(this.projectPath, filePath);

      // Detect type
      const { type, confidence } = this.detectType(fileName, content);

      // Extract themes
      const themes = this.extractThemes(content);

      // Get preview
      const preview = content.slice(0, 500).trim();

      return {
        sourcePath: relativePath,
        absolutePath: filePath,
        fileName,
        type,
        confidence,
        suggestedTarget: TYPE_TO_TARGET[type],
        size: stats.size,
        preview,
        themes,
      };
    } catch (error) {
      this.logger.warn('Could not analyze ' + filePath + ': ' + error);
      return null;
    }
  }

  /**
   * Detect document type from filename and content
   */
  private detectType(fileName: string, content: string): { type: DocType; confidence: number } {
    let bestType: DocType = 'other';
    let bestConfidence = 0;

    const lowerFileName = fileName.toLowerCase();
    const lowerContent = content.toLowerCase();

    for (const [type, patterns] of Object.entries(DOC_TYPE_PATTERNS)) {
      if (type === 'other') continue;

      for (const pattern of patterns) {
        // Check filename
        if (pattern.test(lowerFileName)) {
          const confidence = 0.8;
          if (confidence > bestConfidence) {
            bestType = type as DocType;
            bestConfidence = confidence;
          }
        }

        // Check content (lower confidence)
        if (pattern.test(lowerContent)) {
          const confidence = 0.5;
          if (confidence > bestConfidence) {
            bestType = type as DocType;
            bestConfidence = confidence;
          }
        }
      }
    }

    // Default confidence for 'other'
    if (bestType === 'other') {
      bestConfidence = 0.3;
    }

    return { type: bestType, confidence: bestConfidence };
  }

  /**
   * Extract themes/keywords from content
   */
  private extractThemes(content: string): string[] {
    const themes: Set<string> = new Set();
    const lowerContent = content.toLowerCase();

    const themeKeywords: Record<string, string[]> = {
      auth: ['authentication', 'authorization', 'login', 'oauth', 'jwt'],
      api: ['api', 'endpoint', 'rest', 'graphql', 'grpc'],
      database: ['database', 'sql', 'postgres', 'mysql', 'mongodb', 'redis'],
      testing: ['test', 'spec', 'jest', 'vitest', 'playwright', 'cypress'],
      deployment: ['deploy', 'docker', 'kubernetes', 'k8s', 'ci/cd', 'pipeline'],
      security: ['security', 'encryption', 'secret', 'password', 'https'],
      performance: ['performance', 'cache', 'optimization', 'lazy', 'bundle'],
    };

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      for (const keyword of keywords) {
        if (lowerContent.includes(keyword)) {
          themes.add(theme);
          break;
        }
      }
    }

    return Array.from(themes);
  }

  /**
   * Check similarity between two files
   */
  checkSimilarity(doc1: DetectedDoc, doc2: DetectedDoc): SimilarityResult {
    // Simple similarity check based on:
    // 1. Same themes
    // 2. Similar preview content
    // 3. Similar file size

    const sharedThemes = doc1.themes.filter(t => doc2.themes.includes(t));
    const themeScore = sharedThemes.length / Math.max(doc1.themes.length, doc2.themes.length, 1);

    // Size similarity (within 20%)
    const sizeDiff = Math.abs(doc1.size - doc2.size) / Math.max(doc1.size, doc2.size, 1);
    const sizeScore = sizeDiff < 0.2 ? 1 - sizeDiff : 0;

    // Simple content similarity (shared words)
    const words1 = new Set(doc1.preview.toLowerCase().split(/\s+/));
    const words2 = new Set(doc2.preview.toLowerCase().split(/\s+/));
    const sharedWords = [...words1].filter(w => words2.has(w)).length;
    const contentScore = sharedWords / Math.max(words1.size, words2.size, 1);

    const score = (themeScore * 0.3) + (sizeScore * 0.2) + (contentScore * 0.5);

    return {
      isSimilar: score > 0.6,
      score,
      reason: score > 0.6 ? 'Similar content and themes' : undefined,
    };
  }

  /**
   * Generate merge suggestions grouped by target folder
   */
  generateSuggestions(detected: DetectedDoc[]): Map<string, DetectedDoc[]> {
    const suggestions = new Map<string, DetectedDoc[]>();

    for (const doc of detected) {
      const target = doc.suggestedTarget;
      if (!suggestions.has(target)) {
        suggestions.set(target, []);
      }
      suggestions.get(target)!.push(doc);
    }

    return suggestions;
  }

  /**
   * Merge a detected document into living docs
   */
  async mergeDoc(
    doc: DetectedDoc,
    targetFolder?: string
  ): Promise<{ success: boolean; targetPath: string; error?: string }> {
    const target = targetFolder || doc.suggestedTarget;
    const targetDir = path.join(this.projectPath, '.specweave', 'docs', target);
    const targetPath = path.join(targetDir, doc.fileName);

    try {
      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Check if target already exists
      if (fs.existsSync(targetPath)) {
        return {
          success: false,
          targetPath,
          error: 'Target file already exists',
        };
      }

      // Copy file
      fs.copyFileSync(doc.absolutePath, targetPath);

      this.logger.info('Merged: ' + doc.sourcePath + ' -> ' + target + '/' + doc.fileName);

      return { success: true, targetPath };
    } catch (error) {
      return {
        success: false,
        targetPath,
        error: String(error),
      };
    }
  }
}

/**
 * Scan for existing documentation (convenience function)
 */
export async function scanExistingDocs(options: MergeOptions): Promise<DetectedDoc[]> {
  const merger = new LivingDocsMerger(options);
  return merger.scan();
}

/**
 * Find similar documentation folders
 */
export function findSimilarFolders(
  projectPath: string,
  existingDocs: DetectedDoc[]
): Map<string, string[]> {
  const folderThemes = new Map<string, Set<string>>();

  // Group themes by parent folder
  for (const doc of existingDocs) {
    const folder = path.dirname(doc.sourcePath);
    if (!folderThemes.has(folder)) {
      folderThemes.set(folder, new Set());
    }
    for (const theme of doc.themes) {
      folderThemes.get(folder)!.add(theme);
    }
  }

  // Find folders with overlapping themes
  const similar = new Map<string, string[]>();
  const folders = Array.from(folderThemes.keys());

  for (let i = 0; i < folders.length; i++) {
    for (let j = i + 1; j < folders.length; j++) {
      const themes1 = folderThemes.get(folders[i])!;
      const themes2 = folderThemes.get(folders[j])!;

      const shared = [...themes1].filter(t => themes2.has(t));
      if (shared.length >= 2) {
        if (!similar.has(folders[i])) {
          similar.set(folders[i], []);
        }
        similar.get(folders[i])!.push(folders[j]);
      }
    }
  }

  return similar;
}
