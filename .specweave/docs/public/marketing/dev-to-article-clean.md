---
title: "Claude Code Hook Limitations: No Skill Invocation & Lazy Plugin Loading (And How I Solved It)"
published: true
description: "Hooks can't invoke skills. Here's the solution that enables lazy plugin loading and deterministic AI workflows."
tags: claudecode, ai, webdev, productivity
cover_image: https://spec-weave.com/img/specweave-social-card.jpg
---

# Claude Code Hook Limitations: No Skill Invocation & Lazy Plugin Loading

## The Discovery

I've spent months building [SpecWeave](https://spec-weave.com), an AI coding framework on top of Claude Code. Along the way, I hit a limitation that affects advanced workflows.

**Claude Code hooks cannot invoke skills directly.**

Claude Code is beautifully built around the terminal - you can call any CLI command from hooks or skills, which is powerful. But there's no `type: "skill"` in hook configuration.

## What Hooks Can Do

Claude Code hooks are powerful automation points:

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "hooks": [{
        "type": "command",
        "command": "./my-script.sh"
      }]
    }]
  }
}
```

You can run bash commands. You can use `type: "prompt"` for LLM-based decisions (but only for Stop/SubagentStop hooks).

## What Hooks Can't Do

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "hooks": [{
        "type": "skill",
        "skill": "my-router",
        "arguments": "$PROMPT"
      }]
    }]
  }
}
```

There's no `type: "skill"`. No way to invoke `/my-skill` from a hook.

## Why This Matters

### Challenge 1: Lazy Plugin Loading (Context Bloat)

Loading ALL plugins upfront bloats context massively:
- **60,000+ tokens** just for plugin definitions
- Expensive API costs
- Slower responses
- Wasted context window

You want smart, targeted loading:

```
User: "Build a React dashboard"
       ↓
Hook detects: frontend domain
       ↓
Loads: ONLY sw-frontend plugin (~3K tokens)
       ↓
Claude responds with specialized expertise
```

Instead of loading 20 plugins (60K tokens), load only what's needed (3K tokens). That's **95% token savings**.

### Challenge 2: Deterministic Skill Routing (Full Control)

You want to intercept EVERY user prompt and add smart logic:
- Route to specialized skills based on domain
- Inject project-specific context
- Enforce TDD policies from config
- Spawn the right agents for the task

Full control over the AI workflow. But hooks only run bash scripts - no skill invocation.

## The Solution

Since Claude is terminal-first, a hook can spawn a process. This is the key insight!

### Pattern 1: Intercept Every Prompt

```bash
#!/bin/bash
# UserPromptSubmit hook spawns:

# Detect domain using fast, cheap Haiku
claude -p "What plugins for: $PROMPT" --model haiku

# Install plugins SYNCHRONOUSLY
claude plugin install sw-frontend@specweave
```

**Key insight:** `claude plugin install` blocks until done. Plugin is ready for the CURRENT response!

### Pattern 2: Invoke Skills from Hooks

To invoke a skill deterministically from a hook:

```bash
claude -p "/skill args"
```

The skill WILL execute. Deterministic. Guaranteed.

### The Router Architecture

I built what I call a "Router" - it intercepts every prompt and makes smart decisions:

```
┌─────────────────────────────────────────┐
│    UserPromptSubmit Hook (spawns)       │
│                                         │
│  claude -p "What plugins?" --model haiku│
│            ↓                            │
│  Returns: frontend, testing             │
│            ↓                            │
│  claude plugin install (SYNC!)          │
│            ↓                            │
│  claude -p "/router $PROMPT"            │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│     Claude Processes (with plugins)     │
│                                         │
│  Router intercepts every prompt         │
│  Spawns specialized agents              │
│  TDD mode enforced from config          │
└─────────────────────────────────────────┘
```

## The SpecWeave Implementation

I've built this architecture into [SpecWeave](https://spec-weave.com):

- **Hook spawns processes** - terminal-first approach
- **Haiku detection** - fast, cheap domain detection
- **Sync plugin install** - ready for current response
- **Router** that intercepts every prompt
- **Specialized agents** for frontend, backend, K8s, etc.
- **TDD injection** from config files

### What This Enables

"Build a React dashboard with tests"
       ↓
Router intercepts → spawns:
1. Haiku detects: frontend + testing
2. Installs 2 plugins (not 20) - saves 50K+ tokens
3. Frontend architect agent
4. QA engineer agent
5. TDD coordination from config

Single prompt → orchestrated implementation.

## Try It

```bash
npm install -g specweave
specweave init .
claude
```

Then just describe what you want to build.

Full documentation: [spec-weave.com](https://spec-weave.com)

## The Future

What we really need from Anthropic:

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "hooks": [{
        "type": "skill",
        "skill": "my-router",
        "arguments": "$PROMPT"
      }]
    }]
  }
}
```

Until then, the terminal-first approach works beautifully.

---

**Resources:**
- [SpecWeave](https://spec-weave.com)
- [Claude Code Hooks Docs](https://code.claude.com/docs/en/hooks) - Official documentation explaining the hooks system
- [Claude Code Skills Docs](https://docs.anthropic.com/en/docs/claude-code/skills)

---

*Have you hit this limitation? What solutions have you found? Let me know in the comments!*
