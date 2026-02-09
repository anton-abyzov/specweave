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
  preferCli?: boolean;
}

/** Tasks that benefit from MCP's rich DOM introspection */
const MCP_PREFERRED_TASKS: ReadonlySet<TaskType> = new Set([
  'ui-inspect',
  'page-exploration',
  'self-healing-test',
]);

export function resolvePlaywrightMode(
  task: TaskType,
  config: RoutingConfig = {},
): PlaywrightMode {
  const { preferCli = true } = config;

  if (!preferCli) return 'mcp';

  const detection = detectPlaywrightCli({ useCache: true });
  if (!detection.installed) return 'mcp';

  return MCP_PREFERRED_TASKS.has(task) ? 'mcp' : 'cli';
}
