---
description: "Elite multi-agent code review system. Spawns parallel specialized reviewers for logic, security, performance, silent failures, type design, and spec compliance. Use when saying 'review code', 'code review', 'audit code', 'review PR', 'review changes', 'check code quality'."
argument-hint: "[--pr N] [--changes] [--increment NNNN] [--cross-repo] [path]"
context: fork
model: opus
---

# Code Reviewer

**Parallel multi-agent code review with specialized reviewers.**

Spawns up to 6 specialized reviewer agents that analyze code simultaneously, then aggregates findings into a unified report with deduplication and severity ranking.

## MANDATORY: Orchestrator Identity

**You are an ORCHESTRATOR. You do NOT review code yourself.**

- ALWAYS create a team and spawn reviewer agents via Task()
- NEVER read code and produce findings directly — that's what the reviewer agents do
- Your job: detect scope, route reviewers, aggregate results, produce report

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

---

## 1. Smart Reviewer Routing

Not all 6 reviewers are needed for every review. Route based on what files changed.

### Available Reviewers

| Reviewer | Agent Template | Specialization |
|----------|---------------|----------------|
| **Logic** | `agents/reviewer-logic.md` (from team-lead) | Bugs, edge cases, error handling |
| **Security** | `agents/reviewer-security.md` (from team-lead) | OWASP, auth, secrets, injection |
| **Performance** | `agents/reviewer-performance.md` (from team-lead) | N+1, memory, blocking ops |
| **Silent Failures** | `agents/reviewer-silent-failures.md` | Empty catches, swallowed errors |
| **Type Design** | `agents/reviewer-types.md` | Type quality, invariants, assertions |
| **Spec Compliance** | `agents/reviewer-spec-compliance.md` | AC verification, scope creep |

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

Cap: --max-reviewers N (default: 6)
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

2. **Replace placeholders**:
   - `[REVIEW_TARGET]` → the detected scope description
   - `[INCREMENT_PATH]` → increment path (for spec-compliance only)
   - `[PR_NUMBER]` → PR number (if scope is PR)

3. **Spawn via Task()**:
   ```typescript
   Task({
     team_name: "review-[slug]",
     name: "reviewer-[domain]",
     subagent_type: "general-purpose",
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

```bash
# If reviewing an increment
REPORT_PATH="[INCREMENT_PATH]/reports/code-review-$(date +%Y-%m-%d).json"

# Otherwise
REPORT_PATH=".specweave/reports/code-review-$(date +%Y-%m-%d).json"

mkdir -p "$(dirname "$REPORT_PATH")"
```

Write structured JSON with all findings, metadata, and reviewer statuses.

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
  - /sw:do to implement fixes (if increment exists)
  - /sw:code-reviewer --changes to re-review after fixes
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
| `/sw:grill` | Grill is increment-scoped, runs during closure. Code-reviewer is general-purpose, runs anytime. |
| `/sw:team-lead --mode review` | Team-lead delegates review mode to this skill |
| `/sw:validate` | Rule-based validation (130+ checks). Code-reviewer is AI-powered analysis. |
