#!/usr/bin/env node
/**
 * Refresh SpecWeave Marketplace
 *
 * Automates the complete marketplace refresh process:
 * 1. Updates or adds marketplace (GitHub or local)
 * 2. Installs all plugins from marketplace
 * 3. Updates instruction files (CLAUDE.md, AGENTS.md)
 *
 * Usage:
 *   specweave refresh-marketplace
 *   specweave refresh-marketplace --local
 *   specweave refresh-marketplace --github
 *
 * @since 1.0.60
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import os from 'os';

// Configuration
const MARKETPLACE_NAME = 'specweave';
const GITHUB_REPO = 'anton-abyzov/specweave';

interface RefreshOptions {
  local?: boolean;
  github?: boolean;
  verbose?: boolean;
}

interface PluginResult {
  name: string;
  success: boolean;
  error?: string;
}

function runCommand(command: string, silent = false): { success: boolean; output: string } {
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: silent ? 'pipe' : ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output: output.trim() };
  } catch (error: unknown) {
    const err = error as { stdout?: Buffer | string; stderr?: Buffer | string; message?: string };
    const output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
    return { success: false, output: output || err.message || 'Unknown error' };
  }
}

function checkMarketplaceExists(): boolean {
  const result = runCommand('claude plugin marketplace list 2>/dev/null', true);
  return result.success && result.output.includes(MARKETPLACE_NAME);
}

function getMarketplaceInstallPath(): string | null {
  const knownMarketplacesPath = path.join(os.homedir(), '.claude/plugins/known_marketplaces.json');

  if (!fs.existsSync(knownMarketplacesPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(knownMarketplacesPath, 'utf8');
    const data = JSON.parse(content);
    return data[MARKETPLACE_NAME]?.installLocation || null;
  } catch {
    return null;
  }
}

function getPluginsFromMarketplace(marketplacePath: string): string[] {
  const marketplaceJsonPath = path.join(marketplacePath, '.claude-plugin/marketplace.json');

  if (!fs.existsSync(marketplaceJsonPath)) {
    throw new Error(`Marketplace JSON not found at ${marketplaceJsonPath}`);
  }

  try {
    const content = fs.readFileSync(marketplaceJsonPath, 'utf8');
    const data = JSON.parse(content);
    return data.plugins?.map((p: { name: string }) => p.name) || [];
  } catch (error) {
    throw new Error(`Failed to parse marketplace.json: ${error}`);
  }
}

function installPlugin(pluginName: string): PluginResult {
  const result = runCommand(`claude plugin install "${pluginName}" 2>&1`, true);

  if (result.success && result.output.includes('Successfully installed')) {
    return { name: pluginName, success: true };
  }

  // Check if already installed (not an error)
  if (result.output.includes('already installed')) {
    return { name: pluginName, success: true };
  }

  return { name: pluginName, success: false, error: result.output };
}

export async function refreshMarketplaceCommand(options: RefreshOptions): Promise<void> {
  // Determine mode - GitHub is default per CLAUDE.md rules
  const mode = options.local ? 'local' : 'github';

  console.log(chalk.blue.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.blue.bold(`  SpecWeave Marketplace Refresh (${mode} mode)`));
  console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  if (mode === 'local') {
    console.log(chalk.yellow('⚠️  Local mode - use only for active development!\n'));
  }

  // Step 1: Check/update marketplace
  console.log(chalk.yellow('📥 Step 1: Checking marketplace status...'));

  const marketplaceExists = checkMarketplaceExists();

  if (marketplaceExists) {
    console.log(chalk.blue(`✓ Marketplace '${MARKETPLACE_NAME}' already registered`));
    console.log(chalk.blue('📥 Updating marketplace from source...'));

    const updateResult = runCommand(`claude plugin marketplace update "${MARKETPLACE_NAME}" 2>&1`, true);

    if (updateResult.success || updateResult.output.includes('Updated')) {
      console.log(chalk.green('✓ Marketplace updated successfully'));
    } else {
      console.log(chalk.red('✗ Failed to update marketplace'));
      console.log(chalk.gray(updateResult.output));
      process.exit(1);
    }
  } else {
    console.log(chalk.blue('Marketplace not found - adding it now...'));

    let addCommand: string;
    if (mode === 'local') {
      const localPath = process.cwd();
      const marketplaceJsonPath = path.join(localPath, '.claude-plugin/marketplace.json');

      if (!fs.existsSync(marketplaceJsonPath)) {
        console.log(chalk.red(`✗ Error: marketplace.json not found at ${localPath}`));
        console.log(chalk.yellow('  Make sure you are in the SpecWeave repository root.'));
        process.exit(1);
      }

      addCommand = `claude plugin marketplace add "${localPath}" 2>&1`;
      console.log(chalk.blue(`Using local development version: ${localPath}`));
    } else {
      addCommand = `claude plugin marketplace add "${GITHUB_REPO}" 2>&1`;
      console.log(chalk.blue(`Adding from GitHub: ${GITHUB_REPO}`));
    }

    const addResult = runCommand(addCommand, true);

    if (addResult.success || addResult.output.includes('Added') || addResult.output.includes('already')) {
      console.log(chalk.green(`✓ ${mode === 'local' ? 'Local' : 'GitHub'} marketplace added`));
    } else {
      console.log(chalk.red(`✗ Failed to add ${mode} marketplace`));
      console.log(chalk.gray(addResult.output));
      process.exit(1);
    }
  }

  console.log('');

  // Step 2: Get plugin list
  console.log(chalk.yellow('📋 Step 2: Reading plugin list...'));

  const marketplacePath = getMarketplaceInstallPath();

  if (!marketplacePath) {
    console.log(chalk.red('✗ Error: Could not find marketplace install location'));
    console.log(chalk.yellow('  Check ~/.claude/plugins/known_marketplaces.json'));
    process.exit(1);
  }

  let plugins: string[];
  try {
    plugins = getPluginsFromMarketplace(marketplacePath);
  } catch (error) {
    console.log(chalk.red(`✗ Error: ${error}`));
    process.exit(1);
  }

  console.log(chalk.green(`✓ Found ${plugins.length} plugins\n`));

  // Step 3: Install all plugins
  console.log(chalk.yellow('⚙️  Step 3: Installing all plugins...\n'));

  const results: PluginResult[] = [];

  for (const plugin of plugins) {
    console.log(chalk.blue(`  Installing ${plugin}...`));
    const result = installPlugin(plugin);
    results.push(result);

    if (result.success) {
      console.log(chalk.green(`  ✓ ${plugin} installed`));
    } else {
      console.log(chalk.red(`  ✗ ${plugin} failed`));
      if (options.verbose && result.error) {
        console.log(chalk.gray(`    ${result.error}`));
      }
    }
  }

  console.log('');

  // Summary
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const failedPlugins = results.filter((r) => !r.success);

  console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.blue.bold('  Installation Summary'));
  console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  console.log(`  Total plugins: ${plugins.length}`);
  console.log(chalk.green(`  Successful: ${successCount}`));

  if (failCount > 0) {
    console.log(chalk.red(`  Failed: ${failCount}\n`));
    console.log(chalk.yellow('Failed plugins:'));
    for (const plugin of failedPlugins) {
      console.log(chalk.red(`  - ${plugin.name}`));
    }
    console.log('');
    console.log(chalk.yellow('⚠ Some plugins failed to install'));
    console.log(chalk.yellow('Check Claude Code logs for details'));
  } else {
    console.log(chalk.red(`  Failed: 0\n`));
    console.log(chalk.green.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.green.bold('  ✓ ALL PLUGINS INSTALLED SUCCESSFULLY!'));
    console.log(chalk.green.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  }

  console.log('');

  // Step 4: Update instruction files
  console.log(chalk.yellow('📄 Step 4: Updating instruction files...'));

  const configPath = path.join(process.cwd(), '.specweave/config.json');

  if (fs.existsSync(configPath)) {
    const updateResult = runCommand('npx specweave update-instructions 2>&1', true);

    if (updateResult.success) {
      console.log(chalk.green('✓ Instruction files updated'));
    } else {
      console.log(chalk.yellow('⚠ Could not update instruction files'));
      console.log(chalk.gray('  Run manually: npx specweave update-instructions'));
    }
  } else {
    console.log(chalk.blue('ℹ Not in a SpecWeave project - skipping instruction file update'));
  }

  console.log('');
  console.log(chalk.blue('Next steps:'));
  console.log('  1. Restart Claude Code for changes to take effect');
  console.log(`  2. Run ${chalk.yellow('/plugin')} to verify all plugins loaded`);
  console.log(`  3. Check ${chalk.yellow('~/.claude/plugins/installed_plugins.json')}`);
  console.log('');
}

// Standalone execution
const program = new Command();

program
  .name('refresh-marketplace')
  .description('Refresh SpecWeave marketplace and install all plugins')
  .option('--local', 'Use local development version (ONLY for active dev)')
  .option('--github', 'Pull latest from GitHub (default, recommended)')
  .option('-v, --verbose', 'Show detailed error messages')
  .action(async (options: RefreshOptions) => {
    await refreshMarketplaceCommand(options);
  });

program.parse();
