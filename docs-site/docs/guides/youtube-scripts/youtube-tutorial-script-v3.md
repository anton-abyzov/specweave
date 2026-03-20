---
sidebar_position: 101
title: YouTube Tutorial Script v3
description: Video opening — the problem with AI coding today, bridge into SpecWeave
draft: true
---

# YouTube Video — Opening Script v3

**Duration**: ~3–4 minutes (cold open + bridge only)
**Format**: Face-cam direct address → quick screenshot flashes → transition into SpecWeave demo
**Tone**: Blunt, confident, slightly provocative. No fluff. Every sentence earns the next one.

---

## COLD OPEN — THE PUNCH (0:00 – 0:20)

**[SCREEN: Face-cam. No intro. No music. Mid-sentence energy — like you just walked in.]**

> "Boris Cherny — the man who created Claude Code at Anthropic — said software development as we knew it is done. 259 pull requests in a month without opening his IDE once.
>
> He's right. But he left out the hard part."

**[BEAT. Lean in slightly.]**

> "The coding is solved. Everything around the coding is still a mess."

---

## THE PROBLEM — WHAT AI SYSTEMS STILL GET WRONG (0:20 – 1:40)

**[SCREEN: Quick flash — a file tree with spec files scattered in random locations. 2 seconds.]**

> "Here's what I see every week. Developers hand their project to Claude, to Cursor, to Copilot — doesn't matter which one. The AI writes code. Good code, even. And then it drops files wherever it feels like."

**[SCREEN: Screenshot — random .md files scattered across a project root, mixed with source code. 2 seconds.]**

> "Specs in the root. Docs in a random folder. Plans that get overwritten next session. No structure. No memory of what was decided yesterday."

**[SCREEN: Screenshot — a bloated CLAUDE.md or system prompt file, 500+ lines. 2 seconds.]**

> "And then there's the knowledge problem. You correct the AI ten times. It forgets ten times. There is no mechanism — in Claude Code, in Cursor, in any of them — to learn from corrections and carry that forward. No extendable skills. No skill memories. You're re-teaching the same lessons every single conversation."

**[SCREEN: Face-cam.]**

> "These systems cannot produce new skills as you work. They can't look at your brownfield project — your real, messy, four-year-old codebase — and say: 'This codebase needs a specific way of handling migrations. Let me create a skill for that and remember it.'
>
> They just... can't."

**[BEAT.]**

> "And here's the one nobody talks about."

---

## THE KILLER MISTAKE (1:40 – 2:20)

**[SCREEN: Face-cam. Slightly lower energy — this is the honest part.]**

> "Every AI coding tool focuses on one thing: writing code faster. Ship features. Close tickets. And they completely forget that your project needs to exist in the world.
>
> Documentation that stays alive — not a README you wrote once and never updated. Marketing. Social presence. Content about what you're building, posted consistently, while you're building it.
>
> If nobody knows your project exists, it doesn't matter how fast you shipped it. That's the killer mistake. You automate the code and ignore everything else."

**[SCREEN: Quick flash — Threads analytics showing 169K views. 1 second. Then X analytics. 1 second.]**

> "I automated everything else too. And it changed everything."

---

## THE BRIDGE — WHY LLMs ARE THE NEW DEFAULT (2:20 – 3:20)

**[SCREEN: Face-cam. Energy picks back up.]**

> "Here's the thing people haven't internalized yet. It's not just about writing code through LLMs. It's about doing everything through LLMs.
>
> Research — asking questions about your platform architecture, how something is built, what the spec says about edge cases. You don't grep through files anymore. You ask.
>
> Presentations — generating slide boilerplates, structuring your talk, creating visuals. Not perfect, but you skip the blank page problem entirely.
>
> Preparation — before you touch a single line of code, the AI has already interviewed you, clarified requirements, written acceptance criteria, and broken the work into testable tasks.
>
> All of this is faster through LLMs. And if you're still doing any of it manually, you're competing against people who aren't."

**[BEAT.]**

> "I built a system that handles all of it. The specs. The code. The tests. The docs. The GitHub sync. The social posts. The skill creation. The learning from mistakes.
>
> It's called SpecWeave. It's open source. And I'm going to show you every piece of it."

---

## TRANSITION INTO DEMO (3:20 – 3:40)

**[SCREEN: Fast montage — 1 second each:]**
- Terminal with `specweave init .`
- spec.md being generated
- `/sw:auto` running tests
- [verified-skill.com](https://verified-skill.com) homepage
- App Store page — [Lulla](https://lulla-app.pages.dev/) (baby sleep, Apple Watch)
- App Store page — [SketchMate](https://sketchmate.net/) (AI drawing game)
- [EasyChamp](https://easychamp.com) dashboard (enterprise, 20+ microservices)
- [WC26](https://wc-26.net/) World Cup companion

> "Twelve production projects. Four in the App Store. 636 structured increments. 538 releases. 3,200 commits. One developer, one system.
>
> Let's go."

**[CUT TO: Demo begins — pick up from v2 "THE PROOF" section or wherever the main tutorial starts.]**

---

## PRODUCTION NOTES

**Screenshots/visuals needed for this opening:**
1. File tree showing scattered AI-generated files (real or staged) — the "files in random places" problem
2. Bloated CLAUDE.md or system prompt — the "no mergeable config" problem
3. Side-by-side: AI conversation where same correction is given twice — the "no skill memory" problem
4. Threads analytics (169K views) + X analytics — quick flash, proves the point
5. 6-shot fast montage for the transition

**Optional: Single Excalidraw slide**
Could combine all pain points into one visual — a "What AI Coding Gets Wrong" diagram with 6 boxes, each with an icon and one-liner. Flash it for 3 seconds during the problem section instead of individual screenshots. Punchier, less editing.

**Delivery notes:**
- No teleprompter feel. This should sound like you're explaining it to a developer friend over coffee
- The Boris Cherny reference lands because it's a real person saying a real thing — don't oversell it
- "Killer mistake" section needs genuine energy, not hype energy
- The LLM bridge section is the thesis — everything after this is proof
- Total opening must stay under 4 minutes. If it goes longer, cut the LLM bridge section shorter — the problem section is more important

**Music:**
- 0:00–0:20: Silence. Just voice.
- 0:20–1:40: Very subtle tension (low synth pad, barely audible)
- 1:40–2:20: Drop to silence again for "killer mistake"
- 2:20–3:20: Building energy, still understated
- 3:20–3:40: Montage hit — quick energetic beat, cuts to silence at "Let's go."
