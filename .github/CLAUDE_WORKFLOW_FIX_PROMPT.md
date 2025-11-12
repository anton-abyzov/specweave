# Claude Workflow Fix Prompt Template

This is the standard prompt structure for when Claude is asked to fix workflow failures via `@claude` mentions.

---

## When Mentioned in Workflow Failure Issue

**You will see an issue like this**:

```markdown
@claude This workflow failed and needs fixing:

**Workflow**: CI Pipeline
**Run**: #123
**Branch**: develop
**Commit**: abc123
**URL**: https://github.com/anton-abyzov/specweave/actions/runs/12345

Please:
1. Analyze the failure logs from the workflow run
2. Identify the root cause
3. Create a PR with a fix
```

---

## Your Response Should Follow This Structure

### Step 1: Acknowledge and Download Logs

```markdown
I'll analyze this workflow failure and create a fix.

**Downloading logs from**: [workflow URL]
```

### Step 2: Analyze the Failure

```markdown
**Analysis**:

**Root Cause**: [1-2 sentence explanation of what went wrong]

**Error Details**:
- Error: [exact error message]
- Location: [file:line or workflow step]
- Context: [relevant context from logs]

**Why it failed**: [technical explanation]
```

### Step 3: Propose Fix

```markdown
**Fix Strategy**:

I'll fix this by:
1. [specific change 1]
2. [specific change 2]
3. [specific change 3]

**Files to modify**:
- `path/to/file1.ts` - [what will be changed]
- `path/to/file2.yml` - [what will be changed]
```

### Step 4: Create Fix Branch and PR

```markdown
Creating fix in branch: `autofix/[workflow-name]-[run-number]`

**Changes**:
1. ✅ Modified `file1.ts` - [description]
2. ✅ Modified `file2.yml` - [description]
3. ✅ Committed changes
4. ✅ Pushed to branch

**Pull Request**: #[PR number] created

**PR Title**: `fix: [workflow name] - [root cause]`
```

### Step 5: Next Steps

```markdown
**Next Steps**:
1. Review the PR: [PR link]
2. Merge if the fix looks correct
3. Workflow will re-run automatically
4. Should pass ✅

Let me know if you need any adjustments!
```

---

## Example Complete Response

```markdown
I'll analyze this workflow failure and create a fix.

**Downloading logs from**: https://github.com/anton-abyzov/specweave/actions/runs/12345

---

**Analysis**:

**Root Cause**: TypeScript compilation error - missing type definition for `WorkflowStatus`

**Error Details**:
- Error: `TS2304: Cannot find name 'WorkflowStatus'`
- Location: `src/core/cicd/workflow-monitor.ts:193`
- Context: Using `WorkflowStatus` type but it's not imported

**Why it failed**: The `WorkflowStatus` type is defined in `types.ts` but not imported in `workflow-monitor.ts`. This causes TypeScript compilation to fail.

---

**Fix Strategy**:

I'll fix this by:
1. Adding missing import statement for `WorkflowStatus` type
2. Ensuring all type imports are present
3. Verifying no other missing imports

**Files to modify**:
- `src/core/cicd/workflow-monitor.ts` - Add `WorkflowStatus` import

---

Creating fix in branch: `autofix/ci-pipeline-12345`

**Changes**:
1. ✅ Modified `src/core/cicd/workflow-monitor.ts`:
   - Added `import { WorkflowStatus } from './types'` at line 8
2. ✅ Committed changes with message: "fix: add missing WorkflowStatus type import"
3. ✅ Pushed to branch `autofix/ci-pipeline-12345`

**Pull Request**: #42 created
- **Title**: `fix: CI Pipeline - missing WorkflowStatus type import`
- **Link**: https://github.com/anton-abyzov/specweave/pull/42

---

**Next Steps**:
1. Review the PR: https://github.com/anton-abyzov/specweave/pull/42
2. Merge if the fix looks correct
3. Workflow will re-run automatically
4. Should pass ✅

Let me know if you need any adjustments!
```

---

## Key Guidelines for Claude

1. **Always download and analyze the actual logs** - Don't guess!
2. **Be specific** - Identify exact file, line number, and error
3. **Create a new branch** - Use naming: `autofix/[workflow-name]-[run-number]`
4. **One fix per PR** - Don't mix unrelated changes
5. **Test locally if possible** - Run tests before pushing
6. **Clear commit messages** - Format: `fix: [workflow name] - [brief description]`
7. **Link back to the issue** - Mention the issue number in PR description

---

## Common Workflow Failures to Handle

### TypeScript Compilation Errors
- Missing imports
- Type mismatches
- Syntax errors

### Test Failures
- Unit test failures
- Integration test failures
- E2E test timeouts

### Linting Errors
- ESLint violations
- Prettier formatting
- TypeScript strict mode violations

### Build Failures
- Missing dependencies
- Build script errors
- Configuration issues

### Deployment Failures
- Environment variable issues
- Permission errors
- Resource constraints

---

## When to Ask for Help

If the failure is:
- ❌ Unclear or ambiguous (logs don't show clear error)
- ❌ Requires human decision (breaking API changes, architecture decisions)
- ❌ External service issue (GitHub API down, npm registry down)
- ❌ Intentional (test meant to fail, workflow disabled)

Then respond with:
```markdown
I've analyzed this failure but need human input:

**What I found**: [explanation]

**Why I can't auto-fix**: [reason]

**Recommended action**: [what the human should do]

Would you like me to create a PR with my best guess, or should we discuss the approach first?
```

---

This prompt template ensures consistent, high-quality responses when Claude is mentioned in workflow failure issues.
