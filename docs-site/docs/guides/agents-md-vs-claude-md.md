---
title: "AGENTS.md vs CLAUDE.md: one instruction file for every coding agent"
description: "Which AI coding tools read AGENTS.md, CLAUDE.md, GEMINI.md and copilot-instructions.md, how to keep one file for all of them, and what belongs in it."
slug: /guides/agents-md-vs-claude-md
keywords: [agents.md vs claude.md, agents.md, claude.md, agents.md claude code, agents.md codex, agents.md best practices, copilot-instructions.md]
---

# AGENTS.md vs CLAUDE.md: one instruction file for every coding agent

Every AI coding tool reads a Markdown file of project instructions at the start of a session. The trouble is that they don't all read the same one. If you use more than one tool, you end up with copies that drift apart. This page shows which tool reads what, and how to keep a single file.

## Who reads what

| Tool | Reads | Notes |
|---|---|---|
| Codex (CLI, app and cloud) | `AGENTS.md` | Also reads `AGENTS.md` files in subfolders for those folders |
| Claude Code, including Projects threads | `CLAUDE.md` | Supports `@path` imports, so `@AGENTS.md` pulls the shared file in |
| Cursor | `AGENTS.md` | Also has its own rules folder |
| GitHub Copilot | `AGENTS.md`, `.github/copilot-instructions.md` | |
| Gemini CLI | `GEMINI.md` by default | Can be set to read `AGENTS.md` (below) |
| Grok Build | `AGENTS.md` and `CLAUDE.md` | |
| OpenCode | `AGENTS.md` | |

Tools add support quickly, so check each tool's docs if something doesn't load.

## Keep one file

Put everything shared in `AGENTS.md`. Make `CLAUDE.md` a one-line import, plus anything that only applies to Claude Code:

```markdown
@AGENTS.md

## Claude Code notes
- Use a subagent for wide searches in src/legacy/.
```

For Gemini CLI, add `AGENTS.md` to the context file names in `.gemini/settings.json`:

```json
{ "context": { "fileName": ["AGENTS.md", "GEMINI.md"] } }
```

Now every tool loads the same instructions, and you edit them in one place.

## Keep it short

The file is loaded into every session, before the agent reads a line of your code, so every sentence costs tokens on every run. Aim for something an agent can take in at a glance.

**Put in:**
- The build, test and lint commands, exactly as they run.
- Where things live, if the layout isn't obvious from the folder names.
- Rules the agent would otherwise get wrong, such as "PRs target develop" or "never edit generated files".
- How work is tracked, so a new session knows where to start.

**Leave out:**
- Anything the agent can learn by reading the code.
- Long explanations, history and style essays.
- Step-by-step procedures you use only sometimes. Put those in skills (`.claude/skills/`, `.agents/skills/`), which load only when needed. [Verified Skill](https://verified-skill.com/claude-code-skills) lists security-scanned ones you can install instead of writing your own.

SpecWeave 3.0 followed this rule on its own instructions. In 2.x, `CLAUDE.md` and `AGENTS.md` together came to about 3,300 tokens. In 3.0, `AGENTS.md` is about 760 tokens, and `CLAUDE.md` only imports it.

## AGENTS.md and switching tools

A shared instruction file is only half of switching between tools. The other half is the state of the work: what is done, what is next, and what you decided. SpecWeave keeps that in the repository too, as one `spec.md` per piece of work and an append-only ledger. Its `AGENTS.md` tells every agent to start with `specweave pickup`, so a session in any tool begins with the next task and its acceptance criteria.

```bash
npm install -g specweave
specweave init        # writes AGENTS.md, a CLAUDE.md that imports it, and skills for both folders
```

## See also

- [Claude Code vs Codex: use both](/docs/guides/claude-code-vs-codex)
- [Codex, Grok Build, Cursor and Gemini CLI](/docs/integrations/generic-ai-tools)
- [Handoff and pickup](/docs/guides/cross-tool-handoff)
