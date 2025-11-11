# Test Strategy: Core Framework Enhancements

**Increment**: 0002-core-enhancements
**Created**: 2025-10-26
**Status**: Planned

---

## Overview

This document defines the test strategy for core framework enhancements, specifically diagram generation agents and skills. It maps acceptance criteria (TC-00XX) from spec.md to actual test implementations across Four Levels of Testing.

---

## Table of Contents

1. [Four Levels of Testing](#four-levels-of-testing)
2. [Test Coverage Matrix](#test-coverage-matrix)
3. [Level 3: Component Test Cases](#level-3-component-test-cases)
4. [Level 4: Integration Tests](#level-4-integration-tests)
5. [Manual Testing Scenarios](#manual-testing-scenarios)
6. [Success Criteria](#success-criteria)

---

## Four Levels of Testing

Following SpecWeave's testing philosophy (see CLAUDE.md#testing-philosophy):

### Level 1: Specification Acceptance Criteria

**Location**: [spec.md](spec.md)

**Format**: TC-00XX identifiers in acceptance criteria

**Example**:
```markdown
**Acceptance Criteria**:
- [ ] **TC-0001**: Valid credentials → redirect to dashboard
```

**For this increment**: TC-0001 through TC-0019 defined in spec.md

---

### Level 2: Feature Test Strategy (THIS FILE)

**Purpose**: Define HOW to validate feature meets acceptance criteria

**Contents**:
- Test coverage matrix (maps TC-00XX to test implementations)
- Test types specified (unit, integration, manual)
- Test file locations
- Test priorities

---

### Level 3: Component Test Cases

**Location**:
- `src/agents/diagrams-architect/test-cases/`
- `src/skills/diagrams-generator/test-cases/`

**Format**: YAML files with structured test definitions

**Minimum**: 3 test cases per component (MANDATORY)

**For this increment**:
- 3+ agent test cases
- 3+ skill test cases
- **Total**: 6+ component tests

---

### Level 4: Automated Tests

**Location**: `tests/` directory

**Format**: Unit/Integration test code (Jest, Playwright, etc.)

**For this increment**:
- Manual validation initially
- Automated tests if test runner available

---

## Test Coverage Matrix

Mapping acceptance criteria (TC-00XX) to test implementations:

| TC ID | Acceptance Criteria | Test Type | Test Location | Priority | Status |
|-------|---------------------|-----------|---------------|----------|--------|
| **US-001: Create C4 Context Diagram** |
| TC-0001 | User request detected | Agent Test | `diagrams-architect/test-cases/test-1-c4-context.yaml` | P1 | Planned |
| TC-0002 | Skill identifies C4 Context type | Skill Test | `diagrams-generator/test-cases/test-1-detect-type.yaml` | P1 | Planned |
| TC-0003 | Skill invokes agent | Integration | Manual validation | P1 | Planned |
| TC-0004 | Agent creates correct Mermaid syntax | Agent Test | `diagrams-architect/test-cases/test-1-c4-context.yaml` | P1 | Planned |
| TC-0005 | Follows C4 Level 1 conventions | Agent Test | `diagrams-architect/test-cases/test-1-c4-context.yaml` | P1 | Planned |
| TC-0006 | Saved to correct location | Skill Test | `diagrams-generator/test-cases/test-3-placement.yaml` | P1 | Planned |
| TC-0007 | File named correctly | Skill Test | `diagrams-generator/test-cases/test-3-placement.yaml` | P1 | Planned |
| **US-002: Create Sequence Diagram** |
| TC-0008 | Skill detects sequence diagram request | Skill Test | `diagrams-generator/test-cases/test-1-detect-type.yaml` | P1 | Planned |
| TC-0009 | Agent generates sequenceDiagram syntax | Agent Test | `diagrams-architect/test-cases/test-2-sequence.yaml` | P1 | Planned |
| TC-0010 | Participants clearly labeled | Agent Test | `diagrams-architect/test-cases/test-2-sequence.yaml` | P1 | Planned |
| TC-0011 | Flow accurately represents process | Manual | Manual validation | P2 | Planned |
| TC-0012 | Saved to flows/ directory | Skill Test | `diagrams-generator/test-cases/test-3-placement.yaml` | P1 | Planned |
| TC-0013 | File named `*.sequence.mmd` | Skill Test | `diagrams-generator/test-cases/test-3-placement.yaml` | P1 | Planned |
| **US-003: Create ER Diagram** |
| TC-0014 | Skill detects ER diagram request | Skill Test | `diagrams-generator/test-cases/test-1-detect-type.yaml` | P1 | Planned |
| TC-0015 | Agent generates erDiagram syntax | Agent Test | `diagrams-architect/test-cases/test-3-er-diagram.yaml` | P1 | Planned |
| TC-0016 | Entities, attributes, relationships defined | Agent Test | `diagrams-architect/test-cases/test-3-er-diagram.yaml` | P1 | Planned |
| TC-0017 | Primary/foreign keys marked | Agent Test | `diagrams-architect/test-cases/test-3-er-diagram.yaml` | P1 | Planned |
| TC-0018 | Saved to architecture/diagrams/ | Skill Test | `diagrams-generator/test-cases/test-3-placement.yaml` | P1 | Planned |
| TC-0019 | File named `*.entity.mmd` | Skill Test | `diagrams-generator/test-cases/test-3-placement.yaml` | P1 | Planned |

### Coverage Summary

- **Total Test Cases**: 19
- **P1 (Critical)**: 17
- **P2 (High)**: 2
- **Agent Tests**: 9 TC IDs (covered by 3 test files)
- **Skill Tests**: 9 TC IDs (covered by 3 test files)
- **Integration Tests**: 1 TC ID (manual validation)

---

## Level 3: Component Test Cases

### Agent Test Cases (diagrams-architect)

**Location**: `src/agents/diagrams-architect/test-cases/`

**Minimum**: 3 test cases (MANDATORY)

---

#### Test 1: C4 Context Diagram Generation

**File**: `test-1-c4-context.yaml`

**Covers**: TC-0001, TC-0004, TC-0005

**Test Definition**:
```yaml
---
name: "Generate C4 Context Diagram"
description: "Tests if agent can create C4 Level 1 context diagram with correct syntax and conventions"

input:
  prompt: |
    Create C4 context diagram for e-commerce platform with:
    - Users: Customers browsing and purchasing products
    - Admins: Managing products and orders
    - External systems: Stripe (payment gateway), SendGrid (email service)

  context:
    system_name: "E-Commerce Platform"
    external_services:
      - name: "Stripe"
        purpose: "Payment processing"
      - name: "SendGrid"
        purpose: "Email notifications"

expected_output:
  type: "diagram_generated"
  diagram_type: "c4-context"
  mermaid_type: "graph TB"

  contains:
    - "End User"
    - "Customer"
    - "Administrator"
    - "E-Commerce Platform"
    - "Stripe"
    - "SendGrid"
    - "HTTPS"
    - "Process Payments"
    - "Send Emails"

  must_not_contain:
    - "Controller"
    - "Service"
    - "Database"
    - "Repository"
    # Level 1 should NOT show internal components

validation_rules:
  - rule: "Diagram uses graph TB or graph LR"
    pattern: "^graph (TB|LR)"
    required: true

  - rule: "Shows system boundary clearly"
    pattern: "\\[.*Platform.*\\]"
    required: true

  - rule: "External actors use ((Actor)) notation"
    pattern: "\\(\\(.*User.*\\)\\)|\\(\\(.*Administrator.*\\)\\)"
    required: true

  - rule: "External systems use [Service] notation"
    pattern: "\\[Stripe.*\\]|\\[SendGrid.*\\]"
    required: true

  - rule: "No internal components shown"
    pattern: "Controller|Repository|Service"
    required: false
    must_not_match: true

success_criteria:
  - "Valid Mermaid syntax (no syntax errors)"
  - "Follows C4 Level 1 conventions (system boundary, external actors only)"
  - "Appropriate level of detail (no implementation details)"
  - "Clear labels and descriptions"
  - "Proper arrow notation (-->)"

priority: P1
estimated_time: "2 minutes"
---
```

---

#### Test 2: Sequence Diagram Generation

**File**: `test-2-sequence.yaml`

**Covers**: TC-0008, TC-0009, TC-0010

**Test Definition**:
```yaml
---
name: "Generate Sequence Diagram"
description: "Tests if agent can create sequence diagram with correct syntax and participant labels"

input:
  prompt: |
    Create sequence diagram for user login flow:
    1. User submits credentials to Web App
    2. Web App sends credentials to Auth Service
    3. Auth Service queries User Database
    4. Database returns user data
    5. Auth Service generates JWT token
    6. Auth Service returns token to Web App
    7. Web App stores token and redirects user to Dashboard

  context:
    flow_name: "User Login Flow"
    participants:
      - "User"
      - "Web App"
      - "Auth Service"
      - "User Database"

expected_output:
  type: "diagram_generated"
  diagram_type: "sequence"
  mermaid_type: "sequenceDiagram"

  contains:
    - "sequenceDiagram"
    - "participant User"
    - "participant Web App"
    - "participant Auth Service"
    - "participant User Database"
    - "User->>Web App: Submit credentials"
    - "Auth Service->>User Database: Query user"
    - "User Database-->>Auth Service: User data"
    - "Auth Service-->>Web App: JWT token"

  participant_count: 4

validation_rules:
  - rule: "Uses sequenceDiagram syntax"
    pattern: "^sequenceDiagram"
    required: true

  - rule: "All participants declared"
    pattern: "participant (User|Web App|Auth Service|User Database)"
    required: true
    min_occurrences: 4

  - rule: "Uses correct arrow notation"
    pattern: "(->>|-->>)"
    required: true

  - rule: "Solid arrows for requests (->>) present"
    pattern: "->>"
    required: true

  - rule: "Dashed arrows for responses (-->>) present"
    pattern: "-->>"
    required: true

success_criteria:
  - "Valid Mermaid sequenceDiagram syntax"
  - "All participants declared explicitly"
  - "Clear message labels"
  - "Correct arrow directions (request vs response)"
  - "Logical flow (request → response pattern)"

priority: P1
estimated_time: "2 minutes"
---
```

---

#### Test 3: ER Diagram Generation

**File**: `test-3-er-diagram.yaml`

**Covers**: TC-0014, TC-0015, TC-0016, TC-0017

**Test Definition**:
```yaml
---
name: "Generate ER Diagram"
description: "Tests if agent can create entity-relationship diagram with entities, attributes, relationships, and keys"

input:
  prompt: |
    Create ER diagram for e-commerce data model:
    - User entity: id (PK), email, name, created_at
    - Order entity: id (PK), user_id (FK), total, status, created_at
    - OrderItem entity: id (PK), order_id (FK), product_id (FK), quantity, price
    - Product entity: id (PK), name, price, stock

    Relationships:
    - User places many Orders (1:many)
    - Order contains many OrderItems (1:many)
    - OrderItem references one Product (many:1)

  context:
    entities: ["User", "Order", "OrderItem", "Product"]
    relationships:
      - from: "User"
        to: "Order"
        type: "one-to-many"
      - from: "Order"
        to: "OrderItem"
        type: "one-to-many"
      - from: "OrderItem"
        to: "Product"
        type: "many-to-one"

expected_output:
  type: "diagram_generated"
  diagram_type: "er"
  mermaid_type: "erDiagram"

  contains:
    - "erDiagram"
    - "USER"
    - "ORDER"
    - "ORDER_ITEM"
    - "PRODUCT"
    - "uuid id PK"
    - "uuid user_id FK"
    - "uuid order_id FK"
    - "uuid product_id FK"
    - "USER ||--o{ ORDER"
    - "ORDER ||--|{ ORDER_ITEM"
    - "ORDER_ITEM }|--|| PRODUCT"

  entity_count: 4

validation_rules:
  - rule: "Uses erDiagram syntax"
    pattern: "^erDiagram"
    required: true

  - rule: "All entities defined"
    pattern: "(USER|ORDER|ORDER_ITEM|PRODUCT) \\{"
    required: true
    min_occurrences: 4

  - rule: "Primary keys marked"
    pattern: "PK"
    required: true
    min_occurrences: 4

  - rule: "Foreign keys marked"
    pattern: "FK"
    required: true
    min_occurrences: 3

  - rule: "Relationships defined"
    pattern: "(\\|\\|--o\\{|\\|\\|--|\\{|\\}\\|--\\|\\|)"
    required: true
    min_occurrences: 3

  - rule: "Cardinality symbols correct"
    description: "||--o{ = one-to-many, }|--|| = many-to-one"
    required: true

success_criteria:
  - "Valid Mermaid erDiagram syntax"
  - "All entities defined with attributes"
  - "Primary keys marked (PK)"
  - "Foreign keys marked (FK)"
  - "Relationships show correct cardinality"
  - "Entity names in UPPER_CASE or PascalCase"

priority: P1
estimated_time: "3 minutes"
---
```

---

### Skill Test Cases (diagrams-generator)

**Location**: `src/skills/diagrams-generator/test-cases/`

**Minimum**: 3 test cases (MANDATORY)

---

#### Test 1: Diagram Type Detection

**File**: `test-1-detect-type.yaml`

**Covers**: TC-0002, TC-0008, TC-0014

**Test Definition**:
```yaml
---
name: "Detect Diagram Type from User Request"
description: "Tests if skill can correctly identify diagram type from natural language requests"

test_cases:
  - input:
      user_request: "Create C4 context diagram for authentication system"
    expected:
      detected_type: "c4-context"
      c4_level: 1
      mermaid_type: "graph"
    covers: TC-0002

  - input:
      user_request: "Draw sequence diagram for user login flow"
    expected:
      detected_type: "sequence"
      c4_level: null
      mermaid_type: "sequenceDiagram"
    covers: TC-0008

  - input:
      user_request: "Generate ER diagram for user and order entities"
    expected:
      detected_type: "entity"
      c4_level: null
      mermaid_type: "erDiagram"
    covers: TC-0014

  - input:
      user_request: "Create C4 container diagram showing services and databases"
    expected:
      detected_type: "c4-container"
      c4_level: 2
      mermaid_type: "graph"

  - input:
      user_request: "Visualize deployment architecture on AWS"
    expected:
      detected_type: "deployment"
      c4_level: null
      mermaid_type: "graph"

detection_keywords:
  c4-context:
    - "C4 context"
    - "system context"
    - "context diagram"
  c4-container:
    - "C4 container"
    - "container diagram"
    - "services and databases"
  c4-component:
    - "C4 component"
    - "component diagram"
    - "internal structure"
  sequence:
    - "sequence diagram"
    - "sequence flow"
    - "interaction diagram"
  entity:
    - "ER diagram"
    - "entity relationship"
    - "data model"
  deployment:
    - "deployment diagram"
    - "infrastructure diagram"
    - "architecture on AWS/Azure/GCP"

validation_rules:
  - rule: "Correctly identifies C4 context requests"
    test_cases: [1]
    expected_accuracy: 100%

  - rule: "Correctly identifies sequence diagram requests"
    test_cases: [2]
    expected_accuracy: 100%

  - rule: "Correctly identifies ER diagram requests"
    test_cases: [3]
    expected_accuracy: 100%

  - rule: "Handles ambiguous requests gracefully"
    description: "If request is ambiguous, ask user to clarify"
    required: true

success_criteria:
  - "100% accuracy on clear requests"
  - "Handles all supported diagram types"
  - "Asks for clarification on ambiguous requests"
  - "Returns null/error on unsupported types"

priority: P1
estimated_time: "2 minutes"
---
```

---

#### Test 2: Agent Coordination

**File**: `test-2-coordinate.yaml`

**Covers**: TC-0003

**Test Definition**:
```yaml
---
name: "Coordinate with diagrams-architect Agent"
description: "Tests if skill correctly invokes agent via Task tool and receives diagram output"

input:
  user_request: "Create C4 context diagram for payment system"
  detected_type: "c4-context"

expected_workflow:
  - step: 1
    action: "Validate request"
    validation:
      - "Diagram type identified"
      - "Required info present (system name)"

  - step: 2
    action: "Prepare agent prompt"
    expected_prompt_contains:
      - "Create C4 context diagram"
      - "payment system"
      - "C4 Level 1"

  - step: 3
    action: "Invoke diagrams-architect via Task tool"
    task_params:
      subagent_type: "diagrams-architect"
      prompt: "Create C4 context diagram for payment system..."
      description: "Generate C4 Level 1 diagram"

  - step: 4
    action: "Receive diagram output"
    expected_output_type: "mermaid_diagram"
    expected_output_format: "string"
    must_contain: "graph TB"

  - step: 5
    action: "Validate diagram syntax"
    validation:
      - "Starts with 'graph TB' or 'graph LR'"
      - "Contains valid Mermaid syntax"
      - "No syntax errors"

  - step: 6
    action: "Return diagram to skill"
    success: true

validation_rules:
  - rule: "Agent invoked via Task tool"
    required: true

  - rule: "Agent receives correct prompt"
    required: true

  - rule: "Agent returns valid diagram"
    required: true

  - rule: "Skill validates agent output"
    required: true

error_handling:
  - scenario: "Agent fails to generate"
    expected_behavior: "Skill returns error to user"

  - scenario: "Agent returns invalid syntax"
    expected_behavior: "Skill validates and rejects"

  - scenario: "Agent timeout"
    expected_behavior: "Skill reports timeout to user"

success_criteria:
  - "Agent invoked correctly via Task tool"
  - "Agent receives well-formed prompt"
  - "Agent returns valid Mermaid diagram"
  - "Skill validates output before saving"
  - "Errors handled gracefully"

priority: P1
estimated_time: "3 minutes"
---
```

---

#### Test 3: File Placement and Naming

**File**: `test-3-placement.yaml`

**Covers**: TC-0006, TC-0007, TC-0012, TC-0013, TC-0018, TC-0019

**Test Definition**:
```yaml
---
name: "File Placement and Naming Validation"
description: "Tests if skill saves diagrams to correct location with proper file names"

test_cases:
  - name: "C4 Context Diagram"
    input:
      diagram_type: "c4-context"
      system_name: "authentication"
      diagram_content: "graph TB\n..."
    expected:
      directory: ".specweave/docs/internal/architecture/diagrams/"
      file_name: "authentication.c4-context.mmd"
      full_path: ".specweave/docs/internal/architecture/diagrams/authentication.c4-context.mmd"
    covers: [TC-0006, TC-0007]

  - name: "Sequence Diagram"
    input:
      diagram_type: "sequence"
      flow_name: "login-flow"
      diagram_content: "sequenceDiagram\n..."
    expected:
      directory: ".specweave/docs/internal/architecture/diagrams/flows/"
      file_name: "login-flow.sequence.mmd"
      full_path: ".specweave/docs/internal/architecture/diagrams/flows/login-flow.sequence.mmd"
    covers: [TC-0012, TC-0013]

  - name: "ER Diagram"
    input:
      diagram_type: "entity"
      model_name: "user-order"
      diagram_content: "erDiagram\n..."
    expected:
      directory: ".specweave/docs/internal/architecture/diagrams/"
      file_name: "user-order.entity.mmd"
      full_path: ".specweave/docs/internal/architecture/diagrams/user-order.entity.mmd"
    covers: [TC-0018, TC-0019]

  - name: "C4 Component Diagram (LLD)"
    input:
      diagram_type: "c4-component"
      service_name: "auth-service"
      module: "auth"
      diagram_content: "graph TB\n..."
    expected:
      directory: ".specweave/docs/internal/architecture/diagrams/auth/"
      file_name: "auth-service.c4-component.mmd"
      full_path: ".specweave/docs/internal/architecture/diagrams/auth/auth-service.c4-component.mmd"
    note: "LLD diagrams go in module subdirectories"

file_naming_rules:
  pattern: "<page>.<type>.mmd"
  types:
    - "c4-context"
    - "c4-container"
    - "c4-component"
    - "sequence"
    - "entity"
    - "deployment"
    - "flow"
    - "state"

  examples:
    - "auth.c4-context.mmd"
    - "auth.c4-container.mmd"
    - "login-flow.sequence.mmd"
    - "user-order.entity.mmd"
    - "aws-deployment.deployment.mmd"

placement_rules:
  hld_diagrams:
    location: ".specweave/docs/internal/architecture/diagrams/"
    types: ["c4-context", "c4-container", "entity", "deployment"]

  lld_diagrams:
    location: ".specweave/docs/internal/architecture/diagrams/{module}/"
    types: ["c4-component"]

  flows:
    location: ".specweave/docs/internal/architecture/diagrams/flows/"
    types: ["sequence", "flow"]

validation_rules:
  - rule: "Directory exists or is created"
    required: true

  - rule: "File name follows pattern"
    pattern: "^[a-z0-9-]+\\.(c4-context|c4-container|c4-component|sequence|entity|deployment|flow|state)\\.mmd$"
    required: true

  - rule: "File saved successfully"
    required: true

  - rule: "File content matches diagram"
    required: true

success_criteria:
  - "All diagram types saved to correct directories"
  - "File names follow <page>.<type>.mmd pattern"
  - "Directories created if they don't exist"
  - "Files written successfully"
  - "Content preserved exactly"

priority: P1
estimated_time: "3 minutes"
---
```

---

## Level 4: Integration Tests

### Manual Validation (Initial Implementation)

**Priority**: P1

**Why manual initially**: Test infrastructure for agents/skills may not exist yet

**Test Scenarios**:

#### Scenario 1: End-to-End C4 Context Diagram

**Steps**:
1. Restart Claude Code (load new agents/skills)
2. User request: "Create C4 context diagram for authentication system with users, admins, and external SSO provider"
3. **Verify**: diagrams-generator skill activates
4. **Verify**: Skill detects type = "c4-context"
5. **Verify**: Skill invokes diagrams-architect agent
6. **Verify**: Agent generates valid Mermaid diagram
7. **Verify**: Diagram saved to `.specweave/docs/internal/architecture/diagrams/authentication.c4-context.mmd`
8. **Verify**: File content is valid Mermaid (no syntax errors)
9. **Verify**: Diagram follows C4 Level 1 conventions

**Success Criteria**: All verifications pass

---

#### Scenario 2: End-to-End Sequence Diagram

**Steps**:
1. User request: "Draw sequence diagram for user login flow: user submits credentials → auth service validates → database lookup → return JWT token"
2. **Verify**: diagrams-generator skill activates
3. **Verify**: Skill detects type = "sequence"
4. **Verify**: Agent generates sequenceDiagram
5. **Verify**: File saved to `.specweave/docs/internal/architecture/diagrams/flows/login-flow.sequence.mmd`
6. **Verify**: Participants declared
7. **Verify**: Arrows correct (solid for requests, dashed for responses)

**Success Criteria**: All verifications pass

---

#### Scenario 3: End-to-End ER Diagram

**Steps**:
1. User request: "Generate ER diagram for user and order entities with their relationship"
2. **Verify**: diagrams-generator skill activates
3. **Verify**: Skill detects type = "entity"
4. **Verify**: Agent generates erDiagram
5. **Verify**: File saved to `.specweave/docs/internal/architecture/diagrams/user-order.entity.mmd`
6. **Verify**: Entities defined with attributes
7. **Verify**: Primary/foreign keys marked
8. **Verify**: Relationship cardinality correct

**Success Criteria**: All verifications pass

---

### Automated Integration Tests (Future)

**Location**: `tests/integration/diagram-generation.test.ts`

**When**: After test infrastructure is in place

**Test**:
```typescript
describe('Diagram Generation Workflow', () => {
  test('E2E: C4 context diagram generation', async () => {
    // Mock user request
    // Invoke skill
    // Verify agent called
    // Verify file created
    // Verify content valid
  });
});
```

---

## Manual Testing Scenarios

### Pre-Testing Setup

**Before testing**:
1. Install agents and skills:
   ```bash
   npm run install:all
   ```

2. Restart Claude Code:
   ```bash
   # Restart Claude Code to load new components
   ```

3. Verify installation:
   ```bash
   ls -la .claude/agents/diagrams-architect/
   ls -la .claude/skills/diagrams-generator/
   ```

---

### Test Scenario Matrix

| Scenario | User Request | Expected Type | Expected File | Priority |
|----------|-------------|---------------|---------------|----------|
| 1 | "Create C4 context diagram for authentication" | c4-context | `diagrams/authentication.c4-context.mmd` | P1 |
| 2 | "Draw sequence diagram for login flow" | sequence | `diagrams/flows/login-flow.sequence.mmd` | P1 |
| 3 | "Generate ER diagram for user and order" | entity | `diagrams/user-order.entity.mmd` | P1 |
| 4 | "Create C4 container diagram showing services" | c4-container | `diagrams/*.c4-container.mmd` | P2 |
| 5 | "Draw deployment diagram for AWS infrastructure" | deployment | `diagrams/*.deployment.mmd` | P2 |

---

### Validation Checklist (Per Test)

- [ ] Skill activates automatically
- [ ] Diagram type detected correctly
- [ ] Agent invoked successfully
- [ ] Diagram generated with valid syntax
- [ ] File saved to correct location
- [ ] File name follows conventions
- [ ] Content matches expected diagram type
- [ ] User receives confirmation message

---

## Success Criteria

### Component Test Coverage

- [ ] **diagrams-architect agent**: ≥3 test cases created
- [ ] **diagrams-generator skill**: ≥3 test cases created
- [ ] **Total**: ≥6 component test cases

### Test Case Quality

- [ ] All test cases in YAML format
- [ ] All test cases include validation rules
- [ ] All test cases map to TC-00XX from spec.md
- [ ] All test cases have success criteria

### Manual Testing

- [ ] ≥3 end-to-end scenarios tested
- [ ] All P1 scenarios pass
- [ ] All diagram types validated
- [ ] File placement verified

### Integration

- [ ] Skill activates automatically
- [ ] Agent coordination works
- [ ] File operations successful
- [ ] Error handling validated

### Documentation

- [ ] Test strategy documented (this file)
- [ ] Test coverage matrix complete
- [ ] Manual test scenarios defined
- [ ] Success criteria clear

---

## Related Documentation

- [spec.md](spec.md) - WHAT and WHY (acceptance criteria TC-00XX)
- [plan.md](plan.md) - HOW to implement (technical architecture)
- [tasks.md](tasks.md) - Executable tasks (derived from spec + plan)
- [CLAUDE.md](../../../CLAUDE.md#testing-philosophy) - Four Levels of Testing
