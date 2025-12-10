---
increment: 0134-intelligent-living-docs-deep-analysis
title: "Technical Architecture - Intelligent Living Docs Engine"
created: 2025-12-09
---

# Technical Architecture: Intelligent Living Docs Engine

## Vision

Transform living docs from a **simple sync tool** into an **intelligent knowledge base** that automatically analyzes codebases, discovers patterns, synthesizes architecture decisions, and generates comprehensive documentation for any SpecWeave project.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   User Command: /specweave:living-docs update            │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                ┌────────────────▼──────────────────┐
                │  LivingDocsOrchestrator           │
                │  - Change detection (Git diff)     │
                │  - Cache management                │
                │  - Parallel task execution         │
                │  - Progress reporting              │
                └────────────────┬──────────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
     ┌──────▼──────┐     ┌──────▼─────┐     ┌──────▼──────┐
     │ Repo        │     │ Pattern    │     │ Module      │
     │ Scanner     │     │ Analyzer   │     │ Graph       │
     │             │     │            │     │ Builder     │
     │ Phase 1:    │     │ Phase 2:   │     │ Phase 3:    │
     │ Discovery   │     │ Analysis   │     │ Synthesis   │
     └──────┬──────┘     └──────┬─────┘     └──────┬──────┘
            │                   │                   │
            └───────────────────┼───────────────────┘
                                │
                        ┌───────▼────────┐
                        │ LLM Synthesizer│
                        │ (Haiku + Opus) │
                        │                │
                        │ • ADR synthesis│
                        │ • Descriptions │
                        │ • Suggestions  │
                        └───────┬────────┘
                                │
                        ┌───────▼────────┐
                        │ Documentation  │
                        │ Writer         │
                        │                │
                        │ • ADRs         │
                        │ • Diagrams     │
                        │ • Reports      │
                        └────────────────┘
```

## Component Design

### 1. LivingDocsOrchestrator

**File**: `src/core/living-docs/orchestrator.ts`

**Purpose**: Main coordinator that manages the entire analysis pipeline.

**API**:
```typescript
class LivingDocsOrchestrator {
  constructor(projectRoot: string, options: OrchestratorOptions);

  // Main entry point
  async update(options: UpdateOptions): Promise<UpdateResult>;

  // Phase execution
  private async executePhase1Discovery(): Promise<DiscoveryResult>;
  private async executePhase2Analysis(): Promise<AnalysisResult>;
  private async executePhase3Synthesis(): Promise<SynthesisResult>;

  // Change detection
  private async detectChanges(): Promise<ChangedFiles[]>;

  // Cache management
  private async loadFromCache(key: string): Promise<any>;
  private async saveToCache(key: string, data: any): Promise<void>;
}

interface UpdateOptions {
  incremental?: boolean;  // Use Git diff for changes
  full?: boolean;         // Ignore cache, rebuild everything
  adrOnly?: boolean;      // Only run ADR discovery
  techDebtOnly?: boolean; // Only run tech debt analysis
  modulesOnly?: boolean;  // Only rebuild module graph
  dryRun?: boolean;       // Show what would be updated
}

interface UpdateResult {
  success: boolean;
  duration: number;
  phases: {
    discovery: PhaseResult;
    analysis: PhaseResult;
    synthesis: PhaseResult;
  };
  filesCreated: string[];
  filesUpdated: string[];
  errors: string[];
}
```

**Implementation Details**:
- Uses worker threads for parallel repo scanning (Node.js `worker_threads`)
- Progress reporting via events (`orchestrator.on('progress', callback)`)
- Graceful degradation if phase fails (log error, continue with partial results)
- Atomic operations (temp files + rename for all writes)

---

### 2. RepoScanner

**File**: `src/core/living-docs/scanner/repo-scanner.ts`

**Purpose**: Discovers and inventories all repositories in the project.

**API**:
```typescript
class RepoScanner {
  constructor(projectRoot: string);

  // Scan all repos (umbrella or single)
  async scanAll(): Promise<RepoInfo[]>;

  // Scan single repo
  async scanRepo(repoPath: string): Promise<RepoInfo>;

  // Detect repo type
  detectRepoType(repoPath: string): RepoType;

  // Extract tech stack
  async extractTechStack(repoPath: string): Promise<TechStack>;
}

interface RepoInfo {
  path: string;
  name: string;
  type: RepoType; // 'frontend' | 'backend' | 'mobile' | 'shared-lib' | 'infrastructure'
  techStack: TechStack;
  fileCount: number;
  lineCount: number;
  languages: LanguageStats[];
  lastCommit: string;
  branch: string;
}

interface TechStack {
  primary: string;      // 'typescript', 'go', 'python', etc.
  framework?: string;   // 'nextjs', 'gin', 'django', etc.
  database?: string;    // 'postgresql', 'mongodb', etc.
  orm?: string;         // 'prisma', 'gorm', 'sqlalchemy', etc.
  testing?: string;     // 'jest', 'vitest', 'pytest', etc.
}
```

**Detection Logic**:
```typescript
// Repo type detection
detectRepoType(repoPath: string): RepoType {
  // Check package.json for frontend indicators
  if (hasFile('package.json')) {
    const pkg = readJSON('package.json');
    if (pkg.dependencies['react'] || pkg.dependencies['vue']) {
      return 'frontend';
    }
    if (pkg.dependencies['express'] || pkg.dependencies['fastify']) {
      return 'backend';
    }
    if (pkg.dependencies['react-native'] || pkg.dependencies['expo']) {
      return 'mobile';
    }
  }

  // Check go.mod for backend
  if (hasFile('go.mod')) {
    return 'backend';
  }

  // Check terraform for infrastructure
  if (hasFiles('*.tf')) {
    return 'infrastructure';
  }

  // Check for shared library indicators
  if (hasFolder('types') || hasFolder('utils') || hasFolder('shared')) {
    return 'shared-lib';
  }

  return 'unknown';
}
```

---

### 3. PatternAnalyzer

**File**: `src/core/living-docs/analyzer/pattern-analyzer.ts`

**Purpose**: Detects code patterns and architectural decisions from the codebase.

**API**:
```typescript
class PatternAnalyzer {
  constructor(repos: RepoInfo[]);

  // Discover all patterns
  async analyzeAll(): Promise<AnalysisResult>;

  // Detect specific patterns
  async detectStateManagement(): Promise<Pattern[]>;
  async detectAPIStyle(): Promise<Pattern[]>;
  async detectAuthStrategy(): Promise<Pattern[]>;
  async detectDatabaseAccess(): Promise<Pattern[]>;
  async detectTestingApproach(): Promise<Pattern[]>;

  // Detect inconsistencies
  async detectInconsistencies(): Promise<Inconsistency[]>;
}

interface Pattern {
  category: 'state-management' | 'api-style' | 'auth' | 'database' | 'testing';
  name: string;           // 'Redux', 'REST', 'JWT', 'Prisma', 'Jest'
  confidence: number;     // 0-100 (percentage of codebase using this)
  evidence: Evidence[];   // Files that prove this pattern exists
  decision: string;       // Natural language decision text
}

interface Evidence {
  file: string;
  lineNumber?: number;
  snippet?: string;
  reason: string;  // Why this is evidence
}

interface Inconsistency {
  type: 'mixed-patterns' | 'outdated-deps' | 'code-duplication' | 'large-files';
  severity: 'P1' | 'P2' | 'P3';
  description: string;
  affectedFiles: string[];
  recommendation: string;
}
```

**Pattern Detection Examples**:

```typescript
// State Management Detection
async detectStateManagement(): Promise<Pattern[]> {
  const patterns: Pattern[] = [];

  // Detect Redux
  const reduxFiles = await glob('**/store/**/*.{ts,tsx,js,jsx}');
  const hasRedux = reduxFiles.length > 0 ||
                   await hasPackageDependency('redux');

  if (hasRedux) {
    const componentCount = await countFiles('**/*.{tsx,jsx}');
    const reduxUsage = await grepCount('useSelector|useDispatch', '**/*.{tsx,jsx}');
    const confidence = (reduxUsage / componentCount) * 100;

    patterns.push({
      category: 'state-management',
      name: 'Redux',
      confidence,
      evidence: [
        { file: 'src/store/configureStore.ts', reason: 'Redux store configuration' },
        { file: 'package.json', reason: 'Redux dependency' }
      ],
      decision: 'Use Redux for global state management'
    });
  }

  // Detect Context API
  const contextUsage = await grepCount('createContext|useContext', '**/*.{tsx,jsx}');
  if (contextUsage > 0) {
    patterns.push({
      category: 'state-management',
      name: 'Context API',
      confidence: (contextUsage / componentCount) * 100,
      evidence: [/* ... */],
      decision: 'Use Context API for theme/locale only'
    });
  }

  return patterns;
}
```

---

### 4. ADRSynthesizer

**File**: `src/core/living-docs/synthesizer/adr-synthesizer.ts`

**Purpose**: Uses LLM to synthesize architecture decision records from discovered patterns.

**API**:
```typescript
class ADRSynthesizer {
  constructor(llmClient: LLMClient);

  // Synthesize ADR from pattern
  async synthesize(pattern: Pattern, context: ProjectContext): Promise<ADR>;

  // Batch synthesis (parallel)
  async synthesizeAll(patterns: Pattern[]): Promise<ADR[]>;

  // Merge with existing ADRs
  async mergeWithExisting(newADRs: ADR[], existingADRs: ADR[]): Promise<ADR[]>;
}

interface ADR {
  number: number;       // Auto-incremented
  title: string;        // "Use Redux for State Management"
  status: 'Accepted' | 'Proposed' | 'Deprecated';
  date: string;         // ISO-8601
  context: string;      // Why this was needed
  decision: string;     // What was chosen
  alternatives: string; // What else was considered
  consequences: string; // Trade-offs
  relatedFiles: string[];
  discoveredBy: string; // "SpecWeave Living Docs Engine v0.34.0"
}
```

**LLM Prompt Template**:
```typescript
const synthesizeADRPrompt = (pattern: Pattern, context: ProjectContext) => `
You are analyzing a ${context.techStack} codebase to document an architecture decision.

Pattern Detected:
- Category: ${pattern.category}
- Name: ${pattern.name}
- Confidence: ${pattern.confidence}%

Evidence:
${pattern.evidence.map(e => `- ${e.file}: ${e.reason}`).join('\n')}

Project Context:
- Type: ${context.projectType}
- Size: ${context.fileCount} files, ${context.lineCount} lines
- Team Size: ${context.teamSize || 'Unknown'}

Task: Synthesize an Architecture Decision Record (ADR) following this template:

# Context
Explain WHY this architectural decision was likely made. Consider:
- What problem does it solve?
- What were the requirements or constraints?
- What was the state of the project when this was introduced?

# Decision
State the decision clearly: "Use ${pattern.name} for ${pattern.category}"

# Alternatives Considered
Based on industry best practices and the evidence, list alternatives that were likely considered but NOT chosen:
- Alternative 1: Why it wasn't chosen (infer from codebase patterns)
- Alternative 2: ...

# Consequences
Analyze the trade-offs:

Positive:
- Benefit 1 (inferred from how it's used in codebase)
- Benefit 2
- ...

Negative:
- Drawback 1 (visible in code complexity, boilerplate, etc.)
- Drawback 2
- ...

Output the ADR content in Markdown format.
`;
```

**Model Selection**:
- Use **Haiku** for pattern detection (fast, cheap, sufficient for structural analysis)
- Use **Opus** for ADR synthesis (deep reasoning, natural language quality)

---

### 5. ModuleGraphBuilder

**File**: `src/core/living-docs/graph/module-graph-builder.ts`

**Purpose**: Builds dependency graph by parsing import statements across all repos.

**API**:
```typescript
class ModuleGraphBuilder {
  constructor(repos: RepoInfo[]);

  // Build full dependency graph
  async buildGraph(): Promise<ModuleGraph>;

  // Detect circular dependencies
  detectCircularDependencies(graph: ModuleGraph): CircularDep[];

  // Calculate metrics
  calculateMetrics(graph: ModuleGraph): GraphMetrics;

  // Export to Mermaid diagram
  exportToMermaid(graph: ModuleGraph): string;

  // Export to interactive HTML
  exportToHTML(graph: ModuleGraph): string;
}

interface ModuleGraph {
  nodes: Module[];
  edges: Dependency[];
}

interface Module {
  id: string;           // 'frontend/components/Auth'
  name: string;         // 'Auth'
  path: string;         // Absolute path
  type: 'component' | 'service' | 'util' | 'config';
  repo: string;         // Which repo it belongs to
  exports: string[];    // Exported symbols
}

interface Dependency {
  from: string;         // Module ID
  to: string;           // Module ID
  type: 'import' | 'require' | 'dynamic';
  count: number;        // Number of import statements
}

interface CircularDep {
  cycle: string[];      // ['A', 'B', 'C', 'A']
  severity: 'warning' | 'error';
}

interface GraphMetrics {
  totalModules: number;
  totalDependencies: number;
  averageFanIn: number;   // Average number of modules depending on this module
  averageFanOut: number;  // Average number of dependencies per module
  cyclomaticComplexity: number;
  circularDependencies: number;
  mostDepended: Module[];  // Top 10 most-depended-on modules
  leastCoupled: Module[];  // Modules with fewest dependencies
}
```

**Import Parsing**:
```typescript
// TypeScript/JavaScript
const importRegex = /import\s+(?:[\w{},\s*]+\s+from\s+)?['"]([^'"]+)['"]/g;

// Go
const goImportRegex = /import\s+(?:\(\s*)?(?:[\w\s]+\s+)?["']([^"']+)["']/g;

// Python
const pythonImportRegex = /(?:from\s+([\w.]+)\s+)?import\s+([\w,\s]+)/g;
```

**Mermaid Diagram Generation**:
```typescript
exportToMermaid(graph: ModuleGraph): string {
  let mmd = 'graph TD\n';

  // Add nodes
  graph.nodes.forEach(node => {
    const label = `${node.name}\\n(${node.type})`;
    mmd += `  ${node.id}["${label}"]\n`;
  });

  // Add edges
  graph.edges.forEach(edge => {
    mmd += `  ${edge.from} --> ${edge.to}\n`;
  });

  // Highlight circular dependencies
  const circular = this.detectCircularDependencies(graph);
  circular.forEach(cycle => {
    mmd += `  style ${cycle.cycle.join(',')} fill:#ff6b6b\n`;
  });

  return mmd;
}
```

---

### 6. TechDebtDetector

**File**: `src/core/living-docs/analyzer/tech-debt-detector.ts`

**Purpose**: Identifies technical debt, code smells, and improvement opportunities.

**API**:
```typescript
class TechDebtDetector {
  constructor(repos: RepoInfo[]);

  // Detect all tech debt
  async detectAll(): Promise<TechDebtReport>;

  // Specific detectors
  async detectOutdatedDependencies(): Promise<DebtItem[]>;
  async detectLargeFiles(): Promise<DebtItem[]>;
  async detectHighComplexity(): Promise<DebtItem[]>;
  async detectCodeDuplication(): Promise<DebtItem[]>;
  async detectInconsistentPatterns(): Promise<DebtItem[]>;
}

interface TechDebtReport {
  summary: {
    totalIssues: number;
    bySeverity: { P1: number; P2: number; P3: number };
    byCategory: Record<string, number>;
  };
  issues: DebtItem[];
  estimatedEffort: string;  // "2 weeks" (sum of all items)
}

interface DebtItem {
  id: string;
  category: 'outdated-deps' | 'large-files' | 'high-complexity' | 'duplication' | 'inconsistency';
  severity: 'P1' | 'P2' | 'P3';
  title: string;
  description: string;
  affectedFiles: string[];
  impact: string;
  recommendation: string;
  estimatedEffort: string;  // "3 hours"
  autoFixable: boolean;
}
```

**Detection Algorithms**:

```typescript
// Large Files Detection
async detectLargeFiles(): Promise<DebtItem[]> {
  const threshold = 1000; // lines
  const largeFiles = await findFiles(file => countLines(file) > threshold);

  return largeFiles.map(file => ({
    id: `large-file-${hash(file)}`,
    category: 'large-files',
    severity: countLines(file) > 2000 ? 'P1' : 'P2',
    title: `Large file: ${basename(file)} (${countLines(file)} lines)`,
    description: `File exceeds ${threshold} lines, making it hard to maintain`,
    affectedFiles: [file],
    impact: 'Difficult to understand, test, and modify',
    recommendation: 'Refactor into smaller, focused modules',
    estimatedEffort: `${Math.ceil(countLines(file) / 500)} hours`,
    autoFixable: false
  }));
}

// High Complexity Detection
async detectHighComplexity(): Promise<DebtItem[]> {
  const threshold = 10;
  const complexFunctions = [];

  for (const file of await findFiles('**/*.{ts,js,go,py}')) {
    const ast = await parseAST(file);
    const functions = extractFunctions(ast);

    for (const fn of functions) {
      const complexity = calculateCyclomaticComplexity(fn);
      if (complexity > threshold) {
        complexFunctions.push({
          file,
          function: fn.name,
          line: fn.line,
          complexity
        });
      }
    }
  }

  return complexFunctions.map(fn => ({
    id: `high-complexity-${hash(fn.file + fn.function)}`,
    category: 'high-complexity',
    severity: fn.complexity > 15 ? 'P1' : 'P2',
    title: `High complexity: ${fn.function} (${fn.complexity})`,
    description: `Function has cyclomatic complexity of ${fn.complexity} (threshold: ${threshold})`,
    affectedFiles: [fn.file],
    impact: 'Hard to test, bug-prone, difficult to understand',
    recommendation: 'Refactor into smaller, simpler functions',
    estimatedEffort: '2-4 hours',
    autoFixable: false
  }));
}
```

---

## Data Flow

### Full Update Flow

```
1. User runs: /specweave:living-docs update

2. Orchestrator initializes:
   - Load config (.specweave/config.json)
   - Detect repos (umbrella.childRepos or single repo)
   - Check cache (last-update.json)

3. Phase 1: Discovery (parallel)
   - Scan each repo (file inventory, tech stack)
   - Cache: repo-scan-{repo}-{commit}.json

4. Phase 2: Analysis (parallel)
   - Pattern detection (state management, API style, etc.)
   - Tech debt detection (large files, complexity, etc.)
   - Module graph building (parse imports)
   - Cache: analysis-{commit}.json

5. Phase 3: Synthesis (LLM calls)
   - For each discovered pattern:
     - LLM synthesizes ADR (Opus for quality)
     - Cache: adr-{pattern-hash}.json
   - Generate module descriptions (Haiku for speed)

6. Phase 4: Documentation Writing
   - Write ADR files: .specweave/docs/internal/architecture/adr/XXXX-*.md
   - Write tech debt report: .specweave/docs/internal/technical-debt.md
   - Write module graph: .specweave/docs/internal/architecture/diagrams/module-dependencies.mmd
   - Write team structure: .specweave/docs/internal/team-structure.md
   - Generate HTML dashboard: .specweave/docs/internal/index.html

7. Update cache:
   - Save last-update.json with timestamp + commit hash

8. Output summary:
   - Files created: 47
   - Files updated: 12
   - ADRs synthesized: 8
   - Tech debt items: 23
   - Duration: 3m 45s
```

### Incremental Update Flow

```
1. User runs: /specweave:living-docs update --incremental

2. Detect changes:
   - Read last-update.json (last commit hash)
   - Run: git diff <last_commit> HEAD --name-only
   - Identify changed files

3. Selective re-analysis:
   - If package.json changed → Re-scan dependencies
   - If src/ changed → Re-run pattern detection for affected files
   - If imports changed → Rebuild module graph incrementally

4. Update only affected docs:
   - If new pattern detected → Synthesize new ADR
   - If pattern confidence changed → Update existing ADR
   - If module added/removed → Update module graph

5. Cache updates:
   - Invalidate cache for changed files only
   - Keep cached results for unchanged files

6. Output:
   - Files updated: 3
   - Duration: 18s
```

---

## Technology Choices

### Why LLM Synthesis (not rule-based)?

**Alternatives Considered**:
1. **Rule-Based Templates**
   - ❌ Requires maintaining rules for every pattern
   - ❌ Can't infer context or rationale
   - ❌ No natural language quality

2. **Manual Documentation**
   - ❌ Time-consuming, error-prone
   - ❌ Becomes stale quickly
   - ❌ Inconsistent quality

3. **LLM Synthesis** (chosen)
   - ✅ Infers context from code patterns
   - ✅ Generates natural language explanations
   - ✅ Adapts to any project without custom rules
   - ✅ Can suggest alternatives and trade-offs
   - ✅ Learns from existing ADRs (context)

### Why Caching (not always fresh)?

**Trade-offs**:
- **Without Cache**: Every update takes 5-10 minutes (LLM calls, file parsing)
- **With Cache**: Incremental updates in <30 seconds

**Cache Strategy**:
- Git commit hash as cache key (deterministic)
- 24-hour TTL (invalidate if stale)
- Manual `--full` flag to rebuild

### Why Parallel Scanning (not sequential)?

**Performance**:
- Sequential: 10 repos × 1 min each = 10 minutes
- Parallel (4 workers): 10 repos ÷ 4 = 2.5 minutes

**Implementation**: Node.js `worker_threads` for CPU-bound tasks

---

## Performance Considerations

### Optimization Strategies

1. **Parallel Repo Scanning**
   - Worker pool (4 workers)
   - Each worker scans 1 repo at a time
   - Results aggregated in main thread

2. **Incremental Analysis**
   - Git diff to detect changes
   - Only re-analyze changed files
   - Reuse cached results for unchanged files

3. **LLM Call Batching**
   - Batch similar patterns together
   - Single LLM call for multiple patterns (with JSON output)
   - Cache synthesis results (pattern hash as key)

4. **Lazy Module Graph**
   - Don't rebuild graph if imports unchanged
   - Incremental graph updates (add/remove nodes)

### Expected Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Full update (10 repos) | 3-5 min | Initial run, no cache |
| Incremental update | <30 sec | With cache, minor changes |
| ADR synthesis (1 pattern) | 3-5 sec | Opus call + caching |
| Module graph (500 modules) | 15-20 sec | Parse imports, build graph |
| Tech debt scan | 30-45 sec | File analysis, complexity |

---

## Deployment Plan

**Phase 1** (Week 1-2): Core Infrastructure
- LivingDocsOrchestrator
- RepoScanner
- Cache infrastructure
- CLI command

**Phase 2** (Week 2-3): Analysis Modules
- PatternAnalyzer
- TechDebtDetector
- ModuleGraphBuilder

**Phase 3** (Week 3): LLM Integration
- ADRSynthesizer
- LLM prompt engineering
- Result caching

**Phase 4** (Week 3-4): Polish
- HTML dashboard
- Interactive visualizations
- Hook integration
- Documentation

**Beta Release**: 4 developers, 1 week testing
**General Availability**: v0.34.0

---

## Monitoring & Observability

### Metrics to Track

- Update duration (by phase)
- Cache hit rate (should be >80%)
- LLM call count (minimize for cost)
- Analysis accuracy (manual review)
- User satisfaction (survey)

### Logging

**Log Levels**:
- DEBUG: Cache hits/misses, file scans
- INFO: Phase completion, ADR synthesis
- WARN: Pattern detection low confidence
- ERROR: LLM failures, file write errors

**Log Location**: `.specweave/logs/living-docs-update.log`

---

This architecture enables **intelligent, automated documentation** for any SpecWeave project with minimal configuration and maximum insight.
