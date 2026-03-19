---
description: Create pull request from increment feature branch. Use when increment is complete and push strategy is pr-based, or when explicitly saying "create PR", "open pull request", "make a PR".
argument-hint: "<increment-id>"
user-invokable: true
---

# Create Pull Request

Creates a pull request for a completed increment. Automatically invoked by `sw:done` when `cicd.pushStrategy` is `"pr-based"`. Can also be invoked manually.

## When to Activate

**Do activate:**
- `sw:done` invokes this after quality gates pass (when `pushStrategy: "pr-based"`)
- User says "create PR", "open pull request", "make a PR for this increment"
- User says "push this as a PR"

**Do NOT activate:**
- `pushStrategy` is `"direct"` and user didn't explicitly ask for a PR
- Increment is not active or completed
- No changes exist to push

## Step 1: Read Configuration

```bash
# Read push strategy and git config
PUSH_STRATEGY=$(jq -r '.cicd.pushStrategy // "direct"' .specweave/config.json 2>/dev/null)
BRANCH_PREFIX=$(jq -r '.cicd.git.branchPrefix // "sw/"' .specweave/config.json 2>/dev/null)
TARGET_BRANCH=$(jq -r '.cicd.git.targetBranch // "main"' .specweave/config.json 2>/dev/null)
DELETE_ON_MERGE=$(jq -r '.cicd.git.deleteOnMerge // true' .specweave/config.json 2>/dev/null)
```

Read increment metadata to check if PR already exists:
```bash
jq -r '.prRefs // empty' .specweave/increments/{increment-id}/metadata.json
```

If `prRefs` already has an entry with `state: "open"`, skip PR creation and report existing PR URL.

## Step 2: Determine Branch Name

**External ticket key prefix** — If the increment was imported from JIRA/ADO, prefix the branch with the external ticket key for native integration linking:

```bash
# Check metadata for external ticket key (JIRA or ADO)
JIRA_KEY=$(jq -r '.jira.issue // .jira.issueKey // .externalLinks.jira.epicKey // .externalLinks.jira.issueKey // empty' \
  .specweave/increments/${INCREMENT_ID}/metadata.json 2>/dev/null)
ADO_ID=$(jq -r '.externalLinks.ado.featureId // .externalLinks.ado.workItemId // empty' \
  .specweave/increments/${INCREMENT_ID}/metadata.json 2>/dev/null)
EXTERNAL_KEY_BRANCHING=$(jq -r '.cicd.git.externalKeyBranching // true' .specweave/config.json 2>/dev/null)

if [ "$EXTERNAL_KEY_BRANCHING" = "true" ] && [ -n "$JIRA_KEY" ]; then
  BRANCH_NAME="${JIRA_KEY}/${INCREMENT_ID}"
  # e.g., ID-300/0520-auth-gateway-otel
elif [ "$EXTERNAL_KEY_BRANCHING" = "true" ] && [ -n "$ADO_ID" ]; then
  BRANCH_NAME="AB#${ADO_ID}/${INCREMENT_ID}"
  # e.g., AB#4567/0520-auth-gateway-otel
else
  BRANCH_NAME="${BRANCH_PREFIX}${INCREMENT_ID}"
  # e.g., sw/0520-pr-based-increment-closure
fi
```

Check current branch:
```bash
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
```

## Step 3: Ensure on Feature Branch

**If already on the feature branch** (`CURRENT_BRANCH === BRANCH_NAME`):
- Skip branch creation, proceed to push.

**If on target branch** (main/develop):
- Check if feature branch exists locally: `git branch --list ${BRANCH_NAME}`
- If exists: `git checkout ${BRANCH_NAME}`
- If not: `git checkout -b ${BRANCH_NAME}`

**If on a different branch** (user created manually):
- Use the existing branch as-is. Set `BRANCH_NAME = CURRENT_BRANCH`.
- Do NOT force rename to match naming convention.

## Step 4: Push Branch

```bash
git push -u origin ${BRANCH_NAME}
```

If push fails (e.g., no remote, auth issues), warn and exit gracefully. Do NOT block increment closure.

## Step 5: Build PR Description

Read spec.md to build the PR body. Use `--body-file` to avoid shell quoting issues:

```bash
# Create temp file for PR body
cat > /tmpsw-pr-body-${INCREMENT_ID}.md << 'PREOF'
## Summary

<!-- Auto-generated from SpecWeave increment {INCREMENT_ID} -->

{spec.md overview section — first paragraph}

## User Stories

{For each US in spec.md:}
- **US-001**: {title} ({AC count} acceptance criteria)
- **US-002**: {title} ({AC count} acceptance criteria)

## Acceptance Criteria

{Checklist of all ACs from spec.md:}
- [ ] AC-US1-01: {criterion}
- [ ] AC-US1-02: {criterion}

## Test Summary

{Summary of test plan from tasks.md — what was tested, coverage}

---

*Created by [SpecWeave](https://verified-skill.com) increment `{INCREMENT_ID}`*
PREOF
```

## Step 6: Create Pull Request

```bash
gh pr create \
  --title "[${INCREMENT_ID}] {spec title}" \
  --body-file /tmpsw-pr-body-${INCREMENT_ID}.md \
  --base ${TARGET_BRANCH} \
  --head ${BRANCH_NAME}
```

Capture the PR URL and number:
```bash
PR_URL=$(gh pr create ... 2>&1)
PR_NUMBER=$(echo "$PR_URL" | grep -oE '[0-9]+$')
```

Clean up temp file:
```bash
rm -f /tmpsw-pr-body-${INCREMENT_ID}.md
```

If `deleteOnMerge` is true, add auto-delete label or note in PR description.

## Step 7: Update Metadata

Update increment metadata with PR reference. Edit `metadata.json` to add/update `prRefs`:

```json
{
  "prRefs": [{
    "branch": "sw/0520-pr-based-increment-closure",
    "prNumber": 42,
    "prUrl": "https://github.com/org/repo/pull/42",
    "state": "open",
    "createdAt": "2026-03-12T10:00:00Z"
  }]
}
```

Use `jq` or direct JSON edit to update metadata.json.

## Step 7b: Link PR to External Tickets

After PR creation, link the PR to any associated JIRA/ADO tickets. This creates remote links (JIRA) or hyperlinks (ADO) so the PR appears in the external tool's UI.

```bash
specweave link-pr \
  --increment "${INCREMENT_ID}" \
  --pr-url "${PR_URL}" \
  --pr-number "${PR_NUMBER}" \
  --branch "${BRANCH_NAME}"
```

This is **non-blocking** — if linking fails, the PR is still created successfully. Errors are logged as warnings.

The link-pr command:
- Reads metadata.json for JIRA issue keys and ADO work item IDs
- Creates JIRA remote links via `/rest/api/3/issue/{key}/remotelink` (idempotent via `globalId`)
- Creates ADO work item hyperlinks via JSON Patch on work item relations
- Reports linked tickets and any errors

## Step 8: Multi-Repo / Umbrella Mode

Check if umbrella mode is enabled:
```bash
UMBRELLA=$(jq -r '.umbrella.enabled // false' .specweave/config.json 2>/dev/null)
```

If umbrella mode:

1. **Scan for modified repos**: Check each `repositories/{org}/{repo}/` for changes relative to target branch:
   ```bash
   for repo_dir in repositories/*/*; do
     if [ -d "$repo_dir/.git" ]; then
       cd "$repo_dir"
       CHANGES=$(git log ${TARGET_BRANCH}..HEAD --oneline 2>/dev/null | wc -l)
       if [ "$CHANGES" -gt 0 ]; then
         # This repo has changes — create branch + PR
       fi
       cd -
     fi
   done
   ```

2. **Create branch + PR in each repo** with changes (Steps 3-6 per repo).

3. **Collect all PR refs** and store in metadata as array:
   ```json
   {
     "prRefs": [
       { "branch": "sw/0520-...", "prUrl": "...repo1/pull/42", "repoSlug": "org/repo1" },
       { "branch": "sw/0520-...", "prUrl": "...repo2/pull/15", "repoSlug": "org/repo2" }
     ]
   }
   ```

4. **Continue on failure**: If one repo's PR fails, log the error and continue with others. Report all results at the end.

## Step 9: Output Summary

Display a summary table:

```
PR CREATION SUMMARY
═══════════════════════════════════════════════
Increment: 0520-pr-based-increment-closure
Strategy:  pr-based
Target:    main

  Repo            Branch                          PR
  ─────────────   ─────────────────────────────   ────────────────────────────
  org/repo1       sw/0520-pr-based-closure        https://github.com/.../42
  org/repo2       sw/0520-pr-based-closure        https://github.com/.../15

Status: 2/2 PRs created successfully
```

## Error Handling

| Error | Action |
|-------|--------|
| `gh` not installed | Warn: "Install GitHub CLI: brew install gh" |
| `gh auth` not configured | Warn: "Run: gh auth login" |
| Push rejected | Warn but don't block. Show error message. |
| PR already exists for branch | Skip creation, report existing PR URL |
| No changes to push | Skip PR creation, inform user |
| Merge conflicts with target | Create PR anyway (conflicts visible in PR UI) |

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#pr)
