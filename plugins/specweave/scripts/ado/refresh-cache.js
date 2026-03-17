#!/usr/bin/env node
import { existsSync, unlinkSync, readdirSync } from "fs";
import { join } from "path";
async function refreshAdoCache(projectRoot = process.cwd()) {
  const cacheDir = join(projectRoot, ".specweave", "cache", "ado");
  if (!existsSync(cacheDir)) {
    console.log("\u2705 No ADO cache found");
    return;
  }
  console.log("\u{1F9F9} Clearing ADO cache...");
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
  refreshAdoCache().catch(console.error);
}
export {
  refreshAdoCache
};
