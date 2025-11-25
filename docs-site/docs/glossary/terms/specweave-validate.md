---
id: specweave-validate
title: /specweave:validate Command
sidebar_label: specweave:validate
---

# /specweave:validate Command

The **`/specweave:validate`** command runs fast, rule-based validation with 120+ checks on [increment](/docs/glossary/terms/increments) files.

## What It Does

**Key validations:**
- Consistency (spec -> plan -> tasks alignment)
- Completeness (all required sections present)
- Quality (testable criteria, actionable tasks)
- Traceability ([AC-IDs](/docs/glossary/terms/ac-id), [ADR](/docs/glossary/terms/adr) references)

## Usage

```bash
# Basic validation
/specweave:validate 0007

# Include AI quality assessment
/specweave:validate 0007 --quality

# Export suggestions to tasks.md
/specweave:validate 0007 --export
```

## Validation Categories

### 1. Structure Validation

```bash
✅ spec.md exists
✅ plan.md exists
✅ tasks.md exists
✅ metadata.json exists
```

### 2. Spec Validation

```bash
✅ User stories present
✅ Acceptance criteria defined
✅ AC-IDs unique (AC-US1-01, AC-US1-02...)
✅ YAML frontmatter valid
```

### 3. Plan Validation

```bash
✅ Architecture section present
✅ Technology stack defined
✅ ADRs referenced
✅ Test strategy included
```

### 4. Tasks Validation

```bash
✅ All tasks have T-XXX format
✅ Tasks reference user stories
✅ Tasks reference AC-IDs
✅ BDD test cases embedded
```

### 5. Traceability Validation

```bash
✅ Every AC-ID has tasks
✅ Every task references valid AC-ID
✅ No orphan acceptance criteria
✅ No orphan tasks
```

## Output Example

```bash
$ /specweave:validate 0007

🔍 Validating: 0007-user-authentication

📋 Structure: ✅ 4/4 files present
📝 Spec: ✅ 15/15 checks pass
📐 Plan: ✅ 12/12 checks pass
✅ Tasks: ⚠️ 18/20 checks pass
🔗 Traceability: ✅ 10/10 checks pass

⚠️ Issues Found (2):

1. T-023 missing AC-ID reference
   Location: tasks.md:145
   Suggestion: Add "Satisfies ACs: AC-US2-03"

2. AC-US3-02 has no tasks
   Location: spec.md:78
   Suggestion: Create task for "Rate limiting check"

📊 Overall: 55/57 checks pass (96%)

💡 Run with --export to add fix tasks
```

## Validation vs QA

| Aspect | /specweave:validate | /specweave:qa |
|--------|---------------------|---------------|
| Speed | Fast (seconds) | Slower (AI analysis) |
| Cost | Free (rule-based) | Uses AI tokens |
| Depth | Surface checks | Deep analysis |
| Use | Pre-flight check | Quality gate |

## Related

- [/specweave:qa](/docs/glossary/terms/specweave-qa) - AI quality assessment
- [Quality Gate](/docs/glossary/terms/quality-gate) - Validation checkpoints
- [AC-ID](/docs/glossary/terms/ac-id) - Acceptance criteria identifiers
- [spec.md](/docs/glossary/terms/spec-md) - Specification format
- [tasks.md](/docs/glossary/terms/tasks-md) - Task format
