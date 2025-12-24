#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
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
  try {
    const { launchCodebaseRescanJob } = await import("../../../../src/core/background/job-launcher.js");
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
