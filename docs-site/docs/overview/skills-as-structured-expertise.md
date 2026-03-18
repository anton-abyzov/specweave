---
sidebar_position: 2
title: "Skills Are Structured Expertise"
description: "A skill is a SKILL.md file with instructions — Claude adds it to its toolkit and uses it when relevant, or you invoke it with /skill-name."
---

# Skills Are Structured Expertise

Most AI coding tools give you prompts. SpecWeave gives you **structured expertise**.

**A skill is a `SKILL.md` file with instructions — Claude adds it to its toolkit, uses it automatically when relevant, or you invoke it directly with `/skill-name`.** Each skill packages domain knowledge: patterns, rules, and examples that make AI produce consistent, production-grade output instead of generic guesses. It runs the same way every time — but you can customize it without touching the source.

## What Makes a Skill Different from a Prompt?

| | Prompt | SpecWeave Skill |
|---|---|---|
| **Reusable** | Copy-paste across sessions | Invoke by name: `/sw:grill` |
| **Extensible** | Edit the original text | Defined in `SKILL.md` — override via `skill-memories/` without touching the source |
| **Composable** | Manual chaining | Skills invoke other skills: PM → Architect → Frontend |
| **Stateful** | Forgets everything | Learns from corrections permanently |
| **Testable** | "Did it work?" | Quality gates verify output automatically |

## The Power: You Shape AI Behavior

Instead of writing this every session:

```
"When generating React components, always use React Hook Form with Zod
validation, Tailwind for styling, import from @/components/ui, and
write Vitest tests with Testing Library..."
```

You write it **once** in a `SKILL.md` file — the skill definition itself:

```markdown
# SKILL.md

---
name: frontend-design
description: Create production-grade frontend interfaces
triggers:
  - build web component
  - create page
  - design UI
---

## Rules

### Form Handling
- Use React Hook Form for all forms
- Combine with Zod for validation schemas
- Never use plain useState for form state

### Styling
- Tailwind utilities only, no inline styles
- Import from @/components/ui design system
```

Next session, next agent, next month — the AI already knows your patterns.

Want to customize a skill **without editing the original**? Use skill memories — they override defaults while the core skill keeps getting updates:

```markdown
# .specweave/skill-memories/frontend.md

### Styling Override
- Use CSS Modules instead of Tailwind
- Import from @/styles design tokens
```

## 44 Core Skills Cover the Full Lifecycle

SpecWeave ships with 44 core skills for planning, execution, quality, and sync:

- **PM** (`/sw:pm`) — writes user stories with acceptance criteria
- **Architect** (`/sw:architect`) — designs systems, writes ADRs
- **Code Review** (`/sw:code-reviewer`) — parallel multi-agent review with confidence scoring
- **Testing** (`/sw:e2e`, `/sw:tdd-cycle`) — E2E automation, TDD red-green-refactor
- **Quality** (`/sw:grill`, `/sw:judge-llm`) — critical code review and LLM-as-Judge validation
- **Debug** (`/sw:debug`) — systematic 4-phase debugging with escalation
- **Team Lead** (`/sw:team-lead`) — parallel multi-agent orchestration
- **Release** (`/sw:release-expert`, `/sw:npm`) — multi-repo release coordination

Need domain-specific skills like frontend frameworks, backend languages, or security? Install them from the [vskill marketplace](https://verified-skill.com) — they plug into SpecWeave's core workflow without modification.

Each skill can be customized independently. Your frontend preferences don't affect your backend patterns.

## Zero Learning Curve

Skills package expertise so you can focus on what to build, not how to configure your tools:

- **No workflow setup** — skills handle planning, architecture, and testing automatically
- **No context management** — specs persist across sessions in version-controlled files
- **No manual documentation** — living docs generate and stay current as you build
- **No tool configuration** — skills auto-activate based on your project's tech stack

Install SpecWeave, describe your feature, and skills do the rest.

```bash
npm install -g specweave
specweave init .
/sw:increment "Add user authentication"  # Skills take over from here
```

## Extensibility: Stable Core, Customizable Extensions

Skills follow a stable core with customizable extensions:
- **Stable core** — don't edit SKILL.md files; they keep getting updates
- **Your extensions** — customize via `.specweave/skill-memories/*.md`

Your customizations override defaults. Original skills keep getting updates. No fork needed.

**[Learn more about extensible skills →](../skills/extensible/extensible-skills)**

**[Skill development guidelines →](../skills/extensible/skill-development-guidelines)**
