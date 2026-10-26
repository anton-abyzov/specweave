# Plan: Single-Agent Parity Fixture

## Design

Single-agent planning writes spec.md, plan.md, tasks.md, and rubric.md sequentially from one context. No TeamCreate, no parallel agent spawns, no tmux pane orchestration. The agent reads the feature description, drafts the user stories, then the design, then the task breakdown, then the quality contract, in order.

## Rationale

For the typical small-to-medium increment (fewer than ~10 user stories, no cross-cutting domain split), the 3-agent fan-out adds team-creation latency and inter-agent coordination cost that exceeds the quality lift. Single-agent with adaptive-thinking hints produces comparable structural output at lower total tokens and lower wall-clock time. The 3-agent path was removed; `--parallel` is now a deprecated no-op, and independent work runs as sw-do lanes split by disjoint Files.

## ADR References

- See future ADR on "single-agent vs fan-out planning defaults" (to be authored in Wave 3 of 0669).
