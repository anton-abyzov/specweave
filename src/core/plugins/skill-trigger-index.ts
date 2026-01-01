/**
 * Skill Trigger Index Manager
 *
 * Manages the skill triggers index file used for automatic skill activation.
 *
 * @module core/plugins/skill-trigger-index
 * @version 1.0.0
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { SkillTriggerExtractor, SkillTriggersIndex } from './skill-trigger-extractor.js';

/**
 * Default path for the skill triggers index
 */
const DEFAULT_INDEX_PATH = '.specweave/state/skill-triggers-index.json';

/**
 * Default plugins directory
 */
const DEFAULT_PLUGINS_DIR = 'plugins';

/**
 * SkillTriggerIndexManager - Generate and manage skill triggers index
 */
export class SkillTriggerIndexManager {
  private extractor: SkillTriggerExtractor;
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.extractor = new SkillTriggerExtractor();
    this.projectRoot = projectRoot;
  }

  /**
   * Generate the skill triggers index from all plugins
   *
   * @param pluginsDir - Path to plugins directory (relative or absolute)
   * @returns Generated index
   */
  async generateIndex(pluginsDir?: string): Promise<SkillTriggersIndex> {
    const resolvedPluginsDir = pluginsDir
      ? path.isAbsolute(pluginsDir) ? pluginsDir : path.join(this.projectRoot, pluginsDir)
      : path.join(this.projectRoot, DEFAULT_PLUGINS_DIR);

    // Scan all plugins
    const triggers = await this.extractor.scanAllPlugins(resolvedPluginsDir);

    // Build index
    const index = this.extractor.buildIndex(triggers);

    return index;
  }

  /**
   * Save index to file
   *
   * @param index - Skill triggers index
   * @param indexPath - Path to save index (relative or absolute)
   */
  async saveIndex(index: SkillTriggersIndex, indexPath?: string): Promise<string> {
    const resolvedPath = indexPath
      ? path.isAbsolute(indexPath) ? indexPath : path.join(this.projectRoot, indexPath)
      : path.join(this.projectRoot, DEFAULT_INDEX_PATH);

    // Ensure directory exists
    await fs.ensureDir(path.dirname(resolvedPath));

    // Write index
    await fs.writeJSON(resolvedPath, index, { spaces: 2 });

    return resolvedPath;
  }

  /**
   * Load index from file
   *
   * @param indexPath - Path to index file (relative or absolute)
   * @returns Loaded index or null if not found
   */
  async loadIndex(indexPath?: string): Promise<SkillTriggersIndex | null> {
    const resolvedPath = indexPath
      ? path.isAbsolute(indexPath) ? indexPath : path.join(this.projectRoot, indexPath)
      : path.join(this.projectRoot, DEFAULT_INDEX_PATH);

    if (!(await fs.pathExists(resolvedPath))) {
      return null;
    }

    try {
      return await fs.readJSON(resolvedPath) as SkillTriggersIndex;
    } catch {
      return null;
    }
  }

  /**
   * Generate and save index (convenience method)
   *
   * @param pluginsDir - Path to plugins directory
   * @param indexPath - Path to save index
   * @returns Generated index and path
   */
  async generateAndSave(
    pluginsDir?: string,
    indexPath?: string
  ): Promise<{ index: SkillTriggersIndex; path: string }> {
    const index = await this.generateIndex(pluginsDir);
    const savedPath = await this.saveIndex(index, indexPath);
    return { index, path: savedPath };
  }

  /**
   * Match a user prompt against the index
   *
   * @param prompt - User prompt
   * @param index - Optional pre-loaded index
   * @returns Matched skills with scores
   */
  async matchPrompt(
    prompt: string,
    index?: SkillTriggersIndex
  ): Promise<Array<{ fqn: string; score: number; matchedKeywords: string[] }>> {
    const loadedIndex = index || await this.loadIndex();

    if (!loadedIndex) {
      return [];
    }

    return this.extractor.matchPrompt(prompt, loadedIndex);
  }

  /**
   * Check if index needs regeneration
   *
   * @param maxAgeMs - Maximum age in milliseconds (default: 24 hours)
   * @returns True if index needs regeneration
   */
  async needsRegeneration(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<boolean> {
    const index = await this.loadIndex();

    if (!index) {
      return true;
    }

    const generatedAt = new Date(index.generatedAt).getTime();
    const now = Date.now();

    return (now - generatedAt) > maxAgeMs;
  }

  /**
   * Get index statistics
   *
   * @returns Index stats or null if not found
   */
  async getStats(): Promise<{
    skillCount: number;
    keywordCount: number;
    generatedAt: string;
    topKeywords: Array<{ keyword: string; skillCount: number }>;
  } | null> {
    const index = await this.loadIndex();

    if (!index) {
      return null;
    }

    // Get top 20 keywords by skill count
    const keywordCounts = Object.entries(index.keywords)
      .map(([keyword, skills]) => ({ keyword, skillCount: skills.length }))
      .sort((a, b) => b.skillCount - a.skillCount)
      .slice(0, 20);

    return {
      skillCount: index.skillCount,
      keywordCount: index.keywordCount,
      generatedAt: index.generatedAt,
      topKeywords: keywordCounts
    };
  }
}

/**
 * CLI helper to generate index
 */
export async function generateSkillTriggersIndexCLI(
  projectRoot: string = process.cwd(),
  pluginsDir?: string,
  indexPath?: string,
  verbose: boolean = false
): Promise<void> {
  const manager = new SkillTriggerIndexManager(projectRoot);

  if (verbose) {
    console.log('🔍 Scanning plugins for skill triggers...');
  }

  const { index, path: savedPath } = await manager.generateAndSave(pluginsDir, indexPath);

  if (verbose) {
    console.log(`✅ Generated skill triggers index:`);
    console.log(`   Skills: ${index.skillCount}`);
    console.log(`   Keywords: ${index.keywordCount}`);
    console.log(`   Path: ${savedPath}`);

    // Show top keywords
    const stats = await manager.getStats();
    if (stats && stats.topKeywords.length > 0) {
      console.log('\n📊 Top keywords:');
      for (const { keyword, skillCount } of stats.topKeywords.slice(0, 10)) {
        console.log(`   ${keyword}: ${skillCount} skills`);
      }
    }
  }
}

/**
 * CLI helper to test prompt matching
 */
export async function testPromptMatchingCLI(
  prompt: string,
  projectRoot: string = process.cwd(),
  verbose: boolean = false
): Promise<void> {
  const manager = new SkillTriggerIndexManager(projectRoot);

  const index = await manager.loadIndex();
  if (!index) {
    console.error('❌ No skill triggers index found. Run refresh-marketplace.sh first.');
    process.exit(1);
  }

  const matches = await manager.matchPrompt(prompt, index);

  if (matches.length === 0) {
    console.log('❌ No skills matched for prompt:', prompt);
    return;
  }

  console.log(`✅ Matched ${matches.length} skills for prompt:`);
  console.log(`   "${prompt}"\n`);

  for (const match of matches.slice(0, 10)) {
    const skill = index.skills[match.fqn];
    console.log(`   📦 ${match.fqn}`);
    console.log(`      Score: ${match.score}`);
    console.log(`      Keywords: ${match.matchedKeywords.join(', ')}`);
    if (verbose && skill) {
      console.log(`      Description: ${skill.description}`);
    }
    console.log();
  }
}
