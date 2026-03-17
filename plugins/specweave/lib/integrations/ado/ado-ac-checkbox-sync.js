import { promises as fs, existsSync } from "fs";
import path from "path";
import yaml from "yaml";
import axios from "axios";
import { consoleLogger } from "../../vendor/utils/logger.js";
import { deriveFeatureId } from "../../vendor/utils/feature-id-derivation.js";
import { GitHubACCheckboxSync } from "../github/github-ac-checkbox-sync.js";
import { AdoDescriptionUpdater } from "../../../../../src/core/ado-description-updater.js";
class AdoACCheckboxSync {
  constructor(options) {
    this.projectRoot = options.projectRoot;
    this.incrementId = options.incrementId;
    this.logger = options.logger ?? consoleLogger;
  }
  async syncACCheckboxesToAdo(config) {
    const result = { success: true, updated: 0, issues: [] };
    try {
      const adoConfig = this.resolveAdoConfig(config);
      if (!adoConfig) {
        this.logger.log("\u2139\uFE0F  ADO sync not configured \u2014 skipping AC checkbox sync");
        return result;
      }
      const client = this.buildClient(adoConfig);
      const specPath = path.join(
        this.projectRoot,
        ".specweave/increments",
        this.incrementId,
        "spec.md"
      );
      if (!existsSync(specPath)) {
        this.logger.log("\u26A0\uFE0F  spec.md not found");
        return result;
      }
      const specContent = await fs.readFile(specPath, "utf-8");
      const acStatus = GitHubACCheckboxSync.parseACStatusFromSpec(specContent);
      if (acStatus.size === 0) {
        this.logger.log("\u2139\uFE0F  No ACs found in spec.md");
        return result;
      }
      this.logger.log(`
\u{1F4CA} Syncing AC checkboxes to ADO (${acStatus.size} ACs found)...`);
      const userStories = await this.loadUserStoriesForIncrement();
      if (userStories.length === 0) {
        this.logger.log("\u2139\uFE0F  No user stories found for increment");
        return result;
      }
      for (const usFile of userStories) {
        const adoInfo = usFile.external_tools?.ado;
        const storyId = adoInfo?.id ?? adoInfo?.workItemId;
        if (!storyId) {
          this.logger.log(`   \u23ED\uFE0F  ${usFile.id} \u2014 no ADO work item ID linked`);
          continue;
        }
        const acPrefix = GitHubACCheckboxSync.buildACPrefix(usFile.id);
        const usAcStatus = /* @__PURE__ */ new Map();
        for (const [acId, completed] of acStatus) {
          if (acId.startsWith(acPrefix)) usAcStatus.set(acId, completed);
        }
        if (usAcStatus.size === 0) {
          this.logger.log(`   \u23ED\uFE0F  ${usFile.id} \u2014 no matching ACs`);
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
            this.logger.log(`   \u2705 ${usFile.id} #${storyId} \u2014 updated ${updated} checkbox(es) + posted comment`);
          } else {
            this.logger.log(`   \u23ED\uFE0F  ${usFile.id} #${storyId} \u2014 no changes needed`);
          }
        } catch (err) {
          this.logger.log(`   \u26A0\uFE0F  ${usFile.id} #${storyId} \u2014 update failed: ${err}`);
          result.success = false;
        }
      }
      this.logger.log(`
\u{1F4CA} ADO AC Sync: updated ${result.updated} checkbox(es) in ${result.issues.length} work item(s)`);
      return result;
    } catch (error) {
      this.logger.error("\u274C ADO AC checkbox sync failed:", error);
      result.success = false;
      return result;
    }
  }
  /**
   * Update a work item's AC section using API-based section manipulation.
   *
   * GET description → formatACCheckboxes → updateAcSection → PATCH with
   * JSON Patch op:"replace". No regex used at any point.
   */
  async updateWorkItemACSection(client, storyId, acStatus) {
    const updater = new AdoDescriptionUpdater();
    const resp = await client.get(
      `/wit/workitems/${storyId}?fields=System.Description&api-version=7.0`
    );
    const currentDescription = resp.data?.fields?.["System.Description"] ?? "";
    const newAcHtml = updater.formatACCheckboxes(acStatus);
    if (!newAcHtml) return 0;
    const updatedDescription = updater.updateAcSection(currentDescription, newAcHtml);
    if (updatedDescription === currentDescription) return 0;
    await client.patch(
      `/wit/workitems/${storyId}?api-version=7.0`,
      [{ op: "replace", path: "/fields/System.Description", value: updatedDescription }],
      { headers: { "Content-Type": "application/json-patch+json" } }
    );
    const completedCount = [...acStatus.values()].filter(Boolean).length;
    const totalCount = acStatus.size;
    const percentage = Math.round(completedCount / totalCount * 100);
    const acLines = [...acStatus.entries()].map(([id, done]) => `<li>${done ? "\u2705" : "\u2B1C"} ${id}</li>`).join("\n");
    const commentHtml = `<h3>AC Progress Update</h3>
<p><strong>Acceptance Criteria</strong>: ${completedCount}/${totalCount} (${percentage}%)</p>
<ul>
${acLines}
</ul>
<p>Auto-updated by SpecWeave</p>`;
    await client.post(
      `/wit/workItems/${storyId}/comments?api-version=7.1-preview.3`,
      { text: commentHtml }
    );
    return acStatus.size;
  }
  /**
   * Legacy: Fetch current HTML description, regex-flip checkboxes, PATCH back.
   * Kept for backward compatibility. New code should use updateWorkItemACSection.
   */
  async updateStoryCheckboxes(client, adoConfig, storyId, acStatus) {
    return this.updateWorkItemACSection(client, storyId, acStatus);
  }
  buildClient(adoConfig) {
    const token = Buffer.from(`:${adoConfig.pat}`).toString("base64");
    return axios.create({
      baseURL: `https://dev.azure.com/${adoConfig.organization}/${adoConfig.project}/_apis`,
      headers: {
        Authorization: `Basic ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    });
  }
  resolveAdoConfig(config) {
    const profiles = config.sync?.profiles;
    if (profiles) {
      for (const profile of Object.values(profiles)) {
        if (profile?.provider === "ado" && profile?.organization) {
          const pat2 = profile.personalAccessToken || profile.pat || process.env.AZURE_DEVOPS_PAT || "";
          if (pat2) return { organization: profile.organization, project: profile.project, pat: pat2 };
        }
      }
    }
    const ado = config.sync?.ado;
    if (ado?.organization) {
      const pat2 = ado.personalAccessToken || ado.pat || process.env.AZURE_DEVOPS_PAT || "";
      if (pat2) return { organization: ado.organization, project: ado.project, pat: pat2 };
    }
    const pat = process.env.AZURE_DEVOPS_PAT || "";
    const org = process.env.AZURE_DEVOPS_ORG || "";
    const proj = process.env.AZURE_DEVOPS_PROJECT || "";
    if (pat && org && proj) return { organization: org, project: proj, pat };
    return null;
  }
  async loadUserStoriesForIncrement() {
    const specFile = path.join(
      this.projectRoot,
      ".specweave/increments",
      this.incrementId,
      "spec.md"
    );
    if (!existsSync(specFile)) return [];
    const content = await fs.readFile(specFile, "utf-8");
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return [];
    const frontmatter = yaml.parse(frontmatterMatch[1]);
    let featureId = frontmatter.feature_id || frontmatter.epic || frontmatter.feature;
    if (!featureId) {
      const metadataFile = path.join(
        this.projectRoot,
        ".specweave/increments",
        this.incrementId,
        "metadata.json"
      );
      if (existsSync(metadataFile)) {
        try {
          const metadata = JSON.parse(await fs.readFile(metadataFile, "utf-8"));
          featureId = metadata.feature_id || metadata.epic_id;
        } catch {
        }
      }
    }
    if (!featureId) {
      try {
        featureId = deriveFeatureId(this.incrementId);
      } catch {
        return [];
      }
    }
    const specsRoot = path.join(this.projectRoot, ".specweave/docs/internal/specs");
    const usFiles = [];
    const projectDirs = [];
    if (existsSync(specsRoot)) {
      try {
        for (const proj of await fs.readdir(specsRoot)) {
          const p = path.join(specsRoot, proj, featureId);
          if (existsSync(p)) projectDirs.push(p);
        }
      } catch {
      }
    }
    for (const featurePath of projectDirs) {
      for (const file of await fs.readdir(featurePath)) {
        if (!file.startsWith("us-") || !file.endsWith(".md")) continue;
        const fileContent = await fs.readFile(path.join(featurePath, file), "utf-8");
        const match = fileContent.match(/^---\n([\s\S]*?)\n---/);
        if (match) {
          const fm = yaml.parse(match[1]);
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
            external_tools: { ...fm.external || {}, ...fm.external_tools || {} }
          });
        }
      }
    }
    return usFiles;
  }
}
export {
  AdoACCheckboxSync
};
