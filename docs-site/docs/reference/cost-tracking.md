---
title: Usage and cost estimates
description: What the dashboard's Usage and estimates page reads, how it prices sessions, and why its numbers are estimates rather than bills.
---

# Usage and cost estimates

Run `specweave dashboard`, open **Diagnostics & settings** in the sidebar, then choose **Usage & estimates**. Work progress and verification stay on the Work board; see the [dashboard guide](/docs/guides/dashboard).

## What it reads

The page reads Claude Code session logs for the current project, the `.jsonl` files under `~/.claude/projects/`, up to the 200 most recent. It sums the input, output and cache token counts recorded in them. Parsed files are cached until they change.

It does not read Codex, local models or other providers, and it does not see usage from your other accounts. Linking a session or entering a model by hand does not create a cost.

## How sessions are priced

| What the log shows | What the page shows |
|--------------------|---------------------|
| One model id that matches the bundled rate table exactly | An estimate at those rates |
| A model id not in the table | The id, with cost Unknown |
| No model id | Unknown; no model is assumed |
| Several model ids in one session | Mixed, with every id listed; cost Unknown |
| Any unpriced session in the range | Total Unknown, with the priced subtotal shown separately |

Unknown is not zero. A newer model is never priced as an older one from the same family.

## Estimates are not bills

The rate table is labeled as a legacy API rate table from March 2026. Estimates multiply recorded tokens by those rates, and cache savings are estimated the same way. Invoices, subscription allowances, negotiated rates and credits are not imported. Check your provider for what you actually pay.

## Privacy

Parsing happens locally and makes no model API calls. The page shows session ids, timestamps, model ids and token counts, not prompts or responses. The session files themselves can contain full transcripts, so treat them as sensitive.

For how model, effort and tool relate to task evidence, see [model selection](/docs/guides/model-selection).
