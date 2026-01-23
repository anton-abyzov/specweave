---
name: sw:qa
description: Run quality assessment on a SpecWeave increment with risk scoring and quality gate decisions
---

# /sw:qa - Quality Assessment Command

**IMPORTANT**: You MUST invoke the CLI `specweave qa` command using the Bash tool. The slash command provides guidance and orchestration only.

## Purpose

Run comprehensive quality assessment on an increment using:
- ✅ **Gate 1: Rule-based validation** (130+ automated checks)
- ✅ **Gate 2: LLM-as-Judge** (AI quality assessment with chain-of-thought reasoning)
- ✅ **Gate 3: Risk scoring** (BMAD Probability × Impact quantitative assessment)
- ✅ **Quality gate decisions** (PASS/CONCERNS/FAIL)

## LLM-as-Judge Pattern

This command implements the **LLM-as-Judge** pattern - an established AI/ML evaluation technique where an LLM evaluates outputs using structured reasoning.

**How it works:**
```
┌─────────────────────────────────────────────────────────────┐
│                    LLM-as-Judge Gate                        │
├─────────────────────────────────────────────────────────────┤
│  Input: spec.md, plan.md, tasks.md                         │
│                                                             │
│  Process:                                                   │
│  1. Chain-of-thought analysis (7 dimensions)               │
│  2. Evidence-based scoring (0-100 per dimension)           │
│  3. Risk identification (BMAD P×I formula)                 │
│  4. Formal verdict (PASS/CONCERNS/FAIL)                    │
│                                                             │
│  Output: Structured quality report with:                   │
│  - Blockers (MUST fix)                                     │
│  - Concerns (SHOULD fix)                                   │
│  - Recommendations (NICE to fix)                           │
└─────────────────────────────────────────────────────────────┘
```

**Why LLM-as-Judge?**
- **Consistency**: Applies uniform evaluation criteria
- **Depth**: Catches nuanced issues humans might miss
- **Speed**: ~30 seconds vs hours of manual review
- **Documented reasoning**: Explains WHY something is an issue

## Usage

```bash
/sw:qa <increment-id> [options]
```

### Examples

```bash
# Quick mode (default)
/sw:qa 0008

# Pre-implementation check
/sw:qa 0008 --pre

# Quality gate check (comprehensive)
/sw:qa 0008 --gate

# Export blockers to tasks.md
/sw:qa 0008 --export

# CI mode (exit 1 on FAIL)
/sw:qa 0008 --ci

# Skip AI assessment (rule-based only)
/sw:qa 0008 --no-ai

# Force run even if rule-based fails
/sw:qa 0008 --force
```

### Options

- `--quick` - Quick mode (default) - Fast assessment with core checks
- `--pre` - Pre-implementation mode - Check before starting work
- `--gate` - Quality gate mode - Comprehensive check before closing
- `--full` - Full multi-agent mode (Phase 3)
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

**IMPORTANT**: This step uses the `increment-quality-judge-v2` **skill** (auto-activated).

The skill provides guidance and the CLI handles execution:
```bash
# CLI invokes quality assessment directly
specweave qa 0008 --pre
```

**DO NOT spawn agents for quality assessment** - use the CLI command which handles everything internally.

The assessment evaluates:
- **7 Dimensions**:
  1. Clarity (18% weight)
  2. Testability (22% weight)
  3. Completeness (18% weight)
  4. Feasibility (13% weight)
  5. Maintainability (9% weight)
  6. Edge Cases (9% weight)
  7. **Risk Assessment (11% weight)**

**Risk Assessment** uses quantitative method:
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

1. **Parse and normalize arguments**
   ```typescript
   let incrementId = args[0]; // e.g., "0008" or "0008-feature-name"

   // Normalize increment ID
   if (incrementId.includes('-')) {
     // Extract numeric portion: "0008-feature-name" → "0008"
     incrementId = incrementId.split('-')[0];
   }
   // Convert to 4-digit format: "8" → "0008"
   incrementId = incrementId.padStart(4, '0');

   const options = parseOptions(args.slice(1));
   ```
   Both formats work: `/sw:qa 0153` or `/sw:qa 0153-feature-name`

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

**Use when**: Before closing increment (via `/sw:done`)
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
- ❌ Missing files → Run `/sw:inc` to create increment first
- ❌ Rule-based fails → Fix validation errors before AI assessment
- ❌ AI timeout → Retry with `--quick` mode or `--no-ai`

## Integration Points

**Auto-invoked by**:
- `/sw:done` - Runs `--gate` mode before closing increment
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
- **Command**: `/sw:done` (auto-runs QA gate)
- **CLI**: `specweave qa` (direct invocation)
- **Types**: `src/core/qa/types.ts` (TypeScript definitions)
- **Tests**: `tests/unit/qa/` (58 test cases, 100% passing)

## Example Session

```
User: /sw:qa 0008