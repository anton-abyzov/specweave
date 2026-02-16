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

There are 2 pain points:
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

### Workaround 2: Context Injection via `additionalContext`

In your `UserPromptSubmit` hook, inject context that INSTRUCTS Claude to use a skill:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "IMPORTANT: Use the Skill tool to invoke sw:increment for this request."
  }
}
```

**CRITICAL**: Do NOT use `systemMessage` - that field does not exist for UserPromptSubmit hooks and will be silently ignored! Always use `additionalContext` within the `hookSpecificOutput` wrapper.

**Pros**: Works within existing session
**Cons**: Claude might ignore it (it's advisory, not mandatory)

**Reference**: [Claude Code Hooks Guide](https://docs.claude.com/en/docs/claude-code/hooks)

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

# 3. Output context injection (MUST use additionalContext, not systemMessage!)
cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "$(echo $RESULT | jq -r '.context')"
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
additionalContext injection
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

2 pain points:
1. Plugin bloat (60K+ tokens if all loaded)
2. No way to intercept every prompt with smart logic

Here's my solution...

### Tweet 2/5
Since Claude is terminal-first, a hook can spawn a process:

```bash
# UserPromptSubmit hook spawns:
claude -p "What plugins for: $PROMPT" --model haiku
claude plugin install sw-frontend@specweave
```

Key: `plugin install` is SYNC - ready for current response!

### Tweet 3/5
To invoke a skill from hook:

```bash
claude -p "/skill args"
```

Deterministic. The skill WILL execute.

I built a "Router" that intercepts every prompt:
- Haiku detects domain
- Installs needed plugins
- Spawns specialized agents

Full control over AI workflow.

### Tweet 4/5
The result:

"Build a React dashboard with tests"
       ↓
Router intercepts → spawns:
- Haiku detects: frontend + testing
- Installs 2 plugins (not 20)
- Frontend architect agent
- QA engineer agent
- TDD mode from config

Single prompt → orchestrated implementation.

### Tweet 5/5
What we really need: `type: "skill"` in hooks.

Until then, terminal-first spawning works.

Full implementation: spec-weave.com

cc @bcherny @alexalbert__ @AnthropicAI #ClaudeCode

---

## Threads Post (threads.net)

### Post 1/3
Claude Code hooks can't invoke skills directly.

2 pain points I hit while building SpecWeave:

1. Plugin bloat - loading ALL plugins = 60K+ tokens wasted
2. No way to intercept every prompt with smart routing

But Claude is terminal-first. So a hook can spawn a process...

### Post 2/3
The solution:

→ Lazy loading: `claude -p "detect domain" --model haiku` then `claude plugin install` (it's SYNC!)

→ Skill invocation: `claude -p "/skill args"` - deterministic, guaranteed execution

I built a Router that intercepts every prompt, detects domain, installs only needed plugins.

### Post 3/3
The result:

"Build a React dashboard with tests"
↓
Router intercepts → Haiku detects frontend + testing → installs 2 plugins (not 20) → spawns specialized agents → TDD mode from config

Single prompt → orchestrated implementation.

Full implementation: spec-weave.com

---

## LinkedIn Post

### Bypassing Claude Code's Hook Limitation: When Hooks Can't Call Skills

I've been deep in Claude Code's architecture, and discovered a limitation that affects advanced workflows:

Hooks cannot invoke skills directly.

Claude Code is beautifully built around the terminal - you can call any CLI command from hooks or skills.

But there are 2 pain points:

𝟭. 𝗟𝗮𝘇𝘆 𝗣𝗹𝘂𝗴𝗶𝗻 𝗟𝗼𝗮𝗱𝗶𝗻𝗴

Loading ALL plugins upfront bloats context massively - 60,000+ tokens just for plugin definitions. Expensive. Slow.

You want smart, targeted loading: detect "React dashboard" → install ONLY the frontend plugin.

𝟮. 𝗔 𝗛𝗼𝗼𝗸 𝗰𝗮𝗻'𝘁 𝗰𝗮𝗹𝗹 𝗮 𝗦𝗸𝗶𝗹𝗹 𝗱𝗶𝗿𝗲𝗰𝘁𝗹𝘆

You want to intercept EVERY user prompt and add smart logic - route to specialized skills, inject context, enforce policies. Full control over the AI workflow.

---

𝗧𝗵𝗲 𝗦𝗼𝗹𝘂𝘁𝗶𝗼𝗻

Since Claude is terminal-first, a hook can spawn a process:

→ UserPromptSubmit hook spawns:
   claude -p "What plugins for: $PROMPT" --model haiku
   claude plugin install sw-frontend@specweave

Key insight: plugin install is SYNC - ready for current response!

→ To invoke a skill from hook:
   claude -p "/skill args"

Deterministic. The skill WILL execute.

I built a "Router" that intercepts every prompt:
- Haiku detects domain (React? K8s? Database?)
- Installs only needed plugins (saves 50K+ tokens)
- Spawns specialized agents
- Uses TDD mode if enabled in a config

---

𝗧𝗵𝗲 𝗥𝗲𝘀𝘂𝗹𝘁

"Build a React dashboard with tests"
       ↓
Router intercepts → spawns:
1. Haiku detects frontend + testing
2. Installs 2 plugins (not 20)
3. Frontend architect agent
4. QA engineer agent
5. TDD coordination

Single prompt → orchestrated implementation.

---

Full implementation is available in my open-source Spec-Driven solution for enterprises called SpecWeave: spec-weave.com

#ClaudeCode #AIEngineering #DeveloperTools #Anthropic #SpecWeave

---

## Dev.to Article

```markdown
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
