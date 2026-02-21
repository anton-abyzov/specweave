---
title: "Extensible Skills Implementation Guide"
description: "Practical guide for making skills extensible using Dynamic Context Injection, skill memories, and the Open/Closed Principle"
date: "2026-02-21"
authors: ["Anton Abyzov"]
tags: ["extensible-skills", "implementation", "skill-memories", "DCI", "getting-started"]
---

# Extensible Skills Implementation Guide

**Making AI tools transparent, customizable, and extensible**

For formal category definitions and the detection specification, see the [Extensible Skills Standard](/docs/skills/extensible/extensible-skills-standard).

---

## A Pattern You Already Know

If you've used Kustomize, Helm, or OPA Gatekeeper, you already understand Extensible Skills. The same pattern -- stable core + injected customization -- has been battle-tested across the Kubernetes ecosystem for years:

| Infrastructure | AI Skills |
|---|---|
| Kustomize `base/` manifests | `SKILL.md` (core logic) |
| Kustomize `overlays/` patches | `skill-memories/*.md` (your rules) |
| `kustomize build` composes both | Claude runtime composes both |
| You never fork the base | You never fork the skill |

SpecWeave didn't invent this pattern -- we applied it to AI.

---

## Architecture

```
+--------------------+     +-----------------------+
|    SKILL.md        |  +  | skill-memories/       |
|  (Core Logic)      |     | (Your Extensions)     |
|                    |     |                       |
|  CLOSED            |     |    OPEN               |
|  - Stable          |     |  - Your rules         |
|  - Tested          |     |  - Your preferences   |
|  - Predictable     |     |  - Custom logic       |
+--------------------+     +-----------------------+
         |                         |
         +----------+--------------+
                    |
         +-----------------------+
         |  Claude reads both    |
         |  = Customized AI      |
         +-----------------------+
```

### Cascading Lookup (3-Tier Priority)

Skills self-load their memories using **Dynamic Context Injection** (DCI) -- a shell command preprocessed before Claude sees the skill content. The lookup cascades through three directories, **first match wins** (no merging):

```
Priority 1: .specweave/skill-memories/{skill}.md  <- SpecWeave project level
Priority 2: .claude/skill-memories/{skill}.md      <- Claude Code project level
Priority 3: ~/.claude/skill-memories/{skill}.md    <- User global level
```

**How it works**: Each `SKILL.md` contains a DCI one-liner that reads the `## Learnings` section from the first matching memory file:

```markdown
## Project Overrides
!`s="my-skill"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`
```

**Key properties**:
- **No SpecWeave required** -- the `.claude/` path works for any Claude Code user
- **Project overrides global** -- project-level memories take priority over `~/.claude/`
- **Graceful degradation** -- if no memory files exist, nothing is injected
- **Cross-platform** -- uses `awk` (POSIX standard), works on macOS, Linux, WSL

### Auto-Learning (Reflect System)

Auto-learning via the Reflect system is an **optional feature orthogonal to extensibility classification**. When enabled, SpecWeave automatically captures corrections and saves them to skill memory files:

```
You correct Claude -> Reflect detects signal -> Extracts learning ->
Categorizes by skill -> Saves to skill-memories/ -> Applied next session
```

---

## Real-World Example

**Scenario**: React app with React Hook Form + Zod + Tailwind CSS.

**First interaction** -- Claude generates a form with `useState` and inline styles (defaults).

**You correct it**: "Use React Hook Form with Zod validation, never use inline styles."

**SpecWeave saves** to `.claude/skill-memories/frontend.md`:

```markdown
# Frontend Memory

## Learnings

- **2026-02-13**: Use React Hook Form for all forms, combine with Zod validation
- **2026-02-13**: Use Tailwind CSS utility classes, never use inline styles
- **2026-02-13**: Import components from @/components/ui design system
```

**Next session** -- Claude automatically generates forms with React Hook Form + Zod + Tailwind. No reminder needed.

---

## Getting Started

### For Any Claude Code User (No SpecWeave)

1. Create a skill memory file in your project:

```bash
mkdir -p .claude/skill-memories
```

2. Add your skill's `SKILL.md` with the DCI one-liner (see Architecture section above).

3. Create a memory file:

```bash
cat > .claude/skill-memories/my-skill.md << 'EOF'
# My Skill Memory

## Learnings

- Use TypeScript strict mode
- Prefer functional components
- Import from @/components/ui design system
EOF
```

4. The skill now loads these overrides automatically when invoked.

### For SpecWeave Users

1. Install and init:

```bash
npm install -g specweave
specweave init .
```

2. All SpecWeave skills already have DCI blocks -- just create memory files:

```bash
cat > .specweave/skill-memories/frontend.md << 'EOF'
# Frontend Memory

## Learnings

- Use React Hook Form + Zod for all forms
- Use Tailwind CSS, never inline styles
EOF
```

3. Enable auto-learning for automatic capture:

```json
// .specweave/config.json
{
  "reflect": { "enabled": true }
}
```

4. Share with your team via Git:

```bash
git add .claude/skill-memories/ .specweave/skill-memories/
git commit -m "add team skill customizations"
git push
```

---

## Extensibility Categories at a Glance

| Category | Meaning | How to Achieve |
|---|---|---|
| **Extensible** | DCI block with skill-memories. Standard, discoverable customization. | Add the DCI one-liner referencing `skill-memories` |
| **Semi-Extensible** | Mentions customization but not through the standard system. | Mention extension points in prose |
| **Not Extensible** | No customization mechanism. Fork to change. | Default -- no action needed |

For formal category definitions and the detection algorithm, see the [Extensible Skills Standard](/docs/skills/extensible/extensible-skills-standard).

---

## Skill Memory Format

Memory files are structured Markdown:

```markdown
# {Skill Name} Memory

## Learnings

- **2026-02-13**: Your project-specific rule or preference
- **2026-02-13**: Another rule Claude should follow

## Other Section (ignored by DCI)

Notes, history, etc. -- only ## Learnings is injected.
```

The DCI one-liner extracts **only** the content between `## Learnings` and the next `##` heading (or end of file).

---

## Beyond Memories: Project Context

DCI blocks aren't limited to skill memories -- they can load **any shell command output**. SpecWeave uses this to give skills awareness of the project environment.

### How It Works

Skills can have multiple DCI blocks. The first loads memories (user corrections), the second loads project context (config, tech stack, active increment):

```markdown
## Project Overrides
!`s="my-skill"; for d in ... done 2>/dev/null; true`

## Project Context
!`.specweave/scripts/skill-context.sh my-skill 2>/dev/null; true`
```

The context script reads `.specweave/config.json`, detects tech stack from filesystem markers, and finds the active increment.

### Creating Custom Context Loaders

You can create your own context scripts. Any executable that outputs text works:

```bash
## My Custom Context
!`./scripts/my-context.sh 2>/dev/null; true`
```

The `2>/dev/null; true` suffix ensures graceful degradation -- if the script doesn't exist or fails, the skill still loads normally.

---

## FAQ

### Q: How do I make my skill extensible?

Add this block to your `SKILL.md`, right after the title -- change only the `s=` value to your skill's name:

```markdown
## Project Overrides
!`s="my-skill"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`
```

This makes your skill **extensible** (the highest category).

### Q: Can I add my own DCI blocks?

Yes. Any `` !`command` `` line in a `SKILL.md` is executed by Claude Code before loading the skill. You can add multiple DCI blocks -- each one is an independent "sensor" that injects context. Always add `2>/dev/null; true` at the end for graceful degradation.

### Q: What if I make a wrong correction?

Skill memories are plain Markdown in Git. Roll back:

```bash
git log .claude/skill-memories/frontend.md
git checkout <commit> -- .claude/skill-memories/frontend.md
```

### Q: Can I customize any skill?

Yes -- any skill with a DCI block. All SpecWeave skills have it built-in. For third-party skills, add the DCI one-liner to their `SKILL.md`.

### Q: What if two rules conflict?

More specific rules take precedence. Project-level (`.specweave/` or `.claude/`) overrides global (`~/.claude/`). Within a file, Claude interprets the most specific instruction.

### Q: Does this work without SpecWeave?

Yes. The `.claude/skill-memories/` and `~/.claude/skill-memories/` paths work with plain Claude Code. SpecWeave adds `.specweave/skill-memories/` as the highest-priority tier plus auto-learning via the Reflect system.

---

## See Also

- **[Extensible Skills Standard](/docs/skills/extensible/extensible-skills-standard)** -- Formal category definitions, DCI specification
- **[Skills Overview](/docs/skills/)** -- Both skill standards at a glance
- **[Verified Skills Standard](/docs/skills/verified/verified-skills)** -- How skills earn trust through 3-tier security certification
- **[Skill Development Guidelines](/docs/skills/extensible/skill-development-guidelines)** -- SOLID principles applied to skill authoring
- **[Self-Improving Skills](/docs/skills/extensible/self-improving-skills)** -- How the Reflect system auto-learns corrections

---

## Resources

- **Documentation**: https://spec-weave.com
- **GitHub**: https://github.com/specweave/specweave
- **Discord**: https://discord.gg/UYg4BGJ65V
- **Twitter**: [@aabyzov](https://x.com/aabyzov)

---

**Version**: 4.0.0
**Authors**: Anton Abyzov
**License**: MIT
