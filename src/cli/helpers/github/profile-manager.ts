/**
 * GitHub Profile Manager
 *
 * Manages multiple GitHub repository profiles for multi-repo projects
 * Handles CRUD operations and profile selection for increments
 *
 * @module cli/helpers/github/profile-manager
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';

/**
 * GitHub repository profile
 */
export interface GitHubProfile {
  id: string;           // Unique identifier (e.g., "frontend", "backend")
  provider: 'github';   // Always 'github' for this manager
  displayName: string;  // Human-readable name
  config: {
    owner: string;      // GitHub owner/organization
    repo: string;       // Repository name
    monorepoProjects?: string[];  // Projects within monorepo (optional)
  };
  timeRange?: {
    default: string;    // Default time range for syncing
    max: string;        // Maximum time range
  };
  rateLimits?: {
    maxItemsPerSync: number;
    warnThreshold: number;
  };
}

/**
 * Config file structure (partial)
 */
interface SpecWeaveConfig {
  sync?: {
    enabled: boolean;
    activeProfile: string;
    settings?: {
      autoCreateIssue?: boolean;
      syncDirection?: 'bidirectional' | 'push' | 'pull';
    };
    profiles?: Record<string, GitHubProfile>;
  };
  [key: string]: any;
}

/**
 * GitHub Profile Manager
 *
 * Handles all profile-related operations
 */
export class GitHubProfileManager {
  private configPath: string;
  private config: SpecWeaveConfig;

  constructor(projectPath: string) {
    this.configPath = path.join(projectPath, '.specweave', 'config.json');
    this.loadConfig();
  }

  /**
   * Load config from disk
   */
  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        this.config = JSON.parse(content);
      } else {
        this.config = {};
      }

      // Ensure sync structure exists
      if (!this.config.sync) {
        this.config.sync = {
          enabled: false,
          activeProfile: '',
          profiles: {}
        };
      }
      if (!this.config.sync.profiles) {
        this.config.sync.profiles = {};
      }
    } catch (error) {
      console.error(chalk.red('Failed to load config:'), error);
      this.config = {
        sync: {
          enabled: false,
          activeProfile: '',
          profiles: {}
        }
      };
    }
  }

  /**
   * Save config to disk
   */
  private saveConfig(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2) + '\n');
    } catch (error) {
      console.error(chalk.red('Failed to save config:'), error);
      throw error;
    }
  }

  /**
   * Get all GitHub profiles
   *
   * @returns Array of GitHub profiles
   */
  getAllProfiles(): GitHubProfile[] {
    if (!this.config.sync?.profiles) {
      return [];
    }

    return Object.entries(this.config.sync.profiles)
      .filter(([_, profile]) => profile.provider === 'github')
      .map(([id, profile]) => ({ ...profile, id }));
  }

  /**
   * Get a specific profile by ID
   *
   * @param id - Profile ID
   * @returns Profile or null
   */
  getProfile(id: string): GitHubProfile | null {
    const profile = this.config.sync?.profiles?.[id];
    if (!profile || profile.provider !== 'github') {
      return null;
    }
    return { ...profile, id };
  }

  /**
   * Get the active/default profile
   *
   * @returns Active profile or null
   */
  getActiveProfile(): GitHubProfile | null {
    const activeId = this.config.sync?.activeProfile;
    if (!activeId) {
      // If no active profile set, return the first GitHub profile
      const profiles = this.getAllProfiles();
      return profiles.length > 0 ? profiles[0] : null;
    }
    return this.getProfile(activeId);
  }

  /**
   * Add a new profile
   *
   * @param profile - Profile to add
   * @returns Success status
   */
  addProfile(profile: Omit<GitHubProfile, 'provider'>): boolean {
    try {
      if (!this.config.sync) {
        this.config.sync = {
          enabled: true,
          activeProfile: profile.id,
          profiles: {}
        };
      }

      // Check if ID already exists
      if (this.config.sync.profiles![profile.id]) {
        console.error(chalk.red(`Profile with ID '${profile.id}' already exists`));
        return false;
      }

      // Add the profile
      this.config.sync.profiles![profile.id] = {
        ...profile,
        provider: 'github',
        timeRange: profile.timeRange || {
          default: '1M',
          max: '6M'
        },
        rateLimits: profile.rateLimits || {
          maxItemsPerSync: 500,
          warnThreshold: 100
        }
      };

      // Set as active if it's the first profile
      if (!this.config.sync.activeProfile) {
        this.config.sync.activeProfile = profile.id;
        this.config.sync.enabled = true;
      }

      this.saveConfig();
      return true;
    } catch (error) {
      console.error(chalk.red('Failed to add profile:'), error);
      return false;
    }
  }

  /**
   * Update an existing profile
   *
   * @param id - Profile ID
   * @param updates - Partial profile updates
   * @returns Success status
   */
  updateProfile(id: string, updates: Partial<Omit<GitHubProfile, 'id' | 'provider'>>): boolean {
    try {
      const profile = this.config.sync?.profiles?.[id];
      if (!profile) {
        console.error(chalk.red(`Profile '${id}' not found`));
        return false;
      }

      // Update the profile
      this.config.sync!.profiles![id] = {
        ...profile,
        ...updates,
        provider: 'github'  // Ensure provider stays as github
      };

      this.saveConfig();
      return true;
    } catch (error) {
      console.error(chalk.red('Failed to update profile:'), error);
      return false;
    }
  }

  /**
   * Delete a profile
   *
   * @param id - Profile ID
   * @returns Success status
   */
  deleteProfile(id: string): boolean {
    try {
      if (!this.config.sync?.profiles?.[id]) {
        console.error(chalk.red(`Profile '${id}' not found`));
        return false;
      }

      // Delete the profile
      delete this.config.sync.profiles[id];

      // Update active profile if necessary
      if (this.config.sync.activeProfile === id) {
        const remainingProfiles = this.getAllProfiles();
        this.config.sync.activeProfile = remainingProfiles.length > 0
          ? remainingProfiles[0].id
          : '';

        // Disable sync if no profiles left
        if (remainingProfiles.length === 0) {
          this.config.sync.enabled = false;
        }
      }

      this.saveConfig();
      return true;
    } catch (error) {
      console.error(chalk.red('Failed to delete profile:'), error);
      return false;
    }
  }

  /**
   * Set active profile
   *
   * @param id - Profile ID
   * @returns Success status
   */
  setActiveProfile(id: string): boolean {
    try {
      if (!this.config.sync?.profiles?.[id]) {
        console.error(chalk.red(`Profile '${id}' not found`));
        return false;
      }

      this.config.sync!.activeProfile = id;
      this.config.sync!.enabled = true;
      this.saveConfig();
      return true;
    } catch (error) {
      console.error(chalk.red('Failed to set active profile:'), error);
      return false;
    }
  }

  /**
   * Interactive profile selection
   *
   * @param message - Prompt message
   * @returns Selected profile or null
   */
  async selectProfile(message: string = 'Select GitHub repository:'): Promise<GitHubProfile | null> {
    const profiles = this.getAllProfiles();

    if (profiles.length === 0) {
      console.log(chalk.yellow('No GitHub profiles configured'));
      return null;
    }

    if (profiles.length === 1) {
      // Auto-select if only one profile
      return profiles[0];
    }

    const { selectedId } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedId',
      message,
      choices: profiles.map(p => ({
        name: `${p.displayName} (${p.config.owner}/${p.config.repo})`,
        value: p.id,
        short: p.id
      }))
    }]);

    return this.getProfile(selectedId);
  }

  /**
   * Check if any profiles exist
   *
   * @returns True if profiles exist
   */
  hasProfiles(): boolean {
    return this.getAllProfiles().length > 0;
  }

  /**
   * Get profile count
   *
   * @returns Number of profiles
   */
  getProfileCount(): number {
    return this.getAllProfiles().length;
  }

  /**
   * List all profiles (formatted for display)
   */
  listProfiles(): void {
    const profiles = this.getAllProfiles();
    const activeId = this.config.sync?.activeProfile;

    if (profiles.length === 0) {
      console.log(chalk.yellow('No GitHub profiles configured'));
      return;
    }

    console.log(chalk.cyan('\nGitHub Repository Profiles:\n'));
    profiles.forEach(profile => {
      const isActive = profile.id === activeId;
      const marker = isActive ? chalk.green('✓') : ' ';
      const label = isActive ? chalk.green('(active)') : '';

      console.log(`${marker} ${chalk.white(profile.id)}: ${profile.displayName} ${label}`);
      console.log(`  ${chalk.gray(`${profile.config.owner}/${profile.config.repo}`)}`);

      if (profile.config.monorepoProjects && profile.config.monorepoProjects.length > 0) {
        console.log(`  ${chalk.gray('Projects:')} ${profile.config.monorepoProjects.join(', ')}`);
      }
    });
    console.log('');
  }
}