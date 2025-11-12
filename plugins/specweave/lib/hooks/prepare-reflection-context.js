import fs from "fs-extra";
import path from "path";
import { createReflectionContext } from "./run-self-reflection";
import { getModifiedFilesSummary } from "./git-diff-analyzer";
function prepareReflectionContext(incrementId, taskId, projectRoot) {
  try {
    const context = createReflectionContext(incrementId, taskId, projectRoot);
    if (!context.config.enabled || context.modifiedFiles.length === 0) {
      return null;
    }
    const rootDir = projectRoot || process.cwd();
    const tempDir = path.join(rootDir, ".specweave", "increments", incrementId, "logs", "reflections", ".temp");
    fs.mkdirpSync(tempDir);
    const contextFile = path.join(tempDir, "reflection-context.json");
    const fileStats = getModifiedFilesSummary(context.modifiedFiles);
    const contextData = {
      incrementId: context.incrementId,
      taskId: context.taskId,
      modifiedFiles: context.modifiedFiles.map((f) => ({
        file: f.file,
        linesAdded: f.linesAdded,
        linesRemoved: f.linesRemoved
        // Exclude diff content to save space
      })),
      fileSummary: {
        count: fileStats.count,
        linesAdded: fileStats.linesAdded,
        linesRemoved: fileStats.linesRemoved
      },
      config: context.config,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    fs.writeJsonSync(contextFile, contextData, { spaces: 2 });
    return contextFile;
  } catch (error) {
    console.error(`Failed to prepare reflection context: ${error.message}`);
    return null;
  }
}
function hasReflectionContext(incrementId, projectRoot) {
  const rootDir = projectRoot || process.cwd();
  const contextFile = path.join(
    rootDir,
    ".specweave",
    "increments",
    incrementId,
    "logs",
    "reflections",
    ".temp",
    "reflection-context.json"
  );
  return fs.existsSync(contextFile);
}
function readReflectionContext(incrementId, projectRoot) {
  const rootDir = projectRoot || process.cwd();
  const contextFile = path.join(
    rootDir,
    ".specweave",
    "increments",
    incrementId,
    "logs",
    "reflections",
    ".temp",
    "reflection-context.json"
  );
  if (!fs.existsSync(contextFile)) {
    return null;
  }
  try {
    return fs.readJsonSync(contextFile);
  } catch {
    return null;
  }
}
function clearReflectionContext(incrementId, projectRoot) {
  const rootDir = projectRoot || process.cwd();
  const tempDir = path.join(
    rootDir,
    ".specweave",
    "increments",
    incrementId,
    "logs",
    "reflections",
    ".temp"
  );
  if (fs.existsSync(tempDir)) {
    fs.removeSync(tempDir);
  }
}
if (require.main === module) {
  const incrementId = process.argv[2];
  const taskId = process.argv[3];
  if (!incrementId || !taskId) {
    console.error("Usage: node prepare-reflection-context.js <increment-id> <task-id>");
    process.exit(1);
  }
  const contextFile = prepareReflectionContext(incrementId, taskId);
  if (contextFile) {
    console.log(`Reflection context prepared: ${contextFile}`);
    console.log("\u2728 Reflection ready. Run /specweave:reflect to analyze your work.");
  } else {
    console.log("Reflection skipped (disabled or no changes).");
  }
}
export {
  clearReflectionContext,
  hasReflectionContext,
  prepareReflectionContext,
  readReflectionContext
};
