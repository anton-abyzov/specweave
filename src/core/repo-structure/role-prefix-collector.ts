/**
 * Role & Prefix Collector
 *
 * Interactive flow that runs AFTER repo discovery (manual, bulk, or greenfield).
 * Asks the user to assign a role and story prefix to each repository,
 * then optionally designate a parent repo for centralized tracking.
 */

import chalk from 'chalk';
import { select, input, confirm } from '@inquirer/prompts';
import { validatePrefix, ROLE_PREFIX_DEFAULTS } from './prefix-validator.js';

/** Repo with role and prefix assigned */
export interface RepoWithRolePrefix {
  id: string;
  name: string;
  owner: string;
  role: string;
  storyPrefix: string;
  [key: string]: unknown;
}

/** Minimal repo info needed for collection */
interface RepoInput {
  id: string;
  name: string;
  owner: string;
  [key: string]: unknown;
}

const ROLE_CHOICES = [
  { name: 'Frontend (web, mobile UI)', value: 'frontend' },
  { name: 'Backend (API, services)', value: 'backend' },
  { name: 'Mobile (iOS, Android app)', value: 'mobile' },
  { name: 'Infrastructure (Terraform, K8s)', value: 'infra' },
  { name: 'Shared (libraries, utilities)', value: 'shared' },
  { name: 'Other', value: 'other' },
];

/**
 * Collect role and story prefix for each discovered repo.
 *
 * Runs AFTER repos are discovered/configured. Asks per-repo:
 * 1. What is this repo for? (role)
 * 2. Story prefix? (with role-based default, validated for uniqueness)
 */
export async function collectRolesAndPrefixes(repos: RepoInput[]): Promise<RepoWithRolePrefix[]> {
  if (repos.length === 0) return [];

  console.log(chalk.cyan('\n🏷️  Repository Roles & Prefixes\n'));
  console.log(chalk.gray('Each repo gets a role and a prefix for user stories (e.g., US-FE-001).\n'));

  const result: RepoWithRolePrefix[] = [];
  const usedPrefixes = new Set<string>();

  for (const repo of repos) {
    console.log(chalk.white(`\n${repo.name}:`));

    const role = await select({
      message: 'What is this repository for?',
      choices: ROLE_CHOICES,
    });

    const defaultPrefix = ROLE_PREFIX_DEFAULTS[role] || 'MISC';

    const prefix = await input({
      message: 'Story prefix (e.g., US-FE-001):',
      default: defaultPrefix,
      validate: (val: string) => {
        const validation = validatePrefix(val, usedPrefixes);
        if (!validation.valid) return validation.error!;
        return true;
      },
    });

    // Normalize and track
    const validation = validatePrefix(prefix, usedPrefixes);
    const normalized = validation.normalized || prefix.toUpperCase();
    usedPrefixes.add(normalized);

    console.log(chalk.green(`   ✓ ${repo.name} → ${normalized} stories\n`));

    result.push({
      ...repo,
      role,
      storyPrefix: normalized,
    });
  }

  return result;
}

/**
 * Ask if user wants a parent repo for centralized issue tracking.
 *
 * Only offered when 2+ repos exist. Shows clear explanation of what
 * a parent repo means and when to use it.
 *
 * @returns Selected parent repo ID, or undefined if declined
 */
export async function promptParentRepo(
  repos: Array<{ id: string; name: string }>,
): Promise<string | undefined> {
  if (repos.length < 2) return undefined;

  console.log(chalk.cyan('\n📦 Issue Tracking Strategy\n'));

  const wantParent = await confirm({
    message: [
      'Do you want a parent/coordination repository?\n',
      chalk.gray('   A parent repo tracks ALL work items in one place (issues, milestones).'),
      chalk.gray('   It typically contains only docs/specs, no application code.\n'),
      chalk.gray('   Use a parent repo if:'),
      chalk.gray('     ✓ You have 3+ microservices and want one place for all work'),
      chalk.gray('     ✓ Your team uses a central "specs" or "planning" repo\n'),
      chalk.gray('   Skip parent repo if:'),
      chalk.gray('     ✗ You only have 1-2 repos (just use the main repo for issues)'),
      chalk.gray('     ✗ Each service has its own PM/team\n'),
      chalk.gray('   Examples:'),
      chalk.gray('     • WITH parent: acme-specs (tracks), acme-frontend, acme-api (code)'),
      chalk.gray('     • WITHOUT parent: my-frontend (tracks + code), my-api (tracks + code)\n'),
    ].join('\n'),
    default: false,
  });

  if (!wantParent) {
    console.log(chalk.gray('   → First repository will be default for issues\n'));
    return undefined;
  }

  const parentId = await select({
    message: 'Which repo should be the parent for issue tracking?',
    choices: repos.map(r => ({
      name: r.name,
      value: r.id,
    })),
  });

  console.log(chalk.green(`\n   ✓ Using "${parentId}" as parent for all work items\n`));

  return parentId;
}
