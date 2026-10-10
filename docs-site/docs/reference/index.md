---
sidebar_position: 0
title: Reference
description: Lookup pages for the SpecWeave 3.0 CLI, skills, configuration, increment files and sync.
---

# Reference

These pages describe what the code does, flag by flag and field by field. For a walkthrough, start with [your first increment](/docs/getting-started/first-increment) or [what changed in 3.0](/docs/guides/specweave-3).

| Page | Use it to look up |
|------|-------------------|
| [Commands](/docs/reference/commands) | Every `specweave` command, grouped by task, with its most useful flags and the list of commands removed in 3.0. |
| [Skills](/docs/reference/skills) | The skill set, how to call a skill in Claude Code, Codex and other tools, and the plain words that trigger each one. |
| [Configuration](/docs/reference/configuration) | The keys in `.specweave/config.json`, what `init` writes, and which old keys are removed. |
| [Metadata and ledger](/docs/reference/metadata-reference) | The files in an increment folder, the fields of `metadata.json`, and the `ledger.jsonl` event format. |
| [`specweave sync`](/docs/reference/sync-cli) | `sync push`, `pull`, `status` and `setup`, and exactly when a tracker is touched. |
| [Usage and cost estimates](/docs/reference/cost-tracking) | What the dashboard's usage page reads and how it prices sessions. |
| [Changelog](/docs/reference/changelog) | Release history. |

## The loop in six commands

```bash
specweave pickup                               # what to do next
specweave create-increment "Add login form"    # plan
specweave task claim T-01                      # take a task
specweave task done T-01 --run "npm test"      # finish it with evidence
specweave verify && specweave complete 0042    # check and close
specweave handoff --reason "out of tokens"     # stop and hand over
```
