/**
 * Brownfield Analyzer - File Classification
 *
 * Analyzes markdown files from external sources (Notion, Confluence, Wiki)
 * and classifies them as specs, modules, team docs, or legacy
 */

import path from 'path';
import fs from 'fs-extra';
import matter from 'gray-matter';

export interface FileClassification {
  path: string;
  relativePath: string;
  type: 'spec' | 'module' | 'team' | 'legacy';
  confidence: number;  // 0-1
  keywords: string[];
  reasons: string[];  // Why this classification?
}

export interface BrownfieldAnalysisResult {
  totalFiles: number;
  specs: FileClassification[];
  modules: FileClassification[];
  team: FileClassification[];
  legacy: FileClassification[];
  statistics: {
    specsConfidence: number;  // Average confidence
    modulesConfidence: number;
    teamConfidence: number;
  };
}

export class BrownfieldAnalyzer {
  private readonly SPEC_KEYWORDS = [
    // User story keywords
    'user story', 'user stories', 'acceptance criteria', 'acceptance criterion',
    'feature', 'feature spec', 'requirement', 'requirements', 'functional requirement',
    // Spec patterns
    'spec', 'specification', 'us-', 'ac-', 'given when then',
    'as a', 'i want', 'so that',
    // Planning keywords
    'epic', 'milestone', 'product requirement', 'prd', 'problem statement',
    'success criteria', 'test plan'
  ];

  private readonly MODULE_KEYWORDS = [
    // Component/module keywords
    'module', 'component', 'service', 'domain', 'package', 'library',
    // Architecture keywords
    'architecture', 'design', 'api', 'interface', 'class', 'function',
    'endpoint', 'controller', 'model', 'repository', 'schema',
    // Integration keywords
    'integration', 'integration point', 'dependency', 'data flow',
    'authentication', 'authorization', 'security', 'performance',
    // Technical docs
    'technical design', 'implementation', 'code structure'
  ];

  private readonly TEAM_KEYWORDS = [
    // Onboarding
    'onboarding', 'getting started', 'setup', 'installation', 'environment setup',
    // Conventions
    'convention', 'conventions', 'coding standard', 'style guide', 'best practice',
    'naming convention', 'code pattern', 'design pattern',
    // Workflows
    'workflow', 'process', 'procedure', 'guideline', 'policy',
    'pr process', 'pull request', 'code review', 'deployment', 'release',
    'git workflow', 'branching strategy', 'testing approach',
    // Team info
    'team', 'contact', 'on-call', 'escalation', 'responsibility',
    'incident response', 'runbook'
  ];

  /**
   * Analyze markdown files in source directory
   *
   * @param sourcePath - Path to source directory
   * @returns BrownfieldAnalysisResult
   */
  async analyze(sourcePath: string): Promise<BrownfieldAnalysisResult> {
    console.log(`📊 Analyzing files in: ${sourcePath}\n`);

    const markdownFiles = await this.findMarkdownFiles(sourcePath);

    if (markdownFiles.length === 0) {
      console.log('⚠️  No markdown files found');
      return {
        totalFiles: 0,
        specs: [],
        modules: [],
        team: [],
        legacy: [],
        statistics: {
          specsConfidence: 0,
          modulesConfidence: 0,
          teamConfidence: 0
        }
      };
    }

    console.log(`📄 Found ${markdownFiles.length} markdown file(s)\n`);

    const classifications: FileClassification[] = await Promise.all(
      markdownFiles.map(file => this.classifyFile(file, sourcePath))
    );

    // Group by type
    const specs = classifications.filter(c => c.type === 'spec');
    const modules = classifications.filter(c => c.type === 'module');
    const team = classifications.filter(c => c.type === 'team');
    const legacy = classifications.filter(c => c.type === 'legacy');

    // Calculate average confidences
    const avgConfidence = (items: FileClassification[]) => {
      if (items.length === 0) return 0;
      return items.reduce((sum, item) => sum + item.confidence, 0) / items.length;
    };

    return {
      totalFiles: markdownFiles.length,
      specs,
      modules,
      team,
      legacy,
      statistics: {
        specsConfidence: avgConfidence(specs),
        modulesConfidence: avgConfidence(modules),
        teamConfidence: avgConfidence(team)
      }
    };
  }

  /**
   * Classify single file based on content
   *
   * @param filePath - Full path to file
   * @param basePath - Base path for relative path calculation
   * @returns FileClassification
   */
  private async classifyFile(
    filePath: string,
    basePath: string
  ): Promise<FileClassification> {
    const content = await fs.readFile(filePath, 'utf-8');

    // Parse frontmatter if present
    const { data: frontmatter, content: markdownContent } = matter(content);

    // Combine for analysis
    const textToAnalyze = `${JSON.stringify(frontmatter)} ${markdownContent}`.toLowerCase();

    // Score each type
    const specScore = this.scoreKeywords(textToAnalyze, this.SPEC_KEYWORDS);
    const moduleScore = this.scoreKeywords(textToAnalyze, this.MODULE_KEYWORDS);
    const teamScore = this.scoreKeywords(textToAnalyze, this.TEAM_KEYWORDS);

    // Determine type (highest score wins, with minimum threshold)
    let type: 'spec' | 'module' | 'team' | 'legacy';
    let confidence: number;
    let keywords: string[];
    let reasons: string[];

    const CONFIDENCE_THRESHOLD = 0.3;

    if (specScore > moduleScore && specScore > teamScore && specScore > CONFIDENCE_THRESHOLD) {
      type = 'spec';
      confidence = specScore;
      keywords = this.findMatchingKeywords(textToAnalyze, this.SPEC_KEYWORDS);
      reasons = this.generateReasons(keywords, 'spec');
    } else if (moduleScore > teamScore && moduleScore > CONFIDENCE_THRESHOLD) {
      type = 'module';
      confidence = moduleScore;
      keywords = this.findMatchingKeywords(textToAnalyze, this.MODULE_KEYWORDS);
      reasons = this.generateReasons(keywords, 'module');
    } else if (teamScore > CONFIDENCE_THRESHOLD) {
      type = 'team';
      confidence = teamScore;
      keywords = this.findMatchingKeywords(textToAnalyze, this.TEAM_KEYWORDS);
      reasons = this.generateReasons(keywords, 'team');
    } else {
      type = 'legacy';
      confidence = 0;
      keywords = [];
      reasons = ['No strong match for spec, module, or team keywords'];
    }

    const relativePath = path.relative(basePath, filePath);

    return {
      path: filePath,
      relativePath,
      type,
      confidence,
      keywords,
      reasons
    };
  }

  /**
   * Score text based on keyword matches
   * Returns 0-1 confidence score
   *
   * @param text - Lowercase text to analyze
   * @param keywords - Keywords to match
   * @returns Confidence score (0-1)
   */
  private scoreKeywords(text: string, keywords: string[]): number {
    let matches = 0;
    let totalWeight = 0;

    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        matches++;

        // Weight longer keywords more heavily (more specific)
        const weight = keyword.split(' ').length;
        totalWeight += weight;
      }
    });

    if (matches === 0) return 0;

    // Normalize to 0-1
    // Base score: matches / total keywords (capped at 1.0)
    const baseScore = Math.min(matches / keywords.length, 1.0);

    // Weighted score: total weight / max possible weight
    const maxWeight = matches * 3; // Assume max 3-word keywords
    const weightedScore = Math.min(totalWeight / maxWeight, 1.0);

    // Combine base and weighted score (60% base, 40% weighted)
    return baseScore * 0.6 + weightedScore * 0.4;
  }

  /**
   * Find matching keywords in text
   *
   * @param text - Lowercase text to search
   * @param keywords - Keywords to find
   * @returns Matching keywords
   */
  private findMatchingKeywords(text: string, keywords: string[]): string[] {
    return keywords.filter(keyword => text.includes(keyword));
  }

  /**
   * Generate human-readable reasons for classification
   *
   * @param keywords - Matched keywords
   * @param type - Classification type
   * @returns Reasons
   */
  private generateReasons(keywords: string[], type: string): string[] {
    const reasons: string[] = [];

    if (keywords.length === 0) {
      return [`No strong indicators found for ${type}`];
    }

    // Categorize keywords
    const keywordCategories: Record<string, string[]> = {
      spec: this.SPEC_KEYWORDS,
      module: this.MODULE_KEYWORDS,
      team: this.TEAM_KEYWORDS
    };

    const categoryKeywords = keywordCategories[type] || [];

    // Group matched keywords
    const matchedGroups: Record<string, string[]> = {};

    keywords.forEach(keyword => {
      // Determine group
      let group = 'Other';

      if (type === 'spec') {
        if (['user story', 'us-', 'as a', 'i want', 'so that'].some(k => keyword.includes(k))) {
          group = 'User Stories';
        } else if (['acceptance criteria', 'ac-', 'given when then'].some(k => keyword.includes(k))) {
          group = 'Acceptance Criteria';
        } else if (['feature', 'requirement', 'spec'].some(k => keyword.includes(k))) {
          group = 'Requirements';
        }
      } else if (type === 'module') {
        if (['module', 'component', 'service', 'domain'].some(k => keyword.includes(k))) {
          group = 'Components';
        } else if (['architecture', 'design', 'api', 'interface'].some(k => keyword.includes(k))) {
          group = 'Architecture';
        } else if (['integration', 'dependency', 'data flow'].some(k => keyword.includes(k))) {
          group = 'Integration';
        }
      } else if (type === 'team') {
        if (['onboarding', 'getting started', 'setup'].some(k => keyword.includes(k))) {
          group = 'Onboarding';
        } else if (['convention', 'style guide', 'best practice'].some(k => keyword.includes(k))) {
          group = 'Conventions';
        } else if (['workflow', 'process', 'pr process', 'deployment'].some(k => keyword.includes(k))) {
          group = 'Workflows';
        }
      }

      if (!matchedGroups[group]) {
        matchedGroups[group] = [];
      }
      matchedGroups[group].push(keyword);
    });

    // Generate reasons
    Object.keys(matchedGroups).forEach(group => {
      const count = matchedGroups[group].length;
      const examples = matchedGroups[group].slice(0, 3).join(', ');
      reasons.push(`${group}: Found ${count} indicator(s) (${examples})`);
    });

    return reasons;
  }

  /**
   * Find all markdown files recursively
   *
   * @param dirPath - Directory to search
   * @returns Array of file paths
   */
  private async findMarkdownFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(dir: string) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          // Skip hidden files and node_modules
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
          }

          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.markdown'))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not read directory ${dir}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    await walk(dirPath);
    return files;
  }

  /**
   * Generate analysis summary report
   *
   * @param result - Analysis result
   * @returns Summary string
   */
  generateSummaryReport(result: BrownfieldAnalysisResult): string {
    const { totalFiles, specs, modules, team, legacy, statistics } = result;

    let report = `# Brownfield Analysis Summary\n\n`;
    report += `**Total Files**: ${totalFiles}\n\n`;

    report += `## Classification Results\n\n`;
    report += `| Category | Count | Avg Confidence | Percentage |\n`;
    report += `|----------|-------|----------------|------------|\n`;
    report += `| Specs    | ${specs.length} | ${(statistics.specsConfidence * 100).toFixed(1)}% | ${((specs.length / totalFiles) * 100).toFixed(1)}% |\n`;
    report += `| Modules  | ${modules.length} | ${(statistics.modulesConfidence * 100).toFixed(1)}% | ${((modules.length / totalFiles) * 100).toFixed(1)}% |\n`;
    report += `| Team     | ${team.length} | ${(statistics.teamConfidence * 100).toFixed(1)}% | ${((team.length / totalFiles) * 100).toFixed(1)}% |\n`;
    report += `| Legacy   | ${legacy.length} | N/A | ${((legacy.length / totalFiles) * 100).toFixed(1)}% |\n\n`;

    if (specs.length > 0) {
      report += `## Specs (${specs.length} files)\n\n`;
      specs.slice(0, 10).forEach(file => {
        report += `- \`${file.relativePath}\` (${(file.confidence * 100).toFixed(0)}%)\n`;
        if (file.reasons.length > 0) {
          report += `  - ${file.reasons[0]}\n`;
        }
      });
      if (specs.length > 10) {
        report += `\n... and ${specs.length - 10} more\n`;
      }
      report += `\n`;
    }

    if (modules.length > 0) {
      report += `## Modules (${modules.length} files)\n\n`;
      modules.slice(0, 10).forEach(file => {
        report += `- \`${file.relativePath}\` (${(file.confidence * 100).toFixed(0)}%)\n`;
        if (file.reasons.length > 0) {
          report += `  - ${file.reasons[0]}\n`;
        }
      });
      if (modules.length > 10) {
        report += `\n... and ${modules.length - 10} more\n`;
      }
      report += `\n`;
    }

    if (team.length > 0) {
      report += `## Team Docs (${team.length} files)\n\n`;
      team.forEach(file => {
        report += `- \`${file.relativePath}\` (${(file.confidence * 100).toFixed(0)}%)\n`;
        if (file.reasons.length > 0) {
          report += `  - ${file.reasons[0]}\n`;
        }
      });
      report += `\n`;
    }

    if (legacy.length > 0) {
      report += `## Legacy (${legacy.length} files)\n\n`;
      report += `Files with no strong classification:\n\n`;
      legacy.slice(0, 10).forEach(file => {
        report += `- \`${file.relativePath}\`\n`;
      });
      if (legacy.length > 10) {
        report += `\n... and ${legacy.length - 10} more\n`;
      }
    }

    return report;
  }
}
