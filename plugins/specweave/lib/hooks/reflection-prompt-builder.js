import { ReflectionDepth } from "./types/reflection-types";
function buildAnalysisInstructions(config) {
  const { depth, categories } = config;
  const instructions = [];
  switch (depth) {
    case ReflectionDepth.QUICK:
      instructions.push("**Analysis Mode**: QUICK (<15s)");
      instructions.push("- Focus on CRITICAL and HIGH severity issues only");
      instructions.push("- Skip lessons learned section");
      instructions.push("- Provide concise feedback (1-2 sentences per issue)");
      break;
    case ReflectionDepth.STANDARD:
      instructions.push("**Analysis Mode**: STANDARD (<30s)");
      instructions.push("- Full analysis across all enabled categories");
      instructions.push("- Include lessons learned");
      instructions.push("- Provide actionable feedback with code examples");
      break;
    case ReflectionDepth.DEEP:
      instructions.push("**Analysis Mode**: DEEP (<60s)");
      instructions.push("- Comprehensive analysis with detailed explanations");
      instructions.push("- Include architectural recommendations");
      instructions.push("- Suggest refactoring opportunities");
      instructions.push("- Analyze code metrics (complexity, coupling, cohesion)");
      break;
  }
  instructions.push("");
  instructions.push("**Enabled Analysis Categories**:");
  if (categories.security) {
    instructions.push("- \u2705 **Security**: OWASP Top 10 vulnerabilities (SQL injection, XSS, secrets, etc.)");
  }
  if (categories.quality) {
    instructions.push("- \u2705 **Quality**: Code duplication, complexity, error handling, naming conventions");
  }
  if (categories.testing) {
    instructions.push("- \u2705 **Testing**: Edge cases, error paths, integration/E2E coverage");
  }
  if (categories.performance) {
    instructions.push("- \u2705 **Performance**: N+1 queries, algorithmic complexity, caching opportunities");
  }
  if (categories.technicalDebt) {
    instructions.push("- \u2705 **Technical Debt**: TODOs, deprecated APIs, temporary hacks");
  }
  return instructions.join("\n");
}
function buildFileContext(modifiedFiles, includeFullDiff = false) {
  const context = [];
  context.push("## Modified Files Context");
  context.push("");
  context.push(`**Files Changed**: ${modifiedFiles.length}`);
  const totalAdded = modifiedFiles.reduce((sum, f) => sum + f.linesAdded, 0);
  const totalRemoved = modifiedFiles.reduce((sum, f) => sum + f.linesRemoved, 0);
  context.push(`**Lines Added**: +${totalAdded}`);
  context.push(`**Lines Removed**: -${totalRemoved}`);
  context.push("");
  context.push("### File Summary");
  context.push("");
  for (const file of modifiedFiles) {
    context.push(`- \`${file.file}\`: +${file.linesAdded} -${file.linesRemoved}`);
  }
  context.push("");
  if (includeFullDiff) {
    context.push("### Detailed Changes");
    context.push("");
    for (const file of modifiedFiles) {
      context.push(`#### ${file.file}`);
      context.push("");
      context.push("```diff");
      const diffLines = file.content.split("\n").slice(0, 100);
      context.push(diffLines.join("\n"));
      if (file.content.split("\n").length > 100) {
        context.push("... (diff truncated)");
      }
      context.push("```");
      context.push("");
    }
  }
  return context.join("\n");
}
function buildTaskContext(taskId, taskName) {
  const context = [];
  context.push("## Task Information");
  context.push("");
  context.push(`**Task ID**: ${taskId}`);
  if (taskName) {
    context.push(`**Task Name**: ${taskName}`);
  }
  context.push("");
  return context.join("\n");
}
function buildReflectionPrompt(options) {
  const {
    taskId,
    taskName,
    modifiedFiles,
    config,
    incrementId,
    includeFullDiff = false
  } = options;
  const sections = [];
  sections.push("# Self-Reflection Request");
  sections.push("");
  sections.push("You are a senior software engineer performing self-reflection on recently completed work.");
  sections.push("Analyze the following code changes and provide comprehensive, actionable feedback.");
  sections.push("");
  sections.push(buildTaskContext(taskId, taskName));
  if (incrementId) {
    sections.push(`**Increment**: ${incrementId}`);
    sections.push("");
  }
  sections.push("---");
  sections.push("");
  sections.push(buildAnalysisInstructions(config));
  sections.push("");
  sections.push("---");
  sections.push("");
  sections.push(buildFileContext(modifiedFiles, includeFullDiff));
  sections.push("---");
  sections.push("");
  sections.push("## Analysis Request");
  sections.push("");
  sections.push("Please analyze the modified files and provide a comprehensive self-reflection following the exact format specified in the reflective-reviewer agent documentation.");
  sections.push("");
  sections.push("**Required Sections**:");
  sections.push("1. \u2705 What Was Accomplished");
  sections.push("2. \u{1F3AF} Quality Assessment (Strengths + Issues)");
  sections.push("3. \u{1F527} Recommended Follow-Up Actions (Priority 1/2/3)");
  if (config.depth !== ReflectionDepth.QUICK) {
    sections.push("4. \u{1F4DA} Lessons Learned");
    sections.push("5. \u{1F4CA} Metrics (Code Quality, Security, Test Coverage, Technical Debt, Performance)");
  }
  sections.push("");
  sections.push("**Critical Requirements**:");
  sections.push("- \u2705 Be SPECIFIC: Always include file paths and line numbers");
  sections.push("- \u2705 Be CONSTRUCTIVE: Provide code examples for fixes, not just criticism");
  sections.push("- \u2705 Be ACTIONABLE: Every issue should have a clear next step");
  sections.push("- \u2705 Be BALANCED: Mention both strengths and issues");
  sections.push("- \u2705 Be HONEST: Don't sugarcoat issues, but acknowledge strengths");
  sections.push("");
  sections.push(`**Severity Threshold**: Flag issues with severity >= ${config.criticalThreshold}`);
  sections.push("");
  sections.push("---");
  sections.push("");
  sections.push("**Please provide your self-reflection analysis now.**");
  return sections.join("\n");
}
function estimatePromptTokens(prompt) {
  return Math.ceil(prompt.length / 4);
}
function truncateModifiedFiles(modifiedFiles, maxTokens = 8e3) {
  const maxChars = maxTokens * 4;
  let currentChars = 0;
  const truncated = [];
  for (const file of modifiedFiles) {
    const fileChars = file.content.length + file.file.length + 50;
    if (currentChars + fileChars > maxChars) {
      const remainingChars = maxChars - currentChars;
      if (remainingChars > 200) {
        const truncatedContent = file.content.slice(0, remainingChars - 50) + "\n... (diff truncated)";
        truncated.push({
          ...file,
          content: truncatedContent
        });
      }
      break;
    }
    truncated.push(file);
    currentChars += fileChars;
  }
  return truncated;
}
function buildSimplifiedPrompt(options) {
  return buildReflectionPrompt({
    ...options,
    includeFullDiff: false
  });
}
export {
  buildReflectionPrompt,
  buildSimplifiedPrompt,
  estimatePromptTokens,
  truncateModifiedFiles
};
