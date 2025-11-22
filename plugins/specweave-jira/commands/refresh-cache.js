#!/usr/bin/env node
import { existsSync, unlinkSync, readdirSync } from "fs";
import { join } from "path";
async function refreshJiraCache(projectRoot = process.cwd()) {
  const cacheDir = join(projectRoot, ".specweave", "cache", "jira");
  if (!existsSync(cacheDir)) {
    console.log("\u2705 No JIRA cache found");
    return;
  }
  console.log("\u{1F9F9} Clearing JIRA cache...");
  const files = readdirSync(cacheDir);
  let cleared = 0;
  for (const file of files) {
    const filePath = join(cacheDir, file);
    unlinkSync(filePath);
    cleared++;
  }
  console.log(`\u2705 Cleared ${cleared} cache files`);
}
if (require.main === module) {
  refreshJiraCache().catch(console.error);
}
export {
  refreshJiraCache
};
