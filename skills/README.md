# SpecWeave skills

The one hand-edited source of every SpecWeave skill. Each skill drives the `specweave`
CLI and works in Claude Code, Codex, Grok, Cursor and any tool that reads `SKILL.md`;
each also spells out a manual path for a machine without the CLI.

`catalog.json` is the one list of them: the **core** skills every project gets, the
**optional** ones a project turns on, and the **retired** ones `specweave update`
removes. Everything else is generated from this folder, so edit only here:

- `plugins/specweave/skills/<name>/` is the Claude Code plugin copy of each core skill
  (`/sw:<name>`), and `plugins/specweave/skills-optional/<name>/` the shipped copy of
  each optional one (the plugin does not load it), both written by
  `node scripts/build/generate-skills.mjs` (part of `npm run build`; `--check` fails
  when a copy has drifted).
- `specweave init` and `specweave update` install the core skills, plus the optional
  skills the project enabled or detects, into `.claude/skills/sw-<name>/` (Claude Code,
  including cloud sessions where plugins do not load) and `.agents/skills/sw-<name>/`
  (Codex, Grok and others). `specweave skills` lists them; `specweave skills enable
  glossary` turns an optional one on.

Run one by its id; the display name is only a label:

| Where | Plugin skill | Project copy |
|---|---|---|
| Claude Code | `/sw:do 0042` | `/sw-do 0042` |
| Codex | `$sw:do 0042` (a typed `/sw:do` is plain text there) | `$sw-do 0042` |
| SpecWithCode | pick it from `/` or `$`, or type `$sw:do 0042` | `$sw-do 0042` |
| Cursor, GitHub Copilot | none | `/sw-do` |
| Gemini CLI, OpenCode | none | the model picks it from the description |

Install one into any other tool with [vskill](https://verified-skill.com):

```bash
npx vskill install anton-abyzov/specweave/sw-increment
npx vskill install anton-abyzov/specweave/sw-do
npx vskill install anton-abyzov/specweave/sw-auto
npx vskill install anton-abyzov/specweave/sw-review
npx vskill install anton-abyzov/specweave/sw-done
npx vskill install anton-abyzov/specweave/sw-handoff
npx vskill install anton-abyzov/specweave/sw-grill-me
npx vskill install anton-abyzov/specweave/sw-glossary
npx vskill install anton-abyzov/specweave/sw-sync
npx vskill install anton-abyzov/specweave/sw-project
npx vskill install anton-abyzov/specweave/sw-jev
```

Core:

| Skill | Use it when |
|---|---|
| [sw-increment](sw-increment/SKILL.md) | planning work: settle the decisions, then one spec.md with ACs and tasks |
| [sw-grill-me](sw-grill-me/SKILL.md) | being interviewed in rounds until every decision is settled |
| [sw-do](sw-do/SKILL.md) | implementing task by task through the ledger, alone, unattended or in parallel lanes |
| [sw-auto](sw-auto/SKILL.md) | the user types it to run an increment unattended (it points at sw-do) |
| [sw-review](sw-review/SKILL.md) | adversarial review before shipping, by a fresh context or another model |
| [sw-done](sw-done/SKILL.md) | verify, review, complete |
| [sw-handoff](sw-handoff/SKILL.md) | "hand off" in one tool, "pick up" in another |

Optional (on when enabled in `.specweave/config.json`, or detected):

| Skill | Use it when | Detected by |
|---|---|---|
| [sw-glossary](sw-glossary/SKILL.md) | building GLOSSARY.md: each term across business, data, code and UI | `GLOSSARY.md` at the root |
| [sw-sync](sw-sync/SKILL.md) | GitHub, Jira or Azure DevOps | a configured tracker |
| [sw-project](sw-project/SKILL.md) | shared goal, memory, work items and briefs | `.specweave/project/hub.json` |
| [sw-jev](sw-jev/SKILL.md) | a decision whose every answer can be listed in advance | `jev.enabled` |

Typical loop: sw-grill-me (when the shape is unclear), sw-increment, sw-do, sw-review,
sw-done. sw-handoff whenever you stop.

## Rules for editing

- Frontmatter follows the [Agent Skills spec](https://agentskills.io/specification):
  no `name:` (the folder name is the skill name; installers write `name: sw-<name>`
  into project copies, and plugin hosts namespace the folder as `sw:<name>`),
  `description` (at most 200 characters, the key use first) and `metadata.version`.
  `argument-hint` and `disable-model-invocation` are the only extensions (Claude Code;
  Copilot and Cursor read the second); strict validators such as `agentskills
  validate` reject them, and every runtime that loads these skills accepts them.
- `agents/openai.yaml` gives Codex a display name ("SpecWeave Do") and, for a skill
  only the user starts, `policy.allow_implicit_invocation: false`.
- Tool-neutral: no tool calls of one vendor. A feature only some tools have is written
  as "if your tool supports subagents, ...". `disable-model-invocation: true` (ignored
  by tools that do not know it) marks a skill only the user starts.
- Every procedure has a `specweave` form and a manual form; a bash block that writes a
  file is followed by its PowerShell form.
- A new skill goes into `catalog.json` as core or optional; prefer optional.
- `npm run lint:standalone-skills` and `npm run lint:skills` check all of this.
