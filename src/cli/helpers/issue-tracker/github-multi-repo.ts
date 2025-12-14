/**
 * Enhanced Multi-Repository GitHub Integration
 *
 * Provides improved UX for various GitHub repository configurations:
 * - No repository yet (greenfield)
 * - Single repository
 * - Multiple repositories (microservices/polyrepo)
 * - Monorepo (single repo, multiple projects)
 * - Parent repository approach (for multi-repo)
 * - Auto-detection from git remotes
 * - GitHub repository creation via API
 *
 * @module cli/helpers/issue-tracker/github-multi-repo
 */

import chalk from 'chalk';
import { select, input, confirm, number } from '@inquirer/prompts';
import ora from 'ora';
import path from 'path';
import {
  detectGitHubRemotes,
  detectPrimaryGitHubRemote,
  hasMultipleGitHubRemotes,
  formatGitRemote,
  getUniqueRepositories,
  type GitRemote
} from '../../../utils/git-detector.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import { getLocaleManager } from '../../../core/i18n/locale-manager.js';
import { RepoStructureManager } from '../../../core/repo-structure/repo-structure-manager.js';
import { getGitHubAuth } from '../../../utils/auth-helpers.js';

/**
 * GitHub setup type options
 */
export type GitHubSetupType = 'none' | 'single' | 'multiple' | 'monorepo' | 'auto-detect';

/**
 * GitHub repository profile
 */
export interface GitHubProfile {
  id: string;           // e.g., "frontend", "backend", "main"
  displayName: string;  // e.g., "Frontend Application"
  owner: string;        // e.g., "myorg"
  repo: string;         // e.g., "frontend-app"
  isDefault?: boolean;  // Mark primary repo
}

/**
 * GitHub configuration result
 */
export interface GitHubConfiguration {
  token: string;
  instanceType: 'cloud' | 'enterprise';
  apiEndpoint?: string;
  setupType: GitHubSetupType;
  profiles: GitHubProfile[];
  monorepoProjects?: string[];  // For monorepo setup
}

/**
 * Result from promptGitHubSetupType including optional profiles
 */
export interface GitHubSetupResult {
  setupType: GitHubSetupType;
  profiles?: GitHubProfile[];      // Profiles extracted from RepoStructureManager
  monorepoProjects?: string[];     // Projects for monorepo setup
}

/**
 * Prompt for GitHub setup type
 * Enhanced to integrate with RepoStructureManager for repository creation
 *
 * @param projectPath - Path to project directory
 * @param githubToken - Optional GitHub token for API calls
 * @param repositoryHosting - Optional repository hosting choice from init.ts (prevents duplicate prompts)
 * @param recursionDepth - Internal recursion tracking to prevent infinite loops (Issue #5 fix)
 * @param gitUrlFormat - Optional Git URL format from repository setup (SSH or HTTPS) - v1.0.8+
 * @returns Selected setup type with optional profiles (if RepoStructureManager was used)
 */
export async function promptGitHubSetupType(projectPath?: string, githubToken?: string, repositoryHosting?: string, recursionDepth: number = 0, gitUrlFormat?: 'ssh' | 'https'): Promise<GitHubSetupResult> {
  // Issue #5 fix: Prevent infinite recursion
  const MAX_RECURSION_DEPTH = 3;
  if (recursionDepth >= MAX_RECURSION_DEPTH) {
    console.log(chalk.red(`\n❌ Too many setup redirections (${MAX_RECURSION_DEPTH} attempts)`));
    console.log(chalk.yellow('   Falling back to single repository setup\n'));
    return { setupType: 'single' };
  }
  // CRITICAL: Check if user already answered this question in init.ts
  // Map repositoryHosting to architecture type for RepoStructureManager
  let preSelectedArchitecture: 'single' | 'github-parent' | undefined = undefined;

  if (repositoryHosting) {
    // Non-GitHub providers - skip GitHub-specific setup
    if (repositoryHosting === 'bitbucket-single' || repositoryHosting === 'bitbucket-multirepo' ||
        repositoryHosting === 'ado-single' || repositoryHosting === 'ado-multirepo' ||
        repositoryHosting === 'other-single' || repositoryHosting === 'other-multirepo' ||
        repositoryHosting === 'local') {
      // Not using GitHub - return none to skip GitHub setup
      return { setupType: 'none' };
    }

    // GitHub providers - map to architecture for RepoStructureManager
    if (repositoryHosting === 'github-single' || repositoryHosting === 'github') {
      preSelectedArchitecture = 'single';
    } else if (repositoryHosting === 'github-multirepo') {
      // 🔥 FIX: Don't return early! Pass to RepoStructureManager which has parent repo logic!
      preSelectedArchitecture = 'github-parent';
    }
  }

  // CRITICAL (v1.0.5): Skip duplicate messages when architecture is pre-selected
  // This prevents showing "Repository Configuration" again after user already answered
  if (!preSelectedArchitecture) {
    console.log(chalk.cyan('\n📂 Repository Configuration\n'));
    console.log(chalk.gray('How should we configure your GitHub repositories?\n'));
  }

  // If we have projectPath and token, TRY to use RepoStructureManager for enhanced flow
  // P1-2 FIX: Split large try-catch into granular error handling for better debugging
  if (projectPath && githubToken) {
    const manager = new RepoStructureManager(projectPath, githubToken);

    // Step 1: Prompt for repository structure
    let config;
    try {
      // 🔥 FIX (v1.0.7): Pass preSelectedArchitecture AND platform 'github' to avoid duplicate prompts!
      // When this function is called from GitHub issue tracker setup, GitHub was already selected as platform
      // So we pass 'github' as preSelectedPlatform to skip the "Select your Git hosting platform" question
      // 🔥 FIX (v1.0.8): Also pass gitUrlFormat to avoid asking about SSH/HTTPS again!
      config = await manager.promptStructure(preSelectedArchitecture, 'github', gitUrlFormat);
    } catch (error: any) {
      console.log(chalk.yellow('\n⚠️  Failed to prompt repository structure'));
      console.log(chalk.gray(`   Error: ${error.message || 'Unknown error'}`));
      console.log(chalk.gray('   Falling back to simplified setup\n'));

      // Issue #3 fix: Preserve stack trace for debugging
      if (process.env.DEBUG || process.env.SPECWEAVE_DEBUG) {
        console.error(chalk.gray('\n📋 Stack trace (DEBUG mode):'));
        console.error(chalk.gray(error.stack || 'No stack trace available'));
        console.error('');
      }

      // CRITICAL FIX: Use repositoryHosting if already selected
      if (repositoryHosting) {
        console.log(chalk.yellow('   → Using previously selected setup type\n'));
        if (preSelectedArchitecture === 'single') {
          return { setupType: 'single' };
        } else if (preSelectedArchitecture === 'github-parent') {
          return { setupType: 'multiple' };
        }
        return { setupType: 'none' };
      }

      // Fall through to legacy prompt
      // (continue after outer if block)
      config = null;
    }

    // If config was successfully obtained, proceed with setup
    if (config) {
      // Step 2: Create repositories on GitHub (non-fatal - can continue without)
      if (config.repositories.some(r => r.createOnGitHub) || config.parentRepo?.createOnGitHub) {
        try {
          console.log(chalk.cyan(`\n🚀 Creating ${config.provider.config.name} Repositories\n`));
          await manager.createRepositories(config);
        } catch (error: any) {
          console.log(chalk.yellow('\n⚠️  Failed to create GitHub repositories'));
          console.log(chalk.gray(`   Error: ${error.message || 'Unknown error'}`));
          console.log(chalk.yellow('   → Continuing with local setup only\n'));
          // Continue - repositories can be created manually later
        }
      }

      // Step 3: Initialize local repositories
      try {
        console.log(chalk.cyan('\n📁 Setting Up Local Repositories\n'));
        await manager.initializeLocalRepos(config);
      } catch (error: any) {
        console.log(chalk.red('\n❌ Failed to initialize local repositories'));
        console.log(chalk.gray(`   Error: ${error.message || 'Unknown error'}`));

        // This is more critical - fall back to legacy flow
        if (repositoryHosting) {
          console.log(chalk.yellow('   → Using previously selected setup type\n'));
          if (preSelectedArchitecture === 'single') {
            return { setupType: 'single' };
          } else if (preSelectedArchitecture === 'github-parent') {
            return { setupType: 'multiple' };
          }
          return { setupType: 'none' };
        }

        // Fall through to legacy prompt
        config = null;
      }

      // Step 4: Create SpecWeave structure (non-fatal)
      if (config) {
        try {
          await manager.createSpecWeaveStructure(config);
        } catch (error: any) {
          console.log(chalk.yellow('\n⚠️  Failed to create SpecWeave structure'));
          console.log(chalk.gray(`   Error: ${error.message || 'Unknown error'}`));
          console.log(chalk.yellow('   → Structure can be created manually later\n'));
          // Continue - structure can be created manually
        }

        // Success! Extract profiles and return
        const profiles: GitHubProfile[] = config.repositories.map((repo, index) => ({
          id: repo.id,
          displayName: repo.description || repo.name,
          owner: repo.owner,
          repo: repo.name,
          isDefault: index === 0  // First repo is default
        }));

        // Add parent repo profile if exists (umbrella-level issue tracking)
        if (config.parentRepo) {
          profiles.unshift({
            id: config.parentRepo.name,
            displayName: `${config.parentRepo.name} (umbrella)`,
            owner: config.parentRepo.owner,
            repo: config.parentRepo.name,
            isDefault: false  // Implementation repos remain default
          });
        }

        // Map to setup type
        const setupType: GitHubSetupType =
          config.architecture === 'single' ? 'single' :
          config.architecture === 'monorepo' ? 'monorepo' :
          'multiple';

        // Return profiles directly - no need to call configureMultipleRepositories()
        return {
          setupType,
          profiles,
          monorepoProjects: config.monorepoProjects
        };
      }
    }
  }

  // If repositoryHosting was provided but we didn't use RepoStructureManager
  // (e.g., no projectPath/githubToken), map directly to setupType
  if (repositoryHosting && preSelectedArchitecture) {
    if (preSelectedArchitecture === 'single') {
      return { setupType: 'single' };
    } else if (preSelectedArchitecture === 'github-parent') {
      return { setupType: 'multiple' };
    }
  }

  // Legacy prompt (runs ONLY if no projectPath/token AND no repositoryHosting was provided)
  const setupType = await select<GitHubSetupType>({
    message: 'Select your repository setup:',
    choices: [
      {
        name: '⏭️  No repository yet (configure later)',
        value: 'none' as const
      },
      {
        name: '📦 Single repository',
        value: 'single' as const
      },
      {
        name: '🎯 Multiple repositories (microservices/polyrepo)',
        value: 'multiple' as const
      },
      {
        name: '📚 Monorepo (single repo, multiple projects)',
        value: 'monorepo' as const
      },
      {
        name: '🔍 Auto-detect from git remotes',
        value: 'auto-detect' as const
      }
    ],
    default: 'single'
  });

  // Return just the setup type (profiles will be collected by configure* functions)
  return { setupType };
}

/**
 * Configure no repository (defer setup)
 *
 * @returns Empty profiles array
 */
export async function configureNoRepository(): Promise<GitHubProfile[]> {
  console.log(chalk.yellow('\n⏭️  Repository configuration deferred'));
  console.log(chalk.gray('You can configure repositories later using:'));
  console.log(chalk.white('  /specweave-github:setup\n'));

  return [];
}

/**
 * Configure single repository
 *
 * @param projectPath - Path to project directory
 * @returns Single profile array
 */
export async function configureSingleRepository(projectPath: string): Promise<GitHubProfile[]> {
  console.log(chalk.cyan('\n📦 Single Repository Setup\n'));

  // Try to detect from git remote
  const primaryRemote = await detectPrimaryGitHubRemote(projectPath);

  let defaultOwner = '';
  let defaultRepo = '';

  if (primaryRemote && primaryRemote.owner && primaryRemote.repo) {
    console.log(chalk.green(`✓ Detected: ${primaryRemote.owner}/${primaryRemote.repo}`));
    defaultOwner = primaryRemote.owner;
    defaultRepo = primaryRemote.repo;

    const useDetected = await confirm({
      message: 'Use detected repository?',
      default: true
    });

    if (useDetected) {
      return [{
        id: 'main',
        displayName: 'Main Repository',
        owner: defaultOwner,
        repo: defaultRepo,
        isDefault: true
      }];
    }
  }

  // Manual entry
  const owner = await input({
    message: 'GitHub owner/organization:',
    default: defaultOwner,
    validate: (val: string) => {
      if (!val.trim()) {
        return 'Owner is required';
      }
      // P1-4: Regex DoS protection - length check before regex
      if (val.length > 256) {
        return 'Owner name too long (max 256 characters)';
      }
      if (!/^[a-zA-Z0-9]([a-zA-Z0-9-])*$/.test(val)) {
        return 'Invalid GitHub username/organization format';
      }
      return true;
    }
  });

  const repo = await input({
    message: 'Repository name:',
    default: defaultRepo,
    validate: (val: string) => {
      if (!val.trim()) {
        return 'Repository name is required';
      }
      // P1-4: Regex DoS protection - length check before regex
      if (val.length > 256) {
        return 'Repository name too long (max 256 characters)';
      }
      if (!/^[a-zA-Z0-9._-]+$/.test(val)) {
        return 'Invalid repository name format';
      }
      return true;
    }
  });

  return [{
    id: 'main',
    displayName: 'Main Repository',
    owner,
    repo,
    isDefault: true
  }];
}

/**
 * Configure multiple repositories
 *
 * @param projectPath - Path to project directory
 * @returns Multiple profiles array
 */
export async function configureMultipleRepositories(projectPath: string): Promise<GitHubProfile[]> {
  console.log(chalk.cyan('\n🎯 Multiple Repositories Setup\n'));
  console.log(chalk.gray('Configure each repository for your microservices/polyrepo architecture.\n'));

  const repoCount = await number({
    message: 'How many repositories?',
    default: 2,
    validate: (val: number | undefined) => {
      if (val === undefined || val < 2) {
        return 'Please enter at least 2 repositories';
      }
      if (val > 10) {
        return 'Maximum 10 repositories supported';
      }
      return true;
    }
  }) ?? 2;

  const profiles: GitHubProfile[] = [];

  // Check for existing remotes
  const githubRemotes = await detectGitHubRemotes(projectPath);
  const uniqueRepos = getUniqueRepositories(githubRemotes);

  // If we have detected repos, offer them as suggestions
  if (uniqueRepos.length > 0) {
    console.log(chalk.green('\n✓ Detected GitHub repositories:'));
    uniqueRepos.forEach((repo: { owner: string; repo: string }, index: number) => {
      console.log(chalk.gray(`  ${index + 1}. ${repo.owner}/${repo.repo}`));
    });
    console.log('');
  }

  for (let i = 0; i < repoCount; i++) {
    console.log(chalk.white(`\n📦 Repository ${i + 1} of ${repoCount}:`));

    // Check if we have a suggestion for this index
    let defaultOwner = '';
    let defaultRepo = '';
    if (uniqueRepos[i]) {
      defaultOwner = uniqueRepos[i].owner;
      defaultRepo = uniqueRepos[i].repo;
    }

    const id = await input({
      message: 'Repository ID (single identifier, e.g., "frontend" or "backend"):',
      validate: (val: string) => {
        if (!val.trim()) {
          return 'ID is required';
        }
        // Explicit comma check
        if (val.includes(',')) {
          return 'One ID at a time (no commas)';
        }
        // P1-4: Regex DoS protection - length check before regex
        if (val.length < 2 || val.length > 64) {
          return 'ID must be 2-64 characters';
        }
        if (!/^[a-z][a-z0-9-]*$/.test(val)) {
          return 'ID must be lowercase letters, numbers, and hyphens';
        }
        if (profiles.some(p => p.id === val)) {
          return 'ID must be unique';
        }
        return true;
      }
    });

    const displayName = await input({
      message: 'Display name (e.g., Frontend Application):',
      validate: (val: string) => {
        if (!val.trim()) {
          return 'Display name is required';
        }
        // P1-4: Regex DoS protection - length check
        if (val.length > 256) {
          return 'Display name too long (max 256 characters)';
        }
        return true;
      }
    });

    const repoOwner = await input({
      message: 'GitHub owner/organization:',
      default: defaultOwner || (profiles[0]?.owner || ''),  // Reuse previous owner
      validate: (val: string) => {
        if (!val.trim()) {
          return 'Owner is required';
        }
        // P1-4: Regex DoS protection - length check before regex
        if (val.length > 256) {
          return 'Owner name too long (max 256 characters)';
        }
        if (!/^[a-zA-Z0-9]([a-zA-Z0-9-])*$/.test(val)) {
          return 'Invalid GitHub username/organization format';
        }
        return true;
      }
    });

    const repoName = await input({
      message: 'Repository name:',
      default: defaultRepo,
      validate: (val: string) => {
        if (!val.trim()) {
          return 'Repository name is required';
        }
        // P1-4: Regex DoS protection - length check before regex
        if (val.length > 256) {
          return 'Repository name too long (max 256 characters)';
        }
        if (!/^[a-zA-Z0-9._-]+$/.test(val)) {
          return 'Invalid repository name format';
        }
        return true;
      }
    });

    profiles.push({
      id,
      displayName,
      owner: repoOwner,
      repo: repoName,
      isDefault: i === 0  // First repo is default
    });
  }

  return profiles;
}

/**
 * Configure monorepo
 *
 * @param projectPath - Path to project directory
 * @returns Single profile with projects
 */
export async function configureMonorepo(projectPath: string): Promise<{
  profiles: GitHubProfile[];
  projects: string[]
}> {
  console.log(chalk.cyan('\n📚 Monorepo Setup\n'));
  console.log(chalk.gray('Configure a single repository with multiple projects.\n'));

  // First configure the repository (similar to single repo)
  const profiles = await configureSingleRepository(projectPath);

  // Then ask for projects within the monorepo
  console.log(chalk.cyan('\n📂 Projects in Monorepo\n'));
  console.log(chalk.gray('List the projects/packages in your monorepo.\n'));

  const projectsInput = await input({
    message: 'Project names (comma-separated, e.g., frontend,backend,shared):',
    validate: (val: string) => {
      if (!val.trim()) {
        return 'At least one project is required';
      }
      const projects = val.split(',').map(p => p.trim());
      if (projects.length < 2) {
        return 'Monorepo should have at least 2 projects';
      }
      return true;
    }
  });

  const projects = projectsInput.split(',').map((p: string) => p.trim());

  return { profiles, projects };
}

/**
 * Auto-detect and configure repositories
 *
 * @param projectPath - Path to project directory
 * @param recursionDepth - Internal recursion tracking to prevent infinite loops (Issue #5 fix)
 * @returns Detected profiles
 */
export async function autoDetectRepositories(projectPath: string, recursionDepth: number = 0): Promise<GitHubProfile[]> {
  // Issue #5 fix: Prevent infinite recursion
  const MAX_RECURSION_DEPTH = 3;
  if (recursionDepth >= MAX_RECURSION_DEPTH) {
    console.log(chalk.red(`\n❌ Too many auto-detection attempts (${MAX_RECURSION_DEPTH} attempts)`));
    console.log(chalk.yellow('   Falling back to single repository setup\n'));
    return configureSingleRepository(projectPath);
  }
  const spinner = ora('Detecting GitHub repositories...').start();

  const githubRemotes = await detectGitHubRemotes(projectPath);
  const uniqueRepos = getUniqueRepositories(githubRemotes);

  if (uniqueRepos.length === 0) {
    spinner.fail('No GitHub repositories detected');
    console.log(chalk.yellow('\n⚠️  No GitHub remotes found'));
    console.log(chalk.gray('   Falling back to manual configuration\n'));

    // Fall back to single repo configuration
    return configureSingleRepository(projectPath);
  }

  spinner.succeed(`Found ${uniqueRepos.length} GitHub repositor${uniqueRepos.length === 1 ? 'y' : 'ies'}`);

  console.log(chalk.green('\n✓ Detected repositories:'));
  uniqueRepos.forEach((repo: { owner: string; repo: string }, index: number) => {
    console.log(chalk.white(`  ${index + 1}. ${repo.owner}/${repo.repo}`));
  });

  const confirmDetected = await confirm({
    message: 'Use all detected repositories?',
    default: true
  });

  if (!confirmDetected) {
    // Ask which setup type they want instead
    // Issue #5 fix: Pass incremented recursion depth to prevent infinite loops
    const setupResult = await promptGitHubSetupType(projectPath, undefined, undefined, recursionDepth + 1);
    const { setupType } = setupResult;
    switch (setupType) {
      case 'none':
        return configureNoRepository();
      case 'single':
        return configureSingleRepository(projectPath);
      case 'multiple':
        return configureMultipleRepositories(projectPath);
      case 'monorepo':
        const result = await configureMonorepo(projectPath);
        return result.profiles;
      default:
        return [];
    }
  }

  // Create profiles from detected repos
  const profiles: GitHubProfile[] = [];

  for (let i = 0; i < uniqueRepos.length; i++) {
    const repo = uniqueRepos[i];

    if (uniqueRepos.length === 1) {
      // Single repo - use simple ID
      profiles.push({
        id: 'main',
        displayName: 'Main Repository',
        owner: repo.owner,
        repo: repo.repo,
        isDefault: true
      });
    } else {
      // Multiple repos - need IDs
      console.log(chalk.white(`\n📦 Repository: ${repo.owner}/${repo.repo}`));

      const id = await input({
        message: 'Repository ID:',
        default: repo.repo.replace(/-app$|-service$|-api$/, ''),  // Smart default
        validate: (val: string) => {
          if (!val.trim()) {
            return 'ID is required';
          }
          // P1-4: Regex DoS protection - length check before regex
          if (val.length < 2 || val.length > 64) {
            return 'ID must be 2-64 characters';
          }
          if (!/^[a-z][a-z0-9-]*$/.test(val)) {
            return 'ID must be lowercase letters, numbers, and hyphens';
          }
          if (profiles.some(p => p.id === val)) {
            return 'ID must be unique';
          }
          return true;
        }
      });

      const displayName = await input({
        message: 'Display name:',
        default: repo.repo.split('-').map((w: string) =>
          w.charAt(0).toUpperCase() + w.slice(1)
        ).join(' '),  // Smart default: "frontend-app" -> "Frontend App"
        validate: (val: string) => {
          if (!val.trim()) {
            return 'Display name is required';
          }
          // P1-4: Regex DoS protection - length check
          if (val.length > 256) {
            return 'Display name too long (max 256 characters)';
          }
          return true;
        }
      });

      profiles.push({
        id,
        displayName,
        owner: repo.owner,
        repo: repo.repo,
        isDefault: i === 0
      });
    }
  }

  return profiles;
}