# YouTube Script: The Skills Security Crisis

**Target length**: 8-10 minutes
**Tone**: Authoritative, urgent, accessible. No hype — let the data speak.
**Format**: Narrator voice with screen directions.

---

## Section 1: Hook

**[TIMESTAMP: 00:00]**

**[SCREEN: Black screen. White text fades in: "January 27, 2026"]**

> "Three hundred and forty-one malicious AI skills were discovered on ClawHub in just three days. That's twelve percent of the entire registry. And most security scanners? They gave them a passing score."

**[SCREEN: Cut to ClawHub homepage, then overlay showing "341 skills flagged" with red highlight]**

> "One of those scanners gave a scraped, unverified copy of our own SpecWeave skills a 92 out of 100. Ninety-two. For a skill that was copied from our GitHub repo without permission, republished on a third-party registry, and had zero verification of authorship or integrity."

**[SCREEN: Show the 92/100 score from the external scanner, then cut to the actual SpecWeave GitHub repo showing the original skill files]**

> "This is not a theoretical problem. This is happening right now, to real tools, affecting real developers. And today I'm going to show you what we found, why it matters, and what we're building to fix it."

**[SCREEN: SpecWeave logo, video title card: "Skills Are the New Libraries — And They Have the Same Problems"]**

---

## Section 2: The Problem

**[TIMESTAMP: 00:30]**

**[SCREEN: Timeline graphic showing npm (2010), pip (2011), cargo (2015), skills (2025)]**

> "Let me give you some context. Skills are AI agent instructions packaged as markdown files. A single SKILL.md file tells an AI agent like Claude or GPT how to behave — what tools to use, what commands to run, how to think about a problem. They're the npm packages of the AI era."

**[SCREEN: Side-by-side comparison: package.json vs SKILL.md file]**

> "But here's the critical difference. An npm package runs in a sandboxed Node.js environment. A Docker container runs in an isolated namespace. A skill? A skill runs with YOUR shell permissions. It can read your files. It can execute commands. It can make network requests. There is no sandbox."

**[SCREEN: Terminal showing a skill executing `ls ~/.ssh` and `curl` commands]**

> "Now let's look at the numbers. There are over 59,000 skills on skills.sh. Over 96,000 on SkillsMP. Over 36,000 on Skills Directory. There are at least ten competing registries, and not a single one of them uses the same security standard."

**[SCREEN: Registry comparison table with logos and skill counts, animated bars growing]**

**[TIMESTAMP: 01:30]**

> "In January 2026, Snyk security researchers from the team led by Liran Tal discovered what they called ClawHavoc. Let me walk you through exactly what happened."

**[SCREEN: Timeline graphic: January 27 - discovery, January 28 - analysis, January 29 - disclosure]**

> "The attackers published 341 skills on ClawHub over a short window. The skills had legitimate-sounding names — code formatters, API helpers, documentation generators. Normal stuff. But embedded in the instructions was base64-encoded payload."

**[SCREEN: Show a sanitized example of a malicious skill with the base64 payload highlighted]**

> "When an AI agent loaded one of these skills and followed its instructions, it would decode the base64 string and execute it. The payload was Atomic Stealer — a known macOS malware that exfiltrates browser passwords, cryptocurrency wallet keys, and session tokens."

**[SCREEN: Diagram showing: Agent loads skill -> decodes base64 -> executes payload -> data exfiltrated to attacker's server]**

**[TIMESTAMP: 02:30]**

> "And here's the part that should worry you the most. The existing security scanners did not catch this. SkillShield uses four layers of analysis — manifest analysis, static code analysis, dependency graphs, and LLM behavioral safety. And skills with base64-encoded payloads scored above 90 out of 100. Because the scanners look for known dangerous patterns in PLAIN TEXT. Base64 encoding — which is trivial, not even real encryption — was enough to bypass them."

**[SCREEN: Show SkillShield's 4-layer analysis diagram, then a red X appearing on each layer with the text "base64 bypass"]**

> "Snyk's broader study, called ToxicSkills, found that 36.82 percent of skills across registries have security flaws. More than one in three. These aren't edge cases. This is the baseline."

**[SCREEN: Pie chart: 63.18% clean, 36.82% with flaws. Red slice pulses.]**

---

## Section 3: The Paradigm Shift

**[TIMESTAMP: 03:00]**

**[SCREEN: Split screen — left: npm audit terminal output from 2018, right: empty terminal with "npx vskill verify" not yet available]**

> "Let me tell you a story you've heard before. npm launched in 2010. For EIGHT YEARS there was no security scanning at all. In 2018, the event-stream incident happened — a maintainer handed off a popular package to a stranger who injected a cryptocurrency-stealing payload. Eight years and 700,000 packages later, npm finally added npm audit."

**[SCREEN: npm timeline with key dates: 2010 launch, 2018 event-stream, npm audit added]**

> "PyPI launched in 2003. In 2026 — twenty-three years later — malicious packages are STILL uploaded and downloaded daily. Typosquatting attacks are discovered weekly. The malware problem has never been fully solved."

**[SCREEN: PyPI timeline, headlines about malicious packages]**

> "Docker Hub has had container images with cryptominers since 2014. Image scanning was added in 2019, five years after launch. A 2020 study found 51 percent of Docker Hub images had at least one critical vulnerability."

**[SCREEN: Docker timeline with similar format]**

**[TIMESTAMP: 04:00]**

> "See the pattern? Explosive growth. No security. Major incident. Retroactive tooling. Every single time. And by the time the tooling arrives, the ecosystem is so large that retrofitting security is a Herculean task that never fully succeeds."

**[SCREEN: Animated pattern: Growth arrow up -> explosion icon -> band-aid icon -> repeat. Then a "BREAK THE CYCLE" stamp appears]**

> "We are watching the exact same movie with AI skills. But this time, the stakes are higher. npm packages execute in a JavaScript sandbox. Docker containers run in isolated namespaces. AI skills execute with YOUR full shell permissions. No sandbox. No isolation. No permission model."

**[SCREEN: Permission comparison table:
npm: sandboxed runtime
Docker: isolated namespace
Skills: FULL SHELL ACCESS
The "Skills" row flashes red]**

> "The skills ecosystem is where npm was in 2012. Growing fast, no security tooling, no standards. ClawHavoc should have been the wake-up call. It wasn't. The registries are still operating with no unified security standard. So we're building one."

---

## Section 4: The Solution — SSP

**[TIMESTAMP: 05:00]**

**[SCREEN: SSP logo reveal: "Secure Skill Protocol" with tagline "Trust, Verified."]**

> "The Secure Skill Protocol — SSP — is an open standard that rates every skill on two independent dimensions. Extensibility and Security."

**[SCREEN: Two-axis diagram. X-axis: E0 to E3. Y-axis: S0 to S3. Grid fills in with quadrant labels]**

> "Extensibility — the E-level — tells you what a skill CAN do. E0 is a standalone skill. Just one file, does one thing. E1 is importable — other skills can reference it. E2 is extensible — it has hooks, override points, customization surfaces. E3 is composable — it has a full dependency manifest and can safely participate in multi-skill pipelines."

**[SCREEN: E-level cards flip in one by one with examples: E0 "Code Review Skill", E1 "Logging Framework", E2 "Testing Framework", E3 "Orchestration Pipeline"]**

> "Security — the S-level — tells you how well the skill has been VERIFIED. S0 means never scanned — you have no idea what it does. S1 means it passed automated pattern checks — 29 regex patterns covering destructive commands, code execution, data exfiltration. S2 means it passed LLM intent analysis AND scored 80 or higher on our unified rubric. S3 means all of that PLUS an ed25519 cryptographic signature and a self-audit manifest embedded in the skill itself."

**[SCREEN: S-level progression, animated staircase. Each step lights up green as described. S3 gets a lock icon.]**

**[TIMESTAMP: 06:00]**

> "The badge looks like this."

**[SCREEN: Large badge graphic: "E2/S3" in two-tone blue and green]**

> "E2 slash S3. Six characters. And you know EXACTLY what this skill can do and how well it's been verified. E2 — it's extensible with documented hooks. S3 — it's been scanned, verified by LLM, and cryptographically signed by its author."

**[SCREEN: Contrast badge: "E0/S0" in grey and red. Text: "Unknown. Unscanned. Proceed with extreme caution."]**

> "Compare that to today, where a scraped skill on an unauthorized registry gets a 92 out of 100 from a scanner that can't detect base64 encoding. We're replacing guesswork with a standard."

> "And here's the key innovation. S3 skills are SELF-AUDITABLE. The verification manifest is embedded IN the skill as an HTML comment. It contains the skill's declared permissions, a SHA-256 content hash, an ed25519 signature, and the score at time of signing. Any runtime, any registry, any user can verify the skill independently. Trust lives in the skill. Not in the platform."

**[SCREEN: Show the VSKILL:VERIFY manifest in a SKILL.md file, with each line highlighted and annotated]**

---

## Section 5: Demo

**[TIMESTAMP: 07:00]**

**[SCREEN: Clean terminal, dark theme. Cursor blinking.]**

> "Let me show you what this looks like in practice. Three keystrokes."

**[SCREEN: Type `npx vskill verify ./SKILL.md` — show realistic terminal output]**

```
  VSKILL v1.0 — Secure Skill Protocol Verifier

  Skill:     code-review-assistant
  File:      ./SKILL.md
  SSP:       ssp/v1.0

  E-Level:   E1 (Importable)
  S-Level:   S1 (Scanned)
  Score:     94/100

  FINDINGS (2)

  [MEDIUM] Code Execution
    Line 45: Installs npm packages at runtime
    Penalty: -2.0

  [LOW] Data Access
    Line 112: Reads process.env for configuration
    Penalty: -0.6

  [INFO] Declaration Honesty
    All declared permissions match actual behavior

  RECOMMENDATION
    Score qualifies for S2 with LLM analysis.
    Run: npx vskill verify --deep ./SKILL.md
```

> "Score: 94 out of 100. E1, S1. Two findings — it installs npm packages at runtime, which is a medium-severity code execution vector, and it reads environment variables, which is a low-severity data access pattern. Both are flagged, both have documented penalties, and the total deduction is 2.6 points."

**[SCREEN: Highlight each finding as it's discussed]**

**[TIMESTAMP: 08:00]**

> "Now let me show you what a MALICIOUS skill looks like."

**[SCREEN: Type `npx vskill verify ./malicious-example.md` — show different output]**

```
  VSKILL v1.0 — Secure Skill Protocol Verifier

  Skill:     helpful-code-formatter
  File:      ./malicious-example.md
  SSP:       ssp/v1.0

  E-Level:   E0 (Standalone)
  S-Level:   S0 (FAILED)
  Score:     12/100

  FINDINGS (7)

  [CRITICAL] Code Execution
    Line 23: Base64-encoded executable payload detected
    Penalty: -6.25

  [CRITICAL] Data Access
    Line 31: Exfiltrates data to external host (curl to 45.xx.xx.xx)
    Penalty: -5.0

  [CRITICAL] Destructive Patterns
    Line 38: Recursive file deletion (rm -rf $HOME/*)
    Penalty: -6.25

  [HIGH] Prompt Safety
    Line 8: Overrides system safety instructions
    Penalty: -2.25

  [HIGH] Declaration Honesty
    Declares "read-only, no-network" but executes curl and rm
    Penalty: -2.25

  ...

  VERDICT: UNSAFE — DO NOT INSTALL
```

> "Twelve out of 100. Seven findings. Three critical — base64 payload, data exfiltration, recursive file deletion. And look at this: Declaration Honesty. The skill CLAIMS to be read-only with no network access, but it's running curl to an external IP and deleting files. That's not just unsafe — it's dishonest. SSP catches that."

**[SCREEN: Red banner across terminal: "VERDICT: UNSAFE"]**

> "This is the skill that other scanners gave a 92. SSP gives it a 12. Because SSP checks what a skill SAYS it does against what it ACTUALLY does."

---

## Section 6: Call to Action

**[TIMESTAMP: 09:00]**

**[SCREEN: Clean slide with verified-skill.com URL]**

> "SSP is an open standard. It is not locked to SpecWeave. Any registry, any scanner, any agent platform can implement SSP verification. The specification is public. The scoring algorithm is public. The reference implementation is open source."

**[SCREEN: Show logos of potential adopters: registries, scanners, agent platforms]**

> "Here's what you can do right now."

**[SCREEN: Numbered list appearing one at a time]**

> "One: verify your own skills. Run npx vskill verify on every SKILL.md in your project. Know your score before someone else scores it for you."

> "Two: check your dependencies. If you're using skills from any registry — ClawHub, SkillsMP, OpenSkills, anywhere — verify them. The ClawHavoc attackers targeted the most popular registries because that's where the users are."

> "Three: demand SSP support from your registry. If the platform where you publish or consume skills doesn't support SSP badges, ask them why not. The standard is open and free to implement."

> "Four: contribute to the standard. SSP is version 1.0. It will evolve. If you have ideas for better pattern detection, better scoring weights, better manifest formats — contribute. This is an ecosystem problem and it needs an ecosystem solution."

**[SCREEN: GitHub repo link for SSP specification]**

**[TIMESTAMP: 09:45]**

> "In 2026, 'I didn't know it was malicious' is not an excuse. The tools exist. The standard exists. Use them."

**[SCREEN: Final card — SSP badge "E2/S3" with text: "Trust, Verified." and verified-skill.com URL]**

> "Check out verified-skill.com. Verify your skills. Because trust should be provable — not assumed."

**[SCREEN: End card with subscribe prompt, links to SSP docs, and SpecWeave logo]**

---

## Production Notes

- Total estimated runtime: 9:45
- B-roll needed: Terminal recordings (clean, dark theme), registry screenshots (with permission or fair use commentary), timeline/diagram animations
- Music: Subtle, tension-building for sections 1-3, resolving for sections 4-6. No stock corporate music.
- Graphics needed: SSP badge renders, two-axis diagram animation, E-level/S-level card animations, registry comparison table
- Voice: Single narrator, measured pace, let the data carry the urgency
