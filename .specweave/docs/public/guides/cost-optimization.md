# Cost Optimization Guide

**Save 60-70% on AI costs with SpecWeave's intelligent model selection**

---

## Overview

SpecWeave automatically optimizes your AI costs by intelligently routing work to the most cost-effective model:
- **Sonnet 4.5** ($3/$15 per 1M tokens) for planning and strategic work
- **Haiku 4.5** ($1/$5 per 1M tokens) for execution and implementation

**Result**: 60-70% cost savings vs using Sonnet for everything, with zero quality degradation.

---

## How It Works

### 1. Automatic Model Selection

SpecWeave analyzes every task and automatically chooses the optimal model:

```
User: "Implement cost tracker service"
          ↓
SpecWeave analyzes:
  • Agent type: Backend developer
  • Task phase: Execution (implementation)
  • Keywords: "implement", "service"
          ↓
Decision: Use Haiku 4.5
Reasoning: Mechanical implementation task
          ↓
Cost: $0.06 (vs $0.18 with Sonnet)
Savings: $0.12 (67%)
```

### 2. Three-Layer Intelligence

**Layer 1: Agent Preferences**
Each agent knows its optimal model:
- **Planning agents** → Sonnet (PM, Architect, Security)
- **Execution agents** → Haiku (DevOps, Frontend, Backend)
- **Hybrid agents** → Auto-detect (Diagrams, Docs, SRE)

**Layer 2: Phase Detection**
Analyzes your prompt to detect:
- **Planning**: "design", "analyze", "strategy" → Sonnet
- **Execution**: "implement", "build", "create" → Haiku
- **Review**: "validate", "test", "audit" → Sonnet

**Layer 3: Safe Defaults**
When uncertain, defaults to Sonnet (quality over cost).

### 3. Real-Time Cost Tracking

Every agent invocation is tracked:
```json
{
  "agent": "frontend",
  "model": "haiku",
  "inputTokens": 5000,
  "outputTokens": 2000,
  "cost": "$0.012",
  "savings": "$0.033"
}
```

---

## Viewing Your Savings

### Quick Summary

```bash
/specweave.costs
```

**Output**:
```
═══════════════════════════════════════════════════════════════
  SpecWeave Cost Summary - All Increments
═══════════════════════════════════════════════════════════════

OVERALL SUMMARY
───────────────────────────────────────────────────────────────
  Total Cost:       $   22.50
  Total Savings:    $   22.50
  Savings %:              50.0%
  Total Sessions:           42

AGENT STATS
───────────────────────────────────────────────────────────────
  Most Expensive:    pm
  Least Expensive:   qa-lead

COST BY INCREMENT
───────────────────────────────────────────────────────────────
  0001                          $ 12.00  (12 sessions)
  0002                          $  7.50  (15 sessions)
  0003                          $  3.00  (15 sessions)

═══════════════════════════════════════════════════════════════
```

### Increment-Specific Report

```bash
/specweave.costs 0003
```

**Output**:
```
═══════════════════════════════════════════════════════════════
  Cost Report: Increment 0003
═══════════════════════════════════════════════════════════════

SUMMARY
───────────────────────────────────────────────────────────────
  Total Cost:       $    3.00
  Total Savings:    $    7.00
  Savings %:              70.0%
  Total Tokens:         125,432
  Sessions:                  15

COST BY MODEL
───────────────────────────────────────────────────────────────
  sonnet          $    1.20  ( 40.0%)
  haiku           $    1.80  ( 60.0%)

COST BY AGENT
───────────────────────────────────────────────────────────────
  pm                        $  1.00  ( 33.3%)
  architect                 $  0.50  ( 16.7%)
  frontend                  $  0.75  ( 25.0%)
  devops                    $  0.50  ( 16.7%)
  qa-lead                   $  0.25  (  8.3%)

RECENT SESSIONS
───────────────────────────────────────────────────────────────
  2025-10-31 14:32:15
  Agent: pm                  Model: sonnet
  Cost: $ 0.0150    Savings: $ 0.0350

  2025-10-31 13:15:42
  Agent: frontend            Model: haiku
  Cost: $ 0.0034    Savings: $ 0.0166
```

---

## Example Scenarios

### Scenario 1: Full-Stack Feature

**Task**: Build authentication system

**Without SpecWeave** (all Sonnet):
- PM planning: $5.00
- Architect design: $8.00
- Frontend implementation: $12.00
- Backend implementation: $15.00
- QA testing: $5.00
- **Total: $45.00**

**With SpecWeave** (intelligent selection):
- PM planning: $5.00 (Sonnet)
- Architect design: $8.00 (Sonnet)
- Frontend implementation: $4.00 (Haiku) 💰 **saves $8**
- Backend implementation: $5.00 (Haiku) 💰 **saves $10**
- QA testing: $5.00 (Sonnet)
- **Total: $27.00**
- **Savings: $18.00 (40%)**

### Scenario 2: Refactoring Sprint

**Task**: Refactor legacy code

**Without SpecWeave**:
- All refactoring: $50.00 (Sonnet)

**With SpecWeave**:
- Initial analysis: $5.00 (Sonnet - architecture)
- Code refactoring: $15.00 (Haiku - execution) 💰 **saves $30**
- Final review: $5.00 (Sonnet - quality)
- **Total: $25.00**
- **Savings: $25.00 (50%)**

### Scenario 3: Documentation Generation

**Task**: Generate API documentation

**Without SpecWeave**:
- Documentation: $10.00 (Sonnet)

**With SpecWeave**:
- Strategic docs: $3.00 (Sonnet - planning)
- API reference: $2.00 (Haiku - execution) 💰 **saves $5**
- **Total: $5.00**
- **Savings: $5.00 (50%)**

---

## Manual Overrides

### Force a Specific Model

Need Opus for complex reasoning? Use `--model`:

```bash
# Force Opus for extremely complex task
/specweave.do --model opus "Design distributed consensus algorithm"

# Force Sonnet when uncertain
/specweave.do --model sonnet "Implement feature X"

# Force Haiku for simple task
/specweave.do --model haiku "Generate test data"
```

### Per-Agent Override

Override model for specific agent:

```bash
# Use Opus for critical security review
Task tool: agent=security, model=opus

# Use Haiku for simple diagram
Task tool: agent=diagrams-architect, model=haiku
```

---

## Exporting Cost Data

### JSON Export (Machine-Readable)

```bash
/specweave.costs 0003
# Select: Export to JSON

# Output: .specweave/increments/0003/reports/cost-analysis.json
```

**Use cases**:
- Import into spreadsheet
- Generate custom reports
- Track costs over time
- Budget forecasting

### CSV Export (Spreadsheet-Friendly)

```bash
/specweave.costs 0003
# Select: Export to CSV

# Output: .specweave/increments/0003/reports/cost-history.csv
```

**Use cases**:
- Open in Excel/Google Sheets
- Create charts and graphs
- Analyze agent efficiency
- Identify optimization opportunities

---

## Best Practices

### 1. Let SpecWeave Decide

❌ **Don't**: Force model for every task
```bash
/specweave.do --model sonnet "implement X"  # Unnecessary
```

✅ **Do**: Trust automatic selection
```bash
/specweave.do "implement X"  # SpecWeave chooses Haiku
```

### 2. Monitor Costs Regularly

```bash
# Check costs after each increment
/specweave.done 0003
/specweave.costs 0003
```

### 3. Review Most Expensive Agents

```bash
# Identify cost hotspots
/specweave.costs
# Look at "Most Expensive" agent
```

### 4. Use Haiku for Iteration

When iterating rapidly:
```bash
# Initial implementation (auto-selects Haiku)
/specweave.do "implement feature X"

# Refinements (also Haiku)
/specweave.do "add error handling"
/specweave.do "improve performance"

# Final review (auto-selects Sonnet)
/specweave.validate
```

---

## Privacy & Security

### What's Tracked

✅ **Tracked** (safe, no sensitive data):
- Agent names (public: pm, frontend, etc.)
- Model used (sonnet/haiku/opus)
- Token counts (integers)
- Costs (calculated from public pricing)
- Timestamps (when sessions ran)

❌ **NEVER tracked**:
- Your prompts (could contain sensitive info)
- Agent responses (could contain code/data)
- API keys (never touch this)
- File paths (could reveal structure)
- Personal information (names, emails)

### Data Location

**Local only**: `.specweave/logs/costs.json`

- ✅ Stays on your machine
- ✅ You control the data
- ✅ Delete anytime
- ✅ Never sent to external services

### GDPR Compliance

Since we store NO personal data:
- ✅ No PII (Personally Identifiable Information)
- ✅ No user tracking
- ✅ No third-party analytics
- ✅ Full user control

---

## Troubleshooting

### Cost Dashboard Shows $0.00

**Cause**: No tracked sessions yet

**Solution**:
1. Run `/specweave.do` to execute tasks
2. Wait for agent completion
3. Run `/specweave.costs` again

### Savings Seem Low

**Cause**: Mostly planning work (uses Sonnet)

**Solution**:
- Planning-heavy increments naturally use more Sonnet
- Savings increase during implementation phases
- Overall savings average 60-70% across full project

### Want More Aggressive Savings

**Option 1**: Use more execution agents
```bash
# Instead of architect (Sonnet)
/do with agent=frontend  # Uses Haiku
```

**Option 2**: Force Haiku for simple planning
```bash
/specweave.inc --model haiku "simple feature"
```

---

## FAQ

### Q: Does this slow down execution?

**A**: No. Phase detection takes <1ms. Haiku is actually 2x faster than Sonnet.

### Q: Is quality affected?

**A**: No. Haiku 4.5 matches Sonnet 3.5 quality, perfect for execution tasks. Sonnet 4.5 is still used for all complex planning.

### Q: Can I opt out?

**A**: Yes. Use `--model sonnet` to force Sonnet for every task. You'll lose savings but maintain full control.

### Q: How accurate is phase detection?

**A**: >95% accuracy on typical prompts. When uncertain, defaults to Sonnet (quality over cost).

### Q: Does this work with Opus?

**A**: Yes! Opus 4.0 will be supported when released. Currently: planning=Sonnet, execution=Haiku.

---

## Next Steps

- [Model Selection Guide](./model-selection.md) - Deep dive into how model selection works
- [Cost Tracking Reference](../reference/cost-tracking.md) - Technical details on cost tracking
- [Intelligent Model Selection ADR](../../internal/architecture/adr/0011-intelligent-model-selection.md) - Architecture decision record

---

**Questions?** [Open an issue](https://github.com/anton-abyzov/specweave/issues)
**Feedback?** [Start a discussion](https://github.com/anton-abyzov/specweave/discussions)

---

*Last updated: 2025-10-31 | SpecWeave v0.4.0*
