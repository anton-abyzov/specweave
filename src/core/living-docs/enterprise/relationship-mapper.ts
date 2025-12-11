/**
 * Relationship Mapper
 *
 * Maps relationships between all entities:
 * - Features → Code files
 * - Teams → Features
 * - Modules → Modules (dependencies)
 * - Increments → Features
 * - External refs → Internal entities
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { Logger, consoleLogger } from '../../../utils/logger.js';
import type { SpecsCatalog, EnhancedFeatureSpec } from './spec-loader.js';
import type { RepoAnalysis, EnhancedTeam } from '../intelligent-analyzer/types.js';
import type { OrganizationSynthesisResult } from '../intelligent-analyzer/organization-synthesizer.js';

export interface RelationshipMap {
  // Feature to code files
  featureToCode: Map<string, string[]>;

  // Feature to owning team
  featureToTeam: Map<string, string>;

  // Team to features
  teamToFeatures: Map<string, string[]>;

  // Module dependencies
  moduleDependencies: Map<string, string[]>;

  // Increment to feature
  incrementToFeature: Map<string, string>;

  // External ref to feature
  externalToFeature: Map<string, string>;

  // Totals
  totalRelationships: number;
}

export interface RelationshipMapperOptions {
  projectPath: string;
  logger?: Logger;
  repoAnalyses?: Map<string, RepoAnalysis>;
}

/**
 * Maps relationships between all entities in the system
 */
export class RelationshipMapper {
  private projectPath: string;
  private logger: Logger;
  private repoAnalyses?: Map<string, RepoAnalysis>;

  constructor(options: RelationshipMapperOptions) {
    this.projectPath = options.projectPath;
    this.logger = options.logger ?? consoleLogger;
    this.repoAnalyses = options.repoAnalyses;
  }

  /**
   * Build complete relationship map
   */
  async map(
    catalog: SpecsCatalog,
    orgResult?: OrganizationSynthesisResult
  ): Promise<RelationshipMap> {
    const featureToCode = new Map<string, string[]>();
    const featureToTeam = new Map<string, string>();
    const teamToFeatures = new Map<string, string[]>();
    const moduleDependencies = new Map<string, string[]>();
    const incrementToFeature = new Map<string, string>();
    const externalToFeature = new Map<string, string>();

    // 1. Map features to code
    this.logger.debug('Mapping features to code...');
    for (const feature of catalog.features) {
      const files = await this.findCodeForFeature(feature);
      featureToCode.set(feature.featureId, files);
    }

    // 2. Map features to teams (from org result or heuristics)
    this.logger.debug('Mapping features to teams...');
    if (orgResult?.enhancedTeams) {
      for (const team of orgResult.enhancedTeams) {
        // Initialize team in map
        if (!teamToFeatures.has(team.name)) {
          teamToFeatures.set(team.name, []);
        }

        // Match features to teams by:
        // 1. Project match
        // 2. Module match (if team owns modules that feature touches)
        for (const feature of catalog.features) {
          const featureFiles = featureToCode.get(feature.featureId) ?? [];

          // Check if any team modules are in feature files
          const teamModules = team.repos;
          const hasOverlap = teamModules.some(mod =>
            featureFiles.some(file => file.includes(mod))
          );

          // Check project match
          const projectMatch = feature.project && team.project === feature.project;

          if (hasOverlap || projectMatch) {
            featureToTeam.set(feature.featureId, team.name);
            teamToFeatures.get(team.name)!.push(feature.featureId);
          }
        }
      }
    }

    // 3. Map module dependencies
    this.logger.debug('Mapping module dependencies...');
    if (this.repoAnalyses) {
      for (const [modName, analysis] of this.repoAnalyses) {
        const deps = this.extractModuleDependencies(modName, analysis);
        moduleDependencies.set(modName, deps);
      }
    }

    // 4. Map increments to features
    this.logger.debug('Mapping increments to features...');
    for (const feature of catalog.features) {
      for (const incId of feature.relatedIncrements) {
        incrementToFeature.set(incId, feature.featureId);
      }
    }

    // 5. Map external refs to features
    this.logger.debug('Mapping external references...');
    for (const feature of catalog.features) {
      for (const ref of feature.externalRefs) {
        const key = `${ref.provider}:${ref.id}`;
        externalToFeature.set(key, feature.featureId);
      }
    }

    // Calculate total relationships
    let totalRelationships = 0;
    totalRelationships += Array.from(featureToCode.values()).reduce((sum, arr) => sum + arr.length, 0);
    totalRelationships += featureToTeam.size;
    totalRelationships += Array.from(moduleDependencies.values()).reduce((sum, arr) => sum + arr.length, 0);
    totalRelationships += incrementToFeature.size;
    totalRelationships += externalToFeature.size;

    return {
      featureToCode,
      featureToTeam,
      teamToFeatures,
      moduleDependencies,
      incrementToFeature,
      externalToFeature,
      totalRelationships,
    };
  }

  /**
   * Find code files related to a feature
   */
  private async findCodeForFeature(feature: EnhancedFeatureSpec): Promise<string[]> {
    const relatedFiles: string[] = [];

    // Strategy 1: Search for feature ID in code
    const featureIdPattern = feature.featureId.replace('-', '[-_]?');
    const srcPath = path.join(this.projectPath, 'src');

    if (fs.existsSync(srcPath)) {
      try {
        // Search for feature ID mentions in code
        const files = await glob('**/*.{ts,js,tsx,jsx}', {
          cwd: srcPath,
          nodir: true,
          ignore: ['**/node_modules/**', '**/dist/**'],
        });

        for (const file of files.slice(0, 1000)) { // Limit search
          const content = fs.readFileSync(path.join(srcPath, file), 'utf-8');
          if (content.includes(feature.featureId) ||
              content.match(new RegExp(featureIdPattern, 'i'))) {
            relatedFiles.push(`src/${file}`);
          }
        }
      } catch (err: any) {
        this.logger.debug(`Code search failed: ${err.message}`);
      }
    }

    // Strategy 2: Search for key concepts from user stories
    for (const us of feature.userStories) {
      // Extract key terms from title
      const keyTerms = this.extractKeyTerms(us.title);

      for (const term of keyTerms) {
        // Search for term in file names
        const matchingFiles = await this.findFilesByTerm(term);
        relatedFiles.push(...matchingFiles);
      }
    }

    // Deduplicate and limit
    return [...new Set(relatedFiles)].slice(0, 50);
  }

  /**
   * Extract key terms from a title for code matching
   */
  private extractKeyTerms(title: string): string[] {
    // Remove common words and extract meaningful terms
    const stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
      'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'under', 'again', 'further', 'then', 'once', 'here',
      'there', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
      'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not',
      'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and',
      'but', 'if', 'or', 'because', 'until', 'while', 'although', 'user',
      'users', 'system', 'feature', 'implement', 'add', 'create', 'update',
    ]);

    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 5);
  }

  /**
   * Find files matching a term
   */
  private async findFilesByTerm(term: string): Promise<string[]> {
    const srcPath = path.join(this.projectPath, 'src');
    if (!fs.existsSync(srcPath)) return [];

    try {
      // Search for term in file names
      const pattern = `**/*${term}*/*.{ts,js}`;
      const files = await glob(pattern, {
        cwd: srcPath,
        nodir: true,
        nocase: true,
        ignore: ['**/node_modules/**', '**/dist/**'],
      });

      return files.slice(0, 10).map(f => `src/${f}`);
    } catch {
      return [];
    }
  }

  /**
   * Extract module dependencies from repo analysis
   */
  private extractModuleDependencies(
    modName: string,
    analysis: RepoAnalysis
  ): string[] {
    const deps: string[] = [];

    // Extract from external dependencies
    for (const dep of analysis.externalDependencies) {
      // Check if it's an internal module reference
      if (this.repoAnalyses?.has(dep)) {
        deps.push(dep);
      }
    }

    // Extract from observations (may mention other modules)
    for (const obs of analysis.observations) {
      const moduleMentions = obs.match(/(?:uses|depends on|imports from)\s+(\w+)/gi);
      if (moduleMentions) {
        for (const mention of moduleMentions) {
          const modMatch = mention.match(/(\w+)$/);
          if (modMatch && this.repoAnalyses?.has(modMatch[1])) {
            deps.push(modMatch[1]);
          }
        }
      }
    }

    // Try to infer from patterns
    if (analysis.patternsUsed.some(p => p.pattern.includes('API') || p.pattern.includes('client'))) {
      // API-related modules likely depend on core
      if (this.repoAnalyses?.has('core') && modName !== 'core') {
        deps.push('core');
      }
    }

    return [...new Set(deps)];
  }
}
