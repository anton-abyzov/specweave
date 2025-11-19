#!/usr/bin/env bash
# ---
# name: specweave-analyze-standards
# description: Analyze and document coding standards from codebase. Detects naming conventions, import patterns, type usage, and anti-patterns. Generates evidence-based standards documentation with confidence levels. Supports full analysis, drift detection, and standards updates.
# usage: /specweave:analyze-standards [--drift] [--update] [--verbose]
# ---

set -e

# Detect project root (where .specweave/ is located)
PROJECT_ROOT="$(pwd)"
while [[ ! -d "$PROJECT_ROOT/.specweave" ]] && [[ "$PROJECT_ROOT" != "/" ]]; do
  PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
done

if [[ ! -d "$PROJECT_ROOT/.specweave" ]]; then
  echo "❌ Error: Not in a SpecWeave project (no .specweave/ directory found)"
  exit 1
fi

cd "$PROJECT_ROOT"

# Parse arguments
MODE="full"
VERBOSE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --drift)
      MODE="drift"
      shift
      ;;
    --update)
      MODE="update"
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    *)
      echo "❌ Unknown option: $1"
      echo "Usage: /specweave:analyze-standards [--drift] [--update] [--verbose]"
      exit 1
      ;;
  esac
done

# Ensure governance directory exists
GOVERNANCE_DIR="$PROJECT_ROOT/.specweave/docs/internal/governance"
mkdir -p "$GOVERNANCE_DIR"

# Display banner
echo "🔍 Code Standards Analysis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

case $MODE in
  full)
    echo "Mode: Full Analysis"
    echo "Output: $GOVERNANCE_DIR/coding-standards-analysis.md"
    echo ""
    echo "📊 Analyzing codebase..."
    echo ""

    # Launch code-standards-detective agent
    cat <<'AGENT_PROMPT'
You are the code-standards-detective agent. Perform a complete coding standards analysis:

## Your Mission

Analyze this codebase and generate comprehensive coding standards documentation.

## Steps

### Phase 1: Explicit Standards (5 seconds)
1. Check for existing `.specweave/docs/internal/governance/coding-standards.md`
2. Parse ESLint config (`.eslintrc.json`, `.eslintrc.js`)
3. Parse Prettier config (`.prettierrc`, `.prettierrc.json`)
4. Parse TypeScript config (`tsconfig.json`)
5. Extract standards from `CLAUDE.md`, `CONTRIBUTING.md`

### Phase 2: Implicit Standards (30 seconds)
1. Find all source files: `src/**/*.{ts,js,tsx,jsx}`
2. Analyze naming conventions (variables, functions, classes, constants)
3. Detect import patterns (extensions, ordering)
4. Measure function characteristics (length, style)
5. Assess type usage (any, interfaces vs types)
6. Identify error handling patterns

### Phase 3: Anti-Pattern Detection (15 seconds)
1. Detect console.* usage in src/
2. Find hardcoded secrets (API keys, passwords)
3. Identify large files (>500 lines)
4. Find long functions (>100 lines)
5. Check error handling coverage
6. Detect N+1 query patterns

### Phase 4: Documentation Generation (10 seconds)
1. Merge explicit + implicit standards
2. Calculate confidence levels
3. Extract real code examples
4. Highlight inconsistencies
5. Provide recommendations

## Output

Write comprehensive analysis to:
`.specweave/docs/internal/governance/coding-standards-analysis.md`

Include:
- Summary with confidence levels
- Naming conventions with examples
- Import patterns
- Function guidelines
- Type safety assessment
- Error handling analysis
- Anti-patterns and security issues
- Actionable recommendations

## Console Summary

Print summary to stdout:
```
✅ Analysis complete!

📊 Summary:
- Files: X
- LOC: Y
- Confidence: Z%

✅ Strengths: [list]
⚠️ Issues: [list]

📄 Full report: .specweave/docs/internal/governance/coding-standards-analysis.md
```

Execute the analysis now.
AGENT_PROMPT
    ;;

  drift)
    echo "Mode: Drift Detection"
    echo ""

    # Check if standards exist
    if [[ ! -f "$GOVERNANCE_DIR/coding-standards.md" ]]; then
      echo "❌ Error: No coding standards found at:"
      echo "   $GOVERNANCE_DIR/coding-standards.md"
      echo ""
      echo "💡 Tip: Run /specweave:analyze-standards first to generate baseline standards"
      exit 1
    fi

    echo "📊 Comparing declared standards vs actual code..."
    echo ""

    # Launch agent in drift-detection mode
    cat <<'AGENT_PROMPT'
You are the code-standards-detective agent in DRIFT DETECTION mode.

## Your Mission

Compare declared coding standards against actual codebase to detect drift.

## Steps

1. Read existing standards:
   `.specweave/docs/internal/governance/coding-standards.md`

2. Analyze current codebase (same as Phase 2-3 in full analysis)

3. Compare declared vs actual:
   - For each declared standard, check compliance percentage
   - Identify violations
   - Calculate drift score

4. Report findings:
   - Standards with high compliance (90%+) ✅
   - Standards with drift (70-89%) ⚠️
   - Standards violated (<70%) 🔴

## Output Format

```markdown
# Standards Drift Report

**Date**: {timestamp}
**Overall Compliance**: {percentage}%

## ✅ Compliant Standards (90%+)
- Naming conventions: 98% compliant
- Import extensions: 100% compliant

## ⚠️ Drift Detected (70-89%)
- Constant naming: 85% compliant (15% use camelCase instead of UPPER_SNAKE_CASE)
  - Recommendation: Update 8 files or relax standard

## 🔴 Violations (<70%)
- Function length: 65% compliant (35% have functions >100 lines)
  - Critical: src/core/orchestrator.ts:processIncrement() - 156 lines
  - Recommendation: Refactor large functions or update standard

## New Patterns Detected
- Pattern: Using Zod for validation (34% of files)
  - Not documented in standards
  - Recommendation: Add to official standards
```

Write to: `.specweave/docs/internal/governance/coding-standards-drift.md`

Print summary to stdout.

Execute drift detection now.
AGENT_PROMPT
    ;;

  update)
    echo "Mode: Update Standards"
    echo ""

    # Check if analysis exists
    if [[ ! -f "$GOVERNANCE_DIR/coding-standards-analysis.md" ]]; then
      echo "⚠️  No analysis found. Running full analysis first..."
      echo ""
      MODE="full"
      # Re-run in full mode (recursive call avoided by changing MODE)
    fi

    echo "📊 Generating updated standards..."
    echo ""

    # Launch agent in update mode
    cat <<'AGENT_PROMPT'
You are the code-standards-detective agent in UPDATE mode.

## Your Mission

Update official coding standards based on latest analysis.

## Steps

1. Read existing standards (if exist):
   `.specweave/docs/internal/governance/coding-standards.md`

2. Read latest analysis:
   `.specweave/docs/internal/governance/coding-standards-analysis.md`

3. Merge intelligently:
   - Keep manually curated sections
   - Update statistics from analysis
   - Add new patterns if high confidence (>90%)
   - Flag conflicts for human review

4. Generate updated standards document

## Important Rules

- NEVER remove manually written content without asking
- Mark auto-generated sections clearly
- Add "Last Updated" timestamp
- Preserve human rationale/explanations
- Flag breaking changes

## Output

Write to: `.specweave/docs/internal/governance/coding-standards.md`

Also write summary to: `.specweave/docs/internal/governance/coding-standards-history.md`
- Append entry with timestamp
- List what changed
- Explain why

Execute update now.
AGENT_PROMPT
    ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Code standards analysis complete!"
echo ""
echo "📂 Files generated:"
case $MODE in
  full)
    echo "   - $GOVERNANCE_DIR/coding-standards-analysis.md"
    ;;
  drift)
    echo "   - $GOVERNANCE_DIR/coding-standards-drift.md"
    ;;
  update)
    echo "   - $GOVERNANCE_DIR/coding-standards.md (updated)"
    echo "   - $GOVERNANCE_DIR/coding-standards-history.md (appended)"
    ;;
esac
echo ""
echo "🎯 Next steps:"
case $MODE in
  full)
    echo "   1. Review the analysis report"
    echo "   2. Fix critical issues (hardcoded secrets, etc.)"
    echo "   3. Run /specweave:analyze-standards --update to formalize"
    ;;
  drift)
    echo "   1. Review drift report"
    echo "   2. Fix violations or update standards"
    echo "   3. Re-run analysis to verify"
    ;;
  update)
    echo "   1. Review updated standards"
    echo "   2. Commit to git if satisfied"
    echo "   3. Share with team"
    ;;
esac
echo ""
