/**
 * Template Engine for Living Docs Scaffolding
 *
 * Provides variable substitution for .md.template files.
 * Works with ANY user project - no hardcoded paths or project names.
 *
 * Supports:
 * - Simple variables: ${variableName}
 * - Conditional blocks: ${if:condition}...${endif} (supports nesting)
 * - Loop blocks: ${each:items}...${endeach} (supports nesting)
 * - Default values: ${variableName:defaultValue}
 * - Nested conditionals and loops (recursive processing)
 *
 * @module core/living-docs/scaffolding/template-engine
 */

import { Logger, consoleLogger } from '../../../utils/logger.js';

/**
 * Template variables context
 */
export interface TemplateContext {
  // Project information
  projectId: string;
  projectName: string;
  projectDescription?: string;

  // Dates
  createdDate: string;
  lastUpdatedDate: string;

  // Feature information (when generating feature docs)
  featureId?: string;
  featureTitle?: string;
  featureStatus?: string;
  featurePriority?: string;

  // Increment information
  incrementId?: string;
  incrementsRelativePath?: string;

  // Lists for iteration
  userStories?: Array<{
    id: string;
    title: string;
    fileName: string;
    status?: string;
  }>;

  increments?: Array<{
    id: string;
    link: string;
    status: string;
    statusEmoji: string;
    date: string;
  }>;

  // Overview content
  overview?: string;

  // Custom variables
  [key: string]: unknown;
}

/**
 * Default template context values
 */
export function createDefaultContext(projectId: string): TemplateContext {
  const today = new Date().toISOString().split('T')[0];
  return {
    projectId,
    projectName: projectId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    createdDate: today,
    lastUpdatedDate: today,
    incrementsRelativePath: '../../../../increments',
  };
}

/**
 * Maximum recursion depth for nested templates (prevents infinite loops)
 */
const MAX_RECURSION_DEPTH = 10;

/**
 * Template Engine class
 *
 * Supports deeply nested conditionals and loops through recursive processing.
 */
export class TemplateEngine {
  private logger: Logger;

  constructor(options: { logger?: Logger } = {}) {
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Render a template with the given context
   *
   * Processes nested structures by recursively rendering until no more
   * template syntax remains (up to MAX_RECURSION_DEPTH iterations).
   */
  render(template: string, context: TemplateContext): string {
    let result = template;
    let depth = 0;

    // Process recursively until stable (handles nested blocks)
    let previousResult = '';
    while (previousResult !== result && depth < MAX_RECURSION_DEPTH) {
      previousResult = result;
      result = this.processConditionals(result, context);
      result = this.processLoops(result, context);
      depth++;
    }

    // Final pass for variables (after all conditionals/loops are resolved)
    result = this.processVariables(result, context);

    if (depth >= MAX_RECURSION_DEPTH) {
      this.logger.warn('Template engine reached max recursion depth. Possible infinite loop in template.');
    }

    return result;
  }

  /**
   * Process conditional blocks with proper nesting support
   *
   * Uses a non-greedy innermost-first approach to handle nesting:
   * ${if:outer}${if:inner}...${endif}${endif}
   */
  private processConditionals(template: string, context: TemplateContext): string {
    // Match innermost conditionals first (non-greedy, no nested ${if:} inside)
    const innermostPattern = /\$\{if:(\w+)\}((?:(?!\$\{if:)[\s\S])*?)\$\{endif\}/g;

    return template.replace(innermostPattern, (_match, varName, content) => {
      const value = this.getContextValue(context, varName);
      const isTruthy = this.isTruthy(value);
      return isTruthy ? content : '';
    });
  }

  /**
   * Process loop blocks with proper nesting support
   *
   * Uses a non-greedy innermost-first approach to handle nesting:
   * ${each:outer}${each:inner}...${endeach}${endeach}
   */
  private processLoops(template: string, context: TemplateContext): string {
    // Match innermost loops first (non-greedy, no nested ${each:} inside)
    const innermostPattern = /\$\{each:(\w+)\}((?:(?!\$\{each:)[\s\S])*?)\$\{endeach\}/g;

    return template.replace(innermostPattern, (_match, arrayName, content) => {
      const array = this.getContextValue(context, arrayName);
      if (!Array.isArray(array) || array.length === 0) return '';

      return array.map((item, index) => {
        let itemContent = content;

        // Replace item properties (supports nested paths like item.user.name)
        const itemPattern = /\$\{item\.([.\w]+)\}/g;
        itemContent = itemContent.replace(itemPattern, (_m: string, prop: string) => {
          const value = this.getNestedValue(item, prop);
          return value !== undefined ? String(value) : '';
        });

        // Replace index
        itemContent = itemContent.replace(/\$\{index\}/g, String(index));

        return itemContent;
      }).join('');
    });
  }

  /**
   * Check if a value is truthy for template conditionals
   */
  private isTruthy(value: unknown): boolean {
    return value !== undefined &&
           value !== null &&
           value !== false &&
           value !== '' &&
           value !== 0 &&
           !(Array.isArray(value) && value.length === 0);
  }

  /**
   * Get a nested value from an object using dot notation
   * Supports: item.user.name, item.tags.0, etc.
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private processVariables(template: string, context: TemplateContext): string {
    const variablePattern = /\$\{(\w+)(?::([^}]*))?\}/g;
    return template.replace(variablePattern, (_match, varName, defaultValue) => {
      // Skip template keywords
      if (['if', 'endif', 'each', 'endeach', 'item', 'index'].includes(varName)) {
        return _match;
      }

      const value = this.getContextValue(context, varName);
      if (value === undefined || value === null || value === '') {
        return defaultValue !== undefined ? defaultValue : '';
      }
      if (Array.isArray(value)) return value.join(', ');
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    });
  }

  private getContextValue(context: TemplateContext, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = context;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  /**
   * Validate template syntax for common errors
   *
   * Checks for:
   * - Mismatched if/endif blocks
   * - Mismatched each/endeach blocks
   * - Detects potential infinite loops (self-referencing)
   */
  validateTemplate(template: string): string[] {
    const errors: string[] = [];

    // Check balanced conditionals
    const ifCount = (template.match(/\$\{if:\w+\}/g) || []).length;
    const endifCount = (template.match(/\$\{endif\}/g) || []).length;
    if (ifCount !== endifCount) {
      errors.push('Mismatched conditionals: ' + ifCount + ' if blocks but ' + endifCount + ' endif');
    }

    // Check balanced loops
    const eachCount = (template.match(/\$\{each:\w+\}/g) || []).length;
    const endeachCount = (template.match(/\$\{endeach\}/g) || []).length;
    if (eachCount !== endeachCount) {
      errors.push('Mismatched loops: ' + eachCount + ' each blocks but ' + endeachCount + ' endeach');
    }

    // Check for common mistakes
    if (template.includes('${endif}${endif}') && ifCount < 2) {
      errors.push('Suspicious double endif - check nesting structure');
    }
    if (template.includes('${endeach}${endeach}') && eachCount < 2) {
      errors.push('Suspicious double endeach - check nesting structure');
    }

    return errors;
  }
}

let defaultEngine: TemplateEngine | null = null;

export function getTemplateEngine(options?: { logger?: Logger }): TemplateEngine {
  if (!defaultEngine) {
    defaultEngine = new TemplateEngine(options);
  }
  return defaultEngine;
}

export function renderTemplate(template: string, context: TemplateContext): string {
  return getTemplateEngine().render(template, context);
}
