#!/usr/bin/env node
import fs from "fs-extra";
import path from "path";
async function updateTasksMd(incrementId) {
  try {
    console.log(`
\u{1F504} Updating tasks.md for increment: ${incrementId}`);
    const incrementDir = path.join(process.cwd(), ".specweave", "increments", incrementId);
    if (!fs.existsSync(incrementDir)) {
      console.error(`\u274C Increment directory not found: ${incrementDir}`);
      process.exit(1);
    }
    const tasksPath = path.join(incrementDir, "tasks.md");
    if (!fs.existsSync(tasksPath)) {
      console.error(`\u274C tasks.md not found: ${tasksPath}`);
      process.exit(1);
    }
    const originalContent = await fs.readFile(tasksPath, "utf-8");
    const lines = originalContent.split("\n");
    console.log(`\u{1F4D6} Read tasks.md (${lines.length} lines)`);
    const tasks = parseTaskStatus(lines);
    console.log(`\u{1F4CB} Found ${tasks.length} tasks`);
    const completedTasks = detectCompletedTasks(lines);
    if (completedTasks.length === 0) {
      console.log("\u2705 No new task completions detected");
      return;
    }
    console.log(`\u{1F3AF} Detected ${completedTasks.length} completed task(s):`, completedTasks);
    let updatedContent = originalContent;
    for (const taskId of completedTasks) {
      updatedContent = markTaskComplete(updatedContent, taskId);
    }
    const updatedLines = updatedContent.split("\n");
    const totalTasks = countTotalTasks(updatedLines);
    const completedCount = countCompletedTasks(updatedLines);
    const progress = Math.round(completedCount / totalTasks * 100);
    console.log(`\u{1F4CA} Progress: ${completedCount}/${totalTasks} (${progress}%)`);
    updatedContent = updateProgressHeader(updatedContent, completedCount, totalTasks, progress);
    await fs.writeFile(tasksPath, updatedContent, "utf-8");
    console.log(`\u2705 Updated ${tasksPath}`);
    console.log(`   Completed: ${completedCount}/${totalTasks}`);
    console.log(`   Progress: ${progress}%
`);
  } catch (error) {
    console.error("\u274C Error updating tasks.md:", error);
    process.exit(1);
  }
}
function parseTaskStatus(lines) {
  const tasks = [];
  const taskPattern = /^###\s+(T-?\d+[-A-Z]*):?\s+(.+)/;
  lines.forEach((line, index) => {
    const match = line.match(taskPattern);
    if (match) {
      const taskId = match[1];
      let status = "pending";
      for (let i = index + 1; i < Math.min(index + 5, lines.length); i++) {
        const nextLine = lines[i];
        if (nextLine.includes("**Status**:")) {
          if (nextLine.includes("[x] Completed")) {
            status = "completed";
          } else if (nextLine.includes("\u23F3 Pending") || nextLine.includes("[ ] Pending")) {
            status = "pending";
          } else if (nextLine.includes("\u{1F504} In Progress") || nextLine.includes("in_progress")) {
            status = "in_progress";
          }
          break;
        }
      }
      tasks.push({
        taskId,
        lineNumber: index,
        currentStatus: status
      });
    }
  });
  return tasks;
}
function detectCompletedTasks(lines) {
  const completedTasks = [];
  return completedTasks;
}
function markTaskComplete(content, taskId) {
  let updated = content;
  const statusPattern = new RegExp(
    `(###\\s+${taskId.replace(/[-]/g, "\\-")}[^\\n]*[\\s\\S]*?\\*\\*Status\\*\\*:)\\s*\\[?\\s*\\]?\\s*\u23F3?\\s*Pending`,
    "i"
  );
  updated = updated.replace(statusPattern, "$1 [x] Completed");
  return updated;
}
function countTotalTasks(lines) {
  let count = 0;
  const taskPattern = /^###\s+(T-?\d+[-A-Z]*):?\s+/;
  for (const line of lines) {
    if (taskPattern.test(line)) {
      count++;
    }
  }
  return count;
}
function countCompletedTasks(lines) {
  let count = 0;
  const taskPattern = /^###\s+(T-?\d+[-A-Z]*):?\s+/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (taskPattern.test(line)) {
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j];
        if (nextLine.includes("**Status**:") && nextLine.includes("[x] Completed")) {
          count++;
          break;
        }
      }
    }
  }
  return count;
}
function updateProgressHeader(content, completed, total, progress) {
  let updated = content;
  updated = updated.replace(/\*\*Completed\*\*:\s*\d+/, `**Completed**: ${completed}`);
  updated = updated.replace(/\*\*Progress\*\*:\s*\d+%/, `**Progress**: ${progress}%`);
  updated = updated.replace(/\*\*Total Tasks\*\*:\s*\d+/, `**Total Tasks**: ${total}`);
  return updated;
}
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const incrementId = process.argv[2];
  if (!incrementId) {
    console.error("\u274C Usage: update-tasks-md <incrementId>");
    console.error("   Example: update-tasks-md 0006-llm-native-i18n");
    process.exit(1);
  }
  updateTasksMd(incrementId).catch((error) => {
    console.error("\u274C Fatal error:", error);
    process.exit(1);
  });
}
export {
  updateTasksMd
};
