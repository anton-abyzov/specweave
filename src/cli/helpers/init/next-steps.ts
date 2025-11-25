/**
 * Next steps display after init completion
 */

import chalk from 'chalk';
import { getLocaleManager } from '../../../core/i18n/locale-manager.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';

/**
 * Show next steps after initialization
 *
 * @param projectName - Project name
 * @param adapterName - Adapter name (claude, cursor, generic)
 * @param language - Language for i18n
 * @param usedDotNotation - Whether user used "." for current directory
 * @param pluginAutoInstalled - Whether plugins were auto-installed (Claude only)
 */
export function showNextSteps(
  projectName: string,
  adapterName: string,
  language: SupportedLanguage,
  usedDotNotation: boolean = false,
  pluginAutoInstalled: boolean = false
): void {
  const locale = getLocaleManager(language);

  console.log('');
  console.log(chalk.cyan.bold(locale.t('cli', 'init.nextSteps.header')));
  console.log('');

  let stepNumber = 1;

  // Only show "cd" step if we created a subdirectory
  if (!usedDotNotation) {
    console.log(`   ${stepNumber}. ${chalk.white(locale.t('cli', 'init.nextSteps.cd', { projectName }))}`);
    console.log('');
    stepNumber++;
  }

  // Adapter-specific instructions
  if (adapterName === 'claude') {
    console.log(`   ${stepNumber}. ${chalk.white(locale.t('cli', 'init.nextSteps.claude.step1'))}`);
    console.log('');
    stepNumber++;

    // Only show manual install if auto-install failed
    if (!pluginAutoInstalled) {
      console.log(`   ${stepNumber}. ${chalk.yellow.bold('⚠️  ' + locale.t('cli', 'init.nextSteps.claude.step2'))}`);
      console.log(`      ${chalk.cyan.bold(locale.t('cli', 'init.nextSteps.claude.installCore'))}`);
      console.log(`      ${chalk.gray('↑ Required for slash commands like /specweave:increment')}`);
      console.log('');
      stepNumber++;
    }

    console.log(`   ${stepNumber}. ${chalk.white('All plugins are already installed!')}`);
    console.log(`      ${chalk.gray('✔ All 19+ SpecWeave plugins installed automatically')}`);
    console.log(`      ${chalk.gray('✔ No need to install additional plugins manually')}`);
    console.log(`      ${chalk.gray('✔ Full capabilities available immediately')}`);
    console.log('');
    stepNumber++;

    console.log(`   ${stepNumber}. ${chalk.white(locale.t('cli', 'init.nextSteps.claude.step4'))}`);
    console.log(`      ${chalk.cyan(locale.t('cli', 'init.nextSteps.claude.example'))}`);
    console.log(`      ${chalk.gray(locale.t('cli', 'init.nextSteps.claude.autoActivate'))}`);
  } else if (adapterName === 'cursor') {
    console.log(`   ${stepNumber}. ${chalk.white(locale.t('cli', 'init.nextSteps.cursor.step1'))}`);
    console.log('');
    console.log(`   ${stepNumber + 1}. ${chalk.white(locale.t('cli', 'init.nextSteps.cursor.step2'))}`);
    console.log(`      ${locale.t('cli', 'init.nextSteps.cursor.guide')}`);
    console.log('');
    console.log(`   ${stepNumber + 2}. ${chalk.white(locale.t('cli', 'init.nextSteps.cursor.step3'))}`);
    console.log(`      ${locale.t('cli', 'init.nextSteps.cursor.shortcuts')}`);
  } else if (adapterName === 'generic') {
    console.log(`   ${stepNumber}. ${chalk.white(locale.t('cli', 'init.nextSteps.generic.step1'))}`);
    console.log('');
    console.log(`   ${stepNumber + 1}. ${chalk.white(locale.t('cli', 'init.nextSteps.generic.step2'))}`);
    console.log(`      ${locale.t('cli', 'init.nextSteps.generic.compatibility')}`);
  }

  console.log('');
  console.log(chalk.green.bold(locale.t('cli', 'init.nextSteps.footer')));
  console.log('');
  console.log(chalk.gray(locale.t('cli', 'init.nextSteps.docsLink')));
  console.log(chalk.gray(locale.t('cli', 'init.nextSteps.githubLink')));
  console.log('');
}
