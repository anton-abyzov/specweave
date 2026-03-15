/**
 * ADO AC Checkbox Sync
 *
 * When ACs are marked complete in spec.md, updates the HTML description
 * of the linked ADO work item (☐ → ☑) and posts a progress comment.
 *
 * Mirrors jira-ac-checkbox-sync.ts pattern for ADO.
 * The ADO description is HTML — we use regex to flip ☐/☑ by AC ID.
 */

import { promises as fs, existsSync } from 'fs';
import path from 'path';
import yaml from 'yaml';
import axios, { AxiosInstance } from 'axios';
import { Logger, consoleLogger } from '../../specweave/lib/vendor/utils/logger.js';
import { deriveFeatureId } from '../../specweave/lib/vendor/utils/feature-id-derivation.js';
import { GitHubACCheckboxSync } from '../../specweave-github/lib/github-ac-checkbox-sync.js';
import type { SpecWeaveConfig } from '../../../src/core/config/types.js';
import type { LivingDocsUSFile } from '../../../src/types/living-docs-us-file.js';

export interface AdoACCheckboxSyncResult {
  success: boolean;
  updated: number;
  issues: number[];
}

export class AdoACCheckboxSync {
  private projectRoot: string;
  private incrementId: string;
  private logger: Logger;

  constructor(options: {
    projectRoot: string;
    incrementId: string;
    logger?: Logger;
  }) {
    this.projectRoot = options.projectRoot;
    this.incrementId = options.incrementId;
    this.logger = options.logger ?? consoleLogger;
  }

  async syncACCheckboxesToAdo(config: SpecWeaveConfig): Promise<AdoACCheckboxSyncResult> {
    const result: AdoACCheckboxSyncResult = { success: true, updated: 0, issues: [] };

    try {
      const adoConfig = this.resolveAdoConfig(config);
      if (!adoConfig) {
        this.logger.log('ℹ️  ADO sync not configured — skipping AC checkbox sync');
        return result;
      }

      const client = this.buildClient(adoConfig);

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

      this.logger.log(`\n📊 Syncing AC checkboxes to ADO (${acStatus.size} ACs found)...`);

      const userStories = await this.loadUserStoriesForIncrement();
      if (userStories.length === 0) {
        this.logger.log('ℹ️  No user stories found for increment');
        return result;
      }

      for (const usFile of userStories) {
        const adoInfo = usFile.external_tools?.ado as Record<string, any> | undefined;
        const storyId = adoInfo?.id ?? adoInfo?.workItemId;

        if (!storyId) {
          this.logger.log(`   ⏭️  ${usFile.id} — no ADO work item ID linked`);
          continue;
        }

        const acPrefix = GitHubACCheckboxSync.buildACPrefix(usFile.id);
        const usAcStatus = new Map<string, boolean>();
        for (const [acId, completed] of acStatus) {
          if (acId.startsWith(acPrefix)) usAcStatus.set(acId, completed);
        }

        if (usAcStatus.size === 0) {
          this.logger.log(`   ⏭️  ${usFile.id} — no matching ACs`);
          continue;
        }

        try {
          const updated = await this.updateStoryCheckboxes(
            client,
            adoConfig,
            Number(storyId),
            usAcStatus
          );

          if (updated > 0) {
            result.updated += updated;
            result.issues.push(Number(storyId));
            this.logger.log(`   ✅ ${usFile.id} #${storyId} — updated ${updated} checkbox(es) + posted comment`);
          } else {
            this.logger.log(`   ⏭️  ${usFile.id} #${storyId} — no changes needed`);
          }
        } catch (err) {
          this.logger.log(`   ⚠️  ${usFile.id} #${storyId} — update failed: ${err}`);
          result.success = false;
        }
      }

      this.logger.log(`\n📊 ADO AC Sync: updated ${result.updated} checkbox(es) in ${result.issues.length} work item(s)`);
      return result;

    } catch (error) {
      this.logger.error('❌ ADO AC checkbox sync failed:', error);
      result.success = false;
      return result;
    }
  }

  /**
   * Fetch current HTML description, regex-flip ☐/☑ for matching ACs, PATCH back.
   * Posts a comment listing all AC statuses when any AC changed.
   */
  private async updateStoryCheckboxes(
    client: AxiosInstance,
    adoConfig: { organization: string; project: string; pat: string },
    storyId: number,
    acStatus: Map<string, boolean>
  ): Promise<number> {
    const resp = await client.get(
      `/wit/workitems/${storyId}?fields=System.Description&api-version=7.0`
    );

    let description: string = resp.data?.fields?.['System.Description'] ?? '';
    const original = description;
    let updatedCount = 0;

    for (const [acId, completed] of acStatus) {
      const escaped = acId.replace(/-/g, '\\-');
      // Pattern: ☐ AC-US1-01: or ☑ AC-US1-01:
      const beforeRegex = new RegExp(`(☐|☑)\\s+(${escaped}:)`, 'g');
      const newCheckbox = completed ? '☑' : '☐';
      const replaced = description.replace(beforeRegex, `${newCheckbox} $2`);
      if (replaced !== description) {
        updatedCount++;
        description = replaced;
      }
    }

    if (description === original) return 0;

    // PATCH description
    await client.patch(
      `/wit/workitems/${storyId}?api-version=7.0`,
      [{ op: 'replace', path: '/fields/System.Description', value: description }],
      { headers: { 'Content-Type': 'application/json-patch+json' } }
    );

    // Post progress comment
    const completedCount = [...acStatus.values()].filter(Boolean).length;
    const totalCount = acStatus.size;
    const percentage = Math.round((completedCount / totalCount) * 100);

    const acLines = [...acStatus.entries()]
      .map(([id, done]) => `<li>${done ? '✅' : '⬜'} ${id}</li>`)
      .join('\n');

    const commentHtml = `<h3>📊 AC Progress Update</h3>
<p><strong>Acceptance Criteria</strong>: ${completedCount}/${totalCount} (${percentage}%)</p>
<ul>
${acLines}
</ul>
<p>🤖 Auto-updated by SpecWeave AC Completion Gate</p>`;

    await client.post(
      `/wit/workItems/${storyId}/comments?api-version=7.1-preview.3`,
      { text: commentHtml }
    );

    return updatedCount;
  }

  private buildClient(adoConfig: { organization: string; project: string; pat: string }): AxiosInstance {
    const token = Buffer.from(`:${adoConfig.pat}`).toString('base64');
    return axios.create({
      baseURL: `https://dev.azure.com/${adoConfig.organization}/${adoConfig.project}/_apis`,
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  private resolveAdoConfig(
    config: SpecWeaveConfig
  ): { organization: string; project: string; pat: string } | null {
    // Try sync.profiles with provider=ado
    const profiles = (config.sync as any)?.profiles;
    if (profiles) {
      for (const profile of Object.values(profiles) as any[]) {
        if (profile?.provider === 'ado' && profile?.organization) {
          const pat = profile.personalAccessToken || profile.pat || process.env.AZURE_DEVOPS_PAT || '';
          if (pat) return { organization: profile.organization, project: profile.project, pat };
        }
      }
    }

    // Try sync.ado
    const ado = (config.sync as any)?.ado;
    if (ado?.organization) {
      const pat = ado.personalAccessToken || ado.pat || process.env.AZURE_DEVOPS_PAT || '';
      if (pat) return { organization: ado.organization, project: ado.project, pat };
    }

    // Fallback: env vars
    const pat = process.env.AZURE_DEVOPS_PAT || '';
    const org = process.env.AZURE_DEVOPS_ORG || '';
    const proj = process.env.AZURE_DEVOPS_PROJECT || '';
    if (pat && org && proj) return { organization: org, project: proj, pat };

    return null;
  }

  private async loadUserStoriesForIncrement(): Promise<LivingDocsUSFile[]> {
    const specFile = path.join(
      this.projectRoot, '.specweave/increments', this.incrementId, 'spec.md'
    );
    if (!existsSync(specFile)) return [];

    const content = await fs.readFile(specFile, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return [];

    const frontmatter = yaml.parse(frontmatterMatch[1]);
    let featureId = frontmatter.feature_id || frontmatter.epic || frontmatter.feature;

    if (!featureId) {
      const metadataFile = path.join(
        this.projectRoot, '.specweave/increments', this.incrementId, 'metadata.json'
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

    // Search all project directories for the feature
    if (existsSync(specsRoot)) {
      try {
        for (const proj of await fs.readdir(specsRoot)) {
          const p = path.join(specsRoot, proj, featureId);
          if (existsSync(p)) projectDirs.push(p);
        }
      } catch { /* ignore */ }
    }

    for (const featurePath of projectDirs) {
      for (const file of await fs.readdir(featurePath)) {
        if (!file.startsWith('us-') || !file.endsWith('.md')) continue;
        const fileContent = await fs.readFile(path.join(featurePath, file), 'utf-8');
        const match = fileContent.match(/^---\n([\s\S]*?)\n---/);
        if (match) {
          const fm = yaml.parse(match[1]);
          usFiles.push({
            id: fm.id, title: fm.title,
            format_preservation: fm.format_preservation,
            external_title: fm.external_title,
            external_source: fm.external_source,
            external_id: fm.external_id, external_url: fm.external_url,
            imported_at: fm.imported_at, origin: fm.origin,
            external_tools: { ...(fm.external || {}), ...(fm.external_tools || {}) },
          });
        }
      }
    }

    return usFiles;
  }
}
