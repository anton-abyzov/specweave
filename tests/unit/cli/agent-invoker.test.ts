import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for AgentInvoker
 *
 * Tests the agent invocation system that orchestrates Architect and test-aware-planner agents.
 *
 * Coverage target: 95%+
 */

import { AgentInvoker } from '../../../src/cli/commands/plan/agent-invoker.js';
import type { PlanPipelineContext } from '../../../src/cli/commands/plan/types.js';

describe('AgentInvoker', () => {
  let invoker: AgentInvoker;

  beforeEach(() => {
    invoker = new AgentInvoker();
  });

  describe('extractRequirements', () => {
    it('should extract functional requirements from spec.md', () => {
      const spec = `
# Feature Spec

## Functional Requirements

### FR-001: User Authentication
Users must be able to log in with email and password.

### FR-002: Password Reset
Users can reset their password via email.
`;

      const requirements = (invoker as any).extractRequirements(spec);

      expect(requirements.length).toBeGreaterThanOrEqual(2); // Includes section heading
      expect(requirements.some((r: string) => r.includes('FR-001'))).toBe(true);
      expect(requirements.some((r: string) => r.includes('FR-002'))).toBe(true);
    });

    it('should extract non-functional requirements', () => {
      const spec = `
## Non-Functional Requirements

### NFR-001: Performance
Response time < 200ms for 95% of requests.
`;

      const requirements = (invoker as any).extractRequirements(spec);

      expect(requirements.length).toBeGreaterThanOrEqual(1); // Includes section heading
      expect(requirements.some((r: string) => r.includes('NFR-001'))).toBe(true);
    });

    it('should return empty array when no requirements found', () => {
      const spec = `
# Feature Spec

Just a description with no requirements.
`;

      const requirements = (invoker as any).extractRequirements(spec);

      expect(requirements).toEqual([]);
    });

    it('should handle requirements with different heading levels', () => {
      const spec = `
# Requirements

## FR-001: Feature 1
### FR-002: Feature 2
#### FR-003: Feature 3
`;

      const requirements = (invoker as any).extractRequirements(spec);

      expect(requirements.length).toBeGreaterThan(0);
    });
  });

  describe('extractUserStories', () => {
    it('should extract user stories with US- prefix', () => {
      const spec = `
### US-001: Login Feature
**As a** user
**I want** to log in
**So that** I can access my account

### US-002: Logout Feature
**As a** user
**I want** to log out
`;

      const userStories = (invoker as any).extractUserStories(spec);

      expect(userStories).toHaveLength(2);
      expect(userStories[0]).toContain('US-001');
      expect(userStories[1]).toContain('US-002');
    });

    it('should extract user stories with "User Story" heading', () => {
      const spec = `
### User Story 1
Description here

### User Story 2
Another description
`;

      const userStories = (invoker as any).extractUserStories(spec);

      expect(userStories).toHaveLength(2);
    });

    it('should return empty array when no user stories found', () => {
      const spec = `# Feature Spec\n\nNo user stories here.`;

      const userStories = (invoker as any).extractUserStories(spec);

      expect(userStories).toEqual([]);
    });
  });

  describe('extractAcceptanceCriteria', () => {
    it('should extract acceptance criteria with AC-ID format', () => {
      const spec = `
- [ ] AC-US1-01: User can enter email and password
- [x] AC-US1-02: Form validates email format
- [ ] AC-US1-03: Login button is disabled when form invalid
`;

      const acMap = (invoker as any).extractAcceptanceCriteria(spec);

      expect(acMap.size).toBe(3);
      expect(acMap.has('AC-US1-01')).toBe(true);
      expect(acMap.has('AC-US1-02')).toBe(true);
      expect(acMap.has('AC-US1-03')).toBe(true);

      expect(acMap.get('AC-US1-01')).toEqual(['User can enter email and password']);
      expect(acMap.get('AC-US1-02')).toEqual(['Form validates email format']);
    });

    it('should handle checked acceptance criteria', () => {
      const spec = `
- [x] AC-US2-01: Completed criterion
- [ ] AC-US2-02: Incomplete criterion
`;

      const acMap = (invoker as any).extractAcceptanceCriteria(spec);

      expect(acMap.size).toBe(2);
      expect(acMap.has('AC-US2-01')).toBe(true);
      expect(acMap.has('AC-US2-02')).toBe(true);
    });

    it('should return empty map when no acceptance criteria found', () => {
      const spec = `# Feature Spec\n\nNo ACs here.`;

      const acMap = (invoker as any).extractAcceptanceCriteria(spec);

      expect(acMap.size).toBe(0);
    });

    it('should handle multiple ACs with same ID (unlikely but valid)', () => {
      const spec = `
- [ ] AC-US1-01: First instance
- [ ] AC-US1-01: Second instance
`;

      const acMap = (invoker as any).extractAcceptanceCriteria(spec);

      expect(acMap.size).toBe(1);
      expect(acMap.get('AC-US1-01')).toHaveLength(2);
    });
  });

  describe('extractPhases', () => {
    it('should extract implementation phases from plan.md', () => {
      const plan = `
### Phase 1: Foundation
Setup and infrastructure

### Phase 2: Implementation
Core features

### Phase 3: Testing
QA and validation
`;

      const phases = (invoker as any).extractPhases(plan);

      expect(phases).toHaveLength(3);
      expect(phases[0]).toContain('Phase 1');
      expect(phases[1]).toContain('Phase 2');
      expect(phases[2]).toContain('Phase 3');
    });

    it('should extract stages as well as phases', () => {
      const plan = `
### Stage 1: Planning
### Stage 2: Execution
`;

      const phases = (invoker as any).extractPhases(plan);

      expect(phases).toHaveLength(2);
      expect(phases[0]).toContain('Stage 1');
    });

    it('should return empty array when no phases found', () => {
      const plan = `# Implementation Plan\n\nNo phases defined.`;

      const phases = (invoker as any).extractPhases(plan);

      expect(phases).toEqual([]);
    });
  });

  describe('extractComponents', () => {
    it('should extract components from plan.md', () => {
      const plan = `
### Component: UserService
Handles user management

### Component: AuthService
Handles authentication

### Module: PaymentModule
Payment processing
`;

      const components = (invoker as any).extractComponents(plan);

      expect(components.length).toBeGreaterThanOrEqual(2);
      // Should find at least UserService and AuthService
    });

    it('should extract modules and services', () => {
      const plan = `
### Service: EmailService
### Module: NotificationModule
`;

      const components = (invoker as any).extractComponents(plan);

      expect(components.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array when no components found', () => {
      const plan = `# Implementation Plan\n\nNo components.`;

      const components = (invoker as any).extractComponents(plan);

      expect(components).toEqual([]);
    });
  });

  describe('buildArchitectPrompt', () => {
    it('should generate comprehensive architect prompt', () => {
      const prompt = (invoker as any).buildArchitectPrompt(
        '0039-test-increment',
        ['FR-001: Requirement 1', 'FR-002: Requirement 2'],
        ['US-001: Login', 'US-002: Logout'],
        new Map([
          ['AC-US1-01', ['Criterion 1']],
          ['AC-US1-02', ['Criterion 2']]
        ])
      );

      expect(prompt).toContain('0039-test-increment');
      expect(prompt).toContain('Architect Agent Invocation');
      expect(prompt).toContain('FR-001');
      expect(prompt).toContain('US-001');
      expect(prompt).toContain('Total AC count: 2');
      expect(prompt).toContain('Architecture Overview');
      expect(prompt).toContain('Implementation Phases');
      expect(prompt).toContain('Technology Stack');
    });

    it('should handle empty requirements gracefully', () => {
      const prompt = (invoker as any).buildArchitectPrompt(
        '0040-test',
        [],
        [],
        new Map()
      );

      expect(prompt).toContain('No explicit requirements found');
      expect(prompt).toContain('No user stories found');
      expect(prompt).toContain('Total AC count: 0');
    });

    it('should include all required sections in prompt', () => {
      const prompt = (invoker as any).buildArchitectPrompt(
        '0041-test',
        ['REQ1'],
        ['US1'],
        new Map([['AC1', ['desc']]])
      );

      // Verify all expected sections
      expect(prompt).toContain('## Task');
      expect(prompt).toContain('## Requirements Summary');
      expect(prompt).toContain('## User Stories');
      expect(prompt).toContain('## Acceptance Criteria');
      expect(prompt).toContain('## Expected Output');
      expect(prompt).toContain('## Format');
      expect(prompt).toContain('## Constraints');
    });
  });

  describe('buildPlannerPrompt', () => {
    it('should generate comprehensive planner prompt', () => {
      const prompt = (invoker as any).buildPlannerPrompt(
        '0039-test-increment',
        new Map([
          ['AC-US1-01', ['Criterion 1']],
          ['AC-US1-02', ['Criterion 2']],
          ['AC-US1-03', ['Criterion 3']]
        ]),
        ['Phase 1: Foundation', 'Phase 2: Implementation'],
        ['Component: UserService', 'Component: AuthService']
      );

      expect(prompt).toContain('0039-test-increment');
      expect(prompt).toContain('Test-Aware Planner Invocation');
      expect(prompt).toContain('(3 total)'); // AC count
      expect(prompt).toContain('(2 phases)');
      expect(prompt).toContain('(2 components)');
      expect(prompt).toContain('AC-US1-01');
      expect(prompt).toContain('95%'); // Coverage target
    });

    it('should include task format example', () => {
      const prompt = (invoker as any).buildPlannerPrompt(
        '0042-test',
        new Map(),
        [],
        []
      );

      expect(prompt).toContain('### T-001');
      expect(prompt).toContain('**Given**');
      expect(prompt).toContain('**When**');
      expect(prompt).toContain('**Then**');
      expect(prompt).toContain('Coverage Target: 95%');
    });

    it('should include TDD requirement', () => {
      const prompt = (invoker as any).buildPlannerPrompt(
        '0043-test',
        new Map(),
        [],
        []
      );

      expect(prompt).toContain('TDD');
      expect(prompt).toContain('Test-Driven Development');
    });
  });

  describe('invokeArchitectAgent', () => {
    it('should invoke architect agent with valid context', async () => {
      const context: PlanPipelineContext = {
        config: { incrementId: '0039-test' },
        incrementId: '0039-test',
        incrementPath: '/path/to/increment',
        specContent: `
# Feature Spec

## User Stories

### US-001: Login Feature
- [ ] AC-US1-01: User can login
- [ ] AC-US1-02: Form validates

## Requirements

### FR-001: Authentication
Users must authenticate.
`,
        startTime: Date.now(),
        errors: [],
        warnings: []
      };

      const result = await invoker.invokeArchitectAgent(context);

      expect(result.success).toBe(true);
      expect(result.agentName).toBe('architect');
      expect(result.content).toBeDefined();
      expect(result.content).toContain('Architect Agent Invocation');
      expect(result.executionMode).toBe('instruction');
    });

    it('should extract data from spec.md correctly', async () => {
      const context: PlanPipelineContext = {
        config: {},
        incrementId: '0040-test',
        incrementPath: '/path',
        specContent: `
### US-001: Test Story

**Acceptance Criteria**:
- [ ] AC-US1-01: Test criterion
- [ ] AC-US1-02: Another criterion

### FR-001: Test Requirement
`,
        startTime: Date.now(),
        errors: [],
        warnings: []
      };

      const result = await invoker.invokeArchitectAgent(context);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Total AC count: 2'); // AC count in prompt
      expect(result.content).toContain('FR-001');
    });
  });

  describe('invokeTestAwarePlanner', () => {
    it('should invoke planner with valid context', async () => {
      const context: PlanPipelineContext = {
        config: {},
        incrementId: '0041-test',
        incrementPath: '/path',
        specContent: `
- [ ] AC-US1-01: Criterion 1
- [ ] AC-US1-02: Criterion 2
`,
        generatedPlanContent: `
### Phase 1: Foundation
### Component: UserService
`,
        startTime: Date.now(),
        errors: [],
        warnings: []
      };

      const result = await invoker.invokeTestAwarePlanner(context);

      expect(result.success).toBe(true);
      expect(result.agentName).toBe('test-aware-planner');
      expect(result.content).toBeDefined();
      expect(result.content).toContain('Test-Aware Planner');
      expect(result.executionMode).toBe('instruction');
    });

    it('should extract AC-IDs from spec.md', async () => {
      const context: PlanPipelineContext = {
        config: {},
        incrementId: '0042-test',
        incrementPath: '/path',
        specContent: `
- [ ] AC-US1-01: First
- [ ] AC-US1-02: Second
- [ ] AC-US2-01: Third
`,
        generatedPlanContent: '# Plan',
        startTime: Date.now(),
        errors: [],
        warnings: []
      };

      const result = await invoker.invokeTestAwarePlanner(context);

      expect(result.success).toBe(true);
      expect(result.content).toContain('AC-US1-01');
      expect(result.content).toContain('AC-US1-02');
      expect(result.content).toContain('AC-US2-01');
      expect(result.content).toContain('(3 total)'); // AC count
    });
  });

  describe('generateTemporaryPlan', () => {
    it('should generate valid plan.md structure', () => {
      const context: PlanPipelineContext = {
        config: {},
        incrementId: '0043-test',
        incrementPath: '/path',
        specContent: `
### US-001: Test
### US-002: Another Test

### FR-001: Requirement
`,
        startTime: Date.now(),
        errors: [],
        warnings: []
      };

      const plan = invoker.generateTemporaryPlan(context);

      expect(plan).toContain('increment: 0043-test');
      expect(plan).toContain('# Implementation Plan');
      expect(plan).toContain('Architecture Overview');
      expect(plan).toContain('Implementation Phases');
      expect(plan).toContain('Testing Strategy');
      expect(plan).toContain('TDD');
      expect(plan).toContain('95%'); // Coverage target mentioned
    });

    it('should include user stories summary', () => {
      const context: PlanPipelineContext = {
        config: {},
        incrementId: '0044-test',
        incrementPath: '/path',
        specContent: `
### US-001: Login
### US-002: Logout
### US-003: Profile
`,
        startTime: Date.now(),
        errors: [],
        warnings: []
      };

      const plan = invoker.generateTemporaryPlan(context);

      expect(plan).toContain('3 user stories');
      expect(plan).toContain('US-001');
      expect(plan).toContain('US-002');
      expect(plan).toContain('US-003');
    });

    it('should include YAML frontmatter', () => {
      const context: PlanPipelineContext = {
        config: {},
        incrementId: '0045-test',
        incrementPath: '/path',
        specContent: '',
        startTime: Date.now(),
        errors: [],
        warnings: []
      };

      const plan = invoker.generateTemporaryPlan(context);

      expect(plan).toMatch(/^---\n/);
      expect(plan).toContain('increment:');
      expect(plan).toContain('architecture_docs:');
    });
  });

  describe('generateTemporaryTasks', () => {
    it('should generate valid tasks.md structure', () => {
      const context: PlanPipelineContext = {
        config: {},
        incrementId: '0046-test',
        incrementPath: '/path',
        specContent: `
- [ ] AC-US1-01: Test 1
- [ ] AC-US1-02: Test 2
- [ ] AC-US2-01: Test 3
`,
        startTime: Date.now(),
        errors: [],
        warnings: []
      };

      const tasks = invoker.generateTemporaryTasks(context);

      expect(tasks).toContain('# Tasks: 0046-test');
      expect(tasks).toContain('test_mode: TDD');
      expect(tasks).toContain('coverage_target: 95%');
      expect(tasks).toContain('## Phase 1');
      expect(tasks).toContain('### T-001');
    });

    it('should include acceptance criteria count', () => {
      const context: PlanPipelineContext = {
        config: {},
        incrementId: '0047-test',
        incrementPath: '/path',
        specContent: `
- [ ] AC-US1-01: Test
- [ ] AC-US1-02: Test
- [ ] AC-US1-03: Test
- [ ] AC-US1-04: Test
- [ ] AC-US1-05: Test
`,
        startTime: Date.now(),
        errors: [],
        warnings: []
      };

      const tasks = invoker.generateTemporaryTasks(context);

      expect(tasks).toContain('Acceptance Criteria');
      expect(tasks).toContain('Unmapped');
    });

    it('should include BDD test plan format', () => {
      const context: PlanPipelineContext = {
        config: {},
        incrementId: '0048-test',
        incrementPath: '/path',
        specContent: '- [ ] AC-US1-01: Test',
        startTime: Date.now(),
        errors: [],
        warnings: []
      };

      const tasks = invoker.generateTemporaryTasks(context);

      expect(tasks).toContain('**Given**');
      expect(tasks).toContain('**When**');
      expect(tasks).toContain('**Then**');
      expect(tasks).toContain('95%'); // Coverage target mentioned
    });
  });
});
