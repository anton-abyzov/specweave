/**
 * Documentation CLI commands
 *
 * Provides CLI interface for documentation preview, build, and validation.
 * Works in ANY SpecWeave user project, not just the SpecWeave repo itself.
 *
 * @module cli/commands/docs
 */

import * as path from 'path';
import chalk from 'chalk';
import { Logger, consoleLogger } from '../../utils/logger.js';
import * as fs from '../../utils/fs-native.js';
import type { DocScope } from '../../utils/docs-preview/types.js';
import { SCOPE_PORTS, SCOPE_SITE_DIRS, SCOPE_DOC_DIRS } from '../../utils/docs-preview/types.js';

export interface DocsPreviewOptions {
  port?: number;
  force?: boolean;
  noBrowser?: boolean;
  validate?: boolean;
  autoFix?: boolean;
  scope?: DocScope;
}

export interface DocsBuildOptions {
  validate?: boolean;
  autoFix?: boolean;
  output?: string;
  scope?: DocScope;
}

export interface DocsValidateOptions {
  autoFix?: boolean;
  verbose?: boolean;
  scope?: DocScope;
}

/**
 * Preview documentation with Docusaurus dev server
 */
export async function docsPreviewCommand(options: DocsPreviewOptions = {}): Promise<void> {
  const projectRoot = process.cwd();
  const scope: DocScope = options.scope || 'internal';
  const docsPath = path.join(projectRoot, '.specweave', 'docs', SCOPE_DOC_DIRS[scope]);
  const scopeLabel = scope === 'public' ? 'public' : 'internal';

  console.log(chalk.blue(`\n\u{1F4DA} Documentation Preview (${scopeLabel})\n`));

  // Check if docs exist
  if (!fs.existsSync(docsPath)) {
    console.log(chalk.red(`❌ No ${scopeLabel} documentation found.`));
    console.log(chalk.dim(`   Expected: ${docsPath}`));
    if (scope === 'public') {
      console.log(chalk.dim('\n   Create public docs in .specweave/docs/public/\n'));
    } else {
      console.log(chalk.dim('\n   Run one of these commands first:'));
      console.log(chalk.dim('   • specweave init (for new projects)'));
      console.log(chalk.dim('   • /sw:increment "feature" (to create docs)\n'));
    }
    process.exit(1);
  }

  // Run validation first (unless explicitly skipped)
  if (options.validate !== false) {
    console.log(chalk.cyan('🔍 Running pre-flight validation...\n'));

    try {
      const { DocsValidator } = await import('../../utils/docs-validator.js');

      const validator = new DocsValidator({
        docsPath,
        autoFix: options.autoFix ?? true, // Auto-fix by default
      });

      const result = await validator.validate();

      if (result.fixedCount > 0) {
        console.log(chalk.green(`   ✅ Auto-fixed ${result.fixedCount} issue(s)`));
      }

      if (!result.valid) {
        console.log(chalk.red('\n❌ Documentation has errors that must be fixed:\n'));
        for (const issue of result.issues.filter(i => i.severity === 'error')) {
          console.log(chalk.red(`   • ${issue.file}:${issue.line || 1}`));
          console.log(chalk.dim(`     ${issue.message}`));
        }
        console.log(chalk.dim('\n   Fix these issues, then try again.\n'));
        process.exit(1);
      }

      if (result.warnings > 0) {
        console.log(chalk.yellow(`   ⚠️  ${result.warnings} warning(s) (non-blocking)`));
      }

      console.log(chalk.green('   ✅ Validation passed!\n'));
    } catch (error) {
      console.log(chalk.yellow('   ⚠️  Validation skipped (module not available)'));
      console.log(chalk.dim(`   ${error instanceof Error ? error.message : error}\n`));
    }
  }

  // Launch preview
  try {
    const { launchPreview, killAllDocusaurusProcesses, killProcessOnPort } = await import('../../utils/docs-preview/index.js');

    // Kill any existing Docusaurus processes to avoid port conflicts
    const killed = await killAllDocusaurusProcesses();
    if (killed > 0) {
      console.log(chalk.dim(`   Stopped ${killed} existing Docusaurus process(es)\n`));
    }

    // Kill any process occupying the target port
    const targetPort = options.port || SCOPE_PORTS[scope];
    const portKilled = await killProcessOnPort(targetPort);
    if (portKilled) {
      console.log(chalk.dim(`   Freed port ${targetPort}\n`));
      // Brief wait for OS to release the port
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(chalk.cyan('🚀 Starting documentation server...\n'));

    const server = await launchPreview(projectRoot, {
      port: options.port,
      openBrowser: !options.noBrowser,
      force: options.force,
      scope,
    });

    console.log(chalk.green('━'.repeat(50)));
    console.log(chalk.green.bold(`\n📚 ${scopeLabel.charAt(0).toUpperCase() + scopeLabel.slice(1)} Documentation Preview Server Started!\n`));
    console.log(chalk.white(`   URL: ${chalk.cyan.underline(server.url)}`));
    console.log(chalk.white(`   Content: ${chalk.dim(`.specweave/docs/${SCOPE_DOC_DIRS[scope]}/`)}`));
    console.log(chalk.dim(`   Port: ${server.port}`));
    console.log();
    console.log(chalk.white('   Features:'));
    console.log(chalk.dim('   • Hot reload - edit markdown, see changes instantly'));
    console.log(chalk.dim('   • Mermaid diagrams - architecture diagrams render beautifully'));
    console.log(chalk.dim('   • Auto sidebar - generated from folder structure'));
    console.log(chalk.dim('   • Dark/light mode - toggle in navbar'));
    console.log();
    console.log(chalk.yellow('   Press Ctrl+C to stop the server.\n'));
    console.log(chalk.green('━'.repeat(50)));
    console.log();

    // Keep process alive
    process.on('SIGINT', async () => {
      console.log(chalk.dim('\n\nStopping server...'));
      await server.stop();
      console.log(chalk.green('✅ Server stopped\n'));
      process.exit(0);
    });

    // Keep process running
    await new Promise(() => {});
  } catch (error) {
    console.log(chalk.red(`\n❌ Failed to start preview server:`));
    console.log(chalk.dim(`   ${error instanceof Error ? error.message : error}`));

    if (error instanceof Error && error.message.includes('No available ports')) {
      console.log(chalk.dim('\n   Try killing existing processes:'));
      console.log(chalk.dim('   lsof -i :3015-3020 | grep node'));
      console.log(chalk.dim('   kill -9 <PID>'));
    }

    process.exit(1);
  }
}

/**
 * Build static documentation site
 */
export async function docsBuildCommand(options: DocsBuildOptions = {}): Promise<void> {
  const projectRoot = process.cwd();
  const scope: DocScope = options.scope || 'internal';
  const docsPath = path.join(projectRoot, '.specweave', 'docs', SCOPE_DOC_DIRS[scope]);
  const scopeLabel = scope === 'public' ? 'public' : 'internal';

  console.log(chalk.blue(`\n\u{1F4E6} Documentation Build (${scopeLabel})\n`));

  // Check if docs exist
  if (!fs.existsSync(docsPath)) {
    console.log(chalk.red(`❌ No ${scopeLabel} documentation found.`));
    console.log(chalk.dim(`   Expected: ${docsPath}\n`));
    process.exit(1);
  }

  // Run validation first
  if (options.validate !== false) {
    console.log(chalk.cyan('🔍 Running pre-build validation...\n'));

    let validationResult;
    try {
      const { DocsValidator } = await import('../../utils/docs-validator.js');

      const validator = new DocsValidator({
        docsPath,
        autoFix: options.autoFix ?? true,
      });

      validationResult = await validator.validate();
    } catch (error) {
      console.log(chalk.yellow('   ⚠️  Validation skipped\n'));
    }

    if (validationResult && !validationResult.valid) {
      console.log(chalk.red('\n❌ Documentation has errors. Build aborted.\n'));
      process.exit(1);
    }

    if (validationResult) {
      console.log(chalk.green('   ✅ Validation passed!\n'));
    }
  }

  // Build static site
  try {
    const { buildStaticSite, isSetupNeeded, quickSetup } = await import('../../utils/docs-preview/index.js');

    // Setup if needed
    if (await isSetupNeeded(projectRoot, scope)) {
      console.log(chalk.cyan('📦 First-time setup: Installing Docusaurus...\n'));
      await quickSetup(projectRoot, scope);
    }

    await buildStaticSite(projectRoot, scope);

    const outputPath = options.output || path.join(projectRoot, '.specweave', SCOPE_SITE_DIRS[scope], 'build');

    console.log(chalk.green('\n✅ Build complete!'));
    console.log(chalk.dim(`   Output: ${outputPath}`));
    console.log(chalk.dim('\n   To serve locally:'));
    console.log(chalk.dim(`   cd ${outputPath} && npx serve\n`));
  } catch (error) {
    console.log(chalk.red(`\n❌ Build failed:`));
    console.log(chalk.dim(`   ${error instanceof Error ? error.message : error}\n`));
    process.exit(1);
  }
}

/**
 * Validate documentation without starting server
 */
export async function docsValidateCommand(options: DocsValidateOptions = {}): Promise<void> {
  const projectRoot = process.cwd();
  const scope: DocScope = options.scope || 'internal';
  const docsPath = path.join(projectRoot, '.specweave', 'docs', SCOPE_DOC_DIRS[scope]);
  const scopeLabel = scope === 'public' ? 'public' : 'internal';

  console.log(chalk.blue(`\n\u{1F50D} Documentation Validation (${scopeLabel})\n`));

  // Check if docs exist
  if (!fs.existsSync(docsPath)) {
    console.log(chalk.red(`❌ No ${scopeLabel} documentation found.`));
    console.log(chalk.dim(`   Expected: ${docsPath}\n`));
    process.exit(1);
  }

  let result;
  try {
    const { DocsValidator } = await import('../../utils/docs-validator.js');

    const validator = new DocsValidator({
      docsPath,
      autoFix: options.autoFix ?? false, // Don't auto-fix in validate mode by default
    });

    console.log(chalk.dim(`   Scanning: ${docsPath}\n`));

    result = await validator.validate();
  } catch (error) {
    console.log(chalk.red(`\n❌ Validation failed:`));
    console.log(chalk.dim(`   ${error instanceof Error ? error.message : error}\n`));
    process.exit(1);
  }

  // Print summary
  console.log(chalk.white('   Summary:'));
  console.log(chalk.dim(`   • Total files: ${result.totalFiles}`));

  if (result.errors > 0) {
    console.log(chalk.red(`   • Errors: ${result.errors}`));
  } else {
    console.log(chalk.green(`   • Errors: 0`));
  }

  if (result.warnings > 0) {
    console.log(chalk.yellow(`   • Warnings: ${result.warnings}`));
  } else {
    console.log(chalk.dim(`   • Warnings: 0`));
  }

  if (result.fixedCount > 0) {
    console.log(chalk.green(`   • Auto-fixed: ${result.fixedCount}`));
  }

  console.log();

  // Print issues
  if (options.verbose || result.errors > 0) {
    for (const issue of result.issues) {
      const color = issue.severity === 'error' ? chalk.red
        : issue.severity === 'warning' ? chalk.yellow
        : chalk.dim;

      const icon = issue.severity === 'error' ? '❌'
        : issue.severity === 'warning' ? '⚠️'
        : 'ℹ️';

      console.log(color(`   ${icon} ${issue.file}:${issue.line || 1}`));
      console.log(chalk.dim(`      ${issue.type}: ${issue.message}`));
      if (issue.autoFixable && !options.autoFix) {
        console.log(chalk.dim(`      (auto-fixable with --auto-fix)`));
      }
      console.log();
    }
  }

  // Final status
  if (result.valid) {
    console.log(chalk.green('✅ Documentation is valid!\n'));
    process.exit(0);
  } else {
    console.log(chalk.red('❌ Documentation has errors.\n'));
    if (!options.autoFix) {
      console.log(chalk.dim('   Try running with --auto-fix to fix common issues.\n'));
    }
    process.exit(1);
  }
}

/**
 * Kill all running Docusaurus processes
 */
export async function docsKillCommand(): Promise<void> {
  console.log(chalk.blue('\n🛑 Stopping Documentation Servers\n'));

  try {
    const { killAllDocusaurusProcesses } = await import('../../utils/docs-preview/index.js');

    const killed = await killAllDocusaurusProcesses();

    if (killed > 0) {
      console.log(chalk.green(`✅ Stopped ${killed} Docusaurus process(es)\n`));
    } else {
      console.log(chalk.dim('   No Docusaurus processes running\n'));
    }
  } catch (error) {
    console.log(chalk.red(`\n❌ Failed to stop processes:`));
    console.log(chalk.dim(`   ${error instanceof Error ? error.message : error}\n`));
    process.exit(1);
  }
}

/**
 * Show docs status and help
 */
export async function docsStatusCommand(): Promise<void> {
  const projectRoot = process.cwd();

  console.log(chalk.blue('\n\u{1F4DA} Documentation Status\n'));

  // Count markdown files recursively
  const countMd = (dir: string): number => {
    if (!fs.existsSync(dir)) return 0;
    let count = 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += countMd(path.join(dir, entry.name));
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
        count++;
      }
    }
    return count;
  };

  // Show status for both scopes
  const scopes: DocScope[] = ['internal', 'public'];
  for (const scope of scopes) {
    const docsPath = path.join(projectRoot, '.specweave', 'docs', SCOPE_DOC_DIRS[scope]);
    const sitePath = path.join(projectRoot, '.specweave', SCOPE_SITE_DIRS[scope]);
    const docsExist = fs.existsSync(docsPath);
    const siteSetup = fs.existsSync(path.join(sitePath, 'node_modules'));
    const label = scope.charAt(0).toUpperCase() + scope.slice(1);

    console.log(chalk.white(`   ${label} docs:`));
    console.log(`     Source: ${docsExist ? chalk.green('✓ Found') : chalk.red('✗ Not found')} ${chalk.dim(`.specweave/docs/${SCOPE_DOC_DIRS[scope]}/`)}`);
    if (docsExist) {
      const docCount = countMd(docsPath);
      console.log(`     Documents: ${chalk.cyan(docCount)} files`);
    }
    console.log(`     Docusaurus: ${siteSetup ? chalk.green('✓ Installed') : chalk.yellow('○ Not installed (will auto-setup)')}`);
    console.log(`     Port: ${chalk.dim(String(SCOPE_PORTS[scope]))}`);
    console.log();
  }

  console.log(chalk.white('   Commands:'));
  console.log(chalk.dim('   • specweave docs                        - Preview internal docs (port 3015)'));
  console.log(chalk.dim('   • specweave docs public                 - Preview public docs (port 3016)'));
  console.log(chalk.dim('   • specweave docs build                  - Build internal site'));
  console.log(chalk.dim('   • specweave docs build --scope public   - Build public site'));
  console.log(chalk.dim('   • specweave docs validate               - Check for errors'));
  console.log(chalk.dim('   • specweave docs kill                   - Stop all running servers'));
  console.log();
}
