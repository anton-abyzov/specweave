---
title: "AGENTS.md vs CLAUDE.md vs skills"
description: "AGENTS.md vs CLAUDE.md: which coding agents read each file, how to keep one instruction file for all of them, and what belongs in skills instead of either."
slug: /guides/agents-md-vs-claude-md
keywords: [agents.md vs claude.md, agents.md, claude.md, agents.md claude code, agents.md codex, agents.md best practices, copilot-instructions.md]
---

# AGENTS.md vs CLAUDE.md: one instruction file for every coding agent

Every AI coding tool reads a Markdown file of project instructions at the start of a session. The trouble is that they don't all read the same one. If you use more than one tool, you end up with copies that drift apart. This page shows which tool reads what, and how to keep a single file.

## Who reads what

| Tool | Reads | Notes | Source |
|---|---|---|---|
| Codex (CLI, app and cloud) | `AGENTS.md` | Also reads `AGENTS.override.md`, and `AGENTS.md` files in subfolders down to the working folder; stops adding files at 32 KiB by default | [Codex: AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) |
| Claude Code, including Projects threads | `CLAUDE.md` | Reads `AGENTS.md` directly only when there is no `CLAUDE.md` (v2.1.277 or later). `@path` imports work, so `@AGENTS.md` pulls the shared file in either way | [Claude Code: memory](https://code.claude.com/docs/en/memory) |
| Cursor | `AGENTS.md` | Root and subfolders, plus its own `.cursor/rules/*.mdc` rules | [Cursor: rules](https://cursor.com/docs/context/rules) |
| GitHub Copilot | `AGENTS.md`, `.github/copilot-instructions.md` | Or a single `CLAUDE.md` or `GEMINI.md` at the root | [GitHub Docs](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions) |
| Gemini CLI | `GEMINI.md` by default | Can be set to read `AGENTS.md` (below) | [Gemini CLI: GEMINI.md](https://geminicli.com/docs/cli/gemini-md/) |
| Grok Build | `AGENTS.md` and `CLAUDE.md` | Also `.grok/rules/`, `.claude/rules/` and `.cursor/rules/` | [Grok Build: project rules](https://docs.x.ai/build/features/project-rules) |
| OpenCode | `AGENTS.md` | Falls back to `CLAUDE.md` when there is no `AGENTS.md` | [OpenCode: rules](https://opencode.ai/docs/rules/) |

Sources checked 2026-10-28. Tools add support quickly, so check each tool's docs if something doesn't load.

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
- Step-by-step procedures you use only sometimes. Put those in skills (`.claude/skills/`, `.agents/skills/`), which load only when needed. [Verified Skill](https://verified-skill.com/) lets you find skills and inspect their scan evidence before installing.

SpecWeave 3.0 followed this rule on its own instructions. In 2.x, `CLAUDE.md` and `AGENTS.md` together came to about 3,300 tokens. In 3.0, `AGENTS.md` is about 760 tokens, and `CLAUDE.md` only imports it.

## What to put in CLAUDE.md

When `AGENTS.md` holds the shared rules, `CLAUDE.md` needs very little: the `@AGENTS.md` import and whatever applies only to Claude Code. Anthropic's guidance for the file itself, from [How Claude remembers your project](https://code.claude.com/docs/en/memory) (checked 2026-10-28):

- Facts Claude should hold in every session: build commands, conventions, project layout and "always do X" rules.
- Instructions concrete enough to check, such as "Run `npm test` before committing" rather than "Test your changes".
- A target of under 200 lines per file. Imports organise a long file but do not shrink it, because imported files load with it.
- Things you would otherwise re-explain: a mistake Claude made twice, or a correction you typed in the last session.

Multi-step procedures, and rules for only one part of the codebase, belong in a skill or a path-scoped rule in `.claude/rules/` instead. A personal, uncommitted `CLAUDE.local.md` also counts as a `CLAUDE.md`, so in a repository that relies on Claude Code reading `AGENTS.md` directly, adding one stops that unless you change the **Project instructions** setting (same source).

## AGENTS.md vs skills (SKILL.md)

`AGENTS.md` and `CLAUDE.md` load in full at the start of every session. A skill is a folder with a `SKILL.md` file whose `name` and `description` load at startup, while the body loads only when the agent decides the skill fits the task ([Agent Skills specification](https://agentskills.io/specification), checked 2026-10-28). Claude Code's docs put it the same way: a skill's body "loads only when it's used" ([Claude Code: skills](https://code.claude.com/docs/en/skills), checked 2026-10-28).

| | `AGENTS.md` / `CLAUDE.md` | Skill (`SKILL.md`) |
|---|---|---|
| Loaded | Every session, in full | Name and description always; body on demand |
| Good for | Commands, layout, rules that always apply | Procedures, checklists, long reference material |
| Where | Repository root and subfolders | `.claude/skills/`, `.agents/skills/` and each tool's own folder |
| Cost of a long file | Paid on every run | Paid only when used |

Where each tool looks for skills: Claude Code reads `.claude/skills/`; Cursor reads `.agents/skills/`, `.cursor/skills/` and, for compatibility, `.claude/skills/` and `.codex/skills/` ([Cursor: skills](https://cursor.com/docs/context/skills)); OpenCode reads `.opencode/skills/`, `.claude/skills/` and `.agents/skills/` ([OpenCode: skills](https://opencode.ai/docs/skills/)). Sources checked 2026-10-28. SpecWeave installs its skills in both `.claude/skills/` and `.agents/skills/`, so the same skills reach each of them. The [skills overview](/docs/skills/) covers how SpecWeave extends skills and how Verified Skill scans them.

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
- [Agent skills: extensible and verified](/docs/skills/)
- [Switch from Claude Code to Cursor](/docs/guides/switch-claude-code-to-cursor/)
- [Switch from Claude Code to OpenCode](/docs/guides/switch-claude-code-to-opencode/)
