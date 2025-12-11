/**
 * Enhanced Spec Loader
 *
 * Loads ALL specifications from living docs with full details:
 * - Feature hierarchies (FS-XXX -> US-XXX)
 * - User story details with acceptance criteria
 * - Status and completion information
 * - External tool references (GitHub/JIRA/ADO)
 * - Related increments
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { Logger, consoleLogger } from '../../../utils/logger.js';

/**
 * User story detail with full acceptance criteria
 */
export interface UserStoryDetail {
  id: string;                      // US-XXX
  title: string;
  description: string;
  acceptanceCriteria: AcceptanceCriterion[];
  priority: 'P0' | 'P1' | 'P2' | 'P3' | null;
  status: 'draft' | 'ready' | 'in_progress' | 'completed';
  project?: string;
  board?: string;
  externalRef?: ExternalReference;
  filePath: string;
}

export interface AcceptanceCriterion {
  id: string;                      // AC-USXXX-XX
  description: string;
  completed: boolean;
}

export interface ExternalReference {
  provider: 'github' | 'jira' | 'ado';
  id: string;
  url?: string;
  status?: string;
}

/**
 * Enhanced feature spec with full hierarchy
 */
export interface EnhancedFeatureSpec {
  featureId: string;               // FS-XXX
  featureName: string;
  description: string;
  userStories: UserStoryDetail[];
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  completedAt?: string;
  externalRefs: ExternalReference[];
  relatedIncrements: string[];
  project?: string;
  board?: string;
  folderPath: string;
  totalACs: number;
  completedACs: number;
  completionPercentage: number;
}

/**
 * Full specs catalog with aggregated metrics
 */
export interface SpecsCatalog {
  features: EnhancedFeatureSpec[];
  totalFeatures: number;
  activeFeatures: number;
  completedFeatures: number;
  archivedFeatures: number;
  totalUserStories: number;
  totalACs: number;
  completedACs: number;
  overallCompletion: number;
  byProject: Map<string, EnhancedFeatureSpec[]>;
  byStatus: Map<string, EnhancedFeatureSpec[]>;
  loadedAt: string;
}

export interface SpecLoaderOptions {
  projectPath: string;
  logger?: Logger;
  includeArchived?: boolean;
}

/**
 * Enhanced spec loader that extracts full details from all specs
 */
export class EnhancedSpecLoader {
  private projectPath: string;
  private logger: Logger;
  private includeArchived: boolean;

  constructor(options: SpecLoaderOptions) {
    this.projectPath = options.projectPath;
    this.logger = options.logger ?? consoleLogger;
    this.includeArchived = options.includeArchived ?? true;
  }

  /**
   * Load all specifications with full details
   */
  async loadAllSpecs(): Promise<SpecsCatalog> {
    const specsPath = path.join(this.projectPath, '.specweave/docs/internal/specs');

    if (!fs.existsSync(specsPath)) {
      this.logger.warn('Specs directory not found');
      return this.createEmptyCatalog();
    }

    const features: EnhancedFeatureSpec[] = [];

    // Find all FEATURE.md files (including in archives if enabled)
    const pattern = this.includeArchived
      ? '**/FS-*/FEATURE.md'
      : '**/FS-*/FEATURE.md';

    const featureFiles = await glob(pattern, {
      cwd: specsPath,
      nodir: true,
      ignore: this.includeArchived ? [] : ['**/_archive/**']
    });

    this.logger.info(`Found ${featureFiles.length} feature files`);

    for (const featureFile of featureFiles) {
      try {
        const feature = await this.loadFeature(specsPath, featureFile);
        if (feature) {
          features.push(feature);
        }
      } catch (err: any) {
        this.logger.warn(`Failed to load feature ${featureFile}: ${err.message}`);
      }
    }

    return this.buildCatalog(features);
  }

  /**
   * Load a single feature with all its user stories
   */
  private async loadFeature(
    specsPath: string,
    featureFilePath: string
  ): Promise<EnhancedFeatureSpec | null> {
    const fullPath = path.join(specsPath, featureFilePath);
    const featureDir = path.dirname(fullPath);
    const featureId = path.basename(featureDir);

    // Read FEATURE.md
    const content = fs.readFileSync(fullPath, 'utf-8');

    // Extract feature metadata
    const featureName = this.extractTitle(content) || featureId;
    const description = this.extractDescription(content);
    const isArchived = featureFilePath.includes('_archive');

    // Load all user stories in this feature folder
    const userStories = await this.loadUserStories(featureDir);

    // Calculate completion
    const totalACs = userStories.reduce((sum, us) => sum + us.acceptanceCriteria.length, 0);
    const completedACs = userStories.reduce(
      (sum, us) => sum + us.acceptanceCriteria.filter(ac => ac.completed).length,
      0
    );
    const completionPercentage = totalACs > 0 ? Math.round((completedACs / totalACs) * 100) : 0;

    // Determine status
    let status: 'active' | 'completed' | 'archived' = 'active';
    if (isArchived) {
      status = 'archived';
    } else if (completionPercentage === 100 && totalACs > 0) {
      status = 'completed';
    }

    // Extract external references from user stories
    const externalRefs = userStories
      .filter(us => us.externalRef)
      .map(us => us.externalRef!);

    // Find related increments
    const relatedIncrements = this.findRelatedIncrements(featureId);

    // Extract project/board from first user story or feature content
    const project = userStories[0]?.project || this.extractField(content, 'project');
    const board = userStories[0]?.board || this.extractField(content, 'board');

    return {
      featureId,
      featureName,
      description,
      userStories,
      status,
      createdAt: this.getFileCreatedDate(fullPath),
      completedAt: status === 'completed' ? this.getFileModifiedDate(fullPath) : undefined,
      externalRefs,
      relatedIncrements,
      project,
      board,
      folderPath: featureDir,
      totalACs,
      completedACs,
      completionPercentage,
    };
  }

  /**
   * Load all user stories in a feature folder
   */
  private async loadUserStories(featureDir: string): Promise<UserStoryDetail[]> {
    const userStories: UserStoryDetail[] = [];

    const usFiles = await glob('us-*.md', { cwd: featureDir, nodir: true });

    for (const usFile of usFiles) {
      try {
        const us = this.loadUserStory(path.join(featureDir, usFile));
        if (us) {
          userStories.push(us);
        }
      } catch (err: any) {
        this.logger.debug(`Failed to load user story ${usFile}: ${err.message}`);
      }
    }

    return userStories.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Load a single user story with acceptance criteria
   */
  private loadUserStory(filePath: string): UserStoryDetail | null {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.md');

    // Extract US ID from filename or content
    const idMatch = fileName.match(/us-(\d+)/i) || content.match(/US-(\d+)/i);
    const id = idMatch ? `US-${idMatch[1].padStart(3, '0')}` : fileName;

    // Extract title
    const title = this.extractTitle(content) || fileName;

    // Extract description (the "As a... I want... So that..." pattern)
    const description = this.extractUserStoryDescription(content);

    // Extract acceptance criteria
    const acceptanceCriteria = this.extractAcceptanceCriteria(content, id);

    // Extract priority from title or content
    const priority = this.extractPriority(content, title);

    // Extract status from frontmatter or checkboxes
    const status = this.determineUserStoryStatus(content, acceptanceCriteria);

    // Extract project/board from frontmatter
    const frontmatter = this.extractFrontmatter(content);
    const project = frontmatter.project || this.extractField(content, 'Project');
    const board = frontmatter.board || this.extractField(content, 'Board');

    // Extract external reference
    const externalRef = this.extractExternalRef(content, frontmatter);

    return {
      id,
      title,
      description,
      acceptanceCriteria,
      priority,
      status,
      project,
      board,
      externalRef,
      filePath,
    };
  }

  /**
   * Extract acceptance criteria from user story content
   */
  private extractAcceptanceCriteria(content: string, usId: string): AcceptanceCriterion[] {
    const criteria: AcceptanceCriterion[] = [];

    // Match patterns like:
    // - [x] **AC-US001-01**: Description
    // - [ ] **AC-US001-02**: Description
    // - [x] AC-US001-03: Description
    const acPattern = /- \[([ x])\]\s*\*?\*?(?:AC-)?([A-Z0-9-]+)(?:\*?\*?):\s*(.+)/gi;

    let match;
    while ((match = acPattern.exec(content)) !== null) {
      const completed = match[1].toLowerCase() === 'x';
      let acId = match[2];
      const description = match[3].trim();

      // Normalize AC ID format
      if (!acId.startsWith('AC-')) {
        acId = `AC-${acId}`;
      }

      criteria.push({
        id: acId,
        description,
        completed,
      });
    }

    // Also try simpler checkbox patterns with numbered items
    if (criteria.length === 0) {
      const simplePattern = /- \[([ x])\]\s*(.+)/g;
      let acNum = 1;
      while ((match = simplePattern.exec(content)) !== null) {
        const completed = match[1].toLowerCase() === 'x';
        const description = match[2].trim();

        // Skip if it looks like a task, not an AC
        if (description.startsWith('T-') || description.match(/^Task/i)) continue;

        criteria.push({
          id: `AC-${usId.replace('US-', '')}-${String(acNum++).padStart(2, '0')}`,
          description,
          completed,
        });
      }
    }

    return criteria;
  }

  /**
   * Extract priority from content or title
   */
  private extractPriority(content: string, title: string): 'P0' | 'P1' | 'P2' | 'P3' | null {
    const combined = `${title} ${content}`;

    if (combined.match(/\(P0\)|P0:|Priority:\s*P0|Critical/i)) return 'P0';
    if (combined.match(/\(P1\)|P1:|Priority:\s*P1|High/i)) return 'P1';
    if (combined.match(/\(P2\)|P2:|Priority:\s*P2|Medium/i)) return 'P2';
    if (combined.match(/\(P3\)|P3:|Priority:\s*P3|Low/i)) return 'P3';

    return null;
  }

  /**
   * Determine user story status from content
   */
  private determineUserStoryStatus(
    content: string,
    acs: AcceptanceCriterion[]
  ): 'draft' | 'ready' | 'in_progress' | 'completed' {
    // Check frontmatter status
    const frontmatter = this.extractFrontmatter(content);
    if (frontmatter.status) {
      return frontmatter.status as any;
    }

    // Determine from ACs
    if (acs.length === 0) return 'draft';

    const completedCount = acs.filter(ac => ac.completed).length;
    if (completedCount === acs.length) return 'completed';
    if (completedCount > 0) return 'in_progress';

    return 'ready';
  }

  /**
   * Extract external reference (GitHub/JIRA/ADO)
   */
  private extractExternalRef(
    content: string,
    frontmatter: Record<string, any>
  ): ExternalReference | undefined {
    // Check frontmatter first
    if (frontmatter.external_ref || frontmatter.externalRef) {
      const ref = frontmatter.external_ref || frontmatter.externalRef;
      return {
        provider: ref.provider || 'github',
        id: ref.id || ref.number || '',
        url: ref.url,
        status: ref.status,
      };
    }

    // Look for GitHub issue links
    const ghMatch = content.match(/github\.com\/[^/]+\/[^/]+\/issues\/(\d+)/i);
    if (ghMatch) {
      return {
        provider: 'github',
        id: ghMatch[1],
        url: ghMatch[0],
      };
    }

    // Look for JIRA links
    const jiraMatch = content.match(/([A-Z]+-\d+)/);
    if (jiraMatch && content.includes('atlassian.net') || content.includes('jira')) {
      return {
        provider: 'jira',
        id: jiraMatch[1],
      };
    }

    // Look for ADO links
    const adoMatch = content.match(/dev\.azure\.com\/[^/]+\/[^/]+\/_workitems\/edit\/(\d+)/i);
    if (adoMatch) {
      return {
        provider: 'ado',
        id: adoMatch[1],
        url: adoMatch[0],
      };
    }

    return undefined;
  }

  /**
   * Find increments related to a feature
   */
  private findRelatedIncrements(featureId: string): string[] {
    const incrementsPath = path.join(this.projectPath, '.specweave/increments');
    const relatedIncrements: string[] = [];

    if (!fs.existsSync(incrementsPath)) return relatedIncrements;

    // Check all increment directories
    const dirs = ['', '_archive', '_paused', '_abandoned'];
    for (const subdir of dirs) {
      const checkPath = subdir ? path.join(incrementsPath, subdir) : incrementsPath;
      if (!fs.existsSync(checkPath)) continue;

      const entries = fs.readdirSync(checkPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('_')) continue;

        // Check if increment references this feature
        const specPath = path.join(checkPath, entry.name, 'spec.md');
        if (fs.existsSync(specPath)) {
          const content = fs.readFileSync(specPath, 'utf-8');
          if (content.includes(featureId)) {
            relatedIncrements.push(entry.name);
          }
        }
      }
    }

    return relatedIncrements;
  }

  /**
   * Extract frontmatter from markdown
   */
  private extractFrontmatter(content: string): Record<string, any> {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};

    const frontmatter: Record<string, any> = {};
    const lines = match[1].split('\n');

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        frontmatter[key.trim()] = valueParts.join(':').trim();
      }
    }

    return frontmatter;
  }

  /**
   * Extract title from markdown (first H1)
   */
  private extractTitle(content: string): string | null {
    const match = content.match(/^#\s+(.+)/m);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract description (first paragraph after title)
   */
  private extractDescription(content: string): string {
    // Remove frontmatter
    const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, '');

    // Find first paragraph after title
    const lines = withoutFrontmatter.split('\n');
    let afterTitle = false;
    let description = '';

    for (const line of lines) {
      if (line.startsWith('#')) {
        afterTitle = true;
        continue;
      }
      if (afterTitle && line.trim() && !line.startsWith('#')) {
        description = line.trim();
        break;
      }
    }

    return description;
  }

  /**
   * Extract user story description ("As a... I want... So that...")
   */
  private extractUserStoryDescription(content: string): string {
    const asAMatch = content.match(/\*?\*?As an?\*?\*?\s+([^,\n]+)/i);
    const wantMatch = content.match(/\*?\*?I want\*?\*?\s+([^,\n]+)/i);
    const soThatMatch = content.match(/\*?\*?So that\*?\*?\s+([^,\n]+)/i);

    if (asAMatch || wantMatch) {
      return [
        asAMatch ? `As a ${asAMatch[1].trim()}` : '',
        wantMatch ? `I want ${wantMatch[1].trim()}` : '',
        soThatMatch ? `So that ${soThatMatch[1].trim()}` : '',
      ].filter(Boolean).join(', ');
    }

    return this.extractDescription(content);
  }

  /**
   * Extract a specific field like **Project**: value
   */
  private extractField(content: string, fieldName: string): string | undefined {
    const pattern = new RegExp(`\\*\\*${fieldName}\\*\\*:\\s*(.+)`, 'i');
    const match = content.match(pattern);
    return match ? match[1].trim() : undefined;
  }

  /**
   * Get file creation date
   */
  private getFileCreatedDate(filePath: string): string {
    try {
      const stats = fs.statSync(filePath);
      return stats.birthtime.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  /**
   * Get file modification date
   */
  private getFileModifiedDate(filePath: string): string {
    try {
      const stats = fs.statSync(filePath);
      return stats.mtime.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  /**
   * Build the full catalog from loaded features
   */
  private buildCatalog(features: EnhancedFeatureSpec[]): SpecsCatalog {
    const byProject = new Map<string, EnhancedFeatureSpec[]>();
    const byStatus = new Map<string, EnhancedFeatureSpec[]>();

    for (const feature of features) {
      // Group by project
      const projectKey = feature.project || 'default';
      if (!byProject.has(projectKey)) {
        byProject.set(projectKey, []);
      }
      byProject.get(projectKey)!.push(feature);

      // Group by status
      if (!byStatus.has(feature.status)) {
        byStatus.set(feature.status, []);
      }
      byStatus.get(feature.status)!.push(feature);
    }

    const totalACs = features.reduce((sum, f) => sum + f.totalACs, 0);
    const completedACs = features.reduce((sum, f) => sum + f.completedACs, 0);

    return {
      features: features.sort((a, b) => a.featureId.localeCompare(b.featureId)),
      totalFeatures: features.length,
      activeFeatures: byStatus.get('active')?.length || 0,
      completedFeatures: byStatus.get('completed')?.length || 0,
      archivedFeatures: byStatus.get('archived')?.length || 0,
      totalUserStories: features.reduce((sum, f) => sum + f.userStories.length, 0),
      totalACs,
      completedACs,
      overallCompletion: totalACs > 0 ? Math.round((completedACs / totalACs) * 100) : 0,
      byProject,
      byStatus,
      loadedAt: new Date().toISOString(),
    };
  }

  /**
   * Create empty catalog
   */
  private createEmptyCatalog(): SpecsCatalog {
    return {
      features: [],
      totalFeatures: 0,
      activeFeatures: 0,
      completedFeatures: 0,
      archivedFeatures: 0,
      totalUserStories: 0,
      totalACs: 0,
      completedACs: 0,
      overallCompletion: 0,
      byProject: new Map(),
      byStatus: new Map(),
      loadedAt: new Date().toISOString(),
    };
  }
}
