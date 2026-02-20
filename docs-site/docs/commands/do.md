---
sidebar_position: 3
---

# /sw:do - Execute Tasks

**Implementation Execution**: Execute increment tasks following spec.md and plan.md.

This is the main command for doing work in SpecWeave. It smart-resumes from where you left off, runs tests continuously, and updates documentation after each task.

## Usage

```bash
# Auto-resumes from last incomplete task
/sw:do [increment-id]

# Or let it find active increment automatically
/sw:do

# Override model selection (advanced)
/sw:do 0007 --model haiku
/sw:do 0007 --model opus
```

## Arguments

| Argument | Description |
|----------|-------------|
| `increment-id` | Optional. Increment ID (e.g., "0007", "0001-feature") |
| `--model <tier>` | Optional. Override model selection (haiku, sonnet, opus) |

---

## Smart Resume

The command automatically resumes from the last incomplete task:

```
📊 Resume Context:

Completed: 3/12 tasks (25%)
├─ [✅] T001: ⚡ haiku - Setup auth module (P1)
├─ [✅] T002: ⚡ haiku - Create user model (P1)
├─ [✅] T003: 💎 opus - Implement JWT tokens (P1)
└─ [⏳] T004: ⚡ haiku - Add password hashing (P1) ← RESUMING HERE

Remaining: 9 tasks
```

**Benefits:**
- ✅ No manual tracking needed
- ✅ Seamlessly continue after breaks
- ✅ Prevents duplicate work
- ✅ Shows progress at a glance

---

## Workflow

### Step 1: Load Context

1. **Find increment directory** - Normalizes ID to 4-digit format
2. **Load specification and plan** - Reads spec.md, plan.md, tasks.md
3. **Load Living Docs Context** (optional) - Checks ADRs and related specs
4. **Verify readiness** - Validates status and AC presence

### Step 2: Smart Resume

- Scans all tasks for completion status
- Finds first incomplete task
- Shows resume context with progress

### Step 3: Execute Tasks Sequentially

For each task:

1. **Read task details** - ID, model hint, description, ACs
2. **Select execution model** - Uses hints or `--model` override
3. **Execute task** - Follows architecture from plan.md
4. **Mark task complete** - Updates tasks.md with `[x]`
5. **Run hooks** - Plays sound, shows reminder
6. **Sync to GitHub** (if enabled) - Closes issues, updates progress
7. **Update docs** - CLAUDE.md, README.md, CHANGELOG.md

### Step 4: Handle Blockers

If a task cannot be completed:

```
⚠️ Blocker on Task T012: "Add email verification"

Issue: Email service provider not specified in plan.md

Options:
  A) Use SendGrid (recommended)
  B) Use AWS SES
  C) Skip for now, add as new task
```

### Step 5: Run Tests Continuously

After completing tasks that affect testable functionality:

```
🧪 Running tests for auth module...

  ✓ User model validation
  ✓ Password hashing
  ✗ JWT token generation (FAILED)

🔧 Fixing test failure...
   • Updated JWT expiry config

Re-running tests...
  ✓ JWT token generation

✅ All tests passing (3/3)
```

### Step 6: Completion

When all tasks complete:

```
🎉 All tasks completed!

✅ Tasks: 42/42 (100%)
⏱️  Time taken: 3.2 weeks

📝 Now syncing implementation learnings to living docs...

Next steps:
1. Run full test suite: npm test
2. Validate increment: /sw:validate 0001 --quality
3. Close increment: /sw:done 0001
```

---

## Model Hints in Tasks

Tasks can include model hints for cost optimization:

| Hint | Model | Use Case |
|------|-------|----------|
| ⚡ | Haiku | Simple mechanical tasks (3x faster, 20x cheaper) |
| 🧠 | Sonnet | Moderate complexity (legacy) |
| 💎 | Opus | Complex reasoning (default) |

Example tasks.md:

```markdown
### T-001: Setup auth module ⚡
**Status**: [ ] pending

### T-002: Implement JWT strategy 💎
**Status**: [ ] pending
```

---

## Hook Integration

After EVERY task completion, hooks run automatically:

1. **Play completion sound** - Glass.aiff on macOS
2. **Show reminder** - Update CLAUDE.md, README.md inline
3. **Log completion** - Appends to `.specweave/logs/tasks.log`
4. **Sync to GitHub** (if enabled) - Close task issue, update epic

---

## Auto-Execute Rules

When executing deployment tasks:

```
❌ FORBIDDEN: "Next Steps: Run wrangler deploy"
✅ REQUIRED: Execute commands DIRECTLY using available credentials
```

Always check for credentials before deployment:

```bash
grep -E "SUPABASE|DATABASE_URL|CF_" .env 2>/dev/null
wrangler whoami 2>/dev/null
gh auth status 2>/dev/null
```

---

## Examples

### Example 1: Execute Complete Increment

```bash
/sw:do 0001
```

Output:
```
📂 Loading increment 0001-user-authentication...

✅ Context loaded (spec.md, plan.md, tasks.md)

🔨 Starting execution (42 tasks)...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Task T001: Create User model
✅ Completed | 🪝 Docs updated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[... continues for all 42 tasks ...]

🎉 All tasks completed (42/42)

Next: /sw:validate 0001 --quality
```

### Example 2: Resume After Break

```bash
/sw:do
```

Output:
```
📂 Found active increment: 0003-payment-processing

📊 Resume Context:
   Completed: 15/42 tasks (36%)
   ← Resuming from T016: Add Stripe webhook handler

🔨 Executing Task T016...
```

---

## Error Handling

### Increment Not Found
```
❌ Error: Increment 0001 not found

Available increments:
  • 0002-core-enhancements (planned)
  • 0003-payment-processing (in-progress)
```

### No Tasks to Execute
```
⚠️ Warning: No tasks found in tasks.md

Options:
  1. Re-plan increment: /sw:increment 0001
  2. Add tasks manually: Edit tasks.md
```

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw:increment` | Plan increment (creates spec.md, plan.md, tasks.md) |
| `/sw:progress` | Check completion status |
| `/sw:validate` | Validate quality before closing |
| `/sw:done` | Close increment (PM validates) |
| `/sw:auto` | Autonomous execution mode |

---

## Best Practices

1. **Run `/sw:validate --quality`** after execution to ensure quality
2. **Let hooks run** - They update docs and sync to GitHub automatically
3. **Use model hints** - Add ⚡/💎 to tasks for cost optimization
4. **Check progress often** - Run `/sw:progress` to see status

---

## See Also

- [Commands Overview](./overview) - All SpecWeave commands
- [/sw:auto Documentation](./auto) - Autonomous execution
- [/sw:progress Documentation](./status) - Progress tracking
- [/sw:done Documentation](./status-management) - Closing increments
