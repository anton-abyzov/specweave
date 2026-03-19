#!/usr/bin/env node
import { existsSync, readFileSync } from "fs";
import * as path from "path";
import { GitHubFeatureSync } from "./github-feature-sync.js";
import { GitHubClientV2 } from "./github-client-v2.js";
async function resolveGitHubConfig(options) {
  const projectRoot = options?.projectRoot || process.cwd();
  const configPath = path.join(projectRoot, ".specweave/config.json");
  let owner = options?.cliOwner || process.env.GITHUB_OWNER || "";
  let repo = options?.cliRepo || process.env.GITHUB_REPO || "";
  const token = options?.cliToken || process.env.GITHUB_TOKEN || "";
  if ((!owner || !repo) && existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      if (!owner && !repo && config.sync?.github?.owner && config.sync?.github?.repo) {
        owner = config.sync.github.owner;
        repo = config.sync.github.repo;
      }
      if (!owner && !repo && config.multiProject?.enabled && config.multiProject?.activeProject) {
        const activeProject = config.multiProject.activeProject;
        const projectConfig = config.multiProject.projects?.[activeProject];
        if (projectConfig?.externalTools?.github?.repository) {
          const parts = projectConfig.externalTools.github.repository.split("/");
          if (parts.length === 2) {
            owner = parts[0];
            repo = parts[1];
          }
        }
      }
      if (!owner && !repo && config.sync?.defaultProfile && config.sync?.profiles) {
        const profile = config.sync.profiles[config.sync.defaultProfile];
        if (profile?.config?.owner && profile?.config?.repo) {
          owner = profile.config.owner;
          repo = profile.config.repo;
        }
      }
      if (!owner && !repo && config.sync?.profiles) {
        const profileNames = Object.keys(config.sync.profiles);
        for (const name of profileNames) {
          const profile = config.sync.profiles[name];
          if (profile?.provider === "github" && profile?.config?.owner && profile?.config?.repo) {
            owner = profile.config.owner;
            repo = profile.config.repo;
            console.log(`\u2139\uFE0F  Using first GitHub profile: ${name}`);
            break;
          }
        }
      }
    } catch (error) {
      console.error("\u26A0\uFE0F  Failed to parse config.json:", error);
    }
  }
  if (!owner || !repo) {
    try {
      const { execSync } = await import("child_process");
      const remoteUrl = execSync("git remote get-url origin 2>/dev/null", {
        encoding: "utf-8",
        cwd: projectRoot
      }).trim();
      const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
      if (match) {
        owner = owner || match[1];
        repo = repo || match[2];
      }
    } catch {
    }
  }
  if (!token) {
    console.error("\u274C GITHUB_TOKEN not set");
    console.error("   Set it in .env file or export GITHUB_TOKEN=ghp_xxx");
    return null;
  }
  if (!owner || !repo) {
    console.error("\u274C Could not detect GitHub owner/repo");
    console.error("   Set sync.github.owner and sync.github.repo in .specweave/config.json");
    return null;
  }
  return { owner, repo, token };
}
async function loadGitHubConfig() {
  return resolveGitHubConfig();
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log("Usage: node github-feature-sync-cli.js <feature-id>");
    console.log("");
    console.log("Arguments:");
    console.log("  feature-id   Feature ID (e.g., FS-062)");
    console.log("");
    console.log("Environment:");
    console.log("  GITHUB_TOKEN  Required - GitHub PAT with repo scope");
    console.log("");
    console.log("Example:");
    console.log("  GITHUB_TOKEN=ghp_xxx node github-feature-sync-cli.js FS-062");
    process.exit(args.length === 0 ? 1 : 0);
  }
  const featureId = args[0];
  if (!featureId.match(/^FS-\d+$/i)) {
    console.error(`\u274C Invalid feature ID: ${featureId}`);
    console.error("   Expected format: FS-XXX (e.g., FS-062)");
    process.exit(1);
  }
  console.log(`
\u{1F419} GitHub Feature Sync CLI`);
  console.log(`   Feature: ${featureId}`);
  const config = await loadGitHubConfig();
  if (!config) {
    process.exit(1);
  }
  console.log(`   Repository: ${config.owner}/${config.repo}`);
  const projectRoot = process.cwd();
  const specsDir = path.join(projectRoot, ".specweave/docs/internal/specs");
  const profile = {
    provider: "github",
    displayName: "GitHub",
    config: {
      owner: config.owner,
      repo: config.repo,
      token: config.token
    },
    timeRange: {
      default: "1M",
      max: "3M"
    }
  };
  const client = new GitHubClientV2(profile);
  const sync = new GitHubFeatureSync(client, specsDir, projectRoot);
  try {
    console.log(`
\u{1F504} Syncing ${featureId} to GitHub...`);
    const result = await sync.syncFeatureToGitHub(featureId);
    if (result.rateLimitSkipped) {
      console.log(`
\u26A0\uFE0F  Sync skipped \u2014 GitHub API rate limit too low`);
      console.log(`   \u{1F4A1} Run /sw:progress-sync to retry when rate limit resets`);
      process.exit(2);
    }
    console.log(`
\u2705 Sync complete!`);
    console.log(`   \u{1F3AF} Milestone: #${result.milestoneNumber}`);
    console.log(`   \u{1F4DD} Issues created: ${result.issuesCreated}`);
    console.log(`   \u{1F504} Issues updated: ${result.issuesUpdated}`);
    console.log(`   \u{1F4DA} User stories processed: ${result.userStoriesProcessed}`);
    if (result.milestoneUrl) {
      console.log(`   \u{1F517} ${result.milestoneUrl}`);
    }
    process.exit(0);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`
[ERROR] Sync failed for ${featureId}: ${msg}`);
    console.error(`
\u274C Sync failed:`, error);
    process.exit(1);
  }
}
main().catch((error) => {
  const msg = error instanceof Error ? error.message : String(error);
  console.log(`[FATAL] ${msg}`);
  console.error("Fatal error:", error);
  process.exit(1);
});
export {
  resolveGitHubConfig
};
