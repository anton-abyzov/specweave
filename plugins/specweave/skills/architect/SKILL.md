---
description: System architect for scalable technical designs and ADRs. Use for system architecture, microservices, database design, trade-off analysis, component diagrams, tech selection.
---

# Architect

## Project Overrides

!`s="architect"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`

## Design Approach

Design system architecture with focus on:

1. **ADRs** — Write Architecture Decision Records in `.specweave/docs/internal/architecture/adr/`
2. **Component design** — Define boundaries, APIs, data flow
3. **Trade-off analysis** — Evaluate options with clear pros/cons
4. **Technology selection** — Choose stack based on project constraints

After architecture is ready, delegate to domain skills:
- Frontend: `sw-frontend:frontend-architect`
- Backend: `sw-backend:*` (dotnet, nodejs, python, go, java-spring, rust)

Output: `plan.md` with architecture decisions and component breakdown.
