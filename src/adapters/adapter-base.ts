/**
 * Base Adapter Class
 *
 * Provides common functionality for all adapters.
 * Concrete adapters extend this class and implement tool-specific logic.
 */

import * as fs from '../utils/fs-native.js';
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
import { getSystemPromptForLanguage } from '../core/i18n/language-manager.js';
import type { SupportedLanguage } from '../core/i18n/types.js';
import type { Plugin } from '../core/types/plugin.js';

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
   * Helper: Check if a command exists in PATH (cross-platform)
   */
  protected async commandExists(command: string): Promise<boolean> {
    try {
      const checkCmd = process.platform === 'win32' ? `where ${command}` : `which ${command}`;
      execSync(checkCmd, { stdio: 'ignore' });
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

  /**
   * Check if this adapter supports plugins
   * Default: No plugin support (override in concrete adapters)
   */
  supportsPlugins(): boolean {
    return false;
  }

  /**
   * Compile and install a plugin
   * Default: Throw error (override in concrete adapters that support plugins)
   */
  async compilePlugin(plugin: Plugin): Promise<void> {
    throw new Error(`Plugin support not implemented for ${this.name} adapter`);
  }

  /**
   * Unload a plugin
   * Default: Throw error (override in concrete adapters that support plugins)
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    throw new Error(`Plugin support not implemented for ${this.name} adapter`);
  }

  /**
   * Get installed plugins
   * Default: Return empty array (override in concrete adapters that support plugins)
   */
  async getInstalledPlugins(): Promise<string[]> {
    return [];
  }

  /**
   * Helper: Write plugin skill files to a tool-specific rules directory.
   * Each skill is written as `<plugin>-<skill>.md` (or with custom suffix).
   */
  protected async writeSkillFiles(
    plugin: Plugin,
    rulesDir: string,
    fileSuffix = '.md',
  ): Promise<void> {
    const projectPath = process.cwd();
    const targetDir = path.join(projectPath, rulesDir);
    await fs.ensureDir(targetDir);

    const language = await this.getLanguageConfig();

    for (const skill of plugin.skills) {
      const skillMdPath = path.join(skill.path, 'SKILL.md');
      if (!(await fs.pathExists(skillMdPath))) continue;

      const content = await fs.readFile(skillMdPath, 'utf-8');
      const modified = this.injectSystemPrompt(content, language);
      const fileName = `${plugin.manifest.name}-${skill.name}${fileSuffix}`;
      await fs.writeFile(path.join(targetDir, fileName), modified, 'utf-8');
    }
  }

  /**
   * Helper: Remove all skill files for a plugin from a rules directory.
   * Deletes files matching `<pluginName>-*.md` (or custom suffix).
   */
  protected async removeSkillFiles(
    pluginName: string,
    rulesDir: string,
    fileSuffix = '.md',
  ): Promise<void> {
    const projectPath = process.cwd();
    const targetDir = path.join(projectPath, rulesDir);

    if (!(await fs.pathExists(targetDir))) return;

    const files = await fs.readdir(targetDir);
    for (const file of files) {
      if (file.startsWith(`${pluginName}-`) && file.endsWith(fileSuffix)) {
        await fs.remove(path.join(targetDir, file));
      }
    }
  }

  /**
   * Helper: List unique plugin names installed in a rules directory.
   * Extracts plugin name from `<plugin>-<skill>.md` filename pattern.
   */
  protected async listInstalledPluginsInDir(rulesDir: string): Promise<string[]> {
    const projectPath = process.cwd();
    const targetDir = path.join(projectPath, rulesDir);

    if (!(await fs.pathExists(targetDir))) return [];

    const files = await fs.readdir(targetDir);
    const pluginNames = new Set<string>();

    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const dashIdx = file.indexOf('-');
      if (dashIdx > 0) {
        pluginNames.add(file.slice(0, dashIdx));
      }
    }

    return Array.from(pluginNames);
  }

  /**
   * Read language configuration from project config
   */
  protected async getLanguageConfig(): Promise<SupportedLanguage> {
    const projectPath = process.cwd();
    const configPath = path.join(projectPath, '.specweave', 'config.json');

    if (!(await fs.pathExists(configPath))) {
      return 'en';
    }

    try {
      const config = await fs.readJson(configPath);
      return (config.language as SupportedLanguage) || 'en';
    } catch {
      return 'en';
    }
  }

  /**
   * Inject system prompt for non-English languages
   */
  protected injectSystemPrompt(content: string, language: SupportedLanguage): string {
    if (language === 'en') {
      return content;
    }

    const systemPrompt = getSystemPromptForLanguage(language);

    // Handle YAML frontmatter
    if (content.startsWith('---')) {
      const endOfFrontmatter = content.indexOf('---', 3);
      if (endOfFrontmatter !== -1) {
        const frontmatter = content.substring(0, endOfFrontmatter + 3);
        const body = content.substring(endOfFrontmatter + 3);
        return `${frontmatter}\n\n${systemPrompt}\n${body}`;
      }
    }

    return `${systemPrompt}\n\n${content}`;
  }
}
