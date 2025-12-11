---
increment: 0134-living-docs-core-engine
title: "Technical Architecture - Living Docs Core Engine (Part 1)"
created: 2025-12-09
---

# Technical Architecture: Living Docs Core Engine

## Vision

Build the **core analysis engine** that automatically discovers, analyzes, and synthesizes architectural knowledge from any SpecWeave codebase.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│          LivingDocsOrchestrator (Main Coordinator)          │
│  - Change detection (Git diff)                              │
│  - Cache management                                         │
│  - Phase execution                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼───┐   ┌───▼────┐   ┌──▼─────┐
   │ Repo   │   │Pattern │   │Module  │
   │Scanner │   │Analyzer│   │Graph   │
   │        │   │        │   │Builder │
   └────┬───┘   └───┬────┘   └──┬─────┘
        │           │           │
        └───────────┼───────────┘
                    │
            ┌───────▼────────┐
            │ ADRSynthesizer │
            │ (LLM: Haiku +  │
            │      Opus)     │
            └────────────────┘
```

## Component Design

### 1. LivingDocsOrchestrator

**File**: `src/core/living-docs/intelligent-analyzer/orchestrator.ts`

**Purpose**: Coordinates all analysis phases with caching and change detection.

**API**:
```typescript
class LivingDocsOrchestrator {
  constructor(projectRoot: string, options: OrchestratorOptions);

  async update(options: UpdateOptions): Promise<UpdateResult>;

  private async executePhase1Discovery(): Promise<DiscoveryResult>;
  private async executePhase2Analysis(): Promise<AnalysisResult>;
  private async executePhase3Synthesis(): Promise<SynthesisResult>;

  private async detectChanges(): Promise<ChangedFiles[]>;
  private async loadFromCache(key: string): Promise<any>;
  private async saveToCache(key: string, data: any): Promise<void>;
}
```

**Key Features**:
- Git-based change detection
- Cache management with 24h TTL
- Parallel phase execution
- Progress reporting

### 2. RepoScanner

**File**: `src/core/living-docs/intelligent-analyzer/repo-scanner.ts`

**Purpose**: Discovers and inventories all repositories.

**API**:
```typescript
class RepoScanner {
  async scanAll(): Promise<RepoInfo[]>;
  async scanRepo(repoPath: string): Promise<RepoInfo>;
  detectRepoType(repoPath: string): RepoType;
  async extractTechStack(repoPath: string): Promise<TechStack>;
}

interface RepoInfo {
  path: string;
  name: string;
  type: RepoType; // 'frontend' | 'backend' | 'mobile' | 'shared-lib'
  techStack: TechStack;
  fileCount: number;
  lineCount: number;
  lastCommit: string;
}
```

**Detection Logic**:
- Check `package.json` for frontend/backend indicators
- Check `go.mod`, `requirements.txt` for language
- Check `terraform` files for infrastructure
- Shared libraries detected by folder structure

### 3. PatternAnalyzer

**File**: `src/core/living-docs/intelligent-analyzer/pattern-analyzer.ts`

**Purpose**: Detects architectural patterns from code.

**API**:
```typescript
class PatternAnalyzer {
  async analyzeAll(): Promise<AnalysisResult>;

  async detectStateManagement(): Promise<Pattern[]>;
  async detectAPIStyle(): Promise<Pattern[]>;
  async detectAuthStrategy(): Promise<Pattern[]>;
  async detectDatabaseAccess(): Promise<Pattern[]>;
  async detectInconsistencies(): Promise<Inconsistency[]>;
}

interface Pattern {
  category: string;
  name: string;
  confidence: number; // 0-100
  evidence: Evidence[];
  decision: string;
}
```

**Pattern Detection Examples**:
- Redux: Check for `store/`, `useSelector`, `useDispatch`
- REST API: Check for Express routes, controllers
- JWT: Check for `jsonwebtoken`, token verification
- Prisma: Check for `schema.prisma`, Prisma Client usage

### 4. ADRSynthesizer

**File**: `src/core/living-docs/intelligent-analyzer/adr-synthesizer.ts`

**Purpose**: Uses LLM to synthesize ADRs from patterns.

**API**:
```typescript
class ADRSynthesizer {
  async synthesize(pattern: Pattern, context: ProjectContext): Promise<ADR>;
  async synthesizeAll(patterns: Pattern[]): Promise<ADR[]>;
  async mergeWithExisting(newADRs: ADR[], existing: ADR[]): Promise<ADR[]>;
}
```

**LLM Strategy**:
- **Haiku**: Fast pattern detection (structural analysis)
- **Opus**: Deep ADR synthesis (reasoning, trade-offs)
- Cache all synthesis results (pattern hash as key)

### 5. ModuleGraphBuilder

**File**: `src/core/living-docs/intelligent-analyzer/module-graph-builder.ts`

**Purpose**: Builds dependency graph by parsing imports.

**API**:
```typescript
class ModuleGraphBuilder {
  async buildGraph(): Promise<ModuleGraph>;
  detectCircularDependencies(graph: ModuleGraph): CircularDep[];
  calculateMetrics(graph: ModuleGraph): GraphMetrics;
}

interface ModuleGraph {
  nodes: Module[];
  edges: Dependency[];
}
```

**Import Parsing**:
- TypeScript/JavaScript: `/import\s+.*from\s+['"]([^'"]+)['"]/`
- Go: `/import\s+(?:\(\s*)?["']([^"']+)["']/`
- Python: `/(?:from\s+([\w.]+)\s+)?import\s+([\w,\s]+)/`

### 6. TechDebtDetector

**File**: `src/core/living-docs/intelligent-analyzer/tech-debt-detector.ts`

**Purpose**: Identifies technical debt and code smells.

**API**:
```typescript
class TechDebtDetector {
  async detectAll(): Promise<TechDebtReport>;

  async detectOutdatedDependencies(): Promise<DebtItem[]>;
  async detectLargeFiles(): Promise<DebtItem[]>;
  async detectHighComplexity(): Promise<DebtItem[]>;
  async detectInconsistentPatterns(): Promise<DebtItem[]>;
}
```

**Detection Algorithms**:
- Large files: `>1000 lines` (use `wc -l`)
- High complexity: Cyclomatic complexity `>10` (AST parsing)
- Outdated deps: `npm outdated`, `go list -u -m all`
- Inconsistencies: Pattern usage analysis

## Data Flow

### Full Update Flow

```
1. Orchestrator.update({ full: true })
2. Phase 1: Discovery
   - Scan all repos (parallel workers)
   - Extract tech stacks
   - Cache: repo-scan-{repo}-{commit}.json
3. Phase 2: Analysis
   - Detect patterns (state mgmt, API, auth, DB)
   - Build module graph
   - Detect tech debt
   - Cache: analysis-{commit}.json
4. Phase 3: Synthesis
   - For each pattern: LLM synthesizes ADR
   - Cache: adr-{pattern-hash}.json
5. Return: UpdateResult with all discoveries
```

### Incremental Update Flow

```
1. Orchestrator.update({ incremental: true })
2. Detect changes: git diff <last_commit> HEAD
3. Selective re-analysis:
   - If package.json changed → Re-scan dependencies
   - If src/ changed → Re-run pattern detection
   - If imports changed → Rebuild module graph
4. Update only affected results
5. Cache updates for changed files only
```

## Technology Choices

### Why LLM Synthesis?

**Chosen: LLM-powered synthesis**
- ✅ Infers context from code patterns
- ✅ Natural language quality
- ✅ Adapts to any project
- ✅ Suggests alternatives and trade-offs

**Rejected: Rule-based templates**
- ❌ Requires maintaining rules for every pattern
- ❌ No context inference

### Why Caching?

**Trade-off**: Speed vs Freshness
- With cache: Incremental updates <30s
- Without cache: Every update 5-10 minutes

**Strategy**: Git commit hash as cache key (deterministic)

### Why Parallel Scanning?

**Performance**:
- Sequential: 10 repos × 1 min = 10 min
- Parallel (4 workers): 10 repos ÷ 4 = 2.5 min

## Performance Targets

| Operation | Target | Implementation |
|-----------|--------|----------------|
| Repo scan (per repo) | <1 min | Parallel workers |
| Pattern detection | <30s | Cached results |
| ADR synthesis (per pattern) | 3-5s | Opus with caching |
| Module graph build | <20s | Import parsing |
| Full update (10 repos) | <5 min | All optimizations |

## File Structure

```
src/core/living-docs/intelligent-analyzer/
├── orchestrator.ts          # Main coordinator
├── repo-scanner.ts          # Multi-repo discovery
├── pattern-analyzer.ts      # Pattern detection
├── adr-synthesizer.ts       # LLM synthesis
├── module-graph-builder.ts  # Dependency graph
├── tech-debt-detector.ts    # Debt detection
├── types.ts                 # Shared interfaces
└── cache-manager.ts         # Cache operations
```

## Implementation Phases

**Phase 1**: Core Infrastructure (T-001 to T-004)
- Orchestrator
- RepoScanner
- Cache infrastructure
- Change detection

**Phase 2**: Analysis Modules (T-005 to T-012)
- PatternAnalyzer
- TechDebtDetector
- ModuleGraphBuilder

**Phase 3**: LLM Synthesis (T-013 to T-016)
- ADRSynthesizer
- Prompt engineering
- Cache integration
- ADR merging

## Next Steps (Part 2 - 0135)

- Mermaid diagram generation
- Interactive HTML graphs
- Dashboard creation
- CLI command `/specweave:living-docs update`
- Hook integration
