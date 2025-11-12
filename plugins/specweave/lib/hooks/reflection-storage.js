import fs from "fs-extra";
import path from "path";
import { IssueSeverity } from "./types/reflection-types";
function generateReflectionMarkdown(result) {
  const sections = [];
  sections.push(`# Self-Reflection: ${result.taskName}`);
  sections.push("");
  sections.push(`**Completed**: ${result.completed}`);
  if (result.duration) {
    sections.push(`**Duration**: ${result.duration}`);
  }
  sections.push(`**Files Modified**: ${result.filesModified.count} files, +${result.filesModified.linesAdded} -${result.filesModified.linesRemoved}`);
  sections.push("");
  sections.push("---");
  sections.push("");
  sections.push("## \u2705 What Was Accomplished");
  sections.push("");
  if (result.accomplishments.length > 0) {
    for (const accomplishment of result.accomplishments) {
      sections.push(`- ${accomplishment}`);
    }
  } else {
    sections.push("(No accomplishments recorded)");
  }
  sections.push("");
  sections.push("---");
  sections.push("");
  sections.push("## \u{1F3AF} Quality Assessment");
  sections.push("");
  sections.push("### \u2705 Strengths");
  sections.push("");
  if (result.strengths.length > 0) {
    for (const strength of result.strengths) {
      sections.push(`- \u2705 ${strength}`);
    }
  } else {
    sections.push("(No strengths recorded)");
  }
  sections.push("");
  sections.push("### \u26A0\uFE0F Issues Identified");
  sections.push("");
  if (result.issues.length === 0) {
    sections.push("\u2705 No critical issues detected. Code follows best practices.");
  } else {
    const criticalIssues = result.issues.filter((i) => i.severity === IssueSeverity.CRITICAL);
    const highIssues = result.issues.filter((i) => i.severity === IssueSeverity.HIGH);
    const mediumIssues = result.issues.filter((i) => i.severity === IssueSeverity.MEDIUM);
    const lowIssues = result.issues.filter((i) => i.severity === IssueSeverity.LOW);
    const issueGroups = [
      { issues: criticalIssues, severity: IssueSeverity.CRITICAL },
      { issues: highIssues, severity: IssueSeverity.HIGH },
      { issues: mediumIssues, severity: IssueSeverity.MEDIUM },
      { issues: lowIssues, severity: IssueSeverity.LOW }
    ];
    for (const group of issueGroups) {
      if (group.issues.length === 0) continue;
      for (const issue of group.issues) {
        sections.push(`**${issue.severity} (${issue.category})**`);
        sections.push(`- \u274C ${issue.description}`);
        sections.push(`  - **Impact**: ${issue.impact}`);
        sections.push(`  - **Recommendation**: ${issue.recommendation}`);
        if (issue.location) {
          const locationStr = issue.location.line ? `${issue.location.file}:${issue.location.line}` : issue.location.file;
          sections.push(`  - **Location**: \`${locationStr}\``);
          if (issue.location.snippet) {
            sections.push("  - **Code Snippet**:");
            sections.push("    ```");
            sections.push(`    ${issue.location.snippet}`);
            sections.push("    ```");
          }
        }
        sections.push("");
      }
    }
  }
  sections.push("---");
  sections.push("");
  sections.push("## \u{1F527} Recommended Follow-Up Actions");
  sections.push("");
  const hasActions = result.recommendedActions.priority1.length > 0 || result.recommendedActions.priority2.length > 0 || result.recommendedActions.priority3.length > 0;
  if (!hasActions) {
    sections.push("\u2705 No follow-up actions required. Ready to proceed.");
  } else {
    if (result.recommendedActions.priority1.length > 0) {
      sections.push("**Priority 1 (MUST FIX - before closing increment)**:");
      for (let i = 0; i < result.recommendedActions.priority1.length; i++) {
        sections.push(`${i + 1}. ${result.recommendedActions.priority1[i]}`);
      }
      sections.push("");
    }
    if (result.recommendedActions.priority2.length > 0) {
      sections.push("**Priority 2 (SHOULD FIX - this increment)**:");
      for (let i = 0; i < result.recommendedActions.priority2.length; i++) {
        sections.push(`${i + 1}. ${result.recommendedActions.priority2[i]}`);
      }
      sections.push("");
    }
    if (result.recommendedActions.priority3.length > 0) {
      sections.push("**Priority 3 (NICE TO HAVE - future increment)**:");
      for (let i = 0; i < result.recommendedActions.priority3.length; i++) {
        sections.push(`${i + 1}. ${result.recommendedActions.priority3[i]}`);
      }
      sections.push("");
    }
  }
  sections.push("---");
  sections.push("");
  const hasLessons = result.lessonsLearned.whatWentWell.length > 0 || result.lessonsLearned.whatCouldImprove.length > 0 || result.lessonsLearned.forNextTime.length > 0;
  if (hasLessons) {
    sections.push("## \u{1F4DA} Lessons Learned");
    sections.push("");
    if (result.lessonsLearned.whatWentWell.length > 0) {
      sections.push("**What went well**:");
      for (const lesson of result.lessonsLearned.whatWentWell) {
        sections.push(`- ${lesson}`);
      }
      sections.push("");
    }
    if (result.lessonsLearned.whatCouldImprove.length > 0) {
      sections.push("**What could improve**:");
      for (const lesson of result.lessonsLearned.whatCouldImprove) {
        sections.push(`- ${lesson}`);
      }
      sections.push("");
    }
    if (result.lessonsLearned.forNextTime.length > 0) {
      sections.push("**For next time**:");
      for (const lesson of result.lessonsLearned.forNextTime) {
        sections.push(`- ${lesson}`);
      }
      sections.push("");
    }
    sections.push("---");
    sections.push("");
  }
  sections.push("## \u{1F4CA} Metrics");
  sections.push("");
  sections.push(`- **Code Quality**: ${result.metrics.codeQuality}/10`);
  sections.push(`- **Security**: ${result.metrics.security}/10`);
  if (result.metrics.testCoverage !== void 0) {
    sections.push(`- **Test Coverage**: ${result.metrics.testCoverage}%`);
  } else {
    sections.push(`- **Test Coverage**: N/A`);
  }
  sections.push(`- **Technical Debt**: ${result.metrics.technicalDebt}`);
  sections.push(`- **Performance**: ${result.metrics.performance.replace(/_/g, " ")}`);
  sections.push("");
  if (result.relatedTasks && result.relatedTasks.length > 0) {
    sections.push("---");
    sections.push("");
    sections.push("## \u{1F517} Related Tasks");
    sections.push("");
    for (const task of result.relatedTasks) {
      sections.push(`- ${task}`);
    }
    sections.push("");
  }
  sections.push("---");
  sections.push("");
  sections.push("**Auto-generated by**: SpecWeave Self-Reflection System");
  sections.push(`**Model**: Claude 3.5 ${result.metadata.model.charAt(0).toUpperCase() + result.metadata.model.slice(1)}`);
  sections.push(`**Reflection Time**: ${result.metadata.reflectionTime} seconds`);
  sections.push(`**Estimated Cost**: ~$${result.metadata.estimatedCost.toFixed(3)}`);
  sections.push("");
  return sections.join("\n");
}
function getReflectionLogDir(incrementId, projectRoot) {
  const rootDir = projectRoot || process.cwd();
  return path.join(
    rootDir,
    ".specweave",
    "increments",
    incrementId,
    "logs",
    "reflections"
  );
}
function getReflectionFilename(taskId, timestamp) {
  const date = timestamp || /* @__PURE__ */ new Date();
  const dateStr = date.toISOString().split("T")[0];
  const sanitizedTaskId = taskId.replace(/[^a-zA-Z0-9-]/g, "-");
  return `task-${sanitizedTaskId}-reflection-${dateStr}.md`;
}
function saveReflection(result, incrementId, taskId, projectRoot) {
  const logDir = getReflectionLogDir(incrementId, projectRoot);
  fs.mkdirpSync(logDir);
  const filename = getReflectionFilename(taskId);
  const filepath = path.join(logDir, filename);
  const markdown = generateReflectionMarkdown(result);
  try {
    fs.writeFileSync(filepath, markdown, "utf-8");
    return filepath;
  } catch (error) {
    throw new Error(`Failed to save reflection: ${error.message}`);
  }
}
function listReflections(incrementId, projectRoot) {
  const logDir = getReflectionLogDir(incrementId, projectRoot);
  if (!fs.existsSync(logDir)) {
    return [];
  }
  const files = fs.readdirSync(logDir).filter((file) => file.endsWith(".md")).map((file) => path.join(logDir, file)).sort((a, b) => {
    const statA = fs.statSync(a);
    const statB = fs.statSync(b);
    return statB.mtime.getTime() - statA.mtime.getTime();
  });
  return files;
}
function readReflection(filepath) {
  try {
    return fs.readFileSync(filepath, "utf-8");
  } catch (error) {
    throw new Error(`Failed to read reflection: ${error.message}`);
  }
}
function deleteReflection(filepath) {
  try {
    fs.removeSync(filepath);
  } catch (error) {
    throw new Error(`Failed to delete reflection: ${error.message}`);
  }
}
export {
  deleteReflection,
  generateReflectionMarkdown,
  getReflectionFilename,
  getReflectionLogDir,
  listReflections,
  readReflection,
  saveReflection
};
