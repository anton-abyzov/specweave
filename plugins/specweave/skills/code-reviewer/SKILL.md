---
description: "Elite multi-agent code review system. Spawns parallel specialized reviewers for logic, security, performance, silent failures, type design, spec compliance, comments, and test coverage — then validates findings independently. Use when saying 'review code', 'code review', 'audit code', 'review PR', 'review changes', 'check code quality'."
argument-hint: "[--pr N] [--changes] [--increment NNNN] [--cross-repo] [path]"
context: fork
model: opus
---

# Code Reviewer

**Parallel multi-agent code review with specialized reviewers and independent finding validation.**

Spawns up to 8 specialized reviewer agents that analyze code simultaneously, validates each finding independently, then aggregates results into a unified report with deduplication and severity ranking.

## MANDATORY: Orchestrator Identity

**You are an ORCHESTRATOR. You do NOT review code yourself.**

- ALWAYS create a team and spawn reviewer agents via Task()
- NEVER read code and produce findings directly — that's what the reviewer agents do
- Your job: detect scope, gate-check, route reviewers, validate findings, aggregate results, produce report

---

## 0. Scope Detection

Parse arguments to determine WHAT to review.

### Argument Parsing

| Argument | Scope | How to Get Diff |
|----------|-------|-----------------|
| `--pr N` | Review PR #N | `gh pr diff N` |
| `--changes` | Uncommitted + staged changes | `git diff HEAD` |
| `--increment NNNN` | Changes from increment NNNN | `git diff` on files touched by increment |
| `--cross-repo` | All repos in umbrella | Per-repo `git diff` (see Section 5) |
| `path/to/dir` | Specific directory/file | Read files directly |
| *(no args)* | Auto-detect (see below) | Varies |

### Auto-Detection (no arguments)

```bash
# 1. Check for open PR on current branch
PR_NUM=$(gh pr view --json number -q '.number' 2>/dev/null)
if [ -n "$PR_NUM" ]; then
  SCOPE="pr"
  REVIEW_TARGET="$PR_NUM"
fi

# 2. Check for uncommitted changes
if [ -z "$SCOPE" ]; then
  CHANGES=$(git diff --stat HEAD 2>/dev/null)
  if [ -n "$CHANGES" ]; then
    SCOPE="changes"
    REVIEW_TARGET="uncommitted changes"
  fi
fi

# 3. Check for active increment
if [ -z "$SCOPE" ]; then
  ACTIVE=$(find .specweave/increments -maxdepth 2 -name "metadata.json" \
    -exec grep -l '"active"' {} \; 2>/dev/null | head -1)
  if [ -n "$ACTIVE" ]; then
    SCOPE="increment"
    REVIEW_TARGET=$(dirname "$ACTIVE")
  fi
fi

# 4. Fall back to whole project
if [ -z "$SCOPE" ]; then
  SCOPE="project"
  REVIEW_TARGET="."
fi
```

### Build File List

Once scope is determined, build the list of files to review:

```bash
case "$SCOPE" in
  pr)       FILES=$(gh pr diff "$REVIEW_TARGET" --name-only) ;;
  changes)  FILES=$(git diff --name-only HEAD) ;;
  increment) FILES=$(git log --name-only --pretty=format: -- "$REVIEW_TARGET") ;;
  project)  FILES=$(find src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" 2>/dev/null) ;;
esac
```

### Extract PR Context

When scope is `pr`, extract metadata for reviewer agents:

```bash
if [ "$SCOPE" = "pr" ]; then
  PR_TITLE=$(gh pr view "$REVIEW_TARGET" --json title -q '.title')
  PR_DESCRIPTION=$(gh pr view "$REVIEW_TARGET" --json body -q '.body')
fi
```

These values replace `[PR_TITLE]` and `[PR_DESCRIPTION]` placeholders in agent prompts. For non-PR scopes, placeholders are replaced with empty strings.

---

## 0.5 Gate Check

Before spawning reviewers, verify the review is worth running. Pass `--force` to bypass.

### PR Scope

```bash
if [ "$SCOPE" = "pr" ]; then
  PR_STATE=$(gh pr view "$REVIEW_TARGET" --json state -q '.state')
  [ "$PR_STATE" = "MERGED" ] || [ "$PR_STATE" = "CLOSED" ] && echo "SKIP: PR is $PR_STATE" && exit 0

  IS_DRAFT=$(gh pr view "$REVIEW_TARGET" --json isDraft -q '.isDraft')
  [ "$IS_DRAFT" = "true" ] && echo "SKIP: PR is draft" && exit 0

  DIFF_LINES=$(gh pr diff "$REVIEW_TARGET" -- ':!*.lock' ':!*-lock.json' | grep -c '^[+-]' 2>/dev/null || echo 0)
  [ "$DIFF_LINES" -lt 5 ] && echo "SKIP: < 5 changed lines" && exit 0
fi
```

### Changes Scope

```bash
if [ "$SCOPE" = "changes" ]; then
  DIFF_LINES=$(git diff HEAD -- ':!*.lock' ':!*-lock.json' | grep -c '^[+-]' 2>/dev/null || echo 0)
  [ "$DIFF_LINES" -lt 5 ] && echo "SKIP: < 5 changed lines" && exit 0
fi
```

---

## 1. Smart Reviewer Routing

Not all 6 reviewers are needed for every review. Route based on what files changed.

### Available Reviewers

| Reviewer | Agent Template | Model | Specialization |
|----------|---------------|-------|----------------|
| **Logic** | `agents/reviewer-logic.md` (from team-lead) | **opus** | Bugs, edge cases, error handling |
| **Security** | `agents/reviewer-security.md` (from team-lead) | **opus** | OWASP, auth, secrets, injection |
| **Performance** | `agents/reviewer-performance.md` (from team-lead) | sonnet | N+1, memory, blocking ops |
| **Silent Failures** | `agents/reviewer-silent-failures.md` | sonnet | Empty catches, swallowed errors |
| **Type Design** | `agents/reviewer-types.md` | sonnet | Type quality, invariants, assertions |
| **Spec Compliance** | `agents/reviewer-spec-compliance.md` | sonnet | AC verification, scope creep |
| **Comments** | `agents/reviewer-comments.md` | sonnet | Stale/misleading comments, JSDoc accuracy |
| **Tests** | `agents/reviewer-tests.md` | sonnet | Behavioral test coverage gaps |

**Model tiering rationale**: Logic and Security need deep reasoning (Opus). Pattern-matching reviewers (Performance, Silent Failures, Types, Spec Compliance) use Sonnet for cost efficiency. Non-Claude environments (Cursor, Copilot, etc.) ignore model hints gracefully — the review still runs on whatever model is available.

### Routing Rules

```
ALWAYS include:
  - reviewer-logic (runs on every review)
  - reviewer-security (runs on every review)

Include IF file patterns match:
  - reviewer-types        → *.ts, *.tsx files present
  - reviewer-silent-failures → *.ts, *.tsx, *.js files with try/catch or .catch patterns
  - reviewer-performance  → database files (prisma/, *.sql), API routes, data-heavy code
  - reviewer-spec-compliance → increment scope provided (--increment or active increment found)
  - reviewer-comments  → significant changes (> 50 changed lines)
  - reviewer-tests     → non-test source files changed

Cap: --max-reviewers N (default: 8)
```

### Routing Decision

```bash
REVIEWERS=("logic" "security")  # Always

# TypeScript files → add type reviewer
if echo "$FILES" | grep -qE '\.(ts|tsx)$'; then
  REVIEWERS+=("types")
fi

# Code files → add silent failures
if echo "$FILES" | grep -qE '\.(ts|tsx|js|jsx)$'; then
  REVIEWERS+=("silent-failures")
fi

# Database/API → add performance
if echo "$FILES" | grep -qE '(prisma|\.sql|api/|routes/|controllers/)'; then
  REVIEWERS+=("performance")
fi

# Increment context → add spec compliance
if [ "$SCOPE" = "increment" ] || [ -n "$INCREMENT_PATH" ]; then
  REVIEWERS+=("spec-compliance")
fi

# Significant changes → add comment reviewer
if [ "$(echo "$FILES" | wc -l)" -gt 10 ]; then
  REVIEWERS+=("comments")
fi

# Source files (non-test) → add test coverage reviewer
if echo "$FILES" | grep -qE '\.(ts|tsx|js|jsx)$'; then
  if echo "$FILES" | grep -vqE '\.(test|spec)\.(ts|tsx|js|jsx)$'; then
    REVIEWERS+=("tests")
  fi
fi
```

---

## 2. Team Creation and Agent Spawning

### Create Review Team

```typescript
TeamCreate({
  team_name: "review-[timestamp-or-slug]",
  description: "Code review: [REVIEW_TARGET]"
});
```

The `review-*` prefix bypasses the increment-existence-guard (reviews don't need increments).

### Read and Spawn Agents

For each selected reviewer:

1. **Determine template source**:
   - `logic`, `security`, `performance` → read from team-lead's agents/ dir:
     `skills/team-lead/agents/reviewer-{name}.md`
   - `silent-failures`, `types`, `spec-compliance` → read from own agents/ dir:
     `skills/code-reviewer/agents/reviewer-{name}.md`
   - `comments`, `tests` → read from own agents/ dir:
     `skills/code-reviewer/agents/reviewer-{name}.md`

2. **Replace placeholders**:
   - `[REVIEW_TARGET]` → the detected scope description
   - `[INCREMENT_PATH]` → increment path (for spec-compliance only)
   - `[PR_NUMBER]` → PR number (if scope is PR)
   - `[PR_TITLE]` → PR title (empty if not PR scope)
   - `[PR_DESCRIPTION]` → PR description body (empty if not PR scope)

3. **Spawn via Task()**:
   ```typescript
   // Model tier per reviewer (non-Claude environments ignore gracefully)
   const MODEL = {
     "logic": "opus", "security": "opus",
     "performance": "sonnet", "silent-failures": "sonnet",
     "types": "sonnet", "spec-compliance": "sonnet",
     "comments": "sonnet", "tests": "sonnet"
   };

   Task({
     team_name: "review-[slug]",
     name: "reviewer-[domain]",
     subagent_type: "general-purpose",
     model: MODEL["[domain]"],
     mode: "bypassPermissions",
     prompt: <replaced template content>
   });
   ```

**All reviewers spawn in parallel** — no dependency chain for reviews.

**CRITICAL**: Always use `mode: "bypassPermissions"` — reviewers cannot handle trust-folder prompts.

---

## 3. Result Aggregation

### Collect REVIEW_COMPLETE Messages

Wait for all spawned reviewers to signal `REVIEW_COMPLETE:`. Track completion:

```
Reviewer Status:
  logic:            REVIEW_COMPLETE (5 findings)
  security:         REVIEW_COMPLETE (2 findings)
  types:            REVIEW_COMPLETE (8 findings)
  silent-failures:  REVIEW_COMPLETE (3 findings)
  performance:      (not spawned)
  spec-compliance:  (not spawned)
```

### Timeout Handling

If a reviewer doesn't respond within a reasonable number of turns:
1. Send STATUS_CHECK message
2. If still no response after 2 more turns, declare stuck and proceed without it
3. Note the missing reviewer in the final report

### Deduplication

Multiple reviewers may flag the same issue (e.g., logic + silent-failures both catch an empty catch block):
- Group findings by file:line
- Merge findings at the same location into a single entry
- Keep the highest severity level
- Combine descriptions from different perspectives

---

## 3.5 Independent Finding Validation

After aggregation, validate CRITICAL and HIGH findings with independent subagents. This catches hallucinated findings and reduces false positives.

### Validation Scope

- **CRITICAL**: ALWAYS validate
- **HIGH**: ALWAYS validate
- **MEDIUM/LOW/INFO**: Skip (trust the reviewer)
- **Skip entirely**: `--fast` flag or `codeReview.skipValidation: true` in config

### Spawn Validators

For each CRITICAL/HIGH finding (max 10 concurrent, haiku model):

```typescript
Task({
  team_name: "review-[slug]",
  name: "validator-[finding-id]",
  subagent_type: "general-purpose",
  model: "haiku",
  mode: "bypassPermissions",
  prompt: `You are a FINDING VALIDATOR. Independently verify if this review finding is real.

FINDING:
  Severity: [severity]
  File: [file]:[line]
  Description: [description]

PR CONTEXT:
  Title: [PR_TITLE]
  Description: [PR_DESCRIPTION]

INSTRUCTIONS:
  1. Read the file at the specified location
  2. Check if the described issue actually exists in the code
  3. Consider the PR context — is this an intentional change?

RESPOND WITH EXACTLY ONE LINE:
  VALIDATED: [reason in 10 words or less]
  or
  REJECTED: [reason in 10 words or less]`
});
```

### Process Results

| Result | Action |
|--------|--------|
| VALIDATED | Keep severity, add `"validated": true` |
| REJECTED | Downgrade to INFO, add `"validated": false` |
| Timeout | Keep severity, add `"validated": "timeout"` |

Report includes both pre-validation and post-validation severity counts for transparency.

---

## 4. Report Generation

### Unified Report Format

```markdown
# Code Review Report

**Scope**: [REVIEW_TARGET]
**Date**: [YYYY-MM-DD]
**Reviewers**: [list of active reviewers]

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | N     |
| HIGH     | N     |
| MEDIUM   | N     |
| LOW      | N     |
| INFO     | N     |

## Critical Findings

[Grouped findings at CRITICAL severity]

## High-Priority Findings

[Grouped findings at HIGH severity]

## Medium & Low Findings

[Grouped findings at MEDIUM and LOW severity]

## Per-File Summary

| File | Issues | Top Severity |
|------|--------|-------------|
| src/api/auth.ts | 3 | CRITICAL |
| src/utils/parse.ts | 1 | MEDIUM |

## Recommendations

1. [Top priority action item]
2. [Second priority action item]
...
```

### Write JSON Report

**IMPORTANT**: When reviewing an increment (`--increment` flag), always use the fixed name
`code-review-report.json`. The CLI's completion-validator checks for this exact filename.
Date-based naming is for standalone reviews only.

```bash
# If reviewing an increment (fixed name for closure gate validation)
REPORT_PATH="[INCREMENT_PATH]/reports/code-review-report.json"

# Standalone review (not tied to an increment)
REPORT_PATH=".specweave/reports/code-review-$(date +%Y-%m-%d).json"

mkdir -p "$(dirname "$REPORT_PATH")"
```

Write structured JSON with all findings, metadata, and reviewer statuses.

**Required JSON structure** (the `summary` object is checked by the completion-validator):

```json
{
  "version": "1.1",
  "scope": "[REVIEW_TARGET]",
  "date": "YYYY-MM-DD",
  "reviewers": ["logic", "security", "types"],
  "gateCheck": { "passed": true, "reason": null },
  "summary": {
    "total": 5,
    "critical": 0,
    "high": 1,
    "medium": 2,
    "low": 1,
    "info": 1
  },
  "validation": {
    "performed": true,
    "preValidation": { "critical": 1, "high": 2 },
    "postValidation": { "critical": 0, "high": 1 },
    "rejected": 2
  },
  "findings": [{ "validated": true, "..." : "..." }]
}
```

The `summary` object reflects post-validation counts. The completion-validator only reads `summary.*` fields -- all new fields are additive and backward-compatible.

---

## 5. Cross-Repo Mode

When `--cross-repo` is specified or umbrella mode is detected:

### Detect Changed Repos

```bash
# Find repos with changes in umbrella
for repo_dir in repositories/*/*; do
  if [ -d "$repo_dir/.git" ]; then
    changes=$(cd "$repo_dir" && git diff --stat HEAD 2>/dev/null)
    if [ -n "$changes" ]; then
      CHANGED_REPOS+=("$repo_dir")
    fi
  fi
done
```

### Per-Repo Review

For each changed repo:
1. Determine files changed in that repo
2. Route reviewers based on those files
3. Spawn reviewer agents scoped to that repo
4. Prefix all findings with repo path

### Cross-Repo Integration Check

After per-repo reviews complete, check for cross-repo issues:
- Shared type definitions changed but consumers not updated
- API contract changes without corresponding client updates
- Version/dependency mismatches between repos
- Shared configuration drift

### Merged Report

Produce a single report with sections per repo:

```markdown
# Cross-Repo Code Review Report

## Repository: repositories/org/api-service
[findings for api-service]

## Repository: repositories/org/web-client
[findings for web-client]

## Cross-Repo Issues
[integration findings]
```

---

## 6. Cleanup and Output

### Shutdown Agents

```typescript
// Shutdown each reviewer
SendMessage({ type: "shutdown_request", recipient: "reviewer-logic", content: "Review complete" });
SendMessage({ type: "shutdown_request", recipient: "reviewer-security", content: "Review complete" });
// ... for each spawned reviewer
```

### Destroy Team

```typescript
TeamDelete();
```

### Present Results

1. Display the unified report to the user
2. Highlight CRITICAL and HIGH findings prominently
3. If reviewing an increment: offer to create tasks for critical findings
4. Report location of JSON report file

### Offer Follow-Up

```
Review complete. [N] findings across [M] files.
  - [X] critical, [Y] high findings need attention

Report saved to: [REPORT_PATH]

Next steps:
  - Fix critical issues before merging
  - sw:do to implement fixes (if increment exists)
  - sw:code-reviewer --changes to re-review after fixes
```

---

## 7. Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Reviewer stuck | Agent not responding | Send STATUS_CHECK, then shutdown after 2 turns |
| No files to review | Empty diff or wrong scope | Check git status, verify scope argument |
| Ghost review-* team | Previous review didn't clean up | TeamDelete by name before starting |
| Spec compliance skipped | No increment path found | Pass --increment NNNN explicitly |
| Cross-repo misses a repo | Repo has no .git or no changes | Check repo has uncommitted work |

---

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `sw:grill` | Grill is increment-scoped, runs during closure. Code-reviewer is general-purpose, runs anytime. |
| `sw:team-lead --mode review` | Team-lead delegates review mode to this skill |
| `sw:validate` | Rule-based validation (130+ checks). Code-reviewer is AI-powered analysis. |
