/**
 * Hook Health Check Types
 *
 * Type definitions for the hook health monitoring system.
 * Supports detection, validation, and auto-fixing of hook failures.
 *
 * Part of increment 0037: Hook Health Check System
 */

/**
 * Trigger event that causes a hook to execute
 */
export type HookTrigger =
  | 'user-prompt-submit'
  | 'post-task-completion'
  | 'post-increment-change'
  | 'pre-tool-use'
  | 'post-write'
  | 'post-edit';

/**
 * Hook file type
 */
export type HookType = 'shell' | 'typescript' | 'javascript';

/**
 * Hook definition discovered by scanner
 */
export interface HookDefinition {
  /** Hook name (e.g., "update-ac-status") */
  name: string;

  /** Plugin that owns this hook (e.g., "specweave") */
  plugin: string;

  /** Absolute path to hook file */
  path: string;

  /** File type */
  type: HookType;

  /** Imported modules/dependencies */
  dependencies: string[];

  /** Trigger event */
  trigger: HookTrigger;

  /** Can be tested in isolation */
  testable: boolean;

  /** Failure blocks workflow (critical hooks) */
  critical: boolean;

  /** Expected execution time (ms) */
  expectedDuration?: number;
}

/**
 * Error detected during hook execution
 */
export interface HookError {
  /** Error type */
  type: 'import' | 'runtime' | 'timeout' | 'validation' | 'syntax';

  /** Error message */
  message: string;

  /** Stack trace (if available) */
  stack?: string;

  /** Auto-fix suggestion */
  suggestion?: string;

  /** Can be auto-fixed */
  fixable: boolean;

  /** Line number where error occurred */
  line?: number;

  /** Column number where error occurred */
  column?: number;
}

/**
 * Warning detected during hook execution
 */
export interface HookWarning {
  /** Warning type */
  type: 'performance' | 'deprecation' | 'best-practice' | 'security';

  /** Warning message */
  message: string;

  /** Severity level */
  severity: 'low' | 'medium' | 'high';

  /** Recommendation to address warning */
  recommendation?: string;
}

/**
 * Result of executing a single hook
 */
export interface HookExecutionResult {
  /** Hook name */
  hook: string;

  /** Plugin name */
  plugin: string;

  /** Hook passed health check */
  success: boolean;

  /** Process exit code */
  exitCode: number;

  /** Standard output */
  stdout: string;

  /** Standard error */
  stderr: string;

  /** Execution time in milliseconds */
  executionTime: number;

  /** Detected errors */
  errors: HookError[];

  /** Detected warnings */
  warnings: HookWarning[];

  /** Execution timestamp */
  timestamp: string;

  /** Performance threshold exceeded */
  performanceIssue: boolean;

  /** Expected vs actual duration */
  performanceRatio?: number;
}

/**
 * Overall health check result
 */
export interface HealthCheckResult {
  /** Check timestamp */
  timestamp: string;

  /** Total hooks checked */
  totalHooks: number;

  /** Hooks that passed */
  passedHooks: number;

  /** Hooks that failed */
  failedHooks: number;

  /** Critical hook failures */
  criticalFailures: number;

  /** Overall health status */
  overallHealth: 'healthy' | 'degraded' | 'unhealthy';

  /** Individual hook results */
  results: HookExecutionResult[];

  /** Summary and recommendations */
  summary: HealthSummary;

  /** Total execution time */
  totalExecutionTime: number;

  /** Project root path */
  projectRoot: string;
}

/**
 * Health check summary with recommendations
 */
export interface HealthSummary {
  /** Pass/warn/fail status */
  status: 'pass' | 'warn' | 'fail';

  /** Summary message */
  message: string;

  /** Actionable recommendations */
  recommendations: string[];

  /** Number of auto-fixable issues */
  fixableIssues: number;

  /** Number of issues requiring manual intervention */
  manualIssues: number;

  /** Hooks with performance issues */
  slowHooks: string[];

  /** Critical hooks that failed */
  criticalHooksFailed: string[];
}

/**
 * Auto-fix result
 */
export interface FixResult {
  /** Hook that was fixed */
  hook: string;

  /** Fix was successful */
  success: boolean;

  /** Type of fix applied */
  fixType: 'import' | 'static-method' | 'timeout' | 'dependency';

  /** Fix description */
  description: string;

  /** Files modified */
  filesModified: string[];

  /** Error if fix failed */
  error?: string;

  /** Verification after fix */
  verification?: HookExecutionResult;
}

/**
 * Auto-fix batch result
 */
export interface BatchFixResult {
  /** Total fixes attempted */
  totalFixes: number;

  /** Successful fixes */
  successfulFixes: number;

  /** Failed fixes */
  failedFixes: number;

  /** Individual fix results */
  results: FixResult[];

  /** Hooks that require manual intervention */
  manualFixRequired: string[];

  /** Overall success */
  success: boolean;
}

/**
 * Hook health check configuration
 */
export interface HealthCheckConfig {
  /** Project root directory */
  projectRoot: string;

  /** Timeout for hook execution (ms) */
  timeout: number;

  /** Run auto-fix for detected issues */
  autoFix: boolean;

  /** Verbose output */
  verbose: boolean;

  /** Check only critical hooks */
  criticalOnly: boolean;

  /** Specific hooks to check (empty = all) */
  hooksToCheck: string[];

  /** Performance threshold ratio (actual/expected) */
  performanceThreshold: number;

  /** Fail on warnings */
  failOnWarnings: boolean;
}

/**
 * Health report format
 */
export type ReportFormat = 'console' | 'markdown' | 'json' | 'junit';

/**
 * Health report options
 */
export interface ReportOptions {
  /** Output format */
  format: ReportFormat;

  /** Output file path (null = stdout) */
  outputPath?: string;

  /** Include full details */
  detailed: boolean;

  /** Color output for console */
  color: boolean;

  /** Show only failures */
  failuresOnly: boolean;
}

/**
 * Scanner configuration
 */
export interface ScannerConfig {
  /** Project root */
  projectRoot: string;

  /** Plugin directories to scan */
  pluginDirs: string[];

  /** Include non-testable hooks */
  includeNonTestable: boolean;
}

/**
 * Executor configuration
 */
export interface ExecutorConfig {
  /** Execution timeout (ms) */
  timeout: number;

  /** Capture stdout */
  captureStdout: boolean;

  /** Capture stderr */
  captureStderr: boolean;

  /** Test increment ID to use */
  testIncrementId: string;

  /** Test input data */
  testInput?: any;
}

/**
 * Import error details
 */
export interface ImportErrorDetails {
  /** Missing module path */
  modulePath: string;

  /** Importing file */
  importingFile: string;

  /** Import statement line */
  importStatement: string;

  /** Has .js extension */
  hasExtension: boolean;

  /** Suggested fix */
  suggestedPath: string;

  /** Fix confidence */
  fixConfidence: 'high' | 'medium' | 'low';
}

/**
 * Performance analysis result
 */
export interface PerformanceAnalysis {
  /** Hook name */
  hook: string;

  /** Actual execution time (ms) */
  actualTime: number;

  /** Expected execution time (ms) */
  expectedTime: number;

  /** Performance ratio (actual/expected) */
  ratio: number;

  /** Exceeds threshold */
  exceedsThreshold: boolean;

  /** Performance recommendation */
  recommendation?: string;
}
