/**
 * Discrepancy Detector
 *
 * Compares extracted code signatures against parsed specs to identify discrepancies.
 * Core principle: CODE is source of truth. When specs differ from code, specs need updating.
 *
 * @module core/discrepancy/detector
 */

import { Logger, consoleLogger } from '../../utils/logger.js';
import { ParsedSpec } from './spec-parser.js';
import { FunctionSignature, TypeDefinition, ApiRoute } from './analyzers/index.js';

/**
 * Type of discrepancy detected.
 */
export type DiscrepancyType = 'api-route' | 'function-signature' | 'type-definition';

/**
 * Category of discrepancy (what changed).
 */
export type DiscrepancyCategory = 'added' | 'removed' | 'modified';

/**
 * Severity of the discrepancy.
 */
export type DiscrepancySeverity = 'trivial' | 'minor' | 'major' | 'breaking';

/**
 * Recommended action for the discrepancy.
 */
export type DiscrepancyRecommendation = 'auto-update' | 'review-required' | 'notify' | 'alert';

/**
 * Represents a detected discrepancy between code and spec.
 */
export interface Discrepancy {
  id: string;
  type: DiscrepancyType;
  category: DiscrepancyCategory;
  severity: DiscrepancySeverity;
  recommendation: DiscrepancyRecommendation;
  specPath: string;
  specLineNumber: number;
  codePath: string;
  codeLineNumber: number;
  specValue: string;
  codeValue: string;
  description: string;
  detectedAt: string;
}

/**
 * Code signatures extracted from the codebase.
 */
export interface CodeSignatures {
  functions: FunctionSignature[];
  types: TypeDefinition[];
  routes: ApiRoute[];
}

/**
 * Result of discrepancy detection.
 */
export interface DetectionResult {
  discrepancies: Discrepancy[];
  summary: {
    total: number;
    byCategory: Record<DiscrepancyCategory, number>;
    bySeverity: Record<DiscrepancySeverity, number>;
    byType: Record<DiscrepancyType, number>;
  };
}

/**
 * Detects discrepancies between code and specifications.
 */
export class DiscrepancyDetector {
  private readonly logger: Logger;
  private discrepancyCounter = 0;

  constructor(options: { logger?: Logger } = {}) {
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Detect all discrepancies between specs and code.
   */
  detect(specs: ParsedSpec[], code: CodeSignatures): DetectionResult {
    const discrepancies: Discrepancy[] = [];
    const timestamp = new Date().toISOString();

    // Compare API routes
    const routeDiscrepancies = this.compareApiRoutes(
      specs.filter(s => s.type === 'api'),
      code.routes,
      timestamp
    );
    discrepancies.push(...routeDiscrepancies);

    // Compare functions
    const funcDiscrepancies = this.compareFunctions(
      specs.filter(s => s.type === 'function'),
      code.functions,
      timestamp
    );
    discrepancies.push(...funcDiscrepancies);

    // Compare types
    const typeDiscrepancies = this.compareTypes(
      specs.filter(s => s.type === 'type'),
      code.types,
      timestamp
    );
    discrepancies.push(...typeDiscrepancies);

    return {
      discrepancies,
      summary: this.calculateSummary(discrepancies),
    };
  }

  private compareApiRoutes(specs: ParsedSpec[], routes: ApiRoute[], timestamp: string): Discrepancy[] {
    const discrepancies: Discrepancy[] = [];

    // Create maps for comparison
    const specMap = new Map<string, ParsedSpec>();
    for (const spec of specs) {
      const key = `${spec.method?.toUpperCase() ?? 'GET'} ${spec.identifier}`;
      specMap.set(key, spec);
    }

    const routeMap = new Map<string, ApiRoute>();
    for (const route of routes) {
      const key = `${route.method} ${route.path}`;
      routeMap.set(key, route);
    }

    // Find routes in code but not in spec (added)
    for (const [key, route] of routeMap.entries()) {
      if (!specMap.has(key)) {
        // Check if there's a similar route (same method, different path)
        const similarSpec = this.findSimilarRoute(route, specs);

        if (similarSpec) {
          // Modified route
          discrepancies.push(this.createDiscrepancy({
            type: 'api-route',
            category: 'modified',
            specPath: similarSpec.source,
            specLineNumber: similarSpec.lineNumber,
            codePath: route.filePath,
            codeLineNumber: route.lineNumber,
            specValue: `${similarSpec.method} ${similarSpec.identifier}`,
            codeValue: key,
            description: `Route path changed from ${similarSpec.identifier} to ${route.path}`,
            timestamp,
          }));
        } else {
          // New route in code
          discrepancies.push(this.createDiscrepancy({
            type: 'api-route',
            category: 'added',
            specPath: '',
            specLineNumber: 0,
            codePath: route.filePath,
            codeLineNumber: route.lineNumber,
            specValue: '',
            codeValue: key,
            description: `New API route ${key} found in code but not documented`,
            timestamp,
          }));
        }
      }
    }

    // Find routes in spec but not in code (removed)
    for (const [key, spec] of specMap.entries()) {
      if (!routeMap.has(key)) {
        // Check if route moved
        const movedRoute = this.findMovedRoute(spec, routes);

        if (!movedRoute) {
          discrepancies.push(this.createDiscrepancy({
            type: 'api-route',
            category: 'removed',
            specPath: spec.source,
            specLineNumber: spec.lineNumber,
            codePath: '',
            codeLineNumber: 0,
            specValue: key,
            codeValue: '',
            description: `API route ${key} documented but not found in code`,
            timestamp,
          }));
        }
      }
    }

    return discrepancies;
  }

  private compareFunctions(specs: ParsedSpec[], functions: FunctionSignature[], timestamp: string): Discrepancy[] {
    const discrepancies: Discrepancy[] = [];

    // Create maps for comparison
    const specMap = new Map<string, ParsedSpec>();
    for (const spec of specs) {
      specMap.set(spec.identifier, spec);
    }

    const funcMap = new Map<string, FunctionSignature>();
    for (const func of functions) {
      // Only compare exported functions
      if (func.exported) {
        funcMap.set(func.name, func);
      }
    }

    // Find functions in code but not in spec (added)
    for (const [name, func] of funcMap.entries()) {
      if (!specMap.has(name)) {
        discrepancies.push(this.createDiscrepancy({
          type: 'function-signature',
          category: 'added',
          specPath: '',
          specLineNumber: 0,
          codePath: func.filePath,
          codeLineNumber: func.lineNumber,
          specValue: '',
          codeValue: this.formatFunctionSignature(func),
          description: `New exported function ${name} found in code but not documented`,
          timestamp,
        }));
      }
    }

    // Find functions in spec but not in code (removed)
    for (const [name, spec] of specMap.entries()) {
      if (!funcMap.has(name)) {
        discrepancies.push(this.createDiscrepancy({
          type: 'function-signature',
          category: 'removed',
          specPath: spec.source,
          specLineNumber: spec.lineNumber,
          codePath: '',
          codeLineNumber: 0,
          specValue: `${name}(${spec.params?.join(', ') ?? ''})`,
          codeValue: '',
          description: `Function ${name} documented but not found in code`,
          timestamp,
        }));
      } else {
        // Compare signatures
        const func = funcMap.get(name)!;
        const sigDiff = this.compareSignatures(spec, func);
        if (sigDiff) {
          discrepancies.push(this.createDiscrepancy({
            type: 'function-signature',
            category: 'modified',
            specPath: spec.source,
            specLineNumber: spec.lineNumber,
            codePath: func.filePath,
            codeLineNumber: func.lineNumber,
            specValue: `${name}(${spec.params?.join(', ') ?? ''}): ${spec.returnType ?? 'unknown'}`,
            codeValue: this.formatFunctionSignature(func),
            description: sigDiff,
            timestamp,
          }));
        }
      }
    }

    return discrepancies;
  }

  private compareTypes(specs: ParsedSpec[], types: TypeDefinition[], timestamp: string): Discrepancy[] {
    const discrepancies: Discrepancy[] = [];

    // Create maps for comparison
    const specMap = new Map<string, ParsedSpec>();
    for (const spec of specs) {
      specMap.set(spec.identifier, spec);
    }

    const typeMap = new Map<string, TypeDefinition>();
    for (const type of types) {
      if (type.exported) {
        typeMap.set(type.name, type);
      }
    }

    // Find types in code but not in spec (added)
    for (const [name, type] of typeMap.entries()) {
      if (!specMap.has(name)) {
        discrepancies.push(this.createDiscrepancy({
          type: 'type-definition',
          category: 'added',
          specPath: '',
          specLineNumber: 0,
          codePath: type.filePath,
          codeLineNumber: type.lineNumber,
          specValue: '',
          codeValue: `${type.kind} ${name}`,
          description: `New exported ${type.kind} ${name} found in code but not documented`,
          timestamp,
        }));
      }
    }

    // Find types in spec but not in code (removed)
    for (const [name, spec] of specMap.entries()) {
      if (!typeMap.has(name)) {
        discrepancies.push(this.createDiscrepancy({
          type: 'type-definition',
          category: 'removed',
          specPath: spec.source,
          specLineNumber: spec.lineNumber,
          codePath: '',
          codeLineNumber: 0,
          specValue: `${spec.metadata?.kind ?? 'type'} ${name}`,
          codeValue: '',
          description: `Type ${name} documented but not found in code`,
          timestamp,
        }));
      }
    }

    return discrepancies;
  }

  private findSimilarRoute(route: ApiRoute, specs: ParsedSpec[]): ParsedSpec | undefined {
    // Look for same method with similar path (path parameters might differ)
    for (const spec of specs) {
      if (spec.method?.toUpperCase() === route.method) {
        // Normalize paths for comparison
        const specPath = this.normalizePath(spec.identifier);
        const codePath = this.normalizePath(route.path);

        if (specPath === codePath && spec.identifier !== route.path) {
          return spec;
        }
      }
    }
    return undefined;
  }

  private findMovedRoute(spec: ParsedSpec, routes: ApiRoute[]): ApiRoute | undefined {
    // Check if the route exists with a different path
    for (const route of routes) {
      if (spec.method?.toUpperCase() === route.method) {
        const specPath = this.normalizePath(spec.identifier);
        const codePath = this.normalizePath(route.path);

        if (specPath === codePath) {
          return route;
        }
      }
    }
    return undefined;
  }

  private normalizePath(path: string): string {
    // Replace dynamic params with placeholder
    return path
      .replace(/:[^/]+/g, ':param')
      .replace(/\{[^}]+\}/g, ':param')
      .replace(/\/+$/, ''); // Remove trailing slashes
  }

  private compareSignatures(spec: ParsedSpec, func: FunctionSignature): string | null {
    const issues: string[] = [];

    // Compare param count
    const specParamCount = spec.params?.length ?? 0;
    const codeParamCount = func.params.length;

    if (specParamCount !== codeParamCount) {
      issues.push(`Parameter count: spec has ${specParamCount}, code has ${codeParamCount}`);
    }

    // Compare return type if specified
    if (spec.returnType && func.returnType !== 'unknown') {
      if (spec.returnType !== func.returnType) {
        issues.push(`Return type: spec says ${spec.returnType}, code returns ${func.returnType}`);
      }
    }

    return issues.length > 0 ? issues.join('; ') : null;
  }

  private formatFunctionSignature(func: FunctionSignature): string {
    const params = func.params.map(p => `${p.name}: ${p.type}`).join(', ');
    return `${func.name}(${params}): ${func.returnType}`;
  }

  private createDiscrepancy(data: {
    type: DiscrepancyType;
    category: DiscrepancyCategory;
    specPath: string;
    specLineNumber: number;
    codePath: string;
    codeLineNumber: number;
    specValue: string;
    codeValue: string;
    description: string;
    timestamp: string;
  }): Discrepancy {
    this.discrepancyCounter++;

    // Classify severity based on category
    const severity = this.classifySeverity(data.category, data.type);
    const recommendation = this.recommendAction(severity);

    return {
      id: `DISC-${this.discrepancyCounter.toString().padStart(4, '0')}`,
      type: data.type,
      category: data.category,
      severity,
      recommendation,
      specPath: data.specPath,
      specLineNumber: data.specLineNumber,
      codePath: data.codePath,
      codeLineNumber: data.codeLineNumber,
      specValue: data.specValue,
      codeValue: data.codeValue,
      description: data.description,
      detectedAt: data.timestamp,
    };
  }

  private classifySeverity(category: DiscrepancyCategory, _type: DiscrepancyType): DiscrepancySeverity {
    switch (category) {
      case 'removed':
        return 'breaking';
      case 'added':
        return 'major';
      case 'modified':
      default:
        return 'minor';
    }
  }

  private recommendAction(severity: DiscrepancySeverity): DiscrepancyRecommendation {
    const actionMap: Record<DiscrepancySeverity, DiscrepancyRecommendation> = {
      trivial: 'auto-update',
      minor: 'review-required',
      major: 'notify',
      breaking: 'alert',
    };
    return actionMap[severity];
  }

  private calculateSummary(discrepancies: Discrepancy[]): DetectionResult['summary'] {
    const summary: DetectionResult['summary'] = {
      total: discrepancies.length,
      byCategory: { added: 0, removed: 0, modified: 0 },
      bySeverity: { trivial: 0, minor: 0, major: 0, breaking: 0 },
      byType: { 'api-route': 0, 'function-signature': 0, 'type-definition': 0 },
    };

    for (const d of discrepancies) {
      summary.byCategory[d.category]++;
      summary.bySeverity[d.severity]++;
      summary.byType[d.type]++;
    }

    return summary;
  }
}
