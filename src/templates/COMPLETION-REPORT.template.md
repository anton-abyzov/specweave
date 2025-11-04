# Increment {{ID}}: {{TITLE}}

**Status**: {{STATUS}}
**Type**: {{TYPE}}
**Created**: {{CREATED_DATE}}
**Completed**: {{COMPLETED_DATE}}

---

## Original Scope (Planned)

### User Stories

{{ORIGINAL_USER_STORIES}}

### Tasks

{{ORIGINAL_TASKS}}

**Estimated Effort**: {{ESTIMATED_HOURS}} hours

---

## Scope Evolution (Living Updates)

_This section is updated during the increment whenever scope changes occur._

{{#SCOPE_CHANGES}}
### {{CHANGE_DATE}}: {{CHANGE_TITLE}}

**Changed**: {{WHAT_CHANGED}}
**Reason**: {{WHY_CHANGED}}
**Impact**: {{IMPACT_HOURS}} hours ({{IMPACT_DIRECTION}})
**Decision**: {{WHO_APPROVED}}
**Documentation**: {{DOCUMENTATION_LINKS}}

---
{{/SCOPE_CHANGES}}

{{#IF_NO_CHANGES}}
_No scope changes during this increment._
{{/IF_NO_CHANGES}}

---

## Final Delivery

### Completed User Stories

{{COMPLETED_USER_STORIES}}

### Deferred User Stories

{{DEFERRED_USER_STORIES}}

### Added User Stories

{{ADDED_USER_STORIES}}

**Delivered**: {{DELIVERED_COUNT}} user stories ({{PLANNED_COUNT}} originally planned, {{ADDED_COUNT}} added, {{DEFERRED_COUNT}} deferred)
**Actual Effort**: {{ACTUAL_HOURS}} hours (vs {{ESTIMATED_HOURS}} estimated)

---

## What Changed and Why

### Deferrals

{{#DEFERRALS}}
- **{{DEFERRED_ITEM}}**: {{DEFERRAL_REASON}}
  - Business value: {{BUSINESS_VALUE_ASSESSMENT}}
  - Can be added later: {{CAN_ADD_LATER}}
{{/DEFERRALS}}

### Additions

{{#ADDITIONS}}
- **{{ADDED_ITEM}}**: {{ADDITION_REASON}}
  - Stakeholder: {{STAKEHOLDER}}
  - Scope approved by: {{APPROVER}}
{{/ADDITIONS}}

### Technical Pivots

{{#TECHNICAL_PIVOTS}}
- **{{PIVOT_DESCRIPTION}}**: {{PIVOT_DECISION}}
  - Documented in: {{ADR_LINK}}
  - Impact: {{PIVOT_IMPACT}}
{{/TECHNICAL_PIVOTS}}

---

## Lessons Learned

{{#LESSONS}}
1. **{{LESSON_TITLE}}**: {{LESSON_DESCRIPTION}}
{{/LESSONS}}

---

## Metrics

- **Velocity**: {{ACTUAL_HOURS}} hours / {{DAYS_TAKEN}} days = {{HOURS_PER_DAY}} hours/day
- **Scope creep**: {{SCOPE_CREEP_ANALYSIS}}
- **Test coverage**: {{TEST_COVERAGE}}% (target: 80%)
- **Defects found**: {{DEFECTS_COUNT}} ({{CRITICAL_COUNT}} critical, {{MINOR_COUNT}} minor)

---

## Related Documentation

{{#RELATED_DOCS}}
- {{DOC_TYPE}}: [{{DOC_TITLE}}]({{DOC_LINK}})
{{/RELATED_DOCS}}

---

**Report Version**: v{{REPORT_VERSION}} (updated {{UPDATE_COUNT}} times during increment)
**Last Updated**: {{LAST_UPDATED}}
**Updated By**: {{UPDATED_BY}}

---

## Update History

{{#UPDATE_HISTORY}}
- v{{VERSION}}: {{UPDATE_DATE}} - {{UPDATE_DESCRIPTION}}
{{/UPDATE_HISTORY}}
