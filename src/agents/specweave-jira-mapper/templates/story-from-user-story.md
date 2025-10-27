# JIRA Story Creation Template

## Story Details

**Title**: `{user_story_title}`

**Description**:
```
**As a** {role}
**I want to** {goal}
**So that** {benefit}

## Acceptance Criteria

- [ ] TC-{number}: {criteria_1}
- [ ] TC-{number}: {criteria_2}
- [ ] TC-{number}: {criteria_3}

## User Story ID

{user_story_id} (e.g., US1-001)

## Specification Reference

📄 See: {spec_url}#{user_story_anchor}
```

**Epic Link**: `{epic_key}`

**Labels**:
- `specweave`
- `user-story`
- `increment-{increment_id}`

**Custom Fields**:
- **User Story ID**: `{user_story_id}` (e.g., US1-001)
- **Test Case IDs**: `{comma_separated_tc_ids}` (e.g., TC-0001, TC-0002)

---

## Subtasks

Create JIRA Subtasks for each task related to this user story (from tasks.md).

**Subtask Format**:
- **Title**: `{task_description}`
- **Parent**: `{story_key}`
- **Labels**: `specweave`, `task`
