/**
 * Jira Project Selector with Pagination
 *
 * Features:
 * - Fetches all Jira projects via API
 * - Interactive multi-select with search
 * - Manual project key entry (comma-separated)
 * - Handles large project lists (50+ projects)
 * - Validates project keys
 */

import inquirer from 'inquirer';
import { JiraClient } from '../../../src/integrations/jira/jira-client.js';

// ============================================================================
// Types
// ============================================================================

export interface ProjectSelectionResult {
  selectedKeys: string[];
  method: 'interactive' | 'manual' | 'all';
}

export interface ProjectSelectorOptions {
  /** Allow manual entry of project keys */
  allowManualEntry?: boolean;

  /** Allow "Select All" option */
  allowSelectAll?: boolean;

  /** Pre-select these project keys */
  preSelected?: string[];

  /** Minimum projects to select (0 = optional) */
  minSelection?: number;

  /** Maximum projects to select (undefined = unlimited) */
  maxSelection?: number;

  /** Page size for pagination */
  pageSize?: number;
}

// ============================================================================
// Jira Project Fetching
// ============================================================================

/**
 * Fetch all Jira projects from API
 */
export async function fetchAllJiraProjects(
  client: JiraClient
): Promise<any[]> {
  console.log('🔍 Fetching Jira projects...');

  try {
    const projects = await client.getProjects();

    console.log(`✅ Found ${projects.length} Jira projects\n`);

    return projects;
  } catch (error) {
    console.error('❌ Failed to fetch Jira projects:', (error as Error).message);
    throw error;
  }
}

// ============================================================================
// Interactive Project Selection
// ============================================================================

/**
 * Interactive project selector with search and pagination
 */
export async function selectJiraProjects(
  client: JiraClient,
  options: ProjectSelectorOptions = {}
): Promise<ProjectSelectionResult> {
  const {
    allowManualEntry = true,
    allowSelectAll = true,
    preSelected = [],
    minSelection = 1,
    maxSelection,
    pageSize = 15,
  } = options;

  // Fetch all projects
  const allProjects = await fetchAllJiraProjects(client);

  if (allProjects.length === 0) {
    console.log('⚠️  No Jira projects found');
    return {
      selectedKeys: [],
      method: 'interactive',
    };
  }

  // Show project overview
  console.log('📋 Available Jira Projects:\n');
  console.log(`   Total: ${allProjects.length} projects\n`);

  // Decide selection method
  const { selectionMethod } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectionMethod',
      message: 'How would you like to select projects?',
      choices: [
        {
          name: `📋 Interactive (browse and select from ${allProjects.length} projects)`,
          value: 'interactive',
        },
        {
          name: '✏️  Manual entry (type project keys)',
          value: 'manual',
        },
        ...(allowSelectAll
          ? [
              {
                name: `✨ Select all (${allProjects.length} projects)`,
                value: 'all',
              },
            ]
          : []),
      ],
    },
  ]);

  if (selectionMethod === 'all') {
    return {
      selectedKeys: allProjects.map((p) => p.key),
      method: 'all',
    };
  }

  if (selectionMethod === 'manual') {
    return await manualProjectEntry(allProjects, minSelection, maxSelection);
  }

  // Interactive selection
  return await interactiveProjectSelection(
    allProjects,
    preSelected,
    minSelection,
    maxSelection,
    pageSize
  );
}

/**
 * Interactive project selection with checkbox
 */
async function interactiveProjectSelection(
  allProjects: any[],
  preSelected: string[],
  minSelection: number,
  maxSelection: number | undefined,
  pageSize: number
): Promise<ProjectSelectionResult> {
  console.log('💡 Use <space> to select, <a> to toggle all, <i> to invert\n');

  const choices = allProjects.map((p) => ({
    name: formatProjectChoice(p),
    value: p.key,
    checked: preSelected.includes(p.key),
  }));

  // Add manual entry option at the end
  choices.push(
    new inquirer.Separator(),
    {
      name: '✏️  Enter project keys manually instead',
      value: '__MANUAL__',
      checked: false,
    } as any
  );

  const { selectedKeys } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedKeys',
      message: `Select Jira projects (${minSelection}${maxSelection ? `-${maxSelection}` : '+'} required):`,
      choices,
      pageSize,
      loop: false,
      validate: (selected: string[]) => {
        const actualSelected = selected.filter((k) => k !== '__MANUAL__');

        if (actualSelected.length < minSelection) {
          return `Please select at least ${minSelection} project(s)`;
        }

        if (maxSelection && actualSelected.length > maxSelection) {
          return `Please select at most ${maxSelection} project(s)`;
        }

        return true;
      },
    },
  ]);

  // Check if user chose manual entry
  if (selectedKeys.includes('__MANUAL__')) {
    return await manualProjectEntry(allProjects, minSelection, maxSelection);
  }

  console.log(`\n✅ Selected ${selectedKeys.length} projects: ${selectedKeys.join(', ')}\n`);

  return {
    selectedKeys,
    method: 'interactive',
  };
}

/**
 * Manual project key entry (comma-separated)
 */
async function manualProjectEntry(
  allProjects: any[],
  minSelection: number,
  maxSelection: number | undefined
): Promise<ProjectSelectionResult> {
  console.log('\n📝 Enter project keys manually\n');
  console.log('💡 Format: Comma-separated project keys (e.g., SCRUM,PROD,MOBILE)\n');

  if (allProjects.length > 0) {
    console.log('Available project keys:');
    console.log(
      allProjects
        .map((p) => p.key)
        .join(', ')
        .substring(0, 100) + (allProjects.length > 20 ? '...' : '')
    );
    console.log('');
  }

  const { manualKeys } = await inquirer.prompt([
    {
      type: 'input',
      name: 'manualKeys',
      message: 'Project keys:',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Please enter at least one project key';
        }

        const keys = input
          .split(',')
          .map((k) => k.trim().toUpperCase())
          .filter((k) => k.length > 0);

        if (keys.length < minSelection) {
          return `Please enter at least ${minSelection} project key(s)`;
        }

        if (maxSelection && keys.length > maxSelection) {
          return `Please enter at most ${maxSelection} project key(s)`;
        }

        // Validate format (uppercase letters/numbers only)
        const invalidKeys = keys.filter((k) => !/^[A-Z0-9]+$/.test(k));
        if (invalidKeys.length > 0) {
          return `Invalid project key format: ${invalidKeys.join(', ')}. Use uppercase letters/numbers only.`;
        }

        return true;
      },
    },
  ]);

  const selectedKeys = manualKeys
    .split(',')
    .map((k: string) => k.trim().toUpperCase())
    .filter((k: string) => k.length > 0);

  // Warn about unknown projects
  const knownKeys = allProjects.map((p) => p.key);
  const unknownKeys = selectedKeys.filter((k) => !knownKeys.includes(k));

  if (unknownKeys.length > 0) {
    console.log(`\n⚠️  Unknown project keys (will be used anyway): ${unknownKeys.join(', ')}`);
    console.log('   Make sure these projects exist in your Jira instance.\n');
  }

  console.log(`✅ Selected ${selectedKeys.length} projects: ${selectedKeys.join(', ')}\n`);

  return {
    selectedKeys,
    method: 'manual',
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format project choice for display
 */
function formatProjectChoice(project: any): string {
  const type = project.projectTypeKey || 'unknown';
  const lead = project.lead?.displayName || 'No lead';

  return `${project.key.padEnd(10)} - ${project.name} (${type}, lead: ${lead})`;
}

/**
 * Quick project selector - select single project
 */
export async function selectSingleJiraProject(
  client: JiraClient,
  message: string = 'Select Jira project:'
): Promise<string> {
  const result = await selectJiraProjects(client, {
    allowManualEntry: true,
    allowSelectAll: false,
    minSelection: 1,
    maxSelection: 1,
  });

  return result.selectedKeys[0];
}
