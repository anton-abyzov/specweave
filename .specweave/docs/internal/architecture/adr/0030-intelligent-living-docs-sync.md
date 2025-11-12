# ADR-0030: Intelligent Living Docs Sync Architecture

**Status**: Proposed
**Date**: 2025-11-12
**Author**: SpecWeave Team
**Scope**: Living Docs Automation

---

## Context

### The Problem

Current living docs sync (`sync-living-docs.ts`) simply copies increment `spec.md` as a monolithic file to `.specweave/docs/internal/specs/spec-{incrementId}.md`. This creates several problems:

1. **No Content Organization**: All content (FR, NFR, architecture, operations, delivery, strategy) bundled together
2. **No Cross-Linking**: No automatic links between related docs
3. **No Project Separation**: Can't organize by project/team in multi-project setups
4. **No Docusaurus Integration**: Missing frontmatter, navigation, search optimization
5. **Poor Maintainability**: Large monolithic files hard to navigate and update

### Current Behavior (v0.14.0)

```typescript
// sync-living-docs.ts lines 91-126
async function copyIncrementSpecToLivingDocs(incrementId: string) {
  const source = `.specweave/increments/${incrementId}/spec.md`;
  const target = `.specweave/docs/internal/specs/spec-${incrementId}.md`;

  await fs.copy(source, target); // Simple copy!
}
```

**Result**: Monolithic `spec-0016-self-reflection-system.md` (500+ lines) mixing:
- User stories (should be in specs/)
- Architecture decisions (should be in architecture/adr/)
- Configuration examples (should be in specs/ or architecture/)
- Success criteria (should be in specs/)
- Out of scope (should be in specs/)

---

## Decision

Implement **Intelligent Living Docs Sync** that automatically:
1. **Parses** increment spec.md content to identify section types
2. **Classifies** sections into content categories (FR/NFR, Architecture, Operations, etc.)
3. **Distributes** content to appropriate folders (specs/, architecture/, operations/, etc.)
4. **Cross-Links** related documents for traceability
5. **Generates** Docusaurus frontmatter and navigation
6. **Organizes** by project in multi-project setups

---

## Content Classification System

### Classification Rules

| Section Pattern | Category | Destination | Example |
|----------------|----------|-------------|---------|
| **User Stories**, **Functional Requirements**, **Acceptance Criteria** | User Stories | `specs/{project}/us-{id}.md` | US-016-001: Automatic reflection execution |
| **NFRs**, **Non-Functional Requirements**, **Performance Requirements** | NFRs | `specs/{project}/nfr-{id}.md` | NFR-001: Reflection completes in <30s |
| **Architecture**, **System Design**, **Component Design**, **Data Model** | Architecture | `architecture/{hld\|lld}-{name}.md` | HLD: Reflection Engine Architecture |
| **ADR**, **Technical Decision**, **Why we chose X** | ADR | `architecture/adr/{id}-{name}.md` | ADR-0030: Why Haiku for Reflection |
| **Operations**, **Runbook**, **SLO**, **Monitoring**, **Incident Response** | Operations | `operations/runbook-{service}.md` | Runbook: Reflection Service |
| **Delivery**, **Release Plan**, **Test Strategy**, **CI/CD**, **Roadmap** | Delivery | `delivery/{roadmap\|test-strategy}.md` | Test Strategy: Reflection Testing |
| **Strategy**, **Business Case**, **PRD**, **Vision**, **OKRs** | Strategy | `strategy/prd-{feature}.md` | PRD: Self-Reflection System |
| **Security**, **Compliance**, **Coding Standards** | Governance | `governance/{policy\|standards}.md` | Security: Reflection Access Control |

### Detection Heuristics

**Primary Indicators** (High Confidence 90%+):
- Section heading patterns: `## User Stories`, `## Architecture`, `## Operations`
- Keyword density: "user story", "acceptance criteria" → User Stories
- Structural markers: ADR format, HLD sections, runbook steps

**Secondary Indicators** (Medium Confidence 60-90%):
- Content structure: Numbered lists, Given/When/Then format
- Technical terms: "API endpoint", "database schema", "service mesh"
- Cross-references: Links to other docs, diagrams

**Tertiary Indicators** (Low Confidence <60%):
- Length and complexity: Short sections → specs, long technical → architecture
- Authorship patterns: PM-authored → strategy, architect-authored → architecture

---

## Architecture

### High-Level Design

```
┌──────────────────────────────────────────────────────────────┐
│                    Intelligent Sync System                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  1. Content Parser                                            │
│     - Parse spec.md into sections                             │
│     - Identify section types (heading, content, code blocks)  │
│     - Preserve structure and metadata                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  2. Content Classifier                                        │
│     - Analyze section content                                 │
│     - Apply classification rules                              │
│     - Assign category and confidence score                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  3. Project Detector                                          │
│     - Detect project from increment name/metadata            │
│     - Use keyword matching and team assignment                │
│     - Fallback to "default" project                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  4. Content Distributor                                       │
│     - Create destination files per category                   │
│     - Generate Docusaurus frontmatter                         │
│     - Organize by project                                     │
│     - Preserve original spec.md as archive                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  5. Cross-Linker                                              │
│     - Generate links between related docs                     │
│     - Create index/README files                               │
│     - Update navigation                                       │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Input: .specweave/increments/0016-self-reflection-system/spec.md
                              │
                              ▼
                    ┌─────────────────┐
                    │  Content Parser │
                    └─────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ User Stories │ │ Architecture │ │  Operations  │
    │   Sections   │ │   Sections   │ │   Sections   │
    └──────────────┘ └──────────────┘ └──────────────┘
              │               │               │
              ▼               ▼               ▼
         ┌─────────────────────────────────────┐
         │      Content Classifier             │
         │  - FR/NFR → specs/                  │
         │  - Architecture → architecture/     │
         │  - Operations → operations/         │
         └─────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Project Detector│
                    │  (default)      │
                    └─────────────────┘
                              │
                              ▼
                   ┌──────────────────┐
                   │Content Distributor│
                   └──────────────────┘
                              │
              ┌───────────────┼───────────────┬────────────────┐
              ▼               ▼               ▼                ▼
   specs/default/     architecture/    operations/      delivery/
   us-016-001.md      hld-reflection.md runbook-*.md    test-strategy.md
   us-016-002.md      adr/0030-*.md
   ...
```

### Output Structure

```
.specweave/docs/internal/
├── specs/
│   └── default/                                # Project folder
│       ├── us-016-001-automatic-execution.md   # User story 1
│       ├── us-016-002-security-detection.md    # User story 2
│       ├── nfr-016-001-performance.md          # NFR 1
│       └── README.md                           # Index (auto-generated)
│
├── architecture/
│   ├── hld-reflection-engine.md                # High-level design
│   ├── lld-reflection-analyzer.md              # Low-level design
│   └── adr/
│       └── 0030-haiku-for-reflection.md        # ADR
│
├── operations/
│   └── runbook-reflection-service.md           # Runbook
│
├── delivery/
│   └── test-strategy-reflection.md             # Test strategy
│
└── strategy/
    └── prd-self-reflection.md                  # PRD
```

---

## Implementation Plan

### Phase 1: Core Parser (Week 1)

**File**: `src/core/living-docs/content-parser.ts`

```typescript
interface ParsedSection {
  heading: string;
  level: number;
  content: string;
  codeBlocks: CodeBlock[];
  links: Link[];
  metadata?: Record<string, any>;
}

interface ParsedSpec {
  frontmatter: Record<string, any>;
  sections: ParsedSection[];
  raw: string;
}

class ContentParser {
  parse(markdown: string): ParsedSpec {
    // 1. Extract YAML frontmatter
    // 2. Split into sections by heading
    // 3. Extract code blocks, links, images
    // 4. Preserve structure
  }
}
```

### Phase 2: Content Classifier (Week 1-2)

**File**: `src/core/living-docs/content-classifier.ts`

```typescript
enum ContentCategory {
  UserStory = 'user-story',
  NFR = 'nfr',
  Architecture = 'architecture',
  ADR = 'adr',
  Operations = 'operations',
  Delivery = 'delivery',
  Strategy = 'strategy',
  Governance = 'governance',
  Unknown = 'unknown'
}

interface ClassificationResult {
  category: ContentCategory;
  confidence: number; // 0.0 - 1.0
  reasoning: string;
  suggestedPath: string;
}

class ContentClassifier {
  classify(section: ParsedSection): ClassificationResult {
    // Apply classification rules
    // Return category with confidence
  }
}
```

### Phase 3: Project Detector (Week 2)

**File**: `src/core/living-docs/project-detector.ts`

```typescript
interface ProjectContext {
  id: string;
  name: string;
  confidence: number;
}

class ProjectDetector {
  detectProject(incrementId: string, spec: ParsedSpec): ProjectContext {
    // 1. Check increment name for project keywords
    // 2. Check frontmatter for project metadata
    // 3. Check tech stack from package.json
    // 4. Fallback to "default"
  }
}
```

### Phase 4: Content Distributor (Week 2-3)

**File**: `src/core/living-docs/content-distributor.ts`

```typescript
interface DistributionResult {
  created: string[]; // Created file paths
  updated: string[]; // Updated file paths
  errors: string[];  // Errors encountered
}

class ContentDistributor {
  distribute(
    spec: ParsedSpec,
    classifications: ClassificationResult[],
    project: ProjectContext
  ): Promise<DistributionResult> {
    // 1. Create destination files per category
    // 2. Generate Docusaurus frontmatter
    // 3. Write content
    // 4. Create cross-links
  }
}
```

### Phase 5: Cross-Linker (Week 3)

**File**: `src/core/living-docs/cross-linker.ts`

```typescript
interface CrossLink {
  source: string;
  target: string;
  type: 'reference' | 'implements' | 'depends-on';
}

class CrossLinker {
  generateLinks(distributed: DistributionResult): CrossLink[] {
    // 1. Find related documents
    // 2. Generate links
    // 3. Update source documents
    // 4. Create index/README files
  }
}
```

### Phase 6: Integration (Week 3-4)

**File**: `plugins/specweave/lib/hooks/sync-living-docs.ts`

```typescript
async function syncLivingDocsIntelligent(incrementId: string): Promise<void> {
  // 1. Parse increment spec
  const spec = await contentParser.parse(specPath);

  // 2. Classify sections
  const classifications = await contentClassifier.classifyAll(spec.sections);

  // 3. Detect project
  const project = await projectDetector.detectProject(incrementId, spec);

  // 4. Distribute content
  const result = await contentDistributor.distribute(spec, classifications, project);

  // 5. Generate cross-links
  await crossLinker.generateLinks(result);

  // 6. Archive original spec
  await archiveOriginalSpec(incrementId, spec);
}
```

---

## Configuration

### New Config Section

```json
{
  "livingDocs": {
    "intelligent": {
      "enabled": true,
      "splitByCategory": true,
      "generateCrossLinks": true,
      "preserveOriginal": true,
      "classificationConfidenceThreshold": 0.6,
      "fallbackProject": "default"
    }
  }
}
```

---

## Benefits

### 1. Better Organization
- ✅ Content organized by type (specs, architecture, operations)
- ✅ Multi-project support (specs/backend/, specs/frontend/)
- ✅ Easier navigation and discovery

### 2. Improved Maintainability
- ✅ Smaller, focused files (100-200 lines vs 500+)
- ✅ Clear separation of concerns
- ✅ Easier to update and version

### 3. Enhanced Traceability
- ✅ Cross-links between related docs
- ✅ Clear relationships (implements, depends-on, references)
- ✅ Complete audit trail

### 4. Better Docusaurus Integration
- ✅ Proper frontmatter for SEO
- ✅ Automatic sidebar generation
- ✅ Search optimization

### 5. Scalability
- ✅ Handles large specs (1000+ lines)
- ✅ Supports unlimited projects
- ✅ Maintains performance (<5s sync)

---

## Risks and Mitigations

### Risk 1: Classification Accuracy

**Risk**: Classifier might misclassify sections (60-90% confidence)

**Mitigation**:
- ✅ Manual review mode (prompt user for low confidence)
- ✅ Learn from corrections (feedback loop)
- ✅ Fallback to monolithic spec if unsure

### Risk 2: Breaking Existing Workflows

**Risk**: Users rely on monolithic spec.md format

**Mitigation**:
- ✅ Feature flag (`livingDocs.intelligent.enabled`)
- ✅ Preserve original spec in archive
- ✅ Gradual rollout (opt-in first)

### Risk 3: Performance Impact

**Risk**: Parsing and classification slow for large specs

**Mitigation**:
- ✅ Async processing (non-blocking)
- ✅ Caching parsed results
- ✅ Progress indicators

---

## Success Metrics

### Effectiveness
- ✅ Classification accuracy: >80% on test set
- ✅ User satisfaction: >90% find new structure helpful
- ✅ Discoverability: 50% reduction in "where is X?" questions

### Performance
- ✅ Sync time: <5s for typical spec (500 lines)
- ✅ Sync time: <30s for large spec (2000 lines)
- ✅ Memory usage: <100MB during processing

### Adoption
- ✅ 70% of users enable intelligent sync by Q2 2026
- ✅ 100% of new users use intelligent sync by default

---

## Alternatives Considered

### Alternative 1: Manual Organization

**Approach**: Users manually split specs after creation

**Rejected**: Too manual, error-prone, low adoption

### Alternative 2: AI-Only Classification

**Approach**: Use LLM to classify every section

**Rejected**: High cost (~$0.10 per spec), slower

### Alternative 3: Template-Based

**Approach**: Force users to use templates with pre-defined sections

**Rejected**: Too rigid, limits creativity

---

## Open Questions

1. **Q**: Should we support custom classification rules?
   **A**: TBD - Maybe in v2.0

2. **Q**: How to handle sections that fit multiple categories?
   **A**: Duplicate content with cross-references

3. **Q**: Should we auto-generate diagrams from architecture sections?
   **A**: Future feature (0.15.0+)

---

## References

- [Current sync-living-docs.ts](../../../../plugins/specweave/lib/hooks/sync-living-docs.ts)
- [Internal Docs README](../../README.md)
- [Multi-Project Structure ADR-0017](./0017-multi-project-internal-structure.md)
- [Specs README](../../specs/README.md)

---

## Approval

**Proposed by**: SpecWeave Team
**Reviewed by**: TBD
**Approved by**: TBD
**Date**: 2025-11-12
