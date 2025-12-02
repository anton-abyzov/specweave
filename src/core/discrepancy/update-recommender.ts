/**
 * Update Recommender
 *
 * Generates recommendations for handling discrepancies and creates update patches.
 *
 * @module core/discrepancy/update-recommender
 */

import { Logger, consoleLogger } from '../../utils/logger.js';
import { Discrepancy, DiscrepancySeverity, DiscrepancyRecommendation } from './detector.js';

/**
 * An update patch for a spec file.
 */
export interface UpdatePatch {
  filePath: string;
  lineNumber: number;
  originalText: string;
  newText: string;
  reason: string;
}

/**
 * Recommendation with optional patch.
 */
export interface RecommendationResult {
  discrepancyId: string;
  recommendation: DiscrepancyRecommendation;
  patch?: UpdatePatch;
  explanation: string;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Configuration for the update recommender.
 */
export interface UpdateRecommenderConfig {
  /** Auto-update trivial changes */
  autoUpdateTrivial?: boolean;
  /** Generate patches for review-required changes */
  generatePatches?: boolean;
}

/**
 * Generates recommendations for handling discrepancies.
 */
export class UpdateRecommender {
  private readonly logger: Logger;
  private readonly config: Required<UpdateRecommenderConfig>;

  constructor(options: { logger?: Logger; config?: UpdateRecommenderConfig } = {}) {
    this.logger = options.logger ?? consoleLogger;
    this.config = {
      autoUpdateTrivial: options.config?.autoUpdateTrivial ?? false,
      generatePatches: options.config?.generatePatches ?? true,
    };
  }

  /**
   * Generate recommendations for a list of discrepancies.
   */
  recommendAll(discrepancies: Discrepancy[]): RecommendationResult[] {
    return discrepancies.map(d => this.recommend(d));
  }

  /**
   * Generate a recommendation for a single discrepancy.
   */
  recommend(discrepancy: Discrepancy): RecommendationResult {
    const recommendation = this.mapSeverityToRecommendation(discrepancy.severity);
    const explanation = this.generateExplanation(discrepancy, recommendation);
    const riskLevel = this.assessRisk(discrepancy);

    const result: RecommendationResult = {
      discrepancyId: discrepancy.id,
      recommendation,
      explanation,
      riskLevel,
    };

    // Generate patch if applicable
    if (this.config.generatePatches && this.shouldGeneratePatch(discrepancy, recommendation)) {
      result.patch = this.generatePatch(discrepancy);
    }

    return result;
  }

  /**
   * Generate an update patch for a discrepancy.
   */
  generatePatch(discrepancy: Discrepancy): UpdatePatch | undefined {
    // Can only generate patches for modifications and additions with spec files
    if (!discrepancy.specPath && discrepancy.category !== 'added') {
      return undefined;
    }

    switch (discrepancy.type) {
      case 'api-route':
        return this.generateApiRoutePatch(discrepancy);
      case 'function-signature':
        return this.generateFunctionPatch(discrepancy);
      case 'type-definition':
        return this.generateTypePatch(discrepancy);
      default:
        return undefined;
    }
  }

  private mapSeverityToRecommendation(severity: DiscrepancySeverity): DiscrepancyRecommendation {
    switch (severity) {
      case 'trivial':
        return 'auto-update';
      case 'minor':
        return 'review-required';
      case 'major':
        return 'notify';
      case 'breaking':
        return 'alert';
    }
  }

  private generateExplanation(discrepancy: Discrepancy, recommendation: DiscrepancyRecommendation): string {
    const parts: string[] = [];

    // Category explanation
    switch (discrepancy.category) {
      case 'added':
        parts.push(`New ${discrepancy.type.replace('-', ' ')} found in code that is not documented.`);
        break;
      case 'removed':
        parts.push(`Documented ${discrepancy.type.replace('-', ' ')} no longer exists in code.`);
        break;
      case 'modified':
        parts.push(`${discrepancy.type.replace('-', ' ')} has changed from documented version.`);
        break;
    }

    // Code is source of truth reminder
    parts.push('Code is the source of truth - specs should be updated to match.');

    // Recommendation explanation
    switch (recommendation) {
      case 'auto-update':
        parts.push('This is a trivial change that can be safely auto-updated.');
        break;
      case 'review-required':
        parts.push('Please review the change before updating documentation.');
        break;
      case 'notify':
        parts.push('This is a significant change that should be communicated to stakeholders.');
        break;
      case 'alert':
        parts.push('⚠️ This is a breaking change! Consumers may be affected.');
        break;
    }

    return parts.join(' ');
  }

  private assessRisk(discrepancy: Discrepancy): 'low' | 'medium' | 'high' {
    // Breaking changes are high risk
    if (discrepancy.severity === 'breaking') {
      return 'high';
    }

    // Removals are always at least medium risk
    if (discrepancy.category === 'removed') {
      return 'medium';
    }

    // API route changes are medium risk
    if (discrepancy.type === 'api-route' && discrepancy.category === 'modified') {
      return 'medium';
    }

    // Additions are low risk (new undocumented functionality)
    if (discrepancy.category === 'added') {
      return 'low';
    }

    // Minor modifications are low risk
    if (discrepancy.severity === 'minor' || discrepancy.severity === 'trivial') {
      return 'low';
    }

    return 'medium';
  }

  private shouldGeneratePatch(discrepancy: Discrepancy, recommendation: DiscrepancyRecommendation): boolean {
    // Don't generate patches for alerts (need manual handling)
    if (recommendation === 'alert') {
      return false;
    }

    // Generate patches for auto-update and review-required
    if (recommendation === 'auto-update' || recommendation === 'review-required') {
      return true;
    }

    // Generate patches for notify if it's an addition
    if (recommendation === 'notify' && discrepancy.category === 'added') {
      return true;
    }

    return false;
  }

  private generateApiRoutePatch(discrepancy: Discrepancy): UpdatePatch | undefined {
    if (discrepancy.category === 'added') {
      // Generate new documentation section
      const method = discrepancy.codeValue.split(' ')[0];
      const path = discrepancy.codeValue.split(' ')[1] || discrepancy.codeValue;

      return {
        filePath: discrepancy.codePath || 'docs/api.md',
        lineNumber: 0, // Append to end
        originalText: '',
        newText: this.generateApiDocSection(method, path),
        reason: 'Add documentation for new API route',
      };
    }

    if (discrepancy.category === 'modified' && discrepancy.specPath) {
      return {
        filePath: discrepancy.specPath,
        lineNumber: discrepancy.specLineNumber,
        originalText: discrepancy.specValue,
        newText: discrepancy.codeValue,
        reason: discrepancy.description,
      };
    }

    if (discrepancy.category === 'removed' && discrepancy.specPath) {
      return {
        filePath: discrepancy.specPath,
        lineNumber: discrepancy.specLineNumber,
        originalText: discrepancy.specValue,
        newText: `~~${discrepancy.specValue}~~ *(DEPRECATED - removed from code)*`,
        reason: 'Mark removed API route as deprecated',
      };
    }

    return undefined;
  }

  private generateFunctionPatch(discrepancy: Discrepancy): UpdatePatch | undefined {
    if (discrepancy.category === 'added') {
      return {
        filePath: discrepancy.codePath || 'docs/api.md',
        lineNumber: 0,
        originalText: '',
        newText: this.generateFunctionDocSection(discrepancy.codeValue),
        reason: 'Add documentation for new function',
      };
    }

    if (discrepancy.category === 'modified' && discrepancy.specPath) {
      return {
        filePath: discrepancy.specPath,
        lineNumber: discrepancy.specLineNumber,
        originalText: discrepancy.specValue,
        newText: discrepancy.codeValue,
        reason: discrepancy.description,
      };
    }

    return undefined;
  }

  private generateTypePatch(discrepancy: Discrepancy): UpdatePatch | undefined {
    if (discrepancy.category === 'added') {
      return {
        filePath: discrepancy.codePath || 'docs/types.md',
        lineNumber: 0,
        originalText: '',
        newText: this.generateTypeDocSection(discrepancy.codeValue),
        reason: 'Add documentation for new type',
      };
    }

    return undefined;
  }

  private generateApiDocSection(method: string, path: string): string {
    return `
## ${method} ${path}

*TODO: Add description*

### Request

*TODO: Document request parameters*

### Response

*TODO: Document response format*
`.trim();
  }

  private generateFunctionDocSection(signature: string): string {
    return `
### \`${signature}\`

*TODO: Add description*

#### Parameters

*TODO: Document parameters*

#### Returns

*TODO: Document return value*
`.trim();
  }

  private generateTypeDocSection(typeValue: string): string {
    return `
### ${typeValue}

*TODO: Add type description*

#### Properties

*TODO: Document properties*
`.trim();
  }

  /**
   * Generate a summary report of recommendations.
   */
  generateReport(recommendations: RecommendationResult[]): string {
    const lines: string[] = ['# Discrepancy Recommendations Report', ''];

    const byRecommendation = this.groupBy(recommendations, r => r.recommendation);

    // Summary
    lines.push('## Summary', '');
    lines.push(`- Total discrepancies: ${recommendations.length}`);
    lines.push(`- Auto-update: ${byRecommendation['auto-update']?.length ?? 0}`);
    lines.push(`- Review required: ${byRecommendation['review-required']?.length ?? 0}`);
    lines.push(`- Notify: ${byRecommendation['notify']?.length ?? 0}`);
    lines.push(`- Alert: ${byRecommendation['alert']?.length ?? 0}`);
    lines.push('');

    // Alerts first (most important)
    if (byRecommendation['alert']?.length) {
      lines.push('## ⚠️ Alerts (Breaking Changes)', '');
      for (const r of byRecommendation['alert']) {
        lines.push(`### ${r.discrepancyId}`);
        lines.push(r.explanation);
        lines.push('');
      }
    }

    // Notifications
    if (byRecommendation['notify']?.length) {
      lines.push('## 📢 Notifications (Major Changes)', '');
      for (const r of byRecommendation['notify']) {
        lines.push(`### ${r.discrepancyId}`);
        lines.push(r.explanation);
        if (r.patch) {
          lines.push('');
          lines.push('**Suggested update:**');
          lines.push('```');
          lines.push(r.patch.newText);
          lines.push('```');
        }
        lines.push('');
      }
    }

    // Review required
    if (byRecommendation['review-required']?.length) {
      lines.push('## 👀 Review Required (Minor Changes)', '');
      for (const r of byRecommendation['review-required']) {
        lines.push(`- **${r.discrepancyId}**: ${r.explanation}`);
      }
      lines.push('');
    }

    // Auto-update
    if (byRecommendation['auto-update']?.length) {
      lines.push('## ✅ Auto-Update (Trivial Changes)', '');
      for (const r of byRecommendation['auto-update']) {
        lines.push(`- **${r.discrepancyId}**: ${r.explanation}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
    const result: Record<string, T[]> = {};
    for (const item of items) {
      const key = keyFn(item);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
    }
    return result;
  }
}
