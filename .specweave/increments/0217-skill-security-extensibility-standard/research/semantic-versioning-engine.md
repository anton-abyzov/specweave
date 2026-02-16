# Semantic Versioning Engine Design

**Status**: DRAFT
**Author**: anton.abyzov@gmail.com
**Date**: 2026-02-15
**Satisfies**: AC-US12-01, AC-US12-02, AC-US12-03, AC-US12-06, AC-US12-07 (T-035)
**Dependencies**: T-015c (Version-Pinned Verification)

---

## 1. Overview

The semantic versioning engine automatically assigns version numbers to skills based on content diff analysis. Each version is independently verified, and the version number communicates the nature of changes to consumers.

---

## 2. Version Assignment Rules

### 2.1 First Submission

The first verified version of any skill is always `1.0.0`.

```typescript
function getInitialVersion(): string {
  return '1.0.0';
}
```

### 2.2 Subsequent Submissions

When a previously verified skill is re-submitted, the engine:
1. Fetches the previous version's content
2. Computes a diff
3. Classifies the diff into MAJOR, MINOR, or PATCH
4. Bumps the version accordingly

```typescript
function computeNextVersion(
  currentVersion: string,
  diff: SkillDiff
): string {
  const bump = classifyDiff(diff);
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  switch (bump) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
  }
}
```

---

## 3. Diff Analysis

### 3.1 Content Sections

SKILL.md files are parsed into logical sections:

```typescript
interface SkillSection {
  name: string;        // Section header (e.g., "## Scope")
  content: string;     // Section body
  hash: string;        // SHA-256 of content
}

interface SkillDiff {
  sectionsAdded: SkillSection[];
  sectionsRemoved: SkillSection[];
  sectionsModified: { before: SkillSection; after: SkillSection }[];
  frontmatterChanges: FrontmatterDiff;
  totalLinesAdded: number;
  totalLinesRemoved: number;
}

interface FrontmatterDiff {
  fieldsAdded: string[];
  fieldsRemoved: string[];
  fieldsModified: { field: string; before: string; after: string }[];
}
```

### 3.2 Section Parsing

```typescript
function parseSections(content: string): SkillSection[] {
  const lines = content.split('\n');
  const sections: SkillSection[] = [];
  let current: { name: string; lines: string[] } | null = null;

  for (const line of lines) {
    if (line.match(/^#{1,3}\s+/)) {
      if (current) {
        const body = current.lines.join('\n').trim();
        sections.push({
          name: current.name,
          content: body,
          hash: computeHash(body),
        });
      }
      current = { name: line.replace(/^#+\s+/, ''), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }

  if (current) {
    const body = current.lines.join('\n').trim();
    sections.push({ name: current.name, content: body, hash: computeHash(body) });
  }

  return sections;
}
```

---

## 4. Bump Classification Rules

### 4.1 MAJOR (x.0.0) — Scope Expansion or New Permissions

A MAJOR bump indicates the skill's scope, permissions, or security profile has changed in ways that could affect user trust.

| Trigger | Example |
|---------|---------|
| New permissions declared | Adding `Bash(*)` or `Write` to permissions |
| Scope expansion | Adding new file patterns, directories, or languages |
| New destructive capabilities | Adding `rm`, `delete`, `drop` instructions |
| Security-notes changes | Removing or weakening security disclosures |
| New tool requirements | Adding MCP server dependencies |
| Agent restriction changes | Expanding from 2 agents to "all agents" |

```typescript
const MAJOR_TRIGGERS = [
  // New permission-related patterns
  { pattern: /Bash\(\*\)|Write|Edit/, section: 'permissions', type: 'added' },
  // Scope expansion
  { pattern: /\*\*\/\*/, section: 'scope', type: 'added' },
  // Destructive capabilities
  { pattern: /rm\s+-rf|drop\s+table|delete\s+from/i, type: 'added' },
  // Security notes weakened
  { section: 'security-notes', type: 'removed' },
  // Frontmatter scope changes
  { frontmatter: 'scope', type: 'modified' },
];
```

### 4.2 MINOR (0.x.0) — New Capabilities

A MINOR bump indicates new features or behavior changes that don't expand the security surface.

| Trigger | Example |
|---------|---------|
| New instruction section | Adding "## Error Handling" section |
| Modified behavior instructions | Changing code generation patterns |
| New tags in frontmatter | Adding new search tags |
| Description expansion | Adding detail to existing descriptions |
| New examples | Adding code examples or use cases |

```typescript
const MINOR_TRIGGERS = [
  // New sections
  { type: 'section-added' },
  // Modified sections with substantive changes (>20% diff)
  { type: 'section-modified', threshold: 0.2 },
  // Frontmatter additions
  { frontmatter: ['tags', 'metadata'], type: 'added' },
];
```

### 4.3 PATCH (0.0.x) — No Behavioral Change

A PATCH bump indicates cosmetic or documentation-only changes.

| Trigger | Example |
|---------|---------|
| Typo fixes | "recieve" → "receive" |
| Formatting changes | Markdown formatting, whitespace |
| Comment updates | Updating comments without changing instructions |
| Minor wording | "should" → "must" (within same intent) |
| Link updates | Updating documentation URLs |

```typescript
const PATCH_INDICATORS = [
  // Very small diff
  { maxLinesChanged: 10 },
  // Only whitespace/formatting
  { onlyWhitespaceChanges: true },
  // No section additions or removals
  { noStructuralChanges: true },
];
```

---

## 5. Classification Algorithm

```typescript
function classifyDiff(diff: SkillDiff): 'major' | 'minor' | 'patch' {
  // Check for MAJOR triggers first
  if (hasMajorChanges(diff)) return 'major';

  // Check for MINOR triggers
  if (hasMinorChanges(diff)) return 'minor';

  // Default to PATCH
  return 'patch';
}

function hasMajorChanges(diff: SkillDiff): boolean {
  // 1. Permission changes in frontmatter
  if (diff.frontmatterChanges.fieldsModified.some(f => f.field === 'scope' || f.field === 'permissions')) {
    return true;
  }

  // 2. Security-notes section removed or weakened
  if (diff.sectionsRemoved.some(s => s.name.toLowerCase().includes('security'))) {
    return true;
  }

  // 3. New destructive patterns in added/modified sections
  const newContent = [
    ...diff.sectionsAdded.map(s => s.content),
    ...diff.sectionsModified.map(s => s.after.content),
  ].join('\n');

  const DESTRUCTIVE = /Bash\(\*\)|rm\s+-rf|eval\(|exec\(|process\.env|~\/\.ssh/;
  const oldContent = diff.sectionsModified.map(s => s.before.content).join('\n');

  if (DESTRUCTIVE.test(newContent) && !DESTRUCTIVE.test(oldContent)) {
    return true;
  }

  return false;
}

function hasMinorChanges(diff: SkillDiff): boolean {
  // 1. New sections added
  if (diff.sectionsAdded.length > 0) return true;

  // 2. Sections removed (non-security)
  if (diff.sectionsRemoved.length > 0) return true;

  // 3. Significant modifications (>20% content change)
  for (const mod of diff.sectionsModified) {
    const similarity = computeSimilarity(mod.before.content, mod.after.content);
    if (similarity < 0.8) return true; // More than 20% different
  }

  // 4. Frontmatter additions
  if (diff.frontmatterChanges.fieldsAdded.length > 0) return true;

  return false;
}
```

---

## 6. Content Hashing

### 6.1 Per-Version Hash

Each version stores a SHA-256 hash of the normalized SKILL.md content:

```typescript
import { createHash } from 'crypto';

function computeContentHash(content: string): string {
  const normalized = content
    .trim()
    .replace(/\r\n/g, '\n')     // Normalize line endings
    .replace(/\t/g, '  ');       // Normalize tabs to spaces
  return `sha256:${createHash('sha256').update(normalized, 'utf8').digest('hex')}`;
}
```

### 6.2 Git SHA Recording

Each version also records the git commit SHA:

```typescript
interface VersionRecord {
  version: string;          // e.g., "1.2.0"
  contentHash: string;      // SHA-256 of content
  gitSha: string;           // Git commit SHA (40-char hex)
  createdAt: string;        // ISO timestamp
}

async function recordVersion(
  repoUrl: string,
  skillPath: string,
  content: string
): Promise<VersionRecord> {
  const gitSha = await getLatestCommitSha(repoUrl);
  return {
    version: computeNextVersion(currentVersion, computeDiff(oldContent, content)),
    contentHash: computeContentHash(content),
    gitSha,
    createdAt: new Date().toISOString(),
  };
}
```

---

## 7. Comparison Algorithm

```typescript
function computeSkillDiff(oldContent: string, newContent: string): SkillDiff {
  const oldSections = parseSections(stripFrontmatter(oldContent));
  const newSections = parseSections(stripFrontmatter(newContent));
  const oldFrontmatter = parseFrontmatter(oldContent);
  const newFrontmatter = parseFrontmatter(newContent);

  // Section comparison by name
  const oldNames = new Set(oldSections.map(s => s.name));
  const newNames = new Set(newSections.map(s => s.name));

  const sectionsAdded = newSections.filter(s => !oldNames.has(s.name));
  const sectionsRemoved = oldSections.filter(s => !newNames.has(s.name));
  const sectionsModified = newSections
    .filter(s => oldNames.has(s.name))
    .map(newS => {
      const oldS = oldSections.find(o => o.name === newS.name)!;
      return { before: oldS, after: newS };
    })
    .filter(({ before, after }) => before.hash !== after.hash);

  // Frontmatter comparison
  const frontmatterChanges = compareFrontmatter(oldFrontmatter, newFrontmatter);

  // Line counts
  const oldLines = oldContent.split('\n').length;
  const newLines = newContent.split('\n').length;

  return {
    sectionsAdded,
    sectionsRemoved,
    sectionsModified,
    frontmatterChanges,
    totalLinesAdded: Math.max(0, newLines - oldLines),
    totalLinesRemoved: Math.max(0, oldLines - newLines),
  };
}

function computeSimilarity(a: string, b: string): number {
  // Jaccard similarity on word tokens
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 1 : intersection / union;
}
```

---

## 8. Version Display

### 8.1 Badge Format

```
[verified | v1.3.0]     — Version-specific badge
```

### 8.2 Version History API

```
GET /api/v1/skills/:name/versions
```

```json
{
  "versions": [
    {
      "version": "2.1.0",
      "bump": "minor",
      "contentHash": "sha256:abc123...",
      "gitSha": "def456...",
      "certTier": "VERIFIED",
      "certScore": 94,
      "diffSummary": "+1 section (Server Components), ~2 sections modified",
      "createdAt": "2026-02-15T18:00:00Z"
    }
  ]
}
```

---

## 9. References

- [Version-Pinned Verification](./version-pinned-verification.md) — Lock file and diff scanning
- [Three-Tier Certification](./three-tier-certification.md) — Per-version certification
- [AD-10: Semantic Versioning Engine](../plan.md) — Architecture decision
