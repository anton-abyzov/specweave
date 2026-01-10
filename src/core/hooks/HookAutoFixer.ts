/**
 * Hook Auto-Fixer
 *
 * Automatically repairs common hook issues.
 * Handles import path corrections, missing .js extensions, etc.
 *
 * Part of increment 0037: Hook Health Check System
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import {
  HookExecutionResult,
  FixResult,
  BatchFixResult
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
    const fixableError = executionResult.errors.find(e => e.fixable);

    if (!fixableError) {
      return this.createFailedResult(hookName, 'No fixable issues detected', 'No auto-fixable errors found');
    }

    if (fixableError.type === 'import') {
      return this.fixImportError(hookName, executionResult);
    }

    return this.createFailedResult(
      hookName,
      `No auto-fix available for ${fixableError.type} errors`,
      'Unsupported error type for auto-fix'
    );
  }

  private createFailedResult(hook: string, description: string, error: string): FixResult {
    return { hook, success: false, fixType: 'import', description, filesModified: [], error };
  }

  private static readonly DEFAULT_EXECUTOR_CONFIG = {
    timeout: 5000,
    captureStdout: true,
    captureStderr: true,
    testIncrementId: '__health-check-test__'
  };

  /**
   * Fix import errors (missing .js extensions)
   */
  private async fixImportError(
    hookName: string,
    executionResult: HookExecutionResult
  ): Promise<FixResult> {
    const executor = new HookExecutor(HookAutoFixer.DEFAULT_EXECUTOR_CONFIG);
    const importDetails = executor.extractImportErrorDetails(executionResult.stderr, '');

    if (!importDetails || importDetails.fixConfidence === 'low') {
      return this.createFailedResult(hookName, 'Cannot confidently fix import error', 'Import fix confidence too low');
    }

    const hookFile = await this.findHookFile(hookName);
    if (!hookFile) {
      return this.createFailedResult(hookName, 'Hook file not found', `Cannot find hook file for ${hookName}`);
    }

    const success = await this.addJsExtensionToImports(hookFile);
    if (!success) {
      return this.createFailedResult(hookName, 'Failed to apply import fix', 'Could not modify hook file');
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
      const content = await fs.readFile(filePath, 'utf-8');
      const importPattern = /import\s+{[^}]+}\s+from\s+['"](\.\.[^'"]+)['"]/g;
      let modified = false;

      const updatedContent = content.replace(importPattern, (match, modulePath) => {
        if (modulePath.endsWith('.js') || modulePath.includes('node_modules')) {
          return match;
        }
        modified = true;
        return match.replace(modulePath, `${modulePath}.js`);
      });

      if (modified) {
        await fs.writeFile(filePath, updatedContent, 'utf-8');
      }
      return modified;
    } catch {
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
   * Note: Currently a placeholder - would need hook definition to re-execute
   */
  async verifyFix(_hookName: string, _originalResult: HookExecutionResult): Promise<boolean> {
    return true;
  }
}
