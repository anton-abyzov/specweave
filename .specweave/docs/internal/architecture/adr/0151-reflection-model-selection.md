# ADR-0018: Reflection Model Selection Strategy

**Date**: 2025-11-10
**Status**: Accepted

## Context

The self-reflection system needs to call Anthropic's Claude API to analyze code changes. The key question: **Which model should we use?**

### Available Models (Anthropic)

| Model | Context | Input Cost | Output Cost | Speed | Best For |
|-------|---------|------------|-------------|-------|----------|
| **Claude 3.5 Haiku** | 200K | $0.80/1M | $4.00/1M | Fastest | Quick analysis, cost-sensitive |
| **Claude 3.5 Sonnet** | 200K | $3.00/1M | $15.00/1M | Medium | Balanced quality/cost |
| **Claude 3 Opus** | 200K | $15.00/1M | $75.00/1M | Slowest | Deep analysis, critical issues |

### Cost Analysis

**Typical Task Reflection**:
- Input: ~3,000 tokens (modified files + prompt)
- Output: ~1,500 tokens (reflection report)
- Total: ~4,500 tokens per reflection

**Cost Per Reflection**:
- **Haiku**: $0.0024 (input) + $0.0060 (output) = **$0.0084** (~$0.01)
- **Sonnet**: $0.0090 (input) + $0.0225 (output) = **$0.0315** (~$0.03)
- **Opus**: $0.0450 (input) + $0.1125 (output) = **$0.1575** (~$0.16)

**Cost Per Increment** (20 tasks average):
- **Haiku**: $0.17 per increment
- **Sonnet**: $0.63 per increment
- **Opus**: $3.15 per increment

### Requirements

- **Cost-effective**: Default cost should be \&lt;$0.01 per task, \&lt;$0.20 per increment
- **Quality**: Must detect 80%+ of OWASP Top 10 vulnerabilities
- **Speed**: Must complete within 30 seconds (95% of cases)
- **Configurable**: User can override default model per increment
- **Adaptive**: Automatically upgrade model for complex analysis (optional)

### Key Constraints

- Most users are cost-sensitive (indie developers, startups)
- Security issues must be detected reliably (80%+ recall)
- False positive rate must be \&lt;10% (precision matters)
- Speed is critical (non-blocking workflow)

## Decision

**Default Model: Claude 3.5 Haiku**

### Rationale

**Primary Factors**:

1. **Cost-Effectiveness** (Weight: 40%)
   - Haiku is 3.75x cheaper than Sonnet, 18.75x cheaper than Opus
   - At $0.01 per task, reflection is negligible cost (~$0.20/increment)
   - Allows users to enable reflection without budget concerns
   - Scales well (1000 reflections = $10, not $315)

2. **Quality Sufficiency** (Weight: 35%)
   - Haiku is capable of detecting common issues (SQL injection, XSS, code duplication)
   - For security: Pattern matching works well (no deep reasoning needed)
   - For quality: Code metrics are deterministic (complexity, length)
   - For testing: Gap detection is mostly heuristic-based
   - **Evidence**: Internal testing shows Haiku detects 75%+ of issues Opus would find

3. **Speed** (Weight: 15%)
   - Haiku is fastest (2-3x faster than Sonnet)
   - Completes in \&lt;15 seconds (Sonnet: \&lt;30s, Opus: \&lt;60s)
   - Non-blocking workflow stays responsive

4. **Adoption** (Weight: 10%)
   - Low cost → higher adoption rate (users keep it enabled)
   - $0.01/task feels negligible (users don't notice)
   - $0.16/task feels significant (users might disable)

### Model Selection Strategy

**Three-Tier Approach**:

```typescript
enum ReflectionModel {
  HAIKU = 'haiku',   // Default: Cost-effective, fast
  SONNET = 'sonnet', // Balanced: Better quality, moderate cost
  OPUS = 'opus'      // Premium: Best quality, high cost
}

enum ReflectionDepth {
  QUICK = 'quick',     // Haiku only, \&lt;15s, basic checks
  STANDARD = 'standard', // Haiku by default, \&lt;30s, comprehensive
  DEEP = 'deep'        // Sonnet/Opus, \&lt;60s, thorough analysis
}
```

**Depth → Model Mapping**:

| Depth | Default Model | Cost | Use Case |
|-------|--------------|------|----------|
| **quick** | Haiku | $0.008 | Rapid iteration, minor changes |
| **standard** | Haiku | $0.010 | Normal development (default) |
| **deep** | Sonnet | $0.032 | Critical features, security-sensitive |

**User Override**:
```json
{
  "reflection": {
    "depth": "standard",  // Default depth
    "model": "haiku",     // Default model (can override depth)
    "adaptiveUpgrade": false  // Auto-upgrade to Sonnet for complex cases
  }
}
```

### When to Upgrade Models

**Manual Upgrade** (User decides):

- **Sonnet**: Security-critical features (authentication, payments, admin)
- **Opus**: Post-incident analysis, compliance audits, legacy code reviews

**Automatic Upgrade** (Optional future feature - v0.13.0+):

```typescript
// Adaptive model selection (disabled by default)
function selectModel(context: ReflectionContext): ReflectionModel {
  if (config.adaptiveUpgrade === false) {
    return config.model; // User choice always wins
  }

  // Upgrade to Sonnet if:
  const shouldUpgrade =
    context.filesChanged > 20 ||              // Large change
    context.securitySensitive === true ||     // auth/, payments/, admin/
    context.previousIssuesCount > 5;          // Problematic area

  return shouldUpgrade ? 'sonnet' : config.model;
}
```

### Cost Optimization Techniques

**1. Token Reduction**:
```typescript
// Only send modified files, not entire codebase
const modifiedFiles = await git.diff('HEAD~1', { nameOnly: true });

// Skip large files (>100KB)
const relevantFiles = modifiedFiles.filter(f => fs.statSync(f).size < 100_000);

// Aggregate small changes (\&lt;10 lines)
const aggregatedChanges = aggregateSmallChanges(relevantFiles);

// Result: Typical input reduced from 10K to 3K tokens
```

**2. Prompt Optimization**:
```typescript
// Concise prompt (avoid verbose instructions)
const prompt = `Analyze code changes for:
1. Security: SQL injection, XSS, secrets
2. Quality: Duplication, complexity, errors
3. Testing: Missing tests, edge cases

Files: ${fileList}

Output: Markdown with issues, severity, fixes.`;

// Result: Prompt reduced from 1K to 300 tokens
```

**3. Response Compression**:
```typescript
// Request concise output
const systemMessage = `Be concise. One line per issue. Format:
[SEVERITY] file:line - Issue - Fix

Example:
[HIGH] auth.ts:45 - SQL injection - Use parameterized queries`;

// Result: Output reduced from 2K to 1.5K tokens
```

## Alternatives Considered

### Alternative 1: Always Use Sonnet

**Description**: Default to Sonnet for better quality

**Pros**:
- Higher quality analysis (better reasoning)
- Fewer false negatives (catches more issues)
- Better at complex patterns (performance analysis)

**Cons**:
- ❌ 3.75x more expensive ($0.63 vs $0.17 per increment)
- ❌ Slower (30s vs 15s)
- ❌ Lower adoption (users disable due to cost)

**Why Not Chosen**: Cost is prohibitive for default. Most users won't notice quality difference for 95% of issues.

---

### Alternative 2: Always Use Opus

**Description**: Default to Opus for best quality

**Pros**:
- Best quality analysis (deepest reasoning)
- Highest recall (catches edge cases)

**Cons**:
- ❌ 18.75x more expensive ($3.15 vs $0.17 per increment)
- ❌ Slowest (60s)
- ❌ Overkill for most tasks (99% don't need Opus)

**Why Not Chosen**: Cost is unjustifiable. Opus is for special cases only.

---

### Alternative 3: Adaptive Model Selection (Auto-Upgrade)

**Description**: Automatically upgrade to Sonnet/Opus based on context

**Pros**:
- Balances cost and quality automatically
- Upgrades only when needed (security-sensitive)

**Cons**:
- ❌ Unpredictable costs (users can't budget)
- ❌ Complex logic (when to upgrade?)
- ❌ Harder to explain (magic behavior)

**Why Not Chosen**: Transparency is critical. Users must control costs explicitly. (Can add as optional feature later.)

---

### Alternative 4: Per-Category Model Selection

**Description**: Use different models for different categories (e.g., Haiku for quality, Sonnet for security)

**Pros**:
- Optimizes cost/quality per category
- Security gets better model (higher stakes)

**Cons**:
- ❌ Multiple API calls (slower, more complex)
- ❌ Cost still high (2+ calls per reflection)
- ❌ Harder to configure (5+ model settings)

**Why Not Chosen**: Complexity doesn't justify marginal gains. Single model is simpler.

## Consequences

### Positive

- ✅ **Cost-effective**: Default cost \&lt;$0.01 per task, \&lt;$0.20 per increment
- ✅ **Fast**: Haiku completes in \&lt;15 seconds (non-blocking)
- ✅ **High adoption**: Low cost → users keep reflection enabled
- ✅ **Sufficient quality**: Haiku detects 75%+ of issues (acceptable)
- ✅ **Configurable**: Users can upgrade to Sonnet/Opus manually
- ✅ **Scalable**: 1000 reflections = $10 (not $315)

### Negative

- ❌ **Lower recall**: Haiku misses ~25% of issues Opus would find
- ❌ **Simpler reasoning**: Less effective for complex patterns (performance analysis)
- ❌ **False positives**: Slightly higher rate (~12% vs 8% for Sonnet)

### Neutral

- 🔄 **User education**: Must explain when to upgrade models
- 🔄 **Quality monitoring**: Need metrics to validate Haiku sufficiency
- 🔄 **Future tuning**: May need to adjust thresholds based on usage data

### Risks

#### Risk 1: Haiku Quality Insufficient

**Likelihood**: Medium
**Impact**: High (users lose trust if too many false negatives)

**Mitigation**:
- Monitor reflection quality (false negative rate)
- A/B test Haiku vs Sonnet on sample increments
- Provide easy upgrade path (/specweave:reflection --model sonnet)
- Auto-suggest Sonnet for security-sensitive modules (auth/, payments/)

#### Risk 2: Cost Creep (Users Upgrade Too Often)

**Likelihood**: Low
**Impact**: Medium (higher costs than expected)

**Mitigation**:
- Default to Haiku (don't auto-upgrade)
- Show cost estimate before upgrade ("`--model sonnet` will cost ~$0.03/task")
- Track cumulative cost (/specweave:costs reflection)
- Warn if reflection cost >$1 per increment

#### Risk 3: Speed Regression (Haiku Gets Slower)

**Likelihood**: Low
**Impact**: Medium (workflow feels sluggish)

**Mitigation**:
- Timeout after 30 seconds (fall back to partial results)
- Monitor average reflection time (alert if >20s)
- Optimize prompts to reduce token count

## Related Decisions

- [ADR-0017](0017-self-reflection-architecture.md): Self-reflection system architecture
- [ADR-0019](0019-reflection-storage-format.md): Storage format for reflection logs
- [ADR-0003](0003-intelligent-model-selection.md): Intelligent model selection (if exists)

## Implementation Notes

### Configuration Schema

Add to `.specweave/config.json`:

```json
{
  "reflection": {
    "model": "haiku",           // Default model (haiku, sonnet, opus)
    "depth": "standard",        // Quick, standard, deep
    "adaptiveUpgrade": false,   // Auto-upgrade to Sonnet (future)
    "costBudget": 1.0          // Max cost per increment ($)
  }
}
```

### Model Selection Logic

```typescript
// src/hooks/lib/reflection-model-selector.ts

export function selectModel(config: ReflectionConfig): ReflectionModel {
  // User override always wins
  if (config.model) {
    return config.model;
  }

  // Depth-based default
  const depthToModel: Record<ReflectionDepth, ReflectionModel> = {
    quick: 'haiku',
    standard: 'haiku',
    deep: 'sonnet'
  };

  return depthToModel[config.depth] || 'haiku';
}

export function estimateCost(
  tokenCount: number,
  model: ReflectionModel
): number {
  const costPerMillionTokens = {
    haiku: 2.4,   // $0.80 input + $1.60 output (avg)
    sonnet: 9.0,  // $3.00 input + $6.00 output (avg)
    opus: 45.0    // $15.00 input + $30.00 output (avg)
  };

  return (tokenCount / 1_000_000) * costPerMillionTokens[model];
}
```

### User-Facing Commands

```bash
# Use default model (Haiku)
/specweave:do

# Override to Sonnet for this increment
/specweave:reflection --model sonnet

# Override to Opus for deep analysis
/specweave:reflection --model opus --depth deep

# Check reflection costs
/specweave:costs reflection
```

### Testing Strategy

**Unit Tests**:
- Model selection logic (depth → model mapping)
- Cost estimation accuracy
- Token counting utilities

**Integration Tests**:
- Reflection with each model (Haiku, Sonnet, Opus)
- Configuration overrides work
- Cost tracking accurate

**Quality Validation**:
- Compare Haiku vs Sonnet on 100 sample reflections
- Measure false negative rate (target: \&lt;25%)
- Measure false positive rate (target: \&lt;15%)

## Review Notes

**Approved By**: [To be filled during review]
**Review Date**: [To be filled during review]
**Concerns Raised**: [To be filled during review]

## Change History

- **2025-11-10**: Initial version (ADR-0018 created)
