---
title: Skill Studio
description: Develop and evaluate AI agent skills in vskill's local workspace, with clear model-provider and publishing boundaries.
sidebar_position: 4
---

# Skill Studio

**Skill Studio is vskill's skill development and evaluation workspace.** It is distinct from [SpecWeave Studio](/studio), the separate private pilot for native coding sessions across machines. See the [ecosystem architecture](/docs/overview/studio-architecture) for how the products fit together.

## Start the local workspace

```bash
npx vskill@latest studio
```

Use the local URL printed by your installed release. The runtime selects its port; do not assume an old tutorial's fixed port. Inspect current options with:

```bash
npx vskill@latest studio --help
```

The [current product page](https://verified-skill.com/studio) links desktop downloads and a recorded walkthrough. Desktop and CLI releases have separate version numbers. A recording may show an earlier release; check its capture label before comparing controls.

## A practical skill tutorial

1. **Choose a repeated task.** Start with a narrow outcome such as checking a pull request against your team's review rules.
2. **Inspect the source.** Open the skill's `SKILL.md`, its instructions and any tools or scripts it calls. A scan is evidence to consider, not a guarantee of safety.
3. **Define evaluation cases.** Include representative tasks, failure cases and plain-language expectations. Keep the inputs and expected outcomes separate from generated answers.
4. **Run a baseline and a skill-enabled comparison.** Hold the task, model, tool access and starting conditions steady. Inspect failures and the judge's reasoning.
5. **Revise and rerun.** Confirm that the revision helps on more than the examples used to write it. Preserve the previous version and results.
6. **Install or publish deliberately.** Choose the intended agent and scope. Review the destination and visibility before sending skill content anywhere.

Workspace navigation evolves between releases. Follow the selected skill's editing, evaluation, comparison and history controls in the installed app rather than a legacy six-panel diagram.

## Read comparisons correctly

A comparison is useful when it answers a specific question: does this skill improve this task in this environment?

| Keep constant | Record |
| --- | --- |
| Inputs and expected outcomes | Skill source and version |
| Provider, model and generation settings | Model and harness versions |
| Tool access and initial workspace | Individual outputs and assertion verdicts |
| Evaluation procedure | Failures, costs and limitations |

A higher pass rate on a small test set does not prove general productivity gains or production safety. Review the outputs yourself and rerun when the model, tools or harness changes.

## Where data goes

The authoring workspace and project files run locally. **Cloud model calls send evaluation inputs to the provider you select.** Publishing sends content to the chosen destination, and tools invoked by a skill have their own data boundaries.

Private GitHub skills and public registry submissions are different workflows. Current vskill protections keep private skill content out of public platform requests; still verify the selected destination, installed version and provider configuration before working with sensitive material.

For command details, see the [vskill CLI reference](/docs/skills/vskill-cli). For the current interface and walkthrough, see the [canonical Skill Studio guide](https://verified-skill.com/docs/studio).
