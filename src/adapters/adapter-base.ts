/**
 * Base Adapter Class
 *
 * Provides common functionality for all adapters.
 * Concrete adapters extend this class and implement tool-specific logic.
 */

import fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  IAdapter,
  AdapterOptions,
  RequirementsResult,
  AdapterFile,
  AutomationLevel
} from './adapter-interface.js';
import { getDirname } from '../utils/esm-helpers.js';

const __dirname = getDirname(import.meta.url);

export abstract class AdapterBase implements IAdapter {
  abstract name: string;
  abstract description: string;
  abstract automationLevel: AutomationLevel;

  /**
   * Default detection - override in concrete adapters
   */
  async detect(): Promise<boolean> {
    return false;
  }

  /**
   * Check common requirements (Node.js, Git)
   * Concrete adapters can override to add tool-specific checks
   */
  async checkRequirements(): Promise<RequirementsResult> {
    const result: RequirementsResult = {
      met: true,
      missing: [],
      warnings: []
    };

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].slice(1));

    if (majorVersion < 18) {
      result.met = false;
      result.missing.push(`Node.js >= 18.0.0 (current: ${nodeVersion})`);
    }

    // Check Git
    try {
      execSync('git --version', { stdio: 'ignore' });
    } catch (error) {
      result.warnings.push('Git not found - version control features may not work');
    }

    return result;
  }

  /**
   * Get files to install - must be implemented by concrete adapters
   */
  abstract getFiles(): AdapterFile[];

  /**
   * Install adapter files to project
   */
  async install(options: AdapterOptions): Promise<void> {
    const files = this.getFiles();
    const adapterSourceDir = path.join(__dirname, this.name);

    console.log(`\n📦 Installing ${this.name} adapter files...`);

    for (const file of files) {
      const sourcePath = path.join(adapterSourceDir, file.sourcePath);
      const targetPath = path.join(options.projectPath, file.targetPath);

      // Ensure target directory exists
      await fs.ensureDir(path.dirname(targetPath));

      // Copy file
      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, targetPath);
        console.log(`  ✅ ${file.targetPath} - ${file.description}`);
      } else {
        console.warn(`  ⚠️  Source file not found: ${sourcePath}`);
      }
    }
  }

  /**
   * Post-installation actions - can be overridden by concrete adapters
   */
  async postInstall(options: AdapterOptions): Promise<void> {
    // Default: Display instructions
    console.log('\n' + this.getInstructions());
  }

  /**
   * Get usage instructions - must be implemented by concrete adapters
   */
  abstract getInstructions(): string;

  /**
   * Helper: Check if a command exists in PATH
   */
  protected async commandExists(command: string): Promise<boolean> {
    try {
      const { execSync } = require('child_process');
      execSync(`which ${command}`, { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Helper: Check if a file exists
   */
  protected async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Helper: Read template file and replace variables
   */
  protected async readTemplate(
    templatePath: string,
    variables: Record<string, string>
  ): Promise<string> {
    let content = await fs.readFile(templatePath, 'utf-8');

    // Replace all {{variable}} with actual values
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return content;
  }
}
