---
description: >
  SpecWeave help and discovery. Shows available skills organized by workflow stage,
  usage statistics, and contextual next actions. Use when saying "help", "what can I do",
  "show commands", "what skills are available", "how do I use specweave",
  "getting started", "what's available", "list skills", or "specweave help".
  Do NOT activate for Claude Code's built-in /help command.
---

# sw:help — SpecWeave Discovery

You are showing the user what SpecWeave can do. Gather context first, then display organized help.

## Step 1: Gather Context

Run these commands silently to understand the user's environment:

```bash
# Check if SpecWeave is initialized
INITIALIZED=$([ -d ".specweave" ] && echo "yes" || echo "no")

# Get active increments (if initialized)
STATUS_JSON=$(specweave status --json 2>/dev/null || echo '{"increments":[]}')

# Get usage stats (if initialized)
ANALYTICS_JSON=$(specweave analytics --since 30d --json 2>/dev/null || echo '{}')
```

If any command fails, skip that section gracefully — never show errors to the user.

## Step 2: Display Help

### If NOT initialized (no `.specweave/` directory)

Show getting started:

```
SPECWEAVE — Spec-Driven Development Tool

Get started in 3 steps:

  1. npm install -g specweave
  2. cd your-project && specweave init .
  3. Describe what you want to build — SpecWeave handles the rest

Docs: https://spec-weave.com/docs/getting-started
```

### If initialized

Display the full help with these sections IN ORDER:

#### A. Stats Banner (if analytics data exists)

Parse the analytics JSON and show a one-line summary:

```
SPECWEAVE — [N] increments completed | [M] tasks done | [K] skills used (last 30 days)
```

If no analytics data, just show:

```
SPECWEAVE — Spec-Driven Development Tool
```

#### B. Active Increment Context (if any active increments)

Parse the status JSON. If active increments exist, show:

```
Active now:
  [ID] [title] — [progress]% ([completed]/[total] tasks)
  Next: sw:do [ID] (continue) | sw:progress (status) | sw:done [ID] (close)
```

#### C. Skills by Workflow Stage

Always show this section. Use a table format:

```
PLAN — Define what to build
  sw:increment     Plan a new feature, bug fix, or change
  sw:pm            Product Manager — write specs and requirements
  sw:architect     System Architect — design architecture and ADRs
  sw:brainstorm    Multi-perspective ideation with cognitive lenses
  sw:plan          Generate plan.md and tasks.md for an increment

IMPLEMENT — Build it
  sw:do            Execute tasks step by step
  sw:auto          Autonomous execution (unattended)
  sw:team-lead     Parallel multi-agent orchestration
  sw:tdd-cycle     Test-driven development (red-green-refactor)
  sw:tdd-red       Write failing tests first
  sw:tdd-green     Make failing tests pass
  sw:tdd-refactor  Refactor with test safety net

VERIFY — Check quality
  sw:validate      130+ rule-based checks + AI quality assessment
  sw:grill         Critical code review before closure
  sw:judge-llm     Independent AI validation (ultrathink)
  sw:code-reviewer  6 parallel specialized reviewers
  sw:e2e           Playwright E2E tests traced to acceptance criteria
  sw:debug         Systematic 4-phase debugging with escalation

CLOSE — Ship it
  sw:done          Close increment with PM 3-gate validation
  sw:next          Close current and suggest next work
  sw:pr            Create pull request from increment branch

SYNC — Connect external tools
  sw:progress-sync  Sync progress to GitHub/JIRA/ADO
  sw:sync-setup     Configure GitHub, JIRA, or ADO integration
  sw:import         Import issues from external tools

EXPLORE — Understand your project
  sw:docs          Browse and search living docs
  sw:progress      Show increment progress and task completion
  sw:analytics     Usage statistics dashboard
  sw:doctor        Installation health diagnostics
  sw:diagrams      Generate Mermaid architecture diagrams

CREATE — Generate media
  sw:image         AI image generation (Gemini, Pollinations)
  sw:video         AI video generation (Veo 3.1, Pollinations)
  sw:diagrams      Mermaid diagrams following C4 Model
  sw:remotion      Programmatic video with React/Remotion

EXTEND — Customize SpecWeave
  sw:skill-gen     Generate project-specific skills from patterns
  sw:get           Clone and register repos into workspace
```

#### D. Quick Reference

```
Workflow: sw:increment → sw:do → sw:done
Autonomous: sw:increment → sw:auto (runs unattended)
Team mode: sw:increment → sw:team-lead (parallel agents)

Docs: https://spec-weave.com
```

## Rules

1. **Never say "framework"** — SpecWeave is a "spec-driven development tool"
2. **Keep output scannable** — users skim, they don't read walls of text
3. **Contextual first** — if there's an active increment, lead with that
4. **Graceful degradation** — missing data = skip that section, never error
5. **No verbose explanations** — one-liners per skill, that's it
