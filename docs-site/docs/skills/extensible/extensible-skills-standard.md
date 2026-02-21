---
title: "Extensible Skills Standard"
description: "Formal specification for extensibility tiers (E0-E4), DCI blocks, frontmatter schema, and agent portability matrix"
date: "2026-02-21"
authors: ["Anton Abyzov"]
tags: ["extensible-skills", "standard", "E0-E4", "DCI", "portability"]
---

# Extensible Skills Standard

**Version**: 3.0.0 | **Status**: Normative | **Authors**: Anton Abyzov

This document defines the formal standard for skill extensibility classification. It specifies tier definitions, detection mechanisms, frontmatter schema, and the agent portability matrix.

For practical how-to guidance, see the [Implementation Guide](/docs/skills/extensible/extensible-skills-guide).

---

## 1. Extensibility Tier Model

Skills MUST be classified into one of five extensibility tiers (E0-E4). Each tier represents a progressively stronger extensibility mechanism.

### E0 -- Not Extensible

The skill has no detected extension points. Users MUST fork `SKILL.md` to customize behavior.

**Requirements**: None (default classification).

### E1 -- Declarative (Keyword-Detected)

The skill's prose mentions extension points (templates, hooks, configuration overrides, plugins, or context providers) but provides no verified mechanism for customization.

**Requirements**:
- MUST contain one or more keyword patterns matching recognized extension types
- MAY describe how users can customize behavior in documentation
- SHOULD NOT be assumed to have a working customization mechanism

**Keyword signals** (any match classifies as E1):
- **template**: "custom templates", "override templates", "template customization"
- **hook**: "lifecycle hooks", "pre-commit/build/deploy hooks", "custom hooks"
- **config**: "configuration overrides", "custom configuration", "settings file"
- **plugin**: "plugin support", "custom plugins", "extend functionality"
- **context**: "context providers", "custom context", "context definitions"

### E2 -- Frontmatter-Declared

The skill's YAML frontmatter contains a structured `extensibility:` declaration. This is a formal statement by the skill author that the skill supports extension.

**Requirements**:
- MUST include an `extensibility:` key in YAML frontmatter (between `---` delimiters)
- SHOULD specify the tier and extension point types
- The frontmatter schema is defined in Section 3

### E3 -- DCI-Verified

The skill contains a working Dynamic Context Injection (DCI) shell block that loads customizations at runtime.

**Requirements**:
- MUST contain at least one DCI block (`` !`...` ``) outside of fenced code blocks
- The DCI block SHOULD reference `skill-memories` for the standard cascading lookup
- DCI blocks MUST NOT appear inside triple-backtick fenced code blocks (those are documentation examples, not executable)

### E4 -- DCI + Auto-Learning

The skill has DCI-based extensibility plus evidence of automated learning integration (the Reflect system or equivalent auto-learn mechanism).

**Requirements**:
- MUST satisfy all E3 requirements
- MUST contain a `skill-memories` reference in its DCI block
- MUST reference `reflect` or `auto-learn` in its content, indicating automated correction capture

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

## 3. Frontmatter Schema

Skills declaring E2+ extensibility SHOULD include an `extensibility:` key in their YAML frontmatter:

```yaml
---
extensibility:
  tier: "E2"
  points:
    - template
    - config
  description: "Supports custom templates and configuration overrides"
---
```

**Fields**:
- `tier` (string, OPTIONAL): The declared extensibility tier. If omitted, the detector classifies based on signals.
- `points` (string[], OPTIONAL): Extension point types.
- `description` (string, OPTIONAL): Human-readable extensibility summary.

---

## 4. Agent Portability Matrix

Extensibility mechanisms have varying levels of support across AI agents:

| Mechanism | Compatible Agents | Notes |
|---|---|---|
| **DCI** (shell blocks) | Claude Code | Only agent that executes `!` backtick commands in SKILL.md |
| **Frontmatter** (YAML) | Claude Code, Cursor, GitHub Copilot, Windsurf, Aider | Any agent that reads YAML frontmatter from skill files |
| **Keywords** (prose) | All agents (*) | Informational only; any agent can read prose descriptions |

**Implications for skill authors**:
- Skills targeting maximum portability SHOULD use frontmatter declarations (E2)
- Skills using DCI (E3/E4) SHOULD document that DCI blocks are Claude Code-specific
- Skills MAY include both DCI and frontmatter for layered portability

---

## 5. Detection Algorithm

The extensibility detector MUST check signals in the following order of strength (highest wins):

1. **E4**: DCI block with `skill-memories` reference + `reflect` or `auto-learn` reference
2. **E3**: DCI block present (with or without `skill-memories`)
3. **E2**: YAML frontmatter contains `extensibility:` key
4. **E1**: Keyword pattern matches from the SIGNALS list
5. **E0**: No signals detected

**Pre-processing**: Before scanning for DCI patterns, the detector MUST strip fenced code blocks (` ``` ... ``` `) to avoid false positives from documentation examples.

**Backward compatibility**: The `extensible: boolean` field MUST remain derived as `tier !== 'E0'`, ensuring existing API consumers are unaffected.

---

## 6. Conformance

A skill registry implementation conforms to this standard if it:

1. Classifies all registered skills into exactly one tier (E0-E4)
2. Implements the detection algorithm as specified in Section 5
3. Maintains backward compatibility with the `extensible: boolean` field
4. Reports portability information for extensible skills (E1+)
5. Provides tier-level breakdown in aggregate statistics

---

## See Also

- **[Implementation Guide](/docs/skills/extensible/extensible-skills-guide)** -- Getting started, examples, FAQ
- **[Claude Skills Deep Dive](/docs/skills/extensible/claude-skills-deep-dive)** -- How skills work under the hood
- **[Self-Improving Skills](/docs/skills/extensible/self-improving-skills)** -- The Reflect auto-learning system
- **[Development Guidelines](/docs/skills/extensible/skill-development-guidelines)** -- SOLID principles for skill authoring

---

**License**: MIT
