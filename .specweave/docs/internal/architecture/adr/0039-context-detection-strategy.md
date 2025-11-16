# ADR-0039: Context Detection Strategy (Pet Project vs Startup vs Enterprise)

**Date**: 2025-11-16
**Status**: Accepted

## Context

SpecWeave's serverless recommendations must adapt to project context. A pet project needs free tier guidance, a startup needs cost optimization, and an enterprise needs compliance/security.

**Problem**: How do we automatically detect project context without asking tedious questions?

**User Scenarios**:
1. **Pet Project Developer (Alex)**: "I'm building a weather app to learn AWS Lambda. I don't want to pay anything."
2. **Startup CTO (Sarah)**: "We have $100K in AWS credits. We need to scale from 0 to 10K users in 6 months."
3. **Enterprise Architect (Mike)**: "We need SOC 2 compliance for our serverless migration. Security is critical."

**Key Challenge**: Context signals are often implicit. Users rarely say "I'm building a pet project." They say "I'm learning AWS Lambda."

## Decision

Use **multi-signal context detection** with fallback to clarifying questions.

**Context Categories**:
```typescript
type ProjectContext = 'pet-project' | 'startup' | 'enterprise';

interface ContextAnalysis {
  context: ProjectContext;
  confidence: 'high' | 'medium' | 'low';
  signals: string[];  // Why we classified this way
  clarifyingQuestions?: string[];  // Ask if confidence is low
}
```

**Detection Algorithm** (Heuristic-Based):

### Signal 1: User Input Keywords
```typescript
const signals = {
  petProject: [
    'learning', 'learn', 'personal', 'side project', 'portfolio',
    'pet project', 'hobby', 'experimenting', 'tutorial', 'free tier',
    'minimal cost', 'no budget'
  ],
  startup: [
    'MVP', 'minimum viable product', 'early stage', 'startup',
    'small team', 'launch', 'scale', 'grow', 'runway',
    'startup credits', 'AWS Activate', 'bootstrapped'
  ],
  enterprise: [
    'production', 'large scale', 'compliance', 'SOC 2', 'HIPAA',
    'PCI-DSS', 'GDPR', 'enterprise', 'corporate', 'SLA',
    'mission critical', 'high availability', 'multi-region'
  ]
};

function detectFromKeywords(userInput: string): ProjectContext | null {
  const input = userInput.toLowerCase();

  const petScore = signals.petProject.filter(s => input.includes(s)).length;
  const startupScore = signals.startup.filter(s => input.includes(s)).length;
  const enterpriseScore = signals.enterprise.filter(s => input.includes(s)).length;

  const max = Math.max(petScore, startupScore, enterpriseScore);
  if (max === 0) return null;  // No clear signal

  if (petScore === max) return 'pet-project';
  if (startupScore === max) return 'startup';
  return 'enterprise';
}
```

### Signal 2: Project Metadata (if available)
```typescript
function detectFromMetadata(project: {
  teamSize?: number;
  expectedTraffic?: string;
  budget?: string;
}): ProjectContext | null {
  // Team size heuristic
  if (project.teamSize === 1) return 'pet-project';
  if (project.teamSize >= 2 && project.teamSize <= 10) return 'startup';
  if (project.teamSize > 10) return 'enterprise';

  // Traffic heuristic
  if (project.expectedTraffic?.includes('low')) return 'pet-project';
  if (project.expectedTraffic?.includes('medium')) return 'startup';
  if (project.expectedTraffic?.includes('high')) return 'enterprise';

  // Budget heuristic
  if (project.budget?.includes('free tier')) return 'pet-project';
  if (project.budget?.includes('startup credits')) return 'startup';
  if (project.budget?.includes('managed budget')) return 'enterprise';

  return null;  // No clear signal
}
```

### Signal 3: Codebase Analysis (if exists)
```typescript
function detectFromCodebase(codebasePath: string): ProjectContext | null {
  const packageJson = readPackageJson(codebasePath);

  // Dependency count heuristic (rough proxy for complexity)
  const depCount = Object.keys(packageJson.dependencies || {}).length;
  if (depCount < 5) return 'pet-project';
  if (depCount >= 5 && depCount <= 20) return 'startup';
  if (depCount > 20) return 'enterprise';

  // Security/compliance packages (enterprise signal)
  const enterpriseDeps = ['helmet', 'express-rate-limit', 'winston', 'datadog'];
  const hasEnterpriseDeps = enterpriseDeps.some(dep =>
    packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]
  );
  if (hasEnterpriseDeps) return 'enterprise';

  return null;
}
```

### Combined Detection with Confidence Scoring
```typescript
function detectContext(
  userInput: string,
  metadata?: ProjectMetadata,
  codebasePath?: string
): ContextAnalysis {
  const signals: string[] = [];
  const votes: Record<ProjectContext, number> = {
    'pet-project': 0,
    'startup': 0,
    'enterprise': 0
  };

  // Signal 1: Keywords
  const keywordContext = detectFromKeywords(userInput);
  if (keywordContext) {
    votes[keywordContext] += 3;  // High weight
    signals.push(`Keyword signal: ${keywordContext}`);
  }

  // Signal 2: Metadata
  const metadataContext = metadata ? detectFromMetadata(metadata) : null;
  if (metadataContext) {
    votes[metadataContext] += 2;  // Medium weight
    signals.push(`Metadata signal: ${metadataContext}`);
  }

  // Signal 3: Codebase
  const codebaseContext = codebasePath ? detectFromCodebase(codebasePath) : null;
  if (codebaseContext) {
    votes[codebaseContext] += 1;  // Low weight (may be misleading)
    signals.push(`Codebase signal: ${codebaseContext}`);
  }

  // Calculate winner
  const maxVotes = Math.max(...Object.values(votes));
  const context = Object.entries(votes).find(([_, v]) => v === maxVotes)?.[0] as ProjectContext;

  // Calculate confidence
  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
  const confidence =
    maxVotes >= 4 ? 'high' :     // Multiple strong signals
    maxVotes >= 2 ? 'medium' :   // One strong signal or two weak
    'low';                       // One weak signal or none

  // Generate clarifying questions if confidence is low
  const clarifyingQuestions = confidence === 'low' ? [
    "Is this a personal learning project, a startup MVP, or an enterprise production system?",
    "What's your team size? (1, 2-10, or 10+)",
    "What's your expected traffic? (< 1K requests/day, 1K-100K, or > 100K)"
  ] : undefined;

  return { context, confidence, signals, clarifyingQuestions };
}
```

**Usage in Architect Agent**:
```markdown
## Context Detection (Auto-Activation)

When user asks about serverless or deployment:

1. **Analyze User Input**: Run context detection algorithm
2. **Display Analysis** (transparent):
   ```
   📊 Detected Context: Pet Project (confidence: high)
   Signals:
     • Keyword signal: pet-project ("learning", "free tier")
     • Team size: 1 developer
   ```

3. **Ask Clarifying Questions** (if confidence is low):
   ```
   I notice you're exploring serverless. To give better recommendations:
   • Is this a personal learning project, a startup MVP, or enterprise production?
   • What's your budget? (Free tier, startup credits, managed budget)
   • Expected traffic? (Low, medium, high)
   ```

4. **Proceed with Recommendation**: Use context to tailor advice
```

## Alternatives Considered

### Alternative 1: Always Ask Explicit Questions
**Example**: "What type of project is this? (pet project / startup / enterprise)"

**Pros**: 100% accurate, no guessing
**Cons**: Tedious for users, interrupts flow, most users provide implicit signals

**Why rejected**: Poor UX. Users want fast answers, not interrogation.

### Alternative 2: Default to Enterprise (Conservative)
**Pros**: Safe (never under-recommend security)
**Cons**: Overkill for pet projects (recommends expensive, complex solutions)

**Why rejected**: Violates user needs. Pet project developers don't need SOC 2 compliance.

### Alternative 3: ML-Based Classification (NLP Model)
**Example**: Train classifier on user input → context label

**Pros**: Potentially more accurate than heuristics
**Cons**: Requires training data, model drift, adds dependency (TensorFlow.js), slower (50-100ms)

**Why rejected**: Over-engineering. Heuristics work well for this problem (keywords are clear signals).

### Alternative 4: Always Default to Pet Project
**Pros**: Simplest implementation
**Cons**: Wrong for 50% of users (startups, enterprises)

**Why rejected**: Fails to serve key user segments.

## Consequences

### Positive
- **Fast Recommendations**: No interruption if confidence is high (70%+ of cases)
- **Transparent**: Users see why we classified them (builds trust)
- **Adaptive**: Falls back to questions if ambiguous
- **Extensible**: Easy to add new signals (e.g., CI/CD config, security tools)

### Negative
- **False Positives**: May misclassify (e.g., startup mentions "learning" → classified as pet project)
- **Maintenance**: Keyword lists need updates as language evolves
- **Edge Cases**: Hybrid projects (pet project → startup) may confuse algorithm

### Neutral
- **Confidence Scores**: Users may question "medium confidence" (but transparency helps)
- **Clarifying Questions**: Some users may find them annoying (but better than wrong recommendation)

## Risks and Mitigations

### Risk 1: Misclassification Leads to Bad Recommendations
**Example**: Startup classified as pet project → recommended free tier (won't scale)

**Impact**: User trust erodes, project fails to scale
**Probability**: Medium (10-20% of cases)
**Mitigation**:
- Always show confidence score (users can correct)
- Allow manual override: "Actually, this is a startup MVP"
- Include caveat in recommendation: "If you expect higher traffic, consider..."

### Risk 2: Keyword Overlap (Ambiguous Signals)
**Example**: User says "I'm learning to build an enterprise-grade app"

**Impact**: Algorithm sees both "learning" (pet project) and "enterprise" (enterprise)
**Probability**: Low (5-10% of cases)
**Mitigation**:
- Use weighted voting (keyword context gets higher weight than codebase)
- Fall back to clarifying questions if votes are tied

### Risk 3: Users Don't Answer Clarifying Questions
**Impact**: Low confidence persists, recommendation quality suffers
**Probability**: Medium (20-30% of users may ignore questions)
**Mitigation**:
- Default to pet project if no answer (conservative, safe choice)
- Provide recommendation anyway with caveat: "Based on limited info, I'm assuming pet project..."

## Implementation Notes

**File Location**: `src/core/serverless/context-detector.ts`

**Unit Tests** (Critical):
```typescript
describe('Context Detection', () => {
  it('detects pet project from keywords', () => {
    const result = detectContext("I'm learning AWS Lambda for a side project");
    expect(result.context).toBe('pet-project');
    expect(result.confidence).toBe('high');
  });

  it('detects startup from team size', () => {
    const result = detectContext("Building an MVP", { teamSize: 5 });
    expect(result.context).toBe('startup');
  });

  it('detects enterprise from compliance keywords', () => {
    const result = detectContext("We need SOC 2 compliance");
    expect(result.context).toBe('enterprise');
    expect(result.confidence).toBe('high');
  });

  it('generates clarifying questions for ambiguous input', () => {
    const result = detectContext("I want to deploy serverless");
    expect(result.confidence).toBe('low');
    expect(result.clarifyingQuestions).toBeDefined();
  });
});
```

**Edge Cases to Handle**:
- User says "I'm learning... but this will be production" → Ask clarifying question
- User says "pet project" but has 20+ dependencies → Flag mismatch, ask question
- User says nothing about context → Default to pet project (safest assumption)

## Related Decisions
- ADR-0038: Serverless Platform Knowledge Base (provides data for recommendations)
- ADR-0041: Cost Estimation Algorithm (uses context for cost projections)
- ADR-0042: Agent Enhancement Pattern (architect agent uses context detection)

## References
- User Research: Pet project vs startup vs enterprise pain points (FS-038 FEATURE.md)
- User Personas: Alex (pet), Sarah (startup), Mike (enterprise) - strategy/overview.md
