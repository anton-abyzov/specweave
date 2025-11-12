/**
 * Content Distributor for Intelligent Living Docs Sync
 *
 * Distributes classified spec sections to appropriate folders with proper formatting.
 *
 * @module living-docs/content-distributor
 */

import fs from 'fs-extra';
import path from 'path';
import { ParsedSection, ParsedSpec } from './content-parser.js';
import { ClassificationResult, ContentCategory } from './content-classifier.js';
import { ProjectContext } from './project-detector.js';

/**
 * Distribution result
 */
export interface DistributionResult {
  created: DistributedFile[];  // Files created
  updated: DistributedFile[];  // Files updated
  skipped: DistributedFile[];  // Files skipped (unchanged)
  errors: DistributionError[]; // Errors encountered
  summary: DistributionSummary;
}

/**
 * Distributed file information
 */
export interface DistributedFile {
  path: string;
  category: ContentCategory;
  size: number;
  sections: number;
}

/**
 * Distribution error
 */
export interface DistributionError {
  section: string;
  category: ContentCategory;
  error: string;
  path?: string;
}

/**
 * Distribution summary statistics
 */
export interface DistributionSummary {
  totalSections: number;
  filesCreated: number;
  filesUpdated: number;
  filesSkipped: number;
  errors: number;
  byCategory: Record<ContentCategory, number>;
}

/**
 * Distributor options
 */
export interface DistributorOptions {
  basePath?: string;            // Base path for living docs
  generateFrontmatter?: boolean; // Add Docusaurus frontmatter
  preserveOriginal?: boolean;   // Keep original spec.md
  dryRun?: boolean;             // Don't write files (testing)
}

/**
 * Section with classification
 */
interface ClassifiedSection {
  section: ParsedSection;
  classification: ClassificationResult;
}

/**
 * Content Distributor class
 */
export class ContentDistributor {
  private options: Required<DistributorOptions>;

  constructor(options: DistributorOptions = {}) {
    this.options = {
      basePath:
        options.basePath || path.join(process.cwd(), '.specweave', 'docs', 'internal'),
      generateFrontmatter: options.generateFrontmatter ?? true,
      preserveOriginal: options.preserveOriginal ?? true,
      dryRun: options.dryRun ?? false,
    };
  }

  /**
   * Distribute parsed spec to appropriate locations
   */
  async distribute(
    incrementId: string,
    spec: ParsedSpec,
    classifications: ClassificationResult[],
    project: ProjectContext
  ): Promise<DistributionResult> {
    const result: DistributionResult = {
      created: [],
      updated: [],
      skipped: [],
      errors: [],
      summary: {
        totalSections: classifications.length,
        filesCreated: 0,
        filesUpdated: 0,
        filesSkipped: 0,
        errors: 0,
        byCategory: {} as Record<ContentCategory, number>,
      },
    };

    // Pair sections with classifications
    const classifiedSections: ClassifiedSection[] = [];
    const flatSections = this.flattenSections(spec.sections);

    for (let i = 0; i < Math.min(flatSections.length, classifications.length); i++) {
      classifiedSections.push({
        section: flatSections[i],
        classification: classifications[i],
      });

      // Count by category
      const category = classifications[i].category;
      result.summary.byCategory[category] = (result.summary.byCategory[category] || 0) + 1;
    }

    // Group sections by category and file
    const fileGroups = this.groupByFile(classifiedSections, project);

    // Write each file group
    for (const [filePath, group] of fileGroups.entries()) {
      try {
        const fileResult = await this.writeFile(incrementId, filePath, group, spec, project);

        if (fileResult.status === 'created') {
          result.created.push(fileResult.file);
          result.summary.filesCreated++;
        } else if (fileResult.status === 'updated') {
          result.updated.push(fileResult.file);
          result.summary.filesUpdated++;
        } else if (fileResult.status === 'skipped') {
          result.skipped.push(fileResult.file);
          result.summary.filesSkipped++;
        }
      } catch (error) {
        result.errors.push({
          section: group.sections.map((s) => s.section.heading).join(', '),
          category: group.category,
          error: String(error),
          path: filePath,
        });
        result.summary.errors++;
      }
    }

    // Preserve original spec if requested
    if (this.options.preserveOriginal) {
      await this.archiveOriginalSpec(incrementId, spec, project);
    }

    return result;
  }

  /**
   * Flatten nested sections
   */
  private flattenSections(sections: ParsedSection[]): ParsedSection[] {
    const result: ParsedSection[] = [];

    for (const section of sections) {
      result.push(section);
      if (section.children.length > 0) {
        result.push(...this.flattenSections(section.children));
      }
    }

    return result;
  }

  /**
   * Group sections by destination file
   */
  private groupByFile(
    classifiedSections: ClassifiedSection[],
    project: ProjectContext
  ): Map<string, { category: ContentCategory; sections: ClassifiedSection[] }> {
    const groups = new Map<
      string,
      { category: ContentCategory; sections: ClassifiedSection[] }
    >();

    for (const item of classifiedSections) {
      const { classification } = item;

      // Skip unknown categories
      if (classification.category === ContentCategory.Unknown) {
        continue;
      }

      // Resolve path with project
      const filePath = this.resolvePath(classification.suggestedPath, classification.suggestedFilename, project);

      if (!groups.has(filePath)) {
        groups.set(filePath, {
          category: classification.category,
          sections: [],
        });
      }

      groups.get(filePath)!.sections.push(item);
    }

    return groups;
  }

  /**
   * Resolve file path with project
   */
  private resolvePath(
    suggestedPath: string,
    filename: string,
    project: ProjectContext
  ): string {
    // Replace {project} placeholder
    const pathWithProject = suggestedPath.replace('{project}', project.id);
    return path.join(this.options.basePath, pathWithProject, filename);
  }

  /**
   * Write a file with grouped sections
   */
  private async writeFile(
    incrementId: string,
    filePath: string,
    group: { category: ContentCategory; sections: ClassifiedSection[] },
    spec: ParsedSpec,
    project: ProjectContext
  ): Promise<{
    status: 'created' | 'updated' | 'skipped';
    file: DistributedFile;
  }> {
    // Generate content
    const content = this.generateFileContent(incrementId, group, spec, project);

    // Check if file exists
    const exists = fs.existsSync(filePath);

    // In dry run mode, just return what would happen
    if (this.options.dryRun) {
      return {
        status: exists ? 'updated' : 'created',
        file: {
          path: filePath,
          category: group.category,
          size: content.length,
          sections: group.sections.length,
        },
      };
    }

    // Check if content changed
    if (exists) {
      const existingContent = await fs.readFile(filePath, 'utf-8');
      if (existingContent === content) {
        return {
          status: 'skipped',
          file: {
            path: filePath,
            category: group.category,
            size: content.length,
            sections: group.sections.length,
          },
        };
      }
    }

    // Ensure directory exists
    await fs.ensureDir(path.dirname(filePath));

    // Write file
    await fs.writeFile(filePath, content, 'utf-8');

    return {
      status: exists ? 'updated' : 'created',
      file: {
        path: filePath,
        category: group.category,
        size: content.length,
        sections: group.sections.length,
      },
    };
  }

  /**
   * Generate file content with frontmatter and sections
   */
  private generateFileContent(
    incrementId: string,
    group: { category: ContentCategory; sections: ClassifiedSection[] },
    spec: ParsedSpec,
    project: ProjectContext
  ): string {
    let content = '';

    // Generate frontmatter
    if (this.options.generateFrontmatter) {
      content += this.generateFrontmatter(incrementId, group, spec, project);
      content += '\n\n';
    }

    // Add sections
    for (const item of group.sections) {
      const { section } = item;

      // Add heading
      content += `${'#'.repeat(section.level)} ${section.heading}\n\n`;

      // Add content
      content += section.content;

      // Add spacing between sections
      content += '\n\n';
    }

    // Add footer
    content += `---\n\n`;
    content += `**Source**: [Increment ${incrementId}](../../../increments/${incrementId}/spec.md)\n`;
    content += `**Project**: ${project.name}\n`;
    content += `**Last Updated**: ${new Date().toISOString().split('T')[0]}\n`;

    return content.trim() + '\n';
  }

  /**
   * Generate Docusaurus frontmatter
   */
  private generateFrontmatter(
    incrementId: string,
    group: { category: ContentCategory; sections: ClassifiedSection[] },
    spec: ParsedSpec,
    project: ProjectContext
  ): string {
    const firstSection = group.sections[0].section;
    const title = firstSection.heading;
    const category = group.category;

    const frontmatter: Record<string, any> = {
      id: firstSection.id,
      title,
      sidebar_label: title,
      description: this.generateDescription(group.sections),
      tags: [category, project.id, incrementId],
      increment: incrementId,
      project: project.id,
      category,
      last_updated: new Date().toISOString().split('T')[0],
    };

    // Add spec-specific fields
    if (spec.frontmatter.priority) {
      frontmatter.priority = spec.frontmatter.priority;
    }

    if (spec.frontmatter.status) {
      frontmatter.status = spec.frontmatter.status;
    }

    // Convert to YAML
    const yaml = Object.entries(frontmatter)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: [${value.map((v) => `"${v}"`).join(', ')}]`;
        } else if (typeof value === 'string') {
          return `${key}: "${value}"`;
        } else {
          return `${key}: ${value}`;
        }
      })
      .join('\n');

    return `---\n${yaml}\n---`;
  }

  /**
   * Generate description from sections
   */
  private generateDescription(sections: ClassifiedSection[]): string {
    const firstSection = sections[0].section;
    const contentWithoutCode = firstSection.content.replace(/```[\s\S]*?```/g, '');
    const firstParagraph = contentWithoutCode.split('\n\n')[0];
    return firstParagraph.substring(0, 160).trim();
  }

  /**
   * Archive original spec for reference
   */
  private async archiveOriginalSpec(
    incrementId: string,
    spec: ParsedSpec,
    project: ProjectContext
  ): Promise<void> {
    if (this.options.dryRun) {
      return;
    }

    const archivePath = path.join(
      this.options.basePath,
      'specs',
      project.id,
      '_archive',
      `spec-${incrementId}.md`
    );

    await fs.ensureDir(path.dirname(archivePath));
    await fs.writeFile(archivePath, spec.raw, 'utf-8');
  }

  /**
   * Generate index file for a category
   */
  async generateIndex(
    category: ContentCategory,
    projectId: string,
    files: DistributedFile[]
  ): Promise<void> {
    if (this.options.dryRun) {
      return;
    }

    const categoryPath = path.join(this.options.basePath, category === ContentCategory.UserStory || category === ContentCategory.NFR ? 'specs' : category, projectId);
    const indexPath = path.join(categoryPath, 'README.md');

    let content = `# ${this.getCategoryTitle(category)}\n\n`;
    content += `**Project**: ${projectId}\n`;
    content += `**Category**: ${category}\n`;
    content += `**Files**: ${files.length}\n\n`;

    content += `## Files\n\n`;

    for (const file of files.sort((a, b) => a.path.localeCompare(b.path))) {
      const filename = path.basename(file.path);
      const title = filename.replace(/\.md$/, '').replace(/-/g, ' ');
      content += `- [${title}](./${filename})\n`;
    }

    content += `\n---\n\n`;
    content += `Generated by SpecWeave Intelligent Living Docs Sync\n`;

    await fs.ensureDir(path.dirname(indexPath));
    await fs.writeFile(indexPath, content, 'utf-8');
  }

  /**
   * Get category display title
   */
  private getCategoryTitle(category: ContentCategory): string {
    const titles: Record<ContentCategory, string> = {
      [ContentCategory.UserStory]: 'User Stories',
      [ContentCategory.NFR]: 'Non-Functional Requirements',
      [ContentCategory.Architecture]: 'Architecture',
      [ContentCategory.ADR]: 'Architecture Decision Records',
      [ContentCategory.Operations]: 'Operations',
      [ContentCategory.Delivery]: 'Delivery',
      [ContentCategory.Strategy]: 'Strategy',
      [ContentCategory.Governance]: 'Governance',
      [ContentCategory.Overview]: 'Overview',
      [ContentCategory.Unknown]: 'Uncategorized',
    };

    return titles[category] || category;
  }

  /**
   * Get distribution statistics
   */
  getStatistics(result: DistributionResult): {
    totalFiles: number;
    totalSize: number;
    averageSize: number;
    byCategory: Record<ContentCategory, { files: number; size: number }>;
  } {
    const allFiles = [...result.created, ...result.updated, ...result.skipped];
    const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);

    const byCategory: Record<ContentCategory, { files: number; size: number }> = {} as any;

    for (const file of allFiles) {
      if (!byCategory[file.category]) {
        byCategory[file.category] = { files: 0, size: 0 };
      }
      byCategory[file.category].files++;
      byCategory[file.category].size += file.size;
    }

    return {
      totalFiles: allFiles.length,
      totalSize,
      averageSize: totalSize / allFiles.length || 0,
      byCategory,
    };
  }
}

/**
 * Factory function to create distributor
 */
export function createContentDistributor(options?: DistributorOptions): ContentDistributor {
  return new ContentDistributor(options);
}
