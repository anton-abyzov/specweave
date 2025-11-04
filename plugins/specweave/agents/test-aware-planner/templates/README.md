# Test-Aware Planner Templates

This directory contains templates for generating tasks.md with embedded test plans.

## Templates

### 1. task-testable.md.template

**Purpose**: Template for tasks that have automated tests (unit/integration/E2E)

**Variables**:
- `{task_number}`: Sequential task number (001, 002, 003, ...)
- `{task_title}`: Clear, action-oriented task description
- `{user_story}`: User story ID (US1, US2, ...)
- `{ac_ids}`: Acceptance criteria IDs (AC-US1-01, AC-US1-02)
- `{priority}`: Priority level (P0, P1, P2)
- `{estimate}`: Time estimate in hours (2-8 typical)

**Test Plan Variables**:
- `{given_condition}`: Precondition/setup
- `{when_action}`: Action or event
- `{then_outcome}`: Expected result
- `{and_additional}`: Additional conditions (optional)

**Test Cases Variables**:
- `{unit_test_path}`: Path to unit test file (e.g., `tests/unit/feature.test.ts`)
- `{testFunction1}`, `{testFunction2}`: Test function names
- `{test1_description}`: One-line test description
- `{unit_coverage}`: Coverage target for unit tests (85-95%)
- `{integration_test_path}`: Path to integration test file
- `{integration_coverage}`: Coverage target for integration tests (80-90%)
- `{e2e_test_path}`: Path to E2E test file (optional)
- `{overall_coverage}`: Overall coverage target (80-90%)

**Implementation Variables**:
- `{step1}`, `{step2}`, ...: Implementation steps
- `{unit_test_count}`: Number of unit tests
- `{int_test_count}`: Number of integration tests
- `{e2e_test_count}`: Number of E2E tests (optional)
- `{unit_test_command}`: Command to run unit tests
- `{int_test_command}`: Command to run integration tests
- `{e2e_test_command}`: Command to run E2E tests

**TDD Workflow Variables**:
- `{total_test_count}`: Total number of tests across all levels
- `{feature_name}`: Name of feature being implemented
- `{impl_step_count}`: Number of implementation steps

### 2. task-non-testable.md.template

**Purpose**: Template for tasks without automated tests (documentation, configuration, manual processes)

**Variables**:
- Same header variables as testable template (task_number, task_title, etc.)
- `{task_type}`: Type of task (documentation, configuration, deployment, etc.)

**Validation Variables**:
- `{validation1}`, `{validation2}`: Validation methods
- `{validation1_description}`: What to check/verify
- `{validation_command}`: Command to run validation
- `{review_criteria}`: Manual review criteria

### 3. tasks-frontmatter.md.template

**Purpose**: Template for tasks.md file header (YAML frontmatter)

**Variables**:
- `{increment_id}`: Increment ID (e.g., 0007-smart-increment-discipline)
- `{total_tasks}`: Total number of tasks
- `{test_mode}`: TDD or standard
- `{coverage_target}`: Overall coverage target (80-90%)
- `{tasks_content}`: Concatenated tasks from other templates

## Usage Example

```typescript
// Pseudo-code for using templates

const taskTemplate = fs.readFileSync('task-testable.md.template', 'utf-8');

const taskContent = taskTemplate
  .replace('{task_number}', '001')
  .replace('{task_title}', 'Implement User Authentication')
  .replace('{user_story}', 'US1')
  .replace('{ac_ids}', 'AC-US1-01, AC-US1-02')
  .replace('{priority}', 'P1')
  .replace('{estimate}', '6')
  .replace('{given_condition}', 'a registered user with email "test@example.com"')
  .replace('{when_action}', 'they submit valid credentials')
  .replace('{then_outcome}', 'they should be redirected to dashboard')
  .replace('{and_additional}', 'session cookie should be created')
  // ... replace all other variables

// Repeat for each task, then assemble into tasks.md
```

## Template Design Principles

1. **Consistency**: All tasks follow the same structure
2. **Flexibility**: Optional sections (E2E tests, And clauses) can be removed
3. **Clarity**: Variable names are self-explanatory
4. **Completeness**: All required sections included
5. **Validation**: Templates match ARCHITECTURE-PIVOT.md format

## Template Validation

Before using templates, verify:
- [ ] All variables are documented
- [ ] Format matches ARCHITECTURE-PIVOT.md
- [ ] Examples in AGENT.md use these templates
- [ ] Both testable and non-testable scenarios covered
- [ ] TDD workflow optional but included

## Further Reading

- AGENT.md: Complete agent workflow using these templates
- ARCHITECTURE-PIVOT.md: Rationale for embedded test format
- tasks.md: Real example of template output (dogfooding in increment 0007)
