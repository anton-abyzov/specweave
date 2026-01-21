/**
 * Setup State Manager
 *
 * Manages persistent state for multi-repository setup with atomic operations.
 * Enables Ctrl+C recovery by saving progress incrementally.
 *
 * Features:
 * - Atomic file writes (temp → rename)
 * - Automatic backups before updates
 * - State validation and corruption recovery
 * - Resume detection for interrupted setups
 * - Secure permissions (0600)
 *
 * @module setup-state-manager
 */

import * as fs from '../../utils/fs-native.js';
import path from 'path';

/**
 * Repository architecture types
 * v1.0.13: 'parent' is deprecated - kept for backward compatibility with old state files
 */
export type SetupArchitecture = 'single' | 'multi-repo' | 'parent' | 'monorepo';

/**
 * Repository configuration
 */
export interface RepoConfig {
  id: string;
  displayName: string;
  owner: string;
  repo: string;
  visibility: 'private' | 'public';
  created?: boolean;
  cloned?: boolean;
  path?: string;
  url?: string;
}

/**
 * Parent repository configuration
 * @deprecated v1.0.13 - Parent repo concept removed. Kept for backward compatibility with old state files.
 */
export interface ParentRepoConfig {
  name: string;
  owner: string;
  description: string;
  visibility: 'private' | 'public';
  createOnGitHub: boolean;
  url?: string;
}

/**
 * Setup state structure
 * v1.0.13: parentRepo is deprecated but kept for backward compatibility
 */
export interface SetupState {
  version: string;
  architecture: SetupArchitecture;
  /** @deprecated v1.0.13 - Parent repo concept removed */
  parentRepo?: ParentRepoConfig;
  repos: RepoConfig[];
  currentStep: string;
  timestamp: string;
  envCreated: boolean;
  monorepoProjects?: string[];
}

/**
 * State file paths
 */
interface StatePaths {
  state: string;
  backup: string;
  temp: string;
}

/**
 * Setup State Manager
 *
 * Handles atomic state persistence with backup/restore for Ctrl+C recovery.
 */
export class SetupStateManager {
  private projectRoot: string;
  private paths: StatePaths;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;

    const stateDir = path.join(projectRoot, '.specweave');
    this.paths = {
      state: path.join(stateDir, 'setup-state.json'),
      backup: path.join(stateDir, 'setup-state.backup.json'),
      temp: path.join(stateDir, 'setup-state.tmp.json')
    };
  }

  /**
   * Save state atomically with backup
   *
   * Process:
   * 1. Create backup of existing state (if exists)
   * 2. Write to temp file
   * 3. Set permissions to 0600
   * 4. Atomic rename temp → state
   * 5. On error, restore from backup
   *
   * @param state - State to save
   */
  async saveState(state: SetupState): Promise<void> {
    try {
      // Ensure directory exists
      await fs.ensureDir(path.dirname(this.paths.state));

      // Create backup of existing state
      if (await fs.pathExists(this.paths.state)) {
        await fs.copy(this.paths.state, this.paths.backup, { overwrite: true });
      }

      // Write to temp file
      await fs.writeJson(this.paths.temp, state, { spaces: 2 });

      // Set secure permissions (owner read/write only)
      if (process.platform !== 'win32') {
        await fs.chmod(this.paths.temp, 0o600);
      }

      // Atomic rename
      await fs.rename(this.paths.temp, this.paths.state);

    } catch (error) {
      // Restore from backup on failure
      if (await fs.pathExists(this.paths.backup)) {
        await fs.copy(this.paths.backup, this.paths.state, { overwrite: true });
      }

      throw new Error(`Failed to save setup state: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load state with validation and corruption recovery
   *
   * Process:
   * 1. Try to load main state file
   * 2. Validate schema
   * 3. On corruption, try backup
   * 4. Return null if no valid state
   *
   * @returns Loaded state or null if not found/invalid
   */
  async loadState(): Promise<SetupState | null> {
    try {
      // Try main state file
      if (await fs.pathExists(this.paths.state)) {
        try {
          const state = await fs.readJson(this.paths.state);

          if (this.validateState(state)) {
            return state;
          }

          // Invalid state, try backup
          console.warn('⚠️  Main state file invalid, trying backup...');
        } catch (parseError) {
          // JSON parse error, try backup
          console.warn('⚠️  Main state file corrupted, trying backup...');
        }
      }

      // Try backup
      if (await fs.pathExists(this.paths.backup)) {
        try {
          const state = await fs.readJson(this.paths.backup);

          if (this.validateState(state)) {
            // Restore backup to main
            await fs.copy(this.paths.backup, this.paths.state, { overwrite: true });
            return state;
          }
        } catch (parseError) {
          console.error('Backup file also corrupted');
        }
      }

      return null;

    } catch (error) {
      console.error('Failed to load setup state:', error);
      return null;
    }
  }

  /**
   * Detect incomplete setup and prompt for resume
   *
   * @returns Setup state if incomplete, null otherwise
   */
  async detectAndResumeSetup(): Promise<SetupState | null> {
    const state = await this.loadState();

    if (!state) {
      return null;
    }

    // Check if setup is complete
    if (state.currentStep === 'complete') {
      return null;
    }

    // Setup is incomplete - return it for resume
    return state;
  }

  /**
   * Delete state files (on successful completion)
   */
  async deleteState(): Promise<void> {
    try {
      if (await fs.pathExists(this.paths.state)) {
        await fs.remove(this.paths.state);
      }

      if (await fs.pathExists(this.paths.backup)) {
        await fs.remove(this.paths.backup);
      }

      if (await fs.pathExists(this.paths.temp)) {
        await fs.remove(this.paths.temp);
      }
    } catch (error) {
      // Non-fatal, just log
      console.warn('Failed to delete state files:', error);
    }
  }

  private validateState(state: any): state is SetupState {
    if (!state || typeof state !== 'object') {
      return false;
    }

    if (state.version !== '1.0') {
      return false;
    }

    const validArchitectures = ['single', 'multi-repo', 'parent', 'monorepo'];
    if (!state.architecture || !validArchitectures.includes(state.architecture)) {
      return false;
    }

    if (!state.currentStep || !state.timestamp) {
      return false;
    }

    if (!Array.isArray(state.repos) || !state.repos.every((r: any) => this.validateRepo(r))) {
      return false;
    }

    if (state.parentRepo && !this.validateParentRepo(state.parentRepo)) {
      return false;
    }

    return true;
  }

  private validateParentRepo(parentRepo: any): parentRepo is ParentRepoConfig {
    if (!parentRepo || typeof parentRepo !== 'object') {
      return false;
    }

    const required = ['name', 'owner', 'description', 'visibility', 'createOnGitHub'];
    const hasAllFields = required.every(field => field in parentRepo);
    const validVisibility = ['private', 'public'].includes(parentRepo.visibility);
    const validCreateFlag = typeof parentRepo.createOnGitHub === 'boolean';

    return hasAllFields && validVisibility && validCreateFlag;
  }

  private validateRepo(repo: any): repo is RepoConfig {
    if (!repo || typeof repo !== 'object') {
      return false;
    }

    const required = ['id', 'displayName', 'owner', 'repo', 'visibility', 'created'];
    const hasAllFields = required.every(field => field in repo);
    const validVisibility = ['private', 'public'].includes(repo.visibility);
    const validCreatedFlag = typeof repo.created === 'boolean';

    return hasAllFields && validVisibility && validCreatedFlag;
  }

  /**
   * Get state file path (for testing)
   */
  getStatePath(): string {
    return this.paths.state;
  }

  /**
   * Get backup file path (for testing)
   */
  getBackupPath(): string {
    return this.paths.backup;
  }
}
