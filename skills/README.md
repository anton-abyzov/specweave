# SpecWeave standalone skills

The SpecWeave method, packaged as tool-agnostic skills. No Claude Code plugin,
no Claude-only tools: every step has a CLI form (`specweave …`, an accelerator)
and a manual form (plain shell + PowerShell) that produces the same files.

Install one at a time with [vskill](https://verified-skill.com) — it works with
Claude Code, Codex, OpenCode, Cursor, Gemini CLI, Windsurf and friends:

```bash
npx vskill install anton-abyzov/specweave/sw-increment
npx vskill install anton-abyzov/specweave/sw-do
npx vskill install anton-abyzov/specweave/sw-task
npx vskill install anton-abyzov/specweave/sw-review
npx vskill install anton-abyzov/specweave/sw-handoff
```

| Skill | Use it when | Writes |
|---|---|---|
| [sw-increment](sw-increment/SKILL.md) | planning a feature, before any code | `.specweave/increments/NNNN-slug/{metadata.json,spec.md,tasks.md}` |
| [sw-do](sw-do/SKILL.md) | implementing an increment, task by task | commits + ledger events + `reports/verify.json` |
| [sw-task](sw-task/SKILL.md) | claiming / finishing / skipping tasks, several agents on one increment | `ledger.jsonl` |
| [sw-review](sw-review/SKILL.md) | adversarial review before shipping | `reports/review.md` |
| [sw-handoff](sw-handoff/SKILL.md) | out of tokens, switching tools or machines | `handoff.md` + `handoff.diff` |

Typical loop: `sw-increment` → `sw-do` (which drives `sw-task`) → `sw-review` →
`specweave complete <id>`. `sw-handoff` any time you stop.

## Optional: the CLI accelerator

```bash
npm i -g specweave   # then: specweave init
```

Everything works without it — the skills spell out the file formats and the
manual commands. With it you get id reservation, atomic ledger appends, the
rendered board in `tasks.md`, `verify.json` and the closure gate.

## Claude Code users

Install the `sw` plugin instead (`/sw:increment`, `/sw:do`, `/sw:review`,
`/sw:handoff`, …) — same protocol, richer integration. These standalone skills
are for every other tool.
