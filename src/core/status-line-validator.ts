/**
 * Status Line Validator
 *
 * Detects and reports when status line cache is out of sync with tasks.md.
 *
 * Critical for ensuring status line always reflects reality.
 */

import fs from 'fs-extra';
import path from 'path';
import { Logger, consoleLogger } from '../utils/logger.js';

export interface ValidationResult {
  isValid: boolean;
  incrementId: string;
  actual: {
    completedTasks: number;
    totalTasks: number;
    percentage: number;
  };
  frontmatter: {
    completedTasks: number;
    totalTasks: number;
  };
  cache: {
    completedTasks: number;
    totalTasks: number;
    percentage: number;
    lastUpdate: string;
  };
  issues: string[];
}

export class StatusLineValidator {
  private logger: Logger;

  constructor(options: { logger?: Logger } = {}) {
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Validate status line for a specific increment
   */
  async validateIncrement(
    projectRoot: string,
    incrementId: string
  ): Promise<ValidationResult> {
    const issues: string[] = [];

    // Read tasks.md
    const tasksPath = path.join(
      projectRoot,
      '.specweave',
      'increments',
      incrementId,
      'tasks.md'
    );

    if (!await fs.pathExists(tasksPath)) {
      throw new Error(`tasks.md not found: ${tasksPath}`);
    }

    const tasksContent = await fs.readFile(tasksPath, 'utf-8');

    // Count actual task completions
    const actual = this.countActualCompletions(tasksContent);

    // Parse frontmatter
    const frontmatter = this.parseFrontmatter(tasksContent);

    // Read status line cache
    const cachePath = path.join(projectRoot, '.specweave', 'state', 'status-line.json');
    const cache = await this.readCache(cachePath, incrementId);

    // Validate consistency
    if (actual.completedTasks !== frontmatter.completedTasks) {
      issues.push(
        `Frontmatter desync: actual=${actual.completedTasks}, frontmatter=${frontmatter.completedTasks}`
      );
    }

    if (actual.totalTasks !== frontmatter.totalTasks) {
      issues.push(
        `Total tasks mismatch: actual=${actual.totalTasks}, frontmatter=${frontmatter.totalTasks}`
      );
    }

    // Only validate cache if this is the current increment
    // Status line cache only stores ONE current increment at a time
    const isCurrentIncrement = cache.completedTasks > 0 || cache.totalTasks > 0;
    if (isCurrentIncrement) {
      if (actual.completedTasks !== cache.completedTasks) {
        issues.push(
          `Cache desync: actual=${actual.completedTasks}, cache=${cache.completedTasks}`
        );
      }

      if (actual.percentage !== cache.percentage) {
        issues.push(
          `Percentage desync: actual=${actual.percentage}%, cache=${cache.percentage}%`
        );
      }
    }

    // Check cache staleness (> 24 hours old) - only for current increment
    if (isCurrentIncrement) {
      const cacheAge = Date.now() - new Date(cache.lastUpdate).getTime();
      const hoursSinceUpdate = cacheAge / (1000 * 60 * 60);
      if (hoursSinceUpdate > 24) {
        issues.push(
          `Cache stale: last updated ${Math.round(hoursSinceUpdate)} hours ago`
        );
      }
    }

    return {
      isValid: issues.length === 0,
      incrementId,
      actual,
      frontmatter,
      cache,
      issues
    };
  }

  /**
   * Validate all active increments
   */
  async validateAll(projectRoot: string): Promise<ValidationResult[]> {
    const incrementsDir = path.join(projectRoot, '.specweave', 'increments');

    if (!await fs.pathExists(incrementsDir)) {
      return [];
    }

    const results: ValidationResult[] = [];
    const entries = await fs.readdir(incrementsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const specPath = path.join(incrementsDir, entry.name, 'spec.md');
      if (!await fs.pathExists(specPath)) continue;

      const specContent = await fs.readFile(specPath, 'utf-8');
      const statusMatch = specContent.match(/^status:\s*(\w+)/m);
      const status = statusMatch ? statusMatch[1] : null;

      // Only validate active/planning increments
      if (status === 'active' || status === 'planning') {
        try {
          const result = await this.validateIncrement(projectRoot, entry.name);
          results.push(result);
        } catch (error) {
          this.logger.error(`Failed to validate ${entry.name}:`, error);
        }
      }
    }

    return results;
  }

  /**
   * Count actual task completions by parsing tasks.md
   */
  private countActualCompletions(content: string): {
    completedTasks: number;
    totalTasks: number;
    percentage: number;
  } {
    const lines = content.split('\n');

    // Count total tasks (### T- headings)
    const totalTasks = lines.filter(line => /^###\s+T-\d+/.test(line)).length;

    // Count completed tasks (multiple formats)
    let completedTasks = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for task heading
      if (/^###\s+T-\d+/.test(line)) {
        // Look ahead for status line (within next 10 lines)
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const statusLine = lines[j];

          // Format 1: **Status**: [x] completed
          if (/\*\*Status\*\*:\s*\[x\]\s*completed/i.test(statusLine)) {
            completedTasks++;
            break;
          }

          // Format 2: ✅ COMPLETE in task title
          if (line.includes('✅ COMPLETE')) {
            completedTasks++;
            break;
          }

          // Stop at next task or section
          if (/^###\s+T-\d+/.test(statusLine) || /^##\s+/.test(statusLine)) {
            break;
          }
        }
      }
    }

    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return { completedTasks, totalTasks, percentage };
  }

  /**
   * Parse frontmatter from tasks.md
   */
  private parseFrontmatter(content: string): {
    completedTasks: number;
    totalTasks: number;
  } {
    const completedMatch = content.match(/^completed:\s*(\d+)/m);
    const totalMatch = content.match(/^total_tasks:\s*(\d+)/m);

    return {
      completedTasks: completedMatch ? parseInt(completedMatch[1], 10) : 0,
      totalTasks: totalMatch ? parseInt(totalMatch[1], 10) : 0
    };
  }

  /**
   * Read status line cache
   */
  private async readCache(
    cachePath: string,
    incrementId: string
  ): Promise<{
    completedTasks: number;
    totalTasks: number;
    percentage: number;
    lastUpdate: string;
  }> {
    if (!await fs.pathExists(cachePath)) {
      return {
        completedTasks: 0,
        totalTasks: 0,
        percentage: 0,
        lastUpdate: new Date(0).toISOString()
      };
    }

    const cache = await fs.readJson(cachePath);

    if (!cache.current || cache.current.id !== incrementId) {
      return {
        completedTasks: 0,
        totalTasks: 0,
        percentage: 0,
        lastUpdate: cache.lastUpdate || new Date(0).toISOString()
      };
    }

    return {
      completedTasks: cache.current.completed || 0,
      totalTasks: cache.current.total || 0,
      percentage: cache.current.percentage || 0,
      lastUpdate: cache.lastUpdate || new Date(0).toISOString()
    };
  }

  /**
   * Generate validation report
   */
  generateReport(results: ValidationResult[]): string {
    const lines: string[] = [];

    lines.push('# Status Line Validation Report');
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    const validCount = results.filter(r => r.isValid).length;
    const invalidCount = results.filter(r => !r.isValid).length;

    lines.push(`## Summary`);
    lines.push('');
    lines.push(`- Total increments checked: ${results.length}`);
    lines.push(`- Valid: ${validCount}`);
    lines.push(`- Invalid: ${invalidCount}`);
    lines.push('');

    if (invalidCount > 0) {
      lines.push('## Issues Found');
      lines.push('');

      for (const result of results) {
        if (!result.isValid) {
          lines.push(`### ${result.incrementId}`);
          lines.push('');
          lines.push('| Metric | Actual | Frontmatter | Cache |');
          lines.push('|--------|--------|-------------|-------|');
          lines.push(
            `| Completed | ${result.actual.completedTasks} | ${result.frontmatter.completedTasks} | ${result.cache.completedTasks} |`
          );
          lines.push(
            `| Total | ${result.actual.totalTasks} | ${result.frontmatter.totalTasks} | ${result.cache.totalTasks} |`
          );
          lines.push(
            `| Percentage | ${result.actual.percentage}% | - | ${result.cache.percentage}% |`
          );
          lines.push('');
          lines.push('**Issues:**');
          for (const issue of result.issues) {
            lines.push(`- ${issue}`);
          }
          lines.push('');
        }
      }
    } else {
      lines.push('## All Status Lines Valid ✅');
      lines.push('');
      lines.push('No desynchronization detected.');
    }

    return lines.join('\n');
  }
}

/**
 * CLI entry point for validation
 */
export async function main() {
  const validator = new StatusLineValidator();
  const projectRoot = process.cwd();

  console.log('🔍 Validating status line synchronization...\n');

  const results = await validator.validateAll(projectRoot);

  if (results.length === 0) {
    console.log('ℹ️  No active increments found.');
    process.exit(0);
  }

  const report = validator.generateReport(results);
  console.log(report);

  const hasIssues = results.some(r => !r.isValid);
  if (hasIssues) {
    console.log('\n❌ Validation failed! Status line is out of sync.');
    console.log('Run: bash plugins/specweave/hooks/lib/update-status-line.sh');
    process.exit(1);
  } else {
    console.log('\n✅ All status lines valid!');
    process.exit(0);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
