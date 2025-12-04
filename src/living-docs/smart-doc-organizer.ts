/**
 * Smart Documentation Organizer
 *
 * Intelligently organizes large documentation folders by:
 * 1. Detecting themes from file content and titles
 * 2. Generating themed category index files for navigation
 * 3. Creating Docusaurus-compatible sidebar structures
 * 4. Auto-organizing when folder exceeds threshold (default: 30 files)
 *
 * Philosophy: Generate indexes, don't move files (preserves URLs)
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { Logger, consoleLogger } from '../utils/logger.js';

// Theme definitions with keywords for detection
const THEME_DEFINITIONS: ThemeDefinition[] = [
  {
    id: 'sync',
    name: 'Synchronization & Integration',
    keywords: ['sync', 'integration', 'bidirectional', 'import', 'export', 'pull', 'push'],
    icon: '🔄',
  },
  {
    id: 'hooks',
    name: 'Hooks & Events',
    keywords: ['hook', 'event', 'trigger', 'callback', 'post-task', 'pre-tool', 'session'],
    icon: '🪝',
  },
  {
    id: 'github',
    name: 'GitHub Integration',
    keywords: ['github', 'gh-', 'issue', 'pull-request', 'pr-', 'actions', 'workflow'],
    icon: '🐙',
  },
  {
    id: 'external-tools',
    name: 'External Tools (ADO, JIRA)',
    keywords: ['jira', 'ado', 'azure-devops', 'external-tool', 'area-path', 'work-item', 'epic'],
    icon: '🔌',
  },
  {
    id: 'testing',
    name: 'Testing & Quality',
    keywords: ['test', 'fixture', 'mock', 'coverage', 'tdd', 'isolation', 'assertion', 'qa'],
    icon: '🧪',
  },
  {
    id: 'brownfield',
    name: 'Brownfield & Migration',
    keywords: ['brownfield', 'migration', 'legacy', 'onboard', 'existing', 'import'],
    icon: '🏗️',
  },
  {
    id: 'architecture',
    name: 'Core Architecture',
    keywords: ['pattern', 'factory', 'abstraction', 'layer', 'modular', 'structure', 'design'],
    icon: '🏛️',
  },
  {
    id: 'performance',
    name: 'Performance & Optimization',
    keywords: ['cache', 'performance', 'optimization', 'pagination', 'batch', 'lazy', 'ttl'],
    icon: '⚡',
  },
  {
    id: 'security',
    name: 'Security & Permissions',
    keywords: ['permission', 'security', 'gate', 'auth', 'token', 'secret', 'credential'],
    icon: '🔒',
  },
  {
    id: 'increments',
    name: 'Increment Lifecycle',
    keywords: ['increment', 'status', 'lifecycle', 'backlog', 'phase', 'workflow', 'completion'],
    icon: '📦',
  },
  {
    id: 'config',
    name: 'Configuration & Setup',
    keywords: ['config', 'env', 'setup', 'init', 'setting', 'option', 'parameter'],
    icon: '⚙️',
  },
  {
    id: 'docs',
    name: 'Documentation & Living Docs',
    keywords: ['doc', 'living', 'spec', 'readme', 'naming', 'convention', 'folder'],
    icon: '📚',
  },
];

export interface ThemeDefinition {
  id: string;
  name: string;
  keywords: string[];
  icon: string;
}

export interface ThemedFile {
  path: string;
  name: string;
  title: string;
  themes: string[];
  primaryTheme: string;
  lastModified: Date;
}

export interface ThemeCategory {
  theme: ThemeDefinition;
  files: ThemedFile[];
  count: number;
}

export interface OrganizationPlan {
  folder: string;
  totalFiles: number;
  themeCategories: ThemeCategory[];
  uncategorized: ThemedFile[];
  suggestedIndexes: string[];
  needsOrganization: boolean;
}

export interface SmartDocOrganizerOptions {
  projectPath: string;
  logger?: Logger;
  thresholdForOrganization?: number; // Default: 30 files
  generateIndexes?: boolean;         // Default: true
  dryRun?: boolean;                  // Default: false
}

/**
 * Smart Documentation Organizer
 */
export class SmartDocOrganizer {
  private projectPath: string;
  private logger: Logger;
  private threshold: number;
  private generateIndexes: boolean;
  private dryRun: boolean;

  constructor(options: SmartDocOrganizerOptions) {
    this.projectPath = options.projectPath;
    this.logger = options.logger ?? consoleLogger;
    this.threshold = options.thresholdForOrganization ?? 30;
    this.generateIndexes = options.generateIndexes ?? true;
    this.dryRun = options.dryRun ?? false;
  }

  /**
   * Analyze a documentation folder and create organization plan
   */
  async analyzeFolder(folderPath: string): Promise<OrganizationPlan> {
    const absolutePath = path.isAbsolute(folderPath)
      ? folderPath
      : path.join(this.projectPath, folderPath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Folder not found: ${absolutePath}`);
    }

    // Get all markdown files (exclude index files we generate)
    const files = await glob('*.md', {
      cwd: absolutePath,
      nodir: true,
      ignore: ['README.md', '_index-*.md', 'category-*.md'],
    });

    this.logger.info(`Analyzing ${files.length} files in ${folderPath}`);

    // Classify each file by theme
    const themedFiles: ThemedFile[] = [];

    for (const file of files) {
      const fullPath = path.join(absolutePath, file);
      const themed = await this.classifyFile(fullPath);
      themedFiles.push(themed);
    }

    // Group by theme
    const themeCategories = this.groupByTheme(themedFiles);

    // Identify uncategorized files
    const uncategorized = themedFiles.filter(f => f.primaryTheme === 'uncategorized');

    // Determine if organization is needed
    const needsOrganization = files.length > this.threshold;

    // Generate suggested indexes
    const suggestedIndexes = themeCategories
      .filter(tc => tc.count >= 3) // Only suggest for themes with 3+ files
      .map(tc => `_index-${tc.theme.id}.md`);

    return {
      folder: folderPath,
      totalFiles: files.length,
      themeCategories,
      uncategorized,
      suggestedIndexes,
      needsOrganization,
    };
  }

  /**
   * Classify a file by detecting themes from content and filename
   */
  private async classifyFile(filePath: string): Promise<ThemedFile> {
    const fileName = path.basename(filePath, '.md');
    const stats = fs.statSync(filePath);

    let content = '';
    let title = fileName;

    try {
      content = fs.readFileSync(filePath, 'utf-8');
      // Extract title from first heading
      const titleMatch = content.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        title = titleMatch[1].replace(/^ADR-\d+:\s*/, ''); // Remove ADR prefix
      }
    } catch {
      // Skip files that can't be read
    }

    // Combine filename and content for theme detection
    const searchText = `${fileName} ${title} ${content}`.toLowerCase();

    // Score each theme
    const themeScores: { theme: ThemeDefinition; score: number }[] = [];

    for (const theme of THEME_DEFINITIONS) {
      let score = 0;
      for (const keyword of theme.keywords) {
        // Count keyword occurrences
        const regex = new RegExp(keyword, 'gi');
        const matches = searchText.match(regex);
        if (matches) {
          score += matches.length;
          // Boost score if keyword in filename
          if (fileName.toLowerCase().includes(keyword)) {
            score += 5;
          }
          // Boost score if keyword in title
          if (title.toLowerCase().includes(keyword)) {
            score += 3;
          }
        }
      }
      if (score > 0) {
        themeScores.push({ theme, score });
      }
    }

    // Sort by score descending
    themeScores.sort((a, b) => b.score - a.score);

    // Get primary theme and all matching themes
    const themes = themeScores.slice(0, 3).map(ts => ts.theme.id);
    const primaryTheme = themes[0] ?? 'uncategorized';

    return {
      path: filePath,
      name: fileName,
      title,
      themes,
      primaryTheme,
      lastModified: stats.mtime,
    };
  }

  /**
   * Group files by their primary theme
   */
  private groupByTheme(files: ThemedFile[]): ThemeCategory[] {
    const themeMap = new Map<string, ThemedFile[]>();

    for (const file of files) {
      const theme = file.primaryTheme;
      if (!themeMap.has(theme)) {
        themeMap.set(theme, []);
      }
      themeMap.get(theme)!.push(file);
    }

    const categories: ThemeCategory[] = [];

    for (const [themeId, themeFiles] of themeMap) {
      if (themeId === 'uncategorized') continue;

      const themeDef = THEME_DEFINITIONS.find(t => t.id === themeId);
      if (themeDef) {
        categories.push({
          theme: themeDef,
          files: themeFiles.sort((a, b) => a.name.localeCompare(b.name)),
          count: themeFiles.length,
        });
      }
    }

    // Sort by count descending
    return categories.sort((a, b) => b.count - a.count);
  }

  /**
   * Generate themed index files for Docusaurus navigation
   */
  async generateCategoryIndexes(plan: OrganizationPlan): Promise<string[]> {
    if (!plan.needsOrganization && !this.generateIndexes) {
      return [];
    }

    const generatedFiles: string[] = [];
    const folderPath = path.isAbsolute(plan.folder)
      ? plan.folder
      : path.join(this.projectPath, plan.folder);

    // Generate main category index
    const mainIndexPath = path.join(folderPath, '_categories.md');
    const mainIndexContent = this.generateMainCategoryIndex(plan);

    if (!this.dryRun) {
      fs.writeFileSync(mainIndexPath, mainIndexContent);
      this.logger.info(`Generated: ${mainIndexPath}`);
    }
    generatedFiles.push(mainIndexPath);

    // Generate individual theme indexes
    for (const category of plan.themeCategories) {
      if (category.count < 3) continue; // Skip themes with too few files

      const indexPath = path.join(folderPath, `_index-${category.theme.id}.md`);
      const indexContent = this.generateThemeIndex(category, plan.folder);

      if (!this.dryRun) {
        fs.writeFileSync(indexPath, indexContent);
        this.logger.info(`Generated: ${indexPath}`);
      }
      generatedFiles.push(indexPath);
    }

    return generatedFiles;
  }

  /**
   * Generate main category index with links to themed indexes
   */
  private generateMainCategoryIndex(plan: OrganizationPlan): string {
    const lines: string[] = [];
    const folderName = path.basename(plan.folder);

    lines.push('---');
    lines.push('sidebar_position: 1');
    lines.push(`title: "${this.formatTitle(folderName)} by Category"`);
    lines.push('---');
    lines.push('');
    lines.push(`# ${this.formatTitle(folderName)} by Category`);
    lines.push('');
    lines.push(`This folder contains **${plan.totalFiles}** documents organized into the following categories:`);
    lines.push('');

    // Category table
    lines.push('| Category | Count | Description |');
    lines.push('|----------|-------|-------------|');

    for (const category of plan.themeCategories) {
      if (category.count < 3) continue;
      const link = `[${category.theme.icon} ${category.theme.name}](./_index-${category.theme.id}.md)`;
      lines.push(`| ${link} | ${category.count} | View all ${category.theme.name.toLowerCase()} documents |`);
    }

    // Uncategorized section
    if (plan.uncategorized.length > 0) {
      lines.push(`| 📄 Other | ${plan.uncategorized.length} | Documents not matching specific themes |`);
    }

    lines.push('');
    lines.push('## Quick Stats');
    lines.push('');
    lines.push(`- **Total Documents**: ${plan.totalFiles}`);
    lines.push(`- **Categorized**: ${plan.totalFiles - plan.uncategorized.length}`);
    lines.push(`- **Categories**: ${plan.themeCategories.filter(c => c.count >= 3).length}`);
    lines.push('');

    // Recent documents
    const allFiles = plan.themeCategories.flatMap(c => c.files);
    const recent = allFiles
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
      .slice(0, 5);

    if (recent.length > 0) {
      lines.push('## Recently Updated');
      lines.push('');
      for (const file of recent) {
        const themeDef = THEME_DEFINITIONS.find(t => t.id === file.primaryTheme);
        const icon = themeDef?.icon ?? '📄';
        lines.push(`- ${icon} [${file.title}](./${file.name}.md) - ${file.lastModified.toLocaleDateString()}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('*Auto-generated by SmartDocOrganizer*');

    return lines.join('\n');
  }

  /**
   * Generate themed index with all files in that category
   */
  private generateThemeIndex(category: ThemeCategory, folderPath: string): string {
    const lines: string[] = [];

    lines.push('---');
    lines.push('sidebar_position: 2');
    lines.push(`title: "${category.theme.icon} ${category.theme.name}"`);
    lines.push('---');
    lines.push('');
    lines.push(`# ${category.theme.icon} ${category.theme.name}`);
    lines.push('');
    lines.push(`**${category.count}** documents in this category.`);
    lines.push('');

    // Group by sub-theme if many files
    if (category.count > 15) {
      // Further sub-group by first keyword match
      const subGroups = this.subGroupByKeyword(category.files, category.theme);

      for (const [subGroup, files] of subGroups) {
        if (files.length > 0) {
          lines.push(`## ${subGroup}`);
          lines.push('');
          for (const file of files) {
            lines.push(`- [${file.title}](./${file.name}.md)`);
          }
          lines.push('');
        }
      }
    } else {
      // Simple list
      lines.push('## Documents');
      lines.push('');
      for (const file of category.files) {
        const date = file.lastModified.toLocaleDateString();
        lines.push(`- [${file.title}](./${file.name}.md) *(${date})*`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push(`[← Back to Categories](./_categories.md)`);

    return lines.join('\n');
  }

  /**
   * Sub-group files by keyword for large categories
   */
  private subGroupByKeyword(
    files: ThemedFile[],
    theme: ThemeDefinition
  ): Map<string, ThemedFile[]> {
    const groups = new Map<string, ThemedFile[]>();

    // Initialize groups for main keywords
    const mainKeywords = theme.keywords.slice(0, 4);
    for (const kw of mainKeywords) {
      groups.set(this.formatTitle(kw), []);
    }
    groups.set('Other', []);

    for (const file of files) {
      const content = `${file.name} ${file.title}`.toLowerCase();
      let assigned = false;

      for (const kw of mainKeywords) {
        if (content.includes(kw)) {
          groups.get(this.formatTitle(kw))!.push(file);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        groups.get('Other')!.push(file);
      }
    }

    // Remove empty groups
    for (const [key, value] of groups) {
      if (value.length === 0) {
        groups.delete(key);
      }
    }

    return groups;
  }

  /**
   * Format string to title case, preserving known acronyms
   */
  private formatTitle(str: string): string {
    const acronyms = ['adr', 'api', 'cli', 'hld', 'tdd', 'ado', 'pr', 'ci', 'cd', 'url', 'jwt', 'iac', 'sla', 'slo'];

    return str
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => {
        const lower = word.toLowerCase();
        if (acronyms.includes(lower)) {
          return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  /**
   * Update Docusaurus sidebar configuration
   */
  async updateDocusaurusSidebar(plans: OrganizationPlan[]): Promise<string> {
    const sidebarConfig: Record<string, unknown>[] = [];

    for (const plan of plans) {
      if (!plan.needsOrganization) continue;

      const folderName = path.basename(plan.folder);
      const categoryItems: unknown[] = [];

      // Add main categories index first
      categoryItems.push({
        type: 'doc',
        id: `${folderName}/_categories`,
        label: '📚 Browse by Category',
      });

      // Add theme-specific indexes
      for (const category of plan.themeCategories) {
        if (category.count < 3) continue;

        categoryItems.push({
          type: 'doc',
          id: `${folderName}/_index-${category.theme.id}`,
          label: `${category.theme.icon} ${category.theme.name}`,
        });
      }

      // Add auto-generated items
      categoryItems.push({
        type: 'autogenerated',
        dirName: folderName,
      });

      sidebarConfig.push({
        type: 'category',
        label: this.formatTitle(folderName),
        items: categoryItems,
      });
    }

    return JSON.stringify(sidebarConfig, null, 2);
  }

  /**
   * Run full organization on internal docs
   */
  async organizeInternalDocs(): Promise<{
    plans: OrganizationPlan[];
    generatedFiles: string[];
    summary: string;
  }> {
    const internalDocsPath = path.join(this.projectPath, '.specweave/docs/internal');

    if (!fs.existsSync(internalDocsPath)) {
      throw new Error('No .specweave/docs/internal directory found');
    }

    const plans: OrganizationPlan[] = [];
    const generatedFiles: string[] = [];

    // Analyze key folders that might need organization
    const foldersToAnalyze = [
      'architecture/adr',
      'architecture/hld',
      'architecture/concepts',
      'delivery/guides',
      'operations',
      'governance',
    ];

    for (const folder of foldersToAnalyze) {
      const fullPath = path.join(internalDocsPath, folder);
      if (!fs.existsSync(fullPath)) continue;

      try {
        const plan = await this.analyzeFolder(fullPath);
        plans.push(plan);

        if (plan.needsOrganization) {
          const files = await this.generateCategoryIndexes(plan);
          generatedFiles.push(...files);
        }
      } catch (err) {
        this.logger.warn(`Failed to analyze ${folder}: ${err}`);
      }
    }

    // Generate summary
    const summary = this.generateSummary(plans, generatedFiles);

    return { plans, generatedFiles, summary };
  }

  /**
   * Generate organization summary
   */
  private generateSummary(plans: OrganizationPlan[], generatedFiles: string[]): string {
    const lines: string[] = [];

    lines.push('# Documentation Organization Summary');
    lines.push('');

    const needsOrg = plans.filter(p => p.needsOrganization);
    const totalFiles = plans.reduce((sum, p) => sum + p.totalFiles, 0);

    lines.push(`- **Folders Analyzed**: ${plans.length}`);
    lines.push(`- **Total Documents**: ${totalFiles}`);
    lines.push(`- **Folders Needing Organization**: ${needsOrg.length}`);
    lines.push(`- **Index Files Generated**: ${generatedFiles.length}`);
    lines.push('');

    if (needsOrg.length > 0) {
      lines.push('## Organized Folders');
      lines.push('');

      for (const plan of needsOrg) {
        lines.push(`### ${plan.folder}`);
        lines.push(`- Files: ${plan.totalFiles}`);
        lines.push(`- Categories: ${plan.themeCategories.filter(c => c.count >= 3).length}`);
        lines.push('- Top themes:');

        for (const cat of plan.themeCategories.slice(0, 5)) {
          lines.push(`  - ${cat.theme.icon} ${cat.theme.name}: ${cat.count} files`);
        }
        lines.push('');
      }
    }

    lines.push('## Next Steps');
    lines.push('');
    lines.push('Run `/specweave-docs:preview` to view the organized documentation.');
    lines.push('');

    return lines.join('\n');
  }
}

/**
 * Convenience function to organize docs
 */
export async function organizeDocumentation(
  projectPath: string,
  options?: Partial<SmartDocOrganizerOptions>
): Promise<{
  plans: OrganizationPlan[];
  generatedFiles: string[];
  summary: string;
}> {
  const organizer = new SmartDocOrganizer({
    projectPath,
    ...options,
  });

  return organizer.organizeInternalDocs();
}
