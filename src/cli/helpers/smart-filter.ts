/**
 * Smart Filter Module
 *
 * Provides intelligent filtering for project imports with JQL/WIQL support,
 * preview mode, and dry-run capabilities.
 *
 * @module cli/helpers/smart-filter
 */

import chalk from 'chalk';
import inquirer from 'inquirer';

export type FilterProvider = 'jira' | 'ado';

export interface FilterCriteria {
  provider: FilterProvider;
  query?: string; // JQL for JIRA, WIQL for ADO
  projectKeys?: string[]; // Specific project keys
  excludeArchived?: boolean;
  excludeDeleted?: boolean;
  onlyActive?: boolean;
  customFilters?: Record<string, any>;
}

export interface FilterResult {
  total: number;
  filtered: number;
  excluded: number;
  items: any[];
  criteria: FilterCriteria;
}

/**
 * Validate JQL query syntax (JIRA)
 *
 * Basic validation:
 * - Check for common JQL keywords (project, type, status, etc.)
 * - Check for balanced parentheses
 * - Check for valid operators (=, !=, IN, NOT IN, etc.)
 *
 * @param jql - JQL query string
 * @returns Validation result with error message if invalid
 */
export function validateJQL(jql: string): { valid: boolean; error?: string } {
  if (!jql || jql.trim().length === 0) {
    return { valid: false, error: 'JQL query cannot be empty' };
  }

  // Check balanced parentheses
  const openCount = (jql.match(/\(/g) || []).length;
  const closeCount = (jql.match(/\)/g) || []).length;
  if (openCount !== closeCount) {
    return { valid: false, error: 'Unbalanced parentheses in JQL query' };
  }

  // Check for valid JQL keywords
  const validKeywords = [
    'project', 'type', 'status', 'priority', 'assignee', 'reporter',
    'created', 'updated', 'resolved', 'labels', 'component', 'fixVersion',
    'affectsVersion', 'sprint', 'epic', 'parent', 'key'
  ];

  const hasValidKeyword = validKeywords.some(keyword =>
    jql.toLowerCase().includes(keyword.toLowerCase())
  );

  if (!hasValidKeyword) {
    return {
      valid: false,
      error: 'JQL query must include at least one valid field (project, type, status, etc.)'
    };
  }

  // Check for valid operators
  const validOperators = ['=', '!=', 'IN', 'NOT IN', '~', '!~', '>', '<', '>=', '<=', 'IS', 'IS NOT'];
  const hasValidOperator = validOperators.some(op =>
    jql.includes(op)
  );

  if (!hasValidOperator) {
    return {
      valid: false,
      error: 'JQL query must include at least one valid operator (=, IN, etc.)'
    };
  }

  return { valid: true };
}

/**
 * Validate WIQL query syntax (Azure DevOps)
 *
 * Basic validation for WIQL (Work Item Query Language)
 *
 * @param wiql - WIQL query string
 * @returns Validation result with error message if invalid
 */
export function validateWIQL(wiql: string): { valid: boolean; error?: string } {
  if (!wiql || wiql.trim().length === 0) {
    return { valid: false, error: 'WIQL query cannot be empty' };
  }

  // WIQL must start with SELECT
  if (!wiql.trim().toUpperCase().startsWith('SELECT')) {
    return {
      valid: false,
      error: 'WIQL query must start with SELECT'
    };
  }

  // WIQL must contain FROM
  if (!wiql.toUpperCase().includes('FROM')) {
    return {
      valid: false,
      error: 'WIQL query must include FROM clause'
    };
  }

  return { valid: true };
}

/**
 * Prompt user for filter criteria
 *
 * Interactive prompts for:
 * - Filter type (JQL/WIQL, project keys, or none)
 * - Exclude archived projects
 * - Exclude deleted projects
 * - Only active projects
 *
 * @param provider - Filter provider (jira or ado)
 * @returns Filter criteria
 */
export async function promptFilterCriteria(provider: FilterProvider): Promise<FilterCriteria> {
  console.log(chalk.cyan(`\n🔍 ${provider.toUpperCase()} Filter Configuration\n`));

  const criteria: FilterCriteria = { provider };

  // Step 1: Filter type
  const filterType = await inquirer.prompt<{ type: 'none' | 'query' | 'keys' }>([
    {
      type: 'select',
      name: 'type',
      message: 'How would you like to filter projects?',
      default: 'none',
      choices: [
        {
          name: chalk.green('No filter') + chalk.gray(' - Import all projects'),
          value: 'none'
        },
        {
          name: `Custom ${provider === 'jira' ? 'JQL' : 'WIQL'} query` + chalk.gray(' - Advanced filtering'),
          value: 'query'
        },
        {
          name: 'Specific project keys' + chalk.gray(' - Manual selection'),
          value: 'keys'
        }
      ]
    }
  ]);

  if (filterType.type === 'query') {
    // Custom query
    const queryAnswer = await inquirer.prompt<{ query: string }>([
      {
        type: 'input',
        name: 'query',
        message: `Enter ${provider === 'jira' ? 'JQL' : 'WIQL'} query:`,
        validate: (input: string) => {
          const validation = provider === 'jira'
            ? validateJQL(input)
            : validateWIQL(input);

          return validation.valid || chalk.red(validation.error || 'Invalid query');
        }
      }
    ]);

    criteria.query = queryAnswer.query;

  } else if (filterType.type === 'keys') {
    // Specific project keys
    const keysAnswer = await inquirer.prompt<{ keys: string }>([
      {
        type: 'input',
        name: 'keys',
        message: 'Enter project keys (comma-separated):',
        validate: (input: string) => {
          const trimmed = input.trim();
          if (!trimmed) {
            return chalk.red('Project keys cannot be empty');
          }

          const keys = trimmed.split(',').map(k => k.trim()).filter(k => k.length > 0);
          if (keys.length === 0) {
            return chalk.red('At least one project key required');
          }

          return true;
        }
      }
    ]);

    criteria.projectKeys = keysAnswer.keys.split(',').map(k => k.trim()).filter(k => k.length > 0);
  }

  // Step 2: Additional filters
  const additionalFilters = await inquirer.prompt<{
    excludeArchived: boolean;
    excludeDeleted: boolean;
    onlyActive: boolean;
  }>([
    {
      type: 'confirm',
      name: 'excludeArchived',
      message: 'Exclude archived projects?',
      default: true
    },
    {
      type: 'confirm',
      name: 'excludeDeleted',
      message: 'Exclude deleted projects?',
      default: true
    },
    {
      type: 'confirm',
      name: 'onlyActive',
      message: 'Only import active projects?',
      default: false
    }
  ]);

  criteria.excludeArchived = additionalFilters.excludeArchived;
  criteria.excludeDeleted = additionalFilters.excludeDeleted;
  criteria.onlyActive = additionalFilters.onlyActive;

  return criteria;
}

/**
 * Apply filters to project list
 *
 * @param projects - List of projects to filter
 * @param criteria - Filter criteria
 * @returns Filtered project list
 */
export function applyFilters(projects: any[], criteria: FilterCriteria): FilterResult {
  const total = projects.length;
  let filtered = projects;

  // Filter by project keys
  if (criteria.projectKeys && criteria.projectKeys.length > 0) {
    filtered = filtered.filter(p =>
      criteria.projectKeys!.includes(p.key) || criteria.projectKeys!.includes(p.name)
    );
  }

  // Exclude archived
  if (criteria.excludeArchived) {
    filtered = filtered.filter(p => !p.archived && p.archived !== true);
  }

  // Exclude deleted
  if (criteria.excludeDeleted) {
    filtered = filtered.filter(p => !p.deleted && p.deleted !== true);
  }

  // Only active
  if (criteria.onlyActive) {
    filtered = filtered.filter(p => p.status === 'active' || p.state === 'active');
  }

  return {
    total,
    filtered: filtered.length,
    excluded: total - filtered.length,
    items: filtered,
    criteria
  };
}

/**
 * Preview filter results
 *
 * Shows summary of what would be imported with current filter criteria.
 *
 * @param result - Filter result
 * @returns User confirmation to proceed
 */
export async function previewFilterResults(result: FilterResult): Promise<boolean> {
  console.log(chalk.cyan('\n📊 Filter Preview\n'));
  console.log(chalk.white(`Total projects:    ${result.total}`));
  console.log(chalk.green(`Filtered (import): ${result.filtered}`));
  console.log(chalk.gray(`Excluded:          ${result.excluded}`));

  if (result.criteria.query) {
    console.log(chalk.gray(`\nQuery: ${result.criteria.query}`));
  }

  if (result.criteria.projectKeys && result.criteria.projectKeys.length > 0) {
    console.log(chalk.gray(`\nProject keys: ${result.criteria.projectKeys.join(', ')}`));
  }

  console.log(chalk.gray(`\nFilters applied:`));
  console.log(chalk.gray(`  - Exclude archived: ${result.criteria.excludeArchived ? 'Yes' : 'No'}`));
  console.log(chalk.gray(`  - Exclude deleted:  ${result.criteria.excludeDeleted ? 'Yes' : 'No'}`));
  console.log(chalk.gray(`  - Only active:      ${result.criteria.onlyActive ? 'Yes' : 'No'}`));

  // Show sample projects (first 5)
  if (result.items.length > 0) {
    console.log(chalk.cyan('\n📋 Sample projects to import (first 5):\n'));
    result.items.slice(0, 5).forEach((p, i) => {
      console.log(chalk.gray(`   ${i + 1}. ${p.key || p.name} - ${p.name}`));
    });

    if (result.items.length > 5) {
      console.log(chalk.gray(`   ... and ${result.items.length - 5} more\n`));
    }
  }

  // Confirmation
  const answer = await inquirer.prompt<{ proceed: boolean }>([
    {
      type: 'confirm',
      name: 'proceed',
      message: 'Proceed with import?',
      default: true
    }
  ]);

  return answer.proceed;
}
