---
sidebar_position: 1
title: Enterprise overview
description: SpecWeave for enterprise teams, covering audit trails, brownfield work, multi-repo workspaces, tracker sync and parallel delivery.
---

# SpecWeave for enterprise

SpecWeave is built for legacy codebases, distributed teams and work that has to stand up to an audit.

## Audit trails that are true

Every decision lives in a version-controlled file, and the evidence for every task is recorded by the command that produced it, not asserted afterwards.

| Question an auditor asks | Where the answer lives |
|---|---|
| Why was this built this way? | `spec.md`: Problem, Scope, Acceptance Criteria, Approach |
| Who did what, and when? | `ledger.jsonl`: an append-only event for each claim, done, skip, block and handoff, with agent id and timestamp |
| What proves it works? | `reports/verify.json`: the commands that ran, their exit codes and the acceptance criteria tally |
| Why was this closed without a passing verify? | `metadata.json` `closeReason`, required when the gate is bypassed |
| Who reviewed it? | `reports/review.md`, written by a review in a fresh session |

The ledger is never rewritten, so the trail cannot be tidied up after the fact. `specweave report` renders it as an HTML timeline.

## Brownfield work

Most enterprise work changes existing code. `spec.md` records the existing behaviour under Problem before anything changes, and `create-increment --supersedes <id>` lets a replacement increment abandon its predecessor with a recorded reason instead of leaving half-open work behind. See [Brownfield workflow](/docs/workflows/brownfield).

## Multi-repo workspaces

One umbrella repository can coordinate child repositories, each with its own story prefix and its own sync target:

```json
{
  "workspace": {
    "name": "acme",
    "repos": [
      { "id": "web-ui", "path": "repositories/acme/web-ui", "prefix": "FE", "role": "frontend",
        "sync": { "github": { "owner": "acme", "repo": "web-ui" } } },
      { "id": "api", "path": "repositories/acme/api", "prefix": "BE", "role": "backend",
        "sync": { "jira": { "projectKey": "API" } } }
    ]
  }
}
```

`specweave get <source>` clones and registers a repository into the workspace. See [Configuration](/docs/reference/configuration#workspace).

## Tracker integration

Trackers are mirrors, and they change only when you ask. Starting, pausing or abandoning an increment never touches them; `specweave sync push` does.

- [GitHub sync](/docs/guides/github-sync): first-class
- [Jira and Azure DevOps](/docs/guides/jira-ado-sync): opt-in; create, update on push, close
- [`specweave sync` reference](/docs/reference/sync-cli)

## Parallel delivery and tool choice

Several agents, several people or a mix can work one increment, coordinating only through committed files. See [Agent teams](/docs/guides/agent-teams-and-swarms). Because the whole record is in git, teams are not tied to one AI vendor: work can move between Claude Code, Codex, Cursor and others with [handoff and pickup](/docs/guides/cross-tool-handoff).

## Before you roll it out

Read [SpecWeave 3.0](/docs/guides/specweave-3) for what changed and how to upgrade. Earlier versions removed the Jira and Azure DevOps multi-project and hierarchy mapping and the generated documentation tree. If a rollout plan depends on those, plan around the current shape.
