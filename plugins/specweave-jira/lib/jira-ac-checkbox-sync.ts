/**
 * JIRA AC Checkbox Sync
 *
 * Mirrors github-ac-checkbox-sync.ts — updates native JIRA taskItem checkbox
 * states when ACs are marked complete in spec.md.
 *
 * Strategy: fetch current ADF description from JIRA → walk taskItem nodes →
 * update state (TODO/DONE) based on current spec.md AC status → PUT back.
 * This preserves any manual edits made directly in JIRA.
 *
 * No comments are posted — only the description checkboxes are updated.
 */

import { promises as fs, existsSync } from 'fs';
import path from 'path';
import yaml from 'yaml';
import axios, { AxiosInstance } from 'axios';
import { Logger, consoleLogger } from '../../../src/utils/logger.js';
import { autoDetectProjectIdSync } from '../../../src/utils/project-detection.js';
import { deriveFeatureId } from '../../../src/utils/feature-id-derivation.js';
import { detectDeploymentType, getApiBaseUrl } from './jira-deployment-detector.js';
import type { SpecWeaveConfig } from '../../../src/core/config/types.js';
import type { LivingDocsUSFile } from '../../../src/types/living-docs-us-file.js';
import { GitHubACCheckboxSync } from '../../specweave-github/lib/github-ac-checkbox-sync.js';

export interface JiraACCheckboxSyncResult {
  success: boolean;
  updated: number;
  issues: string[];
}

export class JiraACCheckboxSync {
  private projectRoot: string;
  private incrementId: string;
  private projectId: string;
  private logger: Logger;

  constructor(options: {
    projectRoot: string;
    incrementId: string;
    logger?: Logger;
  }) {
    this.projectRoot = options.projectRoot;
    this.incrementId = options.incrementId;
    this.logger = options.logger ?? consoleLogger;
    this.projectId = autoDetectProjectIdSync(this.projectRoot) || 'default';
  }

  async syncACCheckboxesToJira(config: SpecWeaveConfig): Promise<JiraACCheckboxSyncResult> {
    const result: JiraACCheckboxSyncResult = { success: true, updated: 0, issues: [] };

    try {
      // Resolve JIRA credentials from config or environment
      const jiraConfig = this.resolveJiraConfig(config);
      if (!jiraConfig) {
        this.logger.log('ℹ️  JIRA sync not configured — skipping AC checkbox sync');
        return result;
      }

      const client = this.buildClient(jiraConfig);

      // Load spec.md AC status
      const specPath = path.join(
        this.projectRoot,
        '.specweave/increments',
        this.incrementId,
        'spec.md'
      );

      if (!existsSync(specPath)) {
        this.logger.log('⚠️  spec.md not found');
        return result;
      }

      const specContent = await fs.readFile(specPath, 'utf-8');
      const acStatus = GitHubACCheckboxSync.parseACStatusFromSpec(specContent);

      if (acStatus.size === 0) {
        this.logger.log('ℹ️  No ACs found in spec.md');
        return result;
      }

      this.logger.log(`\n📊 Syncing AC checkboxes to JIRA (${acStatus.size} ACs found)...`);

      // Load user stories with JIRA keys
      const userStories = await this.loadUserStoriesForIncrement();
      if (userStories.length === 0) {
        this.logger.log('ℹ️  No user stories found for increment');
        return result;
      }

      for (const usFile of userStories) {
        const jiraInfo = usFile.external_tools?.jira as Record<string, any> | undefined;
        const storyKey = jiraInfo?.key;

        if (!storyKey) {
          this.logger.log(`   ⏭️  ${usFile.id} — no JIRA story key linked`);
          continue;
        }

        // Filter ACs belonging to this user story
        const acPrefix = GitHubACCheckboxSync.buildACPrefix(usFile.id);
        const usAcStatus = new Map<string, boolean>();
        for (const [acId, completed] of acStatus) {
          if (acId.startsWith(acPrefix)) {
            usAcStatus.set(acId, completed);
          }
        }

        if (usAcStatus.size === 0) {
          this.logger.log(`   ⏭️  ${usFile.id} — no matching ACs`);
          continue;
        }

        try {
          const updated = await this.updateStoryCheckboxes(
            client,
            jiraConfig.domain,
            storyKey,
            usAcStatus
          );

          if (updated > 0) {
            result.updated += updated;
            result.issues.push(storyKey);
            this.logger.log(`   ✅ ${usFile.id} ${storyKey} — updated ${updated} checkbox(es)`);
          } else {
            this.logger.log(`   ⏭️  ${usFile.id} ${storyKey} — no changes needed`);
          }
        } catch (err) {
          this.logger.log(`   ⚠️  ${usFile.id} ${storyKey} — update failed: ${err}`);
          result.success = false;
        }
      }

      this.logger.log(`\n📊 JIRA AC Sync: updated ${result.updated} checkbox(es) in ${result.issues.length} story/stories`);
      return result;

    } catch (error) {
      this.logger.error('❌ JIRA AC checkbox sync failed:', error);
      result.success = false;
      return result;
    }
  }

  /**
   * Fetch the current ADF description from JIRA, walk taskItem nodes,
   * update state based on acStatus map, then PUT back.
   */
  private async updateStoryCheckboxes(
    client: AxiosInstance,
    domain: string,
    storyKey: string,
    acStatus: Map<string, boolean>
  ): Promise<number> {
    const resp = await client.get(
      `/issue/${storyKey}?fields=description`,
      { headers: { Accept: 'application/json' } }
    );

    const description = resp.data?.fields?.description;
    if (!description || typeof description !== 'object') {
      return 0;
    }

    let updated = 0;
    this.walkAdf(description, (node: any) => {
      if (node.type !== 'taskItem') return;
      const text = this.extractText(node);
      for (const [acId, completed] of acStatus) {
        if (text.includes(acId)) {
          const newState = completed ? 'DONE' : 'TODO';
          if (node.attrs?.state !== newState) {
            node.attrs = { ...node.attrs, state: newState };
            updated++;
          }
          break;
        }
      }
    });

    if (updated > 0) {
      await client.put(`/issue/${storyKey}`, {
        fields: { description }
      });
    }

    return updated;
  }

  /** Recursively walk ADF nodes calling visitor for each */
  private walkAdf(node: any, visitor: (node: any) => void): void {
    visitor(node);
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        this.walkAdf(child, visitor);
      }
    }
  }

  /** Extract plain text from an ADF node (concat all text leaves) */
  private extractText(node: any): string {
    if (node.type === 'text') return node.text ?? '';
    if (!Array.isArray(node.content)) return '';
    return node.content.map((c: any) => this.extractText(c)).join('');
  }

  private buildClient(jiraConfig: { domain: string; email: string; apiToken: string }): AxiosInstance {
    const token = Buffer.from(`${jiraConfig.email}:${jiraConfig.apiToken}`).toString('base64');
    return axios.create({
      baseURL: getApiBaseUrl(jiraConfig.domain),
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private resolveJiraConfig(
    config: SpecWeaveConfig
  ): { domain: string; email: string; apiToken: string } | null {
    // Try sync.profiles with provider=jira
    const profiles = (config.sync as any)?.profiles;
    if (profiles) {
      for (const profile of Object.values(profiles) as any[]) {
        if (profile?.provider === 'jira' && profile?.domain) {
          const email = profile.email || process.env.JIRA_EMAIL || '';
          const apiToken = profile.apiToken || profile.token || process.env.JIRA_API_TOKEN || '';
          if (email && apiToken) {
            return { domain: profile.domain, email, apiToken };
          }
        }
      }
    }

    // Try sync.jira
    const jira = (config.sync as any)?.jira;
    if (jira?.domain) {
      const email = jira.email || process.env.JIRA_EMAIL || '';
      const apiToken = jira.apiToken || jira.token || process.env.JIRA_API_TOKEN || '';
      if (email && apiToken) {
        return { domain: jira.domain, email, apiToken };
      }
    }

    // Fallback: env vars only (derive domain from JIRA_BASE_URL)
    const email = process.env.JIRA_EMAIL || '';
    const apiToken = process.env.JIRA_API_TOKEN || '';
    const baseUrl = process.env.JIRA_BASE_URL || '';
    if (email && apiToken && baseUrl) {
      const domain = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      return { domain, email, apiToken };
    }

    return null;
  }

  /**
   * Load user stories from living docs for the increment.
   * Reuses the same logic as GitHubACCheckboxSync.
   */
  private async loadUserStoriesForIncrement(): Promise<LivingDocsUSFile[]> {
    const specFile = path.join(
      this.projectRoot,
      '.specweave/increments',
      this.incrementId,
      'spec.md'
    );

    if (!existsSync(specFile)) return [];

    const content = await fs.readFile(specFile, 'utf-8');

    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return [];

    const frontmatter = yaml.parse(frontmatterMatch[1]);
    let featureId = frontmatter.feature_id || frontmatter.epic || frontmatter.feature;

    if (!featureId) {
      const metadataFile = path.join(
        this.projectRoot,
        '.specweave/increments',
        this.incrementId,
        'metadata.json'
      );
      if (existsSync(metadataFile)) {
        try {
          const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf-8'));
          featureId = metadata.feature_id || metadata.epic_id;
        } catch { /* ignore */ }
      }
    }

    if (!featureId) {
      try { featureId = deriveFeatureId(this.incrementId); } catch { return []; }
    }

    const specsRoot = path.join(this.projectRoot, '.specweave/docs/internal/specs');
    const usFiles: LivingDocsUSFile[] = [];

    const projectDirs: string[] = [];
    const primaryPath = path.join(specsRoot, this.projectId, featureId);
    if (existsSync(primaryPath)) projectDirs.push(primaryPath);

    if (existsSync(specsRoot)) {
      try {
        const allProjects = await fs.readdir(specsRoot);
        for (const proj of allProjects) {
          if (proj === this.projectId) continue;
          const p = path.join(specsRoot, proj, featureId);
          if (existsSync(p)) projectDirs.push(p);
        }
      } catch { /* ignore */ }
    }

    for (const featurePath of projectDirs) {
      const files = await fs.readdir(featurePath);
      for (const file of files) {
        if (!file.startsWith('us-') || !file.endsWith('.md')) continue;
        const fileContent = await fs.readFile(path.join(featurePath, file), 'utf-8');
        const match = fileContent.match(/^---\n([\s\S]*?)\n---/);
        if (match) {
          const fm = yaml.parse(match[1]);
          const externalTools = fm.external_tools || fm.external;
          usFiles.push({
            id: fm.id,
            title: fm.title,
            format_preservation: fm.format_preservation,
            external_title: fm.external_title,
            external_source: fm.external_source,
            external_id: fm.external_id,
            external_url: fm.external_url,
            imported_at: fm.imported_at,
            origin: fm.origin,
            external_tools: externalTools,
          });
        }
      }
    }

    return usFiles;
  }
}
