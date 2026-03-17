---
title: "Skill Studio"
description: "Local browser-based IDE for developing, testing, and benchmarking AI skills"
keywords: [skill studio, vskill, IDE, testing, benchmarking, BDD, skill development, eval]
sidebar_position: 4
---

# Skill Studio

Skill Studio is a local browser-based IDE for skill development. Test your skills with BDD assertions, benchmark them against baselines, compare across LLM models, and iterate — all without leaving your machine.

:::tip Quick Start
```bash
npx vskill studio
```
Opens Skill Studio in your browser at `http://localhost:3077`.
:::

---

## Launching Skill Studio

```bash
# Default — scans current directory for skills
npx vskill studio

# Custom root directory
npx vskill studio --root ./my-skills

# Custom port
npx vskill studio --port 3080
```

Skill Studio starts a local Vite-based server and opens your browser automatically. It discovers all `SKILL.md` files under the root directory and organizes them by plugin.

---

## The Interface

Skill Studio uses a **master-detail split-pane layout**:

```
┌─────────────────┬──────────────────────────────────────┐
│                  │  Editor │ Tests │ Run │ Act │ ...    │
│   Skill List     │─────────────────────────────────────│
│                  │                                      │
│  ▸ frontend      │   Workspace Panel Content            │
│    nextjs        │                                      │
│    react         │   (changes based on selected tab)    │
│  ▸ backend       │                                      │
│    nodejs        │                                      │
│  ▸ sw            │                                      │
│    increment     │                                      │
│                  │                                      │
│  [Search...]     │                                      │
└─────────────────┴──────────────────────────────────────┘
```

**Left panel**: Skill browser with search, grouped by plugin. Click a skill to open it in the workspace.

**Right panel**: Six tabbed workspace panels — each gives you a different lens on the selected skill.

---

## The Six Workspace Panels

### 1. Editor

View and edit the selected skill's `SKILL.md` content. The editor parses YAML frontmatter separately from the markdown body.

- **Save**: `Ctrl+S` (or `Cmd+S` on macOS)
- **Dirty state indicator**: Shows unsaved changes
- Frontmatter fields (description, allowed-tools, model, etc.) are displayed with their current values

### 2. Tests

Manage BDD test cases for the skill. Each test case lives in `evals/evals.json` alongside the skill.

A test case has:
- **Prompt**: The user message that should trigger the skill
- **Assertions**: Expected behaviors (string matches, regex patterns, JSON schema validation)
- **Tags**: Categories for filtering (e.g., "happy-path", "edge-case")

Add, edit, and remove test cases directly in the UI. Tests are the foundation for benchmarking and regression detection.

### 3. Run

Execute test cases against the skill and see results in real time.

**Three run modes**:

| Mode | What It Tests | Use When |
|------|--------------|----------|
| **Benchmark** | Skill active | Normal testing — does the skill produce correct output? |
| **Baseline** | Skill disabled | Measuring what the LLM does *without* your skill |
| **Comparison** | Both side-by-side | Proving your skill adds value over the base model |

Each test case shows status: idle → queued → running → pass/fail. Results stream in real-time via SSE.

### 4. Activation

Test whether your skill's `description` field triggers auto-activation correctly.

Paste sample user prompts and see if the skill would activate. This is critical for tuning activation keywords — a skill that never activates is useless, and one that activates too aggressively interferes with other skills.

### 5. History

View quality trends over time with charts showing pass rates across runs.

- **Trend charts**: See whether skill quality is improving or regressing
- **Regression detection**: Highlights runs where pass rate dropped
- **Per-eval drill-down**: Click a data point to see individual test case results

### 6. Dependencies

View MCP (Model Context Protocol) server dependencies declared by the skill. Shows which external tools the skill expects to have available.

---

## A/B Benchmarking

One of Skill Studio's most powerful features is A/B testing your skills.

### Skill vs Baseline

Run the same test suite with the skill enabled (benchmark) and disabled (baseline), then compare pass rates:

```
Benchmark (with skill):  18/20 tests pass (90%)
Baseline (without skill): 11/20 tests pass (55%)
                          ─────────────────
Skill uplift:            +35% improvement
```

This proves your skill adds measurable value.

### Model Comparison

Test the same skill against different LLMs to understand model-specific behavior:

- **Claude** (Opus, Sonnet, Haiku)
- **GPT** (GPT-4o, GPT-4.1)
- **Gemini** (Pro, Flash)
- **Open models** (Llama, Mistral, DeepSeek)

The model selector lets you switch models for any run. Compare results side-by-side to identify model-specific failures or regressions.

---

## Skill Improvement Workflow

Skill Studio includes an AI-assisted improvement loop:

1. **Run tests** — identify failing assertions
2. **Analyze failures** — the improve panel suggests changes to `SKILL.md` based on what failed
3. **Apply suggestions** — one-click applies the recommended edits
4. **Re-run tests** — verify the changes fixed the failures
5. **Repeat** — iterate until all assertions pass

This tight feedback loop makes it fast to develop high-quality skills.

---

## Creating a New Skill

Create skills directly within Skill Studio:

1. Click the **"+ New Skill"** button in the left panel
2. Choose a plugin to house the skill (or create standalone)
3. Write the `SKILL.md` content in the Editor panel
4. Switch to Tests and add test cases
5. Run tests to validate

You can also initialize evals from the CLI:

```bash
# Initialize eval scaffolding for a skill
npx vskill eval init frontend/nextjs

# Generate test cases for all skills in a directory
npx vskill eval generate-all --root ./plugins
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+1` | Switch to Editor panel |
| `Ctrl+2` | Switch to Tests panel |
| `Ctrl+3` | Switch to Run panel |
| `Ctrl+4` | Switch to Activation panel |
| `Ctrl+5` | Switch to History panel |
| `Ctrl+6` | Switch to Dependencies panel |
| `Ctrl+S` | Save current file |

---

## CLI Commands

Skill Studio wraps the `vskill eval` subsystem. These commands work from the terminal:

| Command | Description |
|---------|-------------|
| `vskill studio` | Launch Skill Studio UI (recommended) |
| `vskill eval serve` | Start the eval server (same as `vskill studio`) |
| `vskill eval init <plugin/skill>` | Initialize eval scaffolding for a skill |
| `vskill eval run <plugin/skill>` | Run evals from the command line (headless) |
| `vskill eval coverage` | Show eval coverage across all skills |
| `vskill eval generate-all` | Generate test cases for all skills |

---

## Architecture

Skill Studio runs **100% locally** — no cloud dependency, no data leaves your machine.

- **Frontend**: React 19 + Vite 6 + Tailwind CSS v4
- **Backend**: Node.js HTTP server with SSE for real-time streaming
- **Port**: Default 3077 (deterministic allocation from hash, range 3077-3177)
- **Discovery**: Recursively scans the root directory for `SKILL.md` files
- **Storage**: Test cases stored in `evals/evals.json` alongside each skill

---

## Next Steps

- **[Installing Skills](/docs/skills/installation)** — Find and install skills from the registry or GitHub
- **[vskill CLI Reference](/docs/skills/vskill-cli)** — Complete command reference
- **[Extensible Skills Standard](/docs/skills/extensible/)** — Make skills customizable with DCI and skill memories
- **[Development Guidelines](/docs/skills/extensible/skill-development-guidelines)** — Best practices for writing skills
- **[verified-skill.com](https://verified-skill.com)** — Submit your skills for verification
