---
sidebar_position: 3
title: SpecWeave CLI skills reference
description: The seven core and four optional SpecWeave skills, how to turn optional ones on, how to run each skill in Claude Code, Codex, the SpecWithCode app and other tools, the plain words that trigger them, and the standards their files follow.
---

# Skills reference

A SpecWeave skill is a short instruction file that walks an agent through one step of the loop. Every skill calls the `specweave` CLI for the actual work, so the result is the same in every tool. The [commands reference](/docs/reference/commands) lists what each command does.

You rarely need to name a skill. `AGENTS.md` tells every agent the loop, so plain words such as "plan this", "keep going", "hand off" or "pick up" are enough.

## Core skills

Every project gets these seven. The `sw` plugin loads them as `/sw:increment`, `/sw:do` and so on in Claude Code (`$sw:do` in Codex), and `specweave init` and `specweave update` also copy them into `.claude/skills/sw-<name>/` and `.agents/skills/sw-<name>/`.

| Skill | What it does | Plain words that trigger it |
|-------|--------------|-----------------------------|
| `increment` | Settles the decisions only you can make (at most 5 questions by default, each with a recommended answer), then plans the unit of work: `spec.md` with Problem, Scope, numbered acceptance criteria, Approach, Decisions and Tasks. | "plan a feature", "new increment", "let's build X" |
| `grill-me` | Interviews you in rounds until every decision in a plan is settled. Each question carries a recommended answer, and the results are recorded under `## Decisions` in `spec.md`. With `planning.deepInterview: "deep"`, `increment` runs it for every new increment. Adapted from Matt Pocock's grilling skill. | "grill me", "interview me", "stress-test this plan" |
| `do` | Works the increment task by task: `task next`, claim, implement inside the task's Files, commit, `task done --run` with the test. Its "Unattended (auto mode)" section runs until every task is done; its "Parallel lanes" section splits the work across several agents, a worktree each. | "implement", "next task", "keep going", "run until done", "split this across three agents" |
| `auto` | A thin entry to sw-do's unattended run that only you start: it runs `specweave auto`, and the Stop hook sends the session back into the loop until the tasks run out. | `/sw:auto` |
| `review` | Adversarial review before shipping, by a fresh context or by a model from another family (`specweave review`). Every finding cites `path:line` and is checked again. | "review", "qa", "critique this" |
| `done` | Closes an increment: ledger check, `specweave verify`, review, `specweave complete`. | "close it", "we are done", "finish up" |
| `handoff` | Writes a secret-scrubbed handoff and pushes it, so the work continues in another tool, account or session. | "hand off", "I'm out of tokens", "switching accounts" |

`grill-me` was optional when it arrived in 3.1.0. It is core now because threads usually start inside a child Git repo, and Claude Code and Codex stop looking for project skills at that repo's root, so an opt-in copy installed at a SpecWeave umbrella root never reached them. Only the plugin did, and the plugin carries core skills only.

## Optional skills

These four are off until a project needs them. Each installs into `.claude/skills/sw-<name>/` and `.agents/skills/sw-<name>/` when `.specweave/config.json` lists it under `skills.enabled`, or when its trigger is detected and `skills.disabled` does not list it. The plugin does not load optional skills, so you call them as project skills: `/sw-glossary` in Claude Code, `$sw-glossary` in Codex.

| Skill | What it does | Detected by |
|-------|--------------|-------------|
| `glossary` | Builds the project's shared domain language in `GLOSSARY.md` (the ubiquitous language of domain-driven design): each term across business, data, code and UI, with the words to avoid. Adapted from Matt Pocock's domain-modeling skill. | a `GLOSSARY.md` or `GLOSSARY-MAP.md` at the root |
| `sync` | GitHub, Jira and Azure DevOps: push progress, pull or import issues, check status, run setup. | a configured tracker |
| `project` | Shared goal, memory, work items and briefs across tools. | `.specweave/project/hub.json` |
| `jev` | Hands closed-set decisions (routing, command safety, screening, failure triage) to Jev. | `jev.enabled` |

```bash
specweave skills                            # every skill and whether it is on, and why
specweave skills enable glossary
specweave skills disable sync               # keep a detected skill out
specweave skills list --json
```

`enable` and `disable` write `skills.enabled` and `skills.disabled` and reinstall the project copies; reload your tool afterwards. Core skills cannot be disabled, and naming one in `enable` (an older `specweave skills enable grill-me`, say) only prints that it is core and always installed. See [configuration](/docs/reference/configuration#skills).

A `GLOSSARY.md` entry looks like this:

```markdown
### Order
A customer's request to buy one or more products.
- Avoid: purchase, basket
- Data: `orders` table
- Code: `Order` in `src/orders/order.ts`
- UI: "Order"
```

`specweave glossary check` lists avoided words used as identifiers (`file:line`) and backticked Data or Code names that no longer exist. It exits 0, or 1 with `--strict` when it finds anything, so CI can run it.

## Retired skills

- `brainstorm`: its Decide step lives in `increment` and `grill-me`.
- `team`: folded into the "Parallel lanes" section of `do`. The `specweave team` command still exists.
- `qa` and `task` folded into `review` and `do` in 3.0. The CLI still has `specweave qa` for a risk score.
- The old `skills-optional/` procedures (debug, diagrams, e2e, release-expert, tdd-cycle) are deleted.

`specweave update` removes SpecWeave's own copies of retired skills, and of optional skills that are now off. It never removes a folder of your own.

There is no pickup skill. `AGENTS.md` tells every agent to run `specweave pickup` at the start of a session and when you say "pick up" or "continue". In Claude Code the SessionStart hook also prints a short pickup on its own.

## Run a skill

Checked on October 27, 2026, except the rows marked documented.

| Tool | How you run a skill | Checked |
|------|---------------------|---------|
| Claude Code | `/sw:do 0042` for the plugin skill. A project copy in `.claude/skills/` also answers to `/sw-do`. | claude 2.1.302 |
| Codex (CLI, desktop, cloud) | `$sw:do 0042` for the plugin skill. A project copy in `.agents/skills/` answers to `$sw-do`. | codex-cli 0.162.1 |
| SpecWithCode app | Pick the skill from the `/` or `$` menu, which inserts `$sw:do`, or type `$sw:do 0042` anywhere in a message. From the release after 1.0.99, a message that starts with `/sw:do 0042` is sent as `$sw:do 0042` too. | Headless check of the app's menu and send code |
| Cursor, GitHub Copilot (CLI, VS Code) | `/sw-do` from the project copies in `.agents/skills/` or `.claude/skills/`. | Documented, not checked here |
| Gemini CLI, OpenCode | No documented explicit form. The model activates a skill from its description: Gemini asks for your consent first, OpenCode loads it through its `skill` tool. | Documented |

In Codex, `$sw:review` loaded the skill, `$sw-review` loaded nothing outside a project that has copies, and a typed `/sw:review` reached the model as plain text.

How the skills get there:

| Where you work | How skills are installed |
|----------------|--------------------------|
| Claude Code with the plugin | `claude plugin install sw@specweave` |
| Claude Code without the plugin (a Claude Code Projects thread, another cloud session) | `specweave init` writes them to `.claude/skills/sw-<name>/` in the repo; commit that folder |
| Codex and other tools that read `.agents/skills/` | The same `specweave init` writes `.agents/skills/sw-<name>/` too, whatever the adapter |
| Cursor, Gemini CLI, Copilot and other tools | `specweave init --adapter <tool>` writes the skills where that tool looks for them |
| Any tool, no SpecWeave install | `npx vskill install anton-abyzov/specweave/sw-do` (see below) |

Plain words start every skill but `auto`, which only you start by typing it; "run until done" reaches the same unattended run through `do`. `AGENTS.md` also tells the agent to run `specweave handoff --reason "<your words>"` whenever it stops, so a tool without skills does the same.

## Handing off in a few words

You do not need to write a long prompt to move work between tools or accounts.

1. In the session that is stopping, say "hand off" (or "I'm out of tokens"). The agent runs `specweave handoff`, which releases its claims and pushes the branch and a snapshot of uncommitted work.
2. In the new session (another tool, a cloud thread, a second account), say "pick up". The agent runs `specweave pickup`, which fetches that handoff, applies it when the working tree is clean, and prints the next task with its acceptance criteria.

`specweave report` then writes an HTML timeline of who did what, as evidence of the handover.

See [cross-tool handoff](/docs/guides/cross-tool-handoff) and [Claude Code Projects](/docs/guides/claude-code-projects).

## Portable skills for any tool

All eleven skills, core and optional, live in the `skills/sw-<name>/` folders of the SpecWeave repo, which are the one source the plugin and project copies are generated from; `skills/catalog.json` says which are core. They install into other tools with [vskill](/docs/skills/vskill-cli). Each one spells out the file formats and a manual shell procedure, so they work even where the CLI is not installed.

```bash
npx vskill install anton-abyzov/specweave/sw-increment
npx vskill install anton-abyzov/specweave/sw-do
npx vskill install anton-abyzov/specweave/sw-review
npx vskill install anton-abyzov/specweave/sw-handoff
npx vskill install anton-abyzov/specweave/sw-grill-me
npx vskill install anton-abyzov/specweave/sw-glossary
```

| Skill | Use it when | Writes |
|-------|-------------|--------|
| `sw-increment` | Planning a feature, before any code | `metadata.json`, `spec.md` |
| `sw-do` | Implementing an increment task by task, including claiming, finishing or skipping a task | Commits, ledger events, `reports/verify.json` |
| `sw-review` | Reviewing before shipping | `reports/review.md`, or `reports/review-<reviewer>.md` from `specweave review` |
| `sw-handoff` | Stopping: out of tokens, switching tools or machines | `handoff.md`, `handoff.diff` |
| `sw-grill-me` | The shape of the work is unclear and you want to be interviewed | `## Decisions` in `spec.md` |
| `sw-glossary` | One word means two things, or two words mean one | `GLOSSARY.md` |
| `sw-jev` | A decision whose possible answers can all be listed in advance | Nothing; it answers and you act |

For tools that only read `AGENTS.md`, see [generic AI tools](/docs/integrations/generic-ai-tools).

## Standards

Each `SKILL.md` follows the [Agent Skills specification](https://agentskills.io/specification), whose top-level frontmatter keys are `name`, `description`, `license`, `compatibility`, `metadata` and `allowed-tools`. The skill's version sits under `metadata`:

```yaml
---
description: Run a SpecWeave increment unattended until every task is done, then verify and close - the Unattended section of sw-do. Use for "auto mode", "run until done".
argument-hint: "[increment-ids...] [--dry-run|--reset]"
disable-model-invocation: true
metadata:
  version: "3.1.0"
---
```

`argument-hint` and `disable-model-invocation` are Claude Code extensions. Copilot and Cursor also read `disable-model-invocation`; other tools ignore both. Source skills carry no `name:`, and installers add it: project copies get `name: sw-<name>`, and plugin copies take the folder name, which the host namespaces as `sw:<name>`.

Every skill also has `agents/openai.yaml`, the metadata the Codex UI shows: a display name such as "SpecWeave Do" or "SpecWeave Grill Me" and a short description. `sw-auto` also sets `policy.allow_implicit_invocation: false`, the Codex twin of its `disable-model-invocation: true`, so only you start it there too.

## Writing your own

Custom skills go in your own plugin or are installed with vskill; they are not added to the `sw` plugin. See [installing skills](/docs/skills/installation) and the [skills overview](/docs/skills).
