# Claude Commands - Slash Commands for Manual Actions

## What Are Claude Commands?

**Claude Commands** (slash commands) are custom commands you create in `.claude/commands/` directory. When you type `/command-name`, Claude Code executes the instructions in that command file.

---

## How They Work

### 1. Create Command File

```bash
# Create a command
.claude/commands/review-code.md
```

### 2. Write Instructions

```markdown
# In .claude/commands/review-code.md

You are a senior code reviewer. Review the currently open file for:

1. **Code Quality**:
   - Follow DRY principles?
   - Proper error handling?
   - Clear variable names?

2. **Performance**:
   - Any obvious bottlenecks?
   - Efficient algorithms used?

3. **Security**:
   - Input validation?
   - SQL injection risks?
   - XSS vulnerabilities?

4. **Testing**:
   - Is this code testable?
   - Are tests needed?

Provide:
- ✅ What's good
- ⚠️  What needs improvement
- 🔴 Critical issues
- 💡 Suggestions

Be concise but thorough.
```

### 3. Use Command

```bash
# In Claude Code
/review-code

# Claude executes instructions and reviews your code
```

---

## SpecWeave-Specific Commands

### Command: /specweave-plan

**File**: `.claude/commands/specweave-plan.md`

```markdown
You are the SpecWeave feature planner.

## Task

Create a complete implementation plan for a new feature.

## Steps

1. **Ask for Feature Description**:
   - What feature do you want to build?
   - What problem does it solve?
   - Who are the users?

2. **Generate Feature Number**:
   - Scan `features/` directory
   - Find highest number
   - Increment by 1
   - Format: `###-short-name`

3. **Create Feature Structure**:
   ```
   features/###-feature-name/
   ├── spec.md              # WHAT and WHY
   ├── plan.md              # HOW
   ├── tasks.md             # STEPS
   ├── tests.md             # VALIDATION
   └── context-manifest.yaml # CONTEXT
   ```

4. **Generate Files**:
   - **spec.md**: User stories, acceptance criteria, success metrics
   - **plan.md**: Architecture, components, tech stack
   - **tasks.md**: 20-100 executable tasks, test-first
   - **tests.md**: Test cases (unit, integration, E2E)
   - **context-manifest.yaml**: What specs/docs to load

5. **Report**:
   ```
   ✅ Feature created: ###-feature-name
   Location: features/###-feature-name/
   Files created: 5
   Tasks: ## total

   Next steps:
   1. Review spec.md
   2. Approve plan.md
   3. Start implementation: /specweave-implement ###
   ```

## Principles

- Follow SpecWeave principles (documentation/principles.md)
- Technology-agnostic in spec.md
- Technology-specific in plan.md
- Test-first task ordering
- Context precision (use manifests)
```

---

### Command: /specweave-implement

**File**: `.claude/commands/specweave-implement.md`

```markdown
You are the SpecWeave developer.

## Task

Implement a feature following its implementation plan.

## Input

Feature number (e.g., 001)

## Steps

1. **Load Feature**:
   - Read `features/###-feature-name/plan.md`
   - Read `features/###-feature-name/tasks.md`
   - Read `features/###-feature-name/context-manifest.yaml`

2. **Load Context**:
   - Parse context manifest
   - Load specified specifications
   - Load specified documentation
   - Respect max_context_tokens budget

3. **Execute Tasks**:
   - Follow tasks.md order
   - Mark completed tasks: `[ ]` → `[x]`
   - Test-first: Write test before implementation
   - Ask for approval at critical points

4. **Report Progress**:
   ```
   📊 Feature: ###-feature-name
   Progress: ##/## tasks (##%)

   ✅ Completed:
   - [x] Task 1
   - [x] Task 2

   🔄 In Progress:
   - [ ] Task 3

   ⏳ Remaining:
   - [ ] Task 4
   - [ ] Task 5
   ```

5. **Completion**:
   ```
   ✅ Feature ###-feature-name complete!

   Implemented:
   - # files created
   - # tests written
   - # lines of code

   Next steps:
   1. Run tests: npm test
   2. Review changes
   3. Commit: git add . && git commit
   4. Update roadmap
   ```

## Principles

- Test-first development
- Context precision
- Document as you code
- Ask before destructive operations
```

---

### Command: /specweave-test

**File**: `.claude/commands/specweave-test.md`

```markdown
You are the SpecWeave QA engineer.

## Task

Generate comprehensive tests for a feature.

## Input

Feature number or file path

## Steps

1. **Analyze Feature**:
   - Read spec.md (what to test)
   - Read plan.md (how it's implemented)
   - Read tasks.md (what was built)

2. **Generate Test Strategy**:
   - **Unit Tests**: Individual components
   - **Integration Tests**: Component interactions
   - **E2E Tests**: Full user flows
   - **Performance Tests**: Load, stress
   - **Security Tests**: Vulnerabilities

3. **Create Test Cases**:
   ```markdown
   ### TC-001: [Test Name]
   **Type**: Unit | Integration | E2E
   **Priority**: P1 | P2 | P3

   **Scenario**:
   - Given: [precondition]
   - When: [action]
   - Then: [expected outcome]

   **Test Data**: [sample inputs]
   **Expected Results**: [specific outcomes]
   ```

4. **Implement Tests**:
   - Create test files
   - Use appropriate framework (Jest, Mocha, etc.)
   - Follow test-first principles
   - Aim for >80% coverage

5. **Report**:
   ```
   ✅ Tests generated for ###-feature-name

   Test cases: ##
   - Unit: ##
   - Integration: ##
   - E2E: ##

   Files created:
   - tests/unit/feature-name.test.js
   - tests/integration/feature-name.test.js
   - tests/e2e/feature-name.e2e.js

   Run tests: npm test
   ```
```

---

### Command: /specweave-docs

**File**: `.claude/commands/specweave-docs.md`

```markdown
You are the SpecWeave documentation updater.

## Task

Update living documentation after feature implementation.

## Input

Feature number or list of changed files

## Steps

1. **Analyze Changes**:
   - What was implemented?
   - What's new or changed?
   - What needs documenting?

2. **Update Documentation**:
   - **API Reference**: New endpoints, methods
   - **CLI Reference**: New commands, options
   - **Guides**: New how-to guides
   - **Architecture**: System design changes
   - **Changelog**: Add to monthly changelog

3. **Files to Update**:
   ```
   documentation/
   ├── reference/
   │   ├── api.md        # If APIs changed
   │   └── cli.md        # If CLI changed
   ├── guides/
   │   └── [new-guide].md # If new feature needs guide
   ├── architecture/
   │   └── [component].md # If architecture changed
   └── changelog/
       └── 2025-01.md    # Always update
   ```

4. **Preserve Manual Content**:
   - NEVER overwrite user-written guides
   - Only update auto-generated sections
   - Mark auto-updated sections: `<!-- AUTO-GENERATED -->`

5. **Report**:
   ```
   ✅ Documentation updated

   Updated files:
   - documentation/reference/api.md (+15 lines)
   - documentation/changelog/2025-01.md (+8 lines)

   Created files:
   - documentation/guides/new-feature.md

   Preview: mkdocs serve
   ```
```

---

### Command: /specweave-roadmap

**File**: `.claude/commands/specweave-roadmap.md`

```markdown
You are the SpecWeave project manager.

## Task

Update the project roadmap based on current feature status.

## Steps

1. **Scan Features**:
   - Read all `features/###-name/spec.md`
   - Extract status from frontmatter
   - Calculate completion percentage

2. **Update Roadmap**:
   ```markdown
   # features/roadmap.md

   ## In Progress
   - [001-context-loader](./001-context-loader/) - 30% complete

   ## Planned for v0.2.0
   - 002-skill-router
   - 003-docs-updater

   ## Completed
   - (None yet)
   ```

3. **Sync to External Tools** (if configured):
   - GitHub: Update project board
   - JIRA: Update epics/stories
   - Trello: Update cards

4. **Report**:
   ```
   ✅ Roadmap updated

   Status:
   - In Progress: # features (##% complete)
   - Planned: # features
   - Completed: # features

   Next release: v0.#.# (Target: YYYY-MM-DD)
   ```
```

---

## Creating Your Own Commands

### Template

**File**: `.claude/commands/[command-name].md`

```markdown
# Command: /[command-name]

You are a [role].

## Task

[What this command does]

## Input

[What the user provides]

## Steps

1. **Step 1**: [First action]
2. **Step 2**: [Second action]
3. **Step 3**: [Third action]

## Output

[What the user should see]

## Example

[Show example usage]
```

---

## Best Practices

### 1. Clear Instructions

```markdown
# Good
You are a code reviewer. Review the current file for:
1. Code quality (DRY, naming, error handling)
2. Performance (bottlenecks, efficiency)
3. Security (input validation, SQL injection)

# Bad
Review this code
```

### 2. Specific Steps

```markdown
# Good
## Steps
1. Read features/###-name/spec.md
2. Extract user stories
3. Generate test cases for each user story
4. Create test files in tests/ directory

# Bad
## Steps
1. Make tests
```

### 3. Output Format

```markdown
# Good
## Output

Provide results in this format:
```
✅ Tests generated: 15
- Unit: 8
- Integration: 5
- E2E: 2

Files created:
- tests/unit/feature.test.js
- tests/integration/feature.test.js
```

# Bad
## Output
Show results
```

---

## SpecWeave Command Library

### Complete Set

```
.claude/commands/
├── specweave-plan.md          # Plan new feature
├── specweave-implement.md     # Implement feature
├── specweave-test.md          # Generate tests
├── specweave-docs.md          # Update documentation
├── specweave-roadmap.md       # Update roadmap
├── specweave-validate.md      # Validate structure
├── specweave-sync.md          # Sync with JIRA/GitHub
└── specweave-analyze.md       # Analyze codebase (brownfield)
```

---

## Usage Examples

### Planning a Feature

```
You: /specweave-plan

Claude: What feature would you like to build?

You: Real-time chat with WebSockets

Claude:
✅ Feature created: 004-realtime-chat
Location: features/004-realtime-chat/
Files created:
- spec.md (5 user stories)
- plan.md (WebSocket architecture)
- tasks.md (65 tasks)
- tests.md (18 test cases)

Next: Review spec.md, then /specweave-implement 004
```

### Implementing a Feature

```
You: /specweave-implement 004

Claude:
📊 Feature: 004-realtime-chat
Loading context from manifest...
✅ Context loaded (8,500 tokens)

Starting implementation...

Phase 1: Setup (Tasks 1-5)
✅ [T001] Initialize WebSocket server
✅ [T002] Configure Socket.io
...

Progress: 12/65 tasks (18%)

Continue? (yes/no)
```

---

## Summary

**Claude Commands** let you create custom slash commands for exact manual actions:

1. **Create**: `.claude/commands/[name].md`
2. **Write**: Clear, step-by-step instructions
3. **Use**: `/[name]` in Claude Code

**For SpecWeave**:
- `/specweave-plan` - Plan features
- `/specweave-implement` - Implement features
- `/specweave-test` - Generate tests
- `/specweave-docs` - Update docs
- `/specweave-roadmap` - Update roadmap

**Benefits**:
- ✅ Repeatable workflows
- ✅ Consistent quality
- ✅ Clear instructions
- ✅ No need to re-explain each time

---

Create commands for common SpecWeave workflows and execute them with `/command-name`!
