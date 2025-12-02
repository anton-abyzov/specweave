/**
 * TypeScript Code Analyzer
 *
 * Extracts function signatures and type definitions from TypeScript files
 * using the TypeScript Compiler API.
 *
 * @module core/discrepancy/analyzers/typescript-analyzer
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { Logger, consoleLogger } from '../../../utils/logger.js';

/**
 * Represents a function parameter with name and type.
 */
export interface FunctionParam {
  name: string;
  type: string;
  optional: boolean;
}

/**
 * Represents a function signature extracted from code.
 */
export interface FunctionSignature {
  name: string;
  filePath: string;
  lineNumber: number;
  params: FunctionParam[];
  returnType: string;
  exported: boolean;
  async: boolean;
  jsdoc?: string;
}

/**
 * Represents a type definition (interface, type alias, or class).
 */
export interface TypeDefinition {
  name: string;
  filePath: string;
  lineNumber: number;
  kind: 'interface' | 'type' | 'class';
  exported: boolean;
  properties?: { name: string; type: string; optional: boolean }[];
}

/**
 * Configuration for the TypeScript analyzer.
 */
export interface TypeScriptAnalyzerConfig {
  /** Glob patterns to include (default: ['**\/*.ts']) */
  include?: string[];
  /** Glob patterns to exclude (default: ['**\/*.test.ts', 'node_modules/**']) */
  exclude?: string[];
  /** Base directory for relative paths */
  basePath?: string;
}

/**
 * Result of TypeScript analysis.
 */
export interface AnalysisResult {
  functions: FunctionSignature[];
  types: TypeDefinition[];
  errors: string[];
}

/**
 * Analyzes TypeScript files to extract function signatures and type definitions.
 */
export class TypeScriptAnalyzer {
  private readonly logger: Logger;
  private readonly config: Required<TypeScriptAnalyzerConfig>;

  constructor(options: { logger?: Logger; config?: TypeScriptAnalyzerConfig } = {}) {
    this.logger = options.logger ?? consoleLogger;
    this.config = {
      include: options.config?.include ?? ['**/*.ts'],
      exclude: options.config?.exclude ?? ['**/*.test.ts', '**/*.spec.ts', 'node_modules/**', 'dist/**'],
      basePath: options.config?.basePath ?? process.cwd(),
    };
  }

  /**
   * Analyze a list of TypeScript files.
   */
  async analyze(files: string[]): Promise<AnalysisResult> {
    const functions: FunctionSignature[] = [];
    const types: TypeDefinition[] = [];
    const errors: string[] = [];

    for (const filePath of files) {
      try {
        const result = await this.analyzeFile(filePath);
        functions.push(...result.functions);
        types.push(...result.types);
        errors.push(...result.errors);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to analyze ${filePath}: ${message}`);
        this.logger.warn(`Failed to analyze ${filePath}: ${message}`);
      }
    }

    return { functions, types, errors };
  }

  /**
   * Analyze a single TypeScript file.
   */
  async analyzeFile(filePath: string): Promise<AnalysisResult> {
    const functions: FunctionSignature[] = [];
    const types: TypeDefinition[] = [];
    const errors: string[] = [];

    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(this.config.basePath, filePath);

    if (!fs.existsSync(absolutePath)) {
      errors.push(`File not found: ${absolutePath}`);
      return { functions, types, errors };
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      absolutePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const visit = (node: ts.Node): void => {
      // Check for function declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        const sig = this.extractFunctionSignature(node, sourceFile, absolutePath);
        if (sig) functions.push(sig);
      }

      // Check for arrow functions assigned to const/let
      if (ts.isVariableStatement(node)) {
        const exported = this.hasExportModifier(node);
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.initializer) {
            if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
              const sig = this.extractArrowFunctionSignature(
                decl.name.text,
                decl.initializer,
                sourceFile,
                absolutePath,
                exported
              );
              if (sig) functions.push(sig);
            }
          }
        }
      }

      // Check for method declarations in classes
      if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
        const parent = node.parent;
        if (ts.isClassDeclaration(parent)) {
          const sig = this.extractMethodSignature(node, sourceFile, absolutePath, parent);
          if (sig) functions.push(sig);
        }
      }

      // Check for interface declarations
      if (ts.isInterfaceDeclaration(node)) {
        const typeDef = this.extractInterfaceDefinition(node, sourceFile, absolutePath);
        if (typeDef) types.push(typeDef);
      }

      // Check for type alias declarations
      if (ts.isTypeAliasDeclaration(node)) {
        const typeDef = this.extractTypeAliasDefinition(node, sourceFile, absolutePath);
        if (typeDef) types.push(typeDef);
      }

      // Check for class declarations
      if (ts.isClassDeclaration(node) && node.name) {
        const typeDef = this.extractClassDefinition(node, sourceFile, absolutePath);
        if (typeDef) types.push(typeDef);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return { functions, types, errors };
  }

  private extractFunctionSignature(
    node: ts.FunctionDeclaration,
    sourceFile: ts.SourceFile,
    filePath: string
  ): FunctionSignature | null {
    if (!node.name) return null;

    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const exported = this.hasExportModifier(node);
    const jsdoc = this.extractJSDoc(node, sourceFile);

    return {
      name: node.name.text,
      filePath,
      lineNumber: line + 1,
      params: this.extractParameters(node.parameters, sourceFile),
      returnType: this.extractReturnType(node, sourceFile),
      exported,
      async: this.hasAsyncModifier(node),
      jsdoc,
    };
  }

  private extractArrowFunctionSignature(
    name: string,
    node: ts.ArrowFunction | ts.FunctionExpression,
    sourceFile: ts.SourceFile,
    filePath: string,
    exported: boolean
  ): FunctionSignature {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    return {
      name,
      filePath,
      lineNumber: line + 1,
      params: this.extractParameters(node.parameters, sourceFile),
      returnType: this.extractReturnType(node, sourceFile),
      exported,
      async: this.hasAsyncModifier(node),
    };
  }

  private extractMethodSignature(
    node: ts.MethodDeclaration,
    sourceFile: ts.SourceFile,
    filePath: string,
    classNode: ts.ClassDeclaration
  ): FunctionSignature | null {
    if (!node.name || !ts.isIdentifier(node.name)) return null;

    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const className = classNode.name?.text ?? 'AnonymousClass';
    const exported = this.hasExportModifier(classNode);
    const jsdoc = this.extractJSDoc(node, sourceFile);

    return {
      name: `${className}.${node.name.text}`,
      filePath,
      lineNumber: line + 1,
      params: this.extractParameters(node.parameters, sourceFile),
      returnType: this.extractReturnType(node, sourceFile),
      exported,
      async: this.hasAsyncModifier(node),
      jsdoc,
    };
  }

  private extractInterfaceDefinition(
    node: ts.InterfaceDeclaration,
    sourceFile: ts.SourceFile,
    filePath: string
  ): TypeDefinition {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    return {
      name: node.name.text,
      filePath,
      lineNumber: line + 1,
      kind: 'interface',
      exported: this.hasExportModifier(node),
      properties: this.extractInterfaceProperties(node, sourceFile),
    };
  }

  private extractTypeAliasDefinition(
    node: ts.TypeAliasDeclaration,
    sourceFile: ts.SourceFile,
    filePath: string
  ): TypeDefinition {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    return {
      name: node.name.text,
      filePath,
      lineNumber: line + 1,
      kind: 'type',
      exported: this.hasExportModifier(node),
    };
  }

  private extractClassDefinition(
    node: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
    filePath: string
  ): TypeDefinition | null {
    if (!node.name) return null;

    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    return {
      name: node.name.text,
      filePath,
      lineNumber: line + 1,
      kind: 'class',
      exported: this.hasExportModifier(node),
    };
  }

  private extractParameters(
    params: ts.NodeArray<ts.ParameterDeclaration>,
    sourceFile: ts.SourceFile
  ): FunctionParam[] {
    return params.map((param) => {
      const name = ts.isIdentifier(param.name) ? param.name.text : param.name.getText(sourceFile);
      const type = param.type ? param.type.getText(sourceFile) : 'unknown';
      const optional = !!param.questionToken || !!param.initializer;

      return { name, type, optional };
    });
  }

  private extractReturnType(
    node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression | ts.MethodDeclaration,
    sourceFile: ts.SourceFile
  ): string {
    if (node.type) {
      return node.type.getText(sourceFile);
    }
    return 'unknown';
  }

  private extractInterfaceProperties(
    node: ts.InterfaceDeclaration,
    sourceFile: ts.SourceFile
  ): { name: string; type: string; optional: boolean }[] {
    const properties: { name: string; type: string; optional: boolean }[] = [];

    for (const member of node.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const name = ts.isIdentifier(member.name)
          ? member.name.text
          : member.name.getText(sourceFile);
        const type = member.type ? member.type.getText(sourceFile) : 'unknown';
        const optional = !!member.questionToken;
        properties.push({ name, type, optional });
      }
    }

    return properties;
  }

  private extractJSDoc(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
    const jsdocNodes = ts.getJSDocCommentsAndTags(node);
    if (jsdocNodes.length === 0) return undefined;

    const comments: string[] = [];
    for (const jsdoc of jsdocNodes) {
      if (ts.isJSDoc(jsdoc) && jsdoc.comment) {
        const comment = typeof jsdoc.comment === 'string'
          ? jsdoc.comment
          : jsdoc.comment.map(c => c.getText(sourceFile)).join('');
        comments.push(comment);
      }
    }

    return comments.length > 0 ? comments.join('\n') : undefined;
  }

  private hasExportModifier(node: ts.Node): boolean {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    return modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  }

  private hasAsyncModifier(node: ts.Node): boolean {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    return modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
  }
}
