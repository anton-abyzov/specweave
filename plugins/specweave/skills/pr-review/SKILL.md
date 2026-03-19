---
description: AI-powered pull request review against spec acceptance criteria. Use for "review PR", "check PR against spec", "review pull request". Enterprise feature.
argument-hint: "<increment-id|pr-url>"
user-invokable: true
---

# AI Pull Request Review

Reviews a pull request against the increment's spec.md acceptance criteria. Posts structured review comments on the PR via `gh pr review`.

This is an **enterprise feature** — optional, not part of the default flow. Invoke explicitly or configure for automatic invocation.

## When to Activate

**Do activate:**
- User says "review PR", "check PR against spec", "review pull request"
- User says "AI review for PR #42"
- Configured for automatic review after `sw:pr` creates a PR

**Do NOT activate:**
- User is doing manual code review (don't interfere)
- No increment context available
- PR is already merged

## Step 1: Resolve PR and Increment

**If given an increment ID:**
```bash
# Read PR refs from metadata
PR_URL=$(jq -r '.prRefs[0].prUrl // empty' .specweave/increments/{id}/metadata.json)
PR_NUMBER=$(jq -r '.prRefs[0].prNumber // empty' .specweave/increments/{id}/metadata.json)
```

**If given a PR URL or number:**
```bash
# Extract PR number from URL
PR_NUMBER=$(echo "$PR_URL" | grep -oE '[0-9]+$')
# Find increment by searching metadata for matching prRefs
```

**If neither:** Check current branch for an associated PR:
```bash
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
PR_NUMBER=$(gh pr list --head "$CURRENT_BRANCH" --json number -q '.[0].number')
```

## Step 2: Load Spec Context

Read the increment spec.md to extract:
1. All acceptance criteria (AC-USXX-YY)
2. User stories overview
3. Non-functional requirements
4. Edge cases documented in the spec

Build a review checklist from ACs.

## Step 3: Get PR Diff

```bash
gh pr diff ${PR_NUMBER} > /tmpsw-pr-diff-${PR_NUMBER}.diff
```

Also get the list of changed files:
```bash
gh pr view ${PR_NUMBER} --json files -q '.files[].path'
```

## Step 4: Review Against Acceptance Criteria

For each AC in spec.md, analyze the diff to determine:

- **SATISFIED**: The diff clearly implements this criterion
- **PARTIALLY SATISFIED**: Some aspects are covered, others are missing
- **NOT SATISFIED**: No evidence of implementation in the diff
- **NOT APPLICABLE**: This AC is not relevant to the changed files

Build a structured review:

```markdown
## SpecWeave AC Review — Increment {INCREMENT_ID}

### Acceptance Criteria Coverage

| AC | Status | Evidence |
|----|--------|----------|
| AC-US1-01: User can log in | SATISFIED | `src/auth/login.ts` implements full flow |
| AC-US1-02: Invalid creds show error | PARTIALLY | Error handling exists but no user-facing message |
| AC-US2-01: Session persists | NOT SATISFIED | No session storage implementation found |

### Code Quality Observations

{List any code quality issues found in the diff — not bugs, but patterns that deviate from the spec or best practices}

### Summary

{Overall assessment: ready to merge / needs changes / needs discussion}
- {X}/{Y} ACs satisfied
- {Z} observations
```

## Step 5: Post Review

Determine review action based on AC coverage:

- **All ACs satisfied**: `--approve`
- **Any AC not satisfied**: `--request-changes`
- **Only observations, no blockers**: `--comment`

```bash
gh pr review ${PR_NUMBER} \
  --body-file /tmpsw-pr-review-${PR_NUMBER}.md \
  --{approve|request-changes|comment}
```

Clean up:
```bash
rm -f /tmpsw-pr-diff-${PR_NUMBER}.diff /tmpsw-pr-review-${PR_NUMBER}.md
```

## Step 6: Post Inline Comments (Optional)

For specific issues found in the diff, post inline comments on the relevant lines:

```bash
# For each finding with a specific file + line:
gh api repos/{owner}/{repo}/pulls/${PR_NUMBER}/comments \
  -f body="**AC-US1-02**: Error message is logged but not displayed to the user. The spec requires a user-facing error toast." \
  -f commit_id="{latest_commit_sha}" \
  -f path="src/auth/login.ts" \
  -F line=42 \
  -f side="RIGHT"
```

## Scheduled Review Mode

For teams that want automated PR reviews, this skill can be triggered via Claude Code scheduled tasks:

```json
// .claude/scheduled-tasks.json
{
  "tasks": [{
    "schedule": "*/30 * * * *",
    "command": "sw:pr-review --all-open",
    "description": "Review all open PRs every 30 minutes"
  }]
}
```

When invoked with `--all-open`:
1. List all open PRs: `gh pr list --state open --json number,headRefName`
2. For each PR, check if it has an associated increment (via branch naming convention or metadata scan)
3. Skip PRs already reviewed by this tool (check for existing SpecWeave review comments)
4. Review each PR against its increment spec

## Multi-Agent Review (Complex PRs)

For PRs spanning multiple domains (frontend + backend + infrastructure), consider using `sw:team-build` with the `review` preset to spawn domain-specialized review agents in parallel.

## Error Handling

| Error | Action |
|-------|--------|
| No spec.md found | Warn: "No increment spec found for this PR. Cannot perform AC review." |
| PR already merged | Skip: "PR #{N} is already merged." |
| `gh` auth issues | Warn: "Run: gh auth login" |
| Large diff (>5000 lines) | Summarize by file instead of line-by-line review |
