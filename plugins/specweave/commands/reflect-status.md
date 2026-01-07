---
name: sw:reflect-status
description: Show reflection configuration and learning statistics. Activates for reflect status, reflection status, memory status, learnings status.
---

# Reflect Status Command

**Show reflection configuration and learning statistics.**

## Usage

```bash
/sw:reflect-status
```

## Output Example

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 REFLECT: Status Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CONFIGURATION

  Reflection:      ✅ Enabled
  Auto-reflect:    ✅ On (stop hook active)
  Enabled since:   2026-01-03T10:30:00Z

  Confidence:      medium
  Max/session:     10
  Git commit:      ❌ disabled
  Git push:        ❌ disabled

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 LEARNING FOCUS - What Reflection Learns

Project Skills (.specweave/memory/):
  • general.md         12 learnings  ■■■■■■□□□□ 40%
    └─ Project conventions, file organization, tooling preferences

  • testing.md          8 learnings  ■■■■□□□□□□ 27%
    └─ Test patterns, mocking, framework usage (Vitest, Playwright)

  • api-patterns.md     5 learnings  ■■□□□□□□□□ 17%
    └─ API design, endpoint patterns, REST/GraphQL conventions

  • database.md         3 learnings  ■□□□□□□□□□ 10%
    └─ Query patterns, schema design, ORM usage, migrations

  • git.md              2 learnings  ■□□□□□□□□□  6%
    └─ Commit messages, branching, Git workflows

Global Skills (~/.specweave/memory/):
  • No global memories found (project-specific learnings only)

Total: 30 learnings across 5 categories

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 RECENT ACTIVITY

Last modified:  2026-01-05T09:15:00Z (general.md)

Recent learnings:
  • [HIGH] Button component usage → general
  • [HIGH] API error handling → api-patterns
  • [MED]  Query optimization → database
  • [MED]  Test fixture pattern → testing
  • [LOW]  Commit message format → git

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 COMMANDS

  /sw:reflect          Manual reflection now
  /sw:reflect-on       Enable auto-reflect (already on)
  /sw:reflect-off      Disable auto-reflect
  /sw:reflect-clear    Clear specific learnings

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The reflection system is actively learning from your corrections. Auto-reflection
is enabled, so learnings will be automatically captured when you end sessions.

You have 30 learnings across 5 categories with recent activity in general
project rules and API patterns.
```

## Information Displayed

| Section | Contents |
|---------|----------|
| **Configuration** | Enable status, auto-reflect status, confidence threshold, limits |
| **Learning Focus** | Visual breakdown of what each category learns (with bar charts and descriptions) |
| **Recent Activity** | Last modified file, recent learnings with confidence levels |
| **Commands** | Quick reference for reflect commands with context-aware hints |

## Key Improvements

1. **"What Reflection Learns" clarity** - Each category shows:
   - Learning count with visual bar chart (10 blocks showing %)
   - Descriptive subtitle explaining what that category captures
   - Percentage distribution across all learnings

2. **Visual distribution** - Simple ASCII bar charts make it immediately clear where most learnings are concentrated

3. **Context-aware hints** - Commands section adapts (e.g., "already on" when auto-reflect is enabled)

4. **Summary paragraph** - Plain English explanation at bottom for quick understanding

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw:reflect` | Manual reflection |
| `/sw:reflect-on` | Enable auto-reflect |
| `/sw:reflect-off` | Disable auto-reflect |

## Execution

When this command is invoked:

1. **Read reflection config** from `.specweave/state/reflect-config.json`
2. **Scan memory directories**:
   - Project: `.specweave/memory/*.md`
   - Global: `~/.specweave/memory/*.md`
3. **For each memory file**:
   - Count total learnings (lines starting with `- ` or `- ✗→✓`)
   - Get last modified timestamp
   - Calculate percentage of total learnings
4. **Generate visual bar chart** (10 blocks, filled based on percentage)
5. **Add category descriptions**:
   - `general.md` → "Project conventions, file organization, tooling preferences"
   - `testing.md` → "Test patterns, mocking, framework usage (Vitest, Playwright)"
   - `api-patterns.md` → "API design, endpoint patterns, REST/GraphQL conventions"
   - `database.md` → "Query patterns, schema design, ORM usage, migrations"
   - `git.md` → "Commit messages, branching, Git workflows"
   - `logging.md` → "Logger usage, log levels, structured logging"
   - `component-usage.md` → "UI component patterns, styling, component composition"
   - `deployment.md` → "Deploy commands, CI/CD, service configuration"
   - `security.md` → "Auth patterns, validation, secrets management"
   - `structure.md` → "File/module organization, import patterns"
6. **Extract recent learnings** (last 5, with confidence levels from [HIGH]/[MED]/[LOW] markers)
7. **Display enhanced dashboard** with all sections

## Category Description Mapping

| Category File | Description Template |
|---------------|---------------------|
| `general.md` | Project conventions, file organization, tooling preferences |
| `testing.md` | Test patterns, mocking, framework usage (Vitest, Playwright) |
| `api-patterns.md` | API design, endpoint patterns, REST/GraphQL conventions |
| `database.md` | Query patterns, schema design, ORM usage, migrations |
| `git.md` | Commit messages, branching, Git workflows |
| `logging.md` | Logger usage, log levels, structured logging |
| `component-usage.md` | UI component patterns, styling, component composition |
| `deployment.md` | Deploy commands, CI/CD, service configuration |
| `security.md` | Auth patterns, validation, secrets management |
| `structure.md` | File/module organization, import patterns |
