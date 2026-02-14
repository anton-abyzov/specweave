/**
 * Project Structure Checker - validates .specweave directory and required structure
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  HealthChecker,
  CategoryResult,
  CheckResult,
  DoctorOptions,
} from '../types.js';
import { calculateOverallStatus } from '../types.js';
import { RECOGNIZED_LIFECYCLE_FOLDERS } from '../../increment/increment-utils.js';

const REQUIRED_DIRS = [
  { name: '.specweave directory', path: '.specweave', required: true },
  { name: 'increments directory', path: '.specweave/increments', required: true },
];

const OPTIONAL_DIRS = [
  { name: 'docs directory', path: '.specweave/docs', required: false },
  { name: 'state directory', path: '.specweave/state', required: false },
];

export class ProjectStructureChecker implements HealthChecker {
  category = 'Project Structure';

  async check(
    projectRoot: string,
    _options: DoctorOptions
  ): Promise<CategoryResult> {
    const checks: CheckResult[] = [];

    // Check required directories
    for (const dir of REQUIRED_DIRS) {
      checks.push(this.checkDirectory(projectRoot, dir));
    }

    // Only check optional dirs if .specweave exists
    const specweaveExists = fs.existsSync(path.join(projectRoot, '.specweave'));
    if (specweaveExists) {
      for (const dir of OPTIONAL_DIRS) {
        checks.push(this.checkDirectory(projectRoot, dir));
      }

      // Check for orphaned files in increment root
      checks.push(this.checkIncrementRootCleanliness(projectRoot));

      // Check for unknown underscore folders and nested .specweave
      checks.push(this.checkIncrementFolderHygiene(projectRoot));
    }

    return {
      category: this.category,
      status: calculateOverallStatus(checks),
      checks,
    };
  }

  private checkDirectory(
    projectRoot: string,
    dir: { name: string; path: string; required: boolean }
  ): CheckResult {
    const fullPath = path.join(projectRoot, dir.path);
    const exists = fs.existsSync(fullPath);

    if (exists) {
      return {
        name: dir.name,
        status: 'pass',
        message: 'exists',
      };
    }

    return {
      name: dir.name,
      status: dir.required ? 'fail' : 'warn',
      message: 'missing',
      fixSuggestion: dir.required
        ? 'Run: specweave init'
        : `Create directory: mkdir -p ${dir.path}`,
    };
  }

  private checkIncrementRootCleanliness(projectRoot: string): CheckResult {
    const incrementsDir = path.join(projectRoot, '.specweave', 'increments');
    if (!fs.existsSync(incrementsDir)) {
      return {
        name: 'Increment root cleanliness',
        status: 'skip',
        message: 'increments directory does not exist',
      };
    }

    const allowedInRoot = [
      'metadata.json',
      'spec.md',
      'plan.md',
      'tasks.md',
      ...RECOGNIZED_LIFECYCLE_FOLDERS,
    ];
    const orphanedFiles: string[] = [];

    try {
      const entries = fs.readdirSync(incrementsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('_')) {
          // Check inside increment directories for orphaned files
          const incPath = path.join(incrementsDir, entry.name);
          const incEntries = fs.readdirSync(incPath);
          for (const file of incEntries) {
            const isAllowed =
              allowedInRoot.includes(file) ||
              ['reports', 'logs', 'scripts', 'backups'].includes(file);
            if (!isAllowed && !file.startsWith('.')) {
              orphanedFiles.push(`${entry.name}/${file}`);
            }
          }
        }
      }

      if (orphanedFiles.length === 0) {
        return {
          name: 'Increment root cleanliness',
          status: 'pass',
          message: 'no orphaned files',
        };
      }

      return {
        name: 'Increment root cleanliness',
        status: 'warn',
        message: `${orphanedFiles.length} orphaned file(s)`,
        details: orphanedFiles.slice(0, 5),
        fixSuggestion: 'Move files to appropriate subfolders (reports/, logs/)',
      };
    } catch {
      return {
        name: 'Increment root cleanliness',
        status: 'skip',
        message: 'could not scan increments',
      };
    }
  }

  private checkIncrementFolderHygiene(projectRoot: string): CheckResult {
    const incrementsDir = path.join(projectRoot, '.specweave', 'increments');
    if (!fs.existsSync(incrementsDir)) {
      return {
        name: 'Increment folder hygiene',
        status: 'skip',
        message: 'increments directory does not exist',
      };
    }

    const issues: string[] = [];
    const recognizedSet = new Set<string>(RECOGNIZED_LIFECYCLE_FOLDERS);

    try {
      const entries = fs.readdirSync(incrementsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        // Detect nested .specweave folder
        if (entry.name === '.specweave') {
          issues.push('.specweave/ nested inside increments (accidental init artifact)');
          continue;
        }

        // Detect unknown underscore folders
        if (entry.name.startsWith('_') && !recognizedSet.has(entry.name)) {
          issues.push(`${entry.name} is not a recognized lifecycle folder`);
        }
      }

      if (issues.length === 0) {
        return {
          name: 'Increment folder hygiene',
          status: 'pass',
          message: 'no invalid folders',
        };
      }

      return {
        name: 'Increment folder hygiene',
        status: 'warn',
        message: `${issues.length} issue(s): ${issues.join(', ')}`,
        details: issues,
        fixSuggestion: 'Run: specweave update (auto-cleans invalid folders)',
      };
    } catch {
      return {
        name: 'Increment folder hygiene',
        status: 'skip',
        message: 'could not scan increments',
      };
    }
  }
}
