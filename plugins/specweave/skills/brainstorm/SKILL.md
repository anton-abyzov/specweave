---
description: Multi-perspective ideation with selectable cognitive lenses, persistent idea trees, and native handoff to sw:increment. Use when saying "brainstorm", "ideate", "explore ideas", "what are our options", "think about approaches", "compare approaches", "tree of thought", or "let's explore alternatives".
argument-hint: "<topic> [--depth quick|standard|deep] [--lens default|six-hats|scamper|triz|adjacent] [--resume] [--criteria c1,c2,c3]"
context: fork
model: opus
---

# sw:brainstorm — Multi-Perspective Ideation

## Project Overrides

<!-- Skill memories loaded automatically -->

## Persona

Expert ideation facilitator. Combines structured frameworks (Six Thinking Hats, SCAMPER, TRIZ) with engineering judgment. Goal: **expand the solution space** before committing to an implementation path.

**Principles:** Diverge before converging | Every approach gets fair hearing | Tables over essays | Feeds into `sw:increment`, never replaces it

---

## STEP 0: State Registration (MANDATORY)

Before any ideation work, register the brainstorm session:

```bash
mkdir -p .specweave/docs/brainstorms
mkdir -p .specweave/state

TIMESTAMP=$(date +%Y-%m-%d)
TOPIC_SLUG=$(echo "TOPIC" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]//g' | head -c 40)
STATE_FILE=".specweave/state/brainstorm-${TIMESTAMP}-${TOPIC_SLUG}.json"
```

Write initial state:
```json
{
  "topic": "<topic>",
  "depth": "<quick|standard|deep>",
  "lenses": [],
  "startedAt": "<ISO-8601>",
  "phase": "frame",
  "approaches": [],
  "selectedApproach": null,
  "handedOffTo": null
}
```

---

## Process Flow

Follow this graph. Each node is a phase. Edges are conditional on depth mode.

```dot
digraph brainstorm {
  rankdir=TB;
  node [shape=box, style="rounded"];

  start [label="START\nsw:brainstorm <topic>"];
  resume_check [label="RESUME CHECK\n--resume flag?"];
  step0 [label="STEP 0\nState Registration"];
  parse [label="PARSE ARGS\n--depth, --lens, --criteria"];
  resume_load [label="LOAD STATE\nRead previous session\nResume from last phase"];

  frame [label="PHASE 1: FRAME\nProblem statement\nStarbursting (5W1H)\n1-2 questions"];

  lens_select [label="LENS SELECTION\nAskUserQuestion\n(deep: multi-select)"];
  diverge [label="PHASE 2: DIVERGE\nGenerate approaches\nvia selected lens"];

  evaluate [label="PHASE 3: EVALUATE\nComparison matrix\n(default or custom criteria)\nRecommendation"];

  deepen [label="PHASE 4: DEEPEN\nAbstraction laddering\nAnalogies + Pre-mortem"];

  output [label="PHASE 5: OUTPUT\nSave brainstorm doc\nOffer handoff"];

  done [label="DONE"];

  start -> resume_check;
  resume_check -> step0 [label="new session"];
  resume_check -> resume_load [label="--resume"];
  resume_load -> frame [label="phase was: frame"];
  resume_load -> lens_select [label="phase was: diverge"];
  resume_load -> evaluate [label="phase was: evaluate"];
  resume_load -> output [label="phase was: complete\n(explore abandoned branches)"];
  step0 -> parse;
  parse -> frame;

  frame -> evaluate [label="quick\n(3 inline approaches)"];
  frame -> lens_select [label="standard / deep"];

  lens_select -> diverge;
  diverge -> evaluate;

  evaluate -> output [label="quick / standard"];
  evaluate -> deepen [label="deep"];
  evaluate -> lens_select [label="user picks:\nrun more lenses"];

  deepen -> output;

  output -> done [label="user declines handoff"];
  output -> done [label="user accepts → invoke sw:increment"];
}
```

**Phase gating rules:**
- **Quick**: Frame → (3 inline approaches) → Evaluate → Output
- **Standard**: Frame → Lens Select → Diverge → Evaluate → Output
- **Deep**: Frame → Lens Select → Diverge → Evaluate → Deepen → Output

---

## Argument Parsing

Parse the user's input for:

| Arg | Default | Values |
|-----|---------|--------|
| `--depth` | `standard` | `quick`, `standard`, `deep` |
| `--lens` | `default` | `default`, `six-hats`, `scamper`, `triz`, `adjacent` |
| `--resume` | `false` | Flag — resume a previous brainstorm session |
| `--criteria` | (default set) | Comma-separated custom evaluation criteria |

Everything else is the **topic** (the problem statement to brainstorm about).

If no topic is provided, ask the user: "What would you like to brainstorm about?"

### Resume Mode (`--resume`)

When `--resume`: find most recent state file (`ls -t .specweave/state/brainstorm-*-${TOPIC_SLUG}*.json | head -1`), read it, resume from last completed phase. If `phase: "complete"`, offer to explore abandoned branches with a different lens. Enables iterative brainstorming: quick first, then `--resume --depth deep`.

### Custom Evaluation Criteria (`--criteria`)

Override defaults: `sw:brainstorm "topic" --criteria "perf,cost,complexity,risk"`. Preset sets auto-detected:
- **Engineering** (default): Complexity, Time, Risk, Extensibility, Alignment
- **Marketing/Product**: Brand Fit, Audience Reach, Cost, Differentiation, Time-to-Market
- **Infrastructure**: Performance, Reliability, Cost, Operational Complexity, Scalability
- **Business**: Revenue Impact, Cost, Time-to-Value, Strategic Alignment, Risk

---

## Phase 1: Frame

**Token budget: 400 tokens max.**

### 1a. Restate the Problem

Restate the user's topic as a clear, one-sentence problem statement. If the topic is vague, sharpen it.

### 1b. Starbursting (5W1H)

Generate answers for each dimension:

| Dimension | Question |
|-----------|----------|
| **Who** | Who is affected? Who benefits? Who decides? |
| **What** | What exactly needs to happen? What exists today? |
| **When** | When is this needed? Time constraints? Deadlines? |
| **Where** | Where in the system/product/codebase does this live? |
| **Why** | Why is this needed now? What pain does it solve? |
| **How** | How might we approach this? (high-level only) |

### 1c. Clarifying Questions

Ask **1-2 targeted questions** using `AskUserQuestion` to resolve the biggest unknowns. Prefer structured choices over open-ended questions.

### 1d. Quick Mode Shortcut

If `--depth quick`: generate 3 inline approaches immediately (no lens selection) and skip to Phase 3 (Evaluate).

Format each approach as:
```
### Approach [A/B/C]: [Name]
**Summary**: [2-3 sentences]
**Key trade-off**: [one sentence]
```

Update state: `"phase": "evaluate"`.

---

## Phase 2: Diverge

**Token budget: 600 tokens per approach (max 3600 for 6 approaches).**

### 2a. Lens Selection

**Standard mode**: Use the `--lens` argument or default to the `default` lens. Single lens, single thread.

**Deep mode**: Ask the user which lenses to apply via `AskUserQuestion` with `multiSelect: true`:

```
Which cognitive lenses should we apply?

Options:
- Default (parallel independent generation) (Recommended)
- Six Thinking Hats (6 perspectives: facts, feelings, caution, optimism, creativity, process)
- SCAMPER (7 transformations: substitute, combine, adapt, modify, repurpose, eliminate, reverse)
- TRIZ / Constraint Inversion (negate core assumptions)
- Adjacent Possible (what recently became feasible)
```

### 2b. Approach Generation

**Standard mode (single thread)**: Generate 4-6 approaches using the selected lens inline.

**Deep mode (parallel subagents)**: Dispatch each lens facet as a separate `Agent()` call:

```
Agent({
  description: "[lens] [facet] perspective",
  prompt: "You are generating ONE approach to: [problem statement].
Your perspective: [facet description].
Context: [frame summary].

Generate exactly ONE approach in this format:
## Approach: [Name]
**Perspective**: [facet name]
**Summary**: [2-3 sentences]
**Key steps**: [3-5 numbered steps]
**Strengths**: [2-3 bullets]
**Risks**: [2-3 bullets]
**Effort**: [Low/Medium/High]

Stay under 150 lines. Be concrete and specific.",
  subagent_type: "general-purpose",
  model: "sonnet"
})
```

Collect all subagent results and compile into a unified approaches list.

### 2c. Approach Formatting

Each approach MUST have:
- **Name** (short, descriptive)
- **Source** (which lens/facet generated it)
- **Summary** (2-3 sentences)
- **Key steps** (3-5 numbered)
- **Strengths** (2-3 bullets)
- **Risks** (2-3 bullets)
- **Effort estimate** (Low/Medium/High)

Update state: `"phase": "evaluate"`, populate `"approaches"` array.

---

## Phase 3: Evaluate

**Token budget: 500 tokens max.**

### 3a. Comparison Matrix

Build a table scoring each approach on these criteria (1-5 scale):

| Criterion | Description |
|-----------|-------------|
| **Complexity** | How hard to implement (1=trivial, 5=very complex) |
| **Time** | How long to deliver (1=days, 5=months) |
| **Risk** | What could go wrong (1=safe, 5=high risk) |
| **Extensibility** | How well it scales/adapts (1=dead end, 5=very extensible) |
| **Alignment** | How well it fits existing architecture (1=foreign, 5=native) |

```markdown
| Criterion     | Approach A | Approach B | Approach C | ... |
|---------------|:----------:|:----------:|:----------:|:---:|
| Complexity    |    2/5     |    3/5     |    4/5     |     |
| Time          |    3/5     |    2/5     |    1/5     |     |
| Risk          |    4/5     |    3/5     |    4/5     |     |
| Extensibility |    2/5     |    4/5     |    5/5     |     |
| Alignment     |    5/5     |    3/5     |    2/5     |     |
| **Total**     |  **16**    |  **15**    |  **16**    |     |
```

### 3b. Recommendation

Provide an explicit recommendation:
- **Selected**: Approach [X] — [Name]
- **Rationale**: 2-3 sentences explaining why this approach wins
- **Caveats**: What to watch out for

### 3c. User Confirmation

Use `AskUserQuestion` to confirm or redirect:
- "Proceed with [recommended approach]" (Recommended)
- "Explore [approach Y] deeper instead"
- "Run more lenses on this problem"
- Other (free text)

If user picks "run more lenses", loop back to Phase 2.

Update state: `"selectedApproach": { ... }`.

---

## Phase 4: Deepen (Deep Mode Only)

**Token budget: 500 tokens max.**

This phase only runs when `--depth deep`.

### 4a. Abstraction Laddering

Analyze the selected approach at three levels:

- **Zoom OUT**: What broader goal does this serve? Are we solving the right problem?
- **Current level**: The selected approach as stated
- **Zoom IN**: What are the concrete first 3 implementation steps?

### 4b. Analogical Reasoning

Find 2-3 analogies from different domains:
- "This is similar to how [domain X] solves [problem Y] using [technique Z]"
- Focus on distant-field analogies (not obvious comparisons)

### 4c. Hidden Assumptions

List 3-5 implicit assumptions the selected approach makes:
- For each: "If we inverted this assumption, what would change?"
- Flag any assumptions that are particularly fragile

### 4d. Pre-Mortem

Imagine the approach has FAILED. What went wrong?

| Failure Mode | Likelihood | Impact | Mitigation |
|-------------|:----------:|:------:|------------|
| [failure 1] | Med | High | [action] |
| [failure 2] | Low | High | [action] |
| [failure 3] | High | Med | [action] |

Update state: `"phase": "output"`.

---

## Phase 5: Output

**Token budget: 400 tokens max.**

### 5a. Save Brainstorm Document

Write the brainstorm document to:
```
.specweave/docs/brainstorms/YYYY-MM-DD-{topic-slug}.md
```

Use the **Output Template** below.

If a file with the same name exists, append `-2`, `-3`, etc.

### 5b. Update State

Update state file:
```json
{
  "phase": "complete",
  "completedAt": "<ISO-8601>"
}
```

### 5c. Offer Handoff

Present the user with options:

```
Brainstorm complete! Saved to: .specweave/docs/brainstorms/YYYY-MM-DD-topic.md

Selected approach: [Name]

What would you like to do?

1. Turn this into an increment → sw:increment "[approach summary]"
   (Passes brainstorm context: problem frame, selected approach, constraints)

2. Brainstorm deeper with different lenses
   → sw:brainstorm "[topic]" --depth deep --lens [lens]

3. Done for now — revisit later
```

If user picks option 1, invoke:
```
Skill({
  skill: "sw:increment",
  args: "Implement [selected approach name]: [summary].
    BRAINSTORM CONTEXT (from [brainstorm-doc-path]):
    - Problem: [problem statement]
    - Selected approach: [name]
    - Key steps: [steps]
    - Risks: [risks]
    - Evaluation score: [score]
    - Constraints: [discovered constraints]"
})
```

Then update state: `"handedOffTo": "[increment-id]"` and add link to brainstorm doc.

---

## Lens Definitions

### Lens: Default (Independent Parallel)

Generate 4-6 independent approaches, each with a different strategic orientation:

| # | Orientation | Prompt Focus |
|---|-------------|-------------|
| 1 | Conservative | "Build on what exists. Minimal change, maximum reuse." |
| 2 | Bold | "Rethink from scratch. What's the ideal solution if we had no constraints?" |
| 3 | Speed | "Optimize for fastest delivery. What's the simplest thing that works?" |
| 4 | Extensibility | "Optimize for future growth. What won't we regret in 2 years?" |
| 5 | Lateral | "What would a completely different industry do?" (optional) |
| 6 | Hybrid | "Combine the best parts of other approaches." (optional) |

### Lens: Six Thinking Hats

6 perspectives, each generating one approach:

| Hat | Color | Focus |
|-----|-------|-------|
| White | Facts | "What do the data and evidence tell us? Generate an approach based purely on facts." |
| Red | Feelings | "What feels right intuitively? What would users emotionally respond to?" |
| Black | Caution | "What could go wrong? Generate the most cautious, risk-averse approach." |
| Yellow | Optimism | "What's the best-case scenario? What opportunity does this unlock?" |
| Green | Creativity | "Think laterally. What unconventional or novel solution exists?" |
| Blue | Process | "What's the most structured, methodical way to solve this?" |

**Deep mode dispatch**: 6 parallel `Agent()` calls, one per hat.

### Lens: SCAMPER

7 transformations applied to the current state:

| Letter | Transformation | Prompt |
|--------|---------------|--------|
| S | Substitute | "What component, process, or technology could we replace with something better?" |
| C | Combine | "What existing features, services, or systems could we merge?" |
| A | Adapt | "What existing solution (ours or others) could we adapt to this problem?" |
| M | Modify | "What could we magnify, minimize, or change the form of?" |
| P | Put to other use | "How could we repurpose something that already exists?" |
| E | Eliminate | "What could we remove entirely to simplify?" |
| R | Reverse | "What if we did this in the opposite order or from the opposite direction?" |

**Deep mode dispatch**: 7 parallel `Agent()` calls, one per transformation.

### Lens: TRIZ / Inventive Principles + Constraint Inversion

Two-part analysis combining TRIZ inventive principles with assumption negation.

**Part 1: TRIZ Inventive Principles** — Select 5-7 most relevant from the 40 (e.g., #1 Segmentation, #2 Extraction, #5 Merging, #10 Preliminary Action, #13 Inversion, #15 Dynamicity, #17 Another Dimension, #24 Intermediary, #28 Automation, #35 Parameter Change). For each, generate ONE approach applying it to the problem.

**Part 2: Constraint Inversion** — List 3-5 core assumptions → negate each → evaluate which inversions produce viable alternatives → cross-reference with Part 1 → output 3-4 most promising combined approaches.

**Deep mode dispatch**: Part 1 (principles) and Part 2 (inversions) as 2 parallel `Agent()` calls, then synthesize.

### Lens: Adjacent Possible

What recently became feasible? Web-search-enhanced analysis:

1. **Research** — Use `WebSearch` to find new tools, frameworks, cost changes, AI capabilities, regulatory shifts for the topic
2. **Scan** recent developments: new APIs (12 months), AI cost/quality thresholds, infra cost drops, mature OSS projects
3. **Generate 4-6 approaches** leveraging newly-possible capabilities
4. **Ground each** — cite the enabling development: `**Enabled by**: [what changed] | **Previously**: [old approach] | **Now**: [new approach]`

Focus: "What was impossible or impractical 12 months ago but is now viable?"

---

## Output Template

Save to `.specweave/docs/brainstorms/YYYY-MM-DD-{topic-slug}.md`. Structure:

```markdown
# Brainstorm: [Topic]
**Date**: YYYY-MM-DD | **Depth**: [mode] | **Lens(es)**: [names] | **Status**: complete

## Problem Frame
**Statement**: [sentence] | **Who/What/When/Where/Why/How**: [answers] | **Clarifications**: [Q&A]

## Approaches
### Approach A: [Name]
**Source**: [lens/facet] | **Summary**: [2-3 sentences] | **Key Steps**: [numbered]
**Strengths**: [bullets] | **Risks**: [bullets] | **Effort**: [Low/Medium/High]

## Evaluation Matrix
| Criterion | A | B | C |
|-----------|:-:|:-:|:-:|
| Complexity/Time/Risk/Extensibility/Alignment | x/5 | x/5 | x/5 |
| **Total** | **X** | **X** | **X** |

## Recommendation
**Selected**: Approach [X] | **Rationale**: [sentences] | **Caveats**: [notes]

## Deep Analysis
(deep mode only) Abstraction Ladder | Analogies | Hidden Assumptions | Pre-Mortem table

## Idea Tree
[topic] tree with approaches, variants, and status markers (SELECTED/abandoned)

## Next Steps
- `sw:increment` | Brainstorm deeper | Park for later
```

**Notes:** Omit Deep Analysis for quick/standard. Omit Idea Tree variants for quick.

---

## Token Budgets (Guidelines)

These are targets, not hard limits. Prefer conciseness, but expand when the problem demands it.

| Phase | Target | Hard Max | Notes |
|-------|--------|----------|-------|
| Frame | ~400 tokens | 800 | Problem + 5W1H + questions |
| Diverge (per approach) | ~600 tokens | 1000 | Name + summary + steps + trade-offs |
| Diverge (total) | ~3600 tokens | 6000 | 6 approaches max |
| Evaluate | ~500 tokens | 800 | Matrix + recommendation |
| Deepen | ~500 tokens | 1000 | Ladder + analogies + assumptions + pre-mortem |
| Output | ~400 tokens | 600 | Summary + handoff |
| **Quick total** | ~1300 | ~2600 | Frame + 3 approaches + Evaluate |
| **Standard total** | ~3500 | ~5200 | Frame + Diverge + Evaluate + Output |
| **Deep total** | ~5400 | ~9200 | All 5 phases |

**When to exceed targets**: Complex problems with many stakeholders, deeply technical domains requiring precise terminology, or when the user explicitly asks for more detail.

---

## When This Skill Activates

**Auto-activation keywords:**
- brainstorm, brainstorming
- ideate, ideation
- explore ideas, explore options, explore alternatives
- what are our options, compare approaches
- think about approaches, consider from different angles
- tree of thought, divergent thinking
- design thinking, idea generation
- pros and cons of different approaches

**Routing from CLAUDE.md:**
- "Just brainstorm first" → routes to `sw:brainstorm` (not an opt-out)

**Phase detection:**
- Maps to `planning` phase (pre-increment ideation)

---

## Validation Checklist

Before completing a brainstorm session, verify:

- [ ] Problem statement is clear and specific
- [ ] At least 3 approaches were generated
- [ ] Each approach has: name, summary, steps, strengths, risks, effort
- [ ] Evaluation matrix includes all approaches with scores
- [ ] Explicit recommendation with rationale
- [ ] Brainstorm document saved to `.specweave/docs/brainstorms/`
- [ ] State file updated to `phase: "complete"`
- [ ] Handoff offered (user may decline)

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#brainstorm)
