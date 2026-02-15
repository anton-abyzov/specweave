# Skills Are the New Libraries

## The Four Generations of Package Management

Software packaging has evolved through four distinct generations. Each solved the same fundamental problem — distributing reusable code — for its era's dominant paradigm.

**Generation 1: Language-specific, server-side (2010-2015).** npm launched in 2010 alongside Node.js, giving JavaScript its first real package ecosystem. Within three years it housed 50,000 packages. pip formalized Python's packaging story. NuGet did the same for .NET. Each registry was tightly coupled to one language, one runtime, one ecosystem.

**Generation 2: Systems-level, safety-focused (2015-2020).** Cargo arrived with Rust in 2015, bringing the first package manager designed with security and reproducibility as primary concerns. Lockfiles, checksums, and deterministic builds became expected features. Go modules followed with similar philosophy. This generation proved that security could be built into packaging — if you started early enough.

**Generation 3: Container and infrastructure packaging (2018-2023).** Docker Hub, Helm charts, Terraform modules. Packaging expanded beyond application code into infrastructure definitions. The unit of distribution grew from "a library" to "an entire runtime environment." Security scanning became an afterthought bolted on years later.

**Generation 4: AI skills (2025-present).** Skills are markdown files that instruct AI agents how to behave. They are the first package format that is simultaneously language-agnostic, platform-agnostic, and runtime-agnostic. A single SKILL.md file works across Claude, GPT, Gemini, and any agent that reads markdown. No compilation. No dependencies. No runtime. Just instructions — with the power to execute arbitrary shell commands on the user's machine.

This is the generation we are in now, and we are repeating every mistake of the first three.

## The Scale Nobody Expected

The AI skills ecosystem has grown faster than any previous package format in its first year.

| Platform | Skills Listed | Notes |
|----------|--------------|-------|
| skills.sh | ~59,848 | Vercel-hosted aggregator |
| SkillsMP | 87K-96K+ | Claims 200K+ including duplicates |
| Skills Directory | 36,109 | Letter-grade quality ratings |
| SkillShield | 10,644 | Security-scanned subset |
| OpenSkills.app | ~41 | Curated, community-run |
| majiayu000 registry | 24,176 | Automated GitHub scraper |

For comparison, npm had approximately 15,000 packages after its first full year. The skills ecosystem already has registries numbering in the tens of thousands — and none of them agree on quality standards, security scoring, or even what constitutes a "skill."

The raw numbers are misleading. Research shows 59% of skills ship embedded scripts, 12% are completely empty, and automated scrapers like `majiayu000/claude-skill-registry` inflate counts by crawling every SKILL.md file on GitHub without permission or verification. But even accounting for noise, the velocity is unprecedented.

## The Problem We Already Have

On January 27-29, 2026, Snyk security researchers discovered **341 malicious skills on ClawHub** — one of the largest skill registries. That number represented **12% of the entire registry** at the time of discovery [1].

The campaign, dubbed **ClawHavoc**, was not sophisticated. The attackers used a simple playbook:

1. Create skills with appealing names and descriptions
2. Embed base64-encoded payloads in skill instructions
3. When an AI agent loaded the skill, it would decode and execute the payload
4. The payload delivered **Atomic Stealer** malware, exfiltrating browser credentials, crypto wallets, and session tokens

The base64 encoding was enough to bypass every existing scanner. SkillShield, one of the more rigorous scanning platforms, gave some of these skills scores above 90/100 because their static analysis checked for known dangerous patterns in plaintext — not encoded variants [2].

This was not an isolated incident. Snyk's broader **ToxicSkills** study found that **36.82% of skills across registries have security flaws** ranging from unintended shell access to prompt injection vulnerabilities [1]. More than one in three skills is unsafe by default.

Three fundamental design flaws in the skills ecosystem enable these attacks:

1. **No sandboxing.** Skills can instruct AI agents to execute arbitrary shell commands, read files, and make network requests. There is no permission model, no capability restriction, no sandbox boundary.

2. **No cryptographic verification.** Anyone can publish a skill claiming to be from any author. There is no signing mechanism, no provenance chain, no way to verify that a skill has not been modified since its author published it.

3. **Precedence override risk.** Skills can contain instructions that override system prompts and safety guidelines. A malicious skill can instruct an agent to ignore previous instructions, disable safety checks, or exfiltrate conversation context — and many agents will comply.

## The Historical Parallel We Should Have Learned From

Every package ecosystem has gone through its security reckoning. The pattern is always the same: explosive growth, then a major incident, then retroactive security tooling.

**npm (2010 to 2018).** npm launched with no security scanning at all. For eight years, `npm install` was an act of faith. In 2018, the `event-stream` incident — where a maintainer handed off a popular package to a stranger who injected a cryptocurrency-stealing payload — finally forced npm to add `npm audit`. By then, the registry had over 700,000 packages and the attack surface was enormous.

**PyPI (2003 to present).** Python's package registry has never fully solved its malware problem. Typosquatting attacks — publishing `reqeusts` to catch misspellings of `requests` — are discovered weekly. PyPI added two-factor authentication for maintainers in 2023, thirteen years after the problem was identified. Malicious packages are still uploaded and downloaded daily.

**Docker Hub (2014 to present).** Container images with embedded cryptominers, backdoors, and data exfiltration tools have been a persistent problem. Docker added image scanning in 2019, five years after launch. Studies in 2020 found that 51% of images on Docker Hub had at least one critical vulnerability.

The pattern is clear. Security gets added years after launch, after major incidents, after the ecosystem is too large to easily retrofit. By the time `npm audit` existed, the JavaScript ecosystem had to scan hundreds of thousands of existing packages — a task that is still incomplete.

**We are watching the same movie again, but this time the stakes are higher.** npm packages execute in a sandboxed Node.js runtime. Docker containers run in isolated namespaces. AI skills execute with the full permissions of the user's shell. A malicious npm package can steal environment variables; a malicious skill can `rm -rf /`, exfiltrate your entire home directory, or install persistent backdoors — all by writing a few lines of markdown.

The skills ecosystem is approximately where npm was in 2012: growing fast, no security tooling, no standards body, and no major incident large enough to force industry-wide action. ClawHavoc should have been that incident. It was not. The registries are still operating with no unified security standard.

## The Solution: Secure Skill Protocol (SSP)

SSP is designed to avoid the retroactive security trap by building trust into skills from day one.

The protocol rates every skill on two independent dimensions:

**Extensibility (E-level)** measures what a skill can do architecturally:
- **E0 Standalone**: A single SKILL.md file with no imports, exports, or dependencies
- **E1 Importable**: Declares a stable API surface that other skills can reference
- **E2 Extensible**: Provides documented hooks and override points for customization
- **E3 Composable**: Full dependency manifest with conflict resolution and DAG safety

**Security (S-level)** measures how well a skill has been verified:
- **S0 Unknown**: No scan has been performed
- **S1 Scanned**: Passed automated pattern checks (29+ regex patterns for destructive commands, code execution, data exfiltration)
- **S2 Verified**: S1 plus LLM-based intent analysis, unified score of 80/100 or higher
- **S3 Certified**: S2 plus ed25519 cryptographic signature and a self-audit manifest embedded in the skill itself

The badge format is compact and readable: **E2/S3** tells you immediately that a skill is extensible with documented hooks and has been cryptographically certified. **E0/S1** tells you it is standalone and has only passed basic automated scanning.

The scoring algorithm is **deterministic and versioned**. SSP version `ssp/v1.0` will always produce the same score for the same skill content. There is no LLM variability in the score itself — LLM analysis contributes to S2 qualification but the numeric score is computed from weighted pattern matching across five categories:

- Destructive patterns (25%): `rm -rf`, `DROP TABLE`, disk formatting
- Code execution (25%): `eval`, `exec`, `curl | bash`, `child_process`
- Data access (20%): `.env` reading, credential access, network calls
- Prompt safety (15%): Injection patterns, precedence overrides
- Declaration honesty (15%): Does the skill do what it claims? Do declared permissions match actual behavior?

The critical innovation is **S3 self-auditability**. An S3 skill contains a `<!-- VSKILL:VERIFY ssp/v1 -->` manifest that includes its declared permissions, a SHA-256 content hash, an ed25519 signature, and its score at the time of signing. Any runtime can independently verify the skill without trusting the registry that hosts it.

This means trust is portable. A skill verified on one registry carries its proof with it when scraped, copied, or redistributed to another. The trust lives in the skill, not in the platform.

**Verification takes three keystrokes:**

```
npx vskill verify ./SKILL.md
```

The `vskill` CLI produces a score, lists findings by category and severity, and reports the E/S level — in both human-readable terminal output and machine-parseable JSON.

## The Vision: Trust as Infrastructure

HTTPS certificates transformed the web from a place where every connection was suspect into one where encrypted, authenticated communication is the default. The browser shows a lock icon; users trust the site. The certificate authority infrastructure — imperfect as it is — made this possible.

SSP aims to do the same for AI skills. Every skill carries its own trust certificate. Every registry can verify it. Every user can audit it. The badge is immediately legible: E2/S3 means something specific, measurable, and reproducible.

The tools are open. The standard is open. The scoring algorithm is open. Any agent platform, any registry, any scanning service can implement SSP verification. SpecWeave publishes the standard, but the standard belongs to the ecosystem.

Because in 2026, the answer to "I didn't know it was malicious" cannot be "there was no way to check." The tools exist. The standard exists. The only question is whether the ecosystem adopts it before the next ClawHavoc — or after.

## Sources

[1] Liran Tal, "Malicious MCP servers and AI Skills: Snyk Research Discovers Threat Actors Targeting AI Agent Infrastructure," Snyk, February 3, 2026. https://snyk.io/articles/skill-md-shell-access/

[2] Liran Tal, "ToxicSkills: Malicious AI Agent Skills on ClawHub," Snyk, 2026. https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/

[3] UK National Cyber Security Centre, "Prompt Injection: Emerging Cyber Threat to AI Systems," NCSC Blog. https://www.ncsc.gov.uk/blog-post/prompt-injection-ai-systems
