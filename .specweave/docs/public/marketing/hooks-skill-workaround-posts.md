---
title: Bypassing Claude Code's Hook-Skill Limitation
description: How to invoke skills from hooks when Claude Code doesn't support it natively
date: 2026-01-23
tags: [claude-code, anthropic, ai-coding, specweave, developer-tools]
---

# Bypassing Claude Code's Hook-Skill Limitation

## The Hook Limitation

Claude Code hooks are powerful - they let you run automation at key points in your AI coding session. Claude is beautifully built around the terminal - you can call any CLI command from hooks or skills.

But there's a limitation: **Hooks CANNOT invoke skills directly.**

Hooks only support:
- `type: "command"` - runs a bash script
- `type: "prompt"` - returns `{ok, reason}` for Stop/SubagentStop hooks

No `type: "skill"`. No way to call `/my-skill` from a hook.

This creates two real challenges:
1. **Lazy plugin loading** - Loading ALL plugins bloats context (60K+ tokens). You want smart, targeted loading.
2. **Deterministic skill routing** - You want to intercept EVERY prompt, add smart logic, and control the AI workflow.

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
Claude Code hooks can't invoke skills.

`type: "command"` - bash only
`type: "prompt"` - returns ok/reason only

No `type: "skill"`.

Two challenges:
1. Plugin bloat (60K+ tokens if all loaded)
2. No control over every user prompt

Here's my solution...

### Tweet 2/5
Claude is terminal-first. I leveraged that:

```bash
# In UserPromptSubmit hook:
claude -p "detect domain" --model haiku
claude plugin install sw-frontend@specweave
```

Key insight: `plugin install` is SYNC - ready for current response!

Deterministic. Fast. Cheap.

### Tweet 3/5
I built a "Router Skill" that intercepts every prompt:

1. Haiku detects domain (React? K8s? DB?)
2. Installs ONLY needed plugins (saves 50K+ tokens)
3. Spawns specialized agents
4. Injects TDD mode from config

Full control over AI workflow.

### Tweet 4/5
The result:

"Build a React dashboard with tests"
       ↓
SpecWeave auto:
- Detects frontend + testing
- Installs 2 plugins (not 20)
- Spawns frontend architect
- Spawns QA engineer
- Coordinates with TDD

Single prompt → orchestrated implementation.

### Tweet 5/5
What we really need: `type: "skill"` in hooks.

Until then, terminal-first approach works.

Full implementation: spec-weave.com

cc @bcherny @alexalbert__ @AnthropicAI #ClaudeCode

---

## LinkedIn Post

### Bypassing Claude Code's Hook Limitation: When Hooks Can't Call Skills

I've been deep in Claude Code's architecture, and discovered a limitation that affects advanced workflows:

Hooks cannot invoke skills directly.

Claude Code is beautifully built around the terminal - you can call any CLI command from hooks or skills, which is powerful. But there's no `type: "skill"` in hook configuration.

This creates two real challenges:

𝟭. 𝗟𝗮𝘇𝘆 𝗣𝗹𝘂𝗴𝗶𝗻 𝗟𝗼𝗮𝗱𝗶𝗻𝗴

The problem: Loading ALL plugins upfront bloats context massively. We're talking 60,000+ tokens just for plugin definitions. That's expensive and slow.

You want to detect "build React dashboard" and auto-install ONLY the frontend plugin BEFORE Claude responds. Smart, targeted loading.

𝟮. 𝗗𝗲𝘁𝗲𝗿𝗺𝗶𝗻𝗶𝘀𝘁𝗶𝗰 𝗦𝗸𝗶𝗹𝗹 𝗥𝗼𝘂𝘁𝗶𝗻𝗴

You want to intercept EVERY user prompt and add smart logic - route to specialized skills, inject context, enforce policies. Full control over the AI workflow.

But hooks only run bash scripts. No skill invocation.

---

𝗧𝗵𝗲 𝗦𝗼𝗹𝘂𝘁𝗶𝗼𝗻 𝗜 𝗕𝘂𝗶𝗹𝘁

Since Claude is terminal-first, I leveraged that:

→ claude -p "detect domain for: $PROMPT" --model haiku
   Deterministic. Fast. Cheap.

→ claude plugin install sw-frontend@specweave
   Runs synchronously - plugin ready for current response!

I built a "Router Skill" that intercepts every prompt:
- Haiku LLM detects domain (React? K8s? Database?)
- Installs only needed plugins (saves 50K+ tokens)
- Spawns specialized agents (frontend architect, QA engineer)
- Injects TDD mode from config

---

𝗧𝗵𝗲 𝗥𝗲𝘀𝘂𝗹𝘁

Tell Claude "build a React dashboard with tests" and SpecWeave:
1. Auto-detects frontend + testing domains
2. Installs only sw-frontend, sw-testing plugins
3. Spawns frontend architect agent
4. Spawns QA engineer agent
5. Coordinates implementation with TDD

All from a single natural language prompt.

---

Full implementation: spec-weave.com

#ClaudeCode #AIEngineering #DeveloperTools #Anthropic #SpecWeave

---

## Dev.to Article

```markdown
---
title: "Claude Code Hook Limitation: No Skill Invocation (And How I Solved It)"
published: true
description: "Hooks can't invoke skills. Here's the solution that enables lazy plugin loading and deterministic AI workflows."
tags: claudecode, ai, webdev, productivity
cover_image: https://spec-weave.com/img/specweave-social-card.jpg
---

# Claude Code Hook Limitation: No Skill Invocation

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
        "type": "skill",  // DOESN'T EXIST
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

Since Claude is terminal-first, I leveraged that power:

### Pattern 1: Haiku Detection in Hook

```bash
#!/bin/bash
# UserPromptSubmit hook

# Detect domain using fast, cheap Haiku
RESULT=$(claude -p "What domain is this? $PROMPT" --model haiku)
```

Deterministic. Fast. Cheap (~$0.0001 per call).

### Pattern 2: Sync Plugin Install

```bash
# Install plugins SYNCHRONOUSLY
claude plugin install sw-frontend@specweave
```

**Key insight:** `claude plugin install` blocks until done. Plugin is ready for the CURRENT response!

### The Router Skill Architecture

I built what I call a "Router Skill" - it intercepts every prompt and makes smart decisions:

```
┌─────────────────────────────────────────┐
│         UserPromptSubmit Hook           │
│                                         │
│  claude -p "detect domain" --model haiku│
│            ↓                            │
│  Returns: frontend, testing             │
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

## The SpecWeave Implementation

I've built this architecture into [SpecWeave](https://spec-weave.com):

- **Haiku-powered detection** in UserPromptSubmit hook
- **Sync plugin installation** - only what's needed
- **Router skill** that activates on domain keywords
- **Specialized agent spawning** for frontend, backend, K8s, etc.
- **TDD injection** from config files

### What This Enables

Tell Claude: "Build a React dashboard with tests"

SpecWeave automatically:
1. Detects: frontend + testing domains
2. Installs: ONLY sw-frontend, sw-testing plugins (saves 50K+ tokens)
3. Reads: TDD config from `.specweave/config.json`
4. Spawns: frontend architect + QA engineer agents
5. Coordinates implementation with TDD discipline

All from a single natural language prompt.

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
- [Claude Code Hooks Docs](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Claude Code Skills Docs](https://docs.anthropic.com/en/docs/claude-code/skills)

---

*Have you hit this limitation? What solutions have you found? Let me know in the comments!*
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
