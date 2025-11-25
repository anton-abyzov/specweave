/**
 * Testing configuration prompts
 * Handles test mode selection and coverage targets
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import { select, input } from '@inquirer/prompts';
import type { TestMode, TestingConfig } from './types.js';

/**
 * Result of testing configuration
 */
export interface TestingConfigResult {
  testMode: TestMode;
  coverageTarget: number;
}

/**
 * Prompt user for testing configuration
 *
 * @returns Testing configuration
 */
export async function promptTestingConfig(): Promise<TestingConfigResult> {
  console.log('');
  console.log(chalk.cyan.bold('🧪 Testing Configuration'));
  console.log(chalk.gray('   Configure your default testing approach and coverage targets'));
  console.log('');

  // Add guidance on which testing approach to choose
  console.log(chalk.white('💡 Which testing approach should you choose?'));
  console.log('');
  console.log(chalk.green('   ✓ TDD (Test-Driven Development)'));
  console.log(chalk.gray('     Best for: Complex business logic, critical features, refactoring'));
  console.log(chalk.gray('     Benefits: Better design, fewer bugs, confidence in changes'));
  console.log(chalk.gray('     Tradeoff: Slower initial development, requires discipline'));
  console.log('');
  console.log(chalk.blue('   ✓ Test-After'));
  console.log(chalk.gray('     Best for: Most projects, rapid prototyping, exploratory work'));
  console.log(chalk.gray('     Benefits: Fast iteration, flexible design, good coverage'));
  console.log(chalk.gray('     Tradeoff: May miss edge cases, harder to test after design'));
  console.log('');
  console.log(chalk.yellow('   ✓ Manual Testing'));
  console.log(chalk.gray('     Best for: Quick prototypes, proof-of-concepts, learning'));
  console.log(chalk.gray('     Benefits: Fastest development, no test maintenance'));
  console.log(chalk.gray('     Tradeoff: No safety net, regressions, hard to refactor'));
  console.log('');

  const testMode = await select<TestMode>({
    message: 'Select your testing approach:',
    choices: [
      {
        name: '🔴 TDD - Write tests first (recommended for production apps)',
        value: 'TDD' as const,
      },
      {
        name: '🔵 Test-After - Implement first, test later (balanced approach)',
        value: 'test-after' as const,
      },
      {
        name: '🟡 Manual - No automated tests (prototypes only)',
        value: 'manual' as const,
      }
    ],
    default: 'test-after'
  });

  let coverageTarget = 80;

  // Only ask for coverage if not manual testing
  if (testMode !== 'manual') {
    const selectedCoverageLevel = await select<number | 'custom'>({
      message: 'Select your coverage target level:',
      choices: [
        {
          name: '70% - Acceptable (core paths covered)',
          value: 70 as number | 'custom',
        },
        {
          name: '80% - Good (recommended - most paths covered)',
          value: 80 as number | 'custom',
        },
        {
          name: '90% - Excellent (comprehensive coverage)',
          value: 90 as number | 'custom',
        },
        {
          name: 'Custom (enter your own value)',
          value: 'custom' as number | 'custom',
        }
      ],
      default: 80
    });

    if (selectedCoverageLevel === 'custom') {
      const customInput = await input({
        message: 'Enter custom coverage target (70-95):',
        default: '80',
        validate: (val: string) => {
          const num = parseInt(val, 10);
          if (isNaN(num) || num < 70 || num > 95) {
            return 'Coverage target must be between 70% and 95%';
          }
          return true;
        }
      });
      coverageTarget = parseInt(customInput, 10);
    } else {
      coverageTarget = selectedCoverageLevel as number;
    }
  }

  console.log('');
  console.log(chalk.green(`   ✔ Testing: ${testMode}`));
  if (testMode !== 'manual') {
    console.log(chalk.green(`   ✔ Coverage Target: ${coverageTarget}%`));
  }
  console.log('');

  return { testMode, coverageTarget };
}

/**
 * Update config.json with testing configuration
 *
 * @param targetDir - Project directory
 * @param testMode - Selected test mode
 * @param coverageTarget - Selected coverage target
 */
export function updateConfigWithTesting(
  targetDir: string,
  testMode: TestMode,
  coverageTarget: number
): void {
  const configPath = path.join(targetDir, '.specweave', 'config.json');

  if (!fs.existsSync(configPath)) {
    console.error(chalk.red('⚠️  config.json not found, cannot update testing configuration'));
    return;
  }

  const config = fs.readJsonSync(configPath);

  config.testing = {
    defaultTestMode: testMode,
    defaultCoverageTarget: coverageTarget,
    coverageTargets: {
      unit: Math.min(coverageTarget + 5, 95),
      integration: coverageTarget,
      e2e: Math.min(coverageTarget + 10, 100)
    }
  } satisfies TestingConfig;

  fs.writeJsonSync(configPath, config, { spaces: 2 });
}
