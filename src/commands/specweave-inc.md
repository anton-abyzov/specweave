---
name: specweave-inc
description: Shorthand for /increment - Plan new Product Increment (PM-led process)
---

# Plan Product Increment (Quick Alias)

**⚡ Quick Alias**: This is a shorthand for `/increment`.

This is the **most frequently used command** in SpecWeave's append-only increment workflow. Every new feature starts here.

---

## Why This Alias Exists

In an append-only increment workflow:
- `/increment` is your starting point for ALL new work
- You'll use it dozens/hundreds of times
- Short alias saves time and mental overhead
- Other commands are used less frequently (no aliases needed)

---

## Usage

```bash
/inc "feature description"
```

**Examples**:
```bash
/inc "User authentication with JWT"
/inc "Payment processing with Stripe"
/inc "Real-time notifications"
```

---

## What This Does

Runs the full `/increment` command, which:

1. **Detects tech stack** (TypeScript, Python, Go, etc.)
2. **PM-led planning**:
   - Market research
   - Create spec.md (WHAT & WHY)
   - Create plan.md (HOW)
   - **Auto-generate tasks.md** from plan
   - Create tests.md (test strategy)
3. **Strategic agent review**:
   - Architect designs system
   - Security reviews threats
   - QA defines test strategy
   - DevOps plans infrastructure
4. **User review checkpoint**
5. **Ready to build**: `/do 0001`

---

## Typical Workflow

```bash
# 1. Plan increment (most common command - use alias!)
/inc "User authentication"

# 2. Review generated docs
#    spec.md, plan.md, tasks.md, tests.md

# 3. Build it
/do 0001

# 4. Validate quality (optional)
/validate 0001 --quality

# 5. Close when done
/done 0001
```

---

**💡 Pro Tip**: `/inc` is the ONLY aliased command. Use full names for others (`/specweave do`, `/specweave validate`, `/specweave done`) to keep the workflow clear and explicit.

---

For complete documentation, see `/increment`.
