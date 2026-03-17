/**
 * GitHub Conflict Resolver
 *
 * Field-level conflict detection and resolution between spec state
 * and GitHub issue state. Supports title, status, and AC fields.
 *
 * @module github-conflict-resolver
 */

export type ConflictResolution = 'github-wins' | 'spec-wins' | 'prompt';

export interface ConflictField {
  field: string;
  specValue: string;
  githubValue: string;
  defaultResolution: ConflictResolution;
}

export interface ResolvedConflict {
  field: string;
  specValue: string;
  githubValue: string;
  resolution: ConflictResolution;
  resolvedValue: string;
  resolvedAt: string;
}

export interface ConflictResolverConfig {
  defaultStatusResolution?: ConflictResolution;
  defaultContentResolution?: ConflictResolution;
  defaultACResolution?: ConflictResolution;
}

interface SpecState {
  title: string;
  status: string;
  acceptanceCriteria: Array<{ id: string; completed: boolean }>;
}

interface GitHubState {
  title: string;
  state: 'open' | 'closed';
  acceptanceCriteria: Array<{ id: string; completed: boolean }>;
}

export class GitHubConflictResolver {
  private statusResolution: ConflictResolution;
  private contentResolution: ConflictResolution;
  private acResolution: ConflictResolution;

  constructor(config?: ConflictResolverConfig) {
    this.statusResolution = config?.defaultStatusResolution ?? 'github-wins';
    this.contentResolution = config?.defaultContentResolution ?? 'prompt';
    this.acResolution = config?.defaultACResolution ?? 'github-wins';
  }

  /**
   * Detect conflicts between spec and GitHub states.
   */
  detectConflicts(specState: SpecState, githubState: GitHubState): ConflictField[] {
    const conflicts: ConflictField[] = [];

    // Title conflict
    if (specState.title !== githubState.title) {
      conflicts.push({
        field: 'title',
        specValue: specState.title,
        githubValue: githubState.title,
        defaultResolution: this.contentResolution,
      });
    }

    // Status conflict: map GitHub state to spec status for comparison
    const githubStatus = githubState.state; // 'open' or 'closed'
    const specStatus = specState.status;
    const statusMismatch = this.isStatusConflict(specStatus, githubStatus);

    if (statusMismatch) {
      conflicts.push({
        field: 'status',
        specValue: specStatus,
        githubValue: githubStatus,
        defaultResolution: this.statusResolution,
      });
    }

    // AC conflicts
    const ghAcMap = new Map(
      githubState.acceptanceCriteria.map(ac => [ac.id, ac.completed]),
    );

    for (const specAc of specState.acceptanceCriteria) {
      const ghCompleted = ghAcMap.get(specAc.id);
      if (ghCompleted !== undefined && specAc.completed !== ghCompleted) {
        conflicts.push({
          field: `ac:${specAc.id}`,
          specValue: String(specAc.completed),
          githubValue: String(ghCompleted),
          defaultResolution: this.acResolution,
        });
      }
    }

    return conflicts;
  }

  /**
   * Resolve all conflicts using their default resolution strategy.
   */
  resolveConflicts(conflicts: ConflictField[]): ResolvedConflict[] {
    return conflicts.map(c => this.resolveConflict(c));
  }

  /**
   * Resolve a single conflict with optional override.
   */
  resolveConflict(conflict: ConflictField, resolution?: ConflictResolution): ResolvedConflict {
    const effectiveResolution = resolution ?? conflict.defaultResolution;
    let resolvedValue: string;

    switch (effectiveResolution) {
      case 'github-wins':
        resolvedValue = conflict.githubValue;
        break;
      case 'spec-wins':
        resolvedValue = conflict.specValue;
        break;
      case 'prompt':
        // Prompt keeps spec value pending user decision
        resolvedValue = conflict.specValue;
        break;
    }

    return {
      field: conflict.field,
      specValue: conflict.specValue,
      githubValue: conflict.githubValue,
      resolution: effectiveResolution,
      resolvedValue,
      resolvedAt: new Date().toISOString(),
    };
  }

  /**
   * Check if spec status and GitHub state represent a conflict.
   */
  private isStatusConflict(specStatus: string, githubState: string): boolean {
    // "completed" spec + "open" GitHub = conflict
    if (specStatus === 'completed' && githubState === 'open') return true;
    // "planned" or "in-progress" spec + "closed" GitHub = conflict
    if (specStatus !== 'completed' && githubState === 'closed') return true;
    return false;
  }
}
