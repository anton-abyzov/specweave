/**
 * Initial Increment Generator
 *
 * Automatically creates increment 0001-project-setup during `specweave init`
 * so users have a valid starting point to work from.
 *
 * Part of: Empty increments folder fix (2025-11-19)
 */

import fs from 'fs-extra';
import path from 'path';
import { IncrementStatus, IncrementType, IncrementMetadata } from '../../../core/types/increment-metadata.js';
import { MetadataManager } from '../../../core/increment/metadata-manager.js';

export interface InitialIncrementOptions {
  projectPath: string;
  projectName: string;
  techStack?: string;
  language?: string;
}

/**
 * Generate initial increment (0001-project-setup) during init
 *
 * Creates:
 * - .specweave/increments/0001-project-setup/
 * - spec.md (basic project setup requirements)
 * - plan.md (placeholder for implementation plan)
 * - tasks.md (initial setup tasks)
 * - metadata.json (ACTIVE status)
 */
export async function generateInitialIncrement(options: InitialIncrementOptions): Promise<string> {
  const { projectPath, projectName, techStack, language = 'en' } = options;

  const incrementId = '0001-project-setup';
  const incrementPath = path.join(projectPath, '.specweave', 'increments', incrementId);

  // Create increment directory
  fs.ensureDirSync(incrementPath);

  // Generate spec.md
  const specContent = generateSpecMd(projectName, techStack);
  fs.writeFileSync(path.join(incrementPath, 'spec.md'), specContent, 'utf-8');

  // Generate plan.md
  const planContent = generatePlanMd(projectName);
  fs.writeFileSync(path.join(incrementPath, 'plan.md'), planContent, 'utf-8');

  // Generate tasks.md
  const tasksContent = generateTasksMd(projectName, techStack);
  fs.writeFileSync(path.join(incrementPath, 'tasks.md'), tasksContent, 'utf-8');

  // Generate metadata.json
  const metadata: IncrementMetadata = {
    id: incrementId,
    type: IncrementType.FEATURE,
    status: IncrementStatus.ACTIVE,
    created: new Date().toISOString().split('T')[0],
    lastActivity: new Date().toISOString().split('T')[0],
    testMode: 'test-after',
    coverageTarget: 80
  };

  // Write metadata using explicit rootDir parameter (no process.chdir needed!)
  MetadataManager.write(incrementId, metadata, projectPath);

  return incrementId;
}

/**
 * Generate spec.md content
 */
function generateSpecMd(projectName: string, techStack?: string): string {
  const techStackSection = techStack
    ? `**Tech Stack**: ${techStack}\n`
    : '';

  return `---
increment: 0001-project-setup
title: "Project Setup"
type: feature
priority: P0
status: active
created: ${new Date().toISOString().split('T')[0]}
epic: SETUP-001
test_mode: test-after
coverage_target: 80
---

# Feature: Project Setup

## Overview

Initialize ${projectName} with SpecWeave framework and establish development workflow.

${techStackSection}
**Business Impact**: Foundation for spec-driven development process.

---

## User Stories

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

- [ ] **AC-US1-03**: SpecWeave commands available (/specweave:increment, /specweave:do, etc.)
  - **Priority**: P0 (Critical)
  - **Testable**: Yes

---

## Notes

**IMPORTANT**: This is your initial increment created by \`specweave init\`.

**Next steps**:
1. Review this spec and customize it for your project
2. Run \`/specweave:plan\` to generate implementation tasks
3. Run \`/specweave:do\` to start working on tasks
4. Create your first feature with \`/specweave:increment "your-feature"\`

You can also delete this increment if you prefer to start fresh:
- Delete \`.specweave/increments/0001-project-setup/\`
- Create your first real increment with \`/specweave:increment "my-feature"\`
`;
}

/**
 * Generate plan.md content
 */
function generatePlanMd(projectName: string): string {
  return `---
increment: 0001-project-setup
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
   /specweave:increment "user-authentication"
   /specweave:increment "api-endpoints"
   /specweave:increment "database-schema"
   \`\`\`

---

## Notes

This is a placeholder plan created by \`specweave init\`.

**Recommended**: Create a new increment for your first real feature instead of using this setup increment.
`;
}

/**
 * Generate tasks.md content
 */
function generateTasksMd(projectName: string, techStack?: string): string {
  const techStackNote = techStack
    ? `\n**Tech Stack**: ${techStack}`
    : '';

  return `---
increment: 0001-project-setup
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
4. ✅ Created this initial increment (0001-project-setup)

**Test Plan**:
- **Manual**: Verify \`/specweave:status\` shows active increment
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
rm -rf .specweave/increments/0001-project-setup
/specweave:increment "your-first-feature"
\`\`\`

### Option 2: Customize This Increment
Keep this increment and add your own tasks:
\`\`\`bash
/specweave:plan  # Regenerate tasks based on updated spec.md
/specweave:do    # Start working on tasks
\`\`\`

**Recommended**: Go with Option 1 and create meaningful increments for your project!
`;
}
