/**
 * Main orchestrator for Docusaurus setup
 * Coordinates all setup steps: install, config, sidebar, server launch
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { checkNodeVersion, installDocusaurus, isDocusaurusInstalled } from './package-installer';
import { buildSidebar, writeSidebar, countDocuments, countCategories } from './sidebar-builder';
import { writeDocusaurusConfig, writePackageJSON, writeCustomCSS, writeIndexPage, writeIndexModuleCSS } from './config-generator';
import { startDevServer, findAvailablePort } from './server-manager';
import { SetupOptions, DocusaurusConfig, ServerProcess } from './types';

/**
 * Full Docusaurus setup workflow
 */
export async function setupDocusaurus(options: SetupOptions): Promise<void> {
  const { projectRoot, targetDir, docsPath, config, force = false } = options;

  console.log('📦 Setting up Docusaurus documentation preview...\n');

  // Step 1: Check Node.js version
  console.log('1. Checking Node.js version...');
  const nodeVersion = await checkNodeVersion();
  if (!nodeVersion.compatible) {
    throw new Error(
      `Node.js 18+ required (found: ${nodeVersion.version})\n` +
        'Install Node.js from: https://nodejs.org/'
    );
  }
  console.log(`   ✅ Node.js ${nodeVersion.version}\n`);

  // Step 2: Check if already installed
  if (!force && await isDocusaurusInstalled(targetDir)) {
    console.log('✅ Docusaurus already installed (use --force to reinstall)\n');
    return;
  }

  // Step 3: Create target directory
  console.log('2. Creating docs-site directory...');
  await fs.ensureDir(targetDir);
  console.log('   ✅ Directory created\n');

  // Step 4: Generate package.json
  console.log('3. Generating package.json...');
  await writePackageJSON(targetDir, config.title);
  console.log('   ✅ package.json created\n');

  // Step 5: Install Docusaurus packages
  console.log('4. Installing packages (this may take 30-60 seconds)...');
  await installDocusaurus(targetDir);
  console.log('   ✅ Installation complete\n');

  // Step 6: Generate docusaurus.config.js
  console.log('5. Generating docusaurus.config.js...');
  await writeDocusaurusConfig(targetDir, config);
  console.log('   ✅ Configuration generated\n');

  // Step 7: Scan docs and generate sidebar
  console.log('6. Scanning documentation folders...');
  const sidebar = await buildSidebar({
    docsPath,
    excludeFolders: config.excludeFolders || ['legacy', 'node_modules'],
    maxDepth: 5
  });

  const docCount = countDocuments(sidebar);
  const catCount = countCategories(sidebar);
  console.log(`   ✅ Found ${docCount} documents in ${catCount} categories\n`);

  // Step 8: Write sidebar
  console.log('7. Generating sidebars.js...');
  const sidebarPath = path.join(targetDir, 'sidebars.js');
  await writeSidebar(sidebarPath, sidebar);
  console.log('   ✅ Sidebar generated\n');

  // Step 9: Create landing page
  console.log('8. Creating landing page...');
  await writeIndexPage(targetDir, config.title, config.tagline);
  await writeIndexModuleCSS(targetDir);
  console.log('   ✅ Landing page created\n');

  // Step 10: Create custom CSS
  console.log('9. Creating custom theme...');
  await writeCustomCSS(targetDir, config.theme || 'default');
  console.log('   ✅ Theme configured\n');

  console.log('✅ Setup complete!\n');
}

/**
 * Quick setup with defaults
 */
export async function quickSetup(projectRoot: string): Promise<void> {
  const targetDir = path.join(projectRoot, '.specweave', 'docs-site-internal');
  const docsPath = path.join(projectRoot, '.specweave', 'docs', 'internal');

  // Check if docs exist
  if (!await fs.pathExists(docsPath)) {
    throw new Error(
      'No documentation found.\n' +
        'Create documentation by completing your first increment:\n' +
        '  /specweave:increment "your feature"'
    );
  }

  const config: DocusaurusConfig = {
    title: 'SpecWeave Documentation',
    tagline: 'Spec-Driven Development Framework',
    url: 'http://localhost',
    baseUrl: '/',
    docsPath: '../docs/internal',
    port: 3000,
    theme: 'default',
    excludeFolders: ['legacy', 'node_modules']
  };

  await setupDocusaurus({
    projectRoot,
    targetDir,
    docsPath,
    config
  });
}

/**
 * Launch preview (setup if needed, then start server)
 */
export async function launchPreview(
  projectRoot: string,
  options: { port?: number; openBrowser?: boolean; force?: boolean } = {}
): Promise<ServerProcess> {
  const targetDir = path.join(projectRoot, '.specweave', 'docs-site-internal');
  const docsPath = path.join(projectRoot, '.specweave', 'docs', 'internal');

  // Setup if not installed or force flag
  if (options.force || !await isDocusaurusInstalled(targetDir)) {
    await quickSetup(projectRoot);
  }

  // Find available port
  const port = options.port || await findAvailablePort(3000, 3010);
  console.log(`Starting server on port ${port}...`);

  // Start dev server
  const server = await startDevServer(targetDir, {
    port,
    openBrowser: options.openBrowser !== false
  });

  console.log(`\n🌐 Documentation available at: ${server.url}`);
  console.log('🔄 Hot reload enabled - edit docs and see changes instantly');
  console.log('💡 Press Ctrl+C to stop the server\n');

  return server;
}

/**
 * Build static site
 */
export async function buildStaticSite(projectRoot: string): Promise<void> {
  const targetDir = path.join(projectRoot, '.specweave', 'docs-site-internal');

  // Check if installed
  if (!await isDocusaurusInstalled(targetDir)) {
    throw new Error(
      'Docusaurus not installed.\n' +
        'Run: /specweave:docs preview (this will install it)'
    );
  }

  console.log('📦 Building static documentation site...\n');

  const { spawn } = await import('child_process');

  return new Promise((resolve, reject) => {
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: targetDir,
      stdio: 'inherit',
      shell: true
    });

    buildProcess.on('close', (code) => {
      if (code === 0) {
        const buildPath = path.join(targetDir, 'build');
        console.log('\n✅ Build complete!');
        console.log(`📁 Output: ${buildPath}\n`);
        resolve();
      } else {
        reject(new Error(`Build failed with code ${code}`));
      }
    });

    buildProcess.on('error', (error) => {
      reject(new Error(`Failed to start build: ${error.message}`));
    });
  });
}

/**
 * Check if setup is needed
 */
export async function isSetupNeeded(projectRoot: string): Promise<boolean> {
  const targetDir = path.join(projectRoot, '.specweave', 'docs-site-internal');
  return !(await isDocusaurusInstalled(targetDir));
}

/**
 * Get docs site path
 */
export function getDocsSitePath(projectRoot: string): string {
  return path.join(projectRoot, '.specweave', 'docs-site-internal');
}

/**
 * Get docs path
 */
export function getDocsPath(projectRoot: string): string {
  return path.join(projectRoot, '.specweave', 'docs', 'internal');
}
