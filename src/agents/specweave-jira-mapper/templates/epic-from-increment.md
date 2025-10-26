# JIRA Epic Creation Template

## Epic Details

**Title**: `[Increment {increment_id}] {increment_title}`

**Description**:
```
{spec_summary}

## Specification

📄 Full specification: {spec_url}

## User Stories

{list_of_user_stories}

## Context

- Increment ID: {increment_id}
- Priority: {priority}
- Status: {status}
- Created: {created_at}
```

**Labels**:
- `specweave`
- `priority:{priority}` (e.g., priority:P1)
- `status:{status}` (e.g., status:planned)

**Custom Fields**:
- **SpecWeave Increment ID**: `{increment_id}-{increment_slug}`
- **Spec URL**: `{spec_url}` (if GitHub repo available)
- **Context Manifest**: `{context_manifest_url}` (optional)

**Priority Mapping**:
- P1 → Highest
- P2 → High
- P3 → Medium

**Status Mapping**:
- planned → To Do
- in-progress → In Progress
- completed → Done

---

## Related Stories

Create individual JIRA Stories for each user story (use `story-from-user-story.md` template).
