#!/usr/bin/env node
import { syncIncrementChanges } from "./github-sync-increment-changes.js";
const incrementId = process.argv[2];
const changedFile = process.argv[3];
if (!incrementId || !changedFile) {
  console.error("\u274C Usage: cli-sync-increment-changes <incrementId> <changedFile>");
  console.error("   Example: cli-sync-increment-changes 0015-hierarchical-sync spec.md");
  process.exit(1);
}
if (!["spec.md", "plan.md", "tasks.md"].includes(changedFile)) {
  console.error(`\u274C Invalid file: ${changedFile}`);
  console.error("   Must be one of: spec.md, plan.md, tasks.md");
  process.exit(1);
}
syncIncrementChanges(incrementId, changedFile).catch((error) => {
  console.error("\u274C Fatal error:", error);
});
