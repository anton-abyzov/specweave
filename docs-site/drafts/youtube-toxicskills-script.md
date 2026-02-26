# YouTube Script: Your AI Agent Skills Might Be Malware

**Target length**: 6-8 minutes (~1,100 words spoken)
**Tone**: Urgent but professional. Not fearmongering — data-driven.
**Audience**: Developers using Claude Code, Cursor, or any AI coding agent with skill/plugin systems.

---

## INTRO — The Hook (0:00 - 0:45)

[VISUAL: Screen recording of installing a skill from a community registry — looks normal, fast, easy]

**SCRIPT:**

Installing an AI agent skill takes five seconds. You find one that looks useful, you run the install command, and it is part of your workflow.

But what if that skill is reading your SSH keys? What if it is sending your AWS credentials to an attacker's server?

[VISUAL: Cut to headline — "Researchers Find 341 Malicious Skills on ClawHub"]

In February 2026, Snyk published a study called ToxicSkills. They scanned almost four thousand publicly listed AI agent skills. Over a third of them had security flaws. Seventy-six were confirmed malware.

This is the AI agent supply chain problem, and most developers do not know it exists.

---

## SECTION 1 — The Problem (0:45 - 2:30)

[VISUAL: Diagram showing how a skill gets installed — markdown file → agent reads it → agent executes commands]

**SCRIPT:**

Here is why skills are dangerous. Unlike browser extensions or npm packages, AI agent skills are not sandboxed. A skill is a markdown file that your AI agent reads and follows. Whatever the skill says to do, the agent does — with your permissions. File access, terminal commands, network requests, environment variables. All of it.

[VISUAL: Show the Snyk ToxicSkills summary stats]

Snyk scanned 3,984 skills from public registries. 1,467 — that is 36.82 percent — had at least one security flaw. 76 of those were not accidents. They were deliberate attacks.

[VISUAL: Show attack type breakdown]

The attacks they found include:
- Credential theft — reading SSH keys, AWS tokens, and crypto wallets, then sending them to external servers
- Reverse shells — base64-encoded payloads that give attackers remote access to your machine
- Memory poisoning — silently modifying your agent's configuration files so malicious instructions persist across sessions
- Social engineering — natural language instructions that trick the agent into downloading and running malware

[VISUAL: Show ClawHub download table — top 7 skills, 5 marked malicious]

The worst example is ClawHub. Five of the top seven most-downloaded skills on the platform were malware. One threat actor published nine skills under a single profile — every single one malicious. The platform shut down.

And the threat actors are still active on other registries.

---

## SECTION 2 — Why Platforms Fail (2:30 - 3:30)

[VISUAL: Platform comparison table from docs]

**SCRIPT:**

Most skill platforms have no meaningful security gate. Some of the largest community registries have zero automated checks. Others added protections only after breaches — Smithery, for example, responded only after a path traversal vulnerability exposed three thousand MCP server configurations.

But here is the deeper problem. On most platforms, getting listed requires no submission at all. You push a markdown file to a public repo. Users install it. The platform tracks the install telemetry and automatically surfaces the skill on its leaderboard. No review, no scanning, no verification of who the author is. The more installs a skill gets, the higher it ranks — whether it is legitimate or malware.

That is the fundamental design flaw. These platforms were built for convenience and discovery, not security. Popularity is treated as a signal of quality when it is actually just a signal of distribution. A malicious skill that tricks a hundred developers into installing it ranks HIGHER than a safe skill with ten installs.

This is the same pattern that hit npm in its early years. Open registries with no gatekeeping. Except skills are more dangerous than npm packages, because they execute with the agent's full permissions and developers rarely read the source before installing.

---

## SECTION 3 — The Solution (3:30 - 5:30)

[VISUAL: SpecWeave three-tier diagram]

**SCRIPT:**

We built a three-tier verification system for skills. Every skill published to verifiedskill.com must pass at least the first tier before any developer can install it.

[VISUAL: Show Tier 1 scanning — terminal output of `vskill scan`]

Tier 1 is pattern scanning. 52 rules across 9 categories — destructive commands, remote code execution, credential access, obfuscation, prompt injection, memory poisoning, data exfiltration, dangerous permissions, and suspicious network access. It runs in under 500 milliseconds. It is free.

[VISUAL: Show scan results table from ToxicSkills PoC]

We tested this against the actual malicious skills from Snyk's ToxicSkills repository. Tier 1 caught three out of four samples immediately. The base64-encoded reverse shell — caught. The curl data exfiltration — caught. Blocked before any developer would see them.

[VISUAL: Show the fourth sample — google/SKILL.md with social engineering]

The fourth sample was different. No shell commands, no suspicious syntax. Just natural language: "download this tool from GitHub releases, extract with this password, and run it." Pure social engineering.

Pattern matching cannot catch that. So we built Tier 2.

[VISUAL: Show Tier 2 LLM judge output]

Tier 2 is an LLM-based semantic judge. It reads the skill and evaluates intent, not just syntax. It understands that "download and run this binary" is a social engineering attack even when no shell command appears in the text. Cost: three cents per skill. Time: a few seconds.

Combined result against the ToxicSkills samples: four out of four detected. 100 percent.

[VISUAL: Show Tier 3 — human review badge]

Tier 3 is human review plus sandbox testing for high-trust skills. A security professional reads the full source, tests it in an isolated environment, and certifies that the declared behavior matches the actual behavior.

---

## SECTION 4 — What You Should Do (5:30 - 6:30)

[VISUAL: Terminal — running `vskill scan` on a downloaded skill file]

**SCRIPT:**

Three things you can do right now.

First — review every skill you have installed. Open the source files and look for shell commands, network requests, and file access patterns you did not put there.

Second — prefer registries that scan skills before publication, not after. If a platform has no security scanning, assume some of its skills are compromised, because statistically, they are.

Third — run `vskill scan` on any community skill before you install it. It is free, it takes under a second, and it catches 75 percent of known attack patterns at Tier 1 alone.

The skill ecosystem is growing fast. Thousands of new skills are being published every month. The convenience is real. The risk is also real.

---

## OUTRO — CTA (6:30 - 7:00)

[VISUAL: verifiedskill.com homepage + spec-weave.com/docs/skills/verified-skills]

**SCRIPT:**

The verified skills registry is at verifiedskill.com. The full security landscape analysis, platform comparison, and three-tier standard documentation are at spec-weave.com. Links in the description.

If you found this useful, share it with your team. The developers most at risk are the ones who do not know the risk exists.

---

## METADATA

**Title options:**
1. "Your AI Agent Skills Might Be Malware (ToxicSkills Study)"
2. "36% of AI Skills Have Security Flaws — Here's the Fix"
3. "The AI Agent Supply Chain Attack Nobody Talks About"

**Description:**
Snyk's ToxicSkills study found 1,467 flawed skills out of 3,984 scanned — 76 with confirmed malicious payloads. We tested SpecWeave's three-tier verification scanner against real malicious samples from the study. Here's what we found.

**Tags:** AI security, agent skills, ToxicSkills, Snyk, supply chain attack, Claude Code, skill verification, verified skills, SpecWeave

**Links for description:**
- Snyk ToxicSkills study: https://snyk.io/blog/toxicskills
- ToxicSkills PoC repo: https://github.com/snyk-labs/toxicskills-goof
- Verified Skills registry: https://verifiedskill.com
- Security landscape docs: https://spec-weave.com/docs/skills/skills-ecosystem-security
- Verified Skills standard: https://spec-weave.com/docs/skills/verified-skills
