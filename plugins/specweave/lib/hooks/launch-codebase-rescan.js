#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function importJobLauncher(projectPath, log) {
  const candidatePaths = [
    // Local development - relative from this plugin file
    path.resolve(__dirname, "../../../../src/core/background/job-launcher.js"),
    // Compiled dist output - from project root
    path.join(projectPath, "dist/src/core/background/job-launcher.js"),
    // Project src - from project root (for tsx/ts-node)
    path.join(projectPath, "src/core/background/job-launcher.ts"),
    // Marketplace cache - glob pattern requires manual resolution
    ...process.env.HOME ? [
      path.join(process.env.HOME, ".claude/plugins/cache/specweave/sw/latest/dist/src/core/background/job-launcher.js")
    ] : [],
    // CLAUDE_PLUGIN_ROOT - if set
    ...process.env.CLAUDE_PLUGIN_ROOT ? [
      path.join(process.env.CLAUDE_PLUGIN_ROOT, "dist/src/core/background/job-launcher.js"),
      path.join(process.env.CLAUDE_PLUGIN_ROOT, "src/core/background/job-launcher.js")
    ] : []
  ];
  log(`Searching for job-launcher module...`);
  for (const candidatePath of candidatePaths) {
    log(`  Checking: ${candidatePath}`);
    if (fs.existsSync(candidatePath)) {
      log(`  Found: ${candidatePath}`);
      try {
        const moduleUrl = `file://${candidatePath}`;
        const module = await import(moduleUrl);
        return module;
      } catch (importErr) {
        log(`  Import failed: ${importErr.message}`);
      }
    }
  }
  throw new Error(`Could not find job-launcher module. Searched:
${candidatePaths.map((p) => `  - ${p}`).join("\n")}`);
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: launch-codebase-rescan.js <increment-id> [feature-id]");
    process.exit(1);
  }
  const incrementId = args[0];
  const featureId = args[1];
  let projectPath = process.cwd();
  while (projectPath !== "/" && !fs.existsSync(path.join(projectPath, ".specweave"))) {
    projectPath = path.dirname(projectPath);
  }
  if (!fs.existsSync(path.join(projectPath, ".specweave"))) {
    console.error("ERROR: Could not find .specweave directory");
    process.exit(1);
  }
  const logFile = path.join(projectPath, ".specweave/logs/codebase-rescan.log");
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const log = (msg) => {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${msg}
`);
  };
  log(`Starting codebase rescan for increment: ${incrementId}`);
  log(`Feature ID: ${featureId || "not specified"}`);
  log(`Project path: ${projectPath}`);
  log(`Script location: ${__filename}`);
  try {
    const { launchCodebaseRescanJob } = await importJobLauncher(projectPath, log);
    const result = await launchCodebaseRescanJob({
      projectPath,
      closedIncrementId: incrementId,
      featureId,
      depth: "quick"
      // Use quick mode for automatic post-closure scan
    });
    log(`Job launched successfully: ${result.job.id}`);
    log(`Background: ${result.isBackground}`);
    if (result.pid) {
      log(`PID: ${result.pid}`);
    }
    console.log(`Codebase rescan job launched: ${result.job.id}`);
  } catch (err) {
    log(`ERROR: ${err.message}`);
    log(err.stack || "");
    console.error(`Failed to launch codebase rescan: ${err.message}`);
    process.exit(1);
  }
}
main();
