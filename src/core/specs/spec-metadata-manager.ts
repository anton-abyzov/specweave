/**
 * Spec Metadata Manager
 *
 * Manages spec.md files in .specweave/docs/internal/specs/{project-id}/
 *
 * CRITICAL ARCHITECTURE:
 * - Specs are the SOURCE OF TRUTH for features
 * - Specs are PERMANENT (never deleted)
 * - External tools (GitHub/Jira/ADO) sync to specs, NOT increments
 * - Uses FLATTENED structure (v0.16.11+): specs/{project-id}/ not projects/{project-id}/specs/
 *
 * @module spec-metadata-manager
 */

import * as fs from '../../utils/fs-native.js';
import path from 'path';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import {
  SpecMetadata,
  SpecContent,
  UserStory,
  AcceptanceCriteria,
  IncrementReference,
  SpecValidationResult
} from '../types/spec-metadata.js';
import { ProjectManager } from '../project/project-manager.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

export class SpecMetadataManager {
  private specsDir: string;
  private projectManager: ProjectManager;
  private logger: Logger;

  constructor(projectRoot: string = process.cwd(), projectId?: string, options: { logger?: Logger } = {}) {
    this.logger = options.logger ?? consoleLogger;
    this.projectManager = new ProjectManager(projectRoot);

    // Use flattened structure via ProjectManager
    this.specsDir = this.projectManager.getSpecsPath(projectId);

    // Ensure directory exists
    fs.ensureDirSync(this.specsDir);
  }

  /**
   * Get all spec files
   */
  async getAllSpecs(): Promise<string[]> {
    if (!fs.existsSync(this.specsDir)) {
      return [];
    }

    const files = await fs.readdir(this.specsDir);
    return files.filter(f => f.startsWith('spec-') && f.endsWith('.md'));
  }

  /**
   * Load spec metadata and content
   */
  async loadSpec(specId: string): Promise<SpecContent | null> {
    const filePath = this.getSpecPath(specId);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const parsed = matter(fileContent);

      const metadata = parsed.data as SpecMetadata;
      metadata.id = specId;

      // Parse user stories from markdown content
      const userStories = this.parseUserStories(parsed.content);

      // Parse increments from markdown content
      const increments = this.parseIncrements(parsed.content);

      return {
        metadata: {
          ...metadata,
          userStories,
          increments,
          progress: this.calculateProgress(userStories)
        },
        markdown: parsed.content,
        filePath
      };
    } catch (error) {
      this.logger.error(`Error loading spec ${specId}:`, error);
      return null;
    }
  }

  /**
   * Save spec metadata (update frontmatter)
   */
  async saveMetadata(specId: string, metadata: Partial<SpecMetadata>): Promise<void> {
    const filePath = this.getSpecPath(specId);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Spec ${specId} not found`);
    }

    const fileContent = await fs.readFile(filePath, 'utf-8');
    const parsed = matter(fileContent);

    // Merge metadata
    const updatedMetadata = {
      ...parsed.data,
      ...metadata,
      updated: new Date().toISOString().split('T')[0]
    };

    // Don't save calculated fields
    delete (updatedMetadata as any).userStories;
    delete (updatedMetadata as any).increments;
    delete (updatedMetadata as any).progress;

    // Reconstruct file with updated frontmatter
    const newContent = matter.stringify(parsed.content, updatedMetadata);

    await fs.writeFile(filePath, newContent, 'utf-8');
  }

  /**
   * Link spec to external tool
   */
  async linkToExternal(
    specId: string,
    provider: 'github' | 'jira' | 'ado',
    externalData: { id: string | number; url: string; [key: string]: any }
  ): Promise<void> {
    const spec = await this.loadSpec(specId);
    if (!spec) {
      throw new Error(`Spec ${specId} not found`);
    }

    const externalLinks = spec.metadata.externalLinks || {};
    const syncedAt = new Date().toISOString();

    switch (provider) {
      case 'github':
        externalLinks.github = {
          projectId: externalData.id as number,
          projectUrl: externalData.url,
          syncedAt,
          owner: externalData.owner,
          repo: externalData.repo
        };
        break;
      case 'jira':
        externalLinks.jira = {
          epicKey: externalData.id as string,
          epicUrl: externalData.url,
          syncedAt,
          projectKey: externalData.projectKey,
          domain: externalData.domain
        };
        break;
      case 'ado':
        externalLinks.ado = {
          featureId: externalData.id as number,
          featureUrl: externalData.url,
          syncedAt,
          organization: externalData.organization,
          project: externalData.project
        };
        break;
    }

    await this.saveMetadata(specId, { externalLinks });
  }

  /**
   * Unlink spec from external tool
   */
  async unlinkFromExternal(
    specId: string,
    provider: 'github' | 'jira' | 'ado'
  ): Promise<void> {
    const spec = await this.loadSpec(specId);
    if (!spec) {
      throw new Error(`Spec ${specId} not found`);
    }

    const externalLinks = spec.metadata.externalLinks || {};
    delete externalLinks[provider];

    await this.saveMetadata(specId, { externalLinks });
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(
    specId: string,
    provider: 'github' | 'jira' | 'ado',
    status: 'synced' | 'out-of-sync' | 'error',
    error?: string
  ): Promise<void> {
    const spec = await this.loadSpec(specId);
    if (!spec) {
      throw new Error(`Spec ${specId} not found`);
    }

    const externalLinks = spec.metadata.externalLinks || {};

    if (externalLinks[provider]) {
      externalLinks[provider]!.syncedAt = new Date().toISOString();
      // Note: syncStatus and lastError are not in the interface yet, would need to add
    }

    await this.saveMetadata(specId, { externalLinks });
  }

  /**
   * Validate spec structure
   */
  async validateSpec(specId: string): Promise<SpecValidationResult> {
    const spec = await this.loadSpec(specId);

    if (!spec) {
      return {
        valid: false,
        errors: [`Spec ${specId} not found`],
        warnings: [],
        specId
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Required metadata fields
    if (!spec.metadata.title) {
      errors.push('Missing required field: title');
    }
    if (!spec.metadata.status) {
      errors.push('Missing required field: status');
    }
    if (!spec.metadata.priority) {
      errors.push('Missing required field: priority');
    }

    // Validate user stories
    if (!spec.metadata.userStories || spec.metadata.userStories.length === 0) {
      warnings.push('No user stories found in spec');
    }

    // Validate frontmatter format
    if (!spec.markdown.includes('## Overview') && !spec.markdown.includes('## User Stories')) {
      warnings.push('Missing standard sections (Overview, User Stories)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      specId
    };
  }

  /**
   * Get spec file path
   */
  private getSpecPath(specId: string): string {
    // Handle both formats: "spec-001" and "001"
    const normalizedId = specId.startsWith('spec-') ? specId : `spec-${specId}`;
    return path.join(this.specsDir, `${normalizedId}.md`);
  }

  /**
   * Parse user stories from markdown content
   */
  private parseUserStories(markdown: string): UserStory[] {
    const usPattern = /\*\*US-(\d+)\*\*:\s*(.+?)(?=\n|$)/g;

    return [...markdown.matchAll(usPattern)].map(match => {
      const usNumber = match[1];
      const acceptanceCriteria = this.parseAcceptanceCriteriaForUS(markdown, usNumber);

      return {
        id: `US-${usNumber}`,
        title: match[2].trim(),
        status: this.determineStatusFromAC(acceptanceCriteria),
        priority: 'P1' as const,
        acceptanceCriteria
      };
    });
  }

  /**
   * Parse acceptance criteria for a specific user story
   */
  private parseAcceptanceCriteriaForUS(markdown: string, usNumber: string): AcceptanceCriteria[] {
    const acPattern = new RegExp(
      `- \\[([x ])\\] \\*\\*AC-${usNumber}-(\\d+)\\*\\*:\\s*(.+?)(?=\\n|$)`,
      'g'
    );

    return [...markdown.matchAll(acPattern)].map(acMatch => ({
      id: `AC-${usNumber}-${acMatch[2]}`,
      description: acMatch[3].trim(),
      status: acMatch[1] === 'x' ? 'done' : 'todo' as 'done' | 'todo'
    }));
  }

  /**
   * Determine user story status based on AC completion
   */
  private determineStatusFromAC(acceptanceCriteria: AcceptanceCriteria[]): 'todo' | 'in-progress' | 'done' {
    if (acceptanceCriteria.length === 0) return 'todo';

    const completed = acceptanceCriteria.filter(ac => ac.status === 'done').length;
    if (completed === acceptanceCriteria.length) return 'done';
    if (completed > 0) return 'in-progress';
    return 'todo';
  }

  /**
   * Parse increment references from markdown content
   */
  private parseIncrements(markdown: string): IncrementReference[] {
    const incPattern = /\|\s*\*\*(\d{4}-[\w-]+)\*\*\s*\|\s*([✅❌⏳])?\s*(\w+)\s*\|\s*([0-9-]+)?\s*\|/g;

    return [...markdown.matchAll(incPattern)].map(match => ({
      id: match[1],
      status: this.parseIncrementStatus(match[2], match[3]),
      completedAt: match[4] || undefined,
      userStories: [] as string[]
    }));
  }

  /**
   * Parse increment status from icon and text
   */
  private parseIncrementStatus(
    icon: string | undefined,
    text: string
  ): 'planned' | 'in-progress' | 'complete' | 'abandoned' {
    const statusText = text.toLowerCase();
    if (statusText.includes('complete') || icon === '✅') return 'complete';
    if (statusText.includes('progress') || icon === '⏳') return 'in-progress';
    if (statusText.includes('abandon') || icon === '❌') return 'abandoned';
    return 'planned';
  }

  /**
   * Calculate progress from user stories
   */
  private calculateProgress(userStories: UserStory[]) {
    const total = userStories?.length ?? 0;
    if (total === 0) {
      return { totalUserStories: 0, completedUserStories: 0, percentComplete: 0 };
    }

    const completedUserStories = userStories.filter(us => us.status === 'done').length;
    return {
      totalUserStories: total,
      completedUserStories,
      percentComplete: Math.round((completedUserStories / total) * 100)
    };
  }

  /**
   * Create a new spec (template)
   */
  async createSpec(specId: string, title: string, priority: 'P0' | 'P1' | 'P2' | 'P3' = 'P1'): Promise<string> {
    const filePath = this.getSpecPath(specId);

    if (fs.existsSync(filePath)) {
      throw new Error(`Spec ${specId} already exists`);
    }

    const template = `---
id: ${specId}
title: "${title}"
status: draft
priority: ${priority}
created: ${new Date().toISOString().split('T')[0]}
---

# ${specId.toUpperCase()}: ${title}

**Feature Area**: [Feature Category]
**Status**: Draft
**Priority**: ${priority}

---

## Overview

[High-level description of the feature area]

---

## Increments (Implementation History)

| Increment | Status | Completion | Notes |
|-----------|--------|------------|-------|
| **0001-example** | ⏳ Planned | - | Description |

**Overall Progress**: 0/1 increments complete (0%)

---

## User Stories & Acceptance Criteria

### Epic 1: [Epic Name]

**US-001**: As a [user type], I want [goal] so that [benefit]
- [ ] **AC-001-01**: [Acceptance criteria description]
- [ ] **AC-001-02**: [Acceptance criteria description]

---

## External References

- GitHub Project: TBD
- Jira Epic: TBD
- ADO Feature: TBD
`;

    await fs.writeFile(filePath, template, 'utf-8');
    return filePath;
  }
}
