/**
 * Increments Checker - validates increment integrity, metadata, and duplicates
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

interface IncrementInfo {
  path: string;
  id: string;
  name: string;
  hasMetadata: boolean;
  metadataValid: boolean;
  status?: string;
}

export class IncrementsChecker implements HealthChecker {
  category = 'Increments';

  async check(
    projectRoot: string,
    _options: DoctorOptions
  ): Promise<CategoryResult> {
    const checks: CheckResult[] = [];

    const incrementsDir = path.join(projectRoot, '.specweave', 'increments');
    if (!fs.existsSync(incrementsDir)) {
      return {
        category: this.category,
        status: 'skip',
        checks: [
          {
            name: 'Increments',
            status: 'skip',
            message: 'no increments directory',
          },
        ],
      };
    }

    // Scan all increments
    const increments = this.scanIncrements(incrementsDir);

    // Check integrity
    checks.push(this.checkIntegrity(increments));

    // Check for duplicates
    checks.push(this.checkDuplicates(increments));

    // Check for status desyncs (simplified)
    checks.push(await this.checkStatusSync(increments));

    // Summary
    const activeCount = increments.filter(
      (i) => i.status === 'active' || i.status === 'in_progress'
    ).length;
    if (activeCount > 0) {
      checks.push({
        name: 'Active increments',
        status: activeCount > 10 ? 'warn' : 'pass',
        message: `${activeCount} active`,
        ...(activeCount > 10 && {
          fixSuggestion: 'Consider archiving completed increments',
        }),
      });
    }

    return {
      category: this.category,
      status: calculateOverallStatus(checks),
      checks,
    };
  }

  private scanIncrements(incrementsDir: string): IncrementInfo[] {
    const increments: IncrementInfo[] = [];
    const dirsToScan = ['', '_archive', '_abandoned', '_paused'];

    for (const subdir of dirsToScan) {
      const scanPath = subdir
        ? path.join(incrementsDir, subdir)
        : incrementsDir;

      if (!fs.existsSync(scanPath)) continue;

      try {
        const entries = fs.readdirSync(scanPath, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          if (entry.name.startsWith('_')) continue;
          if (!entry.name.match(/^\d{4}/)) continue;

          const incPath = path.join(scanPath, entry.name);
          const info = this.parseIncrement(incPath, entry.name);
          increments.push(info);
        }
      } catch {
        // Ignore scan errors
      }
    }

    return increments;
  }

  private parseIncrement(incPath: string, name: string): IncrementInfo {
    const metadataPath = path.join(incPath, 'metadata.json');
    const hasMetadata = fs.existsSync(metadataPath);
    let metadataValid = false;
    let status: string | undefined;

    if (hasMetadata) {
      try {
        const content = fs.readFileSync(metadataPath, 'utf8');
        const metadata = JSON.parse(content);
        metadataValid = true;
        status = metadata.status;
      } catch {
        metadataValid = false;
      }
    }

    // Extract ID from name (e.g., "0001-feature" -> "0001")
    const idMatch = name.match(/^(\d{4}E?)/);
    const id = idMatch ? idMatch[1] : name;

    return {
      path: incPath,
      id,
      name,
      hasMetadata,
      metadataValid,
      status,
    };
  }

  private checkIntegrity(increments: IncrementInfo[]): CheckResult {
    const issues: string[] = [];

    for (const inc of increments) {
      if (!inc.hasMetadata) {
        issues.push(`${inc.name}: missing metadata.json`);
      } else if (!inc.metadataValid) {
        issues.push(`${inc.name}: invalid metadata.json`);
      }
    }

    if (issues.length === 0) {
      return {
        name: 'Increment integrity',
        status: 'pass',
        message: `${increments.length} increment(s) valid`,
      };
    }

    return {
      name: 'Increment integrity',
      status: 'fail',
      message: `${issues.length} issue(s)`,
      details: issues.slice(0, 5),
      fixSuggestion: 'Fix metadata.json files or remove corrupted increments',
    };
  }

  private checkDuplicates(increments: IncrementInfo[]): CheckResult {
    const idCounts = new Map<string, string[]>();

    for (const inc of increments) {
      const existing = idCounts.get(inc.id) || [];
      existing.push(inc.name);
      idCounts.set(inc.id, existing);
    }

    const duplicates = Array.from(idCounts.entries())
      .filter(([, names]) => names.length > 1)
      .map(([id, names]) => `${id}: ${names.join(', ')}`);

    if (duplicates.length === 0) {
      return {
        name: 'Duplicate IDs',
        status: 'pass',
        message: 'no duplicates',
      };
    }

    return {
      name: 'Duplicate IDs',
      status: 'warn',
      message: `${duplicates.length} duplicate ID(s)`,
      details: duplicates.slice(0, 5),
      fixSuggestion: 'Run: specweave fix-duplicates',
    };
  }

  private async checkStatusSync(increments: IncrementInfo[]): Promise<CheckResult> {
    // Simplified status sync check - just verify metadata matches folder location
    const issues: string[] = [];

    for (const inc of increments) {
      if (!inc.metadataValid || !inc.status) continue;

      const inArchive = inc.path.includes('_archive');
      const inAbandoned = inc.path.includes('_abandoned');
      const inPaused = inc.path.includes('_paused');

      if (inArchive && inc.status !== 'completed') {
        issues.push(`${inc.name}: in _archive but status is ${inc.status}`);
      }
      if (inAbandoned && inc.status !== 'abandoned') {
        issues.push(`${inc.name}: in _abandoned but status is ${inc.status}`);
      }
      if (inPaused && inc.status !== 'paused') {
        issues.push(`${inc.name}: in _paused but status is ${inc.status}`);
      }
    }

    if (issues.length === 0) {
      return {
        name: 'Status sync',
        status: 'pass',
        message: 'status matches location',
      };
    }

    return {
      name: 'Status sync',
      status: 'warn',
      message: `${issues.length} desync(s)`,
      details: issues.slice(0, 3),
      fixSuggestion: 'Run: specweave repair-status-desync',
    };
  }
}
