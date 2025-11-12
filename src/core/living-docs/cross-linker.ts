/**
 * Cross-Linker for Intelligent Living Docs Sync
 *
 * Generates cross-references between related documents for traceability.
 *
 * @module living-docs/cross-linker
 */

import fs from 'fs-extra';
import path from 'path';
import { DistributionResult, DistributedFile } from './content-distributor.js';
import { ContentCategory } from './content-classifier.js';

/**
 * Cross-link between documents
 */
export interface CrossLink {
  source: string;          // Source file path
  target: string;          // Target file path
  type: LinkType;          // Type of relationship
  description?: string;    // Optional description
}

/**
 * Link types
 */
export enum LinkType {
  Implements = 'implements',      // Spec implements architecture
  DependsOn = 'depends-on',       // Operation depends on architecture
  References = 'references',      // General reference
  RelatedTo = 'related-to',       // Related content
  DefinedIn = 'defined-in',       // Term/concept defined in another doc
  TestsFor = 'tests-for',         // Tests for specification
}

/**
 * Linker options
 */
export interface LinkerOptions {
  basePath?: string;              // Base path for living docs
  generateBacklinks?: boolean;    // Create bidirectional links
  updateExisting?: boolean;       // Update existing documents
  dryRun?: boolean;               // Don't write files
}

/**
 * Cross-Linker class
 */
export class CrossLinker {
  private options: Required<LinkerOptions>;
  private links: CrossLink[];

  constructor(options: LinkerOptions = {}) {
    this.options = {
      basePath:
        options.basePath || path.join(process.cwd(), '.specweave', 'docs', 'internal'),
      generateBacklinks: options.generateBacklinks ?? true,
      updateExisting: options.updateExisting ?? true,
      dryRun: options.dryRun ?? false,
    };

    this.links = [];
  }

  /**
   * Generate cross-links for distributed files
   */
  async generateLinks(result: DistributionResult): Promise<CrossLink[]> {
    this.links = [];

    // Group files by category
    const byCategory = this.groupByCategory(result);

    // Generate links between categories
    await this.generateArchitectureLinks(byCategory);
    await this.generateOperationsLinks(byCategory);
    await this.generateDeliveryLinks(byCategory);
    await this.generateStrategyLinks(byCategory);

    // Generate backlinks if enabled
    if (this.options.generateBacklinks) {
      await this.generateBacklinks();
    }

    // Update documents with links
    if (this.options.updateExisting && !this.options.dryRun) {
      await this.updateDocuments();
    }

    return this.links;
  }

  /**
   * Group files by category
   */
  private groupByCategory(
    result: DistributionResult
  ): Map<ContentCategory, DistributedFile[]> {
    const groups = new Map<ContentCategory, DistributedFile[]>();
    const allFiles = [...result.created, ...result.updated];

    for (const file of allFiles) {
      if (!groups.has(file.category)) {
        groups.set(file.category, []);
      }
      groups.get(file.category)!.push(file);
    }

    return groups;
  }

  /**
   * Generate links from specs to architecture
   */
  private async generateArchitectureLinks(
    groups: Map<ContentCategory, DistributedFile[]>
  ): Promise<void> {
    const specs = groups.get(ContentCategory.UserStory) || [];
    const architecture = groups.get(ContentCategory.Architecture) || [];
    const adrs = groups.get(ContentCategory.ADR) || [];

    // Link specs to architecture docs
    for (const spec of specs) {
      for (const arch of architecture) {
        if (await this.documentsRelated(spec.path, arch.path)) {
          this.links.push({
            source: spec.path,
            target: arch.path,
            type: LinkType.Implements,
            description: 'User story implements architecture design',
          });
        }
      }

      // Link specs to ADRs
      for (const adr of adrs) {
        if (await this.documentsRelated(spec.path, adr.path)) {
          this.links.push({
            source: spec.path,
            target: adr.path,
            type: LinkType.References,
            description: 'User story references architecture decision',
          });
        }
      }
    }
  }

  /**
   * Generate links from operations to architecture
   */
  private async generateOperationsLinks(
    groups: Map<ContentCategory, DistributedFile[]>
  ): Promise<void> {
    const operations = groups.get(ContentCategory.Operations) || [];
    const architecture = groups.get(ContentCategory.Architecture) || [];

    for (const ops of operations) {
      for (const arch of architecture) {
        if (await this.documentsRelated(ops.path, arch.path)) {
          this.links.push({
            source: ops.path,
            target: arch.path,
            type: LinkType.DependsOn,
            description: 'Operational procedure depends on architecture',
          });
        }
      }
    }
  }

  /**
   * Generate links from delivery to specs
   */
  private async generateDeliveryLinks(
    groups: Map<ContentCategory, DistributedFile[]>
  ): Promise<void> {
    const delivery = groups.get(ContentCategory.Delivery) || [];
    const specs = groups.get(ContentCategory.UserStory) || [];

    for (const del of delivery) {
      for (const spec of specs) {
        if (await this.documentsRelated(del.path, spec.path)) {
          this.links.push({
            source: del.path,
            target: spec.path,
            type: LinkType.TestsFor,
            description: 'Test strategy covers user story',
          });
        }
      }
    }
  }

  /**
   * Generate links from strategy to specs
   */
  private async generateStrategyLinks(
    groups: Map<ContentCategory, DistributedFile[]>
  ): Promise<void> {
    const strategy = groups.get(ContentCategory.Strategy) || [];
    const specs = groups.get(ContentCategory.UserStory) || [];

    for (const strat of strategy) {
      for (const spec of specs) {
        if (await this.documentsRelated(strat.path, spec.path)) {
          this.links.push({
            source: strat.path,
            target: spec.path,
            type: LinkType.DefinedIn,
            description: 'Business requirement defined in strategy',
          });
        }
      }
    }
  }

  /**
   * Check if two documents are related (heuristic)
   */
  private async documentsRelated(path1: string, path2: string): Promise<boolean> {
    try {
      // Extract key terms from filenames
      const name1 = path.basename(path1, '.md').toLowerCase();
      const name2 = path.basename(path2, '.md').toLowerCase();

      // Simple heuristic: if they share significant words
      const words1 = name1.split(/[-_]/).filter((w) => w.length > 3);
      const words2 = name2.split(/[-_]/).filter((w) => w.length > 3);

      const sharedWords = words1.filter((w) => words2.includes(w));

      // If 2+ shared words, consider related
      if (sharedWords.length >= 2) {
        return true;
      }

      // Check content for cross-references (more expensive)
      if (fs.existsSync(path1) && fs.existsSync(path2)) {
        const content1 = await fs.readFile(path1, 'utf-8');
        const content2 = await fs.readFile(path2, 'utf-8');

        // Check if path1 mentions path2's filename
        const name2Clean = path.basename(path2, '.md');
        if (content1.toLowerCase().includes(name2Clean.toLowerCase())) {
          return true;
        }

        // Check if path2 mentions path1's filename
        const name1Clean = path.basename(path1, '.md');
        if (content2.toLowerCase().includes(name1Clean.toLowerCase())) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate backlinks (bidirectional)
   */
  private async generateBacklinks(): Promise<void> {
    const backlinks: CrossLink[] = [];

    for (const link of this.links) {
      // Create reverse link
      backlinks.push({
        source: link.target,
        target: link.source,
        type: this.getReverseType(link.type),
        description: this.getReverseDescription(link),
      });
    }

    this.links.push(...backlinks);
  }

  /**
   * Get reverse link type
   */
  private getReverseType(type: LinkType): LinkType {
    const reverseMap: Record<LinkType, LinkType> = {
      [LinkType.Implements]: LinkType.DefinedIn,
      [LinkType.DependsOn]: LinkType.DefinedIn,
      [LinkType.References]: LinkType.References,
      [LinkType.RelatedTo]: LinkType.RelatedTo,
      [LinkType.DefinedIn]: LinkType.Implements,
      [LinkType.TestsFor]: LinkType.DefinedIn,
    };

    return reverseMap[type] || LinkType.RelatedTo;
  }

  /**
   * Get reverse description
   */
  private getReverseDescription(link: CrossLink): string {
    const name = path.basename(link.source, '.md').replace(/-/g, ' ');
    return `Referenced by ${name}`;
  }

  /**
   * Update documents with generated links
   */
  private async updateDocuments(): Promise<void> {
    // Group links by source file
    const linksBySource = new Map<string, CrossLink[]>();

    for (const link of this.links) {
      if (!linksBySource.has(link.source)) {
        linksBySource.set(link.source, []);
      }
      linksBySource.get(link.source)!.push(link);
    }

    // Update each source file
    for (const [sourcePath, links] of linksBySource.entries()) {
      await this.updateDocument(sourcePath, links);
    }
  }

  /**
   * Update a single document with links
   */
  private async updateDocument(filePath: string, links: CrossLink[]): Promise<void> {
    if (!fs.existsSync(filePath)) {
      return;
    }

    try {
      let content = await fs.readFile(filePath, 'utf-8');

      // Check if links section already exists
      const linksSection = '\n\n## Related Documents\n\n';
      const hasLinksSection = content.includes('## Related Documents');

      if (hasLinksSection) {
        // Update existing section
        const regex = /## Related Documents\n\n[\s\S]*?(?=\n## |\n---|\n\*\*Source\*\*|$)/;
        content = content.replace(regex, linksSection + this.generateLinksMarkdown(links));
      } else {
        // Add new section before footer
        const footerIndex = content.lastIndexOf('\n---\n');
        if (footerIndex !== -1) {
          const before = content.substring(0, footerIndex);
          const after = content.substring(footerIndex);
          content = before + linksSection + this.generateLinksMarkdown(links) + '\n' + after;
        } else {
          // No footer - append to end
          content += linksSection + this.generateLinksMarkdown(links);
        }
      }

      // Write updated content
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      console.warn(`Failed to update links in ${filePath}:`, error);
    }
  }

  /**
   * Generate markdown for links section
   */
  private generateLinksMarkdown(links: CrossLink[]): string {
    let markdown = '';

    // Group by type
    const byType = new Map<LinkType, CrossLink[]>();
    for (const link of links) {
      if (!byType.has(link.type)) {
        byType.set(link.type, []);
      }
      byType.get(link.type)!.push(link);
    }

    // Generate sections for each type
    for (const [type, typeLinks] of byType.entries()) {
      markdown += `### ${this.getLinkTypeTitle(type)}\n\n`;

      for (const link of typeLinks) {
        const relativePath = this.getRelativePath(link.source, link.target);
        const title = path.basename(link.target, '.md').replace(/-/g, ' ');
        markdown += `- [${title}](${relativePath})`;
        if (link.description) {
          markdown += ` - ${link.description}`;
        }
        markdown += '\n';
      }

      markdown += '\n';
    }

    return markdown;
  }

  /**
   * Get link type display title
   */
  private getLinkTypeTitle(type: LinkType): string {
    const titles: Record<LinkType, string> = {
      [LinkType.Implements]: 'Implements',
      [LinkType.DependsOn]: 'Depends On',
      [LinkType.References]: 'References',
      [LinkType.RelatedTo]: 'Related To',
      [LinkType.DefinedIn]: 'Defined In',
      [LinkType.TestsFor]: 'Tests For',
    };

    return titles[type] || type;
  }

  /**
   * Get relative path from source to target
   */
  private getRelativePath(source: string, target: string): string {
    const sourceDir = path.dirname(source);
    return path.relative(sourceDir, target);
  }

  /**
   * Get all links
   */
  getLinks(): CrossLink[] {
    return this.links;
  }

  /**
   * Get links for a specific file
   */
  getLinksFor(filePath: string): CrossLink[] {
    return this.links.filter((link) => link.source === filePath);
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    total: number;
    byType: Record<LinkType, number>;
    bidirectional: number;
  } {
    const stats = {
      total: this.links.length,
      byType: {} as Record<LinkType, number>,
      bidirectional: 0,
    };

    for (const link of this.links) {
      stats.byType[link.type] = (stats.byType[link.type] || 0) + 1;
    }

    // Count bidirectional (simplified)
    stats.bidirectional = this.links.filter((link) =>
      this.links.some((l) => l.source === link.target && l.target === link.source)
    ).length / 2;

    return stats;
  }
}

/**
 * Factory function to create linker
 */
export function createCrossLinker(options?: LinkerOptions): CrossLinker {
  return new CrossLinker(options);
}
