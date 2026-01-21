# X.com Posts for SpecWeave Promotion

**Prepared**: 2026-01-21 01:04 AM
**Target**: @bcherny (Boris Cherny, Claude Code creator)
**Timing**: 1-day intervals, starting during US business hours

---

## Post Schedule

| Post | Date | Time (PST) | Topic |
|------|------|------------|-------|
| 1 | Jan 21, 2026 | 9:00 AM | Problem: Context Bloat |
| 2 | Jan 22, 2026 | 10:00 AM | Solution: LLM-in-Hook Pattern |
| 3 | Jan 23, 2026 | 11:00 AM | Per-Project Plugin Config (Feature Request) |

**Best times to post**: 9 AM - 12 PM PST (when @bcherny and Anthropic team are active)

---

## Post 1: The Problem (Jan 21, 9 AM PST)

### Version A (Direct, mentions SpecWeave)
```
@bcherny 7+ open issues, 100+ reactions asking for lazy loading in Claude Code.

The problem is REAL:
• 40-50k tokens consumed at startup
• 25% of context gone before typing anything
• Power users forced to disable plugins manually

We built a solution in SpecWeave using user-prompt-submit hooks + Claude CLI calls.

95% context reduction. Open source.

Issues: #7336, #16458, #11364, #8997

🧵 Thread on how we did it...
```

### Version B (Pattern-focused, subtle mention)
```
@bcherny The Claude Code community is screaming for lazy loading (7+ issues, 100+ reactions).

Current state:
❌ 54% context consumed at startup
❌ All plugins load even if unused
❌ Manual disable/enable is cumbersome

What if hooks could call `claude -p "..." --model haiku` to detect intent and load plugins on-demand?

That's exactly what we built. 95% context savings.

🧵
```

---

## Post 2: The Solution Pattern (Jan 22, 10 AM PST)

### Version A (Technical, shows the innovation)
```
Here's a pattern that saved us 95% context in Claude Code:

1. user-prompt-submit hook intercepts prompt
2. Call `claude -p "which plugins needed?" --model haiku`
3. LLM understands INTENT (not just keywords!)
4. Load only what's needed

"Don't use React" → No frontend plugin
"Use Vue instead of React" → Frontend plugin (Vue IS frontend!)

Code in thread 🧵
```

### Version B (More accessible)
```
TIL you can call Claude from inside Claude Code hooks.

We use this for smart plugin loading:

```bash
# In user-prompt-submit hook
PLUGINS=$(claude -p "Analyze: $PROMPT. Return plugins needed as JSON" --model haiku)
```

Haiku takes ~6s, saves ~50k tokens per session.

The hook system is more powerful than most realize.

@bcherny was this intentional? It's brilliant.
```

---

## Post 3: Feature Request (Jan 23, 11 AM PST)

### Version A (Per-project config request)
```
@bcherny Feature request for Claude Code plugins:

Per-project plugin configuration.

Why:
• I have 20 plugins installed globally
• Project A only needs frontend + testing
• Project B needs K8s + infrastructure
• Loading all = wasted context

Proposed:

```json
// .claude/plugins.local.json
{
  "enabled": ["sw-frontend", "sw-testing"],
  "autoDetect": true
}
```

This would complement lazy loading perfectly.

Related: #16458
```

### Version B (Community-focused)
```
Claude Code plugin ecosystem is amazing, but we need better scoping.

Problem:
• Install 20 plugins globally = 60k tokens at startup
• Each project uses ~3-5 plugins
• No way to specify per-project

Proposed solution:
1. Global: ~/.claude/installed_plugins.json (current)
2. Project: .claude/plugins.local.json (NEW)

Project config overrides global.

@bcherny is this on the roadmap?
```

---

## Thread Content (For Post 1 or 2)

```
🧵 How we achieved 95% context reduction in Claude Code

1/ The problem: All plugins load at startup. With 24 SpecWeave plugins, that's ~60k tokens GONE before you type anything.

2/ Existing solutions don't work:
- Manual disable = cumbersome
- CLI overrides = shell aliases
- Disable all = lose functionality

3/ Our innovation: Use Claude to detect Claude's needs.

The user-prompt-submit hook runs BEFORE the main conversation. We call `claude -p "..." --model haiku` inside it.

4/ The prompt is key. We don't match keywords (unreliable).

"Don't use React" could mean:
- Use Vue instead (still frontend!)
- Build a CLI tool (backend only)
- Make it mobile (React Native)

We ask the LLM to understand INTENT.

5/ Implementation:

```typescript
const result = spawnSync('claude', [
  '-p', buildDetectionPrompt() + userPrompt,
  '--model', 'haiku'
]);
const plugins = JSON.parse(result.stdout);
```

6/ Results:
- ~6s detection time (Haiku is fast)
- 95% context savings (3-5k vs 60k tokens)
- 41 tests passing (including cross-platform)

7/ The code is open source:
https://github.com/AntonyAbykov/specweave

File: src/core/lazy-loading/llm-plugin-detector.ts

8/ This pattern is generalizable. Any hook can call Claude for pre-processing:
- Route to different agents
- Enrich prompts with context
- Validate inputs
- Transform requests

9/ Why isn't this native in Claude Code?

It should be! Related issues:
- #7336 (63+ reactions)
- #16458
- #11364

@bcherny would love to see this as a first-class feature.

/end
```

---

## Hashtags to Consider

- #ClaudeCode
- #Anthropic
- #AI
- #DevTools
- #LLM
- #DeveloperExperience
- #OpenSource

---

## Alternative: LinkedIn Post

```
Just shipped a solution to the #1 pain point in Claude Code's plugin ecosystem.

**The Problem**: Plugins consume 20-25% of context at startup. With 24 plugins, that's 60k tokens GONE before you type anything.

**Our Solution**: Use Claude to detect what Claude needs.

We call `claude -p "..." --model haiku` inside the user-prompt-submit hook to analyze user intent and load only relevant plugins.

Results:
✅ 95% context reduction
✅ ~6s overhead (first prompt only)
✅ Understands intent, not just keywords

The pattern is powerful: hooks can call the CLI for any pre-processing.

Open source: spec-weave.com

#AI #DevTools #Anthropic #Claude #OpenSource
```

---

## Notes

1. **Mention SpecWeave?** Yes, but subtly. Lead with the problem and solution, mention SpecWeave as the implementation.

2. **Timing**:
   - Jan 21 (Tuesday) 9 AM PST - Good engagement day
   - Jan 22 (Wednesday) 10 AM PST - Mid-week peak
   - Jan 23 (Thursday) 11 AM PST - Still strong engagement

3. **Tag Strategy**:
   - Always tag @bcherny (he's responsive to Claude Code feedback)
   - Consider tagging @AnthropicAI for visibility
   - Don't tag too many people (looks spammy)

4. **Engagement Tips**:
   - Reply to your own thread with the GitHub links
   - Pin the thread with code examples
   - Respond to comments quickly (first 2 hours are crucial)
