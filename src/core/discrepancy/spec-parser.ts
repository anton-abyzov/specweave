/**
 * Spec Parser
 *
 * Parses living docs to extract documented API endpoints and function signatures.
 *
 * @module core/discrepancy/spec-parser
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * Type of specification (API route or function).
 */
export type SpecType = 'api' | 'function' | 'type';

/**
 * Represents a parsed specification from living docs.
 */
export interface ParsedSpec {
  type: SpecType;
  source: string;           // File path
  lineNumber: number;
  identifier: string;       // Route path or function name
  description: string;
  method?: string;          // HTTP method for API specs
  params?: string[];        // Route params or function params
  returnType?: string;      // Return type for functions
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for the spec parser.
 */
export interface SpecParserConfig {
  /** Base path for living docs */
  docsPath?: string;
}

/**
 * Result of spec parsing.
 */
export interface SpecParseResult {
  specs: ParsedSpec[];
  errors: string[];
}

/**
 * Parses living docs to extract documented behavior.
 */
export class SpecParser {
  private readonly logger: Logger;
  private readonly config: Required<SpecParserConfig>;

  constructor(options: { logger?: Logger; config?: SpecParserConfig } = {}) {
    this.logger = options.logger ?? consoleLogger;
    this.config = {
      docsPath: options.config?.docsPath ?? '.specweave/docs',
    };
  }

  /**
   * Parse all specs from the living docs directory.
   */
  async parseAll(docsPath?: string): Promise<SpecParseResult> {
    const basePath = docsPath ?? this.config.docsPath;
    const specs: ParsedSpec[] = [];
    const errors: string[] = [];

    if (!fs.existsSync(basePath)) {
      errors.push(`Docs path not found: ${basePath}`);
      return { specs, errors };
    }

    // Scan for markdown files
    const files = this.findMarkdownFiles(basePath);

    for (const file of files) {
      try {
        const result = await this.parseFile(file);
        specs.push(...result.specs);
        errors.push(...result.errors);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to parse ${file}: ${message}`);
      }
    }

    return { specs, errors };
  }

  /**
   * Parse a single markdown file for specs.
   */
  async parseFile(filePath: string): Promise<SpecParseResult> {
    const specs: ParsedSpec[] = [];
    const errors: string[] = [];

    if (!fs.existsSync(filePath)) {
      errors.push(`File not found: ${filePath}`);
      return { specs, errors };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Parse API route documentation
      const apiSpec = this.parseApiLine(line, i + 1, filePath);
      if (apiSpec) {
        // Look for description in following lines
        apiSpec.description = this.extractDescription(lines, i + 1);
        specs.push(apiSpec);
      }

      // Parse function documentation
      const funcSpec = this.parseFunctionLine(line, i + 1, filePath);
      if (funcSpec) {
        funcSpec.description = this.extractDescription(lines, i + 1);
        specs.push(funcSpec);
      }

      // Parse type documentation
      const typeSpec = this.parseTypeLine(line, i + 1, filePath);
      if (typeSpec) {
        typeSpec.description = this.extractDescription(lines, i + 1);
        specs.push(typeSpec);
      }
    }

    return { specs, errors };
  }

  /**
   * Parse API specs from a docs path.
   */
  async parseApiSpecs(docsPath: string): Promise<ParsedSpec[]> {
    const result = await this.parseAll(docsPath);
    return result.specs.filter(s => s.type === 'api');
  }

  /**
   * Parse function specs from a docs path.
   */
  async parseFunctionSpecs(docsPath: string): Promise<ParsedSpec[]> {
    const result = await this.parseAll(docsPath);
    return result.specs.filter(s => s.type === 'function');
  }

  private parseApiLine(line: string, lineNumber: number, filePath: string): ParsedSpec | null {
    // Pattern: ## GET /users or ### POST /api/users
    const apiPattern = /^#{2,4}\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(\S+)/i;
    const match = line.match(apiPattern);

    if (!match) return null;

    const method = match[1].toUpperCase();
    const routePath = match[2];
    const params = this.extractRouteParams(routePath);

    return {
      type: 'api',
      source: filePath,
      lineNumber,
      identifier: routePath,
      description: '',
      method,
      params,
    };
  }

  private parseFunctionLine(line: string, lineNumber: number, filePath: string): ParsedSpec | null {
    // Pattern: ### functionName(param1: type, param2: type): returnType
    // Or: ### `functionName(param1, param2)`
    const funcPattern = /^#{2,4}\s+`?(\w+)\s*\(([^)]*)\)\s*(?::\s*(\w+))?`?/;
    const match = line.match(funcPattern);

    if (!match) return null;

    const name = match[1];
    const paramsStr = match[2];
    const returnType = match[3];

    // Parse parameters
    const params = paramsStr
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    return {
      type: 'function',
      source: filePath,
      lineNumber,
      identifier: name,
      description: '',
      params,
      returnType,
    };
  }

  private parseTypeLine(line: string, lineNumber: number, filePath: string): ParsedSpec | null {
    // Pattern: ### interface TypeName or ### type TypeName
    const typePattern = /^#{2,4}\s+(interface|type|class)\s+(\w+)/i;
    const match = line.match(typePattern);

    if (!match) return null;

    const kind = match[1].toLowerCase();
    const name = match[2];

    return {
      type: 'type',
      source: filePath,
      lineNumber,
      identifier: name,
      description: '',
      metadata: { kind },
    };
  }

  private extractDescription(lines: string[], startIndex: number): string {
    const descriptionLines: string[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];

      // Stop at next heading
      if (/^#{1,6}\s/.test(line)) break;

      // Stop at empty line followed by heading
      if (line.trim() === '' && i + 1 < lines.length && /^#{1,6}\s/.test(lines[i + 1])) break;

      // Skip empty lines at the start
      if (descriptionLines.length === 0 && line.trim() === '') continue;

      // Add non-empty content
      if (line.trim()) {
        descriptionLines.push(line.trim());
      }

      // Stop after a few lines of description
      if (descriptionLines.length >= 3) break;
    }

    return descriptionLines.join(' ').slice(0, 500);
  }

  private extractRouteParams(routePath: string): string[] {
    // Extract :param or {param} from path
    const colonParams = routePath.match(/:([^/]+)/g) || [];
    const braceParams = routePath.match(/\{([^}]+)\}/g) || [];

    return [
      ...colonParams.map(p => p.slice(1)),
      ...braceParams.map(p => p.slice(1, -1)),
    ];
  }

  private findMarkdownFiles(dir: string): string[] {
    const files: string[] = [];

    const scan = (currentDir: string): void => {
      if (!fs.existsSync(currentDir)) return;

      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip common non-doc directories
          if (['node_modules', '.git', 'dist', '_archive'].includes(entry.name)) continue;
          scan(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    };

    scan(dir);
    return files;
  }
}
