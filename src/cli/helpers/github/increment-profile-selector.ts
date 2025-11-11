/**
 * Increment Profile Selector
 *
 * Handles profile selection when creating new increments
 * in multi-repository projects
 *
 * @module cli/helpers/github/increment-profile-selector
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { GitHubProfileManager } from './profile-manager.js';

/**
 * Increment metadata structure
 */
interface IncrementMetadata {
  incrementId: string;
  githubProfile?: string;
  githubIssue?: number;
  githubUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Select GitHub profile for an increment
 *
 * @param projectPath - Path to project root
 * @param incrementId - Increment identifier
 * @returns Selected profile ID or null
 */
export async function selectProfileForIncrement(
  projectPath: string,
  incrementId: string
): Promise<string | null> {
  const manager = new GitHubProfileManager(projectPath);

  // Check if profiles exist
  if (!manager.hasProfiles()) {
    console.log(chalk.gray('No GitHub profiles configured - skipping repository selection'));
    return null;
  }

  const profileCount = manager.getProfileCount();

  // If only one profile, auto-select it
  if (profileCount === 1) {
    const profile = manager.getActiveProfile();
    if (profile) {
      console.log(chalk.gray(`Using GitHub repository: ${profile.config.owner}/${profile.config.repo}`));
      return profile.id;
    }
  }

  // Multiple profiles - prompt for selection
  console.log(chalk.cyan('\n🎯 Repository Selection\n'));
  console.log(chalk.gray(`Select the GitHub repository for increment ${incrementId}:\n`));

  const profile = await manager.selectProfile(`Which repository should '${incrementId}' sync to?`);

  if (profile) {
    console.log(chalk.green(`✓ Selected: ${profile.displayName} (${profile.config.owner}/${profile.config.repo})\n`));
    return profile.id;
  }

  return null;
}

/**
 * Save profile selection to increment metadata
 *
 * @param projectPath - Path to project root
 * @param incrementId - Increment identifier
 * @param profileId - Selected profile ID
 */
export async function saveIncrementProfile(
  projectPath: string,
  incrementId: string,
  profileId: string
): Promise<void> {
  const metadataPath = path.join(
    projectPath,
    '.specweave',
    'increments',
    incrementId,
    'metadata.json'
  );

  let metadata: IncrementMetadata;

  // Load existing metadata or create new
  if (fs.existsSync(metadataPath)) {
    const content = fs.readFileSync(metadataPath, 'utf-8');
    metadata = JSON.parse(content);
    metadata.githubProfile = profileId;
    metadata.updatedAt = new Date().toISOString();
  } else {
    metadata = {
      incrementId,
      githubProfile: profileId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // Ensure directory exists
  const dir = path.dirname(metadataPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Save metadata
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
}

/**
 * Get profile for an existing increment
 *
 * @param projectPath - Path to project root
 * @param incrementId - Increment identifier
 * @returns Profile ID or null
 */
export function getIncrementProfile(
  projectPath: string,
  incrementId: string
): string | null {
  const metadataPath = path.join(
    projectPath,
    '.specweave',
    'increments',
    incrementId,
    'metadata.json'
  );

  if (!fs.existsSync(metadataPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(metadataPath, 'utf-8');
    const metadata: IncrementMetadata = JSON.parse(content);
    return metadata.githubProfile || null;
  } catch (error) {
    console.error(chalk.red(`Failed to read increment metadata: ${error}`));
    return null;
  }
}

/**
 * Prompt to change profile for an increment
 *
 * @param projectPath - Path to project root
 * @param incrementId - Increment identifier
 * @returns New profile ID or null
 */
export async function changeIncrementProfile(
  projectPath: string,
  incrementId: string
): Promise<string | null> {
  const manager = new GitHubProfileManager(projectPath);
  const currentProfileId = getIncrementProfile(projectPath, incrementId);

  if (!manager.hasProfiles()) {
    console.log(chalk.yellow('No GitHub profiles configured'));
    return null;
  }

  // Show current profile
  if (currentProfileId) {
    const currentProfile = manager.getProfile(currentProfileId);
    if (currentProfile) {
      console.log(chalk.gray(`Current repository: ${currentProfile.displayName} (${currentProfile.config.owner}/${currentProfile.config.repo})`));
    }
  } else {
    console.log(chalk.gray('No repository currently selected'));
  }

  // Prompt for new profile
  const newProfile = await manager.selectProfile('Select new repository:');

  if (newProfile && newProfile.id !== currentProfileId) {
    await saveIncrementProfile(projectPath, incrementId, newProfile.id);
    console.log(chalk.green(`✓ Changed to: ${newProfile.displayName}`));
    return newProfile.id;
  }

  return null;
}

/**
 * List all increments grouped by profile
 *
 * @param projectPath - Path to project root
 */
export function listIncrementsByProfile(projectPath: string): void {
  const manager = new GitHubProfileManager(projectPath);
  const incrementsDir = path.join(projectPath, '.specweave', 'increments');

  if (!fs.existsSync(incrementsDir)) {
    console.log(chalk.yellow('No increments found'));
    return;
  }

  // Build profile map
  const profileMap = new Map<string, string[]>();
  const noProfile: string[] = [];

  // Scan all increments
  const increments = fs.readdirSync(incrementsDir)
    .filter(dir => dir.match(/^\d{4}-/));  // Only numbered increments

  for (const incrementId of increments) {
    const profileId = getIncrementProfile(projectPath, incrementId);

    if (profileId) {
      if (!profileMap.has(profileId)) {
        profileMap.set(profileId, []);
      }
      profileMap.get(profileId)!.push(incrementId);
    } else {
      noProfile.push(incrementId);
    }
  }

  // Display results
  console.log(chalk.cyan('\nIncrements by Repository:\n'));

  // Show mapped increments
  for (const [profileId, incrementIds] of profileMap) {
    const profile = manager.getProfile(profileId);
    if (profile) {
      console.log(chalk.white(`${profile.displayName} (${profile.config.owner}/${profile.config.repo}):`));
      incrementIds.forEach(id => {
        console.log(`  - ${id}`);
      });
      console.log('');
    }
  }

  // Show unmapped increments
  if (noProfile.length > 0) {
    console.log(chalk.yellow('No repository assigned:'));
    noProfile.forEach(id => {
      console.log(`  - ${id}`);
    });
    console.log('');
  }
}