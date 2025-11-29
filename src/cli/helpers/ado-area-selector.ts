/**
 * Azure DevOps Area Path Selection Helper
 *
 * Implements US-004: Pattern-Based Work Item Selection for ADO Init
 *
 * Similar to github-repo-selector.ts, provides functionality to:
 * - Select area paths by pattern (glob)
 * - Select area paths by regex
 * - Select all area paths from a project
 * - Select explicit list of area paths
 * - Preview selection before confirmation
 */

import { select, input, confirm, checkbox } from '@inquirer/prompts';
import chalk from 'chalk';
import { minimatch } from 'minimatch';
import { parsePatternShortcut, validateRegex } from './selection-strategy.js';

export interface ADOAreaPath {
  name: string;      // Leaf name (e.g., "Platform")
  path: string;      // Full path (e.g., "MyProject\\Team A\\Platform")
  hasChildren?: boolean;
}

export interface AreaSelectionConfig {
  areaPaths: string[];         // Array of full paths
  selectionStrategy: 'all' | 'pattern-glob' | 'pattern-regex' | 'explicit' | 'manual-entry';
  pattern?: string;            // For pattern strategies
  isRegex?: boolean;           // True if pattern is regex
  projectName?: string;        // Source project
}

/**
 * Filter area paths by glob pattern
 * Matches against the leaf name (last segment of path)
 */
export function filterAreaPathsByPattern(areas: ADOAreaPath[], pattern: string): ADOAreaPath[] {
  // Parse shortcuts (starts:, ends:, contains:)
  const parsedPattern = parsePatternShortcut(pattern);
  return areas.filter(area => {
    // Match against leaf name only
    return minimatch(area.name, parsedPattern, { nocase: true });
  });
}

/**
 * Filter area paths by regex pattern
 * Matches against the leaf name (last segment of path)
 */
export function filterAreaPathsByRegex(areas: ADOAreaPath[], pattern: string): { items: ADOAreaPath[]; error?: string } {
  try {
    const regex = new RegExp(pattern, 'i'); // Case-insensitive
    const matched = areas.filter(area => regex.test(area.name));
    return { items: matched };
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
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

  // Prompt for selection strategy - unified with other platforms
  const strategyChoices: Array<{ name: string; value: AreaSelectionConfig['selectionStrategy'] }> = [
    {
      name: `${chalk.green('✓')} All ${chalk.gray(`- Import all ${allAreaPaths.length} area paths`)}`,
      value: 'all',
    },
    {
      name: `Pattern (glob) ${chalk.gray('- Match by pattern (e.g., "*-Platform", "*-Service")')}`,
      value: 'pattern-glob',
    },
    {
      name: `Pattern (regex) ${chalk.gray('- Regular expression (e.g., "^Platform-.*$")')}`,
      value: 'pattern-regex',
    },
    {
      name: `Select specific ${chalk.gray('- Choose from list (checkbox)')}`,
      value: 'explicit',
    },
    {
      name: `Manual entry ${chalk.gray('- Enter names directly (comma-separated)')}`,
      value: 'manual-entry',
    },
  ];

  const strategy = await select({
    message: 'How do you want to select area paths?',
    choices: strategyChoices,
    default: 'all',
  });

  let selectedAreas: ADOAreaPath[] = [];
  let selectionConfig: AreaSelectionConfig = {
    areaPaths: [],
    selectionStrategy: strategy,
    projectName,
  };

  switch (strategy) {
    case 'all': {
      selectedAreas = allAreaPaths;
      break;
    }

    case 'pattern-glob': {
      // Show examples based on actual area path names
      const exampleNames = allAreaPaths.slice(0, 3).map(a => a.name);
      const exampleHint = exampleNames.length > 0
        ? ` (examples: ${exampleNames.join(', ')}...)`
        : '';

      console.log(chalk.gray('\n   💡 Examples: "*-Platform", "*-Service", "Team-*"'));
      console.log(chalk.gray('   💡 Shortcuts: "starts: Team-", "ends: -Platform", "contains: Core"\n'));

      const pattern = await input({
        message: `Enter pattern${exampleHint}:`,
        validate: (value: string) => value.trim() ? true : 'Pattern is required',
      });

      selectedAreas = filterAreaPathsByPattern(allAreaPaths, pattern.trim());
      selectionConfig.pattern = parsePatternShortcut(pattern.trim());

      if (selectedAreas.length === 0) {
        console.log(chalk.yellow(`\n⚠️  No area paths match pattern "${pattern}"\n`));

        const tryAgain = await confirm({
          message: 'Try a different pattern?',
          default: true,
        });

        if (tryAgain) {
          return selectAreaPaths(allAreaPaths, projectName);
        }
        return null;
      }
      break;
    }

    case 'pattern-regex': {
      console.log(chalk.gray('\n   💡 Examples: "^Platform-", ".*-Service$", "^Team-\\d+$"\n'));

      const pattern = await input({
        message: 'Enter regex pattern:',
        validate: (value: string) => {
          if (!value.trim()) return 'Pattern is required';
          const validation = validateRegex(value.trim());
          if (validation !== true) {
            return `Invalid regular expression: ${validation}`;
          }
          return true;
        },
      });

      const regexResult = filterAreaPathsByRegex(allAreaPaths, pattern.trim());
      if (regexResult.error) {
        console.log(chalk.red(`\n❌ Invalid regex: ${regexResult.error}\n`));
        return null;
      }

      selectedAreas = regexResult.items;
      selectionConfig.pattern = pattern.trim();
      selectionConfig.isRegex = true;

      if (selectedAreas.length === 0) {
        console.log(chalk.yellow(`\n⚠️  No area paths match regex "${pattern}"\n`));

        const tryAgain = await confirm({
          message: 'Try a different pattern?',
          default: true,
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
        name: `${a.name} ${chalk.gray(`(${a.path})`)}`,
        value: a,
        checked: false,
      }));

      selectedAreas = await checkbox({
        message: 'Select area paths (space to toggle, enter to confirm):',
        choices: areaChoices,
        pageSize: 15,
        required: true,
      });

      if (selectedAreas.length === 0) {
        console.log(chalk.yellow('\n⚠️  No area paths selected.\n'));
        return null;
      }
      break;
    }

    case 'manual-entry': {
      console.log(chalk.gray('\n   💡 Enter area path names separated by commas'));
      console.log(chalk.gray('   💡 Example: "Platform, Service, Database"\n'));

      const entryInput = await input({
        message: 'Enter area path names (comma-separated):',
        validate: (value: string) => value.trim() ? true : 'At least one entry is required',
      });

      // Parse comma-separated entries
      const entries = entryInput.split(',').map(s => s.trim()).filter(Boolean);
      const entrySet = new Set(entries.map(e => e.toLowerCase()));

      // Match against available area paths
      selectedAreas = allAreaPaths.filter(area => entrySet.has(area.name.toLowerCase()));

      // Report not found entries
      const foundNames = new Set(selectedAreas.map(a => a.name.toLowerCase()));
      const notFoundEntries = entries.filter(e => !foundNames.has(e.toLowerCase()));

      if (notFoundEntries.length > 0) {
        console.log(chalk.yellow(`\n⚠️  Not found: ${notFoundEntries.join(', ')}`));
      }

      if (selectedAreas.length === 0) {
        console.log(chalk.yellow('\n⚠️  No matching area paths found.\n'));

        const tryAgain = await confirm({
          message: 'Try again?',
          default: true,
        });

        if (tryAgain) {
          return selectAreaPaths(allAreaPaths, projectName);
        }
        return null;
      }
      break;
    }
  }

  // Show preview and confirm
  showAreaPathPreview(selectedAreas);

  const confirmed = await confirm({
    message: `Use these ${selectedAreas.length} area paths?`,
    default: true,
  });

  if (!confirmed) {
    console.log(chalk.gray('\n✓ Area path selection cancelled\n'));
    return null;
  }

  // Build final configuration - store LEAF NAMES only to prevent double-prefix bugs
  // Full paths like "MyProject\Platform-Engineering" become just "Platform-Engineering"
  selectionConfig.areaPaths = selectedAreas.map(a => a.name);

  console.log(chalk.green(`\n✅ Selected ${selectionConfig.areaPaths.length} area paths\n`));

  return selectionConfig;
}
