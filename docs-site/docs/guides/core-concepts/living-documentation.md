import CommandTabs from '@site/src/components/CommandTabs';

# Living Documentation

:::warning Off by default in SpecWeave 2.0
`livingDocs` defaults to `false`. In 1.x a documentation tree (plus diagram JPGs) was regenerated on every closure — and **it was never read**. No increment cited it, no session loaded it, and it churned the diff on every close. The generators for diagrams and images are gone; the rest is opt-in.
:::

## What actually stays current

The documents that are genuinely alive in 2.0 are the ones you and the agents write and read every day, inside the increment folder:

| File | Kept current by | Read by |
|------|-----------------|---------|
| `spec.md` | you and `/sw:increment`; ACs ticked as they pass | every agent that touches the increment |
| `tasks.md` | the CLI — every ledger write re-renders the `SW:BOARD` block | anyone asking "what is left?" |
| `ledger.jsonl` | `specweave task …` | `verify`, `complete`, and the board |
| `handoff.md` | `specweave handoff`, and the PreCompact hook | the next agent, in any tool |
| `reports/verify.json` | `specweave verify` | `specweave complete` |

None of that is generated prose. It is state, written by the commands that change it, which is why it does not rot.

Hand-written architecture material lives under `.specweave/docs/` — ADRs in particular. Read them before an architectural change; record new decisions in the spec's **Approach** section or a new ADR.

## Turning generated living docs on

```json
{
  "livingDocs": "onDone"
}
```

| Value | Effect |
|-------|--------|
| `false` (default) | Never generated. |
| `"onDone"` | Regenerated when an increment is completed. |

If you are upgrading from 1.x, `specweave update` maps the old `hooks.post_task_completion.sync_living_docs` flag onto this key.

Regenerate on demand:

```bash
specweave docs sync 0042      # living docs for one increment
specweave sync-living-docs    # the whole tree
specweave living-docs         # interactive Living Docs Builder
```

## Previewing docs

<CommandTabs
  natural="Show me the docs"
  claude="specweave docs preview"
  other="specweave docs preview"
/>

| Command | Does |
|---------|------|
| `specweave docs preview` | Preview server with hot reload. |
| `specweave docs public` | Public-scope docs only. |
| `specweave docs build` | Static build for deployment. |
| `specweave docs validate` | Validate without starting a server. |
| `specweave docs kill` | Stop every running docs server. |

## Why the default flipped

Generated documentation has the same failure mode as generated tests: it looks like coverage. The 1.x tree was regenerated faithfully and read by nobody, so it added diff noise and closure time while quietly implying the project was documented.

2.0's position: **the increment folder is the documentation**. Generate a prose tree on top of it only if someone has actually asked to read one.

## See also

- [SpecWeave 2.0](/docs/guides/specweave-2#what-was-removed-and-why)
- [Configuration](/docs/reference/configuration) — the `livingDocs` key
