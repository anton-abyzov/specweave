/**
 * Azure DevOps Area Path Selection Helper
 *
 * Implements US-004: Pattern-Based Work Item Selection for ADO Init
 *
 * Similar to github-repo-selector.ts, provides functionality to:
 * - Select area paths by pattern (glob)
 * - Select all area paths from a project
 * - Select explicit list of area paths
 * - Preview selection before confirmation
 */

import { select, input, confirm, checkbox } from '@inquirer/prompts';
import chalk from 'chalk';
import { minimatch } from 'minimatch';

export interface ADOAreaPath {
  name: string;      // Leaf name (e.g., "Platform")
  path: string;      // Full path (e.g., "MyProject\\Team A\\Platform")
  hasChildren?: boolean;
}

export interface AreaSelectionConfig {
  areaPaths: string[];         // Array of full paths
  selectionStrategy: 'all' | 'pattern' | 'explicit';
  pattern?: string;            // For pattern strategy
  projectName?: string;        // Source project
}

/**
 * Filter area paths by glob pattern
 * Matches against the leaf name (last segment of path)
 */
export function filterAreaPathsByPattern(areas: ADOAreaPath[], pattern: string): ADOAreaPath[] {
  return areas.filter(area => {
    // Match against leaf name only
    return minimatch(area.name, pattern);
  });
}

/**
 * Show area path preview table
 */
export function showAreaPathPreview(areas: ADOAreaPath[]): void {
  console.log(chalk.blue('\n📋 Area Path Preview:\n'));

  const header = `${chalk.bold('Area Path')}${' '.repeat(50)}${chalk.bold('Leaf Name')}`;
  console.log(header);
  console.log('-'.repeat(80));

  areas.slice(0, 20).forEach(area => {
    const fullPath = area.path.length > 55
      ? '...' + area.path.slice(-52)
      : area.path.padEnd(55);
    const leafName = area.name.padEnd(25);

    console.log(`${fullPath}${leafName}`);
  });

  if (areas.length > 20) {
    console.log(chalk.gray(`\n... and ${areas.length - 20} more area paths\n`));
  } else {
    console.log('');
  }
}

/**
 * Extract leaf name from full area path
 * "MyProject\\Team A\\Platform" => "Platform"
 */
export function extractLeafName(fullPath: string): string {
  const segments = fullPath.split('\\');
  return segments[segments.length - 1] || fullPath;
}

/**
 * Convert raw area paths (strings) to ADOAreaPath objects
 */
export function toAreaPathObjects(paths: string[]): ADOAreaPath[] {
  return paths.map(path => ({
    name: extractLeafName(path),
    path: path
  }));
}

/**
 * Main area path selection flow
 *
 * @param allAreaPaths - All available area paths from the ADO project
 * @param projectName - Name of the ADO project
 * @returns Selection configuration or null if cancelled
 */
export async function selectAreaPaths(
  allAreaPaths: ADOAreaPath[],
  projectName: string
): Promise<AreaSelectionConfig | null> {
  console.log(chalk.blue('\n🔗 Azure DevOps Area Path Selection\n'));
  console.log(chalk.gray(`   Project: ${projectName}`));
  console.log(chalk.gray(`   Available: ${allAreaPaths.length} area paths\n`));

  if (allAreaPaths.length === 0) {
    console.log(chalk.yellow('⚠️  No area paths found in this project.\n'));
    return null;
  }

  // Prompt for selection strategy
  const strategyChoices: Array<{ name: string; value: AreaSelectionConfig['selectionStrategy'] }> = [
    { name: `All ${allAreaPaths.length} area paths`, value: 'all' },
    { name: 'Pattern matching (e.g., "*-Platform", "*-Service")', value: 'pattern' },
    { name: 'Select specific area paths', value: 'explicit' }
  ];

  const strategy = await select({
    message: 'How do you want to select area paths?',
    choices: strategyChoices
  });

  let selectedAreas: ADOAreaPath[] = [];
  let selectionConfig: AreaSelectionConfig = {
    areaPaths: [],
    selectionStrategy: strategy,
    projectName
  };

  switch (strategy) {
    case 'all': {
      selectedAreas = allAreaPaths;
      break;
    }

    case 'pattern': {
      // Show examples based on actual area path names
      const exampleNames = allAreaPaths.slice(0, 3).map(a => a.name);
      const exampleHint = exampleNames.length > 0
        ? ` (your areas: ${exampleNames.join(', ')}...)`
        : '';

      const pattern = await input({
        message: `Enter pattern${exampleHint}:`,
        validate: (value: string) => value.trim() ? true : 'Pattern is required'
      });

      selectedAreas = filterAreaPathsByPattern(allAreaPaths, pattern.trim());
      selectionConfig.pattern = pattern.trim();

      if (selectedAreas.length === 0) {
        console.log(chalk.yellow(`\n⚠️  No area paths match pattern "${pattern}"\n`));

        // Offer to try again or select manually
        const tryAgain = await confirm({
          message: 'Try a different pattern?',
          default: true
        });

        if (tryAgain) {
          return selectAreaPaths(allAreaPaths, projectName);
        }
        return null;
      }
      break;
    }

    case 'explicit': {
      // Use checkbox for explicit selection
      const areaChoices = allAreaPaths.map(a => ({
        name: a.path,
        value: a,
        checked: false
      }));

      selectedAreas = await checkbox({
        message: 'Select area paths (space to select, enter to confirm):',
        choices: areaChoices,
        pageSize: 15,
        required: true
      });

      if (selectedAreas.length === 0) {
        console.log(chalk.yellow('\n⚠️  No area paths selected.\n'));
        return null;
      }
      break;
    }
  }

  // Show preview and confirm
  showAreaPathPreview(selectedAreas);

  const confirmed = await confirm({
    message: `Use these ${selectedAreas.length} area paths?`,
    default: true
  });

  if (!confirmed) {
    console.log(chalk.gray('\n✓ Area path selection cancelled\n'));
    return null;
  }

  // Build final configuration
  selectionConfig.areaPaths = selectedAreas.map(a => a.path);

  console.log(chalk.green(`\n✅ Selected ${selectionConfig.areaPaths.length} area paths\n`));

  return selectionConfig;
}
