---
sidebar_position: 1
title: SpecWeave for teams
sidebar_label: Teams
description: SpecWeave and SpecWithCode are free for every developer and team. What teams get for free, what the founders offer and Pro add, and what a team contract covers, plus audit trails, brownfield work, multi-repo workspaces and tracker sync.
---

# SpecWeave for teams

Everything a team needs to run coding agents on its own machines is free: the SpecWithCode app, the SpecWeave CLI, every agent you already pay for, handoffs between them, and the record of who did what. Bring one developer or the whole team. Nothing counts seats, agents or hours, and we never resell model tokens.

## What your team gets, and what costs money

| | Free | Founders | Pro (waitlist) | Team contract |
|---|---|---|---|---|
| Price | $0 forever | $0, first 1,000 accounts | $20 a month per account | Annual, scoped with you |
| SpecWithCode app and SpecWeave CLI | Yes | Yes | Yes | Yes |
| Every agent, auto-handoff, specs and ledger in git | Yes | Yes | Yes | Yes |
| [Connect](/docs/studio/connect) machines, reached from anywhere and from your phone | 3 | 10 | Unlimited | Scoped in contract |
| Direct routes (local network, SSH) | Unlimited | Unlimited | Unlimited | Unlimited |
| Private skills, hosted and security-scanned | | | Yes | Self-hosted registry on request |
| Setup, named engineer, response times | | | | Yes |
| Audit export, security review pack, invoice billing | | | | Yes |
| SSO, provider and model policy | | | | Scoped in contract |

**Founders.** The first 1,000 accounts to link a machine through Connect get a founder number and 10 Connect machines. The seat is granted on that link, with no form or card, and stays with the account. [Pricing](/pricing) shows how many seats are left, live. A founder who needs more than 10 machines can ask, and we raise the limit for that account.

**Pro** is on a waitlist and charges nothing until it opens. It is for one account that runs many machines or shares private skills; it will be billed by card in your SpecWithCode account.

## Team contract

A contract adds what a team of 2–10 people putting coding agents to work needs around them. It never charges for running agents on your own machines.

| Offered today | Scoped with your contract |
|---|---|
| Setup for your whole team, with SpecWeave set up in your repositories | SSO |
| Priority support with a named engineer and response times in the contract | Provider and model policy for your team |
| Export of who ran which agent, on which machine, with what evidence (from the ledger and `specweave report`) | A self-hosted skill registry |
| Security review pack and invoice billing | Anything else your team needs, scheduled and priced in the contract |

Contracts are annual. The two-week [founding team pilot](/pricing) ($990, five places, no charge if the handoff drill fails in your repo) is the usual first step. To start a conversation, email [anton.abyzov@gmail.com](mailto:anton.abyzov@gmail.com?subject=SpecWithCode%20for%20our%20team) with your team size and the tools you use.

## Inspectable delivery records

Every decision lives in a version-controlled file, and the evidence for every task is recorded by the command that produced it, not asserted afterwards.

| Question an auditor asks | Where the answer lives |
|---|---|
| Why was this built this way? | `spec.md`: Problem, Scope, Acceptance Criteria, Approach |
| Who did what, and when? | `ledger.jsonl`: an append-only event for each claim, done, skip, block and handoff, with agent id and timestamp |
| What proves it works? | `reports/verify.json`: the commands that ran, their exit codes and the acceptance criteria tally |
| Why was this closed without a passing verify? | `metadata.json` `closeReason`, required when the gate is bypassed |
| Who reviewed it? | `reports/review.md`, written by a review in a fresh session |

The CLI appends ledger events; it does not rewrite prior events. The ledger is an ordinary file, so edits outside the CLI remain possible. Use Git review, access controls and your retention policy to protect the record. `specweave report` renders it as an HTML timeline; no cryptographic immutability or compliance certification is implied.

## Three products, distinct responsibilities

SpecWeave owns the project workflow. vskill and Skill Studio provide skill installation and evaluation. The separate **SpecWithCode** app, free and in early access, provides a native coding workspace across machines. Read the [shared architecture](/docs/overview/studio-architecture) for connection options, per-host pairing, account boundaries and the current verification scope. [See SpecWithCode](/code/) before planning a rollout around it.

## Brownfield work

Most team work changes existing code. `spec.md` records the existing behaviour under Problem before anything changes, and `create-increment --supersedes <id>` lets a replacement increment abandon its predecessor with a recorded reason instead of leaving half-open work behind. See [Brownfield workflow](/docs/workflows/brownfield).

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
