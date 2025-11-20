import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";
function executeGitCommand(command, cwd) {
  try {
    return execSync(command, {
      cwd: cwd || process.cwd(),
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
  } catch (error) {
    throw new Error(`Git command failed: ${command}. ${error.message}`);
  }
}
function isGitRepository(dir = process.cwd()) {
  try {
    executeGitCommand("git rev-parse --git-dir", dir);
    return true;
  } catch {
    return false;
  }
}
function getModifiedFilesList(cwd) {
  if (!isGitRepository(cwd)) {
    return [];
  }
  try {
    const output = executeGitCommand("git diff --name-only HEAD", cwd);
    if (!output.trim()) {
      return [];
    }
    return output.trim().split("\n").filter((file) => file.length > 0).filter((file) => !file.startsWith(".git/"));
  } catch {
    return [];
  }
}
function parseNumstat(numstatOutput) {
  const stats = /* @__PURE__ */ new Map();
  if (!numstatOutput.trim()) {
    return stats;
  }
  const lines = numstatOutput.trim().split("\n");
  for (const line of lines) {
    const parts = line.split("	");
    if (parts.length < 3) continue;
    const added = parts[0] === "-" ? 0 : parseInt(parts[0], 10);
    const removed = parts[1] === "-" ? 0 : parseInt(parts[1], 10);
    const filename = parts[2];
    stats.set(filename, { added, removed });
  }
  return stats;
}
function getFileDiff(file, cwd) {
  if (!isGitRepository(cwd)) {
    return "";
  }
  try {
    const output = executeGitCommand(`git diff HEAD -- "${file}"`, cwd);
    return output;
  } catch {
    return "";
  }
}
function getFileContent(file, cwd) {
  try {
    const workingDir = cwd || process.cwd();
    const absolutePath = path.isAbsolute(file) ? file : path.join(workingDir, file);
    if (!existsSync(absolutePath)) {
      return "";
    }
    return readFileSync(absolutePath, "utf-8");
  } catch {
    return "";
  }
}
function getModifiedFiles(cwd, maxFiles = 100) {
  if (!isGitRepository(cwd)) {
    return [];
  }
  const workingDir = cwd || process.cwd();
  const modifiedFiles = getModifiedFilesList(workingDir);
  if (modifiedFiles.length === 0) {
    return [];
  }
  const filesToAnalyze = modifiedFiles.slice(0, maxFiles);
  let numstatOutput = "";
  try {
    numstatOutput = executeGitCommand("git diff --numstat HEAD", workingDir);
  } catch {
  }
  const stats = parseNumstat(numstatOutput);
  const result = [];
  for (const file of filesToAnalyze) {
    const fileStat = stats.get(file) || { added: 0, removed: 0 };
    const diffContent = getFileDiff(file, workingDir);
    if (fileStat.added > 0 || fileStat.removed > 0 || diffContent.length > 0) {
      result.push({
        file,
        linesAdded: fileStat.added,
        linesRemoved: fileStat.removed,
        content: diffContent
      });
    }
  }
  return result;
}
function getModifiedFilesSummary(modifiedFiles) {
  return {
    count: modifiedFiles.length,
    linesAdded: modifiedFiles.reduce((sum, file) => sum + file.linesAdded, 0),
    linesRemoved: modifiedFiles.reduce((sum, file) => sum + file.linesRemoved, 0),
    totalChanges: modifiedFiles.reduce(
      (sum, file) => sum + file.linesAdded + file.linesRemoved,
      0
    )
  };
}
function filterFilesByExtension(modifiedFiles, extensions) {
  return modifiedFiles.filter((file) => {
    const ext = path.extname(file.file).toLowerCase();
    return extensions.some((allowedExt) => ext === allowedExt.toLowerCase());
  });
}
function excludeFilesByPattern(modifiedFiles, patterns) {
  return modifiedFiles.filter((file) => {
    return !patterns.some((pattern) => {
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      return regex.test(file.file);
    });
  });
}
export {
  excludeFilesByPattern,
  filterFilesByExtension,
  getFileContent,
  getFileDiff,
  getModifiedFiles,
  getModifiedFilesList,
  getModifiedFilesSummary,
  isGitRepository,
  parseNumstat
};
