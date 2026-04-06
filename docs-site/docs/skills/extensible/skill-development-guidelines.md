---
sidebar_position: 100
title: Skill Development Guidelines
description: Design SpecWeave skills that users can extend without modification.
---

# Skill Development Guidelines

**Design skills that users can extend without modification.**

When creating SpecWeave skills, keep core logic stable while making customization easy:

## Structure for Extension

**SKILL.md** (stable core logic)
```markdown
# Your Skill

**Skill Memories**: If `.specweave/skill-memories/{skill-name}.md` exists, read and apply its learnings.

## Core Behavior
1. Always do X
2. Check for Y
3. Output Z format

## Extension Points
Users can customize:
- Component preferences
- Validation rules
- Output formatting
- Error handling
```

`skill-memories/{skill-name}.md` (user customizations)
```markdown
### Component Preferences
- Use Material UI instead of Chakra
- Dark mode by default

### Custom Validation
When validating forms:
1. Check email domain against allowlist
2. Require 2FA for admin roles
```

## Design Principles for Skills

| Principle | Application |
|-----------|-------------|
| **Single Responsibility** | One skill = one domain (Frontend, Backend, Testing, etc.) |
| **Stable Core, Extensible Surface** | Core logic in SKILL.md (stable), customizations in skill-memories (extensible) |
| **Contract Preservation** | Customizations shouldn't break skill contracts (output format, interface) |
| **Targeted Extension Points** | Expose clear extension points, don't force users to override large blocks |
| **Abstractions Over Specifics** | Depend on patterns/abstractions, let skill-memories provide concrete implementations |

## Design Patterns

**DO:**
- Expose clear extension points in SKILL.md
- Document what users can customize
- Provide examples in skill-memories templates
- Include an instruction-based loading line in SKILL.md (see pattern below)
- Use conditional logic: "If skill-memories defines X, use X; else default behavior"

**Recommended pattern** for loading skill memories (instruction-based, cross-platform):
```markdown
**Skill Memories**: If `.specweave/skill-memories/{skill-name}.md` exists, read and apply its learnings.
```

This replaces the previous shell-based DCI approach (`!`backtick commands``) for skill memories. The instruction-based pattern works on all platforms without requiring shell execution.

**DON'T:**
- Hard-code preferences that vary by project
- Make users fork SKILL.md to customize behavior
- Ignore skill-memories content
- Create monolithic skills that do everything

## Example: Extensible Frontend Skill

```markdown
# SKILL.md (core logic)

**Skill Memories**: If `.specweave/skill-memories/frontend.md` exists, read and apply its learnings.

## Component Generation

**Default behavior:**
1. Use React functional components
2. TypeScript with Props interface
3. Export as default

**Extension points (customizable via skill-memories/frontend.md):**
- component.framework (React | Vue | Angular)
- component.exportStyle (default | named)
- component.testFramework (Vitest | Jest | Testing Library)
- styling.approach (Tailwind | CSS Modules | Styled Components)
```

## Testing Your Skill's Extensibility

1. **Write SKILL.md** with default behavior
2. **Create skill-memories template** showing extension points
3. **Test with customizations** — does the skill respect user preferences?
4. **Document limitations** — what CAN'T be customized?

**Good skill design = Users extend your logic without ever touching your source.**

---

## See Also

- **[Extensible Skills](/docs/skills/extensible/extensible-skills)** — Full architecture of the extensibility model for skills
- **[Verified Skills Standard](/docs/skills/verified/verified-skills)** — Security certification requirements for publishable skills
- **[Secure Skill Factory Standard](/docs/skills/verified/secure-skill-factory-standard)** — Mandatory sections and forbidden patterns for SKILL.md files
