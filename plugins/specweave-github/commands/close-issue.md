---
name: close-issue
description: Close GitHub issue for completed SpecWeave increment. Posts completion summary with final stats, deliverables, and closes the issue. Links closure in increment metadata.
---

# Close GitHub Issue for Completed Increment

Close the GitHub issue associated with a completed SpecWeave increment.

## Usage

```bash
/specweave:github:close-issue <increment-id> [options]
```

## Arguments

- `increment-id`: Increment ID (e.g., `0004` or `0004-plugin-architecture`)

## Options

- `--force`: Force close even if increment not marked complete
- `--comment`: Custom closing comment (default: auto-generated summary)
- `--reopen`: Reopen a previously closed issue
- `--skip-validation`: Skip PM gate validation

## Examples

```bash
# Basic usage (auto-generates completion summary)
/specweave:github:close-issue 0004

# With custom comment
/specweave:github:close-issue 0004 --comment "Merged to main, deploying to production"

# Force close (skip validation)
/specweave:github:close-issue 0004 --force

# Reopen closed issue
/specweave:github:close-issue 0004 --reopen
```

## What This Command Does

1. **Validates Increment Completion**
   - All tasks completed (48/48)
   - All tests passing
   - PM gates passed (from `/specweave:done`)
   - Documentation updated

2. **Generates Completion Summary**
   ```markdown
   ✅ **Increment Completed**

   This increment has been successfully completed and is ready for release.

   ## Final Stats

   - **Tasks**: 48/48 completed (100%)
   - **Duration**: 4 weeks (2025-10-01 → 2025-10-30)
   - **Time Tracked**: 240 hours (estimated) / 235 hours (actual)
   - **Test Coverage**: 127 test cases, 95% coverage
   - **Priority**: P1

   ## Deliverables

   ✅ Plugin architecture implemented
   ✅ 15 plugins migrated (github, kubernetes, frontend-stack, ...)
   ✅ Documentation updated (ADRs, user guides, API docs)
   ✅ E2E tests passing (Playwright suite)
   ✅ Integration tests passing (Jest suite)

   ## Key Changes

   - Added plugin system with loader, manager, detector
   - Implemented 4 adapters (Claude, Cursor, Copilot, Generic)
   - Created 15 domain-specific plugins
   - Updated all documentation
   - Achieved 80% test coverage

   ## Files Changed

   - 48 files modified
   - +12,500 lines added
   - -3,200 lines removed
   - Net: +9,300 lines

   ## Related

   - **Spec**: [spec.md](https://github.com/owner/repo/blob/main/.specweave/increments/0004/spec.md)
   - **Plan**: [plan.md](https://github.com/owner/repo/blob/main/.specweave/increments/0004/plan.md)
   - **Tests**: [tests.md](https://github.com/owner/repo/blob/main/.specweave/increments/0004/tests.md)

   ## Next Steps

   - Deploy to production (tracked in #135)
   - Monitor for issues (see runbook)
   - Plan next increment (0005-user-authentication)

   ---

   🎉 Thank you to all contributors!

   🤖 Auto-closed by SpecWeave at 2025-10-30 17:00:00
   ```

3. **Posts Completion Comment**
   ```bash
   gh issue comment 130 --body "$(cat completion-summary.md)"
   ```

4. **Closes GitHub Issue**
   ```bash
   gh issue close 130
   ```

5. **Updates Metadata**
   ```yaml
   # .metadata.yaml
   github:
     issue_number: 130
     issue_url: "https://github.com/owner/repo/issues/130"
     closed_at: "2025-10-30T17:00:00Z"
     closed_by: "specweave-github-plugin"
     closing_comment_id: 1234590
   ```

6. **Reports Result**
   ```
   ✅ GitHub issue #130 closed!

   Increment 0004 is complete.
   Issue: https://github.com/owner/repo/issues/130 (closed)
   ```

## Configuration

Settings from `.specweave/config.yaml`:

```yaml
plugins:
  settings:
    specweave-github:
      # Auto-close issues when increment completes
      auto_close_issue: true

      # Validate before closing
      require_validation: true

      # Include in closing comment
      closing_comment:
        include_stats: true
        include_deliverables: true
        include_file_changes: true
        include_next_steps: true
```

## Output Format

### Success

```
🔒 Closing GitHub issue for increment 0004...

Validation:
✓ All tasks completed (48/48)
✓ All tests passing (127/127)
✓ PM gates passed
✓ Documentation updated

Generating completion summary...
✓ Final stats calculated
✓ Deliverables listed
✓ File changes summarized

Closing issue...
✓ Posted completion comment (ID: 1234590)
✓ Issue #130 closed
✓ Metadata updated

✅ GitHub Issue Closed!

Issue #130: https://github.com/owner/repo/issues/130
Status: Closed
Closed at: 2025-10-30 17:00:00

Increment 0004 is complete! 🎉
```

### Validation Failure

```
❌ Cannot close issue: Validation failed

Increment 0004 is not yet complete:

Issues:
✗ Tasks: 45/48 completed (3 remaining)
  - T-046: Update documentation
  - T-047: Run E2E tests
  - T-048: Final review

✗ Tests: 2 tests failing
  - TC-105: Plugin unload test
  - TC-127: E2E sync test

✗ PM Gates: Not run yet
  - Run /specweave:done 0004 first

Fix these issues, then retry:
  /specweave:github:close-issue 0004

Or force close (not recommended):
  /specweave:github:close-issue 0004 --force
```

## Requirements

- GitHub CLI (`gh`) installed and authenticated
- Increment marked as complete (via `/specweave:done`)
- Valid GitHub issue exists for increment

## Error Handling

**Increment not complete**:
```
❌ Error: Increment 0004 is not complete

Status: in_progress (should be: completed)

Complete the increment first:
  /specweave:done 0004

Then close the issue:
  /specweave:github:close-issue 0004
```

**Issue not found**:
```
❌ Error: No GitHub issue found for increment 0004

Check .metadata.yaml for issue number.

Create issue first:
  /specweave:github:create-issue 0004
```

**Issue already closed**:
```
ℹ️  Issue #130 is already closed

Closed by: @developer1
Closed at: 2025-10-30 16:00:00

Use --reopen to reopen the issue.
```

**Permission denied**:
```
❌ Error: Insufficient permissions to close issue #130

Required: Write or Admin access to repository

Contact repository admin for access.
```

## Related Commands

- `/specweave:done <increment-id>`: Mark increment complete (run this first)
- `/specweave:github:sync <increment-id>`: Sync final progress before closing
- `/specweave:github:status <increment-id>`: Check issue status

## Tips

1. **Auto-Close**: Enable `auto_close_issue: true` for automatic closing when running `/specweave:done`

2. **Final Sync**: Always run `/specweave:github:sync` before closing to ensure latest progress is posted

3. **Validation**: Don't skip validation (`--force`) unless absolutely necessary - it ensures quality

4. **Custom Comments**: Use `--comment` for release-specific notes (deployment status, known issues, etc.)

5. **Reopening**: If increment needs more work after closing, use `--reopen` to reopen the issue

## Advanced

### Custom Closing Template

Create `.specweave/github/closing-template.md`:

```markdown
# 🎉 Increment {{id}} Completed!

{{summary}}

## Achievements

{{deliverables}}

## Stats

- Duration: {{duration}}
- Team size: {{team_size}}
- Commits: {{commit_count}}

## Deployment

- Merged to: {{branch}}
- Deployed to: {{environment}}
- Release: {{version}}

## Thank You

Special thanks to:
{{contributors}}

---

_Closed by SpecWeave on {{date}}_
```

### Conditional Closing

Close only if specific conditions met:

```yaml
plugins:
  settings:
    specweave-github:
      closing_conditions:
        # Require all tests passing
        - type: "tests"
          threshold: 100
          required: true

        # Require coverage >= 80%
        - type: "coverage"
          threshold: 80
          required: true

        # Require PR merged
        - type: "pr_merged"
          required: true

        # Require approval from tech lead
        - type: "approval"
          approvers: ["@tech-lead"]
          required: true
```

### Post-Closing Actions

Trigger actions after closing:

```yaml
plugins:
  settings:
    specweave-github:
      post_close:
        # Create release tag
        - action: "create_tag"
          format: "increment-{{id}}"

        # Trigger deployment
        - action: "github_workflow"
          workflow: "deploy.yml"
          inputs:
            increment: "{{id}}"

        # Notify team
        - action: "slack_notification"
          channel: "#releases"
          message: "Increment {{id}} completed! 🎉"

        # Archive to notion
        - action: "notion_export"
          database: "Completed Increments"
```

### Bulk Close

Close multiple completed increments:

```bash
# Close all completed increments
/specweave:github:close-issue --status completed --all

# Close specific increments
for i in 0004 0005 0006; do
  /specweave:github:close-issue $i
done
```

### Reopen with Context

Reopen issue with explanation:

```bash
/specweave:github:close-issue 0004 --reopen \
  --comment "Reopening: Critical bug found in production (issue #140). Need to add rollback mechanism."
```

### Close and Lock

Close and lock issue to prevent further comments:

```bash
/specweave:github:close-issue 0004 --lock \
  --lock-reason "resolved"  # or "off-topic", "spam", "too heated"
```

---

**Command**: `/specweave:github:close-issue`
**Plugin**: specweave-github
**Agent**: github-manager
**Version**: 1.0.0
**Last Updated**: 2025-10-30
