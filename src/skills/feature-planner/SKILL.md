---
name: feature-planner
description: Creates comprehensive implementation plans for SpecWeave features. This skill should be used when planning new features, creating feature specifications, or organizing implementation work. Activates for: feature planning, implementation plan, create feature, plan feature, organize work, break down feature.
---

# Feature Planner Skill

This skill creates comprehensive, well-structured implementation plans for SpecWeave features following the Spec-Driven Development methodology.

## Purpose

The feature-planner skill automates the creation of feature implementation plans, ensuring:
- Auto-numbered feature directories (`###-short-name`)
- Complete feature artifacts (spec.md, plan.md, tasks.md, tests.md)
- Proper context manifests for selective loading
- Constitutional compliance
- Separation of WHAT/WHY (spec) from HOW (plan) from STEPS (tasks)

## When to Use This Skill

Use this skill when:
- Creating a new feature from a description
- Planning implementation for a user story
- Organizing work for a complex task
- Breaking down epics into executable features
- Structuring brownfield modifications

## Activation Triggers

This skill activates automatically when users say:
- "Plan a feature for..."
- "Create implementation plan for..."
- "I want to add [feature description]"
- "Help me structure [feature]"
- "Break down this feature: ..."

## Feature Planning Process

### Step 1: Analyze Feature Description

When a user provides a feature description:

1. **Extract Requirements**:
   - What is the core user value?
   - Why is this feature needed?
   - What problem does it solve?

2. **Identify Scope**:
   - What functionality is included?
   - What is explicitly excluded?
   - Are there dependencies?

3. **Determine Priority**:
   - P1 (Critical): Must-have for MVP
   - P2 (Important): High-value enhancement
   - P3 (Nice-to-have): Polish and optimization

### Step 2: Generate Short Name

From feature description, create a short name following these rules:

1. **Extract Keywords**:
   - Remove stop words (the, a, an, for, with, etc.)
   - Identify 2-4 most meaningful words
   - Use action-noun format where possible

2. **Format**:
   - Lowercase
   - Hyphen-separated
   - Max 50 characters
   - Example: `stripe-payment-integration` from "Integrate Stripe payment processing"

3. **Validate**:
   - Check for existing features with similar names
   - Ensure uniqueness
   - Avoid abbreviations unless well-known

### Step 3: Auto-Number Feature

Determine the next feature number:

1. **Scan Existing**:
   - Read `features/` directory
   - Extract all `###` prefixes
   - Find highest number

2. **Increment**:
   - Add 1 to highest number
   - Zero-pad to 4 digits (e.g., 0001, 0002, ..., 0010, 0011)

3. **Create Path**:
   - Format: `.specweave/increments/####-short-name/`
   - Example: `.specweave/increments/0003-stripe-payment-integration/`

### Step 4: Create Feature Structure

Generate the complete feature directory with all required files:

```
.specweave/increments/####-short-name/
├── spec.md                 # Feature specification (WHAT and WHY)
├── plan.md                 # Implementation plan (HOW)
├── tasks.md                # Executable tasks (STEPS)
├── tests.md                # Test strategy and cases
└── context-manifest.yaml   # Context loading specification
```

### Step 5: Generate spec.md

**Purpose**: Define WHAT this feature does and WHY it's needed.

**Structure**:
```yaml
---
feature: ###-short-name
title: "Human-Readable Feature Title"
priority: P1 | P2 | P3
status: planned
created: YYYY-MM-DD
---

# Feature: [Title]

## Overview
[High-level description of the feature]

## User Value
[Why this feature matters to users]

## User Stories

### US1: [Title] (P1)
**As a** [user type]
**I want** [goal]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] [Specific, measurable criterion]
- [ ] [Another criterion]

### US2: [Title] (P2)
...

## Functional Requirements

### FR-001: [Requirement]
[Detailed description]

### FR-002: [Requirement]
...

## Success Criteria
[Measurable outcomes that define feature success]

## Out of Scope
[What this feature explicitly does NOT include]

## Dependencies
[Other features or systems this depends on]

## References
- [Related specs]
- [Architecture docs]
- [ADRs]
```

**Key Principles**:
- Technology-agnostic (no HOW, only WHAT and WHY)
- Focused on user value
- Measurable acceptance criteria
- Prioritized user stories (P1/P2/P3)

### Step 6: Generate plan.md

**Purpose**: Define HOW to implement the feature technically.

**Structure**:
```markdown
# Implementation Plan: [Feature Title]

## Overview
[Technical summary of implementation approach]

## Architecture

### Components
[List major components to build/modify]

### Data Model
[Entities, relationships, schema changes]

### API Contracts
[Endpoints, methods, request/response formats]

### Integration Points
[External services, internal modules]

## Technology Decisions

### Technology Stack
- [Language/framework]
- [Libraries]
- [Tools]

### ADRs Required
- [List architecture decisions to document]

## Implementation Approach

### Phase 1: Foundation
[Setup, infrastructure, base components]

### Phase 2: Core Functionality
[Primary features from P1 user stories]

### Phase 3: Enhancement
[P2 features and optimizations]

### Phase 4: Polish
[P3 features, error handling, edge cases]

## Technical Challenges

### Challenge 1: [Description]
**Solution**: [Approach]
**Risk**: [Mitigation strategy]

## File Structure
```
[Show directory structure of code to create/modify]
```

## Testing Strategy
[High-level testing approach, see tests.md for details]

## Deployment Considerations
[Infrastructure, environment, rollout]

## Performance Targets
[Response times, throughput, resource usage]

## Security Considerations
[Authentication, authorization, data protection]
```

**Key Principles**:
- Technology-specific (HOW to build it)
- Architectural decisions documented
- Challenges and solutions identified
- Constitutional compliance checked

### Step 7: Generate tasks.md

**Purpose**: Break down implementation into executable steps.

**Structure**:
```markdown
# Tasks: [Feature Title]

## Task Notation

- `[T###]`: Sequential task ID
- `[P]`: Parallelizable (no file conflicts)
- `[US#]`: User story reference
- `[ ]`: Not started
- `[x]`: Completed

## Phase 1: Setup and Foundation

- [ ] [T001] [P] Initialize project structure
- [ ] [T002] [P] Setup testing framework
- [ ] [T003] Install dependencies

## Phase 2: Core Implementation

### US1: [User Story Title] (P1)

- [ ] [T004] Write test for [component]
- [ ] [T005] Implement [component] in src/path/file.ts
- [ ] [T006] [P] Create [another component]
- [ ] [T007] Integrate components
- [ ] [T008] Verify US1 acceptance criteria

### US2: [User Story Title] (P2)

- [ ] [T009] Write test for [feature]
- [ ] [T010] Implement [feature]
...

## Phase 3: Testing and Validation

- [ ] [T050] Run integration tests
- [ ] [T051] Performance testing
- [ ] [T052] Security review
- [ ] [T053] Documentation update

## Phase 4: Deployment

- [ ] [T060] Prepare deployment scripts
- [ ] [T061] Staging deployment
- [ ] [T062] Production deployment

## Dependencies

T005 depends on T004 (test must exist first)
T007 depends on T005, T006 (components must exist)
T051 depends on T050 (integration must pass first)
```

**Key Principles**:
- Story-centric organization (not layer-centric)
- Test-first sequence (tests before implementation)
- Exact file paths specified
- Parallelizable tasks marked `[P]`
- Dependencies explicitly stated

### Step 8: Generate tests.md

**Purpose**: Define comprehensive testing strategy and test cases.

**Structure**:
```markdown
# Test Strategy: [Feature Title]

## Test Philosophy

Follow SpecWeave Constitution Article III: Test-First Development
- Tests written before implementation
- Tests must fail initially (red-green-refactor)
- Integration tests with real environments

## Test Categories

### Unit Tests
[Component-level tests]

### Integration Tests
[Module integration tests]

### E2E Tests
[End-to-end user flows]

### Performance Tests
[Load, stress, scalability tests]

## Test Cases

### TC-001: [Test Name]
**Type**: Unit | Integration | E2E
**Priority**: P1 | P2 | P3
**User Story**: US1

**Scenario**:
- Given [precondition]
- When [action]
- Then [expected outcome]

**Test Data**:
[Sample inputs]

**Expected Results**:
[Specific, measurable outcomes]

### TC-002: [Test Name]
...

## Test Coverage Targets

- Unit test coverage: >80%
- Integration test coverage: Critical paths
- E2E coverage: All P1 user stories

## Testing Tools

- Unit: [Framework]
- Integration: [Framework]
- E2E: [Framework]

## Test Environments

- Local: [Setup]
- CI/CD: [Pipeline]
- Staging: [Environment]

## Regression Testing

For brownfield modifications:
1. Document existing behavior
2. Create tests for current functionality
3. User validation of tests
4. Implement changes
5. Verify regression tests still pass

## Success Criteria

- [ ] All P1 tests passing
- [ ] Coverage targets met
- [ ] Performance tests pass
- [ ] No regressions detected
```

**Key Principles**:
- Test-first philosophy
- Comprehensive coverage (unit, integration, E2E)
- Clear test cases with Given-When-Then
- Regression prevention for brownfield
- Measurable success criteria

### Step 9: Generate context-manifest.yaml

**Purpose**: Declare exactly what specifications, architecture docs, and ADRs are needed for this feature.

**Structure**:
```yaml
---
# Context Manifest for Feature: ###-short-name

# Specification sections to load
spec_sections:
  - specs/modules/[relevant-module]/**/*.md
  - specs/constitution.md#[relevant-article]
  - specs/overview.md

# Architecture documents to load
architecture:
  - architecture/system-design.md#[relevant-section]
  - architecture/data/database-schema.md#[relevant-tables]
  - architecture/[component]/[relevant-doc].md

# Architecture Decision Records to reference
adrs:
  - adrs/###-[relevant-decision].md

# Context budget (max tokens to load)
max_context_tokens: 10000

# Priority level
priority: high | medium | low

# Auto-refresh context on spec changes
auto_refresh: false

# Related features
related_features:
  - ###-[other-feature]

# Tags for search and categorization
tags:
  - [category]
  - [domain]
---
```

**Key Principles**:
- Precision loading (only what's needed)
- Section-level granularity (e.g., `#authentication-flow`)
- Token budget to prevent bloat
- Related features for dependency tracking

### Step 10: Validate and Finalize

Before completing:

1. **Constitutional Compliance**:
   - Article V: Modular Scalability (proper structure)
   - Article VI: Separation of Concerns (spec vs plan vs tasks)
   - Article IX: Testing Mandate (tests.md comprehensive)

2. **Quality Checks**:
   - spec.md is technology-agnostic
   - plan.md has sufficient technical detail
   - tasks.md has exact file paths
   - tests.md covers all P1 user stories
   - context-manifest.yaml is precise

3. **Update Features Index**:
   - Add feature to `features/README.md`
   - Update current features list

4. **Notify User**:
   - Feature number and path
   - Next steps (review spec, approve plan)
   - How to start implementation

## Best Practices

### Writing Effective Specs

1. **Focus on User Value**:
   - Start with "As a user, I want..."
   - Explain WHY, not just WHAT
   - Measurable success criteria

2. **Prioritize Ruthlessly**:
   - P1: Must-have for MVP
   - P2: Important but not blocking
   - P3: Nice-to-have

3. **Be Specific**:
   - Acceptance criteria are testable
   - Out-of-scope is explicitly defined
   - Dependencies are identified

### Writing Effective Plans

1. **Document Decisions**:
   - Why this technology choice?
   - What alternatives were considered?
   - What are the trade-offs?

2. **Identify Challenges**:
   - Technical risks
   - Complexity areas
   - Mitigation strategies

3. **Show Structure**:
   - File organization
   - Component relationships
   - Integration points

### Writing Effective Tasks

1. **Story-Centric Organization**:
   - Group by user story, not by layer
   - Enables independent implementation
   - Supports incremental delivery

2. **Test-First Sequencing**:
   - Test task before implementation task
   - Enforce TDD workflow
   - Red-green-refactor

3. **Clear Dependencies**:
   - Explicitly state what depends on what
   - Identify parallelizable work
   - Enable concurrent execution

## Example: Creating a Feature

### User Request
"I want to add Stripe payment integration to handle subscriptions"

### Execution

**Step 1**: Analyze
- Core value: Process recurring payments
- Problem: Need subscription billing
- Priority: P1 (required for MVP)

**Step 2**: Short name
- Keywords: stripe, payment, integration
- Format: `stripe-payment-integration`

**Step 3**: Auto-number
- Scan features/: 001, 002
- Next: 003
- Path: `features/003-stripe-payment-integration/`

**Step 4**: Create structure
```
features/003-stripe-payment-integration/
├── spec.md
├── plan.md
├── tasks.md
├── tests.md
└── context-manifest.yaml
```

**Step 5**: Generate spec.md
```yaml
---
feature: 003-stripe-payment-integration
title: "Stripe Payment Integration"
priority: P1
status: planned
created: 2025-01-25
---

# Feature: Stripe Payment Integration

## Overview
Integrate Stripe to handle subscription payments...

## User Stories

### US1: Process Subscription Payment (P1)
As a customer
I want to subscribe to a plan
So that I can access premium features

Acceptance Criteria:
- [ ] Customer can select subscription plan
- [ ] Payment processed via Stripe
- [ ] Subscription activated on success
...
```

**Step 6**: Generate plan.md
```markdown
# Implementation Plan: Stripe Payment Integration

## Technology Decisions
- Stripe SDK: stripe-node v11.x
- Backend: Express.js middleware
- Frontend: Stripe Elements

## Components
- StripeService: Payment processing
- SubscriptionController: API endpoints
- WebhookHandler: Stripe events
...
```

**Step 7**: Generate tasks.md
```markdown
# Tasks: Stripe Payment Integration

## Phase 2: Core Implementation

### US1: Process Subscription Payment (P1)

- [ ] [T001] Write test for StripeService.createSubscription()
- [ ] [T002] Implement StripeService in src/services/stripe-service.ts
- [ ] [T003] [P] Create SubscriptionController in src/controllers/subscription.ts
...
```

**Step 8**: Generate tests.md
```markdown
# Test Strategy: Stripe Payment Integration

## Test Cases

### TC-001: Successful Subscription Creation
Type: Integration
Priority: P1
User Story: US1

Scenario:
- Given a valid customer and plan ID
- When createSubscription() is called
- Then subscription is created in Stripe
- And webhook confirms activation
...
```

**Step 9**: Generate context-manifest.yaml
```yaml
spec_sections:
  - specs/modules/payments/overview.md
  - specs/modules/payments/stripe/spec.md
architecture:
  - architecture/data/database-schema.md#subscriptions
adrs:
  - adrs/005-payment-provider-choice.md
max_context_tokens: 8000
priority: high
```

**Step 10**: Validate
- ✅ spec.md is technology-agnostic
- ✅ plan.md documents Stripe SDK choice
- ✅ tasks.md follows test-first
- ✅ tests.md covers all P1 stories
- ✅ Constitutional compliance verified

**Output**:
```
✅ Feature created: 003-stripe-payment-integration

Location: features/003-stripe-payment-integration/
Files created:
- spec.md
- plan.md
- tasks.md
- tests.md
- context-manifest.yaml

Next steps:
1. Review spec.md - verify user stories and acceptance criteria
2. Approve plan.md - validate technical approach
3. Start implementation: specweave implement 003
```

## Helper Scripts

### `scripts/create-feature.js`

Creates feature directory structure and generates all files.

**Usage**:
```javascript
const featurePlanner = require('./create-feature.js');

const feature = await featurePlanner.createFeature({
  description: "Add Stripe payment integration",
  priority: "P1",
  configPath: ".specweave/config.yaml"
});

console.log(`Created: features/${feature.number}-${feature.shortName}/`);
```

### `scripts/generate-short-name.js`

Generates short names from descriptions.

**Usage**:
```javascript
const { generateShortName } = require('./generate-short-name.js');

const shortName = generateShortName("Integrate Stripe payment processing");
// Returns: "stripe-payment-integration"
```

### `scripts/next-feature-number.js`

Determines next available feature number.

**Usage**:
```javascript
const { getNextNumber } = require('./next-feature-number.js');

const next = await getNextNumber("features/");
// Returns: "003"
```

## Constitutional Compliance

This skill enforces:

- **Article V**: Modular Scalability - Auto-numbered features prevent conflicts
- **Article VI**: Separation of Concerns - spec vs plan vs tasks are distinct
- **Article IX**: Skill Testing Mandate - tests.md ensures comprehensive testing

## Integration with Other Skills

- **context-loader**: Uses context manifests to load relevant specs
- **spec-author**: Collaborates on specification creation
- **architect**: Collaborates on technical planning
- **developer**: Consumes tasks.md for implementation
- **docs-updater**: Updates features/README.md automatically

## Troubleshooting

### Issue: Feature number conflict
**Solution**: Re-scan features directory, git branches, and remote to find true highest number

### Issue: Short name too long
**Solution**: Use abbreviations for well-known terms (e.g., auth, api, db)

### Issue: Context manifest too broad
**Solution**: Use section anchors (e.g., `#specific-section`) instead of full files

---

This skill ensures every SpecWeave feature is properly planned, structured, and ready for implementation with constitutional compliance and best practices built-in.
