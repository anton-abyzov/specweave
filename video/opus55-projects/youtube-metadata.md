# YouTube metadata: Claude Code Projects + Opus 5.5

Channel: Anton Abyzov: AI Power (@antonabyzov)

## Title

Claude Code Projects + Opus 5.5: Full Demo (Now on Pro)

Alternative: Claude Code Projects + Opus 5.5: Real Demo (Now on Pro)

## Description

Claude Code Projects with Opus 5.5 on my real project, plus my take on GPT-6 Astra in Codex and GPT-6 Sol.

Heads-up: the presenter is my AI avatar (HeyGen) speaking with my cloned voice (ElevenLabs). The edit and captions were built from instructions I gave in a Claude Code project. The screens and terminal output are real.

What you'll see: the Opus 5.5 model picker and effort slider, a thread running Opus 5.5 at high effort, project statuses, the New project dialog, the coordinator spinning up and splitting threads, a thread's live checklist, Routines, and what happens at the weekly usage limit. Then a real SpecWeave handoff, picked up in a fresh clone with the next task and its acceptance criteria.

Chapters
0:00 Claude Code Projects in 15 seconds
0:16 Heads-up: this is my AI avatar
0:42 Opus 5.5, GPT-6 Astra and GPT-6 Sol
1:23 Opus 5.5 in Claude Code: model and effort per thread
2:18 What Claude Code Projects are (now on Pro)
2:59 Demo: the coordinator and parallel threads
4:28 Routines and the weekly usage limit
5:12 Out of usage? Hand off with SpecWeave
6:00 Wrap-up

Links
SpecWeave: https://spec-weave.com
Claude Code Projects guide: https://spec-weave.com/docs/guides/claude-code-projects
Claude Code vs Codex: https://spec-weave.com/docs/guides/claude-code-vs-codex
Cross-tool handoff: https://spec-weave.com/docs/guides/cross-tool-handoff
SpecWeave on GitHub (open source): https://github.com/anton-abyzov/specweave
Install: npm i -g specweave

More from me (not covered in this video)
Claude Code skills directory: https://verified-skill.com/claude-code-skills

#ClaudeCode #Opus55 #ClaudeCodeProjects #AICoding #Codex

## Tags

claude code, claude code projects, opus 5.5, claude opus 5.5, claude code demo, claude code projects demo, codex, gpt-6 astra, gpt-6 sol, ai coding agent, anthropic claude, specweave, agent handoff, ai avatar, heygen, elevenlabs

## Pinned comment

SpecWeave (open source): https://spec-weave.com
Claude Code Projects guide: https://spec-weave.com/docs/guides/claude-code-projects
When you run out of usage, which tool do you hand off to?

## Thumbnail ranking

Spec: "CLAUDE CODE PROJECTS" large, "Opus 5.5" smaller. Claude terracotta #d97757 on near-black.

1. ai-A.png: best pick. Title sits on clean near-black, no clutter behind the letters, badge reads "Opus 5.5" exactly per spec, and the status-dot panel hints at Projects without readable private text.
2. ai-B.png: strong and the largest title, but the card grid shows between the letters. If chosen, darken or blur the grid behind the text block by a further 30-40%.
3. ai-C.png: the "$ specweave pickup" terminal box is unreadable at feed size (about 320px wide) and promotes the handoff segment, which has no search volume. Use only with the terminal box removed.
4. composite.png: do not use as is. The real screenshot exposes private workspace content ("Welcome back, Marketing.", club and business thread titles, and the secret name UMB_SYNC_TOKEN), it is unreadable at thumbnail size, the source crop is soft, the blue radial glow is off-brand, and the badge reads "+ Opus 5.5" instead of "Opus 5.5". Only usable after cropping or blurring to non-sensitive UI (status pills or the model picker), with a sharper source and no blue glow.

Upload format (blocker): ai-A/B/C.png are 2736x1536 PNGs of 3.1-3.4 MB, over YouTube's 2 MB custom-thumbnail limit and 1.781:1 rather than exact 16:9. Crop to 16:9, then export 1280x720 JPEG, and check the size before upload:

```
sips -c 1536 2730 ai-A.png --out ai-A-169.png
sips -z 720 1280 -s format jpeg -s formatOptions 88 ai-A-169.png --out ai-A.jpg
ls -l ai-A.jpg   # must be under 2 MB
```

Test exports with these exact settings came out 1280x720 at about 150-175 KB each (ai-A 153 KB, ai-B 172 KB, ai-C 172 KB).

<!-- All findings applied except the "Full Demo" title change: VIDEO FACTS names "Claude Code Projects + Opus 5.5: Full Demo (Now on Pro)" as the chosen title, so it stays (the finding allowed keeping it); the suggested "Real Demo" wording is listed as the alternative. -->
