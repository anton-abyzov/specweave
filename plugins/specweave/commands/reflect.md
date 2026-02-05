---
description: Analyze current session and extract learnings to CLAUDE.md Skill Memories. Enables self-improving AI that learns from corrections and patterns. Activates for reflect, remember, learn from session, extract learnings.
---

# Reflect Command

**Analyze session and extract learnings to CLAUDE.md Skill Memories section.**

## Usage

```bash
# Reflect on current session (analyzes all signals)
/sw:reflect

# Reflect with focus prompt
/sw:reflect "Focus on the API patterns we discussed"
```

## How It Works

### Step 1: Signal Detection

Scans conversation for learnable signals:

**Corrections (High Confidence)**
```
User: "No, don't use that button. Use our <Button variant='primary'>"
      → Learning: Always use Button component with variant='primary' from design system
      → Skill: frontend
```

**Problem Reports (High Confidence)**
```
User: "Voice control doesn't recognize commands"
      → Learning: Voice dictation mangles slash commands - type manually or paste
      → Skill: general
```

**Approvals (Medium Confidence)**
```
User: "Perfect! That's exactly how our API should look."
      → Learning: Continue using API pattern with status, data, error fields
      → Skill: backend
```

### Step 2: LLM Extraction

Uses Claude Haiku to extract SpecWeave-specific learnings:

```typescript
interface SkillLearning {
  skill: string;    // e.g., "frontend", "devops", "general"
  learning: string; // The actual learning content
}
```

### Step 3: Write to CLAUDE.md

Updates the `## Skill Memories` section in CLAUDE.md:

```markdown
## Skill Memories

### Frontend
- **2026-01-05**: Always use Button component with variant='primary' from design system

### Backend
- **2026-01-05**: Return 404 for missing resources (not 500)
```

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

## Skill Categories

Learnings are routed to these skills:

| Skill | What it covers |
|-------|---------------|
| `mobile` | React Native, Expo, iOS, Android |
| `frontend` | React, Vue, Next.js, UI components |
| `backend` | APIs, Node.js, .NET, databases |
| `testing` | Vitest, Jest, Playwright, E2E |
| `devops` | CI/CD, Docker, deployments |
| `architect` | System design, ADRs, patterns |
| `general` | Fallback for general SpecWeave learnings |

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw:reflect-on` | Enable automatic reflection on session end |
| `/sw:reflect-off` | Disable automatic reflection |
| `/sw:reflect-status` | Show reflection configuration |
| `/sw:reflect-clear` | Remove specific learnings |

## Quality Rules

**NEVER store user input verbatim. ALWAYS synthesize into actionable rules.**

### Learning Quality Checklist

Before storing ANY learning:

| Check | Requirement | Example Failure |
|-------|-------------|-----------------|
| Complete | Full sentence, not truncated | `"eplicilty how to g"` |
| Actionable | Contains DO/DON'T/USE/AVOID | `"Where should I deploy?"` |
| Specific | Names tools, patterns, concepts | `"always command not recognized"` |
| Standalone | Understandable without context | `"user pojrect"` |
| Not a Question | Must be a statement | `"Where should I deploy?"` |

### What to REJECT (Never Store)

1. **Questions** - Not learnings
2. **Fragments** - Truncated mid-sentence
3. **Raw complaints** - Without solution/workaround
4. **Gibberish/typos** - `"pojrect"`, `"promp"`
5. **Duplicates** - Already exists in memory

### Self-Check Before Storing

> "If I read this learning in 6 months with no context, would it help me?"
>
> If NO → Don't store it.
> If MAYBE → Improve it until YES.
> If YES → Store it.
