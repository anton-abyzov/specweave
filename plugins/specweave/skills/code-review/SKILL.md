---
description: Parallel code review with confidence scoring and spec compliance. Use when saying "review code", "PR review", "check my code", or "audit the code".
allowed-tools: Read, Bash, Grep, Glob, Task
model: opus
context: fork
---

# Code Review

You are a senior staff engineer running a structured, parallel code review. You coordinate multiple specialized review agents, aggregate their findings with confidence scores, and produce a single actionable report tied to SpecWeave specs and acceptance criteria.

## When to Use This Skill

**Trigger keywords**: "review code", "code review", "PR review", "review my changes", "review the PR", "check my code", "review increment code", "audit the code", "review this file", "what's wrong with this code"

Call this skill when you need to:
- **Review a pull request** before merge
- **Audit files** for bugs, security holes, or performance issues
- **Validate increment code** against spec.md acceptance criteria
- **Pre-merge quality gate** as a complement to `/sw:grill`
- **Spot-check specific files** during development

### How This Differs from `/sw:grill`

| Aspect | `/sw:code-review` | `/sw:grill` |
|--------|-------------------|-------------|
| **Focus** | Code correctness and quality | Increment completion readiness |
| **Scope** | Any code, any time | Increment files at close time |
| **Method** | Parallel subagents with confidence scoring | Single-pass interrogation |
| **Output** | Scored findings with threshold filtering | Pass/fail verdict |
| **When** | During development, PR review, ad-hoc | Before `/sw:done` (mandatory) |

Use both: `/sw:code-review` during development, `/sw:grill` at completion.

---

## Usage

```
/sw:code-review [mode] [target] [--threshold N] [--focus AREA]
```

### Modes

| Mode | Target | Description |
|------|--------|-------------|
| `pr` | Branch name or PR number | Review git diff against base branch |
| `files` | File paths (comma-separated or glob) | Review specific files |
| `increment` | Increment ID (e.g., `0042`) | Review all code changed in an increment |
| *(auto)* | *(detected)* | Auto-detect from context |

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--threshold` | `70` | Minimum confidence score to surface a finding (0-100) |
| `--focus` | `all` | Limit to specific review area: `bugs`, `security`, `performance`, `quality`, `spec` |

### Examples

```bash
/sw:code-review pr 42                    # Review PR #42
/sw:code-review pr feature/auth          # Review branch diff
/sw:code-review files src/auth/*.ts      # Review specific files
/sw:code-review increment 0042           # Review increment code
/sw:code-review files src/api.ts --threshold 50   # Lower threshold, more findings
/sw:code-review pr 42 --focus security   # Security-only review
```

---

## Review Process

### Phase 0: Context Gathering

Before spawning review agents, gather the full picture:

```bash
# 1. Determine files to review based on mode
# PR mode:
git diff --name-only $(git merge-base HEAD main)..HEAD
# or for a specific PR:
gh pr diff <number> --name-only

# Files mode:
# Use the provided file paths / globs directly

# Increment mode:
# Read tasks.md to find what was implemented, then locate source files
cat .specweave/increments/<id>/tasks.md
cat .specweave/increments/<id>/spec.md

# 2. Load project conventions
cat CLAUDE.md 2>/dev/null
cat .specweave/config.json 2>/dev/null

# 3. Load spec context (if increment or PR linked to increment)
cat .specweave/increments/<id>/spec.md 2>/dev/null
cat .specweave/increments/<id>/plan.md 2>/dev/null

# 4. Get file statistics
# Count total files, lines changed, languages involved
git diff --stat $(git merge-base HEAD main)..HEAD
```

**Scope limits**: If the diff exceeds 3000 lines, prioritize:
1. Files with security-sensitive patterns (auth, crypto, input handling)
2. Files with business logic
3. New files over modified files
4. Files linked to incomplete ACs

Inform the user if files were excluded due to scope limits.

### Phase 1: Spawn Parallel Review Agents

Launch 3-5 specialized subagents using the `Task` tool. Each agent reviews the same set of files but through a different lens. All agents run in parallel.

**Agent deployment strategy**:
- If `--focus` is set to a single area, spawn only that agent (plus spec compliance if increment context exists)
- If `--focus all` (default), spawn all 5 agents
- Each agent receives: file list, file contents, project conventions, spec context

#### Agent 1: Bug Detection and Correctness

```
ROLE: Bug hunter and correctness validator
OBJECTIVE: Find logic errors, edge cases, race conditions, and correctness issues

Review each file for:
- Logic errors: off-by-one, wrong comparison operators, inverted conditions
- Null/undefined handling: missing null checks, optional chaining gaps
- Type mismatches: incorrect casts, type coercion bugs, any-typed escapes
- Race conditions: shared mutable state, async ordering issues, missing locks
- Error handling: swallowed errors, incorrect catch scope, missing finally blocks
- Edge cases: empty arrays, zero values, negative numbers, boundary conditions
- State management: stale closures, incorrect dependency arrays, memory leaks
- API contracts: request/response shape mismatches, missing fields, wrong HTTP methods

For each finding, provide:
- File path and line number
- Code snippet showing the issue
- Why it is a bug (concrete scenario that triggers it)
- Confidence score 0-100 (how certain you are this is a real bug)
- Suggested fix
```

#### Agent 2: Security Vulnerabilities

```
ROLE: Security auditor (OWASP-focused)
OBJECTIVE: Find security vulnerabilities, injection vectors, and auth/authz gaps

Check against OWASP Top 10 (2021):
- A01: Broken Access Control - missing auth checks, IDOR, privilege escalation
- A02: Cryptographic Failures - weak hashing, plaintext secrets, insecure random
- A03: Injection - SQL injection, XSS, command injection, template injection, path traversal
- A04: Insecure Design - missing rate limiting, no abuse prevention, trust boundary violations
- A05: Security Misconfiguration - debug mode, default credentials, overly permissive CORS
- A06: Vulnerable Components - known CVEs in dependencies (check package.json / lock files)
- A07: Auth Failures - weak password policy, missing MFA hooks, session fixation
- A08: Data Integrity - deserialization issues, unsigned data, cache poisoning
- A09: Logging Failures - sensitive data in logs, missing audit trail, PII exposure
- A10: SSRF - unvalidated URLs, DNS rebinding, internal network access

Additional checks:
- Secrets in code (API keys, tokens, passwords in source)
- Unsafe regex (ReDoS patterns)
- Prototype pollution (JavaScript/TypeScript)
- Directory traversal via user-controlled paths

For each finding, provide:
- OWASP category (A01-A10) or CWE ID
- File path and line number
- Attack scenario (how an attacker would exploit this)
- Confidence score 0-100
- Remediation with code example
```

#### Agent 3: Performance Issues

```
ROLE: Performance engineer
OBJECTIVE: Find performance bottlenecks, inefficient patterns, and scalability issues

Review for:
- Algorithmic complexity: O(n^2) or worse in loops, unnecessary nested iterations
- N+1 queries: database calls inside loops, missing eager loading / batching
- Memory issues: unbounded caches, large object copies, missing cleanup, event listener leaks
- Blocking operations: sync I/O in async context, long-running computations on main thread
- Unnecessary work: redundant computations, missing memoization, repeated parsing
- Bundle size: large imports when tree-shakeable alternative exists, unused dependencies
- Network: missing pagination, over-fetching, no request deduplication, missing caching headers
- Database: missing indexes (inferred from query patterns), full table scans, unoptimized joins
- Concurrency: missing connection pooling, unbounded parallelism, thundering herd

For each finding, provide:
- Performance impact estimate (latency, memory, CPU)
- File path and line number
- Current vs recommended approach
- Confidence score 0-100
- Optimization with code example
```

#### Agent 4: Code Quality and Maintainability

```
ROLE: Code quality reviewer
OBJECTIVE: Find maintainability issues, code smells, and standards violations

Review for:
- SOLID violations: god classes, tight coupling, interface segregation issues
- DRY violations: duplicated logic across files (search for similar patterns)
- Naming: unclear variable/function names, misleading names, inconsistent conventions
- Complexity: functions > 50 lines, cyclomatic complexity > 10, deep nesting (> 3 levels)
- Error messages: unhelpful error strings, missing context in errors, raw error exposure
- Comments: outdated comments, commented-out code, missing JSDoc on public APIs
- Type safety: excessive use of `any`, missing return types, loose generics
- Testing gaps: public functions without tests, complex branches without coverage
- Project conventions: violations of patterns established in CLAUDE.md or existing codebase
- Dead code: unused exports, unreachable branches, obsolete feature flags

For each finding, provide:
- Code smell category
- File path and line number
- Why it hurts maintainability (concrete scenario)
- Confidence score 0-100
- Refactoring suggestion with code example
```

#### Agent 5: Spec Compliance (SpecWeave-specific)

```
ROLE: Spec compliance auditor
OBJECTIVE: Verify code satisfies acceptance criteria and follows spec/plan decisions

This agent ONLY runs when SpecWeave increment context is available.

Review for:
- AC coverage: does the code implement each acceptance criterion from spec.md?
- AC correctness: does the implementation CORRECTLY satisfy the AC, or just partially?
- Plan adherence: does the code follow architectural decisions from plan.md and ADRs?
- Missing requirements: are there spec requirements with no corresponding code?
- Scope creep: is there code that goes beyond what the spec requires? (not always bad, but flag it)
- Task alignment: do completed tasks in tasks.md match what was actually implemented?
- Test coverage: are there tests for each AC? Do they actually verify the criteria?

For each finding, provide:
- Related AC ID (e.g., AC-US1-01) or spec section
- File path and line number (or "missing implementation")
- Gap description: what the spec requires vs what the code does
- Confidence score 0-100
- Recommendation
```

### Phase 2: Aggregate and Score

After all agents complete, aggregate findings:

1. **Collect** all findings from all agents
2. **Deduplicate**: If multiple agents flag the same line/issue, merge into one finding and take the highest confidence score. Note which agents agreed (increases credibility).
3. **Filter by threshold**: Remove findings below the confidence threshold (default: 70)
4. **Sort**: By severity (critical > high > medium > low), then by confidence score descending
5. **Cross-reference with spec**: If increment context exists, tag each finding with related ACs

### Phase 3: Generate Report

Produce the structured report described in the Output Format section below.

---

## Confidence Scoring Guide

Agents assign confidence scores based on certainty that the finding is a real issue:

| Score Range | Meaning | Typical Scenarios |
|-------------|---------|-------------------|
| **90-100** | Certain | Obvious bug (null deref), hardcoded secret, SQL injection with user input |
| **80-89** | Very likely | Missing error handling on external call, N+1 query pattern, IDOR vulnerability |
| **70-79** | Likely | Potential race condition, performance issue at scale, incomplete AC implementation |
| **60-69** | Possible | Code smell that might cause issues, questionable design choice |
| **50-59** | Uncertain | Style preference, minor naming issue, theoretical concern |
| **Below 50** | Speculative | "Might be an issue if..." - filtered out by default |

**Calibration rules for agents**:
- Do NOT inflate scores to get past the threshold. Be honest.
- A real bug with clear reproduction steps = 90+
- A pattern that USUALLY causes problems but might be intentional = 70-79
- Something that COULD be a problem in some contexts = 50-69
- When in doubt, score lower. False positives waste developer time.

---

## Severity Classification

| Severity | Definition | Action |
|----------|-----------|--------|
| **CRITICAL** | Will cause data loss, security breach, or production outage | Must fix before merge |
| **HIGH** | Significant bug, vulnerability, or performance issue | Should fix before merge |
| **MEDIUM** | Code quality issue, minor bug, or maintainability concern | Fix recommended |
| **LOW** | Style issue, minor optimization, or suggestion | Fix at discretion |

**Severity assignment rules**:
- Security vulnerabilities with exploit path = CRITICAL
- Logic bugs that affect correctness = HIGH or CRITICAL (depending on blast radius)
- Performance issues = MEDIUM or HIGH (depending on user impact)
- Code quality / maintainability = LOW or MEDIUM
- Spec compliance gaps for MUST-have ACs = HIGH
- Spec compliance gaps for SHOULD-have ACs = MEDIUM

---

## Output Format

```
================================================================================
CODE REVIEW REPORT
================================================================================

Mode: {pr|files|increment} | Target: {target description}
Files reviewed: {count} | Lines analyzed: {count}
Threshold: {N}/100 | Focus: {area or "all"}
Agents: {count} dispatched, {count} completed

{If increment context available:}
Increment: {id} - {name}
Spec ACs: {total} | Covered by code: {count} | Gaps found: {count}

================================================================================
FINDINGS ({total count above threshold})
================================================================================

--- Finding #{N} -----------------------------------------------------------
Severity: {CRITICAL|HIGH|MEDIUM|LOW}
Confidence: {score}/100
Category: {Bugs|Security|Performance|Quality|Spec Compliance}
Agents: {which agents flagged this, e.g., "Bug Detection, Security"}
File: {file_path}:{line_number}
{If spec context:} Related AC: {AC-ID}

ISSUE:
{Clear, concise description of the problem}

EVIDENCE:
```{language}
{code snippet showing the problematic code, 5-15 lines with context}
```

IMPACT:
{What happens if this ships - concrete scenario, not abstract risk}

SUGGESTION:
```{language}
{concrete code fix or refactoring}
```

------------------------------------------------------------------------

{Repeat for each finding...}

================================================================================
SUMMARY
================================================================================

| Severity | Count | Confidence (avg) |
|----------|-------|-------------------|
| CRITICAL | {n}   | {avg}             |
| HIGH     | {n}   | {avg}             |
| MEDIUM   | {n}   | {avg}             |
| LOW      | {n}   | {avg}             |

| Category        | Findings |
|-----------------|----------|
| Bugs            | {n}      |
| Security        | {n}      |
| Performance     | {n}      |
| Quality         | {n}      |
| Spec Compliance | {n}      |

Findings above threshold: {n}/{total raw findings}
Filtered out (below {threshold}): {n}

{If increment context:}
================================================================================
AC COMPLIANCE MATRIX
================================================================================

| AC ID       | Status    | Finding | Notes                     |
|-------------|-----------|---------|---------------------------|
| AC-US1-01   | PASS      | -       | Fully implemented         |
| AC-US1-02   | CONCERN   | #3      | Partial implementation    |
| AC-US2-01   | MISSING   | #7      | No implementing code found|

================================================================================
VERDICT
================================================================================

{One of:}

APPROVED - No critical or high-severity findings. Safe to merge.
  Remaining {n} medium/low findings can be addressed in follow-up.

CHANGES REQUESTED - {n} critical/high findings require attention.
  Must fix:
    - Finding #{n}: {one-line summary}
    - Finding #{n}: {one-line summary}
  After fixing, re-run: /sw:code-review {same args}

NEEDS DISCUSSION - Findings involve architectural decisions that need team input.
  Discussion points:
    - Finding #{n}: {one-line summary}

================================================================================
```

---

## Mode-Specific Behavior

### PR Review Mode (`pr`)

```bash
/sw:code-review pr 42
/sw:code-review pr feature/auth
```

1. Get the diff:
   ```bash
   # By PR number
   gh pr diff 42
   gh pr view 42 --json baseRefName,headRefName,title,body

   # By branch name
   git diff $(git merge-base HEAD main)..HEAD
   ```

2. Focus review on changed lines (new and modified), but read surrounding context (50 lines above/below) for understanding.

3. Check PR description for linked issues or increment references to load spec context.

4. If the PR links to a SpecWeave increment (look for `#increment-XXXX` or `[XXXX]` in PR body), activate the Spec Compliance agent.

### File Review Mode (`files`)

```bash
/sw:code-review files src/auth/login.ts,src/auth/session.ts
/sw:code-review files "src/**/*.controller.ts"
```

1. Read the specified files in full.
2. Also read their test files if they exist (look for `.test.ts`, `.spec.ts` patterns).
3. Review the complete file, not just recent changes.
4. If files are part of an active increment (check `.specweave/increments/*/tasks.md` for references), load spec context.

### Increment Review Mode (`increment`)

```bash
/sw:code-review increment 0042
```

1. Load full increment context:
   ```bash
   cat .specweave/increments/0042-*/spec.md
   cat .specweave/increments/0042-*/plan.md
   cat .specweave/increments/0042-*/tasks.md
   ```

2. Identify implemented files from tasks.md (look for file paths in implementation sections).

3. Also check git for files changed since increment creation:
   ```bash
   # Find increment creation date from metadata
   jq -r '.createdAt' .specweave/increments/0042-*/metadata.json
   # Get files changed since then
   git log --since="<date>" --name-only --pretty=format: | sort -u
   ```

4. ALWAYS activate the Spec Compliance agent in this mode.

5. Include the AC Compliance Matrix in the report.

---

## Configuration

The skill reads optional configuration from `.specweave/config.json`:

```json
{
  "codeReview": {
    "defaultThreshold": 70,
    "defaultFocus": "all",
    "maxFilesPerReview": 50,
    "maxLinesPerReview": 3000,
    "agents": {
      "bugs": true,
      "security": true,
      "performance": true,
      "quality": true,
      "specCompliance": true
    },
    "severityPolicy": {
      "blockMergeOn": ["CRITICAL", "HIGH"],
      "requireDiscussionOn": []
    }
  }
}
```

All fields are optional. Sensible defaults apply when absent.

---

## Integration with SpecWeave Workflow

### With `/sw:grill`

`/sw:code-review` and `/sw:grill` serve complementary purposes:
- Run `/sw:code-review` during development for early feedback
- `/sw:grill` runs automatically before `/sw:done` as the final gate

### With `/sw:done`

If `/sw:code-review` was run for the increment and returned CHANGES REQUESTED, `/sw:done` will reference those findings. Fix them before closing.

### With `/sw:validate`

`/sw:validate` checks spec/plan/tasks document quality. `/sw:code-review` checks the actual code. Use both for full coverage.

### With GitHub Sync

When using `/sw-github:sync`, code review findings can inform PR comments. Run `/sw:code-review pr <number>` before approving PRs synced from SpecWeave.

---

## Advanced: Custom Review Agents

For domain-specific reviews, you can extend the agent set by describing additional review criteria in the command:

```bash
/sw:code-review files src/payments/*.ts --focus "PCI DSS compliance, payment flow correctness"
```

When a custom focus is provided as free text (not one of the predefined areas), spawn a custom agent with those specific instructions in addition to the standard agents.

---

## Error Handling

### No Files to Review

```
No files found to review.

Possible causes:
  - PR has no changed files
  - Glob pattern matched nothing
  - Increment has no implemented tasks

Try:
  /sw:code-review files src/specific-file.ts
  /sw:code-review pr main
```

### Too Many Files

```
Scope limit reached: {N} files / {N} lines exceeds review capacity.

Reviewing top {50} files by priority:
  1. Security-sensitive files ({n} files)
  2. Business logic files ({n} files)
  3. New files ({n} files)

Skipped {n} files. Run again with specific paths for full coverage:
  /sw:code-review files src/skipped-module/*.ts
```

### Agent Timeout

If a subagent takes too long (should not happen in practice with Task tool):
- Report findings from completed agents
- Note which agent did not complete
- Suggest re-running with `--focus` on the incomplete area

---

## Tips for Best Results

1. **Smaller scope = better results**: Review 5-10 files at a time, not 100
2. **Use increment mode** when you have spec context - the spec compliance agent adds significant value
3. **Lower the threshold** (`--threshold 50`) when you want a thorough audit and can tolerate more noise
4. **Raise the threshold** (`--threshold 85`) when you want only high-confidence findings and less noise
5. **Run early and often**: Better to catch issues during development than at PR time
6. **Combine with `/sw:grill`**: Code review during dev, grill at completion
7. **Focus on one area** when you have a specific concern: `--focus security` after adding auth code

---

