/**
 * Initial Increment Generator
 *
 * Automatically creates increment XXXX-project-setup during `specweave init`
 * so users have a valid starting point to work from.
 *
 * CRITICAL FIX (v1.0.160): Uses IncrementNumberManager.getNextIncrementNumber()
 * to prevent ID collision with archived increments. Previously hardcoded to 0001
 * which caused duplicate ID violations when 0001 existed in _archive.
 *
 * Part of: Empty increments folder fix (2025-11-19)
 */

import * as fs from '../../../utils/fs-native.js';
import path from 'path';
import { IncrementStatus, IncrementType, IncrementMetadata } from '../../../core/types/increment-metadata.js';
import { MetadataManager } from '../../../core/increment/metadata-manager.js';
import { IncrementNumberManager } from '../../../core/increment/increment-utils.js';
import {
  detectMultiProjectMode,
  type MultiProjectDetectionResult,
  type DetectedProject
} from '../../../utils/multi-project-detector.js';

export interface InitialIncrementOptions {
  projectPath: string;
  projectName: string;
  techStack?: string;
  language?: string;
}

/**
 * Generate initial increment (XXXX-project-setup) during init
 *
 * Creates:
 * - .specweave/increments/XXXX-project-setup/ (where XXXX is next available ID)
 * - spec.md (basic project setup requirements)
 * - plan.md (placeholder for implementation plan)
 * - tasks.md (initial setup tasks)
 * - metadata.json (ACTIVE status)
 *
 * Note: Uses IncrementNumberManager to get the next available ID,
 * preventing collision with archived increments.
 */
export async function generateInitialIncrement(options: InitialIncrementOptions): Promise<string> {
  const { projectPath, projectName, techStack, language = 'en' } = options;

  // CRITICAL FIX (v1.0.160): Use IncrementNumberManager to get next available ID
  // This prevents ID collision with archived increments (e.g., 0001-core-framework in _archive)
  const nextNumber = IncrementNumberManager.getNextIncrementNumber(projectPath);
  const incrementId = `${nextNumber}-project-setup`;
  const incrementPath = path.join(projectPath, '.specweave', 'increments', incrementId);

  // Read config to get testMode and coverageTarget defaults
  const configPath = path.join(projectPath, '.specweave', 'config.json');
  let testMode: 'TDD' | 'test-after' | 'manual' = 'test-after';
  let coverageTarget = 80;

  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      testMode = config?.testing?.defaultTestMode || 'test-after';
      coverageTarget = config?.testing?.defaultCoverageTarget || 80;
    } catch (error) {
      // Fallback to defaults if config reading fails
    }
  }

  // Detect multi-project mode
  const multiProjectDetection = detectMultiProjectMode(projectPath);

  // Create increment directory
  fs.ensureDirSync(incrementPath);

  // CRITICAL: Generate metadata.json FIRST!
  // The metadata-json-guard.sh hook blocks spec.md creation if metadata.json doesn't exist.
  // This prevents broken increments that lack proper tracking.
  const metadata: IncrementMetadata = {
    id: incrementId,
    type: IncrementType.FEATURE,
    status: IncrementStatus.ACTIVE,
    created: new Date().toISOString().split('T')[0],
    lastActivity: new Date().toISOString().split('T')[0],
    testMode: testMode,  // FROM CONFIG!
    coverageTarget: coverageTarget  // FROM CONFIG!
  };

  // Write metadata using explicit rootDir parameter (no process.chdir needed!)
  MetadataManager.write(incrementId, metadata, projectPath);

  // Generate spec.md (now allowed - metadata.json exists)
  const specContent = generateSpecMd(incrementId, projectName, techStack, testMode, coverageTarget, multiProjectDetection);
  fs.writeFileSync(path.join(incrementPath, 'spec.md'), specContent, 'utf-8');

  // Generate plan.md
  const planContent = generatePlanMd(incrementId, projectName);
  fs.writeFileSync(path.join(incrementPath, 'plan.md'), planContent, 'utf-8');

  // Generate tasks.md
  const tasksContent = generateTasksMd(incrementId, projectName, techStack);
  fs.writeFileSync(path.join(incrementPath, 'tasks.md'), tasksContent, 'utf-8');

  return incrementId;
}

/**
 * Generate spec.md content
 */
function generateSpecMd(
  incrementId: string,
  projectName: string,
  techStack: string | undefined,
  testMode: 'TDD' | 'test-after' | 'manual',
  coverageTarget: number,
  multiProjectDetection?: MultiProjectDetectionResult
): string {
  const techStackSection = techStack
    ? `**Tech Stack**: ${techStack}\n`
    : '';

  const isMultiProject = multiProjectDetection?.isMultiProject ?? false;
  const projects = multiProjectDetection?.projects ?? [];

  // Generate frontmatter based on multi-project mode
  const frontmatter = generateFrontmatter(incrementId, testMode, coverageTarget, isMultiProject, projects);

  // Generate user stories based on multi-project mode
  const userStoriesSection = isMultiProject && projects.length > 0
    ? generateMultiProjectUserStories(projects)
    : generateSingleProjectUserStories();

  return `${frontmatter}

# Feature: Project Setup

## Overview

Initialize ${projectName} with SpecWeave framework and establish development workflow.

${techStackSection}
**Business Impact**: Foundation for spec-driven development process.

---

${userStoriesSection}

---

## Notes

**IMPORTANT**: This is your initial increment created by \`specweave init\`.
${isMultiProject ? `
**Multi-Project Mode Detected**: ${multiProjectDetection?.detectionReason}
**Projects**: ${projects.map(p => `${p.prefix} (${p.id})`).join(', ')}
` : ''}
**Next steps**:
1. Review this spec and customize it for your project
2. Run \`/sw:plan\` to generate implementation tasks
3. Run \`/sw:do\` to start working on tasks
4. Create your first feature with \`/sw:increment "your-feature"\`

**Folder Organization**:
Keep increment root clean - only these files allowed at root:
- \`spec.md\`, \`plan.md\`, \`tasks.md\`, \`metadata.json\`

Everything else goes in subfolders:
- \`reports/\` - Completion reports, investigation findings
- \`scripts/\` - Helper scripts, automation tools
- \`logs/\` - Debug logs, execution traces
- \`backups/\` - Backup files
- \`docs/\` - Additional documentation

You can also delete this increment if you prefer to start fresh:
- Delete \`.specweave/increments/${incrementId}/\`
- Create your first real increment with \`/sw:increment "my-feature"\`
`;
}

/**
 * Generate YAML frontmatter for spec.md
 */
function generateFrontmatter(
  incrementId: string,
  testMode: 'TDD' | 'test-after' | 'manual',
  coverageTarget: number,
  isMultiProject: boolean,
  projects: DetectedProject[]
): string {
  const date = new Date().toISOString().split('T')[0];

  let yaml = `---
increment: ${incrementId}
title: "Project Setup"
type: feature
priority: P0
status: active
created: ${date}
epic: SETUP-001
test_mode: ${testMode}
coverage_target: ${coverageTarget}`;

  if (isMultiProject && projects.length > 0) {
    yaml += `
multi_project: true
projects:`;
    for (const project of projects) {
      yaml += `
  - id: ${project.id}
    prefix: ${project.prefix}`;
    }
  }

  yaml += `
---`;

  return yaml;
}

/**
 * Generate user stories for single-project mode
 */
function generateSingleProjectUserStories(): string {
  return `## User Stories

### US-001: Development Environment

**As a** developer
**I want** a properly configured development environment
**So that** I can start building features immediately

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Project structure created with .specweave/ folder
  - **Priority**: P0 (Critical)
  - **Testable**: Yes

- [ ] **AC-US1-02**: Documentation framework initialized
  - **Priority**: P0 (Critical)
  - **Testable**: Yes

- [ ] **AC-US1-03**: SpecWeave commands available (/sw:increment, /sw:do, etc.)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes`;
}

/**
 * Generate user stories for multi-project mode
 */
function generateMultiProjectUserStories(projects: DetectedProject[]): string {
  let content = `## User Stories by Project

**Projects Involved**:
| Project | Scope | Keywords |
|---------|-------|----------|`;

  for (const project of projects) {
    content += `
| ${project.prefix} (${project.name}) | Project setup and configuration | setup, config, structure |`;
  }

  content += `

**Cross-Project Dependencies**:
- All projects share the common .specweave/ structure
- Living docs synchronized across all projects

---`;

  // Generate user stories for each project
  let storyNum = 1;
  for (const project of projects) {
    const prefix = project.prefix.toUpperCase();
    const paddedNum = String(storyNum).padStart(3, '0');

    content += `

### ${project.name} (${project.id})

#### US-${prefix}-${paddedNum}: ${project.name} Environment Setup (P0)
**Related Repo**: ${project.id}
**As a** developer working on ${project.name.toLowerCase()}
**I want** the ${project.name.toLowerCase()} project properly configured
**So that** I can start building ${project.name.toLowerCase()} features immediately

**Acceptance Criteria**:
- [ ] **AC-${prefix}-US${storyNum}-01**: Project structure initialized
  - Priority: P0 (Critical)
  - Testable: Yes
- [ ] **AC-${prefix}-US${storyNum}-02**: Dependencies installed and configured
  - Priority: P0 (Critical)
  - Testable: Yes
- [ ] **AC-${prefix}-US${storyNum}-03**: Development tooling ready
  - Priority: P0 (Critical)
  - Testable: Yes`;

    storyNum++;
  }

  return content;
}

/**
 * Generate plan.md content
 */
function generatePlanMd(incrementId: string, projectName: string): string {
  return `---
increment: ${incrementId}
generated: ${new Date().toISOString()}
---

# Implementation Plan: Project Setup

## Overview

Initial setup for ${projectName} with SpecWeave framework.

---

## Implementation Steps

### Phase 1: Environment Setup ✅

**Status**: COMPLETED (via \`specweave init\`)

Steps completed:
1. ✅ Created .specweave/ directory structure
2. ✅ Initialized git repository
3. ✅ Created CLAUDE.md and AGENTS.md instruction files
4. ✅ Configured SpecWeave plugins (Claude Code)

### Phase 2: First Feature Planning

**Status**: PENDING (ready when you are!)

Next actions:
1. Customize this increment spec to match your project goals
2. OR delete this increment and create your first real feature:
   \`\`\`
   /sw:increment "user-authentication"
   /sw:increment "api-endpoints"
   /sw:increment "database-schema"
   \`\`\`

---

## Notes

This is a placeholder plan created by \`specweave init\`.

**Folder Organization Reminder**:
- Keep increment root clean: only spec.md, plan.md, tasks.md, metadata.json
- Use subfolders: reports/, scripts/, logs/, backups/, docs/

**Recommended**: Create a new increment for your first real feature instead of using this setup increment.
`;
}

/**
 * Generate tasks.md content
 */
function generateTasksMd(incrementId: string, projectName: string, techStack?: string): string {
  const techStackNote = techStack
    ? `\n**Tech Stack**: ${techStack}`
    : '';

  return `---
increment: ${incrementId}
total_tasks: 1
completed_tasks: 1
---

# Tasks: Project Setup${techStackNote}

## User Story: US-001 - Development Environment

**Linked ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Tasks**: 1 total, 1 completed

---

### T-001: Initialize SpecWeave Framework

**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
**Priority**: P0 (Critical)
**Estimated Effort**: 0 hours (automated)

**Description**:
Ran \`specweave init\` to create project structure, install plugins, and configure framework.

**Implementation Steps**:
1. ✅ Created .specweave/ directory with increments, docs folders
2. ✅ Generated CLAUDE.md and AGENTS.md instruction files
3. ✅ Initialized git repository
4. ✅ Created this initial increment (${incrementId})

**Test Plan**:
- **Manual**: Verify \`/sw:status\` shows active increment
- **Manual**: Verify SpecWeave commands available

**Files Affected**:
- \`.specweave/\` (entire structure)
- \`CLAUDE.md\`, \`AGENTS.md\`, \`README.md\`

---

## Next Steps

This initial increment is now **COMPLETE**. You have two options:

### Option 1: Start Fresh (Recommended)
Delete this increment and create your first real feature:
\`\`\`bash
rm -rf .specweave/increments/${incrementId}
/sw:increment "your-first-feature"
\`\`\`

### Option 2: Customize This Increment
Keep this increment and add your own tasks:
\`\`\`bash
/sw:plan  # Regenerate tasks based on updated spec.md
/sw:do    # Start working on tasks
\`\`\`

**Folder Organization Tip**:
As you work on increments, keep the root clean. Only these files should be at increment root:
- spec.md, plan.md, tasks.md, metadata.json

Put everything else in subfolders:
- reports/ (completion reports, summaries)
- scripts/ (helper scripts, tools)
- logs/ (debug logs, traces)
- backups/ (backup files)
- docs/ (additional documentation)

**Recommended**: Go with Option 1 and create meaningful increments for your project!
`;
}
