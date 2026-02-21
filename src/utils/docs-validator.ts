/**
 * Documentation Pre-Render Validator
 *
 * Validates markdown/MDX files BEFORE Docusaurus server starts.
 * Catches issues proactively so users don't see cryptic webpack errors.
 *
 * Validates:
 * 1. YAML frontmatter syntax
 * 2. MDX/JSX compatibility (unquoted attrs, self-closing tags)
 * 3. Broken internal links
 * 4. Duplicate files/routes
 * 5. Invalid file names
 *
 * @module utils/docs-validator
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger, consoleLogger } from './logger.js';
import { sanitizeHtmlForMdx, validateMdxCompatibility } from './html-to-mdx.js';

/**
 * Issue severity levels
 */
export type IssueSeverity = 'error' | 'warning' | 'info';

/**
 * Single validation issue
 */
export interface ValidationIssue {
  file: string;
  line?: number;
  severity: IssueSeverity;
  type: string;
  message: string;
  autoFixable: boolean;
  fix?: () => void;
}

/**
 * Validation result summary
 */
export interface ValidationResult {
  valid: boolean;
  totalFiles: number;
  errors: number;
  warnings: number;
  infos: number;
  issues: ValidationIssue[];
  fixedCount: number;
}

/**
 * Validator options
 */
export interface DocsValidatorOptions {
  docsPath: string;
  autoFix?: boolean;
  logger?: Logger;
  /** File extensions to validate */
  extensions?: string[];
  /** Paths to ignore (relative to docsPath) */
  ignorePaths?: string[];
}

/**
 * Documentation Pre-Render Validator
 *
 * Use before starting Docusaurus to catch issues early.
 *
 * @example
 * ```typescript
 * const validator = new DocsValidator({
 *   docsPath: '.specweave/docs/internal',
 *   autoFix: true
 * });
 * const result = await validator.validate();
 * if (!result.valid) {
 *   console.log('Fix issues before starting docs server');
 * }
 * ```
 */
export class DocsValidator {
  private docsPath: string;
  private autoFix: boolean;
  private logger: Logger;
  private extensions: string[];
  private ignorePaths: string[];
  private issues: ValidationIssue[] = [];
  private fixedCount = 0;

  constructor(options: DocsValidatorOptions) {
    this.docsPath = path.resolve(options.docsPath);
    this.autoFix = options.autoFix ?? false;
    this.logger = options.logger ?? consoleLogger;
    this.extensions = options.extensions ?? ['.md', '.mdx'];
    this.ignorePaths = options.ignorePaths ?? ['node_modules', '.git', '_archive'];
  }

  /**
   * Run all validations
   */
  async validate(): Promise<ValidationResult> {
    this.issues = [];
    this.fixedCount = 0;

    // Check docs path exists
    if (!fs.existsSync(this.docsPath)) {
      this.issues.push({
        file: this.docsPath,
        severity: 'error',
        type: 'missing_docs_path',
        message: `Documentation path does not exist: ${this.docsPath}`,
        autoFixable: false,
      });
      return this.buildResult();
    }

    // Collect all markdown files
    const files = this.collectFiles(this.docsPath);
    this.logger.info(`Validating ${files.length} documentation files...`);

    // Track seen routes for duplicate detection
    const seenRoutes = new Map<string, string>();

    // Validate each file
    for (const file of files) {
      await this.validateFile(file, seenRoutes);
    }

    // Check for broken internal links
    await this.validateInternalLinks(files);

    return this.buildResult();
  }

  /**
   * Collect all markdown files recursively
   */
  private collectFiles(dir: string): string[] {
    const files: string[] = [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(this.docsPath, fullPath);

      // Skip ignored paths
      if (this.ignorePaths.some((p) => relativePath.startsWith(p) || entry.name === p)) {
        continue;
      }

      if (entry.isDirectory()) {
        files.push(...this.collectFiles(fullPath));
      } else if (this.extensions.some((ext) => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Validate a single file
   */
  private async validateFile(
    filePath: string,
    seenRoutes: Map<string, string>
  ): Promise<void> {
    const relativePath = path.relative(this.docsPath, filePath);
    let content: string;

    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      this.issues.push({
        file: relativePath,
        severity: 'error',
        type: 'read_error',
        message: `Cannot read file: ${(err as Error).message}`,
        autoFixable: false,
      });
      return;
    }

    // 1. Validate YAML frontmatter
    this.validateFrontmatter(relativePath, content, filePath);

    // 2. Validate MDX compatibility
    this.validateMdxContent(relativePath, content, filePath);

    // 3. Check for duplicate routes
    this.checkDuplicateRoutes(relativePath, seenRoutes);

    // 4. Validate file naming
    this.validateFileName(relativePath);
  }

  /**
   * Validate YAML frontmatter syntax
   */
  private validateFrontmatter(
    relativePath: string,
    content: string,
    filePath: string
  ): void {
    // Check if file has frontmatter
    if (!content.startsWith('---')) {
      // No frontmatter is OK for some files
      return;
    }

    // Find closing ---
    const endMatch = content.indexOf('\n---', 3);
    if (endMatch === -1) {
      this.issues.push({
        file: relativePath,
        severity: 'error',
        type: 'invalid_frontmatter',
        message: 'YAML frontmatter not closed (missing closing ---)',
        autoFixable: false,
      });
      return;
    }

    const frontmatter = content.substring(4, endMatch);

    // Check for common YAML issues
    const lines = frontmatter.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 2; // +2 for opening --- and 0-index

      // Check for unquoted colons in values (common issue)
      // e.g., title: Feature: Something → should be title: "Feature: Something"
      const colonMatch = line.match(/^(\s*)([a-zA-Z_-]+):\s*([^"'\n]*:[^"'\n]*)$/);
      if (colonMatch && !line.includes('#')) {
        const [, indent, key, value] = colonMatch;
        this.issues.push({
          file: relativePath,
          line: lineNum,
          severity: 'error',
          type: 'yaml_unquoted_colon',
          message: `Unquoted colon in YAML value: ${key}: ${value.trim()} (wrap in quotes)`,
          autoFixable: true,
          fix: () => {
            const currentContent = fs.readFileSync(filePath, 'utf-8');
            const fixedLine = `${indent}${key}: "${value.trim()}"`;
            const newContent = currentContent.replace(line, fixedLine);
            fs.writeFileSync(filePath, newContent);
            this.fixedCount++;
          },
        });
      }

      // Check for tabs (YAML doesn't allow tabs for indentation)
      if (line.includes('\t')) {
        this.issues.push({
          file: relativePath,
          line: lineNum,
          severity: 'error',
          type: 'yaml_tabs',
          message: 'YAML frontmatter contains tabs (use spaces)',
          autoFixable: true,
          fix: () => {
            const currentContent = fs.readFileSync(filePath, 'utf-8');
            const newContent = currentContent.replace(/\t/g, '  ');
            fs.writeFileSync(filePath, newContent);
            this.fixedCount++;
          },
        });
      }
    }
  }

  /**
   * Validate MDX/JSX compatibility
   */
  private validateMdxContent(
    relativePath: string,
    content: string,
    filePath: string
  ): void {
    const mdxIssues = validateMdxCompatibility(content);

    for (const issue of mdxIssues) {
      this.issues.push({
        file: relativePath,
        severity: 'error',
        type: 'mdx_compatibility',
        message: issue,
        autoFixable: true,
        fix: () => {
          const currentContent = fs.readFileSync(filePath, 'utf-8');
          const fixedContent = sanitizeHtmlForMdx(currentContent);
          fs.writeFileSync(filePath, fixedContent);
          this.fixedCount++;
        },
      });
    }

    // Check for JSX-in-markdown issues
    // Curly braces without escape can break MDX
    const curlyBraceMatch = content.match(/(?<!\\)\{[^}]*\}/g);
    if (curlyBraceMatch) {
      for (const match of curlyBraceMatch) {
        // Skip valid code blocks and inline code
        if (content.includes('```') || content.includes('`' + match + '`')) {
          continue;
        }
        // Check if it's a valid JSX expression or needs escaping
        if (!match.match(/^\{[a-zA-Z_$][a-zA-Z0-9_$]*\}$/)) {
          // Not a simple variable reference, might cause issues
          // Only warn, don't error - some valid cases
        }
      }
    }

    // Check for common problematic patterns
    const problematicPatterns = [
      { pattern: /<script/i, message: 'Script tags not allowed in MDX' },
      { pattern: /<style(?!\s)/i, message: 'Style tags may cause issues (use CSS modules)' },
      { pattern: /<!--(?!.*-->)/s, message: 'Unclosed HTML comment' },
    ];

    for (const { pattern, message } of problematicPatterns) {
      if (pattern.test(content)) {
        this.issues.push({
          file: relativePath,
          severity: 'warning',
          type: 'mdx_problematic_content',
          message,
          autoFixable: false,
        });
      }
    }
  }

  /**
   * Check for duplicate routes (same normalized path)
   *
   * Docusaurus route resolution:
   * - Both README.md and index.md map to the folder's route (e.g., /folder/)
   * - Case-insensitive matching
   * - Extensions stripped
   *
   * This catches conflicts like:
   * - folder/README.md vs folder/index.md (both → /folder/)
   * - Feature.md vs feature.md (both → /feature/)
   */
  private checkDuplicateRoutes(
    relativePath: string,
    seenRoutes: Map<string, string>
  ): void {
    // Normalize route: remove extension, lowercase, normalize separators
    let route = relativePath
      .replace(/\.(md|mdx)$/, '')
      .toLowerCase()
      .replace(/\\/g, '/');

    // CRITICAL: Docusaurus treats README.md and index.md as folder index pages
    // Both "folder/readme" and "folder/index" resolve to "/folder/"
    // Normalize both to the folder path to detect conflicts
    const fileName = path.basename(route);
    if (fileName === 'readme' || fileName === 'index') {
      route = path.dirname(route);
      // Handle root-level index/readme (dirname would be '.')
      if (route === '.') {
        route = '';
      }
    }

    if (seenRoutes.has(route)) {
      const conflictingFile = seenRoutes.get(route)!;
      const isIndexConflict =
        (relativePath.toLowerCase().includes('readme.') &&
          conflictingFile.toLowerCase().includes('index.')) ||
        (relativePath.toLowerCase().includes('index.') &&
          conflictingFile.toLowerCase().includes('readme.'));

      this.issues.push({
        file: relativePath,
        severity: 'warning', // Warning because Docusaurus handles this gracefully
        type: 'duplicate_route',
        message: isIndexConflict
          ? `Duplicate route: both README.md and index.md map to /${route || '(root)'}/ - use only one`
          : `Duplicate route: conflicts with ${conflictingFile}`,
        autoFixable: false,
      });
    } else {
      seenRoutes.set(route, relativePath);
    }
  }

  /**
   * Validate file naming conventions
   */
  private validateFileName(relativePath: string): void {
    const fileName = path.basename(relativePath);

    // Check for spaces in filename
    if (fileName.includes(' ')) {
      this.issues.push({
        file: relativePath,
        severity: 'warning',
        type: 'filename_spaces',
        message: 'Filename contains spaces (may cause URL issues)',
        autoFixable: false,
      });
    }

    // Check for special characters
    if (/[<>:"|?*]/.test(fileName)) {
      this.issues.push({
        file: relativePath,
        severity: 'error',
        type: 'filename_invalid_chars',
        message: 'Filename contains invalid characters',
        autoFixable: false,
      });
    }

    // Check for very long filenames
    if (fileName.length > 100) {
      this.issues.push({
        file: relativePath,
        severity: 'warning',
        type: 'filename_too_long',
        message: `Filename too long (${fileName.length} chars, max recommended: 100)`,
        autoFixable: false,
      });
    }
  }

  /**
   * Validate internal links between documents
   */
  private async validateInternalLinks(files: string[]): Promise<void> {
    const fileSet = new Set(
      files.map((f) => path.relative(this.docsPath, f).replace(/\\/g, '/'))
    );

    for (const file of files) {
      const relativePath = path.relative(this.docsPath, file).replace(/\\/g, '/');
      let content: string;

      try {
        content = fs.readFileSync(file, 'utf-8');
      } catch {
        continue;
      }

      // Find markdown links: [text](path)
      const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
      let match;

      while ((match = linkRegex.exec(content)) !== null) {
        const [, , linkPath] = match;

        // Skip external links
        if (linkPath.startsWith('http://') || linkPath.startsWith('https://')) {
          continue;
        }

        // Skip anchors
        if (linkPath.startsWith('#')) {
          continue;
        }

        // Skip mailto and tel
        if (linkPath.startsWith('mailto:') || linkPath.startsWith('tel:')) {
          continue;
        }

        // Resolve relative path
        const linkPathClean = linkPath.split('#')[0].split('?')[0];
        if (!linkPathClean) continue;

        const fileDir = path.dirname(relativePath);
        let resolvedPath: string;

        if (linkPathClean.startsWith('/')) {
          resolvedPath = linkPathClean.substring(1);
        } else if (linkPathClean.startsWith('./')) {
          resolvedPath = path.join(fileDir, linkPathClean.substring(2));
        } else if (linkPathClean.startsWith('../')) {
          resolvedPath = path.join(fileDir, linkPathClean);
        } else {
          resolvedPath = path.join(fileDir, linkPathClean);
        }

        // Normalize
        resolvedPath = resolvedPath.replace(/\\/g, '/');

        // Check if link points to existing file
        const possiblePaths = [
          resolvedPath,
          resolvedPath + '.md',
          resolvedPath + '.mdx',
          resolvedPath + '/index.md',
          resolvedPath + '/README.md',
        ];

        const exists = possiblePaths.some(
          (p) => fileSet.has(p) || fileSet.has(p.replace(/\\/g, '/'))
        );

        // Check if it's an external file (outside docs)
        const fullResolvedPath = path.resolve(this.docsPath, resolvedPath);
        const externalExists = fs.existsSync(fullResolvedPath) ||
          fs.existsSync(fullResolvedPath + '.md');

        if (!exists && !externalExists) {
          // Broken links are warnings, not errors - Docusaurus is configured with
          // onBrokenLinks: 'warn' and won't crash, just show console warnings
          // Check if it might be pointing outside docs intentionally
          const isOutsideDocsRef = linkPathClean.includes('CLAUDE.md') ||
            linkPathClean.includes('README.md') ||
            linkPathClean.includes('increments/') ||
            linkPathClean.includes('_archive/') ||
            linkPathClean.includes('_features/') ||
            linkPathClean.includes('plugins/') ||
            linkPathClean.includes('src/');

          this.issues.push({
            file: relativePath,
            severity: 'warning',  // Always warning - Docusaurus won't crash on broken links
            type: 'broken_link',
            message: `Broken link: ${linkPath}${isOutsideDocsRef ? ' (external reference)' : ''}`,
            autoFixable: false,
          });
        }
      }
    }
  }

  /**
   * Build the validation result
   */
  private buildResult(): ValidationResult {
    // Apply auto-fixes if enabled
    if (this.autoFix) {
      const fixedIssues = new Set<ValidationIssue>();
      for (const issue of this.issues) {
        if (issue.autoFixable && issue.fix) {
          try {
            issue.fix();
            fixedIssues.add(issue);
            this.logger.info(`✓ Fixed: ${issue.file} - ${issue.message}`);
          } catch (err) {
            this.logger.warn(`Failed to fix ${issue.file}: ${(err as Error).message}`);
          }
        }
      }
      // Remove successfully fixed issues so they don't count as errors
      this.issues = this.issues.filter((i) => !fixedIssues.has(i));
    }

    const errors = this.issues.filter((i) => i.severity === 'error').length;
    const warnings = this.issues.filter((i) => i.severity === 'warning').length;
    const infos = this.issues.filter((i) => i.severity === 'info').length;

    return {
      valid: errors === 0,
      totalFiles: this.issues.length > 0 ? this.issues.length : 0,
      errors,
      warnings,
      infos,
      issues: this.issues,
      fixedCount: this.fixedCount,
    };
  }

  /**
   * Format validation result for display
   */
  static formatResult(result: ValidationResult): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('               DOCUMENTATION VALIDATION REPORT                  ');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');

    if (result.valid) {
      lines.push('✅ Documentation is valid and ready for preview/build');
    } else {
      lines.push('❌ Documentation has issues that need to be fixed');
    }

    lines.push('');
    lines.push(`   Errors:   ${result.errors}`);
    lines.push(`   Warnings: ${result.warnings}`);
    lines.push(`   Info:     ${result.infos}`);

    if (result.fixedCount > 0) {
      lines.push(`   Fixed:    ${result.fixedCount} (auto-fix applied)`);
    }

    lines.push('');

    // Group issues by file
    const issuesByFile = new Map<string, ValidationIssue[]>();
    for (const issue of result.issues) {
      const existing = issuesByFile.get(issue.file) ?? [];
      existing.push(issue);
      issuesByFile.set(issue.file, existing);
    }

    // Show errors first
    const errorFiles = Array.from(issuesByFile.entries())
      .filter(([, issues]) => issues.some((i) => i.severity === 'error'));

    if (errorFiles.length > 0) {
      lines.push('ERRORS (must fix):');
      lines.push('───────────────────────────────────────────────────────────────');

      for (const [file, issues] of errorFiles) {
        const errors = issues.filter((i) => i.severity === 'error');
        lines.push(`  📄 ${file}`);
        for (const issue of errors) {
          const line = issue.line ? `:${issue.line}` : '';
          const fix = issue.autoFixable ? ' [auto-fixable]' : '';
          lines.push(`     ❌ ${issue.type}${line}: ${issue.message}${fix}`);
        }
      }
      lines.push('');
    }

    // Show warnings
    const warningFiles = Array.from(issuesByFile.entries())
      .filter(([, issues]) => issues.some((i) => i.severity === 'warning'));

    if (warningFiles.length > 0 && warningFiles.length <= 10) {
      lines.push('WARNINGS (recommended to fix):');
      lines.push('───────────────────────────────────────────────────────────────');

      for (const [file, issues] of warningFiles) {
        const warnings = issues.filter((i) => i.severity === 'warning');
        lines.push(`  📄 ${file}`);
        for (const issue of warnings) {
          lines.push(`     ⚠️  ${issue.message}`);
        }
      }
      lines.push('');
    } else if (warningFiles.length > 10) {
      lines.push(`WARNINGS: ${result.warnings} (showing summary only)`);
      lines.push('───────────────────────────────────────────────────────────────');
      lines.push(`  Run with --verbose to see all warnings`);
      lines.push('');
    }

    // Suggestions
    if (!result.valid) {
      lines.push('QUICK FIXES:');
      lines.push('───────────────────────────────────────────────────────────────');
      lines.push('  1. Run validation with auto-fix:');
      lines.push('     /specweave-docs:validate --fix');
      lines.push('');
      lines.push('  2. Or fix manually:');

      const hasYamlIssues = result.issues.some((i) => i.type.startsWith('yaml_'));
      const hasMdxIssues = result.issues.some((i) => i.type.startsWith('mdx_'));
      const hasBrokenLinks = result.issues.some((i) => i.type === 'broken_link');
      const hasDuplicateRoutes = result.issues.some((i) => i.type === 'duplicate_route');

      if (hasYamlIssues) {
        lines.push('     • YAML: Wrap values with colons in quotes');
        lines.push('       title: "Feature: Auth" (not title: Feature: Auth)');
      }
      if (hasMdxIssues) {
        lines.push('     • MDX: Quote HTML attributes, close self-closing tags');
        lines.push('       target="_blank" (not target=_blank)');
        lines.push('       <br /> (not <br>)');
      }
      if (hasBrokenLinks) {
        lines.push('     • Links: Update or remove broken internal links');
      }
      if (hasDuplicateRoutes) {
        lines.push('     • Routes: Remove duplicate files (prefer index.md over README.md)');
        lines.push('       Each folder should have only ONE of: index.md OR README.md');
      }
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════════════');

    return lines.join('\n');
  }
}

/**
 * Quick validation function for scripts
 */
export async function validateDocs(
  docsPath: string,
  options?: { autoFix?: boolean; logger?: Logger }
): Promise<ValidationResult> {
  const validator = new DocsValidator({
    docsPath,
    autoFix: options?.autoFix,
    logger: options?.logger,
  });
  return validator.validate();
}
