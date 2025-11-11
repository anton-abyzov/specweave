#!/usr/bin/env node

/**
 * Migration script to convert old single-repo configs to new profile-based configs
 *
 * Old format (v0.15.x and earlier):
 * {
 *   sync: {
 *     enabled: true,
 *     provider: "github",
 *     github: {
 *       owner: "myorg",
 *       repo: "myrepo"
 *     }
 *   }
 * }
 *
 * New format (v0.16.0+):
 * {
 *   sync: {
 *     enabled: true,
 *     activeProfile: "github-default",
 *     profiles: {
 *       "github-default": {
 *         provider: "github",
 *         displayName: "Default GitHub Repository",
 *         config: {
 *           owner: "myorg",
 *           repo: "myrepo"
 *         }
 *       }
 *     },
 *     settings: {
 *       autoCreateIssue: false,
 *       syncDirection: "bidirectional"
 *     }
 *   }
 * }
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

interface OldSyncConfig {
  enabled?: boolean;
  provider?: string;
  github?: {
    owner: string;
    repo: string;
  };
  jira?: {
    domain: string;
    projectKey: string;
  };
  ado?: {
    organization: string;
    project: string;
  };
}

interface NewSyncConfig {
  enabled: boolean;
  activeProfile: string;
  profiles: Record<string, any>;
  settings?: {
    autoCreateIssue?: boolean;
    syncDirection?: string;
  };
}

export function migrateToProfiles(projectPath: string): boolean {
  const configPath = path.join(projectPath, '.specweave', 'config.json');

  if (!fs.existsSync(configPath)) {
    console.log(chalk.yellow('No config.json found. Skipping migration.'));
    return false;
  }

  try {
    // Read existing config
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Check if already migrated
    if (config.sync?.profiles) {
      console.log(chalk.green('✓ Config already uses profile-based format.'));
      return true;
    }

    // Check if sync exists in old format
    if (!config.sync || !config.sync.provider) {
      console.log(chalk.gray('No sync configuration found. Skipping migration.'));
      return false;
    }

    const oldSync = config.sync as OldSyncConfig;
    const newSync: NewSyncConfig = {
      enabled: oldSync.enabled || false,
      activeProfile: '',
      profiles: {},
      settings: {
        autoCreateIssue: false,
        syncDirection: 'bidirectional'
      }
    };

    // Migrate GitHub configuration
    if (oldSync.provider === 'github' && oldSync.github) {
      const profileId = 'github-default';
      newSync.activeProfile = profileId;
      newSync.profiles[profileId] = {
        provider: 'github',
        displayName: 'Default GitHub Repository',
        config: {
          owner: oldSync.github.owner,
          repo: oldSync.github.repo
        }
      };

      console.log(chalk.green(`✓ Migrated GitHub config: ${oldSync.github.owner}/${oldSync.github.repo}`));
    }

    // Migrate Jira configuration
    if (oldSync.provider === 'jira' && oldSync.jira) {
      const profileId = 'jira-default';
      newSync.activeProfile = profileId;
      newSync.profiles[profileId] = {
        provider: 'jira',
        displayName: 'Default Jira Project',
        config: {
          domain: oldSync.jira.domain,
          projectKey: oldSync.jira.projectKey,
          issueType: 'Task'
        }
      };

      console.log(chalk.green(`✓ Migrated Jira config: ${oldSync.jira.domain} / ${oldSync.jira.projectKey}`));
    }

    // Migrate Azure DevOps configuration
    if (oldSync.provider === 'ado' && oldSync.ado) {
      const profileId = 'ado-default';
      newSync.activeProfile = profileId;
      newSync.profiles[profileId] = {
        provider: 'ado',
        displayName: 'Default Azure DevOps Project',
        config: {
          organization: oldSync.ado.organization,
          project: oldSync.ado.project,
          workItemType: 'User Story'
        }
      };

      console.log(chalk.green(`✓ Migrated ADO config: ${oldSync.ado.organization} / ${oldSync.ado.project}`));
    }

    // Create backup of old config
    const backupPath = configPath + '.backup-' + Date.now();
    fs.copyFileSync(configPath, backupPath);
    console.log(chalk.gray(`Created backup: ${path.basename(backupPath)}`));

    // Update config with new sync structure
    config.sync = newSync;

    // Write updated config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
    console.log(chalk.green('✓ Migration complete! Config updated to profile-based format.'));

    // Show summary
    console.log('\n' + chalk.cyan('Migration Summary:'));
    console.log(`  Active Profile: ${newSync.activeProfile}`);
    console.log(`  Profiles Created: ${Object.keys(newSync.profiles).length}`);
    console.log(`  Backup Created: ${path.basename(backupPath)}`);

    return true;
  } catch (error) {
    console.error(chalk.red('Migration failed:'), error);
    return false;
  }
}

// CLI execution
if (require.main === module) {
  const projectPath = process.cwd();
  console.log(chalk.cyan('\n🔄 Migrating to Profile-Based Sync Configuration\n'));

  const success = migrateToProfiles(projectPath);

  if (success) {
    console.log('\n' + chalk.green('✅ Migration successful!'));
    console.log(chalk.gray('You can now add multiple repositories using the GitHub profile manager.'));
  } else {
    console.log('\n' + chalk.yellow('⚠️  No migration needed or migration skipped.'));
  }
}

export default migrateToProfiles;