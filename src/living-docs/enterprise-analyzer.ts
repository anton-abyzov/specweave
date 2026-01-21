/**
 * Enterprise Documentation Analyzer
 *
 * Provides comprehensive documentation analysis covering:
 * - All docs/internal folders (specs, architecture, ADRs, governance)
 * - Spec-code mismatch detection
 * - Documentation health scoring
 * - Enterprise-grade reporting
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { Logger, consoleLogger } from '../utils/logger.js';

export interface DocumentCategory {
  name: string;
  path: string;
  fileCount: number;
  files: DocumentInfo[];
  lastUpdated: Date | null;
}

export interface DocumentInfo {
  path: string;
  name: string;
  category: string;
  lastModified: Date;
  size: number;
  hasAcceptanceCriteria: boolean;
  acceptanceCriteria: AcceptanceCriterion[];
}

export interface AcceptanceCriterion {
  id: string;           // e.g., "AC-US1-01"
  description: string;
  isComplete: boolean;
  sourceFile: string;
}

export interface SpecCodeMismatch {
  specFile: string;
  criterionId: string;
  description: string;
  claimedComplete: boolean;
  codeEvidence: CodeEvidence | null;
  confidence: number;   // 0-100
  mismatchType: 'ghost_completion' | 'undocumented_code' | 'partial_implementation' | 'spec_drift';
}

export interface CodeEvidence {
  files: string[];
  functions: string[];
  lineCount: number;
}

export interface HealthScore {
  overall: number;          // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  freshness: number;        // 0-100
  coverage: number;         // 0-100
  accuracy: number;         // 0-100
  trend: 'improving' | 'stable' | 'declining';
}

export interface NamingViolation {
  file: string;
  category: string;
  violationType: 'all_caps' | 'mixed_case' | 'date_suffix' | 'inconsistent_prefix' | 'no_extension';
  expectedPattern: string;
  actual: string;
  severity: 'error' | 'warning' | 'info';
}

export interface DuplicateDocument {
  files: string[];
  similarity: number;    // 0-100 percentage
  duplicateType: 'exact' | 'near_duplicate' | 'same_title';
}

export interface DocumentDiscrepancy {
  file: string;
  discrepancyType: 'orphaned_reference' | 'broken_link' | 'outdated_version' | 'conflicting_info';
  description: string;
  relatedFiles?: string[];
}

export interface EnterpriseDocReport {
  generatedAt: Date;
  projectPath: string;
  categories: DocumentCategory[];
  totalDocuments: number;
  healthScore: HealthScore;
  mismatches: SpecCodeMismatch[];
  namingViolations: NamingViolation[];
  duplicates: DuplicateDocument[];
  discrepancies: DocumentDiscrepancy[];
  recommendations: string[];
}

export interface EnterpriseAnalyzerOptions {
  projectPath: string;
  logger?: Logger;
  includeArchived?: boolean;
}

/**
 * Enterprise Documentation Analyzer
 */
export class EnterpriseDocAnalyzer {
  private projectPath: string;
  private logger: Logger;
  private includeArchived: boolean;

  constructor(options: EnterpriseAnalyzerOptions) {
    this.projectPath = options.projectPath;
    this.logger = options.logger ?? consoleLogger;
    this.includeArchived = options.includeArchived ?? false;
  }

  /**
   * Run full enterprise documentation analysis
   */
  async analyze(): Promise<EnterpriseDocReport> {
    this.logger.info('Starting enterprise documentation analysis...');

    // Phase 1: Scan all documentation categories
    const categories = await this.scanAllCategories();

    // Phase 2: Extract acceptance criteria from specs
    const allACs = this.extractAllAcceptanceCriteria(categories);

    // Phase 3: Detect spec-code mismatches
    const mismatches = await this.detectMismatches(allACs);

    // Phase 4: Detect naming convention violations
    const namingViolations = this.detectNamingViolations(categories);
    this.logger.info(`Detected ${namingViolations.length} naming convention violations`);

    // Phase 5: Detect duplicate documents
    const duplicates = this.detectDuplicates(categories);
    this.logger.info(`Detected ${duplicates.length} potential duplicates`);

    // Phase 6: Detect discrepancies
    const discrepancies = await this.detectDiscrepancies(categories);
    this.logger.info(`Detected ${discrepancies.length} discrepancies`);

    // Phase 7: Calculate health scores
    const healthScore = this.calculateHealthScore(categories, mismatches, namingViolations);

    // Phase 8: Generate recommendations
    const recommendations = this.generateRecommendations(categories, mismatches, healthScore, namingViolations, duplicates);

    const totalDocuments = categories.reduce((sum, cat) => sum + cat.fileCount, 0);

    return {
      generatedAt: new Date(),
      projectPath: this.projectPath,
      categories,
      totalDocuments,
      healthScore,
      mismatches,
      namingViolations,
      duplicates,
      discrepancies,
      recommendations,
    };
  }

  /**
   * Scan all documentation categories
   */
  private async scanAllCategories(): Promise<DocumentCategory[]> {
    const categories: DocumentCategory[] = [];
    const internalDocsPath = path.join(this.projectPath, '.specweave/docs/internal');

    if (!fs.existsSync(internalDocsPath)) {
      this.logger.warn('No .specweave/docs/internal directory found');
      return categories;
    }

    // Define category mappings
    const categoryDefs = [
      { name: 'Feature Specs', subpath: 'specs' },
      { name: 'Architecture', subpath: 'architecture' },
      { name: 'ADRs', subpath: 'architecture/adr' },
      { name: 'Governance', subpath: 'governance' },
      { name: 'Modules', subpath: 'modules' },
      { name: 'Emergency Procedures', subpath: 'emergency-procedures' },
    ];

    for (const def of categoryDefs) {
      const categoryPath = path.join(internalDocsPath, def.subpath);
      if (fs.existsSync(categoryPath)) {
        const category = await this.scanCategory(def.name, categoryPath);
        if (category.fileCount > 0) {
          categories.push(category);
        }
      }
    }

    // Also scan increment specs
    const incrementsPath = path.join(this.projectPath, '.specweave/increments');
    if (fs.existsSync(incrementsPath)) {
      const incrementCategory = await this.scanIncrementSpecs(incrementsPath);
      if (incrementCategory.fileCount > 0) {
        categories.push(incrementCategory);
      }
    }

    this.logger.info(`Scanned ${categories.length} documentation categories`);
    return categories;
  }

  /**
   * Scan a single documentation category
   */
  private async scanCategory(name: string, categoryPath: string): Promise<DocumentCategory> {
    // Simple pattern - rely on ignore for filtering
    const files = await glob('**/*.md', {
      cwd: categoryPath,
      nodir: true,
      ignore: this.includeArchived ? [] : ['**/_archive/**', '**/node_modules/**'],
    });

    const documents: DocumentInfo[] = [];
    let latestUpdate: Date | null = null;

    for (const file of files) {
      const fullPath = path.join(categoryPath, file);
      const stats = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, 'utf-8');

      const acs = this.parseAcceptanceCriteria(content, fullPath);

      documents.push({
        path: fullPath,
        name: path.basename(file, '.md'),
        category: name,
        lastModified: stats.mtime,
        size: stats.size,
        hasAcceptanceCriteria: acs.length > 0,
        acceptanceCriteria: acs,
      });

      if (!latestUpdate || stats.mtime > latestUpdate) {
        latestUpdate = stats.mtime;
      }
    }

    return {
      name,
      path: categoryPath,
      fileCount: documents.length,
      files: documents,
      lastUpdated: latestUpdate,
    };
  }

  /**
   * Scan increment spec files
   */
  private async scanIncrementSpecs(incrementsPath: string): Promise<DocumentCategory> {
    // Simple pattern - rely on ignore for filtering
    const files = await glob('*/spec.md', {
      cwd: incrementsPath,
      nodir: true,
      ignore: this.includeArchived ? [] : ['_archive/**'],
    });

    const documents: DocumentInfo[] = [];
    let latestUpdate: Date | null = null;

    for (const file of files) {
      const fullPath = path.join(incrementsPath, file);
      const stats = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, 'utf-8');

      const acs = this.parseAcceptanceCriteria(content, fullPath);

      documents.push({
        path: fullPath,
        name: path.dirname(file),
        category: 'Increment Specs',
        lastModified: stats.mtime,
        size: stats.size,
        hasAcceptanceCriteria: acs.length > 0,
        acceptanceCriteria: acs,
      });

      if (!latestUpdate || stats.mtime > latestUpdate) {
        latestUpdate = stats.mtime;
      }
    }

    return {
      name: 'Increment Specs',
      path: incrementsPath,
      fileCount: documents.length,
      files: documents,
      lastUpdated: latestUpdate,
    };
  }

  /**
   * Parse acceptance criteria from markdown content
   */
  private parseAcceptanceCriteria(content: string, sourceFile: string): AcceptanceCriterion[] {
    const acs: AcceptanceCriterion[] = [];

    // Pattern: - [ ] **AC-US1-01**: Description or - [x] **AC-US1-01**: Description
    const acPattern = /- \[([ x])\] \*\*?(AC-[A-Z0-9]+-\d+)\*\*?:?\s*(.+)/g;

    let match;
    while ((match = acPattern.exec(content)) !== null) {
      acs.push({
        id: match[2],
        description: match[3].trim(),
        isComplete: match[1] === 'x',
        sourceFile,
      });
    }

    return acs;
  }

  /**
   * Extract all acceptance criteria from categories
   */
  private extractAllAcceptanceCriteria(categories: DocumentCategory[]): AcceptanceCriterion[] {
    const allACs: AcceptanceCriterion[] = [];

    for (const category of categories) {
      for (const doc of category.files) {
        allACs.push(...doc.acceptanceCriteria);
      }
    }

    this.logger.info(`Extracted ${allACs.length} acceptance criteria`);
    return allACs;
  }

  /**
   * Detect mismatches between specs and code
   */
  private async detectMismatches(acs: AcceptanceCriterion[]): Promise<SpecCodeMismatch[]> {
    const mismatches: SpecCodeMismatch[] = [];
    const srcPath = path.join(this.projectPath, 'src');

    if (!fs.existsSync(srcPath)) {
      return mismatches;
    }

    // Get list of source files for evidence search
    const sourceFiles = await glob('**/*.{ts,js,tsx,jsx}', {
      cwd: srcPath,
      nodir: true,
      ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**'],
    });

    // Check completed ACs for code evidence
    const completedACs = acs.filter(ac => ac.isComplete);

    for (const ac of completedACs) {
      // Extract keywords from AC description
      const keywords = this.extractKeywords(ac.description);

      // Search for evidence in code
      const evidence = await this.searchCodeEvidence(srcPath, sourceFiles, keywords);

      if (!evidence || evidence.files.length === 0) {
        // AC marked complete but no code evidence found
        mismatches.push({
          specFile: ac.sourceFile,
          criterionId: ac.id,
          description: ac.description,
          claimedComplete: true,
          codeEvidence: null,
          confidence: 70, // Medium confidence - might be false positive
          mismatchType: 'ghost_completion',
        });
      } else if (evidence.lineCount < 10) {
        // Very little code evidence
        mismatches.push({
          specFile: ac.sourceFile,
          criterionId: ac.id,
          description: ac.description,
          claimedComplete: true,
          codeEvidence: evidence,
          confidence: 50,
          mismatchType: 'partial_implementation',
        });
      }
    }

    this.logger.info(`Detected ${mismatches.length} potential mismatches`);
    return mismatches;
  }

  /** Common English stop words to filter from keyword extraction */
  private static readonly STOP_WORDS = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
    'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'between', 'under', 'again', 'further', 'then', 'once',
    'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
    'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'that',
    'this', 'these', 'those', 'when', 'where', 'which', 'who', 'whom',
    'whose', 'why', 'how', 'all', 'each', 'every', 'any', 'some', 'no',
  ]);

  /**
   * Extract keywords from AC description for code search
   */
  private extractKeywords(description: string): string[] {
    const words = description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !EnterpriseDocAnalyzer.STOP_WORDS.has(word));

    return [...new Set(words)].slice(0, 5);
  }

  /**
   * Search for code evidence matching keywords
   */
  private async searchCodeEvidence(
    srcPath: string,
    sourceFiles: string[],
    keywords: string[]
  ): Promise<CodeEvidence | null> {
    if (keywords.length === 0) return null;

    const matchingFiles: string[] = [];
    const functions: string[] = [];
    let totalLines = 0;

    for (const file of sourceFiles.slice(0, 100)) { // Limit for performance
      const fullPath = path.join(srcPath, file);
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const contentLower = content.toLowerCase();

        // Check if any keyword appears in file
        const matches = keywords.filter(kw => contentLower.includes(kw));

        if (matches.length >= Math.ceil(keywords.length / 2)) {
          matchingFiles.push(file);
          totalLines += content.split('\n').length;

          // Extract function names that might be related
          const funcPattern = /(?:function|const|let|var)\s+(\w+)\s*[=(]/g;
          let funcMatch;
          while ((funcMatch = funcPattern.exec(content)) !== null) {
            const funcName = funcMatch[1].toLowerCase();
            if (keywords.some(kw => funcName.includes(kw))) {
              functions.push(funcMatch[1]);
            }
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }

    if (matchingFiles.length === 0) return null;

    return {
      files: matchingFiles,
      functions: [...new Set(functions)],
      lineCount: totalLines,
    };
  }

  /**
   * Detect naming convention violations in documentation files
   */
  private detectNamingViolations(categories: DocumentCategory[]): NamingViolation[] {
    const violations: NamingViolation[] = [];

    // Define expected patterns per category
    const categoryPatterns: Record<string, { pattern: RegExp; expected: string }> = {
      'Feature Specs': { pattern: /^(us-\d{3}|FS-\d{3}|[a-z][a-z0-9-]+)\.md$/i, expected: 'us-XXX.md, FS-XXX/*, or lowercase-kebab.md' },
      'Architecture': { pattern: /^[a-z][a-z0-9-]+\.md$/, expected: 'lowercase-kebab-case.md' },
      'ADRs': { pattern: /^\d{4}-[a-z][a-z0-9-]+\.md$/, expected: 'XXXX-title-in-kebab-case.md' },
      'Governance': { pattern: /^[a-z][a-z0-9-]+\.md$/, expected: 'lowercase-kebab-case.md' },
      'Modules': { pattern: /^[a-z][a-z0-9-]+\.md$/i, expected: 'lowercase-kebab-case.md' },
      'Emergency Procedures': { pattern: /^[a-z][a-z0-9-]+\.md$/, expected: 'lowercase-kebab-case.md' },
      'Increment Specs': { pattern: /^spec\.md$/, expected: 'spec.md' },
    };

    // Patterns to detect violations
    const allCapsPattern = /^[A-Z][A-Z0-9-]+\.md$/;
    const mixedCasePattern = /^(?=.*[A-Z])(?=.*[a-z])[A-Za-z0-9-]+\.md$/;
    const dateSuffixPattern = /-\d{4}-\d{2}-\d{2}/;
    const noExtensionPattern = /^[^.]+$/;

    for (const category of categories) {
      const expectedRule = categoryPatterns[category.name];

      for (const doc of category.files) {
        const fileName = path.basename(doc.path);
        const relativePath = path.relative(this.projectPath, doc.path);

        // Check for ALL CAPS files (e.g., CIRCUIT-BREAKER-MONITORING.md)
        // Exclude standard files like README.md, FEATURE.md, API.md, CHANGELOG.md
        const standardAllCapsFiles = ['README.md', 'FEATURE.md', 'API.md', 'CHANGELOG.md', 'LICENSE.md', 'CONTRIBUTING.md'];
        if (allCapsPattern.test(fileName) && !standardAllCapsFiles.includes(fileName)) {
          violations.push({
            file: relativePath,
            category: category.name,
            violationType: 'all_caps',
            expectedPattern: expectedRule?.expected ?? 'lowercase-kebab-case.md',
            actual: fileName,
            severity: 'warning',
          });
          continue;
        }

        // Check for mixed case (e.g., CircuitBreaker.md)
        // Exclude standard files that use conventional naming
        if (mixedCasePattern.test(fileName) && !standardAllCapsFiles.includes(fileName) && !fileName.startsWith('README') && !fileName.startsWith('API')) {
          violations.push({
            file: relativePath,
            category: category.name,
            violationType: 'mixed_case',
            expectedPattern: expectedRule?.expected ?? 'lowercase-kebab-case.md',
            actual: fileName,
            severity: 'warning',
          });
          continue;
        }

        // Check for date suffixes (e.g., feature-fix-2025-11-24.md)
        if (dateSuffixPattern.test(fileName)) {
          violations.push({
            file: relativePath,
            category: category.name,
            violationType: 'date_suffix',
            expectedPattern: 'Document names should not include dates (use git history)',
            actual: fileName,
            severity: 'info',
          });
        }

        // Check for no extension
        if (noExtensionPattern.test(fileName)) {
          violations.push({
            file: relativePath,
            category: category.name,
            violationType: 'no_extension',
            expectedPattern: 'Files should have .md extension',
            actual: fileName,
            severity: 'error',
          });
        }

        // Check against category-specific pattern
        if (expectedRule && !expectedRule.pattern.test(fileName)) {
          // Skip if already caught by other checks
          if (!allCapsPattern.test(fileName) && !mixedCasePattern.test(fileName)) {
            // Skip files starting with _ (navigation/index files)
            if (fileName.startsWith('_')) {
              continue; // Navigation files like _index-*.md, _categories.md
            }

            // Skip ADR numbered files (e.g., 0001-decision-name.md) - this is standard ADR convention
            const adrPattern = /^\d{4}-[a-z0-9-]+\.md$/;
            const isInAdrFolder = relativePath.includes('/adr/') || relativePath.includes('\\adr\\');
            if (isInAdrFolder && adrPattern.test(fileName)) {
              continue; // Valid ADR naming, skip
            }

            violations.push({
              file: relativePath,
              category: category.name,
              violationType: 'inconsistent_prefix',
              expectedPattern: expectedRule.expected,
              actual: fileName,
              severity: 'info',
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * Detect duplicate documents based on title similarity and content
   */
  private detectDuplicates(categories: DocumentCategory[]): DuplicateDocument[] {
    const duplicates: DuplicateDocument[] = [];
    const titleMap = new Map<string, Set<string>>();  // Use Set to prevent duplicates

    // Standard files that intentionally have same name across folders
    const standardOrganizationalFiles = [
      'readme', 'feature', 'api', 'changelog', 'license', 'contributing', 'index',
    ];

    // Group files by normalized title
    for (const category of categories) {
      for (const doc of category.files) {
        // Normalize title: lowercase, remove numbers, dashes, underscores
        const normalizedTitle = doc.name
          .toLowerCase()
          .replace(/[\d_-]+/g, '')
          .replace(/\s+/g, '');

        // Skip standard organizational files from same_title detection
        if (standardOrganizationalFiles.includes(normalizedTitle.replace(/\.md$/, ''))) {
          continue;
        }

        if (!titleMap.has(normalizedTitle)) {
          titleMap.set(normalizedTitle, new Set());
        }
        titleMap.get(normalizedTitle)!.add(doc.path);  // Use add() for Set
      }
    }

    // Find duplicates with same normalized title
    for (const [normalizedTitle, filesSet] of titleMap) {
      const files = Array.from(filesSet);  // Convert Set to Array
      if (files.length > 1 && normalizedTitle.length > 3) {
        // Check for exact or near duplicates by comparing content
        const contentHashes = new Map<string, Set<string>>();  // Use Set

        for (const filePath of files) {
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            // Create simple content hash (first 500 chars normalized)
            const contentSample = content
              .slice(0, 500)
              .toLowerCase()
              .replace(/\s+/g, '')
              .replace(/[^a-z0-9]/g, '');

            if (!contentHashes.has(contentSample)) {
              contentHashes.set(contentSample, new Set());
            }
            contentHashes.get(contentSample)!.add(filePath);
          } catch {
            // Skip files that can't be read
          }
        }

        // Check for exact content duplicates
        let hasExactDupes = false;
        for (const [, sameContentFilesSet] of contentHashes) {
          const sameContentFiles = Array.from(sameContentFilesSet);
          if (sameContentFiles.length > 1) {
            hasExactDupes = true;
            duplicates.push({
              files: sameContentFiles.map(f => path.relative(this.projectPath, f)),
              similarity: 100,
              duplicateType: 'exact',
            });
          }
        }

        // If no exact duplicates but same title, mark as same_title
        // But only if files are in the same documentation type (not adr vs hld vs concepts)
        if (!hasExactDupes && files.length > 1) {
          const relativePaths = files.map(f => path.relative(this.projectPath, f));

          // Group by documentation type to avoid cross-type false positives
          const docTypes = ['adr', 'hld', 'concepts', 'specs', 'guides'];
          const filesByType = new Map<string, string[]>();

          for (const file of relativePaths) {
            // Determine doc type from path
            let docType = 'other';
            for (const type of docTypes) {
              if (file.includes(`/${type}/`) || file.includes(`\\${type}\\`)) {
                docType = type;
                break;
              }
            }
            if (!filesByType.has(docType)) {
              filesByType.set(docType, []);
            }
            filesByType.get(docType)!.push(file);
          }

          // Only report as duplicate if multiple files of same doc type
          for (const [, sameTypeFiles] of filesByType) {
            if (sameTypeFiles.length > 1) {
              // Filter out archived feature specs - different phases of same feature may share user stories
              const archivedFeatureFiles = sameTypeFiles.filter(f => f.includes('/_archive/FS-'));
              if (archivedFeatureFiles.length === sameTypeFiles.length && sameTypeFiles.length > 0) {
                // All files are archived feature specs - this is likely intentional phased features
                continue;
              }

              // Filter out SUPERSEDED ADRs - these are intentional redirects, not duplicates
              const nonSupersededFiles = sameTypeFiles.filter(file => {
                try {
                  const fullPath = path.join(this.projectPath, file);
                  const content = fs.readFileSync(fullPath, 'utf-8').slice(0, 500);
                  // Check if file is marked as SUPERSEDED (ADR convention)
                  return !content.includes('SUPERSEDED');
                } catch {
                  return true; // Include if can't read
                }
              });

              // Only report if multiple non-superseded files remain
              if (nonSupersededFiles.length > 1) {
                duplicates.push({
                  files: nonSupersededFiles,
                  similarity: 80,
                  duplicateType: 'same_title',
                });
              }
            }
          }
        }
      }
    }

    return duplicates;
  }

  /**
   * Detect discrepancies in documentation (broken links, orphaned refs)
   */
  private async detectDiscrepancies(categories: DocumentCategory[]): Promise<DocumentDiscrepancy[]> {
    const discrepancies: DocumentDiscrepancy[] = [];
    const allDocPaths = new Set<string>();

    // Build set of all doc paths
    for (const category of categories) {
      for (const doc of category.files) {
        allDocPaths.add(doc.path);
        allDocPaths.add(path.basename(doc.path));
        allDocPaths.add(doc.name);
      }
    }

    // Check each document for broken links and orphaned references
    for (const category of categories) {
      for (const doc of category.files) {
        try {
          const content = fs.readFileSync(doc.path, 'utf-8');
          const relativePath = path.relative(this.projectPath, doc.path);

          // Strip code blocks to avoid false positives from documentation examples
          const contentWithoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');

          // Check for markdown links to other docs (using content without code blocks)
          const linkPattern = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
          let match;
          while ((match = linkPattern.exec(contentWithoutCodeBlocks)) !== null) {
            const linkedPath = match[2];
            const absoluteLinkedPath = path.resolve(path.dirname(doc.path), linkedPath);

            if (!fs.existsSync(absoluteLinkedPath)) {
              // For links to increments folder, also check _archive
              let isArchivedIncrement = false;
              if (linkedPath.includes('/increments/') && !linkedPath.includes('/_archive/')) {
                // Extract increment ID and check archive
                const incrementMatch = linkedPath.match(/increments\/(\d{4}-[a-z0-9-]+)/);
                if (incrementMatch) {
                  const archivedPath = absoluteLinkedPath.replace(
                    `/increments/${incrementMatch[1]}`,
                    `/increments/_archive/${incrementMatch[1]}`
                  );
                  isArchivedIncrement = fs.existsSync(archivedPath);
                }
              }

              if (!isArchivedIncrement) {
                discrepancies.push({
                  file: relativePath,
                  discrepancyType: 'broken_link',
                  description: `Broken link to: ${linkedPath}`,
                  relatedFiles: [linkedPath],
                });
              }
            }
          }

          // Check for references to increment IDs that don't exist (using content without code blocks)
          const incrementRefPattern = /(?:increment|spec)[:\s]+(\d{4}-[a-z0-9-]+)/gi;
          while ((match = incrementRefPattern.exec(contentWithoutCodeBlocks)) !== null) {
            const incrementId = match[1];
            const incrementPath = path.join(this.projectPath, '.specweave/increments', incrementId);
            const archivedPath = path.join(this.projectPath, '.specweave/increments/_archive', incrementId);

            if (!fs.existsSync(incrementPath) && !fs.existsSync(archivedPath)) {
              discrepancies.push({
                file: relativePath,
                discrepancyType: 'orphaned_reference',
                description: `Reference to non-existent increment: ${incrementId}`,
              });
            }
          }

          // Check for outdated version references (e.g., v0.XX references)
          // Skip historical references like "Before v0.18.3", "NEW in v0.12.0", "Added in v0.13.0"
          const versionPattern = /\bv(0\.\d+\.\d+)\b/g;
          const historicalPatterns = [
            /before\s+v[\d.]+/i,
            /after\s+v[\d.]+/i,
            /\bnew\s+in\s+v[\d.]+/i,
            /added\s+in\s+v[\d.]+/i,
            /since\s+v[\d.]+/i,
            /v[\d.]+\s*\+/i, // v0.13.0+ format
            /v[\d.]+\s*(and\s+earlier|or\s+earlier)/i,
            /introduced\s+in\s+v[\d.]+/i,
            /deprecated\s+(in|since)\s+v[\d.]+/i,
            /removed\s+in\s+v[\d.]+/i,
            /\*\*version\*\*:\s*v[\d.]+/i, // **Version**: vX.X.X format
            /\(planned\)/i, // (planned) indicator
          ];
          const isHistoricalDoc = historicalPatterns.some(p => p.test(content));

          // Only check versions in non-historical documents
          if (!isHistoricalDoc) {
            while ((match = versionPattern.exec(content)) !== null) {
              const referencedVersion = match[1];
              // Flag very old versions (before 0.20)
              const majorMinor = referencedVersion.split('.').slice(0, 2).join('.');
              if (parseFloat(majorMinor) < 0.2) {
                discrepancies.push({
                  file: relativePath,
                  discrepancyType: 'outdated_version',
                  description: `Potentially outdated version reference: v${referencedVersion}`,
                });
              }
            }
          }
        } catch {
          // Skip files that can't be read
        }
      }
    }

    return discrepancies;
  }

  /**
   * Calculate documentation health score
   */
  private calculateHealthScore(
    categories: DocumentCategory[],
    mismatches: SpecCodeMismatch[],
    namingViolations: NamingViolation[]
  ): HealthScore {
    // Calculate freshness (based on document age)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let freshDocs = 0;
    let totalDocs = 0;

    for (const cat of categories) {
      for (const doc of cat.files) {
        totalDocs++;
        if (doc.lastModified > thirtyDaysAgo) {
          freshDocs++;
        }
      }
    }

    const freshness = totalDocs > 0 ? Math.round((freshDocs / totalDocs) * 100) : 0;

    // Calculate coverage (docs with ACs vs total docs)
    let docsWithACs = 0;
    for (const cat of categories) {
      docsWithACs += cat.files.filter(d => d.hasAcceptanceCriteria).length;
    }
    const coverage = totalDocs > 0 ? Math.round((docsWithACs / totalDocs) * 100) : 0;

    // Calculate accuracy (ACs without mismatches + naming violations penalty)
    let totalACs = 0;
    for (const cat of categories) {
      for (const doc of cat.files) {
        totalACs += doc.acceptanceCriteria.length;
      }
    }
    const mismatchCount = mismatches.length;

    // Apply naming violation penalty (errors: -3%, warnings: -1%, info: -0.5%)
    const namingPenalty = namingViolations.reduce((penalty, v) => {
      if (v.severity === 'error') return penalty + 3;
      if (v.severity === 'warning') return penalty + 1;
      return penalty + 0.5;
    }, 0);

    const accuracy = totalACs > 0
      ? Math.max(0, Math.round(((totalACs - mismatchCount) / totalACs) * 100) - Math.min(namingPenalty, 20))
      : Math.max(0, 100 - Math.min(namingPenalty, 20));

    // Calculate overall score
    const overall = Math.round(
      (freshness * 0.2) + (coverage * 0.3) + (accuracy * 0.5)
    );

    // Determine grade using thresholds
    const gradeThresholds: [number, HealthScore['grade']][] = [
      [90, 'A'], [80, 'B'], [70, 'C'], [60, 'D'],
    ];
    const grade = gradeThresholds.find(([threshold]) => overall >= threshold)?.[1] ?? 'F';

    return {
      overall,
      grade,
      freshness,
      coverage,
      accuracy,
      trend: 'stable', // Would need historical data for actual trend
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    categories: DocumentCategory[],
    mismatches: SpecCodeMismatch[],
    healthScore: HealthScore,
    namingViolations: NamingViolation[],
    duplicates: DuplicateDocument[]
  ): string[] {
    const recommendations: string[] = [];

    // Freshness recommendations
    if (healthScore.freshness < 50) {
      recommendations.push(
        'Documentation freshness is low. Consider reviewing and updating docs that are over 30 days old.'
      );
    }

    // Coverage recommendations
    if (healthScore.coverage < 60) {
      recommendations.push(
        'Documentation coverage is limited. Add acceptance criteria to more documents.'
      );
    }

    // Mismatch recommendations
    if (mismatches.length > 0) {
      const ghostCompletions = mismatches.filter(m => m.mismatchType === 'ghost_completion');
      if (ghostCompletions.length > 0) {
        recommendations.push(
          `${ghostCompletions.length} acceptance criteria are marked complete but lack code evidence. Review: ${ghostCompletions.slice(0, 3).map(m => m.criterionId).join(', ')}${ghostCompletions.length > 3 ? '...' : ''}`
        );
      }
    }

    // Naming convention recommendations
    if (namingViolations.length > 0) {
      const allCapsViolations = namingViolations.filter(v => v.violationType === 'all_caps');
      const dateSuffixViolations = namingViolations.filter(v => v.violationType === 'date_suffix');

      if (allCapsViolations.length > 0) {
        recommendations.push(
          `${allCapsViolations.length} files use ALL CAPS naming (e.g., ${allCapsViolations[0].actual}). Rename to lowercase-kebab-case for consistency.`
        );
      }

      if (dateSuffixViolations.length > 0) {
        recommendations.push(
          `${dateSuffixViolations.length} files include dates in names. Use git history for versioning instead of date suffixes.`
        );
      }
    }

    // Duplicate recommendations
    if (duplicates.length > 0) {
      const exactDupes = duplicates.filter(d => d.duplicateType === 'exact');
      if (exactDupes.length > 0) {
        recommendations.push(
          `${exactDupes.length} sets of duplicate documents detected. Consider consolidating: ${exactDupes[0].files.slice(0, 2).join(', ')}`
        );
      }
    }

    // Category-specific recommendations
    const hasADRs = categories.some(c => c.name === 'ADRs' && c.fileCount > 0);
    if (!hasADRs) {
      recommendations.push(
        'No Architecture Decision Records found. Consider documenting key architectural decisions in .specweave/docs/internal/architecture/adr/'
      );
    }

    const hasGovernance = categories.some(c => c.name === 'Governance' && c.fileCount > 0);
    if (!hasGovernance) {
      recommendations.push(
        'No governance documentation found. Consider adding coding standards to .specweave/docs/internal/governance/'
      );
    }

    // Large folder organization recommendations
    for (const category of categories) {
      if (category.fileCount > 30) {
        recommendations.push(
          `📁 "${category.name}" has ${category.fileCount} files. Run /sw:organize-docs to generate themed navigation indexes for easier browsing.`
        );
      }
    }

    return recommendations;
  }
}

/**
 * Generate markdown report from enterprise analysis
 */
export function generateEnterpriseReport(report: EnterpriseDocReport): string {
  const lines: string[] = [];

  lines.push('# Enterprise Documentation Health Report');
  lines.push('');
  lines.push(`*Generated: ${report.generatedAt.toLocaleString()}*`);
  lines.push('');

  // Health Score Summary
  lines.push('## Documentation Health Score');
  lines.push('');
  lines.push(`| Metric | Score | Grade |`);
  lines.push(`|--------|-------|-------|`);
  lines.push(`| **Overall** | ${report.healthScore.overall}% | **${report.healthScore.grade}** |`);
  lines.push(`| Freshness | ${report.healthScore.freshness}% | - |`);
  lines.push(`| Coverage | ${report.healthScore.coverage}% | - |`);
  lines.push(`| Accuracy | ${report.healthScore.accuracy}% | - |`);
  lines.push('');

  // Document Categories
  lines.push('## Documentation Categories');
  lines.push('');
  lines.push('| Category | Documents | Last Updated |');
  lines.push('|----------|-----------|--------------|');

  for (const cat of report.categories) {
    const lastUpdated = cat.lastUpdated
      ? cat.lastUpdated.toLocaleDateString()
      : 'N/A';
    lines.push(`| ${cat.name} | ${cat.fileCount} | ${lastUpdated} |`);
  }
  lines.push('');
  lines.push(`**Total Documents**: ${report.totalDocuments}`);
  lines.push('');

  // Mismatches
  if (report.mismatches.length > 0) {
    lines.push('## Spec-Code Mismatches');
    lines.push('');
    lines.push('| AC ID | Type | Confidence | File |');
    lines.push('|-------|------|------------|------|');

    for (const mismatch of report.mismatches.slice(0, 20)) {
      const typeEmoji = mismatch.mismatchType === 'ghost_completion' ? '👻' :
                        mismatch.mismatchType === 'partial_implementation' ? '⚠️' : '❓';
      const fileName = path.basename(mismatch.specFile);
      lines.push(`| ${mismatch.criterionId} | ${typeEmoji} ${mismatch.mismatchType} | ${mismatch.confidence}% | ${fileName} |`);
    }

    if (report.mismatches.length > 20) {
      lines.push(`| ... | ... | ... | *${report.mismatches.length - 20} more* |`);
    }
    lines.push('');
  }

  // Naming Violations
  if (report.namingViolations.length > 0) {
    lines.push('## Naming Convention Violations');
    lines.push('');
    lines.push('| File | Type | Severity | Expected Pattern |');
    lines.push('|------|------|----------|------------------|');

    const severityEmoji = { error: '🔴', warning: '🟡', info: '🔵' };
    for (const violation of report.namingViolations.slice(0, 25)) {
      const emoji = severityEmoji[violation.severity];
      lines.push(`| ${violation.file} | ${emoji} ${violation.violationType} | ${violation.severity} | ${violation.expectedPattern} |`);
    }

    if (report.namingViolations.length > 25) {
      lines.push(`| ... | ... | ... | *${report.namingViolations.length - 25} more* |`);
    }
    lines.push('');
  }

  // Duplicates
  if (report.duplicates.length > 0) {
    lines.push('## Duplicate Documents');
    lines.push('');
    lines.push('| Files | Similarity | Type |');
    lines.push('|-------|------------|------|');

    for (const dup of report.duplicates.slice(0, 15)) {
      const filesStr = dup.files.slice(0, 3).join(', ') + (dup.files.length > 3 ? '...' : '');
      lines.push(`| ${filesStr} | ${dup.similarity}% | ${dup.duplicateType} |`);
    }

    if (report.duplicates.length > 15) {
      lines.push(`| ... | ... | *${report.duplicates.length - 15} more* |`);
    }
    lines.push('');
  }

  // Discrepancies
  if (report.discrepancies.length > 0) {
    lines.push('## Documentation Discrepancies');
    lines.push('');
    lines.push('| File | Type | Description |');
    lines.push('|------|------|-------------|');

    const discrepancyEmoji: Record<string, string> = {
      broken_link: '🔗',
      orphaned_reference: '👻',
      outdated_version: '📅',
      conflicting_info: '⚠️',
    };

    for (const disc of report.discrepancies.slice(0, 20)) {
      const emoji = discrepancyEmoji[disc.discrepancyType] ?? '❓';
      lines.push(`| ${disc.file} | ${emoji} ${disc.discrepancyType} | ${disc.description} |`);
    }

    if (report.discrepancies.length > 20) {
      lines.push(`| ... | ... | *${report.discrepancies.length - 20} more* |`);
    }
    lines.push('');
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push('## Recommendations');
    lines.push('');
    for (const rec of report.recommendations) {
      lines.push(`- ${rec}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
