---
title: "Extensible Skills Specification"
description: "Formal specification for extensibility categories (extensible, semi-extensible, not-extensible) and context injection blocks"
date: "2026-02-21"
authors: ["Anton Abyzov"]
tags: ["extensible-skills", "specification", "dynamic-context-injection", "skill-memories"]
---

# Extensible Skills Specification

**Version**: 5.0.0 | **Status**: Normative | **Authors**: Anton Abyzov

Built on Claude Code's native skill system, this document defines the formal specification for skill extensibility classification. It specifies category definitions, detection mechanisms, and the context injection specification.

For practical how-to guidance, see the [Implementation Guide](/docs/skills/extensible/extensible-skills-guide).

---

## 1. Extensibility Categories

Skills MUST be classified into one of three extensibility categories.

### Extensible

The skill loads customizations from the standard `skill-memories` system via an instruction-based loading block. Users can create a memory file and know exactly where to put it -- no skill-specific knowledge required.

**Requirements**:
- MUST contain an instruction-based skill-memories loading block (see Section 2.2)
- The loading block MUST reference `.specweave/skill-memories/` for the standard lookup path

### Semi-Extensible

The skill mentions customization mechanisms (templates, hooks, configuration, plugins, context providers) in its prose, OR has a context injection block that does not use the standard skill-memories system. Users need skill-specific knowledge to customize behavior.

**Requirements** (any of):
- Contains one or more keyword patterns matching recognized extension types
- Contains a context injection block that does NOT reference `skill-memories`

**Keyword signals** (any match classifies as semi-extensible):
- **template**: "custom templates", "override templates", "template customization"
- **hook**: "lifecycle hooks", "pre-commit/build/deploy hooks", "custom hooks"
- **config**: "configuration overrides", "custom configuration", "settings file"
- **plugin**: "plugin support", "custom plugins", "extend functionality"
- **context**: "context providers", "custom context", "context definitions"

### Not Extensible

The skill has no detected extension points. Users MUST fork `SKILL.md` to customize behavior.

**Requirements**: None (default classification).

---

## 2. Context Injection

### 2.1 Dynamic Context Injection (DCI) Syntax

A DCI block is a line in `SKILL.md` that begins with `!` followed by a backtick-enclosed shell command:

```
!`<shell-command>`
```

The command MUST be a single line. The `!` prefix MUST appear at the start of the line (after optional whitespace).

DCI remains valid for use cases that require shell execution, such as loading dynamic context from scripts, fetching PR diffs, or running `skill-context.sh`. However, **skill-memories loading no longer uses DCI** -- see Section 2.2.

### 2.2 Instruction-Based Skill-Memories Loading

As of v5.0.0, skill-memories use plain LLM instructions instead of shell-based DCI. This is cross-platform (no shell dependency) and requires no `awk` extraction or error guards.

The canonical skill-memories loading instruction:

```
**Skill Memories**: If `.specweave/skill-memories/<skill-name>.md` exists, read and apply its learnings.
```

**Lookup path**: `.specweave/skill-memories/<skill>.md` (project level).

The previous cascading lookup (`.specweave/` -> `.claude/` -> `~/.claude/`) has been simplified to a single project-level path. The `.claude/` and `~/.claude/` paths were rarely used in practice.

**Advantages over the previous DCI approach**:
- Cross-platform -- no shell, `awk`, or Unix dependency
- No `2>/dev/null; true` guard needed -- the LLM handles missing files gracefully
- No `awk` section extraction -- the LLM reads the full file and applies relevant learnings
- Simpler to author and maintain

:::info Legacy Format (Deprecated)
The previous shell-based one-liner is **deprecated** but still functional if encountered in older skills:

```
!`s="<skill-name>"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`
```

Skills using this format SHOULD be migrated to the instruction-based approach.
:::

### 2.3 DCI Graceful Degradation

DCI commands (for non-skill-memories use cases) MUST end with `2>/dev/null; true` to ensure:
- The skill loads normally if the referenced files or scripts do not exist
- Shell errors do not prevent skill execution
- No error output is shown to the user

This requirement does NOT apply to instruction-based skill-memories loading (Section 2.2), which has no shell execution.

### 2.4 DCI Execution Model

DCI blocks are preprocessed by Claude Code before the skill content is interpreted. The shell output replaces the injection line in the skill content. Only Claude Code (as of February 2026) executes DCI blocks; other agents treat them as plain text.

Instruction-based skill-memories loading (Section 2.2) works across all LLM agents, since it uses standard file-reading instructions rather than shell execution.

---

## 3. Detection Algorithm

The extensibility detector MUST check signals in the following order of strength (highest wins):

1. **Extensible**: Instruction-based skill-memories loading block (e.g., `**Skill Memories**: If .specweave/skill-memories/...`), OR legacy DCI block with `skill-memories` reference
2. **Semi-extensible**: DCI block without `skill-memories`, OR keyword pattern matches
3. **Not extensible**: No signals detected

**Pre-processing**: Before scanning for patterns, the detector MUST strip fenced code blocks (` ``` ... ``` `) and admonition blocks (`:::info ... :::`) to avoid false positives from documentation examples and deprecated format references.

**Backward compatibility**: The `extensible: boolean` field MUST remain derived as `tier !== 'not-extensible'`, ensuring existing API consumers are unaffected.

---

## 4. Auto-Learning (Reflect)

The Reflect system (auto-learning from corrections) is an **optional feature orthogonal to extensibility classification**. A skill with instruction-based skill-memories loading is `extensible` regardless of whether it also integrates auto-learning. Reflect enhances the user experience but does not change the extensibility category.

---

## 5. Conformance

A skill registry implementation conforms to this specification if it:

1. Classifies all registered skills into exactly one category (extensible, semi-extensible, not-extensible)
2. Implements the detection algorithm as specified in Section 3
3. Maintains backward compatibility with the `extensible: boolean` field
4. Provides category-level breakdown in aggregate statistics

---

## See Also

- **[Implementation Guide](/docs/skills/extensible/extensible-skills-guide)** -- Getting started, examples, FAQ
- **[Claude Skills Deep Dive](/docs/skills/extensible/claude-skills-deep-dive)** -- How skills work under the hood
- **[Self-Improving Skills](/docs/skills/extensible/self-improving-skills)** -- The Reflect auto-learning system
- **[Development Guidelines](/docs/skills/extensible/skill-development-guidelines)** -- Best practices for skill authoring

---

**License**: MIT
