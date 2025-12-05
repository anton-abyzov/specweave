---
name: specweave:judge
description: Validate completed work using LLM-as-Judge pattern. Works on any files, not just increments.
---

# /specweave:judge - Work Validation via Judge LLM

Validate any completed work using the LLM-as-Judge pattern with deep reasoning.

## Purpose

Use when you've completed work (files, git changes, any code) and want AI-powered validation:
- Works on **any files** (not just SpecWeave increments)
- Uses **chain-of-thought reasoning** for thorough analysis
- Returns **clear verdict** with detailed reasoning

## Usage

```bash
# Validate specific files
/specweave:judge src/file.ts
/specweave:judge "src/**/*.ts"

# Validate git changes
/specweave:judge --staged           # Staged changes
/specweave:judge --last-commit      # Last commit
/specweave:judge --diff main        # Diff vs branch

# Validation modes
/specweave:judge src/file.ts --quick    # Fast (~10s)
/specweave:judge src/file.ts --deep     # Thorough (~60s)
/specweave:judge src/file.ts --strict   # Fail on any concern

# Additional options
/specweave:judge src/file.ts --fix      # Include fix suggestions
/specweave:judge src/file.ts --export   # Export report to markdown
```

## How It Works

When you invoke `/specweave:judge`, Claude will:

### Step 1: Gather Input

Determine what to validate:
- If file paths provided → read those files
- If `--staged` → get staged git changes
- If `--last-commit` → get files from last commit
- If `--diff <branch>` → get diff against branch

### Step 2: Analyze with Judge LLM Pattern

Use chain-of-thought reasoning to evaluate:

```markdown
<thinking>
1. **Read**: Understand what the code does
2. **Analyze**: Check for issues across dimensions:
   - Correctness: Does it work as intended?
   - Completeness: Are edge cases handled?
   - Security: Any vulnerabilities?
   - Performance: Any obvious issues?
   - Maintainability: Is it clean and clear?
3. **Evaluate**: Weigh findings by severity
4. **Decide**: Form verdict based on analysis
</thinking>
```

### Step 3: Return Verdict

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JUDGE VERDICT: APPROVED | CONCERNS | REJECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Confidence: 0.XX
Files Analyzed: N

REASONING:
[Chain-of-thought explanation of findings]

ISSUES (if any):
🔴 CRITICAL: [title]
   [description]
   📍 [file:line]
   💡 [suggestion]

🟡 HIGH: [title]
   ...

🟢 LOW: [title]
   ...

VERDICT: [summary sentence]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Verdict Meanings

| Verdict | Meaning | Action |
|---------|---------|--------|
| **APPROVED** | Work looks good, no significant issues | Safe to proceed |
| **CONCERNS** | Some issues found, worth addressing | Review and fix if time permits |
| **REJECTED** | Critical issues found | Must fix before proceeding |

## Validation Modes

### Quick Mode (`--quick`)
- Fast validation (~10 seconds)
- Focuses on obvious issues
- Good for frequent checks during development
- Cost: ~$0.02-0.05

### Default Mode
- Balanced validation (~30 seconds)
- Thorough analysis of all dimensions
- Good for pre-commit validation
- Cost: ~$0.05-0.10

### Deep Mode (`--deep`)
- Most thorough validation (~60 seconds)
- Extended thinking for complex reasoning
- Good for critical code or security review
- Cost: ~$0.10-0.20

### Strict Mode (`--strict`)
- Any concern results in REJECTED
- Use for critical paths, security code, or CI gates

## Examples

### Example 1: Validate a new feature

```
User: /specweave:judge src/core/auth/login.ts

Claude:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JUDGE VERDICT: APPROVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Confidence: 0.85
Files Analyzed: 1

REASONING:
The login implementation follows security best practices:
- Password hashing uses bcrypt with appropriate cost factor
- Rate limiting is implemented (5 attempts, 15 min lockout)
- Input validation prevents injection attacks
- Error messages don't leak user existence

No critical or high-severity issues found.

VERDICT: Implementation is solid and ready for use.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Example 2: Validate staged changes

```
User: /specweave:judge --staged

Claude:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JUDGE VERDICT: CONCERNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Confidence: 0.78
Files Analyzed: 3

REASONING:
Changes add new API endpoint but have some issues:
- Missing input validation on user-provided data
- Error messages could leak internal paths
- No rate limiting on new endpoint

🟡 HIGH: Missing Input Validation
   User input passed directly to database query
   📍 src/api/users.ts:45
   💡 Add Zod schema validation before processing

🟡 HIGH: Information Disclosure
   Stack traces exposed in error responses
   📍 src/api/users.ts:62
   💡 Use production error handler that sanitizes output

VERDICT: Address the input validation before merging.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Example 3: Deep validation with fixes

```
User: /specweave:judge src/payments/checkout.ts --deep --fix

Claude:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JUDGE VERDICT: REJECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Confidence: 0.92
Files Analyzed: 1

REASONING:
Critical security issue found in payment processing:
- API key hardcoded in source file
- No HTTPS enforcement for payment requests
- Missing idempotency key handling

🔴 CRITICAL: Hardcoded API Key
   Stripe API key exposed in source code
   📍 src/payments/checkout.ts:12
   💡 Move to environment variable:
   ```typescript
   // Before (INSECURE)
   const stripe = new Stripe('sk_live_xxx...');

   // After (SECURE)
   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
   ```

🔴 CRITICAL: No HTTPS Enforcement
   Payment requests may go over HTTP
   📍 src/payments/checkout.ts:34
   💡 Add protocol check:
   ```typescript
   if (process.env.NODE_ENV === 'production' && !req.secure) {
     return res.status(403).json({ error: 'HTTPS required' });
   }
   ```

VERDICT: MUST FIX before deployment - security critical.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Difference from /specweave:qa

| Aspect | `/specweave:qa` | `/specweave:judge` |
|--------|-----------------|-------------------|
| **Scope** | Increments only | Any files |
| **Input** | Increment ID | Files, git diff |
| **Pattern** | 7-dimension scoring | Judge LLM reasoning |
| **Focus** | Spec quality, risks | Code correctness |
| **When** | Before increment close | After any work |

## Best Practices

1. **Use frequently**: Run during development, not just at the end
2. **Use `--staged`**: Validate before committing
3. **Use `--strict` for critical code**: Payment, auth, security
4. **Fix CRITICAL issues immediately**: Never ignore these
5. **Address CONCERNS before release**: They matter
6. **Use after bug fixes**: Especially effective when work has definitive expected behavior

**Simplest workflow** - just mention "llm judge" in your prompt:
```
"llm judge my fix"
"use llm judge on this"
```

Claude will automatically gather context and apply the pattern - no need to specify files.

This follows the [LLM-as-Judge pattern](https://www.anthropic.com/engineering/multi-agent-research-system) - single LLM call with structured evaluation proves more consistent than multiple validation passes.

## Limitations

- ❌ Doesn't execute tests (use test runners)
- ❌ Doesn't auto-apply fixes (only suggests)
- ❌ May miss domain-specific issues
- ❌ Not a replacement for human review

## Related

- `/specweave:qa` - Increment-bound quality assessment
- `/specweave-core:code-review` - Prompt-based code review
- `ado-sync-judge` agent - Uses judge pattern for sync validation
