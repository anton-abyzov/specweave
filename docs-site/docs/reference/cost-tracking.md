---
title: Usage and cost estimates
description: Understand exact model identities, unknown costs and the limits of local usage telemetry
---

# Usage and cost estimates

Open `specweave dashboard`, expand **Diagnostics & settings**, then choose **Usage & estimates**. Work progress and verification remain on the [Work board](/docs/guides/analytics-dashboard); this view provides secondary usage context.

## What 2.1 reads

The dashboard's cost aggregator reads available Claude Code JSONL session usage for the current project. It caches unchanged files and considers up to the most recent 200 session files. Recorded input, output and cache token fields supply its totals. This is not universal usage coverage across Codex, local models, providers or all of your accounts.

The broader Sessions view can record Codex and Claude Code execution context. That does not mean the cost view has equivalent token or billing support for both. Linking a session or manually entering a model does not create a bill.

## Exact identities, explicit unknowns

| Observation | Display and estimate behavior |
|---|---|
| One exact model ID matching the bundled rate table | A labeled legacy API estimate |
| An unrecognized model ID | Original ID retained; cost Unknown |
| Usage without model metadata | Unknown; no previous-message model is assumed |
| Several model IDs in one session | Mixed, with observed IDs retained; session cost Unknown |
| At least one unpriced session | Total estimate Unknown; priced subtotal shown separately |

Unknown is not zero. The aggregator does not map a newer model to an older family member or charge a whole mixed session at its first model's rate.

## Estimates are not bills

The bundled table is labeled **March 2026 legacy API estimates**. It is not a current pricing recommendation. Where an exact match exists, the estimate multiplies recorded input, output and cache tokens by those stored rates. Cache savings are also estimates against that table.

Provider invoices, subscription allowances, negotiated rates, credits and actual payment history are not imported. Configured API or subscription billing context does not make an estimate an invoice. Check your provider for actual charges.

## Privacy and refresh

Usage parsing runs locally and makes **no model API calls**. Its output contains session identifiers, timestamps, model identifiers and usage counts; those are operational metadata, not a claim of anonymous data. The source session files may contain sensitive transcripts. The cost API returns summaries rather than prompts or responses.

`specweave analytics` is a separate command for recorded command, skill and agent events. It is not an increment billing export. See [models and execution context](/docs/guides/model-selection) for interpreting harness, model, effort, provider and surface alongside task evidence.
