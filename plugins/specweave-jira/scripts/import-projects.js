import chalk from "chalk";
import { confirm } from "@inquirer/prompts";
import { existsSync } from "fs";
import path from "path";
import { JiraClient } from "../../../src/integrations/jira/jira-client.js";
import { FilterProcessor } from "../../../src/integrations/jira/filter-processor.js";
import { mergeEnvList, getEnvValue } from "../../../src/utils/env-manager.js";
import { consoleLogger } from "../../../src/utils/logger.js";
import { credentialsManager } from "../../../src/core/credentials/credentials-manager.js";
async function importProjects(options = {}) {
  const logger = options.logger ?? consoleLogger;
  const projectRoot = process.cwd();
  console.log(chalk.cyan("\n\u{1F4E5} JIRA Project Import\n"));
  const credentials = credentialsManager.getJiraCredentials();
  if (!credentials) {
    console.log(chalk.red("\u274C No JIRA credentials found"));
    console.log(chalk.gray("   Run: specweave init"));
    return;
  }
  const client = new JiraClient(credentials);
  const filterProcessor = new FilterProcessor(client, { logger });
  if (options.resume) {
    const resumed = await resumeImport(projectRoot, client, filterProcessor, options);
    if (resumed) {
      return;
    }
    console.log(chalk.yellow("\u26A0\uFE0F  No import state found. Starting fresh import.\n"));
  }
  const existing = await loadExistingProjects(projectRoot, logger);
  console.log(chalk.gray(`Current projects: ${existing.length > 0 ? existing.join(", ") : "none"}
`));
  console.log(chalk.cyan("\u{1F4E1} Fetching available JIRA projects...\n"));
  let allProjects = [];
  try {
    const response = await client.searchProjects({ maxResults: 1e3 });
    allProjects = response.values || [];
    console.log(chalk.green(`\u2713 Found ${allProjects.length} total projects
`));
  } catch (error) {
    console.log(chalk.red(`\u274C Failed to fetch projects: ${error.message}`));
    return;
  }
  let filteredProjects = allProjects;
  if (options.preset) {
    console.log(chalk.cyan(`\u{1F50D} Applying preset: ${options.preset}
`));
    try {
      filteredProjects = await filterProcessor.applyPreset(allProjects, options.preset);
    } catch (error) {
      console.log(chalk.red(`\u274C ${error.message}`));
      return;
    }
  } else if (options.filter || options.type || options.lead || options.jql) {
    const filterOptions = {};
    if (options.filter === "active") {
      filterOptions.active = true;
    } else if (options.filter === "archived") {
      filterOptions.active = false;
    }
    if (options.type) {
      filterOptions.types = options.type;
    }
    if (options.lead) {
      filterOptions.lead = options.lead;
    }
    if (options.jql) {
      filterOptions.jql = options.jql;
    }
    console.log(chalk.cyan("\u{1F50D} Applying filters...\n"));
    filteredProjects = await filterProcessor.applyFilters(allProjects, filterOptions);
  }
  const newProjects = filteredProjects.filter((p) => {
    return !existing.some((e) => e.toLowerCase() === p.key.toLowerCase());
  });
  if (newProjects.length === 0) {
    console.log(chalk.yellow("\u26A0\uFE0F  No new projects found to import"));
    console.log(chalk.gray("   All available projects are already imported\n"));
    return;
  }
  console.log(chalk.cyan("\u{1F4CB} Import Preview:\n"));
  console.log(chalk.white(`   Total available: ${allProjects.length}`));
  console.log(chalk.white(`   After filtering: ${filteredProjects.length}`));
  console.log(chalk.white(`   Already imported: ${existing.length}`));
  console.log(chalk.white(`   New projects: ${chalk.green.bold(newProjects.length)}
`));
  if (newProjects.length <= 10) {
    console.log(chalk.gray("Projects to import:"));
    newProjects.forEach((p) => {
      const typeLabel = p.projectTypeKey || "unknown";
      const leadLabel = p.lead?.displayName || "no lead";
      console.log(chalk.gray(`   \u2728 ${p.key} - ${p.name} (${typeLabel}, ${leadLabel})`));
    });
    console.log("");
  }
  if (options.dryRun) {
    console.log(chalk.yellow("\u{1F50D} Dry-run mode: No changes will be made\n"));
    console.log(chalk.green(`\u2713 Preview complete: ${newProjects.length} project(s) would be imported
`));
    return;
  }
  const confirmed = await confirm({
    message: `Import ${newProjects.length} new project(s)?`,
    default: true
  });
  if (!confirmed) {
    console.log(chalk.yellow("\n\u23ED\uFE0F  Import canceled\n"));
    return;
  }
  const projectKeys = newProjects.map((p) => p.key);
  console.log(chalk.cyan("\n\u{1F4E5} Importing projects...\n"));
  try {
    await mergeEnvList({
      key: "JIRA_PROJECTS",
      newValues: projectKeys,
      projectRoot,
      logger,
      createBackup: true
    });
    console.log(chalk.green(`
\u2705 Successfully imported ${projectKeys.length} project(s)
`));
    console.log(chalk.gray("Updated: .env (JIRA_PROJECTS)"));
    console.log(chalk.gray("Backup: .env.backup\n"));
  } catch (error) {
    console.log(chalk.red(`
\u274C Import failed: ${error.message}
`));
  }
}
async function loadExistingProjects(projectRoot, logger) {
  const value = await getEnvValue(projectRoot, "JIRA_PROJECTS");
  if (!value) {
    return [];
  }
  return value.split(",").map((v) => v.trim()).filter((v) => v.length > 0);
}
async function resumeImport(projectRoot, client, filterProcessor, options) {
  const stateFile = path.join(projectRoot, ".specweave", "cache", "import-state.json");
  if (!existsSync(stateFile)) {
    return false;
  }
  console.log(chalk.cyan("\u{1F504} Resuming interrupted import...\n"));
  return false;
}
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--filter") {
      options.filter = args[++i];
    } else if (arg === "--type") {
      options.type = args[++i].split(",");
    } else if (arg === "--lead") {
      options.lead = args[++i];
    } else if (arg === "--jql") {
      options.jql = args[++i];
    } else if (arg === "--preset") {
      options.preset = args[++i];
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--resume") {
      options.resume = true;
    } else if (arg === "--no-progress") {
      options.noProgress = true;
    }
  }
  await importProjects(options);
}
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(chalk.red(`
\u274C Error: ${error.message}
`));
    process.exit(1);
  });
}
export {
  main as default,
  importProjects
};
