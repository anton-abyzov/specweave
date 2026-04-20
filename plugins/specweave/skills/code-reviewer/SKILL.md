---
description: "Multi-agent code review system. Spawns 3 parallel reviewers (security, logic, performance) with inline self-critique. Use when saying 'review code', 'code review', 'audit code', 'review PR', 'review changes', 'check code quality'."
argument-hint: "[--pr N] [--changes] [--increment NNNN] [--cross-repo] [--full-fanout] [path]"
context: fork
model: opus
---

# Code Reviewer

**Parallel multi-agent code review with 3 core reviewers (security, logic, performance) and inline self-critique.**

Default path spawns **3 reviewer agents** (security, logic, performance) that analyze code simultaneously. Each reviewer re-reads its own findings before emitting, validates evidence claims, and rates confidence 1–5. The 3-reviewer default balances coverage with token cost for typical reviews.

**`--full-fanout`** restores the 8-reviewer + 10-validator path for maximum coverage at higher token cost. Reach for it on pre-release audits, large refactors, or security-sensitive PRs where thoroughness beats cost.

## Tool-Use Rationale

- **Read**: Load spec.md, rubric.md, CLAUDE.md, and the files under review so reviewers share identical context.
- **Grep**: Locate call sites, try/catch patterns, and AC markers across the touched files.
- **Bash**: Run `gh pr diff`, `git diff`, and `find` to build the file list and extract PR metadata.

## Model Configuration

**Default effort**: `xhigh` — recommended for all code-review tasks per Opus 4.7 conventions.
**Opt-in max**: `--effort max` enables maximum effort with a warning: "max effort risks overthinking on straightforward problems."
**Legacy mode**: Set `quality.thinkingBudget: "legacy"` in config to pass a fixed `thinking` parameter (for pre-4.7 models only).

## Prompt Caching

`sw:code-reviewer` uses Anthropic's ephemeral prompt caching so the shared context (project rules, active spec, rubric) is reused across the parallel reviewer fan-out and between fix-loop iterations. This is especially impactful during `sw:done`, where the fix loop can invoke code-reviewer up to 5 times per closure.

**Files cached by default** (via `static-context-loader`):
- `CLAUDE.md` (project root)
- `.specweave/config.json`
- The active increment's `spec.md`
- The active increment's `rubric.md` (if present)

**Cache window**: 5-minute TTL (Anthropic's `cache_control: { type: "ephemeral" }` breakpoint). Successive reviewer spawns that share this prefix read from cache.

**Extending the list**: Add paths to `cache.staticContextFiles` in `.specweave/config.json`:
```json
{
  "cache": {
    "staticContextFiles": [
      "CLAUDE.md",
      ".specweave/config.json",
      ".specweave/docs/internal/architecture/adr/ADR-001-something.md"
    ]
  }
}
```

**Disable caching**: Set `cache.staticContextFiles: []` in `.specweave/config.json`. Reviewer agents will still run, but without the shared prefix cache.

See `.specweave/docs/internal/specs/config-reference.md` and `opus-47-migration.md` for the full caching setup.

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

**Default (3 reviewers)**: security, logic, performance — each with inline self-critique.
**`--full-fanout`**: restores the legacy 8-reviewer path (plus the 10-validator finding-validation fan-out).

### Default Reviewers (always spawned)

| Reviewer | Agent Template | Model | Specialization |
|----------|---------------|-------|----------------|
| **Security** | `agents/reviewer-security.md` (from team-lead) | **opus** | OWASP, auth, secrets, injection |
| **Logic** | inline (see §2 Logic Checklist) | **opus** | Bugs, edge cases, error handling, silent failures, type invariants, spec compliance |
| **Performance** | inline (see §2 Performance Checklist) | sonnet | N+1, memory, blocking ops |

The default logic reviewer absorbs silent-failures, types, spec-compliance, comments, and tests checks via its expanded checklist — a single careful reviewer with self-critique typically catches what 5 narrower reviewers would.

**Model tiering rationale**: Security and Logic need deep reasoning (Opus). Performance is pattern-matching and uses Sonnet. Non-Claude environments (Cursor, Copilot, etc.) ignore model hints gracefully.

### Full-Fanout Reviewers (`--full-fanout` only)

| Reviewer | Agent Template | Model | Specialization |
|----------|---------------|-------|----------------|
| Silent Failures | `agents/reviewer-silent-failures.md` | sonnet | Empty catches, swallowed errors |
| Type Design | `agents/reviewer-types.md` | sonnet | Type quality, invariants, assertions |
| Spec Compliance | `agents/reviewer-spec-compliance.md` | sonnet | AC verification, scope creep |
| Comments | `agents/reviewer-comments.md` | sonnet | Stale/misleading comments, JSDoc accuracy |
| Tests | `agents/reviewer-tests.md` | sonnet | Behavioral test coverage gaps |

### Routing Rules

```
DEFAULT (3 reviewers, always spawned):
  - security  (runs on every review)
  - logic     (runs on every review, with expanded checklist)
  - performance (runs on every review)

WITH --full-fanout, also include IF file patterns match:
  - reviewer-types        → *.ts, *.tsx files present
  - reviewer-silent-failures → *.ts, *.tsx, *.js files with try/catch or .catch patterns
  - reviewer-spec-compliance → increment scope provided (--increment or active increment found)
  - reviewer-comments  → significant changes (> 50 changed lines)
  - reviewer-tests     → non-test source files changed

Cap: --max-reviewers N (default: 3; with --full-fanout: 8)
```

### Routing Decision

```bash
# Default: security + logic + performance — all three always spawn
REVIEWERS=("security" "logic" "performance")

if [ "$FULL_FANOUT" = "true" ]; then
  # TypeScript files → add type reviewer
  if echo "$FILES" | grep -qE '\.(ts|tsx)$'; then
    REVIEWERS+=("types")
  fi

  # Code files → add silent failures
  if echo "$FILES" | grep -qE '\.(ts|tsx|js|jsx)$'; then
    REVIEWERS+=("silent-failures")
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

## 3.5 Inline Self-Critique (default)

Default reviews use **inline self-critique** instead of spawning separate validator subagents. Each reviewer re-reads its own findings before emitting, validates evidence claims, and rates confidence 1–5.

### Self-Critique Contract

Every reviewer prompt includes this closing instruction:

```
Before emitting REVIEW_COMPLETE, perform self-critique:
  1. Re-read each finding you produced.
  2. For each finding, re-open the cited file at the cited line and confirm the described issue is really there.
  3. Rate confidence 1–5 (5 = certain, 1 = speculative).
  4. Drop any finding where confidence < 3.
  5. Emit remaining findings with a "confidence": N field.
```

Each finding therefore ships with a confidence score. Findings with confidence ≥ 3 keep their severity. Findings with confidence < 3 are dropped during the reviewer's own pass (never emitted).

### Full-Fanout Validator Path (`--full-fanout` only)

When `--full-fanout` is passed, the orchestrator additionally spawns (on the haiku tier) up to 10 independent verify-findings subagents for CRITICAL and HIGH findings (original behaviour):

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

Process results (full-fanout only):

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

**Rubric Integration**: If `rubric.md` exists in the increment directory:
1. Load the file and find all criteria where `Evaluator: sw:code-reviewer`
2. After completing your review, update matching criteria: `[x] PASS` if no critical/high/medium findings, `[!] FAIL — N critical, M high findings` otherwise
3. If rubric.md does not exist, skip rubric operations entirely (no error)

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

### Refinement Signal Emission (0671)

When the completion-validator parses `code-review-report.json`, it iterates `findings[]` and, for each CRITICAL or HIGH finding whose evidence references a specific skill slug (e.g. `sw:architect`) or matches a ≥6-word phrase from a `SKILL.md` under `plugins/specweave/skills/`, appends a refinement signal to `.specweave/state/skill-signals.json` (best-effort, never blocks closure). Source is `"code-reviewer"` and severity is always `"high"`. Reviewers do not need to do anything extra — include the offending skill slug or the SKILL.md-quoted instruction in the finding's `description`/`recommendation` and attribution is automatic. Signals are consumed later by `sw:skill-refine`.

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
SendMessage({ type: "shutdown_request", recipient: "logic-inline", content: "Review complete" });
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
