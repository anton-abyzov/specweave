---
name: sw/analytics
description: "Analytics and metrics for SpecWeave usage — token consumption, cache efficiency, agent spawn counts."
allowed-tools: Read, Bash
---

## Tool-Use Rationale

- **Read**: Load metrics snapshots, increment history, and config to compute analytics.
- **Bash**: Run `specweave metrics` CLI commands to gather live telemetry data.

## Usage

```
sw:analytics [--cache-stats] [--spawn-count] [--token-usage]
```

## --cache-stats

Displays prompt cache hit rates per skill for the current session.

**Output format**:
```
Cache Statistics (current session)
───────────────────────────────────
sw/grill         hit rate: 78% (1,240 tokens from cache)
sw/judge-llm     hit rate: 65% (980 tokens from cache)
sw/code-reviewer hit rate: 82% (1,560 tokens from cache)
───────────────────────────────────
Overall:         hit rate: 75%
```

**Requirements**:
- Cache must be enabled (`cache.staticContextFiles` non-empty in config)
- Minimum 2 invocations per skill for meaningful hit rate

**Enable persistent metrics**: Set `analytics.cacheMetrics.enabled: true` in `.specweave/config.json`.

## --spawn-count

Reports agent spawn counts per team session. Use to verify that Opus 4.7 fan-out reduction is working (target: ≤ 50% of pre-1.1.0 baseline).

## --token-usage

Reports total token consumption per skill across the session.
