---
description: Adaptive-thinking LLM-as-Judge validation of completed work. Uses the Opus model and an adaptive-thinking prompt hint for thorough, independent evaluation. Use when saying "judge my code", "judge-llm", "deep validate", or as part of sw:done closure.
allowed-tools: Read, Grep, Glob, Bash
---

# Adaptive-Thinking LLM-as-Judge Validation

Validate completed work using the adaptive-thinking LLM-as-Judge pattern. Provides an independent second opinion separate from `sw:grill`.

## Tool-Use Rationale

- **Read**: Load spec.md, tasks.md, rubric.md, and the files under review to build evaluation context.
- **Grep**: Search for AC patterns, test assertions, and implementation markers across the codebase.
- **Glob**: Discover test files and implementation files matching the increment's scope.
- **Bash**: Run `npx vitest run` to verify test pass rates; check file existence.

## Adaptive-Thinking Prompt Hint

> **think carefully and step-by-step — this evaluation is harder than it looks**

With Opus 4.7, we no longer pass a `thinking` API parameter. Instead, we rely on adaptive thinking triggered by the prompt hint above. The model decides how much reasoning each evaluation requires.

## Model Configuration

**Default effort**: `xhigh` — recommended for all evaluation tasks per Opus 4.7 conventions.
**Opt-in max**: `--effort max` enables maximum effort with a warning: "max effort risks overthinking on straightforward problems."
**Legacy mode**: Set `quality.thinkingBudget: "legacy"` in config to pass a fixed `thinking` parameter (for pre-4.7 models only).

## Effort Level

- **Default**: `xhigh` effort — the judge runs with the highest reasoning effort level by default.
- **Opt-in**: `--effort max` — elevates to maximum effort for exceptionally complex or high-stakes reviews.

## How It Differs from sw:grill

| Aspect | `sw:grill` | `sw:judge-llm` |
|--------|-------------|-----------------|
| Execution | In-session (same context) | **Separate Opus API call** |
| Context | Shares conversation context | **Fresh context (no bias)** |
| Reasoning | Standard reasoning | **Adaptive thinking via prompt hint (`xhigh` default, `--effort max` opt-in)** |
| Output | Confidence-scored findings | Structured verdict + score |
| Domain | Generic code review | **Built-in domain criteria** |

**Key value**: Independent perspective with fresh model context catches issues that in-session review may miss.

## Implementation

**TypeScript**: `src/core/skills/skill-judge.ts`
- Uses Anthropic SDK with user's `ANTHROPIC_API_KEY`
- Model-version guard: omits the `thinking` API parameter on `claude-opus-4-7*` and newer models; falls back to adaptive-thinking prompt hint
- AbortController-based timeout to prevent stuck states (default: 60s)
- Progress logging to `.specweave/logs/judge-llm.log`
- Fallback to basic pattern matching if no API key
- Domain-specific evaluation criteria (frontend, backend, mobile, infrastructure, testing, ML)

## Usage

```bash
# DEFAULT: Adaptive-thinking validation at xhigh effort
sw:judge-llm src/file.ts
sw:judge-llm "src/**/*.ts"

# Validate git changes (adaptive thinking by default)
sw:judge-llm --staged           # Staged changes
sw:judge-llm --last-commit      # Last commit
sw:judge-llm --diff main        # Diff vs branch

# Quick mode (ONLY if you need speed over thoroughness)
sw:judge-llm src/file.ts --quick

# Maximum reasoning effort (opt-in)
sw:judge-llm src/file.ts --effort max

# Timeout control (default: 60s)
sw:judge-llm src/file.ts --timeout 120000

# Additional options
sw:judge-llm src/file.ts --strict   # Fail on any concern
sw:judge-llm src/file.ts --fix      # Include fix suggestions
sw:judge-llm src/file.ts --export   # Export report to markdown
sw:judge-llm src/file.ts --verbose  # Show progress to console
```

## External API Cost Consent (MANDATORY)

**This skill uses the Anthropic API directly (NOT your Claude Code subscription).** Each evaluation costs approximately $0.01-0.05 depending on code size.

**Before invoking the Anthropic API, you MUST check consent:**

1. Read `.specweave/config.json` → check `externalModels.consent` field
2. If `"always-allow"` → proceed silently
3. If `"never"` → skip API call, use in-session adaptive-thinking evaluation instead
4. If `"ask"` (default):
   - Check if `"anthropic"` is in `externalModels.allowedProviders`
   - If YES → proceed silently (standing permission)
   - If NO → **ASK USER**: "Judge-LLM will call the Anthropic API using your ANTHROPIC_API_KEY. This costs ~$0.01-0.05 per evaluation. Proceed? (yes/no/always)"
     - "yes" → proceed this time only
     - "no" → skip API call, use in-session adaptive-thinking evaluation instead
     - "always" → run: `grantStandingConsent('anthropic', projectRoot)` from `src/core/llm/consent.ts`, then proceed
5. No `ANTHROPIC_API_KEY` set → falls back to pattern matching automatically (no cost, no consent needed)

## Workflow

### Step 1: Gather Input

Determine what to validate:
- If file paths provided: read those files
- If `--staged`: get staged git changes
- If `--last-commit`: get files from last commit
- If `--diff <branch>`: get diff against branch
- If no args: validate recent work in conversation context

### Step 2: Adaptive-Thinking Analysis (Default)

Prompt hint prefix (include verbatim at the start of the judge prompt):

> **think carefully and step-by-step — this evaluation is harder than it looks**

Use adaptive thinking (triggered by the hint) for deep LLM-as-Judge evaluation via the Opus 4.7 model at `xhigh` effort by default (`--effort max` opt-in for exceptional cases):

```
Claude MUST think carefully and step-by-step to:

1. DEEP READ: Thoroughly understand all code, context, and intent
2. MULTI-DIMENSIONAL ANALYSIS: Evaluate across ALL dimensions:
   - Correctness: Does it work exactly as intended?
   - Completeness: ALL edge cases handled? ALL requirements met?
   - Security: ANY vulnerabilities? OWASP Top 10 checked?
   - Performance: Algorithmic complexity? Memory usage? Bottlenecks?
   - Maintainability: Clean? Clear? Follows conventions?
   - Testability: Can it be tested? Are tests adequate?
   - Error handling: All failure modes covered?
3. CRITICAL EVALUATION: Weigh ALL findings by severity
4. REASONED VERDICT: Form verdict based on thorough analysis
```

### Step 3: Return Verdict

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JUDGE-LLM VERDICT: APPROVED | CONCERNS | REJECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mode: ADAPTIVE-THINKING (xhigh effort)
Confidence: 0.XX
Files Analyzed: N

REASONING:
[Detailed chain-of-thought from adaptive thinking]

ISSUES (if any):
  CRITICAL: [title]
   [description]
   [file:line]
   [suggestion]

  HIGH: [title]
   ...

  LOW: [title]
   ...

VERDICT: [summary sentence]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Verdict Meanings

| Verdict | Meaning | Action |
|---------|---------|--------|
| **APPROVED** | Work is solid, no significant issues | Safe to proceed |
| **CONCERNS** | Issues found worth addressing | Review and fix recommended |
| **REJECTED** | Critical issues found | MUST fix before proceeding |

## Rubric Integration

**Rubric Integration**: If `rubric.md` exists in the increment directory:
1. Load the file and find all criteria where `Evaluator: sw:judge-llm`
2. After determining your verdict, update matching criteria: `[x] PASS` if verdict is not REJECTED, `[!] FAIL — verdict: REJECTED` otherwise
3. If rubric.md does not exist, proceed with existing behavior (no error)

## Persistent Report (MANDATORY)

After evaluation (including consent-denied fallback), you **MUST** write a JSON report. The CLI checks for this file during closure.

**Path**: `.specweave/increments/<id>/reports/judge-llm-report.json`

**Full evaluation report**:
```json
{
  "version": "1.0",
  "incrementId": "<id>",
  "timestamp": "<ISO-8601>",
  "verdict": "APPROVED|CONCERNS|REJECTED",
  "score": 87,
  "mode": "adaptive-thinking|quick|pattern-match",
  "timedOut": false,
  "duration_ms": 45000,
  "consentStatus": "granted",
  "summary": "..."
}
```

**Consent denied / no API key**:
```json
{
  "version": "1.0",
  "incrementId": "<id>",
  "timestamp": "<ISO-8601>",
  "verdict": "WAIVED",
  "consentStatus": "denied",
  "reason": "External API consent denied by user"
}
```

A `WAIVED` verdict is accepted by the CLI — does not block closure.

## Refinement Signal Emission (0671)

When the verdict is `REJECTED` or `CONCERNS` and a finding references a specific skill slug (e.g. `sw:architect` in `concerns`, `recommendations`, or `summary`), `SkillJudge.writeReport` appends a refinement signal to `.specweave/state/skill-signals.json` (best-effort, never blocks the gate). `REJECTED` → severity `high`; `CONCERNS` → `medium`. Signals are consumed later by `sw:skill-refine`.

## Visibility & Stuck Detection

Progress logged to `.specweave/logs/judge-llm.log`. Default timeout 60s aborts if stuck (`timedOut: true`).

## Related

- `sw:grill` - Confidence-scored pre-ship quality gate (in-session)
- `sw:validate` - Rule-based increment validation
- `sw:done` - Increment closure (runs both grill and judge-llm)

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#judge-llm)
