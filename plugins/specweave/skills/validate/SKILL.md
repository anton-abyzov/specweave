---
description: Validate increment with rule-based checks and AI quality assessment. Use when saying "validate", "check quality", or "verify increment".
argument-hint: "[increment-id]"
---

# Validate Increment

## Project Overrides

!`s="validate"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`

## Project Context

!`.specweave/scripts/skill-context.sh validate 2>/dev/null; true`

You are helping the user validate a SpecWeave increment with optional AI-powered quality assessment.

## Usage

```
sw:validate <increment-id> [--quality] [--export] [--fix] [--always]
```

**Flags**: `--quality` (AI assessment) | `--export` (suggestions to tasks.md) | `--fix` (auto-fix HIGH issues) | `--always` (save quality preference)

## Two-Gate Validation System

- **Gate 1 (Rule-Based)**: Always runs, free, 130+ automated checks
- **Gate 2 (LLM-as-Judge)**: Optional (`--quality`), AI-powered, ~2K tokens

Gate 1 catches structural issues first; Gate 2 catches semantic issues.

## Workflow

### Step 1: Parse Arguments

1. Extract increment ID: normalize to 4-digit format ("1" -> "0001", "0153-feature-name" -> "0153")
2. Extract flags: `--quality`, `--export`, `--fix`, `--always`
3. Validate increment exists in `.specweave/increments/`. Show error with available increments if not found.

### Step 1.5: Sync AC Status

Before validation, sync spec.md ACs with tasks.md completion status to prevent false positives:

```typescript
const acManager = new ACStatusManager(projectRoot);
const acSyncResult = await acManager.syncACStatus(incrementId);
```

This is idempotent and prevents "0 ACs checked" false positives from async hooks.

### Step 2: Run Rule-Based Validation

Run 130+ checks across 7 categories. **Run structure validation FIRST.**

| Category | Checks | Purpose |
|----------|--------|---------|
| Structure | 5 | Single tasks.md, allowed root files, metadata.json valid |
| Three-File Canonical (ADR-0047) | 10 | tasks.md has Implementation (not ACs), spec.md has no task IDs, plan.md has no AC sections |
| Consistency | 47 | Cross-document alignment (stories -> plan -> tasks -> tests) |
| Completeness | 23 | Required sections in spec.md, plan.md, tasks.md |
| Quality | 31 | Tech-agnostic spec, testable ACs, actionable tasks (<1 day) |
| Traceability | 19 | TC format, ADR refs, diagram refs |
| AC Coverage | 6 | All ACs have tasks, no orphan tasks, valid US linkage |

**Key three-file rules (ADR-0047)**:
- tasks.md: MUST have `**Implementation**:` and `**AC-IDs**:` references. Must NOT have `**Acceptance Criteria**:` or user story language.
- spec.md: MUST have `## Acceptance Criteria`. Must NOT have task IDs (T-001).
- plan.md: Must NOT have AC sections or task checkboxes.

Display category pass/fail counts and AC coverage percentage.

### Step 3: Determine Quality Assessment

1. If `--quality` flag: run quality assessment (skip prompt)
2. Else: prompt user with Y/N/A (Always) choice

### Step 4: Run AI Quality Assessment (If Approved)

Use CLI: `specweave qa <id> --pre` (or `increment-quality-judge-v2` skill auto-activates).

**6 quality dimensions**:

| Dimension | Weight |
|-----------|--------|
| Clarity | 0.20 |
| Testability | 0.25 |
| Completeness | 0.20 |
| Feasibility | 0.15 |
| Maintainability | 0.10 |
| Edge Cases | 0.10 |

Display: overall score (0-100), per-dimension scores, issues (MAJOR/MINOR), and actionable suggestions.

### Step 5: Handle Export Flag

If `--export`: parse suggestions, add to tasks.md as prioritized tasks with `[HIGH]`/`[MEDIUM]` labels and estimates.

### Step 6: Handle Fix Flag

If `--fix`: identify HIGH-priority fixable issues, generate diffs, show to user for confirmation, apply if approved, then re-validate.

Only fix issues with clear unambiguous improvements. Skip domain-specific or ambiguous issues.

### Step 7: Handle Always Flag

If `--always`: enable `validation.quality_judge.always_run: true` so future validations auto-run quality assessment.

### Step 8: Generate Validation Report

Save detailed report to: `.specweave/increments/<id>/reports/validation-report.md`

Report includes: executive summary, rule-based results by category, AI quality scores, issues, suggestions, recommendations, and validation history.

## Scoring & Grading

| Score | Grade |
|-------|-------|
| 90-100 | EXCELLENT |
| 80-89 | GOOD |
| 70-79 | ACCEPTABLE |
| <70 | NEEDS WORK |

**Pass/fail gate**: Rule-based must pass all CRITICAL checks. Quality score is advisory (no hard gate).

## Related

- `increment-quality-judge` skill: AI assessment engine
- `sw:done`: validates before closing
- `specweave qa <id>`: CLI equivalent

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#validate)
