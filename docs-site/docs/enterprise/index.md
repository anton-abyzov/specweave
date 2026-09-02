---
sidebar_position: 1
title: Enterprise Overview
description: SpecWeave for enterprise teams — audit trails, brownfield work, multi-repo workspaces, and tracker sync.
---

# SpecWeave for Enterprise

SpecWeave is built for the reality of enterprise development: legacy codebases, distributed teams, compliance requirements and complex release cycles.

## Audit trails that are actually true

Every decision lives in a version-controlled file, and the evidence for every task is recorded by the tool that produced it — not asserted afterwards.

| Question an auditor asks | Where the answer lives |
|---|---|
| Why was this built this way? | `spec.md` — Problem, Scope, ACs, Approach (with rejected alternatives and ADR links) |
| Who did what, and when? | `ledger.jsonl` — an append-only event per claim, done, skip and block, with agent id and timestamp |
| What proves it works? | `reports/verify.json` — the commands that ran, their exit codes, and the AC tally |
| Why was this closed without a green verify? | `metadata.json.closeReason` — mandatory when the gate is bypassed |
| Who reviewed it? | `reports/review.md` — findings with `path:line`, produced in a fresh context |

The ledger is append-only and never rewritten, so an audit trail cannot be quietly tidied up after the fact.

**[Compliance standards guide →](/docs/guides/compliance-standards)**

## Brownfield work

Most enterprise work is brownfield. The increment folder is designed for it: `spec.md` records the *existing* behaviour under Problem before anything changes, and `--supersedes` lets a replacement increment abandon its predecessor with a recorded reason instead of leaving a graveyard of half-open work.

**[Brownfield workflow →](/docs/workflows/brownfield)**

## Multi-repo workspaces

One umbrella repository coordinating child repositories, each with its own user-story prefix and its own sync targets:

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

- **[GitHub sync](/docs/guides/github-sync)** — first-class. Push, pull, import, health.
- **[Jira and Azure DevOps](/docs/guides/jira-ado-sync)** — opt-in and community-maintained: push and close work, nothing beyond that is guaranteed.
- **[`specweave sync` reference](/docs/reference/sync-cli)** — every verb and flag.

## Parallel delivery

Several agents — or several people, or a mix — on one increment, coordinating only through committed files. No message bus, no shared memory, no vendor lock: see [Agent teams and swarms](/docs/guides/agent-teams-and-swarms).

## Before you roll it out

Read **[SpecWeave 2.0](/docs/guides/specweave-2)** first. 2.0 deliberately removed the enterprise-shaped surface that nobody used — the Jira/ADO multi-project and hierarchy-mapping stacks, the three-report closure pipeline, the auto-generated documentation tree. If your rollout plan depends on one of those, plan around the 2.0 shape rather than the 1.x docs.
