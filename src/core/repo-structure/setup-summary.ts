/**
 * Setup Summary Generator
 *
 * Generates detailed setup completion summaries with:
 * - Created repositories and URLs
 * - Folder structure visualization
 * - Configuration details
 * - Next steps
 * - Time saved estimation
 *
 * @module setup-summary
 */

import { RepoConfig, SetupState } from './setup-state-manager.js';

/**
 * Summary configuration
 */
export interface SummaryConfig {
  projectName: string;
  state: SetupState;
  folderStructure?: string[];
}

/**
 * Generate setup completion summary
 *
 * @param config - Summary configuration
 * @returns Formatted summary text
 */
export function generateSetupSummary(config: SummaryConfig): string {
  const lines: string[] = [];

  // Header
  lines.push('✅ Setup Complete!');
  lines.push('');

  // Repositories section
  lines.push(generateReposSummary(config.state));

  // Folder structure
  lines.push(generateFolderStructure(config.projectName, config.state, config.folderStructure));

  // Configuration
  lines.push(generateConfigSummary(config.state));

  // Next steps
  lines.push(generateNextSteps(config.state));

  // Tips
  lines.push(generateTips());

  // Time saved
  lines.push(generateTimeSaved(config.state));

  return lines.join('\n');
}

/**
 * Generate repositories summary
 *
 * @param state - Setup state
 * @returns Formatted repository list
 */
function generateReposSummary(state: SetupState): string {
  const lines: string[] = [];

  const totalRepos = (state.parentRepo ? 1 : 0) + state.repos.length;
  lines.push(`📦 Created Repositories (${totalRepos} total):`);

  // Parent repo
  if (state.parentRepo) {
    lines.push(`   1. Parent: ${state.parentRepo.url || `https://github.com/${state.parentRepo.owner}/${state.parentRepo.name}`}`);
    lines.push(`      • Contains .specweave/ for specs, docs, increments`);
    lines.push(`      • ${state.parentRepo.visibility === 'private' ? 'Private' : 'Public'} repository`);
    lines.push('');
  }

  // Implementation repos
  state.repos.forEach((repo, index) => {
    const num = (state.parentRepo ? 2 : 1) + index;
    lines.push(`   ${num}. ${repo.displayName}: ${repo.url || `https://github.com/${repo.owner}/${repo.repo}`}`);
    lines.push(`      • Implementation repository`);
    lines.push(`      • ${repo.visibility === 'private' ? 'Private' : 'Public'} repository`);

    if (repo.path) {
      lines.push(`      • Local path: ${repo.path}`);
    }

    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Generate folder structure visualization
 *
 * @param projectName - Project name
 * @param state - Setup state
 * @param customPaths - Custom folder paths
 * @returns Formatted folder structure
 */
function generateFolderStructure(
  projectName: string,
  state: SetupState,
  customPaths?: string[]
): string {
  const lines: string[] = [];

  lines.push('📁 Folder Structure:');
  lines.push(`   ${projectName}/`);
  lines.push('   ├── .specweave/           ← Specs, docs, increments (source of truth)');
  lines.push('   ├── .env                  ← GitHub configuration (DO NOT COMMIT!)');
  lines.push('   ├── .env.example          ← Template for team (safe to commit)');

  if (customPaths) {
    customPaths.forEach(p => {
      lines.push(`   ├── ${p}`);
    });
  } else {
    // Default structure based on repos
    state.repos.forEach(repo => {
      if (repo.path && repo.path !== './') {
        const cleanPath = repo.path.replace(/\/$/, '');
        lines.push(`   ├── ${cleanPath}/             ← Cloned from GitHub`);
      }
    });
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Generate configuration summary
 *
 * @param state - Setup state
 * @returns Formatted configuration
 */
function generateConfigSummary(state: SetupState): string {
  const lines: string[] = [];

  lines.push('⚙️ Configuration:');

  if (state.envCreated) {
    lines.push('   • GitHub token: Configured in .env');
    lines.push('   • Sync enabled: Yes (bidirectional)');
    lines.push('   • Auto-create issues: Yes');
  } else {
    lines.push('   • GitHub token: Not configured (add to .env)');
    lines.push('   • Sync enabled: No (configure in .env)');
  }

  const defaultVisibility = state.repos[0]?.visibility || 'private';
  lines.push(`   • Default visibility: ${defaultVisibility === 'private' ? 'Private' : 'Public'}`);

  lines.push('');

  return lines.join('\n');
}

/**
 * Generate next steps
 *
 * @param state - Setup state
 * @returns Formatted next steps
 */
function generateNextSteps(state: SetupState): string {
  const lines: string[] = [];

  lines.push('🚀 Next Steps:');

  if (state.repos.length > 0) {
    lines.push('   1. Install dependencies:');
    state.repos.forEach(repo => {
      if (repo.path && repo.path !== './') {
        lines.push(`      cd ${repo.path.replace(/\/$/, '')} && npm install`);
      }
    });
    lines.push('');
  }

  lines.push('   2. Start your first increment:');
  lines.push('      /sw:increment "your feature name"');
  lines.push('');

  lines.push('   3. Read documentation:');
  lines.push('      https://spec-weave.com/docs/guides/multi-repo-setup');

  lines.push('');

  return lines.join('\n');
}

/**
 * Generate tips section
 *
 * @returns Formatted tips
 */
function generateTips(): string {
  const lines: string[] = [];

  lines.push('💡 Tips:');
  lines.push('   • .specweave/ is your source of truth (commit it!)');
  lines.push('   • .env contains secrets (DO NOT commit!)');
  lines.push('   • Use /sw:progress to track increment progress');
  lines.push('   • Increments sync to GitHub automatically');

  lines.push('');

  return lines.join('\n');
}

/**
 * Calculate and format time saved
 *
 * @param state - Setup state
 * @returns Formatted time saved
 */
function generateTimeSaved(state: SetupState): string {
  // Estimate time saved based on number of repos and features
  const numRepos = (state.parentRepo ? 1 : 0) + state.repos.length;

  // Manual setup time per repo: ~5 minutes
  const manualTimePerRepo = 5;
  const manualTotal = numRepos * manualTimePerRepo;

  // Automated setup time: ~2 minutes total
  const automatedTime = 2;

  const timeSaved = manualTotal - automatedTime;

  return `⏱️  Time Saved: ~${timeSaved} minutes (vs manual setup)`;
}

/**
 * Format repository for display
 *
 * @param repo - Repository configuration
 * @returns Formatted string
 */
export function formatRepo(repo: RepoConfig): string {
  return `${repo.displayName} (${repo.owner}/${repo.repo})`;
}
