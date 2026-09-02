# Optional skills

Procedures that are useful but not part of the SpecWeave core loop. They are **not**
shipped in the `sw` plugin — the plugin carries exactly the 10 core skills
(`increment, do, done, review, team, handoff, sync, auto, brainstorm, qa`).

Everything here is tool-agnostic: plain SKILL.md, no `allowed-tools` / `model` /
`context` pins, no Claude-only tool calls. They work in Claude Code, Codex,
OpenCode, Cursor, or by hand.

| Skill | What it is |
|---|---|
| `tdd-cycle` | RED → GREEN → REFACTOR with per-phase gates |
| `e2e` | Playwright E2E generation + run, traced to spec.md ACs |
| `debug` | 4-phase systematic debugging with an escalation protocol |
| `diagrams` | Mermaid / C4 diagrams and where they belong in a repo |
| `release-expert` | Multi-repo release coordination, version alignment, RC lifecycle |

## Install

```bash
npx vskill install anton-abyzov/specweave/skills-optional/<name>
# e.g.
npx vskill install anton-abyzov/specweave/skills-optional/tdd-cycle
```

Or copy the folder into your own skills directory (`~/.claude/skills/<name>/` for a
user-level Claude Code skill, `.claude/skills/<name>/` for a project-level one).

## Adding one

One folder, one `SKILL.md`, frontmatter limited to `description` (≤ 200 chars),
`version` and an optional `argument-hint`. No `name:` — the folder name is the
skill name. `npm run lint:skills` checks these rules.
