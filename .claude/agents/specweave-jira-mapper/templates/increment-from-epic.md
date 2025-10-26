# SpecWeave Increment Import Template

## Increment Structure

```
.specweave/increments/{increment_id}-{slug}/
├── spec.md                     # Generated from Epic + Stories
├── plan.md                     # Empty (to be filled later)
├── tasks.md                    # Generated from Subtasks
├── tests.md                    # Empty (to be filled later)
├── context-manifest.yaml       # Default context
└── logs/
    └── jira-import.log         # Import log
```

---

## spec.md

```yaml
---
increment_id: "{increment_id}"
title: "{epic_title}"
description: "{epic_summary}"
status: "{mapped_status}"
priority: "{mapped_priority}"
created_at: "{epic_created_date}"
jira:
  epic_key: "{epic_key}"
  epic_url: "{epic_url}"
  stories:
    - key: "{story_key_1}"
      user_story_id: "US1-001"
    - key: "{story_key_2}"
      user_story_id: "US1-002"
  imported_at: "{import_timestamp}"
  sync_direction: "import"
---

# {epic_title}

{epic_description}

## User Stories

### US1-001: {story_1_title}

**As a** {role}
**I want to** {goal}
**So that** {benefit}

**Acceptance Criteria**:
- [ ] TC-0001: {criteria_1}
- [ ] TC-0002: {criteria_2}

**JIRA Story**: [{story_key_1}]({story_url_1})

---

### US1-002: {story_2_title}

**As a** {role}
**I want to** {goal}
**So that** {benefit}

**Acceptance Criteria**:
- [ ] TC-0003: {criteria_3}
- [ ] TC-0004: {criteria_4}

**JIRA Story**: [{story_key_2}]({story_url_2})

---

## Related Documentation

- JIRA Epic: [{epic_key}]({epic_url})
- Imported: {import_timestamp}
```

---

## tasks.md

```markdown
# Tasks: {epic_title}

## User Story: US1-001 - {story_1_title}

- [ ] {subtask_1_title} (JIRA: {subtask_key_1})
- [ ] {subtask_2_title} (JIRA: {subtask_key_2})

## User Story: US1-002 - {story_2_title}

- [ ] {subtask_3_title} (JIRA: {subtask_key_3})
- [ ] {subtask_4_title} (JIRA: {subtask_key_4})

---

**JIRA Sync**: Last synced {import_timestamp}
```

---

## context-manifest.yaml

```yaml
---
spec_sections: []
documentation: []
max_context_tokens: 10000
priority: high
auto_refresh: false
notes: |
  Imported from JIRA Epic {epic_key}.
  Context manifest should be updated manually with relevant spec sections.
---
```

---

## logs/jira-import.log

```
[{import_timestamp}] INFO: Starting JIRA import for Epic {epic_key}
[{import_timestamp}] INFO: Fetched Epic: {epic_title}
[{import_timestamp}] INFO: Found {story_count} Stories
[{import_timestamp}] INFO: Found {subtask_count} Subtasks
[{import_timestamp}] INFO: Auto-numbered increment: {increment_id}
[{import_timestamp}] INFO: Created spec.md with {story_count} user stories
[{import_timestamp}] INFO: Created tasks.md with {subtask_count} tasks
[{import_timestamp}] INFO: Created context-manifest.yaml (default)
[{import_timestamp}] SUCCESS: Import completed
```

---

## Status Mapping (JIRA → SpecWeave)

| JIRA Status | SpecWeave Status |
|-------------|------------------|
| To Do | planned |
| In Progress | in-progress |
| Done | completed |
| (Custom) | Ask user for mapping |

## Priority Mapping (JIRA → SpecWeave)

| JIRA Priority | SpecWeave Priority |
|---------------|-------------------|
| Highest | P1 |
| High | P2 |
| Medium | P2 |
| Low | P3 |
