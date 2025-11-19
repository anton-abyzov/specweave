# Simulated Progressive Disclosure for Non-Claude Tools

**Date**: 2025-11-15
**Context**: Non-Claude tools (Cursor, Copilot, etc.) cannot load files on-demand
**Solution**: Teach AI tools to navigate large AGENTS.md file efficiently

---

## The Problem

### Claude Code (Real Progressive Disclosure)
```
Session Start:
1. Load CLAUDE.md (short, essential info)
2. Load SKILLS-INDEX.md (skill summaries)
3. When task matches keywords → Load full SKILL.md
4. When command invoked → Load command file
5. When agent needed → Load AGENT.md

Result: Only load what's needed, when needed
Token efficiency: 90%+
```

### Non-Claude Tools (NO Progressive Disclosure)
```
Session Start:
1. Load AGENTS.md (ENTIRE FILE, 1965 lines)
2. Everything in context immediately
3. Cannot load additional files on-demand
4. Cannot auto-activate skills

Result: Everything loaded upfront
Token efficiency: 0% (all or nothing)
```

---

## The Critical Insight

**We CANNOT reduce AGENTS.md size** because:
- ❌ Non-Claude tools can't load files on-demand
- ❌ No skills auto-activation
- ❌ No command discovery mechanism
- ❌ All knowledge must be in AGENTS.md upfront

**But we CAN teach AI tools to navigate it efficiently:**
- ✅ Add section index for quick navigation
- ✅ Add "How to Use This File" instructions
- ✅ Add search patterns for finding info
- ✅ Structure content hierarchically
- ✅ Add quick reference cards at top

---

## Simulated Progressive Disclosure Pattern

### Core Principle
**Teach the AI to use AGENTS.md like a reference manual, not a script to execute.**

### Implementation

#### 1. Add "How to Use This File" Section (Top of AGENTS.md)

```markdown
---
**🚨 CRITICAL: How to Use This File (Non-Claude Code Tools)**

You're using Cursor, GitHub Copilot, or another AI tool that does NOT support progressive disclosure.
This means this ENTIRE file is loaded into your context right now - all 2000+ lines.

**BUT** - you don't need to process it all at once!

**Think of this file as a REFERENCE MANUAL:**
- 📖 Skim section headers at session start (don't read details)
- 🔍 Search for relevant sections when needed (Ctrl+F)
- ✅ Process ONLY the section relevant to current task
- ♻️ Ignore sections that don't apply right now

**Navigation Pattern**:
1. User requests task → Search for relevant section
2. Example: "sync to GitHub" → Jump to "GitHub Sync Workflow"
3. Read ONLY that section → Execute workflow
4. Move on to next task

**You have access to ALL the knowledge - use it wisely!**
---
```

#### 2. Add Section Index (Navigation Menu)

```markdown
## 📑 SECTION INDEX (Your Navigation Menu)

**Use Ctrl+F to jump to sections quickly!**

### Essential (Read First)
- [🎯 Essential Knowledge](#essential-knowledge) ← Start here every session
- [📋 Quick Reference Cards](#quick-reference-cards) ← Common commands
- [🚨 Critical Rules](#critical-rules) ← Never violate these

### Commands (When User Requests Action)
- [/specweave:increment](#command-increment) - Plan new feature
- [/specweave:do](#command-do) - Execute tasks
- [/specweave:done](#command-done) - Close increment
- [/specweave:validate](#command-validate) - Quality check
- [/specweave:github:sync](#command-github-sync) - Sync to GitHub
- [/specweave:jira:sync](#command-jira-sync) - Sync to Jira
- [... see full command list](#command-reference)

### Skills (When You Need Specific Capability)
- [increment-planner](#skill-increment-planner) - Plan features
- [github-sync](#skill-github-sync) - GitHub integration
- [jira-sync](#skill-jira-sync) - Jira integration
- [... see full skill list](#skills-guide)

### Agents (When You Need Role Perspective)
- [PM (Product Manager)](#agent-pm) - Requirements gathering
- [Architect](#agent-architect) - System design
- [Tech Lead](#agent-tech-lead) - Code review
- [... see full agent list](#agents-guide)

### Workflows (Step-by-Step Procedures)
- [Daily Development Workflow](#workflow-daily-development)
- [Feature Increment Lifecycle](#workflow-increment-lifecycle)
- [External Tracker Sync](#workflow-external-sync)
- [... see full workflow list](#workflows)

### Troubleshooting (When Stuck)
- [Skills Not Working](#troubleshoot-skills)
- [Commands Not Found](#troubleshoot-commands)
- [Sync Issues](#troubleshoot-sync)
- [... see full troubleshooting](#troubleshooting)

---
**Remember**: You don't need to read EVERYTHING - just jump to relevant sections!
---
```

#### 3. Add Search Patterns Section

```markdown
## 🔍 How to Find Information Quickly

**Use these search patterns in Ctrl+F:**

| What You Need | Search For | Jump To |
|---------------|------------|---------|
| Command syntax | `#command-{name}` | `/specweave:increment` → Search `#command-increment` |
| Skill workflow | `#skill-{name}` | "github sync" → Search `#skill-github-sync` |
| Agent role | `#agent-{name}` | "architect" → Search `#agent-architect` |
| Workflow steps | `#workflow-{name}` | "daily workflow" → Search `#workflow-daily-development` |
| Troubleshooting | `#troubleshoot-{topic}` | "skills not working" → Search `#troubleshoot-skills` |

**Examples**:
```
User: "How do I sync to GitHub?"
You: Search "github-sync" → Find "#workflow-github-sync" → Read that section only

User: "Create new increment"
You: Search "increment" → Find "#command-increment" → Read that section only

User: "What's the PM role?"
You: Search "agent-pm" → Find "#agent-pm" → Read that section only
```

**This way, you navigate a 2000-line file as efficiently as separate files!**
```

#### 4. Hierarchical Section Structure

```markdown
## 🎯 ESSENTIAL KNOWLEDGE {#essential-knowledge}

[Core content - always read at session start]

---

## 📋 QUICK REFERENCE CARDS {#quick-reference-cards}

[Visual cheat sheets for common tasks]

---

## 🚀 COMMAND REFERENCE {#command-reference}

### /specweave:increment {#command-increment}
**When to use**: Planning new feature
**Workflow**: [details...]

### /specweave:do {#command-do}
**When to use**: Executing tasks
**Workflow**: [details...]

[... all commands ...]

---

## 🎓 SKILLS GUIDE {#skills-guide}

### increment-planner {#skill-increment-planner}
**Activates for**: feature planning, create increment
**Workflow**: [details...]

### github-sync {#skill-github-sync}
**Activates for**: GitHub sync, external tracker
**Workflow**: [details...]

[... all skills ...]

---

## 👔 AGENTS GUIDE {#agents-guide}

### PM (Product Manager) {#agent-pm}
**Role**: Requirements gathering, user stories
**When to adopt**: [details...]

### Architect {#agent-architect}
**Role**: System design, technical planning
**When to adopt**: [details...]

[... all agents ...]

---

## 📖 WORKFLOWS {#workflows}

### Daily Development Workflow {#workflow-daily-development}
[Step-by-step...]

### Feature Increment Lifecycle {#workflow-increment-lifecycle}
[Step-by-step...]

[... all workflows ...]

---

## 🆘 TROUBLESHOOTING {#troubleshooting}

### Skills Not Working {#troubleshoot-skills}
**Symptoms**: [...]
**Solutions**: [...]

### Commands Not Found {#troubleshoot-commands}
**Symptoms**: [...]
**Solutions**: [...]

[... all troubleshooting ...]
```

---

## Benefits of This Approach

### For AI Tools (Cursor, Copilot, etc.)
- ✅ **Clear navigation pattern** (search, jump, read)
- ✅ **Efficient processing** (only read relevant sections)
- ✅ **Consistent structure** (predictable locations)
- ✅ **Quick lookup** (Ctrl+F patterns)

### For Users
- ✅ **Same capabilities** as Claude Code (all knowledge available)
- ✅ **Better organization** (clear section index)
- ✅ **Self-service** (can read AGENTS.md themselves)
- ✅ **Comprehensive** (nothing missing)

### For SpecWeave
- ✅ **Multi-tool support** (works everywhere)
- ✅ **Maintainable** (one comprehensive file)
- ✅ **Testable** (can validate completeness)
- ✅ **Documented** (clear structure)

---

## Comparison: Claude Code vs Non-Claude Tools

| Aspect | Claude Code (CLAUDE.md) | Non-Claude (AGENTS.md) |
|--------|-------------------------|------------------------|
| **File Size** | ~400 lines (short) | ~2000 lines (comprehensive) |
| **Loading** | Progressive (on-demand) | All at once (session start) |
| **Skills** | Auto-activate | Manual navigation |
| **Commands** | Slash syntax | Read workflow manually |
| **Hooks** | Automatic | Manual sync |
| **Navigation** | Files → load when needed | Section index → search |
| **Efficiency** | Token-efficient | Context-efficient |

Both achieve the same goal, just with different mechanisms!

---

## Implementation Checklist

### AGENTS.md.template Enhancements
- [x] Add "How to Use This File" section at top
- [x] Add comprehensive section index
- [x] Add search patterns guide
- [x] Add quick reference cards
- [x] Add hierarchical structure with anchor links
- [x] Add troubleshooting section
- [x] Keep comprehensive (2000+ lines is OK!)
- [x] Add navigation examples

### CLAUDE.md.template Enhancements
- [ ] Add quick reference cards
- [ ] Add troubleshooting section
- [ ] Keep short (~400 lines)
- [ ] Emphasize progressive disclosure
- [ ] Link to living docs for details

### Both Templates
- [ ] Add version markers
- [ ] Add multi-tool callouts
- [ ] Add visual hierarchy
- [ ] Validate rendering

---

## Example: Simulated Progressive Disclosure in Action

**Scenario**: User using Cursor asks to sync to GitHub

**Session Start** (AI reads AGENTS.md):
```
AI: *Entire AGENTS.md loaded (2000 lines in context)*
AI: *Reads "How to Use This File" section*
AI: "Understood - use this as reference manual, search for sections"
AI: *Skims section index*
AI: "Available sections noted: commands, skills, agents, workflows, troubleshooting"
AI: *Ready for user request*
```

**User Request**:
```
User: "Sync this increment to GitHub"
```

**AI Response** (simulated progressive disclosure):
```
AI: *User wants GitHub sync*
AI: *Search for "github" in section index*
AI: *Found: #command-github-sync, #skill-github-sync, #workflow-github-sync*
AI: *Jump to #workflow-github-sync section*
AI: *Read ONLY that section (50 lines)*
AI: "I'll sync increment to GitHub using the workflow from AGENTS.md section..."
AI: *Executes workflow from that section*
AI: *Ignores other 1950 lines - not relevant right now*
```

**Result**:
- ✅ Efficient processing (read only what's needed)
- ✅ Same outcome as Claude Code
- ✅ No progressive disclosure needed!

---

## Conclusion

**We CAN'T reduce AGENTS.md size** - it must contain everything.

**But we CAN teach AI tools to navigate it efficiently** through:
1. Clear "How to Use This File" instructions
2. Comprehensive section index
3. Search patterns for quick lookup
4. Hierarchical structure with anchors
5. Quick reference cards at top

This **simulates progressive disclosure** without requiring tool support!

**The key insight**: Progressive disclosure isn't about file size - it's about **processing efficiency**.

- Claude Code: Achieves via on-demand file loading
- Non-Claude tools: Achieves via smart navigation of single file

**Both work - just different mechanisms!** 🎯

---

**Generated by**: Ultrathink Analysis Session
**Date**: 2025-11-15
**Implementation**: Ready to proceed
