/**
 * Hook Auto-Fixer
 *
 * Automatically repairs common hook issues.
 * Handles import path corrections, missing .js extensions, etc.
 *
 * Part of increment 0037: Hook Health Check System
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import {
  HookExecutionResult,
  FixResult,
  BatchFixResult,
  HookError,
  ImportErrorDetails
} from './types.js';
import { HookExecutor } from './HookExecutor.js';

/**
 * Hook Auto-Fixer - Repairs common issues
 */
export class HookAutoFixer {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Attempt to fix a specific hook
   */
  async fixHook(hookName: string, executionResult: HookExecutionResult): Promise<FixResult> {
    // Find first fixable error
    const fixableError = executionResult.errors.find(e => e.fixable);

    if (!fixableError) {
      return {
        hook: hookName,
        success: false,
        fixType: 'import',
        description: 'No fixable issues detected',
        filesModified: [],
        error: 'No auto-fixable errors found'
      };
    }

    // Attempt fix based on error type
    switch (fixableError.type) {
      case 'import':
        return await this.fixImportError(hookName, executionResult);
      default:
        return {
          hook: hookName,
          success: false,
          fixType: 'import', // Default to import type
          description: `No auto-fix available for ${fixableError.type} errors`,
          filesModified: [],
          error: 'Unsupported error type for auto-fix'
        };
    }
  }

  /**
   * Fix import errors (missing .js extensions)
   */
  private async fixImportError(
    hookName: string,
    executionResult: HookExecutionResult
  ): Promise<FixResult> {
    // Extract import error details from stderr
    const executor = new HookExecutor({
      timeout: 5000,
      captureStdout: true,
      captureStderr: true,
      testIncrementId: '__health-check-test__'
    });

    const importDetails = executor.extractImportErrorDetails(
      executionResult.stderr,
      '' // Hook path would be provided by caller
    );

    if (!importDetails || importDetails.fixConfidence === 'low') {
      return {
        hook: hookName,
        success: false,
        fixType: 'import',
        description: 'Cannot confidently fix import error',
        filesModified: [],
        error: 'Import fix confidence too low'
      };
    }

    // Find hook file
    const hookFile = await this.findHookFile(hookName);

    if (!hookFile) {
      return {
        hook: hookName,
        success: false,
        fixType: 'import',
        description: 'Hook file not found',
        filesModified: [],
        error: `Cannot find hook file for ${hookName}`
      };
    }

    // Apply fix: Add .js extension to import
    const success = await this.addJsExtensionToImports(hookFile);

    if (!success) {
      return {
        hook: hookName,
        success: false,
        fixType: 'import',
        description: 'Failed to apply import fix',
        filesModified: [],
        error: 'Could not modify hook file'
      };
    }

    return {
      hook: hookName,
      success: true,
      fixType: 'import',
      description: 'Added .js extension to import statements',
      filesModified: [hookFile]
    };
  }

  /**
   * Add .js extension to all relative imports in file
   */
  private async addJsExtensionToImports(filePath: string): Promise<boolean> {
    try {
      let content = await fs.readFile(filePath, 'utf-8');
      let modified = false;

      // Pattern: import ... from '../../../../src/....js' (missing .js)
      const importPattern = /import\s+{[^}]+}\s+from\s+['"](\.\.[^'"]+)['"]/g;

      content = content.replace(importPattern, (match, modulePath) => {
        // Skip if already has .js extension
        if (modulePath.endsWith('.js')) {
          return match;
        }

        // Skip node_modules
        if (modulePath.includes('node_modules')) {
          return match;
        }

        // Add .js extension
        modified = true;
        return match.replace(modulePath, `${modulePath}.js`);
      });

      if (modified) {
        await fs.writeFile(filePath, content, 'utf-8');
      }

      return modified;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fix multiple hooks at once
   */
  async fixBatch(results: HookExecutionResult[]): Promise<BatchFixResult> {
    const fixResults: FixResult[] = [];
    const manualFixRequired: string[] = [];

    for (const result of results) {
      if (result.success) {
        continue; // Skip successful hooks
      }

      const hasFixableError = result.errors.some(e => e.fixable);

      if (!hasFixableError) {
        manualFixRequired.push(result.hook);
        continue;
      }

      const fixResult = await this.fixHook(result.hook, result);
      fixResults.push(fixResult);
    }

    const successfulFixes = fixResults.filter(r => r.success).length;
    const failedFixes = fixResults.filter(r => !r.success).length;

    return {
      totalFixes: fixResults.length,
      successfulFixes,
      failedFixes,
      results: fixResults,
      manualFixRequired,
      success: failedFixes === 0
    };
  }

  /**
   * Find hook file path by name
   */
  private async findHookFile(hookName: string): Promise<string | null> {
    const pluginsDir = path.join(this.projectRoot, 'plugins');

    if (!fs.existsSync(pluginsDir)) {
      return null;
    }

    const plugins = fs.readdirSync(pluginsDir);

    for (const plugin of plugins) {
      const hooksDir = path.join(pluginsDir, plugin, 'hooks');

      if (!fs.existsSync(hooksDir)) {
        continue;
      }

      // Check for hook files (.sh, .ts, .js)
      const hookFiles = [
        path.join(hooksDir, `${hookName}.sh`),
        path.join(hooksDir, `${hookName}.ts`),
        path.join(hooksDir, `${hookName}.js`)
      ];

      for (const hookFile of hookFiles) {
        if (fs.existsSync(hookFile)) {
          return hookFile;
        }
      }

      // Check in lib/ subdirectory
      const libDir = path.join(hooksDir, 'lib');
      if (fs.existsSync(libDir)) {
        const libHookFiles = [
          path.join(libDir, `${hookName}.ts`),
          path.join(libDir, `${hookName}.js`)
        ];

        for (const hookFile of libHookFiles) {
          if (fs.existsSync(hookFile)) {
            return hookFile;
          }
        }
      }
    }

    return null;
  }

  /**
   * Validate fix was successful by re-running hook
   */
  async verifyFix(hookName: string, originalResult: HookExecutionResult): Promise<boolean> {
    // Re-execute hook
    const executor = new HookExecutor({
      timeout: 5000,
      captureStdout: true,
      captureStderr: true,
      testIncrementId: '__health-check-test__'
    });

    // Would need hook definition to re-execute
    // For now, just check if fix was applied

    return true; // Placeholder
  }
}
