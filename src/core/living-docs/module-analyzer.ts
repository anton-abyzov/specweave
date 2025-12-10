/**
 * Module Analyzer - Deep Dive Phase for Living Docs Builder
 *
 * Analyzes individual modules to generate detailed documentation:
 * 1. Select representative files based on sampling config
 * 2. Extract exports, types, and dependencies
 * 3. Generate module summary and documentation
 *
 * This is a SKELETON implementation - full LLM integration deferred.
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import type { ModuleInfo, SamplingConfig } from './discovery.js';
import { selectRepresentativeFiles } from './discovery.js';
import type { WorkItemMatch } from './workitem-matcher.js';

/**
 * Analyzed file information
 */
export interface AnalyzedFile {
  /** File path relative to module */
  path: string;
  /** File size in bytes */
  size: number;
  /** Detected file type */
  type: 'source' | 'test' | 'config' | 'doc';
  /** Extracted exports */
  exports: ExportInfo[];
  /** Import dependencies */
  imports: ImportInfo[];
  /** Line count */
  lineCount: number;
}

/**
 * Export information
 */
export interface ExportInfo {
  /** Export name */
  name: string;
  /** Export type */
  type: 'function' | 'class' | 'const' | 'interface' | 'type' | 'default' | 'unknown';
  /** Is default export */
  isDefault: boolean;
  /** Line number */
  line?: number;
}

/**
 * Import information
 */
export interface ImportInfo {
  /** Module/package being imported */
  from: string;
  /** Is external package (not relative) */
  isExternal: boolean;
  /** Named imports */
  names: string[];
}

/**
 * Module analysis result
 */
export interface ModuleAnalysis {
  /** Module name */
  moduleName: string;
  /** Module path */
  modulePath: string;
  /** Analysis timestamp */
  analyzedAt: string;
  /** Files analyzed */
  filesAnalyzed: AnalyzedFile[];
  /** Files skipped (due to sampling) */
  filesSkipped: number;
  /** Total exports found */
  totalExports: number;
  /** External dependencies */
  externalDeps: string[];
  /** Internal dependencies (other modules) */
  internalDeps: string[];
  /** Related work items */
  relatedWorkItems: Array<{ id: string; title: string; score: number }>;
  /** Generated summary (placeholder) */
  summary: string;
  /** Documentation status */
  docStatus: 'generated' | 'partial' | 'skipped';
  /** AI-generated insights (added after initial analysis) */
  aiInsights?: AIModuleInsights;
}

/**
 * Progress callback
 */
export type AnalyzerProgressCallback = (
  moduleName: string,
  fileIndex: number,
  totalFiles: number
) => void;

/**
 * Analyze a single module
 */
export async function analyzeModule(
  projectPath: string,
  module: ModuleInfo,
  samplingConfig: SamplingConfig,
  workItemMatches: WorkItemMatch[],
  onProgress?: AnalyzerProgressCallback
): Promise<ModuleAnalysis> {
  const modulePath = path.join(projectPath, module.path);

  // Get files to analyze based on sampling config
  const allFiles = getModuleFiles(modulePath);
  const filesToAnalyze = selectRepresentativeFiles(
    allFiles,
    samplingConfig.filesPerDir,
    module.name
  );

  const analyzedFiles: AnalyzedFile[] = [];
  const allImports = new Set<string>();
  const externalDeps = new Set<string>();
  const internalDeps = new Set<string>();
  let totalExports = 0;

  // Analyze each file
  for (let i = 0; i < filesToAnalyze.length; i++) {
    onProgress?.(module.name, i + 1, filesToAnalyze.length);

    const filePath = filesToAnalyze[i];
    const analysis = await analyzeFile(projectPath, modulePath, filePath);

    if (analysis) {
      analyzedFiles.push(analysis);
      totalExports += analysis.exports.length;

      // Collect dependencies
      for (const imp of analysis.imports) {
        allImports.add(imp.from);
        if (imp.isExternal) {
          // Extract package name (handle scoped packages)
          const pkgName = imp.from.startsWith('@')
            ? imp.from.split('/').slice(0, 2).join('/')
            : imp.from.split('/')[0];
          externalDeps.add(pkgName);
        } else {
          // Check if it references another module
          const normalizedPath = normalizeImportPath(module.path, imp.from);
          const depModule = findModuleForPath(normalizedPath);
          if (depModule && depModule !== module.name) {
            internalDeps.add(depModule);
          }
        }
      }
    }
  }

  // Generate summary (placeholder - LLM integration deferred)
  const summary = generatePlaceholderSummary(module, analyzedFiles, totalExports);

  return {
    moduleName: module.name,
    modulePath: module.path,
    analyzedAt: new Date().toISOString(),
    filesAnalyzed: analyzedFiles,
    filesSkipped: allFiles.length - filesToAnalyze.length,
    totalExports,
    externalDeps: [...externalDeps],
    internalDeps: [...internalDeps],
    relatedWorkItems: workItemMatches.map(m => ({
      id: m.workItem.id,
      title: m.workItem.title,
      score: m.score
    })),
    summary,
    docStatus: analyzedFiles.length > 0 ? 'generated' : 'skipped'
  };
}

/**
 * Get all files in a module directory
 */
function getModuleFiles(modulePath: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(modulePath)) {
    return files;
  }

  function scanDir(dir: string, prefix: string = ''): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        // Skip common non-source directories
        if (!['node_modules', 'dist', 'build', '.git', '__pycache__'].includes(entry.name)) {
          scanDir(fullPath, relativePath);
        }
      } else if (entry.isFile()) {
        // Only include source files
        if (isSourceFile(entry.name)) {
          files.push(relativePath);
        }
      }
    }
  }

  scanDir(modulePath);
  return files;
}

/**
 * Check if a file is a source file
 */
function isSourceFile(filename: string): boolean {
  const sourceExtensions = [
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.py', '.go', '.rs', '.java', '.kt', '.swift',
    '.rb', '.php', '.cs', '.cpp', '.c', '.h'
  ];

  return sourceExtensions.some(ext => filename.endsWith(ext));
}

/**
 * Analyze a single file
 */
async function analyzeFile(
  projectPath: string,
  modulePath: string,
  relativePath: string
): Promise<AnalyzedFile | null> {
  const fullPath = path.join(modulePath, relativePath);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const stats = fs.statSync(fullPath);
    const lines = content.split('\n');

    // Determine file type
    const type = getFileType(relativePath);

    // Extract exports and imports based on file extension
    const ext = path.extname(relativePath);
    let exports: ExportInfo[] = [];
    let imports: ImportInfo[] = [];

    if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
      exports = extractJsExports(content);
      imports = extractJsImports(content);
    } else if (ext === '.py') {
      exports = extractPythonExports(content);
      imports = extractPythonImports(content);
    }
    // Add more language support as needed

    return {
      path: relativePath,
      size: stats.size,
      type,
      exports,
      imports,
      lineCount: lines.length
    };
  } catch {
    return null;
  }
}

/**
 * Get file type from path
 */
function getFileType(filePath: string): 'source' | 'test' | 'config' | 'doc' {
  const name = path.basename(filePath).toLowerCase();

  if (name.includes('.test.') || name.includes('.spec.') || filePath.includes('__tests__')) {
    return 'test';
  }

  if (name.includes('config') || name.includes('rc.') || name === '.env') {
    return 'config';
  }

  if (name.endsWith('.md') || name.endsWith('.rst') || name.endsWith('.txt')) {
    return 'doc';
  }

  return 'source';
}

/**
 * Extract exports from JavaScript/TypeScript
 */
function extractJsExports(content: string): ExportInfo[] {
  const exports: ExportInfo[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // export default
    if (/^\s*export\s+default\s+/.test(line)) {
      const match = line.match(/export\s+default\s+(class|function|const)?\s*(\w+)?/);
      exports.push({
        name: match?.[2] || 'default',
        type: (match?.[1] as ExportInfo['type']) || 'default',
        isDefault: true,
        line: i + 1
      });
    }
    // export const/let/var
    else if (/^\s*export\s+(const|let|var)\s+/.test(line)) {
      const match = line.match(/export\s+(?:const|let|var)\s+(\w+)/);
      if (match) {
        exports.push({
          name: match[1],
          type: 'const',
          isDefault: false,
          line: i + 1
        });
      }
    }
    // export function
    else if (/^\s*export\s+(?:async\s+)?function\s+/.test(line)) {
      const match = line.match(/export\s+(?:async\s+)?function\s+(\w+)/);
      if (match) {
        exports.push({
          name: match[1],
          type: 'function',
          isDefault: false,
          line: i + 1
        });
      }
    }
    // export class
    else if (/^\s*export\s+class\s+/.test(line)) {
      const match = line.match(/export\s+class\s+(\w+)/);
      if (match) {
        exports.push({
          name: match[1],
          type: 'class',
          isDefault: false,
          line: i + 1
        });
      }
    }
    // export interface
    else if (/^\s*export\s+interface\s+/.test(line)) {
      const match = line.match(/export\s+interface\s+(\w+)/);
      if (match) {
        exports.push({
          name: match[1],
          type: 'interface',
          isDefault: false,
          line: i + 1
        });
      }
    }
    // export type
    else if (/^\s*export\s+type\s+/.test(line)) {
      const match = line.match(/export\s+type\s+(\w+)/);
      if (match) {
        exports.push({
          name: match[1],
          type: 'type',
          isDefault: false,
          line: i + 1
        });
      }
    }
  }

  return exports;
}

/**
 * Extract imports from JavaScript/TypeScript
 */
function extractJsImports(content: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // import { x, y } from 'module'
    // import x from 'module'
    // import * as x from 'module'
    const match = line.match(/^\s*import\s+(?:(?:\{([^}]+)\}|(\w+)|\*\s+as\s+(\w+))(?:\s*,\s*)?)+\s*from\s*['"]([^'"]+)['"]/);

    if (match) {
      const from = match[4];
      const isExternal = !from.startsWith('.') && !from.startsWith('/');

      // Collect named imports
      const names: string[] = [];
      if (match[1]) {
        names.push(...match[1].split(',').map(n => n.trim().split(' ')[0]));
      }
      if (match[2]) {
        names.push(match[2]);
      }
      if (match[3]) {
        names.push(match[3]);
      }

      imports.push({ from, isExternal, names });
    }
  }

  return imports;
}

/**
 * Extract exports from Python
 */
function extractPythonExports(content: string): ExportInfo[] {
  const exports: ExportInfo[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // def function_name
    if (/^def\s+\w+/.test(line)) {
      const match = line.match(/^def\s+(\w+)/);
      if (match && !match[1].startsWith('_')) {
        exports.push({
          name: match[1],
          type: 'function',
          isDefault: false,
          line: i + 1
        });
      }
    }
    // class ClassName
    else if (/^class\s+\w+/.test(line)) {
      const match = line.match(/^class\s+(\w+)/);
      if (match && !match[1].startsWith('_')) {
        exports.push({
          name: match[1],
          type: 'class',
          isDefault: false,
          line: i + 1
        });
      }
    }
  }

  return exports;
}

/**
 * Extract imports from Python
 */
function extractPythonImports(content: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // from module import x, y
    const fromMatch = line.match(/^from\s+([^\s]+)\s+import\s+(.+)/);
    if (fromMatch) {
      const from = fromMatch[1];
      const isExternal = !from.startsWith('.');
      const names = fromMatch[2].split(',').map(n => n.trim().split(' ')[0]);
      imports.push({ from, isExternal, names });
    }

    // import module
    const importMatch = line.match(/^import\s+([^\s,]+)/);
    if (importMatch && !fromMatch) {
      const from = importMatch[1];
      const isExternal = !from.startsWith('.');
      imports.push({ from, isExternal, names: [from.split('.')[0]] });
    }
  }

  return imports;
}

/**
 * Normalize import path to module path
 */
function normalizeImportPath(modulePath: string, importPath: string): string {
  if (!importPath.startsWith('.')) {
    return importPath;
  }

  const parts = modulePath.split('/');
  const importParts = importPath.split('/');

  for (const part of importParts) {
    if (part === '..') {
      parts.pop();
    } else if (part !== '.') {
      parts.push(part);
    }
  }

  return parts.join('/');
}

/**
 * Find module name for a path (simplified)
 */
function findModuleForPath(normalizedPath: string): string | null {
  // Extract first directory segment as module name
  const parts = normalizedPath.split('/').filter(p => p && p !== 'src');
  return parts[0] || null;
}

/**
 * AI insights for module analysis (optional, from LLM)
 */
export interface AIModuleInsights {
  purpose?: string;
  integrationPoints?: string[];
  patterns?: Array<{ name: string; evidence: string }>;
}

/**
 * Module dependency information
 */
export interface ModuleDependencyInfo {
  imports: string[];
  importedBy: string[];
}

/**
 * Infer purpose from module name using common patterns
 */
function inferPurposeFromName(name: string): string {
  const patterns: Record<string, string> = {
    'cli': 'Command-line interface for user interaction and command execution.',
    'core': 'Core business logic and domain models.',
    'api': 'API layer handling HTTP requests and responses.',
    'utils': 'Shared utility functions and helpers.',
    'services': 'Service layer orchestrating business operations.',
    'types': 'TypeScript type definitions and interfaces.',
    'integrations': 'External service integrations and adapters.',
    'models': 'Data models and schemas.',
    'controllers': 'Request handling and routing logic.',
    'middleware': 'Request/response processing middleware.',
    'config': 'Configuration management and settings.',
    'auth': 'Authentication and authorization handling.',
    'database': 'Database access and query management.',
    'workers': 'Background job processing and async tasks.',
    'hooks': 'Lifecycle hooks and event handlers.',
  };

  const lowerName = name.toLowerCase();

  // Check exact match first
  if (patterns[lowerName]) {
    return patterns[lowerName];
  }

  // Check if name contains any pattern keyword
  for (const [key, desc] of Object.entries(patterns)) {
    if (lowerName.includes(key)) {
      return desc;
    }
  }

  return `Provides ${name} functionality for the application.`;
}

/**
 * Format dependency list for markdown
 */
function formatDependencyList(deps: string[] | undefined, prefix: string): string {
  if (!deps || deps.length === 0) {
    return 'No dependencies detected.';
  }
  return `${prefix}:\n${deps.map(d => `- \`${d}\``).join('\n')}`;
}

/**
 * Format integration points for markdown
 */
function formatIntegrationPoints(points: string[] | undefined): string {
  if (!points || points.length === 0) {
    return 'No external integration points detected.';
  }
  return points.map(p => `- ${p}`).join('\n');
}

/**
 * Format patterns for markdown
 */
function formatPatterns(patterns: Array<{ name: string; evidence: string }> | undefined): string {
  if (!patterns || patterns.length === 0) {
    return 'No specific patterns detected.';
  }
  return patterns.map(p => `- **${p.name}**: ${p.evidence}`).join('\n');
}

/**
 * Generate rich module summary with Purpose, Dependencies, Dependents, Integration Points, and Patterns
 */
export function generateRichModuleSummary(
  module: ModuleInfo,
  analyzedFiles: AnalyzedFile[],
  totalExports: number,
  aiInsights?: AIModuleInsights,
  dependencyGraph?: ModuleDependencyInfo
): string {
  const sourceFiles = analyzedFiles.filter(f => f.type === 'source');
  const testFiles = analyzedFiles.filter(f => f.type === 'test');

  const sections: string[] = [
    `# ${module.name}`,
    '',
    `**Path**: \`${module.path}\``,
    '',
    '## Purpose',
    '',
    aiInsights?.purpose || inferPurposeFromName(module.name),
    '',
    '## Overview',
    '',
    `The ${module.name} module contains ${module.fileCount} files with approximately ${module.estimatedLOC.toLocaleString()} lines of code.`,
    '',
    '## Dependencies',
    '',
    formatDependencyList(dependencyGraph?.imports, 'This module imports from'),
    '',
    '## Dependents',
    '',
    formatDependencyList(dependencyGraph?.importedBy, 'This module is used by'),
    '',
    '## Integration Points',
    '',
    formatIntegrationPoints(aiInsights?.integrationPoints),
    '',
    '## Patterns Used',
    '',
    formatPatterns(aiInsights?.patterns),
    '',
    '## Analysis Summary',
    '',
    `- **Files Analyzed**: ${analyzedFiles.length}`,
    `- **Source Files**: ${sourceFiles.length}`,
    `- **Test Files**: ${testFiles.length}`,
    `- **Total Exports**: ${totalExports}`,
    ''
  ];

  // Top exports
  if (totalExports > 0) {
    sections.push('## Main Exports');
    sections.push('');

    const allExports = analyzedFiles.flatMap(f => f.exports);
    const topExports = allExports.slice(0, 10);

    for (const exp of topExports) {
      sections.push(`- \`${exp.name}\` (${exp.type})`);
    }

    if (allExports.length > 10) {
      sections.push(`- ...and ${allExports.length - 10} more exports`);
    }
    sections.push('');
  }

  sections.push('## Documentation Status');
  sections.push('');
  sections.push(`**Has README**: ${module.hasReadme ? 'Yes' : 'No'}`);
  sections.push(`**Has Tests**: ${testFiles.length > 0 ? 'Yes' : 'No'}`);
  sections.push('');
  sections.push('---');
  sections.push(`*Analysis generated on ${new Date().toISOString().split('T')[0]}*`);

  return sections.join('\n');
}

/**
 * Generate placeholder summary (no LLM) - delegates to rich summary with defaults
 */
function generatePlaceholderSummary(
  module: ModuleInfo,
  analyzedFiles: AnalyzedFile[],
  totalExports: number
): string {
  // Build dependency info from analyzed files
  const imports = new Set<string>();
  for (const file of analyzedFiles) {
    for (const imp of file.imports) {
      if (!imp.isExternal) {
        const moduleName = findModuleForPath(imp.from);
        if (moduleName && moduleName !== module.name) {
          imports.add(moduleName);
        }
      }
    }
  }

  const dependencyGraph: ModuleDependencyInfo = {
    imports: [...imports],
    importedBy: [] // Would need cross-module analysis to populate
  };

  return generateRichModuleSummary(
    module,
    analyzedFiles,
    totalExports,
    undefined, // No AI insights in placeholder mode
    dependencyGraph
  );
}

/**
 * Save module analysis to disk
 * Regenerates summary if AI insights are available
 */
export async function saveModuleAnalysis(
  projectPath: string,
  analysis: ModuleAnalysis
): Promise<string> {
  const outputDir = path.join(
    projectPath,
    '.specweave',
    'docs',
    'internal',
    'modules'
  );
  fs.ensureDirSync(outputDir);

  // If AI insights were added after initial analysis, regenerate summary with enriched data
  let summaryToWrite = analysis.summary;
  if (analysis.aiInsights) {
    // Count file extensions
    const extensions: Record<string, number> = {};
    for (const file of analysis.filesAnalyzed) {
      const ext = path.extname(file.path);
      extensions[ext] = (extensions[ext] || 0) + 1;
    }

    // Reconstruct module info for regeneration
    const moduleInfo: ModuleInfo = {
      name: analysis.moduleName,
      path: analysis.modulePath,
      fileCount: analysis.filesAnalyzed.length + analysis.filesSkipped,
      estimatedLOC: analysis.filesAnalyzed.reduce((sum, f) => sum + f.lineCount, 0),
      hasReadme: false, // Would need to check analyzed files
      hasTests: analysis.filesAnalyzed.some(f => f.type === 'test'),
      entryPoints: [], // Not available in this context
      extensions
    };

    // Build dependency graph from analyzed files
    const imports = new Set<string>();
    for (const file of analysis.filesAnalyzed) {
      for (const imp of file.imports) {
        if (!imp.isExternal) {
          const moduleName = findModuleForPath(imp.from);
          if (moduleName && moduleName !== moduleInfo.name) {
            imports.add(moduleName);
          }
        }
      }
    }

    const dependencyGraph: ModuleDependencyInfo = {
      imports: [...imports],
      importedBy: [] // Cross-module analysis not available in this context
    };

    summaryToWrite = generateRichModuleSummary(
      moduleInfo,
      analysis.filesAnalyzed,
      analysis.totalExports,
      analysis.aiInsights,
      dependencyGraph
    );
  }

  const outputPath = path.join(outputDir, `${analysis.moduleName}.md`);
  fs.writeFileSync(outputPath, summaryToWrite);

  return outputPath;
}
