---
title: Installation
description: Install the SpecWeave CLI, initialize a project for Claude Code, Codex and other tools, upgrade from 2.x, and fix common install problems.
---

# Installation

## Requirements

- Node.js 20.12 or later (`node --version`)
- Git
- At least one coding agent: Claude Code, Codex, Grok Build, Cursor, GitHub Copilot, Gemini CLI, OpenCode, or anything that reads `AGENTS.md`

## Install the CLI

```bash
npm install -g specweave
specweave --version
```

`pnpm add -g specweave`, `bun add -g specweave` and `yarn global add specweave` work too. To try it without a global install, prefix commands with `npx`: `npx specweave init`.

## Initialize a project

From the root of your repository:

```bash
cd your-project
specweave init
```

`specweave init --quick` skips the questions and uses defaults. `init` writes:

| File | What it is |
|---|---|
| `AGENTS.md` | The instruction file every tool reads: the loop, the rules, your build and test commands |
| `CLAUDE.md` | Imports `AGENTS.md` with `@AGENTS.md`, plus Claude-only notes |
| `.specweave/config.json` | Project settings |
| `.specweave/memory/MEMORY.md` | The index of project memory: one line per decision that must outlive a session |
| `.claude/skills/sw-*` | The eleven SpecWeave skills for Claude Code, including cloud Projects threads |
| `.agents/skills/sw-*` | The same skills for Codex and other tools that read `.agents/skills/` |

It also adds a few lines to `.gitignore` and `.gitattributes` (the ledger merges with `merge=union`), and writes a `README.md` only if you have none. Nothing outside the project is touched, and there is no git hook unless you ask for one with `--git-hooks`.

Commit these files. Everything SpecWeave keeps is meant to be in git, because git is what every tool and every account shares.

After init, open `AGENTS.md` and check the Commands table. If a cell says TODO, fill in your real build, test and lint commands: `specweave verify` runs those rows.

## Existing codebases

Run `init` in the existing repository the same way. It does not touch your code. Start with one small increment for the next change you were going to make anyway; see [Existing codebases](/docs/workflows/brownfield).

For several repositories under one umbrella folder, add them with `specweave get`:

```bash
specweave get owner/repo
specweave get "my-org/*" --pattern "service-*"
```

## Using a second tool or account

Nothing extra to install per tool beyond the CLI on that machine. A cloud session (a Claude Code Projects thread, a Codex cloud task) reads `AGENTS.md` and the committed skills from the repository. On another machine, install the CLI and run `specweave pickup` in the clone. See [Handoff and pickup](/docs/guides/cross-tool-handoff).

## Upgrade from 2.x

```bash
npm install -g specweave@latest
cd your-project
specweave update
```

`specweave update` updates the CLI, rewrites the managed sections of `AGENTS.md` and `CLAUDE.md` into the 3.0 form while keeping your own sections, and refreshes the plugins. Use `specweave update --check` to see what would change first. Open increments keep their `tasks.md`; new ones are a single `spec.md`. [What changed in 3.0](/docs/guides/specweave-3) lists the removed commands.

## Check the installation

```bash
specweave doctor
```

`doctor` checks the project structure, configuration, plugins and hooks. `specweave doctor --fix` repairs what it safely can.

## Uninstall

```bash
specweave uninstall --dry-run    # see what would be removed
specweave uninstall --keep-data  # remove SpecWeave, archive .specweave/
npm uninstall -g specweave
```

Your application code is never touched.

## Troubleshooting the install

**`specweave: command not found` after switching Node versions with nvm.** Global packages belong to one Node version. Reinstall under the new one, or migrate them when installing: `nvm install 22 --reinstall-packages-from=current`.

**Permission denied on a global install.** Point npm at a folder you own:

```bash
mkdir -p ~/.npm-global
npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc   # or ~/.bashrc
```

**Skills not showing in Claude Code.** Restart Claude Code, then run `specweave refresh-plugins`. In a Projects thread, check that `.claude/skills/` is committed.

**Windows.** Use PowerShell or WSL. Inside WSL, install Node and SpecWeave in the Linux side, not the Windows side.

More in [Troubleshooting](/docs/guides/troubleshooting).
