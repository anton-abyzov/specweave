/**
 * Severity Classifier
 *
 * Classifies discrepancy severity to determine appropriate action.
 * Conservative by default: when uncertain, classify higher severity.
 *
 * @module core/discrepancy/severity-classifier
 */

import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Severity levels for discrepancies.
 */
export type DiscrepancySeverity = 'trivial' | 'minor' | 'major' | 'breaking';

/**
 * Category of change.
 */
export type ChangeCategory = 'added' | 'removed' | 'modified';

/**
 * Type of item that changed.
 */
export type ItemType = 'api-route' | 'function-signature' | 'type-definition';

/**
 * Details about a change for classification.
 */
export interface ChangeDetails {
  category: ChangeCategory;
  itemType: ItemType;
  specValue: string;
  codeValue: string;
  description?: string;
}

/**
 * Classification result with reasoning.
 */
export interface ClassificationResult {
  severity: DiscrepancySeverity;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Configuration for severity classification.
 */
export interface SeverityClassifierConfig {
  /** Be conservative: when uncertain, classify higher */
  conservative?: boolean;
  /** Treat all removals as breaking */
  strictRemovals?: boolean;
}

/**
 * Classifies discrepancy severity based on change type and details.
 */
export class SeverityClassifier {
  private readonly logger: Logger;
  private readonly config: Required<SeverityClassifierConfig>;

  constructor(options: { logger?: Logger; config?: SeverityClassifierConfig } = {}) {
    this.logger = options.logger ?? consoleLogger;
    this.config = {
      conservative: options.config?.conservative ?? true,
      strictRemovals: options.config?.strictRemovals ?? true,
    };
  }

  /**
   * Classify the severity of a discrepancy.
   */
  classify(change: ChangeDetails): ClassificationResult {
    // Removal = breaking (might break consumers)
    if (change.category === 'removed') {
      return this.classifyRemoval(change);
    }

    // Addition = major (new undocumented functionality)
    if (change.category === 'added') {
      return this.classifyAddition(change);
    }

    // Modification = depends on what changed
    return this.classifyModification(change);
  }

  private classifyRemoval(change: ChangeDetails): ClassificationResult {
    if (this.config.strictRemovals) {
      return {
        severity: 'breaking',
        reason: `${change.itemType} removed: ${change.specValue}`,
        confidence: 'high',
      };
    }

    // Check if it's a significant removal
    if (change.itemType === 'api-route') {
      return {
        severity: 'breaking',
        reason: `API route removed: ${change.specValue}`,
        confidence: 'high',
      };
    }

    if (change.itemType === 'function-signature') {
      return {
        severity: 'breaking',
        reason: `Exported function removed: ${change.specValue}`,
        confidence: 'high',
      };
    }

    if (change.itemType === 'type-definition') {
      return {
        severity: 'major',
        reason: `Type definition removed: ${change.specValue}`,
        confidence: 'medium',
      };
    }

    return {
      severity: 'major',
      reason: 'Item removed from codebase',
      confidence: 'low',
    };
  }

  private classifyAddition(change: ChangeDetails): ClassificationResult {
    // New API routes are major (new functionality)
    if (change.itemType === 'api-route') {
      return {
        severity: 'major',
        reason: `New API route not documented: ${change.codeValue}`,
        confidence: 'high',
      };
    }

    // New exported functions are major
    if (change.itemType === 'function-signature') {
      return {
        severity: 'major',
        reason: `New exported function not documented: ${change.codeValue}`,
        confidence: 'high',
      };
    }

    // New types are minor (usually supporting types)
    if (change.itemType === 'type-definition') {
      return {
        severity: 'minor',
        reason: `New type definition not documented: ${change.codeValue}`,
        confidence: 'medium',
      };
    }

    return {
      severity: 'minor',
      reason: 'New item added to codebase',
      confidence: 'low',
    };
  }

  private classifyModification(change: ChangeDetails): ClassificationResult {
    const description = change.description?.toLowerCase() ?? '';

    // Check for trivial changes
    if (this.isTrivialChange(change.specValue, change.codeValue, description)) {
      return {
        severity: 'trivial',
        reason: 'Minor formatting or documentation change',
        confidence: 'high',
      };
    }

    // Check for breaking signature changes
    if (this.isBreakingSignatureChange(change)) {
      return {
        severity: 'breaking',
        reason: this.getBreakingChangeReason(change),
        confidence: 'high',
      };
    }

    // API route path changes
    if (change.itemType === 'api-route') {
      return this.classifyApiRouteChange(change);
    }

    // Function signature changes
    if (change.itemType === 'function-signature') {
      return this.classifyFunctionChange(change);
    }

    // Default to minor for modifications
    return {
      severity: this.config.conservative ? 'minor' : 'trivial',
      reason: 'Modification detected',
      confidence: 'low',
    };
  }

  private isTrivialChange(specValue: string, codeValue: string, description: string): boolean {
    // Normalize and compare
    const normalizedSpec = this.normalize(specValue);
    const normalizedCode = this.normalize(codeValue);

    // If normalized values are same, it's just formatting
    if (normalizedSpec === normalizedCode) {
      return true;
    }

    // Check for typo indicators in description
    if (description.includes('typo') || description.includes('whitespace')) {
      return true;
    }

    return false;
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/['"]/g, '')
      .trim();
  }

  private isBreakingSignatureChange(change: ChangeDetails): boolean {
    const description = change.description?.toLowerCase() ?? '';

    // Return type changes are breaking
    if (description.includes('return type')) {
      return true;
    }

    // Required parameter additions are breaking
    if (description.includes('required param')) {
      return true;
    }

    // Parameter removal is breaking
    if (description.includes('parameter count') && this.hasFewerParams(change)) {
      return true;
    }

    return false;
  }

  private hasFewerParams(change: ChangeDetails): boolean {
    // Extract param counts from description
    const match = change.description?.match(/spec has (\d+), code has (\d+)/);
    if (match) {
      const specCount = parseInt(match[1], 10);
      const codeCount = parseInt(match[2], 10);
      return codeCount < specCount;
    }
    return false;
  }

  private getBreakingChangeReason(change: ChangeDetails): string {
    const description = change.description ?? '';

    if (description.includes('return type')) {
      return `Breaking: ${description}`;
    }

    if (description.includes('required param')) {
      return `Breaking: New required parameter added`;
    }

    if (description.includes('parameter count')) {
      return `Breaking: ${description}`;
    }

    return 'Breaking signature change detected';
  }

  private classifyApiRouteChange(change: ChangeDetails): ClassificationResult {
    const specPath = this.extractPath(change.specValue);
    const codePath = this.extractPath(change.codeValue);

    // Version change (v1 -> v2) is major
    if (this.isVersionChange(specPath, codePath)) {
      return {
        severity: 'major',
        reason: `API version changed: ${specPath} → ${codePath}`,
        confidence: 'high',
      };
    }

    // Path structure change is major
    if (this.isPathStructureChange(specPath, codePath)) {
      return {
        severity: 'major',
        reason: `API path structure changed: ${specPath} → ${codePath}`,
        confidence: 'medium',
      };
    }

    // Param name change is minor
    return {
      severity: 'minor',
      reason: `API route modified: ${change.description ?? 'path changed'}`,
      confidence: 'medium',
    };
  }

  private classifyFunctionChange(change: ChangeDetails): ClassificationResult {
    const description = change.description?.toLowerCase() ?? '';

    // Parameter type changes are minor (TypeScript will catch issues)
    if (description.includes('parameter') && !description.includes('count')) {
      return {
        severity: 'minor',
        reason: 'Parameter type or name changed',
        confidence: 'medium',
      };
    }

    // Optional parameter additions are minor
    if (description.includes('optional')) {
      return {
        severity: 'minor',
        reason: 'Optional parameter added',
        confidence: 'high',
      };
    }

    return {
      severity: this.config.conservative ? 'minor' : 'trivial',
      reason: 'Function signature modified',
      confidence: 'low',
    };
  }

  private extractPath(value: string): string {
    // Extract path from "METHOD /path" format
    const match = value.match(/(?:GET|POST|PUT|DELETE|PATCH)\s+(\S+)/i);
    return match ? match[1] : value;
  }

  private isVersionChange(specPath: string, codePath: string): boolean {
    const versionPattern = /\/v(\d+)\//;
    const specVersion = specPath.match(versionPattern);
    const codeVersion = codePath.match(versionPattern);

    if (specVersion && codeVersion) {
      return specVersion[1] !== codeVersion[1];
    }

    // New version added where none existed
    if (!specVersion && codeVersion) {
      return true;
    }

    return false;
  }

  private isPathStructureChange(specPath: string, codePath: string): boolean {
    // Normalize paths for comparison
    const specParts = specPath.split('/').filter(Boolean);
    const codeParts = codePath.split('/').filter(Boolean);

    // Different segment count (excluding params)
    const specSegments = specParts.filter(p => !p.startsWith(':'));
    const codeSegments = codeParts.filter(p => !p.startsWith(':'));

    return specSegments.length !== codeSegments.length;
  }

  /**
   * Map severity to recommended action.
   */
  getRecommendation(severity: DiscrepancySeverity): 'auto-update' | 'review-required' | 'notify' | 'alert' {
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
}
