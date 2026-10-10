# SpecWeave skills

The one hand-edited source of every SpecWeave skill. Each skill drives the `specweave`
CLI and works in Claude Code, Codex, Grok, Cursor and any tool that reads `SKILL.md`;
each also spells out a manual path for a machine without the CLI.

Everything else is generated from this folder, so edit only here:

- `plugins/specweave/skills/<name>/` is the Claude Code plugin copy (`/sw:<name>`),
  written by `node scripts/build/generate-skills.mjs` (part of `npm run build`;
  `--check` fails when a copy has drifted).
- `specweave init` and `specweave update` install the same skills into a project as
  `.claude/skills/sw-<name>/` (Claude Code, including cloud sessions where plugins do not
  load) and `.agents/skills/sw-<name>/` (Codex, Grok and others).

Install one into any other tool with [vskill](https://verified-skill.com):

```bash
npx vskill install anton-abyzov/specweave/sw-increment
npx vskill install anton-abyzov/specweave/sw-do
npx vskill install anton-abyzov/specweave/sw-auto
npx vskill install anton-abyzov/specweave/sw-team
npx vskill install anton-abyzov/specweave/sw-review
npx vskill install anton-abyzov/specweave/sw-done
npx vskill install anton-abyzov/specweave/sw-sync
npx vskill install anton-abyzov/specweave/sw-handoff
npx vskill install anton-abyzov/specweave/sw-project
npx vskill install anton-abyzov/specweave/sw-brainstorm
npx vskill install anton-abyzov/specweave/sw-jev
```

| Skill | Use it when |
|---|---|
| [sw-increment](sw-increment/SKILL.md) | planning work: one spec.md with ACs and tasks |
| [sw-do](sw-do/SKILL.md) | implementing, task by task through the ledger |
| [sw-auto](sw-auto/SKILL.md) | running an increment unattended until done |
| [sw-team](sw-team/SKILL.md) | several agents on one increment |
| [sw-review](sw-review/SKILL.md) | adversarial review and quality check before shipping |
| [sw-done](sw-done/SKILL.md) | verify, review, complete |
| [sw-sync](sw-sync/SKILL.md) | GitHub, Jira or Azure DevOps |
| [sw-handoff](sw-handoff/SKILL.md) | "hand off" in one tool, "pick up" in another |
| [sw-project](sw-project/SKILL.md) | shared goal, memory, work items and briefs |
| [sw-brainstorm](sw-brainstorm/SKILL.md) | comparing options before a spec |
| [sw-jev](sw-jev/SKILL.md) | a decision whose every answer can be listed in advance |

Typical loop: sw-increment, sw-do, sw-review, sw-done. sw-handoff whenever you stop.

## Rules for editing

- No `name:` in the frontmatter (the folder name is the skill name; installers add it).
  `description` (at most 200 characters), `argument-hint` and `version` are required.
- Tool-neutral: no tool calls of one vendor. A feature only some tools have is written
  as "if your tool supports subagents, ...".
- Every procedure has a `specweave` form and a manual form; a bash block that writes a
  file is followed by its PowerShell form.
- `npm run lint:standalone-skills` and `npm run lint:skills` check all of this.
