/**
 * API Route Analyzer
 *
 * Extracts API routes from Express, Fastify, and Next.js projects.
 *
 * @module core/discrepancy/analyzers/api-route-analyzer
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { Logger, consoleLogger } from '../../../utils/logger.js';

/**
 * HTTP methods supported by the analyzer.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * Represents an API route extracted from code.
 */
export interface ApiRoute {
  method: HttpMethod;
  path: string;
  filePath: string;
  lineNumber: number;
  params: string[];           // Dynamic path params like :id
  framework: 'express' | 'fastify' | 'nextjs' | 'unknown';
  handlerName?: string;       // Name of the handler function if available
}

/**
 * Configuration for the API route analyzer.
 */
export interface ApiRouteAnalyzerConfig {
  /** Project root directory */
  projectRoot?: string;
  /** Patterns for Express/Fastify routes */
  routePatterns?: string[];
  /** Directory for Next.js API routes */
  nextjsApiDir?: string;
}

/**
 * Result of route analysis.
 */
export interface RouteAnalysisResult {
  routes: ApiRoute[];
  errors: string[];
}

/**
 * Analyzes projects to extract API routes from Express, Fastify, and Next.js.
 */
export class ApiRouteAnalyzer {
  private readonly logger: Logger;
  private readonly config: Required<ApiRouteAnalyzerConfig>;

  constructor(options: { logger?: Logger; config?: ApiRouteAnalyzerConfig } = {}) {
    this.logger = options.logger ?? consoleLogger;
    this.config = {
      projectRoot: options.config?.projectRoot ?? process.cwd(),
      routePatterns: options.config?.routePatterns ?? ['src/**/*.ts', 'routes/**/*.ts'],
      nextjsApiDir: options.config?.nextjsApiDir ?? 'pages/api',
    };
  }

  /**
   * Analyze a project for API routes.
   */
  async analyze(projectRoot?: string): Promise<RouteAnalysisResult> {
    const root = projectRoot ?? this.config.projectRoot;
    const routes: ApiRoute[] = [];
    const errors: string[] = [];

    // Detect Next.js API routes
    const nextjsRoutes = await this.analyzeNextjsRoutes(root);
    routes.push(...nextjsRoutes.routes);
    errors.push(...nextjsRoutes.errors);

    return { routes, errors };
  }

  /**
   * Analyze a list of files for Express/Fastify routes.
   */
  async analyzeFiles(files: string[]): Promise<RouteAnalysisResult> {
    const routes: ApiRoute[] = [];
    const errors: string[] = [];

    for (const filePath of files) {
      try {
        const result = await this.analyzeFile(filePath);
        routes.push(...result.routes);
        errors.push(...result.errors);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to analyze ${filePath}: ${message}`);
        this.logger.warn(`Failed to analyze ${filePath}: ${message}`);
      }
    }

    return { routes, errors };
  }

  /**
   * Analyze a single file for Express/Fastify routes.
   */
  async analyzeFile(filePath: string): Promise<RouteAnalysisResult> {
    const routes: ApiRoute[] = [];
    const errors: string[] = [];

    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(this.config.projectRoot, filePath);

    if (!fs.existsSync(absolutePath)) {
      errors.push(`File not found: ${absolutePath}`);
      return { routes, errors };
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      absolutePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const visit = (node: ts.Node): void => {
      // Look for Express-style routes: app.get('/path', handler)
      if (ts.isCallExpression(node)) {
        const route = this.extractExpressRoute(node, sourceFile, absolutePath);
        if (route) routes.push(route);

        // Look for Fastify-style routes: fastify.route({ method: 'GET', url: '/path' })
        const fastifyRoute = this.extractFastifyRoute(node, sourceFile, absolutePath);
        if (fastifyRoute) routes.push(fastifyRoute);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return { routes, errors };
  }

  /**
   * Analyze Next.js API routes from the pages/api directory.
   */
  async analyzeNextjsRoutes(projectRoot: string): Promise<RouteAnalysisResult> {
    const routes: ApiRoute[] = [];
    const errors: string[] = [];

    // Check both pages/api and app/api (Next.js 13+)
    const apiDirs = [
      path.join(projectRoot, 'pages', 'api'),
      path.join(projectRoot, 'src', 'pages', 'api'),
      path.join(projectRoot, 'app', 'api'),
      path.join(projectRoot, 'src', 'app', 'api'),
    ];

    for (const apiDir of apiDirs) {
      if (fs.existsSync(apiDir)) {
        const nextRoutes = await this.scanNextjsApiDir(apiDir, apiDir);
        routes.push(...nextRoutes);
      }
    }

    return { routes, errors };
  }

  private async scanNextjsApiDir(dir: string, baseDir: string): Promise<ApiRoute[]> {
    if (!fs.existsSync(dir)) return [];

    const routes: ApiRoute[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subRoutes = await this.scanNextjsApiDir(fullPath, baseDir);
        routes.push(...subRoutes);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.startsWith('_')) {
        const route = this.parseNextjsRoute(fullPath, baseDir);
        if (route) {
          routes.push(...route);
        }
      }
    }

    return routes;
  }

  private parseNextjsRoute(filePath: string, baseDir: string): ApiRoute[] | null {
    // Convert file path to route path
    // pages/api/users/[id].ts -> /api/users/:id
    const relativePath = path.relative(baseDir, filePath);
    let routePath = '/' + relativePath
      .replace(/\\/g, '/')           // Windows paths
      .replace(/\.(ts|tsx|js|jsx)$/, '') // Remove extension
      .replace(/\/index$/, '')       // /index -> /
      .replace(/\[\.\.\.([^\]]+)\]/g, '*$1')  // [...slug] -> *slug (catch-all)
      .replace(/\[([^\]]+)\]/g, ':$1');  // [id] -> :id

    // Ensure path starts with /api
    if (!routePath.startsWith('/api')) {
      routePath = '/api' + routePath;
    }

    // Extract params from path
    const params = (routePath.match(/:([^/]+)/g) || []).map(p => p.slice(1));

    // Parse the file to detect exported HTTP methods
    const content = fs.readFileSync(filePath, 'utf-8');
    const methods = this.detectNextjsExportedMethods(content);

    if (methods.length === 0) {
      // Default export = all methods
      return [{
        method: 'GET', // Default, but could be any
        path: routePath,
        filePath,
        lineNumber: 1,
        params,
        framework: 'nextjs',
      }];
    }

    return methods.map(method => ({
      method,
      path: routePath,
      filePath,
      lineNumber: 1,
      params,
      framework: 'nextjs',
    }));
  }

  private detectNextjsExportedMethods(content: string): HttpMethod[] {
    const methods: HttpMethod[] = [];

    // Next.js 13+ App Router style
    const exportPatterns: { pattern: RegExp; method: HttpMethod }[] = [
      { pattern: /export\s+(async\s+)?function\s+GET\s*\(/i, method: 'GET' },
      { pattern: /export\s+(async\s+)?function\s+POST\s*\(/i, method: 'POST' },
      { pattern: /export\s+(async\s+)?function\s+PUT\s*\(/i, method: 'PUT' },
      { pattern: /export\s+(async\s+)?function\s+DELETE\s*\(/i, method: 'DELETE' },
      { pattern: /export\s+(async\s+)?function\s+PATCH\s*\(/i, method: 'PATCH' },
      { pattern: /export\s+const\s+GET\s*=/i, method: 'GET' },
      { pattern: /export\s+const\s+POST\s*=/i, method: 'POST' },
      { pattern: /export\s+const\s+PUT\s*=/i, method: 'PUT' },
      { pattern: /export\s+const\s+DELETE\s*=/i, method: 'DELETE' },
      { pattern: /export\s+const\s+PATCH\s*=/i, method: 'PATCH' },
    ];

    for (const { pattern, method } of exportPatterns) {
      if (pattern.test(content)) {
        methods.push(method);
      }
    }

    return methods;
  }

  private extractExpressRoute(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): ApiRoute | null {
    // Pattern: app.get('/path', handler) or router.get('/path', handler)
    if (!ts.isPropertyAccessExpression(node.expression)) return null;

    const methodName = node.expression.name.text.toUpperCase();
    if (!this.isHttpMethod(methodName)) return null;

    // First argument should be the path
    if (node.arguments.length < 1) return null;
    const pathArg = node.arguments[0];

    let routePath: string;
    if (ts.isStringLiteral(pathArg)) {
      routePath = pathArg.text;
    } else if (ts.isTemplateExpression(pathArg)) {
      routePath = pathArg.getText(sourceFile);
    } else {
      return null;
    }

    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const params = this.extractRouteParams(routePath);

    // Try to get handler name
    let handlerName: string | undefined;
    const handlerArg = node.arguments[node.arguments.length - 1];
    if (ts.isIdentifier(handlerArg)) {
      handlerName = handlerArg.text;
    }

    return {
      method: methodName as HttpMethod,
      path: routePath,
      filePath,
      lineNumber: line + 1,
      params,
      framework: 'express',
      handlerName,
    };
  }

  private extractFastifyRoute(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): ApiRoute | null {
    // Pattern: fastify.route({ method: 'GET', url: '/path', handler: fn })
    if (!ts.isPropertyAccessExpression(node.expression)) return null;
    if (node.expression.name.text !== 'route') return null;

    // First argument should be an object literal
    if (node.arguments.length < 1) return null;
    const configArg = node.arguments[0];
    if (!ts.isObjectLiteralExpression(configArg)) return null;

    let method: HttpMethod | undefined;
    let routePath: string | undefined;

    for (const prop of configArg.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      if (!ts.isIdentifier(prop.name)) continue;

      const propName = prop.name.text;

      if (propName === 'method' && ts.isStringLiteral(prop.initializer)) {
        const m = prop.initializer.text.toUpperCase();
        if (this.isHttpMethod(m)) {
          method = m as HttpMethod;
        }
      }

      if (propName === 'url' && ts.isStringLiteral(prop.initializer)) {
        routePath = prop.initializer.text;
      }
    }

    if (!method || !routePath) return null;

    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const params = this.extractRouteParams(routePath);

    return {
      method,
      path: routePath,
      filePath,
      lineNumber: line + 1,
      params,
      framework: 'fastify',
    };
  }

  private extractRouteParams(routePath: string): string[] {
    // Extract :param or :param? from path
    const matches = routePath.match(/:([^/]+)/g) || [];
    return matches.map(p => p.slice(1).replace('?', ''));
  }

  private isHttpMethod(method: string): method is HttpMethod {
    return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(method);
  }
}
