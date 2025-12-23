/**
 * Template Engine for Living Docs Scaffolding
 *
 * Provides variable substitution for .md.template files.
 * Works with ANY user project - no hardcoded paths or project names.
 *
 * Supports:
 * - Simple variables: ${variableName}
 * - Conditional blocks: ${if:condition}...${endif}
 * - Loop blocks: ${each:items}...${endeach}
 * - Default values: ${variableName:defaultValue}
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
 * Template Engine class
 */
export class TemplateEngine {
  private logger: Logger;

  constructor(options: { logger?: Logger } = {}) {
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Render a template with the given context
   */
  render(template: string, context: TemplateContext): string {
    let result = template;
    result = this.processConditionals(result, context);
    result = this.processLoops(result, context);
    result = this.processVariables(result, context);
    return result;
  }

  private processConditionals(template: string, context: TemplateContext): string {
    const conditionalPattern = /\$\{if:(\w+)\}([\s\S]*?)\$\{endif\}/g;
    return template.replace(conditionalPattern, (_match, varName, content) => {
      const value = this.getContextValue(context, varName);
      // Truthy check: exists, not false, not empty string, not empty array
      const isTruthy = value !== undefined &&
                       value !== null &&
                       value !== false &&
                       value !== '' &&
                       !(Array.isArray(value) && value.length === 0);
      return isTruthy ? content : '';
    });
  }

  private processLoops(template: string, context: TemplateContext): string {
    const loopPattern = /\$\{each:(\w+)\}([\s\S]*?)\$\{endeach\}/g;
    return template.replace(loopPattern, (_match, arrayName, content) => {
      const array = this.getContextValue(context, arrayName);
      if (!Array.isArray(array) || array.length === 0) return '';
      return array.map((item, index) => {
        let itemContent = content;
        const itemPattern = /\$\{item\.(\w+)\}/g;
        itemContent = itemContent.replace(itemPattern, (_m: string, prop: string) => {
          return item[prop] !== undefined ? String(item[prop]) : '';
        });
        itemContent = itemContent.replace(/\$\{index\}/g, String(index));
        return itemContent;
      }).join('');
    });
  }

  private processVariables(template: string, context: TemplateContext): string {
    const variablePattern = /\$\{(\w+)(?::([^}]*))?\}/g;
    return template.replace(variablePattern, (_match, varName, defaultValue) => {
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

  validateTemplate(template: string): string[] {
    const errors: string[] = [];
    const ifCount = (template.match(/\$\{if:\w+\}/g) || []).length;
    const endifCount = (template.match(/\$\{endif\}/g) || []).length;
    if (ifCount !== endifCount) {
      errors.push('Mismatched conditionals: ' + ifCount + ' if blocks but ' + endifCount + ' endif');
    }
    const eachCount = (template.match(/\$\{each:\w+\}/g) || []).length;
    const endeachCount = (template.match(/\$\{endeach\}/g) || []).length;
    if (eachCount !== endeachCount) {
      errors.push('Mismatched loops: ' + eachCount + ' each blocks but ' + endeachCount + ' endeach');
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
