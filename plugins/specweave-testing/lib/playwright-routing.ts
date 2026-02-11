import { detectPlaywrightCli } from './playwright-cli-detector.js';

export type PlaywrightMode = 'cli' | 'mcp';

export type TaskType =
  | 'ui-automate'
  | 'e2e-test-run'
  | 'screenshot'
  | 'form-automation'
  | 'ci-testing'
  | 'ui-inspect'
  | 'page-exploration'
  | 'self-healing-test';

export interface RoutingConfig {
  /** @deprecated CLI is now the only mode. MCP plugin removed from auto-install (0198). */
  preferCli?: boolean;
}

/**
 * Resolve Playwright mode for a given task.
 *
 * v1.0.240 (0198): CLI-only mode. All tasks route to CLI.
 * MCP fallback only when CLI is not installed (graceful degradation).
 * Users who want Playwright MCP can install it manually.
 */
export function resolvePlaywrightMode(
  task: TaskType,
  config: RoutingConfig = {},
): PlaywrightMode {
  const { preferCli = true } = config;

  // Config override: allow forcing MCP if user explicitly installed Playwright MCP
  if (!preferCli) return 'mcp';

  const detection = detectPlaywrightCli({ useCache: true });
  if (!detection.installed) return 'mcp';

  // All tasks route to CLI — no MCP-preferred tasks
  return 'cli';
}
