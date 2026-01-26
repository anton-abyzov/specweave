/**
 * Increment Template Creator
 *
 * Creates TEMPLATE files for new increments that MUST be completed
 * via PM/Architect skills. This prevents Claude from writing full
 * content directly and bypassing the skill system.
 *
 * CRITICAL: This is the ONLY sanctioned way to create increment files
 * during the increment-planner skill execution.
 *
 * @module template-creator
 * @since 1.0.162
 */

import * as fs from 'fs';
import * as path from 'path';
import { IncrementNumberManager } from './increment-utils.js';

/**
 * Template markers that indicate a file is still a template
 * and hasn't been completed by PM/Architect skills.
 */
export const TEMPLATE_MARKERS = {
  /** Marker for unfilled user story titles */
  STORY_TITLE: '[Story Title]',
  /** Marker for unfilled user type */
  USER_TYPE: '[user type]',
  /** Marker for unfilled goal */
  GOAL: '[goal]',
  /** Marker for unfilled benefit */
  BENEFIT: '[benefit]',
  /** Marker for unfilled criteria */
  CRITERION: '[Specific, testable criterion]',
  /** Marker for unfilled component */
  COMPONENT: '[Component 1]',
  /** Marker for unfilled description */
  DESCRIPTION: '[High-level description',
  /** Marker for placeholder project */
  PROJECT_PLACEHOLDER: '{{RESOLVED_PROJECT}}',
  /** Generic placeholder pattern */
  PLACEHOLDER_PATTERN: /\{\{[A-Z_]+\}\}/,
  /** Bracket placeholder pattern */
  BRACKET_PLACEHOLDER: /\[[A-Za-z][^\]]+\]/,
};

/**
 * Options for creating increment templates.
 */
export interface CreateTemplateOptions {
  /** Increment ID (e.g., "0001-stripe-dashboard-mvp") */
  incrementId: string;
  /** Feature title */
  title: string;
  /** Feature description (brief overview) */
  description: string;
  /** Project ID from context API */
  projectId: string;
  /** Board ID for 2-level structures (optional) */
  boardId?: string;
  /** Increment type (feature, hotfix, bug, etc.) */
  type?: string;
  /** Priority (P1, P2, P3) */
  priority?: string;
  /** Test mode from config */
  testMode?: string;
  /** Coverage target from config */
  coverageTarget?: number;
  /** Project root directory */
  projectRoot?: string;
}

/**
 * Result of template creation.
 */
export interface TemplateCreationResult {
  /** Whether creation was successful */
  success: boolean;
  /** Path to created increment directory */
  incrementPath: string;
  /** List of created files */
  createdFiles: string[];
  /** Error message if failed */
  error?: string;
  /** Guidance for next steps */
  nextSteps: string[];
}

/**
 * Creates increment template files programmatically.
 *
 * CRITICAL: This function creates TEMPLATE files with placeholders
 * that MUST be completed via PM/Architect skills. It does NOT
 * allow full content to be written directly.
 *
 * @param options - Template creation options
 * @returns Result of template creation
 *
 * @example
 * ```typescript
 * const result = await createIncrementTemplates({
 *   incrementId: '0001-stripe-dashboard',
 *   title: 'Stripe Dashboard MVP',
 *   description: 'React dashboard with Stripe checkout',
 *   projectId: 'stripe-dashboard',
 *   projectRoot: '/path/to/project'
 * });
 *
 * if (result.success) {
 *   console.log('Templates created:', result.createdFiles);
 *   console.log('Next steps:', result.nextSteps);
 * }
 * ```
 */
export async function createIncrementTemplates(
  options: CreateTemplateOptions
): Promise<TemplateCreationResult> {
  const {
    incrementId,
    title,
    description,
    projectId,
    boardId,
    type = 'feature',
    priority = 'P1',
    testMode = 'test-after',
    coverageTarget = 80,
    projectRoot = process.cwd(),
  } = options;

  const incrementsDir = path.join(projectRoot, '.specweave', 'increments');
  const incrementPath = path.join(incrementsDir, incrementId);
  const createdFiles: string[] = [];

  try {
    // Validate increment ID
    IncrementNumberManager.validateExplicitId(incrementId, projectRoot);

    // Create increment directory
    fs.mkdirSync(incrementPath, { recursive: true });

    // 1. Create metadata.json FIRST (required before spec.md)
    const metadataPath = path.join(incrementPath, 'metadata.json');
    const metadata = {
      id: incrementId,
      status: 'planned',
      type,
      priority,
      created: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      testMode,
      coverageTarget,
      feature_id: null,
      epic_id: null,
      externalLinks: {},
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    createdFiles.push('metadata.json');

    // 2. Create spec.md TEMPLATE
    const specPath = path.join(incrementPath, 'spec.md');
    const specContent = generateSpecTemplate({
      incrementId,
      title,
      description,
      projectId,
      boardId,
      type,
      priority,
      testMode,
      coverageTarget,
    });
    fs.writeFileSync(specPath, specContent);
    createdFiles.push('spec.md');

    // 3. Create plan.md TEMPLATE
    const planPath = path.join(incrementPath, 'plan.md');
    const planContent = generatePlanTemplate({ title });
    fs.writeFileSync(planPath, planContent);
    createdFiles.push('plan.md');

    // 4. Create tasks.md TEMPLATE
    const tasksPath = path.join(incrementPath, 'tasks.md');
    const tasksContent = generateTasksTemplate({ title, testMode });
    fs.writeFileSync(tasksPath, tasksContent);
    createdFiles.push('tasks.md');

    return {
      success: true,
      incrementPath,
      createdFiles,
      nextSteps: [
        `Complete product specification: Tell Claude "Complete the spec for increment ${incrementId}"`,
        `Design architecture: Tell Claude "Design architecture for increment ${incrementId}"`,
        `Generate tasks: Tell Claude "Create tasks for increment ${incrementId}"`,
      ],
    };
  } catch (error) {
    return {
      success: false,
      incrementPath,
      createdFiles,
      error: error instanceof Error ? error.message : String(error),
      nextSteps: [],
    };
  }
}

/**
 * Checks if a spec.md file is still a template (not yet completed).
 *
 * A file is considered a template if it contains:
 * - Template markers like [Story Title], [user type], etc.
 * - Placeholders like {{PROJECT_ID}}
 * - Less than 3 actual user stories defined
 *
 * @param specPath - Path to spec.md file
 * @returns True if file is still a template
 */
export function isTemplateFile(specPath: string): boolean {
  if (!fs.existsSync(specPath)) {
    return true; // Non-existent file is "template-like"
  }

  const content = fs.readFileSync(specPath, 'utf-8');

  // Check for template markers
  const hasTemplateMarkers =
    content.includes(TEMPLATE_MARKERS.STORY_TITLE) ||
    content.includes(TEMPLATE_MARKERS.USER_TYPE) ||
    content.includes(TEMPLATE_MARKERS.GOAL) ||
    content.includes(TEMPLATE_MARKERS.BENEFIT) ||
    content.includes(TEMPLATE_MARKERS.CRITERION) ||
    content.includes(TEMPLATE_MARKERS.PROJECT_PLACEHOLDER);

  // Check for placeholder patterns
  const hasPlaceholders =
    TEMPLATE_MARKERS.PLACEHOLDER_PATTERN.test(content) ||
    (TEMPLATE_MARKERS.BRACKET_PLACEHOLDER.test(content) &&
      content.includes('### US-'));

  // Check if acceptance criteria are still placeholders
  const acMatches = content.match(/\*\*AC-US\d+-\d+\*\*:/g) || [];
  const acWithPlaceholders =
    content.match(/\*\*AC-US\d+-\d+\*\*: \[/g) || [];
  const mostACsArePlaceholders =
    acMatches.length > 0 &&
    acWithPlaceholders.length >= acMatches.length * 0.5;

  return hasTemplateMarkers || hasPlaceholders || mostACsArePlaceholders;
}

/**
 * Validates that a spec.md file has been properly completed.
 *
 * @param specPath - Path to spec.md file
 * @returns Validation result with details
 */
export function validateSpecCompletion(specPath: string): {
  isComplete: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!fs.existsSync(specPath)) {
    return { isComplete: false, issues: ['spec.md does not exist'] };
  }

  const content = fs.readFileSync(specPath, 'utf-8');

  // Check for unfilled placeholders
  if (TEMPLATE_MARKERS.PLACEHOLDER_PATTERN.test(content)) {
    const matches = content.match(TEMPLATE_MARKERS.PLACEHOLDER_PATTERN) || [];
    issues.push(`Unfilled placeholders found: ${matches.join(', ')}`);
  }

  // Check for template markers
  if (content.includes(TEMPLATE_MARKERS.STORY_TITLE)) {
    issues.push('User story titles not filled in');
  }
  if (content.includes(TEMPLATE_MARKERS.USER_TYPE)) {
    issues.push('User types not specified');
  }
  if (content.includes(TEMPLATE_MARKERS.CRITERION)) {
    issues.push('Acceptance criteria not specified');
  }

  // Check minimum content
  const userStories = content.match(/### US-\d+:/g) || [];
  if (userStories.length < 1) {
    issues.push('No user stories defined');
  }

  const acceptanceCriteria = content.match(/\*\*AC-US\d+-\d+\*\*:/g) || [];
  if (acceptanceCriteria.length < 2) {
    issues.push('Insufficient acceptance criteria (need at least 2)');
  }

  return {
    isComplete: issues.length === 0,
    issues,
  };
}

/**
 * Generate spec.md template content.
 */
function generateSpecTemplate(options: {
  incrementId: string;
  title: string;
  description: string;
  projectId: string;
  boardId?: string;
  type: string;
  priority: string;
  testMode: string;
  coverageTarget: number;
}): string {
  const {
    incrementId,
    title,
    description,
    projectId,
    boardId,
    type,
    priority,
    testMode,
    coverageTarget,
  } = options;

  const date = new Date().toISOString().split('T')[0];
  const boardLine = boardId ? `**Board**: ${boardId}\n` : '';

  return `---
increment: ${incrementId}
title: "${title}"
type: ${type}
priority: ${priority}
status: planned
created: ${date}
structure: user-stories
test_mode: ${testMode}
coverage_target: ${coverageTarget}
---

# Feature: ${title}

## Overview

${description}

<!--
====================================================================
  TEMPLATE FILE - MUST BE COMPLETED VIA PM/ARCHITECT SKILLS
====================================================================

This is a TEMPLATE created by increment-planner.
DO NOT manually fill in the placeholders below.

To complete this specification, run:
  Tell Claude: "Complete the spec for increment ${incrementId}"

This will activate the PM skill which will:
- Define proper user stories with acceptance criteria
- Conduct market research and competitive analysis
- Create user personas
- Define success metrics

====================================================================
-->

## User Stories

### US-001: [Story Title] (P1)
**Project**: ${projectId}
${boardLine}
**As a** [user type]
**I want** [goal]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] **AC-US1-01**: [Specific, testable criterion]
- [ ] **AC-US1-02**: [Another criterion]

---

### US-002: [Story Title] (P2)
**Project**: ${projectId}
${boardLine}
**As a** [user type]
**I want** [goal]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] **AC-US2-01**: [Specific, testable criterion]
- [ ] **AC-US2-02**: [Another criterion]

## Functional Requirements

### FR-001: [Requirement]
[Detailed description]

## Success Criteria

[Measurable outcomes - metrics, KPIs]

## Out of Scope

[What this explicitly does NOT include]

## Dependencies

[Other features or systems this depends on]
`;
}

/**
 * Generate plan.md template content.
 */
function generatePlanTemplate(options: { title: string }): string {
  const { title } = options;

  return `# Implementation Plan: ${title}

<!--
====================================================================
  TEMPLATE FILE - MUST BE COMPLETED VIA ARCHITECT SKILL
====================================================================

This is a TEMPLATE created by increment-planner.
DO NOT manually fill in the placeholders below.

To complete this plan, run:
  Tell Claude: "Design architecture for increment [ID]"

This will activate the Architect skill which will:
- Create system architecture diagrams
- Define data models and API contracts
- Document architecture decisions (ADRs)
- Identify technical challenges

====================================================================
-->

## Overview

[Technical summary of implementation approach]

## Architecture

### Components
- [Component 1]: [Purpose]
- [Component 2]: [Purpose]

### Data Model
- [Entity 1]: [Fields, relationships]
- [Entity 2]: [Fields, relationships]

### API Contracts
- \`POST /api/resource\`: [Purpose, request/response]
- \`GET /api/resource/:id\`: [Purpose, request/response]

## Technology Stack

- **Language/Framework**: [Choice]
- **Libraries**: [List]
- **Tools**: [List]

**Architecture Decisions**:
- [Decision 1]: [Why this choice? Alternatives considered?]
- [Decision 2]: [Rationale]

## Implementation Phases

### Phase 1: Foundation
- [Setup, infrastructure, base components]

### Phase 2: Core Functionality
- [Primary features from P1 user stories]

### Phase 3: Enhancement
- [P2 features and optimizations]

## Testing Strategy

[High-level testing approach - details in tasks.md]

## Technical Challenges

### Challenge 1: [Description]
**Solution**: [Approach]
**Risk**: [Mitigation]
`;
}

/**
 * Generate tasks.md template content.
 *
 * IMPORTANT: TDD is an EXECUTION practice, NOT a planning practice.
 * Tasks.md templates are ALWAYS standard format during planning.
 * TDD discipline (RED-GREEN-REFACTOR) is enforced during task execution
 * via /sw:tdd-cycle, /sw:tdd-red, /sw:tdd-green, /sw:tdd-refactor commands.
 *
 * The testMode setting in config.json determines execution behavior, not template format.
 */
function generateTasksTemplate(options: {
  title: string;
  testMode: string;
}): string {
  const { title } = options;

  // ALWAYS use standard templates during planning
  // TDD is enforced at EXECUTION time via /sw:tdd-* commands
  return generateStandardTasksTemplate(title);
}

/**
 * Generate standard tasks template.
 *
 * NOTE: TDD-specific task generation was removed from planning phase.
 * TDD discipline (RED-GREEN-REFACTOR triplets) is applied at EXECUTION time
 * via the /sw:tdd-cycle, /sw:tdd-red, /sw:tdd-green, /sw:tdd-refactor commands.
 * See plugins/specweave/commands/tdd-*.md for TDD execution workflow.
 */
function generateStandardTasksTemplate(title: string): string {
  return `# Tasks: ${title}

<!--
====================================================================
  TEMPLATE FILE - MUST BE COMPLETED VIA TASK BUILDER SKILL
====================================================================

This is a TEMPLATE created by increment-planner.
DO NOT manually fill in the tasks below.

To complete this task list, run:
  Tell Claude: "Create tasks for increment [ID]"

This will activate the test-aware planner which will:
- Generate detailed implementation tasks
- Add embedded test plans (BDD format)
- Set task dependencies
- Assign model hints

====================================================================
-->

## Task Notation

- \`[T###]\`: Task ID
- \`[P]\`: Parallelizable
- \`[ ]\`: Not started
- \`[x]\`: Completed
- Model hints: haiku (simple), opus (default)

## Phase 1: Setup

- [ ] [T001] [P] haiku - Initialize project structure
- [ ] [T002] haiku - Setup testing framework

## Phase 2: Core Implementation

### US-001: [User Story Title] (P1)

#### T-003: Implement [component]

**Description**: [What needs to be done]

**References**: AC-US1-01, AC-US1-02

**Implementation Details**:
- [Step 1]
- [Step 2]

**Test Plan**:
- **File**: \`tests/unit/component.test.ts\`
- **Tests**:
  - **TC-001**: [Test name]
    - Given [precondition]
    - When [action]
    - Then [expected result]

**Dependencies**: None
**Status**: [ ] Not Started

## Phase 3: Testing

- [ ] [T050] Run integration tests
- [ ] [T051] Verify all acceptance criteria
`;
}

export default {
  createIncrementTemplates,
  isTemplateFile,
  validateSpecCompletion,
  TEMPLATE_MARKERS,
};
