---
sidebar_position: 9
title: "AI Development Fundamentals"
description: "Understanding deterministic vs non-deterministic programming when working with LLMs"
---

# AI Development Fundamentals

**Essential concepts for building reliable systems with LLMs.**

Working with AI tools like Claude Code requires a different mental model than traditional programming. This guide covers the fundamental differences and how to build guardrails around non-deterministic systems.

---

## Deterministic vs Non-Deterministic

### Traditional Programming: Deterministic

In traditional software development, calling a function produces the **exact same result** every time:

```typescript
// Deterministic: Input A ALWAYS produces Output B
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

calculateTotal([{ price: 10, quantity: 2 }]); // Always returns 20
calculateTotal([{ price: 10, quantity: 2 }]); // Always returns 20
calculateTotal([{ price: 10, quantity: 2 }]); // Always returns 20
```

**Characteristics:**
- **Predictable**: Same input = same output, every time
- **Testable**: Unit tests pass or fail consistently
- **Debuggable**: Step through code, inspect variables
- **Reproducible**: Bug happens once, you can reproduce it

### LLM-Based Development: Non-Deterministic

When you work with Claude or any LLM, responses can **vary** even with identical inputs:

```typescript
// Non-deterministic: Same prompt may produce different outputs
const response1 = await claude.complete("Implement user authentication");
const response2 = await claude.complete("Implement user authentication");

// response1 !== response2 (different code, same intent)
```

**Characteristics:**
- **Probabilistic**: ~90% confident, not 100%
- **Variable outputs**: Temperature, context length, message order affect results
- **Creative**: Generates novel solutions, not just retrieves answers
- **Context-sensitive**: Previous messages influence responses

---

## Why This Matters

### The Confidence Gap

| Approach | Confidence | Example |
|----------|------------|---------|
| **Deterministic** | 100% | `Math.max(a, b)` returns larger number |
| **LLM Response** | ~90% | "Implement login form" - probably correct, needs review |
| **LLM + Guardrails** | ~99% | Specs + validation + tests catch drift |

### Real-World Implications

**Without guardrails:**
```
You: "Add user authentication"
Claude: Implements JWT auth
You: "Add user authentication" (same prompt, new session)
Claude: Implements session-based auth

// Different approaches, both valid, but inconsistent
```

**With SpecWeave guardrails:**
```
spec.md:
  AC-US1-01: JWT-based authentication with refresh tokens
  AC-US1-02: Session expires after 24 hours

You: "Add user authentication"
Claude: Checks spec → Implements JWT with refresh tokens

// Consistent because specs define success criteria
```

---

## Strategies for Non-Deterministic Systems

### 1. Define Success Criteria Upfront

Don't rely on implicit understanding. Make acceptance criteria explicit:

```markdown
### US-001: User Authentication
**As a** user, I want to log in securely...

#### Acceptance Criteria
- [x] **AC-US1-01**: JWT tokens with 24h expiry
- [x] **AC-US1-02**: Refresh token rotation
- [x] **AC-US1-03**: Password hashing with bcrypt (12 rounds)
- [x] **AC-US1-04**: Rate limiting: 5 attempts per 15 minutes
```

### 2. Break Work into Verifiable Chunks

Large tasks have more variability. Small tasks are easier to validate:

```markdown
# ❌ Too broad - high variability
T-001: Implement authentication system

# ✅ Verifiable chunks - lower variability
T-001: Create User model with password hash field
T-002: Implement /auth/register endpoint
T-003: Implement /auth/login endpoint with JWT
T-004: Add refresh token rotation logic
T-005: Implement rate limiting middleware
```

### 3. Validate Outputs Automatically

Use hooks and tests to catch drift:

```typescript
// Hook: Validate every generated file
hooks:
  post-task-completion:
    - npm test
    - npm run lint
    - npm run typecheck
```

### 4. Use Quality Gates

Don't trust "it works" - verify against specs:

```bash
# SpecWeave validates before closing
/sw:done 0023

# Checks:
# ✓ All tasks completed?
# ✓ All ACs marked done?
# ✓ Tests passing?
# ✓ No uncommitted changes?
```

---

## Temperature and Variability

LLMs have a **temperature** parameter that controls randomness:

| Temperature | Behavior | Use Case |
|-------------|----------|----------|
| 0.0 | Most deterministic | Code generation, factual queries |
| 0.3-0.5 | Balanced | General development tasks |
| 0.7-1.0 | More creative | Brainstorming, creative writing |

**Note**: Even at temperature 0, LLMs aren't perfectly deterministic due to:
- Token sampling strategies
- Context window variations
- Model updates and versions

---

## The SpecWeave Approach

SpecWeave wraps non-deterministic AI with deterministic processes:

```
┌─────────────────────────────────────────────────────┐
│              SPECWEAVE STRUCTURE                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│   📋 spec.md (Deterministic)                        │
│   └── Acceptance criteria define success            │
│                                                      │
│   🤖 Claude (Non-Deterministic)                     │
│   └── Generates implementation                      │
│                                                      │
│   ✅ Validation (Deterministic)                     │
│   └── Tests, hooks, quality gates verify output     │
│                                                      │
│   📦 Result (Deterministic)                         │
│   └── Either passes all checks or fails             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Key insight**: You can't make the AI deterministic, but you can make the **outcome** deterministic by validating against explicit criteria.

---

## Practical Tips

### When Writing Prompts

```markdown
# ❌ Vague - high variability
"Make the code better"

# ✅ Specific - lower variability
"Refactor the UserService to:
1. Extract database queries to a repository layer
2. Add input validation using zod schemas
3. Return typed errors instead of throwing"
```

### When Reviewing AI Output

Always verify:
1. **Does it match the acceptance criteria?**
2. **Do tests pass?**
3. **Is the approach consistent with existing code?**
4. **Are there security implications?**

### When Things Go Wrong

Non-deterministic doesn't mean random. If outputs are consistently wrong:
1. Prompt may be ambiguous - add specificity
2. Context may be missing - load relevant files
3. Specs may conflict - resolve contradictions

---

## Summary

| Concept | Traditional Code | LLM-Based Development |
|---------|------------------|----------------------|
| **Predictability** | 100% same output | ~90% similar output |
| **Testing** | Unit tests are reliable | Need spec-based validation |
| **Debugging** | Step through code | Review prompts and context |
| **Success criteria** | Implicit in code | Must be explicit in specs |
| **Quality assurance** | Tests catch bugs | Tests + specs catch drift |

**Remember**: You're not writing scripts that execute the same way every time. You're orchestrating an AI that needs guidance, validation, and clear acceptance criteria to stay on track.

---

## How This Relates to SpecWeave

| SpecWeave Feature | How It Adds Determinism |
|-------------------|------------------------|
| **spec.md** | Explicit acceptance criteria |
| **tasks.md** | Verifiable work chunks |
| **Hooks** | Automatic validation after changes |
| **Quality Gates** | Block completion without verification |
| **Test Integration** | Automated pass/fail checks |

---

**Next**: [Testing Fundamentals](./testing-fundamentals) - how to build reliable test suites for AI-assisted development.
