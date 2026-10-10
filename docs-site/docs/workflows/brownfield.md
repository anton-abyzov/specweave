---
title: Existing codebases
description: Adopt SpecWeave in an existing repository one change at a time, without documenting the whole system first.
---

# Existing codebases

You do not need to document an existing system before using SpecWeave on it. Start with the next change you were going to make anyway, and let the record grow from real work.

## Start small

```bash
cd existing-project
specweave init
```

`init` adds `AGENTS.md`, `CLAUDE.md`, `.specweave/` and the skills. It does not modify your code. If the repository already has an `AGENTS.md` or `CLAUDE.md`, SpecWeave adds its sections and keeps yours.

Then fill in the Commands table in `AGENTS.md` with the build, test and lint commands the project really uses. `specweave verify` runs exactly those, so this is what makes "done" mean something in this codebase.

## Put what the agent keeps getting wrong into AGENTS.md

`AGENTS.md` has a Project notes section at the bottom. Keep it short: the handful of things an agent needs to know that it cannot see from the code. For example:

```markdown
## Project notes

- Money is integer cents everywhere; never floats.
- `legacy/` is frozen. Change behaviour through `src/adapters/`.
- Integration tests need `docker compose up db` first.
```

Every tool reads this file, so a correction made once holds for Claude Code, Codex and the rest.

## Record decisions as you meet them

When a change uncovers a decision that should outlive the session (why the old API is kept, which module owns billing), write it as one small file in `.specweave/memory/` and add a line for it to `.specweave/memory/MEMORY.md`. It is committed with the code, so the next tool and the next account start from it.

## Scope each increment to the files it touches

In an older codebase the risk is an agent "improving" things it was not asked to touch. Each task in `spec.md` lists its files, and the rules in `AGENTS.md` tell the agent to edit only those. Keep the Scope section explicit about what is out:

```markdown
## Scope

In: the retry logic in src/payments/charge.ts. Out: the payment provider client, the database schema.
```

If a task turns out to need a file outside its list, update the task in the spec first. That keeps the diff reviewable.

## Write the missing test first

When the code you need to change has no tests, make the first task a characterization test that pins today's behaviour, and the next task the change itself:

```markdown
### T-01 Pin current retry behaviour
- AC: AC-01 | Files: src/payments/charge.test.ts | Test: npm test -- charge

### T-02 Retry only on network errors
- AC: AC-01, AC-02 | Files: src/payments/charge.ts, src/payments/charge.test.ts | Test: npm test -- charge
```

## Several repositories

For a product split across repositories, create an umbrella folder and add each repository to it:

```bash
mkdir my-product && cd my-product
specweave init
specweave get my-org/api
specweave get my-org/web
```

Repositories live under `repositories/<org>/<repo>/`. Commit inside each repository, then in the umbrella. `specweave get "my-org/*" --pattern "service-*"` adds many at once.

## Trackers you already use

If the team plans in GitHub Issues, Jira or Azure DevOps, keep planning there. `specweave sync pull --create-increments` can turn existing issues into increments, and `specweave sync push` reports progress back when you ask. See [GitHub](/docs/guides/github-sync) and [Jira and Azure DevOps](/docs/guides/jira-ado-sync).
