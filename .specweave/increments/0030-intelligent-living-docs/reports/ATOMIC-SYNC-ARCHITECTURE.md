# Atomic Sync Architecture - Living Docs Enhancement

**Status**: Design Proposal
**Date**: 2025-11-13
**Increment**: 0030-intelligent-living-docs
**Author**: SpecWeave Team

---

## Executive Summary

**Problem**: Current living docs sync treats increment specs as monolithic documents, missing opportunities for granular organization by atomic content types (ADRs, NFRs, User Stories, Architecture, etc.).

**Solution**: Implement atomic content extraction that parses increment specs into individual atomic items, distributes them to appropriate locations based on the 9-category classification system, and merges intelligently with existing living docs.

**Impact**:
- ✅ **Better organization**: Each concept (US-001, NFR-001, ADR-001) is its own file
- ✅ **Easier navigation**: Find specific items without digging through large files
- ✅ **LLM-friendly**: Rich context (project, category, tags) for AI assistants
- ✅ **Cross-linked**: Bidirectional references between related documents
- ✅ **Merge-capable**: Update individual items across multiple increments
- ✅ **No increment wrapper noise**: Just the essential content

---

## Current Architecture Analysis

### What Exists Today

**Current System** (`SpecDistributor` in `src/core/living-docs/spec-distributor.ts`):

```
Increment Spec (spec.md)
    ↓
Parse as ONE document
    ↓
Extract user stories
    ↓
Generate files:
    ├── Epic File (SPEC-###.md) - High-level summary
    └── User Story Files (us-###.md) - Detailed requirements
```

**Strengths**:
- ✅ Already extracts user stories (US-001, US-002, etc.)
- ✅ Creates two-level hierarchy (Epic → User Stories)
- ✅ Links to tasks in tasks.md
- ✅ Generates Docusaurus frontmatter
- ✅ Cross-links related user stories

**Limitations**:
- ❌ Only handles User Stories (ignores NFRs, ADRs, Architecture, etc.)
- ❌ Treats entire spec as Epic (no extraction of embedded architecture decisions)
- ❌ No merge logic (always creates new files)
- ❌ No classification of non-user-story content
- ❌ No distribution to other categories (architecture/, operations/, delivery/, etc.)

### Example: What's Missing

**Current State** (Increment `0016-authentication/spec.md`):

```markdown
---
title: Authentication System
---

# Authentication System

## Quick Overview
Implement OAuth 2.0 authentication...

## User Stories

#### US-001: User Login
**As a** user
**I want** to log in with email/password
**So that** I can access protected resources

**Acceptance Criteria**:
- **AC-US1-01**: User can enter credentials
- **AC-US1-02**: User receives JWT token

#### US-002: Session Management
**As a** user
**I want** my session to persist
**So that** I don't have to log in every time

## NFR

### NFR-001: Authentication Performance
**Metric**: Login latency < 200ms
**Acceptance**: 99th percentile < 500ms

## Architecture

### High-Level Design
OAuth 2.0 flow with JWT tokens...

[Mermaid diagram here]

### Decision: OAuth vs JWT
**Context**: We need to choose authentication method
**Decision**: Use OAuth 2.0 with JWT
**Consequences**: Industry standard, secure, scalable...

## Test Strategy

### Unit Tests
- Login flow (90% coverage)
- Token validation (95% coverage)

### Integration Tests
- End-to-end auth flow (85% coverage)
```

**What Current System Does**:
```
.specweave/docs/internal/specs/default/
├── SPEC-016-authentication-system.md  (Epic file with overview)
└── user-stories/
    ├── us-001-user-login.md
    └── us-002-session-management.md
```

**What's Missing** (content left unextracted):
- ❌ NFR-001 (should go to `specs/default/nfr/nfr-001-auth-performance.md`)
- ❌ OAuth vs JWT decision (should become `architecture/adr/0001-oauth-vs-jwt.md`)
- ❌ High-Level Design (should go to `architecture/auth-oauth-flow.md`)
- ✅ Test Strategy (stays in `tasks.md` - embedded with implementation context)

**Result**: 40% of the content is lost in the Epic file!

**Note**: Test plans are NOT extracted as separate files. They remain embedded in `tasks.md` where they belong (see [Test Organization Best Practices](./TEST-ORGANIZATION-BEST-PRACTICES.md)).

---

## Proposed Atomic Sync Architecture

### Core Concept: Parse → Classify → Extract → Distribute → Merge

```
Increment Spec (spec.md)
    ↓
Parse into SECTIONS (## User Stories, ## NFR, ## Architecture, etc.)
    ↓
Extract ATOMIC ITEMS (US-001, NFR-001, ADR-001, etc.)
    ↓
Classify EACH ITEM independently (9-category system)
    ↓
Generate INDIVIDUAL FILES (no increment wrapper)
    ↓
Merge with EXISTING DOCS (smart merge, not overwrite)
    ↓
Generate CROSS-LINKS (bidirectional references)
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   Increment Spec (spec.md)                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │ User Stories │ │     NFR      │ │ Architecture │           │
│  │  US-001      │ │   NFR-001    │ │  HLD, ADRs   │  + more   │
│  │  US-002      │ │   NFR-002    │ │              │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                             ↓
              ┌──────────────────────────────┐
              │   AtomicSyncEngine           │
              │  (New Component)             │
              │                              │
              │  1. SectionParser            │
              │  2. ItemExtractor            │
              │  3. ContentClassifier        │
              │  4. AtomicFileGenerator      │
              │  5. MergeEngine              │
              │  6. CrossLinker              │
              └──────────────────────────────┘
                             ↓
        ┌────────────────────┴────────────────────┐
        ↓                    ↓                     ↓
┌──────────────┐    ┌──────────────┐     ┌──────────────┐
│   specs/     │    │ architecture/│     │  delivery/   │
│              │    │              │     │              │
│ us-001.md    │    │ adr/         │     │ test-        │
│ us-002.md    │    │ 0001-oauth.md│     │ strategy.md  │
│ nfr/         │    │ auth-flow.md │     │              │
│ nfr-001.md   │    │              │     │              │
└──────────────┘    └──────────────┘     └──────────────┘
```

### Key Components

#### 1. Section Parser

**Purpose**: Split increment spec by major sections (## headers).

**Input**: Raw markdown content from `spec.md`

**Output**: Array of `Section` objects

```typescript
interface Section {
  type: SectionType; // 'user-stories' | 'nfr' | 'architecture' | 'test-strategy' | etc.
  heading: string;   // "## User Stories", "## NFR", etc.
  content: string;   // Raw content under this section
  startLine: number; // For source traceability
  endLine: number;
}

type SectionType =
  | 'user-stories'
  | 'nfr'
  | 'architecture'
  | 'decisions'      // ADRs
  | 'operations'     // Runbooks, SLOs
  | 'delivery'       // Test strategies, release plans
  | 'strategy'       // Business requirements, PRDs
  | 'governance'     // Security, compliance
  | 'overview';      // Executive summary

class SectionParser {
  parse(content: string): Section[] {
    const sections: Section[] = [];

    // Split by ## headers
    const headerPattern = /^##\s+(.+)$/gm;
    const matches = Array.from(content.matchAll(headerPattern));

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const nextMatch = matches[i + 1];

      const heading = match[1];
      const startLine = match.index;
      const endLine = nextMatch ? nextMatch.index : content.length;
      const sectionContent = content.slice(startLine, endLine);

      // Classify section type based on heading
      const type = this.classifySectionType(heading);

      sections.push({
        type,
        heading,
        content: sectionContent,
        startLine,
        endLine,
      });
    }

    return sections;
  }

  private classifySectionType(heading: string): SectionType {
    const lower = heading.toLowerCase();

    // Exact matches
    if (lower === 'user stories') return 'user-stories';
    if (lower === 'nfr' || lower === 'non-functional requirements') return 'nfr';
    if (lower === 'architecture') return 'architecture';
    if (lower === 'decisions' || lower.includes('adr')) return 'decisions';
    if (lower === 'test strategy' || lower === 'testing') return 'delivery';
    if (lower === 'operations' || lower === 'runbook') return 'operations';

    // Pattern matches
    if (lower.includes('test') || lower.includes('quality')) return 'delivery';
    if (lower.includes('security') || lower.includes('compliance')) return 'governance';
    if (lower.includes('business') || lower.includes('requirement')) return 'strategy';

    // Default
    return 'overview';
  }
}
```

#### 2. Item Extractor

**Purpose**: Extract individual atomic items from each section.

**Input**: `Section` object

**Output**: Array of `AtomicItem` objects

```typescript
interface AtomicItem {
  id: string;              // US-001, NFR-001, ADR-001, etc.
  type: DocumentCategory;  // user-story, nfr, adr, architecture, etc.
  title: string;           // "User Login", "Authentication Performance", etc.
  content: string;         // Pure content (NO increment wrapper)
  project: string;         // backend, frontend, etc. (from detection)
  increment: string;       // 0016-authentication
  metadata: ItemMetadata;  // Priority, status, tags, etc.
  sourceSection: string;   // "## User Stories" (for traceability)
  startLine: number;       // Source line (for traceability)
  endLine: number;
}

interface ItemMetadata {
  priority?: string;       // P0, P1, P2, P3
  status?: string;         // pending, in-progress, complete
  tags: string[];          // ["authentication", "backend", "security"]
  created?: string;        // ISO date
  completed?: string;      // ISO date
  acceptanceCriteria?: AcceptanceCriterion[];  // For user stories
  metrics?: Metric[];      // For NFRs
  decision?: {             // For ADRs
    context: string;
    decision: string;
    consequences: string;
  };
}

class ItemExtractor {
  extract(section: Section): AtomicItem[] {
    switch (section.type) {
      case 'user-stories':
        return this.extractUserStories(section);
      case 'nfr':
        return this.extractNFRs(section);
      case 'decisions':
        return this.extractADRs(section);
      case 'architecture':
        return this.extractArchitectureDocs(section);
      case 'delivery':
        return this.extractDeliveryDocs(section);
      case 'operations':
        return this.extractOperationsDocs(section);
      case 'strategy':
        return this.extractStrategyDocs(section);
      case 'governance':
        return this.extractGovernanceDocs(section);
      default:
        return [];
    }
  }

  private extractUserStories(section: Section): AtomicItem[] {
    const items: AtomicItem[] = [];

    // Pattern: #### US-001: Title
    const pattern = /####\s+(US-\d+):\s+(.+?)\s*\n([\s\S]*?)(?=####\s+US-|\n---\n##|$)/g;

    let match;
    while ((match = pattern.exec(section.content)) !== null) {
      const id = match[1];     // US-001
      const title = match[2];
      const content = match[3];

      // Extract "As a... I want... So that..."
      const description = this.extractDescription(content);

      // Extract acceptance criteria
      const acceptanceCriteria = this.extractAcceptanceCriteria(content);

      // Extract business rationale
      const businessRationale = this.extractBusinessRationale(content);

      items.push({
        id,
        type: 'user-story',
        title,
        content: this.formatUserStoryContent(description, acceptanceCriteria, businessRationale),
        project: 'default', // Will be enhanced by project detection
        increment: this.incrementId,
        metadata: {
          tags: ['user-story', 'authentication'],
          acceptanceCriteria,
        },
        sourceSection: section.heading,
        startLine: match.index,
        endLine: match.index + match[0].length,
      });
    }

    return items;
  }

  private extractNFRs(section: Section): AtomicItem[] {
    const items: AtomicItem[] = [];

    // Pattern: ### NFR-001: Title
    const pattern = /###\s+(NFR-\d+):\s+(.+?)\s*\n([\s\S]*?)(?=###\s+NFR-|\n---\n##|$)/g;

    let match;
    while ((match = pattern.exec(section.content)) !== null) {
      const id = match[1];     // NFR-001
      const title = match[2];
      const content = match[3];

      // Extract metric
      const metricMatch = content.match(/\*\*Metric\*\*:\s+(.+?)(?=\n|$)/);
      const metric = metricMatch ? metricMatch[1] : '';

      // Extract acceptance
      const acceptanceMatch = content.match(/\*\*Acceptance\*\*:\s+(.+?)(?=\n|$)/);
      const acceptance = acceptanceMatch ? acceptanceMatch[1] : '';

      items.push({
        id,
        type: 'nfr',
        title,
        content: this.formatNFRContent(metric, acceptance),
        project: 'default',
        increment: this.incrementId,
        metadata: {
          tags: ['nfr', 'performance', 'authentication'],
          metrics: [{ metric, acceptance }],
        },
        sourceSection: section.heading,
        startLine: match.index,
        endLine: match.index + match[0].length,
      });
    }

    return items;
  }

  private extractADRs(section: Section): AtomicItem[] {
    const items: AtomicItem[] = [];

    // Pattern: ### Decision: Title  OR  ### ADR-001: Title
    const pattern = /###\s+(?:Decision:\s+|ADR-\d+:\s+)?(.+?)\s*\n([\s\S]*?)(?=###\s+(?:Decision|ADR)|\n---\n##|$)/g;

    let match;
    let adrCounter = 1;
    while ((match = pattern.exec(section.content)) !== null) {
      const title = match[1];
      const content = match[2];

      // Extract context, decision, consequences
      const contextMatch = content.match(/\*\*Context\*\*:\s+([\s\S]*?)(?=\*\*Decision\*\*|$)/i);
      const decisionMatch = content.match(/\*\*Decision\*\*:\s+([\s\S]*?)(?=\*\*Consequences\*\*|$)/i);
      const consequencesMatch = content.match(/\*\*Consequences\*\*:\s+([\s\S]*?)(?=\n##|$)/i);

      const context = contextMatch ? contextMatch[1].trim() : '';
      const decision = decisionMatch ? decisionMatch[1].trim() : '';
      const consequences = consequencesMatch ? consequencesMatch[1].trim() : '';

      // Only create ADR if we have at least context and decision
      if (context && decision) {
        const id = `ADR-${String(adrCounter).padStart(3, '0')}`;

        items.push({
          id,
          type: 'adr',
          title,
          content: this.formatADRContent(context, decision, consequences),
          project: 'default',
          increment: this.incrementId,
          metadata: {
            tags: ['adr', 'architecture', 'authentication'],
            decision: { context, decision, consequences },
          },
          sourceSection: section.heading,
          startLine: match.index,
          endLine: match.index + match[0].length,
        });

        adrCounter++;
      }
    }

    return items;
  }

  private extractArchitectureDocs(section: Section): AtomicItem[] {
    const items: AtomicItem[] = [];

    // Extract High-Level Design
    const hldPattern = /###\s+(?:High-Level\s+Design|HLD)\s*\n([\s\S]*?)(?=###|$)/i;
    const hldMatch = section.content.match(hldPattern);

    if (hldMatch) {
      items.push({
        id: 'auth-architecture',
        type: 'architecture',
        title: 'Authentication Architecture',
        content: hldMatch[1].trim(),
        project: 'default',
        increment: this.incrementId,
        metadata: {
          tags: ['architecture', 'hld', 'authentication'],
        },
        sourceSection: section.heading,
        startLine: hldMatch.index,
        endLine: hldMatch.index + hldMatch[0].length,
      });
    }

    return items;
  }

  // Similar methods for delivery, operations, strategy, governance...
}
```

#### 3. Content Classifier

**Purpose**: Enhance classification with project detection and category validation.

**Enhancement**: Already exists in current system, but needs to work at item level, not document level.

```typescript
class ContentClassifier {
  /**
   * Classify individual item (already extracted)
   */
  classifyItem(item: AtomicItem, projectConfig: MultiProjectConfig): ClassifiedItem {
    // Project detection (same as current system)
    const project = this.detectProject(item, projectConfig);

    // Category validation
    const category = this.validateCategory(item.type);

    // Confidence scoring
    const confidence = this.calculateConfidence(item, project, category);

    return {
      ...item,
      project,
      category,
      confidence,
    };
  }

  private detectProject(item: AtomicItem, config: MultiProjectConfig): string {
    let scores: Record<string, number> = {};

    // Check item content for project keywords
    for (const [projectId, projectConfig] of Object.entries(config.projects)) {
      let score = 0;

      // Check keywords
      for (const keyword of projectConfig.keywords) {
        if (item.content.toLowerCase().includes(keyword.toLowerCase())) {
          score += 3;
        }
      }

      // Check tech stack
      for (const tech of projectConfig.techStack || []) {
        if (item.content.toLowerCase().includes(tech.toLowerCase())) {
          score += 2;
        }
      }

      // Check increment name
      if (item.increment.includes(projectId)) {
        score += 10;
      }

      scores[projectId] = score;
    }

    // Return project with highest score, or default
    const maxScore = Math.max(...Object.values(scores));
    const bestProject = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0];

    return bestProject || config.fallbackProject || 'default';
  }
}
```

#### 4. Atomic File Generator

**Purpose**: Generate individual markdown files with rich frontmatter and NO increment wrapper.

**Key Principle**: ONLY the essential content, no "This was created in Increment 0016..." headers.

```typescript
class AtomicFileGenerator {
  /**
   * Generate file for atomic item
   */
  generateFile(item: ClassifiedItem): GeneratedFile {
    const targetPath = this.getTargetPath(item);
    const frontmatter = this.generateFrontmatter(item);
    const content = this.generateContent(item);
    const footer = this.generateFooter(item);

    return {
      path: targetPath,
      content: `${frontmatter}\n\n${content}\n\n${footer}`,
      item,
    };
  }

  private getTargetPath(item: ClassifiedItem): string {
    const baseDir = '.specweave/docs/internal';

    switch (item.category) {
      case 'user-story':
        return `${baseDir}/specs/${item.project}/${item.id.toLowerCase()}-${this.slugify(item.title)}.md`;

      case 'nfr':
        return `${baseDir}/specs/${item.project}/nfr/${item.id.toLowerCase()}-${this.slugify(item.title)}.md`;

      case 'adr':
        return `${baseDir}/architecture/adr/${item.id.toLowerCase()}-${this.slugify(item.title)}.md`;

      case 'architecture':
        return `${baseDir}/architecture/${this.slugify(item.title)}.md`;

      case 'operations':
        return `${baseDir}/operations/${this.slugify(item.title)}.md`;

      case 'delivery':
        return `${baseDir}/delivery/${this.slugify(item.title)}.md`;

      case 'strategy':
        return `${baseDir}/strategy/${this.slugify(item.title)}.md`;

      case 'governance':
        return `${baseDir}/governance/${this.slugify(item.title)}.md`;

      default:
        return `${baseDir}/specs/${item.project}/${item.id.toLowerCase()}.md`;
    }
  }

  private generateFrontmatter(item: ClassifiedItem): string {
    const lines: string[] = [];

    lines.push('---');
    lines.push(`id: ${item.id.toLowerCase()}`);
    lines.push(`title: "${item.id}: ${item.title}"`);
    lines.push(`sidebar_label: "${item.title}"`);
    lines.push(`description: "${item.title}"`);
    lines.push(`tags: [${item.metadata.tags.map(t => `"${t}"`).join(', ')}]`);
    lines.push(`increment: "${item.increment}"`);
    lines.push(`project: "${item.project}"`);
    lines.push(`category: "${item.category}"`);

    if (item.metadata.status) {
      lines.push(`status: "${item.metadata.status}"`);
    }

    if (item.metadata.priority) {
      lines.push(`priority: "${item.metadata.priority}"`);
    }

    if (item.metadata.created) {
      lines.push(`created: "${item.metadata.created}"`);
    }

    lines.push(`last_updated: "${new Date().toISOString().split('T')[0]}"`);
    lines.push('---');

    return lines.join('\n');
  }

  private generateContent(item: ClassifiedItem): string {
    // Return PURE content, NO increment wrapper
    return item.content.trim();
  }

  private generateFooter(item: ClassifiedItem): string {
    const lines: string[] = [];

    lines.push('---');
    lines.push('');
    lines.push(`_Source: Increment ${item.increment} | Last Updated: ${new Date().toISOString().split('T')[0]}_`);

    return lines.join('\n');
  }
}
```

#### 5. Merge Engine

**Purpose**: Intelligently merge new content with existing files (don't overwrite!).

**Strategies**:
1. **Smart Merge**: Compare content, merge non-conflicting changes
2. **Append**: Add new content to existing file (for incremental updates)
3. **Replace**: Overwrite (only if explicitly configured)

```typescript
interface MergeStrategy {
  type: 'smart' | 'append' | 'replace' | 'skip';
  conflictResolution?: 'keep-existing' | 'use-new' | 'ask-user';
}

class MergeEngine {
  /**
   * Merge new content with existing file
   */
  async merge(
    newFile: GeneratedFile,
    existingPath: string,
    strategy: MergeStrategy
  ): Promise<MergeResult> {
    if (!fs.existsSync(existingPath)) {
      // No existing file, just write
      await fs.writeFile(existingPath, newFile.content);
      return {
        action: 'created',
        path: existingPath,
        conflicts: [],
      };
    }

    const existingContent = await fs.readFile(existingPath, 'utf-8');

    switch (strategy.type) {
      case 'smart':
        return await this.smartMerge(newFile, existingContent, existingPath);

      case 'append':
        return await this.appendMerge(newFile, existingContent, existingPath);

      case 'replace':
        await fs.writeFile(existingPath, newFile.content);
        return {
          action: 'replaced',
          path: existingPath,
          conflicts: [],
        };

      case 'skip':
        return {
          action: 'skipped',
          path: existingPath,
          conflicts: [],
          reason: 'File exists and strategy is skip',
        };
    }
  }

  /**
   * Smart merge: Compare sections, merge non-conflicting
   */
  private async smartMerge(
    newFile: GeneratedFile,
    existingContent: string,
    path: string
  ): Promise<MergeResult> {
    // Parse both files
    const existingParsed = this.parseMarkdown(existingContent);
    const newParsed = this.parseMarkdown(newFile.content);

    const merged = {
      frontmatter: { ...existingParsed.frontmatter, ...newParsed.frontmatter },
      sections: new Map<string, string>(),
    };

    // Merge sections
    const allSections = new Set([
      ...existingParsed.sections.keys(),
      ...newParsed.sections.keys(),
    ]);

    const conflicts: MergeConflict[] = [];

    for (const section of allSections) {
      const existingSection = existingParsed.sections.get(section);
      const newSection = newParsed.sections.get(section);

      if (!existingSection) {
        // New section, add it
        merged.sections.set(section, newSection!);
      } else if (!newSection) {
        // Section removed in new version, keep existing
        merged.sections.set(section, existingSection);
      } else if (existingSection === newSection) {
        // Same content, no conflict
        merged.sections.set(section, existingSection);
      } else {
        // Conflict! Need resolution strategy
        conflicts.push({
          section,
          existing: existingSection,
          new: newSection,
        });

        // Default: keep existing
        merged.sections.set(section, existingSection);
      }
    }

    // Write merged content
    const mergedContent = this.formatMarkdown(merged);
    await fs.writeFile(path, mergedContent);

    return {
      action: conflicts.length > 0 ? 'merged-with-conflicts' : 'merged',
      path,
      conflicts,
    };
  }

  /**
   * Append merge: Add new implementation history entry
   */
  private async appendMerge(
    newFile: GeneratedFile,
    existingContent: string,
    path: string
  ): Promise<MergeResult> {
    // Find "## Implementation History" section
    const historyPattern = /## Implementation History\s*\n([\s\S]*?)(?=\n##|$)/;
    const match = existingContent.match(historyPattern);

    if (!match) {
      // No history section, add it
      const updatedContent = existingContent + '\n\n## Implementation History\n\n' + this.extractImplementationHistory(newFile.content);
      await fs.writeFile(path, updatedContent);
      return {
        action: 'appended',
        path,
        conflicts: [],
      };
    }

    // Append new history entry
    const existingHistory = match[1];
    const newHistory = this.extractImplementationHistory(newFile.content);
    const updatedHistory = existingHistory + '\n' + newHistory;

    const updatedContent = existingContent.replace(
      historyPattern,
      `## Implementation History\n${updatedHistory}`
    );

    await fs.writeFile(path, updatedContent);

    return {
      action: 'appended',
      path,
      conflicts: [],
    };
  }
}
```

#### 6. Cross-Linker

**Purpose**: Generate bidirectional links between related documents.

```typescript
class CrossLinker {
  /**
   * Generate cross-links for all items
   */
  async generateCrossLinks(items: ClassifiedItem[]): Promise<void> {
    const linkMap = this.buildLinkMap(items);

    for (const item of items) {
      const relatedItems = this.findRelatedItems(item, items);
      await this.addCrossLinksToFile(item, relatedItems, linkMap);
    }
  }

  private findRelatedItems(item: ClassifiedItem, allItems: ClassifiedItem[]): RelatedItem[] {
    const related: RelatedItem[] = [];

    for (const other of allItems) {
      if (other.id === item.id) continue;

      // Check if items are related
      const relationship = this.detectRelationship(item, other);
      if (relationship) {
        related.push({
          item: other,
          relationship,
        });
      }
    }

    return related;
  }

  private detectRelationship(item1: ClassifiedItem, item2: ClassifiedItem): string | null {
    // US → Architecture
    if (item1.type === 'user-story' && item2.type === 'architecture') {
      return 'implements';
    }

    // Architecture → ADR
    if (item1.type === 'architecture' && item2.type === 'adr') {
      return 'decided-in';
    }

    // US → ADR
    if (item1.type === 'user-story' && item2.type === 'adr') {
      return 'references';
    }

    // NFR → Architecture
    if (item1.type === 'nfr' && item2.type === 'architecture') {
      return 'implements';
    }

    // Same project
    if (item1.project === item2.project && item1.increment === item2.increment) {
      return 'related';
    }

    return null;
  }

  private async addCrossLinksToFile(
    item: ClassifiedItem,
    related: RelatedItem[],
    linkMap: Map<string, string>
  ): Promise<void> {
    const filePath = linkMap.get(item.id);
    if (!filePath) return;

    const content = await fs.readFile(filePath, 'utf-8');

    // Check if "Related Documents" section already exists
    if (content.includes('## Related Documents')) {
      // Update existing section
      // (implementation omitted for brevity)
    } else {
      // Add new section
      const relatedSection = this.formatRelatedSection(related, linkMap);
      const updatedContent = content.replace(
        /---\s*\n_Source:/,
        `## Related Documents\n\n${relatedSection}\n\n---\n\n_Source:`
      );

      await fs.writeFile(filePath, updatedContent);
    }
  }

  private formatRelatedSection(related: RelatedItem[], linkMap: Map<string, string>): string {
    const lines: string[] = [];

    // Group by relationship
    const groups = new Map<string, RelatedItem[]>();
    for (const item of related) {
      if (!groups.has(item.relationship)) {
        groups.set(item.relationship, []);
      }
      groups.get(item.relationship)!.push(item);
    }

    // Format each group
    for (const [relationship, items] of groups) {
      lines.push(`### ${this.formatRelationshipTitle(relationship)}`);
      for (const relatedItem of items) {
        const path = linkMap.get(relatedItem.item.id);
        if (path) {
          const relativePath = this.getRelativePath(path);
          lines.push(`- [${relatedItem.item.id}: ${relatedItem.item.title}](${relativePath})`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private formatRelationshipTitle(relationship: string): string {
    switch (relationship) {
      case 'implements':
        return 'Implements';
      case 'references':
        return 'References';
      case 'decided-in':
        return 'Decided In';
      case 'related':
        return 'Related';
      default:
        return 'Related';
    }
  }
}
```

---

## Example Transformation

### Input: Increment Spec

**File**: `.specweave/increments/0016-authentication/spec.md`

```markdown
---
title: Authentication System
increment: 0016-authentication
project: backend
---

# Authentication System

## Quick Overview
Implement OAuth 2.0 authentication with JWT tokens for secure user access.

## Business Value
- **Security**: Industry-standard authentication
- **Scalability**: JWT tokens enable horizontal scaling
- **User Experience**: Single sign-on capability

## User Stories

#### US-001: User Login
**As a** user
**I want** to log in with email/password
**So that** I can access protected resources

**Acceptance Criteria**:
- **AC-US1-01**: User can enter credentials (P1, testable)
- **AC-US1-02**: User receives JWT token (P1, testable)

**Business Rationale**: Core authentication requirement for all users.

#### US-002: Session Management
**As a** user
**I want** my session to persist
**So that** I don't have to log in every time

**Acceptance Criteria**:
- **AC-US2-01**: Session lasts 24 hours (P1, testable)
- **AC-US2-02**: User can refresh token (P2, testable)

## NFR

### NFR-001: Authentication Performance
**Metric**: Login latency < 200ms (p50)
**Acceptance**: 99th percentile < 500ms

### NFR-002: Authentication Reliability
**Metric**: Availability 99.9%
**Acceptance**: Max downtime 8.76 hours/year

## Architecture

### High-Level Design
OAuth 2.0 flow with JWT tokens:

1. User submits credentials
2. Server validates against database
3. Server generates JWT token
4. Client stores token in localStorage
5. Client includes token in Authorization header

[Mermaid diagram would go here]

### Decision: OAuth vs JWT
**Context**: We need to choose an authentication method that balances security and scalability.

**Decision**: Use OAuth 2.0 with JWT tokens.

**Consequences**:
- **Pros**: Industry standard, secure, scalable, supports SSO
- **Cons**: More complex than basic auth, requires token management

## Test Strategy

### Unit Tests
- Login flow validation (90% coverage)
- Token generation and validation (95% coverage)
- Password hashing (100% coverage)

### Integration Tests
- End-to-end authentication flow (85% coverage)
- Token refresh flow (85% coverage)

### E2E Tests
- User login via UI (80% coverage)
- Session persistence (80% coverage)
```

### Output: Atomic Files

#### 1. User Story Files

**File**: `.specweave/docs/internal/specs/backend/us-001-user-login.md`

```markdown
---
id: us-001-user-login
title: "US-001: User Login"
sidebar_label: "User Login"
description: "User can log in with email and password"
tags: ["user-story", "backend", "authentication"]
increment: "0016-authentication"
project: "backend"
category: "user-story"
status: "complete"
priority: "P1"
created: "2025-11-13"
last_updated: "2025-11-13"
---

# US-001: User Login

**As a** user
**I want** to log in with email/password
**So that** I can access protected resources

---

## Acceptance Criteria

- [x] **AC-US1-01**: User can enter credentials (P1, testable)
- [x] **AC-US1-02**: User receives JWT token (P1, testable)

---

## Implementation

**Increment**: [0016-authentication](../../../../increments/0016-authentication/tasks.md)

**Tasks**:
- [T-001: Create Login Endpoint](../../../../increments/0016-authentication/tasks.md#t-001-create-login-endpoint)
- [T-002: Implement JWT Token Generation](../../../../increments/0016-authentication/tasks.md#t-002-implement-jwt-token-generation)

---

## Business Rationale

Core authentication requirement for all users.

---

## Related Documents

### Implements
- [Authentication Architecture](../../architecture/auth-oauth-flow.md)

### References
- [ADR-001: OAuth vs JWT](../../architecture/adr/adr-001-oauth-vs-jwt.md)

### Related
- [US-002: Session Management](./us-002-session-management.md)
- [NFR-001: Authentication Performance](./nfr/nfr-001-authentication-performance.md)

---

_Source: Increment 0016-authentication | Last Updated: 2025-11-13_
```

**File**: `.specweave/docs/internal/specs/backend/us-002-session-management.md`

*(Similar format, omitted for brevity)*

#### 2. NFR Files

**File**: `.specweave/docs/internal/specs/backend/nfr/nfr-001-authentication-performance.md`

```markdown
---
id: nfr-001-authentication-performance
title: "NFR-001: Authentication Performance"
sidebar_label: "Authentication Performance"
description: "Login latency must be < 200ms"
tags: ["nfr", "performance", "authentication", "backend"]
increment: "0016-authentication"
project: "backend"
category: "nfr"
status: "complete"
last_updated: "2025-11-13"
---

# NFR-001: Authentication Performance

## Metric
Login latency < 200ms (p50)

## Acceptance Criteria
- 99th percentile < 500ms
- 99.9th percentile < 1000ms

---

## Related Documents

### Implements
- [Authentication Architecture](../../../architecture/auth-oauth-flow.md)

### Related
- [US-001: User Login](../us-001-user-login.md)

---

_Source: Increment 0016-authentication | Last Updated: 2025-11-13_
```

**File**: `.specweave/docs/internal/specs/backend/nfr/nfr-002-authentication-reliability.md`

*(Similar format, omitted for brevity)*

#### 3. ADR File

**File**: `.specweave/docs/internal/architecture/adr/adr-001-oauth-vs-jwt.md`

```markdown
---
id: adr-001-oauth-vs-jwt
title: "ADR-001: OAuth vs JWT"
sidebar_label: "OAuth vs JWT"
description: "Use OAuth 2.0 with JWT tokens for authentication"
tags: ["adr", "authentication", "security", "backend"]
increment: "0016-authentication"
status: "accepted"
last_updated: "2025-11-13"
---

# ADR-001: OAuth vs JWT

## Context

We need to choose an authentication method that balances security and scalability.

## Decision

Use OAuth 2.0 with JWT tokens.

## Consequences

**Pros**:
- Industry standard
- Secure
- Scalable
- Supports SSO (Single Sign-On)

**Cons**:
- More complex than basic authentication
- Requires token management (refresh, revocation)

---

## Related Documents

### Implements
- [US-001: User Login](../../specs/backend/us-001-user-login.md)
- [US-002: Session Management](../../specs/backend/us-002-session-management.md)

### References
- [Authentication Architecture](../auth-oauth-flow.md)

---

_Source: Increment 0016-authentication | Last Updated: 2025-11-13_
```

#### 4. Architecture File

**File**: `.specweave/docs/internal/architecture/auth-oauth-flow.md`

```markdown
---
id: auth-oauth-flow
title: "Authentication: OAuth 2.0 Flow"
sidebar_label: "OAuth Flow"
description: "High-level design of OAuth 2.0 authentication"
tags: ["architecture", "authentication", "oauth", "backend"]
increment: "0016-authentication"
last_updated: "2025-11-13"
---

# Authentication: OAuth 2.0 Flow

## Overview

OAuth 2.0 flow with JWT tokens:

1. User submits credentials
2. Server validates against database
3. Server generates JWT token
4. Client stores token in localStorage
5. Client includes token in Authorization header

## Sequence Diagram

[Mermaid diagram would go here]

---

## Related Documents

### Decided In
- [ADR-001: OAuth vs JWT](./adr/adr-001-oauth-vs-jwt.md)

### Implements
- [US-001: User Login](../specs/backend/us-001-user-login.md)
- [US-002: Session Management](../specs/backend/us-002-session-management.md)

### Related
- [NFR-001: Authentication Performance](../specs/backend/nfr/nfr-001-authentication-performance.md)

---

_Source: Increment 0016-authentication | Last Updated: 2025-11-13_
```

#### 5. Test Plans (NOT Extracted)

**Important**: Test plans are NOT extracted as separate atomic files. They remain embedded in `tasks.md` where they belong.

**Why?**
- Test plans belong in execution context (with implementation details)
- Extracting them creates duplication (test plans in `delivery/` AND `tasks.md`)
- Loses traceability between tests and implementation
- Violates SpecWeave's three-level test architecture

**Where Test Plans Live**:
- **Spec (spec.md)**: Acceptance Criteria (AC-US1-01, AC-US1-02) - WHAT to test
- **Tasks (tasks.md)**: Embedded Test Plans (BDD + test cases) - HOW to test
- **Code (tests/)**: Test Implementation - WHERE tests are

**Example** (from `tasks.md`):
```markdown
### T-001: Create Login Endpoint

**AC**: AC-US1-01, AC-US1-02, AC-US1-03  ← Traceability!

**Test Plan** (BDD):
- **Given** valid credentials → **When** login → **Then** receive JWT token
- **Given** invalid credentials → **When** login → **Then** return 401 error

**Test Cases**:
- Unit (`auth.test.ts`): validLogin, invalidPassword → 90% coverage
- Integration (`auth-flow.test.ts`): loginEndpoint → 85% coverage
- **Overall: 87% coverage**
```

**User Story files link to tasks.md** (where test plans are):
- User Story includes AC-IDs
- Links to tasks.md for detailed test plans
- Links to test files in codebase

See [Test Organization Best Practices](./TEST-ORGANIZATION-BEST-PRACTICES.md) for complete explanation.

### Summary of Transformation

**Before** (Current System):
```
.specweave/docs/internal/specs/default/
├── SPEC-016-authentication-system.md  (Epic with ALL content)
└── user-stories/
    ├── us-001-user-login.md
    └── us-002-session-management.md
```

**After** (Atomic Sync):
```
.specweave/docs/internal/
├── specs/backend/
│   ├── us-001-user-login.md                    ← User Story (atomic)
│   ├── us-002-session-management.md            ← User Story (atomic)
│   └── nfr/
│       ├── nfr-001-authentication-performance.md  ← NFR (atomic)
│       └── nfr-002-authentication-reliability.md  ← NFR (atomic)
├── architecture/
│   ├── auth-oauth-flow.md                      ← Architecture (atomic)
│   └── adr/
│       └── adr-001-oauth-vs-jwt.md             ← ADR (atomic)
└── increments/0016-authentication/
    └── tasks.md                                ← Test plans embedded here (NOT extracted)
```

**Result**:
- ✅ **6 atomic files** instead of 1 monolithic Epic
- ✅ **No increment wrapper** - just pure content
- ✅ **Cross-linked** - bidirectional references
- ✅ **LLM-friendly** - rich context in frontmatter
- ✅ **Organized by type** - specs, architecture all separated
- ✅ **Test plans stay in tasks.md** - embedded with implementation context

**Note**: Test Strategy is NOT extracted as a separate file. Test plans remain embedded in `tasks.md` where they belong (see [Test Organization Best Practices](./TEST-ORGANIZATION-BEST-PRACTICES.md)).

---

## Configuration

### Enable Atomic Sync

**File**: `.specweave/config.json`

```json
{
  "livingDocs": {
    "intelligent": {
      "enabled": true,
      "atomicSync": true,              // ← NEW: Enable atomic sync
      "mergeStrategy": "smart",        // smart | append | replace | skip
      "crossLink": true,               // Generate bidirectional links
      "preserveOriginal": true,        // Keep original increment spec in _archive/
      "splitByCategory": true,         // Distribute to category folders
      "generateCrossLinks": true,      // Cross-references between docs
      "classificationConfidenceThreshold": 0.6,
      "fallbackProject": "default"
    }
  },
  "multiProject": {
    "projects": {
      "backend": {
        "name": "Backend Services",
        "keywords": ["api", "backend", "service"],
        "techStack": ["Node.js", "PostgreSQL"]
      },
      "frontend": {
        "name": "Frontend App",
        "keywords": ["ui", "frontend", "react"],
        "techStack": ["React", "Next.js"]
      }
    }
  }
}
```

### Merge Strategies

```json
{
  "livingDocs": {
    "intelligent": {
      "atomicSync": true,
      "mergeStrategy": "smart",  // ← Choose strategy
      "conflictResolution": "keep-existing"  // keep-existing | use-new | ask-user
    }
  }
}
```

**Merge Strategies**:
1. **`smart`**: Compare content, merge non-conflicting sections
2. **`append`**: Add new content (e.g., implementation history) without touching existing
3. **`replace`**: Overwrite existing file (use with caution!)
4. **`skip`**: Don't update existing files (only create new ones)

---

## Implementation Roadmap

### Phase 1: Section Parser + Item Extractor (Week 1)

**Goal**: Parse increment specs into atomic items

**Tasks**:
1. Implement `SectionParser` (split by ## headers)
2. Implement `ItemExtractor` for each section type:
   - User Stories (US-001, US-002, etc.)
   - NFRs (NFR-001, NFR-002, etc.)
   - ADRs (extract decision structure)
   - Architecture (HLD, LLD)
   - Test Strategies
   - Operations (Runbooks, SLOs)
3. Add unit tests for parsing edge cases
4. Add integration tests with real increment specs

**Deliverables**:
- `src/core/living-docs/atomic-sync/section-parser.ts`
- `src/core/living-docs/atomic-sync/item-extractor.ts`
- `tests/unit/living-docs/section-parser.test.ts`
- `tests/integration/living-docs/item-extraction.test.ts`

### Phase 2: Atomic File Generator (Week 2)

**Goal**: Generate individual markdown files with NO increment wrapper

**Tasks**:
1. Implement `AtomicFileGenerator` (path generation, frontmatter, content, footer)
2. Implement file naming conventions (kebab-case, slugs)
3. Add Docusaurus frontmatter generation
4. Add footer generation (source traceability)
5. Add unit tests for file generation
6. Add integration tests (generate files from parsed items)

**Deliverables**:
- `src/core/living-docs/atomic-sync/atomic-file-generator.ts`
- `tests/unit/living-docs/atomic-file-generator.test.ts`
- `tests/integration/living-docs/file-generation.test.ts`

### Phase 3: Merge Engine (Week 3)

**Goal**: Intelligently merge with existing files

**Tasks**:
1. Implement `MergeEngine` (smart, append, replace, skip)
2. Implement markdown parsing (sections, frontmatter)
3. Implement conflict detection and resolution
4. Add backup creation before merge
5. Add unit tests for merge strategies
6. Add integration tests (merge real files)

**Deliverables**:
- `src/core/living-docs/atomic-sync/merge-engine.ts`
- `tests/unit/living-docs/merge-engine.test.ts`
- `tests/integration/living-docs/merge-strategies.test.ts`

### Phase 4: Cross-Linker (Week 4)

**Goal**: Generate bidirectional links between related documents

**Tasks**:
1. Implement `CrossLinker` (relationship detection, link generation)
2. Implement relationship types (implements, references, decided-in, related)
3. Implement "Related Documents" section generation
4. Add relative path calculation
5. Add unit tests for relationship detection
6. Add integration tests (generate cross-links for full increment)

**Deliverables**:
- `src/core/living-docs/atomic-sync/cross-linker.ts`
- `tests/unit/living-docs/cross-linker.test.ts`
- `tests/integration/living-docs/cross-linking.test.ts`

### Phase 5: Integration + Testing (Week 5)

**Goal**: Integrate all components, test end-to-end

**Tasks**:
1. Create `AtomicSyncEngine` (orchestrates all components)
2. Integrate with existing `SpecDistributor`
3. Add configuration parsing (`.specweave/config.json`)
4. Add CLI command `/specweave:sync-docs atomic`
5. Add E2E tests (full increment sync)
6. Test with multiple real increments (0016, 0030, 0031)
7. Performance testing (10+ increments, 100+ items)

**Deliverables**:
- `src/core/living-docs/atomic-sync/atomic-sync-engine.ts`
- `src/cli/commands/sync-docs-atomic.ts`
- `tests/e2e/living-docs/atomic-sync.spec.ts`
- Performance report

### Phase 6: Documentation + Migration (Week 6)

**Goal**: Document system, provide migration guide

**Tasks**:
1. Write user guide (`.specweave/docs/public/guides/atomic-sync-guide.md`)
2. Write architecture doc (`.specweave/docs/internal/architecture/adr/0032-atomic-sync.md`)
3. Create migration script (`scripts/migrate-to-atomic-sync.ts`)
4. Add examples (before/after)
5. Update CLAUDE.md
6. Update docs-site

**Deliverables**:
- User guide
- Architecture ADR
- Migration script
- Updated docs

---

## Benefits Summary

### For Users

1. **Better Organization**
   - Each concept (US-001, NFR-001, ADR-001) is its own file
   - Easy to find specific items
   - No need to dig through large Epic files

2. **Easier Navigation**
   - Jump directly to US-001 (not buried in SPEC-016)
   - Clear folder structure by category
   - Docusaurus sidebar auto-generated from folders

3. **Merge-Friendly**
   - Update US-001 across multiple increments
   - Smart merge prevents overwriting existing content
   - Implementation history shows all increments that touched US-001

4. **Cross-Linked**
   - See all related documents at a glance
   - Bidirectional references (US-001 → ADR-001, ADR-001 → US-001)
   - Navigate between related concepts easily

### For LLMs (AI Assistants)

1. **Rich Context**
   - Each file has frontmatter with project, category, tags, increment
   - LLM knows exactly what type of document it's reading
   - No need to parse large files to find specific info

2. **Focused Content**
   - Each file is focused on ONE concept
   - No increment wrapper noise ("This was created in Increment 0016...")
   - Pure content for better comprehension

3. **Traceability**
   - Footer shows source increment
   - Related documents section shows relationships
   - LLM can trace concepts across increments

### For Teams

1. **Clearer Collaboration**
   - Multiple people can work on different files
   - No conflicts from editing large Epic files
   - Clear ownership (frontend team → `specs/frontend/`, backend team → `specs/backend/`)

2. **Better Tooling**
   - IDEs can navigate between related docs
   - GitHub PRs show exactly what changed (US-001 updated, not "Epic updated")
   - Easier code review

3. **Audit Trail**
   - See which increments touched US-001
   - Track evolution of NFR-001 over time
   - Clear history in git

---

## Risks and Mitigations

### Risk 1: Breaking Existing Tools

**Risk**: Existing tools (GitHub sync, JIRA sync) expect Epic files, not atomic files.

**Mitigation**:
- Keep Epic files for backward compatibility (auto-generated from atomic files)
- Add `preserveEpic: true` config option
- External tools sync with Epic files (no changes needed)

### Risk 2: Performance

**Risk**: Generating 100+ atomic files per increment could be slow.

**Mitigation**:
- Batch file writes (use `Promise.all()`)
- Cache parsed items (don't re-parse on every run)
- Add performance tests (target: <5s for 100 items)

### Risk 3: Merge Conflicts

**Risk**: Smart merge could create conflicts if content changed significantly.

**Mitigation**:
- Default to `keep-existing` conflict resolution
- Add `--dry-run` flag to preview changes
- Create backups before merge (`.bak` files)
- Add manual merge tool (`/specweave:resolve-conflicts`)

### Risk 4: Migration Complexity

**Risk**: Migrating existing living docs to atomic structure is complex.

**Mitigation**:
- Provide migration script (`scripts/migrate-to-atomic-sync.ts`)
- Add `--preview` flag to show what would be migrated
- Keep original files in `_archive/` folder
- Make atomic sync opt-in (not default)

---

## Success Metrics

### Technical Metrics

1. **Parsing Accuracy**: 95%+ of items correctly extracted
2. **Classification Accuracy**: 90%+ of items correctly classified
3. **Performance**: <5s to process 100 items
4. **Test Coverage**: 85%+ (unit + integration + E2E)

### User Metrics

1. **File Count**: Average 7-10 atomic files per increment (vs 1 Epic file)
2. **Content Coverage**: 95%+ of spec content distributed (vs 50% today)
3. **Cross-Links**: Average 5-10 links per file
4. **Merge Success**: 90%+ merges succeed without conflicts

### Business Metrics

1. **Adoption**: 80%+ of new increments use atomic sync
2. **Time Saved**: 30% faster to find specific docs
3. **Quality**: 50% fewer "where is this documented?" questions
4. **Developer Satisfaction**: 8+/10 on survey

---

## Conclusion

Atomic sync transforms living docs from monolithic Epic files into a network of focused, cross-linked atomic documents. This enables:

- ✅ **Granular organization** by document type (US, NFR, ADR, etc.)
- ✅ **No increment wrapper noise** (just pure content)
- ✅ **Smart merging** with existing docs
- ✅ **Bidirectional cross-links** for easy navigation
- ✅ **LLM-optimized** with rich context
- ✅ **Team-friendly** with clear ownership

**Next Steps**:
1. Review and approve architecture
2. Start Phase 1 implementation (Section Parser + Item Extractor)
3. Run proof-of-concept with Increment 0016
4. Iterate based on feedback

---

**Status**: ✅ Ready for Review
**Approvers**: SpecWeave Core Team
**Date**: 2025-11-13
