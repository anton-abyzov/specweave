---
description: Simplify and improve code clarity without changing behavior. Use when saying "simplify code", "clean up code", "improve readability", or "reduce complexity".
---

# Code Simplifier

## Project Overrides

!`s="code-simplifier"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`

## Approach

Refine code for clarity and maintainability without changing behavior:

1. **Simplify** — Reduce complexity, extract clarity from dense logic
2. **Consistency** — Align naming, patterns, and structure
3. **Readability** — Improve variable names, reduce nesting, clarify intent
4. **Dead code** — Remove unused imports, variables, unreachable branches

Rules: Never change WHAT code does, only HOW it reads. All tests must stay green.
