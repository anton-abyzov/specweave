/**
 * Doctor command types - diagnostic health checks for SpecWeave projects
 */

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';

export interface CheckResult {
  name: string;
  status: CheckStatus;
  message: string;
  details?: string[];
  fixSuggestion?: string;
  durationMs?: number;
}

export interface CategoryResult {
  category: string;
  status: CheckStatus;
  checks: CheckResult[];
}

export interface DoctorReport {
  timestamp: string;
  projectRoot: string;
  categories: CategoryResult[];
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failures: number;
    skipped: number;
  };
  fixCommand?: string;
}

export interface DoctorOptions {
  verbose?: boolean;
  json?: boolean;
  fix?: boolean;
  quick?: boolean;
  skipExternal?: boolean;
}

export interface HealthChecker {
  category: string;
  check(projectRoot: string, options: DoctorOptions): Promise<CategoryResult>;
}

/**
 * Calculate overall status from individual check statuses
 */
export function calculateOverallStatus(checks: CheckResult[]): CheckStatus {
  if (checks.some((c) => c.status === 'fail')) return 'fail';
  if (checks.some((c) => c.status === 'warn')) return 'warn';
  if (checks.every((c) => c.status === 'skip')) return 'skip';
  return 'pass';
}
