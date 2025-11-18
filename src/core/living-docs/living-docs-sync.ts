/**
 * Living Docs Sync - Simplified sync mechanism
 *
 * Syncs increment specs to living docs structure:
 * - .specweave/docs/internal/specs/_features/FS-XXX/FEATURE.md
 * - .specweave/docs/internal/specs/specweave/FS-XXX/README.md
 * - .specweave/docs/internal/specs/specweave/FS-XXX/us-*.md
 *
 * Uses FeatureIDManager for automatic feature ID assignment (greenfield vs brownfield)
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { FeatureIDManager } from './feature-id-manager.js';

export interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
}

export interface SyncResult {
  success: boolean;
  featureId: string;
  incrementId: string;
  filesCreated: string[];
  filesUpdated: string[];
  errors: string[];
}

export interface ParsedSpec {
  title: string;
  overview: string;
  status: string;
  priority: string;
  created: string;
  userStories: UserStoryData[];
  acceptanceCriteria: AcceptanceCriterionData[];
  frontmatter: Record<string, any>;
}

export interface UserStoryData {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  phase?: string;
}

export interface AcceptanceCriterionData {
  id: string;
  userStoryId: string;
  description: string;
  completed: boolean;
  priority?: string;
}

export class LivingDocsSync {
  private projectRoot: string;
  private featureIdManager: FeatureIDManager;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.featureIdManager = new FeatureIDManager(projectRoot);
  }

  /**
   * Sync an increment to living docs
   */
  async syncIncrement(incrementId: string, options: SyncOptions = {}): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      featureId: '',
      incrementId,
      filesCreated: [],
      filesUpdated: [],
      errors: []
    };

    try {
      // Step 1: Build feature registry (auto-generates IDs for greenfield)
      await this.featureIdManager.buildRegistry();

      // Step 2: Get/assign feature ID
      const featureId = await this.getFeatureIdForIncrement(incrementId);
      result.featureId = featureId;

      console.log(`📚 Syncing ${incrementId} → ${featureId}...`);

      // Step 3: Parse increment spec
      const parsed = await this.parseIncrementSpec(incrementId);

      // Step 4: Create living docs structure
      const basePath = path.join(this.projectRoot, '.specweave/docs/internal/specs');

      // Create _features/FS-XXX/FEATURE.md
      const featurePath = path.join(basePath, '_features', featureId);
      const featureFile = path.join(featurePath, 'FEATURE.md');

      if (!options.dryRun) {
        await fs.ensureDir(featurePath);
        const featureContent = this.generateFeatureFile(featureId, parsed, incrementId);
        await fs.writeFile(featureFile, featureContent, 'utf-8');
        result.filesCreated.push(featureFile);
      } else {
        result.filesCreated.push(featureFile + ' (dry-run)');
      }

      // Create specweave/FS-XXX/README.md
      const projectPath = path.join(basePath, 'specweave', featureId);
      const readmePath = path.join(projectPath, 'README.md');

      if (!options.dryRun) {
        await fs.ensureDir(projectPath);
        const readmeContent = this.generateReadmeFile(featureId, parsed, incrementId);
        await fs.writeFile(readmePath, readmeContent, 'utf-8');
        result.filesCreated.push(readmePath);
      } else {
        result.filesCreated.push(readmePath + ' (dry-run)');
      }

      // Create user story files
      for (const story of parsed.userStories) {
        const storySlug = story.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const storyFile = path.join(projectPath, `${story.id.toLowerCase()}-${storySlug}.md`);

        if (!options.dryRun) {
          const storyContent = this.generateUserStoryFile(story, featureId, incrementId, parsed);
          await fs.writeFile(storyFile, storyContent, 'utf-8');
          result.filesCreated.push(storyFile);
        } else {
          result.filesCreated.push(storyFile + ' (dry-run)');
        }
      }

      result.success = true;
      console.log(`✅ Synced ${incrementId} → ${featureId}`);
      console.log(`   Created: ${result.filesCreated.length} files`);

      return result;

    } catch (error) {
      result.errors.push(`Sync failed: ${error}`);
      console.error(`❌ Sync failed for ${incrementId}:`, error);
      return result;
    }
  }

  /**
   * Get feature ID for increment (auto-generates for greenfield)
   */
  private async getFeatureIdForIncrement(incrementId: string): Promise<string> {
    // Extract increment number (e.g., "0040-name" → 40)
    const match = incrementId.match(/^(\d{4})-/);
    if (!match) {
      throw new Error(`Invalid increment ID format: ${incrementId}`);
    }

    const num = parseInt(match[1], 10);

    // Check if increment has explicit feature ID
    const metadataPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      incrementId,
      'metadata.json'
    );

    if (await fs.pathExists(metadataPath)) {
      const metadata = await fs.readJson(metadataPath);
      if (metadata.feature) {
        return metadata.feature;
      }
    }

    // Auto-generate for greenfield: FS-040, FS-041, etc.
    return `FS-${String(num).padStart(3, '0')}`;
  }

  /**
   * Parse increment spec.md
   */
  private async parseIncrementSpec(incrementId: string): Promise<ParsedSpec> {
    const specPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      incrementId,
      'spec.md'
    );

    if (!await fs.pathExists(specPath)) {
      throw new Error(`Spec file not found: ${specPath}`);
    }

    const content = await fs.readFile(specPath, 'utf-8');

    // Extract frontmatter
    let frontmatter: Record<string, any> = {};
    let bodyContent = content;

    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      try {
        frontmatter = yaml.parse(frontmatterMatch[1]) || {};
        bodyContent = content.slice(frontmatterMatch[0].length).trim();
      } catch (error) {
        console.warn(`Failed to parse frontmatter for ${incrementId}`);
      }
    }

    // Extract title
    let title = frontmatter.title || '';
    if (!title) {
      const headingMatch = bodyContent.match(/^#\s+(.+)$/m);
      if (headingMatch) {
        title = headingMatch[1].replace(/^(SPEC-\d+:|Increment\s+\d+:)\s*/, '').trim();
      }
    }
    if (!title) {
      title = incrementId.replace(/^\d+-/, '').split('-').map(w =>
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');
    }

    // Extract overview
    let overview = '';
    const overviewMatch = bodyContent.match(/##\s+(?:Overview|Problem Statement|Quick Overview)\s*\n+([\s\S]*?)(?=\n##|\Z)/i);
    if (overviewMatch) {
      overview = overviewMatch[1].trim().split('\n\n')[0];
    }

    // Extract user stories
    const userStories = this.extractUserStories(bodyContent);

    // Extract acceptance criteria
    const acceptanceCriteria = this.extractAcceptanceCriteria(bodyContent);

    return {
      title,
      overview,
      status: frontmatter.status || 'planning',
      priority: frontmatter.priority || 'P1',
      created: frontmatter.created || new Date().toISOString().split('T')[0],
      userStories,
      acceptanceCriteria,
      frontmatter
    };
  }

  /**
   * Extract user stories from spec content
   */
  private extractUserStories(content: string): UserStoryData[] {
    const stories: UserStoryData[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const headingMatch = lines[i].match(/^###+\s+(US-\d+):\s+(.+)/);
      if (!headingMatch) continue;

      const id = headingMatch[1];
      const title = headingMatch[2];

      // Collect all lines until next US heading or end
      const storyLines: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].match(/^###+\s+US-\d+:/)) {
          break; // Found next US heading
        }
        storyLines.push(lines[j]);
      }

      const storyContent = storyLines.join('\n');

      // Extract description
      let description = '';
      const descMatch = storyContent.match(/\*\*As a\*\*\s*([^\n]+)\s*\n\*\*I want\*\*\s*([^\n]+)\s*\n\*\*So that\*\*\s*([^\n]+)/i);
      if (descMatch) {
        description = `**As a** ${descMatch[1].trim()}\n**I want** ${descMatch[2].trim()}\n**So that** ${descMatch[3].trim()}`;
      }

      // Extract acceptance criteria IDs
      const acIds: string[] = [];
      const acPattern = /AC-US\d+-\d+/g;
      let acMatch;
      while ((acMatch = acPattern.exec(storyContent)) !== null) {
        if (!acIds.includes(acMatch[0])) {
          acIds.push(acMatch[0]);
        }
      }

      stories.push({
        id,
        title,
        description,
        acceptanceCriteria: acIds
      });
    }

    return stories;
  }

  /**
   * Extract acceptance criteria from spec content
   */
  private extractAcceptanceCriteria(content: string): AcceptanceCriterionData[] {
    const criteria: AcceptanceCriterionData[] = [];

    // Pattern: - [x] AC-US1-01: Description
    const acPattern = /^[-*]\s+\[([ x])\]\s+(AC-US\d+-\d+):\s+(.+?)$/gm;

    let match;
    while ((match = acPattern.exec(content)) !== null) {
      const completed = match[1] === 'x';
      const id = match[2];
      const description = match[3];

      // Extract user story ID (AC-US1-01 → US-001)
      const usMatch = id.match(/AC-US(\d+)-\d+/);
      const userStoryId = usMatch ? `US-${usMatch[1].padStart(3, '0')}` : '';

      criteria.push({
        id,
        userStoryId,
        description,
        completed
      });
    }

    return criteria;
  }

  /**
   * Generate FEATURE.md content
   */
  private generateFeatureFile(
    featureId: string,
    parsed: ParsedSpec,
    incrementId: string
  ): string {
    const lines: string[] = [];

    // Frontmatter
    lines.push('---');
    lines.push(`id: ${featureId}`);
    lines.push(`title: "${parsed.title}"`);
    lines.push(`type: feature`);
    lines.push(`status: ${parsed.status}`);
    lines.push(`priority: ${parsed.priority}`);
    lines.push(`created: ${parsed.created}`);
    lines.push(`lastUpdated: ${new Date().toISOString().split('T')[0]}`);
    lines.push('---');
    lines.push('');

    // Title
    lines.push(`# ${parsed.title}`);
    lines.push('');

    // Overview
    if (parsed.overview) {
      lines.push('## Overview');
      lines.push('');
      lines.push(parsed.overview);
      lines.push('');
    }

    // Implementation History
    lines.push('## Implementation History');
    lines.push('');
    lines.push('| Increment | Status | Completion Date |');
    lines.push('|-----------|--------|----------------|');
    const statusEmoji = parsed.status === 'completed' ? '✅' : '⏳';
    lines.push(`| [${incrementId}](../../../../increments/${incrementId}/spec.md) | ${statusEmoji} ${parsed.status} | ${parsed.created} |`);
    lines.push('');

    // User Stories
    if (parsed.userStories.length > 0) {
      lines.push('## User Stories');
      lines.push('');
      for (const story of parsed.userStories) {
        const storySlug = story.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const storyFile = `../../specweave/${featureId}/${story.id.toLowerCase()}-${storySlug}.md`;
        lines.push(`- [${story.id}: ${story.title}](${storyFile})`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate README.md content
   */
  private generateReadmeFile(
    featureId: string,
    parsed: ParsedSpec,
    incrementId: string
  ): string {
    const lines: string[] = [];

    lines.push('---');
    lines.push(`id: ${featureId}-specweave`);
    lines.push(`title: "${parsed.title} - SpecWeave Implementation"`);
    lines.push(`feature: ${featureId}`);
    lines.push(`project: specweave`);
    lines.push(`type: feature-context`);
    lines.push(`status: ${parsed.status}`);
    lines.push('---');
    lines.push('');

    lines.push(`# ${parsed.title}`);
    lines.push('');
    lines.push(`**Feature**: [${featureId}](../../_features/${featureId}/FEATURE.md)`);
    lines.push('');

    if (parsed.overview) {
      lines.push('## Overview');
      lines.push('');
      lines.push(parsed.overview);
      lines.push('');
    }

    lines.push('## User Stories');
    lines.push('');
    lines.push('See user story files in this directory.');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate user story file content
   */
  private generateUserStoryFile(
    story: UserStoryData,
    featureId: string,
    incrementId: string,
    parsed: ParsedSpec
  ): string {
    const lines: string[] = [];

    // Frontmatter
    lines.push('---');
    lines.push(`id: ${story.id}`);
    lines.push(`feature: ${featureId}`);
    lines.push(`title: "${story.title}"`);
    lines.push(`status: ${parsed.status}`);
    lines.push(`priority: ${parsed.priority}`);
    lines.push(`created: ${parsed.created}`);
    lines.push('---');
    lines.push('');

    // Title
    lines.push(`# ${story.id}: ${story.title}`);
    lines.push('');

    // Feature link
    lines.push(`**Feature**: [${featureId}](../../_features/${featureId}/FEATURE.md)`);
    lines.push('');

    // Description
    if (story.description) {
      lines.push(story.description);
      lines.push('');
    }

    lines.push('---');
    lines.push('');

    // Acceptance Criteria
    lines.push('## Acceptance Criteria');
    lines.push('');

    const storyCriteria = parsed.acceptanceCriteria.filter(
      ac => ac.userStoryId === story.id
    );

    if (storyCriteria.length > 0) {
      for (const ac of storyCriteria) {
        const checkbox = ac.completed ? '[x]' : '[ ]';
        lines.push(`- ${checkbox} **${ac.id}**: ${ac.description}`);
      }
    } else {
      lines.push('No acceptance criteria defined.');
    }
    lines.push('');

    lines.push('---');
    lines.push('');

    // Implementation
    lines.push('## Implementation');
    lines.push('');
    lines.push(`**Increment**: [${incrementId}](../../../../increments/${incrementId}/spec.md)`);
    lines.push('');
    lines.push('**Tasks**: See increment tasks.md for implementation details.');
    lines.push('');

    return lines.join('\n');
  }
}
