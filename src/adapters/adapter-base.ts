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
   * Get the tool-specific skills directory path.
   * Default: '.claude/skills' (override in concrete adapters)
   */
  getSkillsDirectory(): string {
    return '.claude/skills';
  }

  /**
   * Helper: Write plugin skill files to a tool-specific rules directory.
   * Each skill is written as `<skill>/SKILL.md` directly under the rules directory.
   * No plugin namespace nesting — non-Claude tools require flat structure.
   */
  protected async writeSkillFiles(
    plugin: Plugin,
    rulesDir: string,
  ): Promise<void> {
    const projectPath = process.cwd();
    const targetDir = path.join(projectPath, rulesDir);
    await fs.ensureDir(targetDir);

    // 2.0 dropped the `language`/`translation` config keys — skills ship in English.
    const language = 'en';

    for (const skill of plugin.skills) {
      const skillMdPath = path.join(skill.path, 'SKILL.md');
      if (!(await fs.pathExists(skillMdPath))) continue;

      const content = await fs.readFile(skillMdPath, 'utf-8');
      const sanitized = this.sanitizeFrontmatter(content, skill.name);
      const modified = this.injectSystemPrompt(sanitized, language);
      const skillSubdir = path.join(targetDir, skill.name);
      await fs.ensureDir(skillSubdir);
      await fs.writeFile(path.join(skillSubdir, 'SKILL.md'), modified, 'utf-8');
    }
  }

  /**
   * Helper: Remove all skill files for a plugin from a rules directory.
   * Removes the plugin's subdirectory (`<rulesDir>/<pluginName>/`).
   */
  protected async removeSkillFiles(
    pluginName: string,
    rulesDir: string,
  ): Promise<void> {
    const projectPath = process.cwd();
    const pluginDir = path.join(projectPath, rulesDir, pluginName);

    if (!(await fs.pathExists(pluginDir))) return;

    await fs.remove(pluginDir);
  }

  /**
   * Helper: List unique plugin names installed in a rules directory.
   * Each subdirectory of rulesDir represents one installed plugin.
   */
  protected async listInstalledPluginsInDir(rulesDir: string): Promise<string[]> {
    const projectPath = process.cwd();
    const targetDir = path.join(projectPath, rulesDir);

    if (!(await fs.pathExists(targetDir))) return [];

    const entries = await fs.readdir(targetDir);
    const pluginNames: string[] = [];

    for (const entry of entries) {
      const entryPath = path.join(targetDir, entry);
      const stats = await fs.stat(entryPath);
      if (stats.isDirectory()) {
        pluginNames.push(entry);
      }
    }

    return pluginNames;
  }


  /**
   * Sanitize frontmatter for non-Claude tools:
   * 1. Ensure `name:` field is present (required for non-Claude)
   * 2. Strip Claude-specific fields: user-invocable, allowed-tools, model
   */
  protected sanitizeFrontmatter(content: string, skillName: string): string {
    if (!content.startsWith('---')) {
      return `---\nname: ${skillName}\ndescription: ${skillName}\n---\n${content}`;
    }

    const endOfFrontmatter = content.indexOf('---', 3);
    if (endOfFrontmatter === -1) return content;

    let frontmatterBlock = content.substring(3, endOfFrontmatter);
    const body = content.substring(endOfFrontmatter + 3);

    // Strip Claude-specific fields (both spellings of user-invocable/invokable)
    frontmatterBlock = frontmatterBlock.replace(/^user-invoc?k?able\s*:.*\n?/gm, '');
    frontmatterBlock = frontmatterBlock.replace(/^allowed-tools\s*:.*\n?/gm, '');
    frontmatterBlock = frontmatterBlock.replace(/^model\s*:.*\n?/gm, '');

    // Ensure name: is present
    if (!/^name\s*:/m.test(frontmatterBlock)) {
      frontmatterBlock = `\nname: ${skillName}${frontmatterBlock}`;
    }

    return `---${frontmatterBlock}---${body}`;
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
