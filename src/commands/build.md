---
name: build
description: Execute increment implementation following spec and plan - hooks run after EVERY task
---

# Build Increment

**Implementation Execution**: Following spec.md and plan.md to build the increment.

You are helping the user implement a SpecWeave increment by executing tasks from tasks.md with automatic documentation updates after EVERY task completion.

## Usage

```bash
/build <increment-id>
```

## Arguments

- `<increment-id>`: Required. Increment ID (e.g., "001", "0001", "1", "0042")

---

## Workflow

### Step 1: Load Context

1. **Find increment directory**:
   - Normalize ID to 4-digit format (e.g., "1" → "0001")
   - Find `.specweave/increments/0001-name/`
   - Verify increment exists

2. **Load specification and plan**:
   - Read `spec.md` - Understand WHAT and WHY
   - Read `plan.md` - Understand HOW
   - Read `tasks.md` - Understand implementation steps
   - Read `tests.md` - Understand test strategy

3. **Verify readiness**:
   - Check status is "planned" (not already in-progress or completed)
   - Check no blocking dependencies
   - Check tasks.md has tasks to execute

**Example output**:
```
📂 Loading increment 0001-user-authentication...

✅ Loaded context:
   • spec.md (6 user stories, 15 requirements)
   • plan.md (Architecture: JWT + PostgreSQL)
   • tasks.md (42 tasks, estimated 3-4 weeks)
   • tests.md (12 test cases, 85% coverage)

🎯 Ready to build!
```

### Step 2: Update Status to In-Progress

Update `spec.md` frontmatter:

```yaml
---
increment: 0001-user-authentication
status: in-progress      # ← Changed from "planned"
started: 2025-10-28      # ← Start date
---
```

### Step 3: Execute Tasks Sequentially

**For each task in tasks.md**:

1. **Read task details**:
   - Task ID (T001, T002, etc.)
   - Description
   - Acceptance criteria
   - File paths affected
   - Implementation notes

2. **Execute task**:
   - Follow plan.md architecture
   - Implement using detected tech stack
   - Write clean, maintainable code
   - Add inline documentation

3. **Mark task complete** in tasks.md:
   - Change `[ ]` → `[x]`
   - Add completion timestamp
   - Note any deviations from plan

4. **🔥 CRITICAL: Run hooks after EVERY task**:
   - Hook: `post-task-completion`
   - Actions:
     - Update documentation (CLAUDE.md, README.md)
     - Update CHANGELOG.md if needed
     - Verify docs reflect new code
     - Check for doc/code drift

**Example task execution**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK T001: Create User model (PostgreSQL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Task details:
   • File: src/models/User.ts
   • Description: Create User model with Prisma
   • Acceptance: Model has id, email, passwordHash, createdAt fields

🔨 Implementing...
   ✓ Created src/models/User.ts
   ✓ Added Prisma schema definition
   ✓ Generated migration file
   ✓ Added inline documentation

✅ Task T001 completed

🪝 Running post-task hooks...
   ✓ Updated CLAUDE.md (added User model to schema)
   ✓ Updated README.md (added database section)
   ✓ Verified documentation consistency

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Progress: 1/42 tasks (2%) | Estimated remaining: 3.9 weeks
```

### Step 4: Handle Blockers

If a task cannot be completed:

1. **Document blocker**:
   - Add to tasks.md as note
   - Explain reason (missing dependency, unclear requirement, etc.)

2. **Ask user for clarification**:
   - Present blocker clearly
   - Offer solutions or alternatives
   - Wait for user decision

3. **Continue or pause**:
   - Skip to next task if blocker is non-blocking
   - Pause if blocker is critical

**Example blocker**:
```
⚠️ Blocker on Task T012: "Add email verification"

Issue: Email service provider not specified in plan.md

Options:
  A) Use SendGrid (recommended, $15/month)
  B) Use AWS SES (cheaper, $1/1000 emails)
  C) Use SMTP (self-hosted, free but complex)
  D) Skip for now, add as new task later

Your choice? [A/B/C/D]: _
```

### Step 5: Run Tests Continuously

**After completing tasks that affect testable functionality**:

1. **Run relevant tests**:
   - Unit tests for the module
   - Integration tests if applicable
   - Show pass/fail status

2. **If tests fail**:
   - Show error details
   - Fix immediately
   - Re-run tests
   - Continue only when tests pass

**Example test run**:
```
🧪 Running tests for auth module...

  ✓ User model validation
  ✓ Password hashing
  ✗ JWT token generation (FAILED)
    Expected token to expire in 24h, got 1h

🔧 Fixing test failure...
   • Updated JWT expiry config in plan.md
   • Fixed token generation in src/auth/jwt.ts

Re-running tests...

  ✓ JWT token generation

✅ All tests passing (3/3)
```

### Step 6: Progress Tracking

**Show progress regularly**:

```
📊 Increment Progress: 0001-user-authentication

Tasks completed: 15/42 (36%)
Time elapsed: 1.2 weeks
Estimated remaining: 2.1 weeks
On track: ✅ Yes

Current phase: Backend Implementation
Next phase: Frontend Integration

Recent completions:
  ✓ T012: Add email verification (2h ago)
  ✓ T013: Implement password reset (1h ago)
  ✓ T014: Add rate limiting (30m ago)

Up next:
  [ ] T015: Create login API endpoint
  [ ] T016: Add JWT middleware
```

### Step 7: Completion Check

**When all tasks marked complete**:

```
🎉 All tasks completed!

✅ Tasks: 42/42 (100%)
⏱️  Time taken: 3.2 weeks (vs estimated 3-4 weeks)

Next steps:
1. Run full test suite: npm test
2. Validate increment: /validate 0001 --quality
3. Close increment: /done 0001 (PM validates before closing)
```

---

## Hook Integration (CRITICAL!)

**Post-Task Completion Hook** runs after EVERY task:

### Configuration

**File**: `.specweave/config.yaml`

```yaml
hooks:
  enabled: true
  post_task_completion:
    enabled: true        # ← MUST be true
    actions:
      - update_documentation    # Update CLAUDE.md, README.md
      - update_changelog        # Update CHANGELOG.md if public API changes
      - verify_consistency      # Check docs match code
```

### Hook Behavior

**After EVERY task completion**:

1. **Scan changed files**:
   - Detect new functions, classes, APIs
   - Detect changed behavior
   - Detect new configuration

2. **Update documentation**:
   - CLAUDE.md: Add to quick reference tables
   - README.md: Update examples if needed
   - API docs: Regenerate if API changed

3. **Verify consistency**:
   - Check docs mention new features
   - Check no stale references
   - Check examples still work

4. **Report**:
```
🪝 Post-task documentation update:

Files updated:
  • CLAUDE.md (+3 lines: Added User model to schema reference)
  • README.md (+12 lines: Added authentication example)

Consistency checks:
  ✓ All code references up to date
  ✓ Examples tested and working
  ✓ No stale documentation

Documentation drift: 0% (perfect sync)
```

---

## Examples

### Example 1: Build Complete Increment

```bash
/build 0001
```

**Output**:
```
📂 Loading increment 0001-user-authentication...

✅ Context loaded (spec.md, plan.md, tasks.md, tests.md)

🔨 Starting implementation (42 tasks)...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Task T001: Create User model
✅ Completed | 🪝 Docs updated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[... continues for all 42 tasks ...]

🎉 All tasks completed (42/42)

Next: /validate 0001 --quality
```

### Example 2: Build with Blocker

```bash
/build 0002
```

**Output**:
```
📂 Loading increment 0002-payment-processing...

🔨 Implementing tasks...

Task T005: Integrate Stripe payment
⚠️ Blocker: Stripe API key not in .env

Options:
  A) Add API key now (provide test key)
  B) Skip for now, add as separate task
  C) Use mock payment provider

Your choice? [A/B/C]: _
```

### Example 3: Build with Test Failure

```bash
/build 0003
```

**Output**:
```
📂 Loading increment 0003-reporting-dashboard...

Task T008: Add CSV export
✅ Completed

🧪 Running tests...
  ✗ CSV export test failed
    Expected: 1000 rows
    Got: 999 rows (off-by-one error)

🔧 Fixing test failure...
   • Fixed loop boundary in src/reports/csv.ts

✅ Tests now passing (12/12)

🪝 Docs updated

Next task: T009
```

---

## Error Handling

### Increment Not Found
```
❌ Error: Increment 0001 not found

Available increments:
  • 0002-core-enhancements (planned)
  • 0003-payment-processing (in-progress)

Usage: /build <increment-id>
```

### Increment Not Planned
```
❌ Error: Cannot build increment 0001 (status: backlog)

Increment must be "planned" before building.

Run: /increment "User authentication" to plan this increment first.
```

### No Tasks to Execute
```
⚠️ Warning: No tasks found in tasks.md

This usually means:
  1. Tasks weren't auto-generated from plan.md
  2. Tasks.md is empty or missing

Options:
  1. Re-plan increment: /increment 0001 (regenerate tasks)
  2. Add tasks manually: Edit .specweave/increments/0001-name/tasks.md
```

---

## Related Commands

- `/increment`: Plan increment (creates spec.md, plan.md, tasks.md)
- `/validate`: Validate quality before building
- `/done`: Close increment (PM validates completion)
- `/list-increments`: List all increments with status

---

## Related Skills

- `context-loader`: Loads relevant context (70% token reduction)
- `nodejs-backend`: Node.js implementation knowledge
- `python-backend`: Python implementation knowledge
- `nextjs`: Next.js implementation knowledge
- `frontend`: React/Vue/Angular implementation knowledge

---

**Important**: This command is designed for continuous execution. It's normal to run `/build` and let it execute multiple tasks sequentially with documentation updates after each one.

**Best Practice**: Always run `/validate 0001 --quality` after building to ensure quality before closing with `/done`.
