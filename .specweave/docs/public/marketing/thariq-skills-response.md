---
title: Response to Thariq's Skills Merge Announcement
date: 2026-01-23
context: Reply to @trq212 announcing slash commands merged into skills
---

# Response Posts to Thariq's Skills Announcement

## Best Response (Quote Tweet/Reply)

---

### Option A: The "We Built On This" Angle

**For X/Twitter (280 chars max):**

This is huge for framework builders!

We leveraged this in @SpecWeave:
- Commands → user workflows (/sw:do)
- Skills → auto-activating expertise (architecture, PM, security)

One mental model, infinite extensibility.

The `disable-model-invocation` flag is the key differentiator.

spec-weave.com

---

### Option B: The "Quick Guide" Angle

**For X/Twitter:**

Quick mental model for the merge:

| Old | New | When |
|-----|-----|------|
| `/command` | skill + `disable-model-invocation: true` | User triggers only |
| skill | skill (default) | User OR Claude auto-triggers |

This is how @SpecWeave organizes 100+ skills/commands.

Full guide: spec-weave.com/learn/claude-code-basics

---

### Option C: The "Pro Tip" Angle

**For X/Twitter:**

Pro tip from building @SpecWeave on top of this:

The real power is `context: fork` + skill = **subagent**

Your skill becomes an isolated AI with its own context window.

We use this for our increment planner - Opus-powered, forked context, specialized tools.

Game changer for complex workflows.

---

### Option D: The "Full Thread" Response

**Tweet 1:**
Love this merge! Been building @SpecWeave around this architecture.

Quick guide for everyone confused:

**Before:** commands/ and skills/ = different things
**After:** both create `/name`, just different activation

The `disable-model-invocation` flag is what makes a "command" 🧵

**Tweet 2:**
Here's how we organize 100+ skills in SpecWeave:

```
commands/     → disable-model-invocation: true
              → User types /sw:do explicitly

skills/       → default (both can invoke)
              → Claude auto-loads on keywords
```

Same system, different activation patterns.

**Tweet 3:**
The real unlock: `context: fork`

Add this to any skill and it runs as a **subagent** - isolated context, can use different model.

Our increment planner:
- `context: fork` (isolated)
- `model: opus` (smarter)
- Spawns from `/sw:increment`

Full architecture: spec-weave.com

---

## LinkedIn Response

**Comment on equivalent LinkedIn post:**

This merge simplifies the mental model significantly!

At SpecWeave, we've been building on this architecture and discovered some powerful patterns:

**1. Command vs Skill is just a flag**
- `disable-model-invocation: true` = only user can invoke (like the old /commands)
- Default = both user and Claude can invoke (Claude auto-loads on keywords)

**2. The real unlock: `context: fork`**
Add this to any skill and it becomes a subagent with isolated context. We use this for complex planning tasks that need dedicated attention.

**3. Organization pattern we use:**
```
commands/  → workflows with side effects
skills/    → domain expertise that auto-activates
```

We've documented all our learnings at spec-weave.com - hope it helps others building on Claude Code!

---

## Best Single Response (RECOMMENDED)

**Use this one - it's concise, valuable, and drives traffic:**

---

This merge is perfect for framework builders!

Here's the mental model we use in @SpecWeave:

`disable-model-invocation: true` → Command (user only)
default → Skill (user + Claude auto-invoke)

Add `context: fork` and your skill becomes a **subagent**.

We've built 100+ skills on this pattern.
Full guide: spec-weave.com/learn/claude-code-basics

cc @bcherny @alexalbert__ @AnthropicAI #ClaudeCode

---

## YouTube Script Addition

Add this to your YouTube script intro:

---

### "Claude Code is Simple... Until It Isn't"

"Claude Code looks simple on the surface - you type, Claude codes. But here's the thing...

I've spent months diving deep into the architecture. Skills, commands, hooks, plugins, subagents, MCP servers - there's a LOT under the hood.

And I've made every mistake possible:
- Crashed sessions with context overflow
- Broke hooks trying to call skills (spoiler: you can't)
- Confused commands with skills before they merged
- Spawned agents that ate all my tokens

So in this video, I'm going to walk you through everything I learned the hard way - so you don't have to.

By the end, you'll understand:
- The REAL difference between skills and commands (hint: one frontmatter flag)
- How to build subagents that don't crash your session
- Why hooks can't call skills and how to work around it
- The lazy loading pattern that saves 60,000 tokens

The official hooks documentation at code.claude.com/docs/en/hooks explains the system well - but there are limitations they don't highlight. I'll show you those.

Let's dive in."

---

### For "Skills vs Commands" Section

"Thariq from Anthropic just announced that slash commands are now merged into skills.

What does this actually mean?

Before, you had two mental models:
- `/commands` in `.claude/commands/`
- Skills in `.claude/skills/`

Now it's ONE system. Both create `/name` commands. The only difference?

One frontmatter flag: `disable-model-invocation: true`

With it: Only YOU can invoke (like old commands)
Without it: Both you AND Claude can invoke (Claude auto-activates on keywords)

In SpecWeave, we organize it like this:
- `commands/` folder → workflows with side effects (deploy, commit)
- `skills/` folder → expertise that auto-activates (architecture, security)

Same system, different activation patterns. Simple once you see it."

---

## Public Docs Addition

Add to `claude-code-basics.md`:

---

### The Simple Truth About Claude Code

Claude Code is deceptively simple. Type a message, Claude writes code. Done.

But under the surface, there's a powerful system:
- **Skills** that auto-activate on keywords
- **Hooks** that run at every lifecycle point
- **Plugins** that bundle everything together
- **Subagents** that work in isolated contexts
- **MCP servers** that connect external tools

**The learning curve is real.** We've made every mistake building SpecWeave:
- Context overflow from too many file reads
- Hooks that can't call skills (it's a limitation!)
- Subagents that consumed all tokens
- Plugins that loaded 60K tokens when 3K would do

This documentation captures everything we learned - so you can skip the painful parts and go straight to building.

**Official References:**
- [Claude Code Hooks](https://code.claude.com/docs/en/hooks) - The official hooks system documentation
- [Claude Code Skills](https://docs.anthropic.com/en/docs/claude-code/skills) - Skills and commands reference

---
