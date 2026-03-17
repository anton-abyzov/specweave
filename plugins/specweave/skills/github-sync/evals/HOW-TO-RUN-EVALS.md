# How to Run Evals for the GitHub Sync Skill

This guide explains how to add test cases, run them, and compare quality with and without the skill.

## What Are Evals?

Evals are test cases that prove the skill works. Each one has:
- A **prompt** -- something you'd actually ask (e.g., "How do I set up GitHub sync?")
- **Assertions** -- specific things the skill should make Claude do (e.g., "mentions gh auth login", "explains spec-to-project mapping")

We run each prompt twice: once with the skill loaded, once without. The difference in scores shows exactly how much value the skill adds.

## File Structure

```
github-sync/
  evals/
    evals.json          <-- Test cases
    HOW-TO-RUN-EVALS.md <-- This file
```

## Running Evals

### Via vskill CLI

```bash
# Set the model (Opus 4.6 recommended for judging)
export VSKILL_EVAL_MODEL=claude-opus-4-6
export ANTHROPIC_API_KEY=sk-ant-...

# Run evals for this skill
vskill eval run specweave-github/github-sync
```

### Via Claude Code

Ask Claude:
> "Run the github-sync evals -- both with-skill and without-skill."

## Adding Test Cases

Open `evals.json` and add entries to the `evals` array. Each case needs:
- A realistic prompt with specific details
- Objectively verifiable assertions (boolean pass/fail)

## Model Selection

For eval generation and judging, use:
- `claude-opus-4-6` -- highest quality, recommended for final evals
- `claude-sonnet-4-6` -- faster, good for iteration
