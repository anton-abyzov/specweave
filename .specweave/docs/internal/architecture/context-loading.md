# Context Loading Architecture

**Purpose**: Precision context loading that achieves 70-96% token reduction by loading exactly what's needed, nothing more, nothing less.

**Related Documentation**:
- [CLAUDE.md](../../../CLAUDE.md#context-priming) - Overview
- [Context-Loader Skill](../../../src/skills/context-loader/SKILL.md) - Implementation
- [.specweave/docs/public/guides/context-priming.md](../../public/guides/context-priming.md) - User guide

---

## The Core Problem

**Traditional Approach (Context Bloat)**:
```
User: "Implement Stripe payment integration"

AI loads everything:
├── CLAUDE.md (5,000 tokens)
├── Full spec.md (50,000 tokens)
│   ├── Authentication (10,000) ❌ Not needed
│   ├── Payments (15,000) ✅ Needed
│   ├── Reporting (12,000) ❌ Not needed
│   └── Integrations (13,000) ❌ Not needed
├── All architecture docs (20,000) ❌ Most not needed
└── All ADRs (10,000) ❌ Most not needed

Total: 85,000 tokens
Relevant: ~20,000 tokens (23.5% efficiency)
Waste: 76.5%
```

**Result**: Slow responses, high costs, context confusion, lower quality outputs.

---

## SpecWeave's Multi-Layer Solution

### Layer 1: Context Manifests (Declarative Context)

**Innovation**: Each feature DECLARES what context it needs upfront.

**Location**: `.specweave/increments/{id}/context-manifest.yaml`

```yaml
---
# Declarative: "This feature needs exactly this context"
spec_sections:
  - .specweave/docs/internal/strategy/payments/stripe/spec.md
  - .specweave/docs/internal/strategy/payments/shared/payment-entities.md
  - .specweave/docs/internal/strategy/payments/shared/compliance.md#pci-dss

documentation:
  - .specweave/docs/internal/architecture/payments/stripe-integration.md
  - .specweave/docs/internal/architecture/adr/0005-payment-provider.md
  - .specweave/docs/internal/architecture/adr/0008-webhook-handling.md
  - CLAUDE.md#development-workflow  # Section-level precision

max_context_tokens: 20000
priority: high
auto_refresh: false
---
```

**Key Features**:
- ✅ **File-level precision** - Load specific files, not entire directories
- ✅ **Section-level precision** - `file.md#section-name` loads ONLY that section
- ✅ **Token budgeting** - Explicit limit prevents bloat
- ✅ **Version controlled** - Manifest is part of feature spec
- ✅ **Declarative** - States "what" not "how"

### Layer 2: Modular Specifications (Hierarchical Organization)

**Foundation**: Can't load selectively if everything is in one file!

**Modular Structure**:
```
.specweave/docs/internal/strategy/
├── payments/                      # Module boundary
│   ├── overview.md                # High-level (5 pages)
│   ├── stripe/                    # Sub-module boundary
│   │   ├── spec.md                # Stripe-specific (50 pages)
│   │   ├── api-contracts.md       # API details (20 pages)
│   │   └── data-model.md          # Data entities (15 pages)
│   ├── paypal/                    # Separate sub-module
│   │   ├── spec.md                # PayPal-specific (40 pages)
│   │   └── webhooks.md            # Webhook handling (10 pages)
│   └── shared/                    # Shared concepts
│       ├── payment-entities.md    # Common models (10 pages)
│       └── compliance.md          # PCI-DSS (15 pages)
```

**Benefits**:
- ✅ Load `payments/stripe/` without loading `paypal/`
- ✅ Load `shared/` when needed by multiple modules
- ✅ Scales to 100+ modules without context bloat
- ✅ Each module is self-contained

### Layer 3: Context-Loader Skill (The Engine)

**Location**: `src/skills/context-loader/`

**Algorithm**:

```typescript
async function loadContext(featureId: string) {
  // Step 1: Read context manifest
  const manifest = await readManifest(featureId);

  // Step 2: Check cache
  const cached = await checkCache(manifest.spec_sections);
  if (cached.isValid && !manifest.auto_refresh) {
    return cached.context;
  }

  // Step 3: Load only specified sections
  const context = {
    specs: [],
    docs: [],
    totalTokens: 0
  };

  for (const section of manifest.spec_sections) {
    // Parse section syntax: "file.md#section-name"
    const [filePath, sectionId] = section.split('#');

    if (sectionId) {
      // Load ONLY the specified section
      const content = await loadMarkdownSection(filePath, sectionId);
      context.specs.push(content);
    } else {
      // Load entire file
      const content = await readFile(filePath);
      context.specs.push(content);
    }

    // Check token budget
    context.totalTokens += estimateTokens(content);
    if (context.totalTokens > manifest.max_context_tokens) {
      warn("Token budget exceeded, truncating...");
      break;
    }
  }

  // Step 4: Load documentation (same logic)
  for (const docPath of manifest.documentation) {
    const [filePath, sectionId] = docPath.split('#');
    const content = sectionId
      ? await loadMarkdownSection(filePath, sectionId)
      : await readFile(filePath);
    context.docs.push(content);
  }

  // Step 5: Cache result
  await cacheContext(manifest.spec_sections, context);

  return context;
}

// Helper: Load specific markdown section
async function loadMarkdownSection(filePath: string, sectionId: string) {
  const fullContent = await readFile(filePath);
  const lines = fullContent.split('\n');

  // Find section header (e.g., "## development-workflow")
  const headerPattern = new RegExp(`^##+ ${sectionId}`, 'i');
  let startIdx = lines.findIndex(line => headerPattern.test(line));

  if (startIdx === -1) return null;

  // Find next section header (same or higher level)
  const headerLevel = lines[startIdx].match(/^#+/)[0].length;
  const endPattern = new RegExp(`^#{1,${headerLevel}} `);
  let endIdx = lines.findIndex((line, idx) =>
    idx > startIdx && endPattern.test(line)
  );

  if (endIdx === -1) endIdx = lines.length;

  // Extract section content
  return lines.slice(startIdx, endIdx).join('\n');
}
```

**Key Techniques**:
1. **Section-level extraction** - Parse `file.md#section` syntax
2. **Token budgeting** - Enforce `max_context_tokens` limit
3. **Cache-first** - Check cache before disk reads
4. **Lazy loading** - Load on-demand, not upfront
5. **Dependency resolution** - Load parent sections first

### Layer 4: Caching Strategy (Performance Amplification)

**Location**: `.specweave/cache/`

```
.specweave/cache/
├── context-index.json              # Index of all available context
├── spec-embeddings/                # Vector embeddings for semantic search
│   ├── payments-stripe.vec
│   └── authentication-jwt.vec
└── loaded-context/                 # Cached loaded context
    ├── 0003-stripe-{hash}.json     # Feature-specific cache
    └── manifest-checksums.json     # Track manifest changes
```

**Cache Strategy**:

```typescript
interface CacheEntry {
  manifestHash: string;        // Hash of context manifest
  loadedAt: string;            // Timestamp
  expiresAt: string;           // 15 minutes default
  context: {
    specs: string[];
    docs: string[];
    totalTokens: number;
  };
}

async function checkCache(sections: string[]): CacheEntry | null {
  // Generate hash from manifest content
  const manifestHash = hashSections(sections);

  // Check cache
  const cached = await readCacheEntry(manifestHash);

  if (!cached) return null;

  // Check expiry (15 minutes)
  if (Date.now() > cached.expiresAt) {
    await invalidateCache(manifestHash);
    return null;
  }

  return cached;
}
```

**Benefits**:
- ✅ **Repeated loads are instant** (hit cache)
- ✅ **Automatic invalidation** (15-minute expiry)
- ✅ **Manifest change detection** (hash-based)
- ✅ **Semantic search enabled** (vector embeddings for future)

### Layer 5: Semantic Search Fallback (Dynamic Context Expansion)

**Problem**: What if manifest is incomplete? AI needs additional context mid-implementation.

**Solution**: Semantic search on cached embeddings (future enhancement).

**Flow**:
```
AI: "How do we handle rate limiting for Stripe webhooks?"

1. Check current context → Not found
2. Semantic search: "rate limiting webhooks"
3. Find: .specweave/docs/internal/architecture/api-gateway/rate-limiting.md
4. Load section dynamically
5. Update manifest for future use
6. Continue implementation
```

---

## The Math: How 70-96% Reduction is Achieved

### Example: Stripe Integration Feature

**Without Context Priming**:
```
Total context loaded:
├── CLAUDE.md: 5,000 tokens
├── Full spec (all modules): 50,000 tokens
│   ├── Authentication: 10,000 ❌
│   ├── Payments: 15,000 ✅
│   ├── Reporting: 12,000 ❌
│   └── Integrations: 13,000 ❌
├── Full architecture: 20,000 tokens
│   ├── System design: 5,000 ❌
│   ├── Payments arch: 5,000 ✅
│   ├── Auth arch: 5,000 ❌
│   └── Reporting arch: 5,000 ❌
└── All ADRs: 10,000 tokens
    ├── ADR 0001-0010: 8,000 ❌
    └── ADR 0005, 0008: 2,000 ✅

Total: 85,000 tokens
Relevant: 22,000 tokens
Efficiency: 25.9%
Waste: 74.1%
```

**With Context Priming**:
```
Context loaded (via manifest):
├── CLAUDE.md#development-workflow: 500 tokens ✅
├── Specs:
│   ├── payments/stripe/spec.md: 8,000 ✅
│   ├── payments/shared/payment-entities.md: 2,000 ✅
│   └── payments/shared/compliance.md#pci-dss: 1,500 ✅
├── Architecture:
│   └── payments/stripe-integration.md: 3,000 ✅
└── ADRs:
    ├── 0005-payment-provider.md: 1,000 ✅
    └── 0008-webhook-handling.md: 1,200 ✅

Total: 17,200 tokens
Relevant: 17,200 tokens
Efficiency: 100%
Reduction: (85,000 - 17,200) / 85,000 = 79.8%
```

### Scaling Analysis

| Project Size | Total Spec | Feature Context | Reduction |
|--------------|------------|-----------------|-----------|
| Small (50 pages) | 50,000 tokens | 20,000 tokens | **60%** |
| Medium (100 pages) | 100,000 tokens | 15,000 tokens | **85%** |
| Large (300 pages) | 300,000 tokens | 20,000 tokens | **93.3%** |
| Enterprise (600 pages) | 600,000 tokens | 20,000 tokens | **96.7%** |

**Key Insight**: Reduction increases with project size! Larger projects benefit MORE from context priming.

---

## Real-World Workflow

### Scenario: User Says "Implement Stripe payment integration"

**Step 1: Detection & Routing** (specweave-detector → feature-planner)
```
specweave-detector: Detects .specweave/ directory
→ Routes to feature-planner skill
```

**Step 2: Context Manifest Creation** (feature-planner)
```
feature-planner analyzes request:
- Identifies module: payments/stripe
- Identifies dependencies: shared payment models, compliance
- Creates context manifest with precise paths
- Saves to: .specweave/increments/0003-stripe-integration/context-manifest.yaml
```

**Step 3: Context Loading** (context-loader)
```
context-loader activates:
1. Reads manifest
2. Checks cache (miss - first load)
3. Loads specified files/sections:
   - payments/stripe/spec.md
   - payments/shared/payment-entities.md
   - payments/shared/compliance.md#pci-dss
   - architecture/payments/stripe-integration.md
   - ADR 0005, 0008
   - CLAUDE.md#development-workflow (section only)
4. Caches result (15-minute expiry)
5. Returns 17,200 tokens of focused context
```

**Step 4: Implementation** (with primed context)
```
AI now has:
✅ Stripe spec (what to build)
✅ Payment entities (data models)
✅ Compliance requirements (PCI-DSS)
✅ Architecture guidelines (how to integrate)
✅ Relevant ADRs (past decisions)
✅ Workflow section from CLAUDE.md (process)

AI does NOT have:
❌ Authentication specs (not needed)
❌ Reporting specs (not needed)
❌ Other payment providers (not needed)
❌ Irrelevant ADRs (not needed)

Result: Focused implementation, faster, higher quality
```

**Step 5: Dynamic Context Expansion** (if needed)
```
AI mid-implementation: "Need to handle rate limiting"
→ Semantic search: "rate limiting webhooks" (future)
→ Finds: api-gateway/rate-limiting.md
→ Loads dynamically (3,000 tokens)
→ Updates manifest for next time
→ Total context: 20,200 tokens (still within budget!)
```

---

## Advanced Techniques

### 1. Hierarchical Loading (Parent → Child)

```yaml
spec_sections:
  - .specweave/docs/internal/strategy/payments/overview.md    # Load parent first
  - .specweave/docs/internal/strategy/payments/stripe/spec.md  # Then child
```

**Why**: Gives AI "big picture" before diving into details. Better comprehension.

### 2. Dependency Resolution

```yaml
dependencies:
  - module: authentication
    sections:
      - .specweave/docs/internal/strategy/authentication/jwt-tokens.md
    reason: "Stripe webhooks require JWT validation"
```

**Why**: Auto-loads related context when working across modules.

### 3. Priority Levels

```yaml
priority: high    # Load first, always
priority: medium  # Load if tokens available
priority: low     # Load only if specifically requested
```

**Why**: Ensures critical context always loaded, nice-to-have is optional.

### 4. Auto-Refresh on Changes

```yaml
auto_refresh: true  # Re-load when source files change
```

**Why**: Keep context in sync when specs are updated.

---

## Comparison to Alternatives

| Approach | Tokens | Relevance | Speed | Scalability |
|----------|--------|-----------|-------|-------------|
| **Load Everything** | 100,000+ | 20-30% | Slow | Poor (hits limits) |
| **Manual Selection** | 30,000-50,000 | 60-70% | Medium | Medium (error-prone) |
| **SpecWeave Manifests** | 10,000-20,000 | 95-100% | Fast (cached) | Excellent (600+ pages) |

---

## Why This Matters

### For Solo Developers
- Work on large projects without context overwhelm
- Faster AI responses (less to process)
- Clearer mental model (focused context)

### For Teams (10+ developers)
- Each developer loads only their domain
- No cross-contamination (frontend doesn't see backend specs)
- Consistent context across team

### For Enterprise (500-600+ pages)
- **Impossible to load everything** (hits 200K token limit)
- Context priming makes enterprise-scale specs viable
- AI navigates massive documentation efficiently

---

## Implementation Status

**Current**: ✅ Architecture defined, skill structure created
**Next Steps**:
1. Implement `context-loader` skill (TypeScript/Python)
2. Add caching layer
3. Create test cases (minimum 3)
4. Integrate with `feature-planner`
5. Add semantic search (v2.0)

---

## Related Documentation

- [CLAUDE.md](../../../CLAUDE.md#context-priming) - Overview
- [Context-Loader Skill](../../../src/skills/context-loader/SKILL.md) - Implementation
- [Feature-Planner Skill](../../../src/skills/feature-planner/SKILL.md) - Context manifest creation
- [.specweave/docs/public/guides/context-priming.md](../../public/guides/context-priming.md) - User guide (YouTube script)

---

**Last Updated**: 2025-10-26
**Status**: Architecture Complete, Implementation Pending
