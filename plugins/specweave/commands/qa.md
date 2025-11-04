---
name: qa
description: Run quality assessment on a SpecWeave increment with risk scoring and quality gate decisions
---

# /qa - Quality Assessment Command

**IMPORTANT**: You MUST invoke the CLI `specweave qa` command using the Bash tool. The slash command provides guidance and orchestration only.

## Purpose

Run comprehensive quality assessment on an increment using:
- ✅ Rule-based validation (120 checks)
- ✅ AI quality assessment (7 dimensions including risk)
- ✅ BMAD risk scoring (Probability × Impact)
- ✅ Quality gate decisions (PASS/CONCERNS/FAIL)

## Usage

```bash
/qa <increment-id> [options]
```

### Examples

```bash
# Quick mode (default)
/qa 0008

# Pre-implementation check
/qa 0008 --pre

# Quality gate check (comprehensive)
/qa 0008 --gate

# Export blockers to tasks.md
/qa 0008 --export

# CI mode (exit 1 on FAIL)
/qa 0008 --ci

# Skip AI assessment (rule-based only)
/qa 0008 --no-ai

# Force run even if rule-based fails
/qa 0008 --force
```

### Options

- `--quick` - Quick mode (default) - Fast assessment with core checks
- `--pre` - Pre-implementation mode - Check before starting work
- `--gate` - Quality gate mode - Comprehensive check before closing
- `--full` - Full multi-agent mode (Phase 3, v0.9.0+)
- `--ci` - CI mode - Exit 1 on FAIL (for automation)
- `--no-ai` - Skip AI assessment - Rule-based validation only (free, fast)
- `--export` - Export blockers/concerns to tasks.md
- `--force` - Force run even if rule-based validation fails
- `-v, --verbose` - Show recommendations in addition to blockers/concerns

## What It Does

### Step 1: Rule-Based Validation (Always First, Always Free)

The command runs 120+ validation checks on increment files:
- ✅ File existence (spec.md, plan.md, tasks.md)
- ✅ YAML frontmatter structure
- ✅ AC-ID traceability (spec.md → tasks.md)
- ✅ Link integrity
- ✅ Format consistency

**If rule-based fails** → Stop (don't waste AI tokens) unless `--force` flag used

### Step 2: AI Quality Assessment (Optional, skip with `--no-ai`)

Invoke the `increment-quality-judge-v2` skill to evaluate:
- **7 Dimensions**:
  1. Clarity (18% weight)
  2. Testability (22% weight)
  3. Completeness (18% weight)
  4. Feasibility (13% weight)
  5. Maintainability (9% weight)
  6. Edge Cases (9% weight)
  7. **Risk Assessment (11% weight)** - NEW in v0.8.0!

**Risk Assessment** uses BMAD pattern:
- Probability (0.0-1.0) × Impact (1-10) = Risk Score (0.0-10.0)
- 4 categories: Security, Technical, Implementation, Operational
- Severity: CRITICAL (≥9.0), HIGH (6.0-8.9), MEDIUM (3.0-5.9), LOW (<3.0)

### Step 3: Quality Gate Decision

Based on thresholds:

**FAIL** if any:
- Risk score ≥ 9.0 (CRITICAL)
- Test coverage < 60%
- Spec quality < 50
- Critical security vulnerabilities ≥ 1

**CONCERNS** if any:
- Risk score 6.0-8.9 (HIGH)
- Test coverage < 80%
- Spec quality < 70
- High security vulnerabilities ≥ 1

**PASS** otherwise

### Step 4: Display Report

Show results with:
- 🟢 PASS / 🟡 CONCERNS / 🔴 FAIL decision
- Blockers (MUST fix)
- Concerns (SHOULD fix)
- Recommendations (NICE to fix, with `--verbose`)
- Spec quality scores (7 dimensions)
- Summary (duration, tokens, cost)

### Step 5: Export (Optional)

If `--export` flag provided:
- Append blockers/concerns to tasks.md
- Add priority (P0 for blockers, P1 for concerns)
- Include mitigation strategies

## Implementation

**When user runs `/qa <increment-id>`**:

1. **Parse arguments**
   ```typescript
   const incrementId = args[0]; // e.g., "0008"
   const options = parseOptions(args.slice(1));
   ```

2. **Invoke CLI command via Bash tool**
   ```bash
   specweave qa 0008 --pre --export
   ```

3. **CLI handles everything**:
   - Rule-based validation
   - AI assessment invocation
   - Quality gate decision
   - Report display
   - Export to tasks.md

4. **Return result to user**
   - Show CLI output (already formatted)
   - Suggest next steps based on decision

## Modes Explained

### Quick Mode (Default)

**Use when**: Quick check during development
**Checks**: Rule-based + AI spec quality + risk assessment
**Time**: ~30 seconds
**Cost**: ~$0.025-$0.050

### Pre-Implementation Mode (`--pre`)

**Use when**: Before starting increment work
**Checks**: All quick mode checks + architecture review
**Time**: ~1 minute
**Cost**: ~$0.05-$0.10

### Quality Gate Mode (`--gate`)

**Use when**: Before closing increment (via `/specweave:done`)
**Checks**: All pre-implementation checks + test coverage + security audit
**Time**: ~2-3 minutes
**Cost**: ~$0.10-$0.20

### Full Multi-Agent Mode (`--full`, Phase 3)

**Use when**: Comprehensive audit for critical increments
**Checks**: 6 specialized subagents in parallel
**Time**: ~5 minutes
**Cost**: ~$0.50-$1.00

## Cost Breakdown

| Mode | Tokens | Cost (USD) | Time |
|------|--------|------------|------|
| Quick | ~2,500 | ~$0.025 | 30s |
| Pre | ~5,000 | ~$0.050 | 1m |
| Gate | ~10,000 | ~$0.100 | 2-3m |
| Full | ~50,000 | ~$0.500 | 5m |

**Optimization**: Use Haiku model by default (cheapest, fastest)

## Exit Codes (for CI)

When `--ci` flag used:
- **Exit 0**: PASS or CONCERNS (warning, but not blocking)
- **Exit 1**: FAIL (blocking issues found)

**CI Integration Example**:
```yaml
# .github/workflows/qa-check.yml
- name: Run QA Check
  run: specweave qa ${{ env.INCREMENT_ID }} --gate --ci
```

## Error Handling

**Common errors**:
- ❌ Increment not found → Check ID format (4 digits: 0001, 0008)
- ❌ Missing files → Run `/specweave:inc` to create increment first
- ❌ Rule-based fails → Fix validation errors before AI assessment
- ❌ AI timeout → Retry with `--quick` mode or `--no-ai`

## Integration Points

**Auto-invoked by**:
- `/specweave:done` - Runs `--gate` mode before closing increment
- Post-task-completion hook (optional) - Runs `--quick` mode after tasks complete

**Manual invocation**:
- During development - `/qa 0008` for quick checks
- Before commit - `/qa 0008 --pre` to catch issues early
- Before PR - `/qa 0008 --gate --export` for comprehensive check

## Best Practices

1. **Run early and often** - Use `--quick` during development
2. **Fix blockers immediately** - Don't proceed with FAIL decision
3. **Address concerns before release** - CONCERNS = should fix
4. **Use risk scores to prioritize** - Fix CRITICAL (≥9.0) risks first
5. **Export to tasks.md** - Convert blockers/concerns to actionable tasks
6. **CI integration** - Block PRs with FAIL decision

## Related

- **Skill**: `increment-quality-judge-v2` (7 dimensions with risk assessment)
- **Command**: `/specweave:done` (auto-runs QA gate)
- **CLI**: `specweave qa` (direct invocation)
- **Types**: `src/core/qa/types.ts` (TypeScript definitions)
- **Tests**: `tests/unit/qa/` (58 test cases, 100% passing)

## Example Session

```
User: /qa 0008