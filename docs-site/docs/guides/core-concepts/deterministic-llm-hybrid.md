---
sidebar_position: 4
title: Deterministic Config + LLM Execution
description: Why combining deterministic configuration with non-deterministic LLMs gives you reproducible AI workflows — and how to leverage it
---

# Deterministic Config + LLM Execution: The Hybrid Model

The most powerful thing SpecWeave does isn't run LLMs — it's constrain them.

Understanding why requires understanding the fundamental difference between deterministic and non-deterministic systems, and why combining both is more capable than either alone.

---

## Two Modes of Computation

### Deterministic systems

A deterministic system always produces the same output given the same input. `config.json` is deterministic. `metadata.json` is deterministic. A git commit is deterministic.

- `testing.tddEnforcement: "strict"` means TDD enforcement is strict. Every time. On every machine. For every developer. With no exceptions based on mood, context, or workload.
- A `metadata.json` with `"status": "completed"` means that increment is done. It doesn't mean "probably done" or "done unless something changed."

Deterministic systems are **auditable**, **reproducible**, and **team-shareable**. You can `git blame` them. You can diff them. CI/CD treats them the same way on every run.

### Non-deterministic systems (LLMs)

LLMs are fundamentally non-deterministic. The same prompt can produce different outputs. They adapt to context, handle ambiguity, and exercise judgment — but you cannot reproduce yesterday's exact response today.

This is not a bug. It's what makes LLMs useful. A deterministic system can't write a test suite for a feature it's never seen. An LLM can.

---

## The Problem With Each Alone

**Pure LLM workflows break down under repetition.** "I told Claude to always write tests first" is not an enforcement mechanism — it's a hope. Without structural constraints, quality gates get skipped under deadline pressure, TDD becomes TDD-when-convenient, and team behavior diverges based on who wrote the prompt.

**Pure static configuration can't adapt.** A config file that specifies every detail of what to build removes the reason to use an LLM at all. Static tools already do deterministic execution. You don't need AI for that.

---

## The Hybrid: Deterministic Rules, Non-Deterministic Execution

SpecWeave separates these concerns cleanly:

- **`config.json`** encodes your team's non-negotiable rules — quality gates, workflow behavior, integrations, enforcement levels
- **`metadata.json`** tracks deterministic lifecycle state — what was done, when, by whom, to what AC
- **LLM execution** handles everything that requires judgment — writing code, designing systems, analyzing tradeoffs, generating tests

The LLM reads your config and adapts its behavior accordingly. The constraints aren't in your prompt — they're in structured files the LLM is given as ground truth.

```
config.json (deterministic)
    ↓
LLM reads constraints
    ↓
LLM executes with judgment (non-deterministic)
    ↓
metadata.json records outcome (deterministic)
```

---

## Why This Is More Powerful Than Either Alone

### Reproducibility without rigidity

With `testing.tddEnforcement: "strict"` in config, every agent, every session, every developer gets TDD enforcement — without needing to say it in every prompt. The rule travels with the repo.

With `auto.requireTests: true`, the autonomous execution loop cannot mark a task complete until tests pass. The LLM can try creative approaches to make tests pass, but it cannot skip the gate.

### Auditability of decisions

When an increment ships with `"coverageTarget": 90` in its `metadata.json`, you can trace exactly what quality bar was in force at the time. Not "we think we required 90% coverage" — you know, because it's in version control.

### Team alignment at scale

A single `config.json` checked into the repo ensures all developers (and all AI agents) run with the same behavior. No per-person prompt engineering required. New team members — human or AI — inherit the team's standards automatically.

### Graceful override when needed

Because the constraints are in files, you can override them deliberately and visibly. Changing `tddEnforcement` from `"strict"` to `"warn"` for a spike is a one-line diff that gets reviewed and reverted. Changing it implicitly in a prompt leaves no trace.

---

## Practical: How Config Constrains LLM Behavior

These are real config properties and the LLM behaviors they enforce:

| Config | What the LLM does |
|--------|------------------|
| `testing.tddEnforcement: "strict"` | Always does RED → GREEN → REFACTOR before marking tasks complete |
| `auto.requireTests: true` | Cannot close an increment in auto mode without passing tests |
| `auto.requireValidation: true` | Runs `sw:validate` before declaring done |
| `planning.deepInterview.enabled: true` | Asks clarifying questions across 5+ categories before writing specs |
| `limits.maxActiveIncrements: 3` | Refuses to start new work when the WIP limit is reached |
| `grill.required: true` | Runs code review before closure — can't be skipped |
| `hooks.post_increment_done.sync_living_docs: true` | Fires living docs sync after every increment, deterministically |
| `sync.settings.autoSyncOnCompletion: true` | Pushes to external tracker on every closure |
| `reflect.enabled: true` | Extracts learnings after every session |

The LLM doesn't decide whether to do these things. The config decides. The LLM decides **how** to do them.

---

## Leveraging the Hybrid

**Put team rules in config, not prompts.** Anything you find yourself repeating in prompts ("always write tests first", "don't skip living docs", "use TDD") belongs in `config.json`. It's more reliable and survives context window resets.

**Use metadata.json as a contract.** When `status` is `"completed"`, that's a fact, not an LLM's assertion. Other systems (GitHub sync, JIRA, dashboards) can trust it. Build tooling against it.

**Override config for experiments, not habits.** If you need to move fast on a spike, set `tddEnforcement: "off"` in that increment's metadata. When the spike is done, the config reverts. The change is visible and intentional.

**Version control your config.** `config.json` should be in git. When behavior changes — quality gates, WIP limits, sync behavior — the diff shows exactly what changed and when. This is your workflow's history.

**Let LLMs handle ambiguity, let config handle policy.** Specifications will always have gaps. Edge cases will always arise. The LLM handles these with judgment. What the LLM should never handle with judgment: whether to run tests, whether to sync to JIRA, whether to enforce TDD. Those are policy decisions, and policy belongs in config.

---

## Summary

| | Deterministic (config) | Non-Deterministic (LLM) |
|--|------------------------|------------------------|
| **Strength** | Reproducible, auditable, version-controlled | Adaptive, creative, handles ambiguity |
| **Weakness** | Can't adapt to novel situations | Can't guarantee consistent behavior |
| **Role in SpecWeave** | Encode team rules and workflow policy | Execute tasks with judgment |
| **Where it lives** | `config.json`, `metadata.json`, `tasks.md` | Prompt execution, code generation, analysis |

The full power of spec-driven AI development comes from neither the config nor the LLM alone — it comes from the boundary between them. Deterministic configuration makes LLM workflows reproducible. Non-deterministic LLM execution makes static configuration intelligent.

---

**See also**: [Configuration Reference](../../reference/configuration) — complete documentation of every `config.json` property and its effect on LLM behavior.
