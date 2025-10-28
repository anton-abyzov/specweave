---
name: context-loader
description: Precision context loading system that selectively loads specifications, architecture docs, and ADRs based on context manifests. Achieves 70%+ token reduction by loading only relevant context. Activates automatically when working on features/issues or when user requests "load context for...". Keywords: load context, context manifest, selective loading, specifications, context precision.
---

# Context Loader - Precision Context Loading

## Purpose

The context-loader is SpecWeave's **precision context loading system** that:
1. Loads only relevant specifications and documentation (not everything)
2. Achieves **70%+ token reduction** vs loading full specs
3. Respects context manifests (`context-manifest.yaml`)
4. Supports section-level granularity (`#specific-section`)
5. Enables enterprise-scale specs (500+ pages) without context bloat
6. Caches loaded context for performance

## When to Activate

This skill activates when:
- User starts working on a feature (`.specweave/increments/####-name/`)
- User works on an issue (`work/issues/####-name/`)
- User explicitly requests "load context for feature 0003"
- Any skill needs specification context
- specweave-detector detects active work

## Context Manifest Format

### Basic Context Manifest

```yaml
---
# Context Manifest for Feature 003: Stripe Payment Integration

# Specification sections to load
spec_sections:
  - specifications/modules/payments/overview.md
  - specifications/modules/payments/stripe/spec.md
  - specifications/modules/payments/stripe/api-contracts.md
  - specifications/modules/payments/shared/payment-entities.md

# Architecture documents to load
architecture:
  - .specweave/docs/architecture/system-design.md#payment-flow
  - .specweave/docs/architecture/data/database-schema.md#payment-tables
  - .specweave/docs/architecture/security/pci-compliance.md

# Architecture Decision Records to reference
adrs:
  - .specweave/docs/decisions/005-payment-provider-choice.md
  - .specweave/docs/decisions/012-stripe-webhook-handling.md

# Context budget (max tokens to load)
max_context_tokens: 10000

# Priority level
priority: high

# Auto-refresh context on spec changes
auto_refresh: false

# Related features
related_features:
  - 002-user-subscriptions
  - 004-billing-portal

# Tags for search and categorization
tags:
  - payments
  - stripe
  - pci-compliance
  - subscriptions
---
```

### Advanced Context Manifest (with filters)

```yaml
---
# Context Manifest with advanced filtering

spec_sections:
  - path: specifications/modules/payments/**/*.md
    exclude:
      - "**/legacy/**"
      - "**/deprecated/**"
    sections:
      - "#stripe-integration"
      - "#webhook-handling"

architecture:
  - path: .specweave/docs/architecture/payments/**/*.md
    max_depth: 2  # Don't load deeply nested sections

adrs:
  - path: .specweave/docs/decisions/*.md
    filter:
      tags: ["payment", "stripe"]

# Section-level loading
load_sections_only: true

# Cache settings
cache:
  enabled: true
  ttl: 3600  # 1 hour

# Token optimization
optimization:
  remove_code_blocks: false  # Keep code examples
  remove_tables: false
  remove_mermaid: false
  summarize_long_sections: true  # Auto-summarize sections >1000 tokens
---
```

## Loading Algorithm

### Phase 1: Parse Manifest

```typescript
interface ContextManifest {
  spec_sections: string[];
  architecture: string[];
  adrs: string[];
  max_context_tokens: number;
  priority: 'low' | 'medium' | 'high';
  auto_refresh: boolean;
  related_features?: string[];
  tags?: string[];
}

function parseManifest(manifestPath: string): ContextManifest {
  const yaml = readFile(manifestPath);
  return parseYAML(yaml);
}
```

### Phase 2: Resolve Paths

```typescript
function resolvePaths(patterns: string[]): string[] {
  const resolved: string[] = [];

  for (const pattern of patterns) {
    // Handle glob patterns
    if (pattern.includes('*')) {
      const files = glob(pattern);
      resolved.push(...files);
    }

    // Handle section references (#anchor)
    else if (pattern.includes('#')) {
      const [file, section] = pattern.split('#');
      resolved.push({ file, section });
    }

    // Handle direct paths
    else {
      resolved.push({ file: pattern, section: null });
    }
  }

  return resolved;
}
```

### Phase 3: Load Content with Section Filtering

```typescript
function loadContent(filePath: string, section?: string): string {
  const content = readFile(filePath);

  // If section specified, extract only that section
  if (section) {
    return extractSection(content, section);
  }

  return content;
}

function extractSection(markdown: string, sectionHeading: string): string {
  const lines = markdown.split('\n');
  let inSection = false;
  let sectionLevel = 0;
  const result: string[] = [];

  for (const line of lines) {
    // Check if heading
    const headingMatch = line.match(/^(#+)\s+(.+)/);

    if (headingMatch) {
      const [, hashes, heading] = headingMatch;
      const level = hashes.length;

      // Found target section
      if (heading.trim() === sectionHeading.replace('#', '').trim()) {
        inSection = true;
        sectionLevel = level;
        result.push(line);
        continue;
      }

      // End of section (same or higher level heading)
      if (inSection && level <= sectionLevel) {
        break;
      }
    }

    if (inSection) {
      result.push(line);
    }
  }

  return result.join('\n');
}
```

### Phase 4: Token Budget Management

```typescript
function enforceTokenBudget(contents: LoadedContent[], maxTokens: number): LoadedContent[] {
  let totalTokens = 0;
  const result: LoadedContent[] = [];

  // Sort by priority: ADRs > Architecture > Specs
  const sorted = sortByPriority(contents);

  for (const content of sorted) {
    const tokens = estimateTokens(content.text);

    if (totalTokens + tokens <= maxTokens) {
      result.push(content);
      totalTokens += tokens;
    } else {
      // Try to fit summary instead
      const summary = summarize(content.text, maxTokens - totalTokens);
      if (summary) {
        result.push({ ...content, text: summary, summarized: true });
        break;
      }
    }
  }

  return result;
}

function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}
```

### Phase 5: Cache Management

```typescript
interface CachedContext {
  manifestHash: string;
  contents: LoadedContent[];
  loadedAt: number;
  expiresAt: number;
}

function getCachedContext(manifestPath: string): CachedContext | null {
  const cacheKey = manifestHash(manifestPath);
  const cached = readCache(`.specweave/cache/context/${cacheKey}.json`);

  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  return null;
}

function saveToCache(manifestPath: string, contents: LoadedContent[], ttl: number) {
  const cacheKey = manifestHash(manifestPath);
  const cache: CachedContext = {
    manifestHash: cacheKey,
    contents,
    loadedAt: Date.now(),
    expiresAt: Date.now() + (ttl * 1000)
  };

  writeCache(`.specweave/cache/context/${cacheKey}.json`, cache);
}
```

## Loading Workflows

### Workflow 1: Feature Development

```
User: "Implement feature 003"
    ↓
specweave-detector detects feature 003
    ↓
context-loader activates
    ↓
Load context-manifest.yaml:
  features/003-stripe-payment/context-manifest.yaml
    ↓
Parse manifest:
  spec_sections: 4 files
  architecture: 3 files (2 with section filters)
  adrs: 2 files
  max_tokens: 10,000
    ↓
Resolve paths:
  ✓ specifications/modules/payments/overview.md (full)
  ✓ specifications/modules/payments/stripe/spec.md (full)
  ✓ .specweave/docs/architecture/system-design.md#payment-flow (section only)
  ...
    ↓
Load content:
  Total: 8,547 tokens (under budget ✓)
    ↓
Context loaded:
  "Context loaded for Feature 003: Stripe Payment Integration

  Loaded 9 documents (8,547 tokens):
  ✓ 4 specification files
  ✓ 3 architecture documents (2 section-filtered)
  ✓ 2 ADRs

  Token reduction: 73% (vs loading all payment specs: 31,892 tokens)

  Ready to implement!"
```

### Workflow 2: Brownfield Issue

```
User: Working in work/issues/012-fix-payment-webhook/
    ↓
context-loader detects active issue
    ↓
Load: work/issues/012-fix-payment-webhook/context-manifest.yaml
    ↓
Manifest specifies:
  spec_sections:
    - specifications/modules/payments/stripe/webhooks.md
  architecture:
    - .specweave/docs/architecture/webhooks.md
  code:
    - src/services/stripe-webhook-handler.ts (existing code)
    ↓
Load brownfield context:
  ✓ Current implementation (src/services/)
  ✓ Webhook specification
  ✓ Architecture design
    ↓
Total: 2,134 tokens
    ↓
"Context loaded for Issue 012: Fix Payment Webhook

Loaded:
✓ Current webhook handler implementation
✓ Webhook specification
✓ Architecture documentation

Token reduction: 94% (vs loading all payment context)

Ready to debug!"
```

### Workflow 3: Related Features

```
User: "Show me related features for feature 003"
    ↓
context-loader reads manifest:
  related_features:
    - 002-user-subscriptions
    - 004-billing-portal
    ↓
Load context for all related features:
  features/002-user-subscriptions/context-manifest.yaml
  features/004-billing-portal/context-manifest.yaml
    ↓
Find overlapping context:
  Common specs:
    - specifications/modules/payments/shared/payment-entities.md
  Common architecture:
    - .specweave/docs/architecture/database-schema.md#payment-tables
    ↓
Report:
  "Features 002, 003, 004 share common context:

  Shared specifications:
  - Payment entities model

  Shared architecture:
  - Payment database schema

  This suggests these features should be implemented together
  or in sequence to avoid conflicts."
```

## Token Reduction Examples

### Example 1: Payment Module (Enterprise Scale)

**Scenario**: Large payment module with 500 pages of specs

**Without context-loader** (loading everything):
```
specifications/modules/payments/**/*.md
  Total files: 47
  Total tokens: 185,234
  Problem: Exceeds context window!
```

**With context-loader** (selective loading):
```yaml
# Feature 003 manifest
spec_sections:
  - specifications/modules/payments/stripe/spec.md
  - specifications/modules/payments/shared/payment-entities.md
architecture:
  - .specweave/docs/architecture/system-design.md#stripe-integration
```

```
Result:
  Total files: 3 (2 specs + 1 architecture section)
  Total tokens: 8,547
  Reduction: 95.4% 🎯
```

### Example 2: Authentication Module

**Without context-loader**:
```
specifications/modules/authentication/**/*.md
  OAuth spec: 15,234 tokens
  Session management: 8,765 tokens
  LDAP integration: 12,456 tokens
  SAML integration: 18,932 tokens
  Password policies: 5,643 tokens
  Total: 60,030 tokens
```

**With context-loader** (working on OAuth only):
```yaml
spec_sections:
  - specifications/modules/authentication/oauth/spec.md
  - specifications/modules/authentication/shared/user-entities.md
```

```
Result:
  OAuth spec: 15,234 tokens
  User entities: 2,341 tokens
  Total: 17,575 tokens
  Reduction: 70.7% 🎯
```

## Auto-Refresh Feature

### Watch for Spec Changes

```typescript
// When auto_refresh: true in manifest
function watchSpecChanges(manifest: ContextManifest) {
  const watchedFiles = resolveAllPaths(manifest);

  for (const file of watchedFiles) {
    fs.watch(file, () => {
      console.log(`Spec changed: ${file}`);
      console.log('Auto-refreshing context...');

      // Clear cache
      clearCache(manifest);

      // Reload context
      loadContext(manifest);

      console.log('✓ Context refreshed');
    });
  }
}
```

### Invalidate Cache on Changes

```typescript
function shouldInvalidateCache(manifestPath: string): boolean {
  const cached = getCachedContext(manifestPath);
  if (!cached) return true;

  const manifest = parseManifest(manifestPath);
  const files = resolveAllPaths(manifest);

  for (const file of files) {
    const fileModified = fs.statSync(file).mtimeMs;
    if (fileModified > cached.loadedAt) {
      return true;  // File changed since cache created
    }
  }

  return false;  // Cache still valid
}
```

## Performance Optimization

### Parallel Loading

```typescript
async function loadContextParallel(manifest: ContextManifest): Promise<LoadedContent[]> {
  const allPaths = [
    ...manifest.spec_sections,
    ...manifest.architecture,
    ...manifest.adrs
  ];

  // Load all files in parallel
  const promises = allPaths.map(path => loadFile(path));
  const contents = await Promise.all(promises);

  return contents;
}
```

### Lazy Loading

```typescript
// Load only high-priority items immediately
// Load medium/low priority on-demand

async function loadContextLazy(manifest: ContextManifest): Promise<ContextLoader> {
  // Immediate load (high priority)
  const highPriority = await loadHighPriorityContent(manifest);

  // Return loader with deferred loading
  return {
    immediate: highPriority,

    loadMore: async () => {
      return await loadMediumPriorityContent(manifest);
    },

    loadAll: async () => {
      return await loadAllContent(manifest);
    }
  };
}
```

## Integration Points

### 1. Called By

- **specweave-detector**: Auto-load when feature/issue detected
- **increment-planner**: Load context when creating new features
- **All implementation skills**: Load context before implementing
- **Users**: Explicit "load context for feature 003"

### 2. Calls

- File system: Read specification/architecture files
- Cache: Read/write cached context

### 3. Updates

- `.specweave/cache/context/`: Cached loaded context
- `.specweave/logs/context-loading.log`: Loading metrics

## Configuration

```yaml
# .specweave/config.yaml
context_loader:
  enabled: true

  # Cache settings
  cache:
    enabled: true
    ttl: 3600  # 1 hour in seconds
    directory: ".specweave/cache/context"

  # Performance
  parallel_loading: true
  max_parallel: 10

  # Auto-refresh
  watch_specs: true  # Watch for file changes

  # Token optimization
  default_max_tokens: 10000
  warn_threshold: 8000  # Warn when approaching budget

  # Summarization (for over-budget content)
  auto_summarize: true
  summarization_ratio: 0.3  # Target 30% of original length
```

## Metrics and Monitoring

### Context Loading Metrics

```typescript
interface ContextMetrics {
  feature: string;
  filesLoaded: number;
  tokensLoaded: number;
  tokenBudget: number;
  reductionPercentage: number;
  loadTimeMs: number;
  cacheHit: boolean;
  timestamp: number;
}

// Example log entry
{
  feature: "003-stripe-payment",
  filesLoaded: 9,
  tokensLoaded: 8547,
  tokenBudget: 10000,
  reductionPercentage: 73.2,
  loadTimeMs: 145,
  cacheHit: false,
  timestamp: 1704067200000
}
```

### Performance Dashboard

```
Context Loading Performance (Last 30 days)

Average token reduction: 74.3% 🎯 (target: 70%+)
Average load time: 156ms
Cache hit rate: 67%

Top token savers:
1. Feature 003 (Stripe Payment): 95.4% reduction
2. Feature 007 (OAuth SSO): 82.1% reduction
3. Feature 012 (Webhooks): 78.9% reduction

Token budget warnings: 2 (features approaching limit)
```

## Testing

### Test Cases

**TC-001: Basic Context Loading**
- Given: Feature with context manifest
- When: context-loader loads context
- Then: All specified files loaded
- And: Token count within budget
- And: >70% reduction achieved

**TC-002: Section-Level Loading**
- Given: Manifest with section filters (#payment-flow)
- When: context-loader loads architecture doc
- Then: Only specified section extracted
- And: Other sections not loaded
- And: Token reduction maximized

**TC-003: Cache Hit**
- Given: Context loaded once (cached)
- When: Same context requested again
- Then: Loaded from cache (not file system)
- And: Load time < 50ms

**TC-004: Cache Invalidation**
- Given: Cached context exists
- When: Spec file modified
- Then: Cache invalidated
- And: Fresh context loaded
- And: New cache created

**TC-005: Token Budget Enforcement**
- Given: Manifest with max_tokens: 5000
- When: Specs total 7000 tokens
- Then: Lower priority items summarized or dropped
- And: Final total ≤ 5000 tokens
- And: User warned about budget constraint

**TC-006: Related Features**
- Given: Feature with related_features specified
- When: User requests related context
- Then: All related manifests loaded
- And: Common context identified
- And: Report generated

## Resources

### YAML Processing
- [js-yaml](https://github.com/nodeca/js-yaml) - YAML parser for JavaScript
- [yaml](https://www.npmjs.com/package/yaml) - Modern YAML parser
- [YAML Specification](https://yaml.org/spec/) - Official YAML spec

### File Globbing
- [glob](https://github.com/isaacs/node-glob) - Match files using glob patterns
- [fast-glob](https://github.com/mrmlnc/fast-glob) - Fast file pattern matching
- [minimatch](https://github.com/isaacs/minimatch) - Glob pattern matcher

### Markdown Processing
- [marked](https://marked.js.org/) - Markdown parser and compiler
- [remark](https://remark.js.org/) - Markdown processor powered by plugins
- [markdown-it](https://github.com/markdown-it/markdown-it) - Markdown parser

### Caching
- [node-cache](https://github.com/node-cache/node-cache) - Simple caching module
- [lru-cache](https://github.com/isaacs/node-lru-cache) - Least Recently Used cache
- [flat-cache](https://github.com/jaredwray/flat-cache) - Flat file cache

### Token Estimation
- [tiktoken](https://github.com/openai/tiktoken) - OpenAI's token counter
- [js-tiktoken](https://github.com/dqbd/tiktoken) - TikToken for JavaScript

### Text Summarization
- [node-sumy](https://github.com/chunksnbits/node-sumy) - Text summarization
- [Hugging Face Transformers](https://huggingface.co/docs/transformers/) - Advanced summarization models

---

## Summary

The context-loader is SpecWeave's **precision context loading system** that:
- ✅ Loads only relevant specifications (not everything)
- ✅ Achieves 70%+ token reduction (constitution target)
- ✅ Supports section-level granularity (`#anchor`)
- ✅ Enables enterprise-scale specs (500+ pages) without bloat
- ✅ Caches for performance (<50ms cache hits)
- ✅ Auto-refreshes when specs change (optional)
- ✅ Manages token budgets intelligently

**User benefit**: Work on massive codebases with 500+ page specifications without exceeding context windows. Load exactly what you need, when you need it.

**Revolutionary impact**: Makes spec-driven development scalable to enterprise without sacrificing precision.
