# Skill Contradictions: Real-World Examples of Conflicting Agent Instructions

Research compiled: 2026-02-15

---

## 1. Executive Summary

As the AI agent skills ecosystem grows past 200,000 published skills, the problem of contradicting instructions between different skill sources has moved from theoretical concern to daily developer frustration. This document catalogs real-world examples of contradictions across four categories: behavioral, configuration, dependency, and precedence. The findings draw from actual SKILL.md files published by Vercel, Google, Softaworks, Callstack, Microsoft, community authors on Skills.sh, and the wider GitHub ecosystem.

Key findings:

- **9 competing React skills** exist on Skills.sh alone, each with different opinions on memoization, state management, and component patterns
- A Bun runtime skill explicitly instructs agents to "never use npm, yarn, pnpm, or node directly" while dozens of other skills hardcode `npm run` and `npm install` commands
- Vercel's react-best-practices says "do not wrap simple expressions with primitive types in useMemo" while a competing clean-code skill mandates "memoize when passing callbacks/objects to memoized children" with no nuance about expression complexity
- No agent runtime currently detects or warns about contradictions between installed skills -- the first tool to attempt this (Skill_Seekers) focuses only on doc-vs-code gaps, not skill-vs-skill conflicts
- The softaworks/agent-toolkit `agent-md-refactor` skill is the only skill designed to detect instruction contradictions, but it operates on a single project's AGENTS.md file, not across installed skills

The absence of contradiction detection represents a significant gap in the skills ecosystem that SpecWeave's Fabric Registry can address as a differentiating feature.

---

## 2. Methodology

### 2.1 Research Approach

1. **Skills.sh directory analysis**: Cataloged all React, TypeScript, and coding-standards skills on Skills.sh, identifying 9 competing React skills, 2 TypeScript skills, and 3+ coding standards skills
2. **SKILL.md content extraction**: Fetched and analyzed actual SKILL.md content from:
   - Vercel Labs (`vercel-labs/agent-skills`): react-best-practices
   - Softaworks (`softaworks/agent-toolkit`): react-dev, agent-md-refactor
   - Google Labs Code (`google-labs-code/stitch-skills`): react-components
   - Callstack (`callstackincubator/agent-skills`): react-native-best-practices
   - Community (`wshobson/agents`): react-state-management
   - Community (`bout3fiddy/agents`): bun
   - Community (`secondsky/claude-skills`): bun-package-manager
   - Community (`Jeffallan/claude-skills`): react-expert
   - Community (`xenitV1/claude-code-maestro`): clean-code
   - Community (`affaan-m/everything-claude-code`): coding-standards
3. **Web research**: Searched GitHub issues, community discussions, blog posts, and review articles for documented cases of skill conflicts
4. **Precedence analysis**: Reviewed official documentation from Claude Code, Codex CLI, GitHub Copilot, and Cursor for instruction conflict resolution mechanisms

### 2.2 Limitations

- Not all SKILL.md files are publicly accessible in raw form; some analysis relies on skill page summaries and descriptions from Skills.sh and agent-skills.md
- The vibecoding.app review of Skills.sh references "contradictory" trending skills but does not name them specifically
- Some contradictions are contextual rather than absolute -- they may not cause problems in every project, but become problematic when both skills are active simultaneously

---

## 3. Behavioral Contradictions

### 3.1 Memoization Strategy: "Always Memoize" vs "Don't Wrap Simple Expressions"

| Aspect | Detail |
|--------|--------|
| **Skill A** | `react-expert` by Jeffallan/claude-skills (Skills.sh, 100+ installs) |
| **Skill A Instruction** | "Memoize when passing callbacks/objects to memoized children" -- stated as a MUST DO constraint with no exception for simple expressions |
| **Skill B** | `react-best-practices` by vercel-labs/agent-skills (Skills.sh, 234,000+ installs as Vercel's flagship) |
| **Skill B Instruction** | "Do not wrap simple expressions with primitive types in useMemo" -- explicitly warns against over-memoization of trivial computations |
| **Impact** | When both skills are installed, the agent receives contradictory directives about when to apply useMemo. The react-expert skill says always memoize what you pass to memoized children; Vercel says skip memoization for simple primitive expressions. An agent resolving this randomly could either add unnecessary useMemo wrappers (performance overhead from dependency comparison) or skip memoization where it matters (causing unnecessary re-renders). |
| **Severity** | Medium |
| **Resolution Strategy** | Context-aware merging: apply Vercel's rule as the default, with the react-expert's rule applying only for non-primitive values. A contradiction detector should flag both rules and present the user with a "which takes priority?" prompt. |

### 3.2 React 18 forwardRef vs React 19 "ref as prop"

| Aspect | Detail |
|--------|--------|
| **Skill A** | `react-dev` by softaworks/agent-toolkit (Skills.sh, 1,677 installs) |
| **Skill A Instruction** | Covers React 18-19. Explicitly states: "Accept ref as a regular component property instead of using forwardRef wrapper" and lists as mandatory: "Implement ref as prop in React 19" and "Never implement forwardRef in React 19+" |
| **Skill B** | `react:components` by google-labs-code/stitch-skills (Skills.sh, 5,652 installs) |
| **Skill B Instruction** | Enforces strict TypeScript interfaces for all components with validation scripts using @swc/core AST checking. The skill makes no mention of React 19's ref-as-prop pattern and does not deprecate forwardRef. Its validation scripts check for proper interface declarations but do not account for ref prop patterns. |
| **Impact** | In a React 19 project, Softaworks' skill will instruct the agent to use ref-as-prop, while Google's Stitch skill's validation may flag or ignore this pattern since its AST checker was built for pre-React-19 conventions. An agent following both will attempt to validate a React 19 ref-as-prop component through a validator that does not recognize the pattern, potentially producing false positives or causing the agent to revert to forwardRef to pass validation. |
| **Severity** | High |
| **Resolution Strategy** | Version-gated rules: skills should declare which React version they target. A contradiction detector should compare `react` version in `package.json` against skill assumptions and warn when a skill's React version assumption does not match the project. |

### 3.3 State Management Library Preference: "Use Zustand" vs "Use Redux Toolkit" vs "Use Context"

| Aspect | Detail |
|--------|--------|
| **Skill A** | `react-state-management` by wshobson/agents (Skills.sh, 2,114 installs) |
| **Skill A Instruction** | Recommends a decision matrix: "For small apps with simple state use Zustand or Jotai; for large apps with complex state use Redux Toolkit; for heavy server interaction use React Query with light client state." Explicitly states "avoid over-globalization of state." |
| **Skill B** | `react-best-practices` by vercel-labs/agent-skills (AGENTS.md) |
| **Skill B Instruction** | Notes that "Context can cause re-renders when any cart value changes" and recommends "Zustand selectors for performance optimization" as the alternative. Does not mention Redux Toolkit as a recommended pattern. |
| **Skill C** | `clean-code` by xenitV1/claude-code-maestro (agent-skills.md) |
| **Skill C Instruction** | Lists "zustand/jotai (state)" as the 2025 recommendation alongside specific library choices: "zod/valibot (validation), ky/ofetch (HTTP), drizzle/prisma (ORM)." No mention of Redux Toolkit as a valid choice. |
| **Impact** | An agent with all three skills active faces a three-way conflict: wshobson says Redux Toolkit is appropriate for large apps, Vercel says use Zustand selectors instead of Context (implicitly dismissing Redux), and the clean-code skill lists only Zustand/Jotai (explicitly excluding Redux from its recommendation list). In a large enterprise project, the agent may oscillate between suggesting Redux Toolkit (per wshobson) and Zustand (per Vercel and clean-code). |
| **Severity** | Medium |
| **Resolution Strategy** | Project-context detection: check if the project already uses a state management library (via package.json) and prefer continuity over skill preferences. When no library is present, surface the conflict to the user with a comparison table. |

---

## 4. Configuration Contradictions

### 4.1 npm Validation Commands vs Bun-Only Runtime

| Aspect | Detail |
|--------|--------|
| **Skill A** | `react:components` by google-labs-code/stitch-skills (Skills.sh, 5,652 installs) |
| **Skill A Instruction** | Hardcodes npm commands in its validation workflow: "Running `npm run validate <file_path>` on each component" and "Dev server verification with `npm run dev`." The skill's `package.json` declares validator dependencies and assumes npm as the package manager. |
| **Skill B** | `bun` by bout3fiddy/agents (SkillsMP listing) |
| **Skill B Instruction** | Description states Bun "replaces npm, yarn, pnpm, and node." SkillsMP listing reports the directive: "Bun is the ONLY approved JavaScript/TypeScript toolkit. Never use npm, yarn, pnpm, or node directly." |
| **Impact** | When both skills are active in a Bun-based project, the agent faces a direct command conflict: Google's Stitch skill tells it to run `npm run validate`, while the Bun skill tells it to never use npm. The agent must choose between following the validation workflow (which requires npm) and following the runtime constraint (which forbids npm). In practice, the agent may attempt `bun run validate` as a substitution, but this may fail if the validation scripts have npm-specific assumptions. |
| **Severity** | High |
| **Resolution Strategy** | Command abstraction: skills should use generic commands (e.g., `$PKG_MANAGER run validate`) or detect the project's package manager from lockfiles. A contradiction detector should flag any skill that hardcodes a specific package manager command and compare it against any installed package-manager-specific skill. |

### 4.2 File Size Limits: "50/300 Rule" vs No Limit

| Aspect | Detail |
|--------|--------|
| **Skill A** | `clean-code` by xenitV1/claude-code-maestro (agent-skills.md) |
| **Skill A Instruction** | Enforces "50/300 Rule: Functions exceeding 50 lines should be broken down; files exceeding 300 lines should be split." This is presented as a non-negotiable protocol. |
| **Skill B** | `react-best-practices` by vercel-labs/agent-skills |
| **Skill B Instruction** | Contains 40+ rules across 8 categories with detailed code examples. The AGENTS.md file itself exceeds 300 lines of dense instructions. More importantly, the skill makes no mention of file size limits and several of its recommended patterns (such as comprehensive component files with multiple hooks, memoization, and server-side logic) can easily produce files exceeding 300 lines. |
| **Impact** | An agent following both skills simultaneously may generate a well-optimized React component per Vercel's guidelines, then immediately attempt to split it per the clean-code skill's 300-line rule, potentially breaking the component's cohesion and the performance optimizations that depend on co-location (e.g., hoisting static JSX outside the component body requires the static JSX and the component to be in the same file). |
| **Severity** | Low-Medium |
| **Resolution Strategy** | Priority-based override: the clean-code skill should be treated as a general guideline that domain-specific skills (like react-best-practices) can override for justified reasons. A conflict detector should warn when a general coding standard conflicts with a domain-specific optimization pattern. |

### 4.3 Dependency Pinning Strategy: "Pin Versions" vs "Use Caret Ranges"

| Aspect | Detail |
|--------|--------|
| **Skill A** | `clean-code` by xenitV1/claude-code-maestro (agent-skills.md) |
| **Skill A Instruction** | Protocol 1 (Supply Chain Security): "Pin versions in production; avoid `^` or `~` for critical dependencies." |
| **Skill B** | Standard npm/Node.js ecosystem behavior assumed by most other skills |
| **Skill B Context** | Most skills that include `npm install` or `bun add` commands expect default caret (`^`) version ranges. The `bun-package-manager` skill by secondsky/claude-skills documents that `bun add <pkg>` adds with caret by default. Vercel's react-best-practices does not mention version pinning and assumes standard dependency resolution. |
| **Impact** | An agent following the clean-code skill will pin every dependency to an exact version (e.g., `"react": "19.0.0"` instead of `"react": "^19.0.0"`), while other skills that recommend adding packages expect caret ranges. This creates a project configuration mismatch: the agent may pin versions when adding new deps per clean-code, then install packages with caret ranges when following another skill's instructions. The result is an inconsistent `package.json` where some dependencies are pinned and others are not. |
| **Severity** | Medium |
| **Resolution Strategy** | Project policy detection: check the existing `package.json` for the dominant versioning pattern and follow it. Flag the contradiction to the user with a recommendation to set an explicit project-level policy. |

---

## 5. Dependency Contradictions

### 5.1 React Version Assumptions: React 18 Patterns vs React 19 Patterns

| Aspect | Detail |
|--------|--------|
| **Skill A** | `react-dev` by softaworks/agent-toolkit (Skills.sh, 1,677 installs) |
| **Skill A Instruction** | Explicitly targets React 18-19 with React 19 as the primary: "ref as prop (forwardRef deprecated)," "useActionState (replaces useFormState)," "use() function" for unwrapping promises. Lists "Never implement forwardRef in React 19+," "Never reference deprecated useFormState." |
| **Skill B** | `react:components` by google-labs-code/stitch-skills (Skills.sh, 5,652 installs) |
| **Skill B Instruction** | Does not mention React 19 features. Validation scripts use @swc/core for AST checking against patterns that predate React 19. No mention of `useActionState`, `use()`, or ref-as-prop. |
| **Skill C** | `react-expert` by Jeffallan/claude-skills |
| **Skill C Instruction** | Lists "React 19, Server Components, use() hook" in its knowledge stack and includes React 19 patterns. |
| **Impact** | In a React 18 project, Skills A and C may instruct the agent to use `useActionState` and `use()` which do not exist in React 18. In a React 19 project, Skill B may instruct the agent to use forwardRef which is deprecated. Neither skill declares its minimum React version requirement in its SKILL.md frontmatter. |
| **Severity** | High |
| **Resolution Strategy** | Frontmatter version declaration: skills should declare `dependencies: { react: ">=19.0.0" }` in their YAML frontmatter. The agent runtime should compare this against the project's actual React version and warn or disable incompatible skills. |

### 5.2 Node.js API Availability: toSorted() and Modern APIs

| Aspect | Detail |
|--------|--------|
| **Skill A** | `react-best-practices` by vercel-labs/agent-skills |
| **Skill A Instruction** | Recommends "Use toSorted() instead of sort() for immutability" in its JavaScript Performance section. `Array.prototype.toSorted()` requires Node.js 20+ (not available in Node.js 18). |
| **Skill B** | Projects running Node.js 18 LTS (maintenance until April 2025, but many production environments still use it in early 2026) |
| **Skill B Context** | A project with `"engines": { "node": ">=18" }` in package.json will fail at runtime if the agent follows Vercel's instruction to use `toSorted()`. |
| **Impact** | The agent generates code using `toSorted()` per Vercel's optimization guidelines, which passes development on Node.js 20+ but fails in CI or production running Node.js 18. This is a silent failure -- TypeScript will not catch it unless the `lib` configuration explicitly excludes ES2023. |
| **Severity** | High |
| **Resolution Strategy** | Environment detection: the agent should check `engines.node` in `package.json` and `tsconfig.json` `lib` settings before applying API-specific optimizations. Skills should declare minimum runtime versions for their recommendations. |

### 5.3 Package Manager Lockfile Conflicts

| Aspect | Detail |
|--------|--------|
| **Skill A** | `bun-package-manager` by secondsky/claude-skills (Skills.sh, installs tracked) |
| **Skill A Instruction** | Documents that Bun uses `bun.lock` (text-based since v1.2). States that "Before the first bun install, remove other managers' lockfiles to avoid conflicts." |
| **Skill B** | Any skill that runs `npm install` or references `package-lock.json` |
| **Skill B Example** | Google's stitch-skills `react:components` runs `npm run validate` and `npm run dev`, which will generate or reference `package-lock.json` |
| **Impact** | If both skills are active, the agent may alternate between `bun install` (generating `bun.lock`) and `npm install` (generating `package-lock.json`), creating two competing lockfiles. The Bun skill's own migration documentation warns this causes "conflicts," but no agent runtime detects the presence of multiple lockfiles as an error condition. |
| **Severity** | Medium |
| **Resolution Strategy** | Lockfile detection: at skill activation time, scan the project root for existing lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lock`) and warn if the active package manager skill does not match the existing lockfile. |

---

## 6. Precedence Contradictions

### 6.1 Global User Skills vs Project-Level Skills: No Unified Resolution

| Aspect | Detail |
|--------|--------|
| **Context** | Claude Code discovers skills from `~/.claude/skills/` (user-global), `.claude/skills/` (project root), and nested `.claude/skills/` directories in monorepos. Codex CLI reads from `~/.codex/AGENTS.md` (global) and project-level `AGENTS.md` files. GitHub Copilot reads from `.github/copilot-instructions.md` plus SKILL.md files. |
| **Problem** | A developer installs the `clean-code` skill globally (in `~/.claude/skills/`) with its "50/300 Rule" and "Pin versions in production" mandates. Their project has `react-best-practices` installed at the project level (in `.claude/skills/`). When the agent encounters a 350-line React component with caret-versioned dependencies, which instruction wins? |
| **Claude Code Behavior** | Claude Code documentation states that "more-deeply-nested AGENTS.md files take precedence in the case of conflicting instructions" for AGENTS.md. But for skills, the precedence is undefined: skills are loaded based on description matching, and all matching skills' instructions are presented to the model. There is no documented priority between global and project-level skills. |
| **Codex CLI Behavior** | Codex explicitly states: "Direct system/developer/user instructions (as part of a prompt) take precedence over AGENTS.md instructions." For AGENTS.md files, deeper nesting wins. But for skills, the same ambiguity exists. |
| **Impact** | The agent receives both sets of instructions without a clear priority signal. It must resolve the conflict using its own judgment, which is non-deterministic and may produce different results across sessions. |
| **Severity** | High |
| **Resolution Strategy** | Explicit skill precedence declaration: project-level skills should be able to declare `overrides: ["clean-code"]` in frontmatter to explicitly suppress conflicting global skills. Agent runtimes should implement a clear priority chain: project > global > default. |

### 6.2 Vendor Skills vs Community Skills: Implicit Trust Without Priority

| Aspect | Detail |
|--------|--------|
| **Skill A** | `react-best-practices` by vercel-labs/agent-skills (vendor skill, Vercel Engineering) |
| **Skill B** | `react-expert` by Jeffallan/claude-skills (community skill, individual developer) |
| **Overlap** | Both skills cover React component patterns, hooks, state management, and performance optimization. Both claim authority on when to memoize, how to handle state, and how to structure components. |
| **Problem** | Neither the Agent Skills standard nor any agent runtime defines a precedence between vendor and community skills. A user who installs both gets both sets of instructions loaded into the agent's context when working on React code. The agent has no signal that Vercel's skill represents 10+ years of framework-author experience while the community skill represents one developer's preferences. |
| **Impact** | In GitHub community discussion #182117, users report that "skill activation is extremely unstable" when multiple skills match the same task context. The agent may select the community skill's simpler instructions over the vendor's comprehensive guidelines, or it may attempt to follow both and produce hybrid code that satisfies neither fully. |
| **Severity** | Medium |
| **Resolution Strategy** | Trust-tier weighting: the Agent Skills standard should support a `trust` field in frontmatter (e.g., `vendor`, `verified`, `community`) that agent runtimes can use to weight conflicting instructions. SpecWeave's Fabric Registry already has this model (`official | verified | community`) and can enforce it. |

### 6.3 Context Saturation: 5+ Skills Cause Unpredictable Loading

| Aspect | Detail |
|--------|--------|
| **Problem** | When 5+ skills are explicitly listed or match a task context, the agent runtime's router may override the static prompt to prevent context window saturation. A GitHub community discussion documents that "the runtime router often overrules the static prompt" resulting in "0 to 3 skills loading" out of 5+ requested. |
| **Example** | A developer working on a React + TypeScript + Bun + testing project has installed: `react-best-practices`, `react-dev`, `typescript-advanced-types`, `bun`, `javascript-testing-patterns`, and `clean-code`. All 6 skills match the task context. The agent loads 2-3 of them (non-deterministically selected) and ignores the rest. |
| **Impact** | The developer has no control over which skills are loaded and which are silently dropped. If the agent loads `clean-code` and `react-dev` but drops `react-best-practices`, the developer gets the clean-code's strict rules without the nuanced React optimization patterns that would justify exceptions to those rules. |
| **Severity** | High |
| **Resolution Strategy** | Skill composition: instead of loading 6 independent skills, the ecosystem needs a mechanism for skill authors to declare dependencies and for users to create composite skills that merge multiple skills with explicit priority ordering. The recommended best practice (per community documentation) is to "merge tightly coupled skills into a single comprehensive document" -- but this defeats the purpose of modular skills. |

### 6.4 AGENTS.md vs SKILL.md: Overlapping but Different Scoping

| Aspect | Detail |
|--------|--------|
| **AGENTS.md Behavior** | Always active. Concatenated from root directory down. Deeper files override shallower files for conflicting instructions. Supported by Claude Code, Codex CLI, Gemini CLI, and GitHub Copilot. |
| **SKILL.md Behavior** | Selectively loaded based on description matching. Not scoped to directories (loaded globally into context). No override mechanism between skills. |
| **Problem** | A project's `AGENTS.md` says "Use pnpm for all package operations." A SKILL.md in `.claude/skills/` says "Run `npm install` to set up dependencies." The AGENTS.md instruction is always active; the SKILL.md instruction loads when the task matches. Both are presented to the agent as authoritative instructions. |
| **Impact** | The agent must resolve whether the always-active AGENTS.md instruction takes precedence over the selectively-loaded SKILL.md instruction. No agent runtime documents this priority. In practice, whichever instruction appears later in the agent's context window tends to win due to recency bias in LLM attention, but this is non-deterministic. |
| **Severity** | Medium |
| **Resolution Strategy** | Explicit layering: agent runtimes should define a clear priority chain: user prompt > AGENTS.override.md > project AGENTS.md > project skills > global skills > global AGENTS.md. This exists partially for AGENTS.md but not for the full instruction stack including skills. |

---

## 7. Impact Analysis

### 7.1 What Happens When Users Install Conflicting Skills

| Outcome | Frequency | Description |
|---------|-----------|-------------|
| **Silent inconsistency** | Most common | The agent follows whichever skill's instruction it encounters first in its context, producing code that satisfies one skill but violates another. The user does not know a conflict exists. |
| **Non-deterministic behavior** | Common | The same prompt produces different code across sessions because the agent resolves the conflict differently each time based on context window ordering. |
| **Context saturation dropout** | Common with 5+ skills | The agent silently drops some skills' instructions when too many match, producing code that ignores rules the user expected to be applied. |
| **Validation failure loops** | Rare but severe | One skill generates code that another skill's validation scripts reject, causing the agent to enter a fix-validate-fail loop. |
| **Hybrid code** | Occasional | The agent attempts to satisfy all conflicting instructions, producing over-engineered code (e.g., both pinned and caret-versioned deps, both memoized and non-memoized patterns). |

### 7.2 Scale of the Problem

- **Skills.sh**: 200+ listed skills, 9 competing React skills alone. No conflict detection.
- **SkillsMP**: 200,000+ indexed skills. No conflict detection.
- **ClawHub/OpenClaw**: 3,286+ skills. No conflict detection.
- **SkillsDirectory.com**: 36,109 skills. Security scanning but no semantic conflict detection.
- **Vibecoding.app review**: When testing 5 random trending skills from Skills.sh, "three of them were overly generic... and contradictory (suggesting patterns that conflict with framework docs)."
- **Developer sentiment**: "80% of skills in skills.sh are AI slop. Go for the vendor-provided ones and cherry-pick a few."

### 7.3 Why This Problem Is Getting Worse

1. **No friction to publish**: Publishing a SKILL.md requires only a GitHub account and a markdown file. No quality review, no compatibility testing, no conflict checking.
2. **Install-count incentives**: Skills.sh ranks by installs, incentivizing skill authors to cover broad topics (React, TypeScript) rather than narrow, non-conflicting domains.
3. **No dependency model**: Unlike npm packages, skills have no mechanism to declare dependencies on other skills or conflicts with other skills.
4. **No semantic versioning**: Skills do not version their recommendations. A skill that was correct for React 18 is not updated when React 19 changes the API.
5. **AI-generated skills**: Many skills are themselves generated by AI without human review, leading to generic or outdated recommendations.

---

## 8. Resolution Strategies

### 8.1 Detection Approaches

| Approach | Complexity | Effectiveness | Implementable By |
|----------|-----------|---------------|-----------------|
| **Keyword conflict scanning** | Low | Low | Any registry |
| **Semantic similarity detection** | Medium | Medium | Registries with LLM access |
| **AST-level instruction parsing** | High | High | Agent runtimes |
| **Runtime conflict monitoring** | High | Highest | Agent runtimes |

#### 8.1.1 Keyword Conflict Scanning

Scan installed skills for contradictory keyword patterns: "always use X" vs "never use X", "prefer X" vs "avoid X", hardcoded tool names (`npm` vs `bun` vs `pnpm`). This catches obvious contradictions like the Bun vs npm conflict.

**Precedent**: The `agent-md-refactor` skill by softaworks/agent-toolkit already implements this pattern for AGENTS.md files, looking for "contradictory style guidelines (e.g., 'use semicolons' vs 'no semicolons'), conflicting workflow instructions, and incompatible tool preferences."

#### 8.1.2 Semantic Similarity Detection

Use embedding similarity to identify skills that cover the same domain and then use an LLM to compare their specific instructions. This catches the memoization strategy conflict where the keywords differ but the semantic intent contradicts.

**Precedent**: Skill_Seekers by yusufkaraaslan implements "Rule-based or AI-powered conflict resolution" for doc-vs-code conflicts, but not yet for skill-vs-skill conflicts.

#### 8.1.3 Dependency-Aware Installation

At skill installation time, check the project's `package.json`, `tsconfig.json`, and lockfiles to verify that the skill's assumptions match the project's actual dependencies. Warn if a React 19 skill is installed in a React 18 project.

### 8.2 Resolution Mechanisms

#### 8.2.1 Explicit Priority Declaration

Allow skills to declare priority relationships in their frontmatter:

```yaml
---
name: react-best-practices
description: React and Next.js performance optimization
overrides:
  - clean-code  # Our React-specific rules override generic clean-code rules
requires:
  - typescript-advanced-types  # Expects TypeScript strict mode
conflicts-with:
  - react-expert  # Covers the same domain with different opinions
---
```

#### 8.2.2 Project-Level Conflict Resolution File

A `.claude/skill-config.yaml` or `.specweave/skill-priorities.json` file where the project owner can declare:

```yaml
priority:
  1: vercel-labs/react-best-practices  # Vendor skill takes precedence
  2: wshobson/react-state-management   # Community skill supplements
disabled:
  - xenitV1/clean-code  # File size rules conflict with React patterns
package-manager: bun  # All skills should use bun, not npm
```

#### 8.2.3 Trust-Tier Weighting

Use the skill author's trust tier to weight conflicting instructions:
- `official` (vendor skills): Weight 1.0
- `verified` (reviewed community skills): Weight 0.8
- `community` (unreviewed skills): Weight 0.6

When two skills conflict, the higher-weighted instruction wins unless the user has explicitly overridden priority.

#### 8.2.4 Context-Aware Rule Application

Instead of loading all matching skills' instructions into the context, the agent runtime should:
1. Detect overlapping skill domains
2. Present a conflict summary to the user before the task
3. Apply only the resolved, non-conflicting instruction set

### 8.3 What SpecWeave Can Do

SpecWeave's Fabric Registry is uniquely positioned to address skill contradictions because it already has:

1. **Three-tier trust model** (`official | verified | community`) for trust-tier weighting
2. **Security scanner** (`security-scanner.ts`) that parses SKILL.md content -- the same infrastructure can parse for contradictory directives
3. **Quality scoring rubric** (6 dimensions, 30 points max) that can include a "conflict potential" dimension
4. **Plugin dependency tracking** via the registry schema

Recommended additions:

1. **Conflict detection at install time**: When a user installs a skill via the Fabric Registry, scan existing installed skills for semantic overlap and present a conflict report before installation completes.
2. **Skill compatibility matrix**: For each skill in the registry, maintain a list of known conflicts with other skills (similar to npm's `peerDependencies` warnings).
3. **Project-context validation**: At skill activation time, compare the skill's assumptions (React version, Node.js version, package manager) against the project's actual configuration and warn on mismatches.
4. **Contradiction detection rule in security scanner**: Add a new detection category (`instruction-contradiction`) that scans for skills with conflicting "always/never" directives on the same topic.

---

## 9. References

### Skill Repositories Analyzed

- [Vercel Labs agent-skills (react-best-practices)](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md)
- [Vercel Labs agent-skills (AGENTS.md)](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/AGENTS.md)
- [Softaworks agent-toolkit (react-dev)](https://github.com/softaworks/agent-toolkit/blob/main/skills/react-dev/SKILL.md)
- [Softaworks agent-toolkit (agent-md-refactor)](https://github.com/softaworks/agent-toolkit/blob/main/skills/agent-md-refactor/SKILL.md)
- [Google Labs Code stitch-skills (react-components)](https://github.com/google-labs-code/stitch-skills/tree/main/skills/react-components)
- [Callstack Incubator agent-skills (react-native-best-practices)](https://github.com/callstackincubator/agent-skills/blob/main/skills/react-native-best-practices/SKILL.md)
- [wshobson/agents (react-state-management)](https://github.com/wshobson/agents)
- [bout3fiddy/agents (bun)](https://github.com/bout3fiddy/agents)
- [secondsky/claude-skills (bun-package-manager)](https://github.com/secondsky/claude-skills)
- [Jeffallan/claude-skills (react-expert)](https://github.com/Jeffallan/claude-skills)
- [xenitV1/claude-code-maestro (clean-code)](https://agent-skills.md/skills/xenitV1/claude-code-maestro/clean-code)
- [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code)
- [sickn33/antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills)
- [Microsoft Skills Repository](https://github.com/microsoft/skills)
- [Anthropic Skills Repository](https://github.com/anthropics/skills)

### Conflict Detection Tools

- [Softaworks agent-md-refactor (contradiction detection in AGENTS.md)](https://skills.sh/softaworks/agent-toolkit/agent-md-refactor)
- [Skill_Seekers (doc-vs-code conflict detection)](https://github.com/yusufkaraaslan/Skill_Seekers)
- [Ruler (cross-agent rule consistency)](https://github.com/intellectronica/ruler)

### Precedence Documentation

- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [Codex CLI AGENTS.md Guide](https://developers.openai.com/codex/guides/agents-md/)
- [GitHub Copilot Agent Skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [0xdevalias Notes on AI Agent Instruction Files](https://gist.github.com/0xdevalias/f40bc5a6f84c4c5ad862e314894b2fa6)
- [Builder.io: Agent Skills vs Rules vs Commands](https://www.builder.io/blog/agent-skills-rules-commands)

### Quality and Security Analysis

- [Vibecoding.app Skills.sh Review (2026)](https://vibecoding.app/blog/skills-sh-review)
- [Snyk ToxicSkills Study](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/)
- [GitHub Community Discussion #182117 (Skill Activation Instability)](https://github.com/orgs/community/discussions/182117)
- [Vercel Agent Skills FAQ](https://vercel.com/blog/agent-skills-explained-an-faq)
- [Agent Skills Standard Specification](https://agentskills.io/home)

### SkillsMP Coverage

- [SkillsMP Directory (200K+ skills)](https://skillsmp.com/)
- [SkillsMP Review: "One Annoying Problem"](https://medium.com/ai-software-engineer/skillsmp-this-87-427-claude-code-skills-directory-just-exploded-but-with-one-annoying-problem-ec4af66b78cb)
