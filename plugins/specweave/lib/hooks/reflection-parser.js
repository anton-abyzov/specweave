import {
  IssueSeverity,
  IssueCategory,
  ReflectionModel
} from "./types/reflection-types";
function extractSection(markdown, heading) {
  const headingRegex = new RegExp(`^${heading}\\s*$`, "mi");
  const match = markdown.match(headingRegex);
  if (!match || match.index === void 0) {
    return "";
  }
  const startIndex = match.index + match[0].length;
  const afterHeading = markdown.slice(startIndex);
  const nextHeadingMatch = afterHeading.match(/^#{1,3}\s+/m);
  const endIndex = nextHeadingMatch?.index ?? afterHeading.length;
  return afterHeading.slice(0, endIndex).trim();
}
function parseAccomplishments(markdown) {
  const section = extractSection(markdown, "## \u2705 What Was Accomplished");
  if (!section) return [];
  const lines = section.split("\n").filter((line) => line.trim());
  const accomplishments = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-*+]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      accomplishments.push(trimmed.replace(/^[-*+\d.]\s+/, "").trim());
    } else if (trimmed.length > 10 && !trimmed.startsWith("#")) {
      accomplishments.push(trimmed);
    }
  }
  return accomplishments;
}
function parseStrengths(markdown) {
  const section = extractSection(markdown, "### \u2705 Strengths");
  if (!section) return [];
  const lines = section.split("\n").filter((line) => line.trim());
  const strengths = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- \u2705") || trimmed.startsWith("\u2705")) {
      strengths.push(trimmed.replace(/^[-*+]?\s*✅\s*/, "").trim());
    }
  }
  return strengths;
}
function parseSeverity(text) {
  if (/CRITICAL/i.test(text)) return IssueSeverity.CRITICAL;
  if (/HIGH/i.test(text)) return IssueSeverity.HIGH;
  if (/MEDIUM/i.test(text)) return IssueSeverity.MEDIUM;
  if (/LOW/i.test(text)) return IssueSeverity.LOW;
  return void 0;
}
function parseCategory(text) {
  if (/SECURITY/i.test(text)) return IssueCategory.SECURITY;
  if (/QUALITY/i.test(text)) return IssueCategory.QUALITY;
  if (/TESTING/i.test(text)) return IssueCategory.TESTING;
  if (/PERFORMANCE/i.test(text)) return IssueCategory.PERFORMANCE;
  if (/TECHNICAL[_\s]DEBT/i.test(text)) return IssueCategory.TECHNICAL_DEBT;
  return void 0;
}
function parseLocation(text) {
  const locationMatch = text.match(/\*\*Location\*\*:\s*`([^`]+)`/i);
  if (!locationMatch) return void 0;
  const locationStr = locationMatch[1];
  const [file, lineStr] = locationStr.split(":");
  const line = lineStr ? parseInt(lineStr, 10) : void 0;
  return {
    file: file.trim(),
    line
  };
}
function parseIssues(markdown) {
  const section = extractSection(markdown, "### \u26A0\uFE0F Issues Identified");
  if (!section) return [];
  const issues = [];
  const lines = section.split("\n");
  let currentIssue = null;
  let currentField = null;
  for (const line of lines) {
    const trimmed = line.trim();
    const headerMatch = trimmed.match(/^\*\*(CRITICAL|HIGH|MEDIUM|LOW)\s*\(([^)]+)\)\*\*/i);
    if (headerMatch) {
      if (currentIssue && currentIssue.severity && currentIssue.category && currentIssue.description) {
        issues.push(currentIssue);
      }
      currentIssue = {
        severity: parseSeverity(headerMatch[1]),
        category: parseCategory(headerMatch[2]),
        description: "",
        impact: "",
        recommendation: ""
      };
      currentField = null;
      continue;
    }
    if ((trimmed.startsWith("- \u274C") || trimmed.startsWith("\u274C") || trimmed.startsWith("- \u26A0\uFE0F")) && currentIssue) {
      currentField = "description";
      const descText = trimmed.replace(/^[-*+]?\s*[❌⚠️]\s*/, "").trim();
      currentIssue.description = descText;
      continue;
    }
    if (trimmed.startsWith("- **Impact**:") || trimmed.startsWith("**Impact**:")) {
      currentField = "impact";
      const impactText = trimmed.replace(/^[-*+]?\s*\*\*Impact\*\*:\s*/, "").trim();
      if (currentIssue) currentIssue.impact = impactText;
      continue;
    }
    if (trimmed.startsWith("- **Recommendation**:") || trimmed.startsWith("**Recommendation**:")) {
      currentField = "recommendation";
      const recText = trimmed.replace(/^[-*+]?\s*\*\*Recommendation\*\*:\s*/, "").trim();
      if (currentIssue) currentIssue.recommendation = recText;
      continue;
    }
    if (trimmed.startsWith("- **Location**:") || trimmed.startsWith("**Location**:")) {
      if (currentIssue) {
        const location = parseLocation(trimmed);
        if (location) currentIssue.location = location;
      }
      currentField = null;
      continue;
    }
    if (currentField && currentIssue && trimmed && !trimmed.startsWith("#")) {
      const fieldValue = currentIssue[currentField] || "";
      currentIssue[currentField] = fieldValue + " " + trimmed;
    }
  }
  if (currentIssue && currentIssue.severity && currentIssue.category && currentIssue.description) {
    issues.push(currentIssue);
  }
  return issues;
}
function parseRecommendedActions(markdown) {
  const section = extractSection(markdown, "## \u{1F527} Recommended Follow-Up Actions");
  const actions = {
    priority1: [],
    priority2: [],
    priority3: []
  };
  if (!section) return actions;
  const lines = section.split("\n");
  let currentPriority = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/Priority 1|MUST FIX/i.test(trimmed)) {
      currentPriority = "priority1";
      continue;
    }
    if (/Priority 2|SHOULD FIX/i.test(trimmed)) {
      currentPriority = "priority2";
      continue;
    }
    if (/Priority 3|NICE TO HAVE/i.test(trimmed)) {
      currentPriority = "priority3";
      continue;
    }
    if (currentPriority && (/^\d+\.\s/.test(trimmed) || /^[-*+]\s/.test(trimmed))) {
      const actionText = trimmed.replace(/^(\d+\.|-|\*|\+)\s+/, "").trim();
      if (actionText.length > 0) {
        actions[currentPriority].push(actionText);
      }
    }
  }
  return actions;
}
function parseLessonsLearned(markdown) {
  const section = extractSection(markdown, "## \u{1F4DA} Lessons Learned");
  const lessons = {
    whatWentWell: [],
    whatCouldImprove: [],
    forNextTime: []
  };
  if (!section) return lessons;
  const lines = section.split("\n");
  let currentCategory = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/What went well/i.test(trimmed)) {
      currentCategory = "whatWentWell";
      continue;
    }
    if (/What could improve/i.test(trimmed)) {
      currentCategory = "whatCouldImprove";
      continue;
    }
    if (/For next time/i.test(trimmed)) {
      currentCategory = "forNextTime";
      continue;
    }
    if (currentCategory && /^[-*+]\s/.test(trimmed)) {
      const text = trimmed.replace(/^[-*+]\s+/, "").trim();
      if (text.length > 0) {
        lessons[currentCategory].push(text);
      }
    }
  }
  return lessons;
}
function parseMetrics(markdown) {
  const section = extractSection(markdown, "## \u{1F4CA} Metrics");
  const metrics = {
    codeQuality: 5,
    security: 5,
    testCoverage: void 0,
    technicalDebt: "MEDIUM",
    performance: "ACCEPTABLE"
  };
  if (!section) return metrics;
  const qualityMatch = section.match(/Code Quality.*?(\d+)/i);
  if (qualityMatch) {
    metrics.codeQuality = parseInt(qualityMatch[1], 10);
  }
  const securityMatch = section.match(/Security.*?(\d+)/i);
  if (securityMatch) {
    metrics.security = parseInt(securityMatch[1], 10);
  }
  const coverageMatch = section.match(/Test Coverage.*?(\d+)%/i);
  if (coverageMatch) {
    metrics.testCoverage = parseInt(coverageMatch[1], 10);
  }
  const debtMatch = section.match(/Technical Debt.*?(LOW|MEDIUM|HIGH)/i);
  if (debtMatch) {
    metrics.technicalDebt = debtMatch[1].toUpperCase();
  }
  const perfMatch = section.match(/Performance.*?(GOOD|ACCEPTABLE|NEEDS[\s_]WORK)/i);
  if (perfMatch) {
    metrics.performance = perfMatch[1].toUpperCase().replace(/[\s_]/g, "_");
  }
  return metrics;
}
function parseReflectionMarkdown(markdown, taskName, model = ReflectionModel.HAIKU, reflectionTime = 0, estimatedCost = 0) {
  const result = {
    taskName,
    completed: (/* @__PURE__ */ new Date()).toISOString(),
    duration: reflectionTime > 0 ? `${reflectionTime}s` : void 0,
    filesModified: {
      count: 0,
      linesAdded: 0,
      linesRemoved: 0
    },
    accomplishments: parseAccomplishments(markdown),
    strengths: parseStrengths(markdown),
    issues: parseIssues(markdown),
    recommendedActions: parseRecommendedActions(markdown),
    lessonsLearned: parseLessonsLearned(markdown),
    metrics: parseMetrics(markdown),
    metadata: {
      model,
      reflectionTime,
      estimatedCost
    }
  };
  const filesChangedMatch = markdown.match(/\*\*Files Modified\*\*:\s*(\d+)\s*files?,\s*\+(\d+)\s*-(\d+)/i);
  if (filesChangedMatch) {
    result.filesModified = {
      count: parseInt(filesChangedMatch[1], 10),
      linesAdded: parseInt(filesChangedMatch[2], 10),
      linesRemoved: parseInt(filesChangedMatch[3], 10)
    };
  }
  return result;
}
function validateReflectionResult(result) {
  const errors = [];
  if (!result.taskName) {
    errors.push("Missing task name");
  }
  if (!result.completed) {
    errors.push("Missing completion timestamp");
  }
  if (result.accomplishments.length === 0 && result.strengths.length === 0) {
    errors.push("No accomplishments or strengths identified (reflection too sparse)");
  }
  if (result.metrics.codeQuality < 1 || result.metrics.codeQuality > 10) {
    errors.push("Code quality must be 1-10");
  }
  if (result.metrics.security < 1 || result.metrics.security > 10) {
    errors.push("Security must be 1-10");
  }
  if (result.metrics.testCoverage !== void 0 && (result.metrics.testCoverage < 0 || result.metrics.testCoverage > 100)) {
    errors.push("Test coverage must be 0-100%");
  }
  for (const issue of result.issues) {
    if (!issue.description) {
      errors.push("Issue missing description");
    }
    if (!issue.impact) {
      errors.push("Issue missing impact explanation");
    }
    if (!issue.recommendation) {
      errors.push("Issue missing recommendation");
    }
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
export {
  parseReflectionMarkdown,
  validateReflectionResult
};
