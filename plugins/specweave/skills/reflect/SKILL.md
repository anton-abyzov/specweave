---
name: reflect
description: Self-improving AI memory system that persists learnings across sessions in CLAUDE.md. Use when capturing corrections, remembering user preferences, or extracting patterns from successful implementations. Enables continual learning without starting from zero each conversation.
---

# Self-Improving Skills (Reflect)

## Overview

The Reflect system enables **continual learning across sessions**. Instead of starting from zero every conversation, Claude learns from corrections, successful patterns, and user preferences - persisting knowledge in **CLAUDE.md's Skill Memories section**.

```
Session 1: User corrects workflow → Reflect captures learning → saves to CLAUDE.md
Session 2: Claude uses correct approach without being reminded
Session 3+: Knowledge compounds, Claude gets smarter over time
```

---

## Architecture

### Single Source of Truth: CLAUDE.md

All learnings are stored in your project's `CLAUDE.md` file under the `## Skill Memories` section:

```markdown
## Skill Memories

<!-- Auto-captured by SpecWeave reflect. Edit or delete as needed. -->

### Devops
- **2026-01-29**: LSP requires ENABLE_LSP_TOOL=1 env var + boostvolt/claude-code-lsps marketplace

### Frontend
- **2026-01-28**: Use shadcn/ui Button component, not custom styles
- **2026-01-27**: Prefer Vercel over Cloudflare for this Remix project

### General
- **2026-01-29**: Always check for credentials FIRST before using CLI tools
```

**Why CLAUDE.md?**
- Single file to manage (no scattered MEMORY.md files)
- Version controlled with your project
- Easy to edit, review, or delete learnings
- Automatically loaded by Claude Code

---

## What It Learns

### ✅ DOES Remember

| Category | Examples |
|----------|----------|
| **Skill-specific preferences** | "frontend: Use shadcn/ui Button component" |
| **Workflow preferences** | "general: User prefers /sw:auto to run tests first" |
| **Project conventions** | "devops: Use pnpm instead of npm for this monorepo" |
| **Tool configurations** | "testing: Run Vitest with --pool=forks for this project" |

### ❌ Does NOT Remember

| Category | Why Not |
|----------|---------|
| Generic coding advice | "use TypeScript strict mode" - not SpecWeave-specific |
| One-time fixes | Won't recur, clutters memory |
| Implementation details | Unrelated to SpecWeave workflow |

---

## ⚠️ CRITICAL: Learning Extraction Rules

**This section is MANDATORY for Claude to follow when extracting learnings.**

### The Golden Rule

**NEVER store user input verbatim. ALWAYS synthesize into actionable rules.**

### What Makes a Good Learning

| Good Learning | Bad Learning | Why Bad |
|--------------|--------------|---------|
| `Use vi.fn() for mocks in Vitest, never jest.fn()` | `use vi.fn()` | Too terse, missing context |
| `Always specify npm registry to avoid auth errors` | `Always specify registry to avoid ~/` | Truncated, loses meaning |
| `Voice dictation mangles slash commands - type manually` | `always command not recognized` | Raw symptom, not the learning |

### Learning Quality Checklist (MUST PASS ALL)

Before storing ANY learning, verify:

1. **✅ Is it a complete sentence?** Not truncated, not a fragment
2. **✅ Is it actionable?** Contains DO/DON'T/USE/AVOID/PREFER
3. **✅ Is it specific?** Names tools, patterns, files, or concepts
4. **✅ Is it understandable standalone?** Someone reading it later would understand
5. **✅ Is it NOT a question?** Questions are never learnings
6. **✅ Does it have context?** WHY this rule exists, not just WHAT

### What to REJECT (Never Store)

1. **Questions** - `"Where should I deploy?"` → NOT a learning
2. **Fragments** - `"eplicilty how to g"` → Truncated garbage
3. **Raw symptoms** - `"always command not recognized"` → No explanation
4. **Duplicates** - Same rule phrased differently
5. **Temporary context** - `"for this PR"`, `"just this time"`
6. **Typos/gibberish** - `"user pojrect"`, `"promp"`

---

## Skill Categories

Learnings are routed to these known skills:

| Skill | What it covers |
|-------|---------------|
| `mobile` | React Native, Expo, iOS, Android |
| `frontend` | React, Vue, Next.js, UI components |
| `backend` | APIs, Node.js, .NET, databases |
| `testing` | Vitest, Jest, Playwright, E2E |
| `infrastructure` | Terraform, AWS, Azure, GCP |
| `kubernetes` | K8s, EKS, AKS, GKE, Helm |
| `architect` | System design, ADRs, patterns |
| `tech-lead` | Code review, best practices |
| `qa-lead` | Test strategy, quality gates |
| `security` | Auth, OWASP, vulnerabilities |
| `docs-writer` | Documentation, READMEs |
| `performance` | Optimization, profiling |
| `tdd-orchestrator` | TDD workflow, red-green-refactor |
| `pm` | Product management, specs |
| `devops` | CI/CD, Docker, deployments |
| `payments` | Stripe, payment processing |
| `ml` | Machine learning, AI |
| `github` | GitHub sync, issues, PRs |
| `jira` | JIRA sync, tickets |
| `ado` | Azure DevOps sync |
| `general` | Fallback for general SpecWeave learnings |

---

## Usage

### Manual Reflection

After completing work, manually trigger reflection:

```bash
# Reflect on current session (auto-detects skills)
/sw:reflect

# Reflect with focus prompt
/sw:reflect "Focus on the deployment patterns we discussed"
```

### Automatic Reflection

Enable auto-reflection on session end:

```bash
# Enable automatic reflection (via stop hook)
/sw:reflect-on

# Disable automatic reflection
/sw:reflect-off

# Check reflection status
/sw:reflect-status
```

When enabled, the stop hook automatically:
1. Analyzes the session transcript
2. Extracts SpecWeave-specific learnings via LLM
3. Routes to appropriate skill category
4. Updates CLAUDE.md Skill Memories section

---

## Configuration

In `.specweave/config.json`:

```json
{
  "reflect": {
    "enabled": true,
    "model": "haiku",
    "maxLearningsPerSession": 3
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Master switch for reflection |
| `model` | `"haiku"` | LLM model for extraction |
| `maxLearningsPerSession` | `3` | Limit per session |

**Disable reflection**: Set `"reflect": { "enabled": false }`

---

## How It Works

### Extraction Flow

```
1. Session ends or /sw:reflect invoked
        ↓
2. Session transcript captured
        ↓
3. LLM analyzes for SpecWeave learnings
        ↓
4. Learnings validated (quality gates)
        ↓
5. Deduplicated against existing memory
        ↓
6. Written to CLAUDE.md Skill Memories
```

### LLM Extraction

Uses Claude Haiku (fast, cheap) to extract learnings:

```typescript
interface SkillLearning {
  skill: string;    // e.g., "frontend", "devops", "general"
  learning: string; // The actual learning content
}
```

### Deduplication

Learnings are considered duplicates if:
- Content has >50% substring overlap with existing
- Same skill and semantically identical

---

## Best Practices

### For Corrections (High Signal)

**Good corrections** (will be captured):
```
"Never use that approach. Always use X because..."
"Don't create custom components. We have a design system..."
"Wrong pattern. The correct way is..."
```

**Weak corrections** (may be ignored):
```
"Hmm, maybe try something else?"
"That doesn't look quite right"
```

### For Approvals (Medium Signal)

**Strong approval** (will be captured):
```
"Perfect! That's exactly how we do it."
"This is the right pattern, well done."
```

**Neutral** (won't be captured):
```
"OK"
"Sure"
"Proceed"
```

---

## Managing Learnings

### View Current Learnings

Check your CLAUDE.md file's `## Skill Memories` section.

### Edit Learnings

Simply edit CLAUDE.md directly. Add, modify, or delete any entry.

### Clear Learnings

```bash
# Clear all learnings
/sw:reflect-clear

# Clear specific skill
/sw:reflect-clear --skill frontend
```

### Status Check

```bash
/sw:reflect-status
```

Shows:
- Whether reflection is enabled
- Recent learnings
- Learning counts per skill

---

## Troubleshooting

### Learnings Not Persisting

1. Check reflection is enabled: `/sw:reflect-status`
2. Verify CLAUDE.md exists in project root
3. Check config: `cat .specweave/config.json | grep reflect`
4. Review logs: `ls .specweave/logs/reflect/`

### Wrong Skill Detection

The LLM routes learnings based on content. If misrouted:
- Edit CLAUDE.md directly to move the learning
- Use specific language: "For frontend development..."

### Garbage Learnings

If you see truncated or nonsensical entries:
1. Delete them from CLAUDE.md
2. They were likely from voice dictation or partial input

---

## Privacy & Security

- Memory contains only **patterns and learnings**, not raw conversation
- No sensitive data (credentials, keys) is ever stored
- CLAUDE.md is in your repo - gitignore if needed
- Clear commands available to remove learnings

---

## Integration with Auto Mode

When `/sw:auto` runs with reflection enabled:

```
1. Start auto session
        ↓
2. Claude executes tasks
        ↓
3. Session completes
        ↓
4. Stop hook triggers
        ↓
5. Reflect analyzes transcript
        ↓
6. CLAUDE.md updated
        ↓
7. Session ends with summary
```

---

## Summary

Reflect enables **correct once, apply everywhere**:

1. Make correction during session
2. Reflect captures and routes to skill
3. Future sessions load from CLAUDE.md
4. Claude applies learned patterns automatically

**No embeddings. No vector databases.** Just your CLAUDE.md file with organized learnings.

## Project-Specific Learnings

**Before starting work, check for project-specific learnings:**

```bash
# Check if skill memory exists for this skill
cat .specweave/skill-memories/reflect.md 2>/dev/null || echo "No project learnings yet"
```

Project learnings are automatically captured by the reflection system when corrections or patterns are identified during development. These learnings help you understand project-specific conventions and past decisions.

