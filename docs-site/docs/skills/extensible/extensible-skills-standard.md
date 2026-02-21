---
title: "Extensible Skills Standard"
description: "Formal specification for extensibility categories (extensible, semi-extensible, not-extensible) and DCI blocks"
date: "2026-02-21"
authors: ["Anton Abyzov"]
tags: ["extensible-skills", "standard", "DCI", "skill-memories"]
---

# Extensible Skills Standard

**Version**: 4.0.0 | **Status**: Normative | **Authors**: Anton Abyzov

This document defines the formal standard for skill extensibility classification. It specifies category definitions, detection mechanisms, and the DCI specification.

For practical how-to guidance, see the [Implementation Guide](/docs/skills/extensible/extensible-skills-guide).

---

## 1. Extensibility Categories

Skills MUST be classified into one of three extensibility categories.

### Extensible

The skill has a working DCI block that loads customizations from the standard `skill-memories` system. Users can create a memory file and know exactly where to put it -- no skill-specific knowledge required.

**Requirements**:
- MUST contain at least one DCI block (`` !`...` ``) outside of fenced code blocks
- The DCI block MUST reference `skill-memories` for the standard cascading lookup

### Semi-Extensible

The skill mentions customization mechanisms (templates, hooks, configuration, plugins, context providers) in its prose, OR has a DCI block that does not use the standard skill-memories system. Users need skill-specific knowledge to customize behavior.

**Requirements** (any of):
- Contains one or more keyword patterns matching recognized extension types
- Contains a DCI block that does NOT reference `skill-memories`

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

## 2. Dynamic Context Injection (DCI)

### 2.1 Syntax

A DCI block is a line in `SKILL.md` that begins with `!` followed by a backtick-enclosed shell command:

```
!`<shell-command>`
```

The command MUST be a single line. The `!` prefix MUST appear at the start of the line (after optional whitespace).

### 2.2 Standard Skill-Memories Lookup

The canonical DCI one-liner for skill-memories lookup:

```
!`s="<skill-name>"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`
```

**Lookup priority** (first match wins, no merging):
1. `.specweave/skill-memories/<skill>.md` -- SpecWeave project level
2. `.claude/skill-memories/<skill>.md` -- Claude Code project level
3. `~/.claude/skill-memories/<skill>.md` -- User global level

### 2.3 Graceful Degradation

DCI commands MUST end with `2>/dev/null; true` to ensure:
- The skill loads normally if memory files do not exist
- Shell errors do not prevent skill execution
- No error output is shown to the user

### 2.4 Execution Model

DCI blocks are preprocessed by Claude Code before the skill content is interpreted. The shell output replaces the DCI line in the skill content. Only Claude Code (as of February 2026) executes DCI blocks; other agents treat them as plain text.

---

## 3. Detection Algorithm

The extensibility detector MUST check signals in the following order of strength (highest wins):

1. **Extensible**: DCI block with `skill-memories` reference
2. **Semi-extensible**: DCI block without `skill-memories`, OR keyword pattern matches
3. **Not extensible**: No signals detected

**Pre-processing**: Before scanning for DCI patterns, the detector MUST strip fenced code blocks (` ``` ... ``` `) to avoid false positives from documentation examples.

**Backward compatibility**: The `extensible: boolean` field MUST remain derived as `tier !== 'not-extensible'`, ensuring existing API consumers are unaffected.

---

## 4. Auto-Learning (Reflect)

The Reflect system (auto-learning from corrections) is an **optional feature orthogonal to extensibility classification**. A skill with DCI + skill-memories is `extensible` regardless of whether it also integrates auto-learning. Reflect enhances the user experience but does not change the extensibility category.

---

## 5. Conformance

A skill registry implementation conforms to this standard if it:

1. Classifies all registered skills into exactly one category (extensible, semi-extensible, not-extensible)
2. Implements the detection algorithm as specified in Section 3
3. Maintains backward compatibility with the `extensible: boolean` field
4. Provides category-level breakdown in aggregate statistics

---

## See Also

- **[Implementation Guide](/docs/skills/extensible/extensible-skills-guide)** -- Getting started, examples, FAQ
- **[Claude Skills Deep Dive](/docs/skills/extensible/claude-skills-deep-dive)** -- How skills work under the hood
- **[Self-Improving Skills](/docs/skills/extensible/self-improving-skills)** -- The Reflect auto-learning system
- **[Development Guidelines](/docs/skills/extensible/skill-development-guidelines)** -- SOLID principles for skill authoring

---

**License**: MIT
