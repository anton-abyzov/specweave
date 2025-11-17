/**
 * Agent Invoker - Orchestrates AI agent invocations for plan generation
 *
 * This module provides utilities to invoke the Architect and test-aware-planner
 * agents within the Claude Code ecosystem.
 *
 * @module cli/commands/plan/agent-invoker
 * @since v0.22.0 (Increment 0039)
 */

import fs from 'fs';
import path from 'path';
import { PlanPipelineContext } from './types.js';

/**
 * Agent invocation result
 */
export interface AgentInvocationResult {
  success: boolean;
  content?: string;
  error?: string;
  agentName: string;
  executionMode: 'interactive' | 'instruction';
}

/**
 * Agent Invoker - Coordinates agent invocations for plan generation
 */
export class AgentInvoker {
  /**
   * Invoke Architect Agent to generate plan.md
   *
   * @param context - Pipeline context with spec.md content
   * @returns Agent invocation result with generated plan.md content
   */
  async invokeArchitectAgent(context: PlanPipelineContext): Promise<AgentInvocationResult> {
    const specContent = context.specContent;
    const incrementId = context.incrementId;

    // Read spec.md to extract requirements
    const requirements = this.extractRequirements(specContent);
    const userStories = this.extractUserStories(specContent);
    const acceptanceCriteria = this.extractAcceptanceCriteria(specContent);

    // Generate architectural plan instructions
    const architectPrompt = this.buildArchitectPrompt(
      incrementId,
      requirements,
      userStories,
      acceptanceCriteria
    );

    // In Claude Code context, this would be picked up by the Architect agent
    // For now, return instruction mode with generated content
    return {
      success: true,
      content: architectPrompt,
      agentName: 'architect',
      executionMode: 'instruction'
    };
  }

  /**
   * Invoke test-aware-planner Agent to generate tasks.md
   *
   * @param context - Pipeline context with spec.md and plan.md content
   * @returns Agent invocation result with generated tasks.md content
   */
  async invokeTestAwarePlanner(context: PlanPipelineContext): Promise<AgentInvocationResult> {
    const specContent = context.specContent;
    const planContent = context.generatedPlanContent!;
    const incrementId = context.incrementId;

    // Extract data from spec and plan
    const acceptanceCriteria = this.extractAcceptanceCriteria(specContent);
    const phases = this.extractPhases(planContent);
    const components = this.extractComponents(planContent);

    // Generate task planning instructions
    const plannerPrompt = this.buildPlannerPrompt(
      incrementId,
      acceptanceCriteria,
      phases,
      components
    );

    return {
      success: true,
      content: plannerPrompt,
      agentName: 'test-aware-planner',
      executionMode: 'instruction'
    };
  }

  /**
   * Extract requirements from spec.md
   */
  private extractRequirements(specContent: string): string[] {
    const requirements: string[] = [];
    const reqRegex = /(?:^|\n)(?:###?|#{1,3})\s*(?:Requirement|FR-|NFR-|Functional|Non-Functional).*$/gim;
    const matches = specContent.matchAll(reqRegex);

    for (const match of matches) {
      requirements.push(match[0].trim());
    }

    return requirements;
  }

  /**
   * Extract user stories from spec.md
   */
  private extractUserStories(specContent: string): string[] {
    const userStories: string[] = [];
    const usRegex = /(?:^|\n)(?:###?)\s*(?:US-\d+|User Story).*$/gim;
    const matches = specContent.matchAll(usRegex);

    for (const match of matches) {
      userStories.push(match[0].trim());
    }

    return userStories;
  }

  /**
   * Extract acceptance criteria from spec.md
   */
  private extractAcceptanceCriteria(specContent: string): Map<string, string[]> {
    const acMap = new Map<string, string[]>();
    const acRegex = /-\s*\[[ x]\]\s*(AC-\w+-\d+):\s*(.+)/gi;
    const matches = specContent.matchAll(acRegex);

    for (const match of matches) {
      const acId = match[1];
      const acText = match[2];

      if (!acMap.has(acId)) {
        acMap.set(acId, []);
      }
      acMap.get(acId)!.push(acText);
    }

    return acMap;
  }

  /**
   * Extract implementation phases from plan.md
   */
  private extractPhases(planContent: string): string[] {
    const phases: string[] = [];
    const phaseRegex = /(?:^|\n)(?:###?)\s*(?:Phase \d+|Stage \d+).*$/gim;
    const matches = planContent.matchAll(phaseRegex);

    for (const match of matches) {
      phases.push(match[0].trim());
    }

    return phases;
  }

  /**
   * Extract components from plan.md
   */
  private extractComponents(planContent: string): string[] {
    const components: string[] = [];
    const compRegex = /(?:^|\n)(?:###?)\s*(?:Component|Module|Service).*$/gim;
    const matches = planContent.matchAll(compRegex);

    for (const match of matches) {
      components.push(match[0].trim());
    }

    return components;
  }

  /**
   * Build prompt for Architect Agent
   */
  private buildArchitectPrompt(
    incrementId: string,
    requirements: string[],
    userStories: string[],
    acceptanceCriteria: Map<string, string[]>
  ): string {
    return `# Architect Agent Invocation for ${incrementId}

## Task
Create a comprehensive implementation plan (plan.md) for increment ${incrementId}.

## Requirements Summary
${requirements.length > 0 ? requirements.join('\n') : 'No explicit requirements found - extract from user stories.'}

## User Stories
${userStories.length > 0 ? userStories.join('\n') : 'No user stories found - check spec.md structure.'}

## Acceptance Criteria
Total AC count: ${acceptanceCriteria.size}

## Expected Output
Generate a plan.md file that includes:

1. **Architecture Overview**
   - System components and their interactions
   - Technology stack decisions
   - Design patterns to be used

2. **Implementation Phases**
   - Break down work into logical phases
   - Define dependencies between phases
   - Estimate effort for each phase

3. **Component Design**
   - Detailed design for each major component
   - API contracts and interfaces
   - Data models and schemas

4. **Technology Stack**
   - Framework/library selection with rationale
   - Architecture decisions (ADRs if significant)

5. **Testing Strategy**
   - Unit test approach
   - Integration test approach
   - E2E test approach
   - Coverage targets (95% for this increment)

6. **Deployment Architecture** (if applicable)
   - Infrastructure requirements
   - Deployment strategy

## Format
Follow the standard SpecWeave plan.md format with:
- YAML frontmatter (increment ID, architecture docs references)
- Clear section headers
- Markdown formatting
- Mermaid diagrams where helpful

## Constraints
- Must cover all ${acceptanceCriteria.size} acceptance criteria
- Must be implementable with SpecWeave's tech stack (TypeScript, Node.js)
- Must align with existing SpecWeave architecture
`;
  }

  /**
   * Build prompt for test-aware-planner Agent
   */
  private buildPlannerPrompt(
    incrementId: string,
    acceptanceCriteria: Map<string, string[]>,
    phases: string[],
    components: string[]
  ): string {
    const acList = Array.from(acceptanceCriteria.keys());

    return `# Test-Aware Planner Invocation for ${incrementId}

## Task
Generate a tasks.md file with embedded test plans for increment ${incrementId}.

## Input Summary

### Acceptance Criteria (${acList.length} total)
${acList.join(', ')}

### Implementation Phases (${phases.length} phases)
${phases.join('\n')}

### Components (${components.length} components)
${components.join('\n')}

## Expected Output

Generate tasks.md with:

1. **Task Breakdown**
   - Each task implements 1-3 related acceptance criteria
   - Clear task IDs (T-001, T-002, etc.)
   - Sequential ordering with dependencies

2. **Embedded Test Plans**
   - BDD format (Given/When/Then)
   - Specific test cases (unit/integration/E2E)
   - Coverage targets (95% for this increment)

3. **Task Format**
\`\`\`markdown
### T-001: [Task Name]

**User Story**: [US reference]
**AC**: AC-US##-##
**Priority**: P1
**Estimate**: X hours

**Test Plan**:
- **Given** [precondition]
- **When** [action]
- **Then** [expected outcome]

**Test Cases**:
1. **Unit**: tests/unit/[file].test.ts
   - [test case description]
   - Coverage Target: 95%

2. **Integration**: tests/integration/[file].test.ts
   - [test case description]

**Dependencies**: T-XXX (if any)
\`\`\`

4. **Coverage Requirements**
   - Overall target: 95%
   - Critical paths: 100%
   - Edge cases: 90%+

5. **Test Mode**
   - TDD (Test-Driven Development)
   - Write tests first, then implementation

## Constraints
- Must cover ALL ${acList.length} acceptance criteria
- Each AC must map to at least one task
- No task should take more than 8 hours
- Follow SpecWeave testing conventions
`;
  }

  /**
   * Generate plan.md content (temporary implementation)
   *
   * This generates a basic plan structure. In production, this would be
   * replaced by actual Architect Agent invocation.
   */
  generateTemporaryPlan(context: PlanPipelineContext): string {
    const { incrementId, specContent } = context;
    const requirements = this.extractRequirements(specContent);
    const userStories = this.extractUserStories(specContent);

    return `---
increment: ${incrementId}
architecture_docs:
  - ../../docs/internal/architecture/system-design.md
---

# Implementation Plan: ${incrementId}

**Status**: Planning
**Created**: ${new Date().toISOString().split('T')[0]}

---

## Architecture Overview

**Component Design**: To be defined by Architect Agent

**Technology Stack**: SpecWeave standard stack (TypeScript, Node.js, Jest)

---

## Implementation Phases

### Phase 1: Foundation
- Requirements analysis
- Architecture design
- Technology selection

### Phase 2: Implementation
- Core component development
- Integration
- Testing

### Phase 3: Polish
- UX refinement
- Documentation
- Performance optimization

---

## User Stories Summary

${userStories.length} user stories identified:
${userStories.map((us, i) => `${i + 1}. ${us}`).join('\n')}

---

## Testing Strategy

**Test Mode**: TDD
**Coverage Target**: 95%

**Approach**:
- Unit tests: 100+ test cases
- Integration tests: 40+ scenarios
- E2E tests: 15+ workflows

---

**Note**: This is a placeholder plan. Run the Architect Agent to generate the complete implementation plan.
`;
  }

  /**
   * Generate tasks.md content (temporary implementation)
   */
  generateTemporaryTasks(context: PlanPipelineContext): string {
    const { incrementId, specContent } = context;
    const acceptanceCriteria = this.extractAcceptanceCriteria(specContent);

    return `# Tasks: ${incrementId}

---
increment: ${incrementId}
status: planned
test_mode: TDD
coverage_target: 95%
---

## Phase 1: Foundation

### T-001: Setup and Planning

**AC**: ${Array.from(acceptanceCriteria.keys()).slice(0, 3).join(', ')}
**Priority**: P1
**Estimate**: 4 hours

**Test Plan**:
- **Given** project structure exists
- **When** setup is complete
- **Then** all dependencies are installed and build passes

**Test Cases**:
1. **Unit**: tests/unit/setup.test.ts
   - Should install dependencies successfully
   - Should compile TypeScript without errors
   - Coverage Target: 95%

**Status**: [ ] pending

---

**Note**: This is a placeholder tasks file. Run the test-aware-planner Agent to generate the complete task breakdown with embedded test plans.

**Total Acceptance Criteria**: ${acceptanceCriteria.size}
**Mapped to Tasks**: 1 (placeholder)
**Unmapped**: ${acceptanceCriteria.size - 1} (requires full task generation)
`;
  }
}
