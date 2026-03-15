import { promises as fs, existsSync } from "fs";
import path from "path";
import yaml from "yaml";
import axios from "axios";
import { consoleLogger } from "../../specweave/lib/vendor/utils/logger.js";
import { deriveFeatureId } from "../../specweave/lib/vendor/utils/feature-id-derivation.js";
import { getApiBaseUrl } from "./jira-deployment-detector.js";
import { GitHubACCheckboxSync } from "../../specweave-github/lib/github-ac-checkbox-sync.js";
class JiraACCheckboxSync {
  constructor(options) {
    this.projectRoot = options.projectRoot;
    this.incrementId = options.incrementId;
    this.logger = options.logger ?? consoleLogger;
  }
  async syncACCheckboxesToJira(config) {
    const result = { success: true, updated: 0, issues: [] };
    try {
      const jiraConfig = this.resolveJiraConfig(config);
      if (!jiraConfig) {
        this.logger.log("\u2139\uFE0F  JIRA sync not configured \u2014 skipping AC checkbox sync");
        return result;
      }
      const client = this.buildClient(jiraConfig);
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
\u{1F4CA} Syncing AC checkboxes to JIRA (${acStatus.size} ACs found)...`);
      const userStories = await this.loadUserStoriesForIncrement();
      if (userStories.length === 0) {
        this.logger.log("\u2139\uFE0F  No user stories found for increment");
        return result;
      }
      for (const usFile of userStories) {
        const jiraInfo = usFile.external_tools?.jira;
        const storyKey = jiraInfo?.key;
        if (!storyKey) {
          this.logger.log(`   \u23ED\uFE0F  ${usFile.id} \u2014 no JIRA story key linked`);
          continue;
        }
        const acPrefix = GitHubACCheckboxSync.buildACPrefix(usFile.id);
        const usAcStatus = /* @__PURE__ */ new Map();
        for (const [acId, completed] of acStatus) {
          if (acId.startsWith(acPrefix)) {
            usAcStatus.set(acId, completed);
          }
        }
        if (usAcStatus.size === 0) {
          this.logger.log(`   \u23ED\uFE0F  ${usFile.id} \u2014 no matching ACs`);
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
            this.logger.log(`   \u2705 ${usFile.id} ${storyKey} \u2014 updated ${updated} checkbox(es)`);
          } else {
            this.logger.log(`   \u23ED\uFE0F  ${usFile.id} ${storyKey} \u2014 no changes needed`);
          }
        } catch (err) {
          this.logger.log(`   \u26A0\uFE0F  ${usFile.id} ${storyKey} \u2014 update failed: ${err}`);
          result.success = false;
        }
      }
      this.logger.log(`
\u{1F4CA} JIRA AC Sync: updated ${result.updated} checkbox(es) in ${result.issues.length} story/stories`);
      return result;
    } catch (error) {
      this.logger.error("\u274C JIRA AC checkbox sync failed:", error);
      result.success = false;
      return result;
    }
  }
  /**
   * Fetch the current ADF description from JIRA, walk taskItem nodes,
   * update state based on acStatus map, then PUT back.
   */
  async updateStoryCheckboxes(client, domain, storyKey, acStatus) {
    const resp = await client.get(
      `/issue/${storyKey}?fields=description`,
      { headers: { Accept: "application/json" } }
    );
    const description = resp.data?.fields?.description;
    if (!description || typeof description !== "object") {
      return 0;
    }
    let updated = 0;
    this.walkAdf(description, (node) => {
      if (node.type !== "taskItem") return;
      const text = this.extractText(node);
      for (const [acId, completed] of acStatus) {
        if (text.includes(acId)) {
          const newState = completed ? "DONE" : "TODO";
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
  walkAdf(node, visitor) {
    visitor(node);
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        this.walkAdf(child, visitor);
      }
    }
  }
  /** Extract plain text from an ADF node (concat all text leaves) */
  extractText(node) {
    if (node.type === "text") return node.text ?? "";
    if (!Array.isArray(node.content)) return "";
    return node.content.map((c) => this.extractText(c)).join("");
  }
  buildClient(jiraConfig) {
    const token = Buffer.from(`${jiraConfig.email}:${jiraConfig.apiToken}`).toString("base64");
    return axios.create({
      baseURL: getApiBaseUrl(jiraConfig.domain),
      headers: {
        Authorization: `Basic ${token}`,
        "Content-Type": "application/json"
      }
    });
  }
  resolveJiraConfig(config) {
    const profiles = config.sync?.profiles;
    if (profiles) {
      for (const profile of Object.values(profiles)) {
        if (profile?.provider === "jira" && profile?.domain) {
          const email2 = profile.email || process.env.JIRA_EMAIL || "";
          const apiToken2 = profile.apiToken || profile.token || process.env.JIRA_API_TOKEN || "";
          if (email2 && apiToken2) {
            return { domain: profile.domain, email: email2, apiToken: apiToken2 };
          }
        }
      }
    }
    const jira = config.sync?.jira;
    if (jira?.domain) {
      const email2 = jira.email || process.env.JIRA_EMAIL || "";
      const apiToken2 = jira.apiToken || jira.token || process.env.JIRA_API_TOKEN || "";
      if (email2 && apiToken2) {
        return { domain: jira.domain, email: email2, apiToken: apiToken2 };
      }
    }
    const email = process.env.JIRA_EMAIL || "";
    const apiToken = process.env.JIRA_API_TOKEN || "";
    const baseUrl = process.env.JIRA_BASE_URL || "";
    if (email && apiToken && baseUrl) {
      const domain = baseUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
      return { domain, email, apiToken };
    }
    return null;
  }
  /**
   * Load user stories from living docs for the increment.
   * Reuses the same logic as GitHubACCheckboxSync.
   */
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
      const files = await fs.readdir(featurePath);
      for (const file of files) {
        if (!file.startsWith("us-") || !file.endsWith(".md")) continue;
        const fileContent = await fs.readFile(path.join(featurePath, file), "utf-8");
        const match = fileContent.match(/^---\n([\s\S]*?)\n---/);
        if (match) {
          const fm = yaml.parse(match[1]);
          const externalTools = { ...fm.external || {}, ...fm.external_tools || {} };
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
            external_tools: externalTools
          });
        }
      }
    }
    return usFiles;
  }
}
export {
  JiraACCheckboxSync
};
