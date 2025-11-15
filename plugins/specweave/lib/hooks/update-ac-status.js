#!/usr/bin/env node
import * as fs from "fs/promises";
import * as path from "path";
async function updateACStatus(incrementId) {
  try {
    const projectRoot = process.cwd();
    const incrementPath = path.join(projectRoot, ".specweave/increments", incrementId);
    try {
      await fs.access(incrementPath);
    } catch {
      console.error(`\u274C Increment ${incrementId} not found at ${incrementPath}`);
      return;
    }
    console.log(`\u{1F504} Updating AC status for increment ${incrementId}...`);
    const completedACs = await extractCompletedACsFromTasks(incrementPath);
    if (completedACs.size === 0) {
      console.log(`\u2139\uFE0F  No completed tasks with AC-IDs found in tasks.md`);
      return;
    }
    console.log(`\u2713 Found ${completedACs.size} completed AC-IDs from tasks.md`);
    const updatedCount = await updateSpecACCheckboxes(incrementPath, completedACs);
    if (updatedCount > 0) {
      console.log(`\u2705 Updated ${updatedCount} AC checkbox(es) in spec.md`);
    } else {
      console.log(`\u2139\uFE0F  No AC checkboxes needed updating in spec.md`);
    }
  } catch (error) {
    console.error("\u274C Error updating AC status:", error);
  }
}
async function extractCompletedACsFromTasks(incrementPath) {
  const tasksPath = path.join(incrementPath, "tasks.md");
  const completedACs = /* @__PURE__ */ new Set();
  try {
    const tasksContent = await fs.readFile(tasksPath, "utf-8");
    const taskSections = tasksContent.split(/^(###+)\s+T-\d+:/gm);
    for (let i = 1; i < taskSections.length; i += 2) {
      const taskContent = taskSections[i + 1];
      const statusMatch = taskContent.match(/\*\*Status\*\*:\s*\[x\]/i);
      if (!statusMatch) continue;
      const acMatch = taskContent.match(/\*\*AC\*\*:\s*([^\n]+)/);
      if (!acMatch) continue;
      const acField = acMatch[1];
      const acIds = acField.split(",").map((id) => id.trim()).filter((id) => /^AC-[A-Z0-9]+-\d+$/.test(id));
      acIds.forEach((acId) => completedACs.add(acId));
    }
    return completedACs;
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(`\u2139\uFE0F  tasks.md not found, skipping AC update`);
    } else {
      console.error("Error reading tasks.md:", error);
    }
    return completedACs;
  }
}
async function updateSpecACCheckboxes(incrementPath, completedACs) {
  const specPath = path.join(incrementPath, "spec.md");
  try {
    let specContent = await fs.readFile(specPath, "utf-8");
    let updatedCount = 0;
    const acPattern = /^(\s*)-\s+\[([ x])\]\s+\*\*([A-Z]+-[A-Z0-9]+-\d+)\*\*:(.*)$/gm;
    specContent = specContent.replace(acPattern, (match, indent, currentState, acId, description) => {
      const shouldBeChecked = completedACs.has(acId);
      const isCurrentlyChecked = currentState === "x";
      if (shouldBeChecked && !isCurrentlyChecked) {
        updatedCount++;
        return `${indent}- [x] **${acId}**:${description}`;
      } else if (!shouldBeChecked && isCurrentlyChecked) {
        updatedCount++;
        return `${indent}- [ ] **${acId}**:${description}`;
      }
      return match;
    });
    if (updatedCount > 0) {
      await fs.writeFile(specPath, specContent, "utf-8");
    }
    return updatedCount;
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(`\u2139\uFE0F  spec.md not found, skipping AC update`);
    } else {
      console.error("Error updating spec.md:", error);
    }
    return 0;
  }
}
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const incrementId = process.argv[2];
  if (!incrementId) {
    console.error("Usage: node update-ac-status.js <increment-id>");
    console.error("Example: node update-ac-status.js 0031-external-tool-status-sync");
    process.exit(1);
  }
  updateACStatus(incrementId).then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
