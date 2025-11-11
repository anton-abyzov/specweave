import * as fs from "fs-extra";
import * as path from "path";
const PROJECT_KEYWORDS = {
  "AuthService": [
    "authentication",
    "auth",
    "login",
    "logout",
    "oauth",
    "jwt",
    "token",
    "session",
    "password",
    "credential",
    "sso",
    "saml",
    "ldap",
    "mfa",
    "2fa",
    "totp"
  ],
  "UserService": [
    "user",
    "profile",
    "account",
    "registration",
    "preferences",
    "settings",
    "avatar",
    "username",
    "email",
    "verification",
    "onboarding",
    "demographics",
    "personalization"
  ],
  "PaymentService": [
    "payment",
    "billing",
    "stripe",
    "paypal",
    "invoice",
    "subscription",
    "charge",
    "refund",
    "credit card",
    "transaction",
    "checkout",
    "cart",
    "pricing",
    "plan",
    "tier"
  ],
  "NotificationService": [
    "notification",
    "email",
    "sms",
    "push",
    "alert",
    "message",
    "webhook",
    "queue",
    "sendgrid",
    "twilio",
    "template",
    "broadcast",
    "digest",
    "reminder"
  ],
  "Platform": [
    "infrastructure",
    "deployment",
    "monitoring",
    "logging",
    "metrics",
    "kubernetes",
    "docker",
    "ci/cd",
    "pipeline",
    "terraform",
    "ansible",
    "helm",
    "grafana",
    "prometheus"
  ],
  "DataService": [
    "database",
    "data",
    "analytics",
    "etl",
    "warehouse",
    "pipeline",
    "kafka",
    "spark",
    "hadoop",
    "bigquery",
    "redshift",
    "snowflake",
    "datalake",
    "streaming"
  ],
  "ApiGateway": [
    "gateway",
    "api",
    "proxy",
    "routing",
    "load balancer",
    "rate limiting",
    "throttling",
    "circuit breaker",
    "cors",
    "authentication proxy",
    "service mesh",
    "envoy",
    "kong"
  ],
  "WebApp": [
    "frontend",
    "ui",
    "react",
    "angular",
    "vue",
    "component",
    "responsive",
    "mobile-first",
    "spa",
    "ssr",
    "next.js",
    "gatsby",
    "webpack",
    "css",
    "sass",
    "styled-components"
  ],
  "MobileApp": [
    "ios",
    "android",
    "react native",
    "flutter",
    "swift",
    "kotlin",
    "objective-c",
    "java",
    "push notification",
    "app store",
    "play store",
    "mobile",
    "tablet",
    "responsive"
  ]
};
const FILE_PATTERNS = {
  "AuthService": [
    /auth\//i,
    /login\//i,
    /security\//i,
    /oauth\//i,
    /jwt\//i
  ],
  "UserService": [
    /users?\//i,
    /profiles?\//i,
    /accounts?\//i,
    /members?\//i
  ],
  "PaymentService": [
    /payment\//i,
    /billing\//i,
    /checkout\//i,
    /stripe\//i,
    /subscription\//i
  ],
  "NotificationService": [
    /notification\//i,
    /email\//i,
    /messaging\//i,
    /templates?\//i
  ],
  "Platform": [
    /infrastructure\//i,
    /terraform\//i,
    /kubernetes\//i,
    /k8s\//i,
    /\.github\/workflows\//i
  ],
  "WebApp": [
    /frontend\//i,
    /src\/components\//i,
    /src\/pages\//i,
    /public\//i,
    /styles?\//i
  ],
  "MobileApp": [
    /ios\//i,
    /android\//i,
    /mobile\//i,
    /app\//i
  ]
};
class AdoProjectDetector {
  constructor(strategy, availableProjects, customKeywords, customPatterns) {
    this.strategy = strategy;
    this.availableProjects = availableProjects;
    this.projectKeywords = { ...PROJECT_KEYWORDS, ...customKeywords };
    this.filePatterns = { ...FILE_PATTERNS, ...customPatterns };
  }
  /**
   * Detect project from spec file path
   */
  async detectFromSpecPath(specPath) {
    if (this.strategy === "project-per-team") {
      const pathParts = specPath.split(path.sep);
      const specsIndex = pathParts.indexOf("specs");
      if (specsIndex !== -1 && specsIndex < pathParts.length - 1) {
        const projectFolder = pathParts[specsIndex + 1];
        const matchedProject = this.availableProjects.find(
          (p) => p.toLowerCase() === projectFolder.toLowerCase()
        );
        if (matchedProject) {
          return {
            primary: matchedProject,
            confidence: 1,
            strategy: this.strategy
          };
        }
      }
    }
    const content = await fs.readFile(specPath, "utf-8");
    return this.detectFromContent(content);
  }
  /**
   * Detect project from spec content
   */
  async detectFromContent(content) {
    const candidates = this.analyzeContent(content);
    if (candidates[0]?.confidence > 0.7) {
      return {
        primary: candidates[0].project,
        confidence: candidates[0].confidence,
        strategy: this.strategy
      };
    }
    if (candidates[0]?.confidence > 0.4) {
      const secondary = candidates.slice(1).filter((c) => c.confidence > 0.3).map((c) => c.project);
      return {
        primary: candidates[0].project,
        secondary: secondary.length > 0 ? secondary : void 0,
        confidence: candidates[0].confidence,
        strategy: this.strategy
      };
    }
    return {
      primary: this.availableProjects[0] || "Unknown",
      confidence: 0,
      strategy: this.strategy
    };
  }
  /**
   * Analyze content and return project candidates with confidence scores
   */
  analyzeContent(content) {
    const results = [];
    const lowerContent = content.toLowerCase();
    for (const project of this.availableProjects) {
      let confidence = 0;
      const reasons = [];
      if (lowerContent.includes(project.toLowerCase())) {
        confidence += 0.5;
        reasons.push(`Project name "${project}" found in content`);
      }
      const keywords = this.projectKeywords[project] || [];
      let keywordMatches = 0;
      for (const keyword of keywords) {
        if (lowerContent.includes(keyword.toLowerCase())) {
          keywordMatches++;
        }
      }
      if (keywordMatches > 0) {
        const keywordScore = Math.min(keywordMatches * 0.1, 0.4);
        confidence += keywordScore;
        reasons.push(`Found ${keywordMatches} keyword matches`);
      }
      const patterns = this.filePatterns[project] || [];
      let patternMatches = 0;
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          patternMatches++;
        }
      }
      if (patternMatches > 0) {
        const patternScore = Math.min(patternMatches * 0.15, 0.3);
        confidence += patternScore;
        reasons.push(`Found ${patternMatches} file pattern matches`);
      }
      const projectAssignment = new RegExp(`project:\\s*${project}`, "i");
      if (projectAssignment.test(content)) {
        confidence = 1;
        reasons.push("Explicit project assignment in frontmatter");
      }
      results.push({ project, confidence, reasons });
    }
    return results.sort((a, b) => b.confidence - a.confidence);
  }
  /**
   * Detect projects for multi-project spec
   */
  async detectMultiProject(content) {
    const candidates = this.analyzeContent(content);
    const significantProjects = candidates.filter((c) => c.confidence > 0.3);
    if (significantProjects.length === 0) {
      return {
        primary: this.availableProjects[0] || "Unknown",
        confidence: 0,
        strategy: this.strategy
      };
    }
    const primary = significantProjects[0];
    const secondary = significantProjects.slice(1).map((c) => c.project);
    return {
      primary: primary.project,
      secondary: secondary.length > 0 ? secondary : void 0,
      confidence: primary.confidence,
      strategy: this.strategy
    };
  }
  /**
   * Map spec to area path (for area-path-based strategy)
   */
  mapToAreaPath(content, project) {
    const areaPaths = process.env.AZURE_DEVOPS_AREA_PATHS?.split(",").map((a) => a.trim()) || [];
    for (const areaPath of areaPaths) {
      if (content.toLowerCase().includes(areaPath.toLowerCase())) {
        return `${project}\\${areaPath}`;
      }
    }
    return project;
  }
  /**
   * Assign to team (for team-based strategy)
   */
  assignToTeam(content) {
    const teams = process.env.AZURE_DEVOPS_TEAMS?.split(",").map((t) => t.trim()) || [];
    const teamMatch = content.match(/team:\s*([^\n]+)/i);
    if (teamMatch) {
      const assignedTeam = teamMatch[1].trim();
      if (teams.includes(assignedTeam)) {
        return assignedTeam;
      }
    }
    const teamKeywords = {
      "Frontend": ["ui", "react", "component", "css", "design"],
      "Backend": ["api", "database", "server", "endpoint", "query"],
      "Mobile": ["ios", "android", "app", "native", "push"],
      "DevOps": ["deploy", "ci/cd", "kubernetes", "docker", "pipeline"],
      "Data": ["analytics", "etl", "warehouse", "bigquery", "spark"]
    };
    for (const team of teams) {
      const keywords = teamKeywords[team] || [];
      for (const keyword of keywords) {
        if (content.toLowerCase().includes(keyword)) {
          return team;
        }
      }
    }
    return teams[0] || "Default Team";
  }
}
function getProjectDetectorFromEnv() {
  const strategy = process.env.AZURE_DEVOPS_STRATEGY || "team-based";
  let projects = [];
  switch (strategy) {
    case "project-per-team":
      projects = process.env.AZURE_DEVOPS_PROJECTS?.split(",").map((p) => p.trim()) || [];
      break;
    case "area-path-based":
    case "team-based":
      const project = process.env.AZURE_DEVOPS_PROJECT;
      if (project) {
        projects = [project];
      }
      break;
  }
  return new AdoProjectDetector(strategy, projects);
}
async function createProjectFolders(baseDir, strategy, projects) {
  const specsPath = path.join(baseDir, ".specweave", "docs", "internal", "specs");
  switch (strategy) {
    case "project-per-team":
      for (const project2 of projects) {
        const projectPath = path.join(specsPath, project2);
        await fs.ensureDir(projectPath);
        await createProjectReadme(projectPath, project2);
      }
      break;
    case "area-path-based":
      const areaPaths = process.env.AZURE_DEVOPS_AREA_PATHS?.split(",").map((a) => a.trim()) || [];
      const project = projects[0];
      if (project) {
        const projectPath = path.join(specsPath, project);
        await fs.ensureDir(projectPath);
        for (const area of areaPaths) {
          const areaPath = path.join(projectPath, area);
          await fs.ensureDir(areaPath);
        }
      }
      break;
    case "team-based":
      const teams = process.env.AZURE_DEVOPS_TEAMS?.split(",").map((t) => t.trim()) || [];
      const proj = projects[0];
      if (proj) {
        const projectPath = path.join(specsPath, proj);
        await fs.ensureDir(projectPath);
        for (const team of teams) {
          const teamPath = path.join(projectPath, team);
          await fs.ensureDir(teamPath);
        }
      }
      break;
  }
}
async function createProjectReadme(projectPath, projectName) {
  const readmePath = path.join(projectPath, "README.md");
  if (await fs.pathExists(readmePath)) {
    return;
  }
  const content = `# ${projectName} Specifications

## Overview

This folder contains specifications for the ${projectName} project.

## Azure DevOps

- Organization: ${process.env.AZURE_DEVOPS_ORG || "TBD"}
- Project: ${projectName}
- URL: https://dev.azure.com/${process.env.AZURE_DEVOPS_ORG || "org"}/${projectName}

## Specifications

_No specifications yet. Specs will appear here as they are created._

## Team

- Lead: TBD
- Members: TBD

## Keywords

${PROJECT_KEYWORDS[projectName]?.join(", ") || "TBD"}

## Getting Started

1. Create a new spec: \`/specweave:increment "feature-name"\`
2. Specs will be organized here automatically
3. Sync to Azure DevOps: \`/specweave-ado:sync-spec spec-001\`

---

_Generated by SpecWeave_
`;
  await fs.writeFile(readmePath, content);
}
export {
  AdoProjectDetector,
  FILE_PATTERNS,
  PROJECT_KEYWORDS,
  createProjectFolders,
  getProjectDetectorFromEnv
};
