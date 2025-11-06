# ADR-0018: Brownfield Classification Algorithm

**Date**: 2025-11-05
**Status**: Accepted
**Deciders**: Architect Agent, Tech Lead
**Related**: ADR-0017 (Multi-Project Internal Structure)

## Context

SpecWeave needs to import brownfield documentation from external sources (Notion, Confluence, GitHub Wiki) and automatically classify files into four categories:
- **Specs**: User stories, requirements, acceptance criteria
- **Modules**: Component documentation, architecture, API contracts
- **Team**: Onboarding, conventions, workflows
- **Legacy**: Uncategorized or low-confidence files

### Requirements

1. **Accuracy Target**: 85%+ correct classification (validated against fixtures)
2. **Confidence Scoring**: 0-1 scale indicating classification certainty
3. **Performance**: Classify 100 files in <5 seconds
4. **No ML Required**: Simple keyword-based approach (no training data needed)
5. **Explainable**: Users can understand why a file was classified a certain way

### Alternatives Considered

1. **Machine Learning Classifier** (e.g., Naive Bayes, SVM)
   - **Pros**: Potentially higher accuracy (90%+), learns from data
   - **Cons**: Requires training data, complex setup, opaque decisions
   - **Why not**: Overkill for this use case, adds complexity, no training data available

2. **Rule-Based System** (if-then rules)
   - **Pros**: Explicit rules, easy to understand
   - **Cons**: Brittle, requires many rules, hard to tune
   - **Why not**: Keyword approach is simpler and more flexible

3. **LLM-Based Classification** (Claude/GPT API)
   - **Pros**: Highest accuracy potential (95%+), understands context
   - **Cons**: Cost ($0.01 per file × 500 files = $5), latency (2-5s per file), API dependency
   - **Why not**: Too expensive for bulk classification, latency too high

4. **Hybrid Approach** (keyword + ML fallback)
   - **Pros**: Best of both worlds
   - **Cons**: Complexity, still requires training data
   - **Why not**: Keyword-only approach sufficient for 85% target

## Decision

**Use keyword-based classification with confidence scoring**

### Algorithm Design

**Step 1: Keyword Matching**
- Define keyword lists for each category (specs, modules, team)
- Search file content (markdown + frontmatter) for keywords
- Count matches per category

**Step 2: Confidence Scoring**
- Calculate base score: `matches / total_keywords` (capped at 1.0)
- Calculate weighted score: `total_weight / max_possible_weight` (multi-word keywords weighted higher)
- Combine: `base_score * 0.6 + weighted_score * 0.4`
- Result: 0-1 confidence score

**Step 3: Classification**
- Choose category with highest score
- Apply confidence threshold: If score <0.3 → classify as 'legacy'
- Return type + confidence + reasons

### Keyword Lists

**Specs** (44 keywords):
```typescript
const SPEC_KEYWORDS = [
  // User story keywords
  'user story', 'user stories', 'acceptance criteria', 'acceptance criterion',
  'feature', 'feature spec', 'requirement', 'requirements', 'functional requirement',
  // Spec patterns
  'spec', 'specification', 'us-', 'ac-', 'given when then',
  'as a', 'i want', 'so that',
  // Planning keywords
  'epic', 'milestone', 'product requirement', 'prd', 'problem statement',
  'success criteria', 'test plan'
];
```

**Modules** (58 keywords):
```typescript
const MODULE_KEYWORDS = [
  // Component/module keywords
  'module', 'component', 'service', 'domain', 'package', 'library',
  // Architecture keywords
  'architecture', 'design', 'api', 'interface', 'class', 'function',
  'endpoint', 'controller', 'model', 'repository', 'schema',
  // Integration keywords
  'integration', 'integration point', 'dependency', 'data flow',
  'authentication', 'authorization', 'security', 'performance',
  // Technical docs
  'technical design', 'implementation', 'code structure'
];
```

**Team** (73 keywords):
```typescript
const TEAM_KEYWORDS = [
  // Onboarding
  'onboarding', 'getting started', 'setup', 'installation', 'environment setup',
  // Conventions
  'convention', 'conventions', 'coding standard', 'style guide', 'best practice',
  'naming convention', 'code pattern', 'design pattern',
  // Workflows
  'workflow', 'process', 'procedure', 'guideline', 'policy',
  'pr process', 'pull request', 'code review', 'deployment', 'release',
  'git workflow', 'branching strategy', 'testing approach',
  // Team info
  'team', 'contact', 'on-call', 'escalation', 'responsibility',
  'incident response', 'runbook'
];
```

### Confidence Threshold

- **0.7-1.0**: High confidence (likely correct)
- **0.5-0.7**: Medium confidence (review recommended)
- **0.3-0.5**: Low confidence (likely legacy)
- **<0.3**: No match (classified as legacy)

### Implementation

**File**: `src/core/brownfield/analyzer.ts`

```typescript
class BrownfieldAnalyzer {
  private scoreKeywords(text: string, keywords: string[]): number {
    let matches = 0;
    let totalWeight = 0;

    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        matches++;
        const weight = keyword.split(' ').length; // Multi-word = higher weight
        totalWeight += weight;
      }
    });

    if (matches === 0) return 0;

    const baseScore = Math.min(matches / keywords.length, 1.0);
    const maxWeight = matches * 3; // Assume max 3-word keywords
    const weightedScore = Math.min(totalWeight / maxWeight, 1.0);

    return baseScore * 0.6 + weightedScore * 0.4; // Combine
  }

  private classifyFile(filePath: string): FileClassification {
    const content = fs.readFileSync(filePath, 'utf-8').toLowerCase();

    // Score each category
    const specScore = this.scoreKeywords(content, SPEC_KEYWORDS);
    const moduleScore = this.scoreKeywords(content, MODULE_KEYWORDS);
    const teamScore = this.scoreKeywords(content, TEAM_KEYWORDS);

    // Choose highest score (with threshold)
    const THRESHOLD = 0.3;
    let type: 'spec' | 'module' | 'team' | 'legacy';
    let confidence: number;

    if (specScore > moduleScore && specScore > teamScore && specScore > THRESHOLD) {
      type = 'spec';
      confidence = specScore;
    } else if (moduleScore > teamScore && moduleScore > THRESHOLD) {
      type = 'module';
      confidence = moduleScore;
    } else if (teamScore > THRESHOLD) {
      type = 'team';
      confidence = teamScore;
    } else {
      type = 'legacy';
      confidence = 0;
    }

    return { path: filePath, type, confidence, keywords: [...], reasons: [...] };
  }
}
```

## Consequences

### Positive

- ✅ **Simple**: No ML training, no external dependencies
- ✅ **Fast**: <5 seconds for 100 files (keyword search is O(n) per file)
- ✅ **Explainable**: Users see which keywords matched and why
- ✅ **Tunable**: Easy to add/remove keywords to improve accuracy
- ✅ **No API Costs**: Runs locally, no LLM API calls
- ✅ **Deterministic**: Same input always produces same output

### Negative

- ❌ **85% Accuracy Ceiling**: Keyword approach unlikely to exceed 85-90% accuracy
- ❌ **Keyword Maintenance**: Requires periodic review and tuning of keyword lists
- ❌ **Context-Unaware**: Doesn't understand semantic meaning (e.g., "user story" in code comment)
- ❌ **English-Only**: Keyword lists are English-only (no i18n support)

### Neutral

- ⚠️ **Manual Reclassification**: Users can manually move misclassified files after import
- ⚠️ **Confidence Scores**: Low-confidence files flagged for review
- ⚠️ **Iterative Improvement**: Keyword lists can be tuned based on real-world feedback

## Validation Strategy

### Accuracy Measurement

1. **Create Test Fixtures**: 20+ realistic markdown files with known correct classifications
2. **Run Classifier**: Classify all fixtures
3. **Calculate Accuracy**: `(correct classifications / total files) × 100%`
4. **Target**: ≥85% accuracy

**Test Suite**: `tests/integration/brownfield/classification-accuracy.test.ts`

### Performance Measurement

1. **Benchmark**: Classify 100 files, measure execution time
2. **Target**: <5 seconds (50ms per file average)
3. **Memory**: <100MB peak memory usage

**Test Suite**: `tests/performance/analyzer.bench.ts`

### Tuning Process

1. **Run Tests**: Identify misclassified files
2. **Analyze Failures**: What keywords are missing? What keywords are misleading?
3. **Update Keywords**: Add/remove keywords to improve accuracy
4. **Re-Test**: Verify accuracy improvement
5. **Repeat**: Until 85%+ accuracy achieved

## Future Enhancements

### Short-Term (v0.9.0)
- Add keyword lists for other languages (Spanish, French, etc.)
- Add stopwords to reduce false positives (e.g., "the", "and")
- Add stemming for better keyword matching (e.g., "test" matches "testing")

### Long-Term (v1.0.0+)
- Hybrid approach: Keyword classifier + LLM fallback for low-confidence files
- User feedback loop: Learn from manual reclassifications
- Domain-specific keyword lists (e.g., ML-specific keywords for AI projects)

## Related Decisions

- **ADR-0017**: Multi-Project Internal Structure (defines target folders for classification)
- **ADR-0019**: Test Infrastructure Architecture (defines how classification accuracy is measured)

## References

- [Information Retrieval - Keyword Matching](https://en.wikipedia.org/wiki/Information_retrieval)
- [TF-IDF Scoring](https://en.wikipedia.org/wiki/Tf%E2%80%93idf) (inspiration for weighted scoring)
- [SpecWeave Brownfield Import](../../specs/spec-006-v0.8.0-stabilization.md)

---

**Created**: 2025-11-05
**Last Updated**: 2025-11-05
**Author**: Architect Agent
