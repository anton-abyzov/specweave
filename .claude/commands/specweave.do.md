---
name: specweave.do
description: Execute increment implementation following spec and plan - hooks run after EVERY task
---

# Do Increment

**Implementation Execution**: Following spec.md and plan.md to execute the increment work.

You are helping the user implement a SpecWeave increment by executing tasks from tasks.md with automatic documentation updates after EVERY task completion.

## Usage

```bash
# Auto-resumes from last incomplete task
/do <increment-id>

# Or let it find active increment automatically
/do
```

## Arguments

- `<increment-id>`: Optional. Increment ID (e.g., "001", "0001", "1", "0042")
  - If omitted, finds the active in-progress increment automatically
  - **Smart resume**: Automatically starts from next incomplete task

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

🎯 Ready to execute!
```

### Step 2: Smart Resume - Find Next Incomplete Task

**🎯 CRITICAL: Auto-resume functionality** - no need to remember which task you were on!

1. **Parse tasks.md**:
   - Scan all tasks in order
   - Check completion status (`[x]` = complete, `[ ]` = incomplete)
   - Find first incomplete task

2. **Determine starting point**:
   - If all tasks complete → Show completion message
   - If tasks incomplete → Resume from first incomplete task
   - If no tasks started → Start from T001

3. **Show resume context**:
   ```
   📊 Resume Context:

   Completed: 3/12 tasks (25%)
   ├─ [✅] T001: Setup auth module (P1)
   ├─ [✅] T002: Create user model (P1)
   ├─ [✅] T003: Implement JWT tokens (P1)
   └─ [⏳] T004: Add password hashing (P1) ← RESUMING HERE

   Remaining: 9 tasks (estimated 2 weeks)
   ```

**Why smart resume?**
- ✅ No manual tracking needed
- ✅ Seamlessly continue after breaks
- ✅ Prevents duplicate work
- ✅ Shows progress at a glance

### Step 3: Update Status to In-Progress (if needed)

If status is "planned", update `spec.md` frontmatter:

```yaml
---
increment: 0001-user-authentication
status: in-progress      # ← Changed from "planned"
started: 2025-10-28      # ← Start date
---
```

If already "in-progress", keep existing metadata.

### Step 4: Execute Tasks Sequentially

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

4. **🔥 CRITICAL: After EVERY task completion**:

   **Step A: Hook executes automatically (via .claude/hooks.json)**:
   - 🔊 Plays completion sound (Glass.aiff on macOS)
   - 📝 Shows reminder message
   - ✅ This happens automatically when you mark task complete

   **Step B: Update project documentation inline**:
   - Update CLAUDE.md if task added:
     - New commands or CLI flags
     - New file structure
     - New configuration options
     - New skills or agents
   - Update README.md if task added:
     - User-facing features
     - Installation steps
     - Usage examples
     - API changes
   - Update CHANGELOG.md if task added:
     - Public API changes
     - Breaking changes
     - New features

   **Step C: Continue to next task**:
   - Do NOT call `/sync-docs` yet (wait until all tasks complete)
   - Move to next incomplete task

**Example task execution**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK T001: Create User model (PostgreSQL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Task details:
   • File: src/models/User.ts
   • Description: Create User model with Prisma
   • Acceptance: Model has id, email, passwordHash, createdAt fields

🔨 Executing...
   ✓ Created src/models/User.ts
   ✓ Added Prisma schema definition
   ✓ Generated migration file
   ✓ Added inline documentation

✅ Task T001 completed

🔊 [Glass.aiff plays automatically via hook]
🔔 Task completed! Remember to update documentation...

📝 Updating project documentation:
   ✓ Updated CLAUDE.md (added User model to schema reference)
   ✓ Updated README.md (added database section with example)
   ✓ No CHANGELOG.md update needed (internal model)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Progress: 1/42 tasks (2%) | Estimated remaining: 3.9 weeks

Moving to next task...
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

🔊 [Playing celebration sound...]

📝 Now syncing implementation learnings to living docs...
```

**CRITICAL: Now run `/sync-docs update` to sync to living docs**:

```bash
/sync-docs update
```

This will:
- Update ADRs with implementation details (Proposed → Accepted)
- Update API documentation with actual endpoints
- Update architecture diagrams with actual system
- Update feature lists with completed features
- May prompt for conflict resolution if needed

**After `/sync-docs update` completes**:

```
✅ Living documentation synchronized!

Next steps:
1. Run full test suite: npm test
2. Validate increment: /validate 0001 --quality
3. Close increment: /done 0001 (PM validates before closing)
```

---

## Hook Integration (CRITICAL!)

**Post-Task Completion Hook** runs after EVERY task via `.claude/hooks.json`:

### Configuration

**File**: `.claude/hooks.json`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "TodoWrite",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/post-task-completion.sh"
          }
        ]
      }
    ]
  }
}
```

**Hook Script**: `.claude/hooks/post-task-completion.sh`

```bash
#!/bin/bash
# Plays completion sound and outputs reminder JSON
# Output: {"continue": true, "systemMessage": "Task completed! Update docs..."}
```

### Hook Behavior

**After EVERY task completion (via TodoWrite)**:

1. **Play sound synchronously**:
   - macOS: Glass.aiff via `afplay`
   - Linux: complete.oga via `paplay`
   - Windows: chimes.wav via PowerShell
   - Sound plays BEFORE Claude continues

2. **Show reminder**:
   - JSON systemMessage displayed to user
   - Reminds to update CLAUDE.md, README.md inline

3. **Log completion**:
   - Appends to `.specweave/logs/tasks.log`

### Documentation Updates (Manual)

After each task, Claude should manually update:

- **CLAUDE.md**: New commands, file structure, config options, skills, agents
- **README.md**: User-facing features, installation, usage, API changes
- **CHANGELOG.md**: Public API changes, breaking changes, new features

**Living docs sync** (via `/sync-docs update`):
- Only after ALL tasks complete
- Updates `.specweave/docs/` with implementation learnings
- Updates ADRs from Proposed → Accepted
- Updates architecture diagrams with actual system

---

## Examples

### Example 1: Execute Complete Increment

```bash
/do 0001
```

**Output**:
```
📂 Loading increment 0001-user-authentication...

✅ Context loaded (spec.md, plan.md, tasks.md, tests.md)

🔨 Starting execution (42 tasks)...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Task T001: Create User model
✅ Completed | 🪝 Docs updated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[... continues for all 42 tasks ...]

🎉 All tasks completed (42/42)

Next: /validate 0001 --quality
```

### Example 2: Execute with Blocker

```bash
/do 0002
```

**Output**:
```
📂 Loading increment 0002-payment-processing...

🔨 Executing tasks...

Task T005: Integrate Stripe payment
⚠️ Blocker: Stripe API key not in .env

Options:
  A) Add API key now (provide test key)
  B) Skip for now, add as separate task
  C) Use mock payment provider

Your choice? [A/B/C]: _
```

### Example 3: Execute with Test Failure

```bash
/do 0003
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

Usage: /do <increment-id>
```

### Increment Not Planned
```
❌ Error: Cannot execute increment 0001 (status: backlog)

Increment must be "planned" before execution.

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
- `/validate`: Validate quality before executing
- `/specweave done`: Close increment (PM validates completion)
- `/list-increments`: List all increments with status

---

## Related Skills

- `context-loader`: Loads relevant context (70% token reduction)
- `nodejs-backend`: Node.js implementation knowledge
- `python-backend`: Python implementation knowledge
- `nextjs`: Next.js implementation knowledge
- `frontend`: React/Vue/Angular implementation knowledge

---

## Why "/do" instead of "/do"?

**Universal applicability**: SpecWeave isn't just for software engineering!

- Software projects: Writing code, tests, documentation
- Writing projects: Chapters, articles, research papers
- Design projects: Mockups, prototypes, design systems
- Business projects: Reports, analyses, presentations
- Creative projects: Scripts, storyboards, content

"/do" works for any domain - it's about **executing the planned work**, whatever that work may be.

---

**Important**: This command is designed for continuous execution. It's normal to run `/do` and let it execute multiple tasks sequentially with documentation updates after each one.

**Best Practice**: Always run `/validate 0001 --quality` after execution to ensure quality before closing with `/done`.
