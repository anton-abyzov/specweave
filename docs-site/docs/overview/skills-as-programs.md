---
sidebar_position: 2
title: "Skills Are Programs in English"
description: "SpecWeave skills are reusable, extensible programs written in natural language — not prompts, not templates, but programmable AI behavior."
---

# Skills Are Programs in English

Most AI coding tools give you prompts. SpecWeave gives you **programs**.

A SpecWeave skill is a structured document that controls how AI thinks, decides, and acts. It has logic, conditions, extension points, and memory. It runs the same way every time — but you can customize it without touching the source.

## What Makes a Skill Different from a Prompt?

| | Prompt | SpecWeave Skill |
|---|---|---|
| **Reusable** | Copy-paste across sessions | Invoke by name: `/sw:grill` |
| **Extensible** | Edit the original text | Override via `skill-memories/` — original keeps updating |
| **Composable** | Manual chaining | Skills invoke other skills: PM → Architect → Frontend |
| **Stateful** | Forgets everything | Learns from corrections permanently |
| **Testable** | "Did it work?" | Quality gates verify output automatically |

## The Power: You Program AI Behavior

Instead of writing this every session:

```
"When generating React components, always use React Hook Form with Zod
validation, Tailwind for styling, import from @/components/ui, and
write Vitest tests with Testing Library..."
```

You write it **once** in a skill-memory file, and every skill respects it forever:

```markdown
# .specweave/skill-memories/frontend.md

### Form Handling
- Use React Hook Form for all forms
- Combine with Zod for validation schemas
- Never use plain useState for form state

### Styling
- Tailwind utilities only, no inline styles
- Import from @/components/ui design system
```

Next session, next agent, next month — the AI already knows your patterns.

## 100+ Skills Cover the Full Lifecycle

SpecWeave ships with specialized skills for every role:

- **PM** (`/sw:pm`) — writes user stories with acceptance criteria
- **Architect** (`/sw:architect`) — designs systems, writes ADRs
- **Frontend** (`/sw-frontend:frontend`) — React, Vue, Angular, Next.js
- **Backend** (`/sw-backend:nodejs-backend`, `python-backend`, `go-backend`, etc.)
- **QA** (`/sw-testing:qa-engineer`) — test strategy and automation
- **Security** (`/sw:security`) — OWASP, threat modeling, secure code review
- **DevOps** (`/sw-backend:database-optimizer`) — performance, infrastructure
- **Code Review** (`/sw:code-review`) — parallel review with confidence scoring

Each skill can be customized independently. Your frontend preferences don't affect your backend patterns.

## You Don't Need to Learn Claude Code

SpecWeave abstracts Claude Code's complexity:

- **No hooks to configure** — skills handle it
- **No CLAUDE.md to write** — SpecWeave generates and manages it
- **No plugin system to understand** — skills auto-activate based on your project
- **No context management** — specs persist across sessions automatically

Install SpecWeave, describe your feature, and skills do the rest.

```bash
npm install -g specweave
specweave init .
/sw:increment "Add user authentication"  # Skills take over from here
```

## Extensibility: Open/Closed Principle

Skills follow SOLID's Open/Closed Principle:
- **Closed for modification** — don't edit SKILL.md files
- **Open for extension** — customize via `.specweave/skill-memories/*.md`

Your customizations override defaults. Original skills keep getting updates. No fork needed.

**[Learn more about extensible skills →](../guides/extensible-skills)**

**[Skill development guidelines →](../guides/skill-development-guidelines)**
