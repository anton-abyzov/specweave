---
sidebar_position: 100
title: Skill Development Guidelines
description: Design SpecWeave skills that users can extend without modification using SOLID principles.
---

# Skill Development Guidelines

**Design skills that users can extend without modification.**

When creating SpecWeave skills, follow the **Open/Closed Principle** (SOLID):

## Structure for Extension

**SKILL.md** (closed for modification)
```markdown
# Your Skill

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

See `.specweave/skill-memories/{skill-name}.md` for customizations.
```

`skill-memories/{skill-name}.md` (open for extension)
```markdown
### Component Preferences
- Use Material UI instead of Chakra
- Dark mode by default

### Custom Validation
When validating forms:
1. Check email domain against allowlist
2. Require 2FA for admin roles
```

## SOLID Principles for Skills

| Principle | Application |
|-----------|-------------|
| **Single Responsibility** | One skill = one domain (Frontend, Backend, Testing, etc.) |
| **Open/Closed** | Core logic in SKILL.md (closed), customizations in skill-memories (open) |
| **Liskov Substitution** | Customizations shouldn't break skill contracts (output format, interface) |
| **Interface Segregation** | Expose clear extension points, don't force users to override large blocks |
| **Dependency Inversion** | Depend on patterns/abstractions, let skill-memories provide concrete implementations |

## Design Patterns

**DO:**
- Expose clear extension points in SKILL.md
- Document what users can customize
- Provide examples in skill-memories templates
- Read skill-memories at runtime before executing logic
- Use conditional logic: "If skill-memories defines X, use X; else default behavior"

**DON'T:**
- Hard-code preferences that vary by project
- Make users fork SKILL.md to customize behavior
- Ignore skill-memories content
- Create monolithic skills that do everything

## Example: Extensible Frontend Skill

```markdown
# SKILL.md (core logic)

## Component Generation

**Default behavior:**
1. Use React functional components
2. TypeScript with Props interface
3. Export as default

**Extension points (check skill-memories/frontend.md):**
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

- **[Extensible Skills Standard](/docs/guides/extensible-skills)** — Full architecture of the Open/Closed Principle for skills
- **[Verified Skills Standard](/docs/skills/verified-skills)** — Security certification requirements for publishable skills
- **[Secure Skill Factory Standard](/docs/guides/secure-skill-factory-standard)** — Mandatory sections and forbidden patterns for SKILL.md files
