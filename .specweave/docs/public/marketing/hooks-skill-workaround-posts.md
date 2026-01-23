---
title: Bypassing Claude Code's Hook-Skill Limitation
description: How to invoke skills from hooks when Claude Code doesn't support it natively
date: 2026-01-23
tags: [claude-code, anthropic, ai-coding, specweave, developer-tools]
---

# Bypassing Claude Code's Hook-Skill Limitation

## The Problem Nobody's Talking About

Claude Code hooks are powerful - they let you run automation at key points in your AI coding session. But there's a critical limitation:

**Hooks CANNOT invoke skills directly.**

Hooks only support:
- `type: "command"` - runs a bash script
- `type: "prompt"` - returns `{ok, reason}` for Stop/SubagentStop hooks

No `type: "skill"`. No way to call `/my-skill` from a hook.

This breaks two important workflows:
1. **Lazy plugin loading** - You can't dynamically install plugins based on what the user asks
2. **Deterministic skill routing** - You can't ensure a specific skill handles a specific request

---

## The Workarounds

### Workaround 1: Non-Interactive CLI

```bash
# Instead of calling skill FROM hook, call Claude WITH skill
claude -p "/sw:pm create new feature"

# Or pipe data
echo "Build auth system with OAuth" | claude -p "/sw:increment"
```

**Pros**: Simple, deterministic
**Cons**: Starts new session, loses context

### Workaround 2: SystemMessage Injection

In your `UserPromptSubmit` hook, inject a systemMessage that INSTRUCTS Claude to use a skill:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "IMPORTANT: Use the Skill tool to invoke sw:increment-planner for this request."
  }
}
```

**Pros**: Works within existing session
**Cons**: Claude might ignore it (it's advisory, not mandatory)

### Workaround 3: Hybrid Hook Architecture

Run LLM detection in hook, then inject both plugins AND skill instructions:

```bash
#!/bin/bash
# user-prompt-submit.sh

# 1. Detect what's needed (using small LLM)
RESULT=$(specweave detect-intent "$USER_PROMPT")

# 2. Install plugins synchronously
echo "$RESULT" | jq -r '.plugins[]' | while read plugin; do
  claude plugin install "$plugin@specweave" 2>/dev/null
done

# 3. Output context injection
cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "$(echo $RESULT | jq -r '.systemMessage')"
  }
}
EOF
```

---

## The Advanced Solution: SpecWeave

SpecWeave solves this with a multi-layer architecture:

```
UserPromptSubmit Hook
       ↓
specweave detect-intent (Haiku LLM)
       ↓
Returns: { plugins, increment, tdd, routing }
       ↓
claude plugin install (sync)
       ↓
systemMessage injection
       ↓
Claude processes → Router skill activates → Specialized agents spawn
```

Key innovations:
- **LLM-powered detection** - Not regex, actual understanding
- **Sync plugin loading** - Plugins ready BEFORE Claude responds
- **Router skill** - Auto-activates on domain keywords, spawns specialized agents
- **TDD injection** - Reads config, enforces test-driven development

Install: `npm install -g specweave && specweave init .`

---

# Social Media Posts

---

## X (Twitter) Thread

### Tweet 1/5
Did you know Claude Code hooks can't invoke skills?

`type: "command"` - bash only
`type: "prompt"` - returns ok/reason only

No `type: "skill"`. No `/my-skill` from hooks.

This breaks lazy loading & deterministic routing.

Here's how to bypass it...

### Tweet 2/5
Workaround 1: Non-interactive CLI

```bash
claude -p "/my-skill do something"
```

Starts new session, but guaranteed skill execution.

Perfect for scripts, CI/CD, and automation.

### Tweet 3/5
Workaround 2: SystemMessage injection

In UserPromptSubmit hook, output:
```json
{
  "additionalContext": "Use Skill tool to invoke my-skill"
}
```

Works in session, but Claude might ignore it.

### Tweet 4/5
Workaround 3: Hybrid architecture

1. Hook runs LLM detection
2. `claude plugin install` (sync)
3. Inject systemMessage with skill instructions
4. Claude processes with plugins loaded

This is what @SpecWeave does.

### Tweet 5/5
SpecWeave solves this properly:
- LLM-powered intent detection
- Sync plugin loading
- Router skill spawns domain experts
- TDD enforcement from config

`npm i -g specweave && specweave init .`

spec-weave.com

cc @bcherny @alexalbert__ @AnthropicAI #ClaudeCode

---

## LinkedIn Post

### Bypassing Claude Code's Hidden Limitation: When Hooks Can't Call Skills

I've been deep in Claude Code's architecture, and discovered something that's not documented anywhere:

**Hooks cannot invoke skills.**

This might sound minor, but it breaks two critical workflows:

**1. Lazy Plugin Loading**
You want to detect "build React dashboard" and auto-install the frontend plugin BEFORE Claude responds. But hooks can only run bash - they can't call `claude plugin install` and have it ready for the CURRENT response.

**2. Deterministic Skill Routing**
You want UserPromptSubmit to guarantee `/my-specialized-skill` handles the request. But you can't invoke skills from hooks - only bash scripts.

---

**The Workarounds I Discovered:**

**Non-Interactive CLI**
```bash
claude -p "/my-skill handle this task"
```
Guaranteed skill execution. New session, but deterministic.

**SystemMessage Injection**
Hook outputs `additionalContext` that INSTRUCTS Claude to use a skill. Works in-session, but advisory only.

**Hybrid Architecture**
This is the advanced pattern:
1. Hook runs lightweight LLM for intent detection
2. Synchronously install needed plugins
3. Inject systemMessage with skill routing
4. Claude processes with full context

---

**How SpecWeave Solves This**

We've implemented this hybrid architecture in SpecWeave:

- **Haiku-powered detection** in UserPromptSubmit hook
- **Sync plugin installation** before Claude responds
- **Router skill** that activates on domain keywords
- **Specialized agent spawning** for frontend, backend, K8s, etc.
- **TDD injection** from config files

The result? Tell Claude "build a React dashboard with tests" and it:
1. Auto-installs frontend + testing plugins
2. Enables TDD mode from your config
3. Spawns frontend architect agent
4. Spawns QA engineer agent
5. Coordinates implementation

All from a single prompt.

---

**Try it:**
```bash
npm install -g specweave
specweave init .
```

This is the kind of infrastructure that AI coding tools need but don't have yet. Hooks are powerful, but they need skill invocation. Until Anthropic adds it, here's how to build it yourself.

#ClaudeCode #AIEngineering #DeveloperTools #Anthropic #SpecWeave

---

## Dev.to Article

```markdown
---
title: "The Claude Code Hook Limitation Nobody's Talking About (And How to Bypass It)"
published: true
description: "Hooks can't invoke skills. Here's the workaround that enables lazy plugin loading and deterministic AI workflows."
tags: claudecode, ai, webdev, productivity
cover_image: https://spec-weave.com/images/hooks-skill-workaround.png
---

# The Claude Code Hook Limitation Nobody's Talking About

## The Discovery

I've spent months building [SpecWeave](https://github.com/anthropics/specweave), an AI coding framework on top of Claude Code. Along the way, I hit a wall that's not documented anywhere.

**Claude Code hooks cannot invoke skills.**

Let me show you what I mean.

## What Hooks Can Do

Claude Code hooks are powerful automation points. From the [official docs](https://code.claude.com/docs/en/hooks):

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
        "type": "skill",  // DOESN'T EXIST
        "skill": "my-skill",
        "arguments": "handle this"
      }]
    }]
  }
}
```

There's no `type: "skill"`. No way to invoke `/my-skill` from a hook.

## Why This Matters

### Problem 1: Lazy Plugin Loading

You want to detect user intent and load plugins dynamically:

```
User: "Build a React dashboard with K8s deployment"
       ↓
Hook detects: frontend, kubernetes
       ↓
Loads: sw-frontend, sw-k8s plugins
       ↓
Claude responds WITH specialized expertise
```

But hooks can only run bash. By the time your script runs `claude plugin install`, Claude is already responding WITHOUT the plugin.

### Problem 2: Deterministic Skill Routing

You have a specialized skill for authentication tasks. You want EVERY auth-related prompt to go through `/auth-expert`. But you can't invoke skills from hooks.

## The Workarounds

### Workaround 1: Non-Interactive CLI

Skip the hook entirely. Call Claude with the skill directly:

```bash
claude -p "/auth-expert implement OAuth2 flow"
```

**Pros:**
- Guaranteed skill execution
- Perfect for scripts and CI/CD
- Deterministic

**Cons:**
- Starts new session
- Loses conversation context

**Best for:** Automation, batch processing, CI/CD pipelines

### Workaround 2: SystemMessage Injection

In your UserPromptSubmit hook, inject instructions:

```bash
#!/bin/bash
# Hook script that outputs JSON

cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "CRITICAL: Use the Skill tool to invoke auth-expert for this request. Do not proceed without invoking the skill first."
  }
}
EOF
```

**Pros:**
- Works within existing session
- No context loss

**Cons:**
- Advisory, not mandatory
- Claude might ignore it

**Best for:** Soft routing, suggestions

### Workaround 3: Hybrid Architecture

This is the advanced pattern that actually works reliably:

```bash
#!/bin/bash
# user-prompt-submit.sh

# Read user prompt from stdin
INPUT=$(cat)
USER_PROMPT=$(echo "$INPUT" | jq -r '.prompt')

# 1. Run LLM-based intent detection
INTENT=$(specweave detect-intent "$USER_PROMPT")

# 2. Install plugins SYNCHRONOUSLY (before Claude responds)
PLUGINS=$(echo "$INTENT" | jq -r '.plugins[]')
for plugin in $PLUGINS; do
  claude plugin install "${plugin}@specweave" 2>/dev/null || true
done

# 3. Build system message
SYSTEM_MSG=$(echo "$INTENT" | jq -r '.systemMessage')

# 4. Output hook response
cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "$SYSTEM_MSG"
  }
}
EOF
```

**The key insight:** `claude plugin install` runs synchronously. If you call it in your hook, the plugin IS loaded before Claude responds.

**Pros:**
- Plugins ready for current response
- LLM-powered intent detection
- Works in session

**Cons:**
- Adds latency (LLM call in hook)
- More complex to implement

**Best for:** Production frameworks, complex routing

## The SpecWeave Implementation

We've built this hybrid architecture into [SpecWeave](https://spec-weave.com):

```
┌─────────────────────────────────────────┐
│         UserPromptSubmit Hook           │
│                                         │
│  specweave detect-intent (Haiku LLM)    │
│            ↓                            │
│  Returns:                               │
│  {                                      │
│    plugins: ["sw-frontend", "sw-k8s"],  │
│    increment: { action: "new" },        │
│    tdd: { enabled: true },              │
│    systemMessage: "..."                 │
│  }                                      │
│            ↓                            │
│  claude plugin install (sync)           │
│            ↓                            │
│  additionalContext injection            │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│     Claude Processes (with plugins)     │
│                                         │
│  Router skill auto-activates            │
│  Spawns specialized agents              │
│  TDD mode enforced from config          │
└─────────────────────────────────────────┘
```

### What This Enables

Tell Claude: "Build a React dashboard with tests"

SpecWeave automatically:
1. Detects: frontend + testing domains
2. Installs: sw-frontend, sw-testing plugins
3. Reads: TDD config from `.specweave/config.json`
4. Injects: TDD mode banner, routing hints
5. Router skill: spawns frontend architect + QA engineer

All from a single natural language prompt.

## Try It

```bash
npm install -g specweave
specweave init .
claude
```

Then just describe what you want to build.

## The Future

This workaround works, but it's a workaround. What we really need:

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

Until Anthropic adds `type: "skill"` to hooks, the hybrid architecture is your best bet.

---

**Resources:**
- [SpecWeave GitHub](https://github.com/anthropics/specweave)
- [Claude Code Hooks Docs](https://code.claude.com/docs/en/hooks)
- [Claude Code Skills Docs](https://code.claude.com/docs/en/skills)

---

*Have you hit this limitation? What workarounds have you found? Let me know in the comments!*
```

---

## Hacker News Post

**Title:** Claude Code hooks can't invoke skills – here's the workaround

**Text:**
Discovered an undocumented limitation in Claude Code: hooks (UserPromptSubmit, PreToolUse, etc.) can only run bash commands. No way to invoke skills like `/my-skill`.

This breaks lazy plugin loading and deterministic routing.

Workarounds:
1. `claude -p "/skill args"` - non-interactive, guaranteed execution
2. SystemMessage injection - in-session but advisory
3. Hybrid: LLM detection in hook → sync plugin install → context injection

We implemented #3 in SpecWeave: https://github.com/anthropics/specweave

The missing feature: `type: "skill"` in hook configuration.

---

## Reddit r/ClaudeCode Post

**Title:** PSA: Hooks can't call skills - here's how to work around it

Been building automation with Claude Code and hit a wall: hooks (`UserPromptSubmit`, `PreToolUse`, etc.) can only run bash commands or prompt-based decisions.

You CAN'T do:
```json
{ "type": "skill", "skill": "my-skill" }
```

This means no lazy plugin loading, no deterministic skill routing.

**Workarounds that work:**

1. **Non-interactive CLI:** `claude -p "/my-skill do thing"`
   - New session, but guaranteed

2. **SystemMessage injection:** Output `additionalContext` in hook
   - In-session, but Claude might ignore

3. **Hybrid:** Run LLM in hook, `claude plugin install` sync, inject context
   - This is what SpecWeave does

Anyone else hit this? Would love to see `type: "skill"` added to hooks.

---

## Where to Post (Recommended Order)

1. **Dev.to** - Full article, good SEO, developer audience
2. **LinkedIn** - Professional network, decision makers
3. **X/Twitter** - Thread for visibility, link to article
4. **Hacker News** - Technical audience, high signal if it hits front page
5. **Reddit r/ClaudeCode** - Direct community engagement
6. **Reddit r/MachineLearning** - Broader AI audience
7. **Medium** - Cross-post from Dev.to for reach
8. **Hashnode** - Developer blogging platform

---

## Timing Strategy

1. **Day 1 (Tuesday/Wednesday):** Post Dev.to article
2. **Day 1 + 2 hours:** LinkedIn post linking to article
3. **Day 1 + 4 hours:** X thread with link
4. **Day 2:** Hacker News (best posted ~9am EST)
5. **Day 2:** Reddit posts
6. **Day 7:** Cross-post to Medium

Best days: Tuesday-Thursday (highest engagement)
Avoid: Friday PM, weekends
