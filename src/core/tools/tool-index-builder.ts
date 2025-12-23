/**
 * Tool Index Builder - Plugin scanner
 * @module core/tools/tool-index-builder
 * @since v0.35.0
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import * as crypto from 'crypto';
import * as os from 'os';
import type { Logger } from '../../utils/logger.js';
import { consoleLogger } from '../../utils/logger.js';
import type {
  IndexedTool,
  ToolCapability,
  IndexBuildOptions,
  IndexBuildResult,
} from './types/tool-registry-types.js';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this',
  'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'use', 'when', 'how', 'what', 'which', 'who', 'whom', 'whose', 'where',
  'why', 'agent', 'skill', 'command', 'activates', 'triggers', 'expert',
]);

export class ToolIndexBuilder {
  private projectRoot: string;
  private logger: Logger;
  private indexedTools: IndexedTool[];

  constructor(projectRoot: string, options: { logger?: Logger } = {}) {
    this.projectRoot = projectRoot;
    this.logger = options.logger ?? consoleLogger;
    this.indexedTools = [];
  }

  async buildIndex(options: IndexBuildOptions = {}): Promise<IndexBuildResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    this.indexedTools = [];

    const pluginsDir = options.pluginsDir ?? path.join(os.homedir(), '.claude', 'plugins');

    if (!fs.existsSync(pluginsDir)) {
      warnings.push(`Plugins directory not found: ${pluginsDir}`);
      return {
        success: true, toolCount: 0, skillCount: 0, agentCount: 0,
        commandCount: 0, duration: Date.now() - startTime, errors, warnings,
      };
    }

    try {
      const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
      const pluginDirs = entries
        .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
        .map((e) => e.name);

      const targetPlugins = options.plugins ?? pluginDirs;

      // Parallel plugin scanning for better performance with many plugins
      const pluginPromises = targetPlugins.map(async (pluginName) => {
        const pluginPath = path.join(pluginsDir, pluginName);
        if (!fs.existsSync(pluginPath)) {
          return { status: 'warning' as const, pluginName, message: `Plugin not found: ${pluginName}` };
        }
        try {
          const tools = await this.indexPlugin(pluginPath, pluginName);
          return { status: 'success' as const, pluginName, tools };
        } catch (error) {
          return { status: 'error' as const, pluginName, message: `Failed to index plugin ${pluginName}: ${error}` };
        }
      });

      const results = await Promise.allSettled(pluginPromises);
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const value = result.value;
          if (value.status === 'success') {
            this.indexedTools.push(...value.tools);
          } else if (value.status === 'warning') {
            warnings.push(value.message);
          } else if (value.status === 'error') {
            errors.push(value.message);
          }
        } else {
          errors.push(`Unexpected error: ${result.reason}`);
        }
      }

      return {
        success: true,
        toolCount: this.indexedTools.length,
        skillCount: this.indexedTools.filter((t) => t.type === 'skill').length,
        agentCount: this.indexedTools.filter((t) => t.type === 'agent').length,
        commandCount: this.indexedTools.filter((t) => t.type === 'command').length,
        duration: Date.now() - startTime,
        errors, warnings,
      };
    } catch (error) {
      errors.push(`Index build failed: ${error}`);
      return {
        success: false, toolCount: 0, skillCount: 0, agentCount: 0,
        commandCount: 0, duration: Date.now() - startTime, errors, warnings,
      };
    }
  }

  async indexPlugin(pluginPath: string, pluginName: string): Promise<IndexedTool[]> {
    const tools: IndexedTool[] = [];

    const skillsPath = path.join(pluginPath, 'skills');
    if (fs.existsSync(skillsPath)) {
      tools.push(...await this.indexSkills(skillsPath, pluginName));
    }

    const agentsPath = path.join(pluginPath, 'agents');
    if (fs.existsSync(agentsPath)) {
      tools.push(...await this.indexAgents(agentsPath, pluginName));
    }

    const commandsPath = path.join(pluginPath, 'commands');
    if (fs.existsSync(commandsPath)) {
      tools.push(...await this.indexCommands(commandsPath, pluginName));
    }

    return tools;
  }

  private async indexSkills(skillsPath: string, pluginName: string): Promise<IndexedTool[]> {
    const tools: IndexedTool[] = [];
    const entries = fs.readdirSync(skillsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillMdPath = path.join(skillsPath, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillMdPath)) continue;

      try {
        const content = fs.readFileSync(skillMdPath, 'utf-8');
        const metadata = this.parseYamlFrontmatter(content);
        const keywords = this.extractKeywords(metadata.description ?? '', entry.name);

        tools.push({
          id: `${pluginName}:skill:${entry.name}`,
          name: metadata.name ?? entry.name,
          type: 'skill',
          pluginName,
          description: metadata.description ?? 'No description',
          keywords,
          relativePath: skillMdPath,
          loaded: false,
          indexedAt: new Date().toISOString(),
          contentHash: this.generateContentHash(content),
          allowedTools: metadata['allowed-tools']?.split(',').map((t: string) => t.trim()),
        });
      } catch (error) {
        this.logger.warn(`Failed to index skill ${entry.name}: ${error}`);
      }
    }
    return tools;
  }

  private async indexAgents(agentsPath: string, pluginName: string): Promise<IndexedTool[]> {
    const tools: IndexedTool[] = [];
    const entries = fs.readdirSync(agentsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const agentMdPath = path.join(agentsPath, entry.name, 'AGENT.md');
      if (!fs.existsSync(agentMdPath)) continue;

      try {
        const content = fs.readFileSync(agentMdPath, 'utf-8');
        const metadata = this.parseYamlFrontmatter(content);
        const keywords = this.extractKeywords(metadata.description ?? '', entry.name);
        const capabilities = this.extractCapabilities(content);

        tools.push({
          id: `${pluginName}:agent:${entry.name}`,
          name: metadata.name ?? entry.name,
          type: 'agent',
          pluginName,
          description: metadata.description ?? 'No description',
          keywords,
          capabilities,
          relativePath: agentMdPath,
          loaded: false,
          indexedAt: new Date().toISOString(),
          contentHash: this.generateContentHash(content),
          modelPreference: metadata.model_preference ?? metadata.model,
        });
      } catch (error) {
        this.logger.warn(`Failed to index agent ${entry.name}: ${error}`);
      }
    }
    return tools;
  }

  private async indexCommands(commandsPath: string, pluginName: string): Promise<IndexedTool[]> {
    const tools: IndexedTool[] = [];
    const files = fs.readdirSync(commandsPath);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const commandPath = path.join(commandsPath, file);
      const commandName = path.basename(file, '.md');

      try {
        const content = fs.readFileSync(commandPath, 'utf-8');
        const metadata = this.parseYamlFrontmatter(content);
        const keywords = this.extractKeywords(metadata.description ?? '', commandName);

        tools.push({
          id: `${pluginName}:command:${commandName}`,
          name: metadata.name ?? commandName,
          type: 'command',
          pluginName,
          description: metadata.description ?? this.extractFirstParagraph(content),
          keywords,
          relativePath: commandPath,
          loaded: false,
          indexedAt: new Date().toISOString(),
          contentHash: this.generateContentHash(content),
        });
      } catch (error) {
        this.logger.warn(`Failed to index command ${commandName}: ${error}`);
      }
    }
    return tools;
  }

  private parseYamlFrontmatter(content: string): Record<string, any> {
    const match = content.match(/^---\n([\s\S]+?)\n---/);
    if (!match) return {};
    const yaml = match[1];
    const result: Record<string, any> = {};
    for (const line of yaml.split('\n')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    }
    return result;
  }

  private extractKeywords(description: string, name: string): string[] {
    const keywords = new Set<string>();

    for (const part of name.split('-')) {
      const lower = part.toLowerCase();
      if (lower.length >= 2 && !STOP_WORDS.has(lower)) keywords.add(lower);
    }

    const text = description.toLowerCase();
    const activatesMatch = text.match(/activates?\s*(?:for|on|when)[:\s]+([^.]+)/i);
    if (activatesMatch) {
      const triggers = activatesMatch[1].split(/[,;]/);
      for (const trigger of triggers) {
        for (const word of trigger.trim().split(/\s+/)) {
          const clean = word.replace(/[^a-z0-9-]/g, '');
          if (clean.length >= 2 && !STOP_WORDS.has(clean)) keywords.add(clean);
        }
      }
    }

    const words = text.split(/[\s,.:;!?()[\]{}'"]+/);
    for (const word of words) {
      const clean = word.replace(/[^a-z0-9-]/g, '');
      if (clean.length >= 3 && !STOP_WORDS.has(clean)) keywords.add(clean);
    }

    return Array.from(keywords);
  }

  private extractCapabilities(content: string): ToolCapability[] {
    const capabilities: ToolCapability[] = [];
    const match = content.match(/##\s*Capabilities\s*\n([\s\S]+?)(?=\n##|$)/i);
    if (!match) return capabilities;

    for (const line of match[1].split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const description = trimmed.slice(1).trim();
        if (description) {
          capabilities.push({ description, keywords: this.extractKeywords(description, '') });
        }
      }
    }
    return capabilities;
  }

  private extractFirstParagraph(content: string): string {
    const withoutFrontmatter = content.replace(/^---\n[\s\S]+?\n---\n?/, '');
    for (const line of withoutFrontmatter.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) return trimmed.slice(0, 200);
    }
    return 'No description';
  }

  private generateContentHash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex').slice(0, 12);
  }

  getIndexedTools(): IndexedTool[] {
    return this.indexedTools;
  }
}
