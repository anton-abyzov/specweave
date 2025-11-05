/**
 * Migration Script: Single-Project → Multi-Project Profiles
 *
 * Converts old configuration format (single project per provider in .env)
 * to new profile-based format (multiple projects in config.json + .env).
 *
 * Supports:
 * - GitHub (.env: GITHUB_TOKEN)
 * - JIRA (.env: JIRA_API_TOKEN, JIRA_EMAIL, JIRA_DOMAIN, JIRA_PROJECT_KEY)
 * - Azure DevOps (.env: AZURE_DEVOPS_PAT, AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT)
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { ProfileManager } from '../../core/sync/profile-manager';
import { ProjectContextManager } from '../../core/sync/project-context';
import { SyncProfile } from '../../core/types/sync-profile';

// ============================================================================
// Migration Script
// ============================================================================

export async function migrateToProfiles(
  projectRoot: string,
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const {
    backupOldConfig = true,
    dryRun = false,
    verbose = false,
  } = options;

  const result: MigrationResult = {
    success: false,
    profilesCreated: [],
    projectsCreated: [],
    warnings: [],
    errors: [],
  };

  try {
    // Step 1: Detect old configuration
    const oldConfig = await detectOldConfiguration(projectRoot);

    if (!oldConfig.detected) {
      result.warnings.push('No old configuration detected. Already using profiles?');
      result.success = true;
      return result;
    }

    if (verbose) {
      console.log('🔍 Detected old configuration:');
      console.log(`   GitHub: ${oldConfig.github ? 'Yes' : 'No'}`);
      console.log(`   JIRA: ${oldConfig.jira ? 'Yes' : 'No'}`);
      console.log(`   Azure DevOps: ${oldConfig.ado ? 'Yes' : 'No'}`);
      console.log('');
    }

    // Step 2: Backup old configuration
    if (backupOldConfig && !dryRun) {
      await backupConfiguration(projectRoot);
      if (verbose) {
        console.log('✅ Backed up old configuration to .specweave/config.json.backup');
        console.log('');
      }
    }

    // Step 3: Create managers
    const profileMgr = new ProfileManager(projectRoot);
    const projectMgr = new ProjectContextManager(projectRoot);

    await profileMgr.load();
    await projectMgr.load();

    // Step 4: Migrate GitHub profile
    if (oldConfig.github) {
      try {
        const profile = createGitHubProfile(oldConfig.github);
        if (!dryRun) {
          await profileMgr.createProfile('default-github', profile);
        }
        result.profilesCreated.push('default-github');

        if (verbose) {
          console.log('✅ Created GitHub profile: default-github');
          console.log(`   Repository: ${oldConfig.github.owner}/${oldConfig.github.repo}`);
          console.log('');
        }
      } catch (error: any) {
        result.errors.push(`GitHub migration failed: ${error.message}`);
      }
    }

    // Step 5: Migrate JIRA profile
    if (oldConfig.jira) {
      try {
        const profile = createJiraProfile(oldConfig.jira);
        if (!dryRun) {
          await profileMgr.createProfile('default-jira', profile);
        }
        result.profilesCreated.push('default-jira');

        if (verbose) {
          console.log('✅ Created JIRA profile: default-jira');
          console.log(`   Project: ${oldConfig.jira.domain} (${oldConfig.jira.projectKey})`);
          console.log('');
        }
      } catch (error: any) {
        result.errors.push(`JIRA migration failed: ${error.message}`);
      }
    }

    // Step 6: Migrate Azure DevOps profile
    if (oldConfig.ado) {
      try {
        const profile = createAdoProfile(oldConfig.ado);
        if (!dryRun) {
          await profileMgr.createProfile('default-ado', profile);
        }
        result.profilesCreated.push('default-ado');

        if (verbose) {
          console.log('✅ Created Azure DevOps profile: default-ado');
          console.log(`   Project: ${oldConfig.ado.organization}/${oldConfig.ado.project}`);
          console.log('');
        }
      } catch (error: any) {
        result.errors.push(`Azure DevOps migration failed: ${error.message}`);
      }
    }

    // Step 7: Create default project context
    if (result.profilesCreated.length > 0) {
      try {
        const projectId = 'default';
        const projectName = await detectProjectName(projectRoot);

        if (!dryRun) {
          await projectMgr.createProject(projectId, {
            name: projectName,
            description: 'Default project (auto-migrated)',
            keywords: [projectName.toLowerCase(), 'default'],
            defaultSyncProfile: result.profilesCreated[0], // Use first created profile
            specsFolder: `.specweave/docs/internal/specs/${projectId}`,
          });
        }

        result.projectsCreated.push(projectId);

        if (verbose) {
          console.log('✅ Created default project context');
          console.log(`   Name: ${projectName}`);
          console.log(`   Default profile: ${result.profilesCreated[0]}`);
          console.log('');
        }
      } catch (error: any) {
        result.warnings.push(`Project context creation failed: ${error.message}`);
      }
    }

    // Step 8: Clean up old config entries (remove provider-specific settings from config.json)
    if (!dryRun) {
      await cleanupOldConfig(projectRoot);
    }

    result.success = result.errors.length === 0;

    // Final summary
    if (verbose) {
      console.log('📊 Migration Summary:');
      console.log(`   Profiles created: ${result.profilesCreated.length}`);
      console.log(`   Projects created: ${result.projectsCreated.length}`);
      console.log(`   Warnings: ${result.warnings.length}`);
      console.log(`   Errors: ${result.errors.length}`);
      console.log('');

      if (result.success) {
        console.log('✅ Migration completed successfully!');
        console.log('');
        console.log('Next steps:');
        console.log('  1. Review profiles: /specweave:sync-profile list');
        console.log('  2. Test sync: Use updated sync commands');
        console.log('  3. Keep backup: .specweave/config.json.backup (until confirmed working)');
      } else {
        console.log('⚠️  Migration completed with errors:');
        result.errors.forEach((err) => console.log(`   • ${err}`));
      }
    }

    return result;
  } catch (error: any) {
    result.errors.push(`Migration failed: ${error.message}`);
    result.success = false;
    return result;
  }
}

// ============================================================================
// Detection
// ============================================================================

async function detectOldConfiguration(
  projectRoot: string
): Promise<OldConfiguration> {
  const envPath = path.join(projectRoot, '.env');
  const config: OldConfiguration = {
    detected: false,
  };

  try {
    // Read .env file
    const envContent = await fs.readFile(envPath, 'utf-8');
    const envVars = parseEnv(envContent);

    // Detect GitHub configuration
    if (envVars.GITHUB_TOKEN) {
      const repoInfo = await detectGitHubRepo(projectRoot);
      if (repoInfo) {
        config.github = repoInfo;
        config.detected = true;
      }
    }

    // Detect JIRA configuration
    if (envVars.JIRA_API_TOKEN && envVars.JIRA_EMAIL) {
      if (envVars.JIRA_DOMAIN && envVars.JIRA_PROJECT_KEY) {
        config.jira = {
          domain: envVars.JIRA_DOMAIN,
          projectKey: envVars.JIRA_PROJECT_KEY,
        };
        config.detected = true;
      }
    }

    // Detect Azure DevOps configuration
    if (envVars.AZURE_DEVOPS_PAT) {
      if (envVars.AZURE_DEVOPS_ORG && envVars.AZURE_DEVOPS_PROJECT) {
        config.ado = {
          organization: envVars.AZURE_DEVOPS_ORG,
          project: envVars.AZURE_DEVOPS_PROJECT,
        };
        config.detected = true;
      }
    }

    return config;
  } catch (error) {
    // .env doesn't exist or unreadable
    return config;
  }
}

async function detectGitHubRepo(
  projectRoot: string
): Promise<{ owner: string; repo: string } | null> {
  try {
    const { execFileNoThrow } = require('../../utils/execFileNoThrow.js');

    const result = await execFileNoThrow('git', ['remote', 'get-url', 'origin'], {
      cwd: projectRoot,
    });

    if (result.status !== 0) {
      return null;
    }

    const remote = result.stdout.trim();
    const match = remote.match(/github\.com[:/](.+)\/(.+?)(?:\.git)?$/);

    if (!match) {
      return null;
    }

    return {
      owner: match[1],
      repo: match[2],
    };
  } catch {
    return null;
  }
}

async function detectProjectName(projectRoot: string): Promise<string> {
  try {
    // Try package.json
    const pkgPath = path.join(projectRoot, 'package.json');
    if (await fs.pathExists(pkgPath)) {
      const pkg = await fs.readJSON(pkgPath);
      if (pkg.name) {
        return pkg.name;
      }
    }

    // Fallback to directory name
    return path.basename(projectRoot);
  } catch {
    return path.basename(projectRoot);
  }
}

function parseEnv(content: string): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Parse KEY=VALUE
    const match = trimmed.match(/^([A-Z_]+)=(.+)$/);
    if (match) {
      vars[match[1]] = match[2];
    }
  }

  return vars;
}

// ============================================================================
// Profile Creation
// ============================================================================

function createGitHubProfile(config: { owner: string; repo: string }): SyncProfile {
  return {
    provider: 'github',
    displayName: `${config.owner}/${config.repo}`,
    description: 'Auto-migrated from old configuration',
    config: {
      owner: config.owner,
      repo: config.repo,
    },
    timeRange: {
      default: '1M',
      max: '6M',
    },
    rateLimits: {
      maxItemsPerSync: 500,
      warnThreshold: 100,
    },
  };
}

function createJiraProfile(config: {
  domain: string;
  projectKey: string;
}): SyncProfile {
  return {
    provider: 'jira',
    displayName: `${config.domain} (${config.projectKey})`,
    description: 'Auto-migrated from old configuration',
    config: {
      domain: config.domain,
      projectKey: config.projectKey,
      issueType: 'Epic',
    },
    timeRange: {
      default: '1M',
      max: '3M',
    },
    rateLimits: {
      maxItemsPerSync: 200,
      warnThreshold: 50,
    },
  };
}

function createAdoProfile(config: {
  organization: string;
  project: string;
}): SyncProfile {
  return {
    provider: 'ado',
    displayName: `${config.organization}/${config.project}`,
    description: 'Auto-migrated from old configuration',
    config: {
      organization: config.organization,
      project: config.project,
      workItemType: 'Epic',
    },
    timeRange: {
      default: '1M',
      max: '12M',
    },
    rateLimits: {
      maxItemsPerSync: 500,
      warnThreshold: 100,
    },
  };
}

// ============================================================================
// Backup & Cleanup
// ============================================================================

async function backupConfiguration(projectRoot: string): Promise<void> {
  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  const backupPath = path.join(projectRoot, '.specweave', 'config.json.backup');

  if (await fs.pathExists(configPath)) {
    await fs.copy(configPath, backupPath);
  }
}

async function cleanupOldConfig(projectRoot: string): Promise<void> {
  // Remove old provider-specific settings from config.json (if any existed)
  // For now, no cleanup needed since old config was in .env only
  // Keep .env variables for credentials (they're still needed)
}

// ============================================================================
// Types
// ============================================================================

export interface MigrationOptions {
  backupOldConfig?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface MigrationResult {
  success: boolean;
  profilesCreated: string[];
  projectsCreated: string[];
  warnings: string[];
  errors: string[];
}

interface OldConfiguration {
  detected: boolean;
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
