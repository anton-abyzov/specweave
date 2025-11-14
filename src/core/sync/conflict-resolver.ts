/**
 * Conflict Resolver
 *
 * Detects and resolves status conflicts between SpecWeave increments
 * and external tools (GitHub, JIRA, Azure DevOps).
 *
 * Supports four resolution strategies:
 * - prompt: Requires user interaction (UI)
 * - last-write-wins: Uses most recent timestamp
 * - specweave-wins: Always uses local SpecWeave status
 * - external-wins: Always uses external tool status
 */

export type ConflictResolutionStrategy =
  | 'prompt'
  | 'last-write-wins'
  | 'specweave-wins'
  | 'external-wins';

export interface StatusConflict {
  incrementId: string;
  tool: string;
  localStatus: string;
  remoteStatus: string;
  localTimestamp: string;
  remoteTimestamp: string;
}

export interface ConflictResolution {
  action: 'use-local' | 'use-remote';
  resolvedStatus: string;
}

export interface ConflictDetectionInput {
  incrementId: string;
  local: string;
  remote: string;
  tool: string;
  localTimestamp: string;
  remoteTimestamp: string;
}

export class ConflictResolver {
  /**
   * Detect status conflicts between local and remote
   *
   * @param input - Detection input with local/remote statuses and timestamps
   * @returns StatusConflict if conflict exists, null if statuses match
   */
  public async detect(input: ConflictDetectionInput): Promise<StatusConflict | null> {
    // No conflict if statuses match
    if (input.local === input.remote) {
      return null;
    }

    // Conflict detected - return conflict object
    return {
      incrementId: input.incrementId,
      tool: input.tool,
      localStatus: input.local,
      remoteStatus: input.remote,
      localTimestamp: input.localTimestamp,
      remoteTimestamp: input.remoteTimestamp
    };
  }

  /**
   * Resolve status conflict using specified strategy
   *
   * @param conflict - The status conflict to resolve
   * @param strategy - Resolution strategy to use
   * @returns Resolution with action and resolved status
   * @throws Error if strategy is unknown or requires user interaction
   */
  public async resolve(
    conflict: StatusConflict,
    strategy: ConflictResolutionStrategy
  ): Promise<ConflictResolution> {
    switch (strategy) {
      case 'specweave-wins':
        return {
          action: 'use-local',
          resolvedStatus: conflict.localStatus
        };

      case 'external-wins':
        return {
          action: 'use-remote',
          resolvedStatus: conflict.remoteStatus
        };

      case 'last-write-wins':
        return this.resolveByTimestamp(conflict);

      case 'prompt':
        throw new Error('Prompt strategy requires user interaction');

      default:
        throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
    }
  }

  /**
   * Resolve conflict by comparing timestamps (last-write-wins)
   *
   * @param conflict - The status conflict to resolve
   * @returns Resolution based on most recent timestamp
   */
  private resolveByTimestamp(conflict: StatusConflict): ConflictResolution {
    const localTime = new Date(conflict.localTimestamp).getTime();
    const remoteTime = new Date(conflict.remoteTimestamp).getTime();

    // If timestamps equal, tie-break favors local (SpecWeave is source of truth)
    if (localTime >= remoteTime) {
      return {
        action: 'use-local',
        resolvedStatus: conflict.localStatus
      };
    }

    return {
      action: 'use-remote',
      resolvedStatus: conflict.remoteStatus
    };
  }

  /**
   * Format conflict details for display to user
   *
   * @param conflict - The status conflict to format
   * @returns Human-readable conflict message
   */
  public formatConflictMessage(conflict: StatusConflict): string {
    return `
Status Conflict Detected for Increment ${conflict.incrementId}

Tool: ${conflict.tool}

Local (SpecWeave):
  Status: ${conflict.localStatus}
  Last Updated: ${conflict.localTimestamp}

Remote (${conflict.tool}):
  Status: ${conflict.remoteStatus}
  Last Updated: ${conflict.remoteTimestamp}

Conflict: Local and remote statuses differ.
    `.trim();
  }
}
