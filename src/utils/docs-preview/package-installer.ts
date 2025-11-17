/**
 * Package installer for Docusaurus dependencies
 * Handles npm install with progress tracking
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { spawn } from 'child_process';
import { execFileNoThrow } from '../execFileNoThrow.js';
import { NodeVersion, InstallOptions } from './types.js';

/**
 * Check Node.js version
 */
export async function checkNodeVersion(): Promise<NodeVersion> {
  try {
    const result = await execFileNoThrow('node', ['--version']);

    if (!result.success) {
      throw new Error('Node.js not found');
    }

    const versionString = result.stdout.trim().replace('v', '');
    const [major, minor, patch] = versionString.split('.').map(Number);

    return {
      version: versionString,
      major,
      minor,
      patch,
      compatible: major >= 18
    };
  } catch (error) {
    throw new Error('Node.js not found. Please install Node.js 18+ from https://nodejs.org/');
  }
}

/**
 * Check if npm is installed
 */
export async function checkNpmInstalled(): Promise<boolean> {
  try {
    const result = await execFileNoThrow('npm', ['--version']);
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Install npm packages
 */
export async function installPackages(options: InstallOptions): Promise<void> {
  const { targetDir, packages, dev = false } = options;

  // Ensure target directory exists
  await fs.ensureDir(targetDir);

  // Build npm install command
  const args = ['install'];
  if (dev) {
    args.push('--save-dev');
  }
  args.push(...packages);

  // Spawn npm install process
  return new Promise((resolve, reject) => {
    const npmProcess = spawn('npm', args, {
      cwd: targetDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });

    let stdout = '';
    let stderr = '';

    npmProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      // Show progress to console
      process.stdout.write('.');
    });

    npmProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    npmProcess.on('close', (code) => {
      if (code === 0) {
        console.log(' ✅');
        resolve();
      } else {
        console.log(' ❌');
        reject(new Error(`npm install failed with code ${code}\n${stderr}`));
      }
    });

    npmProcess.on('error', (error) => {
      reject(new Error(`Failed to start npm install: ${error.message}`));
    });
  });
}

/**
 * Install Docusaurus packages
 */
export async function installDocusaurus(targetDir: string): Promise<void> {
  const packages = [
    '@docusaurus/core@^3.0.0',
    '@docusaurus/preset-classic@^3.0.0',
    '@docusaurus/theme-mermaid@^3.0.0',
    '@mdx-js/react@^3.0.0',
    'clsx@^2.0.0',
    'prism-react-renderer@^2.1.0',
    'react@^18.0.0',
    'react-dom@^18.0.0'
  ];

  const devPackages = [
    '@docusaurus/module-type-aliases@^3.0.0',
    '@docusaurus/types@^3.0.0'
  ];

  console.log('   Installing Docusaurus packages...');
  await installPackages({
    targetDir,
    packages,
    dev: false
  });

  console.log('   Installing dev dependencies...');
  await installPackages({
    targetDir,
    packages: devPackages,
    dev: true
  });
}

/**
 * Check if Docusaurus is installed
 */
export async function isDocusaurusInstalled(targetDir: string): Promise<boolean> {
  try {
    const packageJsonPath = path.join(targetDir, 'package.json');
    const nodeModulesPath = path.join(targetDir, 'node_modules');

    // Check if package.json exists
    if (!await fs.pathExists(packageJsonPath)) {
      return false;
    }

    // Check if node_modules exists
    if (!await fs.pathExists(nodeModulesPath)) {
      return false;
    }

    // Check if @docusaurus/core is installed
    const docusaurusCorePath = path.join(nodeModulesPath, '@docusaurus', 'core');
    if (!await fs.pathExists(docusaurusCorePath)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Clean npm cache
 */
export async function cleanNpmCache(): Promise<void> {
  await execFileNoThrow('npm', ['cache', 'clean', '--force']);
}

/**
 * Get installed npm package version
 */
export async function getPackageVersion(targetDir: string, packageName: string): Promise<string | null> {
  try {
    const packageJsonPath = path.join(targetDir, 'node_modules', packageName, 'package.json');

    if (!await fs.pathExists(packageJsonPath)) {
      return null;
    }

    const packageJson = await fs.readJSON(packageJsonPath);
    return packageJson.version || null;
  } catch {
    return null;
  }
}

/**
 * Estimate install size (rough estimate)
 */
export function estimateInstallSize(): string {
  // Docusaurus + React + dependencies ≈ 150-200 MB
  return '~150 MB';
}

/**
 * Estimate install time (rough estimate)
 */
export function estimateInstallTime(): string {
  // Typically 20-40 seconds depending on network and CPU
  return '~30 seconds';
}
