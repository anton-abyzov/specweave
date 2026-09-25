/**
 * Increment Template Creator
 *
 * Creates TEMPLATE files for new increments that MUST be completed
 * via PM/Architect skills. This prevents Claude from writing full
 * content directly and bypassing the skill system.
 *
 * CRITICAL: This is the ONLY sanctioned way to create increment files
 * during the increment skill execution.
 *
 * @module template-creator
 * @since 1.0.162
 */

import * as fs from 'fs';
import * as path from 'path';
import { IncrementNumberManager } from './increment-utils.js';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { IncrementStatus } from '../types/increment-metadata.js';

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
  /** 2.0 spec.md: unfilled Problem section */
  PROBLEM: '[What is wrong today, for whom',
  /** 2.0 spec.md: unfilled Scope section */
  SCOPE_IN: '[what this increment ships]',
  /** spec.md: unfilled Approach section */
  APPROACH_FILES: '[Files that change, in order',
  /** Marker for unfilled component */
  COMPONENT: '[Component 1]',
  /** Marker for unfilled description */
  DESCRIPTION: '[High-level description',
  /** Marker for placeholder project */
  PROJECT_PLACEHOLDER: '{{RESOLVED_PROJECT}}',
  /** Generic placeholder pattern */
  PLACEHOLDER_PATTERN: /\{\{[A-Z_]+\}\}/,
  /** Bracket placeholder pattern (excludes markdown links, feature IDs, user story IDs, and known non-placeholder patterns) */
  BRACKET_PLACEHOLDER: /\[(?!FS-\d)(?!US-)(?!EXTERNAL)(?!DRAFT)(?!Imported)(?!x\])(?!X\])[A-Za-z][^\]]+\](?!\()/,
};

/**
 * Options for creating increment templates.
 */
/**
 * External source metadata for imported issues.
 * @since 1.0.272
 */
export interface ExternalSourceInfo {
  /** Source platform */
  platform: 'github' | 'jira' | 'ado';
  /** Platform-specific external ID (e.g., "github#owner/repo#123") */
  externalId: string;
  /** URL to the external issue */
  externalUrl: string;
  /** Original issue title */
  title: string;
  /** Original issue description/body */
  description: string;
  /** Extracted acceptance criteria */
  acceptanceCriteria?: string[];
  /** External labels/tags */
  labels?: string[];
  /** External priority */
  priority?: string;
  /** External status */
  status?: string;
}

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
  /** Project root directory */
  projectRoot?: string;
  /** External source metadata for imported issues (v1.0.272) */
  externalSource?: ExternalSourceInfo;
  /** Auto-generate increment ID atomically */
  autoId?: boolean;
  /**
   * Opt into 3-agent fan-out planning (0669 Wave 2, AC-US4-03).
   * When true, the increment skill routes planning through team-lead.
   * Default is single-agent planning. Persisted to metadata.planning
   * so downstream skills can read it.
   */
  parallel?: boolean;
  /** Increment name suffix (used with autoId) */
  name?: string;
  /**
   * Scaffold the optional `plan.md` overflow document (2.0 `--with-plan`).
   * Off by default: spec.md carries the Approach, and readers stay tolerant of
   * a plan.md that already exists (legacy increments).
   */
  withPlan?: boolean;
  /**
   * Create the increment in the `planned` state instead of `active`
   * (`create-increment --planned`) — for backlog / not-started-yet work.
   * `specweave start <id>` (or the first `task claim`) moves it to `active`.
   */
  planned?: boolean;
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
    incrementId: rawIncrementId,
    title,
    description,
    projectId,
    boardId,
    type = 'feature',
    priority = 'P1',
    projectRoot = resolveEffectiveRoot(),
    externalSource,
    autoId,
    name,
    parallel = false,
    withPlan = false,
    planned = false,
  } = options;

  const incrementsDir = path.join(projectRoot, '.specweave', 'increments');
  let incrementId = rawIncrementId;
  let incrementPath: string = path.join(incrementsDir, incrementId || '');
  const createdFiles: string[] = [];

  try {
    if (autoId && name) {
      // Atomic ID reservation: generate ID + mkdir in a retry loop
      const MAX_RETRIES = 10;
      let created = false;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const nextNumber = IncrementNumberManager.getNextIncrementNumber(projectRoot);
        incrementId = `${nextNumber}-${name}`;
        incrementPath = path.join(incrementsDir, incrementId);
        try {
          fs.mkdirSync(incrementPath, { recursive: false });
          created = true;
          break;
        } catch (err: any) {
          if (err.code === 'EEXIST') {
            // Another process claimed this ID — retry with fresh scan
            continue;
          }
          // ENOENT means parent dir doesn't exist — create it and retry
          if (err.code === 'ENOENT') {
            fs.mkdirSync(incrementsDir, { recursive: true });
            continue;
          }
          throw err;
        }
      }
      if (!created) {
        return {
          success: false,
          incrementPath: path.join(incrementsDir, incrementId),
          createdFiles,
          error: `Atomic ID reservation failed after ${MAX_RETRIES} retries. Could not claim a unique increment ID.`,
          nextSteps: [],
        };
      }
    } else {
      incrementPath = path.join(incrementsDir, incrementId);
      // Validate increment ID
      IncrementNumberManager.validateExplicitId(incrementId, projectRoot);

      // Create increment directory
      fs.mkdirSync(incrementPath, { recursive: true });
    }

    // 1. Create metadata.json FIRST (required before spec.md)
    const metadataPath = path.join(incrementPath, 'metadata.json');
    const metadata: Record<string, unknown> = {
      id: incrementId,
      // 2.0: step 1 of the loop MUST produce an increment the rest of the loop
      // can work on. `task next|list|claim`, `verify` and `handoff` all resolve
      // the single ACTIVE increment, so creating in any other state stranded
      // every bare-form command behind a hand-edit of metadata.json (which the
      // skills explicitly forbid). `--planned` opts into backlog-style creation.
      status: planned ? IncrementStatus.PLANNED : IncrementStatus.ACTIVE,
      type,
      priority,
      created: new Date().toISOString(),
      // 2.0 shape: `updated` is the documented field; `lastActivity` stays as
      // the legacy alias so the increments already on disk keep working. Both
      // are kept in step by MetadataManager and by every ledger append.
      updated: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      title,
      ...(parallel ? { planning: { parallel } } : {}),
    };

    // Add external source tracking for imported issues (v1.0.272)
    if (externalSource) {
      metadata.origin = 'external';
      metadata.source_platform = externalSource.platform;
      metadata.external_ref = externalSource.externalId;

      const now = new Date().toISOString();
      const platformLinks: Record<string, unknown> = {
        url: externalSource.externalUrl,
        synced: now,
      };

      // v1.0.358: Build userStories mapping for JIRA/ADO AC progress sync
      if (externalSource.platform === 'jira') {
        // Extract issue key from externalId (format: "jira#PROJECT#PROJ-123")
        const parts = externalSource.externalId.split('#');
        const issueKey = parts[parts.length - 1] || '';
        if (issueKey) {
          // Map US-001 (default single user story from import) to the JIRA issue
          platformLinks.userStories = {
            'US-001': {
              issueKey,
              issueUrl: externalSource.externalUrl,
              syncedAt: now,
            },
          };
          // Also set metadata.jira so sync-progress auto-build can find it
          metadata.jira = {
            issue: issueKey,
            url: externalSource.externalUrl,
            synced: now,
          };
        }
      } else if (externalSource.platform === 'ado') {
        // Extract work item ID from externalId (format: "ado#org/project#123")
        const parts = externalSource.externalId.split('#');
        const workItemId = parts[parts.length - 1] || '';
        if (workItemId) {
          platformLinks.userStories = {
            'US-001': {
              workItemId,
              workItemUrl: externalSource.externalUrl,
              syncedAt: now,
            },
          };
          metadata.ado = {
            workItem: parseInt(workItemId, 10) || workItemId,
            url: externalSource.externalUrl,
            synced: now,
          };
        }
      }

      metadata.externalLinks = {
        [externalSource.platform]: platformLinks,
      };
    }

    // Auto-populate project field for sync routing — always attempt, no flag gate
    try {
      const configPath = path.join(projectRoot, '.specweave', 'config.json');
      if (fs.existsSync(configPath)) {
        const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const detectedProject = detectProjectFromCwd(rawConfig, process.cwd(), projectRoot);
        if (detectedProject) {
          metadata.project = detectedProject;
        }
      }
    } catch {
      // Config load failure is non-fatal for project detection
    }

    if (boardId) metadata.board = boardId;

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    createdFiles.push('metadata.json');

    // 2. Create spec.md — the one file an agent reads. 3.0 keeps the task
    // definitions in its `## Tasks` section; there is no tasks.md and no
    // frontmatter (metadata.json is the only status store).
    const specPath = path.join(incrementPath, 'spec.md');
    const specContent = externalSource
      ? generateExternalSpecContent({ title, description, externalSource })
      : generateSpecTemplate({ title, description });
    fs.writeFileSync(specPath, specContent);
    createdFiles.push('spec.md');

    // 3. Create plan.md TEMPLATE — only on --with-plan. spec.md carries the
    // Approach; plan.md is an optional overflow, recognized when present.
    if (withPlan) {
      const planPath = path.join(incrementPath, 'plan.md');
      const planContent = generatePlanTemplate({ title });
      fs.writeFileSync(planPath, planContent);
      createdFiles.push('plan.md');
    }

    // 5. (0865 AC-US1-05) No rubric placeholder is scaffolded. The real,
    // AC-tied root rubric.md is produced post-planning by the generator
    // (`ensureRubricFile`, wired into the plan orchestrator + `generate-rubric`
    // CLI). A `status: template` placeholder under reports/ was dead weight —
    // the closure gate reads the ROOT rubric.md, never reports/.

    // Check for name duplicates (non-blocking warning)
    const nameSuffix = incrementId.replace(/^\d{3,4}[GJAE]?-/, '');
    if (nameSuffix) {
      const nameDuplicates = IncrementNumberManager.findNameDuplicates(nameSuffix, projectRoot);
      // Filter out the increment we just created
      const otherDuplicates = nameDuplicates.filter(d => d !== incrementId);
      if (otherDuplicates.length > 0) {
        console.warn(
          `Warning: Increment name "${nameSuffix}" already exists in: ${otherDuplicates.join(', ')}. ` +
          `Consider using a unique name to avoid confusion.`
        );
      }
    }

    const nextSteps = externalSource
      ? [
          `Imported from ${externalSource.platform}: ${externalSource.externalUrl}`,
          `Review and refine spec: sw:do ${incrementId}`,
          `Start working: sw:auto ${incrementId}`,
        ]
      : [
          `Fill in spec.md — Problem, Scope, ACs (- [ ] AC-01 …), Approach and Tasks (### T-01 … + "- AC: … | Files: … | Test: …")`,
          ...(planned ? [`Start it: specweave start ${incrementId}`] : []),
          `Work it: specweave task next → task claim T-01 → task done T-01 --run "<test>"`,
          `Close it: specweave verify ${incrementId} → specweave complete ${incrementId}`,
        ];

    return {
      success: true,
      incrementPath,
      createdFiles,
      nextSteps,
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
 * Detect project from current working directory using workspace config.
 *
 * Always attempts to match CWD against workspace.repos[].path.
 * No boolean flag gate — the repos array IS the config.
 *
 * @param config - Config object with optional workspace section
 * @param cwd - Current working directory
 * @param projectRoot - Project root path
 * @returns Matching repo ID, workspace.name as default, or undefined
 */
export function detectProjectFromCwd(
  config: { workspace?: { name?: string; repos?: Array<{ id: string; path: string }> } } | undefined,
  cwd: string,
  projectRoot: string,
): string | undefined {
  if (!config?.workspace) return undefined;

  const resolvedCwd = path.resolve(cwd);
  const repos = config.workspace.repos ?? [];

  // Longest prefix match for overlapping repo paths
  let bestMatch: { id: string; pathLength: number } | undefined;

  for (const repo of repos) {
    const repoAbsPath = path.resolve(projectRoot, repo.path);
    if (resolvedCwd === repoAbsPath || resolvedCwd.startsWith(repoAbsPath + path.sep)) {
      if (!bestMatch || repoAbsPath.length > bestMatch.pathLength) {
        bestMatch = { id: repo.id, pathLength: repoAbsPath.length };
      }
    }
  }

  if (bestMatch) return bestMatch.id;

  // CWD at project root or outside any repo — return workspace name
  return config.workspace.name;
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
    content.includes(TEMPLATE_MARKERS.PROBLEM) ||
    content.includes(TEMPLATE_MARKERS.SCOPE_IN) ||
    content.includes(TEMPLATE_MARKERS.APPROACH_FILES) ||
    content.includes(TEMPLATE_MARKERS.PROJECT_PLACEHOLDER);

  // Check for placeholder patterns (mustache-style {{VAR}} only)
  // NOTE: BRACKET_PLACEHOLDER check removed — it produced false positives on real specs
  // containing code references like [skillName], [status], [data-theme='dark'], etc.
  // Real templates are already caught by hasTemplateMarkers ([Story Title], [user type], etc.)
  // and mostACsArePlaceholders (50%+ ACs still have bracket content).
  const hasPlaceholders = TEMPLATE_MARKERS.PLACEHOLDER_PATTERN.test(content);

  // Check if acceptance criteria are still placeholders. Both AC shapes count:
  // 2.0 `- [ ] AC-01: …` and the 1.x `- [ ] **AC-US1-01**: …`.
  const acMatches = content.match(/^-\s+\[[ xX]\]\s+\*{0,2}AC-[A-Za-z0-9-]+\*{0,2}:/gm) || [];
  const acWithPlaceholders =
    content.match(/^-\s+\[[ xX]\]\s+\*{0,2}AC-[A-Za-z0-9-]+\*{0,2}:\s*\[/gm) || [];
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

  // Check minimum content. A 2.0 spec is Problem/Scope/AC/Approach with
  // `- [ ] AC-01: …` and has NO user-story section; a 1.x spec has both.
  const acceptanceCriteria =
    content.match(/^-\s+\[[ xX]\]\s+\*{0,2}AC-[A-Za-z0-9-]+\*{0,2}:/gm) || [];
  const userStories = content.match(/### US-(?:[A-Z]+-)*\d+:/g) || [];
  if (userStories.length < 1 && acceptanceCriteria.length < 1) {
    issues.push('No user stories or acceptance criteria defined');
  }

  if (acceptanceCriteria.length < 2) {
    issues.push('Insufficient acceptance criteria (need at least 2)');
  }

  for (const section of ['## Problem', '## Approach']) {
    if (userStories.length < 1 && !content.includes(section)) {
      issues.push(`Missing required section: ${section}`);
    }
  }

  return {
    isComplete: issues.length === 0,
    issues,
  };
}

/**
 * Generate the spec.md scaffold: one short file with every section an agent
 * fills in, bracketed placeholders only (detected by isTemplateFile), and no
 * instructional comment block to read and delete.
 */
function generateSpecTemplate(options: { title: string; description: string }): string {
  const { title, description } = options;
  return `# ${title}

## Problem

${description ? `${description}\n\n` : ''}[What is wrong today, for whom, and the evidence. Not the solution.]

## Scope

In: [what this increment ships]. Out: [what it does not include].

## Acceptance Criteria

- [ ] AC-01: [Specific, testable criterion]
- [ ] AC-02: [Specific, testable criterion]

## Approach

[Files that change, in order; key decisions; rejected alternatives; risks.]

## Open questions

- [question, or "none"]

## Tasks

### T-01 [First task]
- AC: AC-01 | Files: [src/file.ts, src/file.test.ts] | Test: [command]

### T-02 [Second task]
- AC: AC-02 | Files: [src/other.ts] | Test: [command]
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

This is a TEMPLATE created by increment skill.
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
 * Generate spec.md pre-filled from an external issue: its description as the
 * Problem, its acceptance criteria as ACs, and one task per AC.
 *
 * @since 1.0.272
 */
function generateExternalSpecContent(options: {
  title: string;
  description: string;
  externalSource: ExternalSourceInfo;
}): string {
  const { title, description, externalSource } = options;
  const date = new Date().toISOString().split('T')[0];
  const platformLabel = externalSource.platform === 'github' ? 'GitHub'
    : externalSource.platform === 'jira' ? 'JIRA'
    : 'Azure DevOps';

  const acs = externalSource.acceptanceCriteria ?? [];
  const acLines = acs.length > 0
    ? acs.map((ac, i) => `- [ ] AC-${String(i + 1).padStart(2, '0')}: ${ac}`).join('\n')
    : `- [ ] AC-01: [Review and define acceptance criteria from imported issue]`;
  const taskLines = (acs.length > 0 ? acs : ['[First task]']).map((ac, i) => {
    const num = String(i + 1).padStart(2, '0');
    return `### T-${num} ${ac}\n- AC: AC-${num} | Files: [src/...] | Test: [command]`;
  }).join('\n\n');
  const labels = externalSource.labels?.length ? ` · labels: ${externalSource.labels.join(', ')}` : '';

  return `# ${title}

## Problem

${description || `Imported from ${platformLabel}. See the original issue for full context.`}

Source: ${platformLabel} ${externalSource.externalUrl} (id ${externalSource.externalId}, imported ${date}${labels})

## Scope

In: resolve the imported ${platformLabel} issue. Out: [what it does not include].

## Acceptance Criteria

${acLines}

## Approach

[Files that change, in order; key decisions; rejected alternatives; risks.]

## Open questions

- [question, or "none"]

## Tasks

${taskLines}
`;
}

export default {
  createIncrementTemplates,
  isTemplateFile,
  validateSpecCompletion,
  TEMPLATE_MARKERS,
};
