/**
 * Intelligent Living Docs Sync - Main Orchestrator
 *
 * Coordinates all components for intelligent spec distribution.
 *
 * @module living-docs
 */

import fs from 'fs-extra';
import path from 'path';
import {
  ContentParser,
  ParsedSpec,
  createContentParser,
  ParserOptions,
} from './content-parser.js';
import {
  ContentClassifier,
  ClassificationResult,
  createContentClassifier,
} from './content-classifier.js';
import {
  ProjectDetector,
  ProjectContext,
  createProjectDetector,
  DetectorOptions,
} from './project-detector.js';
import {
  ContentDistributor,
  DistributionResult,
  createContentDistributor,
  DistributorOptions,
} from './content-distributor.js';
import {
  CrossLinker,
  CrossLink,
  createCrossLinker,
  LinkerOptions,
} from './cross-linker.js';

/**
 * Intelligent Sync options
 */
export interface IntelligentSyncOptions {
  parser?: ParserOptions;
  detector?: DetectorOptions;
  distributor?: DistributorOptions;
  linker?: LinkerOptions;
  dryRun?: boolean;
  verbose?: boolean;
}

/**
 * Complete sync result
 */
export interface IntelligentSyncResult {
  incrementId: string;
  project: ProjectContext;
  spec: ParsedSpec;
  classifications: ClassificationResult[];
  distribution: DistributionResult;
  links: CrossLink[];
  duration: number;
  success: boolean;
  errors: string[];
}

/**
 * Intelligent Living Docs Sync Orchestrator
 */
export class IntelligentLivingDocsSync {
  private parser: ContentParser;
  private classifier: ContentClassifier;
  private detector: ProjectDetector;
  private distributor: ContentDistributor;
  private linker: CrossLinker;
  private options: IntelligentSyncOptions;

  constructor(options: IntelligentSyncOptions = {}) {
    this.options = options;

    // Initialize components
    this.parser = createContentParser(options.parser);
    this.classifier = createContentClassifier();
    this.detector = createProjectDetector(options.detector);
    this.distributor = createContentDistributor(options.distributor);
    this.linker = createCrossLinker(options.linker);
  }

  /**
   * Sync increment spec to living docs
   */
  async syncIncrement(incrementId: string): Promise<IntelligentSyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      this.log(`🚀 Starting intelligent sync for increment: ${incrementId}`);

      // 1. Load and parse spec
      this.log('📖 Step 1: Parsing spec.md...');
      const spec = await this.loadAndParseSpec(incrementId);
      this.log(`   ✅ Parsed ${spec.sections.length} top-level sections`);

      // 2. Classify sections
      this.log('🔍 Step 2: Classifying sections...');
      const flatSections = this.parser.flattenSections(spec.sections);
      const classifications = this.classifier.classifyAll(flatSections);
      const stats = this.classifier.getStatistics(classifications);
      this.log(`   ✅ Classified ${classifications.length} sections`);
      this.log(`      Average confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`);
      this.log(`      Low confidence (<60%): ${stats.lowConfidence}`);

      // 3. Detect project
      this.log('🎯 Step 3: Detecting project...');
      const project = this.detector.detectProject(incrementId, spec);
      this.log(`   ✅ Project: ${project.name} (${(project.confidence * 100).toFixed(1)}% confidence)`);
      if (project.reasoning.length > 0) {
        this.log(`      Reasoning: ${project.reasoning.join(', ')}`);
      }

      // 4. Ensure project structure exists
      await this.detector.createProjectStructure(project.id);

      // 5. Distribute content
      this.log('📦 Step 4: Distributing content...');
      const distribution = await this.distributor.distribute(
        incrementId,
        spec,
        classifications,
        project
      );
      const distStats = this.distributor.getStatistics(distribution);
      this.log(`   ✅ Distribution complete:`);
      this.log(`      Created: ${distribution.summary.filesCreated} files`);
      this.log(`      Updated: ${distribution.summary.filesUpdated} files`);
      this.log(`      Skipped: ${distribution.summary.filesSkipped} files (unchanged)`);
      this.log(`      Errors: ${distribution.summary.errors}`);
      this.log(`      Total size: ${(distStats.totalSize / 1024).toFixed(1)} KB`);

      if (distribution.errors.length > 0) {
        errors.push(...distribution.errors.map((e) => e.error));
      }

      // 6. Generate cross-links
      this.log('🔗 Step 5: Generating cross-links...');
      const links = await this.linker.generateLinks(distribution);
      const linkStats = this.linker.getStatistics();
      this.log(`   ✅ Generated ${links.length} cross-links`);
      this.log(`      Bidirectional: ${linkStats.bidirectional}`);
      this.log(`      By type: ${JSON.stringify(linkStats.byType)}`);

      // 7. Generate index files
      this.log('📑 Step 6: Generating index files...');
      await this.generateIndexFiles(distribution, project.id);
      this.log(`   ✅ Index files generated`);

      const duration = Date.now() - startTime;
      this.log(`✅ Intelligent sync complete in ${duration}ms`);

      return {
        incrementId,
        project,
        spec,
        classifications,
        distribution,
        links,
        duration,
        success: distribution.errors.length === 0,
        errors,
      };
    } catch (error) {
      errors.push(String(error));
      const duration = Date.now() - startTime;

      this.log(`❌ Intelligent sync failed: ${error}`);

      throw new Error(`Intelligent sync failed: ${error}`);
    }
  }

  /**
   * Load and parse increment spec
   */
  private async loadAndParseSpec(incrementId: string): Promise<ParsedSpec> {
    const specPath = path.join(
      process.cwd(),
      '.specweave',
      'increments',
      incrementId,
      'spec.md'
    );

    if (!fs.existsSync(specPath)) {
      throw new Error(`Spec not found: ${specPath}`);
    }

    const markdown = await fs.readFile(specPath, 'utf-8');
    return this.parser.parse(markdown, specPath);
  }

  /**
   * Generate index files for categories
   */
  private async generateIndexFiles(
    distribution: DistributionResult,
    projectId: string
  ): Promise<void> {
    const allFiles = [...distribution.created, ...distribution.updated];
    const byCategory = new Map<string, typeof allFiles>();

    for (const file of allFiles) {
      if (!byCategory.has(file.category)) {
        byCategory.set(file.category, []);
      }
      byCategory.get(file.category)!.push(file);
    }

    for (const [category, files] of byCategory.entries()) {
      await this.distributor.generateIndex(category as any, projectId, files);
    }
  }

  /**
   * Logging helper
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.log(message);
    }
  }

  /**
   * Get component instances (for testing/advanced usage)
   */
  getComponents() {
    return {
      parser: this.parser,
      classifier: this.classifier,
      detector: this.detector,
      distributor: this.distributor,
      linker: this.linker,
    };
  }
}

/**
 * Factory function to create sync orchestrator
 */
export function createIntelligentSync(
  options?: IntelligentSyncOptions
): IntelligentLivingDocsSync {
  return new IntelligentLivingDocsSync(options);
}

/**
 * Convenience function to sync an increment
 */
export async function syncIncrement(
  incrementId: string,
  options?: IntelligentSyncOptions
): Promise<IntelligentSyncResult> {
  const sync = createIntelligentSync(options);
  return sync.syncIncrement(incrementId);
}

// Re-export all types and classes
export * from './content-parser.js';
export * from './content-classifier.js';
export * from './project-detector.js';
export * from './content-distributor.js';
export * from './cross-linker.js';
