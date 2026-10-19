---
sidebar_position: 6
title: Changelog
description: "SpecWeave release notes: 3.1.0 adds opt-in skills, grill-me, the glossary and cross-model review; the 3.0 line brought handoff and pickup, auto-handoff, auto-compact and the Decide step."
---

# Changelog

The current release is **SpecWeave 3.1.0**, published 17 October 2026. Install or upgrade with `npm i -g specweave@latest`, then run `specweave update` in each project. The complete history is in [CHANGELOG.md on GitHub](https://github.com/anton-abyzov/specweave/blob/develop/CHANGELOG.md), and every tag is on the [releases page](https://github.com/anton-abyzov/specweave/releases).

## 3.1.0, 17 October 2026

### Added

- **Opt-in skills.** Every project gets six core skills: sw-increment, sw-do, sw-auto, sw-done, sw-review and sw-handoff. The optional sw-grill-me, sw-glossary, sw-sync, sw-project and sw-jev install when `skills.enabled` in `.specweave/config.json` lists them, or when the project's files call for them: a `GLOSSARY.md`, a configured tracker, `hub.json`, `jev.enabled` or `planning.deepInterview: deep`. `specweave skills list|enable|disable` shows and changes them; `skills.disabled` keeps a detected one out.
- **sw-grill-me** interviews you in rounds until every decision in a plan is settled, each question with a recommended answer, and records them under `## Decisions`. Guide: [grill me and glossary](/docs/guides/grill-and-glossary).
- **sw-glossary** builds `GLOSSARY.md`, the project's shared language: what each term means in the business, the data, the code and the UI, and the words to avoid. `specweave glossary check` lists avoided words used as identifiers and Data or Code names that no longer exist; `--strict` exits 1 for CI.
- **`specweave review`** hands an increment's diff to a reviewer from another model family than the one that wrote it (Codex with GPT-6.1-Sol for Claude-written code, Claude Opus for OpenAI-written code), writes `reports/review-<reviewer>.md` and exits 0 to ship, 3 to fix first. `--brief` prints the brief to paste anywhere; `review.crossModel` makes sw-review and sw-done run it unprompted. Guide: [review with another model](/docs/guides/cross-model-review).

### Removed

- sw-brainstorm (its Decide step now lives in sw-increment, and the full interview is sw-grill-me), sw-team (now sw-do's parallel lanes) and the unused `skills-optional/` skills (debug, diagrams, e2e, release-expert, tdd-cycle). `specweave update` removes SpecWeave's own copies and never a folder you changed.

## 3.0.x, 25 September to 16 October 2026

| Version | Date | What changed |
|---|---|---|
| 3.0.23 | 16 Oct | One-command machine onboarding in Switch; release publishes wait for green CI. |
| 3.0.22 | 16 Oct | `specweave pickup` finds the latest session checkpoint by reading receipts newest first: 129 ms down to 25 ms with 2,660 checkpoints. |
| 3.0.21 | 16 Oct | sw-increment runs a [Decide step](/docs/guides/decide-step) before writing spec.md. `planning.deepInterview` is `off`, `critical` (default, at most five questions) or `deep`. |
| 3.0.19 | 15 Oct | Docs, the AGENTS.md template and handoff output call the app SpecWithCode. Paths, environment variables and identifiers are unchanged. |
| 3.0.18 | 15 Oct | Inside a SpecWithCode thread, ledger writes record the thread's increment in `~/.specweave/studio/threads/`, so the app can show the thread's plan card. |
| 3.0.17 | 15 Oct | The duplicate check no longer reports suffixed increments such as `0657E` as duplicates of their base number. |
| 3.0.14 | 11 Oct | Task tests check an acceptance criterion the way a user or caller would; no test mode or coverage target is set by default. |
| 3.0.13 | 11 Oct | Dependency updates; `contrib/subscription-switch` added to the repository (not the npm package). |
| 3.0.12 | 10 Oct | `specweave handoff list` and `specweave pickup <id or title>` pick a specific handoff when several sessions handed off. |
| 3.0.11 | 10 Oct | Auto-handoff defaults to `suggest` at 95%: one heads-up per usage window, and the session keeps working. A turn that really hits the limit still hands off by itself. |
| 3.0.9 and 3.0.10 | 10 Oct | The usage guard asks only inside a SpecWeave project, and asks a Codex plan with credits only when the credits are about to run out. |
| 3.0.7 | 9 Oct | `specweave autocompact` sets where Claude Code compacts a long session (default 400K tokens); `init` writes it for new projects. |
| 3.0.6 | 8 Oct | Silent local checkpoints between turns. |
| 3.0.5 | 8 Oct | `handoff --all` and `pickup --all` index every active increment; a StopFailure hook for Claude Code hands off when a turn fails on the limit. |
| 3.0.1 to 3.0.3 | 26 Sep | `specweave update` fixes: it never deletes anything outside the project; evidence moved to `reports/task-T-NN.txt`. |
| 3.0.0 | 25 Sep | "Hand off" and "pick up" across tools, accounts and machines; `auto-handoff`; `report`; `note`; committed project memory; one `spec.md` per increment with state in `ledger.jsonl`; about 280,000 lines of unreachable code removed. See [what changed in 3.0](/docs/guides/specweave-3). |

## SpecWithCode releases

SpecWithCode, the desktop app, ships on its own schedule; every release is on the [SpecWithCode releases page](https://github.com/anton-abyzov/specwithcode/releases). The current release is 1.0.50, published 18 October 2026.

### 1.0.45 to 1.0.50, 18 October 2026

- **Updates.** New releases show within minutes and install from the update button; a stopped update agent is shown.
- **Full access workers.** Workers started by a Full access coordinator stay on Full access and no longer wait on approvals.
- **Connections.** Add, turn off, remove and undo MCP servers.
- **Chrome.** Threads can share a Chrome profile, and an agent can use Chrome paired on another machine of the fleet.
- **Threads.** Shell code blocks in replies run inline, and thread images open in a viewer beside the thread.
- **Linux workers.** An own-VPS Linux worker installs and shows up in the fleet, and installing the service from the npm package pins that version.

### 1.0.44, 18 October 2026

- **Invite this machine.** Settings > Connections makes the `swc-machine-` line from the app, and a new install can choose Join my existing machines. See [add a machine](/docs/studio/add-a-machine).
- **One-line install.** `install.sh` installs SpecWithCode on an Apple silicon Mac or a Linux machine, starts the background service and, with `--join`, sets up Tailscale and prints the invitation line.
- **Usage by machine.** Usage > Limits groups accounts by the machine they are signed in on, and Add Claude account signs in another Claude account in one step.
- **Connections.** MCP servers from plugins, private projects and other tools are listed, and an unreachable machine shows when it was last seen.
- **Computer use and Chrome.** The app walks you through the macOS permissions for [computer use](/docs/studio/computer-use), and the [browser](/docs/studio/browser) settings mark this computer and warn before you use another machine's code.
- **Drafts survive updates.** Drafts and sends are kept across update restarts.

### 1.0.43, 18 October 2026

Added [computer use](/docs/studio/computer-use) and [adding a machine](/docs/studio/add-a-machine) by its Tailscale name.
