/**
 * Resolve Structure CLI Command
 *
 * @deprecated Since v1.0.415. Use `specweave migrate-to-umbrella` instead.
 * This stub is kept for backward compatibility — it no-ops with a deprecation warning.
 *
 * @module cli/commands/resolve-structure
 */

export interface ResolveStructureOptions {
  type: 'single' | 'multiple';
}

export interface ResolveStructureResult {
  success: boolean;
  message: string;
  previouslyDeferred: boolean;
}

/**
 * @deprecated No-op deprecation stub. Use `specweave migrate-to-umbrella` instead.
 */
export async function resolveStructureCommand(
  _options: ResolveStructureOptions
): Promise<ResolveStructureResult> {
  console.warn('Warning: resolve-structure is deprecated since v1.0.415. Use specweave migrate-to-umbrella instead.');
  return {
    success: false,
    message: 'Deprecated since v1.0.415. Use specweave migrate-to-umbrella instead.',
    previouslyDeferred: false,
  };
}
