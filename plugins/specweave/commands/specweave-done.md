---
name: specweave:done
description: Close increment with PM validation - checks tasks, tests, and docs before closing
---

# Close Increment (PM Validated)

**Product Manager-Led Closure**: PM validates tasks, tests, and docs before closing.

You are acting as the Product Manager to validate increment completion before closure. You must check all 3 gates: tasks done, tests passing, and docs updated.

**NEW (v0.8.0+)**: Automatic GitHub issue reopening when validation fails. If PM gates fail and a GitHub issue exists for this increment, the system automatically reopens the issue with validation failure details. This ensures issues aren't prematurely closed when work is incomplete.

## Usage

```bash
/specweave:done <increment-id>
```

## Arguments

- `<increment-id>`: Required. Increment ID (e.g., "001", "0001", "1", "0042")

---

## Workflow

### Step 1: Load Increment Context

1. **Find increment directory**:
   - Normalize ID to 4-digit format (e.g., "1" → "0001")
   - Find `.specweave/increments/0001-name/`
   - Verify increment exists and is in-progress

2. **Load all documents**:
   - `spec.md` - Requirements and acceptance criteria
   - `plan.md` - Architecture and implementation approach
   - `tasks.md` - Implementation tasks
   - `tests.md` - Test strategy

**Example output**:
```
📂 Loading increment 0001-user-authentication...

✅ Context loaded:
   • spec.md (6 user stories, 15 requirements)
   • plan.md (Architecture: JWT + PostgreSQL)
   • tasks.md (42 tasks)
   • tests.md (12 test cases)

🎯 Validating readiness for closure...
```

### Step 2: PM Validation (3 Gates)

**🔥 CRITICAL: PM agent MUST validate all 3 gates before allowing closure!**

**⛔ CRITICAL: PM Validation Report File Location**

When the PM agent writes the validation report, it MUST go in the `reports/` subfolder:
- ✅ **CORRECT**: `.specweave/increments/####-name/reports/PM-VALIDATION-REPORT.md`
- ❌ **WRONG**: `.specweave/increments/####-name/PM-VALIDATION-REPORT.md`

**Folder structure rules**:
- ONLY spec.md, plan.md, tasks.md allowed in increment root
- ALL reports MUST go in `reports/` subfolder
- ALL scripts MUST go in `scripts/` subfolder
- ALL logs MUST go in `logs/` subfolder

Invoke PM agent with validation task:

```
PM Agent: Please validate if increment 0001 is ready to close.

Check these 3 gates:
1. ✅ All tasks completed (especially P1 priority)
2. ✅ Tests passing (unit, integration, E2E if applicable)
3. ✅ Documentation updated (CLAUDE.md, README.md reflect new features)

Provide detailed feedback for each gate.
```

#### Gate 1: Tasks Completed ✅

**PM checks**:
- [ ] All P1 (critical) tasks completed
- [ ] All P2 (important) tasks completed OR deferred with reason
- [ ] P3 (nice-to-have) tasks completed, deferred, or moved to backlog
- [ ] No tasks in "blocked" state
- [ ] Acceptance criteria for each task met

**Example check**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GATE 1: Tasks Completion
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Checking tasks.md...

Priority P1 (Critical): 12 tasks
  ✅ 12/12 completed (100%)

Priority P2 (Important): 18 tasks
  ✅ 16/18 completed (89%)
  ⚠️ 2 deferred to next increment (with reason)

Priority P3 (Nice-to-have): 12 tasks
  ✅ 8/12 completed (67%)
  📋 4 moved to backlog (acceptable)

Status: ✅ PASS
  • All critical tasks completed
  • P2 deferrals documented with valid reasons
  • P3 tasks appropriately triaged
```

**If tasks incomplete**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GATE 1: Tasks Completion
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ FAIL - Incomplete tasks found

Priority P1 (Critical): 12 tasks
  ⚠️ 10/12 completed (83%)
  ❌ 2 tasks INCOMPLETE:
     - T005: Add password hashing (CRITICAL - security requirement)
     - T008: Implement JWT validation (CRITICAL - authentication won't work)

Recommendation: ❌ CANNOT close increment
  • Complete T005 and T008 (security critical)
  • These are core authentication features from spec.md
  • Estimated effort: 4-6 hours
```

#### Gate 2: Tests Passing ✅

**PM checks**:
- [ ] All test suites passing (no failures)
- [ ] Test coverage meets requirements (>80% for critical paths)
- [ ] E2E tests passing (if UI exists)
- [ ] No skipped tests without documentation
- [ ] Test cases align with acceptance criteria in spec.md

**Example check**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GATE 2: Tests Passing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Running test suite...

Unit Tests:
  ✅ 47/47 passing
  ✅ Coverage: 89% (above 80% target)

Integration Tests:
  ✅ 15/15 passing
  ✅ All API endpoints tested

E2E Tests:
  ✅ 8/8 passing
  ✅ Login flow verified
  ✅ Password reset flow verified

Test Coverage by Component:
  • User model: 95%
  • Auth service: 92%
  • JWT middleware: 88%
  • Password util: 90%

Status: ✅ PASS
  • All tests passing
  • Coverage exceeds target
  • E2E tests validate user stories
```

**If tests failing**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GATE 2: Tests Passing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ FAIL - Tests failing

Unit Tests:
  ⚠️ 45/47 passing (96%)
  ❌ 2 FAILURES:
     - test/auth/jwt.test.ts: Token expiry validation
       Expected 24h, got 1h
     - test/auth/password.test.ts: Weak password rejection
       Allowed weak password "password123"

Integration Tests:
  ✅ 15/15 passing

E2E Tests:
  ❌ 7/8 passing (88%)
  ❌ 1 FAILURE:
     - test/e2e/login.spec.ts: Rate limiting test
       Expected 429 after 5 attempts, got 200

Recommendation: ❌ CANNOT close increment
  • Fix JWT expiry configuration (security issue)
  • Strengthen password validation (spec.md requirement)
  • Fix rate limiting (prevents brute force attacks)
  • Estimated effort: 2-3 hours
```

#### Gate 3: Documentation Updated ✅

**PM checks**:
- [ ] CLAUDE.md updated with new features
- [ ] README.md updated with usage examples
- [ ] CHANGELOG.md updated (if public API changed)
- [ ] API documentation regenerated (if applicable)
- [ ] Inline code documentation complete
- [ ] No stale references to old code

**Example check**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GATE 3: Documentation Updated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Checking documentation updates...

CLAUDE.md:
  ✅ Added authentication section
  ✅ Added User model to schema reference
  ✅ Updated slash commands table
  ✅ No stale references found

README.md:
  ✅ Added authentication quick start example
  ✅ Updated API documentation link
  ✅ Added database setup instructions

CHANGELOG.md:
  ✅ Added v0.1.7 entry
  ✅ Listed new authentication features
  ✅ Migration guide included

Inline Documentation:
  ✅ All public functions documented (JSDoc)
  ✅ API routes have descriptions
  ✅ Complex logic explained with comments

Status: ✅ PASS
  • All documentation current
  • Examples tested and working
  • No doc/code drift detected
```

**If docs outdated**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GATE 3: Documentation Updated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ FAIL - Documentation outdated

CLAUDE.md:
  ⚠️ Partially updated
  ❌ Missing authentication section in quick reference
  ❌ Slash commands table doesn't mention /login

README.md:
  ❌ Not updated
  ❌ No authentication examples
  ❌ Setup instructions don't mention database migrations

CHANGELOG.md:
  ❌ Not updated
  ❌ v0.1.7 entry missing

Inline Documentation:
  ⚠️ 80% complete
  ❌ JWT middleware missing JSDoc comments
  ❌ Password util functions undocumented

Recommendation: ❌ CANNOT close increment
  • Update CLAUDE.md with authentication section
  • Add authentication examples to README.md
  • Create CHANGELOG.md entry for v0.1.7
  • Document JWT and password utilities
  • Estimated effort: 1-2 hours
```

### Step 3: PM Decision

**Based on 3-gate validation**:

#### Scenario A: All Gates Pass ✅

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PM VALIDATION RESULT: ✅ READY TO CLOSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Gate 1: Tasks Completed (100% P1, 89% P2)
✅ Gate 2: Tests Passing (70/70, 89% coverage)
✅ Gate 3: Documentation Updated (all current)

Increment Summary:
  • Started: 2025-10-14
  • Duration: 14 days (vs 21 days estimated)
  • Velocity: +50% faster than planned
  • Quality: Excellent

Business Value Delivered:
  • Users can register and log in
  • JWT authentication secure and tested
  • Password security meets OWASP standards
  • Rate limiting prevents brute force attacks

PM Approval: ✅ APPROVED for closure

Closing increment 0001-user-authentication...
  ✓ Updated status: in-progress → completed
  ✓ Set completion date: 2025-10-28
  ✓ Generated completion report
  ✓ Updated backlog (4 P3 tasks moved)

🎉 Increment 0001 closed successfully!
```

### Step 4: Post-Closure Sync (AUTOMATIC)

**CRITICAL**: After increment closes, automatically perform these syncs:

#### A) Sync Living Docs to GitHub Project

**Check configuration** (`.specweave/config.json`):
```typescript
// Check if GitHub sync is enabled
const syncEnabled = config.hooks?.post_increment_done?.sync_to_github_project === true;
```

**If enabled**:
1. **Find living docs spec**:
   - Look for `.specweave/docs/internal/specs/spec-{id}*.md`
   - Pattern 1: `spec-0001-user-authentication.md` (4-digit)
   - Pattern 2: `spec-001-user-authentication.md` (3-digit)
   - Check increment `spec.md` for reference

2. **Sync to GitHub Project**:
   ```bash
   /specweave-github:sync-spec <spec-file>
   ```

3. **Report result**:
   ```
   🔗 Post-Closure Sync:
      ✓ Found living docs: spec-0001-user-authentication.md
      ✓ Syncing to GitHub Project...
      ✓ GitHub Project updated successfully
   ```

**If spec not found**:
```
ℹ️ No living docs spec found (OK for bug/hotfix increments)
```

**If sync disabled**:
```
ℹ️ GitHub Project sync disabled in config
```

#### B) Close GitHub Issue (if exists)

**Check metadata** (`.specweave/increments/0001/.metadata.json`):
```json
{
  "github": {
    "issue": 42,
    "url": "https://github.com/org/repo/issues/42"
  }
}
```

**If issue exists AND config.hooks.post_increment_done.close_github_issue = true**:
1. **Close issue via gh CLI**:
   ```bash
   gh issue close 42 --comment "✅ Increment 0001 completed and closed

   All PM gates passed:
   ✅ Gate 1: Tasks completed
   ✅ Gate 2: Tests passing
   ✅ Gate 3: Documentation updated

   Duration: 14 days
   Velocity: +50% faster than planned"
   ```

2. **Report result**:
   ```
   🐙 GitHub Issue:
      ✓ Closed issue #42
      ✓ Added completion summary
   ```

**If no issue**:
```
ℹ️ No GitHub issue linked to this increment
```

#### C) Sync Status to External Tools (NEW in Phase 2)

**CRITICAL**: After increment completes, automatically sync status to all linked external tools (GitHub, JIRA, Azure DevOps).

**Check metadata** (`.specweave/increments/0001/.metadata.json`):
```json
{
  "github": {
    "issue": 42,
    "url": "https://github.com/org/repo/issues/42"
  },
  "jira": {
    "issue": "PROJ-123",
    "url": "https://company.atlassian.net/browse/PROJ-123"
  },
  "ado": {
    "workItem": 456,
    "url": "https://dev.azure.com/org/project/_workitems/edit/456"
  }
}
```

**Check configuration** (`.specweave/config.json`):
```json
{
  "sync": {
    "statusSync": {
      "enabled": true,
      "autoSync": true,
      "promptUser": true,
      "conflictResolution": "last-write-wins",
      "mappings": {
        "github": {
          "completed": "closed"
        },
        "jira": {
          "completed": "Done"
        },
        "ado": {
          "completed": "Closed"
        }
      }
    }
  }
}
```

**If status sync enabled AND external links exist**:

1. **GitHub Status Sync** (if GitHub issue linked):
   ```typescript
   // Use StatusSyncEngine to sync status
   import { StatusSyncEngine } from '../../../src/core/sync/status-sync-engine.js';
   import { GitHubStatusSync } from '../../../plugins/specweave-github/lib/github-status-sync.js';

   const engine = new StatusSyncEngine(config);
   const githubSync = new GitHubStatusSync(token, owner, repo);

   // Prompt user
   const shouldSync = await promptUser("Update GitHub issue #42 to 'closed'?");

   if (shouldSync) {
     const result = await engine.syncToExternal({
       incrementId: '0001-user-authentication',
       tool: 'github',
       localStatus: 'completed',
       localTimestamp: new Date().toISOString()
     });

     if (result.success) {
       await githubSync.updateStatus(42, result.externalMapping);
       await githubSync.postStatusComment(42, 'active', 'completed');
     }
   }
   ```

2. **JIRA Status Sync** (if JIRA issue linked):
   ```typescript
   import { JiraStatusSync } from '../../../plugins/specweave-jira/lib/jira-status-sync.js';

   const jiraSync = new JiraStatusSync(domain, email, apiToken, projectKey);

   const shouldSync = await promptUser("Update JIRA issue PROJ-123 to 'Done'?");

   if (shouldSync) {
     const result = await engine.syncToExternal({
       incrementId: '0001-user-authentication',
       tool: 'jira',
       localStatus: 'completed',
       localTimestamp: new Date().toISOString()
     });

     if (result.success) {
       await jiraSync.updateStatus('PROJ-123', result.externalMapping);
       await jiraSync.postStatusComment('PROJ-123', 'In Progress', 'completed');
     }
   }
   ```

3. **Azure DevOps Status Sync** (if ADO work item linked):
   ```typescript
   import { AdoStatusSync } from '../../../plugins/specweave-ado/lib/ado-status-sync.js';

   const adoSync = new AdoStatusSync(organization, project, pat);

   const shouldSync = await promptUser("Update ADO work item #456 to 'Closed'?");

   if (shouldSync) {
     const result = await engine.syncToExternal({
       incrementId: '0001-user-authentication',
       tool: 'ado',
       localStatus: 'completed',
       localTimestamp: new Date().toISOString()
     });

     if (result.success) {
       await adoSync.updateStatus(456, result.externalMapping);
       await adoSync.postStatusComment(456, 'Active', 'completed');
     }
   }
   ```

**Report results**:
```
🔄 Status Sync:
   ✓ GitHub issue #42: active → closed (with comment)
   ✓ JIRA issue PROJ-123: In Progress → Done (with comment)
   ✓ ADO work item #456: Active → Closed (with comment)
```

**If status sync disabled**:
```
ℹ️ Status sync disabled in config (enable in .specweave/config.json)
```

**If no external links**:
```
ℹ️ No external tools linked to this increment
```

**If user declines sync**:
```
ℹ️ Status sync skipped (user choice)
```

**Conflict Resolution** (if remote status differs):
- Uses configured strategy (default: `last-write-wins`)
- Compares timestamps to determine which status to use
- Favors local (SpecWeave) status on timestamp tie
- Reports conflict and resolution in output:
  ```
  ⚠️ Conflict detected:
     Local: completed (2025-11-12 15:00:00)
     Remote: active (2025-11-12 14:30:00)
     Resolution: Use local (last-write-wins)
     Action: Syncing to external
  ```

**Example Full Output**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 INCREMENT CLOSED SUCCESSFULLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Increment: 0001-user-authentication
Status: completed
Duration: 14 days (vs 21 estimated)
Velocity: +50% faster

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 POST-CLOSURE SYNC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GitHub Project:
  ✓ Found living docs: spec-0001-user-authentication.md
  ✓ Syncing to GitHub Project...
  ✓ GitHub Project updated successfully

GitHub Issue:
  ✓ Closed issue #42
  ✓ Added completion summary

Status Sync:
  ✓ GitHub issue #42: active → closed (with comment)
  ✓ JIRA issue PROJ-123: In Progress → Done (with comment)
  ✓ ADO work item #456: Active → Closed (with comment)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Create PR: git push && gh pr create
  2. Deploy to staging: npm run deploy:staging
  3. Create new increment: /specweave:increment "Next feature"
```

#### Scenario B: One or More Gates Fail ❌

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PM VALIDATION RESULT: ❌ NOT READY TO CLOSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Gate 1: Tasks Completed - 2 P1 tasks incomplete
✅ Gate 2: Tests Passing - All tests pass
❌ Gate 3: Documentation Updated - CLAUDE.md and README.md outdated

PM Decision: ❌ CANNOT close increment

Blockers (MUST fix before closure):
  1. Complete tasks T005 and T008 (security critical)
     Estimated: 4-6 hours
     Impact: Authentication won't work without these

  2. Update CLAUDE.md and README.md
     Estimated: 1-2 hours
     Impact: Users won't know how to use authentication

Total estimated effort to fix: 5-8 hours

Action Plan:
  1. Complete T005 (password hashing) - 2h
  2. Complete T008 (JWT validation) - 3h
  3. Update CLAUDE.md - 30m
  4. Update README.md - 1h
  5. Re-run /specweave:done 0001 for validation

Increment remains: in-progress

🔄 GitHub Issue Auto-Reopen (if exists):
  Checking metadata for GitHub issue...
  ✓ Found: GitHub issue #42
  ✓ Reopening with validation failure details...
  ✓ Issue #42 reopened with comment:
    "❌ Validation failed - increment not ready for closure

     Gate failures:
     • Gate 1: 2 P1 tasks incomplete
     • Gate 3: Documentation outdated

     See PM validation report for details."

Try again after fixing blockers: /specweave:done 0001
```

### Step 4: Handle Incomplete Work

**If increment cannot close due to scope creep**:

```
🤔 PM Analysis: Scope creep detected

Original plan: 42 tasks (estimated 3-4 weeks)
Current state: 55 tasks (3 weeks elapsed)
Reason: 13 tasks added during implementation

Options:
  A) Complete all 55 tasks (1 more week)
  B) Move 13 new tasks to next increment (close now)
  C) Re-plan as 2 increments (recommended)

Recommendation: Option C - Split into two increments
  • Increment 0001: Core authentication (42 tasks) - Close now
  • Increment 0002: Enhanced authentication (13 tasks) - New increment

PM Approval: ✅ APPROVED for closure with scope transfer

Creating increment 0002-auth-enhancements...
  ✓ Created spec.md (13 requirements from 0001)
  ✓ Created tasks.md (13 tasks transferred)
  ✓ Updated dependencies (depends on 0001)

Closing increment 0001-user-authentication...
  ✓ Status: completed
  ✓ Transferred 13 tasks to 0002

🎉 Increment 0001 closed successfully!
📋 Increment 0002 ready to plan
```

---

## Examples

### Example 1: Successful Closure

```bash
/specweave:done 0001
```

**Output**:
```
✅ Gate 1: Tasks (100% P1)
✅ Gate 2: Tests (70/70 passing)
✅ Gate 3: Docs (all updated)

PM Approval: ✅ APPROVED

🎉 Increment 0001 closed successfully!

Next: /specweave:increment "Next feature"
```

### Example 2: Blocked by Failing Tests

```bash
/specweave:done 0002
```

**Output**:
```
✅ Gate 1: Tasks (100%)
❌ Gate 2: Tests (3 failures)
✅ Gate 3: Docs (current)

PM Decision: ❌ CANNOT close

Blockers:
  • Fix 3 test failures (JWT, password, rate limiting)
  • Estimated: 2-3 hours

Increment remains: in-progress
```

### Example 3: Blocked by Outdated Docs

```bash
/specweave:done 0003
```

**Output**:
```
✅ Gate 1: Tasks (100%)
✅ Gate 2: Tests (passing)
❌ Gate 3: Docs (CLAUDE.md, README.md outdated)

PM Decision: ❌ CANNOT close

Blockers:
  • Update CLAUDE.md with new features
  • Add examples to README.md
  • Update CHANGELOG.md
  • Estimated: 1-2 hours

Increment remains: in-progress
```

### Example 4: Scope Creep - Transfer to Next Increment

```bash
/specweave:done 0004
```

**Output**:
```
🤔 Scope creep detected (15 extra tasks)

Options:
  A) Complete all (1 more week)
  B) Move to next increment
  C) Split into 2 increments ✅ (recommended)

Creating increment 0005 for extra scope...
  ✓ Transferred 15 tasks

Closing increment 0004...
  ✅ Completed (original scope)

🎉 Increment 0004 closed!
📋 Increment 0005 ready to plan
```

---

## Error Handling

### Increment Not Found
```
❌ Error: Increment 0001 not found

Available increments:
  • 0002-core-enhancements (in-progress)
  • 0003-payment-processing (planned)

Usage: /specweave:done <increment-id>
```

### Increment Not In-Progress
```
❌ Error: Cannot close increment 0001 (status: planned)

Increment must be "in-progress" before closing.

Run: /specweave:do 0001 to start implementation first.
```

### Major Blockers Found
```
❌ CRITICAL: Major blockers prevent closure

Gate 1: ❌ 5 P1 tasks incomplete (38% done)
Gate 2: ❌ 12 test failures (including security tests)
Gate 3: ❌ Documentation completely outdated

PM Analysis: Increment is NOT ready for closure

Recommendation: Continue working on increment
  • Complete critical P1 tasks (estimated 2-3 days)
  • Fix all test failures (estimated 1 day)
  • Update all documentation (estimated 4 hours)

Total estimated effort: 3-4 days

Increment remains: in-progress

Check progress: /list-increments
```

---

## Related Commands

- `/increment`: Plan new increment
- `/do`: Execute implementation
- `/validate`: Validate quality before closing
- `/list-increments`: List all increments with status

---

## Related Agents

- `pm`: Product Manager agent (validates completion)
- `qa-lead`: QA Lead agent (validates tests)
- `tech-lead`: Tech Lead agent (validates code quality)
- `docs-writer`: Documentation writer (validates docs)

---

## Configuration

All PM validation settings use sensible defaults:
- Tasks: P1 required, P2 can be deferred
- Tests: All tests must pass, 80% coverage required
- Documentation: CLAUDE.md, README.md, and CHANGELOG.md must be updated

---

**Important**: This command represents PM validation and MUST NOT be bypassed. All 3 gates (tasks, tests, docs) must pass before increment can close.

**Best Practice**: Always run `/specweave:validate 0001 --quality` before `/specweave:done 0001` to catch issues early.

**PM Role**: The PM agent acts as the final quality gate, ensuring:
- ✅ Business value delivered (tasks complete)
- ✅ Quality maintained (tests passing)
- ✅ Knowledge preserved (docs updated)
