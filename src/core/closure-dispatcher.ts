/**
 * Closure Hook Dispatcher
 *
 * Dispatches increment closure to external tool providers (GitHub, JIRA, ADO)
 * using the function-map pattern per ADR-0240.
 *
 * Design:
 * - Each provider is a function, not an adapter class
 * - Partial failures are isolated — one provider crashing doesn't block others
 * - incrementClosed is always true (closure is a local SpecWeave operation;
 *   external sync failures are non-blocking)
 * - Provider functions are injected for testability; production wiring
 *   lazy-imports plugin modules
 *
 * @module core/closure-dispatcher
 */

/**
 * Context passed to each provider close function.
 */
export interface ClosureContext {
  projectRoot: string;
  incrementId: string;
}

/**
 * Per-provider toggle config for closure hooks.
 */
export interface ClosureConfig {
  github: boolean;
  jira: boolean;
  ado: boolean;
}

/**
 * Result from a single provider close function.
 */
export interface ProviderCloseResult {
  closed: string[];
  provider: string;
}

/**
 * Signature for a provider close function.
 */
export type ProviderCloseFn = (context: ClosureContext) => Promise<ProviderCloseResult>;

/**
 * Failure detail for a single provider.
 */
export interface ClosureFailure {
  provider: string;
  error: string;
}

/**
 * Aggregate result from dispatching closure to all providers.
 */
export interface ClosureResult {
  /** Always true — increment closure is a local operation */
  incrementClosed: boolean;
  /** Providers that succeeded */
  successes: ProviderCloseResult[];
  /** Providers that failed (non-blocking) */
  failures: ClosureFailure[];
}

const PROVIDERS = ['github', 'jira', 'ado'] as const;

/**
 * Dispatch closure to all enabled providers.
 *
 * Each provider runs independently — failures are captured, not propagated.
 * The function-map pattern (ADR-0240) keeps this flat and simple:
 * no adapter interfaces, no orchestrator classes.
 *
 * @param context - Project root and increment ID
 * @param config - Per-provider enable/disable flags
 * @param closeFns - Map of provider name → close function (injected for testing)
 */
export async function dispatchClosure(
  context: ClosureContext,
  config: ClosureConfig,
  closeFns: Record<string, ProviderCloseFn>,
): Promise<ClosureResult> {
  const successes: ProviderCloseResult[] = [];
  const failures: ClosureFailure[] = [];

  const tasks = PROVIDERS
    .filter((p) => config[p])
    .filter((p) => closeFns[p] != null)
    .map(async (provider) => {
      try {
        const result = await closeFns[provider](context);
        successes.push(result);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        failures.push({ provider, error: msg });
      }
    });

  await Promise.all(tasks);

  return {
    incrementClosed: true,
    successes,
    failures,
  };
}

/**
 * Build production close functions that lazy-import plugin modules.
 *
 * Called by SyncCoordinator to get the real provider functions.
 * Each function lazy-imports its plugin to avoid loading unused providers.
 */
export function buildProductionCloseFns(): Record<string, ProviderCloseFn> {
  return {
    github: async (ctx: ClosureContext) => {
      const { SyncCoordinator } = await import('../sync/sync-coordinator.js');
      const coordinator = new SyncCoordinator({
        projectRoot: ctx.projectRoot,
        incrementId: ctx.incrementId,
      });
      const result = await coordinator.syncIncrementClosure();
      return {
        closed: (result?.closedIssues ?? []).map(String),
        provider: 'github',
      };
    },
    jira: async (ctx: ClosureContext) => {
      const { SyncCoordinator } = await import('../sync/sync-coordinator.js');
      const coordinator = new SyncCoordinator({
        projectRoot: ctx.projectRoot,
        incrementId: ctx.incrementId,
      });
      const result = await coordinator.syncIncrementClosure();
      return {
        closed: (result?.closedIssues ?? []).map(String),
        provider: 'jira',
      };
    },
    ado: async (ctx: ClosureContext) => {
      const { SyncCoordinator } = await import('../sync/sync-coordinator.js');
      const coordinator = new SyncCoordinator({
        projectRoot: ctx.projectRoot,
        incrementId: ctx.incrementId,
      });
      const result = await coordinator.syncIncrementClosure();
      return {
        closed: (result?.closedIssues ?? []).map(String),
        provider: 'ado',
      };
    },
  };
}

/**
 * Build closure config from SpecWeave hooks configuration.
 *
 * Reads the post_increment_done section and maps legacy flag names
 * to per-provider booleans. All default to true when not specified.
 */
export function buildClosureConfigFromHooks(
  hooks?: {
    post_increment_done?: {
      close_github_issue?: boolean;
      close_jira_issue?: boolean;
      close_ado_work_item?: boolean;
      close_external_issue?: boolean;
    };
  },
  syncSettings?: { canUpdateExternalItems?: boolean },
): ClosureConfig {
  const canUpdate = syncSettings?.canUpdateExternalItems ?? true;
  const done = hooks?.post_increment_done;

  if (!canUpdate || !done) {
    return { github: false, jira: false, ado: false };
  }

  return {
    github: done.close_github_issue ?? done.close_external_issue ?? true,
    jira: done.close_jira_issue ?? done.close_external_issue ?? true,
    ado: done.close_ado_work_item ?? done.close_external_issue ?? true,
  };
}
