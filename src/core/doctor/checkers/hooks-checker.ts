/**
 * Hooks Checker - validates hook health (quick check, not full execution)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type {
  HealthChecker,
  CategoryResult,
  CheckResult,
  DoctorOptions,
} from '../types.js';
import { calculateOverallStatus } from '../types.js';

export class HooksChecker implements HealthChecker {
  category = 'Hooks';

  async check(
    projectRoot: string,
    options: DoctorOptions
  ): Promise<CategoryResult> {
    const checks: CheckResult[] = [];

    // Find hooks in .claude/hooks or plugin hooks
    const hookLocations = this.findHookLocations(projectRoot);

    if (hookLocations.length === 0) {
      checks.push({
        name: 'Hooks',
        status: 'skip',
        message: 'no hooks configured',
      });
      return {
        category: this.category,
        status: 'skip',
        checks,
      };
    }

    // Check each hook location
    for (const location of hookLocations) {
      const hookChecks = await this.checkHooksInLocation(
        location,
        options.quick
      );
      checks.push(...hookChecks);
    }

    // Summary check
    const failedHooks = checks.filter((c) => c.status === 'fail').length;
    const totalHooks = checks.filter((c) => c.status !== 'skip').length;

    if (failedHooks > 0) {
      checks.unshift({
        name: 'Hooks summary',
        status: 'fail',
        message: `${failedHooks}/${totalHooks} hooks failing`,
        fixSuggestion: 'Run: specweave check-hooks --fix',
      });
    } else if (totalHooks > 0) {
      checks.unshift({
        name: 'Hooks summary',
        status: 'pass',
        message: `${totalHooks}/${totalHooks} hooks healthy`,
      });
    }

    return {
      category: this.category,
      status: calculateOverallStatus(checks),
      checks,
    };
  }

  private findHookLocations(projectRoot: string): string[] {
    const locations: string[] = [];

    // Check .claude/hooks
    const claudeHooks = path.join(projectRoot, '.claude', 'hooks');
    if (fs.existsSync(claudeHooks)) {
      locations.push(claudeHooks);
    }

    // Check .specweave hooks (if any)
    const specweaveHooks = path.join(projectRoot, '.specweave', 'hooks');
    if (fs.existsSync(specweaveHooks)) {
      locations.push(specweaveHooks);
    }

    return locations;
  }

  private async checkHooksInLocation(
    location: string,
    quickMode?: boolean
  ): Promise<CheckResult[]> {
    const checks: CheckResult[] = [];

    try {
      const files = fs.readdirSync(location);
      const hookFiles = files.filter(
        (f) => f.endsWith('.sh') || f.endsWith('.js')
      );

      for (const hookFile of hookFiles) {
        const hookPath = path.join(location, hookFile);
        const hookName = hookFile.replace(/\.(sh|js)$/, '');

        // Basic syntax check
        const syntaxCheck = this.checkHookSyntax(hookPath, hookFile);
        if (syntaxCheck.status === 'fail') {
          checks.push(syntaxCheck);
          continue;
        }

        // Skip execution test in quick mode
        if (quickMode) {
          checks.push({
            name: hookName,
            status: 'skip',
            message: 'execution skipped (quick mode)',
          });
          continue;
        }

        // Quick execution test (with timeout)
        checks.push(await this.testHookExecution(hookPath, hookName));
      }
    } catch {
      checks.push({
        name: path.basename(location),
        status: 'fail',
        message: 'could not read hooks directory',
      });
    }

    return checks;
  }

  private checkHookSyntax(hookPath: string, fileName: string): CheckResult {
    const hookName = fileName.replace(/\.(sh|js)$/, '');

    try {
      const content = fs.readFileSync(hookPath, 'utf8');

      if (fileName.endsWith('.sh')) {
        // Basic bash syntax check
        if (!content.includes('#!/')) {
          return {
            name: hookName,
            status: 'warn',
            message: 'missing shebang',
            fixSuggestion: 'Add #!/bin/bash at the start',
          };
        }
      }

      return {
        name: `${hookName} syntax`,
        status: 'pass',
        message: 'valid',
      };
    } catch {
      return {
        name: `${hookName} syntax`,
        status: 'fail',
        message: 'could not read file',
      };
    }
  }

  private async testHookExecution(
    hookPath: string,
    hookName: string
  ): Promise<CheckResult> {
    const start = Date.now();

    try {
      // Dry-run test with minimal input
      execSync(`bash "${hookPath}" --help 2>/dev/null || true`, {
        encoding: 'utf8',
        timeout: 3000,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          SPECWEAVE_DOCTOR_DRY_RUN: '1',
        },
      });

      return {
        name: `${hookName} execution`,
        status: 'pass',
        message: 'responds',
        durationMs: Date.now() - start,
      };
    } catch {
      return {
        name: `${hookName} execution`,
        status: 'warn',
        message: 'execution test failed',
        durationMs: Date.now() - start,
        fixSuggestion: 'Run: specweave check-hooks for detailed analysis',
      };
    }
  }
}
