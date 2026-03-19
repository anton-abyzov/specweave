# Why Verified Skill Matters — Lessons from ClawHub's Collapse

## The Short Version

In January-February 2026, security researchers discovered 341+ malicious skills on ClawHub — the largest community skill marketplace for Claude Code. Five of the top seven most-downloaded skills on the platform were malware. ClawHub is now shut down. The threat actors are not.

This is why we built [verified-skill.com](https://verified-skill.com) — a skill registry with mandatory three-tier verification before any skill reaches developers.

---

## What Happened to ClawHub

ClawHub was a community-run marketplace where anyone could publish and install skills for Claude Code and other AI agents. Skills are markdown files that instruct AI agents how to behave — they can execute shell commands, make network requests, read files, and access environment variables.

ClawHub had:
- No automated security scanning
- No mechanism to flag skills as malicious
- No review process for submissions
- No verification of skill authors

### The Headlines

In February 2026, the story broke:

- **"Researchers Find 341 Malicious ClawHub Skills Stealing Data from OpenClaw Users"**
- **"OpenClaw's AI 'skill' extensions are a security nightmare"** — The Verge, Emma Roth, Feb 4, 2026
- **"Hundreds of Malicious Skills Found in OpenClaw's ClawHub"** — Aikido Security

### What the Malicious Skills Actually Did

Security researcher Paul (Aikido Security) documented the attack patterns found in the wild:

**Social engineering ("ClickFix" attacks):**
> "The skills say, 'Hey, if you want to talk to Polymarket, you have to download this Polymarket authentication tool.' You download it. It's actually malware."

**Base64-obfuscated credential theft:**
Commands disguised as configuration that exfiltrate AWS keys, API tokens, and wallet credentials in a single HTTP request.

**Reverse shells and SSH backdoors:**
Persistent remote access to the developer's machine.

**Overlay attacks:**
Malicious JavaScript that pops open a fake login screen to harvest credentials.

**Prompt injection (91% of malicious skills):**
Hidden instructions in markdown that hijack the agent's behavior silently. The developer sees a normal response. The attacker sees source code.

### One Threat Actor, Nine Malicious Skills

The ClawHub profile `@hightower6eu` published nine skills — every single one malicious:

| Skill Name | Downloads | Attack Type |
|-----------|-----------|-------------|
| Autoupdater Skills | 131 | Auto-updater trojan |
| Polymarket Tranding [sic] | 115 | Crypto bait + credential theft |
| Clawhub | 109 | Platform impersonation |
| Skills Update | 640 | Auto-updater trojan |
| Polymarket Automatic Trading Bot | 911 | Crypto bait + credential theft |
| Clawhub | 1,364 | Platform impersonation |
| Skills Auto-Updater | 951 | Auto-updater trojan |
| Polymarket Trading Bot | 1,293 | Crypto bait + credential theft |
| Clawhub | 1,393 | Platform impersonation |

Three attack strategies in one profile: platform impersonation (skills named "Clawhub"), financial bait (Polymarket trading bots targeting crypto developers), and auto-updater trojans (promising to keep tools current while running malicious code).

### The Most-Downloaded Skills Were Malware

When you sorted ClawHub's skill library by downloads, the most popular content on the platform was malicious:

| Rank | Skill | Downloads | Status |
|------|-------|-----------|--------|
| 1 | Clawhub /clawhubcli | 1,399 | **Malicious** |
| 2 | Clawhub /clawhub | 1,368 | **Malicious** |
| 3 | Polymarket Trading Bot /poly | 1,297 | **Malicious** |
| 4 | moltbook-interact | 1,141 | Unmarked |
| 5 | Skills Auto-Updater /updater | 956 | **Malicious** |
| 6 | Polymarket Automatic Trading Bot /polym | 921 | **Malicious** |
| 7 | Capability Evolver | 695 | Unmarked |

**Five of the top seven most-downloaded skills were malware.** Real developers, running real AI agents, executing malicious instructions — with no warning from the platform.

### No Way to Report, No Way to Remove

When security researcher Paul tried to fix the problem:

> "There was no way to label a skill as malicious. Literally no way. I went to the GitHub repo that backs ClawHub and made a PR deleting 400 malicious packages. Their AI closed the PR and said, 'This is a copy of our database, this isn't being used.'"

An AI rejected the security fix. The platform had no infrastructure for safety.

---

## The Industry Response — And Its Limits

After ClawHub's collapse, the industry started responding. Vercel — which runs skills.sh, the largest active skill marketplace — partnered with Gen Digital, Socket, and Snyk to add automated security audits. Every skill now gets scanned by three independent providers:

| Provider | What It Checks |
|----------|----------------|
| **Gen Agent Trust Hub** | Content analysis, URL verification, antivirus scanning, AI-powered threat detection |
| **Socket** | Supply chain risk, package quality, vulnerability scoring |
| **Snyk** | Prompt injection, data exfiltration vectors, dangerous dependencies |

Results appear publicly on each skill's detail page. Skills flagged as malicious are hidden from search and leaderboards. This is meaningful progress.

**But there's a critical gap: detection vs prevention.**

Consider the `capability-evolver` skill on skills.sh (by `autogame-17`). It FAILS two security audits (Gen Agent Trust Hub, Socket) and gets a WARN from Snyk. Yet it remains live, installable, and receives **55 weekly downloads**. The audits inform. They don't block.

This is the difference between **labeling** and **gating**:
- **skills.sh model**: Scan, label, warn — but let developers install anyway
- **verified-skill.com model**: Scan, judge, review — reject before publication. A skill that fails Tier 1 never reaches the registry.

Both approaches have value. But when 5 of the top 7 most-downloaded skills on ClawHub were malware, labeling alone isn't enough. Developers under time pressure will click through warnings. Prevention must be the default.

### The skills.sh Audits Dashboard

Skills.sh now provides a public Security Audits page (`skills.sh/audits`) showing combined results from all three providers in a single table. Each skill displays its Gen, Socket, and Snyk ratings side by side.

Even this dashboard reveals the gap: `browser-use` shows CRITICAL across all three providers yet remains listed. Official skills from Vercel and Anthropic show MED RISK or HIGH RISK from Snyk — demonstrating that even trusted-vendor skills can flag patterns that need review.

### What verified-skill.com Adds: Prevention + Public Blocklist

We match the transparency of skills.sh's multi-provider audit model, but add two critical layers:

1. **Prevention by default**: A skill that fails Tier 1 scanning is rejected. It never appears in the registry. Developers cannot install a skill that hasn't passed verification. This is the difference between a warning label and a locked gate.

2. **Public Malicious Skills Registry**: We maintain a continuously-updated blocklist of known-malicious skills discovered through our scanning — not just submissions to our platform, but skills found across other marketplaces. If a skill is known-malicious, it is blocked from installation even if a user attempts to install it directly. The blocklist is public and queryable, serving as a shared resource for the entire ecosystem.

---

## Why This Still Matters After ClawHub's Closure

ClawHub is gone. The problem is not. Three reasons:

### 1. The Threat Actors Didn't Retire

The same attackers operate across multiple platforms. As Paul noted:

> "There's a room in North Korea right now that all they're doing is figuring out how to drop the same payloads they're using in npm and GitHub into these skills."

The malicious skill files were copied, forked, and republished. A public GitHub repository with 43 ready-to-deploy malicious skills (by threat actor `aztr0nutzs`) is still live at the time of writing.

### 2. Other Marketplaces Face the Same Risks

- **Skills.sh**: 59,000+ skills. No automated scanning.
- **SkillsMP**: 96,000+ skills. Minimal verification.
- **At least 10 competing registries** — none share a security standard.

The Snyk ToxicSkills audit (February 2026) found that **36.82% of skills across registries have security flaws**. That's more than 1 in 3. ClawHub wasn't uniquely bad — it was just the first to get caught at scale.

### 3. Skills Are More Dangerous Than npm Packages

This is the critical insight. An npm package runs in a sandboxed JavaScript environment. A Docker container runs in an isolated namespace. A skill runs inside an AI agent that **already has your shell permissions**.

> "You're inside Claude, right? You've probably already given it access to things. So now you drop this malicious skill that can do all kinds of stuff. Because of that pre-existing set of permissions and trust that you've built with that agent — it's ultimately going to have more impact than npm." — Paul, Aikido Security

A malicious npm package has a scoped attack surface (install scripts). A malicious skill inherits everything the agent can do — file access, network requests, environment variables, SSH keys, shell execution. The blast radius is your entire development environment.

---

## What We Built: verified-skill.com

We built [verified-skill.com](https://verified-skill.com) because the PATTERN is broken, not just ClawHub. Every skill marketplace will face this problem. The only question is whether security comes before or after developers get compromised.

### Three-Tier Verification Pipeline

**Tier 1: Automated Pattern Scanning (37 checks)**

Deterministic regex-based analysis across 8 categories:
- Command injection (exec, spawn, system calls)
- Data exfiltration (fetch to external/dynamic URLs, WebSocket, DNS exfil)
- Privilege escalation (sudo, chmod, setuid)
- Credential theft (.env files, SSH keys, AWS credentials, keychain access)
- Prompt injection (system prompt overrides, instruction boundary escape)
- Filesystem access (recursive delete, writes to system paths, path traversal)
- Network access (curl/wget to unknown hosts, reverse shell patterns)
- Code execution (eval, Function constructor, dynamic imports)

Score below 50 = immediate rejection. Score 50-79 = flagged for review. Score 80+ = proceeds to Tier 2.

**Tier 2: LLM Intent Analysis**

Llama 3.1 70B analyzes the skill's semantic intent — catching what regex cannot:
- Social engineering patterns
- Indirect prompt injection
- Subtle data flows that look benign individually but are malicious in combination
- Instructions that contradict the skill's stated purpose

Score below 40 = rejected. Score 80+ = auto-approved.

**Tier 3: Human Expert Review**

A reviewer with admin credentials manually examines the skill. Confirms it does what it claims and nothing else. Decision is recorded in an immutable audit trail: reviewer ID, timestamp, reason, admin email.

### What ClawHub Didn't Have (and We Do)

| Capability | ClawHub | verified-skill.com |
|-----------|---------|-------------------|
| Automated scanning | None | 37 patterns, 8 categories |
| AI intent analysis | None | LLM-as-judge (Tier 2) |
| Human review | None | Admin reviewer role (Tier 3) |
| Malicious flagging | No mechanism existed | Reject at any tier, pull published skills |
| Audit trail | None | Immutable state event log |
| Author verification | GitHub sign-in only | GitHub OAuth + account age check |
| Rate limiting | None | 10 submissions/hour/IP |
| Content integrity | None | SHA hash in vskill.lock |
| Version pinning | None | Lockfile with scan date + tier |
| Vendor trust | None | Whitelist for verified orgs (Anthropic, OpenAI, Google) |

### Client-Side Protection

Every installed skill gets a lockfile entry (`vskill.lock`):
- SHA hash of skill content
- Scan date and verification tier reached
- Installation scope (user-global vs project-local)
- Installed path

When a skill updates, the new version is diff-scanned before being applied. New security findings are flagged before installation.

---

## The Pattern We're Breaking

Every package ecosystem follows the same arc:

| Ecosystem | Launch | First Major Incident | Security Tooling Added | Gap |
|-----------|--------|---------------------|----------------------|-----|
| npm | 2010 | 2018 (event-stream) | 2018 (npm audit) | 8 years |
| PyPI | 2003 | Ongoing | Partial (2023+) | 20+ years |
| Docker Hub | 2013 | 2014 (cryptominers) | 2019 (image scanning) | 5 years |
| Skills | 2025 | 2026 (ClawHavoc) | ? | **Now** |

Explosive growth. No security. Major incident. Retroactive tooling. Every time.

We built verified-skill.com so the skills ecosystem doesn't have to follow this pattern. Security from day one — not year eight.

---

## What You Should Do

1. **Audit your installed skills.** If you installed anything from ClawHub, remove it. Run `npx vskill verify` on skill files in your project.

2. **Don't install from unverified sources.** If a marketplace doesn't show you what security checks a skill has passed, treat every skill as potentially malicious.

3. **Use verified-skill.com.** Every skill has been through automated scanning, AI intent analysis, and — for certified skills — human review. The methodology is public. Trust is provable.

---

## Resources

- [verified-skill.com](https://verified-skill.com) — Verified skill registry
- [Snyk ToxicSkills Report](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) — Full security audit
- [mcp-scan](https://github.com/invariantlabs-ai/mcp-scan) — Open-source skill scanner
- [SpecWeave](https://spec-weave.com) — Spec-driven development framework
- [Video: ClawHub Postmortem](../academy/videos/003-clawhub-postmortem.md) — Full video walkthrough
