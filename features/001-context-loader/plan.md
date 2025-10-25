# Implementation Plan: Context Loader for Selective Specification Loading

## Overview

Implement a high-performance context loading system that selectively loads spec sections based on YAML manifests, achieving 70%+ token reduction while maintaining full context awareness.

## Architecture

### Components

1. **ContextManifestParser**
   - Parses `context-manifest.yaml` files
   - Validates structure and references
   - Resolves glob patterns and section anchors

2. **SelectiveLoader**
   - Loads only declared files/sections
   - Extracts markdown sections by header
   - Preserves formatting and structure

3. **CacheManager**
   - Caches parsed specs in `.specweave/cache/`
   - Tracks modification times for invalidation
   - Provides cache statistics

4. **TokenBudgetEnforcer**
   - Counts tokens in loaded context
   - Enforces `max_context_tokens` budget
   - Provides optimization suggestions

5. **ContextIndexBuilder**
   - Scans specs directory
   - Builds searchable index
   - Enables context discovery

### Data Flow

```
context-manifest.yaml
        ↓
ContextManifestParser (parse & validate)
        ↓
SelectiveLoader (load files/sections)
        ↓
CacheManager (check cache, load/save)
        ↓
TokenBudgetEnforcer (count & validate)
        ↓
Loaded Context (return to skill)
```

### Data Model

#### Context Manifest Schema

```yaml
spec_sections:
  - specs/modules/payments/**/*.md
  - specs/constitution.md#article-iv
architecture:
  - architecture/system-design.md#context-loading
adrs:
  - adrs/004-context-loading-approach.md
max_context_tokens: 10000
priority: high
auto_refresh: false
related_features:
  - 002-skill-router
tags:
  - core
  - context
```

#### Cache Entry Schema

```json
{
  "file_path": "specs/modules/payments/stripe/spec.md",
  "content": "...",
  "tokens": 1234,
  "headers": [
    {
      "level": 1,
      "text": "Stripe Integration",
      "anchor": "stripe-integration",
      "line": 5
    }
  ],
  "modified_time": 1737840000,
  "cached_time": 1737840123
}
```

#### Context Index Schema

```json
{
  "version": "1.0.0",
  "generated": "2025-01-25T18:00:00Z",
  "specs": [
    {
      "file": "specs/modules/payments/stripe/spec.md",
      "sections": [
        {
          "anchor": "stripe-integration",
          "title": "Stripe Integration",
          "level": 1,
          "tokens": 500
        }
      ],
      "total_tokens": 2500,
      "tags": ["payments", "stripe"]
    }
  ]
}
```

## Technology Decisions

### Technology Stack

- **Language**: JavaScript/Node.js (matches Claude Code CLI ecosystem)
- **Markdown Parser**: `remark` with `remark-parse` (AST-based, extensible)
- **Token Counter**: `js-tiktoken` (OpenAI's token counting library)
- **YAML Parser**: `js-yaml` (standard, well-maintained)
- **File Glob**: `glob` package (fast, widely used)
- **Caching**: File-based JSON (simple, no dependencies)

### Key Libraries

```json
{
  "dependencies": {
    "remark": "^15.0.0",
    "remark-parse": "^11.0.0",
    "js-tiktoken": "^1.0.0",
    "js-yaml": "^4.1.0",
    "glob": "^10.0.0",
    "fs-extra": "^11.0.0"
  }
}
```

### ADRs to Create

1. **ADR 004**: Context Loading Approach
   - Why manifest-based vs AI-powered selection
   - Why file-based cache vs Redis/database
   - Token counting library choice

2. **ADR 005**: Section Anchor Format
   - Markdown anchor convention
   - Handling duplicate headers
   - Nested section support

## Implementation Approach

### Phase 1: Foundation (P1)

**Goal**: Basic context loading from manifests

#### Tasks

1. Setup project structure
2. Implement `ContextManifestParser`
   - Parse YAML manifests
   - Validate schema
   - Resolve file paths

3. Implement `SelectiveLoader`
   - Load files by path
   - Basic markdown reading
   - Return concatenated content

4. Token counting utility
   - Integrate js-tiktoken
   - Count tokens in markdown

5. Basic error handling
   - File not found
   - Invalid manifest
   - Budget exceeded

### Phase 2: Section Loading & Caching (P1)

**Goal**: Granular section loading with performance optimization

#### Tasks

1. Markdown section parser
   - Parse AST with remark
   - Extract headers and levels
   - Build section map

2. Section extraction
   - Find section by anchor
   - Extract content to next header
   - Handle nested sections

3. Implement `CacheManager`
   - Cache directory structure
   - Save/load cache entries
   - Modification time tracking

4. Cache invalidation
   - Compare file mtimes
   - Auto-refresh stale entries
   - Cache statistics

### Phase 3: Index & Discovery (P2)

**Goal**: Enable context discovery and optimization

#### Tasks

1. Implement `ContextIndexBuilder`
   - Scan specs directory recursively
   - Parse all markdown files
   - Extract headers and metadata

2. Index generation
   - Build JSON index
   - Calculate token counts per section
   - Add tags and keywords

3. Search functionality
   - Keyword search in index
   - Section title search
   - Tag-based filtering

4. Index maintenance
   - Auto-refresh on spec changes
   - Incremental updates
   - Index compaction

### Phase 4: Budget Enforcement & Optimization (P2)

**Goal**: Prevent context window overflows

#### Tasks

1. Implement `TokenBudgetEnforcer`
   - Calculate total context tokens
   - Compare against budget
   - Priority-based loading

2. Budget warnings
   - Warn at 80% budget
   - Error at 100% budget
   - Suggest optimizations

3. Optimization suggestions
   - Identify largest sections
   - Suggest more specific anchors
   - Recommend splitting large specs

4. Budget reporting
   - Actual vs budgeted tokens
   - Top consumers
   - Cache impact

## Technical Challenges

### Challenge 1: Markdown Section Extraction

**Problem**: Extracting sections from markdown while preserving formatting and handling edge cases (code blocks, nested lists, tables).

**Solution**:
- Use AST-based parsing with remark
- Navigate AST to find header nodes
- Extract children nodes until next header of same/higher level
- Serialize back to markdown preserving structure

**Risk**: Complex markdown may break extraction
**Mitigation**: Extensive test suite with real-world specs

### Challenge 2: Duplicate Header Anchors

**Problem**: Same header text appears multiple times (e.g., multiple "Overview" sections).

**Solution**:
- Use path + anchor for uniqueness: `specs/payments/stripe/spec.md#overview`
- If still duplicate, append number: `#overview-2`
- Document convention in ADR 005

**Risk**: Confusion for users specifying anchors
**Mitigation**: Clear error messages, suggest full path

### Challenge 3: Cache Invalidation

**Problem**: Knowing when to invalidate cache (file changes, git pulls, etc.).

**Solution**:
- Check file modification time on each load
- Compare with cached entry's `modified_time`
- If newer, invalidate and reload
- Support manual cache clear

**Risk**: False positives on timestamp changes (git operations)
**Mitigation**: Add content hash comparison as fallback

### Challenge 4: Token Counting Accuracy

**Problem**: Different models count tokens differently.

**Solution**:
- Use js-tiktoken which matches OpenAI's counting
- For Claude models, add 5-10% buffer
- Document assumptions in ADR 004

**Risk**: Budget may be slightly inaccurate for non-OpenAI models
**Mitigation**: Conservative budgets, clear documentation

## File Structure

```
src/context-loader/
├── index.js                        # Main exports
├── ContextManifestParser.js        # Manifest parsing
├── SelectiveLoader.js              # File/section loading
├── CacheManager.js                 # Caching layer
├── TokenBudgetEnforcer.js          # Budget enforcement
├── ContextIndexBuilder.js          # Index generation
├── utils/
│   ├── markdown-parser.js          # Markdown AST utilities
│   ├── token-counter.js            # Token counting
│   ├── file-utils.js               # File system helpers
│   └── anchor-generator.js         # Anchor generation
└── __tests__/
    ├── ContextManifestParser.test.js
    ├── SelectiveLoader.test.js
    ├── CacheManager.test.js
    ├── TokenBudgetEnforcer.test.js
    └── integration.test.js

.specweave/cache/
├── context-index.json              # Generated index
└── specs/                          # Cached specs
    └── modules/
        └── payments/
            └── stripe-spec-md.json # Cache entry

ai-temp-files/scripts/validation/
└── validate-context-manifest.js    # Manifest validation script
```

## Testing Strategy

### Unit Tests

- `ContextManifestParser`: Valid/invalid manifests, schema validation
- `SelectiveLoader`: File loading, section extraction
- `CacheManager`: Save/load/invalidate operations
- `TokenBudgetEnforcer`: Budget calculations, warnings
- `ContextIndexBuilder`: Index generation, search

### Integration Tests

- End-to-end manifest → loaded context
- Cache hit/miss scenarios
- Budget enforcement with real specs
- Index generation from real spec tree

### Performance Tests

- Loading 100+ file spec collection
- Cache hit rate measurement
- Token counting performance
- Index search speed

## Deployment Considerations

### Configuration

Add to `.specweave/config.yaml`:

```yaml
context:
  max_tokens: 10000
  cache_enabled: true
  cache_dir: ".specweave/cache/"
  cache_ttl: 86400  # 24 hours
  manifest_required: true
  selective_loading: true
  index_auto_refresh: true
```

### Installation

Part of core SpecWeave, no separate installation.

### Migration

For existing projects without context manifests:
1. Generate default manifests for all features
2. Run `specweave context index` to build index
3. Suggest manifests based on git history

## Performance Targets

- **Token Reduction**: 70%+ vs loading full specs
- **Cache Hit Rate**: >60% for common operations
- **Load Time**: <500ms for cached specs
- **Load Time**: <2s for uncached specs
- **Index Generation**: <10s for 100+ specs

## Security Considerations

### File Access

- Restrict loading to project directory
- Validate paths to prevent directory traversal
- No execution of loaded content

### Cache Integrity

- Validate cache JSON structure
- Ignore corrupted cache entries
- Regenerate on validation failure

### Manifest Validation

- Schema validation before processing
- Reject malicious patterns (e.g., `../../sensitive-file`)
- Log suspicious manifests

## Constitutional Compliance

### Article IV: Context Precision Principle ✅

- Implements selective loading
- Enforces context manifests
- Respects token budgets

### Article IX: Skill Testing Mandate ✅

- Comprehensive test suite
- Unit, integration, and performance tests
- Test-first development approach

## Integration with Other Skills

- **feature-planner**: Uses context loader for planning
- **skill-router**: Loads context based on routing decision
- **docs-updater**: Updates docs based on loaded context
- **developer**: Implements with relevant specs loaded

## Next Steps

1. Create ADR 004: Context Loading Approach
2. Setup project structure and dependencies
3. Implement Phase 1 (Foundation)
4. Write and run tests
5. Implement Phase 2 (Caching)
6. Generate documentation
7. Create example context manifests

---

This implementation plan ensures the Context Loader delivers on SpecWeave's promise of precision context loading while maintaining performance, scalability, and constitutional compliance.
